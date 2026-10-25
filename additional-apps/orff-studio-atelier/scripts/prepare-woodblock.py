#!/usr/bin/env python3
"""Prepare native low/high acoustic woodblock recordings from verified sources.

Usage: python scripts/prepare-woodblock.py --source-dir /path/to/originals
Source URLs, filenames and hashes are in woodblock-sources.json.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, resample_poly, periodogram

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'dist/assets/audio/recorded/woodblock'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-dir', required=True, type=Path)
    args = parser.parse_args()
    sources = json.loads(Path(__file__).with_name('woodblock-sources.json').read_text())
    DEST.mkdir(parents=True, exist_ok=True)
    sample_set = {
        'credit': 'Versilian Studios LLC / VCSL (low); Joseph SARDIN / BigSoundBank (high)',
        'license': 'CC0-1.0',
        'sourceInstrument': 'Two independently recorded acoustic wooden blocks, native pitches',
        'notes': {},
    }
    assets, rng = [], np.random.default_rng(20261017)
    for spec in sources['files']:
        source = args.source_dir / spec['filename']
        assert hashlib.sha256(source.read_bytes()).hexdigest() == spec['sha256']
        sr, raw = wavfile.read(source)
        assert sr == spec['sourceRate']
        x = raw.astype(np.float64) / (2 ** (np.iinfo(raw.dtype).bits - 1))
        if x.ndim == 1:
            x = x[:, None]
        assert x.shape[1] == spec['channels']
        if spec['highpassHz']:
            # Filter before extraction so the crop starts with settled filter state.
            x = sosfilt(butter(spec['highpassOrder'], spec['highpassHz'],
                              fs=sr, btype='highpass', output='sos'), x, axis=0)
        start, end = spec['cropSeconds']
        x = x[round(start * sr):round(end * sr)].copy()
        if sr != 44100:
            divisor = math.gcd(sr, 44100)
            x = resample_poly(x, 44100 // divisor, sr // divisor, axis=0)
        x *= spec['gain']
        fade_in, fade_out = round(spec['fadeInMs'] * 44.1), round(spec['fadeOutMs'] * 44.1)
        x[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
        x[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None]
        assert np.max(np.abs(x)) < .9
        dither = (rng.random(x.shape) - rng.random(x.shape)) / 32768
        pcm = np.round((x + dither) * 32768).astype(np.int16)
        pcm[0] = pcm[-1] = 0
        filename = spec['voice'] + '.wav'
        path = DEST / filename
        wavfile.write(path, 44100, pcm[:, 0] if pcm.shape[1] == 1 else pcm)
        actual = pcm.astype(np.float64) / 32768
        frequencies, power = periodogram(actual[:4410].mean(axis=1), 44100,
                                        window='hann', nfft=2**18)
        note = 77 if spec['voice'] == 'low' else 76
        sample_set['notes'][str(note)] = {
            'url': 'assets/audio/recorded/woodblock/' + filename,
            'gain': 1, 'tuningSemitones': 0, 'duration': len(pcm) / 44100,
            'articulation': spec['voice'].title(), 'source': spec['url'],
        }
        assets.append({
            'file': filename, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'note': note, 'label': spec['voice'].title(),
            'sourceUrl': spec['url'], 'sourceSha256': spec['sha256'],
            'sampleRate': 44100, 'channels': pcm.shape[1], 'format': 'PCM signed 16-bit WAV',
            'duration': len(pcm) / 44100, 'peak': float(np.max(np.abs(actual))),
            'first100msRms': float(np.sqrt(np.mean(actual[:4410] ** 2))),
            'dominantResonanceHz': float(frequencies[np.argmax(power)]),
            'clippedSamples': int(np.count_nonzero(np.abs(pcm.astype(np.int32)) >= 32767)),
            'processing': {
                'cropSeconds': spec['cropSeconds'], 'gain': spec['gain'],
                'highpassHz': spec['highpassHz'], 'highpassOrder': spec['highpassOrder'],
                'filterBeforeCrop': spec['filterBeforeCrop'],
                'fadeInSeconds': fade_in / 44100, 'fadeOutSeconds': fade_out / 44100,
                'resampling': f'{sr} Hz to 44100 Hz polyphase' if sr != 44100 else None,
                'dither': 'TPDF at one 16-bit LSB', 'pitchShift': 0,
            },
        })
    manifest_path = ROOT / 'dist/assets/audio/manifest.json'
    manifest = json.loads(manifest_path.read_text())
    manifest['instrumentSamples']['woodblock'] = sample_set
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
    provenance = {
        'prepared': '2026-10-17', 'license': 'CC0-1.0', 'sources': sources['sources'],
        'qualityNotes': [
            'Low and high use different acoustic wooden blocks, with their native pitches retained.',
            'High is a documented Meinl wood block recorded by Joseph Sardin in studio conditions.',
            'No temple-block reuse, synthetic layers, pitch shifts, compression or added reverberation.',
            'Quiet lead/tails trimmed and levels balanced; high recording gently high-passed to remove handling rumble.',
            'Source stereo/mono channels preserved; source and derived hashes retained.',
            'Low note 77 and high note 76 keep existing saved parts and notation identities.',
        ],
        'instrumentSamples': {'woodblock': sample_set}, 'assets': assets,
    }
    (DEST / 'PROVENANCE.json').write_text(json.dumps(provenance, indent=2) + '\n')
    print(json.dumps([{k: a[k] for k in ('label', 'duration', 'dominantResonanceHz', 'peak', 'clippedSamples')} for a in assets], indent=2))


if __name__ == '__main__':
    main()
