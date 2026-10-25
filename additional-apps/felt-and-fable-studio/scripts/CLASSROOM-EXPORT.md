# Standalone classroom stories

The classroom export defaults to **Live artwork**. A single offline HTML carries
this story's native scene geometry, original embedded bitmaps, animation data,
and the Canvas renderer used by the app. No frames are encoded as video and no
editor, asset catalog, network fetch, or account is needed by the recipient.
**Video scenes** retains the previous MP4-based player for less capable devices.

Both formats use the same student controls and teacher audio/timing workflow.
Each phrase (including each OOH) waits for a press. Teachers can import audio,
record or edit cue times, choose Auto, and save a new self-contained copy. Files
always reopen in Manual. Existing video-based HTML remains supported.

`build-classroom-renderer.cjs` uses the TypeScript parser and symbol resolver to
extract the transitive drawing dependencies from the app scripts. It excludes
editor initialization, binds project/artwork to the exported payload, and fails
on unresolved globals. The build command regenerates the committed renderer;
edit original rendering functions, not `classroom-renderer.js`. The small
playback adapter in `classroom-live.js` supplies a monotonic animation clock and
adaptive Canvas sizing (up to 3840 px wide).

`classroomPackLive` embeds only referenced images/prop states. It preserves
puppet metadata, speech envelopes, and narration duration needed for visual
animation; it removes unused audio bytes and the custom-piece library. As with
the video classroom player, the included/addable soundtrack is the selected
song, not the editor's full narration/audio mix.

Checks:

- `node scripts/check-classroom-live.cjs`: export without video encoding; compare
  24 actual Canvas frames against the app across six story fixtures; execute the
  downloaded runtime, manual holds, song import, cue recording/pause, automatic
  follow, and save/reopen twice with no external assets.
- `node scripts/check-classroom-player.cjs`: video export and legacy controls.
- `node scripts/check-classroom-teacher.cjs`: teacher tools and saved-copy cycles.

These source-level tests use native Canvas and a DOM/media fixture. They do not
replace browser QA or measure frame rate on teachers' devices. Source bitmaps
retain their original resolution; live Canvas avoids added video compression.
