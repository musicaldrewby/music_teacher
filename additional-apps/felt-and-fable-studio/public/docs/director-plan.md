# Felt & Fable Director Plan · version 1

Open **Movie tools → Storyboard → Director Plan** to download a plan, import one, or download the current asset catalog. Plans are local JSON files; there is no account connection or external AI service. Notes are production notes, not visible text. Use bubbles, text pieces or titles for words that appear in the movie.

A downloaded plan preserves the complete editable story: scenes, camera shots, character expressions, animation blocks and keys, attachments, lighting, titles, sound cues, imported media and voice analysis. It uses the normal Felt & Fable scene data, with `format: "felt-director-plan"`, `version: 1` and an optional `canvas` description. The working canvas is always 1600 × 900. Output can be 1920 × 1080 or a 960 × 540 draft, at 30 or 60 fps.

## Small authoring example

```json
{
  "format": "felt-director-plan",
  "version": 1,
  "title": "A little discovery",
  "canvas": {"width": 1600, "height": 900, "fps": 60},
  "director": {
    "snap": true,
    "beat": {"enabled": true, "bpm": 100, "offset": 0},
    "range": {"mode": "whole", "start": 0, "end": 8},
    "resolution": 1080
  },
  "scenes": [{
    "id": "discovery", "name": "The discovery", "backdrop": "bg65", "duration": 8,
    "director": {"notes": "Let the character notice the clue before the camera moves.", "markers": [{"id":"reveal", "label":"The reveal", "time":4}]},
    "pieces": [
      {"id":"maya", "asset":"cinema-maya", "x":800, "y":600, "w":338.56},
      {"id":"line", "text":"What is that?", "x":800, "y":270, "dialogue":{"start":2,"duration":3,"reveal":"words","wordsPerSecond":3}}
    ],
    "cinema": {
      "shots": [
        {"id":"wide", "name":"Establish the room", "duration":4, "from":{"x":800,"y":450,"zoom":1}, "move":false, "actionNote":"Maya notices something.", "dialogueNote":"What is that?"},
        {"id":"closer", "name":"Move closer", "duration":4, "from":{"x":800,"y":500,"zoom":1.4}, "to":{"x":800,"y":540,"zoom":2}, "move":true, "easing":"cinematic"}
      ]
    }
  }]
}
```

The import normalizes missing scene IDs, item IDs, camera defaults, narration defaults, and shorthand pieces. A shorthand asset uses an exact `asset` ID from the downloaded catalog. A shorthand bubble needs `text`; optional `style` is a bubble style such as `speech` or `thought`. Full native pieces use `type` and the normal dimensions (`w`, `h`, `bw`, `bh`), coordinates and appearance properties. Export an existing story as a plan for examples of drawings, grouped pieces, motion blocks, camera keys or imported media. An unknown asset is rejected with a message.

## Timing and editing

- Shot durations are sequential within a scene. `from` and `to` are camera centers in canvas coordinates and zoom from 1 to 4. Camera framing is constrained to the backdrop.
- Easing: `linear`, `smooth`, `cinematic`, `ease-in`, `ease-out`.
- A shot may have `follow: {"targetId":"maya","strength":1,"smoothing":0.2}`. Tracking preserves the initial framing and adds the target's motion, sampled deterministically. Only top-level unattached pieces can be tracked.
- `actionNote`, `dialogueNote` and `notes` are editable shot planning text. `scene.director.notes` describes the scene.
- By default, editing a shot's length shifts later timed cues; reordering moves cues with the shot in which they start. This includes dialogue, acting cues, titles, sound cues and markers. Cues crossing a cut stay one cue and keep their duration. Character motion blocks, manual keys and narration remain on the scene timeline. Turn off **Move timed cues with edited shots** for camera-only editing. Undo restores timing and notes together.
- Markers are scene-relative seconds. The music beat grid uses movie-relative `offset` and BPM; it does not detect audio beats. Snap engages within 0.14 seconds. Markers outside the scene remain in the list but not on the ruler.

## Sound across cuts

Sound cues are in `scene.cues`. A cue has `id`, `name`, `preset`, `assetId`, `start`, `duration`, `volume`, `loop`, `fadeIn`, `fadeOut`, `offset` and optional `crossScene`. Imported cues still retain a valid built-in `preset` as metadata; their audio comes from `assetId`. Built-in presets are `bell`, `steps`, `door`, `knock`, `thunder`, `wind`, `rain`, `chime`.

With `crossScene: true`, `start` can be negative (up to 600 seconds before the scene), and the cue can run past its scene cut. These cues do not extend scene duration. Playback and export clip all audio at the movie's boundaries. A selected export range keeps the correct offset into sounds that began before the range.

Narration accepts `crossScene: true` and a negative `delay` in the same way. Music ducking follows narration across cuts. Imported audio is stored under `audioAssets` as `{name, data, duration}` with a base64 `data:audio/...` URL. Imported artwork is stored in `imports` using image data URLs. Downloading the current plan includes this media.

## Focus and speech

Scene focus uses `cinema.focus: {enabled:true, plane:"middle", amount:5, targetId:null}`. Planes are `back`, `middle`, `foreground`. Set `piece.depth` to assign a plane. The selected target and text remain sharp. This is layered softness for flat felt artwork, not simulated 3D optics.

A puppet may have `speech: {source:"narration", start:0, end:5, sensitivity:1}`. For an imported cue, use its cue ID as `source`. Start/end are scene-relative speaking windows, useful when several characters share one recording. Analyze voice in the UI to save `audioAssets[id].speechEnvelope` with 30 amplitude values per second. Three felt mouth shapes respond to volume; there is no phoneme recognition or automatic speaker detection. Analysis is saved so preview, exported frames and reopened stories use the same mouth motion.

## Preview and output

`director.range` uses `mode: "whole"`, `"scene"` or `"marked"`, with movie-relative `start` and `end`. Output is a half-open interval [start, end), aligned to the chosen fps. Rendering uses the original scene's local time, transitions and audio offsets; it does not restart animations at the range's beginning. Exported timestamps begin at zero. `director.resolution` is 1080 or 540.

Movie Check reports missing media, short reading times, incomplete word reveals, text outside 5% safe margins, missing tracking or voice sources and audio endings. Warnings are review suggestions; intentional composition can be kept. Preview still matters for artistic pacing and the final sound mix.

## Local authoring API

The page exposes `window.FeltDirector` for an authorized local automation or the developer console:

- `assets()` returns catalog IDs and names without full images.
- `snapshot()` returns a copy of the current native story.
- `exportPlan(project?)` returns a Director Plan.
- `importPlan(plan)` validates and normalizes a plan, returning a native story **without replacing the open project**. Use the UI's Open Director Plan command to load it.
- `qualityCheck(project?)` returns review items with severity, scene ID, time and optional piece ID.
- `range(project?, fps?, settings?)` returns exact frame boundaries.

No commands send or publish a movie. Downloaded stories remain compatible with this version or newer. Keep an editable backup before opening a plan in an older version.


## Character speech and agent actions (1.60)

See [Story automation guide](agent-guide.md) for script-to-speech plans, reusable character voice settings, batch edits with revision checks, and PNG frame review. Speech clips are embedded in the regular story audio and included in movie export.

## Cinematic workflow (v1.72)

All additions are optional. Existing projects keep their original cuts and timing.

- `cinema.shots[].connection`: `cut` (default), `continue`, or `dissolve`. Continue links the preceding shot's endpoint, including the last shot of the previous scene. Editing start framing explicitly returns it to Cut. `dissolve` is a complete-frame blend between two views of the same live action; `dissolve` duration is 0.1–5 seconds, capped at half the incoming shot.
- `cinema.shots[].follow.lookAhead`: 0–2 seconds of anticipation. Existing `strength` and `smoothing` still apply.
- `cinema.transition.moving`: opt-in post-roll for scene dissolves. The outgoing action continues at its last motion velocity while the incoming scene advances. It does not replay the previous ending, insert time, or shift audio. Authored actions that finish still remain still.
- `director.lighting`: movie-wide clips `{id,start,duration,from,to,strength}`. Presets are `moonlight`, `sunrise`, `daylight`. Starts are absolute movie seconds. The final lighting holds until the next clip. This replaces the old scene atmosphere's light wash while active, retaining weather and other authored effects. It changes illumination, not backdrop artwork.
- `director.musicCues`: `{id,label,time,duration,effect,strength}`. Absolute movie seconds stay fixed when scenes or shots move. Effects: `none`, `pulse`, `sparkle`, `spotlight`, `fade`. Cues appear on the scene's animation ruler and participate in snapping. They do not move the music track.

### Choreography clips

`piece.choreography` is an array of independent, editable actions. No generated keyframes are necessary. Use `setChoreography` below to fill defaults; a raw project must provide every field.

```json
{
  "id": "circle-one",
  "preset": "visit",
  "start": 0,
  "duration": 12,
  "targetIds": ["skeleton-one", "skeleton-two"],
  "radiusX": 180,
  "radiusY": 65,
  "turns": 2,
  "clockwise": true,
  "lag": 0.5,
  "offsetX": 0,
  "offsetY": 0,
  "autoDepth": true,
  "hold": true,
  "gripX": 0.06,
  "gripY": 0.04,
  "tipX": 0.88,
  "tipY": 0.47
}
```

Presets: `circle`, `visit`, `follow`, `freeze`, `scarf`. Travel eases in briefly. Visit and scarf actions divide time among targets, circle for the first 72% of each visit, then glide to the next partner. `turns` means turns at each partner. Follow samples the leader at `time - lag` with the chosen offsets. Freeze holds motion and character acting at the clip start; live audio is unaffected. Travel overrides x/y while retaining other pose properties. Clips cannot overlap on one piece; cyclic partner/attachment dependencies are rejected. Partner targets must be top-level pieces. Scene copy and multi-piece duplication remap references.

For `scarf`, attach the cloth to a hand first. The attachment's position becomes the pinched grip. Grip and free-tip coordinates are fractions of the image's full rectangle, not percentages. The free end follows an ellipse at the partner's head while the grip stays in the hand. `autoDepth` draws the cloth or traveler behind/in front of the partner as it circles; this is flat felt layering, not a 3D cloth simulation. Use `visit` on the holder with the same targets, start, duration and turns to accompany the scarf between partners.

### Automation operations

These operations run through `FeltDirector.applyActions({expectedRevision, operations})`, with validation and a single Undo, and produce the same editable data as the UI:

```json
[
  {"op":"frameShot","sceneId":"dance","shotId":"close","pieceIds":["ghost"],"size":"medium","includeProps":true,"end":false},
  {"op":"shotTrick","sceneId":"dance","shotId":"close","pieceIds":["ghost"],"kind":"reaction"},
  {"op":"setChoreography","sceneId":"dance","pieceId":"ghost","clips":[{"id":"visit","preset":"visit","start":0,"duration":12,"targetIds":["skeleton-one","skeleton-two"]}]},
  {"op":"setLightingTrack","clips":[{"id":"dawn","start":40,"duration":14,"from":"moonlight","to":"daylight","strength":1}]},
  {"op":"setMusicCues","cues":[{"id":"triangle","label":"Triangle accent","time":25,"duration":0.8,"effect":"sparkle","strength":0.5}]}
]
```

Frame sizes: `wide`, `full`, `medium`, `close`. Framing samples start/middle/end, includes held props and puppet hands when requested, and respects the board limits and maximum 4× camera zoom. It is not a pixel-perfect collision or motion-extrema solver. `reaction` splits the selected shot into three equal parts (original framing, reaction, original framing), preserving total duration. `reveal` makes a gentle close-to-wide pullback. Existing manual camera effects remain independently editable.

### Reusable export sections

Precise export caches independently encoded video sections of at most two seconds in IndexedDB (up to 384 MB), with a small in-memory fallback. Cache keys include engine version, browser, encoder configuration, resolution/FPS, source scene, dependent outgoing/connected scenes, imported artwork, speech analysis, captions, and applicable global lighting/cues. Scene edits invalidate that scene and dependent transitions. Completed sections survive cancellation; start the same export to resume. Only complete sections beginning with a keyframe are reused. Audio is always mixed anew using the full movie clock. Compatibility recording does not use this cache. Browser eviction or clearing site data removes the cache; project files never depend on it.

## Acting and wardrobe (v1.74)

Maya, Leo, Asha, and Jun support six additional `acting.pose` values:
`shrugging`, `thinking`, `presenting`, `handsOnHips`, `startled`, and `dancing`.
Use them as the resting pose or inside the existing timed acting cues. Cue timing,
scene continuation, held props, mirroring, and 30/60 FPS export use the same joints.

An optional `wardrobe` object stays with a character throughout a scene:

```json
{"hat":"beret","glasses":"round","neck":"scarf","vest":"none","color":"#425d7b","accent":"#be5e68"}
```

- `hat`: `none`, `cap`, `beret`, `crown`
- `glasses`: `none`, `round`, `square`
- `neck`: `none`, `scarf`, `bowtie`, `tie`
- `vest`: `none`, `felt`
- `color`, `accent`: six-digit hex colors

Unspecified values use defaults. Hats and glasses share the head transform;
neckwear and vests share the body transform. These are optional felt overlays;
existing stories keep their original appearance. Wardrobe is supported on the
four articulated characters, not ordinary asset cutouts. To change an outfit
between shots, continue the scene and edit the next scene's wardrobe.

`FeltDirector.applyActions` accepts
`{op:"setWardrobe",sceneId,actorId,wardrobe:{...}}`; use `wardrobe:null` to remove it.
The same revision check, atomic validation, and Undo behavior apply. Wardrobe
is included in `summary()`, project downloads, Director Plans, and duplication.

File → Open speaking cast example and File → Acting & wardrobe example load
prepared project files with saved voice audio. They do not generate speech or
download a speech model when opened. The loading dialog supports Cancel and
Try again. Cancelling or a loading error leaves the current project untouched.
The original script-only `speaking-cast.director.json` remains available for
script-generation workflows, which still generate speech when imported.

## Reusable performances (v1.75)

Select a rigged actor (and optionally props) in Build, open **Reusable performances**,
then **Save selection**. Choose a name, start, and length. Linked held props and
referenced partners are included and listed before saving. A definition stores
acting, hand/head reactions, motion blocks or paths, choreography, and prop
interactions. It does not carry artwork, outfits, camera shots, dialogue or audio.
Saved ranges can be 0.2–120 seconds with up to 12 separate participants.

**Apply** assigns every role to an existing piece. Each actor role needs a rigged
actor; each prop/partner role needs a separate non-text, non-rigged piece. The
performance uses the destination pieces' home positions, sizes, artwork, mirror
settings, wardrobe, and voices. Source motion is evaluated on a mapped clock,
not converted to keyframes. Applied clips have their own definition snapshot:
removing or replacing a saved library entry cannot change existing movies.

Click a clip in the contextual list to change its start, length, role assignments,
or **Hold final pose**. Length stretches all source channels together. Hold keeps
the ending until a later reusable clip takes over a participant; without Hold,
underlying animation resumes at the clip's end. A later clip ends the earlier
shared performance as a group. Overlapping clips cannot share participants.
Assigned participants must share one depth layer so camera parallax cannot separate
a hand from its prop. Unrelated original animation is kept underneath, and removing a clip restores it.
An existing separate prop action involving an assigned actor must be removed or
included in the saved performance. Reach checks reject impossible handoffs.

Move or resize an actor to adjust its home placement. A prop controlled by a
saved attachment or handoff cannot be dragged independently while that clip is
active. Remove the clip to edit its underlying prop animation. Capture new acting
from the source scene; nested capture of an already applied reusable clip is
rejected. To revise a performance's internal acting, edit its original source
acting and save a new definition. Existing clip timing and roles remain directly
editable.

Custom definitions live in `performanceLibrary` in the project and, through the
UI, in the browser's local library when storage permits. **Library tools → Download
library / Import library** transfers a `felt-performances` version 1 JSON pack
between devices. Libraries allow 40 definitions / 2 MB. A scene allows 60 applied
clips / 4 MB. Original projects without these optional fields render unchanged.
The starter library contains Wave hello, Think it over, and Celebrate.

Agent API (same atomic transaction and Undo as existing Director actions):

```js
// Capture into the project's library. Read the updated summary to get its ID.
await FeltDirector.applyActions({expectedRevision:FeltDirector.revision(),operations:[
  {op:'savePerformance',sceneId:'room',pieceIds:['maya'],name:'A friendly greeting',start:0,duration:3}
]});
// A summary includes library IDs, role IDs, and lightweight applied-clip metadata.
await FeltDirector.applyActions({expectedRevision:FeltDirector.revision(),operations:[
  {op:'applyPerformance',sceneId:'room',templateId:'builtin-hello',
   bindings:{actor:'jun'},start:2,duration:4,hold:true}
]});
// Update a clip: pass its id with new timing, bindings, and hold value.
// Its existing template is retained if template/templateId is omitted.
await FeltDirector.applyActions({expectedRevision:FeltDirector.revision(),operations:[
  {op:'applyPerformance',sceneId:'room',id:'CLIP_ID',bindings:{actor:'jun'},
   start:3,duration:5,hold:false}
]});
await FeltDirector.applyActions({expectedRevision:FeltDirector.revision(),operations:[
  {op:'removePerformance',sceneId:'room',clipId:'CLIP_ID'}
]});
```

Definitions can also be supplied as `template` objects. `FeltDirector.performances()`
returns the available full definitions. API capture is persisted in the project;
Download story carries it. UI capture additionally remembers the local library.
Copying a scene remaps all bindings. Duplicating all participants copies their
shared clips; duplicating only some participants does not create broken partial
clips. Deleting a participant removes its dependent clips. Continue scene freezes
the sampled pose and preserves the held prop rather than replaying the clip.


## Conversation acting and cameras (v1.77)

Choose one of the four rigged cast members, then **Acting** on the selection bar.
**Conversation performance** offers Friendly, Firm, Defensive, Excited, Shy,
and Thoughtful. Pick a partner and a range; the clip uses saved Talk dialogue
to switch between speaking gestures and quiet listening. Gesture strength is
adjustable. Uncheck Follow saved dialogue to rehearse gestures without speech.
It does not generate speech, change voice emotion, identify speakers in an
unassigned recording, or infer a line's emotional meaning. Manual acting cues
and explicitly authored hand/gaze clips keep priority. Delete the conversation
clip to restore the underlying performance. New clips never create keyframes.

**Movie tools → Camera → Conversation shots → Dialogue aware** previews an
editable shot plan for two selected speakers. Gentle/Balanced/Lively set the
minimum spacing between cuts. Options include listener reactions, medium shots
or close-ups, and clean cuts or soft dissolves. The planner uses saved dialogue
starts/ends, favors a two-person shot for overlapping lines, and samples actor
motion when framing. Applying replaces the scene's camera shots and camera-effect
clips in one Undo. Speech, acting, other effects, and scene length keep their
existing timing. Editing dialogue later does not silently rebuild the camera;
review and apply a new plan when desired. Review framing when actors overlap,
leave the board, or move across the composition.

The File menu's **Conversation acting example** includes prepared voices;
opening it does not download the speech model or regenerate speech.

Director API, through the existing atomic `applyActions` transaction:

```js
{op:'setConversation', sceneId:'room', actorId:'mom', conversation:{clips:[{
  id:'firm-talk',start:0,duration:14,style:'firm',amount:0.7,
  partnerId:'daughter',syncSpeech:true
}]}}
{op:'cameraRecipe', sceneId:'room', actorA:'mom',actorB:'daughter',
 kind:'dialogue',pacing:'balanced',reactions:true,closeups:true,transition:'cut'}
```

`setConversation` accepts `null` to remove the channel. Up to 100 clips per
actor are supported, with no overlapping clips. They survive save/open,
duplication, and scene copying. Continue scene freezes the sampled pose.
Reusable performances capture the compact speech timing windows needed by
conversation acting, but never copy voice audio. Reassigning roles also
reassigns conversation partners.

Character turning was removed in v1.77. Older stories containing turn metadata
still open; that metadata is ignored and characters use their original appearance.

`FeltDirector.planDialogueShots({sceneId,actorA,actorB,...options})` is read-only
and returns `{revision,sceneId,shots}`. Review it before applying with `setShots`
(or use `cameraRecipe` to replace camera-effect clips as the UI does).
`FeltDirector.conversationStyles` exposes supported acting styles.
