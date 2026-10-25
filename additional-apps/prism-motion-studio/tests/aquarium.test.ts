import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as T from 'three';
import {aquariumScene} from '../lib/aquarium-scene';
import {fishPose} from '../lib/aquarium-set';
import {buildSet,disposeSet} from '../lib/sets';
import {updateSetAnimation} from '../lib/set-animation';
import {sampleCamera} from '../lib/sequence';
import {sceneSchema} from '../lib/scene';
import {soundCueSchema} from '../lib/directing';
import {buildBlenderTransfer,sampleMeshTransform} from '../lib/blender-transfer';

test('The full Aquarium track fits the timeline and its eight camera shots',()=>{
 const s=aquariumScene(139.4523);assert.equal(s.camera.shots.length,8);
 assert.equal(s.camera.shots.reduce((n,q)=>n+q.duration,0),s.duration);
 const cue=soundCueSchema.parse({id:'music',kind:'audio',duration:s.duration});assert.equal(cue.duration,s.duration);
 assert.equal(sceneSchema.parse({...s,duration:600}).duration,600);
 assert.throws(()=>sceneSchema.parse({...s,duration:601}));
 for(let t=0;t<s.duration;t+=.7){const {current}=sampleCamera(s,t);assert.ok(current.position.every(Number.isFinite));assert.ok(current.position[1]>=2.2);assert.ok(new T.Vector3(...current.position).distanceTo(new T.Vector3(...current.target))>4);}
});

test('Reef geometry is finite, physically shaded and deterministic across random seeks',()=>{
 const s=aquariumScene(),root=buildSet(s.set,0);const meshes:T.Mesh[]=[];let triangles=0,fish=0;
 root.traverse(n=>{if(typeof n.userData.aquariumFish==='number')fish++;if(!(n instanceof T.Mesh))return;meshes.push(n);triangles+=(n.geometry.index?.count||n.geometry.attributes.position.count)/3;for(const attribute of ['position','normal'])for(const x of n.geometry.getAttribute(attribute).array)assert.ok(Number.isFinite(x),n.name);assert.ok(n.material instanceof T.MeshStandardMaterial);});
 assert.equal(fish,36);assert.ok(meshes.length<1100,`${meshes.length} meshes`);assert.ok(triangles<250000,`${triangles} triangles`);
 const capture=(t:number)=>{updateSetAnimation(root,t,.4);root.updateMatrixWorld(true);return meshes.map(n=>sampleMeshTransform(n));};
 const first=capture(132.5);capture(1);assert.deepEqual(capture(132.5),first);
 const moving=capture(133);assert.ok(moving.filter((p,i)=>p.some((v,j)=>Math.abs(v-first[i][j])>.0001)).length>400);
 const transfer=buildBlenderTransfer(root);assert.equal(transfer.sources.length,meshes.length);capture(139.4);for(const source of transfer.sources)assert.ok(sampleMeshTransform(source.mesh).every(Number.isFinite));transfer.dispose();
 disposeSet(root);
});

test('Fish swim continuously, face their travel direction and stay above the sand',()=>{
 for(let i=0;i<36;i++)for(let t=0;t<140;t+=.5){const a=fishPose(i,t),b=fishPose(i,t+.001),delta=new T.Vector3(...b.position).sub(new T.Vector3(...a.position));assert.ok(a.position[1]>1.5);assert.ok(delta.length()<.003);const forward=new T.Vector3(1,0,0).applyAxisAngle(new T.Vector3(0,1,0),a.yaw);delta.y=0;assert.ok(forward.dot(delta.normalize())>.999);}
});

test('Every camera shot has visible reef life without intersecting the seabed',()=>{
 const s=aquariumScene(),root=buildSet(s.set,0),camera=new T.PerspectiveCamera(52,16/9,.05,1000);let start=0;
 for(const shot of s.camera.shots){for(const fraction of [.05,.5,.95]){const t=start+shot.duration*fraction,pose=sampleCamera(s,t).current;camera.position.set(...pose.position);camera.lookAt(...pose.target);camera.fov=pose.fov;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);updateSetAnimation(root,t);root.updateMatrixWorld(true);const f=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));let visibleFish=0,visibleReef=0;root.traverse(n=>{if(typeof n.userData.aquariumFish==='number'&&f.intersectsBox(new T.Box3().setFromObject(n)))visibleFish++;if(n.name==='Pearl-tipped sea anemone'&&f.intersectsBox(new T.Box3().setFromObject(n)))visibleReef++;});assert.ok(visibleFish>=1||visibleReef>=1,`${shot.name} has marine life in view`);}
 start+=shot.duration;}
 disposeSet(root);
});
