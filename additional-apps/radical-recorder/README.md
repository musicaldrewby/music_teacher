# Radical Recorder

Created by Drew Wichman. A buildless static application hosted with GPT Sites.

## Source

Adapted from Drew’s original `radical_recorder.html`:
https://github.com/musicaldrewby/music_teacher/blob/main/radical_recorder.html
Original GitHub blob: `99c50c3fac52971c636582c48a16ed6ad7bff9a0`.

The original soprano/alto modes, note orders, fingerings, and 15-song library are retained. The teaching interface and synthesized recorder voice have been redesigned. Application behavior is separated into browser-native ES modules; no CDN, third-party script, build step, server, microphone, or external service is needed.

## Changes

- Audio-clock song scheduling with pause/resume and playback speed; short-note envelopes and audio-node cleanup.
- Pointer capture, pointer cancellation, keyboard holds, and interruption handling prevent stuck tones.
- Session fallback when local storage is unavailable. Settings, note orders, recordings, and pitch-stack layout use one validated, atomic storage record.
- Validated backup import, legacy v1 compatibility, safe text rendering for recording titles, and all-or-nothing state replacement after confirmation.
- Pitch-stack persistence, B–A–G starter, bounded dragging, keyboard positioning, clear recording status, and silent visual feedback.
- Clearer high/low note labels, fingering legend, persistent song transport, responsive tablet/phone layout, accessible controls and modal focus handling.
- D-sharp and G-sharp double-hole diagrams corrected to one fully covered small hole and one open hole. Reference: Yamaha’s Baroque soprano fingering chart, first and second rows:
  https://www.yamaha.com/en/musical_instrument_guide/common/images/recorder/fingering_baroque.pdf

Song lessons and melody recording use soprano recorder. Alto supports fingering exploration and a touchable letter pitch stack.

## Data migration

Storage is local to the browser and site address. On the old app, choose Teacher Settings → Save All. On this app, use Teacher Settings → Import. A backup contains recordings, note order, settings, and (for v2) pitch-stack positions. It does not contain microphone audio; recordings capture the notes played in the app.

## Validation

Run `node --test tests/*.test.mjs` and `node --check dist/app.js`.

Tests exercise the full app in a minimal DOM/event simulation with a fake audio clock, plus pure import, storage, recording, timeline, pitch-data, drag-boundary, and Web Audio node-lifecycle checks. No real browser, visual layout, iPad touch, or audible playback QA was available in the creation environment. Those remain device checks.


## Teaching board update

The board now has Explore Notes and Teach a Song modes. A song selection loads only its pitches into the touch stack and opens two measures of notation. Teachers can switch between staff notation, staff plus letters, or letters plus rhythm; enlarge the fingering display; hide either teaching panel; and use Present to hide the teacher sidebar.

Playback supports optional count-in, tempo, model-sound mute, phrase selection, repeat, pause/resume, and touching score notes to pause at a fingering. Compound-meter count-ins use two dotted-quarter pulses. The tempo control is based on quarter-note units, matching the original song timing.

Saved lessons snapshot the note selection, song, tempo, phrase, display settings, note size, and custom pitch-stack positions. Per-song layouts also survive song changes. A v3 backup contains the active board, lessons, recordings, and layouts; v1/v2 backups remain importable. Storage remains browser-local.

Recordings retain free timing unless the teacher explicitly chooses Snap Rhythm when saving, or Make a Score Copy afterward. Snapping uses an eighth-note grid. The original built-in song durations are preserved; the score renderer adds bar splits, ties, accidentals, and the Amazing Grace pickup. This update does not claim a musicological transcription audit of the original arrangements.

Music symbols use vector outlines from Steinberg’s Bravura under SIL Open Font License 1.1. The license is included in the source and deployed assets. Font source: https://github.com/steinbergmedia/bravura/tree/master/redist/otf . No external font request is required.

Validation for this update: 15 passing automated tests covering all original songs, measure and tie duration accounting, pickup/compound meter, phrase clipping, explicit quantization, saved lesson/layout round-trips, old imports, storage failures, live app events in a DOM simulation, count-in/pause/repeat, and score interaction. Representative generated notation was rendered and visually inspected as SVG/PNG. Full browser layout and audible device QA remain unavailable in this environment.

## Studio themes and recorder voice

The header’s Themes button offers Sunlit oak, Dark walnut, and Sculpted ivory with immediate visual selection. Each uses a different band of the generated material atlas in `dist/assets/materials.png`, complemented by native CSS lighting, tactile note pads, grain, and an editable SVG recorder with accurate hole states. Theme selection is browser-local, survives reloads, and is included in backups; older backups default to oak. Theme changes leave lesson notes and arrangements intact.

The audio voice uses a fundamental-led harmonic waveform, a small amount of bandpass-filtered breath, a gentle tongued envelope, and a short release. Count-in has a separate sine click. Oscillator and looping breath sources share a gain envelope and are both stopped and disconnected on release, cancellation, and playback interruption. This is synthesized sound, not a recording of an acoustic recorder.

The material atlas was made with the built-in image-generation tool. Its prompt requested three equal horizontal bands: pale honey oak, dark chocolate walnut, and ivory limestone, under uniform diffuse lighting with no objects or text.

Verification: automated DOM/event, theme migration, backup, score, transport, and audio lifecycle tests; static recorder artwork review. Real browser layout, touch hardware, and listening checks remain unavailable in this environment.

## Teaching views and vertical stacks

The starting view is now Pitch stack: a single column ordered from highest to lowest pitch. Fingerings provides a tall recorder and a separate large staff note. Song combines the teaching panels with sheet music. Each view remembers its Recorder, Staff note, Pitch stack, and Sheet music visibility independently. Notes & songs opens the teacher controls, saved lessons, and library. View changes preserve the selected song, notes, timing, and ongoing playback.

Sheet music can collapse to a transport bar, expand to the teaching area, or be hidden. When music is hidden, compact Play/Pause/Resume and Stop controls remain available beside the lesson title. Hiding all panels provides Restore this view.

Automatic stacks never form extra columns. Fit uses the available viewport height down to 60 px per note; more notes extend an independently scrollable canvas. The size slider sets an explicit note size. The toolbar stays outside the scrolling note area. Playback brings the active pitch into view. Vertical and Custom switch between a sorted display and saved positions without replacing those positions; dragging or keyboard movement starts a new custom arrangement from the currently displayed positions. Resize observation recalculates the canvas when panels open or close.

Version 4 backups include view preferences, panel visibility, stack layout, fit, and teacher-controls visibility. Earlier backups migrate to the vertical display while retaining custom coordinates, songs, and lessons. Tests cover 1–80 notes at multiple widths/heights, ordered pitches, non-overlap and bounds, custom positions, legacy migration, view restoration, independent panels, score collapse/expansion, continuing playback across views, and the existing audio/recording/import behavior. Real browser layout and touch hardware remain unverified in this environment.
