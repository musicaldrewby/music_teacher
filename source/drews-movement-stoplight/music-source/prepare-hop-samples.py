"""Align the supplied jaw-harp attacks and level-match them for live beat playback."""
import json, subprocess, wave
from pathlib import Path
import numpy as np
reports=[]
for source in sorted(Path('music-source/hop-originals').glob('b*.mp3')):
 samples=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(source),'-f','f32le','-ac','1','-ar','44100','-']),dtype=np.float32).copy()
 peak=float(abs(samples).max());active=np.flatnonzero(abs(samples)>peak*.008)
 start=max(0,int(active[0])-88);end=min(len(samples),int(active[-1])+1103)
 samples=samples[start:end];samples*=min(.40/max(abs(samples)),.085/max(float(np.sqrt(np.mean(samples*samples))),1e-8))
 fade=min(441,len(samples)//4);samples[-fade:]*=np.linspace(1,0,fade)
 samples[:44]*=np.linspace(0,1,44)
 target=Path('dist/music/hop-samples')/(source.stem+'.wav')
 with wave.open(str(target),'wb') as f:
  f.setnchannels(1);f.setsampwidth(2);f.setframerate(44100);f.writeframes((samples*32767).astype('<i2').tobytes())
 reports.append(dict(file=target.name,trim_start_seconds=start/44100,seconds=len(samples)/44100,peak=float(abs(samples).max()),rms=float(np.sqrt(np.mean(samples*samples)))))
Path('music-source/hop-sample-validation.json').write_text(json.dumps(reports,indent=2))
print(json.dumps(reports,indent=2))
