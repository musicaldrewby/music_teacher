#!/usr/bin/env python3
"""Split the user-supplied original CC0 WAV into five native sweep gestures."""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'dist/assets/audio/recorded/wind-chimes'
SOURCE_HASH = '8ec378f92294df4576714de6f46176d751ca84b2a330e696932a940e8a791948'
SOURCE_PAGE = 'https://freesound.org/people/tosha73/sounds/495327/'
# Downward and upward refer to pitch, not the physical direction of the hand.
# These are different articulations, not interchangeable round-robin strikes.
TAKES = [
    (84, 'down-brisk', 'Down · brisk', 0),
    (85, 'down-slow', 'Down · slow', 17),
    (86, 'up-brisk', 'Up · brisk', 34),
    (87, 'up-medium', 'Up · medium', 51),
    (88, 'up-slow', 'Up · slow', 68),
]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', required=True, type=Path)
    args = parser.parse_args()
    assert hashlib.sha256(args.source.read_bytes()).hexdigest() == SOURCE_HASH
    sr, raw = wavfile.read(args.source)
    assert sr == 44100 and raw.dtype == np.int16 and raw.shape == (3704400, 2)
    original = raw.astype(np.float64) / 32768
    DEST.mkdir(parents=True, exist_ok=True)
    sample_set = {
        'credit': 'Five Bar Chimes Samples — tosha73 / Freesound',
        'license': 'CC0-1.0', 'source': SOURCE_PAGE,
        'licensePage': 'https://creativecommons.org/publicdomain/zero/1.0/',
        'sourceInstrument': 'Acoustic bar chimes, five studio-recorded sweep performances',
        'sourceFormat': 'User-supplied original 44.1 kHz, 16-bit stereo WAV',
        'notes': {},
    }
    assets = []
    rng = np.random.default_rng(20261017)
    for note, name, label, start in TAKES:
        x = original[start * sr:(start + 16) * sr].copy()
        x = sosfilt(butter(2, 60, fs=sr, btype='highpass', output='sos'), x, axis=0)
        fade_in, fade_out = round(.002 * sr), round(.16 * sr)
        x[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
        x[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None]
        # Balance the strongest one-second window, keeping each gesture's dynamics.
        energy = np.mean(x ** 2, axis=1)
        cumulative = np.concatenate(([0.0], np.cumsum(energy)))
        strongest = np.sqrt(np.max((cumulative[sr:] - cumulative[:-sr]) / sr))
        gain = min(.05 / strongest, .65 / np.max(np.abs(x)))
        x *= gain
        dither = (rng.random(x.shape) - rng.random(x.shape)) / 32768
        pcm = np.clip(np.round((x + dither) * 32768), -32768, 32767).astype(np.int16)
        pcm[0] = pcm[-1] = 0
        filename = f'{name}.wav'
        path = DEST / filename
        wavfile.write(path, sr, pcm)
        sample_set['notes'][str(note)] = {
            'url': f'assets/audio/recorded/wind-chimes/{filename}',
            'gain': 1, 'tuningSemitones': 0, 'duration': len(pcm) / sr,
            'articulation': label,
        }
        asset = {
            'file': filename, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'note': note, 'label': label, 'sourceStartSeconds': start,
            'sourceEndSeconds': start + 16, 'duration': len(pcm) / sr,
            'sampleRate': sr, 'channels': 2, 'format': 'PCM signed 16-bit WAV',
            'peak': float(np.max(np.abs(pcm.astype(float))) / 32768),
            'clippedSamples': int(np.count_nonzero(np.abs(pcm.astype(np.int32)) >= 32767)),
            'processing': {'highpassHz': 60, 'highpassOrder': 2,
                           'gain': float(gain), 'strongestOneSecondRms': float(strongest * gain),
                           'fadeInSeconds': fade_in / sr, 'fadeOutSeconds': fade_out / sr,
                           'dither': 'TPDF at one 16-bit LSB',
                           'pitchShift': 0, 'timeStretch': False, 'reversed': False},
        }
        assets.append(asset)
    manifest_path = ROOT / 'dist/assets/audio/manifest.json'
    manifest = json.loads(manifest_path.read_text())
    manifest['instrumentSamples']['wind-chimes'] = sample_set
    manifest['approximations']['windChimes'] = 'Five recorded acoustic bar-chime sweeps: down brisk/slow and up brisk/medium/slow; original pitches, speed and decay.'
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
    provenance = {
        'prepared': '2026-10-17', 'source': SOURCE_PAGE, 'author': 'tosha73',
        'license': 'CC0-1.0', 'sourceFilename': args.source.name,
        'sourceSha256': SOURCE_HASH, 'sourceFormat': sample_set['sourceFormat'],
        'sourceDurationSeconds': 84,
        'qualityNotes': [
            'Five performances separated by one-second silent gaps in the original WAV.',
            'Pitch direction identified from the onset order of chime resonances in each spectrogram.',
            'Speed labels are relative to this recording; no fixed tempo or synchronization is implied.',
            'All 16 seconds of each take are retained, including natural ringing and secondary chime contacts.',
            'Gestures are selected explicitly because directions and sweep speeds are musically different.',
            'No reversed audio, pitch shifting, time stretching, added reverb or synthetic variations.',
            'Legacy note 84 remains the default downward sweep; other instrument mappings are unchanged.',
        ],
        'instrumentSamples': {'wind-chimes': sample_set}, 'assets': assets,
    }
    (DEST / 'PROVENANCE.json').write_text(json.dumps(provenance, indent=2) + '\n')
    print(json.dumps([{k: a[k] for k in ['label', 'duration', 'peak', 'clippedSamples']} for a in assets], indent=2))


if __name__ == '__main__':
    main()
