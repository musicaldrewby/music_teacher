# Music Sketchbook

A buildless music notebook created for Drew Wichman. Deployment serves `dist/`.

## Features

- Staff-only entry: treble, bass, or grand staff; one rhythmic voice per staff.
- Whole through sixteenth notes and rests, dotted values, accidentals, written chords, automatic beams, and ties.
- 2/4, 3/4, 4/4, and 6/8; major key signatures; quarter-note tempo from 30–240.
- Lyrics and chord symbols attached to events, normal/double/final barlines, and up to 128 measures.
- Score zoom from 75–300%, 175% default, a remembered device preference, and an expanded score view. Printing uses normal page sizing.
- Local draft saving, JSON song import/export, undo/redo, print/PDF through the browser, and synthesized piano-style playback.

Choose a value and click a pitch on empty staff space to append a note. Existing notes can be selected, dragged vertically, or Shift-clicked to add a chord tone. Faint rests indicate unused capacity. Filled measures advance the editing position; note entry beyond a barline requires choosing the tie/split action.

The app stores the working draft in browser localStorage. Save song downloads a portable editable file. There is no server-side song storage, external font dependency, or runtime CDN dependency.

## Files

- `dist/model.js`: rhythm, pitch/accidental rules, validation, ties, and playback timeline.
- `dist/app.js`: SVG engraving through bundled VexFlow 4.2.5, editing, Web Audio, and UI.
- `dist/style.css`: responsive notebook layout and print styles.
- `dist/vendor/`: bundled VexFlow and its MIT license.

## Verification

Run `npm test`. Tests cover meter capacity, dotted rhythms, explicit overflow splitting, accidental carry across ties, independent grand-staff playback, malformed imports, and SVG generation with bounds checks. SVG checks use a DOM harness with approximate text metrics; they do not replace live browser, pointer, audio, and print QA.

Initial implementation was verified with these tests and inspected SVG output. Live browser QA was unavailable in the authoring environment.
