# Mr. Drew’s Animated Vocal Explorations

Imported from https://musicaldrewby.github.io/music_teacher/vocalexploration.html on 2026-10-08.

## Source

`dist/index.html` is the app entry point. The initial import preserved the original byte for byte; subsequent reliability updates are tracked in Git. Styling, animation logic, and Web Audio synthesis are included in this HTML. All eight illustrated scenes use 20 local WebP images in `dist/assets/`. There are no external libraries, fonts, or server APIs. The original GitHub Pages deployment is not modified.

## Editing and hosting

Edit `dist/index.html`. This is a buildless static Site with `dist` as its publish directory. Site identity is tracked in `.openai/hosting.json`.

## Existing features

- Eight themes: Space, Ocean, Clouds, Garden, Graveyard, Winter, Fantasy, and Arctic.
- Drag to position a character, then record its motion and replay it for vocal exploration.
- Optional synthesized sound with four oscillator choices and five pitch scale choices.
- Loop playback, multiple strokes for skips and leaps, and Space Echo.
- Mouse and touch controls.

## Initial migration verification

The imported HTML matches the source bytes; its inline JavaScript parses and all literal DOM ID references resolve. Browser visual, touch, and audible playback verification were not available in this environment.

## Reliability update — 2026-10-08

The original interface and all eight themes are preserved. Drawing now tracks one captured pointer and safely handles cancellation, focus loss, and page hiding. Resizing rescales recorded paths and keeps their pitch stable. Scale snapping searches for the nearest allowed MIDI pitch across octave boundaries, preserving the original scale definitions. Playback interpolates within strokes, keeps gaps silent, uses a monotonic clock and advances through recorded samples. A cached canvas avoids rebuilding the static path on every playback frame.

Run `node --test tests/reliability.test.cjs` for regression coverage of pointer ownership/cancellation, audio cleanup, recording and reset, resize preservation, nearest-note selection, interpolation and gaps, looping, and long-path rendering efficiency. Tests simulate browser primitives; actual browser rendering, touch hardware, and audible playback still require device verification.

## Illustrated theme prototypes — 2026-10-08

Space and Ocean now combine static cinematic artwork with separate animated layers. Space includes a slowly drifting ringed planet, twinkling stars, an occasional meteor, and a rocket with flickering exhaust. Ocean includes gentle light shafts, rising bubbles, swaying kelp, and a fish with an animated tail. Both explorers use generated transparent PNG assets, with an emoji fallback until their images load. A dark edge makes vocal paths readable over bright background areas. Controls and the six other themes are retained.

`ASSET-NOTES.md` records the image-generation prompts and asset paths. The original generated alpha channels are preserved. Browser visual QA is unavailable in this environment; regression checks cover theme cycling, sprite load events, layer cleanup, and the existing drawing/audio logic.

## Complete illustrated scenes — 2026-10-08

Clouds now has a hot-air balloon and drifting cloud layers; Garden has a bee, swaying daisies and pollen; Graveyard has a friendly ghost, low drifting mist and lights; Winter has a skier and snowfall; Fantasy has a baby dragon and fireflies; Arctic has a penguin, aurora ribbons, snowfall and water shimmer. Space and Ocean retain their original artwork and motion. Existing controls and musical behavior are preserved.

The 20 delivery images total 2,148,152 bytes (about 2.05 MiB), 95% smaller than their source PNGs. Original generated artwork is retained in `artwork/originals/`, outside the published directory. `scripts/optimize-artwork.cjs` recreates delivery derivatives with the `sharp` Node package (set `NODE_PATH` to its installation directory if needed); the running app needs no packages.

Scene loading keeps the current scene interactive until the next is decoded, limits concurrent image jobs to two, coalesces rapid selections, preloads one adjacent scene while idle, evicts unrelated decoded-image references, and recovers from failed downloads or an eight-second per-image timeout. Startup does not wait for image loading. Movement uses transforms, decorative motion uses transforms and opacity, hidden-page animation pauses, and reduced-motion preferences are respected. Particles are capped at 36. Recorded paths append only new samples to the canvas cache; replay keeps the existing forward-only sample cursor.

Validation: 18 regression tests pass, including all eight scenes across repeated cycles, image failures and timeouts, prefetch races, live interaction during loading, and 20,000-point recording/replay efficiency. All image references resolve; all transparent derivatives retain alpha; each image is under 300 KiB. Browser rendering, actual frame rates on classroom hardware, touch hardware and audible playback remain unverified because browser QA is unavailable in this environment. These safeguards reduce known stall risks but are not a guarantee of zero freezes on every device.

## Storybook controls — 2026-10-08

Toolbar buttons now use raised navy enamel faces with warm gold rims. Record and Play use larger coral and teal enamel buttons with a recessed Stop state. Matching local vector icons replace platform-dependent button emoji; no icon library or network request is added. Press feedback animates only transforms, and the former repeating button shadow pulse is removed. Button labels and toggle states are exposed to assistive technology. Narrow screens reflow the toolbar and retain full accessible names when visible labels are hidden. Existing recording, audio, themes and scene-loading behavior are unchanged. All 18 behavioral regression checks pass; local icon references and accessible button names are verified. Browser visual verification remains unavailable.
