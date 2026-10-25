import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { TTFLoader } from 'three/addons/loaders/TTFLoader.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import * as THREE from 'three';
import { fontList,makeProp,classify } from '../lib/engine';
import { sceneSchema,demoScene,props,samplePose,framePlan,makeObject } from '../lib/scene';

test('All 16 bundled fonts produce finite, nonempty extruded geometry with holes',async()=>{
 assert.equal(fontList.length,16);
 for(const f of fontList){const bytes=await readFile('public'+f.file);const data=new TTFLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length));const font=new FontLoader().parse(data);const shapes=font.generateShapes('BO8',1);if(f.id!=='blackopsone')assert.ok(shapes.some(s=>s.holes.length>0),f.name+' should retain enclosed counters'); // Black Ops One uses open stencil counters.
const geo=new TextGeometry('Welcome 2026!',{font,size:1,depth:.28,bevelEnabled:true,bevelThickness:.02,bevelSize:.02,bevelSegments:3,curveSegments:6});classify(geo,.28);assert.equal(geo.groups.length,4,f.name+' face/side/bevel/back batches');geo.computeBoundingBox();assert.ok(geo.attributes.position.count>0,f.name);assert.ok([...geo.attributes.position.array].every(Number.isFinite),f.name);assert.ok(geo.boundingBox!.max.z-geo.boundingBox!.min.z>.27,f.name);geo.dispose();}
});
test('All everyday props contain finite 3D meshes',()=>{for(const p of props){const g=makeProp(p,new THREE.MeshStandardMaterial());let count=0;g.traverse(o=>{if(o instanceof THREE.Mesh){count++;assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite),p);assert.ok(o.geometry.attributes.position.count>0,p);o.geometry.dispose();}});assert.ok(count,p);}});
test('All four editable templates validate without losing IDs',()=>{for(const p of ['gold','classroom','neon','celebrate']){const s=sceneSchema.parse(demoScene(p));assert.equal(s.fps,60);assert.equal(s.objects.length,4);assert.equal(new Set(s.objects.map(o=>o.id)).size,4)}});
test('Rotation keyframes preserve a full unwrapped 360 degree turn',()=>{const o=makeObject();o.keys=[{time:0,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],easing:'linear'},{time:8,position:[4,2,-1],rotation:[0,360,90],scale:[2,2,2],easing:'linear'}];assert.deepEqual(samplePose(o,4),{position:[2,1,-.5],rotation:[0,180,45],scale:[1.5,1.5,1.5]});assert.equal(samplePose(o,8).rotation[1],360);assert.equal(samplePose(o,10).rotation[1],360);});
test('60 FPS export enumerates exactly 480 evenly timed frames for eight seconds',()=>{const f=framePlan(8,60);assert.equal(f.length,480);assert.equal(f[0].time,0);assert.equal(f[479].time,479/60);assert.ok(Math.abs(f.at(-1)!.time+f.at(-1)!.duration-8)<1e-12);for(let i=1;i<f.length;i++)assert.ok(Math.abs(f[i].time-f[i-1].time-1/60)<1e-12)});
test('Scene validation rejects corrupt geometry transforms and unsafe frame timelines',()=>{const s=demoScene();s.objects[0].position[0]=NaN;assert.equal(sceneSchema.safeParse(s).success,false);const d=demoScene();d.objects.push(d.objects[0]);assert.equal(sceneSchema.safeParse(d).success,false);const k=demoScene();k.objects[0].keys=[{time:9,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],easing:'linear'}];assert.equal(sceneSchema.safeParse(k).success,false);});
