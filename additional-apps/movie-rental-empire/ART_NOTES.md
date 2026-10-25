# Movie Rental Empire cover atlas

Final asset: `dist/assets/movie-atlas.png`
Dimensions: 1122 × 1402 pixels; PNG; 3,509,310 bytes.
Source: built-in image_gen, with one targeted edit. No programmatic image alterations.

## Integration

The intended 6-column × 5-row layout is present, with all 30 subjects in the requested row-major order. The generated grid has slight height variation, especially the fourth/fifth row boundary. To avoid neighboring artwork bleeding into covers, use individual source rectangles with a 2–3 px inset and CSS `background-image` or `object-position` clipping. Suggested observed boundaries:

- x: [0, 189, 376, 562, 749, 935, 1122]
- y: [0, 281, 559, 842, 1101, 1402]

For a cover viewport of width `cw` and height `ch`, use an inner canvas or CSS background scaled so the selected source rectangle covers the viewport; the result should crop a tiny amount rather than stretch neighboring art. The atlas itself remains unmodified.

## Quality inspection

All thirty paintings have distinct recognizable subjects and vibrant VHS-poster palettes. No cover titles are baked in. Subjects are appropriate to a humorous movie-rental game. The initial astronaut plumber was too similar to a familiar game character; the final version replaces that character with an original silver-haired female astronaut plumber in a teal-accented silver suit. Small illustrated incidental motifs appear on some props; game typography should be drawn separately. The atlas is intended for thumbnail-to-medium cover display.

## Final prompt set

Initial generation: one edge-to-edge atlas, six equal columns and five equal rows, each tile portrait 2:3, total aspect 4:5, professional vibrant hand-painted humorous 1980s/1990s VHS B-movie art, no typography, original characters, exact row-major scenes: lawnmower action hero explosion; sheepish mummy and annoyed waitress; fog-emitting stepdad; monstrous leftovers refrigerator; romantic ghosts apartment; three stacked raccoons presidential podium; space accountant calculator moon; Elizabethan theatrical sheep; ninja crossing guard; haunted laundromat; disco dinosaur; alien pizza delivery; romantic pirate librarian; giant hamster city; grandma motorcycle adventure; cowboy dentist; underwater lobster detective; heroic vacuum robot; spooky pumpkin bowling; penguin courtroom; wizard barbecue; spy pigeon; comet diner romance; cursed waffle iron; astronaut plumber; monster prom; samurai snowman; cat astronaut rescue; haunted family minivan; gardener hedge-maze action sequel.

Targeted edit: preserve every other painting and its order, replace bottom-left character with original dark-skinned female astronaut plumber with short silver hair, clear helmet and silver/teal spacesuit, no red cap or moustache, repair space-station pipes with wrench; request exact regular grid boundaries at 1/6 width and 1/5 height increments. The character correction succeeded; slight grid variation remains and is documented above.
