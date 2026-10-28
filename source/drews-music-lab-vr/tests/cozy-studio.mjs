import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../dist/vendor/three.module.js';
import {arrangeCozyStudio,buildCozyStudio} from '../dist/cozy-studio.js';
import {optimizeRoom} from '../dist/performance.js';

const source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const context={diatonic:[0,2,4,5,7,9,11,12,14,16,17,19,21]};
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('const specs=['),source.indexOf('arrangeCozyStudio(specs);'))+'globalThis.stations=specs;',context);
const stations=context.stations;
const identity=stations.map(s=>({id:s.id,midi:s.midi,notes:s.notes?[...s.notes]:null,rot:s.rot||0}));
arrangeCozyStudio(stations);
assert.deepEqual(stations.map(s=>({id:s.id,midi:s.midi,notes:s.notes?[...s.notes]:null,rot:s.rot||0})),identity,'arrangement preserves pitches, station identity and facing');
for(const s of stations) {
  s.group=new THREE.Group();s.group.position.set(s.x,0,s.z);
  if(s.type!=='gallery')assert.ok(Math.abs(s.x)<8.8&&Math.abs(s.z)<9,'station remains inside the main room');
}
for(const s of stations.filter(s=>['maracas','tambourine','cowbell'].includes(s.type)))
  assert.ok(s.x+.6<-2.6,'small percussion clears the central entrance route');
const scene=new THREE.Scene(),rig=new THREE.Group();scene.add(rig);
const studio=buildCozyStudio(scene,stations);
scene.updateMatrixWorld(true);
assert.equal(studio.blockers.length,3);
let lights=0,triangles=0;scene.traverse(o=>{if(o.isLight)lights++;if(o.isMesh)triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});
assert.equal(lights,0,'decor does not add expensive lighting passes');
assert.ok(triangles<30000,'cozy furniture has a bounded geometry cost');

const floor=new THREE.Mesh(new THREE.PlaneGeometry(7.8,9.3),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
floor.rotation.x=-Math.PI/2;floor.position.z=13.95;scene.add(floor);scene.updateMatrixWorld(true);
const cast=(x,z)=>new THREE.Raycaster(new THREE.Vector3(x,2,z),new THREE.Vector3(0,-1,0)).intersectObjects([...studio.blockers,floor],false);
for(const x of [-3.03,3.03])assert.ok(studio.blockers.includes(cast(x,14.25)[0].object),'sofa stops floor-selection rays');
for(const z of [10,12,14,16,17.5])for(const x of [-2.25,0,2.25])
  assert.equal(cast(x,z)[0].object,floor,'wide central lounge path stays selectable');

const alto=stations.find(s=>s.id==='ax');alto.group.position.set(-5.05,.2,.25);
studio.select(alto);assert.equal(studio.focus.visible,true);assert.equal(studio.focus.position.x,-5.05);assert.ok(Math.abs(studio.focus.position.z-.43)<1e-9,'outline follows saved reach offset');
optimizeRoom(scene,rig);
assert.ok(studio.focus.parent,'selection outline survives decoration batching');
assert.equal(studio.focus.matrixAutoUpdate,true,'outline can still move after batching');
studio.select(stations.find(s=>s.id==='steelpan'));assert.equal(studio.focus.position.x,0);assert.ok(studio.focus.visible);
studio.select(stations.find(s=>s.id==='gallery'));assert.equal(studio.focus.visible,false,'utility stations do not show an instrument ring');
studio.select(null);assert.equal(studio.focus.visible,false);
scene.updateMatrixWorld(true);
for(const x of [-3.03,3.03])assert.ok(studio.blockers.includes(cast(x,14.25)[0].object),'furniture ray boundaries survive batching');
console.log('PASS: station identity, clear entrance/lounge routes, furniture ray boundaries, bounded decoration, no extra lights and movable selection outline after batching.');
