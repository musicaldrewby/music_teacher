# Natural speech build

Run `npm run build:voice` to rebuild the lazy browser runtime.
The static site itself remains buildless. `scripts/download-neural-model.py`
reproduces the checked-in voice assets from the pinned model revision in the
manifest. Model parts contain at most 10 MiB of weights each. Gzip delivery reduces the initial download without changing any weights. The worker uses DecompressionStream to restore the original bytes before inference.

Kokoro model and voice vectors:
https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX
Revision 1939ad2a8e416c0acfeecc08a694d14ef25f2231, Apache-2.0.

English normalization/phonemization adapted from Kokoro.js (Apache-2.0):
https://github.com/hexgrad/kokoro/tree/main/kokoro.js
`phonemizer` 1.2.1 by Xenova (Apache-2.0 wrapper) uses eSpeak NG for text-to-phoneme
conversion. eSpeak NG is GPL-3.0-or-later; source and build scripts are available:
https://github.com/xenova/phonemizer.js
https://github.com/espeak-ng/espeak-ng
It supplies phonemes; Kokoro supplies the audible neural waveform.

ONNX Runtime Web 1.22.0, Microsoft (MIT):
https://github.com/microsoft/onnxruntime/tree/v1.22.0

License copies are in licenses/ and distributed with the runtime. Runtime/model
assets are served from this site; generation is local and sends no dialogue to
an external service. No third-party voice endpoint or API key is used.
