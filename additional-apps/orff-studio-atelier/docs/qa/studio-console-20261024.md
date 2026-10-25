# Warm studio console — October 24, 2026

Implemented in the full paid app checkout. Forest panels, slim walnut rails, brass knobs, raised ivory buttons and an amber master peak meter share the existing project/audio model. Screen-only styling preserves the printable score. The bottom mixer drawer provides per-part level, pan, mute and solo, with the full mixer still available. Section bars and Undo take live under More.

## Validation

- Browser layout checked at 1366 × 768, 1280 × 720 and 1920 × 1080 using an exact-size iframe in a temporary local QA page. Document scroll width equaled viewport width at each size. Four-measure score remained readable with the drawer closed; larger scores and an open drawer use normal workspace scrolling.
- Keyboard master adjustment changed 75% to 74% and back. More exposes section length and Undo take and closes with Escape. Quick mixer expands/collapses. Full mixing desk renders the new channel strips and knobs.
- Actual sample playback drove the analog-style meter needle; silent output returns to −60 dBFS. Meter uses the existing engine analyzer, not generated motion. Preview browser reported no application errors.
- 13 focused Node tests passed for audio mixing, track identity, metronome restart, recording preferences, score workspace and new console gestures. After adding cross-view synchronization, all 7 score/console UI tests passed, including one additional test for drawer/full mixer/instrument/master consistency. These cover saved project values, separate undo steps for successive drags, keyboard checkpoints, canceled pan drags, and live level/pan changes during isolated score listening.
- Final retail compatibility build completed with 419 packed assets. A pre-existing duplicate-case warning in vendored document-tools remains. This is a compatibility check, not a newly issued Teachers Pay Teachers ZIP or updated manual.
- Temporary viewport QA page removed before packaging. Proof screenshot: mallet-measure-console-20261024.jpg.
