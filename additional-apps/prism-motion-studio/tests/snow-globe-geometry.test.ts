import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as T from 'three';
import { buildSnowGlobe, SNOW_GLOBE } from '../lib/snow-globe';
import { disposeSet } from '../lib/sets';

const config = { accent: '#bd0928', decorations: true, glow: 1.6 };

test('Snow globe uses finite physical meshes and keeps its miniature scene inside the glass', () => {
  const group = buildSnowGlobe(config), center = new T.Vector3(...SNOW_GLOBE.center), p = new T.Vector3();
  let meshes = 0, triangles = 0;
  group.traverse(child => {
    assert.ok(!(child instanceof T.Light));
    if (!(child instanceof T.Mesh)) return;
    meshes++;
    const geometry = child.geometry as T.BufferGeometry, position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal');
    triangles += (geometry.index?.count ?? position.count) / 3;
    assert.ok(child.material instanceof T.MeshPhysicalMaterial);
    for (let i = 0; i < position.count; i++) {
      p.fromBufferAttribute(position, i).applyMatrix4(child.matrixWorld);
      assert.ok(p.toArray().every(Number.isFinite), child.name);
      assert.ok(p.y >= -.00001, `${child.name} stays above the plinth bottom`);
      if (child.userData.globeInterior) {
        assert.ok(p.distanceTo(center) <= SNOW_GLOBE.radius + .0001, `${child.name} fits inside the globe: ${p.toArray()}`);
        if (Math.abs(p.x) < 3 && p.y >= 4.7 && p.y <= 7.1) assert.ok(p.z <= -.5, `${child.name} stays behind the title: ${p.toArray()}`);
      }
    }
    for (const n of normal.array) assert.ok(Number.isFinite(n), `${child.name} has finite normals`);
  });
  assert.ok(meshes > 100 && meshes < 250, `${meshes} meshes`);
  assert.ok(triangles < 220000, `${triangles} triangles`);
  const bounds = new T.Box3().setFromObject(group);
  assert.ok(Math.abs(bounds.min.y) < 1e-6);
  assert.ok(Math.abs(bounds.max.y - 12.1) < 1e-5);
  assert.ok(bounds.min.x > -6.001 && bounds.max.x < 6.001);
  disposeSet(group);
});

test('Glass dome is a closed thin shell with opposite inner and outer surface normals', () => {
  const group = buildSnowGlobe(config);
  const glass = group.getObjectByName('Hollow crystal glass dome') as T.Mesh<T.BufferGeometry, T.MeshPhysicalMaterial>;
  assert.ok(glass.userData.globeGlass && glass.userData.focusDepthIgnore);
  assert.equal(glass.castShadow, false);
  assert.equal(glass.material.transmission, 1);
  assert.equal(glass.material.opacity, 1);
  assert.equal(glass.material.transparent, false);
  assert.equal(glass.material.ior, 1.46);
  const edges = new Map<string, number>();
  const index = glass.geometry.getIndex()!;
  for (let i = 0; i < index.count; i += 3) {
    const tri = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
    for (let j = 0; j < 3; j++) {
      const a = tri[j], b = tri[(j + 1) % 3], key = `${Math.min(a, b)}:${Math.max(a, b)}`;
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  for (const count of edges.values()) assert.equal(count, 2, 'Every shell edge joins two faces');
  const position = glass.geometry.getAttribute('position'), normal = glass.geometry.getAttribute('normal'), center = new T.Vector3(...SNOW_GLOBE.center);
  let inner = 0, outer = 0;
  for (let i = 0; i < position.count; i++) {
    const direction = new T.Vector3().fromBufferAttribute(position, i).sub(center), n = new T.Vector3().fromBufferAttribute(normal, i), radius = direction.length();
    if (Math.abs(radius - 6) < .00001) { assert.ok(direction.dot(n) > 5.9); outer++; }
    else { assert.ok(Math.abs(radius - 5.94) < .00001); assert.ok(direction.dot(n) < -5.9); inner++; }
  }
  assert.equal(inner, outer);
  disposeSet(group);
});

test('Decoration toggle reduces meshes, and shared globe resources dispose once', () => {
  const full = buildSnowGlobe(config), plain = buildSnowGlobe({ ...config, decorations: false });
  let a = 0, b = 0;
  full.traverse(o => { if (o instanceof T.Mesh) a++; }); plain.traverse(o => { if (o instanceof T.Mesh) b++; });
  assert.ok(a > b + 40);
  const resources = new Map<T.BufferGeometry | T.Material, number>();
  full.traverse(o => {
    if (!(o instanceof T.Mesh)) return;
    for (const resource of [o.geometry, ...(Array.isArray(o.material) ? o.material : [o.material])]) {
      if (resources.has(resource)) continue;
      resources.set(resource, 0); resource.addEventListener('dispose', () => resources.set(resource, resources.get(resource)! + 1));
    }
  });
  disposeSet(full); disposeSet(full);
  for (const n of resources.values()) assert.equal(n, 1);
  disposeSet(plain);
});
