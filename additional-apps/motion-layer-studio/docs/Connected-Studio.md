# Connected Motion Layer Studio

The original image animation editor is preserved in `public/studio.html`. Its renderer, effects, original project downloads and exports remain available. `public/studio-bridge.js` adds My studio, named masks, weather presets, placement guides, and assistant actions.

My studio saves account-scoped projects in R2 with D1 metadata and immutable revision history. Autosave starts after the first explicit cloud save; conflicts never overwrite a newer saved version. Open an earlier revision and save to create a new current revision. Imports and the built-in haunted house example start as separate, unsaved scenes.

The Site exposes `/mcp`. Sites owns OAuth; private data calls require the authenticated user ID supplied by Sites. Cloud records, commands, staged images and outputs are scoped to that ID. MCP initialization and discovery return no private data. The Site audience is unchanged.

In ChatGPT, install/connect the Site's personal plugin. In an open studio tab, choose My studio and enable Allow assistant editing. This grants that tab a short-lived presence; reloading disables it. `studio_status` exposes the actual open sessions. Every mutation and render specifies the session and expected scene revision. Requests are idempotent by request ID. Queued does not mean completed: poll `command_status`. `get_render` returns PNG content for visual review and a download link for video.

Edit operations support background/sticker assets, layer creation and settings, order/removal, scene duration/name, named polygon or painted-mask regions, weather presets, cloud saves and opens. Batches validate before applying, use the existing Undo history, and restore the previous scene on resource failure. Locked layers and stale revisions are rejected. Named masks are manual, reusable selections; there is no claim of automatic semantic segmentation.

Render jobs use the editor's existing GPU renderer and H.264/MP4 writer. They require an open, visible browser tab with WebCodecs H.264 support. There is no server GPU or closed-tab renderer. PNG and MP4 outputs are saved to the signed-in account and appear under Recent renders. Cancellation, encoder failures, interrupted connections and timeouts produce explicit job states. Existing manual Export remains available for other formats. Current cloud limits: 25 MB projects, 20 MB staged images, 80 MB output uploads; managed MP4 rendering stops before 75 MB. Video duration is 2–30 seconds at 24/30 fps, up to 1920 px wide.

Verification:

```sh
node tests/check-studio-server.mjs
node tests/check-studio-edits.cjs
node tests/check-ui.cjs
node tests/check-frost-ui.cjs
node node_modules/typescript/bin/tsc --noEmit
```

Server checks exercise real SQLite migration SQL, account isolation, origin checks, optimistic versions, command claims, idempotency, cancellation and private image retrieval. Editing checks run the actual app validators and batch functions with substituted GPU resources. They cover rejection without mutation, stale/locked edits, resource rollback, named-region bounds, and weather replacement that preserves unrelated layers. They do not replace live-browser GPU, placement or WebMCP testing. No supported managed browser QA capability was available during this update.
