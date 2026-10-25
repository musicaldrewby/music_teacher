# Mr. Drew's Music Classroom

A browser-based, photo-referenced 3D classroom built with Three.js r170. Static
files in `dist/` are the complete web application; the renderer is vendored so
the deployed experience does not require a third-party CDN.

## Room constraints

- No people or personal photos are included.
- No clutter; instruments follow the perimeter and the center stays open.
- Ukulele racks are directly below the square windows on the left wall.
- Front: teaching display and recessed double maple doors (one active lever).
- Right: single glazed entry near the front corner, cabinets, long blank
  teaching board, and a separate pair of storage closet doors at the rear end.
- Rear, from the viewer's left to right: a projecting built-in sink section,
  recessed desk nook, upright piano, and tubano/cubby storage. Cubbies touch the
  right side wall; piano and desk share their adjoining edges. Two floor drums
  stand in front of the piano/cubby junction.
- Dimensions are approximate (9.4 × 12.6 × 5.3 m), not survey measurements.

`dist/room.js` generates actual mesh geometry and procedural material textures.
The scene is grouped by wall and batched by material for performance. The model
can be downloaded in GLB format using the app's view settings. The GLB contains
geometry and embedded textures; viewer lighting is provided by the web app.

Navigation: drag to look, scroll/pinch to move, WASD/arrows to walk, or use the
saved wall views. View settings offer exposure, pixel-density quality, floor
spots, a PNG image, and a GLB export. Navigation is bounded to the clear floor.

Third-party engine license: `dist/vendor/THREE-LICENSE.txt`.

## Revision 2

Door arrangement and orientation corrected from the original photographs.
The visible left and right window-array edges are the exact rack endpoints.
All three ukulele rows are below the square windows. The 7 × 4 spot grid is
unchanged; the floor uses a calmer slate-blue woven texture. Posters and board
content are omitted. Welcoming, natural daylight, and blue-hour lighting are
available in view settings. Geometry scale remains an estimate.

## Revision 3

Supersedes revision 2's sink placement using Drew's annotated screenshot and
spoken correction. Sink cabinetry is on the rear piano/desk wall, inside a
section projecting 0.72 m into the room; its return creates the desk nook.
Closets are separate, at the end of the perpendicular teaching wall. Rear
furniture uses shared edge coordinates to keep cubbies, piano and desk flush.
Drums on the shelving and piano move with their supporting furniture. The
desk chair now has upholstered cushions, armrests, a headrest and a five-spoke
rolling base, and faces the desk. Other room constraints remain unchanged.

## Revision 4

The additional corner photograph connects the sink enclosure directly to the
teaching-wall corner. The end closet stops at the projecting face, and the
sink return meets the desk edge. The estimated shell width is reduced to
9.4 m to remove the unsupported gap while retaining furniture proportions.
The sink has stepped upper cabinets, open knee space beneath its left basin,
and right-side drawers and doors. A beige L-shaped resilient floor follows
the teaching cabinetry and extends around the sink, meeting the blue carpet.
No orange chair or loose music stands are included. Room width-dependent
lighting, ceiling, and camera limits follow the revised shell dimensions.

## Revision 5

Teaching-wall drawer cases and both tall closets are recessed into real wall
openings. Their maple fronts align with the unchanged dry-erase board face.
The former projecting countertop is removed; only a narrow vertical rail
and the existing marker tray remain. The end closet clears the sink assembly.

## Revision 6

The close-up reference confirms the sink counter sits inside the alcove.
Its back is now recessed 0.72 m from the surrounding wall face, leaving the
0.66 m countertop and front lip behind that face. The cabinet recesses on
the perpendicular teaching wall and the dry-erase board remain as corrected.

## Revision 7

Removed all sixteen projecting window sills; square openings retain recessed
glazing and plain plaster reveals. Moved the lower acoustic panel beside the
narrow ukulele-side panel to leave a 0.102 m gap between their outside edges.

## Revision 8

The front board is now a joined dry-erase and natural cork bulletin-board
assembly. The bulletin section is on the right, ending 0.35 m before the
corner. Both surfaces are blank, with the tray below the dry-erase section.

## Revision 9

The front closet now occupies a shallow recess extending to the ceiling,
with more uninterrupted wall to its left. The board and display fit to its
right; the bulletin section still ends short of the corner. A larger yellow
FlipForm riser with two dark tread surfaces stands left of the closet. Its
surfaces are empty for later lesson-instrument placement. Front-wall drums
and the nearest Orff instrument are omitted while this corner is arranged.

## Revision 10

The teaching-wall acoustic row contains exactly four evenly spaced panels,
confined to the board-and-cabinet span. The FlipForm reference corrects its
shape to three steps, with yellow tread tops and a gray molded body. Its
position left of the front closet and empty staging surfaces are retained.

## Revision 11

The centered 7 × 4 floor-spot grid has 10% less spacing along both axes.
Spot diameters and color order stay the same. The outer columns move inward
by 0.312 m, giving the orange spots roughly 0.49 m clearance from the hard
floor edge and aligning the lime-green column with the front closet span.

## Revision 12

Uniformly tightened the centered spot grid again, moving each outer colored
column inward by 0.3048 m (one foot). The row spacing contracts by the same
scale factor; all 28 spot diameters, colors and grid center are unchanged.

## Revision 13

The plain teaching-wall section beyond the entry is longer, matching the
photograph of the piano's former position. The first recessed storage closet
and start of the board/drawer run move 1.11 m toward the sink end. The far
end remains fixed, shortening that run. Exactly four upper acoustic panels
are resized and redistributed over the revised cabinetry span. The piano
remains on the rear wall in its current location.

## Ultimate Spooky

A reversible atmosphere layer opens in Ultimate Spooky mode. The room is
empty of characters. Cold moonlight, deeper shadows, dim independently
wavering ceiling lights, muted purple, red and green accent pools, rolling
floor fog, thin higher haze and sparse dust give it an abandoned atmosphere.
Moonlight shifts very slowly, moving the existing instruments' shadows.

The Spooky mode button restores normal lighting and removes fog and accent
lights. Existing lighting presets remain available. The animation checkbox
pauses fog and lighting; reduced-motion preferences are respected. There is
no added audio. PNG captures include the current lighting; GLB exports contain
the classroom geometry and textures, without browser fog or lighting animation.

## Revision 15

The digital keyboard replaces the first Orff instrument on the teaching wall.
It turns 180 degrees, with its bench on the wall side so the player looks
across the class. Both keyboard and bench fit entirely on the hard flooring.
The neighboring Orff instruments, rear upright piano, and spooky mode remain.

## Revision 16

Removed all ghost and zombie geometry and animation. Increased the spooky
atmosphere through lower ambient light, colder moonlight, thicker layered fog,
slowly dimming ceiling lights, deeper colored shadows and creeping moonlight.
The animation control now describes fog and lighting.

## Flashlight

Press F or use the visible flashlight button to toggle a camera-mounted
torch. A warm central beam casts shadows, with softer peripheral spill.
The light follows walking, looking and saved-view transitions, and appears
in PNG captures. Holding F does not repeatedly toggle it; typing in form
fields and browser modifier shortcuts are unaffected. It starts switched off
and works independently of the selected room lighting or atmosphere pause.

### Optional Quest / WebXR VR

Open the public site directly in Meta Quest Browser and choose **Enter VR**. VR uses a `local-floor` reference space, metre-scale room geometry, headset tracking, and tracked controller rays. The desktop viewer remains available and its viewpoint is restored when the session ends.

- The VR menu opens on entry. Point at a button and pull either trigger to select; choose **Close menu** to explore.
- **Left trigger:** hold to aim the curved teleport guide at the open floor; release to move to a valid mint-colored destination.
- **Right thumbstick:** 30-degree snap turn, with neutral-stick reset before another turn.
- **Right grip or A:** toggle the flashlight. The torch follows the tracked right controller; loss of right-controller tracking falls back to head aim.
- **Left grip / X, or right B:** open or close the menu in front of the current view.
- **Stick walking:** optional, initially off; enable in the VR menu or desktop settings. Left stick moves relative to head direction at 1.25 m/s. Virtual travel stays within the existing clear activity area.
- The VR menu includes all four lighting moods, fog animation, flashlight, walking, and **Exit VR**.

VR uses 85% framebuffer scale, compositor foveation, three ceiling point lights, 17 mist sprites, a 1024px sun shadow, and a 512px flashlight shadow. Desktop fog, ceiling visibility, light visibility, camera settings, and shadow sizes are restored on exit. No external controller model downloads or additional dependencies are needed. The flashlight and VR interface stay out of GLB exports.

Validation: Node-based Three.js simulation covers entry/exit/re-entry and permission failure, handedness independent of connection order, menu ray selection, valid/invalid teleport destinations, snap pivot and debounce, walking limits, flashlight tracking fallback, focus loss, and desktop restoration. Physical Quest 3 display quality, input feel, and frame rate still require an on-headset check.
