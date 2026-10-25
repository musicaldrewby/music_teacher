# Mr. Drew’s Arcade — Seaside Boardwalk

October 22, 2026: Added Mallet & Measure — Free Classroom Edition as the third featured cabinet, after Uke Strum and Boomwhacker Creator. Included in Create, Instruments, Teacher Tools, search, favorites and the generated directory. Uses the existing copper cabinet with a dedicated green SVG screen and a live free-edition label. Collection: 20 apps. Mirror: musicaldrewby/music_teacher. Destination and index access settings are preserved.

October 18, 2026: Added From Tips to Tours to Games, search, favorites and the plain directory. It is placed last in the arcade lineup and Games category. Its exclusive amber guitar-amplifier cabinet and pixel-art screen are included in the export manifest. The collection contains 19 apps. The game and arcade hosting audiences remain unchanged. The matching GitHub Pages mirror is musicaldrewby/music_teacher.

October 16, 2026: Removed Bingo Maker from the curated app collection, search, categories, and downloadable directory after making the app owner-private. The collection now contains 18 apps.

October 16, 2026: Removed Felt & Fable from the curated app collection, featured shelf, search, category listings, and downloadable directory. The collection now contains 19 apps. The Felt & Fable Site remains available to Drew as a creation tool; this change only removes its index listing.

The curated 16-app hub uses an immersive seaside pavilion and illustrated arcade cabinets, following Drew’s selected October 8, 2026 concept. The homepage keeps text to the brand, categories, app titles and compact controls. There is no build step or backend.

## Interaction

Uke Strum, Sneaky Cat and Boomwhacker are featured first. A cabinet is a direct external link to its GPT Site. Its information button opens details; its heart saves a favorite. Category plaques select Instruments, Rhythm, Games, Create or Teacher Tools. The All Apps category resets the shelf. The bottom shortcut row and shelf counter have been removed; the creator credit and Buy Me a Coffee footer remain. Desktop displays three cabinets; screens at or below 680px show one swipeable cabinet. Native horizontal scrolling and arrow buttons browse the rest.

Search and the collection dialog include all 16 apps. Favorites preserve the existing `drews-arcade-favorites` IDs and browser storage key. Motion follows reduced-motion settings, pauses in hidden tabs and has a manual pause. Sunlight, ocean highlights and cabinet glass animate gently. Pointer parallax is limited to fine pointers. Beach ambience waits for user interaction; no network fonts, tracking, runtime AI or connectors are used.

## Directory

`dist/apps.js` is authoritative. The 14 exact user-supplied GPT destinations plus Round Helper and the verified public Animated Vocal Explorations Site are included. Cover indices retain their original 4-column × 5-row atlas mapping. Other unselected apps remain omitted. No destination app audience was changed. The hub preserves its owner-private hosting audience.

App sharing availability is independent of the static directory. The verified links were copied exactly from the curated export; this redesign does not claim every destination is public.

## Artwork

`design/boardwalk/approved-concept.png` is the user’s selected image. `room-original.png` is a generated empty pavilion plate. `cabinets-original.png` is an alpha sprite sheet of three vintage cabinets. The built-in image generation tool derived them from the selected image. `dist/assets/boardwalk.webp` and `cabinets.webp` are format-compressed versions. The prior album atlas provides individual app screen illustrations. CSS positions the shell sprites; app titles, category controls and links are live accessible HTML.

The prior record-shop design remains in Git history and `design/record-shop/`.

## Export

Run `node scripts/package-download.mjs` to refresh the no-JavaScript directory, README and `dist/downloads/mr-drews-music-arcade-github.zip`. Its explicit manifest includes every runtime asset and both font licenses. Extract the ZIP into the existing GitHub Pages publishing folder, keeping `index.html` in the same place to preserve the existing URL. Keep unrelated files, CNAME and GitHub Pages settings.

The package contains the hub; the apps remain on GPT Sites.

## Validation

The October 8 redesign passed script syntax and a VM DOM harness exercising direct links, featured order, all category counts, desktop/phone paging, search and empty results, all details, favorites, blocked storage, nested dialog focus restoration, reduced motion and dialog fallback. Static checks verified every referenced local resource, IDs, exact destinations and ZIP byte consistency. This is logic validation, not browser layout verification. Managed browser QA was unavailable; live layout and touch behavior require visual review.

## Seven cabinet designs

Individual apps now retain a stable cabinet style across category changes. The tropical and moonlight designs appear on three apps each; the other five designs appear on two apps each. Every category mixes designs. The original featured trio is retained. Copper sunburst appears on Pocket Orff and Soundroom; seafoam streamliner on Interactive Xylophone and Name That Note; nautical on Four in a Row and Production Media Player; cherry carnival on Name That Tune and Bingo Maker.

The built-in image generator produced `design/boardwalk/cabinet-copper-original.png` and `cabinet-seafoam-original.png`, using `cabinets-original.png` as the style reference. The production WebP assets preserve their alpha channel. Each design has its own screen and marquee geometry; the existing two-line title fitting still applies. Generation briefs are in `design/boardwalk/new-cabinet-prompts.txt`.

Nautical and carnival originals are saved as `design/boardwalk/cabinet-nautical-original.png` and `cabinet-carnival-original.png`; matching production WebP files live in `dist/assets/`. These two built-in image generations use the original cabinet sheet as their style reference. Their complete prompts are in `design/boardwalk/nautical-carnival-prompts.txt`.

Animated Vocal Explorations is listed under Instruments with the existing pitch-path artwork (cover 6), a moonlight cabinet, and its verified public GPT Site URL. It is also included in search, All Apps, and the plain directory. The script URLs in index.html are versioned for this update so visitors request the new collection after GitHub publishing.

## Beach ambience

Drew supplied the beach-and-seagulls MP3. `scripts/make-beach-loop.py` takes source seconds 8–110, avoiding the recording's ending fade, then applies an eight-second equal-power circular overlap. The resulting 94-second stereo PCM WAV has no codec padding. The wrapped sample step matches the original adjacent samples; peak is -3.14 dBFS. The original upload is unchanged.

`dist/beach-audio.js` uses one looping HTML audio element, one MediaElementAudioSourceNode, and a master gain for mute/resume only. The compressed recording is downloaded to a Blob before playback, eliminating network buffering during normal transitions. Hidden pages and navigation pause the element and suspend the context; click, Enter, and Space unlock browser audio when required.

### Continuous day/night soundtrack

The previous implementation called `load()` and restored a saved playhead at every dusk and dawn. The October 13 update removes those repeated source changes, seeks, decoder starts, and 100-ms gain polling. `scripts/make-arcade-soundtrack.py` uses ffmpeg and numpy to prepare a single 192-kbps stereo recording with six 80-second cycles (eight minutes). The full five-minute Weightless Dawn progresses across the six nights. Source recordings remain unchanged for future edits.

Each cycle fades beach ambience to zero by 29.8 seconds, leaves silence before dusk at 30 seconds, then fades night music in following the painting's ten-second CSS curve. Night music fades to zero at 80 seconds, followed by a 0.9-second beach fade-in. The generator verifies that the source gain masks never overlap and checks peak headroom. Day/night fades are part of the media bytes, so steady playback needs no JavaScript timer, file switch, seek, or volume update. The master loops in silence at eight minutes.

Initial start, recovery, and resume align to the shared visual clock. The animation pause control now pauses the animated soundtrack too, preserving synchronization. Reduced motion plays the smaller beach-only loop. Mute remains independent, and downloads finish before playback. Visual fade layers and scoped parallax remain optimized; visitor timing still uses the shared CSS animation clock.

`node tests/continuous-audio.mjs` checks twelve cycles without extra downloads, source changes, seeks, or gain writes, plus mute, quick toggles, scene pause/resume, hidden pages, navigation, reduced motion, delayed loading, autoplay, and error retry. `node tests/day-night.mjs` checks visual timing. Browser listening and device performance could not be verified in this environment. Generate the complete manual GitHub ZIP with `node scripts/package-download.mjs`; its runtime assets use the two compressed soundtracks instead of the large originals.

## Orbit cabinet

Orbit — Polyrhythm Studio is included under Create and Rhythm, in the all-app directory, search and favorites. Its exclusive front-facing cyan/violet cabinet uses `dist/assets/cabinet-orbit-studio.png`, generated with the built-in image tool; the complete prompt is in `design/orbit/generation-brief.txt`. The native SVG screen graphic, title and link are independent overlays. Existing app destinations and cabinet assignments, including Music Stoplight, are preserved. The collection now has 18 apps and 17 cabinet designs. The refreshed GitHub ZIP includes both new assets. Orbit's existing private audience was preserved; its owner must make the destination public before public visitors can use it.

Validation: JavaScript syntax, all previous app records, unique IDs, both Orbit categories, the exact destination, and ZIP asset inclusion/byte consistency passed. The generated art was inspected; browser layout QA was unavailable in this session.

## Poison Rhythm

Poison Rhythm is available in Games and Rhythm, with its own front-facing purple-and-gold Musical Mastermind cabinet, green illumination, fitted floor shadow, live marquee, and original game portrait on the screen. The linked GPT Site is https://poison-rhythm.musicaldrewby.chatgpt.site. Its initial owner-private access is independent of this public directory. The existing 18 app records, featured trio, and cabinet assignments remain unchanged. The downloadable GitHub package contains both new WebP assets.

Validation: JavaScript syntax, preservation of prior records, uniqueness, local asset references, and ZIP byte consistency passed. Generated cabinet art inspected. Browser layout QA was unavailable.


## Auto Harp cabinet

Mr. Drew’s Auto Harp is included under Instruments, All Apps, search, favorites, and the plain directory. Its exclusive walnut, brass, cream, and forest-green cabinet was generated with the built-in image tool using existing Felt & Fable and Poison Rhythm cabinets as proportion/style references and the actual sunlit autoharp photograph as the screen reference. The final prompt is in `design/autoharp/generation-brief.txt`. The production image is `dist/assets/cabinet-autoharp.webp`; the original instrument photo, compressed for the web, is `dist/assets/autoharp-screen.webp`.

The cabinet uses the existing shared size, frontal view, floor shadow system, direct app link, information button, and favorite button. The original featured trio and all previous app records and cabinet assignments remain unchanged. The title and screen are included in the finished cabinet art, matching the Music Stoplight integration pattern. The GitHub download includes both assets. The directory now has 20 apps and 19 cabinet designs.

Validation: script syntax, prior record preservation, unique IDs, the exact Auto Harp destination, Instruments category, artwork dimensions/transparency, resource inclusion, and ZIP byte consistency checked. The artwork was inspected; browser layout QA was unavailable.
