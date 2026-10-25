# Drew’s 8-Bit Lounge

Buildless NES player. Static files are served from `dist/`. Emulation is provided by the vendored JSNES 2.1.0 core (Apache 2.0; license distributed in `dist/vendor/`). No commercial ROMs are bundled. Local ROMs, battery RAM and save slots are stored in the browser's IndexedDB; no ROM upload API exists.

Features: local iNES ROM import, remembered cartridges, three save slots per cartridge, state JSON export/import, stereo AudioWorklet audio, keyboard and two standard gamepads, touch controller, pause/reset, fullscreen, optional scanlines. NES 2.0 is rejected explicitly; mapper support follows JSNES. Hardware controller compatibility has not been physically tested.

`python scripts/build-demo.py` builds the original Star Circuit NROM demo. `node scripts/test-emulator.mjs` tests cartridge boot, rendering, controls, boost, non-silent audio, snapshot restoration, and collectible scoring. `node --check dist/app.js` checks application syntax.

Keyboard: arrows move, X=A, Z=B, Enter=Start, Shift=Select, S=Turbo A, A=Turbo B, P=pause, F=fullscreen, M=mute. Second player uses numpad 8/2/4/6, 7/9, 1/3. Browser UI automatically pauses when focus or visibility is lost.
