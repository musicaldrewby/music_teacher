# Stable editing workspace — October 24, 2026

## Changes

- Sequencer chrome is compact and its grid fills a bounded workspace. The note scroller has a consistent height across instruments, including instruments with only one or five percussion rows. Its ruler stays visible during vertical scrolling.
- First visits reveal the part’s earliest notes (or its low register when empty). Each part/section keeps independent scroll positions for the current session, including returns from another mode. Clicking the active mode no longer resets the workspace scroll.
- Write, Select and Erase share a permanently sized phrase toolbar. The note inspector, part/section actions, playback tools, quick mixer, practice settings and focused score edit tools open over the music instead of moving it.
- Notation selection controls use a bounded scroll area; note details remain inside it. Score appearance and detail disclosure states survive edits. Chord and tie controls retain their space. Error feedback overlays the score rather than expanding its toolbar.
- Stable scrollbar gutters, fixed context columns and nonwrapping sidebar names prevent incidental horizontal shifts. In-app help describes the reorganized controls.

## Browser checks

Managed Chrome with a temporary exact-size iframe (removed before packaging):

| Viewport | Grid top | Grid height | Document overflow |
| --- | ---: | ---: | --- |
| 1366 × 768 | 338 px | 266 px | None |
| 1280 × 720 | 338 px | 218 px | None |
| 1920 × 1080 | 344 px | 552 px | None observed |

At 1366 × 768, soprano recorder, alto xylophone and five hand drums all retained grid x=239, y=338, height=266. Their own sample notes were visible on first entry. Write/Select/Erase, note selection, Note details, Playback tools and mixer open/close retained those same grid bounds. At 1280 × 720 all three parts retained y=338 and height=218, with notes visible and document width=1280.

At 1920 × 1080, selecting a note and toggling Mute during the actual Saving… state retained grid y=344, height=552, track tabs y=174 and editing toolbar y=222.

Focused score tool modes retained paper y=343 at laptop size. At 1280 × 720, opening and closing Entry & edit tools or the quick mixer retained paper x=276, y=343, width=961. The normal score’s appearance disclosure retained its own 35 px height and document-space paper position; spacing changes kept the disclosure open. Initial browser locator focus can scroll the outer workspace to a target, which is distinct from a layout change.

## Regression checks

- 26 focused checks passed for sequencer editing, per-part viewport memory, chooser, inspector, score comfort, phrase repeats and metronome transport.
- 23 score composer/comfort checks passed after the final score panel change, including chords, ties, range selection, clipboard, independent written duration, playback and undo.
- 3 note-duration/phrase UI checks also passed. There are 44 distinct checks across these suites; repeated checks are not counted twice.
- Final local-HTML retail compatibility build completes with 419 assets. The existing duplicate-case warning in vendored document-tools remains. No buyer ZIP or manual is issued in this turn.

Proof: stable-sequencer-20261024.jpg. All preview changes were made in the local QA fixture, not a buyer project.
