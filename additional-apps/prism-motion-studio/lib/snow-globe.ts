import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const SNOW_GLOBE = { center: [0, 6.1, 0], radius: 6, snowY: 1.3 } as const;
export type SnowGlobeConfig = { accent: string; decorations: boolean; glow: number };
type Material = T.MeshPhysicalMaterial;
type Position = [number, number, number];

/** Closed, hollow glass: two spherical caps joined at the bottom, with inward-facing inner normals. */
function glassShellGeometry() {
  const segments = 128, rows = 80, innerRadius = 5.94;
  const positions: number[] = [], normals: number[] = [], indices: number[] = [];
  const surfaces: number[][] = [];
  for (const radius of [SNOW_GLOBE.radius, innerRadius]) {
    const sign = radius === SNOW_GLOBE.radius ? 1 : -1;
    const endTheta = Math.acos((SNOW_GLOBE.snowY - SNOW_GLOBE.center[1]) / radius);
    const pole = positions.length / 3;
    positions.push(0, SNOW_GLOBE.center[1] + radius, 0); normals.push(0, sign, 0);
    const rings: number[] = [];
    for (let row = 1; row <= rows; row++) {
      const theta = endTheta * row / rows;
      rings.push(positions.length / 3);
      for (let column = 0; column < segments; column++) {
        const phi = column / segments * Math.PI * 2;
        const x = Math.sin(theta) * Math.cos(phi), y = Math.cos(theta), z = Math.sin(theta) * Math.sin(phi);
        positions.push(x * radius, SNOW_GLOBE.center[1] + y * radius, z * radius);
        normals.push(x * sign, y * sign, z * sign);
      }
    }
    const triangle = (a: number, b: number, c: number) => sign > 0 ? indices.push(a, b, c) : indices.push(a, c, b);
    for (let column = 0; column < segments; column++) {
      const next = (column + 1) % segments;
      triangle(pole, rings[0] + next, rings[0] + column);
      for (let row = 0; row < rows - 1; row++) {
        const a = rings[row] + column, b = rings[row] + next, c = rings[row + 1] + column, d = rings[row + 1] + next;
        triangle(a, b, c); triangle(b, d, c);
      }
    }
    surfaces.push(rings);
  }
  const outer = surfaces[0][rows - 1], inner = surfaces[1][rows - 1];
  for (let column = 0; column < segments; column++) {
    const next = (column + 1) % segments;
    indices.push(outer + column, outer + next, inner + column, outer + next, inner + next, inner + column);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}

function starGeometry() {
  const shape = new T.Shape();
  for (let i = 0; i < 10; i++) {
    const angle = Math.PI / 2 + i * Math.PI / 5, radius = i % 2 ? .43 : 1;
    if (i === 0) shape.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    else shape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  shape.closePath();
  const geometry = new T.ExtrudeGeometry(shape, { depth: .16, bevelEnabled: true, bevelThickness: .045, bevelSize: .035, bevelSegments: 3, steps: 1 });
  geometry.translate(0, 0, -.08);
  return geometry;
}

class GlobeKit {
  root = new T.Group();
  private geometries = new Map<string, T.BufferGeometry>();
  material(color: string, roughness = .35, metalness = 0, extra: T.MeshPhysicalMaterialParameters = {}) {
    return new T.MeshPhysicalMaterial({ color, roughness, metalness, ...extra });
  }
  geometry(key: string, create: () => T.BufferGeometry) {
    let geometry = this.geometries.get(key);
    if (!geometry) { geometry = create(); this.geometries.set(key, geometry); }
    return geometry;
  }
  mesh(name: string, geometry: T.BufferGeometry, material: Material, position: Position, parent = this.root, base = false) {
    const mesh = new T.Mesh(geometry, material);
    mesh.name = name; mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData.prismSet = true;
    mesh.userData[base ? 'globeBase' : 'globeInterior'] = true;
    parent.add(mesh); return mesh;
  }
  lathe(name: string, profile: number[][], material: Material, position: Position = [0, 0, 0], parent = this.root, base = false) {
    const geometry = this.geometry(`lathe:${JSON.stringify(profile)}`, () => new T.LatheGeometry(profile.map(([x, y]) => new T.Vector2(x, y)), 96));
    return this.mesh(name, geometry, material, position, parent, base);
  }
  box(name: string, size: Position, position: Position, material: Material, parent = this.root) {
    const radius = Math.min(.065, ...size.map(n => n / 3));
    return this.mesh(name, this.geometry(`box:${size.join(':')}`, () => new RoundedBoxGeometry(...size, 3, radius)), material, position, parent);
  }
  sphere(name: string, size: Position, position: Position, material: Material, parent = this.root) {
    const mesh = this.mesh(name, this.geometry('sphere', () => new T.SphereGeometry(1, 24, 16)), material, position, parent);
    mesh.scale.set(...size); return mesh;
  }
  tube(name: string, points: Position[], radius: number, material: Material, parent = this.root, segments = 80) {
    const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)), false, 'centripetal');
    return this.mesh(name, new T.TubeGeometry(curve, segments, radius, 8), material, [0, 0, 0], parent);
  }
  torus(name: string, radius: number, tube: number, position: Position, material: Material, parent = this.root, base = false) {
    return this.mesh(name, this.geometry(`torus:${radius}:${tube}`, () => new T.TorusGeometry(radius, tube, 10, 96)), material, position, parent, base);
  }
}

function plinth(kit: GlobeKit, walnut: Material, darkWalnut: Material, gold: Material, snow: Material) {
  kit.lathe('Turned dark walnut pedestal', [[0, 0], [3.6, 0], [3.88, .045], [3.98, .12], [4, .2], [3.97, .29], [3.88, .35], [3.66, .43], [3.61, .52], [3.61, .82], [3.68, .92], [3.9, 1.015], [3.95, 1.09], [3.94, 1.16], [3.85, 1.24], [0, 1.24]], walnut, [0, 0, 0], kit.root, true);
  for (const [radius, y, thickness] of [[3.96, .16, .035], [3.91, .31, .027], [3.67, .43, .023], [3.91, 1.03, .04], [3.91, 1.19, .035]]) {
    const ring = kit.torus('Polished gold pedestal inlay', radius, thickness, [0, y, 0], gold, kit.root, true); ring.rotation.x = Math.PI / 2;
  }
  for (let i = 0; i < 5; i++) {
    const groove = kit.torus('Fine turned walnut grain', 3.611, .009, [0, .55 + i * .054, 0], darkWalnut, kit.root, true); groove.rotation.x = Math.PI / 2;
  }
  const medallion = kit.torus('Front gold medallion', .22, .022, [0, .675, 3.63], gold, kit.root, true); medallion.scale.set(1.2, .88, 1);
  const crest = kit.mesh('Pedestal star inlay', kit.geometry('star', starGeometry), gold, [0, .68, 3.65], kit.root, true); crest.scale.set(.11, .11, .045);
  kit.lathe('Snow-covered circular island', [[0, 1.21], [3.44, 1.21], [3.48, 1.23], [3.55, 1.265], [3.52, 1.3], [0, 1.3]], snow);
  const seal = kit.torus('Dome seating collar', 3.59, .055, [0, 1.255, 0], gold, kit.root, true); seal.rotation.x = Math.PI / 2;
}

function tree(kit: GlobeKit, config: SnowGlobeConfig, green: Material, snow: Material, gold: Material, red: Material, blue: Material, warmLight: Material, wood: Material) {
  const group = new T.Group(); group.name = 'Emerald Christmas tree'; group.position.set(-1.6, SNOW_GLOBE.snowY, -1.2); kit.root.add(group);
  kit.lathe('Tree trunk', [[0, 0], [.18, 0], [.16, .82], [0, .82]], wood, [0, 0, 0], group);
  const tiers = [[.50, 1.4, 2.05], [1.58, 1.12, 1.95], [2.65, .87, 1.78], [3.60, .64, 1.62], [4.42, .4, 1.35]];
  const tierRadius = (y: number) => {
    let radius = .03;
    for (const [base, r, height] of tiers) {
      const t = (y - base) / height;
      if (t >= 0 && t <= 1) radius = Math.max(radius, r * Math.pow(1 - t, 1.17));
    }
    return radius;
  };
  for (let n = 0; n < tiers.length; n++) {
    const [base, radius, height] = tiers[n];
    const profile: number[][] = [[0, 0], [radius * .72, .015], [radius * .98, .065], [radius, .11]];
    for (let i = 1; i <= 20; i++) {
      const t = i / 20;
      profile.push([Math.max(.008, radius * Math.pow(1 - t, 1.17)), .11 + t * (height - .11)]);
    }
    profile.push([0, height]);
    kit.lathe('Soft sculpted emerald bough', profile, green, [0, base, 0], group);
    for (let k = 0; k < 2; k++) {
      const angle = n * .55 + k * 2.4 + .4, r = radius * .72;
      const patch = kit.sphere('Snow resting on tree bough', [radius * .32, .065, radius * .19], [Math.cos(angle) * r, base + .25, Math.sin(angle) * r], snow, group);
      patch.rotation.y = -angle;
    }
  }
  if (!config.decorations) return;
  const spiral: Position[] = [];
  for (let i = 0; i <= 100; i++) {
    const t = i / 100, y = .84 + t * 4.65, radius = tierRadius(y) + .055, angle = t * Math.PI * 9.3;
    spiral.push([Math.cos(angle) * radius, y, Math.sin(angle) * radius]);
  }
  kit.tube('Spiral golden light wire', spiral, .013, gold, group, 160);
  for (let i = 0; i < 30; i++) {
    const p = spiral[Math.round(i / 29 * 99)];
    kit.sphere('Warm miniature tree bulb', [.042, .05, .042], p, warmLight, group);
  }
  for (let i = 0; i < 18; i++) {
    const t = (i + .35) / 19, y = .75 + t * 4.75, radius = tierRadius(y) + .04, angle = i * 2.399;
    const p: Position = [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
    kit.sphere('Jewel-glass Christmas ornament', [.10, .115, .10], p, i % 3 === 0 ? gold : i % 3 === 1 ? red : blue, group);
    kit.sphere('Ornament gold cap', [.03, .028, .03], [p[0], p[1] + .12, p[2]], gold, group);
  }
  const topper = kit.mesh('Golden Christmas star', kit.geometry('star', starGeometry), gold, [0, 6.05, 0], group); topper.scale.setScalar(.34);
  kit.sphere('Star warm center', [.07, .07, .022], [0, 6.05, .05], warmLight, group);
}

function gift(kit: GlobeKit, position: Position, size: Position, yaw: number, paper: Material, ribbon: Material) {
  const group = new T.Group(); group.name = 'Ribbon-wrapped present'; group.position.set(...position); group.rotation.y = yaw; kit.root.add(group);
  const [w, h, d] = size;
  kit.box('Polished wrapped gift', size, [0, h / 2, 0], paper, group);
  kit.box('Gift lid', [w + .035, .085, d + .035], [0, h - .015, 0], paper, group);
  kit.box('Gift front ribbon', [w * .16, h + .055, d + .048], [0, h / 2 + .012, 0], ribbon, group);
  kit.box('Gift side ribbon', [w + .048, h + .06, d * .16], [0, h / 2 + .014, 0], ribbon, group);
  for (const side of [-1, 1]) {
    const bow = kit.torus('Curled gift bow', .13, .025, [side * .105, h + .09, 0], ribbon, group); bow.scale.set(1, .55, .7); bow.rotation.y = side * .5;
  }
}

function pavilion(kit: GlobeKit, green: Material, gold: Material, snow: Material, warmLight: Material) {
  const group = new T.Group(); group.name = 'Miniature winter pavilion'; group.position.set(1.4, SNOW_GLOBE.snowY, -1.75); kit.root.add(group);
  kit.box('Pavilion snowy step', [2.35, .14, 1.55], [0, .07, 0], snow, group);
  const arch: Position[] = [[-1, .15, .48], [-1, 1.8, .48], [-.88, 2.35, .48], [-.5, 2.7, .48], [0, 2.82, .48], [.5, 2.7, .48], [.88, 2.35, .48], [1, 1.8, .48], [1, .15, .48]];
  kit.tube('Emerald pavilion arch', arch, .105, green, group, 72);
  kit.tube('Gold arch molding', arch.map(([x, y, z]) => [x * .95, y, z + .095] as Position), .027, gold, group, 72);
  kit.tube('Snow on pavilion roof', [[-1.03, 1.95, .48], [-.9, 2.44, .48], [-.5, 2.8, .48], [0, 2.91, .48], [.5, 2.8, .48], [.9, 2.44, .48], [1.03, 1.95, .48]], .095, snow, group, 64);
  kit.tube('Rear pavilion arch', arch.map(([x, y]) => [x, y, -.48] as Position), .08, green, group, 64);
  for (const x of [-1, 1]) {
    kit.box('Pavilion side lintel', [.13, .13, 1.2], [x, 1.92, 0], gold, group);
    kit.lathe('Pavilion column foot', [[0, 0], [.18, 0], [.2, .08], [.13, .2], [0, .2]], gold, [x, .12, .48], group);
  }
  for (let i = 0; i < 9; i++) {
    const angle = Math.PI * i / 8;
    kit.sphere('Pavilion festoon lamp', [.045, .06, .045], [-Math.cos(angle) * .89, 1.94 + Math.sin(angle) * .65, .62], warmLight, group);
  }
  kit.box('Pavilion snow-covered bench', [1.35, .13, .42], [0, .6, -.12], snow, group);
  for (const x of [-.48, .48]) kit.box('Pavilion bench leg', [.12, .48, .27], [x, .34, -.12], green, group);
}

/** Floor-relative, deterministic geometry; caller positions the returned group and disposes its shared assets. */
export function buildSnowGlobe(config: SnowGlobeConfig): T.Group {
  const kit = new GlobeKit();
  kit.root.name = 'Christmas snow globe'; kit.root.userData.prismSet = true; kit.root.userData.snowGlobe = true;
  const walnut = kit.material('#32150e', .27, .08, { clearcoat: .8, clearcoatRoughness: .16 });
  const darkWalnut = kit.material('#160b08', .36, .04, { clearcoat: .45 });
  const gold = kit.material('#dfb456', .2, .92, { clearcoat: .35 });
  const snow = kit.material('#eff6ff', .86, 0, { sheen: .2, sheenColor: '#d4e7ff', sheenRoughness: .85 });
  const green = kit.material('#065b37', .34, .12, { clearcoat: .28, sheen: .2, sheenColor: '#2c9872' });
  const red = kit.material('#b90827', .16, .32, { clearcoat: 1, clearcoatRoughness: .1 });
  const blue = kit.material('#0948ba', .17, .4, { clearcoat: 1, clearcoatRoughness: .1 });
  const accent = kit.material(config.accent, .22, .5, { clearcoat: .7 });
  const warmLight = kit.material('#ffe0a3', .25, .1, { emissive: '#ffbd61', emissiveIntensity: Math.max(0, config.glow) });
  plinth(kit, walnut, darkWalnut, gold, snow);
  tree(kit, config, green, snow, gold, red, blue, warmLight, walnut);
  if (config.decorations) {
    pavilion(kit, green, gold, snow, warmLight);
    gift(kit, [-1.4, 1.3, .65], [.8, .56, .66], -.16, red, gold);
    gift(kit, [-.4, 1.3, 1.04], [.64, .79, .6], .22, blue, gold);
    gift(kit, [.6, 1.3, .7], [.77, .46, .64], -.13, accent, gold);
    gift(kit, [1.42, 1.3, .72], [.5, .66, .54], .33, red, gold);
    gift(kit, [-2.33, 1.3, .22], [.57, .4, .55], .14, accent, red);
    kit.sphere('Small powder snow drift', [.62, .12, .38], [-.1, 1.31, -.2], snow);
    kit.sphere('Snow drift by the pavilion', [.65, .10, .38], [2.08, 1.31, -.62], snow);
  }
  const glass = kit.material('#ffffff', .025, 0, { transmission: 1, ior: 1.46, thickness: .06, transparent: false, opacity: 1, attenuationColor: '#effaff', attenuationDistance: 60, envMapIntensity: .8, side: T.FrontSide });
  const shell = kit.mesh('Hollow crystal glass dome', glassShellGeometry(), glass, [0, 0, 0]);
  delete shell.userData.globeInterior;
  shell.userData.focusDepthIgnore = true;
  shell.userData.globeGlass = true;
  shell.castShadow = false;
  kit.root.updateMatrixWorld(true);
  return kit.root;
}
