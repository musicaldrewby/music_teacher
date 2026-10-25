# Felt puppet atlases

Four original transparent PNG texture atlases created with built-in image_gen. Canonical raster files are in art-source/cinema/puppets. Each contains six isolated felt parts in a 3-column, 2-row grid, blank faces for runtime expressions, and no lettering or visible grid.

Manifest part rectangles are exact pixel source rectangles [x,y,width,height], measured from alpha >16 plus 3 pixels of breathing room. This excludes generated nearly invisible alpha dust in otherwise transparent gutters while preserving every visible cutout edge; raster files remain unedited. Each atlas is 1254 x 1254 despite requesting 1536 x 1536. Use the measured source rectangles, not assumed resolution.

Grid row 1: head, torso, leftArm. Grid row 2: rightArm, leftLeg, rightLeg. Arms and legs point down. Left/right are character anatomical labels as requested, not screen position.

Initial generations placed heads beyond equal cell bounds; a second image_gen layout-only pass corrected the layout. Final PNGs were copied without image modification. Prompts and manifest preserve both prompts.
