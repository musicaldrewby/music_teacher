# Film production · v1.79

Open **Film** beside **Script**. Existing stories do not need conversion.

## Timeline

Scenes, camera shots, music, voices, sounds, character actions and named music
markers share a movie clock. Change the scale to inspect a long film. Click a
block to select its editor or inspect the frame. Play from here includes audio.

Markers use movie seconds; actions and pose changes use scene seconds. Attach an
action, sound or pose change to a marker with an optional offset. Music markers
stay at their original time when a scene length changes. The Film scene-length
editor rejects cuts that would strand a linked cue or truncate existing content.
Other editors can leave unresolved links; Review reports them. Unlink a missing
cue through the marker target list, or delete its marker to release its links.
Deleting a marker leaves its cues at their last valid positions.

MIDI import supports standard format 0/1 with PPQ timing and tempo changes. It
suggests track entrances, tempo events and written markers. Select suggestions
and set the movie offset before adding them. Suggestions do not identify story
characters automatically and MIDI import does not synthesize audio. Import the
rendered score in Sound. At most 100 selected suggestions are added per batch.

## Complete artwork and story actions

Illustrated pose controls work on image pieces without attached props or an
interactive-prop state pack. Every pose is a complete drawing. Set each drawing's
original facing, then select As drawn, Left, Right or Direction of travel.
Front-facing art remains front-facing; no profile is invented. Timed changes are
clean whole-image swaps. No face-only deformation, head rotation or 3D swivel is
used. Existing articulated cast acting is unchanged.

Imported PNG/JPEG/WebP poses use the original piece's bounding box, preserve their
aspect ratio and align at its bottom center. Matching transparent canvases give
the best registration. Preview before/at/after each change. Asset references are
included in story saves and loaded for scene rendering and export.

Story actions are Sneak/freeze/listen, Swoop/tease/retreat, Approach/pause/retreat,
and Startle/settle. They move the complete piece and add to existing motion. Set
timing and travel distance, then copy/paste an action onto another piece. They
occupy their own non-overlapping lane and are saved in the project. Existing
articulated Saved performances also capture this lane. Actions never change the
camera automatically.

## Narrator

Default: Fable, natural voice, normal delivery, speed 0.97. New clips use the
saved profile. Existing clips retain their original voice when their text changes.
Pronunciation entries use `written word = spoken version`; the script retains
the written wording, while synthesis uses the substituted wording. Listen to
proper names before exporting. Overrides are text substitutions, not phoneme/IPA
support. Speech is generated locally by the existing speech worker.

Changing a line regenerates only that clip (or reuses identical saved speech).
Allotted seconds is a review target, not automatic time compression. Clips can
cross scene boundaries without moving music or later scenes. Review flags
voice overlaps, slot overruns and narration past the end of the film. Generation
is an atomic edit: failure or cancellation leaves the previous story intact.

## Review and export

Review reports candidate long holds (12+ seconds without authored movement or
voice), long repeating idle blocks, backward-facing motion, unresolved marker
links, voice overlaps and overlong clips. These are editorial hints, not failures;
intentional musical rests, backward steps and simultaneous voices may be right.
Choose any scene to render its beginning, middle and ending with the actual movie
renderer, or play that scene with sound.

Precise export already caches independent two-second video sections in IndexedDB.
The cache is bounded at 384 MB, so older sections may be evicted during a long
film. This release adds a saved progress summary and a Resume button that restores
the last matching story's range, scene, size and frame rate. Completed matching
sections are reused; changed scenes and dependent dissolves are rendered again.
Audio is freshly mixed for each export. Resume is best effort within this browser
and device; clearing browser storage removes it. Compatibility export cannot
resume. Download last video again reuses the last finished Blob while this tab
remains open. Keep a downloaded story file as your durable editable backup.

Every completed download is checked for a complete MP4 box structure, including
its video data and movie index. The existing encoder checks frame counts, order,
keyframe boundaries and compatible decoder settings before caching. A paused or
failed export does not save incomplete sections.

## Authoring interface

`FeltProduction.summary()` returns a revision, film duration, scene times,
illustrations, actions, narrator clips, markers/bindings, and review notes.
`FeltProduction.apply({expectedRevision, operations})` uses the same atomic
transaction, validation, artwork loading and Undo as the UI. Supply the revision
from the latest summary. Up to 100 operations can be applied together. Times and
travel distances must be finite numbers. The WebMCP tools `felt_read_film` and
`felt_edit_film` expose these functions when `document.modelContext` is available.
The existing Director tools still create/import scenes, artwork and audio.

Operation fields (in addition to `op`):

| Operation | Fields |
| --- | --- |
| `marker` | `id?`, `label`, `time` (movie seconds) |
| `deleteMarker` | `id` |
| `bind` | `markerId` (null to unlink), `sceneId`, `pieceId?`, `kind` (`action`, `pose`, `cue`), `targetId`, `offset` |
| `resizeScene` | `sceneId`, `duration` |
| `action` | `sceneId`, `pieceId`, `id?`, `preset` (`sneak`, `swoop`, `approach`, `startle`), `start`, `duration` (0.2–120), `dx`, `dy` |
| `deleteAction` | `sceneId`, `pieceId`, `id` |
| `illustration` | `sceneId`, `pieceId`, `illustration` (null to remove) |
| `narrator` | `narrator: {voice, pronunciations: [{word, say}]}` |
| `narration` | `sceneId`, `id?` (existing cue only), `text`, `start`, `slot` (0 for no target) |
| `deleteNarration` | `sceneId`, `id` |

Illustration data:

```json
{
  "poses": [
    {"id":"flying", "name":"Flying", "asset":"import-bird", "facing":"left"},
    {"id":"perched", "name":"Perched", "asset":"import-perched", "facing":"right"}
  ],
  "defaultPose":"flying",
  "facing":"travel",
  "changes":[{"id":"land", "time":5, "poseId":"perched", "facing":"artwork"}]
}
```

Pose changes must be sorted with distinct times. Original facing accepts `left`,
`right`, `front`; desired facing accepts `artwork`, `left`, `right`, `travel`.
Asset IDs must resolve to imported artwork or the app catalog. Narrator voice
uses the existing voice object, e.g.:

```json
{"engine":"neural","speaker":"bm_fable","style":"storyteller","pitch":1,"speed":0.97,"delivery":"normal"}
```

Saved schema additions are optional: project `production`, piece `storyActions`
and `illustration`, and sound cue `productionNarration`. Original scene, motion,
audio, camera and export data stay compatible. Old versions cannot render these
new fields; use v1.78 or newer for newly authored stories.


See [Staging & effects](staging-effects.md) for gravity ropes, registered contacts, partial foreground masks, action dependencies, reaction holds, Foley and frame-by-frame shot review.
