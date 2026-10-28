# Mr. Drew’s Music Lab VR

Serve `dist/` over HTTPS. Uses vendored Three.js r180 (MIT), local Web Audio synthesis, and no downloaded sound samples. Each visitor has an independent session; this is not networked multiplayer.

## Room and controls

A central 13-note steelpan beneath a musical mobile; eight Boomwhackers; 13-bar soprano/alto/bass xylophones and metallophones; glockenspiel; maracas, tambourine and cowbell; a drum machine wall; a 16-step bass machine; a 24-preset synthesizer; a live front piano-roll screen; a front Song Station for recording and device-local saved songs; and a separate shared listening room.

Desktop: select a station, tap notes, drag to look, Shift+WASD to walk. In VR: mallets play instruments; trigger rays operate controls or teleport; right stick snap-turns. PLAY HERE centers the player near each instrument. Mallet heads are 3.8 cm across with 1.7 cm shafts. Compact layouts retain every note. Local-space rounded sweep checks catch fast strikes without oversized box corners; a broad phase skips distant notes.

## Steelpan and musical mobile

The center piano has been replaced with a chrome-colored, bowl-shaped steelpan on a compact stand. Eight outer note areas and five inner ones cover C4–A5 in the default diatonic tuning. The note surfaces slope with the bowl, have readable note labels, work with both controller mallets, and retune with the room’s available natural/F-sharp/B-flat tunings. Its cached modal Web Audio voice uses a soft rubber-mallet transient, a rounded fundamental, delayed octave/twelfth bloom, subtle coupled-mode beating, and velocity-dependent upper resonances. Each pitch uses two reusable mono buffers (24-pitch cache limit) and two playback sources per strike, with shorter ringing on higher notes: this is a steelpan-inspired synthesized sound, not a sampled acoustic instrument or a replica of a traditional pan layout. Steelpan events record, overdub, save, import, and display on the note wall. Older piano recordings still load and sound through the retained piano audio voice.

A seven-piece geometric mobile hangs above it, with its lowest point above 2.5 m. Large shapes respond to bass and low notes; smaller shapes respond to high notes and light percussion. Instrument identity controls color, and note events from live instruments and the shared playback clock drive its glow and motion. Held live synth notes sustain the response. A Mobile button beside the pan, also available on desktop, cycles Calm, Lively and Off; Off leaves the sculpture still. The preference is device-local. The artwork uses existing materials, modest geometry, and no extra lights, shadows, particles, or per-frame canvas uploads. Dynamic mobile meshes are excluded from static batching and matrix freezing.

## Simple recording

The recorder starts hidden in VR. Click the left thumbstick to open it centered ahead; Record/Overdub hide it for playing. No controls are attached to either wrist. Closing the recorder starts a brief mallet lockout so moving back to the instrument cannot create an accidental note. The desktop dock has the same primary actions:

- Record: a one-measure count-in, then a new four-measure take. Existing recorded notes are replaced; Undo restores them. The drum and bass backing remains.
- Practice: play the loop without capturing live notes. Join Next Measure queues an overdub at the next bar while keeping the optional metronome active. Press Overdub again to commit the layer and keep playback running.
- Overdub: add a part without replacing existing notes. From Stop it starts after a one-measure count-in. It stays on across loop boundaries and station changes, with the optional metronome continuing. New notes join playback on subsequent cycles, with held synth notes replaying after release.
- Stop: stops the shared transport, metronome and sustained synth holds, preserving the working song. Stopping during count-in cancels the take and restores the previous song.

A new Record take automatically finishes after four measures and continues playing. Overdub stays active until toggled off or stopped. Four markers show the current measure. More contains Practice, Join Next Bar, Undo Last Note, Undo Latest Overdub, Clear, Save, tempo, click-volume and mallet-sensitivity controls. Unfinished work is recovered from device-local storage when the page reopens. The metronome is ON for each new session and can be toggled in the recorder menu or in the desktop recorder. It is not saved in songs. Sixteenth-note quantization is optional in desktop More.

New recordings use four measures. Older saved/imported songs retain their original supported length for playback and overdub; Record creates a new four-measure loop. Tempo changes require stopping and clearing recorded notes.

## One clock for drums, bass and instruments

The drum editor has 20 distinct rhythm presets (Basics, Rock, Dance, Hip-hop, Breaks, Funk, Offbeat and Patterns), four voices and sixteen steps: one measure that repeats four times across a new recording loop. Starting the drums starts the shared transport if stopped, or joins its existing phase. All instrument playback, drum steps and the metronome use the same audio-clock origin and scheduling cursor. The measure/beat readout shows this position.

Drums remain a separate accompaniment pattern, bypassing live-note capture, so every overdub adds only what the player performs. The pattern keeps running when a take completes. Record, Overdub, playback and saved-song previews all use the same scheduler. Stop preserves the pattern; the drum wall’s own Stop drums removes it from the current accompaniment. Editing the pattern updates the current backing. Saving includes a validated optional 4×16 `drumPattern` field alongside recorded events; older song files without it still load. Drum-only songs can be saved and previewed.

The bass machine sits beside the drum wall. Forty named presets across Deep, Groove, Acid, Dance and Modal families, sixteen pitch/rest steps, accents, slides, waveform, cutoff, resonance and decay controls create a repeating bass line. Its oscillators/filter are an original simple synthesis implementation inspired by classic bass sequencers. Bass is stored separately in an optional validated `bassPattern`, repeated on the shared clock and displayed on the note wall. It is not recaptured during overdubs. Bass-only songs can be saved. Clear removes bass backing; Undo restores it.

## Preset browsers and room key

Both machines have paged controller-operated preset browsers (eight choices per page), plus desktop dropdowns with explicit Load preset buttons. Presets replace that machine's editable pattern without resetting the shared clock or changing tempo. Empty patterns remain the initial state. Bass preset names are saved with the pattern and cleared when edited; drum names are inferred from matching saved patterns.

Room Key / Mode offers C Ionian, A Aeolian, D Dorian, E Phrygian, F Lydian, G Mixolydian and B Locrian on the natural bars. F major and D natural minor substitute B-flat; G major and D Mixolydian substitute F-sharp; C remains natural. The seven barred instruments, steelpan and eight Boomwhackers retune their existing physical positions and displayed labels. Bar tunings are restricted to natural notes, F-sharp and B-flat; D major is not offered. Legacy songs tagged D major still import with D Mixolydian as their live bar tuning; their recorded pitches are preserved. Pianos and synth keyboards retain their full chromatic ranges. The optional five-note subset follows the selected mode.

Choose the key while stopped. Bass presets use scale degrees; manual bass pitch buttons step through the selected scale. Changing key retunes the current bass pattern and live bars; existing recorded notes preserve their actual MIDI pitches. The key is saved in songs and restored on load or Undo, with C major as the legacy-file default. The note wall displays the song's key. Dynamic bar names repaint their existing text atlases so retuning does not add a draw call per note.

## Songs, synth and note wall

Songs are device-local in IndexedDB with a localStorage backup when available. My Songs at the front Song Station loops them or loads them for overdubbing. Name & Save Loop and Rename Song open a controller-operated letter/number keyboard in VR, or a text field on desktop. Renaming updates the existing song identity without making a duplicate. Export/import `.musiclab.json` moves them between devices; playback requires this app. Private songs stay on this device unless explicitly shared to the public listening room. Limits: 4,096 notes and 12 distinct synth patches. Recording stores musical events, drum and bass patterns, not microphones or YouTube audio.

Synth mallet contact holds a note until lifting, then follows the preset’s release envelope. Two mallets work independently, including shared-key ownership; held keys remain highlighted. A 4 mm release-only tolerance handles tracking jitter. Gentle touches work; swept-only strikes have a one-frame gate. Tracking loss, disconnection, teleportation, panic and leaving VR release holds. Easy mode has presets, Brightness, Fade in (attack), Fade out (release), and Space. Four waveform picture buttons and Pluck/Hold/Swell envelope buttons sit above the controls beside a live envelope diagram. Desktop exposes the same choices and graphs without opening More. More retains full ADSR, filter, delay and modulation controls. Envelope diagrams represent a one-second hold; changes to envelopes are heard when playing the next note. Graph textures update on setting changes, not every frame.

The front note wall visualizes all recorded instruments, live takes and overdubs, held synth durations, a synchronized playhead, and seven percussion lanes. Drum backing repeats across the displayed measures. Saved-song previews also appear. The front wall has Record, Overdub, Play, Stop and Undo Last Note controls, a large color-coded recording status, and four measure markers. Stop retains the displayed saved song; Play restarts it in a loop. Overdub loads that song for adding a part. New recordings retain station identity for distinct alto/soprano/bass colors; older songs use family colors. Instrument rows mute/unmute playback; note positions remain read-only. This is not a MIDI editor or MIDI-file exporter. The canvas redraws only when needed, at up to 8 Hz while visible, with a separate smooth 3D playhead. Optional legacy external media remains separately accessible in browser view.

## Seated play and Quest rendering

Seated / height calibrates headset and controllers together (110–210 cm target eye height, default 160 cm), preserving normal leaning and height through teleportation. Click the left thumbstick, then choose HEIGHT in the recorder to open calibration.

Horizontal bars and steelpan notes require a downward mallet stroke. Light, Normal and Firm sensitivity presets tune the required speed and downward direction; Firm provides the strongest protection against accidental notes. Wall percussion keeps its natural forward-hit behavior.

The dusk landscape and scenery remain. Optional beat light-show mode smoothly modulates the existing three shadow-free fill lights and six cove/ring fixtures, using the shared audio clock; its wall switch restores steady lighting. Live and recorded notes glow on their matching instrument; scheduled playback glows use the audio clock and held synth durations. Static geometry and text use batches/atlases; interactive objects remain independent. XR uses 0.9 framebuffer scale and 0.5 fixed foveation where supported. Shadow sampling is disabled in VR and restored on exit. Static matrices and collider transforms are cached.

## Validation

Recorder checks cover timing, count-in, note durations, quantization, replacement/overdub, cancellation, Undo/Clear and imports. Shared-clock checks cover exactly four repetitions of drum patterns, no doubled hits or recaptured drum events, metronome throughout continuous overdub, Stop, saved backing and drum-only previews, and older-song restoration. Real Three.js objects with a mocked renderer/DOM verify scene startup, the side recorder position, Record/Overdub/Stop actions, controls, note wall, seated height, all note ranges and sustained mallet behavior. Preset checks verify exactly 20 unique drum grids and 40 distinct bass phrases, every one of the 440 bass/key combinations, all Orff retunings, scale-stepped bass editing, key-to-key retuning, key/preset persistence, controller preset pages, dynamic text atlases and actual trigger pitch after retuning. Additional checks cover continuous overdub across multiple cycles, no first-cycle doubling, phase-preserving toggle off, subsequent takes, bass scheduling/synthesis lifecycle, bass file validation, station-specific playback glows, dynamic lighting, VR name-key entry, name/save/rename flows with a storage stub, and wall playback of saved songs. These are not physical-headset, browser visual, listening or actual IndexedDB persistence tests.

The electronic wall uses three equal 3.6 m × 2.8 m panels, with 0.9 m gaps and matching headers. Bass, drums and synth centers are at z = -5.4, -0.9 and 3.6 m. Their content is sized independently within those panels: the drum grid scales to fit, bass controls broaden for readability, and preset popups retain their own unscaled size. The synth keyboard retains its original 25 keys and exact local geometry/playing height. Its settings remain directly above the keyboard, slightly wider than before, with the sound-experiment controls above them. Tests verify equal panel dimensions/spacing, popup parents, waveform-to-audio settings, three envelope patches, desktop controls, resized slider ray mapping, and existing seated/mallet/recorder behavior.

Steelpan/mobile checks cover replacing the floor piano, all thirteen isolated mallet hits, bowl surface visibility, mobile survival through batching and actual animation, overhead clearance, Off mode, recording validation and key tuning. Physical headset feel and acoustic listening remain unverified.


## Desktop navigation and outdoor weather

Desktop station selection now frames the full instrument in the space between the navigation, recorder and note controls. Fit instrument restores this view; scrolling over the scene adjusts approach distance. Arrow keys walk in the direction of view (left/right strafe), with Shift+WASD retained. Right-drag looks without striking notes or adjusting synthesizer controls; left-drag is retained. Letter keys still play instruments. Walking is disabled in dialogs and text/select inputs, and held movement clears on blur, hiding the tab, opening dialogs and entering VR. Desktop framing and its projection offset are cleared on XR entry; headset approach distances and controls remain as before.

The outside sky starts at 2 PM and runs a full six-minute day, 15 seconds per hour, independently of music playback. Sun, moon, stars, sunrise/sunset gradients and procedural drifting clouds change with time. Every 240 seconds, a 32-second storm fades in/out, with 420 exterior rain streaks and two distant lightning strokes; a daylight rainbow fades away afterward. Indoor illumination stays usable through the night. Weather is visual only. Sky/cloud uniforms, one rain draw and small celestial/rainbow geometry avoid extra shadow maps, moving shadow lights, or canvas texture uploads. Timings, projection bounds, navigation routing and dynamic geometry have automated checks; actual headset performance and browser visual rendering need hands-on evaluation.


## Synchronized machine entry

Drum and bass start/stop buttons use the same transport operation. The first machine starts the clock; enabling another during playback or overdubbing queues its pattern on the next complete measure boundary beyond the audio lookahead, without moving the running origin or cursor. Queued entry can be cancelled by pressing its button again. Both machines show a shared beat/step cursor, including bass rests, and a NEXT MEASURE status while waiting. New playback and new recording count-ins reset pending entry gates; transient queue state is not saved with songs.


## VR song saving, part mutes and uncluttered menus

Save automatically finishes an active take (including continuous overdub), stores the song, updates the shelf immediately, and closes the VR naming keyboard only after a confirmed write. A Saving label and inline error sit beside the Save controls. The naming viewpoint is farther back so the full keyboard fits. SongStore bounds database open/transaction waits, keeps a device-local localStorage backup when available, merges it with IndexedDB by ID/time, and acknowledges success only if one persistent store wrote successfully. Storage failures leave the loop and name intact for retry; Cancel/left-stick closes the keyboard. Existing song format and database are retained.

The note screen's instrument rows toggle playback mutes; ALL ON restores every part. Muted notes remain visible but dim, and playback/capture timing continues. Desktop has equivalent labeled buttons. Playback audio routes through per-part gains (including bass and synth effects); live instruments remain playable. The shared room-reverb tail may decay briefly after a percussion mute. Mute state is a temporary listening mix, not a destructive edit or a saved-song change.

Both controllers now have only their mallets/pointer rays, with no wrist panels. Click the left thumbstick to open/close a centered recorder about 1.35 m ahead, or use RECORDER beside the front screen. Menus start closed, Record/Overdub close them for playing, and HEIGHT is available inside. Opening a panel restricts controller actions to that panel and pauses mallet note contacts so buttons cannot accidentally play instruments underneath. Recorder More expands to the right with both sections centered together. Height calibration no longer automatically opens a panel.


## Fuller bass voice

The bass machine now combines a fundamental-rich periodic waveform (fundamental plus restrained second/third/fourth harmonics), a quieter filtered color oscillator, and a restrained sub that fades out below useful low frequencies. The body bypasses the resonant filter; resonance compensation keeps the color from dominating. Its peak envelope gain remains unchanged. A held envelope replaces the previous rapid exponential decay; gaps in a pattern allow sustain up to the decay setting plus 80 ms, while adjacent steps articulate cleanly. All layers follow slides together. Overlapping prior notes release quickly, and Stop releases every oscillator. The forty preset rhythms/pitches are unchanged, with rounder tone settings across their families. Saved older patterns use the new voice without a song-format change.


## Simpler desktop Play view and acoustic steelpan

Desktop starts in the full room overview. The optional Play view isolates one framed instrument. Choose instrument opens a 17-station grid that closes on selection. Explore room restores scenery and walking; right-drag or arrow-key walking also leaves focused Play. VR always restores all station geometry, controller behavior and room scenery. A single bottom transport has Record, Overdub, Stop, Songs and loop options. Music settings groups the room key/mode, tempo, default-on recording metronome and optional note snapping, five-note subset and beat lights. Volume, seated height, teacher media and help are under Settings.

Drum and bass Play cards expose presets and a start/stop button; bass includes five plain-language sound choices. Edit opens the retained full sequencer/sound controls. Synth Play shows only its full physical keyboard plus the sound preset selector; Edit exposes waveform/envelope experiments and advanced effects. On-screen keys are optional. The note-wall Play card shows recorded parts, mutes and loop position; Show notes opens the full piano roll. Saved songs retain naming, playback, load-to-overdub, import and export. Existing song storage and formats are retained.

Steelpan now uses 48 real acoustic recordings (24 original pitches, two dynamic layers) from Jeff Learman's public-domain jSteelDrum v2. Source commit, exact files, encoding changes and license are included under dist/samples/steelpan. Local 96 kbps MP3 assets total about 1.1 MiB and decode to about 23 MiB at 32 kHz (approximately 35 MiB in a 48 kHz audio context). Downloads start in the background; audio activation decodes them before playback, with a visible loading state and retryable errors. Layers crossfade with velocity, sample tails decay naturally, and playback retains per-part routing and a bounded voice pool. No synthesized steelpan fallback is used.

Validation: DOM/Three source integration checks (without a browser or headset), projected playable-note bounds, machine clock regression checks, acoustic asset decoding and sample-player graph/routing/retry/cleanup checks. Actual headset interaction and acoustic listening remain user checks.


## Adjustable stick-click metronome

A dedicated dry stick-impact voice replaces the quiet hi-hat click. Two cached 65 ms buffers use a short impact and damped wood resonances; beat one is brighter and stronger. The default metronome level is 75%, with a separate 0–100% slider and Test click in Music settings. VR Recorder > More has Quieter / Louder buttons in 10-point steps and a percentage label. Level is remembered on this device and affects both record and continuous overdub, including count-ins. Clicks go directly to the master output, respect master mute/volume, and bypass instrument capture, part mutes and reverb. The existing clock and metronome on/off behavior are retained.


## Unified Song Station (version 27)

The front note screen, left-thumbstick VR menu and desktop dock share one control order and palette: New Song, Record, Overdub, Play, Stop. Save Song, My Songs, Undo Last Note and More form the second row. The current song name, recording status and four measure markers remain visible. Overdub keeps its name while showing Finish or Cancel when active; next-measure joining is automatic during playback. Advanced undo, metronome, sensitivity, tempo, lighting and height controls live under More. The redundant rear station was removed in version 29; My Songs is at the front Song Station.

New Song stops playback and offers Save & New, Start Fresh or Cancel when the current recorder contains music. Save & New clears only after a confirmed save; a failure leaves the song and naming panel intact for retry. Start Fresh clears notes, drum/bass accompaniment and editable machine patterns, resets part mutes and the title, and removes the unfinished-loop recovery snapshot. Tempo and room tuning stay at the player's current settings. VR naming and My Songs open at the current viewpoint without moving the player to the back of the room.

Validation: `node tests/song-station.mjs` uses real Three.js geometry with a mocked canvas and audio/storage boundaries to check matching controls, preservation of dynamic markers through batching, Save & New / Cancel / failed-save retry, machine-pattern reset, desktop saving and in-place VR naming. This does not replace a Quest headset check.


## Public shared listening room (version 28)

A doorway at the rear leads to a separate lounge with seating, Newest/Random browsing, a live note display, independent Play/Pause/Stop and volume. The desktop Listen button and instrument chooser enter the same room. My Songs provides Share Song next to each local recording, including in VR. An explicit share confirmation sends only a validated musical snapshot with a placeholder title; the server independently validates and assigns a generated public title. Private titles, usernames, comments, arbitrary text, URLs and external audio are not published. Empty songs and oversized/invalid payloads are rejected. No recordings are seeded into the gallery.

Public songs are stored as musical events in the Sites D1 database. Anyone with the link may submit; no sign-in or approval queue is required. Per-device/network submission cooldowns and hourly limits reduce casual spam. Retried submissions are idempotent. Reports are deduplicated and visible to the owner, with no public comments. Publishers can remove their submissions from the originating browser using a private deletion receipt; the owner can sign in through the desktop Room owner link and remove any song. Owner authorization is enforced on the server using the Sites authenticated headers and the configured owner email. Rate-limit identities are hashed with a runtime secret; raw addresses are not stored.

The existing static app is retained, with a small bundled Worker for gallery endpoints and static assets under `dist/client`. `npm run db:generate` generates schema-only Drizzle migrations; `npm run build` creates the Worker and asset output. Tests use an actual in-memory SQLite database for upload/list/read/report/delete, privacy filtering, cooldowns, authorization, idempotence and pause/resume. A full mocked DOM/Three.js startup and lounge navigation check passed; browser/headset interaction remains to be checked on hardware. Each visitor hears their own selection; this is not synchronized multiplayer audio.

## One main song station (version 29)

Removed the old rear Listening Lab station, its speakers and seats, and its entries in desktop/VR station navigation. The front Song Station retains New Song, Record, Overdub, Play, Stop, Save Song and My Songs in the same familiar layout. Its initialization now creates the VR naming keyboard so Save and Rename remain available anywhere. Private song storage and the separate public listening room are unchanged. Teacher media remains accessible under Settings.

## Acoustic gong and wind chimes (version 30)

The vacant rear station area now holds a bronze gong and six individually playable chime tubes. Both use bundled CC0 acoustic recordings (psuess and perrydolia; full sources and adaptations in `dist/samples/resonant/CREDITS.txt`). The chime is tuned from its measured ~587.3 Hz partial and follows the room harmony; the gong keeps its natural pitch. Gentle and firmer strikes change level and brightness; ringing tails overlap. Loading is retriable, and twenty active ringing voices cap audio cost. Recorded playback routes through existing part-mute gains and fades on transport stop.

VR mallets and pointer triggers work on both. Desktop uses Space for gong and Q W E R T Y for chimes, plus click/touch controls. Round-surface mallet collision avoids sounding empty corners around the gong. Desktop framing includes the entire stand. Live and replayed notes glow, record and overdub, survive local saving/export/import, show named parts on the note wall, and publish/play through the shared listening room. No database schema changes.

Validation: real Three.js geometry and mallet sweeps, room batching, recording/playback roundtrip, gallery validation, sample decoding/spectrum/peak checks, and mocked Web Audio load/retry, scheduling, tuning, routing, voice limits and cleanup. Physical Quest feel and speaker listening remain unverified.

## Listening-room browser and visualization (version 31)

The separate room now shows six directly selectable song titles per page in both VR and desktop, with All Songs (newest first), Recently Played and My Shared Songs collections. Page counts and Back / More Songs controls make the full collection discoverable. Recently Played keeps up to 60 unique successful plays on this device; My Shared Songs resolves the existing publisher receipts, including uploads from earlier versions. Hidden/deleted songs are excluded from both collections. Switching collection or page preserves Now Playing and playback. Private history and deletion receipts are never published.

Share a Song opens the saved-song chooser, then confirms publication under an automatic title. The success message names the public copy and includes Play it. An empty chooser leads back to the front Song Station. Four wide song choices per page keep the VR chooser readable. Report/removal remain in each song's options; owner controls remain available.

An audio analyser on the public playback bus drives a canvas visualization of ribbons, low-frequency ripples and high-frequency sparkles. It replaces only the listening-room note display. The front note wall is unchanged. The 960×280 texture updates only while in the room or while its desktop browser is open (up to 15 fps in VR, 25 fps desktop); there are no added lights or full-screen postprocessing.

Backend changes add counted pagination and bounded public-metadata lookups; no database schema changes or seeded songs. Tests cover all pages of a 14-song collection, bounds after deletion, metadata privacy, older publisher receipts, history persistence and deduplication, stale requests, stable playback across collections, and sharing. Targeted DOM/Three.js and real-canvas checks cover both list layouts, selecting titles, tab/page controls, sharing/empty/success states and audio response. Physical Quest and full-browser visual QA remain unverified.

## Reach, recovery and navigation (version 32)

The shared Song Station control row now includes Undo Note and Undo Take. Undo Take restores the full snapshot from before the current or latest recording/overdub and stops playback; count-in cancellation preserves the previous completed take's undo. Loading or starting a new song clears take history. Practice status explicitly says notes are not being recorded. Short start/end recording cues bypass note capture and respect master volume.

Instrument adjustments are 5 cm steps, with height bounded to ±25 cm and reach to −20/+25 cm along each station's facing direction. They are device-local preferences, apply to the actual geometry and mallet collision transforms, and reset independently for each instrument. Raised floor instruments have a supporting plinth. Desktop has Adjust reach beside instrument controls; VR has More → Reach / Height. Seated calibration remains independent.

Desktop navigation and the left-thumbstick VR menu use Instruments, Song Station and Listening Room. The instrument chooser excludes utility stations; VR shows six instruments per page. Performance check is in Settings on desktop and More in VR. It samples recent frame intervals with fixed memory, resets across display modes and visibility changes, and reports observed FPS and the 95th-percentile frame time. It is not a hardware benchmark. The audio scheduler still runs every 25 ms; periodic transport UI refresh is limited to 100 ms, with immediate state-change feedback.

Validation: `npm test` includes recording/overdub undo and song boundaries, latest-note order, moved-geometry mallet collision, placement persistence and limits, frame sampling and direct cue routing. DOM/Three.js checks exercised reach controls, reset, the performance readout, desktop selection and VR pagination. Physical Quest performance and comfort still require headset testing.

## MIDI keyboard input (version 33)

Settings → MIDI keyboard → Connect keyboard requests Web MIDI access without SysEx. Choose one input; a single connected device is selected automatically. The input plays the currently selected instrument on any MIDI channel. MIDI is opt-in for the current visit, with clear unsupported-browser, denied-permission, no-input and disconnected states. VR exposes MIDI under More → Reach / Height → MIDI keyboard; connecting before entering VR is the simplest workflow. No device data is uploaded.

Pitched input is matched against the actual playable meshes and their current MIDI numbers, after the optional five-note filter. There is no octave folding, quantizing incoming pitch, pitch bending or extra bar creation. Xylophones, metallophones and glockenspiel retain exactly 13 physical notes before the optional subset; a G tuning replaces F with F-sharp, and F-major/D-minor tuning replaces B with B-flat. Natural F/B are then unavailable where replaced. Steelpan, boomwhackers, wind chimes and the 25-key synth similarly use only their existing displayed notes. The panel lists exact accepted MIDI numbers because hardware octave labels differ.

Drum triggers: 36 kick, 38 snare, 39 clap, 42 hi-hat. Single percussion triggers: 70 maracas, 54 tambourine, 56 cowbell and 60 gong, preserving their existing unpitched sounds. The bass machine retains its step sequencer and is not a live MIDI target. Utility screens do not play MIDI.

Velocity controls strike strength. Synth note-off, zero-velocity note-on and CC64 sustain work per MIDI channel. CC120/123 release the channel; CC121 releases its sustain pedal. Pitch bend, program changes, clock and SysEx are ignored. Instrument/tuning changes, Stop, device changes/disconnection, focus loss and MIDI off release held notes. Accepted notes use the existing audio, visual and recording paths, so unavailable input is never captured. MIDI output and standard MIDI-file import/export are not included.

`tests/midi-input.mjs` checks every MIDI pitch against real Three.js barred-instrument geometry in every room tuning, exact accidental replacements, range/subset limits, simulated device input, velocity, recorded synth duration, pedals, multiple channels, ignored messages and permission/device lifecycle. Additional DOM checks cover the settings panel and input selection. Tests use simulated MIDI ports; a physical controller/browser check remains necessary. API reference: https://www.w3.org/TR/webmidi/

## Warm studio design (version 34)

The room uses deep teal walls, warm wood floors/beams/frames, cream ceiling surfaces and amber accents. Terracotta floor inlays mark wood instruments, sea-green marks metal instruments, and a muted plum runner ties the electronic wall together. The steelpan and mobile keep their central positions. Drum, bass and synth bays share a consistent wood frame and header treatment. The Song Station has a matching wood surround and a larger title.

The listening room adds upholstered seats, framed acoustic wall panels, a bordered rug and a wood-framed visualization screen. Existing walking routes, instrument coordinates, adjustable reach and MIDI inventories stay intact. Metal-bar and steelpan note labels retain their original dark ink when room tuning updates them.

The existing three shadow-free fill lights use softer colors and lower intensity; beat response uses slow warm color changes and gentle brightness variation. Nighttime ambient light remains usable. New trim and furnishings use static geometry eligible for the existing batching, with no additional shadow-casting lights, post-processing or external image downloads.

Desktop styling is coordinated in `studio-theme.css`. The selected instrument and Song Station share one centered, bounded-height bottom dock. Family accents also appear in the instrument chooser. Controls, dialogs, play view and the gallery use the same teal/cream palette; VR hides the desktop dock. Advanced settings remain in their existing menus.

Validation: existing recording/gallery/MIDI/reach tests passed. DOM/Three.js smoke checks exercised the refreshed room, gallery, dock and controls, retained three shadow-free accent lights, and batched room decoration. No physical-headset or full browser visual check was available in this environment.

## Compact desktop and touch controls

Record, Play and Stop remain visible in a compact transport strip. Song tools expands New Song, Overdub, Save Song, My Songs, Mixer, Perform, More and the first-song guide; selecting Song Station also opens this tray. Reach adjustment and MIDI connection remain in Settings. Instrument selection, optional on-screen keys and the instrument-specific editor stay available. The room geometry, VR controls, audio engine and saved-song formats are unchanged.
