# Buyer package and documentation - October 24, 2026

- Rebuilt the full paid local-HTML edition from the current application.
- Added the 20-page user manual and two-page START-HERE PDF, with reproducible
  ReportLab source. The manual covers use, student composing, and what's new;
  it does not discuss the color scheme.
- Rendered and visually reviewed all 22 pages; verified page counts, contents
  references, and text margins. Rechecked the updated what's-new page.
- Assembled a 523-file buyer ZIP with the editable My Orf Assignment demo,
  original notices, source modules and rebuild support. ZIP CRC test and a
  complete extraction passed. All 419 packed assets match source bytes exactly.
- The extracted local-file package boots, displays all 38 instrument choices,
  loads matching sample bytes, opens the demo, renders the score, and toggles
  Focus / Instrument + score. MP3 worker blob initialization passes.
- This check found an unguarded localStorage getter in score-workspace startup.
  Guarded that preference access and writes; favorites remain usable during a
  storage block, with a message. The original saving warnings remain in place.
  The local-file smoke check runs with jsdom's blocked opaque-origin storage,
  so it now also covers this startup regression and both score-view toggles.
- Full existing test run: 288/289 passed. One native-audio exact-sample equality
  assertion failed during the concurrent run; its complete three-test file
  passed in isolation without changing the test or audio code. Record this as
  an intermittent test result, not an all-green concurrent suite.
- After the storage guard, 11 persistence and score-comfort integration checks
  passed. The rebuilt and extracted package passed its smoke check again.
- Browser video encoding, actual MIDI hardware, and physical mobile devices
  were not re-tested in this documentation/packaging release. The manual states
  the relevant support limits. Existing browser UI QA is retained separately.
