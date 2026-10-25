# Orbit — Polyrhythm Studio

Created for Drew Wichman. A buildless, browser-local eight-track melodic polyrhythm workstation.

## Included

- AudioWorklet sequencing and SoundFont synthesis with SpessaSynth Core 4.3.22.
- GeneralUser GS 1.471: all 269 presets, bank variations, and drum kits.
- Shared-cycle polyrhythm, sixteenth-note polymeter, Euclidean hit distribution, accents, and rotation.
- Scale-degree melodies, single notes and diatonic chords; individual drum-note selection.
- Per-track level, pan, reverb, tempo-synced echo, note duration, probability, mute and solo.
- Optional master Ambient Reverb with 1–30 second decay, wet/dry mix, pre-delay, tone, width and bass cut. Room, Hall and Deep Space presets. Settings follow scenes; Stop preserves the tail and Clear tail removes it.
- Thirty new authored presets: six each for Percussion, Pads, Grooves, Melodic and Experimental. The four originals remain available. Categorized, searchable preset browser with Load & play, previous/next and Undo preset load.
- Four stored scenes with boundary-quantized recall; loading factory presets preserves stored scenes.
- Local autosave plus JSON project import/export. No accounts or server-side project storage.

## Hosting

Serve `dist/` over HTTPS. Audio starts on a user gesture. The original SF2 is split into four binary assets to keep individual assets below the hosting size limit; the client joins them losslessly before loading. No external runtime dependencies or CDN requests.

## Verification

Run `node verify.mjs` for Euclidean distribution, exact 3:4 audio-frame timing, first-beat audio, scene boundaries, all 269 preset selections and dry audio output, and project schema round trips. `catalog.mjs` regenerates the instrument catalog's playable drum-key metadata.

Run `node verify-ambient.mjs` for bypass transparency, decay response, pre-delay, stereo width, bounded output, tail clearing and backwards-compatible project persistence.

Browser interaction and visual QA were unavailable in the build environment; test playback on the target browser before broad distribution.

## Attribution

Soundfont and engine licenses are included under `dist/assets/` and accessible through the app's Sound credits dialog.

Run `node verify-factory.mjs` to render every new arrangement for at least two shared cycles (minimum 32 seconds), check all preset and drum-note mappings, confirm percussion-only and pad-led categories, bound output peaks and voice counts, and verify state round trips. The generated `factory-audio-report.json` captures the rendered levels before the master compressor.

## Evolving pad update

The six pad arrangements now begin changing pitch within approximately 1–2 seconds, use shorter harmonic phrases and feature quiet melodic texture tracks 6–7 (mute those for pads alone). Per-track Evolution controls filter brightness, stereo drift and expression at differing rates; Evolve cycle adjusts the pace. Old saved projects default to no motion. Reload a factory pad from the preset browser to hear its revised arrangement; existing autosaved edits are preserved.

`node verify-evolution.mjs` renders each revised pad for 75 seconds, checks early note movement and ongoing filter modulation, verifies output/voice headroom and tests disabling motion and project compatibility. Latest pad measurements are in `evolution-audio-report.json`.

## Observatory lighting and listening view

The studio now uses preset-specific lighting for all 34 factory arrangements, with Ice, Velvet, Ember and Aurora overrides. Lighting settings persist separately from musical projects. The Observatory expands into an immersive listening view with preset navigation, transport, volume, brightness, gentle motion, optional fullscreen and an always-visible return button (Escape also returns). Switching view retains the same canvas and audio session.

`visuals.js` renders orbit trails, accent ripples and a slowly moving atmospheric field. The worklet batches actual successful note triggers with existing position messages; muted, solo-excluded and probability-skipped notes produce no light event. An analyser after the master compressor drives the atmosphere from actual output, including effect tails. Rendering is capped near 30fps, stops while the document is hidden, and respects reduced-motion preferences. LED dials can be dragged vertically or adjusted with their keyboard-accessible sliders.

Validation: `node verify.mjs` passes audio timing, scenes and all 269 soundfont programs. `node verify-lighting.mjs` passes distinct palettes, actual trigger telemetry, mute/probability behavior, accent/step identity and document references. JavaScript syntax checks passed. Browser layout, fullscreen and interaction QA could not be run because the managed Sites browser capability was unavailable.

## Horizon collection

Twelve companions now join the unchanged Event Horizon in a dedicated Horizon category. The collection has four Drift arrangements (Beyond the Horizon, Dark Matter, The Quiet Singularity, Redshift Cathedral), four Pulse arrangements (Photon Rail, Tachyon Bloom, Gravity Engine, Midnight Transmission) and four Radiance arrangements (First Light Beyond, Opal Exosphere, Solar Veil, Homeward Through Stars). All are drum-free, with moving pad foundations and early melodic activity; Pulse adds soft rhythmic sequences. Each has a distinct lighting palette. There are now 46 arrangements total. The browser opens to Horizon, and listening navigation keeps the family together.

All original 34 musical states and stable preset IDs are preserved. Event Horizon changes only its browser category. `horizon-original-hashes.json` fingerprints the previous musical states; `verify-horizon.mjs` checks those fingerprints and renders every new arrangement for 60 seconds, checking early pitch/filter movement, active instruments, save/load normalization, finite audio and output/voice headroom. Results are recorded in `horizon-audio-report.json`. Prior audio reports describe their named presets at their original verification date. Browser audition and visual QA remain unavailable in this managed session.


## Marimba collection
Ten new presets in Marimba bring the collection to 56. Obsidian Steps, Prism Dance, Gravity Garden and Quicksilver Eleven use marimba only; the others add hand drums, electronic rhythm or restrained ambient support. Open fourth/fifth voices use exact 5/7-semitone intervals. Per-track Swell depth and Swell cycle vary strike velocity on a beat-synchronous cosine wave, with offset phases between parts. Four beats equal one swell bar. Depth zero preserves the original 87/115 hit/accent velocities exactly. Optional fields preserve existing preset states and old saved projects; scenes, export and autosave retain new settings. Every new preset has its own lighting palette.

`node verify-marimba.mjs` verifies all 46 existing arrangements remain unchanged, dynamics and open intervals, and renders all ten new presets with the real SoundFont across a complete longest swell cycle. Browser QA was unavailable in this environment.


## Six expanded collections
36 composed arrangements bring Orbit to 92 presets: six each in Liquid Metal, Midnight Machines, Bamboo & Strings, Gravity Drums, Velvet After Dark and Slow Supernovas. Phrase helpers align melodies to sounding steps over two cycles; individual polymeter parts retain their independent loop lengths. Presets have authored instrument roles, accents, stereo placement, note lengths, dynamic arcs and lighting. All previous 56 states and IDs remain unchanged.

Bamboo & Strings uses pan flute and shakuhachi only as short replies with rests. Authored flute gates stay below 0.34 seconds, duty cycle below 28%, with breathing rests over a second and no per-track echo or room send. Two of its arrangements omit flute entirely. Gravity Drums contains only kit percussion. Slow Supernovas combines longer pad swells with upper-voice movement within two seconds.

`node verify-collections.mjs` checks preservation, categories, SoundFont/drum mappings, phrase limits, save/load round trips, flute durations and rests, early pad movement, and renders all 36 with the real SoundFont for at least 40 seconds (a full longest swell). `collections-audio-report.json` records output peaks, RMS, voice counts and flute durations. Browser QA is unavailable in this environment.

## Horizon Noir visual finish

The selected Horizon Noir concept is retained in `design/horizon-noir-reference.png`. `dist/noir.css` implements its black/indigo surfaces, fine blue borders, recessed illuminated controls and compact typography. Playback and presets share a command bar; the Observatory and instrument rack form the main stage; the editor and reverb/scenes sit together on wide screens and stack on smaller screens. Creator credit and the donation link remain beside the title. Listening view retains the original canvas, session and exit controls.

Track previews use circular LEDs. The Observatory has a precise outer rim, clearer selected rings and extra central space. A subtle reverb-panel glow follows the existing output meter and ambient mix, going dark when bypassed. These are presentation-only changes; the audio graph, sequencer, all 92 preset states, saved-project format and dial/range control relationships are preserved.

Validation: JavaScript syntax and `node verify-lighting.mjs` pass, including actual trigger/mute/probability telemetry and 92 distinct palettes. All 92 musical-state SHA-256 fingerprints match version 9. All 90 document IDs and existing input/select/button/dialog attributes are preserved, along with listening-view structure and the support link. Browser rendering and interaction QA could not be performed because the managed browser capability is unavailable.

## Shows and agent rendering

Open **Shows ↗** for the new performance workspace. It has a saved movement timeline, prepared Horizon/Marimba journeys, studio capture, cue editing and ordering, timed musical moves, lighting, play/pause/stop, show import/export, streamed WAV export, and browser video recording. Show data uses its own local storage key; all 92 factory states and existing studio projects remain unchanged.

The sequencer moved to `orbit-core.js` so both the original AudioWorklet and the two-deck show engine share it. Extraction preserves byte-identical studio audio. Shows use seeded probability, sample-clock cue changes, approximately 100 Hz automation, equal-power crossfades, final effect tails and a shared soft limiter. The same score drives offline video through `scripts/render-show.mjs`, which writes bounded sections, verifies resume hashes, replays prior audio to reconstruct all effect/voice state, and muxes audio once at the end.

See [SHOWS.md](SHOWS.md) for the score contract, commands, preview/export/resume workflow and browser API. `scripts/package-agent.mjs` publishes matching renderer sources and a download manifest; run it after changing the CLI or guide. `shows/horizon-hour.orbit-show.json` is a one-hour starting score. `shows/first-transmission.orbit-show.json` is the three-movement, one-minute verification film.

Validation: original studio audio fingerprint and 92 preset hashes preserved; original sequencer/lighting checks pass; show tests cover score validation, unsafe paths, interpolation, seed repeatability, crossfade overlap, exact completion and tempo/echo automation. `node verify-show-exports.mjs` verifies streaming WAV bytes, exact duration and cancellation using the actual worker module. A full hour (172,800,000 stereo sample frames) synthesized with the real SoundFont, remained finite and completed all 12 cues, with a maximum of 57 voices per deck and no samples crossing the soft-limit threshold. A 60-second H.264/AAC film was rendered at 720p/24 fps, including a completed-section resume test; both media streams are exactly 60 seconds and transition frames were inspected. Reports are in `show-verification-report.json` and `show-film-verification.json`.

The managed browser capability remains unavailable. The rendered canvas and offline audio/video pipeline were inspected and measured directly; browser layout, AudioWorklet startup in a real tab, file-picker integration and MediaRecorder interactions are not browser-verified. Browser recording requires a visible tab, and long browser exports require direct file saving. Agent production uses the local renderer, not a hosted background video job. Video render speed depends on resolution and hardware.
