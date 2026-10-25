# Marimba audio

The app uses only the Marimba preset from Drew's supplied GeneralUser GS 1.471
SoundFont (bank 0, zero-based program 12). The reduced SoundFont and its original
embedded license are retained in `dist/assets/audio/`.

`marimba-notes-v1.flac` is a lossless mono sample atlas covering MIDI notes 36–105
(C2–A7), including all accidentals and octave shifts. Each note was rendered at
velocity 96 with effects disabled using spessasynth_core 4.3.22. Before PCM
packaging, all 70 rendered notes were compared with the same preset from the
original full SoundFont and matched sample for sample. The renderer applies a
uniform gain of 2 and fades only the last 30 ms of the very quiet tail. The WAV
file contains the identical PCM data and is a fallback for FLAC decode failures.

The browser preloads the atlas, then plays independent AudioBufferSourceNodes on
the existing audio-clock scheduler. It keeps recorded frequencies, supports
overlapping strikes, and fades canceled voices to prevent clicks. No synth
library or external CDN is required at runtime.

Room reverb is a separate 1.1-second stereo convolution effect, off on first use.
The Tools menu sets its wet amount from 0–30%; 12% is the initial amount when
enabled. Settings persist locally and in project JSON. Older projects default to
dry marimba. The instrument remains the same across the three visual themes.

## Rebuilding the audio assets

Install `spessasynth_core@4.3.22` into a separate authoring directory. With ffmpeg
available, run:

```sh
node scripts/render-marimba.mjs /absolute/path/to/node_modules/spessasynth_core/dist/index.js /absolute/path/to/original.sf2
```

The original SoundFont argument is optional; when supplied it enables the
sample-for-sample comparison. Keep the JSON, FLAC, and WAV together. If changing
the atlas, change their versioned filenames and the corresponding fetch URLs.

## Verification

`node tests/regression.cjs` checks the sequencer, muted bars, multitouch, projects,
themes, all octave/accidental mappings, load and retry behavior, codec fallback,
reverb settings and voice cleanup using a simulated DOM and audio graph.

Browser interaction and listening QA were unavailable in this environment.
