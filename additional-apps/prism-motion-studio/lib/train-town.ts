import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const TRAIN_ROUTE_POINTS: [number, number, number][] = [[0, .26, 18], [14, .26, 17], [24, .26, 8], [22, .26, -8], [10, .26, -17], [-10, .26, -17], [-24, .26, -6], [-22, .26, 10], [-10, .26, 18]];
export const TRAIN_ROUTE_CLOSED = true;
type Position = [number, number, number];
type Material = T.MeshPhysicalMaterial;
type TownConfig = { winter?: boolean; accent: string; decorations: boolean; glow: number };

function routeCurve() {
  const curve = new T.CatmullRomCurve3(TRAIN_ROUTE_POINTS.map(p => new T.Vector3(...p)), TRAIN_ROUTE_CLOSED, 'centripetal');
  curve.arcLengthDivisions = 2400;
  return curve;
}

class Kit {
  root = new T.Group();
  geometries = new Map<string, T.BufferGeometry>();
  geometry(key: string, create: () => T.BufferGeometry) {
    let geometry = this.geometries.get(key);
    if (!geometry) { geometry = create(); this.geometries.set(key, geometry); }
    return geometry;
  }
  material(color: string, roughness = .4, metalness = 0, extra: T.MeshPhysicalMaterialParameters = {}) {
    return new T.MeshPhysicalMaterial({ color, roughness, metalness, ...extra });
  }
  mesh(name: string, geometry: T.BufferGeometry, material: Material, position: Position = [0, 0, 0], parent = this.root) {
    const mesh = new T.Mesh(geometry, material); mesh.name = name; mesh.position.set(...position);
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.prismSet = true;
    parent.add(mesh); return mesh;
  }
  boxGeometry(size: Position, radius = .05) {
    const r = Math.min(radius, ...size.map(n => n / 3));
    return this.geometry(`box:${size.join(':')}:${r}`, () => new RoundedBoxGeometry(...size, 2, r));
  }
  box(name: string, size: Position, position: Position, material: Material, parent = this.root, radius = .05) {
    return this.mesh(name, this.boxGeometry(size, radius), material, position, parent);
  }
  cylinder(name: string, top: number, bottom: number, height: number, position: Position, material: Material, parent = this.root, segments = 32) {
    return this.mesh(name, this.geometry(`cylinder:${top}:${bottom}:${height}:${segments}`, () => new T.CylinderGeometry(top, bottom, height, segments)), material, position, parent);
  }
  sphere(name: string, size: Position, position: Position, material: Material, parent = this.root) {
    const mesh = this.mesh(name, this.geometry('sphere', () => new T.SphereGeometry(1, 18, 12)), material, position, parent); mesh.scale.set(...size); return mesh;
  }
  tube(name: string, points: Position[], radius: number, material: Material, parent = this.root, segments = 40) {
    const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)), false, 'centripetal');
    return this.mesh(name, new T.TubeGeometry(curve, segments, radius, 8), material, [0, 0, 0], parent);
  }
  torus(name: string, radius: number, thickness: number, position: Position, material: Material, parent = this.root) {
    return this.mesh(name, this.geometry(`torus:${radius}:${thickness}`, () => new T.TorusGeometry(radius, thickness, 8, 40)), material, position, parent);
  }
  merged(name: string, geometries: T.BufferGeometry[], material: Material, parent = this.root) {
    const merged = mergeGeometries(geometries, false)!;
    geometries.forEach(g => g.dispose());
    return this.mesh(name, merged, material, [0, 0, 0], parent);
  }
}

function terrainHeight(x: number, z: number) {
  const hills = [[-32, -22, 2.3], [30, -24, 3.1], [-32, 23, 2.2], [31, 24, 2.7]];
  let h = .018;
  for (const [cx, cz, height] of hills) h += height * Math.exp(-((x - cx) ** 2 / 40 + (z - cz) ** 2 / 33));
  return h;
}

function terrain(kit: Kit, winter = false) {
  const geometry = new T.PlaneGeometry(76, 66, 96, 84); geometry.rotateX(-Math.PI / 2);
  const position = geometry.getAttribute('position'), colors: number[] = [];
  const dark = new T.Color(winter?'#88b6d9':'#176338'), bright = new T.Color(winter?'#f2f9ff':'#51a748');
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), z = position.getZ(i), h = terrainHeight(x, z);
    position.setY(i, h);
    const c = dark.clone().lerp(bright, .37 + .16 * Math.sin(x * .18) * Math.cos(z * .17) + Math.min(.22, h * .1));
    colors.push(c.r, c.g, c.b);
  }
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); geometry.computeVertexNormals();
  const mesh = kit.mesh('Smooth sculpted emerald terrain', geometry, kit.material('#ffffff', .9, 0, { vertexColors: true })); mesh.userData.trainTerrain = true;
  kit.box('Rounded miniature landscape base', [76, .48, 66], [0, -.25, 0], kit.material('#213a27', .78), kit.root, .15).userData.trainTerrain = true;
}

/** A closed sweep along arc-length samples. Rail top vertices are exactly at the route's y value. */
function routeSweep(route: T.CatmullRomCurve3, offset: number, profile: number[][], segments = 720) {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  for (let i = 0; i < segments; i++) {
    const t = i / segments, p = route.getPointAt(t), tangent = route.getTangentAt(t);
    const normal = new T.Vector3(tangent.z, 0, -tangent.x).normalize();
    for (let j = 0; j < profile.length; j++) {
      const [x, y] = profile[j], q = p.clone().addScaledVector(normal, offset + x);
      positions.push(q.x, p.y + y, q.z); uvs.push(t * route.getLength(), j / profile.length);
    }
  }
  for (let i = 0; i < segments; i++) for (let j = 0; j < profile.length; j++) {
    const next = (i + 1) % segments, cross = (j + 1) % profile.length;
    const a = i * profile.length + j, b = next * profile.length + j, c = i * profile.length + cross, d = next * profile.length + cross;
    indices.push(a, c, b, b, c, d);
  }
  const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); geometry.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2)); geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

function railway(kit: Kit, route: T.CatmullRomCurve3) {
  const steel = kit.material('#8fa6ad', .23, .88), sleeper = kit.material('#483123', .73), gravel = kit.material('#777b74', .94), paving = kit.material('#c5bba1', .79);
  // The ballast and sidewalks are continuous solids with gently chamfered shoulders.
  kit.mesh('Raised gravel ballast bed', routeSweep(route, 0, [[-1.48, -.24], [1.48, -.24], [1.23, -.15], [-1.23, -.15]], 480), gravel).userData.trainTrack = true;
  for (const side of [-1, 1]) {
    const rail = kit.mesh(side < 0 ? 'Outer continuous steel rail' : 'Inner continuous steel rail', routeSweep(route, side * .6, [[-.075, -.13], [.075, -.13], [.075, -.105], [.025, -.105], [.025, -.04], [.06, -.04], [.065, -.02], [.055, 0], [-.055, 0], [-.065, -.02], [-.06, -.04], [-.025, -.04], [-.025, -.105], [-.075, -.105]]), steel);
    rail.userData.trainRail = true; rail.userData.railOffset = side * .6; rail.userData.routeSegments = 720; rail.userData.profileSize = 14;
    kit.mesh('Curving town sidewalk', routeSweep(route, side * 3.1, [[-.55, -.24], [.55, -.24], [.55, -.17], [.49, -.14], [-.49, -.14], [-.55, -.17]], 480), paving).userData.trainTrack = true;
  }
  const sleepers: T.BufferGeometry[] = [], count = Math.round(route.getLength() / .82);
  const base = kit.boxGeometry([1.95, .1, .23], .025);
  for (let i = 0; i < count; i++) {
    const p = route.getPointAt(i / count), tangent = route.getTangentAt(i / count), matrix = new T.Matrix4().makeRotationY(Math.atan2(tangent.x, tangent.z));
    matrix.setPosition(p.x, .105, p.z); sleepers.push(base.clone().applyMatrix4(matrix));
  }
  const ties = kit.merged('Individually rounded wooden sleepers', sleepers, sleeper); ties.userData.trainTrack = true; ties.userData.sleeperCount = count;
}

function placed(kit: Kit, route: T.CatmullRomCurve3, t: number, side: number, offset: number, name: string) {
  const p = route.getPointAt(t), tangent = route.getTangentAt(t), normal = new T.Vector3(tangent.z, 0, -tangent.x).normalize();
  const center = p.clone().addScaledVector(normal, side * offset);
  const group = new T.Group(); group.name = name; group.position.set(center.x, terrainHeight(center.x, center.z), center.z);
  const forward = p.clone().sub(center); group.rotation.y = Math.atan2(forward.x, forward.z);
  group.userData.trackObstacle = true; kit.root.add(group); return group;
}

function window(kit: Kit, parent: T.Group, x: number, y: number, z: number, yaw: number, trim: Material, glass: Material, width = .68, height = .88) {
  const group = new T.Group(); group.name = 'Warm casement window'; group.position.set(x, y, z); group.rotation.y = yaw; parent.add(group);
  kit.box('Window outer casement', [width, height, .09], [0, 0, 0], trim, group, .045);
  kit.box('Warm window glass', [width - .13, height - .13, .035], [0, 0, .056], glass, group, .025);
  const bars = [kit.boxGeometry([.035, height - .12, .035], .009).clone().translate(0, 0, .083), kit.boxGeometry([width - .12, .035, .035], .009).clone().translate(0, 0, .083)];
  kit.merged('Window cross mullion', bars, trim, group);
}

function gableGeometry(width: number, height: number, depth: number) {
  const shape = new T.Shape(); shape.moveTo(-width / 2, 0); shape.lineTo(width / 2, 0); shape.lineTo(0, height); shape.closePath();
  const geometry = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 }); geometry.translate(0, 0, -depth / 2); return geometry;
}

function house(kit: Kit, group: T.Group, wall: Material, roof: Material, trim: Material, door: Material, glow: Material, stone: Material, variant: number) {
  group.userData.trainBuilding = true;
  const w = 3.05, depth = 2.8, height = 2.45;
  kit.box('House stone foundation', [3.3, .24, 3.04], [0, .12, 0], stone, group, .06);
  kit.box('Painted miniature house', [w, height, depth], [0, height / 2 + .23, 0], wall, group, .08);
  kit.mesh('House plaster gable', kit.geometry('house-gable', () => gableGeometry(w, 1.02, depth)), wall, [0, 2.68, 0], group);
  for (const side of [-1, 1]) {
    const plane = kit.box('Smooth pitched tile roof', [1.97, .16, 3.34], [side * .84, 3.21, 0], roof, group, .055); plane.rotation.z = -side * .58;
  }
  const ridge = kit.cylinder('Roof ridge cap', .09, .09, 3.35, [0, 3.77, 0], roof, group); ridge.rotation.x = Math.PI / 2;
  kit.box('Door frame', [.76, 1.48, .10], [0, .98, 1.44], trim, group, .05);
  kit.box('Front door', [.59, 1.32, .045], [0, .98, 1.51], door, group, .035);
  kit.sphere('Brass door knob', [.045, .045, .035], [.2, .94, 1.555], trim, group);
  for (const side of [-1, 1]) {
    window(kit, group, side * .98, 1.7, 1.44, 0, trim, glow, .66, .84);
    window(kit, group, side * 1.55, 1.65, -.28, side * Math.PI / 2, trim, glow, .72, .9);
  }
  kit.box('Chimney brick shaft', [.42, .86, .46], [.88, 3.66, -.65], wall, group);
  kit.box('Chimney stone cap', [.53, .12, .57], [.88, 4.13, -.65], stone, group);
  if (variant % 3 === 0) {
    const awning = kit.box('Front porch canopy', [1.25, .12, .67], [0, 1.95, 1.78], roof, group); awning.rotation.x = .12;
    for (const x of [-.53, .53]) kit.cylinder('Porch slender post', .035, .035, 1.69, [x, 1.07, 2.02], trim, group, 12);
  }
}

const lettering: Record<string, number[][]> = {
  S: [[1, 1, 0, 1], [0, 1, 0, .5], [0, .5, 1, .5], [1, .5, 1, 0], [1, 0, 0, 0]],
  T: [[0, 1, 1, 1], [.5, 1, .5, 0]],
  A: [[0, 0, .5, 1], [.5, 1, 1, 0], [.23, .43, .77, .43]],
  I: [[0, 1, 1, 1], [.5, 1, .5, 0], [0, 0, 1, 0]],
  O: [[0, 0, 0, 1], [0, 1, 1, 1], [1, 1, 1, 0], [1, 0, 0, 0]],
  N: [[0, 0, 0, 1], [0, 1, 1, 0], [1, 0, 1, 1]],
};

function stationLetters(kit: Kit, parent: T.Group, material: Material) {
  const geometries: T.BufferGeometry[] = [], text = 'STATION', width = .34, height = .43, advance = .49;
  for (let i = 0; i < text.length; i++) for (const [x1, y1, x2, y2] of lettering[text[i]]) {
    const a = new T.Vector3((i - 3) * advance + (x1 - .5) * width, 2.67 + y1 * height, 1.66), b = new T.Vector3((i - 3) * advance + (x2 - .5) * width, 2.67 + y2 * height, 1.66);
    const mid = a.clone().add(b).multiplyScalar(.5), angle = Math.atan2(b.y - a.y, b.x - a.x);
    const matrix = new T.Matrix4().makeRotationZ(angle); matrix.setPosition(mid);
    geometries.push(kit.boxGeometry([a.distanceTo(b) + .03, .05, .025], .012).clone().applyMatrix4(matrix));
  }
  kit.merged('Raised STATION lettering', geometries, material, parent);
}

function station(kit: Kit, route: T.CatmullRomCurve3, ochre: Material, green: Material, trim: Material, windows: Material, stone: Material, gold: Material) {
  const group = placed(kit, route, 0, 1, 5.8, 'Town railway station'); group.userData.trainBuilding = true;
  kit.box('Station platform', [8.8, .24, 4.7], [0, .12, .3], stone, group, .1);
  kit.box('Station platform yellow edge', [8.6, .035, .15], [0, .258, 2.53], gold, group, .012);
  kit.box('Station ochre walls', [6.4, 2.5, 2.85], [0, 1.49, 0], ochre, group, .08);
  kit.box('Station broad roof', [7.2, .22, 3.95], [0, 2.89, .17], green, group, .09);
  kit.box('Station roof upper tier', [5.9, .18, 2.9], [0, 3.06, -.1], green, group, .07);
  kit.box('Station name board', [4.15, .78, .14], [0, 2.88, 1.56], green, group, .07); stationLetters(kit, group, trim);
  for (const x of [-2.15, 2.15]) window(kit, group, x, 1.64, 1.48, 0, trim, windows, 1.2, 1.14);
  for (const x of [-.43, .43]) {
    kit.box('Station doorway frame', [.76, 1.85, .12], [x, 1.22, 1.47], trim, group);
    kit.box('Station door glass', [.59, 1.67, .04], [x, 1.22, 1.55], windows, group);
    kit.box('Station brass door handle', [.035, .33, .05], [x + (x < 0 ? .2 : -.2), 1.12, 1.6], gold, group);
  }
  for (const x of [-3.15, 3.15]) kit.cylinder('Platform canopy post', .07, .09, 2.55, [x, 1.52, 1.92], green, group);
  kit.box('Platform bench seat', [1.65, .12, .43], [-2.9, .8, 1.95], green, group);
  kit.box('Platform bench back', [1.65, .55, .1], [-2.9, 1.07, 1.71], green, group);
  for (const x of [-3.5, -2.3]) kit.box('Platform bench foot', [.12, .5, .32], [x, .5, 1.95], gold, group);
}

function streetlamp(kit: Kit, group: T.Group, iron: Material, gold: Material, light: Material) {
  kit.cylinder('Lamp turned foot', .14, .23, .22, [0, .11, 0], iron, group);
  kit.cylinder('Lamp slim post', .045, .07, 2.7, [0, 1.48, 0], iron, group, 16);
  kit.box('Warm street lantern', [.32, .44, .32], [0, 2.95, 0], light, group, .045);
  kit.cylinder('Lantern gold cap', .08, .27, .24, [0, 3.28, 0], gold, group);
  kit.cylinder('Lantern lower collar', .22, .13, .13, [0, 2.68, 0], iron, group);
}

function gardenTree(kit: Kit, group: T.Group, leaf: Material, wood: Material, tall = false) {
  const h = tall ? 3.65 : 2.75;
  kit.cylinder('Tree smooth trunk', .14, .23, h * .58, [0, h * .29, 0], wood, group, 18);
  kit.sphere('Tree rounded crown', [1.05, h * .45, .98], [0, h * .73, 0], leaf, group);
  kit.sphere('Tree side crown', [.7, .85, .72], [.65, h * .62, .13], leaf, group);
  kit.sphere('Tree smaller crown', [.65, .72, .7], [-.59, h * .66, .1], leaf, group);
}

function plaza(kit: Kit, stone: Material, gold: Material, blue: Material, iron: Material, trim: Material) {
  const group = new T.Group(); group.name = 'Town fountain plaza'; group.userData.trackObstacle = true; kit.root.add(group);
  kit.cylinder('Circular plaza paving', 5.7, 5.8, .16, [0, .08, 0], stone, group, 64);
  const rim = kit.torus('Plaza inset brass ring', 5.2, .025, [0, .172, 0], gold, group); rim.rotation.x = Math.PI / 2;
  kit.cylinder('Fountain pedestal base', 1.9, 2.05, .28, [0, .31, 0], trim, group, 64);
  const basin = kit.torus('Fountain rounded stone basin', 1.72, .22, [0, .58, 0], trim, group); basin.rotation.x = Math.PI / 2;
  kit.cylinder('Fountain blue water', 1.55, 1.55, .035, [0, .55, 0], blue, group, 64);
  kit.cylinder('Fountain central column', .22, .36, 1.15, [0, 1.08, 0], trim, group);
  const bowl = kit.torus('Upper fountain bowl', .64, .15, [0, 1.67, 0], trim, group); bowl.rotation.x = Math.PI / 2;
  kit.sphere('Fountain gold finial', [.2, .26, .2], [0, 2, 0], gold, group);
  for (let i = 0; i < 6; i++) {
    const angle = i / 6 * Math.PI * 2, x = Math.cos(angle), z = Math.sin(angle);
    kit.tube('Curved fountain water jet', [[x * .57, 1.72, z * .57], [x * .9, 1.8, z * .9], [x * 1.28, 1.3, z * 1.28], [x * 1.42, .58, z * 1.42]], .025, blue, group, 24);
  }
  const tower = new T.Group(); tower.name = 'Village clock tower'; tower.position.set(-7.5, 0, -2.4); tower.userData.trackObstacle = true; tower.userData.trainBuilding = true; kit.root.add(tower);
  kit.box('Clock tower broad foot', [2.25, .3, 2.25], [0, .15, 0], trim, tower);
  kit.box('Clock tower shaft', [1.65, 5.65, 1.65], [0, 3.1, 0], stone, tower, .09);
  kit.box('Clock tower cornice', [2.05, .22, 2.05], [0, 5.8, 0], trim, tower);
  kit.cylinder('Clock tower pointed roof', 0, 1.4, 1.25, [0, 6.48, 0], blue, tower, 32);
  for (const side of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const face = new T.Group(); face.position.set(Math.sin(side) * .85, 4.9, Math.cos(side) * .85); face.rotation.y = side; tower.add(face);
    const dial = kit.cylinder('Ivory clock dial', .55, .55, .055, [0, 0, 0], trim, face, 40); dial.rotation.x = Math.PI / 2;
    kit.torus('Clock polished bezel', .55, .035, [0, 0, .035], gold, face);
    const minute = kit.box('Clock minute hand', [.035, .42, .03], [.15, .11, .06], iron, face, .008); minute.rotation.z = -.92;
    const hour = kit.box('Clock hour hand', [.045, .31, .035], [-.11, .085, .065], iron, face, .008); hour.rotation.z = .92;
    kit.sphere('Clock central pin', [.055, .055, .03], [0, 0, .08], gold, face);
  }
}

function flowers(kit: Kit, route: T.CatmullRomCurve3, green: Material, colors: Material[]) {
  const stems: T.BufferGeometry[] = [], petals: T.BufferGeometry[][] = colors.map(() => []);
  const stem = new T.CylinderGeometry(.012, .015, .24, 5), blossom = new T.SphereGeometry(.075, 8, 6);
  for (let bed = 0; bed < 5; bed++) {
    const t = .09 + bed * .175, p = route.getPointAt(t), tangent = route.getTangentAt(t), normal = new T.Vector3(tangent.z, 0, -tangent.x);
    const center = p.clone().addScaledVector(normal, 4.15);
    for (let i = 0; i < 9; i++) {
      const angle = i * 2.4, r = .16 + (i % 3) * .15, x = center.x + Math.cos(angle) * r, z = center.z + Math.sin(angle) * r, y = terrainHeight(x, z);
      stems.push(stem.clone().translate(x, y + .13, z)); petals[bed % colors.length].push(blossom.clone().scale(1, .55, 1).translate(x, y + .28, z));
    }
  }
  stem.dispose(); blossom.dispose(); kit.merged('Flower bed stems', stems, green);
  petals.forEach((parts, i) => { if (parts.length) kit.merged('Bright garden blossoms', parts, colors[i]); });
}

/** Exact-route scenery with clear rails and a complete, physically shaded miniature landscape. */
export function buildTrainTown(config: TownConfig): T.Group {
  const kit = new Kit(), route = routeCurve(); kit.root.name = 'Miniature railway town'; kit.root.userData.prismSet = true; kit.root.userData.trainTown = true;
  kit.root.userData.routeLength = route.getLength();
  const emerald = kit.material('#12683e', .33, .12, { clearcoat: .35 }), ruby = kit.material('#b92439', .36, .08, { clearcoat: .25 }), cobalt = kit.material('#175bb1', .32, .12, { clearcoat: .35 }), ochre = kit.material('#e0a32e', .46), cream = kit.material('#f1dfb1', .56), iron = kit.material('#142d30', .32, .7), gold = kit.material('#d6aa3b', .26, .82), stone = kit.material('#a6aa9d', .78), wood = kit.material('#66402a', .8), accent = kit.material(config.accent, .35, .15, { clearcoat: .35 });
  const glass = kit.material('#ffdc85', .25, .05, { emissive: '#ffb74b', emissiveIntensity: config.glow * .7, clearcoat: .8 });
  const foliage = [kit.material('#287d3d', .78), kit.material('#4b952e', .78), kit.material('#19865b', .75)];
  const water = kit.material('#24afd0', .16, .15, { transmission: .15, thickness: .12, clearcoat: 1 });
  terrain(kit,config.winter); railway(kit, route);
  const walls = [ochre, cobalt, ruby, emerald, cream, accent], roofs = [ruby, emerald, cobalt, iron];
  let index = 0;
  for (const [side, samples] of [[-1, [.055, .2, .35, .51, .68, .86]], [1, [.14, .31, .47, .64, .8]]] as [number, number[]][]) {
    for (const t of samples) {
      const group = placed(kit, route, t, side, 6.05, `Village house ${index + 1}`);
      group.scale.setScalar(.9 + (index % 3) * .075);
      house(kit, group, walls[index % walls.length], roofs[index % roofs.length], cream, index % 2 ? emerald : ruby, glass, stone, index);
      index++;
    }
  }
  station(kit, route, ochre, emerald, cream, glass, stone, gold);
  plaza(kit, stone, gold, water, iron, cream);
  if (config.decorations) {
    for (let i = 0; i < 10; i++) streetlamp(kit, placed(kit, route, .035 + i * .096, i % 2 ? -1 : 1, 2.75, 'Warm railway streetlamp'), iron, gold, glass);
    for (let i = 0; i < 12; i++) gardenTree(kit, placed(kit, route, (.105 + i * .081) % 1, i % 2 ? 1 : -1, 8.5, 'Rounded garden tree'), foliage[i % 3], wood, i % 3 === 0);
    flowers(kit, route, emerald, [ruby, ochre, accent]);
  }
  if(config.winter){
    const snow=kit.material('#e7f5ff',.84), ornaments=[ruby,gold,cobalt,glass];
    const roofs:T.Mesh[]=[];kit.root.traverse(o=>{if(o instanceof T.Mesh&&/roof|canopy|Chimney stone cap/i.test(o.name))roofs.push(o);});
    for(const roof of roofs){const cap=new T.Mesh(roof.geometry,snow);cap.name='Soft snow cap';cap.position.copy(roof.position);cap.position.y+=.11;cap.quaternion.copy(roof.quaternion);cap.scale.copy(roof.scale).multiplyScalar(1.015);cap.castShadow=cap.receiveShadow=true;roof.parent!.add(cap);}
    if(config.decorations)for(let i=0;i<7;i++){
      const tree=placed(kit,route,(.02+i*.14)%1,i%2?1:-1,9.5,'Decorated Christmas fir');
      kit.cylinder('Fir trunk',.16,.22,.8,[0,.4,0],wood,tree);
      for(let tier=0;tier<3;tier++){const y=1.1+tier*.85,r=1.3-tier*.26;kit.cylinder('Evergreen boughs',.07,r,1.6,[0,y,0],emerald,tree);kit.cylinder('Snow-dusted bough tips',.06,r*.86,.22,[0,y-.51,0],snow,tree);for(let j=0;j<7;j++){const a=j*Math.PI*2/7+tier*.4;kit.sphere('Christmas bauble',[.10,.10,.10],[Math.cos(a)*r*.73,y-.4,Math.sin(a)*r*.73],ornaments[(j+tier)%4],tree);}}
      kit.sphere('Golden treetop light',[.16,.22,.16],[0,3.7,0],glass,tree);
    }
  }
  kit.root.updateMatrixWorld(true); return kit.root;
}

/** A selectable locomotive, facing +Z. Its wheels touch y=0; the front of the cab is genuinely open. */
export function buildMiniatureTrain(): T.Group {
  const kit = new Kit(); kit.root.name = 'Brass and emerald miniature locomotive'; kit.root.userData.miniatureTrain = true;
  const green = kit.material('#075038', .23, .35, { clearcoat: .85, clearcoatRoughness: .13 }), red = kit.material('#b6182b', .25, .35, { clearcoat: .7 }), black = kit.material('#101c20', .34, .72), brass = kit.material('#d9b05b', .2, .9), steel = kit.material('#9fadb2', .23, .9), light = kit.material('#ffe2a1', .2, .1, { emissive: '#ffd177', emissiveIntensity: 1.2 }), ivory = kit.material('#f2deb4', .45);
  kit.box('Locomotive chassis', [1.42, .22, 3.35], [0, .59, .3], red, kit.root, .07);
  kit.box('Cab lower deck', [1.42, .14, 1.54], [0, .82, -.64], green, kit.root, .05);
  const boiler = kit.cylinder('Polished emerald boiler', .43, .43, 1.72, [0, 1.12, .77], green); boiler.rotation.x = Math.PI / 2;
  for (const z of [.02, .68, 1.53]) kit.torus('Boiler brass band', .44, .034, [0, 1.12, z], brass);
  const front = kit.cylinder('Boiler front plate', .43, .43, .1, [0, 1.12, 1.67], black); front.rotation.x = Math.PI / 2;
  kit.torus('Front plate brass rim', .39, .025, [0, 1.12, 1.73], brass);
  kit.sphere('Boiler front latch', [.085, .085, .04], [0, 1.12, 1.78], brass);
  kit.cylinder('Brass steam dome', .15, .21, .27, [0, 1.6, .39], brass);
  kit.sphere('Steam dome rounded cap', [.15, .08, .15], [0, 1.74, .39], brass);
  kit.cylinder('Smokestack base', .16, .2, .12, [0, 1.57, 1.21], brass);
  kit.cylinder('Narrow black smokestack', .17, .12, .52, [0, 1.87, 1.21], black);
  kit.cylinder('Smokestack flared lip', .23, .17, .1, [0, 2.18, 1.21], brass);
  kit.box('Cab back lower panel', [1.4, .6, .12], [0, 1.18, -1.36], green);
  for (const side of [-1, 1]) {
    kit.box('Cab side lower panel', [.12, .57, 1.35], [side * .67, 1.18, -.67], green);
    for (const z of [-1.31, -.03]) kit.box('Cab slender window post', [.105, 1.45, .105], [side * .65, 1.7, z], brass);
    kit.box('Cab side window upper rail', [.1, .095, 1.38], [side * .65, 2.38, -.67], brass);
    kit.box('Cab entry footplate', [.31, .09, .45], [side * .82, .61, -.79], steel);
  }
  kit.box('Cab open-front lintel', [1.38, .09, .1], [0, 2.38, -.03], brass);
  kit.box('Cab curved-edge roof', [1.68, .17, 1.71], [0, 2.52, -.65], green, kit.root, .075);
  kit.box('Cab roof brass rim', [1.72, .045, 1.75], [0, 2.44, -.65], brass, kit.root, .02);
  kit.box('Small cab instrument shelf', [.85, .09, .26], [0, 1.39, -.03], black);
  for (const x of [-.25, .25]) {
    const gauge = kit.cylinder('Ivory cab pressure gauge', .09, .09, .03, [x, 1.5, -.12], ivory, kit.root, 24); gauge.rotation.x = Math.PI / 2;
    kit.torus('Gauge brass bezel', .09, .014, [x, 1.5, -.145], brass);
  }
  const wheelBase = kit.geometry('train-wheel', () => new T.CylinderGeometry(.3, .3, .13, 32));
  for (const side of [-1, 1]) for (const z of [-.95, .05, 1.05]) {
    const wheel = new T.Group(); wheel.name = 'Locomotive driving wheel'; wheel.position.set(side * .65, .3, z); wheel.userData.trainWheel = true; wheel.userData.wheelRadius = .3; kit.root.add(wheel);
    const tire = kit.mesh('Steel wheel tire', wheelBase, steel, [0, 0, 0], wheel); tire.rotation.z = Math.PI / 2;
    const face = kit.cylinder('Ruby wheel face', .255, .255, .018, [side * .075, 0, 0], red, wheel, 32); face.rotation.z = Math.PI / 2;
    const hub = kit.cylinder('Wheel brass hub', .07, .07, .15, [0, 0, 0], brass, wheel, 24); hub.rotation.z = Math.PI / 2;
    const crank = kit.cylinder('Coupling rod crank pin', .037, .037, .1, [side * .12, .12, 0], brass, wheel, 16); crank.rotation.z = Math.PI / 2;
    const spokes: T.BufferGeometry[] = [];
    for (let n = 0; n < 6; n++) {
      const angle = n / 6 * Math.PI * 2, matrix = new T.Matrix4().makeRotationX(angle); matrix.setPosition(side * .089, Math.cos(angle) * .13, Math.sin(angle) * .13);
      spokes.push(kit.boxGeometry([.018, .23, .028], .006).clone().applyMatrix4(matrix));
    }
    kit.merged('Wheel brass spokes', spokes, brass, wheel);
  }
  for (const side of [-1, 1]) {
    const rod = kit.box('Animated connecting rod', [.07, .07, 2.13], [side * .79, .3, .05], brass, kit.root, .025); rod.userData.trainCouplingRod = true; rod.userData.side = side;
    kit.cylinder('Front buffer', .105, .105, .13, [side * .47, .65, 2.03], black).rotation.x = Math.PI / 2;
    kit.box('Rear buffer', [.21, .15, .14], [side * .45, .66, -1.51], black);
    kit.tube('Boiler handrail', [[side * .46, 1.27, .02], [side * .48, 1.3, 1.5]], .018, brass, kit.root, 12);
  }
  const lamp = kit.cylinder('Forward brass headlamp housing', .16, .18, .2, [0, 1.62, 1.78], brass); lamp.rotation.x = Math.PI / 2;
  const lens = kit.cylinder('Warm headlamp lens', .13, .13, .02, [0, 1.62, 1.895], light); lens.rotation.x = Math.PI / 2;
  kit.box('Front buffer beam', [1.48, .16, .16], [0, .57, 1.89], red);
  kit.root.userData.cabEye = [0, 1.85, -.6]; kit.root.userData.cabForward = [0, 0, 1]; kit.root.userData.wheelRadius = .3;
  kit.root.updateMatrixWorld(true); return kit.root;
}

/** Absolute distance drives wheels and coupling rods, so scrubbing and export agree. */
export function animateTrain(group: T.Group, _time: number, distance: number) {
  const angle = distance / .3;
  group.traverse(child => {
    if (child.userData.trainWheel) child.rotation.x = angle;
    if (child.userData.trainCouplingRod) { child.position.y = .3 + Math.cos(angle) * .12; child.position.z = .05 + Math.sin(angle) * .12; }
  });
}
