# Google AI Studio app import preparation

Prepared October 25, 2026 for Drew Wichman.

Status: inventory verified. No individual repositories or AI Studio projects have been created by this migration yet. Repository creation awaits GitHub browser sign-in. AI Studio is signed in and its GitHub importer can see music_teacher on main. The current importer says imported code will not stay synced with GitHub.

Scope: 46 apps (20 arcade apps and 26 additional apps), 5,030 source and asset files. Each app is planned as a separate repository and AI Studio project. Existing arcade files, index links, and original Sites stay unchanged; additional apps are not added to the arcade index.

The inventory pins each source to an exact GitHub commit. Planned repository names are destinations, not proof that those repositories exist.

## Runtime preparation

- 40 static apps: retain their existing HTML, JS, CSS, images, samples and licenses. Add a minimal Node dev/start server that serves dist and handles byte-range media requests.
- Music Lab VR: preserve the static app plus original server source. Its shared Listening Room uses the existing external server; cross-origin access must be checked in AI Studio.
- Five Cloudflare/Vinext studios (Chroma Orchestra, Prism Motion Studio, Living Background Engine, Motion Layer Studio, Felt & Fable Studio): preserve full source and assets, then adapt or validate the runtime and any storage/MCP routes for AI Studio. Source import is not proof of a working runtime.
- Preserve existing package scripts and original build configurations in a backup before adjustments. Do not replace the apps with simplified recreations.
- Keep cloud-hosting identities, credentials, private user data and node_modules out of new import repositories.

## Apps

| App | Source branch | Planned repository | Runtime |
| --- | --- | --- | --- |
| Mallet & Measure — Free Classroom Edition | main | musicaldrewby/mallet-measure-free | static |
| Mr. Drew’s Autoharp | main | musicaldrewby/mr-drews-autoharp | static |
| Poison Rhythm | main | musicaldrewby/poison-rhythm | static |
| Orbit — Polyrhythm Studio | main | musicaldrewby/orbit-polyrhythm-studio | static |
| Mr. Drew's Uke Strum | main | musicaldrewby/drew-uke-strum | static |
| Mr. Drew's Pocket Orff | main | musicaldrewby/pocket-orff | static |
| Interactive Xylophone | main | musicaldrewby/interactive-xylophone | static |
| Mr. Drew's Animated Vocal Explorations | main | musicaldrewby/mr-drew-vocal-explorations | static |
| Boomwhacker Play-Along — Teacher Edition | main | musicaldrewby/drews-boomwhacker-creator | static |
| Mr. Drew's Rhythm Builder | main | musicaldrewby/mr-drews-rhythm-builder | static |
| Movement Stoplight | main | musicaldrewby/drews-movement-stoplight | static |
| Sneaky Cat | main | musicaldrewby/sneaky-cat | static |
| Mr. Drew’s Name That Tune! | main | musicaldrewby/mr-drews-name-that-tune | static |
| Four in a Row | main | musicaldrewby/classroom-connect-four | static |
| Mr. Drew's Name That Note Challenge | main | musicaldrewby/mr-drews-name-that-note | static |
| Soundroom | main | musicaldrewby/soundroom | static |
| Mr. Drew’s Music Lab · VR | main | musicaldrewby/drews-music-lab-vr | static-with-external-backend |
| Round Helper | main | musicaldrewby/round-helper | static |
| Mr. Drew's Production Media Player | main | musicaldrewby/mr-drews-production-media-player | static |
| From Tips to Tours | main | musicaldrewby/from-tips-to-tours | static |
| Circuit 16 — Sequencing Studio by Drew Wichman | additional-apps | musicaldrewby/drew-circuit-16 | static |
| Drew’s 8-Bit Lounge — NES Emulator | additional-apps | musicaldrewby/drews-8bit-lounge | static |
| Rewind Room · 1989 | additional-apps | musicaldrewby/drew-rewind-room-1989 | static |
| Movie Rental Empire | additional-apps | musicaldrewby/movie-rental-empire | static |
| Chroma Orchestra | additional-apps | musicaldrewby/chroma-orchestra | cloudflare-vinext |
| Prism Motion Studio | additional-apps | musicaldrewby/prism-motion-studio | cloudflare-vinext |
| Mallet & Measure — The Orff Ensemble Studio by Drew Wichman | additional-apps | musicaldrewby/orff-studio-atelier | static |
| Morning Pledges | additional-apps | musicaldrewby/morning-pledges | static |
| Mr. Drew’s Beginning Band Board | additional-apps | musicaldrewby/mr-drews-beginning-band-board | static |
| Living Background Engine | additional-apps | musicaldrewby/living-background-engine | cloudflare-vinext |
| Mr. Drew’s Play-Along Studio | additional-apps | musicaldrewby/mr-drews-play-along-studio | static |
| Drew’s Music Engine | additional-apps | musicaldrewby/drews-music-engine | static |
| Mr. Drew’s Four Corners Studio | additional-apps | musicaldrewby/mr-drews-four-corners-studio | static |
| Mr. Drew's Uke Strum — Teacher Studio | additional-apps | musicaldrewby/drew-uke-strum-teacher-studio | static |
| Boomwhacker Play-Along — Creator Edition | additional-apps | musicaldrewby/drews-boomwhacker-creator-private | static |
| Pixel Palace Casino | additional-apps | musicaldrewby/pixel-palace | static |
| Music Sketchbook | additional-apps | musicaldrewby/drews-music-sketchbook | static |
| Radical Recorder | additional-apps | musicaldrewby/radical-recorder | static |
| Mr. Drew's Bingo Maker | additional-apps | musicaldrewby/mr-drews-bingo-maker | static |
| Train Window Studio | additional-apps | musicaldrewby/train-window-studio | static |
| Motion Layer Studio | additional-apps | musicaldrewby/motion-layer-studio | cloudflare-vinext |
| FLUID SPACE | additional-apps | musicaldrewby/fluid-space | static |
| Felt & Fable Studio | additional-apps | musicaldrewby/felt-and-fable-studio | cloudflare-vinext |
| Music Whiteboard | additional-apps | musicaldrewby/music-whiteboard | static |
| Sound Garden | additional-apps | musicaldrewby/sound-garden-playground | static |
| Mr. Drew’s Music Classroom | additional-apps | musicaldrewby/drews-music-classroom | static |
