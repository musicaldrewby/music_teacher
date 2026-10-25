#!/usr/bin/env python3
"""Prepare Street Song instrument samples and a manifest fragment.

Does not modify the shared audio manifest. Usage:
  python scripts/prepare-street-additions.py --source-dir /path/to/downloads
Source URLs and SHA-256 hashes are in street-additions-sources.json.
"""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import resample_poly

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'dist/assets/audio/recorded/street-additions'
PIN = 'c1ea7bcc3c7309650ab0da9d15c9cd1fbc4a4c7e'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-dir', required=True, type=Path)
    args = parser.parse_args()
    specs = json.loads(Path(__file__).with_name('street-additions-sources.json').read_text())
    DEST.mkdir(parents=True, exist_ok=True)
    sets = {
        'castanets': {
            'credit': 'Castanets (simple), Joseph SARDIN / BigSoundBank.com',
            'license': 'CC0-1.0',
            'source': 'https://bigsoundbank.com/castanets-simple-s0922.html',
            'licensePage': 'https://bigsoundbank.com/licenses.html',
            'description': 'Two separate acoustic single strikes; original pitches retained.',
            'notes': {},
        },
        'side-drum': {
            'credit': 'Rope-tension snare drum, Versilian Studios LLC / VCSL',
            'license': 'CC0-1.0', 'source': 'https://versilian-studios.com/vcsl/',
            'sourceCommit': PIN,
            'description': 'Two native snare-on strokes of one rope-tension side drum.',
            'notes': {},
        },
    }
    assets = []
    rng = np.random.default_rng(20261017)
    for spec in specs['files']:
        source = args.source_dir / spec['file']
        assert sha(source) == spec['sha256'], source
        sr, raw = wavfile.read(source)
        x = raw.astype(np.float64) / 2 ** (np.iinfo(raw.dtype).bits - 1)
        start, end = spec['cropSeconds']
        x = x[round(start * sr):round(end * sr)].copy()
        assert not np.any(np.abs(x) >= 1), 'Source excerpt must not be clipped'
        if sr != 44100:
            g = int(np.gcd(sr, 44100))
            x = resample_poly(x, 44100 // g, sr // g, axis=0)
        sr = 44100
        x *= spec['gain']
        for which, key in [('in', 'fadeInSeconds'), ('out', 'fadeOutSeconds')]:
            n = round(sr * spec[key])
            ramp = np.linspace(0, 1, n) if which == 'in' else np.linspace(1, 0, n)
            if x.ndim == 2:
                ramp = ramp[:, None]
            if which == 'in':
                x[:n] *= ramp
            else:
                x[-n:] *= ramp
        assert np.max(np.abs(x)) < .9
        dither = (rng.random(x.shape) - rng.random(x.shape)) / 32768
        pcm = np.round((x + dither) * 32768).astype(np.int16)
        pcm[0] = pcm[-1] = 0
        output = DEST / spec['outputFile']
        wavfile.write(output, sr, pcm)
        desc = {
            'url': 'assets/audio/recorded/street-additions/' + output.name,
            'gain': 1, 'tuningSemitones': 0, 'duration': len(pcm) / sr,
            'articulation': 'Stroke ' + ('1' if spec['note'] in (85, 38) else '2'),
        }
        sets[spec['instrument']]['notes'][str(spec['note'])] = desc
        assets.append({
            'file': output.name, 'sha256': sha(output), 'instrument': spec['instrument'],
            'note': spec['note'], 'sourceUrl': spec['url'], 'sourceSha256': spec['sha256'],
            'sampleRate': sr, 'channels': 1 if pcm.ndim == 1 else pcm.shape[1],
            'duration': len(pcm) / sr, 'format': '16-bit PCM WAV',
            'peak': float(np.max(np.abs(pcm.astype(float)))) / 32768,
            'rmsFirst100ms': float(np.sqrt(np.mean((pcm[:4410].astype(float)/32768)**2))),
            'clippedSamples': int(np.count_nonzero(np.abs(pcm.astype(np.int32)) >= 32767)),
            'processing': {
                'sourceCropSeconds': [start, end], 'gain': spec['gain'],
                'fadeInSeconds': spec['fadeInSeconds'], 'fadeOutSeconds': spec['fadeOutSeconds'],
                'dither': 'TPDF at one 16-bit LSB', 'pitchShift': 0,
                'resampling': 'Polyphase 48kHz to44.1kHz' if 'castanets' in spec['instrument'] else 'None',
            },
        })

    manifest = json.loads((ROOT / 'dist/assets/audio/manifest.json').read_text())
    soprano = manifest['instrumentSamples']['soprano-recorder']
    sopranino = {
        'sourceInstrument': 'Baroque Soprano Recorder, transposed approximation',
        'source': 'https://github.com/sgossner/VCSL', 'sourceCommit': PIN,
        'credit': 'Versilian Studios LLC / VCSL', 'license': 'CC0-1.0',
        'sustain': True,
        'description': 'Sopranino in F range, F5–F7. VCSL soprano recordings raised a perfect fourth; not separately recorded sopranino samples.',
        'notes': {},
    }
    for note in range(77, 102):
        src = soprano['notes'][str(note - 5)]
        sopranino['notes'][str(note)] = {**src, 'tuningSemitones': round(src.get('tuningSemitones', 0) + 5, 6)}
    sets['sopranino-recorder'] = sopranino
    sets['timpani'] = {
        'credit': 'GeneralUser GS 1.471 — S. Christian Collins; TinySoundFont rendering',
        'source': 'https://schristiancollins.com/generaluser.php',
        'license': 'GeneralUser GS License v2.0; see assets/audio/CREDITS.txt',
        'description': 'Existing pitched timpani C2–C4; audio bytes unchanged.',
        'notes': {str(note): {**manifest['samples']['timpani'][str(note)], 'gain': 1, 'tuningSemitones': 0} for note in range(36, 61)},
    }
    reused = []
    for inst in ('sopranino-recorder', 'timpani'):
        for url in sorted({n['url'] for n in sets[inst]['notes'].values()}):
            path = ROOT / 'dist' / url
            assert path.is_file(), path
            reused.append({'instrument': inst, 'url': url, 'sha256': sha(path)})
    provenance = {
        'prepared': '2026-10-17', 'assets': assets, 'reusedAssets': reused,
        'instrumentSamples': sets,
        'qualityNotes': [
            'Castanets are two isolated single strikes, cropped from the unclipped opening of the original 48kHz recording. Later clipped source strikes were not used.',
            'Side drum is a rope-tension drum recorded with snares on; two separate round-robin performances. Natural decay retained.',
            'Percussion native pitch retained; only crop, constant gain, endpoint fades and resampling/dither applied.',
            specs['recorderMethod'], specs['timpaniMethod'],
            'The existing SATB recorders remain unchanged. Sopranino uses the same prepared source audio as soprano and does not claim a new physical instrument recording.',
        ],
    }
    (DEST / 'PROVENANCE.json').write_text(json.dumps(provenance, indent=2) + '\n')
    (DEST / 'manifest-fragment.json').write_text(json.dumps({'instrumentSamples': sets}, indent=2) + '\n')
    print(json.dumps(assets, indent=2))


if __name__ == '__main__':
    main()
