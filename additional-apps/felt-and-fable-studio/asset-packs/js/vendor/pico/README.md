# Local character speech

SVOX Pico WebAssembly runtime: `@echogarden/svoxpico-wasm` 0.2.0,
https://github.com/echogarden-project/svoxpico-wasm (Apache-2.0).
The upstream JavaScript is unchanged, with its filename changed to `pico.mjs`.
Runtime and English voice files load only when speech is requested.

English lingware `en-US_ta.bin` and `en-US_lh0_sg.bin` are from
https://android.googlesource.com/platform/external/svox/+/refs/heads/main/pico/lang/
and distributed under the accompanying Apache-2.0 license and SVOX notices.
See LICENSE and NOTICE. No external synthesis service or operating-system
voice is required. Character presets are pitch/rate variations of this voice.

Application integration: `speech-engine.mjs`, `speech-worker.mjs`, `talk.js`.
