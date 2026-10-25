# Mr. Drew's Bingo Maker

Imported from https://musicaldrewby.github.io/music_teacher/bingo_maker.html on October 8, 2026.

## Run and edit

Open `dist/index.html` in a modern desktop browser, or serve the `dist` directory with a static web server. The app keeps its purple, pink, and teal palette and playful lettering, with the simpler workflow and reliability fixes listed below. No build or package installation is required.

The Site entrypoint is `dist/index.html`. The original, unmodified HTML is in `original/bingo_maker.html`. Styling, export libraries, and fonts are bundled under `dist/assets`; the runnable copy references those local files. `DEPENDENCIES.json` records the original asset URLs and download hashes (before font CSS URLs were rewritten).

The app supports text, image, and audio items; CSV import; project JSON save/load; printable cards; classroom presentation mode; bingo verification; and PowerPoint caller export. Images and audio are supplied by the user and are embedded in saved project JSON files. There were no built-in image or audio files referenced by the source page. Printing uses the browser print dialog; select Save as PDF there. The source's existing restriction on PowerPoint export in audio mode is preserved.

## Migration changes

- Replaced external script and stylesheet references with bundled copies.
- Rewrote font stylesheet URLs to bundled font files.
- Added page description metadata and Sites hosting configuration.
- Preserved the original layout and retained the unmodified original as a reference.

## Reliability update

- Project JSON version 2 includes the generated card layouts and their set number. Legacy project files remain supported; they contain no saved card layouts.
- Reprinting reuses existing layouts. Increasing the quantity adds cards without changing earlier card numbers. Printing fewer cards keeps the remaining layouts available. The small Generate new card set control deliberately replaces the set after confirmation.
- Printed pages and the verification dialog show the set number. Changes to items, content type, free-space placement, or student matching rules invalidate the current card set. Save Project after generating a set to retain it for later use.
- Loading fully validates a project before replacing the current one, asks before discarding unsaved work, and resets previous caller and verification state.
- Text and media attributes are escaped before entering HTML. CSV supports quoted commas, escaped quotation marks, multiline fields, CRLF, and a UTF-8 BOM.
- Failed file reads and damaged images report errors; a media batch continues with other files. Audio playback errors are handled, with stale playback attempts ignored after stopping or changing recordings.
- Fisher–Yates shuffling is used for cards, caller order, and PowerPoint games. Print quantities must be whole numbers from 1 through 100.
- An unsaved-changes warning covers navigation and closing the tab where supported by the browser. Saving tracks edits that occur while a file picker is open. The classroom update also adds device-local IndexedDB draft recovery.

## Create, Print Cards, Play

- Three freely accessible steps replace the all-in-one editor. Save Game and Open Game remain in the shared header, including during play.
- Create has Words/Pictures/Audio buttons, free-space buttons, labeled answer/clue fields, a readiness meter, and matching examples. Pictures and audio show only their relevant matching controls.
- Answer / card words controls student-card text; Teacher's clue (optional) overrides words on the teacher's screen only. Clue fields hide in picture-only and sound-only teacher modes, preserving existing clues for later use and saving. Picture imports explain that the filename is just the initial answer label.
- Preview an item selects any item for the matching examples. Focusing or editing an answer or clue also previews that item. Selecting a preview leaves card layouts, saved game data, and live rounds unchanged; removing the selected item falls back to the first available item.
- Print Cards generates a real, saved card set for browsing. The preview and printed output use the same cell renderer, matching rules, color setting, and card layouts. Switching preview pages never reshuffles cards. Quantity increases extend the existing set; fewer cards print a prefix of that same set.
- PowerPoint caller export is under More export options. Audio mode continues to use the built-in caller.
- Play can be opened directly. Once a round starts, navigating between steps retains its draw pool and history and stops any playing recording. Editing game content ends that round and invalidates its cards as before.
- Explicit Show Answer / Hide Answer buttons replace hover-only revealing, both for the current call and for individual history items. Answers stay hidden for new calls until revealed. Caller controls wrap on small screens, and layouts scroll instead of clipping.

## Creator credit and support

The header credits Drew Wichman. A friendly support note and yellow Buy Me a Coffee button link to `https://www.buymeacoffee.com/musicaldrewby` in a new tab, preserving the current game. The button is a styled HTML link, so it needs no external widget script or font. The support strip is hidden during active calling and all header content is excluded from printed cards.

## Verification

Run `node tests/regression.cjs`. The 31 behavioral checks cover save/load/reprint, explicit regeneration, legacy files, safe rejection of invalid projects, CSV, quantity limits, card invalidation, unsaved changes, escaped text, card/draw integrity, media failures, PowerPoint export, free navigation, type controls, matching selection without changing a live game, hidden clue preservation through mode changes and save/load, preview/print equivalence for image and audio rules, preserving rounds across screens, and answer reveal controls. The actual PowerPoint library produces a 311-slide deck for a 30-item test pool. DOM and media doubles exercise logic; browser visual layout, native print/file dialogs, and real audio playback remain unverified in this environment.

## Third-party notices

The bundle retains original vendor license headers and includes additional license texts under `dist/assets/licenses`. The included styling library is Tailwind CSS 3.4.17, with jsPDF 2.5.1, JSZip 3.6.0, PptxGenJS 3.12.0, Fredoka One, and Inter. JSZip is used under its MIT license option.

## Classroom update (October 13, 2026)

- Built-in addition, nonnegative subtraction, multiplication, whole-number division and mixed generators. Inputs range from 0 to 20; division uses factors to construct its dividend. Equivalent clues are grouped by answer. Each answer is called once per round, with a randomized equivalent clue. Small answer pools automatically select a 3 × 3 board when at least eight answers exist.
- 3 × 3, 4 × 4 and 5 × 5 layouts, large numeric cells, readable card IDs, ink saver and shared preview/print rendering. Even-sized cards support random or no free space. Changes to size invalidate the old set only after confirmation when layouts exist.
- Line, four corners, both diagonals (X) and blackout verification across all sizes.
- Live speech synthesis with device voices, rate, volume, repeat, stop and test controls. Hidden picture answers are never spoken automatically. Recorded text clues can be uploaded (10 MB maximum) or captured with the microphone (60-second limit); microphone permission is requested only by Record clue. A recording fixes its item to the displayed primary clue. Changing the answer or clue removes stale generated variants and narration.
- Optional 5–30 second thinking timer, pause/resume, manual reveal/advance, and classroom view with editor and history hidden. Escape exits classroom view. Narration ends before the thinking countdown begins for spoken text clues.
- Save Game keeps native file selection when supported and falls back to a download on picker or write failure; cancellation remains cancellation. Download copy always uses a direct download.
- Debounced IndexedDB draft recovery on this device, with a restore prompt and explicit storage-failure message. Drafts preserve game content/layouts/settings, not current-round progress. Downloads remain the portable backup.
- Project format 3 preserves size, variants, recordings and classroom preferences. Version 2 and legacy games still open as classic 5 × 5 games.
- PowerPoint still exports ten randomized caller games and now varies equivalent clues. Narration/recordings are live-only and are not embedded in PowerPoint. Video rendering is not included.

Validation includes the original regression suite plus generated arithmetic, every grid/pattern combination, new and legacy save/load, failure/cancel download paths, spoken clue safety, recording metadata, timer control and draft persistence. Browser visual QA and real speaker/microphone playback require a supported browser environment and have not been performed for this update.
