# Interactive story props

Created with the built-in `image_gen` tool, using the existing sealed felt envelope as the material reference. Each open state was generated as an edit of its closed state. The gift received one extra targeted edit to preserve the front wall height when its lid is removed.

## Runtime assets

Six 512 × 512 WebP files live in `dist/assets/story-props/`. The original transparent 1254 × 1254 PNGs are retained in this directory. Runtime files were uniformly downscaled and encoded at WebP quality 90 / alpha quality 100. There was no background removal, masking, silhouette painting, or automatic trimming.

Preserve each full square canvas when switching states. See `metadata.json` for native pixel bounds and suggested common anchors. These are discrete illustrated state swaps, not frame-registered hinge animations. The spine, doorway threshold, and box base have consistent world positions with minor hand-crafted outline differences.

## Prompt set

All prompts used: individual prop sprite for Felt & Fable Studio, crisp gently fuzzy natural wool felt, tiny stitched details, tactile layered handmade cutout look, shallow layer thickness, no glossy plastic or Pixar 3D, no ground shadow, no scene, no lettering, genuine transparent RGBA background, full silhouette visible.

1. **Storybook closed:** Teal blue felt cover, cream felt page edges, golden felt star applique, burgundy ribbon bookmark; front-facing, spine at the square canvas midpoint, book extending right with empty space on the left for the open state.
2. **Storybook open:** Edit the closed book, maintaining spine and lower edge location; open toward left into two cream felt pages with teal edges, burgundy bookmark, one small golden star on right page, no text.
3. **Gift closed:** Coral red felt box, cream vertical ribbon and bow, shallow front view, body left of center with space on right for detached lid; fine hand stitching.
4. **Gift open:** Edit the closed gift, preserving body scale and lower edge; dark coral empty interior, detached matching lid and cream bow leaning upright on right. Refined front wall to match closed version: top at 51% canvas height, bottom at 85%, width from 6% to 65%, vertical ribbon centered at 35%.
5. **Door closed:** Golden-brown wool felt wooden cottage door, dark-brown arched stitched frame and threshold, two dark felt strap hinges on left, brass-colored felt knob on right, no surrounding wall/floor.
6. **Door open:** Edit the closed door while preserving frame and threshold, swing foreshortened door panel outward left on its left hinges, knob travels with the panel, opaque dark charcoal felt empty doorway, transparent everywhere outside the prop.
