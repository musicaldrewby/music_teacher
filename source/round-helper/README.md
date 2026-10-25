# Round Helper

A browser-local visual conductor for classroom rounds, created by Drew Wichman.

## Source and build

- `src/app.jsx`: controls, theme selector, support link, and SVG conductor.
- `src/app.css`: Studio Console, Wood & Brass, and Concert Hall layouts.
- `src/transport.js`: audio-clock transport shared by clicks and the visualizer.
- `dist/assets/`: optimized walnut and concert-hall images made for this project.
- `src/roundhelper.html`: the original imported app, retained for reference.

Install the pinned development dependency with `npm install`, then run `npm run build`. The static site is in `dist/`; React and ReactDOM are vendored locally. JSX compilation happens at build time. The app has no runtime CDN dependencies.

Run `node --test tests/transport.test.cjs` to check group timing, scheduling, pause/resume, tempo changes, mute, reset, replay, and input limits.

The theme choice is stored only on the user's device. Controls are live HTML; the rings, group entry markers, progress, and needle are live SVG. The two raster images supply material texture and the room backdrop. The support link goes directly to Drew's Buy Me a Coffee page and opens in a new tab.

The conductor pauses when its tab is hidden. Tempo and sound can change during playback. Changing the musical structure requires pausing and resets the round. 6/8 uses two dotted-quarter pulses per measure.

## Initial redesign verification

The automated audio-clock tests use a simulated Web Audio clock; they do not verify actual speakers, device-specific audio behavior, or visual rendering. Browser QA was unavailable in the managed environment for this update.
