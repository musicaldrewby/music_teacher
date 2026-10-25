# Mallet & Measure — Free Classroom Edition

Independent classroom sampler of Drew Wichman’s Orff Ensemble Studio.

- Eight instruments: bass, alto and soprano xylophones; soprano glockenspiel; soprano recorder; five hand drums on one track; wood block; triangle.
- Five tracks, a four-measure loop, recording, editing and mixing.
- Free WAV export: one mixed pass of the current loop, 44.1 kHz/16-bit stereo, with levels, pan, mute/solo and natural effect tails. Prepare, preview and download from Export WAV.
- Editable `.orff` project downloads and browser autosave. Free projects use the full studio’s file format.
- Dedicated first-visit welcome and full-version comparison; dismissal is remembered per browser.

The free app excludes the paid instrument catalog, Song Builder, notation and printing, MP3/video exports, MIDI, MusicXML, and paid teaching resources. The full studio has its own repository, Site and browser storage.

The Teachers Pay Teachers button in `dist/index.html` currently uses a product search for “Mallet & Measure”. Replace this with the exact product listing URL when supplied.

Serve `dist/` as static files. Run `npm test` for edition, asset and dependency checks. An optional cross-edition compatibility test runs when a sibling `mallet-measure-source` checkout is present.
