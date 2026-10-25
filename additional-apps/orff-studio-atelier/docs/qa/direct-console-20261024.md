# Permanent bottom-console controls — October 24, 2026

- Removed the More popover. Section bars and Undo take remain in the bottom
  console, with existing control IDs and handlers preserved.
- Grouped playback, section settings, recording actions, mixer, and output.
  Undo take keeps its footprint while disabled or available.
- Browser inspection at 1024×768, 1280×720, 1366×768, and 1920×1080:
  all controls fit without horizontal overflow; console height is 115 px.
  At 1280×720, switching Alto xylophone / Hand drums and toggling Click left
  the console, Section bars, Undo take, and note-grid rectangles unchanged.
- Retained a 1280×720 screenshot in direct-console-20261024.jpg. Removed the
  temporary browser layout harness before packaging.
- 28 existing take, section-repeat, score-comfort, and sequencer-tool tests
  passed. JavaScript syntax check passed.
- Updated the user guide, screenshots, in-app help, README, and what's-new.
  Manual remains 20 pages; START-HERE remains two. Rendered and visually
  reviewed changed pages 1, 2, 4, 6, 10, and 12; text stays within margins.
- Built and extracted the 523-file buyer ZIP; ZIP CRC validation passed.
  The extracted file-based app boots all 38 instruments, has direct console
  controls and no More menu, loads matching tubano sample bytes, opens
  My Orf Assignment, renders notation, and toggles score Focus and companion
  while local storage is blocked. MP3 worker Blob initialization passed.
- This change does not alter audio or recording behavior. Real MIDI hardware,
  browser video encoding, and physical mobile devices were not re-tested.
