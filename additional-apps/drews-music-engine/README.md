# Drew’s Music Engine

Private, browser-based General MIDI composition renderer for Drew Wichman and his assistant. Site ID is retained in `.openai/hosting.json`. The operating guide is in `public/agent-guide.html` and is shipped with the app.

`npm ci`, `npm test`, `npm run build`. The static deployment root is `dist`.

For subsequent assistant music tasks, reuse this Site repository and render directly when browser controls are unnecessary:

```sh
node scripts/render.mjs /absolute/path/song.json /absolute/path/output room 0.28
```

This uses the same SoundFont, synthesizer, reverb, WAV writer and MP3 encoder as the browser. `dry`, `room`, and `hall` are supported. Save user-facing output audio with the Library skill and return download links. Keep the composition if the user may want revisions. No separate DAW or live recording is needed.

SoundFont: the user’s GeneralUser GS 1.471, SHA-256 recorded in the manifest. It is bundled as four binary parts so no hosting asset exceeds 8 MiB. Parts are reassembled and verified before use. Audio rendering and MP3 encoding run in a worker. The core engine is shared by the browser worker and the offline integration test.

The app accepts standard single-port MIDI format 0/1 and the documented JSON composition format. No server synthesis or external APIs are required. The private hosting audience must be preserved. No user files are sent to third-party services.

GeneralUser GS license metadata is retained in the bank and reproduced in `public/soundfont-license.txt`. Third-party licenses are in `public/licenses/`; MP3 encoder source is shipped in `public/vendor/` in accordance with its license.

UI and WebMCP browser verification require the supported browser preview skill. The engine integration suite independently covers all 128 GM programs being present, percussion, JSON validation, MIDI loading, tempo changes, dynamics, reverb tails, and WAV/MP3 rendering. Generated test audio is in ignored `test-output/`.
