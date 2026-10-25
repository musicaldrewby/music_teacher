# Felt & Fable · Private production studio · v1.85

Open **Director Desk** beside the workspace tabs. All your existing stories remain editable. Your Site access is owner-only; the desk does not change that policy.

## A film workflow

1. **Production:** save a logline and creative notes, then open a story or Director Plan. Download the current story when you want a separate durable copy before opening another.
2. **Shots & camera:** review the film as shot cards. Select a shot, scrub or step a frame, adjust framing, save notes, split at the playhead, or loop that shot with its sound. Camera stillness is a valid choice.
3. **Motion & set:** select a scene and a character. Set smooth motion or 8/12/15/24 poses per second. Drawn expressions, limb acting and held props use the character's sampled time; camera, music, and captions retain their own clock.
4. **Film timeline:** keep the existing scene, shot, action, voice, sound and marker tracks. Director Desk adds a music waveform with cuts and markers. Click it to inspect a moment. Existing MP3 phrase timing and manual presentation remain available.
5. **Review:** inspect timing, assets, voice overlaps and approximate image-resolution warnings. Download a storyboard page for the current twelve shots. Export the selected shot or the whole film, with the existing lyrics/captions and normalization options.

The 38-second **The Unexpected Letter** demonstration is under Production. It contains eight shots, a layered woodland set, a rigged character, an attached letter, an obstacle-aware walk, an original instrumental score and sound cues. It is fully editable. Opening it is one Undo step.

## Shot timing

Changing a shot's length borrows or returns time to the following shot. The scene's total length and the authored sound/acting times stay fixed. The following shot must retain at least 0.2 seconds. Change scene length in Film when you intend to change the film's timing.

Split preserves the original camera path, easing, pauses, and tilt at the cut by saving a segment of the original move. Saving new start/end framing or path controls replaces that segment. Remove merges the deleted shot's duration into a neighbor. These operations change shot boundaries, not action timings.

## Routes and movement

The set uses a 1600 × 900 board. A walking area is a rectangle in board coordinates. Obstacles are rectangles marking the ground footprint of scenery. The route planner finds a short visible route around rectangles expanded by the requested foot clearance. It does not infer obstacles from pixels, simulate collisions with limbs, or solve full-body 3D movement.

Start and finish are foot positions. The piece's bottom-center contact is at 48% of its height below its center. Glide and rigid travel stay level; Walk adds a slight body bob. Use the existing Acting controls for articulated leg motion. Routes own position, so remove an existing path, keyframes, choreography, contact pin or saved performance before assigning a route. Marked routes hold their start before their start time and hold their finish afterward. Continuing a scene bakes the current route position, so the route does not replay.

Changing an obstacle replans the scene's routes in one atomic edit. If any route becomes impossible, the entire edit is rejected and your previous set remains intact. Route geometry is stored and validated with the story. Author small direction changes and use camera cuts around turns where needed.

Stepped motion is deterministic. A 12-pose-per-second actor updates every 1/12 second, even in a 30- or 60-fps movie. Attached props inherit their owner's sampling. For transfers between two characters, give both the same pose rate for consistent contact.

## Project files and agent authoring

The existing `felt-director-plan` version 1 remains the portable authoring format. `FeltStudioDesk.exportPlan()` returns a lean plan with the current film's used imported images/audio and no unused custom collection. It does not modify the working story. Built-in asset IDs still resolve through the studio; a lean plan is not a fully standalone offline asset bundle. Full story download remains available.

Use `FeltStudioDesk.summary()` for revision, brief, shot IDs, route and stage settings. Use `FeltStudioDesk.apply({expectedRevision, operations})` or `FeltDirector.applyActions` for edits. They share revision guards, validation, artwork preparation and Undo with the existing APIs. The WebMCP reader is `felt_read_production_desk`; `felt_edit_story` accepts these operations. Existing Director and Film operations are documented in agent-guide.md and film-production.md.

| Operation | Fields |
| --- | --- |
| `setFilmBrief` | `logline`, `notes` |
| `setFeltMotion` | `sceneId`, `pieceId`, `fps`: 0, 8, 12, 15, 24 |
| `setStage` | `sceneId`, `stage: {walkArea:{x,y,w,h}, obstacles:[{name?,x,y,w,h}]}`; null clears the authored stage |
| `setRoute` | `sceneId`, `pieceId`, `route:{from:{x,y},to:{x,y},start,duration,clearance,gait,easing}`; null removes the route |
| `editShot` | `sceneId`, `shotId?`, optional `name`, `notes`, `duration`, `from`, `to`, `move`, `easing` |
| `splitShot` | `sceneId`, `shotId`, `time` in scene seconds |
| `removeShot` | `sceneId`, `shotId` |

`gait`: glide / walk / rigid. `easing`: smooth / linear / cinematic. Camera poses are `{x,y,zoom,roll?}`; roll is a gentle tilt from −20° to +20°. If a scene has no camera shots, `editShot` creates a full-scene shot. `FeltStudioDesk.planRoute(stage,from,to,clearance)` can calculate geometry without changing a project.

Saved fields are optional: `filmBrief`, scene `feltStage`, piece `feltMotion` / `feltRoute`, and shot `notes`. New route/motion fields need v1.82 or newer. Older stories without them retain their previous behavior.

## Offline rendering for production work

From a checked-out studio source, `scripts/render-production.cjs` uses the same frame renderer and audio schedule as the app. It requires the source-check canvas runtime (`@napi-rs/canvas`) and FFmpeg. Example:

```sh
node scripts/render-production.cjs --project public/examples/private-studio.felt.json --out film.mp4 --width 1920 --fps 30 --normalize
```

Optional `--start` and `--end` select movie seconds. Supported widths: 960, 1280, 1920; frame rates: 30, 60. Generate and save narration inside the studio before offline rendering. The offline path mixes the saved score, voices, and synthesized cues using the app's timing/envelopes and applies whole-range -1 dBFS peak normalization; it does not emulate the browser compressor used when normalization is off. The script rejects unnormalized audio export rather than silently substitute a different mix. The app's hardware-encoded MP4 workflow remains unchanged.


## Cinematography and whole-film finishing

Open **Director Desk → Cinematography**. Choose a shot, then choose a subject (and a second piece for two-shot / over-the-shoulder layouts). Six thumbnails render your actual artwork. Apply to the whole shot for a steady view, or to the camera start or finish. A flat illustration keeps its drawn perspective; a true side or overhead view needs appropriate artwork.

The path section previews the start, finish, and intermediate frames before saving. A quadratic curve bends between the endpoints; pauses occupy part of the existing shot length. Tilt automatically tightens framing to prevent blank corners. The route guide stays in the editor. **Hold this shot** keeps the current framing while the characters and song continue.

**Grounded set** is the default depth behavior. The painted backdrop (including its floor), acting characters, and main-stage pieces share camera movement and zoom, so depth does not slide their feet across the floor. Back and foreground scenery can still use parallax. A flat backdrop cannot move its painted mountains independently of its painted ground; use separate scenery pieces for that effect.

Choose **Floating layers** to restore independent backdrop and piece depth for dreamy or airborne scenes. The previous numeric depths are retained when switching modes. Existing stories without a mode now use Grounded set; switch a scene to Floating layers to reproduce the v1.84 depth treatment.

In Grounded set, **Piece behavior** defaults to Automatic: puppets and main-stage pieces use depth 1. Choose **On ground** for a piece in any layer that should stay with the floor, or **Free depth** for clouds, flying characters, or decorative scenery. Attached props inherit their parent’s behavior. This corrects camera-induced slipping; it does not rewrite an authored walk, jump, or pose.

Free depth can be set per piece or per back/main/foreground layer from 0 (distant) to 2 (near), with 1 as the main stage. Explicit free depth responds to camera travel and zoom. **Use layer depth** removes the numeric override while retaining the piece behavior. Backdrop and main-stage numeric depth controls apply in Floating layers. Scenery stays in the existing draw order. Keep masks and the pieces they conceal at compatible depths.

Foreground scenery can be added as an editable piece. Incoming foreground transitions are separate: curtains, a leafy hedge, or a doorway wall cover the previous scene before the cut and uncover the next one after it. Half of the chosen duration falls on each side, shortened to fit short scenes. The transition replaces that scene’s previous fade/dissolve.

In **Shots & camera**, recorded scene cues appear as white lines over the music waveform. Music markers are gold. **Cut / select at cue** selects an existing cut or divides the shot at the cue; **Cut at playhead & frame** makes a new framing opportunity. These operations do not move recorded scene cues or change the song. Camera shots continue during held phrase animation; character and lyric timing stays fixed. Each shot needs at least 0.2 seconds.

**Film finish** offers before/after previews, six color treatments, soft highlight glow, deterministic grain, vignette, and optional 2:1 / 2.39:1 bars. Apply once to the entire film. Scene-specific effects remain underneath; lyrics/captions render above the finish. Saved looks travel in the story and are also kept in this browser for other projects. The same scene renderer feeds normal playback, song playback, MP4 output, and standalone classroom clips. In manual classroom playback, the picture waits before a closing foreground transition; pressing Next runs the closing pass and opens the next scene. Recorded music playback retains the timed transition.

`FeltCinematography.summary()` reads the current finish, saved looks, and shot details. `FeltCinematography.apply({expectedRevision,operations})` shares the normal atomic editing workflow. New operations:

| Operation | Fields |
| --- | --- |
| `composeShot` | `sceneId`, `shotId?`, `kind`: wide/two/close/extreme/shoulder/insert, `subjectId`, `partnerId?`, `end`: whole/from/to |
| `setShotPath` | `sceneId`, `shotId?`, `path:{bend,holdStart,holdEnd}`, `fromRoll`, `toRoll`, `move`, `easing`; holds are fractions of the shot, totaling at most .95 |
| `holdShot` | `sceneId`, `shotId?`, `time?` in scene seconds |
| `cutAtMusic` | `time` in whole-film seconds, rounded to the export frame rate |
| `setDepth` | `sceneId`, optional `pieceId` and `value` (null inherits); optional `layers:{back,middle,foreground}`, `background`, `mode`: grounded/floating; with `pieceId`, optional `contact`: auto/ground/free |
| `addForeground` | `sceneId`, `kind`: branches/curtains/doorway/railing |
| `setForegroundReveal` | `sceneId`, `reveal:{kind,duration,direction}` or null; kind curtains/branches/doorway, direction left/right |
| `setFilmFinish` | `finish:{look,strength,glow,grain,vignette,aspect}`; look none/warm/moon/noir/memory/dream/suspense; numeric strengths 0–1; aspect native/2/2.39 (strings) |
| `saveFilmLook` | `name`, `finish` as above |

Optional saved fields: project `filmFinish` / `savedFilmLooks`; scene `cinema.liveCamera`, `depthLayers`, `backgroundDepth`, `depthMode`, `foregroundReveal`; piece `depthFactor` / `depthContact`; shot `path`, `cameraSegment`, `lockCamera`; camera pose `roll`. Depth mode and contact fields require v1.85. The other cinematography fields require v1.84 or newer. New depth behavior shares the playback, MP4 and classroom renderer; camera paths and saved song cues are unchanged.
