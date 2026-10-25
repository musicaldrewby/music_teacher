import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as T from 'three';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {demoScene,sceneSchema,makeObject,type Vec} from '../lib/scene';
import {makeShot,sampleCamera,sampleStage,fitSequence,shotRanges} from '../lib/sequence';
import {animateGroup} from '../lib/motion';
import {boxCorners,fitObjectToCamera,restWorldBox,keepPropsBehindText} from '../lib/layout';
import {makeProp} from '../lib/engine';
import {flattenTraceScene} from '../lib/pathtrace';
import {SequencePanel,ShotsPanel,PlacementPanel,SequenceTrack,ShotTrack} from '../components/sequence-panels';

const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} should equal ${b}`);
test('Version-one saved scenes retain IDs and opt out of every new feature',()=>{
 const input:any=demoScene();delete input.camera.shots;delete input.camera.shotsEnabled;for(const o of input.objects){delete o.sequence;delete o.layout;}
 const scene=sceneSchema.parse(input);assert.equal(scene.camera.shotsEnabled,false);assert.deepEqual(scene.camera.shots,[]);assert.equal(scene.objects[0].id,'main-title');assert.ok(scene.objects.every(o=>!o.sequence.enabled&&!o.layout.behindText));
 const group=new T.Group();animateGroup(group,scene.objects[0],2,8);near(group.position.y,.7);near(group.rotation.z,(-3*Math.PI/180)+.2*.08);near(sampleCamera(scene,2).current.position[2],13);
});
test('Legacy smooth camera keys retain their motion and endpoints',()=>{
 const s=demoScene();s.camera.keys=[{time:1,position:[0,0,12],target:[0,0,0],fov:40},{time:5,position:[8,4,16],target:[2,2,0],fov:60}];
 assert.deepEqual(sampleCamera(s,0).current,{position:[0,0,12],target:[0,0,0],fov:40});assert.deepEqual(sampleCamera(s,3).current,{position:[4,2,14],target:[1,1,0],fov:50});near(sampleCamera(s,8).current.fov,60);
});
test('Cuts happen at the exact boundary; dissolves expose two full views at one world time',()=>{
 const s=demoScene(),a=makeShot(s.camera,4,'Wide'),b=makeShot({position:[8,4,12],target:[0,0,0],fov:32},4,'Side');s.camera.shotsEnabled=true;s.camera.shots=[a,b];
 assert.equal(sampleCamera(s,4-1/60).shotId,a.id);assert.equal(sampleCamera(s,4).shotId,b.id);assert.equal(sampleCamera(s,4).previous,undefined);
 b.transition='dissolve';b.transitionDuration=1;const first=sampleCamera(s,4),middle=sampleCamera(s,4.5),last=sampleCamera(s,5);near(first.mix,0);near(middle.mix,.5);assert.deepEqual(middle.previous,a.start);assert.deepEqual(middle.current,b.start);assert.equal(last.previous,undefined);near(last.mix,1);
});
test('Camera moves are deterministic on reverse scrub and the final shot holds',()=>{
 const s=demoScene(),a=makeShot(s.camera,2);a.move=true;a.end={position:[8,2,9],target:[2,0,1],fov:28};a.easing='linear';s.camera.shotsEnabled=true;s.camera.shots=[a];
 const middle=sampleCamera(s,1);sampleCamera(s,7);assert.deepEqual(sampleCamera(s,1),middle);assert.deepEqual(middle.current.position,[4,1.5,11]);assert.deepEqual(sampleCamera(s,8).current,a.end);
 assert.deepEqual(shotRanges(s.camera.shots).map(r=>[r.start,r.end]),[[0,2]]);
});
test('Invalid shot IDs, timelines and transitions fail validation before saving or export',()=>{
 const s=demoScene();s.camera.shotsEnabled=true;assert.equal(sceneSchema.safeParse(s).success,false);const a=makeShot(s.camera,4);s.camera.shots=[a,{...a}];assert.equal(sceneSchema.safeParse(s).success,false);
 s.camera.shots=[{...a,duration:9}];assert.equal(sceneSchema.safeParse(s).success,false);s.camera.shots=[{...a,transitionDuration:4.1}];assert.equal(sceneSchema.safeParse(s).success,false);s.camera.shots=[{...a,start:{...a.start,position:[Infinity,0,0]}}];assert.equal(sceneSchema.safeParse(s).success,false);
});
test('All letters arrive before the reading hold, even with 200 letters and a long stagger',()=>{
 const q={...makeObject().sequence,enabled:true,start:1,enter:2,hold:3,leave:2,stagger:1,entrance:'assemble' as const,exit:'scatter' as const};
 assert.equal(sampleStage(q,.9).visible,false);for(let i=0;i<200;i++){const held=sampleStage(q,3,i,200);assert.equal(held.opacity,1);assert.deepEqual(held.position,[0,0,0]);assert.equal(held.scale,1);assert.equal(sampleStage(q,8,i,200).visible,false);}
 const a=sampleStage(q,2.2,63,200);sampleStage(q,7,63,200);assert.deepEqual(sampleStage(q,2.2,63,200),a);
});
function textGroup(){const g=new T.Group();g.userData={letters:3,words:2};for(let i=0;i<3;i++){const mesh=new T.Mesh(new T.BoxGeometry(.5,.8,.2),new T.MeshStandardMaterial());mesh.position.x=i;mesh.userData={index:i,word:i<2?0:1,base:mesh.position.clone()};g.add(mesh);}return g;}
test('Word staggering keeps a word together, preserves independent alpha and does not accumulate transforms',()=>{
 const o=makeObject();o.sequence={...o.sequence,enabled:true,unit:'word',stagger:.6,enter:2,hold:3,leave:1};const g=textGroup();animateGroup(g,o,.5,8);const meshes=g.children as T.Mesh[],alpha=(i:number)=>(meshes[i].material as T.Material).opacity;
 near(alpha(0),alpha(1));assert.ok(alpha(0)>alpha(2));const first=meshes.map(m=>[...m.position.toArray(),(m.material as T.Material).opacity]);animateGroup(g,o,4,8);animateGroup(g,o,.5,8);assert.deepEqual(meshes.map(m=>[...m.position.toArray(),(m.material as T.Material).opacity]),first);
 animateGroup(g,o,2,8);assert.ok(meshes.every(m=>(m.material as T.Material).opacity===1));assert.ok(meshes.every(m=>(m.material as T.Material).depthWrite));animateGroup(g,o,6,8);assert.equal(g.visible,false);
});
test('Zero-length transitions and a short scene remain finite and valid',()=>{
 const s=demoScene();s.duration=1;const q=fitSequence({...s.objects[0].sequence,enabled:true},1);s.objects[0].sequence=q;assert.equal(sceneSchema.safeParse(s).success,true);near(q.enter+q.hold+q.leave,1);
 const still={...q,enter:0,hold:1,leave:0};assert.equal(sampleStage(still,0).opacity,1);assert.equal(sampleStage(still,1).visible,false);
 s.objects[0].sequence={...q,hold:10};assert.equal(sceneSchema.safeParse(s).success,false);s.objects[0].sequence={...q,enter:0,hold:0,leave:0};assert.equal(sceneSchema.safeParse(s).success,false);
});
test('Rotating rings remain separated from animated text on every sampled frame',()=>{
 const s=demoScene();s.objects=s.objects.slice(0,1);const text=s.objects[0];text.motion='float';const prop=makeObject('prop','torus');prop.motion='tumble';prop.position=[0,0,0];prop.scale=[3,3,3];prop.layout.behindText=true;prop.layout.clearance=.6;s.objects.push(prop);
 const title=textGroup(),ring=makeProp('torus',new T.MeshStandardMaterial()),groups=new Map([[text.id,title],[prop.id,ring]]);
 for(const t of [0,1,2,3,4,5,6,7,7.9,1]){animateGroup(title,text,t,8);animateGroup(ring,prop,t,8);keepPropsBehindText(s,groups);const a=new T.Box3().setFromObject(title),b=new T.Box3().setFromObject(ring);assert.ok(b.max.z+.6<=a.min.z+1e-8);assert.equal(a.intersectsBox(b),false);}
 prop.layout.behindText=false;animateGroup(ring,prop,0,8);keepPropsBehindText(s,groups);near(ring.position.z,0);
});
test('Fitting rotated text uses the entire depth and honors perspective safe margins',()=>{
 const o=makeObject();o.position=[4,-2,-1];o.rotation=[-18,35,12];o.scale=[2,1.5,1];const local=new T.Box3(new T.Vector3(-5,-.8,-.4),new T.Vector3(5,.8,.4));
 for(const position of [[0,1,13],[8,4,12],[-6,2,10]] as Vec[])for(const fov of [20,40,70]){const camera=new T.PerspectiveCamera(fov,16/9,.05,1000);camera.position.fromArray(position);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);const fitted=fitObjectToCamera(o,local,0,camera);const box=restWorldBox({...o,...fitted},local,0);for(const point of boxCorners(box)){point.project(camera);assert.ok(Math.abs(point.x)<=.84000001);assert.ok(Math.abs(point.y)<=.84000001);assert.ok(point.z<1&&point.z>-1);}}
});
test('Physical export sees staged opacity and excludes the layer after exit',()=>{
 const o=makeObject();o.sequence={...o.sequence,enabled:true};const g=textGroup(),world=new T.Scene(),target=new T.Scene(),cache=new Map<string,T.Object3D>();world.add(g);animateGroup(g,o,.3,8);flattenTraceScene(world,target,cache,{castShadow:true});assert.equal(target.children.length,3);assert.ok(target.children.some(m=>((m as T.Mesh).material as T.Material).opacity<1));animateGroup(g,o,8,8);flattenTraceScene(world,target,cache,{castShadow:true});assert.equal(target.children.length,0);
});
test('Editor panels render both legacy and enabled states with accessible timing and view controls',()=>{
 const s=demoScene(),o=s.objects[0];o.sequence.enabled=true;s.camera.shotsEnabled=true;s.camera.shots=[makeShot(s.camera,8)];const noop=()=>{};
 const html=renderToStaticMarkup(createElement('div',null,createElement(SequencePanel,{object:o,duration:8,change:noop}),createElement(ShotsPanel,{scene:s,time:0,change:noop,seek:noop,capture:()=>s.camera,endpoint:'start',setEndpoint:noop}),createElement(PlacementPanel,{object:o,change:noop,fit:noop,safe:true,setSafe:noop,check:noop}),createElement(SequenceTrack,{object:o,duration:8}),createElement(ShotTrack,{scene:s,seek:noop})));
 assert.match(html,/Edit start/);assert.match(html,/Crossfade|Transition into shot/);assert.match(html,/Fit title inside safe area/);assert.match(html,/Hold \(s\)/);assert.match(html,/Camera shot/);
});
