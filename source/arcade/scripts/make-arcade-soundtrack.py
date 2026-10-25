"""Bake non-overlapping beach/night fades before deployment (ffmpeg + numpy)."""
from pathlib import Path
import json
import subprocess
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
AUDIO = ROOT / 'dist/assets/audio'
RATE = 44100
CYCLE = 80
CYCLES = 6

def decode(path):
    return np.frombuffer(subprocess.check_output([
        'ffmpeg', '-v', 'error', '-i', str(path), '-f', 'f32le',
        '-ac', '2', '-ar', str(RATE), 'pipe:1']), dtype='<f4').reshape(-1, 2)

def encoder(name):
    return subprocess.Popen([
        'ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(RATE),
        '-ac', '2', '-i', 'pipe:0', '-c:a', 'libmp3lame', '-b:a', '192k',
        '-map_metadata', '-1', str(AUDIO / name)], stdin=subprocess.PIPE)

def ease(x):
    lo = np.zeros_like(x)
    hi = np.ones_like(x)
    for _ in range(22):
        t = (lo + hi) / 2
        position = 3 * (1-t)**2 * t * .42 + 3 * (1-t) * t*t * .58 + t**3
        lo = np.where(position < x, t, lo)
        hi = np.where(position >= x, t, hi)
    t = (lo + hi) / 2
    return t*t*(3-2*t)

beach = decode(AUDIO / 'beach-seagulls-loop.wav')
music = decode(AUDIO / 'weightless-dawn-night.mp3')
assert len(music) >= 300 * RATE
t = np.arange(CYCLE * RATE, dtype=np.float64) / RATE
beach_gain = .45 * np.clip(t/.9, 0, 1) * np.clip((29.8-t)/2.5, 0, 1)
night_gain = np.where((t >= 30) & (t < 80),
                      3 * ease(np.clip((t-30)/10, 0, 1)) * ease(np.clip((80-t)/10, 0, 1)), 0)
# This is a sequential edit, not a mix: the source masks never overlap.
assert not np.any((beach_gain > 0) & (night_gain > 0))
assert np.all(beach_gain[int(29.8*RATE):] == 0)
assert np.max(night_gain[:30*RATE]) == 0
peak = 0
process = encoder('arcade-day-night.mp3')
for cycle in range(CYCLES):
    segment = np.zeros((CYCLE*RATE, 2), dtype=np.float32)
    day_indices = (np.arange(30*RATE) + cycle*30*RATE) % len(beach)
    segment[:30*RATE] = beach[day_indices] * beach_gain[:30*RATE, None]
    segment[30*RATE:] = music[cycle*50*RATE:(cycle+1)*50*RATE] * night_gain[30*RATE:, None]
    peak = max(peak, float(np.max(np.abs(segment))))
    assert peak < .95, 'Leave headroom for encoding'
    process.stdin.write(segment.tobytes())
process.stdin.close()
assert process.wait() == 0
process = encoder('arcade-beach.mp3')
process.stdin.write((beach*.45).astype('<f4').tobytes())
process.stdin.close()
assert process.wait() == 0
print(json.dumps({'duration_seconds': CYCLE*CYCLES, 'cycles': CYCLES,
                  'night_music_seconds': 300, 'overlap_samples': 0,
                  'peak': peak, 'sample_rate': RATE}))
