# Mr. Drew’s Play-Along Creator Studio

An audio-first creator tool. Upload a recording, perform movement cues in time with it, refine their exact timestamps, and export a complete MP4 with illustrated pages, opening slides, transitions and an ending. The music generator and its dependencies have been removed.

The existing Site identity is in `.openai/hosting.json`; `dist/` is the buildless static deployment. No external APIs or server-side audio uploads are used. Source audio stays in browser storage or portable downloaded projects.

## Workflow

1. **Audio:** load a browser-decodable audio file (up to 100 MB). Select up to eight minutes, set a title and level.
2. **Cues:** choose Record cues. Choose a Space-bar cue and tap Space. P plays/pauses. Tap pads or press 1–9 for pat, clap, stomp, snap, word, tap, wave, freeze, rest. Each take is one Undo operation. Add paused cues, drag waveform markers, edit source-song timestamps, or nudge by 10 ms. Eight cues form two rows of four. Click a preview square to pause, seek and edit it; Enter edits the current square. Pat/clap/stomp/snap/tap support straight pairs, swung pairs, or any nonempty subset of three compound subdivisions. Each card shows pictures/rests with separate pulse highlights in all art sets.
3. **Beat & feel:** below the preview, enable the musical beat grid; enter BPM or tap T, align beat 1, choose simple or compound meter, adjust swing, and add tempo sections at downbeats. Optional snap affects only new/dragged cues. A local worker suggests pulse tempos from up to 45 seconds of audio; suggestions never set meter, swing, downbeat, or cue starts.
4. **Look:** mix twenty-one illustrated worlds and eleven movement-art collections. Hide movement labels or all text, including slides. Artwork provenance is in `ARTWORK.md`, `ARTWORK-ADDITIONS.md`, `ARTWORK-8BIT.md`, and `ARTWORK-CLAY-BRICKS.md`.
5. **Show:** customize optional title, instruction and closing slides; paper sweep, dissolve, iris, zoom, curtain or clean cuts; countdown, page motion, audio fades and gentle motion.
6. **Export:** Full HD 1920×1080 at 60 FPS, or 1280×720 at the same 60 FPS. Save project downloads cues, settings and the original audio in one `.playalong.json` file. New project offers save-first, reset, and cancel; a failed save keeps the current project open.

## Timing

Events have `hits: 1 | 2 | 3`, optional `gap` in seconds, and optional `rhythm`/`slots` for swing and compound patterns. With the grid off, straight pairs use half the next-cue interval; the last cue inherits the prior interval (0.5-second fallback). With the grid on, automatic hit spacing uses the section tempo. See Musical timing below for subdivisions and boundaries. `cueTiming` is shared by graphics, waveform markers, live cue sounds and export. `hitTestCue` uses shared card geometry and compensates for responsive/fullscreen letterboxing.

`project.mjs` validates version 2 projects and migrates uploaded-audio version 1 projects. Event `at` is in original source-audio seconds, independent of slide duration and trim. Out-of-trim cues remain editable but do not play/export. Live taps within 40 ms replace a cue; distinct stored cues must be at least 1/120 second apart.

`track.mjs` decodes once to 48 kHz, downmixing multichannel sources as needed. Preview follows the audio output clock where available. Original source timing, trim, level and fades are shared with export. The song begins after the opening slides and ends before the closing slide; these bookends are silent.

`cue-audio.mjs` creates five original short percussion samples for optional paired and compound accents. The same samples, trim boundaries, sample positions and volume feed preview and export. Cue recording suppresses them. Paired-sound playback reserves 15% song headroom; each accent peaks at 15% before its volume control, and tails end before the next hit to prevent overlap. Sound-off output preserves the previous original-audio-only path.

`scene.mjs` draws the same deterministic 1920×1080 composition for preview and export. The transition into activity completes before the first song cue. Text-free output makes zero text drawing calls. The ending fades into a short dark frame hold.

## Offline MP4

`offline-video.mjs` feeds explicitly timestamped 60 FPS frames to WebCodecs H.264 and 48 kHz stereo PCM to AAC at 192 kbps. Continuous encoders, bounded queues, progress and cancellation are included. No playback clock, screen recording, real-time fallback or frame-rate reduction is used. Speed depends on device/browser and is not guaranteed to exceed real time.

H.264/AAC encoder support is probed before rendering. Unsupported browsers receive an error. A cancelled or failed export retains the previous completed video. The locally modified MIT-licensed `dist/vendor/mp4-muxer.mjs` supports signed B-frame composition offsets and an AAC priming edit list. Font and muxer licenses are in `dist/licenses/`.

## Editor and storage

`app.mjs`, `creator.css` and `index.html` provide the editor, waveform, transport and dialogs. `catalog.mjs` contains movement/art choices. `storage.mjs` stores audio in IndexedDB and packs projects.

`window.PlayAlongStudio` exposes `getProject`, `getStatus`, `loadProject`, `play`, `pause`, `seek`, `recordCues`, `markCue`, `saveProject`, `renderVideo`, `renderFrame`. Seek/renderFrame use complete-show seconds; stored events use source-song seconds. This is an in-page automation API, not a hosted API.

Autosave uses `drews-play-along-creator-v2`, with read-only fallback to the previous v1 key. Local storage is browser/device specific; portable projects are the user backup.

## Verification

- `npm test`: schema/migration, cue-page boundaries, source timing, exact PCM placement/chunk continuity, cancellation and 60 FPS settings; DOM interactions for upload, live cues, take undo, timestamp editing, waveform dragging, art, slide edits and embedded-audio project round-trip.
- `node tests/render-scenes.mjs`: native Canvas scenes, six transitions, all text-free art sets, first-cue visibility, final exit and 720p scaling. Requires environment-provided `@napi-rs/canvas`.
- `node tests/export-muxer-integration.mjs`: production render/mux code with real FFmpeg H.264 B-frame/AAC packets as WebCodecs surrogates. Checks 1080p/60 FPS, frame count, durations, complete decode and source-impulse alignment within 1 ms. Requires native Canvas and FFmpeg.

Native images were visually reviewed. Supported control-browser was unavailable, so interactive browser layout, actual browser codec negotiation and hardware export speed remain unverified. Paired-cue tests cover single-card grouping, two pulse boundaries, hit testing under scaling/letterboxing, spacing, PCM continuity, sound muting, playback scheduling and stopping. The MP4 integration also verifies the second audible clap. DOM/native-codec tests do not imply browser QA.

## Musical timing

`rhythm.mjs` owns validated tempo sections and the editable beat grid. The project remains version 2; older projects default to free timing, preserving their existing cue-spacing behavior. In 2/4, 3/4, and 4/4, BPM counts quarter notes; in 6/8, 9/8, and 12/8 it counts dotted quarters. Each section starts a new measure at its source-audio timestamp. Existing cue anchors are never quantized automatically.

`cueTiming` is the single source for preview highlights, waveform dots, audio scheduling, and offline PCM. Straight pairs use one-half of a beat, swung pairs use the section’s 0.5–0.75 ratio, and compound cues store selected indices from `[0,1,2]`. A manual pair delay takes priority. Patterns are proportionally compressed when they would cross the next cue, tempo section, or selected audio end; the inspector reports this. Silent compound subdivisions use drawn rest marks, including text-free mode.

The optional tempo estimator uses three energy-band onset envelopes and autocorrelation in a worker, inspired by the general method in [Ellis (2007)](https://www.ee.columbia.edu/~dpwe/pubs/Ellis07-beattrack.pdf). It is original lightweight code, not an implementation of the paper’s full beat tracker or Mel front end. It suggests up to three pulse candidates and does not infer meter, swing, or phase. Stereo is downmixed and decimated to approximately 12 kHz for this analysis only; source audio and export quality are unchanged. Tap tempo uses recent intervals with outlier rejection.

Validation adds rhythmic timing/section/compound-slot tests, sample-exact audio chunk checks, synthetic straight/swung tempo fixtures, UI save/reopen and suggestion acceptance, native Canvas compound scenes, and a real H.264/AAC export surrogate with audible swung and compound hits. Interactive browser QA is unavailable in the current managed environment.
