#!/usr/bin/env python3
"""Prepare five CC0 temple-block strikes from the verified public HQ preview.

Requires ffmpeg, numpy and scipy. The downloaded MP3 stays outside the checkout.
"""
import argparse
import hashlib
import json
import subprocess
import urllib.request
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, resample_poly, periodogram

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'dist/assets/audio/recorded/temple-blocks'
SOURCE = 'https://freesound.org/people/sazanami12/sounds/863784/'
DOWNLOAD = 'https://cdn.freesound.org/previews/863/863784_17110092-hq.mp3'
SOURCE_HASH = '02ab8c6917e5618c68881b919a2d3040d6c49f5d3810ec5085e37fc82e8030fc'
# Preserve the existing event identities used by saved parts and staff positions.
SPECS = [(77, -4, .251917, .60), (77, 0, 1.422667, .60),
         (76, -2, 2.590625, .60), (76, 2, 3.769458, .70),
         (76, 5, 4.993354, .65)]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-dir', required=True, type=Path)
    args = parser.parse_args()
    args.source_dir.mkdir(parents=True, exist_ok=True)
    source_file = args.source_dir / '863784.mp3'
    if not source_file.exists():
        with urllib.request.urlopen(DOWNLOAD, timeout=60) as response:
            source_file.write_bytes(response.read())
    assert hashlib.sha256(source_file.read_bytes()).hexdigest() == SOURCE_HASH
    # Decode the actual public preview, not the login-only original WAV.
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(source_file),
                                   '-f', 'f32le', '-ac', '2', '-ar', '48000', '-'])
    source = np.frombuffer(raw, dtype='<f4').reshape(-1, 2).astype(np.float64)
    DEST.mkdir(parents=True, exist_ok=True)
    sample_set = {
        'credit': 'Temple Blocks (5pcs) - Hard Wood Mallets — sazanami12 / Freesound',
        'license': 'CC0-1.0', 'source': SOURCE, 'download': DOWNLOAD,
        'licensePage': 'https://creativecommons.org/publicdomain/zero/1.0/',
        'sourceInstrument': 'Five acoustic composite temple blocks, hard wood mallets',
        'sourceFormat': 'Public HQ MP3 preview, 48 kHz stereo; original WAV not used',
        'articulations': {}, 'notes': {}
    }
    assets = []
    rng = np.random.default_rng(20261017)
    for index, (note, shift, start, duration) in enumerate(SPECS, 1):
        first = round(start * 48000)
        x = source[first:first + round(duration * 48000)].copy()
        x = sosfilt(butter(2, 100, fs=48000, btype='highpass', output='sos'), x, axis=0)
        x = resample_poly(x, 147, 160, axis=0)
        sr = 44100
        fade_in, fade_out = round(.0005 * sr), round(.07 * sr)
        x[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
        x[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None]
        # Match the previous woodblocks' first-150-ms RMS without compression.
        gain = min(.0555 / np.sqrt(np.mean(x[:round(.15 * sr)] ** 2)),
                   .7 / np.max(np.abs(x)))
        x *= gain
        dither = (rng.random(x.shape) - rng.random(x.shape)) / 32768
        pcm = np.clip(np.round((x + dither) * 32768), -32768, 32767).astype(np.int16)
        pcm[0] = pcm[-1] = 0
        filename = f'block-{index}.wav'
        out = DEST / filename
        wavfile.write(out, sr, pcm)
        actual = pcm.astype(np.float64) / 32768
        freqs, power = periodogram(actual[:round(.3 * sr)].mean(axis=1), sr,
                                   window='hann', nfft=2**18)
        eligible = np.flatnonzero((freqs > 400) & (freqs < 4000))
        resonance = float(freqs[eligible[np.argmax(power[eligible])]])
        descriptor = {'url': f'assets/audio/recorded/temple-blocks/{filename}',
                      'gain': 1, 'tuningSemitones': -shift,
                      'duration': len(pcm) / sr}
        # Cancel the legacy pitch shift: each recorded block plays at native pitch.
        sample_set['articulations'][f'{note}:{shift}'] = descriptor
        assets.append({
            'block': index, 'file': filename, 'sha256': hashlib.sha256(out.read_bytes()).hexdigest(),
            'eventIdentity': {'note': note, 'shift': shift},
            'dominantResonanceHz': resonance, 'sampleRate': sr, 'channels': 2,
            'format': 'PCM signed 16-bit WAV', 'duration': len(pcm) / sr,
            'peak': float(np.max(np.abs(actual))),
            'first150msRms': float(np.sqrt(np.mean(actual[:round(.15 * sr)] ** 2))),
            'clippedSamples': int(np.count_nonzero(np.abs(pcm.astype(np.int32)) >= 32767)),
            'processing': {'cropStartSeconds': first / 48000,
                           'cropDurationSeconds': duration, 'preAttackSeconds': .003,
                           'highpassHz': 100, 'highpassOrder': 2, 'gain': float(gain),
                           'fadeInSeconds': fade_in / sr, 'fadeOutSeconds': fade_out / sr,
                           'resampling': '48 kHz to 44.1 kHz polyphase',
                           'dither': 'TPDF at one 16-bit LSB', 'pitchShift': 0}
        })
    for note, index in [(77, 2), (76, 3)]:
        # Fallback for nonstandard imported shifts; standard pads match above first.
        sample_set['notes'][str(note)] = {
            'url': f'assets/audio/recorded/temple-blocks/block-{index}.wav',
            'gain': 1, 'tuningSemitones': 0, 'duration': assets[index - 1]['duration']}
    provenance = {
        'prepared': '2026-10-17', 'source': SOURCE, 'download': DOWNLOAD,
        'sourceSha256': SOURCE_HASH, 'author': 'sazanami12', 'license': 'CC0-1.0',
        'sourceFormat': sample_set['sourceFormat'],
        'qualityNotes': [
            'Five different physical blocks, one recorded strike per block, low to high.',
            'Public HQ MP3 preview decoded to WAV; this is not lossless-source audio.',
            'The author describes composite/carbon-fiber temple blocks recorded on an OPPO Reno8 phone.',
            'Room decay is present. Quiet tails are shortened and faded before late handling noise.',
            'All five native pitches are retained. Tuning compensation cancels legacy event shifts.',
            'No compression, denoising, synthetic layers or added reverb.'
        ],
        'instrumentSamples': {'temple-blocks': sample_set}, 'assets': assets
    }
    (DEST / 'PROVENANCE.json').write_text(json.dumps(provenance, indent=2) + '\n')
    manifest_path = ROOT / 'dist/assets/audio/manifest.json'
    manifest = json.loads(manifest_path.read_text())
    manifest['instrumentSamples']['temple-blocks'] = sample_set
    manifest['approximations']['templeBlocks'] = 'Five separately struck composite temple blocks; one native-pitch recording per block.'
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps([{k: asset[k] for k in ['block', 'dominantResonanceHz', 'peak', 'first150msRms', 'clippedSamples']} for asset in assets], indent=2))


if __name__ == '__main__':
    main()
