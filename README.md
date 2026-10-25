# Mr. Drew’s Music Arcade

[Open the arcade](https://musicaldrewby.github.io/music_teacher/) · [Simple app directory](https://musicaldrewby.github.io/music_teacher/directory.html)

Created by Drew Wichman. This repository contains the arcade and all 20 apps from its October 25, 2026 collection, including their HTML, JavaScript, styles, images, instrument samples, soundfonts, music, and bundled libraries.

| App | Website | Folder under `apps/` |
| --- | --- | --- |
| Mallet & Measure — Free Classroom Edition | [Open app](https://musicaldrewby.github.io/music_teacher/apps/mallet-measure-free/) | `mallet-measure-free` |
| Mr. Drew’s Autoharp | [Open app](https://musicaldrewby.github.io/music_teacher/apps/mr-drews-autoharp/) | `mr-drews-autoharp` |
| Poison Rhythm | [Open app](https://musicaldrewby.github.io/music_teacher/apps/poison-rhythm/) | `poison-rhythm` |
| Orbit — Polyrhythm Studio | [Open app](https://musicaldrewby.github.io/music_teacher/apps/orbit-polyrhythm-studio/) | `orbit-polyrhythm-studio` |
| Mr. Drew's Uke Strum | [Open app](https://musicaldrewby.github.io/music_teacher/apps/drew-uke-strum/) | `drew-uke-strum` |
| Mr. Drew's Pocket Orff | [Open app](https://musicaldrewby.github.io/music_teacher/apps/pocket-orff/) | `pocket-orff` |
| Interactive Xylophone | [Open app](https://musicaldrewby.github.io/music_teacher/apps/interactive-xylophone/) | `interactive-xylophone` |
| Mr. Drew's Animated Vocal Explorations | [Open app](https://musicaldrewby.github.io/music_teacher/apps/mr-drew-vocal-explorations/) | `mr-drew-vocal-explorations` |
| Boomwhacker Play-Along — Teacher Edition | [Open app](https://musicaldrewby.github.io/music_teacher/apps/drews-boomwhacker-creator/) | `drews-boomwhacker-creator` |
| Mr. Drew's Rhythm Builder | [Open app](https://musicaldrewby.github.io/music_teacher/apps/mr-drews-rhythm-builder/) | `mr-drews-rhythm-builder` |
| Movement Stoplight | [Open app](https://musicaldrewby.github.io/music_teacher/apps/drews-movement-stoplight/) | `drews-movement-stoplight` |
| Sneaky Cat | [Open app](https://musicaldrewby.github.io/music_teacher/apps/sneaky-cat/) | `sneaky-cat` |
| Mr. Drew’s Name That Tune! | [Open app](https://musicaldrewby.github.io/music_teacher/apps/mr-drews-name-that-tune/) | `mr-drews-name-that-tune` |
| Four in a Row | [Open app](https://musicaldrewby.github.io/music_teacher/apps/classroom-connect-four/) | `classroom-connect-four` |
| Mr. Drew's Name That Note Challenge | [Open app](https://musicaldrewby.github.io/music_teacher/apps/mr-drews-name-that-note/) | `mr-drews-name-that-note` |
| Soundroom | [Open app](https://musicaldrewby.github.io/music_teacher/apps/soundroom/) | `soundroom` |
| Mr. Drew’s Music Lab · VR | [Open app](https://musicaldrewby.github.io/music_teacher/apps/drews-music-lab-vr/) | `drews-music-lab-vr` |
| Round Helper | [Open app](https://musicaldrewby.github.io/music_teacher/apps/round-helper/) | `round-helper` |
| Mr. Drew's Production Media Player | [Open app](https://musicaldrewby.github.io/music_teacher/apps/mr-drews-production-media-player/) | `mr-drews-production-media-player` |
| From Tips to Tours | [Open app](https://musicaldrewby.github.io/music_teacher/apps/from-tips-to-tours/) | `from-tips-to-tours` |

## Hosting

The existing `main` branch and GitHub Pages publishing location are retained. The arcade is at the repository root; each app has its own folder under `apps/`. `.nojekyll` makes these static files publish unchanged. No ChatGPT sign-in is needed for the public apps.

Nineteen apps run entirely as static websites. **Music Lab VR’s shared Listening Room still uses its existing server and database** at `drews-music-lab-vr.musicaldrewby.chatgpt.site`. Its complete browser and server code are included here; GitHub Pages cannot run that database server. Private song saving and file export/import stay on the visitor’s device. Owner moderation continues through the original Music Lab website. The server accepts the GitHub website as a client, with the original validation, rate limits, publisher deletion tokens, and owner access restrictions.

## Existing saved work

Browser storage belongs to a website address. Songs, arrangements, favorites, uploaded audio, and game progress previously saved in a ChatGPT Site do not automatically appear at its new GitHub address. Use each app’s export/import controls to transfer supported projects. The original sites are retained so existing saved work remains accessible. No visitor database contents or private songs are copied into this public repository.

## Source and assets

`apps/` contains the runnable applications. `source/<app>/` preserves the accompanying original source modules, build scripts, tests, documentation, artwork and music source files outside each original `dist` folder. To reconstruct an original working project, copy that source folder into a new directory, then copy `apps/<app>/` into its `dist/` folder. `source/arcade/` contains the arcade’s companion source material; its runtime files are at the repository root. Original Git history remains in Sites, and original source commit IDs are recorded in `migration/apps.json`.

Fonts and browser libraries formerly loaded from CDNs are bundled locally. Their source URLs and checksums are recorded in `migration/font-sources.json`; existing bundled licenses and asset credits are retained. Links to YouTube, teaching references, Teachers Pay Teachers, and Buy Me a Coffee remain external destinations.

## Migration record

`migration/assets.json` records the source URL and SHA-256 hashes for every app file, plus the reviewed path/link adjustments. `migration/import_assets.py` imports that exact snapshot and refuses content drift. The one-time import workflow runs only on `migration/complete-arcade-2026-10-25`; it does not continuously synchronize or overwrite future changes on `main`.

The previous homepage is preserved in branch `backup/arcade-before-app-migration-2026-10-25`.

## Additional projects

[26 additional app projects](additional-apps/README.md) are stored under `additional-apps/` for source import and further development. They are intentionally absent from the arcade homepage and simple app directory. Their full project layouts and bundled assets are preserved; framework/server projects require their own build/runtime.
