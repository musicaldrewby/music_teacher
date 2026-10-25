# Felt & Fable Studio

Created by Drew Wichman. The existing HTML/canvas editor remains the app; a small
Sites server delivers its separate artwork and voice packs at the same URLs.

## Source layout

- `public/`: editor, CSS, catalogs, previews, examples, and documentation.
- `asset-packs/`: full-resolution artwork, natural voice models, and speech
  runtimes. These are tracked source files, but excluded from normal deployments.
- `lib/asset-manifest.json`: generated size, SHA-256, MIME type, and immutable R2
  object key for every separately stored file.
- `lib/asset-storage.mjs`: allowlisted public asset reads and authenticated,
  temporary migration. No user stories, recordings, or exports are uploaded.
- `asset-storage-verified.json`: verification receipt for the hosted originals.
- `build/`, `app/`, `vite.config.ts`: supported Sites server/build integration.

Public reads use the original same-origin addresses, so saved projects, module
imports, origin-clean canvas exports, catalog IDs, and the existing natural voice
cache remain compatible. The first use of an uncached file needs a connection,
as on the previous hosted app. This does not promise a fully offline website or
instant first-time downloads. Images and voice models are not recompressed.

## Normal code updates

Follow the Sites skill to open the existing repository and publish it. Build with
the Sites build helper. Leave `asset-storage.json` in `external` mode. A build
refuses to omit packs unless the verification receipt matches every source file.
Changing code or the UI does not re-upload the asset collection.

## Add or replace artwork and voice files

Keep catalog entries/previews in `public/assets/`, and put large files under their
matching paths in `asset-packs/`. Existing authoring scripts may write new files
under `public/`; `scripts/prepare-asset-storage.mjs` moves supported pack folders
into `asset-packs/` before generating the manifest. Preserve IDs for existing
pieces. Content-based keys retain old versions in storage so rollback remains
possible; no cleanup/deletion happens automatically.

1. Set `asset-storage.json` to `{"mode":"migration"}`. Build. This includes
   compressed, byte-exact fallback files for new or changed assets only; already
   verified packs stay external. Add new packs in batches that fit the deployment
   limit. Removing a receipt entry forces that file to be bundled again for repair.
2. Configure a fresh secret `FELT_ASSET_ADMIN_TOKEN` through native Sites runtime
   settings. Use at least 32 random bytes; never save it in source or browser code.
3. Publish this complete fallback build through Sites, preserving audience.
4. Run `python scripts/migrate-hosted-assets.py` from the repository. At its hidden
   prompt supply JSON with `service` (the same Site's supported service access
   token) and `admin` (the temporary secret). It copies only allowlisted bundled
   files, rereads their stored bytes, verifies every hash, and writes the receipt.
5. Set mode to `external`, remove the temporary runtime secret, rebuild, and
   publish. Check the live editor and representative artwork, model, and WASM
   URLs. Never remove the fallback before verification succeeds.

The updater accepts no arbitrary URLs, uploads, object keys, or deletion actions.
Disabling its secret closes its write route. Existing immutable R2 objects are
preserved between releases. Storage is separate from the 256 MiB deployment
archive limit, but is not represented as unlimited storage.

## Checks and portable builds

- `node scripts/check-asset-storage.mjs`: manifest integrity, authorization,
  byte-preserving reads, conditional requests, and missing-file handling.
- Native app checks remain in `scripts/check-*.cjs`; they need `@napi-rs/canvas`
  available through `NODE_PATH` when it is supplied by the host environment.
- `node scripts/assemble-standalone.mjs`: reconstructs the original full folder
  layout in ignored `.sites-runtime/standalone/`, including local asset packs.
  Use that layout for portable distribution, not `public/` alone. Browser rules
  for local workers/audio still apply as they did before this storage change.
- `pnpm build:voice`: rebuilds the optional speech runtime from `src/voice/` into
  `asset-packs/`. Runtime/model changes require the migration flow above.

User projects and exported movies stay in the user's browser/downloads. The
hosting migration does not change the story format or the rendering engine.

### v1.74: prepared examples and character wardrobe

- File → Speaking cast opens `public/examples/speaking-cast.felt.json`, with all
  four voice tracks already saved. Acting & wardrobe opens a second prepared
  example. Both show artwork loading progress, cancellation, and retry.
- Wardrobe is a collapsed contextual inspector for the four rigged actors;
  four outfit presets and separate hats, glasses, neckwear, vests, and colors.
- Six new acting poses use the existing articulated shoulders and palms.
- Source/native-canvas coverage: `scripts/check-cast-workshop.cjs`. This checks
  no-synthesis example opening, network failure/retry, cancellation during fetch
  and artwork preparation, newer-edit preservation, wardrobe UI/Undo/API,
  serialization, and identical samples at 30/60 FPS. It is not a Safari/iPad test.
- Small prepared examples stay in `public/examples/`. Large artwork and speech
  engines remain in the external asset store; no asset migration is needed for
  this release. To edit an example, keep its saved `audioAssets` and dialogue cues
  together, then run project validation before publishing.

### v1.75: reusable performances

`public/js/reusable-performances.js` stores compact source definitions and role
bindings, evaluates existing solvers at a remapped time, and caches prepared
geometry between frames. It never bakes a performance into hundreds of keys.
`reusable-performances-ui.js` adds a collapsed contextual inspector, source-range
capture, role assignment, timing/hold edits, local remembering and portable packs.
See `public/docs/director-plan.md` for data limits, retargeting behavior and APIs.

Run `scripts/check-reusable-performances.cjs` with the standard native canvas
harness. Coverage includes exact source motion and hand joints, different cast
members, whole-clip time stretching, 30/60 FPS samples, save/apply/edit/remove/Undo,
role/scene duplication and deletion, atomic validation, partial-range custom paths,
scarf choreography, scaled casts, home placement, continuation, and library data.
This validates app logic and native rendering, not iPad Safari interaction.

## Conversation tools (v1.77)

The original felt character renderer is restored; turning controls and projections
have been removed. Older turning metadata is ignored. `conversation.js` evaluates acting
clips from saved dialogue and proposes a camera plan. `conversation-ui.js`
provides contextual controls in Acting. Camera planning uses the existing
Conversation shots review dialog and commits through the Director transaction.

Run `NODE_PATH=<runtime modules> node scripts/check-conversation.cjs` for the
original appearance/prop, dialogue, camera, reusable capture, Undo, continuation, prepared example,
and 30/60 FPS checks. `create-conversation-example.cjs [source.felt.json]`
rebuilds the prepared example from embedded speech; no synthesis is needed.

## Portable phrase stories

Open a self-contained `.felt.json` with File → Open story, then choose Present.
Stories with optional `phraseShow` settings use the manual phrase player:
Next or Space/Right advances once, Left goes back, Home restarts, and Escape
returns to the editor. Every short animation freezes until the next press.
Lyrics can be hidden. Song timing is optional; Manual remains the default.

Don Gato (30 phrases, including the cemetery and visual comedy) and No More Pie
(18 lines, each held through the leader and class echo) are separate story files.
Neither story, its artwork, nor its launch controls ship in the app.
Scenes, imported artwork, captions, poses and camera keys remain editable.

Offline authoring sources live in `art-source/don-gato/` and `story-source/`.
`python scripts/prepare-don-gato.py` refreshes the atlas metadata, and
`python scripts/create-don-gato.py` refreshes the offline source project.
`node scripts/export-portable-story.cjs INPUT OUTPUT` embeds its artwork.
`node scripts/create-no-more-pie.cjs OUTPUT` creates the second story file.
Use the runtime `NODE_PATH` for these canvas-dependent scripts.

`node scripts/check-phrase-story.cjs FILE EXPECTED_SCENE_COUNT [OUTPUT_DIR]`
checks actual file import, manual controls, indefinite holds, and every scene's
rendering without a story-specific runtime catalog. These are native-canvas
checks, not browser or iPad Safari QA.

## Song timing in Present

Present → Music & timing offers Manual, Record timing, and Follow music.
For an ordinary movie, Present → Song timing opens the same player. Import an
MP3 (or another browser-supported audio file), start recording, and press Next
or Space at each new lyric line. The first scene begins at song time zero.
Pause/resume keeps the audio position. Back undoes the last captured cue.
Finishing on the last scene trims the ending; otherwise the last scene holds
until the song ends. A take must include every scene before Follow or export.

Review / edit cue times accepts increasing seconds and an ending within the
track. Replacing the song or changing scene order invalidates the saved cues
without deleting them. Download story carries the audio and timing together.
Capture uses the AudioContext song clock; it does not accumulate scene timers.
Optional `phraseShow.timing` records the asset ID, scene IDs, starts, and end.

Export MP4 in Present (or Export → Export recorded song timing) creates a
1920×1080 song video at 60 or 30 fps, with optional large lyrics. The isolated
export snapshot uses absolute cue times rounded to frames, freezes each brief
scene action at its phrase hold, and mixes the same continuous song heard in
Present. Ordinary scene durations, audio cues, and exports remain unchanged.
The standard precise encoder, reusable sections, cancellation, and compatibility
capture are reused. Cache dependencies include the song-video render settings.

`NODE_PATH=<runtime modules> node scripts/check-phrase-timing.cjs` checks the
song clock, controls, import, edits, stale cue detection, saves, frame boundaries,
caption parity, continuous audio scheduling, and real MP4 muxing with codec
fixtures. Browser audio decoding and hardware encoding require browser QA.

## Optional audio normalization

Both MP4 export screens offer **Normalize audio**, off by default and saved with
the story as `exportNormalizeAudio`. A bounded-memory analysis pass measures the
complete selected range, then one linked stereo gain targets a −1 dBFS sample
peak. All scene, music, narration, and sound-effect levels retain their relative
balance; quiet passages stay quiet. Silence is left unchanged. This is peak
normalization, not LUFS loudness matching or true-peak limiting.

Normalized exports use the linear mixed soundtrack in place of the usual master
compressor; disabling the option preserves the existing processing. Source files
and Present playback are unchanged. Precise, reusable Precise sections, and
Compatibility export use the same measured gain. Audio is always analyzed and
mixed afresh, including when video sections are reused. Analysis supports cancel
and processes only two seconds at a time rather than retaining a full movie mix.

`NODE_PATH=<runtime modules> node scripts/check-export-normalization.cjs` checks
stereo peaks, range scope, dynamics, silence, cancellation, opt-out, saved settings,
actual mixer routing, encoder PCM, and Compatibility scheduling using codec and
Web Audio fixtures. Native browser rendering/encoding still needs browser QA.
