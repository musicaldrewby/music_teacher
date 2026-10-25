# Beginning Band Board

Buildless HTML/CSS/ES-module classroom app, created for Drew Wichman.

- Seven instruments, low Ti through La, concert B-flat Do.
- 49 original-chart-based fingering displays; source diagram shapes are preserved.
- Fullscreen blank, treble, bass, and two blank staff whiteboards with separate browser-local ink. The blank board has a plain white background with no lines or clefs. Staff lines are continuous vector strokes; engraved clefs replace the raster overlays.
- Rhythm Writer: eleven infinite cloners for the requested notes, rests, and measure line. Drag with mouse, touch, or pen; tap to append. Move, copy, delete, undo/redo, clear, place freely like refrigerator magnets, resize symbols, add optional guide lines, save PNG, and retain the rhythm locally.
- All 49 small note staves use the same clean vector clefs, preserving written pitches and original fingering diagrams.
- Annotatable charts, undo/redo, eraser, pen-only option, and PNG export.
- Touch holds do not open browser context menus, select classroom text, or drag native images/links. Search text remains editable; help pages retain touch scrolling and boards retain finger/pen drawing.
- Sounding reference pitches and a whole-band comparison view.
- Rehearsal tools in a dedicated bottom layout row on every screen, with all charts and writing surfaces confined above it: 30–300 BPM metronome with original marching click, woodblock, cowbell, and beep sounds; tap tempo; simple/compound meters; subdivisions, accent, and independent volume; a large beat view and local clock. Audio uses a worker-driven lookahead scheduler on the Web Audio timeline.
- Optional pack-up reminder: choose a finish date/time and 1–60 minute lead (default 10), enable the reminder, and test the chime. It pauses the metronome and shows a large dismissible message once. Settings and delivery state survive reloads; no daily recurrence. The page must remain open and awake; supported browsers receive a screen wake-lock request while needed. Restored audio may need a user tap.
- 34 problem-oriented sound-help cards with teacher notes and source links. All student instructions use “your teacher.”
- Instrument Troubleshooting: 45 common problems across seven instruments, with student checks, teacher assistance, conditional repair decisions, and care references. Search within the chosen instrument or filter by who should help first.

The uploaded PDF is retained in `reference/original-chart.pdf`. Run `python3 scripts/extract_charts.py` to recreate chart assets with PyMuPDF. Added fingering key states were verified against Woodwind Fingering Guide, Yamaha, and University of Mississippi brass charts; links are included in the app. Low clarinet B3 uses the right middle finger. Clarinet A4 uses the throat A key only. The flute uses the original long B-flat fingering and normal B-thumb shape. Euphonium is bass clef, standard three-valve fingerings. Bell-kit notation preserves the supplied chart's octave; audio sounds two octaves above written.

Bravura glyph outlines are from Steinberg’s Bravura font under the SIL Open Font License. Font source and metadata are retained in `reference/notation-font/`; the license ships in `dist/assets/notation/OFL-Bravura.txt`. Regenerate paths with `python3 scripts/build_notation.py` (FontTools), then clean staves with `node scripts/build_staffs.mjs`. No font downloads or third-party runtime dependencies are required.

Serving `dist/` over HTTP requires no installation or build. Source and deployment are owned by Sites. The native hosting manifest retains the project's identity.

Verification: syntax, all 98 per-note staff/diagram assets, all 49 note mappings, 34 help cards, rendered added fingering/staff diagrams, and drawing state/persistence/undo/redo/input filtering. The rhythm update also passed `node scripts/check_rhythm.mjs`: repeated cloning, dragging/tapping/cancelling, history, deletion/clear recovery, persistence, bounds, continuous staff geometry, and referenced chart assets. All eleven rhythm symbols, both clefs, and all 49 note staves were rendered and inspected. Browser UI and physical classroom pen were not available for end-to-end validation.

Sound and instrument-care review (2026-10-15): refined flute air-speed guidance, saxophone lower-lip support, individual brass setup, optional teacher-guided mouthpiece work, and bell striking/selection. Added direct euphonium references and moisture help for all six winds, including third-valve / third-slide-water-key instructions for equipped trumpets. Visible headings and exports use general classroom wording; creator credit remains. Mechanical triage draws on manufacturer manuals and care guides, plus David Mathie’s teacher-repair guidance. Repair roles are conservative classroom adaptations; actual model instructions and staff expertise take precedence. `node scripts/check_troubleshooting.mjs` verifies all cards and reference mappings, search/filter/reset, instrument switching, and teacher wording. Browser end-to-end testing was unavailable.

Rehearsal tools verification (2026-10-15): `TZ=America/Denver node scripts/check_rehearsal.mjs` covers 60-second audio schedules, accents and subdivisions, stalled-tab recovery, stop cancellation, waveform bounds, tap tempo, reminder boundaries, midnight, disabled reminders, and one-shot delivery across reloads. Browser audio, smartboard touch, and physical speaker loudness require on-device verification.

Created by Drew Wichman.

Rhythm magnet update: old saved notes retain their positions, but snapping is always off. Optional guide lines never move notes. Copies appear beside the selected symbol; tapped symbols appear near the board center. Dragging keeps exact fractional positions inside the visible symbol bounds and brings the moved symbol to the front.
