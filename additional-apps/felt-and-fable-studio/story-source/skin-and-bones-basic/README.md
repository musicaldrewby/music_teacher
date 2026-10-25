# Skin and Bones · Basic Felt Board

A separate edition approved by Drew on October 21, 2026. The detailed story remains available.

## Direction

Match `approved-preview.png`: a physical navy flannel board, flat scissor-cut pieces, gray bun and glasses, plum shawl, teal dress, yellow lantern, plain gray gravestones. Keep the old woman slightly spooky and the ghost hollow-eyed and wailing. No smile on the ghost, photorealistic characters, camera zooms, mist, lens effects, or elaborate rooms.

Artwork is built as native editable felt shapes and groups. The woman has separately animated feet, arms and lantern. The three OOH letters are actual cutout shapes; their centers stay transparent. The only imported artwork is the navy backing, embedded into the story so the project and classroom exports are portable.

## Story and controls

Exactly the same captions as `skin-and-bones.felt.json`: one ready screen, seven lyric/action cues, six independent OOH responses, and the final BOO. The opening is by the fireplace, followed by the cottage, departure, graveyard walk, rolling bones, return to the closet, door opening, and ghost. The closet frame and threshold stay fixed against the wall. The open-door cue contains no ghost or BOO text.

Every cue is manual by default and holds indefinitely. Next, Space and Right Arrow advance; Left Arrow goes back; Home restarts. Adding saved song timing does not change the initial Manual mode. The existing standalone classroom export supports this story and its native animations.

## Rebuild and verify

- `node scripts/create-skin-and-bones-basic.cjs`
- `node scripts/check-skin-and-bones-basic.cjs <render-directory>`
- `node scripts/check-phrase-story.cjs public/examples/skin-and-bones-basic.felt.json 15 <render-directory>`

The generic phrase check covers actual file import/reload, all indefinite holds, keyboard/button controls and ordinary presentation compatibility. The edition check exercises the new example button, exact lyric preservation, six letter flights, moving feet, fixed door threshold, deferred ghost reveal, and saved-song Manual default. It renders representative native Canvas frames. Browser video decoding is not covered by these harnesses.

## Backing image provenance

`navy-felt.png` was generated with the built-in image generation tool; `navy-felt.webp` is its 1600 × 900 export. Prompt:

> One seamless-looking full-frame flat sheet of deep midnight navy blue craft felt, photographed straight-on, landscape 16:9. Empty background material for a simple physical classroom flannel board. Dense short slightly tangled wool fibers, uniformly small. Uniform dark navy approximately #101e38, matte surface, even soft room lighting. No lighting gradient, vignette, glare, shadows, folds, wrinkles, knots, seams, fabric border, shapes, figures, objects, text or frame. Felt covers the image edge to edge. A close photograph of a plain felt sheet, not digital noise or paper.

`approved-preview.png` preserves the approved appearance for future revisions. It is a design reference, not a flattened animation scene.
