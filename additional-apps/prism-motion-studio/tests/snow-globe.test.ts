import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {FontLoader} from 'three/addons/loaders/FontLoader.js';
import {TTFLoader} from 'three/addons/loaders/TTFLoader.js';
import {TextGeometry} from 'three/addons/geometries/TextGeometry.js';
import {snowGlobeScene} from '../lib/cinematic-presets';
import {setSchema} from '../lib/cinematic';
import {sceneSchema,framePlan} from '../lib/scene';
import {sampleCamera} from '../lib/sequence';
import {SNOW_GLOBE} from '../lib/snow-globe';
import {buildSet,disposeSet} from '../lib/sets';
import {snowflakePose,updateSetAnimation,updateSetView} from '../lib/set-animation';
import {flattenTraceScene} from '../lib/pathtrace';
import fonts from '../public/fonts/manifest.json';

test('Snow globe saves as a 16-second 60 FPS scene with continuous reveal shots and editable titles',()=>{
 const scene=snowGlobeScene();assert.deepEqual(sceneSchema.parse(JSON.parse(JSON.stringify(scene))),scene);assert.equal(framePlan(scene.duration,scene.fps).length,960);assert.equal(scene.objects[1].text,"MR. DREW'S MUSIC ROOM");
 for(let i=1;i<scene.camera.shots.length;i++)assert.deepEqual(scene.camera.shots[i].start,scene.camera.shots[i-1].end);
 assert.deepEqual(setSchema.parse({}).snowfall,.7);assert.equal(setSchema.safeParse({snowfall:1.1}).success,false);assert.equal(setSchema.safeParse({glass:'yes'}).success,false);
 const center=new T.Vector3(...SNOW_GLOBE.center).add(new T.Vector3(0,scene.ground.height,0));assert.ok(new T.Vector3(...sampleCamera(scene,0).current.position).distanceTo(center)<SNOW_GLOBE.radius);assert.ok(new T.Vector3(...sampleCamera(scene,15).current.position).distanceTo(center)>SNOW_GLOBE.radius*3);
});

test('Every snowflake stays inside the hollow globe on every sampled frame and reverse scrub',()=>{
 const center=new T.Vector3(...SNOW_GLOBE.center);
 for(let t=0;t<=120;t+=.25)for(let i=0;i<360;i++){
  const p=snowflakePose(i,t);assert.ok(p.distanceTo(center)<SNOW_GLOBE.radius-.1);assert.ok(p.y>SNOW_GLOBE.snowY);assert.ok(p.toArray().every(Number.isFinite));
 }
 const before=snowflakePose(27,3);snowflakePose(27,90);assert.deepEqual(snowflakePose(27,3).toArray(),before.toArray());assert.notDeepEqual(snowflakePose(27,4).toArray(),before.toArray());
});

test('Snow is animated mesh geometry in physical export and disappears with a transparent set',()=>{
 const scene=snowGlobeScene(),world=new T.Scene(),group=buildSet(scene.set,scene.ground.height),target=new T.Scene(),cache=new Map<string,T.Object3D>();world.add(group);
 let flake:T.Mesh|undefined;group.traverse(o=>{if(o instanceof T.Mesh&&o.userData.snowIndex===0)flake=o;});assert.ok(flake);
 updateSetAnimation(group,7);flattenTraceScene(world,target,cache,{castShadow:true});const exported=cache.get(flake.uuid)!;assert.ok(exported instanceof T.Mesh);assert.deepEqual(exported.matrixWorld.elements,flake.matrixWorld.elements);
 const first=exported.matrixWorld.clone();updateSetAnimation(group,2);flattenTraceScene(world,target,cache,{castShadow:true});assert.notDeepEqual(exported.matrixWorld.elements,first.elements);updateSetAnimation(group,7);flattenTraceScene(world,target,cache,{castShadow:true});assert.deepEqual(exported.matrixWorld.elements,first.elements);
 flattenTraceScene(world,target,cache,{castShadow:true,omit:[group]});assert.equal(target.children.length,0);disposeSet(group);
});

test('The glass reveal follows each camera in transformed sets and respects the glass switch',()=>{
 const scene=snowGlobeScene(),group=buildSet({...scene.set,scale:1.4,rotation:37,offsetZ:-3},-5.6),camera=new T.PerspectiveCamera();let glass:T.Mesh|undefined;group.traverse(o=>{if(o.userData.globeGlass)glass=o as T.Mesh;});assert.ok(glass);assert.equal(glass.userData.focusDepthIgnore,true);
 camera.position.copy(group.localToWorld(new T.Vector3(...SNOW_GLOBE.center)));updateSetView(group,camera,true);assert.equal(glass.visible,false);
 camera.position.copy(group.localToWorld(new T.Vector3(0,6.1,18)));updateSetView(group,camera,true);assert.equal(glass.visible,true);updateSetView(group,camera,false);assert.equal(glass.visible,false);disposeSet(group);
});

test('Christmas lettering stays within the frame for the entire camera reveal; the final globe fits',async()=>{
 const scene=snowGlobeScene(),f=fonts.find(f=>f.id==='bebasneue')!,bytes=await readFile('public'+f.file),font=new FontLoader().parse(new TTFLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length)));
 const boxes=scene.objects.map(o=>{
  const group=new T.Group();o.text.split('\n').forEach((line,lineIndex)=>{const letters=new T.Group();let cursor=0;for(const ch of line){const glyph=font.data.glyphs[ch]||font.data.glyphs['?'];if(!/\s/.test(ch)){const geo=new TextGeometry(ch,{font,size:o.size,depth:o.depth,bevelEnabled:true,bevelSize:o.bevel,bevelThickness:o.bevel,bevelSegments:3,curveSegments:10});geo.translate(0,0,-o.depth/2);const mesh=new T.Mesh(geo);mesh.position.set(cursor,-lineIndex*o.size*o.lineHeight,0);letters.add(mesh);}cursor+=(glyph?.ha||600)/font.data.resolution*o.size+o.spacing;}letters.position.x=-cursor/2;group.add(letters);});
  const local=new T.Box3().setFromObject(group),center=local.getCenter(new T.Vector3());local.min.y-=center.y;local.max.y-=center.y;local.translate(new T.Vector3(...o.position));group.traverse(m=>{if(m instanceof T.Mesh){m.geometry.dispose();(m.material as T.Material).dispose();}});return {name:o.name,box:local};
 });
 const camera=new T.PerspectiveCamera(52,16/9,.05,1000);
 for(let time=0;time<16;time+=.1){const pose=sampleCamera(scene,time).current;camera.position.set(...pose.position);camera.fov=pose.fov;camera.lookAt(...pose.target);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);for(const {name,box} of boxes)for(let i=0;i<8;i++){const p=new T.Vector3(i&1?box.max.x:box.min.x,i&2?box.max.y:box.min.y,i&4?box.max.z:box.min.z).project(camera);assert.ok(Math.abs(p.x)<.88&&Math.abs(p.y)<.88,`${name} at ${time}: ${p.toArray()}`);}}
 const globe=buildSet({...scene.set,snowfall:0},scene.ground.height);globe.updateMatrixWorld(true);globe.traverse(o=>{if(!(o instanceof T.Mesh))return;const pos=o.geometry.attributes.position;for(let i=0;i<pos.count;i++){const p=new T.Vector3().fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld).project(camera);assert.ok(Math.abs(p.x)<.88&&Math.abs(p.y)<.88,`${o.name} is outside the final frame: ${p.toArray()}`);}});disposeSet(globe);
});
