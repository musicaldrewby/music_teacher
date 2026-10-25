# Train Window Studio

Buildless hosted conversion of the version 14 standalone app. The original six scenes, eight carriage styles, weather, journey events, sound mixer, favorites and video export are preserved.

Serve `dist/` over HTTPS. No build, dependencies, external services or server data are required. Browser-local favorites are specific to the browser and site origin; use Back up favorites and Import favorites to transfer them from the standalone app. Imported music remains in browser memory.

`migration.json` records source provenance and byte checksums. `artwork-record.json` preserves the original asset and validation record.

## Workspace layout and tunnel portals

Scene and carriage choices occupy a toolbar above the train image. Playback is below it. Customize opens an inspector beside the image on desktop and below it on narrow portrait screens; Cinema uses the whole viewport. The inspector groups existing controls into six accordion sections.

Tunnel portal faces are visible from their exterior sides only, with the cylindrical lining occluding masonry behind it. This removes the duplicated bright rim just inside the entrance and exit. The shared tunnel shader serves every scene and connected route.

Run `node --check dist/app.js` and `node checks/check-controls.cjs` for syntax and simulated control checks. See `checks/validation.json` for native shader evidence and verification limits.

## River crossings between tunnels

Every added river crossing follows land → tunnel → open-water bridge → tunnel → land. The entry tunnel occupies 188–202 seconds and the departure tunnel 238–252 seconds within each five-minute scene. The water layout changes at 195 and 245 seconds, fully inside the opaque cylindrical lining. Route bounds use integrated track distance, keeping these transitions aligned with station stops. Both river tunnels are mandatory parts of the crossing, even when the separate scenic-tunnel option is off. Connected-route transition tunnels remain intact.

The approach walls and near-bank terrain joins have been removed. Between the tunnels, a continuous perspective water surface fills the foreground, steel bridge girders pass close to the carriage, and a smaller photographic far shore supplies distant parallax. Ordinary scenery, including the bayou's existing marsh water, remains outside this added river section. River approach starts at 186 seconds, just before the entrance.

Run `node checks/check-river-timeline.cjs` for production journey timing and loop checks. `python3 checks/check-river-tunnels.py` uses native GLES and production textures to compare both hidden layouts at identical camera positions. All 96 land/water transition comparisons were pixel-identical, covering six scenes, full/compatible graphics, station stops on/off and optional scenic tunnels on/off. Another 96 checks cover scenery outside the river section and 48 verify that the open river is actually visible. `checks/river-tunnels.jpg` shows land → tunnel → river → tunnel → land in all scenes. This is native rendering, not browser playback.

## Graphics startup and compatibility

Startup separates image loading, graphics preparation and the first frame. Image decoding has a deadline and a three-image concurrency limit. Graphics use KHR_parallel_shader_compile when available, with nonblocking completion polls before any link-status or reflection query. Compilation errors, texture limits and context loss produce visible recovery instructions and details. On browsers without the extension, the final status query can still block; the direct `?graphics=compatible` link bypasses the full shader on the next visit.

The full shader has one scenery call site shared by dry and wet rendering. Automatic preview uses 720p, explicit full quality uses 1080p, and compatibility uses a 540p / 30 FPS preview with fewer blur, condensation and window-recess samples. Both modes use the same scene geometry and tunnel transitions. Export dimensions and FPS remain independently selected; compatibility exports use the lighter effects shader. Renderer creation is asynchronous in both startup and export.

Failed full-mode startup retries compatibility. A recent interrupted full startup also selects compatibility on an automatic-mode reload. Successful compatibility recovery is remembered in browser-local storage. The loading screen always includes a direct compatibility link and Retry; the Cabin & view panel offers graphics mode selection.

Run `node checks/check-startup.cjs` for simulated startup, failure/recovery and compile-poll ordering checks, and `node checks/check-controls.cjs` for controls. Full and compatibility shaders compiled in native GLES and rendered all six scenes. These checks do not establish performance or browser compatibility on the reported ProBook; no live browser or end-to-end video encoding test was available.

Compiler reference: https://registry.khronos.org/webgl/extensions/KHR_parallel_shader_compile/

## Journey-aware rain

Fresh window rain and rain audio stop under the actual tunnel portals, including the two required river tunnels and connected-route tunnels. Water already on the glass keeps its mass and drains or merges naturally; pinned beads and condensation remain. A short exterior exposure ramp smooths the last and first impacts at each portal.

Droplet forces use the integrated journey velocity. Wind shear and gusts ease away during station braking, reach zero lateral drift during the stop, and gradually return as the train accelerates. Gravity continues throughout. Each droplet episode is integrated against its absolute journey time, with a bounded cache of compact Float32 trajectories. The same periodic simulation serves preview, arbitrary seeks and offline exports without per-frame random rebuilding.

Run `node checks/check-journey-rain.cjs` with `@napi-rs/canvas` available (or via `CODEX_PRIMARY_RUNTIME_NODE_MODULES`). It checks all tunnel types, station deceleration/acceleration, both wind directions, gust extremes, all travel speeds, existing-water drainage, live/offline audio shelter, exact loop closure, cache eviction and matching common frames after 15/30/60 FPS histories. These are production-code/native-Canvas tests; they do not establish browser performance or end-to-end video encoding on the user's device.
