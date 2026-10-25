import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as T from 'three';
import { buildToyFactory, buildFactoryParcel, buildFactoryWagon } from '../lib/toy-factory-set';

const config = { accent: '#e02443', decorations: true, glow: 1.2 };
const epsilon = 1e-5;
function dispose(group: T.Group) { const geometries = new Set<T.BufferGeometry>(), materials = new Set<T.Material>(); group.traverse(o => { if (o instanceof T.Mesh) { geometries.add(o.geometry); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m)); } }); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); }
function findPart(root: T.Group, tag: string) { let result: T.Object3D | undefined; root.traverse(o => { if (o.userData.factoryPart === tag) result = o; }); assert.ok(result, `Required part ${tag}`); return result; }
function collidingMeshes(root: T.Group, box: T.Box3) {
  const collisions: string[] = [], triangle = new T.Triangle(); root.updateMatrixWorld(true);
  root.traverse(o => {
    if (!(o instanceof T.Mesh) || !new T.Box3().setFromObject(o).intersectsBox(box)) return;
    const p = o.geometry.getAttribute('position'), ix = o.geometry.index, count = ix?.count ?? p.count;
    for (let n = 0; n < count; n += 3) { triangle.a.fromBufferAttribute(p, ix ? ix.getX(n) : n).applyMatrix4(o.matrixWorld); triangle.b.fromBufferAttribute(p, ix ? ix.getX(n + 1) : n + 1).applyMatrix4(o.matrixWorld); triangle.c.fromBufferAttribute(p, ix ? ix.getX(n + 2) : n + 2).applyMatrix4(o.matrixWorld); if (box.intersectsTriangle(triangle)) { collisions.push(o.name); break; } }
  });
  return collisions;
}

test('Toy factory assets are finite physical meshes inside the rendering budget', () => {
  for (const [name, group, meshBudget, triangleBudget] of [['factory', buildToyFactory(config), 700, 550000], ['parcel', buildFactoryParcel(), 100, 50000], ['wagon', buildFactoryWagon(), 100, 50000]] as const) {
    let meshes = 0, triangles = 0;
    group.traverse(o => {
      assert.ok(!(o instanceof T.Light), 'Set uses emissive meshes and the scene lighting rig');
      if (!(o instanceof T.Mesh)) return; meshes++; const p = o.geometry.getAttribute('position'), n = o.geometry.getAttribute('normal'); triangles += (o.geometry.index?.count ?? p.count) / 3;
      assert.ok(o.material instanceof T.MeshPhysicalMaterial);
      for (const value of p.array) assert.ok(Number.isFinite(value), `${o.name} finite position`);
      for (const value of n.array) assert.ok(Number.isFinite(value), `${o.name} finite normal`);
      assert.ok(!o.geometry.boundingSphere || Number.isFinite(o.geometry.boundingSphere.radius));
    });
    assert.ok(meshes < meshBudget, `${name}: ${meshes} meshes`); assert.ok(triangles < triangleBudget, `${name}: ${triangles} triangles`); dispose(group);
  }
});

test('Factory rails have the correct gauge/contact height and a clear locomotive corridor', () => {
  const set = buildToyFactory(config); const rails: T.Mesh[] = []; set.traverse(o => { if (o instanceof T.Mesh && o.userData.factoryRail) rails.push(o); });
  assert.equal(rails.length, 2);
  for (const rail of rails) { const b = new T.Box3().setFromObject(rail); assert.ok(Math.abs(b.max.y - .26) < epsilon); assert.ok(Math.abs(b.getCenter(new T.Vector3()).z - (-4 + rail.userData.railOffset)) < epsilon); assert.ok(b.min.x <= -17 + epsilon && b.max.x >= 45 - epsilon); }
  assert.ok(Math.abs(rails[1].position.z - rails[0].position.z - 1.2) < epsilon);
  const clearCorridor = new T.Box3(new T.Vector3(-17, .28, -5.38), new T.Vector3(45, 3.16, -2.62));
  assert.deepEqual(collidingMeshes(set, clearCorridor), []); dispose(set);
});

test('Parcel transport clears the belt, assembly head, wrapper hoop and portal', () => {
  const set = buildToyFactory(config); let beltCount = 0;
  set.traverse(o => { if (o instanceof T.Mesh && o.userData.factoryPart === 'belt-slat') { beltCount++; const b = new T.Box3().setFromObject(o); assert.ok(Math.abs(b.max.y - 1.6) < epsilon); } }); assert.ok(beltCount > 30);
  // The robot stays below the lowest assembly stroke (including its short .18 rise).
  const parcel = buildFactoryParcel(), toy = findPart(parcel, 'toy'), toyBounds = new T.Box3().setFromObject(toy);
  assert.ok(toyBounds.max.y <= 1.5 + epsilon); assert.ok(toyBounds.min.y >= -epsilon); assert.ok(toyBounds.getSize(new T.Vector3()).x <= 1.1 + epsilon);
  assert.ok(1.61 + toyBounds.max.y + .18 < 4.8 - .97 - .12 - .35);
  for (const x of [-12, -9, -6, -3, -1, 0, .6, 2, 6, 9, 11]) { const box = new T.Box3(new T.Vector3(x - .78, 1.61, 1.22), new T.Vector3(x + .78, 3.32, 2.78)); assert.deepEqual(collidingMeshes(set, box), [], `Parcel clears at x=${x}`); }
  // Folded panel sweeps at x=-3 are genuinely free of machine columns.
  const paper = findPart(parcel, 'paper'); parcel.position.set(-3, 1.61, 2);
  for (const progress of [0, .25, .5, .75, 1]) { paper.traverse(o => { if (Number.isInteger(o.userData.factoryPanel)) o.rotation[o.userData.axis as 'x' | 'z'] = o.userData.openAngle * (1 - progress); }); parcel.updateMatrixWorld(true); assert.deepEqual(collidingMeshes(set, new T.Box3().setFromObject(paper)), [], `Paper fold clear at ${progress}`); }
  dispose(set); dispose(parcel);
});

test('Parcel parts, crane reach and wagon deck agree on the loading dimensions', () => {
  const set = buildToyFactory(config), parcel = buildFactoryParcel(), wagon = buildFactoryWagon();
  const toyParts = new Set<number>(); parcel.traverse(o => { if (Number.isInteger(o.userData.factoryToyPart)) { toyParts.add(o.userData.factoryToyPart); assert.deepEqual(o.position.toArray(), o.userData.restPosition); } }); assert.deepEqual([...toyParts].sort(), [0, 1, 2, 3, 4, 5]);
  for (const tag of ['toy', 'paper', 'lid', 'ribbon', 'bow']) assert.ok(findPart(parcel, tag));
  const deck = wagon.getObjectByName('Wagon walnut loading deck')!; const b = new T.Box3().setFromObject(deck); assert.ok(Math.abs(b.max.y - 1.1) < epsilon);
  assert.ok(wagon.userData.deckClearSize[0] > 1.56 && wagon.userData.deckClearSize[1] > 1.56);
  const wheels: T.Object3D[] = []; wagon.traverse(o => { if (o.userData.trainWheel) wheels.push(o); }); assert.equal(wheels.length, 4); for (const wheel of wheels) assert.ok(Math.abs(new T.Box3().setFromObject(wheel).min.y) < epsilon);
  const trolley = findPart(set, 'crane-trolley'), cable = findPart(set, 'crane-cable'), grip = findPart(set, 'crane-grip'); assert.equal(cable.parent, trolley); assert.equal(grip.parent, trolley); assert.deepEqual(cable.position.toArray(), [0, 0, 0]);
  for (const y of [1.61, 4.1, 1.36]) { const gripY = y + 1.7, length = 6.6 - gripY; assert.ok(length > 0); grip.position.y = -length; cable.scale.y = length; set.updateMatrixWorld(true); const cableBounds = new T.Box3().setFromObject(cable); assert.ok(Math.abs(cableBounds.min.y - gripY) < epsilon); }
  assert.ok(Math.abs(.26 + b.max.y - 1.36) < epsilon);
  dispose(set); dispose(parcel); dispose(wagon);
});
