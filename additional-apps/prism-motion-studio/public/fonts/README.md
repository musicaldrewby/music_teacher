# Font collection

All 16 bundled fonts are unmodified static TrueType files from the Google Fonts source repository. Each is licensed under the SIL Open Font License 1.1; the corresponding complete OFL notice is included alongside the font. These fonts may be bundled with the application and used for commercial and personal artwork under their respective license terms.

## Catalog

| Font | Style | File | License |
| --- | --- | --- | --- |
| Bangers | Comic | Bangers-Regular.ttf | bangers-OFL.txt |
| Bungee | Bold signage | Bungee-Regular.ttf | bungee-OFL.txt |
| Lilita One | Rounded bold | LilitaOne-Regular.ttf | lilitaone-OFL.txt |
| Pacifico | Brush script | Pacifico-Regular.ttf | pacifico-OFL.txt |
| Lobster | Retro script | Lobster-Regular.ttf | lobster-OFL.txt |
| Kalam | Handwritten bold | Kalam-Bold.ttf | kalam-OFL.txt |
| Bebas Neue | Condensed | BebasNeue-Regular.ttf | bebasneue-OFL.txt |
| Audiowide | Futuristic | Audiowide-Regular.ttf | audiowide-OFL.txt |
| Black Ops One | Stencil | BlackOpsOne-Regular.ttf | blackopsone-OFL.txt |
| Press Start 2P | Pixel | PressStart2P-Regular.ttf | pressstart2p-OFL.txt |
| Abril Fatface | Editorial serif | AbrilFatface-Regular.ttf | abrilfatface-OFL.txt |
| DM Serif Display | Elegant serif | DMSerifDisplay-Regular.ttf | dmserifdisplay-OFL.txt |
| Space Mono | Monospace | SpaceMono-Regular.ttf | spacemono-OFL.txt |
| Anton | Bold condensed sans | Anton-Regular.ttf | anton-OFL.txt |
| Coiny | Playful rounded | Coiny-Regular.ttf | coiny-OFL.txt |
| Titan One | Heavy cartoon | TitanOne-Regular.ttf | titanone-OFL.txt |

## Integration notes

- `manifest.json` is the runtime catalog; its `file` and `licenseFile` fields are public URL paths.
- All files are static fonts with full printable ASCII coverage. Character coverage beyond ASCII differs by family.
- Some display families intentionally render lowercase letters in an uppercase design.
- Connected script fonts such as Pacifico and Lobster need a shaping-aware text layout to reproduce all font ligatures and contextual connections. Basic Three.js TTFLoader/FontLoader extrusion does not perform full OpenType shaping.
- Per-letter animation naturally separates letters; script text usually works best as one object with modest extrusion and bevel.
- Thin serif and script features need smaller bevels than heavy display fonts.
- Font files have not been subsetted or altered.

## Original sources

- Bangers: https://github.com/google/fonts/tree/main/ofl/bangers
- Bungee: https://github.com/google/fonts/tree/main/ofl/bungee
- Lilita One: https://github.com/google/fonts/tree/main/ofl/lilitaone
- Pacifico: https://github.com/google/fonts/tree/main/ofl/pacifico
- Lobster: https://github.com/google/fonts/tree/main/ofl/lobster
- Kalam: https://github.com/google/fonts/tree/main/ofl/kalam
- Bebas Neue: https://github.com/google/fonts/tree/main/ofl/bebasneue
- Audiowide: https://github.com/google/fonts/tree/main/ofl/audiowide
- Black Ops One: https://github.com/google/fonts/tree/main/ofl/blackopsone
- Press Start 2P: https://github.com/google/fonts/tree/main/ofl/pressstart2p
- Abril Fatface: https://github.com/google/fonts/tree/main/ofl/abrilfatface
- DM Serif Display: https://github.com/google/fonts/tree/main/ofl/dmserifdisplay
- Space Mono: https://github.com/google/fonts/tree/main/ofl/spacemono
- Anton: https://github.com/google/fonts/tree/main/ofl/anton
- Coiny: https://github.com/google/fonts/tree/main/ofl/coiny
- Titan One: https://github.com/google/fonts/tree/main/ofl/titanone
