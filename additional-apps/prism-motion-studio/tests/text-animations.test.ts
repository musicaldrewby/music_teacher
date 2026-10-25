import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as T from 'three';
import {sceneSchema,demoScene,makeObject,sequenceSchema} from '../lib/scene';
import {sampleStage} from '../lib/sequence';
import {sampleHold} from '../lib/performance';
import {textAnimations} from '../lib/text-animation-catalog';
import {animateGroup} from '../lib/motion';
import {splitGeometry} from '../lib/text-motion-effects';
import {buildBlenderTransfer,sampleMeshTransform} from '../lib/blender-transfer';

function title(){const root=new T.Group();root.userData.letters=4;root.userData.words=2;for(let i=0;i<4;i++){const m=new T.Mesh(new T.BoxGeometry(.6,1,.2),new T.MeshStandardMaterial());m.position.set(i*.8,0,0);m.userData={base:m.position.clone(),index:i,word:Math.floor(i/2)};root.add(m);}return root;}
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-6,`${a} ≈ ${b}`);
test('All 36 new choices validate, round-trip in saved scenes, and animate in all grouping modes',()=>{
 assert.equal(textAnimations.length,36);assert.equal(new Set(textAnimations.map(a=>a[0])).size,36);
 for(const [id,,phase] of textAnimations)for(const unit of ['letter','word','object'] as const){const s=demoScene(),o=s.objects[0];o.sequence=sequenceSchema.parse({enabled:true,enter:2,hold:4,leave:2,unit,[phase==='hold'?'holdMotion':phase==='entrance'?'entrance':'exit']:id});
  assert.equal(sceneSchema.parse(JSON.parse(JSON.stringify(s))).objects[0].sequence[phase==='hold'?'holdMotion':phase==='entrance'?'entrance':'exit'],id);
  const g=title();for(const time of [0,.4,1.5,2,3.2,5.9,6,7.3,7.99,8]){animateGroup(g,o,time,8);g.updateMatrixWorld(true);g.traverse(n=>{assert.ok(n.matrixWorld.elements.every(Number.isFinite),id);if(n instanceof T.Mesh){for(const m of Array.isArray(n.material)?n.material:[n.material])assert.ok(Number.isFinite(m.opacity)&&m.opacity>=0&&m.opacity<=1,id);}});}
 }
});
test('Reverse order changes the arriving unit while preserving total timing and direction mirrors travel',()=>{
 const q=sequenceSchema.parse({enabled:true,entrance:'conveyor-belt',enter:2,hold:2,leave:1,stagger:.15});
 const first=sampleStage(q,.2,0,4),last=sampleStage({...q,reverse:true},.2,3,4);assert.deepEqual(first,last);
 const a=sampleStage(q,.6,0,4),b=sampleStage({...q,direction:'left'},.6,0,4);close(a.position[0],-b.position[0]);
});
test('New hold movements phase across letters, return to rest, and remain reproducible after reverse seeking',()=>{
 for(const [id,,phase] of textAnimations.filter(a=>a[2]==='hold')){const sample=sampleHold(id,1.37,4,1,2,5);sampleHold(id,3.8,4,3,4,5);assert.deepEqual(sampleHold(id,1.37,4,1,2,5),sample);assert.deepEqual(sampleHold(id,4,4,1,2,5),sampleHold('still',0,4,1));}
 assert.notDeepEqual(sampleHold('marching-letters',1,4,1,0,4),sampleHold('marching-letters',1,4,1,1,4));
});
test('Whole-word motion preserves letter spacing by sharing a pivot',()=>{
 const o=makeObject();o.sequence=sequenceSchema.parse({enabled:true,entrance:'turn-the-page',enter:2,hold:4,leave:2,unit:'word'});const g=title();animateGroup(g,o,.7,8);
 const a=g.children[0] as T.Mesh,b=g.children[1] as T.Mesh;close(a.position.distanceTo(b.position),.8);close(a.rotation.y,b.rotation.y);
});
test('Curtain halves really split the geometry and preserve material groups',()=>{
 const source=new T.BoxGeometry(2,2,.3);for(const side of [-1,1] as const){const half=splitGeometry(source,side);half.computeBoundingBox();assert.ok(half.getAttribute('position').count>0);assert.ok(half.groups.length>0);const bound=side===-1?half.boundingBox!.max.x:half.boundingBox!.min.x;close(bound,0);assert.ok([...half.getAttribute('position').array].every(Number.isFinite));}
});
test('Focus, curtain, and echo meshes exist before their active frames for Blender export and reverse seeking',()=>{
 for(const effect of ['focus-reveal','curtain-reveal','receding-echo']){const o=makeObject();o.sequence=sequenceSchema.parse({enabled:true,entrance:effect==='receding-echo'?'fade':effect,exit:effect==='receding-echo'?effect:'fade',enter:2,hold:4,leave:2});const root=title();const world=new T.Scene();world.add(root);animateGroup(root,o,3,8);const transfer=buildBlenderTransfer(world);const expected=effect==='focus-reveal'?36:effect==='curtain-reveal'?12:16;if(effect==='curtain-reveal')assert.ok(transfer.sources.length>=8);else assert.equal(transfer.sources.length,expected,effect);assert.ok(transfer.sources.every(s=>s.mesh.geometry.getAttribute('position').count>0));
  const at=effect==='receding-echo'?7:1;animateGroup(root,o,at,8);world.updateMatrixWorld(true);const first=transfer.sources.map(s=>sampleMeshTransform(s.mesh));assert.ok(root.children.some(n=>n.children.some(c=>c.userData.motionGhost&&c.visible)),effect);
  animateGroup(root,o,7.99,8);animateGroup(root,o,at,8);world.updateMatrixWorld(true);assert.deepEqual(transfer.sources.map(s=>sampleMeshTransform(s.mesh)),first);transfer.dispose();}
});
test('Legacy scenes acquire safe control defaults and changing effects removes obsolete ghost geometry',()=>{
 const q=sequenceSchema.parse({});assert.equal(q.reverse,false);assert.equal(q.direction,'right');assert.equal(q.settle,1);
 const o=makeObject();o.sequence=sequenceSchema.parse({enabled:true,entrance:'focus-reveal'});const g=title();animateGroup(g,o,.5,8);assert.ok(g.children[0].children.length>0);o.sequence.entrance='rise';animateGroup(g,o,.5,8);assert.equal(g.children[0].children.length,0);
});
