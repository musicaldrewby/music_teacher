"""Original modal steel-string samples. No third-party audio assets."""
from pathlib import Path
import wave
import numpy as np

OUT=Path(__file__).resolve().parents[1]/'dist'/'audio'
OUT.mkdir(parents=True,exist_ok=True)
notes=[41,43,48,50,52,53,54,55]+list(range(57,85))
sr=32000
for midi in notes:
    f=440*2**((midi-69)/12)
    duration=6.7-(midi-41)/43*2.7
    t=np.arange(int(sr*duration),dtype=np.float64)/sr
    signal=np.zeros_like(t)
    rng=np.random.default_rng(midi*1259)
    stiffness=.000026 if midi<60 else .000009
    harmonics=min(42,int(14000/f))
    pluck=.19
    for n in range(1,harmonics+1):
        # Stiff steel strings and faster high-partial decay create a ringing, metallic pluck.
        frequency=f*n*np.sqrt((1+stiffness*n*n)/(1+stiffness))
        decay=(2.55-(midi-41)*.022)/(1+.075*(n-1)**1.25)
        amplitude=np.sin(np.pi*n*pluck)/(n**1.32)
        signal+=amplitude*np.cos(2*np.pi*frequency*t+rng.uniform(-.06,.06))*np.exp(-t/decay)
    # Short wooden-body response and a quiet fingernail transient.
    noise=rng.standard_normal(t.size)
    signal+=.033*noise*np.exp(-t/.008)
    signal+=.037*np.sin(2*np.pi*193*t)*np.exp(-t/.036)
    signal+=.014*np.sin(2*np.pi*487*t)*np.exp(-t/.025)
    signal*=np.minimum(t/.0017,1)
    signal*=np.clip((duration-t)/.13,0,1)
    signal-=signal.mean()
    signal*=.88/max(np.max(np.abs(signal)),1e-8)
    pcm=(signal*32767).astype('<i2')
    with wave.open(str(OUT/f'{midi}.wav'),'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes(pcm.tobytes())
print(f'Generated {len(notes)} strings: {sum(p.stat().st_size for p in OUT.glob("*.wav"))/1024/1024:.1f} MiB')
