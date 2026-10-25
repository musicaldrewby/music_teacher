# Story building · Felt & Fable 1.70

The page exposes `window.FeltDirector`. All mutating actions validate a prepared
copy, generate needed audio, load artwork, and then commit once. A failed batch
leaves the current story intact. Undo restores the previous story, including audio.
No app server or account connection is needed.

## Read before editing

`FeltDirector.summary()` returns a revision, scene and piece IDs, shot framing,
dialogue timings, voice styles and movie checks without the large audio payloads.
`FeltDirector.assets()` returns the artwork catalog. Use its exact IDs.
`FeltDirector.exportPlan()` returns a full editable plan with embedded media.

## Create a story with speech

```js
const {revision} = FeltDirector.summary();
await FeltDirector.applyPlan({
  expectedRevision: revision,
  plan: {
    format: 'felt-director-plan', version: 1, title: 'The invitation',
    canvas: {width: 1600, height: 900, fps: 60},
    scenes: [{
      id: 'garden', name: 'The garden', backdrop: 'bg71', duration: 6,
      pieces: [
        {id: 'maya', asset: 'cinema-maya', x: 520, y: 600, w: 400},
        {id: 'leo', asset: 'cinema-leo', x: 1080, y: 600, w: 400}
      ],
      script: [
        {actorId: 'maya', text: 'Ready for an adventure?', start: 1,
         voice: {delivery: 'cheerful'}},
        {actorId: 'leo', text: 'Let us follow the stars!'}
      ]
    }]
  }
});
```

Omitted starts follow the latest generated speech in that scene with a 0.25-second
gap. Explicit starts are scene-relative seconds. Dialogue extends the scene and
its last shot when necessary. Keep music and cut timing under review after adding
lines. Generated script entries become ordinary editable dialogue lines and sound
cues; the temporary `script` array is removed. Plain `importPlan()` only normalizes
data. Use `preparePlan()` for non-UI generation or `applyPlan()` to apply it.

Use **File → Open speaking cast example** for an example with four voices.
Director Plan import also compiles script entries.

## Revise a line or batch scenes

`applyActions({expectedRevision, operations})` accepts up to 100 operations:

| Operation | Required fields beyond `op` |
| --- | --- |
| `upsertScene` | `scene` with a stable `id`; complete native or shorthand scene |
| `upsertPiece` | `sceneId`, `piece` with a stable `id`; complete piece or asset shorthand |
| `setShots` | `sceneId`, `shots`; native shot objects |
| `setActing` | `sceneId`, `actorId`, `acting`; resting settings and timed cues |
| `setVoice` | `sceneId`, `actorId`, complete `voice` settings |
| `regenerateDialogue` | `sceneId`, `actorId`, complete `voice`: rebuild all this actor’s lines in this scene; preserve each delivery and ripple later dialogue |
| `addDialogue` | `sceneId`, `actorId`, `text`; optional `lineId` replaces one existing line |
| `removeDialogue` | `sceneId`, `actorId`, `lineId` |
| `setProject` | optional `title`, `director` settings |

New spoken lines default to voice only. Add `bubble: true` when visible comic text
also serves the scene. Generated bubbles sit close beside the head, follow the
actor, and aim at its nearest cheek. Drag a bubble to fine-tune its position;
**Comic text → Aim tail at speaker** switches between automatic and manual tails.
Updating a line preserves its existing bubble choice and placement unless `bubble`
is explicitly set. Existing stories keep their authored bubble positions.

Dialogue options: `start`, `bubble`, `voice`, `allowOverlap`, `ripple`. Set `ripple: true` to move later generated dialogue and its linked bubbles by the change in this line’s end time; camera cuts and acting cues stay at their existing times. Same-character
overlap is rejected unless explicitly requested. Existing generated audio is
reused for identical text and settings. Deleting a line removes its generated
sound and linked bubble. Update regenerates only that line. If a human edits
while the batch prepares, the batch fails and preserves those newer edits.

```js
await FeltDirector.applyActions({
  expectedRevision: FeltDirector.summary().revision,
  operations: [{op: 'addDialogue', sceneId: 'garden', actorId: 'maya',
    lineId: 'ID_FROM_SUMMARY', text: 'Our story starts right here.',
    voice: {delivery: 'normal'}}]
});
```

## Voice and acting

New characters use local Kokoro neural speech. Voice settings are
`{engine:'neural', speaker:'af_heart', style:'bright', pitch:1, speed:1, delivery:'normal'}`.
Natural speakers: `af_heart`, `af_bella`, `af_sky`, `am_michael`, `am_puck`, `bm_fable`.
The default cast maps Maya → Heart, Leo → Puck, Asha → Bella and Jun → Sky.
`FeltTalk.naturalVoices()` and `FeltDirector.summary().naturalVoices` list their labels.
Natural voices preserve their own pitch: `pitch` must be 1. Speed ranges from 0.8 to
1.2. Deliveries: `normal`, `cheerful`, `excited`, `calm`, `worried`, `sleepy`.
Delivery adjusts pacing and punctuation, plus the felt face while speaking; it is
not a trained emotion or singing model. Normal preserves the acting expression.
English only; use up to 600 characters per line. Long lines are split into
sentences without silently truncating the end. Speech remains amplitude-based
mouth animation, not phoneme lip-sync.

`engine:'classic'` preserves the small Pico robot voice. Its `style` can be
`bright`, `warm`, `tiny`, `gentle` or `storyteller`; pitch and speed are 0.8–1.2.
Saved older voice settings without an `engine` remain Classic. Opening a story
does not regenerate any audio. To upgrade, select Natural in Talk and Update line,
or use Fine-tune voice → Use this voice for all character lines. The corresponding
`regenerateDialogue` action rebuilds only that actor’s lines in the chosen scene,
preserves each delivery, ripples later speech and bubbles, and commits as one Undo.
Camera cuts, animation and acting retain their authored times; review them after
changing the length of dialogue. Cancellation/failure leaves the story unchanged.

Speech is uncompressed WAV embedded with its mouth-volume envelope, so playback
and MP4 export need no model or live service. Natural speech uses 24 kHz PCM. Its
runtime and roughly 76 MB voice pack download only on first generation; Cache
Storage reuses assets when available. Browser cache eviction can require another
download. The model runs in a worker with one WASM thread (no WebGPU or isolation
requirement). No speech text is sent to a remote service. Classic loads about
2.5 MB. New neural jobs never silently fall back to Classic.

## Review and export

`await FeltDirector.renderFrame({time: 3.5, width: 640})` renders a PNG at absolute
movie time without changing the editing playhead. `qualityCheck()` checks the
current project; `qualityCheck(project)` accepts a prepared project. The regular
Export workspace creates MP4 with speech, music and sound effects using the same
frame and audio scheduling pipeline. Use Download story to preserve all editing
data and generated voice clips.

When `document.modelContext` is supported, five page tools are registered:
`felt_read_story`, `felt_find_artwork`, `felt_apply_story_plan`, `felt_edit_story`,
and `felt_render_story_frame`. These tools exist only while the page is open.
The ordinary API and Director Plan files also work without that browser feature.

## Acting artwork

Maya, Leo, Asha and Jun use clean torsos with separate articulated felt arms.
Every existing pose keeps the complete arms in front of the torso; shoulder and
elbow joints never switch layers during a gesture. Hand attachments follow the
calibrated palm centers. Lowered thumbs turn inward and raised palms retain the correct thumb orientation. The complete hand renders behind a held prop; no finger overlay is painted across it. Existing story IDs, positions and dialogue are preserved.
Other characters retain their original cutout artwork.

## Character performance (v1.63)

Maya, Leo, Asha and Jun support independent look-at, reaction and hand clips.
Select an actor and click **Perform** on its selection toolbar. Select a prop and
click **Prop actions**. The File menu contains **Character interaction example**:
a 24-second editable scene pair demonstrating all four actors. Existing stories
keep their original appearance until these controls are used.

`performance` is optional on a puppet. Its defaults and timed clips are separate
from `acting` body poses and speech, so a listener can react during dialogue:

```json
{
  "gaze": {"targetId": "leo", "amount": 0.7},
  "hands": {"left": "relaxed", "right": "open"},
  "clips": [
    {"id": "listen-1", "kind": "react", "start": 1, "duration": 2,
     "reaction": "listen", "amount": 0.65},
    {"id": "look-1", "kind": "look", "start": 4, "duration": 2,
     "targetId": null, "amount": 0.7},
    {"id": "hands-1", "kind": "hands", "start": 7, "duration": 2,
     "left": "open", "right": "point"}
  ]
}
```

A null gaze target faces the audience. Look clips blend out to the default gaze.
Reactions: `listen`, `nod`, `hesitate`, `surprised`, `laugh`, `no`.
Hands: `relaxed`, `open`, `point`, `grip`. Left/right refer to the original,
unflipped drawing's screen sides. Strength (`amount`) is 0–1. Clips are at least
0.2 seconds. Different kinds can overlap; the same kind cannot. Reactions use
small head motion, not alternate 3D head views or phoneme lip-sync.

Props accept `propActions`, with the following sequence for a free prop:

```json
[
  {"id": "pick", "kind": "pickup", "start": 0.7, "duration": 2,
   "actorId": "maya", "hand": "rightHand"},
  {"id": "give", "kind": "give", "start": 4, "duration": 2.5,
   "actorId": "leo", "hand": "leftHand"},
  {"id": "put", "kind": "putdown", "start": 8, "duration": 2,
   "x": 805, "y": 578}
]
```

After pickup/give, the prop follows its new owner's hand until the next action.
The source owner of give/putdown comes from earlier actions or a starting hand
attachment. A starting attachment must have zero dx/dy and no release time.
Props with actions cannot also have movement blocks/manual keys. One hand holds
one prop at a time; use the other hand or put the first down before picking up
another. Prop action order must be logically complete and nonoverlapping.
Delete later dependent actions first, or use **Clear actions · keep prop here**.

The action solves a two-joint arm to the grip position; it never stretches the
sleeve. Keep props hand-sized and actors within reach. The UI rejects unreachable
new action placements; moving actors afterwards may create a **Check movie**
warning. Resolve it before exporting. Use the nearer hands for a handover. Keep
actors on the same depth plane for predictable staging.

`FeltDirector.applyActions` adds `setPerformance` (`sceneId`, `actorId`,
`performance`) and `setPropActions` (`sceneId`, `propId`, `actions`). These use the
existing revision check, atomic validation, and one Undo. `summary()` returns
performance, prop actions and starting attachments. `qualityCheck()` reports
unreachable actions. Native save/load, scene copy, selection duplication,
reference cleanup and deterministic 30/60fps exports use the same clip data.
Hand silhouettes are code-native Canvas cutouts textured from each actor's
original palm artwork; they add no generated raster asset downloads.

## Cinematic clips (v1.66)

Movie tools now has Camera, Lighting, Look, Effects, Text and Timing tabs. Camera
contains preset moves and focus pulls. Lighting and Effects can contain multiple
overlapping clips. Each clip is one editable unit: choose it in the small scene
list, change its settings, and choose **Update clip**. **Preview** saves the draft
and plays from its start. **Fine controls** holds positioning, fades and saved
camera framing. There are no generated keyframes. Disabled clips stay editable.

`scene.cinema.clips` is optional, with up to 200 clips per scene. Use the complete
example in `examples/cinematic-techniques.director.json` as an authoring template.
All clips use seconds in the scene and render deterministically at absolute time,
including seeks, inactive scenes, 30/60 fps, transitions and MP4 output.

Each clip has:

```js
{
  id: 'reveal', kind: 'light', preset: 'spot', name: 'Reveal the letter',
  start: 1, duration: 3, strength: .6, enabled: true,
  ease: 'cinematic', fadeIn: .4, fadeOut: .6, hold: false,
  targetId: 'letter', fromTargetId: null, anchor: 'center',
  x: 800, y: 450, endX: 800, endY: 450, offsetX: 0, offsetY: 0,
  radius: 300, softness: .7, color: '#ffdea3',
  angle: 0, endAngle: 0, spread: 35,
  from: { x: 800, y: 450, zoom: 1 }
}
```

All fields above except `name` are required. Unused fields remain stored so a
preset can be changed without destroying its settings. Scene coordinates are
1600 × 900; angles are degrees, clockwise, zero points right. `strength` and
`softness` are 0–1. `radius` is 10–2400; `spread` is 5–150 degrees. Fade lengths
are capped at half the clip duration during rendering. Easing is `linear`,
`smooth`, `cinematic`, `ease-in`, or `ease-out`.

| Kind | Presets | Behavior |
| --- | --- | --- |
| `camera` | `push`, `pull`, `pan`, `rise`, `follow`, `drift`, `impact` | Saved `from` framing; optional target for push/follow, end position for reveal/glide. Follow requires an independent piece. Camera clips override existing framing while active. `hold` retains the ending framing until the next shot cut. Drift/impact add temporary movement to the underlying camera and never hold. |
| `focus` | `rack` | `fromTargetId` and `targetId` are two different pieces. Interpolates their blur independently, including pieces on the same depth layer; text stays sharp. `hold` keeps the final focus after the clip. |
| `light` | `spot`, `beam`, `window`, `lamp`, `flicker`, `night`, `sunset`, `dim` | Local lights follow a target/anchor or move between board positions. `angle` → `endAngle` rotates beams; `spread` sets width. Multiple local lights share one darkness mask. Washes affect the full frame. |
| `look` | `warm`, `moon`, `noir`, `memory`, `dream`, `suspense` | Fades a color treatment over the scene's base grade. No texture blur is added. |
| `particle` | `sparkle`, `dust`, `embers`, `steam`, `footsteps`, `puff` | Local stylized emitters follow target/anchor or board positions; size and color remain editable. Puff is a single short burst, so a roughly one-second clip works best. |
| `shadow` | `ground`, `stretch`, `float` | Soft stylized elliptical ground shadows under the required target. These are artistic 2D shadows, not a 3D light simulation. Offset, angle, size and softness adjust their placement. |

Camera, focus and look clips of the same kind cannot overlap while enabled.
Lighting, particles and shadows may overlap. Ending states do not add keyframes.
Shot ripple/reorder moves clip start times along with other scene cues; clips
spanning a cut should be reviewed after moving shots. Copying a scene remaps
piece references; deleting a focus/shadow target removes that dependent clip.
Deleting a local-light/particle target freezes its location. One Undo restores
these changes. Existing projects without clips retain their original appearance.

For a whole-scene color look use `scene.cinema.grade`, for example
`{preset:'warm',strength:.5}`. The **Use in all scenes** button copies that base
look across the movie, retaining any timed look clips. Titles render after color
and lighting treatments to preserve readability.

`FeltDirector.applyActions` accepts:

- `setCinematicClips`: `sceneId`, `clips` (complete replacement list).
- `setColorLook`: `sceneId`, `look` (`null` removes the base grade).

Both use the normal expected revision, validation and atomic Undo behavior.
`summary()` includes `cinematicClips` and `colorLook` for each scene. The same data
roundtrips through story files, recovery copies and Director Plans.

**File → Cinematic techniques example** opens three editable scenes (18 seconds)
showing a library focus pull, layered stage spotlights and a moonlit pullback.


## Story authoring (v1.70)

The **Script** button in the workspace bar opens a scene-ordered dialogue editor.
It uses the ordinary saved speech lines, so Talk and Script edit the same audio.
New lines can include a linked reaction and a pause. Updating one line reuses all
other audio. “Shift later dialogue” moves following speech, linked bubbles and
script-linked reactions; manually timed acting, animation and camera cuts stay put.
**Sound → Write character dialogue** opens the same editor. “Show on stage” returns
to the selected speaker and line time. Unsaved form drafts are retained during this
visit when switching rows; they are not included in downloaded stories until saved.

`FeltDirector.script()` returns scene IDs and readable line timing without media.
`summary().storyTools` lists the additional operations and interactive prop packs.
Use these with the ordinary atomic `applyActions` entry point:

| Operation | Fields |
| --- | --- |
| `saveScriptLine` | `sceneId`, `actorId`, `text`; optional `lineId`, `start`, `pause` (0–30 seconds), `voice`, `bubble`, `ripple`, `reaction` |
| `moveScriptLine` | `sceneId`, `lineId`, `delta` (-1 or 1); swap neighboring nonoverlapping spoken lines |
| `continueScene` | `sceneId`, `time` (`"end"` or scene-relative seconds); insert and activate a fresh scene after the source |
| `cameraRecipe` | `sceneId`, two distinct puppet IDs as `actorA`, `actorB`, `kind` (`conversation`, `script`, or `reaction`) |
| `setPropState` | `sceneId`, `propId`, `state` (`closed` or `open`); optional `time`, otherwise sets its starting state |

A new `saveScriptLine` without a start follows the latest speech and its saved pause.
An existing line keeps its start. Reaction values are empty string, `nod`, `listen`,
`hesitate`, `surprised`, `laugh`, or `no`. Linked reactions use the existing performance
lanes; a conflict with another reaction rejects the whole operation for correction.
Camera recipes replace the scene's existing shots, camera keys and camera-effect
clips, preserving total duration and the timing of other scene content. Script
coverage follows the selected characters' current spoken lines. Review camera cuts
after later script revisions; shots remain manually editable rather than being
silently regenerated. The UI is **Movie tools → Camera → Conversation shots**.

**Scenes → More → Continue from scene ending / playhead** samples the source,
keeps camera framing, character geometry, expressions, held props, current prop
states and the backdrop, and starts a six-second scene with fresh timing. Old
speech, sound cues, titles, motion blocks and timed effects are not replayed.
Arm and head poses are held so a cut during a gesture remains continuous. Changing
Acting's resting settings releases the held pose; an acting cue temporarily uses
its own pose. The prior scene is untouched and Undo removes the new scene.

Interactive prop shorthand assets: `story-storybook-closed`, `story-gift-closed`,
`story-door-closed`. Each is one editable piece with two aligned, native-transparent
felt images. `storyProp` is `{pack:'gift',state:'closed',changes:[{time:2,state:'open'}]}`.
Packs are `storybook`, `gift`, `door`. State changes are discrete swaps, not hinge
animations, and are evaluated deterministically in the same render path at 30/60 fps.
Both states load only when a prop is used. The collection filter is **Interactive
props · open / close**; selected prop controls set the initial state and timed changes.

Music balancing now includes audible narration, generated speech and imported cues
marked `duckMusic:true`. `music.duck` enables it; `music.duckLevel` (0–1, default .3)
is the proportion of the normal music level under speech. A .18-second lead-in and
.5-second recovery smooth the transition, including overlap, seeks and scene cuts.
The same envelope drives preview, Compatibility export and offline Precise export.


## Danse macabre collection (v1.71)

Collection shortcut: **Danse macabre · midnight dance**. Available in Pieces and Backdrops; full artwork is lazy-loaded.

- `danse-skeleton-dancer`: friendly dancing skeleton.
- `danse-skeleton-percussionist`: skeleton holding two mallets, instrument separate.
- `danse-ghost-violinist`: ghost with violin and bow.
- `danse-rooster`: dawn rooster.
- `danse-xylophone`: orchestral xylophone, with short resonators.
- `danse-clock-tower`: blank dial, for editable clock numerals and hands.
- `bg94`: moonlit graveyard.
- `bg95`: the same graveyard at sunrise.

These are flat artwork cutouts, not articulated speaking puppets. Animate them with blocks and paths. Clock dial center is at x=50%, y≈48% of the image.

Natural speech preserves the spelling of Camille Saint-Saëns and Danse macabre while using Drew's requested spoken pronunciations. The name uses French nasal vowels with no hard n/t. Danse macabre uses the classroom reading “dawnse muh-KAH-buh,” with a light final schwa.

Frame duration rounding tolerates floating-point noise; a sum of camera shots mathematically equal to 23 seconds stays 1,380 frames at 60 fps.
