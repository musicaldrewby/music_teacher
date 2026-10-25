# Mr. Drew’s Four Corners Studio

A buildless, browser-local classroom game for Drew Wichman. The published static files are in `dist/`.

## Included

- Game Show, Space Station, and Jungle Temple stages.
- Click-to-edit board, round thumbnails, duplicate/reorder/shuffle, undo and redo.
- Question, mystery, and random rounds with independently selected participation rules.
- Pausable countdown, manual or automatic reveal, presentation controls and keyboard shortcuts.
- Original v8 `.4cr` import; self-contained game exports preserve pictures and audio.
- IndexedDB saved games, per-project media collections, printable corner signs.
- Instrument, rhythm, note and dynamics cards; synthesized listening rhythms and uploaded audio with trim points.
- Four editable starter games with 32 total rounds.

## Validation

Run `node --test tests/game.test.mjs` from the project root. The tests cover saved-game compatibility, starter correctness, cancellation, countdown pause/resume, mystery visibility, selection alignment, and asynchronous audio cancellation.

Browser QA was unavailable in the managed environment for the initial version. Real iPad, projector, print and audio checks remain useful acceptance checks.

## Data

Games are stored on each browser/device. Export `.4cr` backups to move between devices. No student identities, scores, analytics, or external application connections are collected. Remote media URLs need network access; uploaded media is included in game files. The application has no server data dependency.

## Source

- `core.js`: project model, import validation, and cancellable round engine.
- `content.js`: starter content, musical notation and vector artwork.
- `audio.js`: sound effects, music cues and trim playback.
- `storage.js`: IndexedDB and file ingestion.
- `app.js`: editor, stage, dialogs and interaction handling.
- `style.css`: stage themes, responsive editor and printing.

Created by Drew Wichman.
