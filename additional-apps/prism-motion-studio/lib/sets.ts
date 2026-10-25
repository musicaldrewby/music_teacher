import * as T from 'three';
import {buildAquarium} from './aquarium-set';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {buildToyFactory} from './toy-factory-set';
import {buildTrainTown} from './train-town';
import {buildSnowGlobe} from './snow-globe';
import {buildGlobeSnow} from './set-animation';

export const setCatalog = [
  {id:'aquarium',name:'Living coral reef',description:'Swimming reef fish, flowing anemones, ribbon kelp and rising bubbles.',accent:'#8ce2dd',background:'custom',lighting:'cinematic'},
  {id:'toy-factory',name:'Christmas Toy Factory',description:'Ruby and emerald machinery, a toy assembly line, wrapping station and loading gantry inside a winter workshop.',accent:'#ffd06a',background:'electric',lighting:'warm'},
  {id:'miniature-town',name:'Lantern Valley railway',description:'A miniature town with a working rail loop, jewel-colored houses, a station and warm lamps.',accent:'#ffc45c',background:'electric',lighting:'warm'},
  { id: 'none', name: 'Open studio', description: 'An open stage for your own scene.', accent: '#00d8ff', background: 'electric', lighting: 'cinematic' },
  { id: 'neon-stage', name: 'Neon concert stage', description: 'Electric portals, polished midnight decking, speaker towers and illuminated rails.', accent: '#00d8ff', background: 'electric', lighting: 'neon' },
  { id: 'haunted-theater', name: 'Haunted theater', description: 'Gilded arches, violet velvet, glowing carved pumpkins and crooked bare trees.', accent: '#ff7900', background: 'voltage', lighting: 'ultraviolet' },
  { id: 'christmas-pavilion', name: 'Christmas pavilion', description: 'A snowy jewel-green pavilion, warm lights, decorated trees and glossy wrapped gifts.', accent: '#ffbd37', background: 'electric', lighting: 'warm' },
  { id: 'snow-globe', name: 'Christmas snow globe', description: 'Hollow glass, a gilded walnut base, a decorated tree, wrapped gifts and swirling 3D snow.', accent: '#ffc45c', background: 'electric', lighting: 'studio' },
] as const;

export type SetId = typeof setCatalog[number]['id'];
export type SetConfig = { winter?:boolean; id: SetId; accent: string; scale: number; rotation: number; offsetZ: number; decorations: boolean; glow: number; snowfall?:number; glass?:boolean };
type Material = T.MeshStandardMaterial | T.MeshPhysicalMaterial;

/** Shared meshes keep the editable sets inexpensive and compatible with Cycles-style path tracing. */
class SetKit {
  root = new T.Group();
  private geometries = new Map<string, T.BufferGeometry>();
  constructor(public config: SetConfig) {}
  geometry(key: string, create: () => T.BufferGeometry) {
    let result = this.geometries.get(key);
    if (!result) { result = create(); this.geometries.set(key, result); }
    return result;
  }
  material(color: string, roughness = .35, metalness = 0, extra: T.MeshPhysicalMaterialParameters = {}) {
    return new T.MeshPhysicalMaterial({ color, roughness, metalness, ...extra });
  }
  glow(color = this.config.accent, strength = 1) {
    return this.material(color, .26, .15, { emissive: color, emissiveIntensity: this.config.glow * strength });
  }
  mesh(name: string, geometry: T.BufferGeometry, material: Material, position: [number, number, number], parent: T.Group = this.root) {
    const mesh = new T.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.prismSet = true;
    parent.add(mesh);
    return mesh;
  }
  box(name: string, size: [number, number, number], position: [number, number, number], material: Material, radius = .08, parent = this.root) {
    const r = Math.min(radius, ...size.map(n => n / 2));
    return this.mesh(name, this.geometry(`box:${size.join(':')}:${r}`, () => new RoundedBoxGeometry(...size, 2, r)), material, position, parent);
  }
  sphere(name: string, scale: [number, number, number], position: [number, number, number], material: Material, parent = this.root) {
    const mesh = this.mesh(name, this.geometry('sphere', () => new T.SphereGeometry(1, 20, 14)), material, position, parent);
    mesh.scale.set(...scale);
    return mesh;
  }
  cylinder(name: string, top: number, bottom: number, height: number, position: [number, number, number], material: Material, parent = this.root) {
    return this.mesh(name, this.geometry(`cylinder:${top}:${bottom}:${height}`, () => new T.CylinderGeometry(top, bottom, height, 24)), material, position, parent);
  }
  tube(name: string, points: T.Vector3[], radius: number, material: Material, parent = this.root, closed = false) {
    const curve = new T.CatmullRomCurve3(points, closed, 'centripetal');
    return this.mesh(name, new T.TubeGeometry(curve, Math.max(24, points.length * 8), radius, 8, closed), material, [0, 0, 0], parent);
  }
  rod(name: string, a: T.Vector3, b: T.Vector3, radius: number, material: Material, parent = this.root, tipRadius = radius) {
    const v = b.clone().sub(a);
    const mesh = this.cylinder(name, tipRadius, radius, v.length(), [0, 0, 0], material, parent);
    mesh.position.copy(a).add(b).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), v.normalize());
    return mesh;
  }
}

const v = (x: number, y: number, z: number) => new T.Vector3(x, y, z);

/** A doorway with a gently rounded crown; no surface spans the title opening. */
function portal(kit: SetKit, name: string, width: number, height: number, z: number, radius: number, material: Material) {
  return kit.tube(name, [v(-width / 2, .35, z), v(-width / 2, height - 1.25, z), v(-width / 2 + .4, height - .35, z), v(-width / 2 + 1.4, height, z), v(0, height + .12, z), v(width / 2 - 1.4, height, z), v(width / 2 - .4, height - .35, z), v(width / 2, height - 1.25, z), v(width / 2, .35, z)], radius, material);
}

function neonStage(kit: SetKit) {
  const metal = kit.material('#101a36', .23, .82, { clearcoat: .8, clearcoatRoughness: .18 });
  const black = kit.material('#050913', .42, .6);
  const silver = kit.material('#a5b9d7', .23, .95);
  const accent = kit.glow();
  const pink = kit.glow('#ff159c', .75);
  const blue = kit.glow('#164cff', .6);
  kit.box('Midnight stage deck', [24, .3, 18], [0, .15, -5.5], metal, .12);
  kit.box('Front stage lip', [23, .12, .11], [0, .29, 3.1], accent, .04);
  kit.box('Rear riser', [21, .32, 5], [0, .46, -10], black, .13);
  kit.box('Rear riser light', [20.5, .065, .12], [0, .61, -7.47], blue, .025);
  kit.box('Back wall', [24, 9.5, .5], [0, 4.8, -13], black, .2);
  for (let i = 0; i < 3; i++) {
    const z = -5.6 - i * 2.8;
    const width = 17.8 - i * .9;
    portal(kit, `Portal ${i + 1} outer frame`, width, 7.5 - i * .25, z, .24, metal);
    portal(kit, `Portal ${i + 1} illuminated edge`, width - .08, 7.49 - i * .25, z + .22, .055, i === 1 ? pink : accent);
  }
  for (const side of [-1, 1]) {
    kit.box('Stage runway inlay', [.07, .025, 12.5], [side * 6.8, .315, -3.8], accent, .01);
    kit.box('Outer runway inlay', [.045, .025, 10], [side * 9.4, .315, -3], pink, .01);
    kit.box('Back acoustic panel', [2.4, 7.2, .35], [side * 9.7, 4.2, -12.65], metal);
    for (let n = 0; n < 7; n++) kit.box('Back panel equalizer', [.16, 1.5 + (n % 3) * .65, .08], [side * (8.8 + n * .29), 3.6, -12.42], n % 2 ? blue : accent, .035);
    if (!kit.config.decorations) continue;
    const tower = new T.Group(); tower.position.set(side * 9.35, .32, -3.6); tower.rotation.y = side * -.18; kit.root.add(tower);
    kit.box('Speaker tower cabinet', [1.9, 4.6, 1.2], [0, 2.3, 0], black, .16, tower);
    kit.box('Speaker tower trim', [2, .13, 1.3], [0, .08, 0], silver, .04, tower);
    for (let n = 0; n < 3; n++) {
      const cone = kit.cylinder('Speaker cone', .57, .4, .13, [0, 1 + n * 1.25, .65], metal, tower); cone.rotation.x = Math.PI / 2;
      const ring = kit.mesh('Speaker illuminated surround', kit.geometry('speaker-ring', () => new T.TorusGeometry(.6, .035, 8, 32)), accent, [0, 1 + n * 1.25, .73], tower);
      ring.castShadow = false;
      kit.sphere('Speaker dust cap', [.22, .22, .1], [0, 1 + n * 1.25, .75], black, tower);
    }
    for (let i = 0; i < 3; i++) {
      const x = side * (8 + i * 1.15), z = -8 - i * .7;
      kit.cylinder('Light plinth', .4, .5, .32, [x, .47, z], metal);
      kit.sphere('Luminous stage orb', [.25, .25, .25], [x, .82, z], i % 2 ? pink : accent);
    }
  }
}

function curtainGeometry(width: number, height: number, side: number) {
  const columns = 48, rows = 18, positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  for (let y = 0; y <= rows; y++) for (let x = 0; x <= columns; x++) {
    const u = x / columns, t = y / rows;
    const scallop = .16 * Math.sin(u * Math.PI * 7);
    const gathered = side * .28 * Math.sin(t * Math.PI);
    positions.push((u - .5) * width + gathered, t * height + (1 - t) * scallop, Math.cos(u * Math.PI * 14) * (.16 + .08 * (1 - t)));
    uvs.push(u, t);
  }
  for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
    const a = y * (columns + 1) + x, b = a + columns + 1;
    indices.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); geometry.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2)); geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

function pumpkinGeometry() {
  const g = new T.SphereGeometry(1, 64, 40), pos = g.getAttribute('position');
  const source = [...g.getIndex()!.array], index: number[] = [];
  const hole = (x: number, y: number, z: number) => {
    if (z < .53) return false;
    const eye = (center: number) => y > .12 && y < .42 && Math.abs(x - center) < (.42 - y) * .68;
    const mouthCenter = -.25 - .18 * (1 - Math.min(1, x * x / .32));
    const tooth = Math.abs(x - .15) < .065 || Math.abs(x + .17) < .065;
    const mouth = Math.abs(x) < .56 && y > mouthCenter - .10 && y < mouthCenter + (tooth ? -.025 : .12);
    return eye(-.3) || eye(.3) || mouth;
  };
  for (let i = 0; i < source.length; i += 3) {
    const a = source[i], b = source[i + 1], c = source[i + 2];
    if (!hole((pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3, (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3, (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3)) index.push(a, b, c);
  }
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), angle = Math.atan2(z, x);
    const rib = 1 - .075 * Math.cos(angle * 10);
    pos.setXYZ(i, x * rib, y * .8, z * rib);
  }
  g.setIndex(index); g.computeVertexNormals(); return g;
}

function pumpkin(kit: SetKit, position: [number, number, number], scale: number, yaw: number, shell: Material, glow: Material, stem: Material) {
  const group = new T.Group(); group.name = 'Carved pumpkin'; group.position.set(...position); group.scale.setScalar(scale); group.rotation.y = yaw; kit.root.add(group);
  kit.mesh('Ribbed pumpkin shell with carved eyes and mouth', kit.geometry('pumpkin-shell', pumpkinGeometry), shell, [0, .8, 0], group);
  kit.sphere('Pumpkin interior glow', [.68, .55, .68], [0, .8, 0], glow, group);
  const stalk = kit.cylinder('Pumpkin stalk', .09, .15, .37, [.04, 1.7, 0], stem, group); stalk.rotation.z = -.2;
  kit.sphere('Pumpkin leaf', [.29, .045, .13], [.23, 1.58, .02], stem, group).rotation.z = -.15;
}

function bareTree(kit: SetKit, x: number, z: number, side: number, wood: Material) {
  const group = new T.Group(); group.name = 'Crooked bare tree'; group.position.set(x, .2, z); kit.root.add(group);
  const trunk = [v(0, 0, 0), v(-side * .15, 1.3, .05), v(side * .12, 2.6, -.15), v(side * .45, 4, -.3), v(side * .26, 5.1, -.2)];
  for (let i = 0; i < trunk.length - 1; i++) kit.rod('Crooked trunk', trunk[i], trunk[i + 1], .26 - i * .055, wood, group, .20 - i * .055);
  for (let i = 0; i < 4; i++) {
    const s = i % 2 ? side : -side, base = trunk[i % 3 + 1];
    const fork = base.clone().add(v(s * (1.1 + i * .15), .75, (i % 2 ? .4 : -.5)));
    const tip = fork.clone().add(v(s * .45, .8, -.18));
    kit.rod('Tree branch', base, fork, .11, wood, group, .065);
    kit.rod('Tree branch tip', fork, tip, .065, wood, group, .018);
    kit.rod('Tree fork', fork.clone().lerp(base, .2), fork.clone().add(v(s * .7, .15, .25)), .055, wood, group, .015);
  }
}

function hauntedTheater(kit: SetKit) {
  const walnut = kit.material('#24132b', .3, .35, { clearcoat: .35 });
  const gold = kit.material('#d7a12c', .28, .86, { clearcoat: .3 });
  const black = kit.material('#08040e', .92);
  const velvet = kit.material('#560b88', .94, 0, { sheen: 1, sheenColor: '#ac32dc', sheenRoughness: .65, side: T.DoubleSide });
  const glow = kit.glow();
  const wood = kit.material('#241c34', .86);
  const orange = kit.material('#ee5b08', .37, 0, { clearcoat: .32, side: T.DoubleSide });
  const green = kit.material('#315126', .72);
  const stone = kit.material('#50466b', .83);
  kit.box('Theater stage', [24, .32, 17], [0, .16, -5], walnut, .13);
  kit.box('Stage apron gold trim', [23.5, .075, .1], [0, .26, 3.45], gold, .02);
  kit.box('Black stage rear', [25, 11, .5], [0, 5.5, -12], black, .12);
  portal(kit, 'Grand proscenium frame', 18, 8.2, -6.5, .42, walnut);
  portal(kit, 'Inner gilt arch', 17.3, 7.85, -6.1, .09, gold);
  portal(kit, 'Outer gilt arch', 18.7, 8.5, -6.45, .1, gold);
  for (const side of [-1, 1]) {
    kit.mesh('Gathered violet velvet curtain', curtainGeometry(3.4, 7.7, side), velvet, [side * 9.6, .5, -7.1]);
    kit.box('Fluted theater column', [.85, 6.7, 1], [side * 9.2, 3.7, -6.1], walnut, .13);
    for (let i = 0; i < 3; i++) kit.cylinder('Column gilt flute', .055, .055, 6.1, [side * 9.2 + (i - 1) * .24, 3.65, -5.56], gold);
    for (const y of [.45, .72, 7, 7.25]) kit.box('Column molding', [1.2, .16, 1.28], [side * 9.2, y, -6.1], gold, .07);
    const swag = [v(side * 10.5, 7.5, -6.5), v(side * 8.9, 6.5, -6.35), v(side * 7.6, 7.6, -6.5)];
    kit.tube('Gold curtain swag', swag, .055, gold);
    if (!kit.config.decorations) continue;
    bareTree(kit, side * 10.8, -3.5, side, wood);
    pumpkin(kit, [side * 7.4, .33, -3.9], .83, -side * .15, orange, glow, green);
    pumpkin(kit, [side * 8.7, .33, -2.5], .54, side * .22, orange, glow, green);
    const stoneGroup = new T.Group(); stoneGroup.name = 'Weathered gravestone'; stoneGroup.position.set(side * 7.5, .33, -6.5); stoneGroup.rotation.z = side * .12; kit.root.add(stoneGroup);
    kit.box('Gravestone slab', [.95, 1.15, .28], [0, .65, 0], stone, .12, stoneGroup);
    kit.sphere('Gravestone rounded crown', [.475, .38, .14], [0, 1.18, 0], stone, stoneGroup);
    kit.box('Gravestone inset line', [.055, .46, .025], [0, .85, .152], walnut, .01, stoneGroup);
    kit.box('Gravestone inset cross', [.32, .055, .025], [0, .95, .152], walnut, .01, stoneGroup);
    kit.cylinder('Gothic lantern pedestal', .22, .34, .35, [side * 6.9, .5, -7.7], walnut);
    kit.box('Gothic lantern warm lens', [.24, .65, .24], [side * 6.9, 1, -7.7], glow, .025);
    kit.cylinder('Gothic lantern roof', 0, .29, .27, [side * 6.9, 1.46, -7.7], gold);
  }
  // Small ceiling ornaments remain well above the text and in the back of the set.
  for (let i = -2; i <= 2; i++) {
    kit.sphere('Gilt ceiling jewel', [.15, .2, .1], [i * 1.45, 8.12 - Math.abs(i) * .06, -5.99], gold);
    kit.sphere('Amber ceiling jewel inset', [.07, .09, .06], [i * 1.45, 8.12 - Math.abs(i) * .06, -5.9], glow);
  }
}

function starGeometry() {
  const shape = new T.Shape();
  for (let i = 0; i < 10; i++) {
    const angle = Math.PI / 2 + i * Math.PI / 5, radius = i % 2 ? .44 : 1;
    const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
    if (!i) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  const geo = new T.ExtrudeGeometry(shape, { depth: .12, bevelEnabled: true, bevelSize: .035, bevelThickness: .035, bevelSegments: 2, steps: 1 }); geo.translate(0, 0, -.06); return geo;
}

function evergreen(kit: SetKit, x: number, z: number, scale: number, green: Material, gold: Material, light: Material, red: Material, blue: Material, snow: Material) {
  const tree = new T.Group(); tree.name = 'Decorated evergreen'; tree.position.set(x, .32, z); tree.scale.setScalar(scale); kit.root.add(tree);
  kit.cylinder('Tree brass stand', .42, .55, .4, [0, .2, 0], gold, tree);
  // A curved lathe profile gives the boughs soft edges rather than pointed polygon cones.
  for (let n = 0; n < 4; n++) {
    const r = 1.65 - n * .32, base = .3 + n * .88, h = 1.9 - n * .13;
    const key = `bough:${n}`;
    const profile = [v(0, 0, 0), v(r * .7, .03, 0), v(r, .13, 0), v(r * .99, .24, 0), v(r * .74, h * .4, 0), v(r * .42, h * .69, 0), v(.035, h, 0), v(0, h, 0)];
    const geometry = kit.geometry(key, () => new T.LatheGeometry(profile.map(p => new T.Vector2(p.x, p.y)), 32));
    kit.mesh('Evergreen curved bough', geometry, green, [0, base, 0], tree);
    const cap = kit.mesh('Snow resting on bough', geometry, snow, [0, base + .055, 0], tree); cap.scale.set(.91, 1.015, .91);
  }
  const spiral: T.Vector3[] = [];
  for (let n = 0; n <= 55; n++) {
    const t = n / 55, angle = t * Math.PI * 7;
    const radius = 1.54 * (1 - t) + .08;
    spiral.push(v(Math.cos(angle) * radius, .75 + t * 3.65, Math.sin(angle) * radius));
  }
  kit.tube('Tree golden light cable', spiral, .022, gold, tree);
  for (let n = 0; n < 20; n++) {
    const p = spiral[Math.round(n / 19 * 54)];
    kit.sphere('Warm tree light', [.055, .055, .055], [p.x, p.y, p.z], light, tree);
  }
  for (let n = 0; n < 8; n++) {
    const t = (n + .5) / 9, y = .8 + t * 3.2, radius = 1.44 * (1 - t) + .16, angle = n * 2.37;
    kit.sphere('Glass Christmas bauble', [.13, .15, .13], [Math.cos(angle) * radius, y, Math.sin(angle) * radius], n % 2 ? red : blue, tree);
  }
  const star = kit.mesh('Golden tree topper', kit.geometry('star', starGeometry), gold, [0, 5.03, 0], tree); star.scale.setScalar(.43);
}

function gift(kit: SetKit, position: [number, number, number], size: [number, number, number], yaw: number, paper: Material, ribbon: Material) {
  const group = new T.Group(); group.name = 'Wrapped present'; group.position.set(...position); group.rotation.y = yaw; kit.root.add(group);
  const [w, h, d] = size;
  kit.box('Glossy gift box', size, [0, h / 2, 0], paper, .06, group);
  kit.box('Gift lid', [w + .05, .12, d + .05], [0, h - .02, 0], paper, .035, group);
  kit.box('Gift ribbon across front', [w * .15, h + .09, d + .065], [0, h / 2 + .015, 0], ribbon, .015, group);
  kit.box('Gift ribbon across side', [w + .065, h + .095, d * .15], [0, h / 2 + .018, 0], ribbon, .015, group);
  for (const side of [-1, 1]) {
    const loop = kit.mesh('Gift bow loop', kit.geometry('bow-loop', () => new T.TorusGeometry(.22, .045, 7, 18)), ribbon, [side * .18, h + .16, 0], group); loop.scale.set(1, .55, .65); loop.rotation.y = side * .45;
  }
}

function christmasPavilion(kit: SetKit) {
  const green = kit.material('#075a36', .42, .1, { clearcoat: .35 });
  const darkGreen = kit.material('#063e32', .3, .25, { clearcoat: .5 });
  const gold = kit.material('#e5b64a', .23, .86, { clearcoat: .45 });
  const snow = kit.material('#eff7ff', .89, 0, { sheen: .25, sheenColor: '#c6e4ff' });
  const ice = kit.material('#b2d5e8', .24, .16, { clearcoat: .8, clearcoatRoughness: .12 });
  const light = kit.glow();
  const red = kit.material('#c90827', .2, .3, { clearcoat: 1, clearcoatRoughness: .13 });
  const blue = kit.material('#0953d8', .19, .4, { clearcoat: 1, clearcoatRoughness: .13 });
  kit.box('Snowy pavilion foundation', [25, .3, 18], [0, .15, -5], snow, .14);
  kit.box('Icy stage platform', [17, .14, 11], [0, .36, -4], ice, .06);
  kit.box('Pavilion platform gold edge', [17.1, .07, .09], [0, .38, 1.51], gold, .025);
  for (const z of [-6.7, -10]) {
    portal(kit, 'Green pavilion arch', 18.4, 8.2, z, .26, darkGreen);
    portal(kit, 'Pavilion gilt arch edge', 18.1, 8.05, z + .22, .06, gold);
    portal(kit, 'Pavilion snow cap', 18.5, 8.37, z, .15, snow);
    for (const side of [-1, 1]) {
      kit.cylinder('Pavilion column', .23, .3, 6.65, [side * 9.2, 3.55, z], darkGreen);
      for (const y of [.45, .7, 6.9, 7.13]) kit.cylinder('Column gilt collar', .4, .4, .15, [side * 9.2, y, z], gold);
    }
  }
  for (const side of [-1, 1]) {
    kit.box('Pavilion side cross beam', [.35, .32, 4.2], [side * 9.2, 7.1, -8.35], darkGreen, .09);
    kit.box('Snow on side cross beam', [.45, .16, 4.3], [side * 9.2, 7.32, -8.35], snow, .075);
  }
  const garland: T.Vector3[] = [];
  for (let i = 0; i <= 24; i++) {
    const x = -8.6 + i / 24 * 17.2, y = 7.9 - .55 * Math.abs(Math.sin(i / 24 * Math.PI * 3));
    garland.push(v(x, y, -6.36));
  }
  kit.tube('Pavilion evergreen garland', garland, .12, green);
  for (let i = 0; i < garland.length; i += 2) {
    const p = garland[i]; kit.sphere('Pavilion warm string bulb', [.075, .095, .075], [p.x, p.y - .14, p.z + .1], light);
  }
  if (!kit.config.decorations) return;
  evergreen(kit, -7.8, -4.1, 1, green, gold, light, red, blue, snow);
  evergreen(kit, 7.8, -4.7, 1.12, green, gold, light, red, blue, snow);
  for (const side of [-1, 1]) {
    kit.sphere('Soft snow bank', [2.2, .25, 1.4], [side * 8.5, .37, -2.8], snow);
    gift(kit, [side * 7, .45, -2.45], [1.1, .85, .9], side * .17, red, gold);
    gift(kit, [side * 8.4, .42, -2.2], [.8, 1.15, .8], -side * .2, blue, gold);
    gift(kit, [side * 9.2, .42, -3.3], [.95, .55, .7], side * .35, darkGreen, red);
  }
}

/** Builds a deterministic set in floor-relative coordinates. It never changes the scene's lights or camera. */
export function buildSet(config: SetConfig, groundHeight: number): T.Group {
  const kit = new SetKit(config);
  kit.root.name = `Prism set: ${config.id}`;
  kit.root.userData.prismSet = true;
  kit.root.userData.setId = config.id;
  if (config.id === 'aquarium') kit.root.add(buildAquarium(config));
  else if (config.id === 'toy-factory') kit.root.add(buildToyFactory(config));
  else if (config.id === 'miniature-town') kit.root.add(buildTrainTown(config));
  else if (config.id === 'neon-stage') neonStage(kit);
  else if (config.id === 'haunted-theater') hauntedTheater(kit);
  else if (config.id === 'christmas-pavilion') christmasPavilion(kit);
  else if (config.id === 'snow-globe') {kit.root.add(buildSnowGlobe(config),buildGlobeSnow(config.snowfall??.7));if(config.glass===false)kit.root.traverse(child=>{if(child.userData.globeGlass)child.visible=false;});}
  kit.root.position.set(0, groundHeight, config.offsetZ);
  kit.root.rotation.y = T.MathUtils.degToRad(config.rotation);
  kit.root.scale.setScalar(config.scale);
  kit.root.updateMatrixWorld(true);
  return kit.root;
}

/** Geometry and materials are shared inside a set, and must each be disposed exactly once. */
export function disposeSet(group: T.Group) {
  const geometries = new Set<T.BufferGeometry>(), materials = new Set<T.Material>();
  group.traverse(child => {
    if (!(child instanceof T.Mesh)) return;
    geometries.add(child.geometry);
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) materials.add(material);
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  group.clear();
}
