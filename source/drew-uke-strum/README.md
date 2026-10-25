# Mr. Drew’s Uke Strum

A buildless classroom ukulele app for soprano/concert G–C–E–A tuning. Static assets live in `dist/`; there are no third-party runtime scripts or external audio services. A locally hosted, approximately 3.1 MB sample bank supplies the ukulele and backing instruments.

## Beach studio interface

The opening **Play** screen shows the current song, a direct performance button, tempo controls, and an illustrated song collection. Filter starter/saved songs, search titles, or show only one-chord arrangements. **Create** holds the arrangement editor and contextual measure tools. **Teach** groups guided lessons, chord challenges, and class setlists. New Song stays visible in the header and opens Create after successful setup.

Band, Stage, and More options open only when requested. Original controls, draft keys, saved songs, and audio timing remain connected to the same app state. Sixteen locally bundled illustrations in a saturated cartoon paper-collage style illustrate the fourteen starter songs, custom songs, and three classroom stages. Decorative slogans and the draft-status footer are removed; Help and starter-song details live under More options. The previously removed ukulele/hand animation is not included.

The On Deck panel, next-chord panel, and band arrangement card have slow decorative wave lines. Full-screen stages have a very slight background drift; all labels, chord diagrams, and controls stay anchored. **More options → Background motion** pauses the decoration and remembers that preference in this browser. The device’s reduced-motion preference also turns it off. The fourteen song pictures and all Sunny Beach, Sunset Stage, and Moonlight Lagoon scenes use the same collage artwork in the main app, projector, and portable players.

At the finish, “One final strum” fades away, followed by a larger ocean-gradient “Well played!” with a gentle wave motion and a dark shadow. A **Back to Main Menu** button fades in after the entrance and keeps the current song selected. Looping skips the extra ending measure and the finish screen. Motion preferences apply throughout.

A full-screen welcome splash opens on each normal launch: a custom ukulele, sunshine, and ocean-wave paper-collage emblem, the Uke Strum wordmark, and a **Let’s Play** button. The entry fades into Play without starting audio or replacing the current draft. Credit and optional support are confined to this splash: “Created by Drew Wichman” and “If you enjoy this free software, consider buying me a coffee or making a donation.” The yellow **Buy me a coffee** link opens `https://www.buymeacoffee.com/musicaldrewby` in a new tab, using no third-party script. **More options → About Uke Strum** reopens it. Escape also enters the app, and reduced motion removes the transition. The native modal provides keyboard focus containment. Projector windows and shared/portable song previews skip the splash. The new emblem is also used in the header and embedded with the other sixteen illustrations in portable players. See `splash-artwork.json` for the image-generation prompt and asset path.

## Classroom tools

- Guided **Teach this song** flow: chord shapes, changes, strumming, and performance. Practice scores are temporary and restore the original draft on exit.
- **Chord challenge** with selectable chords, 8/4/2 beats per chord, a slower tempo, and three teacher-awarded class stars. It does not use microphone scoring.
- Clear chord diagrams, beat indicators, and synchronized down/up/chuck strumming arrows.
- Independent sampled ukulele, acoustic bass, percussion, shaker, and mallet/bell levels. Mallet parts follow chord tones; students supply the song melody.
- **Sunny Beach**, **Sunset Stage**, and **Moonlight Lagoon** classroom stages, with final-strum and cutoff cues.
- Named song sections, duplicate/reorder controls, and passage rehearsal with optional looping. Four-beat count-ins remain in place for 2/4 songs, including passages and challenges.
- Browser-local class setlists with arrangement snapshots, ordering, next-song controls, and JSON import/export.
- A separate silent projector window synchronized through a randomly scoped BroadcastChannel. Audio remains in the teacher window; keep that window open.
- Encoded song-preview links with an explicit editable-copy action. Links respect the Site’s existing audience. A downloadable self-contained HTML player can be shared independently of Site access.

All fourteen starter arrangements include an extra **Ending** measure after the final sung phrase. It uses the last played chord, with one down-strum and one bass root together on beat 1, then no further attacks or metronome. Percussion, shaker, and mallets rest. Band-off and bass-mute settings remain respected. The stage shows one down arrow, then “Let it ring…” before the cutoff. Looping skips trailing ending measures and returns directly to the first musical measure. Turning either loop control off during playback completes the current pass and plays the ending once, preserving the current beat and avoiding another count-in. A repeat already queued in the short audio lookahead is replaced on the same downbeat. Pause/resume and explicit passage rehearsal remain supported. Ending flags survive saved songs, setlists, share links, and portable exports. Existing unmodified starter scores gain the ending once; edited music is preserved, and deleting the added bar remains respected.

The prominent New Song flow, 12 original strums, fourteen editable elementary starter arrangements, lyric cues, standard chord diagrams, MIDI output, and print/export tools are retained. London Bridge starts at 80 BPM with a four-beat intro. In 6/8, the display uses numeric counts 1–2–3 | 4–5–6, and its six-count intro clicks on each number with accents on 1 and 4. Tempo still uses dotted-quarter beats; existing song timing is preserved.

## Additional classroom songs

- One chord (C): Apple Tree; Lucy Locket.
- Two chords (C, G7): The More We Get Together; The Farmer in the Dell; Itsy Bitsy Spider.
- Three chords (C, F, G7): BINGO; She’ll Be Coming ’Round the Mountain.

Each has its opening verse/refrain, editable phrase cues, a matching collage illustration, and a comfortable starting tempo. Descriptions explain vocal pickups where needed; the next-line preview is visible during the count-in. The app supplies accompaniment, not a recorded melody. All artwork is bundled into portable players, including saved or renamed starter copies.

The starter collection excludes Old MacDonald Had a Farm, Mary Had a Little Lamb, and Row, Row, Row Your Boat following the teacher’s repertoire review. Are You Sleeping? is the default. Existing unnamed drafts of removed starters are archived locally and replaced with that default on startup; explicitly saved teacher arrangements remain user-owned content.

## Sampled ukulele and song bands

Selected sounds from the teacher-provided **GeneralUser GS 1.471** by **S. Christian Collins** are rendered through FluidSynth into 130 compact mono MP3 note samples. The ukulele includes three velocity layers and uses the SoundFont's bank 8/program 24 patch. Its source is a guitar-derived sample; this is not a new multi-sampled acoustic ukulele recording. No full SoundFont or synthesizer dependency is shipped. Original license text and source SHA-256 are retained with the bank.

Each of the fourteen starter songs has an original accompaniment profile: morning bells, raindrops, bakery bounce, bridge march, playground folk, starlight bells, orchard pulse, pocket-size band, circle waltz, barn dance, rain to sunshine, clap-along band, mountain folk, and sing & clap. Bass, percussion, and mallet events follow the actual editable chords and meter. Final measures thin out, and loops retain the groove. The 2/4 four-beat intro and numeric 6/8 count-in are unchanged.

**Band** has a song arrangement selector, Simple/Gentle/Folk alternatives, five volume sliders, and Song/Gentle/Full mixes. Turning the band off leaves ukulele only. New starter loads enable their recommended band; existing saved on/off and volume choices are preserved. Renamed copies keep their arrangement through the source reference; changing meter chooses a compatible generic accompaniment.

The sample bank loads and decodes once after an audio gesture, before the count-in is scheduled. A failed load leaves basic synthesized playback, with an explicit status and Retry control in Band. MP3 encoder latency is calibrated with an impulse and removed at playback. Down/up strums follow physical high-G string order, retriggers damp each previous string, and a small room tail shares the stop/pause gate. Portable HTML exports embed the entire sample bank, its license, scripts, and artwork for offline playback.

Classroom text cannot be accidentally selected by taps or drags; inputs, lyric textareas, and other editable fields retain normal text selection. The chord challenge and strum lesson reserve separate fixed spaces for the chord, diagram, and prompts. The stage also reserves space for chord labels, lyrics, and countdowns, so text changes do not resize the diagram's column. Long chord names use smaller text; narrow displays place the challenge prompt in a separate row.

## Files and storage

- `dist/index.html`: editor, stage, dialogs, and original beach styles.
- `dist/app.js`: original editor and audio primitives.
- `dist/arrangements.js`: fourteen song profiles and meter-aware accompaniment events.
- `dist/soundfont.js`: local sample loading, string damping, room sound, and mixer buses.
- `dist/assets/audio/`: compact sample bank and the original SoundFont license.
- `scripts/render-soundbank.cjs`: reproducible offline rendering from the original SF2 (requires `js-synthesizer@1.13.0` and ffmpeg).
- `dist/classroom.js`: classroom tools, shared transport extensions, accompaniment, projector, and sharing.
- `dist/classroom.css`: classroom UI, three stage themes, responsive/reduced-motion rules.
- `dist/beach.js` and `dist/beach.css`: workspace navigation, illustrated song collection, collage artwork/scenery, and the beach studio design.
- `dist/boot.js`: draft restoration and initialization.
- `dist/assets/collage/`: sixteen optimized WebP illustrations, embedded as data URLs in portable player downloads.
- `artwork-prompts.json`: exact prompts and built-in image-generation provenance.

Song schema version 3 adds `theme`, `band` (including optional `style`), and `measures[].sectionStart` while accepting existing version 2/legacy imports. Existing browser draft and named-song keys are retained. Setlists use `uke-strum-setlists-v1`. No student accounts, names, microphone recordings, or cloud song storage are introduced. Export files to back up browser-local work.

## Verification

Run `node checks/classroom.cjs` for deterministic data and AudioContext-clock behavior checks. These use DOM/audio doubles and do not claim real browser layout, hardware sound, popup permissions, or multi-display testing. The portable player is additionally parsed and its embedded scripts syntax-checked before publication.

`checks/render-audio.cjs` decodes all 130 MP3s and renders all fourteen complete arrangements through an actual OfflineAudioContext (`node-web-audio-api@1.0.7`), checking finite audio, headroom, and silence after cutoff. Its report is `checks/audio-results.json`. These checks do not substitute for listening on classroom speakers. The managed browser tool was unavailable, so responsive layout and touch behavior were reviewed in source but not tested in a live browser.

## Epo e Tai

The fourteenth starter uses the classroom score supplied by Drew: F major (melody C4–A4), 4/4 at 80 BPM, eight sung measures of F–F–F–F–F–F–C7–F, then one F down-strum plus an F bass note in a ninth ending measure (skipped during loops). The F/C7 accompaniment deliberately simplifies the fuller B♭/Dm harmony. The first phrase includes the “o” pickup on beat 4 of measure 2. A four-beat count-in and original gentle clap/bass/marimba backing are included.

**About this song** appears on its On Deck panel. The note also appears under More options → About the starter songs. It credits Kīngi Tāhiwi’s *He Pūru Taitama* and identifies the supplied classroom syllables as an adaptation, without presenting a false Māori translation. Background references (checked 2026-10-08): [Ōtaki Museum](https://otakimuseum.blogspot.com/2009/11/he-waiata-song.html), [Te Ara](https://teara.govt.nz/en/music/44807/kingi-tahiwi), and [Aotearoa Songbook](https://www.aotearoasongbook.com/songbook-volume-1/he-puru-taitama). No source recordings or sheet-music artwork are bundled.

## Whole-phrase lyric follow

Itsy Bitsy Spider shows complete four-measure sentences beginning at measures 1, 5, 9, and 13, without changing its chords, 6/8 pulse, or tempo. Original two-measure lyric cues in saved copies migrate only if all sixteen sung measures retain the original lyric text, offsets, and spans; teacher-edited text stays unchanged. The migration preserves titles, IDs, tempo, chord edits, and section names.

All songs use a fixed lyric panel with two equally sized phrases: current lyrics in yellow and upcoming lyrics in the normal cream text color. Both phrases crawl upward continuously over the duration of the current cue, driven by the audio clock. At the cue boundary, the upcoming phrase becomes active at the same physical position and the following phrase appears below. There is no highlight box, small preview, quick slide, or manual scrollbar. Both phrases remain inside the panel throughout the crawl. Text wraps and uses a shared fitted font size. Pause freezes the crawl in place; resume continues from that phase. Seeking, count-ins, and finishing reset the display. Background motion off or the device reduced-motion setting keeps both lines stationary while retaining cue timing. Teacher, projector, and portable player views use the same code. Loops preview the first sung phrase instead of the skipped ending.


“She’ll Be Coming ’Round the Mountain” uses eight sung measures plus the single-strum ending, at the original 84 BPM and Basic Down pattern. Each displayed lyric segment lasts one measure instead of two; chord changes follow the shorter phrases, including C to G7 on beat 3 of measure 7. The four-beat intro stays the same, with “She’ll be” sung on “4 &.” Existing untouched sixteen-measure starter copies migrate on load while retaining tempo, strum pattern, mixer, saved identity, and compatible section labels. Teacher-edited music is preserved.
