# Composition update verification

October 24, 2026.

- Full regression suite: 262/262 passed.
- Follow-up tests after audio-tail and export refinements: 20/20 passed.
- Browser: phrase selection/duplicate/undo, score controls, paginated teacher preview, and classroom export completed.
- jsdom integration: named versions save/restore with automatic pre-restore copy, expression edits and Undo, print controls.
- Native audio and PDF/ZIP export: classroom package contains teacher PDF, selected recorder PDF, full WAV, omitted-recorder WAV and readme. WAV files differ, use stereo 44.1 kHz PCM, and ZIP integrity passes.
- Retail HTML build bundles the new document tools with local assets.
- Browser download capture on the HTTP preview did not yield a file handle. File contents were checked through the same export implementation in the Node/jsdom harness; its font metrics are approximations. The browser page preview was reviewed directly.
- The existing buyer ZIP and standalone manual were not replaced in this implementation turn. Update those with the next retail release.

The retained screenshot shows the browser print preview of a short QA composition, not the user's saved music.
