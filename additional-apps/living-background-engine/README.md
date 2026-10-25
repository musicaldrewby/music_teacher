# Living Background Engine

Drew Wichman’s private agent-operated scene studio. Built with Vinext, Cloudflare D1/R2, React, and a deterministic Canvas renderer.

## Working features

- Twelve original generated scene backgrounds: rain window, stone hearth, Christmas room, forest stream, neon street, tropical beach, mountain waterfall, autumn cabin, moonlit desert, Japanese garden, coral reef, and Arctic night.
- Nineteen independently editable effect types, normalized polygon regions, foreground exclusion masks, flow paths, and individual bulb coordinates.
- Deterministic timing, loop playback, timeline scrubbing, and seam inspection.
- Persistent per-user scenes, immutable revision history, atomic operation batches, revision conflict checks, and restoration as a new revision.
- Portable JSON projects with embedded background artwork; PNG at an exact time; frame-by-frame 720p/1080p MP4 through WebCodecs and mp4-muxer.
- Site MCP endpoint at `/mcp`, with twelve tools to discover recipes, save/edit scenes, import artwork, request previews/videos, inspect status, and cancel renders.
- Queued agent renders use an enabled, visible browser tab. Leases prevent two tabs from processing a job; stale workers fail with a useful message. Completed renders live in private R2 storage.

## Agent workflow

1. Read `engine_capabilities` and `list_recipes`.
2. Create a scene from a recipe or a complete `living-background/1` object.
3. Generate original artwork using the agent’s image-generation tool and call `stage_image` with its supported OpenAI media URL, or upload through the studio.
4. Use `get_scene` for the latest revision, then `edit_scene` with `expected_revision`. Layers are ordered back to front. Coordinates are 0–1.
5. Open the studio and enable **Agent rendering**. Request a PNG or MP4, then poll `get_render` until terminal. PNG results include inspectable image content.
6. Review and revise the actual output. A queued request is not a completed render.

## Limits

Image generation is supplied by the agent, not by a built-in paid generation API. Scene edits can run while the site is closed. Rendering requires an open supported browser; there is no unattended GPU service. MP4 requires H.264 encoding support. Output is silent and 16:9; import uses center-crop for other aspect ratios. A flow layer transports the full-detail image texture along a curved local velocity field, with adjustable travel distance, surface ripples, stationary boundaries, and foreground exclusions. The window_drops effect refracts the background through individual beads, moving drops, and wet trails. These effects are procedural compositing, not a fluid simulation. Sway bends the masked image around a fixed attachment point using a single bilinear source sample. Speed is quantized into full loop cycles for exact repeatability.

## Development and checks

Use the Sites lifecycle helpers for installation, build, source synchronization, and deployment. `.openai/hosting.json` declares D1 `DB`, R2 `BUCKET`, and MCP capability. Generated Drizzle migrations are applied at deployment.

- `node node_modules/typescript/bin/tsc --noEmit`
- `node tests/server-check.mjs` — SQLite-backed ownership, revisions, atomic edits, render claims, cancellations, and stale-renderer tests. Requires Node with `node:sqlite`.
- `node tests/engine-check.mjs` — actual Canvas pixel rendering, exact loop endpoints, visible motion, and foreground protection. Uses `@napi-rs/canvas` from `CODEX_PRIMARY_RUNTIME_NODE_MODULES` when available, otherwise a local installation. `LBE_QA_DIR` selects the temporary image output directory.

Initial verification: TypeScript and production build passed; 69 renderer/model assertions and 18 server assertions passed. Direct renderer samples were visually inspected. End-to-end browser controls and browser H.264 export were not verified because browser QA was unavailable in the authoring session.

## Weather and flow update (1.1)

The stream preset now uses clearly visible texture transport at 76 px travel. Rain uses three exposure/depth bands. Window water is a separate `window_drops` effect with density, refraction, scale, and wet-trail controls. `tests/water-check.mjs` tracks synthetic image features to confirm downward, upward, and rightward transport and checks that the stream preset changes a substantial region. The direct renderer benchmark on the authoring host averaged about 15 ms/frame for the stream and 29 ms/frame for rain plus glass droplets at 720p; browser/device performance can differ.

## Christmas light controls

The tree recipe uses a separate unlit background plate and 85 individually positioned procedural bulbs. Light modes: steady, independent twinkle, soft alternating flash, and traveling chase. Warm white, multicolor, and custom-color palettes; adjustable dimming depth and halo spread. Bulb centers, inner glow, and wider branch spill track the same brightness envelope. All patterns remain loop-periodic. Coffee steam uses brighter, soft rising strands positioned at the foreground cup rim.

## Candle flames

Dedicated candle layers use stationary wick points, softly sampled amber/ivory flame shapes, subtle blue bases, tip lean, height changes, and linked warm spill. The Christmas background has its static flames removed before compositing. Candle scale controls flame height, and motion speed controls flicker.

## Scene collection expansion (1.2)

Four additional original photographic backgrounds with dedicated masks: neon rain and puddle reflections; turquoise incoming tide and high cloud drift; a downward waterfall and plunge-pool current; autumn leaf flutter, chimney smoke, and warm cabin windows. The leaves effect uses sparse, depth-varied maple silhouettes with continuous drift and face rotation. All eight recipes are discoverable and editable through the agent interface.

## Surface-specific motion (1.3)

Wet pavement uses rain_impacts: short, perspective-scaled ringlets and tiny ballistic droplets. It never transports the pavement texture. The ocean renderer uses a single source sample at a continuously varying orbital displacement, with perspective-compressed wave fronts and anchored shoreline boundaries. This removes the dual-image blend used by the general flow effect and preserves wave/foam detail. Ocean scale controls swell height; speed controls whole loop cycles. This remains a subtle animated photograph, not a full breaking-wave fluid simulation.

Validation: `node tests/surface-check.mjs` compares ocean edge detail against the former blended flow and checks that ground impacts only change a small number of local pixels. The sample run retained 81–82% of source edge detail in the water crop versus 62% with the previous blend. Ocean intensity changes displacement strength rather than compositing opacity, so reducing motion does not reintroduce ghosting.


## Hearth flames and palm fronds (1.4)

The fireplace recipe uses a clean plate with the baked-in flames removed. Separate flames rise from measured fuel sources with independent height variation, upward-moving heat detail, bright lower cores, irregular translucent tips, and a small warm halo. Foreground log and grate masks occlude the flames. Ember size and density in the composition are reduced.

The beach now has an anchored palm-frond sway layer. Motion increases toward the tips; the trunk is protected. This replaces the old translucent whole-image shift with a single-source bend, so foliage has no stationary duplicate. The default horizontal breeze preserves the horizon. This is still a local deformation of a photograph, not a 3D leaf simulation.

For agents, fire `points` locate fuel sources; sway `points[0]` is the attachment point. Scale controls flame height or sway distance. Sway opacity controls displacement strength. The studio supports placing these points and protects foreground objects with exclusion polygons. Reload and choose the updated gallery recipe to receive the new settings; existing saved scenes retain their parameters.

Validation: TypeScript and the deterministic renderer checks, plus focused checks for moving flame/frond pixels, exact protected log/trunk pixels, stable ground, and matching loop endpoints. Native canvas frames were reviewed. Browser playback was not available in the editing environment.


## Four contrasting worlds (1.5)

- **Moon over the sandstone:** low drifting dust and slow twilight clouds, with fixed cliffs and moon.
- **Rain in the lantern garden:** fine rain, separately masked pond and path impacts, a small flowing cascade, and warm lantern light.
- **Beneath the turquoise:** subtle surface swells, moving caustic light over sand, gently bending sea grass, and soft sun shafts.
- **Under the northern lights:** two slow, striated emerald/violet curtains in the sky above fixed stars, mountains, trees, and ice.

The new `aurora` and `caustics` layers work in preview, PNG and MP4 exports, and agent recipes. Caustics changes light only; it never shifts the sand image. Both effects stay within user regions and respect exclusion masks. The gallery now has twelve cards. The aurora card uses an engine-rendered preview so the moving light effect is visible before selection.

Artwork was created using the built-in image generation tool. The four independent photographic prompt briefs were a moonlit Southwest sandstone wash, a rainy lantern-lit Japanese garden, a clear shallow tropical coral lagoon, and a starry Arctic lake and cabin. The last image deliberately leaves a clear sky for animated aurora. No people, text, or animals were requested. Generated base plates are stored in `public/scenes/desert.webp`, `garden.webp`, `reef.webp`, and `aurora.webp`; the aurora preview is `public/scenes/aurora-preview.webp`.

Validation: TypeScript and 146 renderer assertions across twelve scenes and twenty-one effects, including motion, exact loop endpoints, foreground exclusions, and atomic scene edits. Native canvas frames were inspected; browser playback was unavailable.
