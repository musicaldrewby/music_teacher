# Orbit shows: agent production guide

Orbit now has a separate Shows workspace. Its saved `orbit-show` score drives the same SoundFont sequencer in the browser and in the offline renderer. Open **Shows ↗** beside the studio title. The collection contains 127 arrangements, including fifteen new Cosmic Marimba, Neon Night Drive and Gravity Games arrangements, ten original Berlin School grooves and ten Background Grooves with warm mallets, plucked strings, gentle bass, restrained percussion and eight-measure harmonic phrases. Horizon, marimba, percussion, pads, melodic grooves and the experimental collections remain available.

## Make and perform a show

Start with an Event Horizon or Marimba journey, add factory arrangements, or capture the current studio setup. Select a movement to edit its title, duration, crossfade, visual world, camera and lighting. Expand Timed moves to inspect or add volume, probability, timbre motion, room or echo automation. Save/open downloads and imports the complete score, including musical states. Undo edit restores the previous score.

Play starts at the beginning, Pause freezes the musical clock, and Resume continues. Stop resets the transport. Editing is disabled during playback and export. The selected movement is an editor selection, not a transport seek. A new journey replaces the current score and can be undone. Auto-generated journeys use D minor throughout, independent of the original preset keys.

**Export WAV** renders stereo 48 kHz / 16-bit PCM in a worker. Where direct file saving is available, chunks are written to disk with backpressure so long shows do not accumulate in memory. Other browsers can download up to five minutes through a Blob. **Record video** records the visible canvas and the show's audio in real time. It selects supported MP4 or WebM encoding; keep the tab visible. Stop finalizes a partial recording. A browser without the relevant recording/file APIs gets a clear explanation. Browser UI and MediaRecorder interaction QA were unavailable in the managed environment; the offline renderer was exercised directly.

## Visual direction

Choose Event Horizon (a dark star and illuminated accretion disc), Aurora Veils (flowing light ribbons), Prism Garden (responsive glass forms), Liquid Echoes (note-driven ripples on a luminous surface), Resonance Field (eight braided particle streams), Wave Cathedral (rhythmic arches of light), or the original Orbit Rings. Auto selects a world from the arrangement. Each movement stores its world, palette, camera, framing, glow, and speed. Event Horizon and Marimba journey generators now compose a sequence of worlds as well as musical movements. Existing show files without a world retain Orbit Rings.

**Try the visual tour** loads an editable two-minute score with all six cinematic worlds. It replaces the current score; Undo edit restores it. **Cinema** removes all titles, numbers, clocks, and progress from the live canvas and recordings. Set it before playback or recording. New journeys start with Cinema on; existing scores retain their overlays. Movement titles can also be hidden individually. The interface credit and donation link remain in the studio.

**Fullscreen** renders to the display’s pixel density, up to 3840 × 2160. Recording keeps a fixed 1920 × 1080 frame even when the window changes size. Move the pointer or press Tab to reveal playback and exit controls. Escape returns to the workspace; playback continues. Browsers without native fullscreen get an expanded in-page view. Camera choices are Drift, Orbit, and Still. Still fixes the camera while the scene responds to notes; setting Visual motion to zero freezes both camera and scene light animation.

Actual strike velocity (including soft-to-loud swells), track volume, and melodic/percussion note impulses drive different light envelopes; the selected room's mix and decay lengthen visual trails. Muted/unsounded parts do not emit note pulses. The reverb halo also follows the measured combined audio output. This is artistic note/output reactivity, not per-instrument spectral analysis. Scene dissolves use the musical crossfade duration and preserve brightness. Motion follows sample time; scene speed is integrated so ramps do not jump in position. A bounded eight-strike history per track gives new notes a short eased light attack while earlier trails continue. The offline renderer reconstructs that history during replay; no feedback image buffers are needed.

## Agent workflow

The authoritative agent production route is a saved score plus the offline CLI. This does not require an open browser tab, a simulated mouse, or a server render running inside Sites. Node.js, FFmpeg (with libx264/AAC), and `skia-canvas` are required for video. Audio-only rendering does not need skia-canvas. Install skia-canvas in the renderer checkout, or set `ORBIT_CANVAS_MODULE` to its module file. The provided Codex runtime is detected automatically when available.

```sh
node scripts/show.mjs presets
node scripts/show.mjs create --minutes 60 --style horizon --title "Beyond the Event Horizon" --out my-show.json
node scripts/show.mjs inspect my-show.json
node scripts/show.mjs apply my-show.json --commands changes.json --out revised-show.json
node scripts/render-show.mjs revised-show.json --out renders/horizon-hour --width 2560 --height 1440 --fps 60 --crf 16
```

Marimba is the other journey style. Compose additional styles by adding any factory preset or a complete custom eight-track state. The generator is a starting score; listen to previews and revise its pacing before committing to a long final film.

Example `changes.json` (track indices are **zero-based**, 0–7):

```json
[
  {"op":"show","title":"The Quiet Singularity — Live","seed":6412},
  {"op":"automate","cue":"movement-1","at":180,"duration":16,"path":"ambient.mix","value":50},
  {"op":"visual","cue":"movement-2","settings":{"world":"Aurora Veils","camera":"Orbit","look":"Velvet","glow":85,"speed":0.3}},
  {"op":"add","preset":"Wood & Stars","id":"wood-stars","duration":240,"transition":16}
]
```

Operations: `show` edits title/artist/seed/tail/fades/cinema; `cue` edits title/duration/crossfade/state; `visual` edits scene/camera/lighting; `automate` adds a move; `add` appends a movement; `remove` deletes it. Overlapping ramps on one target are rejected. Edit or remove an existing ramp in the score when replacing it.

## Score contract

`type: "orbit-show"`, `version: 1`, `title`, `artist`, integer `seed`, `tailSeconds`, `fadeIn`, `fadeOut`, and `cues[]`. Total length includes the tail. Each cue has a unique `id`, `title`, `duration` in seconds, `transition` in seconds, complete `state`, `visual`, and `automation[]`. States are stored in the file, so later changes to factory presets do not rewrite a show.

A cue starts after the sum of preceding durations. Its incoming crossfade overlaps the previous movement's continuing sound. Both engines retain their own notes and effects during that overlap. The outgoing engine is reclaimed after its gain reaches zero. The last movement releases notes and lets effects decay during `tailSeconds`; the final fade finishes inside the total duration. Crossfades are capped at 30 seconds and half of each adjacent movement. Each movement is 4–3600 seconds; total shows are limited to four hours. Choose tail/fade durations to suit long reverbs.

Each move is `{at, duration, path, value, curve}`. Time is in seconds from the cue's start. `curve` is `smooth` or `linear`. Ramps start from the initial value or the previous completed move. Automation controls are evaluated at approximately 100 Hz; sequencing and cue boundaries follow the audio sample clock. To place a move in bars at a fixed tempo, use `seconds = bars * 4 * 60 / bpm`. A tempo ramp changes that conversion; authored seconds remain the timeline's authority.

Supported numeric paths: `bpm`, `master`; `ambient.mix`, `.decay`, `.predelay`, `.tone`, `.width`, `.lowcut`; `tracks.0` through `tracks.7` with `.volume`, `.pan`, `.reverb`, `.delay`, `.gate`, `.probability`, `.motion`, `.motionRate`, `.swell`, `.swellBars`; `visual.glow`, `.speed`, `.zoom`. `ambient.enabled`, track `.mute` and `.solo` accept immediate booleans. Track `.notes` and `.pattern` accept immediate arrays. Notes are scale degrees (0–20), not MIDI pitches; patterns contain 0/rest, 1/hit or 2/accent and must retain the track's step count. Instrument/key/scale changes belong in the cue's state. Unknown paths and overlapping ramps are rejected, rather than evaluated as arbitrary code.

Show-level `cinema` is a boolean. Visuals: `world` is Auto/Event Horizon/Aurora Veils/Prism Garden/Liquid Echoes/Resonance Field/Wave Cathedral/Orbit Rings, `camera` is Drift/Orbit/Still, `look` is Auto/Ice/Velvet/Ember/Aurora, `glow` 0–100, `speed` 0–2 (zero freezes scene motion and light animation), `zoom` .8–1.2, and `titles` true/false (Cinema overrides it). World and camera choices change at cue boundaries; glow, speed and zoom can be ramped within a cue. Audio and exported visuals share sample-derived timestamps. Playback chance uses a seeded generator; rendering the same score and settings recreates it.

## Preview, resume and quality control

```sh
node scripts/render-show.mjs my-show.json --out renders/transition-preview --from 285 --to 325 --width 1280 --height 720 --fps 24
node scripts/render-show.mjs my-show.json --out renders/audio-master --audio-only
```

The renderer streams PCM and raw video. Completed sections are saved with hashes; rerun the identical command to resume. It replays earlier audio to reconstruct SoundFont voices, random decisions and effect memory, then reuses verified sections. It does not reset the reverb between files. The fingerprint includes score, source, soundfont and output settings; changing any requires a new output folder. One output folder is locked against concurrent renders. Interrupted partial sections are redone. Keep its `sections/` and `render-state.json` until final validation.

Defaults are native 2560 × 1440, 60 fps, CRF 16, 30-second sections. Use `--width 3840 --height 2160` for native 4K. `--crf 12`–`28` controls compression; lower values preserve more detail and create larger files. No old film is upscaled. Every video frame is rendered directly from the saved performance, without real-time frame dropping or interpolation. Live visuals use requestAnimationFrame and sample an audio-output clock between worklet updates. Browser recording requests 1080p / 60 fps at 16 Mbps; the achieved frame rate depends on the device and tab visibility. Offline rendering is the reliable delivery route. Video can render more slowly than playback, depending on the machine. WAV uses approximately 691 MB per hour, with temporary PCM using a similar amount. The output directory contains `performance.mp4`, `master.wav`, `show.orbit-show.json`, `poster.png`, `quality-report.json`, and resume files. For delivery, zip the finished media, score, poster and report, excluding temporary sections. Encode audio only once at the final mux to avoid per-section AAC padding.

Voice count reports the maximum for a single deck; both decks sound during crossfades. Check `quality-report.json` for finite output, peak/RMS levels, long quiet passages, voice count, duration and frame count. `limitedSamples` counts samples over the soft-limiter threshold; review busy passages when this is high. Confirm audio/video durations with ffprobe. Inspect transition frames and audition representative passages; automated measurements do not establish musical quality.

The browser exposes `window.orbitShow`: `get()`, `inspect()`, `status()`, `load(score)`, `create(options)`, `open()`, `play()`, `pause()`, `stop()`, `save()`, `record()`, `exportAudio()`, `addCue(cue)`, `automate(cueId, move)`, `visual(cueId, settings)`, `cinema(boolean)`, and `tour()`. File dialogs and audio startup still follow the browser's user-gesture rules. This is a local page API, not a remote cloud render endpoint.

## Verification

`node verify-show.mjs` checks hour-length scores, normalization, unsafe paths, overlapping ramps, interpolation, seeded repeatability, crossfade overlap, finite samples and exact completion. `node verify-show.mjs --endurance` additionally synthesizes one complete hour with the real SoundFont. `show-verification-report.json` records the result. The original studio regression tests continue to run against the shared core. Extraction was additionally checked against a byte-identical 320,000-frame studio audio fingerprint.

`node verify-show-visuals.mjs [image-output-directory]` exercises real native-canvas frames for all seven worlds, zero-motion freezing, distinct scenes, deterministic frames, dissolve endpoints, Cinema text suppression, score compatibility, muted track envelopes, and portrait/ultrawide dimensions. It requires skia-canvas through the runtime or `ORBIT_CANVAS_MODULE`. Browser interaction QA remains separate.

`node verify-show-motion.mjs` checks display-clock sampling, output latency, pause/resume, HiDPI sizing, overlapping light envelopes and continuous speed ramps. `node verify-phrase-editor.mjs` checks the composed-phrase editor and saved-project compatibility.

## Render one preset as audio

The studio's **Render audio** button snapshots the current preset, including edits, mute/solo, effects and dynamics. Choose 1–60 minutes and export either uncompressed 48 kHz stereo 16-bit WAV or high-quality 320 kbps stereo MP3 offline. Both formats use the same continuous audio engine and preserve the mix, reverb and fades. The Save dialog chooses the correct extension and file type. A single continuous cue preserves phrase position and evolving dynamics; the three-second release and opening/closing fades fit inside the exact requested duration. For WAV, ten minutes is about 115 MB and one hour about 691 MB. For MP3, those sizes are about 24 MB and 144 MB. MP3 encoding runs in a separate classic worker with the unmodified lamejs 1.2.1 encoder, feeding bounded one-second PCM blocks and acknowledging each compressed write; it never builds a full WAV in memory. The final encoder flush is written before the file closes. MP3 frame padding can add a small fraction of a second to the container duration. Supported browsers stream directly to a chosen file, with progress and cancellation. Without direct file saving, the download fallback is limited to ten minutes. This does not replace the saved show.

Agents can call `presetAudioScore(state, minutes)` from `dist/preset-audio-score.js`, save the returned show JSON, and use `scripts/render-show.mjs --audio-only`.

## Living session and personal presets

Open **Living session** below the transport. **Keep Evolving** makes repeatable fills, melodic turns and chord inversions from each part’s existing material. It begins at the first four-beat boundary at least 20 seconds into playback; changes become audible on the next affected note. The Variation slider changes the amount, and New path changes the seed. Protect any of the eight parts to keep its written notes and rhythm. The editor continues to show the base pattern, while note flashes follow the actual audio events. **Timbre motion** in Sound & space remains the separate filter, pan and expression movement.

**Groove & Feel** offers straight, swing, shuffle and laid-back timing plus human touch (timing and velocity). Each track’s cycle start stays exactly on the grid, including odd-length polyrhythms. Reset returns groove timing and touch to the original. All new features are opt-in.

Current state, scenes, saved projects, captured show movements, WAV and MP3 exports retain these settings. New optional state fields are `evolution: {enabled, amount, seed}` and `groove: {feel, amount, humanize, seed}`; amounts are 0–100, seeds are integers 1–2147483646, and feel is `straight`, `swing`, `shuffle` or `laidback`. Individual tracks accept `evolveLock: true`. Exporters and live playback share the exact generator. Existing Probability controls can still make a live performance differ from an offline render. Evolution stages restart at the start of each show movement. These new settings are captured with a cue, not exposed as timed automation lanes.

Star selected presets for Favorites. **Save as preset** captures current edits under a unique name and optional collection. **My presets** contains up to 200 personal arrangements. These and favorites are local to the browser; **Back up collection** writes a portable JSON backup, and **Import collection** merges it. Imported name/ID collisions receive new names/IDs, existing saved sounds are preserved, and corrupt imports or storage failures do not overwrite the in-memory collection.

Verification: `node verify-living.mjs` checks all 102 factory states against the v19 schema, actual old/new synth event equality, deterministic variation, pitch material, locks, sample timing and collection persistence. `node verify-living-exports.mjs` renders repeatable one-minute WAV files and a decoded 320 kbps MP3. `node verify-phrase-editor.mjs` also exercises the actual Living session and collection UI handlers with a DOM harness. Interactive browser/layout QA was unavailable. The older `verify-factory.mjs` still targets the historical 46-preset catalog; use the current catalog checks in `verify-background.mjs` and `verify-living.mjs`.

## Berlin School collection

Ten original Tangerine Dream–inspired sequencer arrangements: Tangerine Afterburn, Amber Autobahn, Violet Voltage, Glass Meridian, Red Desert Relay, Magnetic Night Train, Satellites in Thirteen, Chrome Mirage, Solar Spiral and Beyond the Last Signal. Their preset IDs are `berlin-01` through `berlin-10`. Find them under **Browse presets → Berlin School**, or in the Shows preset selector.

Each has eight authored harmonic measures, alternating melodic contours, independent accents and timbre motion. Counterlines use five-, seven-, eleven- or thirteen-part subdivisions against a stable bass foundation. Keep Evolving is enabled at a curated intensity; bass and percussion patterns are protected. The new arrangements use the existing GeneralUser SoundFont and retain their complete state in projects, scenes, personal presets and WAV/MP3 show exports. Every original preset remains unchanged.

The compositional reference is the band's own description of sequencers, chord parts, ambient layers and melodies having separate roles in long-form music: [MusicRadar interview, March 2022](https://www.musicradar.com/news/tangerine-dream-interview) and [15 Questions interview](https://www.15questions.net/interview/tangerine-dream-about-improvisation-collaboration-and-speculation/page-1/). All note sequences here are original.


## Cosmic Marimba, Neon Night Drive and Gravity Games

Fifteen original arrangements, five per category. Browse presets opens on Cosmic Marimba; all three collections are also available in the Shows preset selector.

| Collection | Preset IDs | Arrangements |
| --- | --- | --- |
| Cosmic Marimba | `cosmic-marimba-01` through `cosmic-marimba-05` | Emberwood Spiral; Moonlit Mallet Express; Prismatic Canopy; Obsidian Bloom; Sunwheel Ceremony |
| Neon Night Drive | `night-drive-01` through `night-drive-05` | Electric Coastline; Midnight Overpass; Violet Velocity; Tunnel of Afterimages; Dawn on the Ring Road |
| Gravity Games | `gravity-games-01` through `gravity-games-05` | Five Against the Floor; Sevenfold Switch; Eleven Moons Dancing; Thirteen-Step Fever; The Great Alignment |

Each uses eight authored four-beat measures, contrasting melodic contours, early phrase answers, dynamic strike swells, an individual lighting palette and seeded Keep Evolving. Bass and percussion parts are protected. Cosmic Marimba features open fourth/fifth double stops; Prismatic Canopy has light swing. Neon Night Drive ranges from a gentle 98 BPM sunrise to 130 BPM propulsion. Gravity Games combines independent subdivisions (5/7/8, 7/12/5, 11/8/3, 13/8/5 and 13/11/7) with a stable pulse. These are polyrhythms inside a common four-beat measure; their downbeats meet each bar. All fifteen use the existing GeneralUser GS soundfont and shared live/offline engine, with full editable phrases and WAV/MP3 export support.
