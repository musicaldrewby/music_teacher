# Rewind Room · 1989

An interactive 3D bedroom created for Drew Wichman. Static, browser-local application; no backend uploads or media storage services.

## Experience

- Seven smoothly moving camera views, manual look-around and an automatic camera tour.
- Ikegami HTM-1990R inspired CRT (provisional model), Zenith VRE205 inspired wood-grain VCR, red Sony FH-7 MKII inspired hi-fi and turntable.
- Local movies become VHS tapes; play, pause, seek, eject, rename, resume and remove.
- Local audio selections become mixtapes with ordered tracks, cassette/turntable modes, next/previous, volume and five-band Web Audio equalizer.
- Browser-local IndexedDB remembers file handles where supported and files below 100 MB. Larger files selected through a basic file picker require reconnection after reload. Metadata and playback position are saved locally. No user media is uploaded.
- Adjustable CRT/VHS effects, tracking, picture sharpness, lamp, rain sound and room brightness.
- Playable Simon with persistent high score; Speak & Spell recreation using browser speech synthesis.
- TRON (1982), Guns N' Roses, and Steve Roach Dreamtime Return poster artwork. See `dist/assets/credits.json` for provenance.

## Develop

The published root is `dist/`, with vendored Three.js modules. No build step is required. Serve through Sites preview or any local static HTTP server. Modern WebGL2 browser required. Browser-supported media formats only; MP4/H.264 and MP3 are the most portable choices. MKV and some MOV codecs may be unsupported.

`npm ci` installs test dependencies. Run:

```
node --check dist/scene.js
node --check dist/app.js
node tests/scene-check.mjs
node tests/render-pipeline-check.mjs
node tests/workflow-check.mjs
```

## Verification

Scene construction validates geometry and camera presets with the renderer stubbed. DOM workflow tests validate local import/persistence, cassette grouping, playback state, track navigation, labels, Simon sequence checks, spelling checks and eject cleanup. These tests do not validate media codecs, file permissions, browser speech, shaders, or rendered appearance.

The available cloud preview browser reported WebGL disabled (`GL_RENDERER = Disabled`), so browser visual QA and actual GPU playback could not be completed in this environment. Check the deployed Site in a WebGL-capable browser, including the seven angles and mobile landscape layout.

Equipment meshes are detailed original approximations from the supplied reference photos and manufacturer images, not scanned replicas. Real-time lighting uses environment illumination, shadow maps, ambient occlusion and bloom. No baked Blender lightmaps are included in this first version.

## Startup rendering correction

High Detail previously disabled the base RenderPass while enabling SSAO. SSAO composites onto an existing color buffer and does not draw the room, allowing the additive bloom step to reuse old frames. The room pass now stays enabled in both quality modes. The composer pixel ratio is also synchronized with the renderer when changing quality. A regression test runs the real Three.js pass chain through all seven cameras and high/balanced/high transitions, asserting that each frame clears and redraws the room before effects. This test fails on the original release.
