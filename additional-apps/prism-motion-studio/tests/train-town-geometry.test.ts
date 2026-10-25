import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as T from 'three';
import { buildTrainTown, buildMiniatureTrain, animateTrain, TRAIN_ROUTE_POINTS, TRAIN_ROUTE_CLOSED } from '../lib/train-town';

const config = { accent: '#dd4a3c', decorations: true, glow: 1.2 };
const route = () => { const curve = new T.CatmullRomCurve3(TRAIN_ROUTE_POINTS.map(p => new T.Vector3(...p)), TRAIN_ROUTE_CLOSED, 'centripetal'); curve.arcLengthDivisions = 2400; return curve; };
function dispose(group: T.Group) { const geometries = new Set<T.BufferGeometry>(), materials = new Set<T.Material>(); group.traverse(o => { if (o instanceof T.Mesh) { geometries.add(o.geometry); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m)); } }); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); }

test('Miniature town and locomotive contain finite smooth physical geometry within budget', () => {
  for (const [name, group, limit] of [['town', buildTrainTown(config), 500000], ['train', buildMiniatureTrain(), 150000]] as const) {
    let triangles = 0, meshes = 0;
    group.traverse(o => {
      assert.ok(!(o instanceof T.Light));
      if (!(o instanceof T.Mesh)) return;
      meshes++; const p = o.geometry.getAttribute('position'), n = o.geometry.getAttribute('normal'); triangles += (o.geometry.index?.count ?? p.count) / 3;
      for (const value of p.array) assert.ok(Number.isFinite(value), `${o.name}: finite position`);
      for (const value of n.array) assert.ok(Number.isFinite(value), `${o.name}: finite normal`);
      assert.ok(o.material instanceof T.MeshStandardMaterial, 'Mesh remains compatible with the physical export');
    });
    assert.ok(meshes < 700, `${name}: ${meshes} meshes`); assert.ok(triangles < limit, `${name}: ${triangles} triangles`);
    dispose(group);
  }
});

test('Both rails follow the supplied arc-length route with exact gauge and wheel-contact height', () => {
  const group = buildTrainTown(config), curve = route(), normal = new T.Vector3();
  let count = 0;
  group.traverse(o => {
    if (!(o instanceof T.Mesh) || !o.userData.trainRail) return;
    count++; const p = o.geometry.getAttribute('position'), segments = o.userData.routeSegments as number, profile = o.userData.profileSize as number;
    for (let i = 0; i < segments; i += 5) {
      const center = curve.getPointAt(i / segments), tangent = curve.getTangentAt(i / segments); normal.set(tangent.z, 0, -tangent.x).normalize();
      // The symmetric pair at the top of the rail averages to the gauge center.
      const a = new T.Vector3().fromBufferAttribute(p, i * profile + 7), b = new T.Vector3().fromBufferAttribute(p, i * profile + 8), top = a.add(b).multiplyScalar(.5);
      const expected = center.clone().addScaledVector(normal, o.userData.railOffset);
      assert.ok(top.distanceTo(expected) < .00001, `Rail follows route at ${i}`);
      assert.ok(Math.abs(top.y - .26) < .00001);
      assert.ok(o.geometry.getAttribute('normal').getY(i * profile + 7) > .4, 'Rail head normals face upward');
    }
  });
  assert.equal(count, 2); assert.ok(curve.getPointAt(0).distanceTo(curve.getPointAt(1)) < 1e-9);
  dispose(group);
});

test('Buildings, trees and lamps preserve a clear 2.8-meter-wide railway corridor', () => {
  const group = buildTrainTown(config), curve = route(), samples = Array.from({ length: 1200 }, (_, i) => curve.getPointAt(i / 1200));
  let buildings = 0;
  group.traverse(o => {
    if (!o.userData.trackObstacle) return;
    if (o.userData.trainBuilding) buildings++;
    const bounds = new T.Box3().setFromObject(o);
    for (const p of samples) {
      const dx = Math.max(bounds.min.x - p.x, 0, p.x - bounds.max.x), dz = Math.max(bounds.min.z - p.z, 0, p.z - bounds.max.z);
      assert.ok(Math.hypot(dx, dz) >= 1.4, `${o.name} clears the track: ${Math.hypot(dx, dz)}`);
    }
  });
  assert.ok(buildings >= 12); dispose(group);
});

test('Locomotive cab has an open forward window and distance-based wheels scrub deterministically', () => {
  const train = buildMiniatureTrain(); train.updateMatrixWorld(true);
  assert.deepEqual(train.userData.cabEye, [0, 1.85, -.6]);
  const ray = new T.Raycaster(new T.Vector3(0, 1.85, -.6), new T.Vector3(0, 0, 1), 0, .91);
  assert.equal(ray.intersectObject(train, true).length, 0, 'No wall, pane or roof obstructs the front cab opening');
  const bounds = new T.Box3().setFromObject(train); assert.ok(Math.abs(bounds.min.y) < 1e-6); assert.ok(bounds.max.y >= 2.5);
  const wheels: T.Object3D[] = []; train.traverse(o => { if (o.userData.trainWheel) wheels.push(o); }); assert.equal(wheels.length, 6);
  animateTrain(train, 5, 7.5); const rotation = wheels.map(w => w.rotation.x); assert.deepEqual(rotation, [25, 25, 25, 25, 25, 25]);
  animateTrain(train, 9, 12); animateTrain(train, 5, 7.5); assert.deepEqual(wheels.map(w => w.rotation.x), rotation);
  dispose(train);
});
