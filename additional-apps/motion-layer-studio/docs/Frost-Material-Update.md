# Frost material and renderer update

11 October 2026. The frost/condensation layer was rebuilt after feedback that its appearance was poor.

- Frost uses a generated photographic-style crystal material with fine faceted detail. It is embedded in `dist/index.html`, preserving the single-file app; `assets/frost-crystals.png` retains the source asset.
- A cached distance field follows the painted glass boundary. Coverage and looped growth reveal the ice inward from those edges. The material uses image-height units to keep its scale consistent across aspect ratios and exports. New layers cover the image; existing layer placement is retained.
- Condensation has a 16-sample scattering blur, two sizes of subpixel-aware refractive droplets, and uneven clearing. The old four-direction ghosting and central circular clearing patch are removed.
- Frost, Condensation, and Frost + condensation are explicit modes. Presets: Delicate frost, Deep freeze, Steamy window, Cold wet glass. Controls are grouped by material; presets retain placement and masks.
- New project fields are optional with validated ranges. Zero fogging, droplets, and blur are preserved when opening a project.

## Asset provenance

Created using the built-in image-generation tool. Source: `assets/frost-crystals.png` (1254 × 1254 RGBA). Transparency is retained in the source and used when producing the rendering material. It is an AI-generated material, not a photograph of a particular window.

Exact prompt:

> Use case: photorealistic-natural. Asset type: a high-resolution square frost MATERIAL TEXTURE for a realistic glass animation shader. Create an extreme close-up of actual intricate winter window frost, viewed perfectly straight on. Dense, natural feather-like ice crystal formations, hundreds of delicate faceted needles branching into very fine microcrystals. Varied orientations and sizes, softly overlapping irregular clusters, subtle translucent frozen-film connections, with clear irregular gaps between clusters. Neutral silvery white and soft gray ice, soft grazing daylight reveals microscopic relief. Even sharp focus across the entire texture. Cover the square with the material at a consistent scale, with no central subject and no border; suitable for cropping or repeating. Clear spaces between the ice must be genuinely TRANSPARENT. No window frame, no background scene, no text, no labels, no vignette, no visible grid, no snowflake icons, no drawn fern outlines, no cartoon, no decorative snowflake pattern. This must look like a macro photograph of real ice on glass, not an illustration.

## Verification

Checks exercise the real source functions and shaders: atlas caching and mask invalidation, embedded-asset integrity, three UI modes, defaults and validation, and real OpenGL ES rendering at 960 × 540. Every mode must preserve an empty mask, protection map, and all-zero settings, and match at the loop endpoints. Rendered frost was also inspected on a curved painted mask. Live browser interaction, hardware-specific performance, and actual video exports were unavailable in this environment.

Run:

```sh
node tests/check-frost-ui.cjs
python tests/check-frost-rendering.py
```

The renderer test also runs atlas checks using `@napi-rs/canvas` from the managed runtime, and requires NumPy, Pillow and surfaceless EGL/Mesa. Set `MLS_FROST_OUTPUT` to select the report directory. Existing UI and flow regression checks remain available.
