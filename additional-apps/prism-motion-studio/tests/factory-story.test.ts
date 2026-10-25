import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as T from 'three';
import {toyFactoryScene} from '../lib/factory-scene';
import {sceneSchema,samplePose,type CameraPose} from '../lib/scene';
import {factoryCrane,factoryBeltTravel,parcelFinish,toyPartDrop} from '../lib/factory-timing';
import {animateFactorySet,animateFactoryParcel} from '../lib/factory-animation';
import {buildToyFactory,buildFactoryParcel,buildFactoryWagon} from '../lib/toy-factory-set';
import {sampleCamera} from '../lib/sequence';
import {sampleRoute} from '../lib/routes';
import {flattenTraceScene} from '../lib/pathtrace';
import {disposeSet} from '../lib/sets';
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
const find=(g:T.Object3D,tag:string)=>{let result:T.Object3D|undefined;g.traverse(n=>{if(n.userData.factoryPart===tag)result=n;});assert.ok(result,tag);return result;};
const config={accent:'#ffd06a',decorations:true,glow:1.1};

test('Factory story round-trips, fits all action/audio into42s and preserves separate editable layers',()=>{
 const s=toyFactoryScene();assert.deepEqual(sceneSchema.parse(JSON.parse(JSON.stringify(s))),s);assert.equal(s.duration,42);assert.equal(s.fps,60);assert.equal(s.camera.shots.reduce((n,a)=>n+a.duration,0),42);assert.equal(s.objects.filter(o=>o.parentId==='factory-delivery-train').length,2);assert.equal(s.audio.cues[0].kind,'music-box');assert.ok(s.camera.shots.some(a=>a.transition==='dissolve'));
 const old:any=toyFactoryScene();delete old.camera.factoryView;old.objects.forEach((o:any)=>delete o.mechanism);const migrated=sceneSchema.parse(old);assert.equal(migrated.camera.factoryView,'cinematic');assert.ok(migrated.objects.every(o=>!o.mechanism.enabled));
});

test('Parcel keys track the crane at every sampled frame and stay exactly on the departing wagon',()=>{
 const s=toyFactoryScene(),parcel=s.objects[0],delivery=s.objects.find(o=>o.id==='factory-delivery-train')!,set=buildToyFactory(config),wagon=buildFactoryWagon(),grip=find(set,'crane-grip'),cable=find(set,'crane-cable');
 for(let t=0;t<=26;t+=.25)near(factoryBeltTravel(t),samplePose(parcel,t).position[0]+12);
 for(let frame=26*60;frame<=32*60;frame+=5){const t=frame/60,p=samplePose(parcel,t).position,crane=factoryCrane(t);animateFactorySet(set,t);set.updateMatrixWorld(true);const wp=grip.getWorldPosition(new T.Vector3());near(wp.x,p[0]);near(wp.z,p[2]);near(wp.y,p[1]+1.7);near(new T.Box3().setFromObject(cable).min.y,wp.y);near(crane.gripY,wp.y);}
 for(let frame=32*60;frame<=42*60;frame+=7){const t=frame/60,p=samplePose(parcel,t).position,travel=sampleRoute(s,delivery.follow,t)!;const deck=new T.Vector3(0,wagon.userData.deckTop,-4).applyQuaternion(travel.rotation).add(travel.position);p.forEach((n,i)=>near(n,deck.getComponent(i)));}
 disposeSet(set);disposeSet(wagon);
});

test('Wrapping folds before the portal and animations survive reverse seeks and duplicate view rendering',()=>{
 const s=toyFactoryScene(),parcel=buildFactoryParcel(),set=buildToyFactory(config);
 const snapshot=()=>{const data:unknown[]=[];for(const group of [set,parcel])group.traverse(n=>{if(n.userData.factoryPart||n.userData.factoryToyPart!==undefined||n.userData.factoryPanel!==undefined)data.push([n.name,n.position.toArray(),n.rotation.toArray(),n.scale.toArray(),n.visible]);});return data;};
 for(const t of [0,3,11,12.5,16.5,18,27,29,31,35]){animateFactorySet(set,t);animateFactoryParcel(parcel,t);const once=snapshot();animateFactorySet(set,41);animateFactoryParcel(parcel,41);animateFactorySet(set,t);animateFactoryParcel(parcel,t);assert.deepEqual(snapshot(),once);animateFactorySet(set,t);animateFactoryParcel(parcel,t);assert.deepEqual(snapshot(),once);}
 for(const t of [11,12,13,14])near(samplePose(s.objects[0],t).position[0],-3);
 assert.equal(parcelFinish(14).fold,1);assert.equal(parcelFinish(14).lid,1);assert.equal(parcelFinish(19.5).finished,true);assert.equal(toyPartDrop(5,6).settled,true);animateFactoryParcel(parcel,0,false);assert.equal(find(parcel,'toy').visible,false);for(const tag of ['paper','lid','ribbon','bow'])assert.equal(find(parcel,tag).visible,true);
 const world=new T.Scene(),flat=new T.Scene();world.add(parcel);animateFactoryParcel(parcel,0);flattenTraceScene(world,flat,new Map(),{castShadow:true});const opening=flat.children.length;animateFactoryParcel(parcel,20);flattenTraceScene(world,flat,new Map(),{castShadow:true});assert.ok(flat.children.length>opening);disposeSet(set);disposeSet(parcel);
});

test('Story and follow-present cameras frame the parcel with a clear central sightline through the machinery',()=>{
 const failures:string[]=[];const s=toyFactoryScene(),set=buildToyFactory(config),camera=new T.PerspectiveCamera(45,16/9,.05,1000),ray=new T.Raycaster();
 const check=(pose:CameraPose,time:number)=>{const p=samplePose(s.objects[0],time).position,center=new T.Vector3(p[0],p[1]+.85,p[2]);camera.position.set(...pose.position);camera.fov=pose.fov;camera.lookAt(...pose.target);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);const ndc=center.clone().project(camera);assert.ok(Math.abs(ndc.x)<.88&&Math.abs(ndc.y)<.88&&ndc.z<1,`Parcel outside view t${time}: ${ndc.toArray()}`);ray.set(camera.position,center.clone().sub(camera.position).normalize());ray.far=camera.position.distanceTo(center)-.1;const hits=ray.intersectObject(set,true);if(hits.length)failures.push(`${s.camera.factoryView} t${time}: ${hits.slice(0,3).map(h=>h.object.name).join(', ')}`);};
 for(const view of ['cinematic','parcel'] as const){s.camera.factoryView=view;for(let t=3.25;t<42;t+=.5){animateFactorySet(set,t);set.updateMatrixWorld(true);const frame=sampleCamera(s,t);check(frame.current,t);if(frame.previous)check(frame.previous,t);}}
 assert.deepEqual(failures,[]);s.camera.factoryView='overview';const a=sampleCamera(s,0),b=sampleCamera(s,42);assert.deepEqual(a,b);disposeSet(set);
});
