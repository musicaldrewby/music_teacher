import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as T from 'three';
import {demoScene,sceneSchema,makeObject,type CameraPose} from '../lib/scene';
import {animateGroup} from '../lib/motion';
import {makeShot} from '../lib/sequence';
import {offsetObject,readTransform,stagePlacement,cameraFromHead,addXRView,useXRView,viewToStoryboard,manipulationReason} from '../lib/xr-math';

const close=(a:number[],b:number[],tolerance=1e-6)=>{a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<tolerance,`${a} ≈ ${b}`));};
test('Legacy scenes load with no VR views; captured views survive validation and JSON saving',()=>{
 const legacy=JSON.parse(JSON.stringify(demoScene()));delete legacy.xrViews;
 const original=sceneSchema.parse(legacy);assert.deepEqual(original.xrViews,[]);
 const next=addXRView(original,{position:[1,2,3],target:[0,1,-2],fov:50});
 assert.deepEqual(sceneSchema.parse(JSON.parse(JSON.stringify(next))).xrViews,next.xrViews);
 assert.deepEqual(next.camera,original.camera);assert.deepEqual(next.objects,original.objects);assert.deepEqual(original.xrViews,[]);
 const duplicate=structuredClone(next);duplicate.xrViews.push(duplicate.xrViews[0]);assert.equal(sceneSchema.safeParse(duplicate).success,false);
});
test('Miniature fit puts even very large worlds directly in front of a seated viewer',()=>{
 const box=new T.Box3(new T.Vector3(-100,-4,-200),new T.Vector3(100,80,200));
 const head=new T.Vector3(4,1.1,2),forward=new T.Vector3(1,0,0),pose={position:[0,2,12],target:[0,2,0],fov:50} as CameraPose;
 const p=stagePlacement('miniature',box,head,forward,pose),matrix=new T.Matrix4().compose(p.position,p.rotation,new T.Vector3().setScalar(p.scale));
 close(box.getCenter(new T.Vector3()).applyMatrix4(matrix).toArray(),[5.8,.62,2]);
 assert.ok(box.getSize(new T.Vector3()).multiplyScalar(p.scale).length()<2);
});
test('Full-size placement preserves scale and maps the authored start to the headset',()=>{
 const head=new T.Vector3(1,1.2,3),pose={position:[8,2,12],target:[0,2,0],fov:45} as CameraPose;
 const p=stagePlacement('full',new T.Box3(),head,new T.Vector3(-1,0,0),pose),matrix=new T.Matrix4().compose(p.position,p.rotation,new T.Vector3().setScalar(p.scale));
 assert.equal(p.scale,1);close(new T.Vector3(...pose.position).applyMatrix4(matrix).toArray(),head.toArray());
 close(new T.Vector3(...pose.target).sub(new T.Vector3(...pose.position)).transformDirection(matrix).toArray(),[-1,0,0]);
});
test('A captured headset pose converts back to scene space after stage scale, rotation and translation',()=>{
 const stage=new T.Matrix4().compose(new T.Vector3(5,1,-2),new T.Quaternion().setFromEuler(new T.Euler(0,.8,0)),new T.Vector3(.05,.05,.05));
 const authored=new T.Matrix4().compose(new T.Vector3(2,3,12),new T.Quaternion().setFromEuler(new T.Euler(.2,-.3,0)),new T.Vector3(1,1,1));
 const world=stage.clone().multiply(authored),pose=cameraFromHead(world,stage,42);
 close(pose.position,[2,3,12]);
 close(new T.Vector3(...pose.target).sub(new T.Vector3(...pose.position)).normalize().toArray(),new T.Vector3(0,0,-1).transformDirection(authored).toArray());
 assert.equal(pose.fov,42);
});
test('Controller edits offset animation without removing keyframes or unwrapped full turns',()=>{
 const o=makeObject('prop','cube');o.keys=[{time:0,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],easing:'linear'},{time:8,position:[4,1,0],rotation:[0,720,0],scale:[2,2,2],easing:'linear'}];o.motion='float';o.amount=.4;
 const node=new T.Group();animateGroup(node,o,4,8);const before=readTransform(node);
 const after={position:before.position.map((v,i)=>v+[3,2,1][i]) as [number,number,number],rotation:[before.rotation[0],before.rotation[1]+20,before.rotation[2]] as [number,number,number],scale:before.scale.map(v=>v*1.5) as [number,number,number]};
 const next=offsetObject(o,before,after);animateGroup(node,next,4,8);const result=readTransform(node);
 close(result.position,after.position);close(result.rotation,after.rotation);close(result.scale,after.scale);
 assert.equal(next.keys[1].rotation[1]-next.keys[0].rotation[1],720);assert.equal(o.keys[0].position[0],0);
});
test('Quaternion-to-Euler wrapping does not add spurious full rotations to animation keys',()=>{
 const o=makeObject('prop','cube');o.rotation=[0,720,0];const before=readTransform(new T.Group());before.rotation=[0,720,0];
 const next=offsetObject(o,before,{...before,rotation:[0,15,0]});assert.equal(next.rotation[1],735);
});
test('Nested path and physics layers reject grabs rather than writing a pose the animation will discard',()=>{
 const scene=demoScene(),parent=makeObject('group');parent.follow.enabled=true;const child=makeObject('prop','cube');child.parentId=parent.id;scene.objects.push(parent,child);
 assert.match(manipulationReason(child,scene),/Path/);parent.follow.enabled=false;child.body.mode='dynamic';assert.match(manipulationReason(child,scene),/Physics/);
});
test('Adding a VR view to a full storyboard splits time without changing the scene duration',()=>{
 const scene=demoScene();scene.camera.shots=[makeShot(scene.camera,8,'Original')];scene.camera.shotsEnabled=true;
 const withView=addXRView(scene,{position:[3,2,5],target:[0,0,0],fov:40}),next=viewToStoryboard(withView,withView.xrViews[0]);
 assert.equal(next.duration,8);assert.equal(next.camera.shots.reduce((n,s)=>n+s.duration,0),8);assert.equal(next.camera.shots.length,2);assert.equal(next.camera.shots[0].name,'Original');assert.equal(next.camera.shots[1].name,'VR view 01');assert.ok(sceneSchema.safeParse(next).success);
});
test('Using a captured view disables camera motion overrides but preserves stored sequences',()=>{
 const scene=demoScene();scene.camera.shots=[makeShot(scene.camera,8)];scene.camera.shotsEnabled=true;scene.camera.motion='orbit';
 const pose={position:[1,2,3],target:[0,0,0],fov:44} as CameraPose,next=useXRView(scene,pose);
 close(next.camera.position,pose.position);assert.equal(next.camera.shotsEnabled,false);assert.equal(next.camera.shots.length,1);assert.equal(next.camera.motion,'still');assert.deepEqual(scene.camera.position,[0,1,13]);
});
test('Invalid or oversized captured views are rejected before scene data changes',()=>{
 const scene=demoScene();assert.throws(()=>addXRView(scene,{position:[Infinity,0,0],target:[0,0,0],fov:50}));assert.equal(scene.xrViews.length,0);
 let next=scene;for(let i=0;i<24;i++)next=addXRView(next,scene.camera);assert.throws(()=>addXRView(next,scene.camera),/24 views/);
});
