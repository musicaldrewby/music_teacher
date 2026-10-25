"""Render arrangements with the provided SF2 using TinySoundFont.
Build: gcc -shared -fPIC -O2 music-source/synth.c -lm -o /tmp/libtsf.so
Usage: python music-source/render.py /absolute/path/to/libtsf.so [track_id ...]
"""
import ctypes as C, json, sys, wave, subprocess, tempfile, struct
from pathlib import Path
import numpy as np

SR=44100
lib=C.CDLL(sys.argv[1]);ptr=C.c_void_p
def api(name,result,args):
 f=getattr(lib,name);f.restype=result;f.argtypes=args;return f
load=api('tsf_load_filename',ptr,[C.c_char_p]);close=api('tsf_close',None,[ptr])
output=api('tsf_set_output',None,[ptr,C.c_int,C.c_int,C.c_float])
preset=api('tsf_channel_set_presetnumber',C.c_int,[ptr,C.c_int,C.c_int,C.c_int])
pan=api('tsf_channel_set_pan',C.c_int,[ptr,C.c_int,C.c_float]);vol=api('tsf_channel_set_volume',C.c_int,[ptr,C.c_int,C.c_float])
on=api('tsf_channel_note_on',C.c_int,[ptr,C.c_int,C.c_int,C.c_float]);off=api('tsf_channel_note_off',None,[ptr,C.c_int,C.c_int])
render=api('tsf_render_float',None,[ptr,C.POINTER(C.c_float),C.c_int,C.c_int])
sf_temp=tempfile.TemporaryDirectory()
sf=Path(sf_temp.name)/'GeneralUser-GS-v1.471.sf2'
sf.write_bytes(b''.join(p.read_bytes() for p in sorted(Path('dist/assets/soundfont').glob('*.bin'))))
only=set(sys.argv[2:])
report_path=Path('music-source/audio-validation.json')
reports=[r for r in json.loads(report_path.read_text()) if r['id'] not in only] if only and report_path.exists() else []
for t in json.loads(Path('music-source/arrangements.json').read_text()):
 if only and t['id'] not in only:continue
 LOOP=round(t['seconds']*SR);cycles=3 if t['loop'] else 1
 synth=load(str(sf).encode());assert synth
 output(synth,0,SR,-7)
 events=[]
 for p in t['parts']:
  ch=p['channel'];assert preset(synth,ch,p['program'],ch==9)
  pan(synth,ch,p['pan']/127);vol(synth,ch,p['volume']/127)
  for cycle in range(cycles):
   for beat,key,dur,vel in p['notes']:
    events.extend([(cycle*LOOP+round(beat*.6*SR),1,ch,key,vel),(cycle*LOOP+round((beat+dur)*.6*SR),0,ch,key,0)])
 events.sort();audio=np.zeros((cycles*LOOP,2),np.float32);position=0
 def fill(end):
  global position
  while position<end:
   n=min(1024,end-position);buffer=audio[position:position+n]
   render(synth,buffer.ctypes.data_as(C.POINTER(C.c_float)),n,0);position+=n
 for frame,kind,ch,key,vel in events:
  fill(min(frame,len(audio)))
  if kind:on(synth,ch,key,vel/127)
  else:off(synth,ch,key)
 fill(len(audio));close(synth)
 # Small stereo room. Rendering repeated cycles preserves release tails at the loop boundary.
 room=audio.copy();wet=.10 if t['id']=='tiptoe' else .065
 for i,sec in enumerate([.027,.041,.059,.079,.103,.139,.179,.227,.283,.347,.419,.499]):
  delay=round(sec*SR);gain=wet*np.exp(-sec*5)
  room[delay:]+=audio[:-delay,::(-1 if i%2 else 1)]*gain
 audio=room[(cycles-1)*LOOP:cycles*LOOP]
 rms=float(np.sqrt(np.mean(audio**2)));peak=float(np.max(np.abs(audio)))
 target=.058 if t['id']=='tiptoe' else .055 if t['id']=='stop' else .095
 gain=min(target/max(rms,1e-8),.88/max(peak,1e-8));audio*=gain
 # Smooth the last three milliseconds into the exact first sample without
 # moving the downbeat or altering the fixed-length transport.
 ramp=np.linspace(0,1,132,dtype=np.float32);ramp=ramp*ramp*(3-2*ramp)
 if t['loop']:audio[-132:]+=(audio[0]-audio[-1])[None,:]*ramp[:,None]
 else:audio[-4410:]*=np.linspace(1,0,4410,dtype=np.float32)[:,None]
 assert np.isfinite(audio).all() and np.max(np.abs(audio))<.9 and rms>.0001
 # The uploaded upward whistle accents beats 1 of measures 1 and 3.
 # Bake it into the fixed-length loop so live playback, replay and both export
 # engines share the exact same phrase phase, including direct movement changes.
 if t['id']=='slide':
  with wave.open('dist/music/effects/slide-whistle.wav','rb') as effect:
   assert effect.getframerate()==SR and effect.getnchannels()==2
   whistle=np.frombuffer(effect.readframes(effect.getnframes()),dtype='<i2').reshape(-1,2).astype(np.float32)/32768
  for at in [0,round(4.8*SR)]:
   n=min(len(whistle),len(audio)-at);audio[at:at+n]+=whistle[:n]*.48
  assert np.max(np.abs(audio))<.95
 pcm=(audio*32767).astype('<i2')
 with tempfile.TemporaryDirectory() as folder:
  wav=Path(folder)/'loop.wav'
  with wave.open(str(wav),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes(pcm.tobytes())
  for ext,codec,args in [('ogg','libvorbis',['-q:a','5']),('mp3','libmp3lame',['-b:a','192k'])]:
   subprocess.run(['ffmpeg','-v','error','-y','-i',str(wav),'-c:a',codec,*args,str(Path('dist/music')/(t['id']+'.'+ext))],check=True)
 reports.append(dict(id=t['id'],seconds=len(audio)/SR,peak=float(np.max(np.abs(audio))),rms=float(np.sqrt(np.mean(audio**2))),seam_step=float(np.max(np.abs(audio[0]-audio[-1])))))
 print(t['id'],reports[-1],flush=True)
Path('music-source/audio-validation.json').write_text(json.dumps(reports,indent=2))

# Preserve the license text embedded in the supplied SoundFont.
b=sf.read_bytes()
def chunks(buf,start,end):
 while start+8<=end:
  tag=buf[start:start+4];n=struct.unpack_from('<I',buf,start+4)[0];data=buf[start+8:start+8+n]
  if tag==b'LIST' and data[:4]==b'INFO':yield from chunks(data,4,len(data))
  elif tag!=b'LIST':yield tag,data
  start+=8+n+(n%2)
license='GeneralUser GS v1.471 — S. Christian Collins\n\n'
for tag,data in chunks(b,12,len(b)):
 if tag in [b'ICOP',b'ICMT']:license+=data.decode(errors='replace').strip('\0')+'\n\n'
Path('dist/music/SoundFont-License.txt').write_text(license)
