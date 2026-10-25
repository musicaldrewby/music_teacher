# The Wolf at the Door

A 20-second editable demonstration of a layered felt character: approach, settle, three knocks, listen, react, recover. Open **Try the wolf door scene** on the welcome screen or **File → Open wolf door scene**. Open **Character motion** to edit the performance.

The wolf uses generated, registered felt parts from the original Three Little Pigs character design. Both arms and legs use a two-link inverse-kinematics solver with explicit bend direction, shoulder/hip limits, and a small minimum bend to avoid straight-joint flips. Feet stay at their planted world positions during stance. The pelvis adjusts to the reachable leg length. The fist's measured wrist and knuckle anchors place the painted contact on the door, and three short knock sounds follow those contact times.

The heads contain the complete ears, fur and snout. Listening and surprise preserve that coordinated three-quarter orientation. Facing left mirrors the complete character. This is a constrained two-dimensional rig, not a full front/side/back turning system or a medical/anatomical simulation. It does not convert existing cutout illustrations automatically. The previous Three Little Pigs production remains available as authored.

## Editing

- **Starting pose** sets the resting floor position, size and left/right facing.
- **Walk to** uses an explicit floor destination and the scene's marked obstacle rectangles. The studio does not infer obstacles from background pixels.
- **Knock**, **Reach and hold**, and **Look at** use a fixed point or a normalized point attached to scenery.
- **Listen**, **React**, and **Hold** provide an acting beat. Commands on one wolf are sequential.
- **Pick target on scene** uses the current camera framing. **Loop command** replays the selected interval. Motion preview is silent; **Play with sound** uses the main film player.
- **Show joints & contacts** is an inspection overlay and never enters the exported film.
- **Check motion** reports unreachable contacts, planted-foot drift, opposite-facing travel, and steep routes. These checks complement visual review.
- **Add rigged wolf** reuses the character in another scene. **My pieces** stores a clean character without scene-specific commands.

`window.FeltRig.summary()` exposes the revision, actors and commands. `FeltRig.apply({expectedRevision, operations})` uses the normal atomic editing, asset loading, recovery and Undo flow. Supported operations are `home`, `command`, `deleteCommand`, and `facing`. Each operation includes `sceneId` and `pieceId`; `command` includes `{id,kind,start,duration,target?}`. Targets are `{x,y}` or `{pieceId,u,v}`. Use normalized scenery targets for contact; walking uses floor coordinates.

## Rebuild and verification

```sh
node scripts/create-wolf-rig.cjs
node --expose-gc scripts/check-wolf-rig.cjs
```

The checks sample 1,201 frames, check joint limits and actual planted ankles, verify knuckle contact and sound timing, render the real film frames, open the command UI, retime a knock atomically, reject overlaps, round-trip the saved file, and exercise Undo. Existing human-arm and Three Little Pigs regression checks cover the shared renderer and validation hooks. Browser interaction QA was unavailable in the managed environment.

## Artwork

Built-in image generation produced the modular atlas and the doorway set. The exact prompts and original outputs are in `art/source/prompt-modular-atlas.txt`, `art/source/prompt-door-set.txt`, and `art/source/`. `art/manifest.json` records all source bounds, normalized joint anchors, and staging guides. The cropped transparent pieces are under `art/`. `art/wolf-rig-atlas.webp` is the mechanically packed runtime atlas. `art/door-set-render.png` is a pixel-preserving RGBA re-encoding of the generated background for the native renderer. No existing pig-story artwork was replaced.

The deployed example is self-contained in `public/examples/wolf-door.felt.json`; it embeds the final artwork and uses the app's existing synthesized knock sound. The engine is in `public/js/character-rig.js`, with its controls in `public/js/character-rig-ui.js`.
