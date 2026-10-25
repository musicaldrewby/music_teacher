# Teacher Studio premium edition

This is a separate private edition of Mr. Drew’s Uke Strum. The public/free Site is unchanged. This edition has no TPT purchase verification or license redemption integration yet; owner-private Site access protects the unpublished commercial offering while it is reviewed.

## Pro download and manual

The Pro splash retains **Created by Drew Wichman** and has no donation button. More options → How to use provides Pro-specific help, plus open/download links to the ten-page `dist/help/Teacher-Studio-Manual.pdf`. The manual covers arranging, note entry, lyrics, swing, stage/band controls, classroom tools, backups, both PDF exports, all transitions, video export, and troubleshooting.

`python scripts/build-manual.py` regenerates the manual with local fonts and the example engraving in `docs/manual-figures/`. Pages were rendered with Poppler and visually reviewed. `node scripts/build-pro-download.cjs <absolute-output-directory>` builds a self-contained `Open-Uke-Strum-Pro.html`, a `help` folder with the manual, start instructions, and bundled third-party notices. The downloadable app embeds source, artwork, instruments, fonts, and the video module; local fetches resolve to those embedded bytes. The hosted edition keeps normal asset loading. Keep the help folder beside the HTML. Named songs stay in browser-local storage and should be backed up as JSON before moving or replacing the downloaded HTML.

`node checks/pro-download.cjs <absolute-output-directory>` runs the exact download through DOM/audio doubles and native Canvas: all Pro controls initialize, melody entry works, all 130 samples and 19 artwork resources resolve, bundled fonts/module bytes match the source, the MP4 module imports, and Help points to the included PDF. This is not a live-browser or browser-encoder test. Separate student-display windows may be restricted under file URLs; use Classroom view in the main window when needed. Fast video export still depends on browser H.264/AAC support.

## Video studio

The persistent Teacher Studio toolbar opens the video studio and student practice sheets. Video settings are stored with each song and survive JSON backups/imports. JSON and portable song sharing remain available.

- Ocean-themed opening and closing titles use the locally bundled Skranji display font with seafoam-to-turquoise lettering, a carved edge, and individually settling letters. Optional composer/performer credits rise into place; title durations and the closing message remain adjustable. The unmodified font and its SIL Open Font License are included under `dist/assets/fonts/`.
- Eight saved transitions connect the opening, song, and closing screens: Ocean wave, Gentle fade, Page turn, Soft iris reveal, Paper collage (separately moving paper tiles), Curling surf wave (a rolling crest and foam), Palm-leaf curtain (layered fronds), and Sand lettering (title grains drifting away). New effects use deterministic Canvas drawing, so preview and offline export share the same motion. The opening fades in, and the ending fades to black. Exported frames contain no app name, promotional slogans, or “Made with” credit. Only the song title and teacher-entered credits/closing message remain; MP4 artist metadata uses only an entered composer.
- A play-through stepper from 1 to 99; 1 means no repeats. Count-in occurs once, repeated song bodies join directly, and a single final chord occurs at the end. Custom songs gain a virtual ending without changing their measures.
- A 16:9 canvas renders the selected stage, accurately positioned ukulele fingerings, timed lyrics, next chord, beats, strumming pattern, and the existing animated hand. Optional diagram, lyric, and hand visibility follows the song.
- **Fast MP4 render** is the default. Frames use explicit file timestamps rather than waiting for wall-clock playback. The existing arrangement scheduler renders the full sampled band and optional melody guide through an isolated OfflineAudioContext; swing, count-in, repeats, room sound, mixer levels, and ending fade are retained. Live audio references are restored before the asynchronous audio render. No microphone or screen permission is needed.
- 1920×1080 or 1280×720, at 60 fps by default with a 30 fps option. Locally bundled Mediabunny 1.61.3 uses browser WebCodecs to encode H.264 video and stereo 48 kHz AAC audio, then produces a regular MP4 with its metadata before media data. The finished file is inspected for coded/display dimensions, both codecs, and complete duration before Download appears. This replaces reliance on recorder container metadata for the recommended export path.
- Rendering runs as quickly as the device permits; performance varies and may be slower than playback on low-powered hardware. The progress display shows percent and effective speed. Browser codec support is checked up front; unsupported settings explain how to try 720p, a supported browser, or the explicit **Live recording** fallback. Offline export does not cancel merely because the tab becomes hidden, although browsers may throttle it. Exports are limited to 15 minutes and 450 MiB; audio is buffered in memory, so shorter exports use less memory.
- **Live recording** retains the existing MP4/WebM format selector. MediaRecorder captures the canvas and post-compressor instrument output on the same AudioContext clock. This fallback takes real time, requests a screen wake lock when available, and cancels on backgrounding, audio interruption, or a long frame stall. Preview remains real-time with audible playback. External MIDI is temporarily replaced with built-in sound and restored afterward.
- Cancel/error/finish paths release capture tracks and restore the original mixer, MIDI selection, loop/passage, count-in, and metronome. Temporary export settings cannot overwrite the song backup.
- Recorder startup draws fresh canvas frames before waiting for `MediaRecorder.onstart`, with continuous silent audio during titles. This avoids a circular wait for the first captured frame. Auto tries another supported encoder when initialization fails or exceeds 8 seconds, before starting the song clock; explicit format choices stay in their selected file family. MP4 level selection no longer forces a low H.264 level onto 1080p60. Audio/font preparation is time bounded. Frame errors stop and clean up the session, and the progress status includes time remaining. The finished player and download correctly replace the capture canvas.

## Melody maker

The premium **Melody** tab opens a focused treble-clef editor. **Chords** holds the accompaniment arrangement. The melody workspace shows one large measure, note-length buttons, pitch buttons, click-to-add staff entry, zoom, and a note inspector for pitch, accidental, duration, dot, and lyric syllable. A measure strip, duplicate/delete, undo/redo, and melody-only Listen keep composition approachable.

- One note at a time, with whole, half, quarter, eighth, and sixteenth notes/rests and dotted values. Overflow is rejected without changing the music; empty beats are filled with rests for display and print. Full bars advance to the next measure when adding another note.
- The editor starts at 110% zoom with a capped staff width and larger pitch buttons. **Add notes** appends a snapped pitch regardless of horizontal click position; a hover guide shows the pitch. **Edit notes** selects a note by its whole horizontal column, and pitch buttons or arrow keys adjust it. Thirty-second notes are absent from entry tools, while pre-existing short notes and exact rest completion remain compatible.
- Meters: 2/4, 3/4, 4/4, 6/8, cut time (2/2), 5/4, and 7/8 grouped 2+2+3. Tempo units are explicit. Keys C, G, D, A, F, B-flat, E-flat, A minor, E minor, and D minor; sharps, flats, and naturals follow measure accidental scope in playback and notation.
- Lyrics attach to individual notes; pasted lyrics use spaces for note changes and hyphens for syllables. Chord symbols have their own beat positions above the staff. Optional printed measure numbers and composer credits.
- Scores are saved in `song.notation` with the existing draft, named songs, and JSON import/export. Opening an existing song seeds its chord symbols and lyric prompts, not a transcribed melody. The melody score supports 128 written measures. Chord edits and measure structure synchronize in both directions for band-supported meters, using stable measure IDs so notes follow reordered and duplicated bars. Undo/redo restores notation and accompaniment together. Existing matched-meter written chord choices seed the first synchronized load; empty score bars inherit accompaniment chords. Subsequent saved songs use the arrangement as canonical chord data. Long accompaniment tails beyond the 128 written measures are retained. **Use score & present** applies melody tempo/swing and lyric timing; this transfer is undoable. Off-grid legacy chord placements are retained and must be moved to beats or eighth-note positions before syncing. **Listen** remains a melody-only composition preview.
- Full-score PDF preview, download, and print use embedded text fonts and high-resolution locally rendered notation. Systems keep the same staff size, join measures, repeat clefs/key signatures per system, and paginate with continuation titles. Engraving uses locally bundled VexFlow 4.2.5 with its MIT license.

`node checks/melody.cjs` verifies measure capacities, dotted rhythms/rest completion, accidental/key sound, lyric placement, overflow preservation, and playback clocks, and renders actual engraved scores/PDFs. `node checks/melody-ui.cjs` uses the existing DOM/audio doubles plus real native Canvas to check navigation, note entry, automatic next measure, undo/redo, saving/normalization, note lyrics, chord placement, measure tools, and playback cleanup. PDF pages were rendered with Poppler and visually inspected. The supported browser controller is unavailable; responsive layout, physical touch input, browser PDF interactions, and actual speaker output have not been tested live.

## Sing and strum with sheet music

The Pro presentation and silent student projector can show a moving score in the existing lyric area. The current note and lyric syllable are highlighted; a cursor follows the existing playback clock through count-ins, swing, pauses, passage loops, repeats, and the final chord. The normal finish screen returns when playback ends. Two fixed, stacked lines alternate independently. While measure 2 plays below, the completed upper measure fades out and measure 3 fades in above; while measure 3 plays above, the lower line prepares measure 4. Only the inactive line changes, over at most 320 ms, without sliding the staff or overlaying two sets of notes. Measure numbers, **Playing**, **Up next**, and a teal active outline identify the reading order. The upcoming measure stays in its physical slot when it starts playing, including across odd-length repeats and selected passages. Count-ins show the first two bars; the final pass previews the final chord instead of another repeat. Timing is derived from the audio clock, so pause/seek and offline video rendering remain deterministic. Reduced motion swaps only the inactive line immediately. Dense measures retain smooth horizontal cursor-following on narrow displays. The presentation score uses two 280-pixel rows to keep notes and lyrics readable; surrounding controls retain their existing arrangement and short displays remain scrollable.

In **Melody**, add notes and syllables, then select **Use score & present**. This copies the score’s meter, tempo, swing, chords, and measure count into the band arrangement, adds one final strum, and opens the presentation ready to play. **Sheet music in presentation** and **Hear melody guide** are independent choices. The optional guide is a quiet marimba routed through the existing playback audio output. The presentation uses the band’s actual tempo and synchronized chords. Chord edits update the band, presentation, newly rendered videos, and newly generated PDFs automatically; use the transfer button to apply changed melody tempo/swing and syllable-derived lyric cues.

In **Video studio**, **Show sheet music** uses the same alternating, stationary measures and inactive-line fades in the existing lyric panel, preserving the chord diagram, beats, hand, title screens, wave transitions, and 60 fps setting. **Include melody guide** controls recorded melody audio separately. Both choices are saved with the song. Notes need to be entered in Melody; starter arrangements are not automatically transcribed.

Band presentation supports 2/4, 3/4, 4/4, 6/8, and cut time. Cut time uses a half-note tempo from 40–100 because the accompaniment accepts quarter-note tempos through 200. Chord changes must fall on beats or eighth-note positions. 5/4 and 7/8 remain available for notation, solo Listen, and PDFs; unsupported transfers explain the limitation without modifying the song. Unwritten measures display rests.

`node checks/score-playback.cjs` checks score transfer, saved choices, exact swung guide onsets, repeats and passages, pause, guide-off behavior, 60 fps capture requests, final-chord silence, restoration, and silent projector synchronization using native Canvas and deterministic DOM/audio/encoder doubles. Actual engraved video frames and wide/narrow score panels were visually inspected. Live browser layout and the browser WebCodecs encoder have not been verified in this managed environment; native encoded MP4/container checks are described below.

`node checks/score-transitions.cjs` verifies read-ahead visibility, fixed measure positions, inactive-line fades, deterministic pause/seek behavior, odd/even repeats, selected passages, one-bar loops, final-chord preview, reduced motion, and continuous narrow-screen panning. Native engraved frames were visually reviewed. Video checks cover all eight transitions at both scene boundaries, persisted choices, opaque frames, and absence of app branding while retaining composer credits. Live browser layout and browser encoding remain unverified in this managed environment.

## Student practice sheets

Direct PDF download and an in-app PDF preview offer optional lyrics, vector chord diagrams, a strumming guide, weekly practice checkboxes, a goal, teacher notes, and an ink-saving option. Letter-size pages use embedded DejaVu fonts, a teal/mint layout, compact endings, and phrase cards that place lyrics directly below the matching chord measures and keep each card together across page breaks. The strumming guide counts eighth-note subdivisions as `1 & 2 & 3 & 4 &`; standalone chord-change labels retain their complete beat position. Every measure and chord-change beat is retained. Lyric timing is phrase-level in the source data, so sheets align whole phrases with their measure ranges and label non-default entrances and pickups. They do not invent word-level chord timing. Portable HTML players omit the premium tools but remain self-contained.

## Validation for this edition

`node checks/harmony-entry.cjs` checks forgiving Add/Edit entry, default sizing, duration tools, linked chord edits, shared undo/redo, JSON reload, identity-preserving measure reorder/duplicate, rollback of incompatible meter changes, existing short-note preservation, and long-song retention. It generates both real PDFs from edited chord data; their pages and the editor canvas were visually inspected.

`node checks/classroom.cjs` runs the 171 existing classroom checks. `node checks/video.cjs` validates repeat plans for all fourteen songs, audio/video track assembly, scheduling, restoration, cancellation, format selection, escaping, and practice sheet completeness. It also renders real Canvas frames with bundled artwork via the installed native Canvas library. This uses deterministic DOM/Web Audio/MediaRecorder doubles; an actual browser encoder, responsive browser layout, and device speaker output could not be tested because the supported managed browser tool was unavailable. Do not represent these checks as an end-to-end recording test.

`node checks/video-startup.cjs` reproduces a recorder that waits for a new captured frame, verifies successful startup and completion, tests constructor failures, asynchronous errors, a stalled MP4 encoder with WebM recovery, timeout/cancellation cleanup, renderer errors, and stalled audio preparation. These are deterministic lifecycle tests; they do not run an actual browser encoder.

`npm run check:fast-video` verifies actual OfflineAudioContext output with the sampled band, swung melody, repeats, cutoff silence, and restored live state. It encodes native H.264/AAC fixtures using ffmpeg, remuxes their real packets through the same Mediabunny MP4 writer, and independently inspects 720p/1080p dimensions, 60 fps, duration, codecs, and metadata placement with ffprobe. Codec lifecycle doubles verify every frame timestamp, download finalization, cancellation, encoder failure, unsupported codecs, and rejection of a mismatched-height file. The supported browser controller is unavailable: browser WebCodecs execution and actual Facebook upload acceptance are not verified by these tests.

`node checks/practice-pdf.cjs` generates real PDF files covering short and long songs, accented credits, dense chord changes, optional content, and ink saving. The exported pages were rendered with Poppler and visually reviewed. The video checks confirm 60 fps capture requests and the higher recorder bitrate; achieved frame rate still depends on the browser and device.

New files: `video-model.js` (pure options/timeline), `video-renderer.js` (shared Canvas frames), `video-studio.js` (recording and UI), `video-fast.js` (offline audio and direct MP4 rendering), `practice-sheet.js` (PDF controls), `practice-pdf.js` (document layout), and `video-studio.css`. PDF generation uses locally bundled pdf-lib and its fontkit fork in `dist/vendor/`, with fonts and their license in `dist/assets/fonts/`.

---

# Mr. Drew’s Uke Strum

A buildless classroom ukulele app for soprano/concert G–C–E–A tuning. Static assets live in `dist/`; there are no externally loaded runtime scripts or external audio services. A locally hosted, approximately 3.1 MB sample bank supplies the ukulele and backing instruments.

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

### Visual chord changes and melody swing
The classroom and practice screens use an audio-clock filling bar beneath the upcoming chord, with no fractional beat countdown. It follows swung chord onsets, count-ins, repeats and passage loops, freezes on pause, and hides when there is no next change.

Melody maker has a saved Straight-to-Strong swing slider (0–100; around two thirds gives classic swing). Eighth-note timing changes without rewriting the score or changing bar length. Explicit dotted/sub-eighth rhythms remain literal. Quarter-note meters and cut time support swing; 6/8 and 7/8 keep their written eighth-note feel. PDFs identify swung eighths. This control belongs to the melody score; the band keeps its own swing setting.

Checks: `node checks/chord-progress-swing.cjs`, `node checks/melody-ui.cjs`, and `node checks/classroom.cjs`. PDF rendering is checked with native Canvas. Live browser interaction was unavailable in this managed environment.
