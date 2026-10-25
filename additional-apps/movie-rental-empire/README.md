# Movie Rental Empire

Created by Drew Wichman. A browser-local video rental management game set in Rewind & Dandy, 1993.

## Implementation

- Buildless static ES modules in `dist/`; no backend or dependencies at runtime.
- `engine.mjs`: deterministic seeded simulation and all financial/inventory mutations.
- `data.mjs`: 30 films, eight regular customers, six applicants, daily events and upgrades.
- `game.mjs`: responsive interface, workstation actions, save import/export, onboarding, reports.
- `scene.mjs`: animated isometric canvas store; film art uses measured atlas crops.
- `audio.mjs`: original synthesized soundtrack and interaction sounds, enabled by user gesture.
- `assets/movie-atlas.png`: original generated illustrations. See ART_NOTES.md.

## Gameplay

Eight-minute shifts at normal speed, with pause, 2x and 4x speeds. One simulated minute per real second. Classic/new-release prices are player-controlled. Films leave physical stock when rented; loans return on future days, may be overdue, and require rewind/reshelving. Friendly/firm/waived-fee reminder calls accelerate returns. Snacks sell according to individual customer demand and budgets. Several employees can work simultaneously; wages accrue by actual simulated minutes worked and are paid at closing. Customers, loans, purchases, upgrades, payroll, and progress persist locally. No offline simulation.

Daily targets, five-checkout streaks, catalog unlocks on days 2/4/7, equipment, shelving, renovation, and managed branch investments provide progression. Branches are a financial extension of the flagship rather than separate playable floors. The game continues after week one.

## Verification

`node tests/engine.test.mjs` exercises copy conservation, reminders, budget and unlock gates, payroll, hiring, save validation, seven full shifts, and expansion prerequisites. `node --check dist/game.mjs` and the other modules check syntax.

`tests/render-scene.mjs` renders the actual scene to a PNG using the runtime's existing @napi-rs/canvas. It is an internal graphics QA helper, not a browser test. Browser QA was unavailable in the initial build environment because the required control-browser skill was not installed. Complete a manual browser playtest before wider release.

Save key: `movie-rental-empire-v1`. Import validates state and inventory conservation before replacing the current save. Export a JSON backup before device changes. Modal dialogs and hidden tabs pause simulation. Keyboard: Space pauses/resumes, 1–4 select workstations.

## Tablet controls

`touch.mjs` and `tablet.css` enable a touch layout on coarse-pointer devices and windows up to 1024px. The persistent toolbar has Store/Manage, pause/open, speed and fullscreen. Management pauses automatically; backgrounding requires explicit resume. Portrait uses a compact scene plus sticky workstations and reachable job panels. Wide landscape keeps jobs beside the scene. Numeric wage/price inputs have large +/- buttons. Touch targets are at least 44px, generally 48–64px. Pinch zoom remains available. Pointer-active job cards are not replaced mid-gesture, and canvas scroll drags do not activate stations.

The canvas preserves its aspect ratio during rotation. Touch rendering is capped at 30fps and 1.5 device pixel ratio; offscreen scenes are skipped. Existing saves and game balance are unchanged. `node tests/tablet.test.mjs` verifies the controller, management pause, number steppers, fullscreen fallbacks, pointer cancellation, and scene-coordinate alignment. This is a controller test with mocked platform elements, not an Android device/browser test.

## Hosting

`.openai/hosting.json` contains the persistent Site identity. Deploy `dist/` using Sites workflow helpers. Preserve that identity and private audience unless the user explicitly requests a change.

## Store-first revision
The room now fills the play area. Workstation panels open from canvas labels (or keyboard 1–4) and close with ×. Management opens over the room and pauses simulation on every screen size. New pixel-art backdrop and block-pixel actors replace the earlier room presentation. Movie cover artwork has no oversized title overlays.

Days 1–3 have slower arrivals and additional patience; days 1–2 limit concurrent guests without counting overflow as losses. Daily goals ramp gradually. Make it yours adds saved store names, three sign colors and cosmetic plants, rug and arcade purchases. Previous version-1 saves receive safe customization defaults.

Verification: seven simulated shifts, save/copy conservation, workforce/economy tests, touch controller and coordinate tests, and native canvas rendering. Full browser and physical Android tablet QA were unavailable in this environment.

## Android room-filling view
The header and bottom dock are hidden in favor of a full-viewport room with compact overlaid status, pause, fullscreen and menu controls. A cropped room camera replaces fitting the entire backdrop into a smaller box. Drag/pinch navigation, a whole-room reset and visible 44px DOM object/customer targets share one coordinate transform. Catalog, staff, snacks, decor and upgrades open directly from room props; all actions are also available in the corner menu. Fullscreen requests landscape orientation when supported and tolerates unsupported orientation locks.

Validation covers landscape framing at 1024×600, 1280×800 and 1920×1080; portrait coordinate mapping; pan limits; pinch/drag versus tap; existing touch and campaign tests. Native canvas render inspected at 1280×800. No browser automation or physical Android device was available. Save format and game balance are unchanged by this pass.

## Neighborhood expansion
All activities are optional and saved in a backward-compatible `expansion` block:
- Eight regulars each have three story chapters at 1/3/6 served visits, $10 chapter rewards and a final room keepsake.
- Three player-booked genre nights unlock on day 3. Setup costs $10–15, modest midshift traffic rises 12%, and a successful goal pays $40–50 at closing. Failed goals have no additional fine.
- Nine named rare editions form three poster collections. Collectors visit on even days from day 4; each $18 offer shows its exact edition, includes a conserved rentable copy and permanently records the collection entry.
- Staff earn XP from successful work; at 8/16/24 jobs they can train a chosen specialty up to three levels. Each paid promotion adds $0.50/hour and improves speed in that role or Help everywhere.
- Actor and critic visits alternate with collectors. Actor welcomes yield a signed headshot, goodwill and $8; accepted critic challenges require three subsequent checkouts for a $25 closing reward. Visits are optional and cannot pay twice.
- At 15/35/65/100 lifetime rentals, claim or purchase a staff-picks wall, deluxe snacks, screening corner and collector’s annex. Benefits include snack spending, easier event goals, +30 tape capacity and extra crew slots. Claimed rewards appear in the canvas room.

Neighborhood and visitor targets are contextual in the room; menus also provide full access. No access-policy changes. Tests cover all six systems, legacy saves, malformed imports, duplicate protection, payouts, inventory conservation and baseline seven-day balance. Native canvas views were inspected with all room milestones installed; full browser and physical Android testing remain unavailable.
