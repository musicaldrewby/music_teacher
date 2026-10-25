#!/usr/bin/env python3
"""Prepare five native VCSL percussion recordings from hash-verified originals.

Usage: python scripts/prepare-bells-slapstick.py --source-dir /path/to/VCSL/files
The pinned download URLs and source hashes are in bells-slapstick-sources.json.
"""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from scipy.io import wavfile

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'dist/assets/audio/recorded/bells-slapstick'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-dir', required=True, type=Path)
    args = parser.parse_args()
    sources = json.loads(Path(__file__).with_name('bells-slapstick-sources.json').read_text())
    DEST.mkdir(parents=True, exist_ok=True)
    sets, assets = {}, []
    rng = np.random.default_rng(20261017)
    for spec in sources['files']:
        source = args.source_dir / Path(spec['sourcePath']).name
        assert hashlib.sha256(source.read_bytes()).hexdigest() == spec['sha256'], source
        sr, raw = wavfile.read(source)
        assert sr == 44100 and raw.ndim == 2 and raw.shape[1] == 2
        # scipy represents 24-bit PCM left-justified in int32.
        x = raw.astype(np.float64) / (2 ** (np.iinfo(raw.dtype).bits - 1))
        start, end = spec['recommendedCropSeconds']
        x = x[round(start * sr):round(end * sr)].copy()
        x *= spec['recommendedGain']
        fade_in = round(spec['recommendedFadeInMs'] * sr / 1000)
        fade_out = round(spec['recommendedFadeOutMs'] * sr / 1000)
        x[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
        x[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None]
        assert np.max(np.abs(x)) < .9
        dither = (rng.random(x.shape) - rng.random(x.shape)) / 32768
        pcm = np.round((x + dither) * 32768).astype(np.int16)
        pcm[0] = pcm[-1] = 0
        path = DEST / spec['outputFile']
        wavfile.write(path, sr, pcm)
        instrument = spec['instrument']
        sample_set = sets.setdefault(instrument, {
            'credit': 'Versilian Community Sample Library — Versilian Studios LLC',
            'license': sources['license'], 'source': sources['source'],
            'sourceCommit': sources['pinnedCommit'], 'notes': {},
        })
        sample_set['notes'][str(spec['note'])] = {
            'url': 'assets/audio/recorded/bells-slapstick/' + path.name,
            'gain': 1, 'tuningSemitones': 0, 'duration': len(pcm) / sr,
            'articulation': spec['label'],
        }
        assets.append({
            'file': path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'instrument': instrument, 'note': spec['note'], 'label': spec['label'],
            'sourceUrl': spec['url'], 'sourceSha256': spec['sha256'],
            'sourceStartSeconds': start, 'sourceEndSeconds': end,
            'sampleRate': sr, 'channels': 2, 'format': 'PCM signed 16-bit WAV',
            'duration': len(pcm) / sr,
            'peak': float(np.max(np.abs(pcm.astype(float))) / 32768),
            'clippedSamples': int(np.count_nonzero(np.abs(pcm.astype(np.int32)) >= 32767)),
            'processing': {
                'gain': spec['recommendedGain'], 'fadeInSeconds': fade_in / sr,
                'fadeOutSeconds': fade_out / sr, 'dither': 'TPDF at one 16-bit LSB',
                'pitchShift': 0, 'timeStretch': False, 'eq': False,
            },
        })
    manifest_path = ROOT / 'dist/assets/audio/manifest.json'
    manifest = json.loads(manifest_path.read_text())
    manifest['instrumentSamples'].update(sets)
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
    provenance = {
        'prepared': '2026-10-17', 'author': sources['author'],
        'collection': sources['collection'], 'source': sources['source'],
        'license': sources['license'], 'sourceCommit': sources['pinnedCommit'],
        'qualityNotes': [
            'Acoustic agogo low/high bells from the same velocity layer, native pitches retained.',
            'Cowbell2 normal/open and muted are separate performances of one physical instrument.',
            'Slapstick is an acoustic hinged-board clap, not a synthesized noise burst.',
            'Quiet lead/tails trimmed, constant gains balanced, endpoints faded; no EQ or pitch shifts.',
            'Instrument-specific mappings leave other percussion instruments unchanged.',
        ],
        'instrumentSamples': sets, 'assets': assets,
    }
    (DEST / 'PROVENANCE.json').write_text(json.dumps(provenance, indent=2) + '\n')
    print(json.dumps([{k: a[k] for k in ('file', 'duration', 'peak', 'clippedSamples')} for a in assets], indent=2))


if __name__ == '__main__':
    main()
