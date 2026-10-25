# Skin and Bones

An editable Felt & Fable classroom story: one ready screen and fourteen song cues.
Six lyric verses each have a separate **Ooh-ooh-ooh-ooh!** response. The seventh
verse opens the closet and holds before the separate **BOO!** cue. Students sing
live and press the large Next button, Space, or Right Arrow. Left Arrow goes back;
Home restarts. No scene advances automatically in Manual mode. This story opens
in Manual even after a music timing take has been saved.

Open from the welcome screen, File menu, or `?example=skin-and-bones`.
The normal Download story and Classroom export controls remain available.

Rebuild the embedded story with:

```sh
node scripts/create-skin-and-bones.cjs
node scripts/check-skin-and-bones.cjs
node scripts/check-phrase-story.cjs public/examples/skin-and-bones.felt.json 15
```

The standard traditional seven-verse classroom lyric was checked against
https://www.bethsnotesplus.com/2018/10/skin-and-bones.html . No arrangement,
recording, notation, or artwork from that source is included. New staging uses
native editable text, motion keys, shapes, and the studio's existing ghost,
broom, and opening-door assets. The word OOH always reads left-to-right even
when its flight travels right-to-left.

## Artwork brief and provenance

The built-in image generation tool produced the PNG masters in `art/`. WebP
copies are encoded for the editable story with alpha preserved. All assets used
by this story are embedded in its JSON; the new story has no external media
dependencies. PNG masters remain unchanged.

- **woman.png**: a complete gaunt, slightly scary old woman with an angular face,
  wispy gray bun, round glasses, long fingers, plum wool shawl, charcoal teal
  dress, brown boots, and a low glowing brass lantern. Three-quarter view facing
  right, richly tactile handcrafted needle-felt style, transparent background.
- **reach.png**: reference-based pose edit, same identity and clothes, free hand
  extended right, other hand holding the same lantern. Transparent background.
- **lowreach.png**: reference-based pose edit, free hand diagonally down and right
  at waist height, eyes looking toward her hand. Used at the closet handle.
- **startle.png**: reference-based pose edit, recoiling left, eyes and mouth open,
  free hand raised beside her face, lantern retained. Transparent background.
- **exterior.png**: full-bleed 16:9 wool felt night set, crooked warm-windowed
  cottage on the left, winding foreground path, graveyard on the right, moon,
  bare framing trees, muted purple heather. No people, bones, or text.
- **interior.png**: full-bleed 16:9 wool felt cottage, dark teal stitched walls,
  brown floor, moonlit window and candle table left, open floor and wall on the
  right for the animated broom closet. No people, cupboard, or text baked in.

The art direction retains the studio's existing detailed felt look. The woman
is unsettling; the response text keeps the classroom surprise theatrical.
Edition 4 also replaces the smiling stock ghost with an eerie apparition. Motion, art, captions, and timings can all be edited in the studio.

## Edition 2: a journey through the graveyard

The first lyric now introduces the woman walking among the headstones. The
cottage lyric cuts back to the wide exterior, and the next lyric uses a closer
cottage-path composition as she leaves. The graveyard walk crosses most of the
new set; the bones receive a closer view. Each response retains its preceding
location. The original fourteen independent song cues and all Manual controls
are unchanged.

The interior set is framed 18% closer, with its top aligned to the stage top.
This places the wall's skirting at y=707, immediately behind the existing closet
threshold, so the doorway is flush with the wall in the closed, opening, and
BOO scenes. The woman's hand still reaches the same handle.

**New asset:** `art/graveyard.png` (master) and `art/graveyard.webp` (embedded
copy). Generated with the built-in image-generation tool, using `exterior.png`
as a style reference. The final prompt was:

> Use case: illustration-story. Asset type: full-bleed 16:9 animation stage background for Felt & Fable. Use the reference solely for the exact rich handmade wool-felt miniature style, moonlit blue-purple palette, tactile fibrous ground, moss and crooked headstones. Create a DIFFERENT camera position INSIDE this graveyard, among the headstones. No cottage and no iron fence across the scene. A winding pale dirt path runs across the lower third from left foreground toward middle right. Distinct large weathered rounded and crooked headstones stand at left and right, with smaller graves receding into blue mist in the middle distance. One gnarled bare tree left, distant dark cypress silhouettes, moon at upper right. Important stage composition: leave a clear continuous open walking strip from x=15% to x=82% at y=68–82% of frame, so a separately animated old woman can stroll across it. Larger gravestones behind this strip, not across her feet. Atmospheric, slightly scary, richly detailed needle-felt stop-motion storybook set. No characters, no ghosts, no bones, no writing, no labels, no lettering, no watermark. Preserve reference aesthetic, not its composition.

## Edition 3: fireside opening and growing suspense

The title and first lyric now begin **inside** the cottage. She rocks beside the
fire, turns toward the audience, and shivers while her shadow stretches across
the wall. The exterior establishing scene contains no woman: she stays indoors
until the following departure. Her front door opens and she raises her lantern,
then comes down the path toward the viewer. Only then do we enter the graveyard.

The graveyard adds a separate moving foreground branch, drifting mist, and a
brief silhouette peeking from behind a separate headstone. In the next lyric
her raised lantern reveals three bones; one rolls away and she freezes. She
returns home during the fifth response. The closet remains mounted at the wall,
opens onto darkness, and holds indefinitely before the separate BOO press.

All six OOH responses remain native editable text with distinct motion:

1. Rise and curl above the fireside chair.
2. Drift through the sky above the cottage and distant graves.
3. Grow out of the lantern's light and float upward.
4. Peek from behind the headstone before flying across the scene.
5. Rise from the graveyard path while she tiptoes home.
6. Emerge above the closet and fade away before its door opens.

Player directions invite the class to shiver, point, tiptoe, and freeze. All
fifteen screens retain manual advancement, six independently cued responses,
and a separate door/suspense and BOO cue. No audio recording is added; the class
sings live. The poses, letter paths, lights, shadow, bones, and scenic layers
remain editable and embedded in the downloadable project.

### Added artwork and prompts

All additions were made with the built-in image-generation tool. PNG masters
and alpha-preserving WebP copies are in `art/`; none depend on external URLs.

- `hearth.png`: new 16:9 corner of the same dark-teal felt cottage, stone fireplace
  on the left, warm fire and logs, small candle and moonlit window; clear wall
  and wooden floor on the right for a separate seated character. No baked-in
  character, chair, lantern, or text. Reference: `interior.png`.
- `seated.png`: same gaunt woman, plum shawl, teal dress, glasses, bun, and boots,
  seated in a full dark wooden rocking chair facing left, hands in lap; her brass
  lantern on the floor to the right. Full isolated 2:3 transparent sprite.
  Reference: `woman.png`.
- `turned.png`: edit only the seated woman's head and eyes toward the viewer,
  preserving the chair, body, lantern, proportions and placement. Transparent.
  Reference: `seated.png`.
- `lift.png`: same standing woman raises her brass lantern to chest height,
  peering cautiously ahead, free hand near chest; preserve identity and clothing.
  Full-body 2:3 transparent sprite. Reference: `woman.png`.
- `branch.png`: separate dark wool-felt gnarled trunk and bare twigs entering
  from the left, a few withered reddish leaves, transparent surroundings and
  clear center/right. Reference: `graveyard.png`.
- `stone.png`: one rounded crooked gray-brown felt headstone with moss at its
  edges and base, no inscription, slightly turned frontal view, isolated on a
  transparent 2:3 canvas. Reference: `graveyard.png`.
- `exterior-open.png`: localized edit of `exterior.png`, opening only the cottage
  front door inward onto a dim amber interior. Preserve the architecture,
  framing, ground, trees, graves, sky, and lighting. No added character or text.

Verification uses the actual app import/player and its native canvas renderer.
The narrative, intermediate poses, all refrain paths, branch edges, porch scale,
closet suspense, and final scare were visually reviewed. Browser QA remains
unavailable because the managed browser blocked preview access.


## Edition 4: eerie closet apparition

Replaced this story's smiling, rosy-cheeked stock ghost with `art/ghost.png` and
its embedded `art/ghost.webp` copy. The new ghost has a narrow wailing face, deep
shadowed eyes, reaching arms, and ragged ivory-gray felt wisps. It looms forward
from the closet and settles into a restrained slow hover. Its 2:3 proportions
are preserved throughout the entrance. Every manual cue and the BOO suspense
separation are unchanged; the stock catalog ghost is unchanged.

Generated with the built-in image-generation tool, using `woman.png` only as a
material/style reference. Prompt: create a genuinely eerie old closet
apparition of weathered ivory and cool gray needle-felt wool, hollow charcoal
eyes, a long narrow face and open oval wailing mouth, absolutely no smile,
blush or happy expression. Give it asymmetrical reaching sleeve-like arms and
a long frayed body tapering into floating wisps. No blood, wounds, teeth, gore,
skeleton, scenery, text or surrounding fog. Full isolated character, softly
lit fibers, portrait 2:3 composition and genuine transparent background.
