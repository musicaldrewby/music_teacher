# Staging & effects · v1.79

Open **Film → Staging & effects**. The rope workshop is an editable 12-second example using Peter, the bird, the tree and wolf. Opening it replaces the working board after the normal unsaved-story prompt; download your current story first to keep a separate file.

## Place and animate a rope

Add a rope, choose the held end and either a board position or another piece. Click **Pick this point on preview** to choose a grip. Coordinates across/down are percentages of the original artwork and follow its whole-image facing. A pose-specific point lets different hand positions keep the same grip.

A free end hangs vertically. Hanging length controls how far it lowers; loop radius controls a hanging bight (zero removes the loop). An attached end follows its target. Extra slack gives the span a gravity-directed curve; 100% tension pulls it straight. Add timed changes for lowering, attachment, loop size, slack and tightening. Changes interpolate smoothly; changing free/attached mode happens at the change's start. Place the target near the free end at that moment for continuity.

This is a deterministic, poseable rope model, not a collision simulator. It does not discover the wolf's tail or tie a knot on its own. Select the catch point and timing, then mask the rear half of the loop behind the tail. Scrubbing and 30/60 fps exports produce the same geometry at the same time.

## Plant a contact

Choose Peter, a bird, or another independently posed piece. Set the contact on its feet, seated bottom or hand, then set its target on the branch or a board point. The contact compensates for rotation, scale, facing and complete-pose changes. It does not warp or separate facial features. Define a matching point for each pose if the artwork shifts. Set a release time or leave it blank to remain pinned.

Contact pins apply to the top-level piece. Existing accessory attachment, prop actions and travel choreography must be removed first. A pinned piece can still rotate, resize or change illustration. Position animation is intentionally overridden while pinned; remove/release the pin to travel.

## Put part of an object behind another

Select the piece to obscure (for example the rope), then choose a foreground illustration. Pick two corners on the full-board preview or enter the mask rectangle as percentages. Only opaque pixels of that part of the foreground illustration hide the selected piece. The rest remains visible, so a loop can pass behind half a tail and in front of the other half. Up to eight masks per piece are supported. The mask follows the foreground piece's pose, rotation, contact and facing.

## Connect actions, reactions and sound

Select a source event, its start or end, a target event, and a seconds offset. A chain such as `pull → tighten → wolf reaction` updates when its source moves. Rope changes, whole-image pose changes, reaction holds, existing story actions and sound cues can participate, including across scenes. One target has one timing source. Remove its music-marker link first if one exists. Circular links and out-of-range timings are rejected atomically. Unlink an event before deleting it.

Reactions use complete saved pose images from **Poses & actions**. A reaction holds that drawing for the selected duration, then returns to the underlying pose/facing timeline. New expression artwork must be supplied; this feature does not generate or distort a face.

The sound picker includes synthesized **rope creak, leaf rustle, wing flutter, quick snap and soft landing** as well as the existing sounds. Set start, duration and volume; link a cue to an action to maintain synchronization. For recorded Foley, use the existing Sound import controls. All cues use the same audio scheduler for preview and movie export.

## Review precisely

Choose a camera shot and **Loop this shot with sound**, or set a custom scene-time range. Previous frame / Next frame pause playback and step at the project's 30/60 fps export rate. Looping includes the project's music, narration and effects. The working board's playhead and export range remain unchanged.

## Agent API

`felt_read_staging` exposes settings and linkable events. `felt_edit_film` accepts the operations below with the revision from `felt_read_story`. Locally, use `FeltCraft.apply({expectedRevision, operations})`; it shares the atomic Film transaction and one-step Undo. `FeltCraft.ropeGeometry(sceneId,pieceId,time)` reads solved points. `FeltCraft.summary()` and `FeltCraft.targets()` return authoring data.

All examples below are operation objects; wrap them in an operations array. A new `rope` operation uses `id`; edits use `pieceId`. Endpoint coordinates with `pieceId` are normalized 0–1; board endpoints use `x,y`. `posePoints` optionally maps illustration pose IDs to `{u,v}`.

```json
{"op":"rope","sceneId":"scene","id":"rope"}
```

```json
{"op":"rope","sceneId":"scene","pieceId":"rope","rope":{"from":{"pieceId":"Peter","u":0.8,"v":0.53,"posePoints":{"pull":{"u":0.87,"v":0.47}}},"to":{"pieceId":"Wolf","u":0.84,"v":0.34},"endMode":"free","length":200,"slack":80,"tension":0,"loopRadius":24,"width":5,"actions":[{"id":"catch","start":4,"duration":0.5,"values":{"endMode":"pinned","tension":1,"loopRadius":16}}]}}
```

```json
{"op":"contact","sceneId":"scene","pieceId":"Peter","contact":{"self":{"u":0.3,"v":0.61},"target":{"pieceId":"Oak","u":0.225,"v":0.527},"posePoints":{"pull":{"u":0.315,"v":0.61}},"start":0,"end":null}}
```

```json
{"op":"occlusion","sceneId":"scene","pieceId":"rope","masks":[{"pieceId":"Wolf","rect":[0.75,0.24,0.14,0.1]}]}
```

```json
{"op":"reaction","sceneId":"scene","pieceId":"Peter","id":"tug","poseId":"pull","start":4,"duration":2}
```

```json
{"op":"foley","sceneId":"scene","id":"creak","preset":"rope-creak","start":4,"duration":1.2,"volume":0.4}
```

```json
{"op":"actionLink","source":{"sceneId":"scene","pieceId":"rope","kind":"rope","id":"catch"},"target":{"sceneId":"scene","kind":"cue","id":"creak"},"edge":"start","offset":0}
```

Link kinds are `action`, `pose`, `rope`, `reaction`, `cue`. Remove a link with the same target and `source:null`; remove a contact with `contact:null`; clear masks with `masks:[]`. Remove a saved reaction or Foley cue with its `id` and `remove:true`. Existing stories without the new optional fields render as before. Stories using these fields require v1.79 or newer.
