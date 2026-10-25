# Pixel Palace Casino

A browser-local virtual nickel casino. The first playable cabinet is 8-Bit Jackpot, with six retro game characters, five reels, three rows, and twenty selectable paylines. Three additional cabinets are deliberately unavailable on the casino floor. Edition two uses the official game-character artwork linked in ARTWORK-SOURCES.md.

## Play

- Start with 2,000 complimentary virtual credits. One credit represents five virtual cents.
- Select 1 / 5 / 10 / 15 / 20 paylines and 1–5 credits per line. MAX BET only selects the bet; SPIN starts play.
- Match characters from the leftmost reel. Each active line pays its highest eligible combination.
- Controllers on three or more distinct reels award free-game choices: 12 games at 1×, 6 at 2×, or 4 at 3× line wins for a three-reel trigger. Four/five reels increase the game counts. A controller trigger during free games retriggers extra spins. Controllers also pay scatter credits.
- Wild takeovers add stars before winnings are evaluated. New free-game modes have more frequent takeovers and reset wilds on each spin. Existing saved first-edition features keep their locked wilds.
- Chests on three or more reels unlock a match-three prize reveal. Keep choosing until three MINI / MINOR / MAJOR / GRAND symbols match. The fixed awards are 5× / 10× / 50× / 250× the triggering bet. The weighted award is drawn at entry, then the tiles are shuffled.
- Reels animate continuously downward through their final positions, with deceleration, staggered stops, and anticipation after two matching bonus symbols. STOP completes the animation without changing the settled outcome. Big / Super / Mega win count-ups can be skipped with COLLECT.
- Sound is synthesized with Web Audio. No ambient casino recordings or external audio dependencies are used.
- Balance, settings, resolved outcomes and unfinished features are saved in localStorage. A spin settles once before its animation; reloading cannot repeat the payout. Treasure prizes are fixed when the bonus is created; every reveal is saved, and the prize pays once on the third matching symbol. Saved first-edition pick-three bonuses remain playable.

All credits are pretend. There are no purchases, deposits, cash prizes, or cash-out. This is an independent fan-made prototype.

## Source and checks

Buildless HTML, CSS, JavaScript and SVG in `dist/`. No package installation is required.

`node --test tests/engine.test.mjs` runs seventeen focused tests for paylines, payouts, wagers, wild substitutions, scatter triggers, free spins, treasure picks, and restored feature state. `node tests/simulate.mjs` exercises 100,000 paid spins and their bonus sequences with a repeatable seed. That development simulation is not a certified return-to-player guarantee.

Game parameters and symbol data live in `dist/engine.js`. Interaction, persistence and synthesized audio live in `dist/app.js`. The rules panel reads payouts from the engine data.

Browser QA was unavailable in the build environment. Syntax, reference/asset checks, game-engine tests, simulation, and symbol-art rendering were verified.

## Artwork

- `dist/assets/casino.png`: generated using the built-in image-generation tool. Brief: a wide, photorealistic vintage casino at night, a burgundy carpet aisle, slots along both sides, brass trim, amber chandeliers, purple neon, no people or readable text, with a darker central area for interactive cabinets.
- `dist/assets/*.webp`: official character promotional artwork, optimized and served locally. Source pages and image URLs are listed in ARTWORK-SOURCES.md and attributed in the rules panel.
- `dist/assets/symbols.svg`: original code-native special symbols. Its first-edition character portraits are no longer used.

Created for Drew Wichman.
