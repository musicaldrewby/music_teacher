# Prism Motion Studio

Drew Wichman's private 3D text and object animation studio.

- Three.js WebGL rendering with actual extruded, beveled per-character geometry.
- 16 self-hosted OFL fonts plus static TTF/OTF import. Basic glyph layout; no complex OpenType shaping.
- 28 physical/procedural materials; separate front, side, bevel, and back text materials.
- 30 procedural 3D shapes and everyday props. 12 backgrounds, image background import, five light rigs, atmosphere, and shadows.
- Multiple layers; XYZ position, pitch/yaw/roll in degrees, scale, motion presets, letter motion, transform keyframes and easing. Camera keyframes, orbit/dolly/crane.
- Persistent, user-scoped D1 scenes with optimistic revision checks. Device-local recovery draft, JSON import/export, undo/redo.
- Deterministic frame-by-frame MP4 H.264 / WebM VP9 export with optional stereo AAC / Opus sound cues using Mediabunny and WebCodecs. Default 1920x1080, 60 FPS. PNG supports transparent background. Encoding availability depends on the browser/device; unsupported codecs fail explicitly. No real-time screen recording fallback.
- MCP endpoint supports discovery, list/get/create/save scene, catalog, and prepare-export links. Tools do not render video on the server. Actual rendering runs in the user's browser.

## Agent workflow

Call `get_studio_catalog`, then `list_scenes` / `get_scene`. Preserve unrelated scene data. Call `save_scene` with the complete scene and its expectedRevision. A stale revision returns an error. The editor polls for newer saved revisions and offers reload or save-copy. `create_scene` accepts a complete scene or one of gold/classroom/neon/celebrate templates. `prepare_export` returns an editor link with export controls open.

Coordinates are right-handed, Y up, Z toward the viewer. Rotations are unwrapped degrees `[pitch, yaw, roll]`, Euler XYZ, so 0→360 animates a complete turn. Keyframe easing belongs to the destination key. Preset motion is additive. Object transform editing creates/updates a key at the playhead once keyframes exist.

## Validation

TypeScript checks, production build, and Node tests cover all bundled fonts' geometry/counters, all procedural props, template schema, 360-degree interpolation, exact timestamp planning, and malformed scenes. Browser graphics, interactive manipulation, and actual video encoding must be checked in a supported browser; no supported browser QA surface was available during initial development.

`node --import ./node_modules/.pnpm/tsx@4.22.1/node_modules/tsx/dist/loader.mjs --test tests/core.test.ts`

Source and hosting are managed by Sites. D1 migrations are in `drizzle/`. Bundled font source and OFL notices are in `public/fonts/`.


## Director tools and Lantern Valley Express

The `miniature-town` showcase is a 40-second, 60 FPS train journey with Cab, Chase and Overview views. A 139.6-unit closed rail route drives the emerald/brass locomotive, wheels and cab camera. The set includes houses, a station, sidewalks, lamps, a fountain and a clock tower. Synthesized train rhythm, bell and whistle cues share scene time with the visuals. It is an editable scene, not a prerendered video.

Creative Library → Motion edits reusable Catmull–Rom paths; objects and the camera have independent start/duration/offset/loop settings. The town's rendered rail meshes are fixed to the supplied route. Changing that route intentionally moves the train away from those rails. Guides appear only in the editor.

Object controls include group parents, a local pivot, six coordinated performance presets, additional entrances/holds/exits, and timed hop/wobble/squash/spin/glow reactions. Child coordinates are local to the parent. Delete groups after reparenting children. Numeric transforms edit followers' offsets and custom pivots; the direct gizmo is disabled for those cases. Smart title fitting is for unparented layers without a path or custom pivot.

Creative Library → Effects provides mesh-based snow, leaves, sparks, fireflies, bubbles and confetti with region, timing, density, speed, color, scale and seed controls. Standard and path-traced export use the same absolute-time positions. Up to four effects, 300 particles per effect.

Objects → Import GLB accepts static, self-contained uncompressed GLB 2.0 up to 4 MB / 300k triangles, preserving embedded PBR materials and textures. No rigged or embedded animation import; animate the layer in Prism. Model bounds normalize to three units. Audio → Upload audio accepts browser-decodable audio up to 4 MB / 10 minutes (scene clips remain at most 120 seconds), plus six synthesized sounds. Offset, duration, looping, fades and gain are editable; exports mix stereo 48 kHz. A limiter applied after mixing prevents clipping without adding audio latency. Scene JSON remains capped at 8 MB total. Small scenes remain in D1; scenes larger than 1.5 MB are stored as private owner-scoped R2 objects with D1 metadata and revision checks. Existing saves remain compatible.

The MCP catalog exposes every new default, enum, preset, limit and coordinate convention. Existing saves receive disabled animation/path/import/effect defaults. Node tests cover schema migration, route/camera agreement, rail clearance, open cab, pivot anchors, reaction reset, deterministic particles/audio samples, static GLB parsing and import materials, controls, and export scene flattening. GPU rendering and actual WebCodecs muxing still require a supported browser; no browser QA surface is available in this workspace.


## Quest / WebXR studio

Open VR Studio from the top bar in Meta Quest Browser. The app checks immersive VR support and prepares a separate Three.js renderer before requesting a session from the Enter VR click. Use the full website URL when the embedded preview cannot grant XR access.

The first release includes miniature/full-size viewing, controller move/rotate/resize, playback with scene audio, 30-degree turns, seated eye-height adjustment, undo, and up to 24 captured camera views. Trigger or grip grabs a layer; the held controller's stick resizes it; A/X recalls the floating panel. Set pieces use the existing deterministic set edits. Path-driven, physics, pivoted and mechanism layers remain viewable and are edited using their existing studio controls.

XR edits apply on session end as one ordinary editor undo step. Save persists them with the existing revision checks. Captured `xrViews` are independent of the export camera until the user chooses Use view or Add to storyboard in Camera. Existing scenes migrate with an empty view list.

Headset quality is independent of export. Balanced uses a 0.85 framebuffer scale and foveation; Sharper uses 1.15. Live shadows are optional and capped at 512. The stereo renderer bypasses the desktop bloom/depth-of-field compositor. Navigation is at eye level without collision blocking.

Verification: TypeScript and production build; geometry, animation, stereo, scene-storage, VR transform/view tests; simulated XR session acceptance, denial, renderer failure and teardown races. Actual Quest rendering, controller feel and frame rate require on-device verification.


## Expanded text animation collection

The Entrance · Hold · Exit panel now includes an animated picker with eight new entrances, eight hold movements, and eight exits. The original presets and IDs remain available. Choose an effect independently for each phase; grouping supports whole layers, words, and letters. Direction, reverse order, stagger, travel strength, settling bounce, and local pull-point controls are saved with the sequence. Older scenes receive defaults without changing their original motion.

Word animations share an authored pivot, and new hinge-like moves use the unit's lower, upper or left edge. Curtain reveal uses clipped mesh halves, focus reveal uses eight soft contour samples, and receding echo uses three fading mesh copies. These meshes exist even when inactive so frame sampling, physical rendering and Blender animation transfer can retain them. The focus effect is a deterministic soft-contour treatment rather than a camera-wide depth-of-field change.

Verification includes all 24 effects across three grouping modes, old and new scene round-trips, finite scales and opacity, exact transition boundaries, reverse seeking, geometry clipping, export mesh presence, and existing stereo/VR regressions. Browser visual QA is unavailable in the current execution environment.


## Individual light builder and another twelve animations

Lighting → Build your own lighting has Start dark, Add point light, Add spotlight, and Add directional. Start dark retains geometry and camera animation, disables weather, clears custom lights, fill, reflection lighting and built-in set fixtures, selects a black background and resets the rig motion. Emissive materials retain their glow. All changes use ordinary Undo and Save.

Custom mode replaces the cinematic preset rig and supports up to eight independently named, enabled lights with color, power, position, target, range, cone, edge softness and shadow controls. Selecting a cinematic preset returns to preset mode without deleting the saved custom rig. Point lights are included in standard rendering, physical scene flattening, WebXR and Blender POINT exports. Light power matching between Three.js and Blender remains an artistic approximation.

Text additions: Falling leaf, Zipper reveal, Flip-board arrival, Spring launch; Figure eight, Accordion, Orbiting tilt, Tick-tock; Roll away, Paper plane, Crumple, Light-speed retreat. These join the existing preview picker and saved sequence schema. Crumple and paper-plane use geometric squash, stretch and rotation rather than mesh tearing or paper simulation.


## Drag light handles and slider controls

Custom lights have editor-only position icons and diamond aim targets in Lighting. Select an icon, a light row, Drag light or Drag aim target to use the ordinary translation gizmo. Disabled lights remain selectable. Directional/spot target guides and handles follow the actual rig transform and compensate for spotlight sweep offsets when saving. These helpers are omitted from playback, headset rendering, and export.

Bounded numeric controls now pair a range slider with exact number entry; unrestricted vector coordinates retain number entry. Light power uses a logarithmic slider for fine low-power adjustments. Slider gestures are grouped into one Undo step. Custom light power, color and pose updates reuse light objects/shadow resources and do not regenerate the reflection map for every adjustment.

Verification covers point and target dragging through rotated/elevated/sweeping rigs, saved positions, export helper exclusion, deleted-light cleanup, slider precision and existing lighting/scene/VR behavior. Browser visual and touch interaction testing require a browser-enabled environment.


## Audio reactions

Creative Library → Audio accepts an uploaded MP3, WAV, M4A or OGG that the browser can decode. Import analyzes stereo PCM in 2048-sample FFT windows at 20 Hz, retaining quantized loudness, bass, mids, treble, beat pulses and 16 logarithmic spectrum bands. Channel power is combined without phase cancellation. Beat times and BPM are estimates; this is not stem, lyric or musical-section recognition. Analysis is fingerprinted to the audio data and saved with the scene. The total scene limit remains 8 MB; each imported audio file is at most 4 MB and 600 seconds. Clip timing selects the section used by the scene, up to 120 seconds. A synthesized 12-second demo beat is available without an upload.

EQ bars and EQ ring create one editable `prop:equalizer` layer. Standard transform/material controls apply. Bass bounce can target existing text or other layers; each layer can instead pulse or sway and follow loudness, bass, mids, treble or detected beats. Light pulse modulates the existing rig's point, spot and directional lights. Strength and Smoothness sliders affect the scene; layer/light strength is separately adjustable. Physics and arrays are incompatible with audio object motion and equalizers. Existing scenes opt out by default.

Sampling uses absolute source time with cue start, source offset, looping, gain and fades. Cached attack/release envelopes are independent of playback order; preview, seeking, WebXR, standard and physical export, and Blender's mesh/light bake share the engine sampler. Original audio remains in the exported mix. Muting sound or setting master volume/strength to zero stops reactions. The original authored transforms and light powers are restored before every sample.

After the user uploads and saves, agents call `get_audio_analysis({id})` for source-time envelopes, approximate beats/BPM, layer IDs and the latest revision without embedded audio bytes. `set_audio_reactivity({id,expectedRevision,cueId,look})` applies bars/ring/bounce/lights, preserving other scene content. Its optional settings, objectReactions and visualizers arrays expose fine controls; full scene editing remains available. Owner scoping and optimistic revision checks are unchanged.

Audio tests cover frequency isolation, inverted stereo, silence, approximate onset timing, malformed analysis, source fingerprints, mute/volume/fades/loops, repeatable seeking, scene preservation, backward compatibility, UI labels, stable Blender topology and physical-render transfer. Live browser playback, codec encoding and Quest behavior still require device verification.


## Living coral reef
The Aquarium scene is a complete underwater set with 36 swimming fish, jointed anemones, swaying ribbon kelp, sea fans, coral gardens and bubble streams. Eight editable camera shots use gentle dissolves. Mesh identities stay fixed for scrubbing, standard rendering and Blender bakes. Audio level subtly increases fin and tentacle motion when reactivity is enabled. The scene timeline supports up to 600 seconds; imported audio remains limited to 4 MB and complete saved scenes to 8 MB.
