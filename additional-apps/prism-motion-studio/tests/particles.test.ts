import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as T from 'three';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {demoScene,makeObject,sceneSchema} from '../lib/scene';
import {effectSchema,followSchema,routeSchema} from '../lib/directing';
import {buildEffects,updateEffects,disposeEffects,effectPose,particleClock,makeEffect,effectCatalog,cloudTexture} from '../lib/effects';
import {createEmitterSampler} from '../lib/effect-emitter';
import {buildBlenderTransfer,sampleMeshTransform,BakeTracks} from '../lib/blender-transfer';
import {particleGardenScene} from '../lib/particle-scene';
import {EffectsPanel} from '../components/particle-panel';
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const capture=(root:T.Group)=>{root.updateMatrixWorld(true);return root.children.flatMap(g=>g.children.map(c=>{const m=(c as T.Mesh).material as T.MeshStandardMaterial;return [...sampleMeshTransform(c as T.Mesh),m.opacity,m.emissiveIntensity];}));};

test('Old effect scenes gain neutral defaults, and presets validate without deleting unrelated objects',()=>{
 const s=demoScene(),e=effectSchema.parse({id:'old-snow',kind:'snow'});s.effects=[e];const parsed=sceneSchema.parse(s);assert.deepEqual(parsed.effects[0].wind,[0,0,0]);assert.deepEqual(parsed.effects[0].rotation,[0,0,0]);assert.equal(parsed.effects[0].attachmentId,'');assert.deepEqual(parsed.objects,s.objects);
 for(const preset of effectCatalog){const fx=makeEffect(preset.id,preset.id,8);assert.ok(sceneSchema.safeParse({...s,effects:[fx]}).success,preset.id);}
 const base=makeEffect('smoke','bad',8);assert.equal(sceneSchema.safeParse({...s,effects:[{...base,attachmentId:'missing'}]}).success,false);assert.equal(sceneSchema.safeParse({...s,effects:[{...base,follow:followSchema.parse({enabled:true,pathId:'missing'})}]}).success,false);
 assert.equal(sceneSchema.safeParse({...s,effects:Array.from({length:9},(_,i)=>({...base,id:String(i)}))}).success,false);
 assert.equal(sceneSchema.safeParse({...s,effects:[{...base,emission:'burst',repeat:true,lifetime:8,interval:2}]}).success,false);
});

test('All particle presets keep finite, repeatable transforms, opacity and stable Blender topology',()=>{
 for(const preset of effectCatalog){const e={...makeEffect(preset.id,preset.id,9),count:12};const root=buildEffects([e]),transfer=buildBlenderTransfer(root),bake=new BakeTracks(3);assert.equal(transfer.sources.length,12,preset.id);
 updateEffects(root,[e],2.4);const first=capture(root);updateEffects(root,[e],8.8);capture(root);updateEffects(root,[e],2.4);assert.deepEqual(capture(root),first,preset.id);
 for(const [f,t] of [0,4,9].entries()){updateEffects(root,[e],t);root.updateMatrixWorld(true);for(const source of transfer.sources)bake.add(source.id,f,sampleMeshTransform(source.mesh));}
 assert.ok(Array.from(bake.pack().values).every(Number.isFinite));assert.equal(root.children[0].visible,false);assert.ok(transfer.sources.every(x=>sampleMeshTransform(x.mesh).slice(7).every(v=>v===0)));
 transfer.dispose();disposeEffects(root);
 }
});

test('Bursts respect start, lifetime, repeat interval, speed and one-shot behavior',()=>{
 const e={...makeEffect('fireworks','burst',20),start:2,lifetime:2,interval:5,speed:2};
 assert.equal(particleClock(e,0,1.9).alive,false);assert.equal(particleClock(e,0,2.5).alive,true);assert.equal(particleClock(e,0,3.5).alive,false);assert.equal(particleClock(e,0,4.6).alive,true);near(particleClock(e,0,4.6).birthTime,4.5);
 assert.equal(particleClock({...e,repeat:false},0,4.6).alive,false);
 const trail={...makeEffect('magic-trail','trail',20),count:40,lifetime:2,speed:1};assert.ok(Array.from({length:40},(_,i)=>particleClock(trail,i,0).alive).filter(Boolean).length<2);assert.equal(Array.from({length:40},(_,i)=>particleClock({...trail,prewarm:true},i,0).alive).filter(Boolean).length,40);
});

test('Released particles keep their birth transform while emitters follow animated parent groups',()=>{
 const s=demoScene(),parent=makeObject('group'),child=makeObject('prop','sphere');parent.id='carrier';parent.position=[0,0,0];parent.keys=[{time:0,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],easing:'linear'},{time:8,position:[8,0,0],rotation:[0,0,0],scale:[1,1,1],easing:'linear'}];child.id='source';child.parentId=parent.id;child.position=[0,2,0];s.objects=[parent,child];
 const e={...makeEffect('magic-trail','trail',8),attachmentId:child.id,position:[0,0,0] as [number,number,number],velocity:[0,0,0] as [number,number,number],spread:0,turbulence:0,lifetime:3,count:20,prewarm:true};s.effects=[e];const sampler=createEmitterSampler(s),root=buildEffects([e]);
 updateEffects(root,[e],4,sampler);const p=effectPose(e,0,4),point=root.children[0].children[0];near(point.position.x,Math.max(0,p.birthTime));near(point.position.y,2);assert.ok(point.position.x<3.1);const sourceNow=new T.Vector3().applyMatrix4(sampler(e,4));near(sourceNow.x,4);near(sourceNow.y,2);
 const saved=capture(root);updateEffects(root,[e],7,sampler);updateEffects(root,[e],4,sampler);assert.deepEqual(capture(root),saved);disposeEffects(root);
});

test('Path-following emitter offsets rotate with the route and global wind / gravity act after release',()=>{
 const s=demoScene();s.paths=[routeSchema.parse({id:'line',name:'Straight',points:[[0,0,0],[10,0,0]]})];const e={...makeEffect('embers','e',8),position:[0,0,1] as [number,number,number],follow:followSchema.parse({enabled:true,pathId:'line',duration:10,loop:false}),gravity:2,wind:[.3,0,0] as [number,number,number],turbulence:0};const sampler=createEmitterSampler(s),p=new T.Vector3(...e.position).applyMatrix4(sampler(e,4));near(p.x,5);near(p.y,0);near(p.z,0);
 const calm={...e,gravity:0,wind:[0,0,0] as [number,number,number]},root=buildEffects([e]);updateEffects(root,[calm],3,sampler);const before=root.children[0].children[0].position.clone();updateEffects(root,[e],3,sampler);const after=root.children[0].children[0].position.clone(),age=(3-effectPose(e,0,3).birthTime)*e.speed;near(after.x-before.x,.3*age);near(after.y-before.y,-age*age);disposeEffects(root);
});

test('Soft particle textures retain alpha and textured emission through the Blender transfer',()=>{
 const e=makeEffect('fire','fire',8),root=buildEffects([{...e,count:10}]);updateEffects(root,[e],.8);const transfer=buildBlenderTransfer(root);for(const [source,copy] of transfer.materials){const a=source as T.MeshStandardMaterial,b=copy as T.MeshStandardMaterial;assert.equal(b.transparent,true);assert.equal(b.opacity,1);assert.equal(b.map,a.map);assert.equal(b.emissiveMap,a.emissiveMap);assert.deepEqual(b.emissive.toArray(),[1,1,1]);near(b.emissiveIntensity,1);}
 const texture=cloudTexture(),data=texture.image.data;assert.equal(data[3],0);assert.ok(data[(32*64+32)*4+3]>10);texture.dispose();transfer.dispose();disposeEffects(root);
});

test('Winter garden is a valid 60 FPS showcase with eight editable layers and linked motion',()=>{
 const s=particleGardenScene();assert.deepEqual(sceneSchema.parse(s),s);assert.equal(s.fps,60);assert.equal(s.effects.length,8);assert.equal(s.camera.shots.reduce((n,c)=>n+c.duration,0),30);assert.ok(s.effects.every(e=>e.start<e.end&&e.end<=30));assert.ok(s.objects.some(o=>o.id===s.effects.find(e=>e.kind==='magic-trail')!.attachmentId));assert.equal(s.set.id,'christmas-pavilion');
 const html=renderToStaticMarkup(createElement(EffectsPanel,{scene:s,change:()=>{},selectedId:'comet-tail'}));for(const label of ['PARTICLE STUDIO','Chimney smoke','Firework burst','Wind &amp; forces','Attached object','Already flowing at the start','Lifespan','Remove effect'])assert.ok(html.includes(label),label);
});
