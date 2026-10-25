import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

type XYZ = [number, number, number];
type Material = T.MeshPhysicalMaterial;
type FactoryConfig = { accent: string; decorations: boolean; glow: number };

/** Shared smooth geometry keeps this real-mesh set modest enough for physical exports. */
class Kit {
  root = new T.Group(); geometries = new Map<string, T.BufferGeometry>();
  geometry(key: string, create: () => T.BufferGeometry) { let g = this.geometries.get(key); if (!g) { g = create(); this.geometries.set(key, g); } return g; }
  material(color: string, roughness = .35, metalness = 0, extra: T.MeshPhysicalMaterialParameters = {}) { return new T.MeshPhysicalMaterial({ color, roughness, metalness, ...extra }); }
  mesh(name: string, geometry: T.BufferGeometry, material: Material, position: XYZ = [0, 0, 0], parent = this.root) { const mesh = new T.Mesh(geometry, material); mesh.name = name; mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.prismSet = true; parent.add(mesh); return mesh; }
  boxGeometry(size: XYZ, radius = .045) { const r = Math.min(radius, ...size.map(n => n / 3)); return this.geometry(`b:${size}:${r}`, () => new RoundedBoxGeometry(...size, 2, r)); }
  box(name: string, size: XYZ, position: XYZ, material: Material, parent = this.root, radius = .045) { return this.mesh(name, this.boxGeometry(size, radius), material, position, parent); }
  cylinder(name: string, radius: number, height: number, position: XYZ, material: Material, parent = this.root, segments = 24) { return this.mesh(name, this.geometry(`c:${radius}:${height}:${segments}`, () => new T.CylinderGeometry(radius, radius, height, segments)), material, position, parent); }
  sphere(name: string, size: XYZ, position: XYZ, material: Material, parent = this.root) { const m = this.mesh(name, this.geometry('sphere', () => new T.SphereGeometry(1, 16, 12)), material, position, parent); m.scale.set(...size); return m; }
  torus(name: string, radius: number, tube: number, position: XYZ, material: Material, parent = this.root) { return this.mesh(name, this.geometry(`t:${radius}:${tube}`, () => new T.TorusGeometry(radius, tube, 8, 40)), material, position, parent); }
  tube(name: string, points: XYZ[], radius: number, material: Material, parent = this.root, segments = 36) { const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)), false, 'centripetal'); return this.mesh(name, new T.TubeGeometry(curve, segments, radius, 8), material, [0, 0, 0], parent); }
  merged(name: string, parts: T.BufferGeometry[], material: Material, parent = this.root) { const result = mergeGeometries(parts, false)!; parts.forEach(g => g.dispose()); return this.mesh(name, result, material, [0, 0, 0], parent); }
  part(name: string, tag: string, position: XYZ = [0, 0, 0], parent = this.root) { const group = new T.Group(); group.name = name; group.position.set(...position); group.userData.factoryPart = tag; group.userData.restPosition = [...position]; group.userData.restRotation = [0, 0, 0]; parent.add(group); return group; }
}

function palette(k: Kit, config: FactoryConfig) {
  return {
    ruby: k.material('#b91332', .23, .25, { clearcoat: .8, clearcoatRoughness: .16 }),
    accent: k.material(config.accent, .25, .2, { clearcoat: .75 }),
    emerald: k.material('#087449', .25, .23, { clearcoat: .8 }),
    pine: k.material('#075237', .48),
    brass: k.material('#eebd50', .23, .84),
    steel: k.material('#aabcc7', .2, .88),
    iron: k.material('#142b32', .39, .65),
    wood: k.material('#56301d', .6),
    plank: k.material('#a96832', .53),
    cream: k.material('#fff2c8', .43),
    wall: k.material('#154c43', .72),
    snow: k.material('#eef8ff', .82),
    blue: k.material('#183c7c', .6, 0, { emissive: '#2459a9', emissiveIntensity: .13 }),
    warm: k.material('#ffe5a0', .25, 0, { emissive: '#ffc65a', emissiveIntensity: Math.max(.3, config.glow) * 2.2 }),
    redLight: k.material('#ff3f43', .3, 0, { emissive: '#ff1a23', emissiveIntensity: config.glow }),
    greenLight: k.material('#5affae', .3, 0, { emissive: '#16e45b', emissiveIntensity: config.glow }),
  };
}
type Palette = ReturnType<typeof palette>;

function gear(k: Kit, parent: T.Group, position: XYZ, radius: number, p: Palette, speed = 1, axis: 'x' | 'z' = 'z') {
  const g = k.part('Machined brass drive gear', 'gear', position, parent); g.userData.axis = axis; g.userData.speed = speed;
  const face = new T.Group(); if (axis === 'x') face.rotation.y = Math.PI / 2; g.add(face);
  k.torus('Smooth toothed gear rim', radius * .78, radius * .16, [0, 0, 0], p.brass, face);
  const hub = k.cylinder('Gear bearing', radius * .2, .2, [0, 0, 0], p.iron, face); hub.rotation.x = Math.PI / 2;
  const teeth: T.BufferGeometry[] = [], spokes: T.BufferGeometry[] = [], count = Math.max(12, Math.round(radius * 18));
  for (let n = 0; n < count; n++) { const a = n / count * Math.PI * 2; const m = new T.Matrix4().makeRotationZ(a); m.setPosition(Math.sin(-a) * radius, Math.cos(a) * radius, 0); teeth.push(k.boxGeometry([radius * .18, radius * .27, .17], .026).clone().applyMatrix4(m)); }
  for (let n = 0; n < 6; n++) { const a = n / 6 * Math.PI * 2; const m = new T.Matrix4().makeRotationZ(a); m.setPosition(Math.sin(-a) * radius * .44, Math.cos(a) * radius * .44, 0); spokes.push(k.boxGeometry([radius * .13, radius * .64, .12], .025).clone().applyMatrix4(m)); }
  k.merged('Rounded gear teeth', teeth, p.brass, face); k.merged('Six polished gear spokes', spokes, p.brass, face);
  return g;
}

function tree(k: Kit, position: XYZ, height: number, p: Palette, decorated = true) {
  const group = new T.Group(); group.name = decorated ? 'Decorated emerald Christmas tree' : 'Snow-dusted winter fir'; group.position.set(...position); k.root.add(group); group.userData.factoryObstacle = true;
  k.cylinder('Tree walnut trunk', height * .06, height * .3, [0, height * .15, 0], p.wood, group);
  for (let tier = 0; tier < 3; tier++) {
    const y = height * (.3 + tier * .23), r = height * (.29 - tier * .06);
    k.mesh('Smooth layered fir boughs', k.geometry(`fir:${r}:${height}`, () => new T.ConeGeometry(r, height * .47, 32, 1)), p.pine, [0, y + height * .13, 0], group);
    if (!decorated) k.mesh('Soft snow on winter bough', k.geometry(`firSnow:${r}:${height}`, () => new T.ConeGeometry(r * .9, height * .32, 32, 1)), p.snow, [0, y + height * .215, 0], group);
  }
  if (decorated) {
    for (let n = 0; n < 18; n++) { const y = height * (.2 + n / 25), radius = height * .29 * (1 - y / (height * 1.12)), a = n * 2.4; k.sphere('Glossy Christmas bauble', [.085, .095, .085], [Math.sin(a) * radius, y, Math.cos(a) * radius], n % 3 === 0 ? p.brass : n % 3 === 1 ? p.ruby : p.warm, group); }
    const star = starGeometry(.26, .12, .07); k.mesh('Brass tree-top star', star, p.brass, [0, height * 1.025, 0], group);
  }
  return group;
}

function starGeometry(radius: number, inner: number, depth: number) {
  const shape = new T.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i / 10 * Math.PI * 2, r = i % 2 ? inner : radius, x = Math.cos(a) * r, y = Math.sin(a) * r; if (i) shape.lineTo(x, y); else shape.moveTo(x, y); } shape.closePath();
  const g = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: .015, bevelThickness: .01, bevelSegments: 2, steps: 1 }); g.translate(0, 0, -depth / 2); return g;
}

function gift(k: Kit, position: XYZ, size: XYZ, p: Palette, material = p.ruby, parent = k.root) {
  k.box('Wrapped Christmas present', size, [position[0], position[1] + size[1] / 2, position[2]], material, parent, .04);
  k.box('Gift cross ribbon', [size[0] + .02, .026, .1], [position[0], position[1] + size[1] + .014, position[2]], p.brass, parent, .007);
  k.box('Gift long ribbon', [.1, size[1] + .03, size[2] + .025], [position[0], position[1] + size[1] / 2, position[2]], p.brass, parent, .007);
}

const glyphs: Record<string, number[][]> = {
  T: [[0, 1, 1, 1], [.5, 1, .5, 0]], O: [[0, 0, 0, 1], [0, 1, 1, 1], [1, 1, 1, 0], [1, 0, 0, 0]], Y: [[0, 1, .5, .5], [1, 1, .5, .5], [.5, .5, .5, 0]],
  W: [[0, 1, .2, 0], [.2, 0, .5, .6], [.5, .6, .8, 0], [.8, 0, 1, 1]], R: [[0, 0, 0, 1], [0, 1, 1, 1], [1, 1, 1, .5], [1, .5, 0, .5], [.45, .5, 1, 0]], K: [[0, 0, 0, 1], [0, .5, 1, 1], [0, .5, 1, 0]], S: [[1, 1, 0, 1], [0, 1, 0, .5], [0, .5, 1, .5], [1, .5, 1, 0], [1, 0, 0, 0]],
};
function sign(k: Kit, p: Palette) {
  k.box('Ruby TOY WORKS signboard', [12, 1.24, .2], [-3, 7.05, -7.3], p.ruby, k.root, .12);
  k.box('Gold signboard border', [12.25, 1.48, .12], [-3, 7.05, -7.4], p.brass, k.root, .12);
  const parts: T.BufferGeometry[] = [], text = 'TOY WORKS';
  for (let i = 0; i < text.length; i++) for (const [x1, y1, x2, y2] of glyphs[text[i]] ?? []) { const a = new T.Vector3(-7.67 + i * 1.3 + x1 * .76, 6.68 + y1 * .74, -7.17), b = new T.Vector3(-7.67 + i * 1.3 + x2 * .76, 6.68 + y2 * .74, -7.17); const m = new T.Matrix4().makeRotationZ(Math.atan2(b.y - a.y, b.x - a.x)); m.setPosition(a.clone().add(b).multiplyScalar(.5)); parts.push(k.boxGeometry([a.distanceTo(b) + .06, .09, .06], .025).clone().applyMatrix4(m)); }
  k.merged('Raised brass TOY WORKS lettering', parts, p.cream);
}

function room(k: Kit, p: Palette, decorations: boolean) {
  k.box('Chamfered walnut factory foundation', [40, .55, 16], [.5, -.3, -.5], p.wood, k.root, .2);
  const floor: T.BufferGeometry[] = []; for (let i = 0; i < 39; i++) floor.push(k.boxGeometry([.97, .13, 15.5], .018).clone().translate(-18.5 + i, -.065, -.5));
  k.merged('Individual satin oak factory floorboards', floor, p.plank).userData.factoryFloor = true;
  k.box('Front polished brass floor edging', [40, .12, .15], [.5, -.02, 7.3], p.brass);
  k.box('Deep emerald workshop back wall', [39, 8.3, .24], [.5, 4.15, -8.15], p.wall).userData.factoryObstacle = true;
  for (const x of [-18.8, -9.2, .4, 10, 19.6]) { k.box('Walnut structural wall post', [.35, 8.35, .42], [x, 4.16, -7.96], p.wood); k.box('Brass wall post foot', [.48, .45, .55], [x, .23, -7.9], p.brass); }
  k.box('Walnut upper wall beam', [39.2, .36, .46], [.5, 8.15, -7.92], p.wood);
  k.box('Factory back wall wainscot', [38.9, 1.2, .22], [.5, .6, -7.88], p.wood);
  k.box('Brass wainscot rail', [38.9, .08, .25], [.5, 1.22, -7.83], p.brass);
  for (const x of [-14, -4.4, 5.2, 14.8]) {
    k.box('Winter blue window recess', [6.9, 4.4, .09], [x, 3.9, -7.96], p.blue);
    k.box('Snow outside the window', [6.6, .23, .65], [x, 1.89, -7.55], p.snow);
    for (const dx of [-3.52, 0, 3.52]) k.box('Window slender brass mullion', [.12, 4.62, .2], [x + dx, 3.92, -7.48], p.brass);
    for (const y of [1.61, 3.92, 6.23]) k.box('Window walnut horizontal frame', [7.18, .14, .23], [x, y, -7.48], p.wood);
    // Raised trees sit between the deep-blue recess and the frame, giving the windows real depth.
    for (let n = 0; n < 3; n++) { const g = tree(k, [x - 2.35 + n * 2.2, 1.95, -7.7], 1.6 + n % 2 * .6, p, false); g.scale.z = .19; }
    k.sphere('Cold winter moon', [.28, .28, .055], [x + 2.25, 5.45, -7.82], p.snow);
  }
  sign(k, p);
  k.tube('Overhead brass steam supply', [[-18.5, 1.8, -7.4], [-18.5, 7.65, -7.4], [-17.8, 7.85, -7.4], [18.5, 7.85, -7.4], [19, 7.5, -7.4], [19, 2, -7.4]], .105, p.brass, k.root, 72);
  for (const x of [-16, -7, 2, 11, 18]) k.torus('Steam pipe flanged collar', .15, .045, [x, 7.85, -7.4], p.iron).rotation.y = Math.PI / 2;
  if (decorations) {
    const points: XYZ[] = []; for (let n = 0; n <= 48; n++) points.push([-18 + n * .76, 7.78 - .43 * Math.abs(Math.sin(n / 12 * Math.PI)), -6.93]); k.tube('Festive string-light cable', points, .026, p.iron, k.root, 96);
    for (let n = 0; n <= 36; n++) { const x = -18 + n * 1.0133, y = 7.78 - .43 * Math.abs(Math.sin(n / 9 * Math.PI)); k.sphere('Warm ruby emerald festive bulb', [.09, .14, .09], [x, y - .13, -6.93], n % 3 === 0 ? p.redLight : n % 3 === 1 ? p.warm : p.greenLight); }
    tree(k, [-17, 0, 4.85], 4.3, p); tree(k, [17.4, 0, 4.85], 3.4, p);
    gift(k, [-16.15, 0, 5.7], [1.0, .7, .8], p); gift(k, [-17.7, 0, 5.4], [.75, 1, .75], p, p.emerald); gift(k, [16.6, 0, 5.7], [.8, .6, .8], p, p.accent);
  }
}

function rails(k: Kit, p: Palette) {
  k.box('Factory rail ballast bed', [62, .08, 2.15], [14, .04, -4], p.iron).userData.factoryTrack = true;
  const ties: T.BufferGeometry[] = []; for (let i = 0; i < 78; i++) ties.push(k.boxGeometry([.22, .08, 1.95], .018).clone().translate(-16.8 + i * .79, .12, -4)); k.merged('Walnut railway sleepers', ties, p.wood).userData.factoryTrack = true;
  for (const side of [-1, 1]) {
    const rail = k.box('Continuous polished factory rail', [62, .1, .12], [14, .21, -4 + side * .6], p.steel, k.root, .015); rail.userData.factoryRail = true; rail.userData.railOffset = side * .6;
    k.box('Rail lower flange', [62, .04, .19], [14, .17, -4 + side * .6], p.steel).userData.factoryTrack = true;
  }
  // A snow-covered exit apron continues beyond the cutaway room.
  k.box('Snowy departure apron', [26, .16, 5.4], [32.5, -.08, -4], p.snow, k.root, .07).userData.factoryFloor = true;
  for (const [x,h] of [[24,4.8],[29,5.7],[35,4.6],[41,6],[46,4.5]]) tree(k,[x,0,-8],h,p,false);
  k.box('Snowbank behind departure firs',[27,.3,4.4],[34,.04,-8],p.snow,k.root,.1);
}

function conveyor(k: Kit, p: Palette) {
  const line = new T.Group(); line.name = 'Continuous parcel conveyor'; line.userData.factoryConveyor = true; k.root.add(line);
  k.box('Conveyor under-bed', [26.5, .17, 2.16], [-1, 1.3, 2], p.iron, line);
  for (const z of [.82, 3.18]) { k.box('Emerald conveyor side frame', [27, .28, .18], [-1, 1.39, z], p.emerald, line); k.box('Conveyor brass frame pinstripe', [27, .035, .025], [-1, 1.5, z + (z > 2 ? .1 : -.1)], p.brass, line); }
  for (let i = 0; i < 42; i++) { const x = -13.8 + i * .625; const roller = k.part('Conveyor steel roller', 'roller', [x, 1.46, 2], line); roller.userData.axis = 'z'; const cylinder = k.cylinder('Smooth conveyor roller barrel', .14, 2.18, [0, 0, 0], p.steel, roller, 20); cylinder.rotation.x = Math.PI / 2; k.box('Roller rotation marker', [.035, .024, 2.13], [0, .125, 0], p.iron, roller, .006); }
  for (const x of [-13.5, -8, -3, 3, 7.5, 11.8]) for (const z of [.94, 3.06]) { k.box('Ruby conveyor leg', [.17, 1.12, .17], [x, .56, z], p.ruby, line); k.box('Conveyor brass foot', [.4, .12, .4], [x, .06, z], p.brass, line); }
  k.box('Parcel belt top reference', [26, .025, 2.05], [-1, 1.575, 2], p.iron, line).userData.factoryBelt = true;
  // Visible narrow slats provide a clear moving direction without a texture.
  for (let i = 0; i < 48; i++) { const x = -13.75 + i * .545; const slat = k.box('Traveling satin conveyor slat', [.46, .035, 2.06], [x, 1.5825, 2], i % 6 === 0 ? p.brass : p.wood, line, .008); slat.userData.factoryPart = 'belt-slat'; slat.userData.baseX = x; slat.userData.restPosition = [x, 1.5825, 2]; }
}

function stationBadge(k: Kit, x: number, number: number, p: Palette) {
  k.box('Ruby machine station badge', [1.1, .65, .13], [x, 1.14, 3.38], p.ruby);
  const digit = number === 1 ? [[.3, -.19, .3, .19]] : number === 2 ? [[-.2, .19, .2, .19], [.2, .19, .2, 0], [-.2, 0, .2, 0], [-.2, 0, -.2, -.19], [-.2, -.19, .2, -.19]] : [[-.2, .19, .2, .19], [.2, -.19, .2, .19], [-.2, 0, .2, 0], [-.2, -.19, .2, -.19]];
  const parts: T.BufferGeometry[] = []; for (const [ax, ay, bx, by] of digit) { const m = new T.Matrix4().makeRotationZ(Math.atan2(by - ay, bx - ax)); m.setPosition(x + (ax + bx) / 2, 1.14 + (ay + by) / 2, 3.47); parts.push(k.boxGeometry([Math.hypot(bx - ax, by - ay) + .04, .06, .04], .014).clone().applyMatrix4(m)); } k.merged('Raised brass station number', parts, p.cream);
}

function assembly(k: Kit, p: Palette) {
  const machine = new T.Group(); machine.name = 'Station one wind-up toy assembly'; k.root.add(machine);
  for (const z of [.25, 3.75]) { k.box('Assembly enameled pillar', [.48, 4.8, .48], [-12, 2.4, z], p.emerald, machine); k.box('Assembly pillar brass shoe', [.64, .3, .64], [-12, .15, z], p.brass, machine); }
  k.box('Assembly overhead crosshead', [.9, .5, 4.25], [-12, 5.05, 2], p.ruby, machine, .12);
  const head = k.part('Retractable assembly head', 'assembly-head', [-12, 4.8, 2], machine);
  k.cylinder('Assembly press brass shaft', .12, 1.1, [0, -.35, 0], p.brass, head);
  k.box('Assembly soft pressing head', [1.35, .24, 1.05], [0, -.97, 0], p.iron, head, .1);
  k.box('Assembly brass head trim', [1.42, .07, 1.12], [0, -.81, 0], p.brass, head);
  for (const z of [.92, 3.08]) k.cylinder('Assembly polished guide rod', .05, 1.15, [-12, 4.4, z], p.steel, machine);
  gear(k, machine, [-12, 4.95, 4.15], .7, p, .6); gear(k, machine, [-13.05, 4.43, 4.15], .43, p, -.98);
  k.box('Assembly controls housing', [1.1, 1.1, .65], [-14.7, 1.1, 3.75], p.emerald, machine);
  for (let i = 0; i < 3; i++) k.sphere('Assembly luminous control button', [.09, .09, .055], [-15 + i * .3, 1.35, 4.105], i === 1 ? p.greenLight : p.redLight, machine);
  stationBadge(k, -12, 1, p);
}

function wrapper(k: Kit, p: Palette) {
  const machine = new T.Group(); machine.name = 'Station two orbital ribbon wrapper'; k.root.add(machine);
  for (const z of [.3, 3.7]) { k.box('Wrapper ruby portal pillar', [.55, 4.65, .5], [.6, 2.325, z], p.ruby, machine, .1); k.box('Wrapper pillar brass trim', [.62, .22, .59], [.6, .17, z], p.brass, machine); }
  k.box('Wrapper emerald portal arch', [1.05, .55, 4.05], [.6, 4.95, 2], p.emerald, machine, .14);
  const ring = k.part('Spinning orbital brass ribbon hoop', 'wrapper-ring', [0, 2.45, 2], machine); ring.userData.axis = 'x';
  const hoop = k.torus('Ribbon hoop polished brass track', 1.47, .09, [0, 0, 0], p.brass, ring); hoop.rotation.y = Math.PI / 2;
  const inner = k.torus('Ribbon hoop inner emerald rail', 1.35, .038, [.035, 0, 0], p.emerald, ring); inner.rotation.y = Math.PI / 2;
  k.box('Orbital ribbon shuttle', [.42, .32, .43], [0, 1.47, 0], p.ruby, ring);
  const spool = k.cylinder('Gold ribbon spool', .24, .38, [0, 1.49, 0], p.brass, ring); spool.rotation.z = Math.PI / 2;
  for (const x of [-.23, .23]) { const flange = k.cylinder('Ribbon spool ivory end', .29, .04, [x, 1.49, 0], p.cream, ring); flange.rotation.z = Math.PI / 2; }
  gear(k, machine, [.6, 4.94, 4.13], .53, p, -.8);
  k.box('Wrapper decorative control pedestal', [1.1, .9, .8], [2.4, .45, 4.2], p.emerald, machine);
  for (let i = 0; i < 3; i++) k.sphere('Wrapper status lamp', [.1, .07, .1], [2.1 + i * .3, .95, 4.2], i === 1 ? p.greenLight : p.warm, machine);
  stationBadge(k, 0, 2, p);
}

function loadingCrane(k: Kit, p: Palette) {
  const crane = new T.Group(); crane.name = 'Station three overhead parcel loading crane'; k.root.add(crane);
  for (const z of [-5.95, 3.7]) { k.box('Crane emerald tower', [.64, 6.7, .64], [11, 3.35, z], p.emerald, crane, .09); k.box('Crane tower brass shoe', [.91, .36, .91], [11, .18, z], p.brass, crane); }
  k.box('Overhead ruby crane bridge', [.95, .54, 10.4], [11, 6.93, -1.02], p.ruby, crane, .12);
  for (const x of [10.55, 11.45]) k.box('Crane brass guide track', [.06, .1, 10.28], [x, 6.67, -1.02], p.brass, crane);
  const trolley = k.part('Traveling overhead crane trolley', 'crane-trolley', [11, 6.6, 2], crane);
  k.box('Crane trolley emerald housing', [1.3, .42, .9], [0, 0, 0], p.emerald, trolley, .1);
  for (const x of [-.57, .57]) for (const z of [-.3, .3]) { const wheel = k.cylinder('Trolley brass guide wheel', .17, .1, [x, .16, z], p.brass, trolley, 20); wheel.rotation.z = Math.PI / 2; }
  const cable = k.part('Crane telescoping cable length', 'crane-cable', [0, 0, 0], trolley); cable.scale.y = 1.4; cable.userData.restScale = [1, 1.4, 1];
  for (const x of [-.7, .7]) k.cylinder('Crane paired hanging steel cable', .025, 1, [x, -.5, 0], p.steel, cable, 12);
  const grip = k.part('Open brass parcel gripper', 'crane-grip', [0, -1.4, 0], trolley);
  k.box('Crane gripper upper crossbar', [1.9, .13, .4], [0, .48, 0], p.brass, grip);
  for (const x of [-.86, .86]) { k.box('Crane fingers clear parcel side walls', [.12, 1.02, .42], [x, 0, 0], p.brass, grip); k.box('Crane rubber grip pad', [.07, .3, .4], [x + (x < 0 ? .06 : -.06), -.24, 0], p.iron, grip); }
  gear(k, crane, [11, 6.93, 4.35], .56, p, .7);
  stationBadge(k, 11, 3, p);
}

function shelves(k: Kit, p: Palette) {
  // Kept against the rear wall, fully outside the railway's 2.8-unit clear corridor.
  for (const x of [-16.2, -7.5, 2.0]) {
    const g = new T.Group(); g.name = 'Workshop toy display shelf'; g.position.set(x, 0, -6.6); g.userData.factoryObstacle = true; k.root.add(g);
    for (const dx of [-1.5, 1.5]) k.box('Shelf walnut upright', [.13, 2.8, .8], [dx, 1.4, 0], p.wood, g);
    for (const y of [.4, 1.4, 2.5]) k.box('Shelf brass-edged board', [3.1, .13, .9], [0, y, 0], p.wood, g);
    for (let n = 0; n < 3; n++) { gift(k, [-.95 + n * .95, .48, 0], [.64, .55 + n * .12, .6], p, n % 2 ? p.emerald : p.ruby, g); k.sphere('Toy display wooden ball', [.23, .23, .23], [-.85 + n * .85, 1.7, 0], n % 2 ? p.accent : p.brass, g); }
  }
}

/** Open-front workshop: the parcel travels from x=-12 to 11 at y=1.61,z=2. */
export function buildToyFactory(config: FactoryConfig): T.Group {
  const k = new Kit(), p = palette(k, config); k.root.name = 'Christmas Toy Factory — real-mesh miniature workshop';
  room(k, p, config.decorations); rails(k, p); conveyor(k, p); assembly(k, p); wrapper(k, p); loadingCrane(k, p); shelves(k, p);
  k.root.userData.factoryBeltTop = 1.6; k.root.userData.factoryRailTop = .26; k.root.userData.factoryRailGauge = 1.2;
  k.root.updateMatrixWorld(true); return k.root;
}

/** Six separately animatable painted wooden robot components inside a folding gift box. */
export function buildFactoryParcel(): T.Group {
  const k = new Kit(), p = palette(k, { accent: '#075fda', decorations: true, glow: 1 }); k.root.name = 'Wind-up robot Christmas parcel';
  const toy = k.part('Assembled painted wooden toy robot', 'toy');
  const part = (index: number, name: string, position: XYZ) => { const g = new T.Group(); g.name = name; g.position.set(...position); g.userData.factoryToyPart = index; g.userData.restPosition = [...position]; g.userData.restRotation = [0, 0, 0]; toy.add(g); return g; };
  const feet = part(0, 'Toy boots and legs', [0, .25, 0]);
  for (const x of [-.2, .2]) { k.box('Robot ruby shoe', [.28, .18, .44], [x, -.16, .04], p.ruby, feet, .05); k.box('Robot wooden shin', [.17, .27, .2], [x, .04, 0], p.cream, feet); }
  const body = part(1, 'Toy enameled torso', [0, .72, 0]); k.box('Rounded sapphire robot chest', [.65, .52, .48], [0, 0, 0], p.accent, body, .08);
  k.box('Robot brass control panel', [.35, .29, .04], [0, 0, .258], p.brass, body, .03); for (const x of [-.09, .09]) k.sphere('Robot chest colored button', [.042, .042, .025], [x, 0, .287], x < 0 ? p.ruby : p.emerald, body);
  const head = part(2, 'Toy square head', [0, 1.19, 0]); k.box('Robot cream wooden head', [.56, .43, .43], [0, 0, 0], p.cream, head, .07);
  for (const x of [-.13, .13]) { k.cylinder('Toy face button eye', .052, .027, [x, .045, .231], p.iron, head, 20).rotation.x = Math.PI / 2; k.sphere('Eye small glint', [.014, .014, .009], [x - .012, .063, .249], p.warm, head); }
  k.box('Robot simple friendly mouth', [.19, .035, .024], [0, -.09, .231], p.ruby, head, .012); k.cylinder('Robot wind-up aerial', .023, .09, [0, .25, 0], p.brass, head, 12); k.sphere('Robot aerial red tip', [.045, .045, .045], [0, .265, 0], p.ruby, head);
  for (const [index, x] of [[3, -.44], [4, .44]]) { const arm = part(index, x < 0 ? 'Toy left arm' : 'Toy right arm', [x, .72, 0]); k.sphere('Robot brass shoulder', [.105, .105, .105], [0, .14, 0], p.brass, arm); k.box('Robot ruby arm', [.18, .29, .2], [0, -.04, 0], p.ruby, arm, .045); k.sphere('Robot cream wooden hand', [.105, .1, .105], [0, -.23, 0], p.cream, arm); }
  const key = part(5, 'Toy brass wind-up key', [0, .73, -.275]); k.cylinder('Wind-up key spindle', .036, .09, [0, 0, -.02], p.brass, key, 12).rotation.x = Math.PI / 2; for (const x of [-.09, .09]) k.torus('Wind-up key oval loop', .07, .023, [x, 0, -.055], p.brass, key);
  const paper = k.part('Folding ruby wrapping paper', 'paper');
  k.box('Gift box bottom', [1.5, .06, 1.5], [0, .03, 0], p.ruby, paper, .018);
  const panelDefs: { index: number; position: XYZ; size: XYZ; axis: 'x' | 'z'; openAngle: number }[] = [
    { index: 0, position: [0, .06, .73], size: [1.5, 1.57, .04], axis: 'x', openAngle: Math.PI / 2 },
    { index: 1, position: [0, .06, -.73], size: [1.5, 1.57, .04], axis: 'x', openAngle: -Math.PI / 2 },
    { index: 2, position: [.73, .06, 0], size: [.04, 1.57, 1.42], axis: 'z', openAngle: -Math.PI / 2 },
    { index: 3, position: [-.73, .06, 0], size: [.04, 1.57, 1.42], axis: 'z', openAngle: Math.PI / 2 },
  ];
  for (const def of panelDefs) { const panel = new T.Group(); panel.name = 'Bottom-hinged folding gift panel'; panel.position.set(...def.position); panel.userData.factoryPanel = def.index; panel.userData.axis = def.axis; panel.userData.openAngle = def.openAngle; panel.userData.restPosition = [...def.position]; panel.userData.restRotation = [0, 0, 0]; paper.add(panel); k.box('Smooth ruby gift-box wall', def.size, [0, .785, 0], p.ruby, panel, .012); }
  const lid = k.part('Gift box floating lid', 'lid', [0, 1.655, 0]); k.box('Rounded ruby gift-box lid', [1.56, .09, 1.56], [0, 0, 0], p.ruby, lid, .032); k.box('Gift lid emerald inner lip', [1.47, .045, 1.47], [0, -.05, 0], p.emerald, lid, .015);
  const ribbon = k.part('Crossed gold parcel ribbon', 'ribbon');
  for (const z of [-.757, .757]) k.box('Gold ribbon down box face', [.2, 1.67, .018], [0, .835, z], p.brass, ribbon, .004);
  for (const x of [-.757, .757]) k.box('Gold ribbon down box side', [.018, 1.67, .2], [x, .835, 0], p.brass, ribbon, .004);
  k.box('Top ribbon across parcel', [1.56, .02, .2], [0, 1.712, 0], p.brass, ribbon, .005); k.box('Top ribbon along parcel', [.2, .02, 1.56], [0, 1.714, 0], p.brass, ribbon, .005);
  const bow = k.part('Polished gold gift bow', 'bow', [0, 1.77, 0]);
  for (const side of [-1, 1]) { const loop = k.torus('Gold ribbon bow loop', .22, .045, [side * .2, .08, 0], p.brass, bow); loop.scale.set(1.1, .65, .8); loop.rotation.x = -.4; }
  k.sphere('Bow center knot', [.14, .09, .12], [0, .04, 0], p.brass, bow);
  k.mesh('Small brass star gift tag', starGeometry(.16, .08, .018), p.brass, [.39, 1.32, .766], ribbon);
  k.root.userData.boxTop = 1.7; k.root.userData.boxSize = [1.5, 1.7, 1.5]; k.root.userData.toyPartCount = 6; k.root.updateMatrixWorld(true); return k.root;
}

/** Local +Z points forward; deck top 1.1 + rail height .26 = parcel landing y1.36. */
export function buildFactoryWagon(): T.Group {
  const k = new Kit(), p = palette(k, { accent: '#c92039', decorations: true, glow: 1 }); k.root.name = 'Christmas parcel flatbed wagon';
  k.box('Wagon emerald chassis', [1.48, .25, 2.9], [0, .65, 0], p.emerald, k.root, .07);
  k.box('Wagon walnut loading deck', [1.8, .16, 3], [0, 1.02, 0], p.wood, k.root, .05);
  for (const x of [-.86, .86]) k.box('Low ruby wagon side rail', [.08, .24, 2.98], [x, 1.22, 0], p.ruby, k.root, .03);
  for (const z of [-1.46, 1.46]) k.box('Wagon low end rail', [1.8, .24, .08], [0, 1.22, z], p.ruby, k.root, .03);
  for (const z of [-1.74, 1.74]) k.box('Wagon coupling tongue', [.23, .11, .52], [0, .64, z], p.iron, k.root, .025);
  for (const x of [-.65, .65]) for (const z of [-.99, .99]) {
    const wheel = new T.Group(); wheel.name = 'Wagon rolling steel wheel'; wheel.position.set(x, .3, z); wheel.userData.trainWheel = true; wheel.userData.wheelRadius = .3; k.root.add(wheel);
    k.cylinder('Wagon steel wheel rim', .3, .13, [0, 0, 0], p.steel, wheel, 32).rotation.z = Math.PI / 2;
    k.cylinder('Wagon ruby wheel face', .245, .025, [x < 0 ? -.08 : .08, 0, 0], p.ruby, wheel, 32).rotation.z = Math.PI / 2;
    k.cylinder('Wagon wheel gold hub', .08, .18, [0, 0, 0], p.brass, wheel, 24).rotation.z = Math.PI / 2;
    for (let n = 0; n < 4; n++) { const a = n / 4 * Math.PI * 2, spoke = k.box('Wagon golden wheel spoke', [.02, .36, .04], [x < 0 ? -.1 : .1, 0, 0], p.brass, wheel, .009); spoke.rotation.x = a; }
  }
  for (const z of [-.99, .99]) k.cylinder('Wagon steel through axle', .06, 1.3, [0, .3, z], p.iron).rotation.z = Math.PI / 2;
  k.root.userData.deckTop = 1.1; k.root.userData.deckClearSize = [1.64, 2.84]; k.root.updateMatrixWorld(true); return k.root;
}
