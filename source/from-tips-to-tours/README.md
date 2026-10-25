# From Tips to Tours

A browser-local pixel-art idle musician game, created for Drew Wichman.
Working title and art direction approved in the originating conversation.

## Run and deployment

This is buildless ES-module HTML/CSS/JavaScript. `dist/` is the deployed site.
The tracked `.openai/hosting.json` contains the existing Site identity; always
reuse it. The Sites workflow owns source synchronization and publication.

`npm test` runs the economy and save-model checks. `npm run balance` runs the
documented long-horizon progression simulations and writes their results to
`notes/economy-simulation.json`.

## Important boundaries

- Saves are local to the browser; there is no cloud-save service in this edition.
- A local storage lease prevents two tabs from earning on the same save at once.
- Save export/import is available in Settings. Import is confirmed and validated.
- Offline income uses the saved production rate and elapsed wall-clock time,
  capped at 24 hours initially and up to 96 with tour logistics.
- Imported audio is stored in IndexedDB separately from career saves.
- No ads, payments or ad-network SDKs are active. A future portal release needs
  that portal's integration and approval.
- The soundtrack is synthesized and SNES-inspired; it is not SPC hardware emulation.
- Browser visual/interaction QA was unavailable in the managed build environment.
  Pure-model tests, syntax, DOM-reference and asset checks were completed.

## Content architecture

- `dist/content.js`: chapters, 48 milestones, 24 income sources, gear, trophies,
  and the default music catalog. Content remains separate from the economy.
- `dist/engine.js`: deterministic idle/click earnings, prices, unlocks, prestige,
  and validated save schema.
- `dist/app.js`: UI, local saves, offline reports, dialogs, imports and multi-tab ownership.
- `dist/scene.js`: steady camera, pixel-art environments and bounded sprite animation.
- `dist/audio.js`: independently replaceable tracks and browser-local music library.
- `dist/icons.js` and `tools/make_font.py`: original code-native interface artwork.

The main scene uses original generated environment atlases. Characters remain
separate sprites. This is not a clickable picture of the approved concept UI.
The main interface, balances, buttons, progress bars and shop are live elements.

## Changing music

Players can use Soundtrack to add MP3/WAV/OGG/FLAC audio or replace a named
career slot in this browser. Restore returns a slot to its default track.
For a release-wide change, replace an asset and edit `TRACKS` in `content.js`.
Keep stable slot IDs (`garage`, `headliner`, `cosmic`) so saves remain compatible.
Do not attach economy effects to a particular recording or its duration.

The three provided original WAV loops have precisely aligned endings.
The separate soundtrack source pack created earlier contains MIDI, stems,
and the synthesizer that generated them. They are placeholder music, approved
as replaceable by the user.

## Balancing

The initial simulation exposed a five-hour full career due to multiplying too
many gear bonuses. The revised economy uses additive gear bonuses within a
category, longer source payback times across the career, and logarithmic Legend
growth. Milestone multipliers remain meaningful. Simulations are illustrative
strategies, not completion-time promises. Real-player feedback is still needed.

Avoid lengthening the game solely by adding waits. Add distinctive venues,
authored upgrades, new musical arrangements and permanent discoveries alongside
economic tuning. Keep clicks useful but optional after the opening.

## v0.2 — One Window Open

The opening-career pass adds a separate Live Jam mode. It plays an original
eight-bar song at 112 BPM, using six lesson-dependent guitar arrangements
(levels 0, 1, 3, 6, 10 and 25). Weekend Sessions brings Jules and drums;
Resident Band adds bass; keyboard gear adds keys. A short look-ahead audio
scheduler follows its own clock, so no rhythm timing is required to earn cash.
Imported and default recordings remain playable and replaceable independently.

The new equipment atlas provides purchased acoustic/electric guitars on stands,
practice amp/stack tiers, a pedalboard and a home-studio award. Demo tapes pile
up with demo purchases. The existing performer art remains unchanged.

Fourteen authored story moments are discovered without blocking play. Pages
are replayable, persist through both Encore scopes, and do not modify earnings.
Older version-1 saves migrate the new optional fields while retaining their
progress and soundtrack choice. New careers default to Live Jam, with music
off until explicitly started; existing careers keep their selected recording.

`performance.js` owns presentation progression and story conditions;
`arrangement.js` owns the original score; `live-jam.js` owns synthesis and timing.
Twenty automated checks cover the economy, backward compatibility, stories,
score bounds and asynchronous recording/Live Jam switching. Browser rendering,
interaction and listening checks remain unavailable in this build environment.

## v0.3 — A Little Encouragement

Crowds now use original rear-view pixel sprites with tapered shoulders, visible
necks/ears, varied hairstyles, jackets, bent elbows and hands. Waving, overhead
clapping, listening and phone-recording poses animate independently. Larger
venues add a staggered foreground row; cosmic venues mix in alien spectators.
Private bedroom/home/studio scenes still have no audience. The performer,
equipment, backgrounds and camera remain at their established positions.
`crowd.js` caches each small sprite frame instead of rebuilding its geometry on
every stage frame. Animation follows the existing motion preference.

A visible-stage Fan Tip appears after 75 seconds of eligible play, then waits
120–180 seconds after collection/expiry for the next one. One tip at a time is
available for 22 seconds. Clicking it grants the greater of five normal clicks
or 8–14 seconds of current idle income, calculated when it appears and capped
again when collected. No fan grants or multiplying income buffs are attached.
Ignoring one loses nothing. The waiting clock and active tip persist in saves;
offline earnings do not advance this clock or bank collectible rewards.

Tips pause while the document is hidden, less than a quarter of the stage is
visible, a dialog is open, another tab owns the career, or the control is hovered
or keyboard-focused. Enter/Space collects the native button, without also
performing a note. Reduced motion keeps the tip stationary. Collection saves
immediately and clears the pending reward before adding money; a double tap
cannot collect twice. Encore clears pending tips and retains collection records
with a cooldown of at least 120 seconds. Existing version-1 saves receive these
optional fields automatically. The settings record shows collected tip totals.

Validation: 28 passing automated checks, including save migration, duplicate
collection, cooldowns, expiry, offline exclusion, reward bounds, Encore resets,
control ownership, keyboard focus and reduced motion. The actual canvas scene
was rendered with a native canvas renderer and visually inspected at street,
club, arena and cosmic venues. Browser-level layout and interaction verification
was unavailable in the managed environment; no browser preview was run.
