"""Create a gap-free PCM loop from Drew's supplied beach recording.
Usage: python3 scripts/make-beach-loop.py INPUT_AUDIO OUTPUT_WAV
Requires ffmpeg and numpy. The input recording remains untouched.
"""
import json,subprocess,sys,wave
from pathlib import Path
import numpy as np
source,output=map(Path,sys.argv[1:3]);rate=44100
raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(source),'-map','0:a:0','-ar',str(rate),'-ac','2','-f','f32le','-'])
x=np.frombuffer(raw,dtype='<f4').reshape(-1,2).copy()
# These bounds omit the quiet lead-in and the supplied recording's ending fade.
start,end,overlap=8,110,8
assert len(x)>=end*rate
x=x[start*rate:end*rate]
x-=x.mean(axis=0,keepdims=True)
n=overlap*rate
phase=np.linspace(0,np.pi/2,n,dtype=np.float64)[:,None]
# Smooth equal-power overlap: no silence, hard cut, or mid-fade power dip.
blend=x[-n:]*np.cos(phase)+x[:n]*np.sin(phase)
y=np.concatenate((x[n:-n],blend),axis=0)
# Modest level lift, with ample headroom; page gain is lower for ambience.
gain=min(2.0,.79/float(np.max(np.abs(y))));y*=gain
pcm=np.clip(np.rint(y*32767),-32768,32767).astype('<i2')
output.parent.mkdir(parents=True,exist_ok=True)
with wave.open(str(output),'wb') as f:
 f.setnchannels(2);f.setsampwidth(2);f.setframerate(rate);f.writeframes(pcm.tobytes())
# The wrapped seam follows adjacent original samples; verify its normal step.
expected=(x[n]-x[n-1])*gain
actual=y[0]-y[-1]
assert np.allclose(actual,expected,atol=1e-7)
assert abs(pcm.astype(np.int32)).max()<32767
stats={'sample_rate':rate,'channels':2,'duration_seconds':len(pcm)/rate,'source_interval_seconds':[start,end],'crossfade_seconds':overlap,'gain_db':round(float(20*np.log10(gain)),2),'peak_dbfs':round(float(20*np.log10(abs(y).max())),2),'rms_dbfs':round(float(20*np.log10(np.sqrt(np.mean(y*y)))),2),'seam_step_matches_original':True,'bytes':output.stat().st_size}
print(json.dumps(stats))
