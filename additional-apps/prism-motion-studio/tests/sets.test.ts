import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as T from 'three';
import { buildSet, disposeSet, setCatalog, type SetConfig } from '../lib/sets';

const config = (id: SetConfig['id'], decorations = true): SetConfig => ({ id, accent: '#00d8ff', scale: 1, rotation: 0, offsetZ: 0, decorations, glow: 1.2 });

test('Cinematic sets contain finite physical meshes within their rendering budgets', () => {
  for (const preset of setCatalog.filter(p => p.id !== 'aquarium' && p.id !== 'none' && p.id !== 'snow-globe' && p.id !== 'miniature-town' && p.id !== 'toy-factory')) {
    const group = buildSet(config(preset.id), -2.7);
    let meshes = 0, triangles = 0;
    group.traverse(child => {
      assert.ok(!(child instanceof T.Light), 'Sets use the scene lighting rig');
      if (!(child instanceof T.Mesh)) return;
      meshes++;
      const geometry = child.geometry as T.BufferGeometry;
      assert.ok(geometry.attributes.position.count > 0, child.name);
      for (const n of geometry.attributes.position.array) assert.ok(Number.isFinite(n), `${preset.id}: ${child.name}`);
      for (const n of geometry.attributes.normal.array) assert.ok(Number.isFinite(n), `${preset.id}: finite normal`);
      triangles += (geometry.index?.count ?? geometry.attributes.position.count) / 3;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) assert.ok(material instanceof T.MeshStandardMaterial, 'Every surface can be path traced');
      assert.ok(child.castShadow || child.name === 'Speaker illuminated surround');
    });
    assert.ok(meshes >= 40, `${preset.id} contains a complete environment`);
    assert.ok(meshes < 250, `${preset.id}: ${meshes} meshes`);
    assert.ok(triangles < 250000, `${preset.id}: ${triangles} triangles`);
    const bounds = new T.Box3().setFromObject(group);
    assert.ok(bounds.min.x < -10 && bounds.max.x > 10);
    assert.ok(bounds.max.y > 4 && bounds.min.z < -10);
    disposeSet(group);
  }
});

test('Default cinematic sets leave a broad three-dimensional opening for the title', () => {
  const opening = new T.Box3(new T.Vector3(-6, .7, -1), new T.Vector3(6, 4.7, 1));
  for (const preset of setCatalog.filter(p => p.id !== 'aquarium' && p.id !== 'none' && p.id !== 'snow-globe' && p.id !== 'miniature-town' && p.id !== 'toy-factory')) {
    const group = buildSet(config(preset.id), 0);
    group.traverse(child => {
      if (!(child instanceof T.Mesh)) return;
      const bounds = new T.Box3().setFromObject(child);
      assert.ok(!bounds.intersectsBox(opening), `${preset.id}: ${child.name} should not intrude into the title opening`);
    });
    disposeSet(group);
  }
});

test('Set transforms, emissive strength and decoration controls are deterministic', () => {
  for (const preset of setCatalog.filter(p => p.id !== 'aquarium' && p.id !== 'none' && p.id !== 'snow-globe' && p.id !== 'miniature-town' && p.id !== 'toy-factory')) {
    const c = { ...config(preset.id), scale: 1.3, rotation: 30, offsetZ: -4, glow: 2.4 };
    const decorated = buildSet(c, -3), simple = buildSet({ ...c, decorations: false }, -3);
    assert.deepEqual(decorated.position.toArray(), [0, -3, -4]);
    assert.deepEqual(decorated.scale.toArray(), [1.3, 1.3, 1.3]);
    assert.ok(Math.abs(decorated.rotation.y - Math.PI / 6) < 1e-12);
    let fullMeshes = 0, simpleMeshes = 0, emission = 0;
    decorated.traverse(o => { if (o instanceof T.Mesh) { fullMeshes++; const m = o.material as T.MeshPhysicalMaterial; emission = Math.max(emission, m.emissiveIntensity); } });
    simple.traverse(o => { if (o instanceof T.Mesh) simpleMeshes++; });
    assert.ok(fullMeshes > simpleMeshes);
    assert.equal(emission, 2.4);
    disposeSet(decorated); disposeSet(simple);
  }
  const empty = buildSet(config('none'), -2.7); assert.equal(empty.children.length, 0); disposeSet(empty);
});

test('Disposing a set releases each shared geometry and material only once', () => {
  const group = buildSet(config('christmas-pavilion'), -2.7);
  const counts = new Map<T.EventDispatcher<{ dispose: {} }>, number>();
  group.traverse(child => {
    if (!(child instanceof T.Mesh)) return;
    const resources = [child.geometry, ...(Array.isArray(child.material) ? child.material : [child.material])];
    for (const resource of resources) if (!counts.has(resource)) {
      counts.set(resource, 0); resource.addEventListener('dispose', () => counts.set(resource, counts.get(resource)! + 1));
    }
  });
  disposeSet(group);
  assert.equal(group.children.length, 0);
  for (const count of counts.values()) assert.equal(count, 1);
  disposeSet(group);
  for (const count of counts.values()) assert.equal(count, 1);
});
