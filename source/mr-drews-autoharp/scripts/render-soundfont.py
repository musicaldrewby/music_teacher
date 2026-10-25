"""Render the six chosen GeneralUser presets as light browser audio assets.

Requires numpy, tinysoundfont==0.3.7, and ffmpeg. Supply the original .sf2 path.
Only the autoharp's 36 pitches are rendered; the full bank is not shipped.
"""
import argparse, hashlib, json, struct, subprocess, tempfile, wave
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import numpy as np
from tinysoundfont import Synth

parser=argparse.ArgumentParser()
parser.add_argument('soundfont',type=Path)
args=parser.parse_args()
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'dist'/'audio'/'presets-v1'
OUT.mkdir(parents=True,exist_ok=True)
NOTES=[41,43,48,50,52,53,54,55]+list(range(57,85))
PRESETS=[('steel','Steel Guitar',0,25),('twelve','12-String Guitar',8,25),('dulcimer','Dulcimer',0,15),('nylon','Nylon Guitar',0,24),('harp','Orchestral Harp',0,46),('mandolin','Mandolin',16,25)]
SR=32000
synth=Synth(gain=0,samplerate=SR)
sfid=synth.sfload(str(args.soundfont))
font=synth.soundfonts[sfid]
report=[]

def encode(item):
    midi,data,folder=item
    with tempfile.NamedTemporaryFile(suffix='.wav') as tmp:
        with wave.open(tmp.name,'wb') as out:
            out.setnchannels(2);out.setsampwidth(2);out.setframerate(SR)
            out.writeframes((data*32767).astype('<i2').tobytes())
        target=folder/f'{midi}.mp3'
        subprocess.run(['ffmpeg','-nostdin','-v','error','-y','-i',tmp.name,'-codec:a','libmp3lame','-q:a','3',str(target)],check=True)
    return target.stat().st_size

for slug,name,bank,program in PRESETS:
    folder=OUT/slug;folder.mkdir(exist_ok=True)
    preset_index=font.get_preset_index(bank,program)
    assert preset_index>=0, f'Missing preset {bank}:{program}'
    assert font.get_preset_name(preset_index)==name
    rendered=[]
    for midi in NOTES:
        font.reset();synth.program_select(0,sfid,bank,program)
        synth.noteon(0,midi,100)
        duration=7.2-(midi-41)/43*2.2
        data=np.frombuffer(synth.generate(int(SR*duration)),dtype='<f4').copy().reshape(-1,2)
        data[-int(SR*.2):]*=np.linspace(1,0,int(SR*.2))[:,None]
        assert np.isfinite(data).all()
        assert np.max(np.abs(data))>1e-5, f'Silent note {name} {midi}'
        rendered.append((midi,data))
    peak=max(float(np.max(np.abs(a))) for _,a in rendered)
    rms=float(np.median([np.sqrt(np.mean(a[:int(SR*.65)]**2)) for _,a in rendered]))
    gain=min(.88/peak,.16/rms)
    with ThreadPoolExecutor(max_workers=4) as pool:
        sizes=list(pool.map(encode,[(m,a*gain,folder) for m,a in rendered]))
    report.append({'id':slug,'name':name,'bank':bank,'program':program,'notes':NOTES,'sampleRate':SR,'velocity':100,'gain':round(gain,6),'bytes':sum(sizes)})
    print(f'{name}: 36 pitches, {sum(sizes)/1024/1024:.2f} MiB',flush=True)

# Preserve the uploaded SoundFont's exact license text and attribution.
blob=args.soundfont.read_bytes()
def chunks(start,end):
    while start+8<=end:
        size=struct.unpack_from('<I',blob,start+4)[0]
        yield blob[start:start+4],start+8,size
        start+=8+size+(size%2)
info={}
for cid,p,n in chunks(12,len(blob)):
    if cid==b'LIST' and blob[p:p+4]==b'INFO':
        for key,q,size in chunks(p+4,p+n):info[key.decode()]=blob[q:q+size].rstrip(b'\0').decode('latin1')
(ROOT/'dist'/'soundfont-license.txt').write_text(info.get('INAM','')+'\n'+info.get('ICOP','')+'\n\n'+info.get('ICMT',''),encoding='utf8')
(OUT/'manifest.json').write_text(json.dumps({'source':'GeneralUser GS 1.471','author':'S. Christian Collins','sha256':hashlib.sha256(blob).hexdigest(),'presets':report},indent=2)+'\n')
print('Finished: six real SoundFont presets, 216 notes.',flush=True)
