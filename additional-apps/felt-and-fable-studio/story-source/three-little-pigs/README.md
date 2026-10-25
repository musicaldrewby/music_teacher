# The Three Little Pigs

An original classroom-friendly retelling for Drew's private Felt & Fable studio.

Open **The Three Little Pigs** on the welcome screen, or use **File → Open The Three Little Pigs**. **Sound → Play whole story** plays the complete saved narration and effects. **Present** offers manual read-aloud pages. **Export** renders the editable movie to MP4. The story opens through the studio's normal atomic import, artwork preparation, recovery, and Undo flow.

The production has 76 editable beats with 75 saved Fable narration clips. A beat usually contains one or two sentences; short fragments stay together when they form one action. Dialogue refrains and comic pauses retain room to breathe. The complete timeline is approximately 8 minutes 46 seconds.

`beats.json` retains the words and action identifiers. `shot-list.json` contains final timings. `public/examples/three-little-pigs.felt.json` is self-contained, including its artwork, recorded narration, and original water-splash sound. The story does not depend on a voice model download during playback.

## Rebuilding

From the repository root:

```sh
node scripts/voice-three-pigs.mjs
node scripts/create-three-pigs.cjs
node --expose-gc scripts/check-three-pigs.cjs
```

Speech uses the app's shipped Kokoro/Fable engine with speed 0.97. Identical clips are cached by text and voice settings. The authoring and review scripts use the existing native canvas harness. The review renders every scene with the actual movie renderer, checks timing and scene bounds, exercises example opening, saved-project validation, manual advancement, and Undo.

## Animation scope

This version uses complete three-quarter cutout poses and restrained whole-piece movement. There are authored reaching, sleeping, puffing, sitting, wet-wolf, tub-pushing, and spoon-holding drawings. The connected tub and supper illustrations keep hands attached to their props. House panels separate during collapse; the brick house holds its shape. The chimney, hearth mask, and hinged doorway are staged independently.

This is not a completed skeletal IK system or an anatomically validated alternating walk. The generated second walking step repeated the leading leg and was excluded. A subsequent generation was blocked, so travel uses the approved standing and step drawings. The broader IK, foot-locking, and motion-library review discussed with Drew remains separate work.

## Artwork provenance

Built-in image generation produced the felt backgrounds, cast, props, and connected action drawings. No external copyrighted character designs were used. Crop and registration scripts only prepare the generated artwork for animation. `art/manifest.json` records exact dimensions, source crop bounds, foot registration, staging guides, and limitations.

All final project-bound assets are saved under `story-source/three-little-pigs/art/`. The exact prompt set and original outputs are in `art/source/`, including `prompts.json`, `prompts-actions.json`, and the group-contact prompts. The useful images are embedded as compressed WebP in the editable story; rejected source images are never loaded by the app.

Background originals are 1672 × 941; framing uses wide and medium views with moderate closeups. Browser interaction QA was unavailable in this environment; verification uses the shipped canvas renderer and DOM harness.
