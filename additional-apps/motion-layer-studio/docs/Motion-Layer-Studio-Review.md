# Motion Layer Studio — UI and effects review

Reviewed 10 October 2026. Covers the current hosted app: 37 selectable layer types, 14 whole-scene filters, and the shared editing tools.

This is a source and UI-logic review. A live browser was unavailable, so judgments about visual quality are inferences from the rendering methods, not a claim that every effect was watched on a reference scene. The initial cleanup changed presentation. The subsequent realism pass below updates selected effect renderers; the project format and export paths remain in place.

## Changes made in this pass

- Category buttons filter the effect picker. Search covers subjects such as candles, pool light, birds, frost, and holiday lights. Favorites still work with both search and categories.
- Each new nature layer has a specific setup cue instead of a generic instruction to paint.
- Primary controls from newer nested panels appear in Essentials. Detailed controls remain available in their existing sections.
- Solo layer is accessible directly in the inspector. Solo, hidden, and locked states are easier to identify.
- Collapse details reduces inspector clutter without removing primary controls.
- Inspector scroll position survives refreshes on the same layer. Renaming a layer also updates its inspector heading.
- Shared environment controls now belong inside the Environment tab; they no longer sit above both Environment and Filters.
- The Motion tab is named Effect to better describe its appearance, movement, and timing controls. Small-screen effect cards use one column, and preview resolution is distinguished from export resolution.

## Realism pass — 11 October 2026

Implemented after the review:

- **Continuous flow:** adjustable detail preservation reduces travel where the velocity field changes sharply, including around fixed points. The field uses raw RGBA data so small vectors retain their precision. This reduces deformation; it cannot reconstruct hidden pixels or remove every crossfade artifact.
- **Water:** six differently directed, differently sized wave bands replace the dominant regular wave pattern. Broad swell, fine ripples, surface glints, and perspective have separate controls. Pond, wind-ripple, and gentle-swell presets are available; speed zero freezes motion and movement zero leaves the image unchanged.
- **Surface ripples and impact mist:** impact timing and ring contours vary, rings include a weaker trailing wave, and mist has rougher puff edges with downstream texture motion.
- **Basic smoke / steam:** rising, expanding parcels now have textured contours, local shading, directional drift, and age-dependent dissipation. Presets cover steam, chimney smoke, and denser smoke. The volumetric volcanic plume and its lighting are unchanged.
- **Glass rain:** more varied tracks, controllable stop/slide acceleration, small joining beads, and uneven broken wet trails. Small-drop support, contrast, and independent trail length are retained. This is a procedural approximation of coalescence, not a fluid simulation.
- **Fire:** less regular height and flicker, breaking tips, and wind bending. The render bounds expand for wind so leaning tips are not cut off prematurely.
- **Shared weather:** flames, foliage, dappled sunlight, and falling leaves can follow the Weather director. The existing opt-in checkbox appears under Links → Scene interaction. Unlinked layers retain local controls.
- **UI:** water and smoke presets and essentials are grouped; secondary parameters sit in Water surface, Smoke detail, Droplet behavior, or existing advanced sections. New fields have backward-compatible defaults and range validation.

Verification: both shader programs compiled and rendered with software OpenGL ES at 640×360. Ten affected/adjacent effects passed loop endpoint and empty-mask checks (at most one 8-bit channel step in the measured results), with comparable movement on either side of the seam. Zero movement / frozen-time checks passed. DOM-model checks covered the new controls, disabled state, defaults, validation, and opt-in weather; raw field checks covered fixed points and the speed range at 10/20/30/60-second loops. A live browser and actual MP4 exports were not available for this pass. These checks support correctness, not a claim of studio-quality realism on every scene or device.

## Frost and condensation follow-up — 11 October 2026

The frost/condensation priority has now received a dedicated replacement: fine crystal material, painted-edge growth, scattered-light blur, microdroplets, separate material modes, and focused controls. See [Frost-Material-Update.md](Frost-Material-Update.md) for the implementation and verification limits. The original review table below remains a historical assessment.

## Best next investments

1. **Visual calibration:** compare the revised flow, water, smoke, fire, and glass rain on real reference scenes at subtle and strong settings. Tune any remaining stretching, repetition, and scale mismatch.
2. **Next renderer priorities:** firefly wandering, bird gliding, and less geometric caustics. Shared scene lighting for fire spill remains a separate improvement.
3. **Consistency across effects:** unify motion speed, scene wind, depth, lighting, and parameter units. Four nature layers now follow shared wind when enabled; depth and shared lighting still need a broader consistency pass.
4. **A repeatable visual test set:** use the same waterfall, rainy window, forest, space station, and night-sky scenes at subtle, default, and strong settings. Check the loop seam and short 1080p/60 exports before declaring an effect studio quality.

## Every layer — original review

The table records the initial assessment. The implementation notes above identify what has since changed; other items remain recommendations.

“Keep and polish” means the mechanism is a sound fit for its job. “Refine” means useful now, with a clear realism limitation. “Priority rework” identifies the most consequential improvement opportunities. These are engineering assessments, not visual scores.

| Layer | Assessment | What should change next |
|---|---|---|
| Continuous flow | Priority refinement; a defining tool | Preserve fine texture through the overlapping warps; reduce stretching near masks and fixed points. Give a clear warning when requested travel exceeds what the source pixels can support. |
| Water ripples | Priority rework | Replace the dominant regular wave pattern with several differently sized, directional wave bands. Separate broad water movement from fine surface shimmer. |
| Surface ripples | Refine | Vary emission intervals and ring shapes; make interference and fading less uniform. Clarify its purpose as a localized ripple source versus Puddle Ripples. |
| Puddle Ripples | Keep and polish | Improve overlapping rings, irregular splashes, and material response. Keep the freely positioned impact area and perspective controls. |
| Water Caustics | Refine | The cellular ridges can look like a geometric net. Add varied line width, softer broken ridges, and several pattern scales. |
| Waterfall impact mist | Refine | Retain the ballistic spray. Give puffs more varied breakup and connect their apparent size and drift to the waterfall's scale. |
| Rain | Keep and polish | Retain depth separation, nearby blur, gusts, and impacts. Improve scene-matched brightness and the relationship between distant streaks and nearby drops. |
| Rain on glass | Priority rework | Add bead coalescence, changing paths, trail breakup, and variable acceleration. Small drops need readable refraction without looking like bright dots. |
| Snowfall | Keep and polish | Retain independent fall, wind, gusts, depth, and flake variation. Visually verify dense blizzards and the near-camera softness at multiple output sizes. |
| Rolling fog | Refine | Preserve its downstream drift. Add layered depth, uneven density, and a ground-hugging option so it feels less like a uniform veil. |
| Cloud veil | Refine within its intended role | Improve scale variety, thinning edges, and subtle lighting. It is a veil over existing sky, not a complete volumetric-cloud replacement. |
| Smoke / steam | Priority rework | Eighteen soft puffs are a simple foundation. Adapt the plume's richer density and shading to light smoke and steam, with dissipating wisps and less visible repetition. |
| Volcanic plume | Keep and polish; stronger technical foundation | Retain volume integration, shaded interiors, and lighting. Improve the transition from vent to expanding billows and less uniform upper dispersal; test cost at high resolution. |
| Heat shimmer | Refine | Favor rising, localized distortion and varied turbulence over a recognizable oscillation. Preserve subtle settings. |
| Floating dust | Keep and polish | Retain its depth bands and directional travel. Improve illumination tied to beams and distance, with less obvious particle repetition. |
| Fireflies | Refine | Replace the repeating orbital paths with wandering flight and pauses. Give each insect a more independent flashing rhythm. |
| Autumn Leaves | Refine | Add more sprite and color variation, deeper spatial spread, and varied landing locations/orientations. A shared flat ground height can reveal the simulation. |
| Fire & Candle Flames | Priority refinement | Improve flame-body continuity, irregular detached tips, and differences between candle, fireplace, and campfire behavior. Connect the spill to shared scene lighting. |
| Flickering light | Refine | Replace the obvious multi-sine rhythm with irregular, loop-safe flicker. Separate candle, fluorescent, faulty lamp, and fire behavior through presets. |
| Breathing glow | Keep and polish | Its simple pulse is appropriate. Improve labels for pulse depth and timing; keep a gentle default. |
| Light shafts | Refine | Add less uniform beam structure, stronger foreground occlusion guidance, and light-colored dust that responds to the beam. |
| Dappled Sunlight | Refine | The noise-based patches can look cloudy. Use leaf-shaped or canopy-like shadow detail and connect movement to scene wind. |
| Christmas Lights | Keep and polish | Preserve varied layouts and animated bulbs. Improve perspective sizing, subtle color spill, and independent bulb imperfections without making the default noisy. |
| Lightning storm | Keep and polish | Retain branched channels, return strokes, and cloud illumination. Improve the relationship between scene depth, distant cloud flashes, and nearby strikes. |
| Northern Lights | Refine | Increase variation between curtain layers and folds, with less synchronized motion and more variation in ray height. |
| Stationary Stars | Keep and polish | Improve irregular sky distribution, apparent magnitude range, and restrained color variation. Avoid making every star sparkle equally. |
| Twinkle Image Stars | Keep and polish | Preserve the original star cores. Improve selection and independently varied pulse timing so the scene reads as stars rather than blinking lamps. |
| Shooting stars | Refine | The current small fixed event set needs independently adjustable occurrence rate, length, brightness, and angle variation. |
| Space Flight | Keep and polish | Retain projected depth and streaks. Improve consistency between speed, field of view, and near-star size; visually check fast settings for strobing. |
| Birds & Bats | Refine; best kept distant | Add gliding intervals, varied wingbeats, banking, and species-specific flight. Large silhouettes expose the simple geometry. |
| Tree & Foliage Motion | Keep subtle; refine | Retain masks and fixed points. Improve branch-level variation and reduce edge stretching; connect it to scene wind. It cannot reveal hidden background from one still. |
| Fabric / curtains | Keep subtle; refine | Retain anchored tops and fixed points. Match deformation and lighting to existing folds, and reduce stretching along masked edges. |
| Frost & Condensation | Priority refinement | Frost currently reveals a fixed branching texture. Add uneven crystal growth and varying crystal scale; develop condensation into a more convincing wet-glass layer. |
| PNG sticker | Keep and polish; core workflow | Preserve mipmap filtering, perspective, silhouettes, paths, and presets. Improve transform handles and make pivot/attachment choices easier to understand. |
| Animated GIF overlay | Keep and polish; core workflow | Make source timing versus loop fitting especially clear. Keep frame decoding, transparency, perspective, and export timing reliable. |
| Real footage overlay | Keep and polish; high realism potential | Improve source matching: black level, tint, edge treatment, and crossfade ghosting. The quality of the supplied footage remains decisive. |
| PNG particle emitter | Keep and polish | Add optional sprite variation and better surface interaction. Make emission direction, size, and apparent depth easier to tune together. |

## All whole-scene filters

| Filter | What should change next |
|---|---|
| VHS tape | Give this a dedicated realism pass: coherent chroma bleed, intermittent tracking errors, and distinct clean-tape versus worn-tape presets. Avoid constant equally spaced damage. |
| CRT television | Keep scanlines, phosphor, and curvature; check sampling at every output resolution to avoid moiré. |
| Super 8 / 16 mm | Give grain, dirt, scratches, and gate movement more natural distributions; separate clean film from distressed film. |
| Cinematic grade | Add better highlight/shadow control and a neutral reset. Current exposure, contrast, saturation, and warmth form a useful base. |
| Film halation | Confine the red/orange response more convincingly to bright boundaries; avoid coloring broad dark areas. |
| Bloom / diffusion | Use better highlight rolloff and several blur scales. Preserve detail while softening bright sources. |
| Night vision | Keep as a stylized camera look; refine noise and highlight clipping rather than making the whole frame uniformly green. |
| Thermal-style color | Keep the “style” label: it maps brightness to color and does not infer heat. Add controlled palettes if needed. |
| Underwater lens | Use less uniform distortion and depth-sensitive color loss. The current effect is useful as a restrained finishing look. |
| Old digital camera | Make block artifacts and noise less spatially static, with distinct sensor/compression presets. |
| Anamorphic lens | Improve highlight-dependent streaks and aspect-aware letterboxing; avoid turning every bright region into a stripe. |
| Dream / memory | Keep and polish presets. Limit washed-out contrast and excessive diffusion at defaults. |
| Monochrome / duotone | Keep. Better luminance/color-channel control would be more useful than additional decorative presets. |
| Retro computer | Keep as an intentional stylization. Curated palettes and integer pixel scaling would improve consistency. |

## Shared tools and engineering

- **Depth of field:** test foreground edges for halos and subject-detail loss. Keep near/far blur consistent with overlay depth.
- **Moving shadows and light spill:** useful compositing tools, currently adjustable 2D effects. Better receiving-surface placement and light-direction consistency would raise realism.
- **Linked reflections:** improve waterline transitions, distance fade, and distortion without detaching the reflected subject from its source.
- **Puppet pins:** retain the simple workflow; add clearer influence regions and an easier way to detect over-stretched areas.
- **Masks and Smart Select:** the improved mask visibility should stay. Better selection previews around branches/hair and easier cleanup would benefit nearly every effect.
- **Paths and keyframes:** retain smooth paths and offscreen travel. Clearer distinction between speed along a route and a GIF's own walking cycle would help moving characters.
- **Speed and loop duration:** many effects use cycles per scene loop, so changing the loop duration changes their pace. A consistent choice between absolute speed and loop-fitting would be valuable.
- **Shared wind and lighting:** extend the existing environment system to the newer nature effects so rain, trees, leaves, smoke, and light feel part of one scene.
- **Defaults and ranges:** use consistent units and sensible subtle-to-strong presets. Many controls already have exact entry, fine dragging, and nonlinear precision near zero; preserve these.
- **Maintainability:** the single HTML has many successive function wrappers and UI overrides. A future internal refactor into effect modules and one inspector definition per effect would make fixes safer while keeping the user workflow intact.

## Verification for this cleanup

JavaScript syntax checks pass. Targeted DOM-model checks cover category/search/favorite filtering, empty results, all eight nature inspectors, essential-control promotion, repeated cleanup, unchanged scene data, environment tab containment, solo controls, and collapsing details. Static DOM IDs remain unique. The main render loop, shaders, flow math, and nature particle math were compared against the previous site and are unchanged.

Live browser rendering, touch interaction, and export playback still need visual verification. No photorealism rating or device-performance benchmark is claimed in this review.
