# In a Dark, Dark Wood

An editable Felt & Fable echo chant based on Drew’s attached chant image.
There are seven phrase scenes and one ready screen. The exact dynamic sequence
is **ppp → pp → p → mp → mf → f → ff**. Teacher chants first; students repeat
at the same volume. Next / Space / Right Arrow advances only after the echo.
Back / Left Arrow and Restart / Home remain available. All scenes hold
indefinitely in Manual mode, including the suspense cue before GHOST.

Open from the welcome screen or File menu under “In a Dark, Dark Wood”, or
use `?example=dark-dark-wood`. The story opens in Manual even with saved music
timing. Download story saves all embedded art, editable pieces and timings.

## Scenes

1. Moonlit woods and a dark cottage — ppp.
2. A dark room inside the cottage — pp.
3. A closer view of the wall-mounted closet — p.
4. Inside the closet, an empty shelf — mp.
5. A closed dark box on the shelf — mf.
6. Closer on the closed box; a small lid tremble — f.
7. The lid flies aside and the felt ghost appears — ff.

The exact chant wording is stored in the builder’s `captions` array. No
recording, automatic speech, microphone, or timed advances are needed.

## Artwork and editing

The current edition uses a basic handmade felt board with flat cutout shapes,
visible fabric texture, and a restrained navy, purple, green and yellow palette.
The approved woods preview and matching room, closet, box, lid and ghost are in
`art-basic/`; corresponding WebP copies are embedded in the story JSON. The ghost
has dark eyes and an open “ooo” mouth: mildly spooky and suitable for little kids.
Camera pushes, the lid tremble, ghost reveal and sway, titles, dynamics cards,
volume bars and prop motion remain native editable pieces.
All images are contained in the downloaded story; no remote media is required.
The current generation brief is preserved in `artwork-prompts-basic.json`.
The previous artwork and brief remain in `art/` and `artwork-prompts.json`.

Rebuild with `node scripts/create-dark-dark-wood.cjs`.
Validate with:
`node scripts/check-phrase-story.cjs public/examples/dark-dark-wood.felt.json 8`.

The new optional `phraseShow.manualInstruction` displays a short classroom
instruction in the phrase player; other stories retain their existing wording.
