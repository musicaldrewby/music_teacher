"""Export the new movement suite and single-strike Stop cue."""
import json, struct, zipfile
from pathlib import Path
from orchestration import TRACKS, BEATS, BPM, PPQ
OUT=Path('dist/music'); OUT.mkdir(exist_ok=True)
def vlq(n):
 r=[n&127];n>>=7
 while n:r.insert(0,(n&127)|128);n>>=7
 return bytes(r)
def meta(kind,value):return bytes([255,kind])+vlq(len(value))+value
def chunk(events,beats):
 events.sort(key=lambda e:(e[0],e[1]));data=b'';last=0
 for t,order,msg in events:data+=vlq(t-last)+msg;last=t
 data+=vlq(beats*PPQ-last)+b'\xff\x2f\x00'
 return b'MTrk'+struct.pack('>I',len(data))+data
for t in TRACKS:
 beats=t['beats']
 conductor=[(0,0,meta(3,t['title'].encode())),(0,0,b'\xff\x51\x03'+int(60000000/BPM).to_bytes(3,'big')),(0,0,b'\xff\x58\x04\x04\x02\x18\x08'),(0,0,b'\xff\x59\x02\x01\x00'),(0,0,meta(6,b'LOOP_START' if t['loop'] else b'ONE_SHOT')),(beats*PPQ,0,meta(6,b'LOOP_END' if t['loop'] else b'END'))]
 data=chunk(conductor,beats)
 for p in t['parts']:
  c=p['channel'];ev=[(0,0,meta(3,p['name'].encode())),(0,1,bytes([0xc0+c,p['program']])),(0,1,bytes([0xb0+c,7,p['volume']])),(0,1,bytes([0xb0+c,10,p['pan']]))]
  for time,key,dur,vel in p['notes']:ev.extend([(round(time*PPQ),3,bytes([0x90+c,key,vel])),(round((time+dur)*PPQ),2,bytes([0x80+c,key,0]))])
  data+=chunk(ev,beats)
 (OUT/(t['id']+'.mid')).write_bytes(b'MThd'+struct.pack('>IHHH',6,1,len(t['parts'])+1,PPQ)+data)
Path('music-source/arrangements.json').write_text(json.dumps(TRACKS,indent=2))
(OUT/'tracks.json').write_text(json.dumps([{k:v for k,v in t.items() if k!='parts'} for t in TRACKS],indent=2))
readme='MOVEMENT STOPLIGHT — NEW MOVEMENT SUITE\n\nNine movement pieces plus a one-shot Stop cue.\n100 BPM, 4/4, G major. Movement loops: 4 measures / 9.6 seconds.\nEach movement has its own melody, rhythm and orchestration; bass parts support the harmony independently.\nStop: one G6/9 vibraphone chord, 4.8-second file, no loop.\nSet movement loops to bars 1–5; do not loop Stop. Load GeneralUser GS v1.471 with General MIDI programs.\nEach instrument has a named MIDI track. MIDI contains notes, not recorded audio.\n\n'+'\n'.join(t['title']+' — '+t['feel'] for t in TRACKS)+'\n\nArrangements created with AI assistance for Drew Wichman’s Movement Stoplight.\nSoundFont: GeneralUser GS v1.471 by S. Christian Collins.\n'
readme+='\nHop boings: four user-supplied jaw-harp WAV samples are included in hop-samples/. The app randomly chooses one on each quarter-note beat during Hop, including previews. MIDI contains the instrumental parts only; these audio effects require a sampler in your music software.\n'
(OUT/'README.txt').write_text(readme)
with zipfile.ZipFile(OUT/'Movement-Stoplight-MIDI.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(OUT.glob('*.mid')):z.write(p,p.name)
 for p in sorted((OUT/'hop-samples').glob('*.wav')):z.write(p,'hop-samples/'+p.name)
 z.writestr('README.txt',readme)
print('Composed',len(TRACKS),'tracks,',sum(len(p['notes']) for t in TRACKS for p in t['parts']),'notes.')
