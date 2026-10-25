# FLUID SPACE

A private Sites instrument built for Drew Wichman. The supplied Fluid R3 SoundFont is fixed; there is no SoundFont loader or library switching UI.

## Run and maintain

`npm ci`, `npm test`, `npm run build`. The static Site is in `dist/`; the hosting identity is in `.openai/hosting.json`. Source changes belong in `src/`. `scripts/prepare-font.mjs` is the original upload preparation script; its input is intentionally not needed for subsequent builds because the exact bank parts and catalog are tracked.

The 148,345,256-byte SoundFont is split into eight assets below hosting's per-file size limit. The browser reassembles those exact bytes and transfers them to an AudioWorklet. SpessaSynth 4.3.22 handles sample zones, loops, envelopes, stereo, MIDI controllers and pitch. The bank catalog records actual instrument key ranges.

## Signal path and timing

The AudioWorklet owns the playback clock. Live MIDI channels 1–8 and playback channels 9–16 keep overdubs from interrupting live notes. Each track has independent loop length, gain, pan and effect sends. Events are rendered at sample offsets within each audio quantum. Scene switches reset the playback parts together on the next measure and retain the shared effect buffers. Record Replace waits through count-in before erasing the armed track. Overdub only replays newly captured events on subsequent loops. Undo retains 24 completed takes/passes in memory.

The delay has dual interpolated delay lines, cross-feedback, filtered feedback, drive, modulation, diffusion, ducking and reverb send. The reverb has input filtering, predelay, early reflections, input allpasses, an eight-line orthogonal feedback network, per-band decay, modulation, ducking and freeze. A bounded output stage controls peaks.

## Audio export

Export audio renders the current scene for a chosen number of measures, or all scenes containing notes in numerical order. Each scene in the latter mode lasts as long as its longest recorded track; a repeats setting multiplies each scene's duration. Shorter clips keep looping. The worker and AudioWorklet share `FluidEngine`, so both use the same SoundFont, sample-offset scheduler, controller playback, mixer and effects. A flush acknowledgement ensures the snapshot includes the latest completed take. Rendering omits count-in and metronome and leaves the project untouched.

Stereo PCM WAV supports 44.1/48 kHz and 16/24 bits with TPDF dither. The tail can be automatic (estimated from delay feedback and reverb decay), custom from 0 to 180 seconds, or omitted. Tails end with a 1.5-second fade; exact-length exports use a 5 ms end fade. Live reverb freeze is released for export because its existing feedback-buffer contents are not recorded in the project. This is explained in the export dialog. Current effect settings are used throughout; live knob moves and manually performed scene launch timing are not automation.

The dedicated worker streams encoded chunks to the UI and can be terminated immediately by Cancel or closing the dialog. It reuses cached bank assets. The browser assembles the WAV download locally; files above 512 MiB are rejected before rendering to bound memory use. Duration and size appear before rendering; failures retain the project and permit retry. Use the explicit Download WAV link after rendering completes.

## Storage and limitations

Project autosave uses IndexedDB on the current device. Manual Save/Open transfers a `.fluidspace` JSON project containing the notes, controllers, eight shared instruments, eight scenes, mixer and effects. User patches, favorites and MIDI mappings use localStorage. There is no cloud project synchronization. MIDI Learn controls effects live; note, sustain, bend, modulation, expression and channel-pressure performance data is recorded. Effect-knob automation is not recorded.

Pattern length is an integer from 1 to 65,536 measures per track. No note editor, piano roll or step sequencer is present. Project metering remains fixed once notes exist. SoundFont voice cap follows the engine default. Browser Web MIDI permissions and AudioWorklet support are required for hardware input and playback respectively. This is a browser instrument, not VST3/AU.

## Verification

`tests/audio.test.js` renders the actual sample bank through the production processor and tests preset playback, independent timing, replacement scope, overdubbing, undo, count-in cancellation, scene boundaries, controllers, long projects, and effect impulse responses. `tests/export.test.js` checks WAV headers, signed PCM conversion, sample-exact scene timing, long measures, mute/solo, panning, effect tails and final fades using the real bank. `tests/ui.test.js` executes the actual interface code in a DOM harness with MIDI messages. These are automated logic/DSP checks, not a browser rendering review, a subjective listening assessment, or a physical MIDI test.

SoundFont credits are retained in the original bank. SpessaSynth's GPL-3.0 license is included in `dist/assets/SPESSASYNTH-LICENSE.txt`; its source is published at https://github.com/spessasus/spessasynth_core .
