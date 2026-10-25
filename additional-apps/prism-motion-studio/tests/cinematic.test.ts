import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as T from 'three';
import {PhysicalCamera} from 'three-gpu-pathtracer';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {demoScene,sceneSchema,makeObject} from '../lib/scene';
import {lensSchema,detailPatterns,surfaceDetailSchema,finishPresets} from '../lib/cinematic';
import {sampleFocusDistance,resolveFocus,configurePhysicalFocus,previewAperture} from '../lib/focus';
import {FocusPass} from '../lib/focus-pass';
import {createDetailMaps,applySurfaceDetail,detailApplies,disposeDetailMaps} from '../lib/surface-detail';
import {applyCinematicSet,cinematicScene,cinematicTemplates} from '../lib/cinematic-presets';
import {flattenTraceScene} from '../lib/pathtrace';
import {buildSet,disposeSet} from '../lib/sets';
import {FocusPanel,SetPanel,SurfaceDetailPanel} from '../components/cinematic-panels';

const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('Older saves acquire disabled cinematic defaults without changing lighting, materials or cameras',()=>{
 const old:any=demoScene();delete old.set;delete old.lens;old.objects.forEach((o:any)=>delete o.surfaceDetail);const s=sceneSchema.parse(old);
 assert.equal(s.set.id,'none');assert.equal(s.lens.enabled,false);assert.ok(s.objects.every(o=>!o.surfaceDetail.enabled));assert.deepEqual(s.camera,old.camera);assert.equal(s.objects[0].material,old.objects[0].material);assert.equal(s.lighting,old.lighting);
});
test('Layer focus uses camera-space depth and follows animated world transforms across angles',()=>{
 const c=new T.PerspectiveCamera(40,16/9,.05,1000),g=new T.Group(),mesh=new T.Mesh(new T.BoxGeometry(2,2,.5));g.add(mesh);g.position.set(5,1,0);c.position.set(0,0,13);c.lookAt(0,0,0);const lens=lensSchema.parse({enabled:true,targetId:'title'});
 near(resolveFocus(lens,0,c,g),13);g.position.z=3;near(resolveFocus(lens,0,c,g),10);
 c.position.set(12,2,4);c.lookAt(g.position);near(resolveFocus(lens,0,c,g),c.position.distanceTo(g.position));
 g.position.copy(c.position).add(c.getWorldDirection(new T.Vector3()).multiplyScalar(-10));near(resolveFocus(lens,0,c,g),c.near*2);
 mesh.geometry.dispose();
});
test('Focus pulls interpolate deterministically, clamp outside keys and survive reverse scrubbing',()=>{
 const lens=lensSchema.parse({mode:'manual',keys:[{time:3,distance:20,easing:'linear'},{time:1,distance:6}]});near(sampleFocusDistance(lens,0),6);near(sampleFocusDistance(lens,2),13);near(sampleFocusDistance(lens,5),20);near(sampleFocusDistance(lens,2),13);
 const camera=new T.PerspectiveCamera();near(resolveFocus({...lens,mode:'target',targetId:'deleted'},2,camera),13);
});
test('Physical lens copies exact view and maps the same aperture/focus used by the preview',()=>{
 const source=new T.PerspectiveCamera(47,16/9,.05,1000);source.position.set(4,2,14);source.lookAt(0,0,0);source.updateMatrixWorld(true);const physical=new PhysicalCamera(),lens=lensSchema.parse({enabled:true,aperture:.4});configurePhysicalFocus(physical,source,lens,12);
 near(physical.focusDistance,12);near(physical.bokehSize/1000,lens.aperture);assert.deepEqual(physical.projectionMatrix.elements,source.projectionMatrix.elements);assert.deepEqual(physical.matrixWorld.elements,source.matrixWorld.elements);
 assert.ok(previewAperture(source,12,.8)>previewAperture(source,12,.4));assert.ok(previewAperture(source,6,.4)>previewAperture(source,12,.4));configurePhysicalFocus(physical,source,{...lens,enabled:false},12);assert.equal(physical.bokehSize,0);
});
test('Focus pass preserves alpha and restores depth-only scene changes after a render failure',()=>{
 const world=new T.Scene(),bg=new T.Color('#112233'),mesh=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial({opacity:0})),helper=new T.Group();helper.userData.editorHelper=true;world.background=bg;world.add(mesh,helper);const pass=new FocusPass(world,new T.PerspectiveCamera());assert.ok(!pass.materialBokeh.fragmentShader.includes('gl_FragColor.a = 1.0;'));
 assert.throws(()=>pass.render({getClearColor:()=>{throw Error('GPU failure');}} as any,new T.WebGLRenderTarget(1,1),new T.WebGLRenderTarget(1,1)),/GPU failure/);assert.equal(world.background,bg);assert.equal(mesh.visible,true);assert.equal(helper.visible,true);assert.equal(world.overrideMaterial,null);pass.dispose();mesh.geometry.dispose();
});
test('Every finish produces repeatable linear normal/roughness maps with usable surface variation',()=>{
 for(const pattern of detailPatterns){const detail=surfaceDetailSchema.parse({enabled:true,pattern,scale:3,rotation:35}),maps=createDetailMaps(detail,256),again=createDetailMaps(detail,256);assert.deepEqual(maps.normal.image.data,again.normal.image.data);assert.equal(maps.normal.colorSpace,T.NoColorSpace);assert.equal(maps.normal.wrapS,T.RepeatWrapping);assert.ok(new Set(maps.roughness.image.data).size>10,pattern);assert.ok(maps.normal.image.data.some((v,i)=>i%4===0&&v!==128),pattern);near(maps.normal.rotation,35*Math.PI/180);assert.deepEqual(maps.normal.repeat.toArray(),[3,3]);
  const mat=new T.MeshPhysicalMaterial({transmission:.8,ior:1.45});applySurfaceDetail(mat,detail,maps);assert.equal(mat.normalMap,maps.normal);assert.equal(mat.roughnessMap,maps.roughness);assert.equal(mat.transmission,.8);assert.equal(mat.ior,1.45);near(mat.normalScale.x,.35);disposeDetailMaps(maps);disposeDetailMaps(again);mat.dispose();}
});
test('Face-only surface detail keeps side and bevel material settings independent',()=>{
 const d=surfaceDetailSchema.parse({enabled:true,target:'face'});assert.equal(detailApplies(d,0),true);assert.equal(detailApplies(d,1),false);assert.equal(detailApplies(d,2),false);assert.equal(detailApplies(d,3),false);assert.equal(detailApplies(d,1,true),true);assert.equal(detailApplies({...d,enabled:false},0),false);
 for(const p of finishPresets)assert.equal(surfaceDetailSchema.safeParse(p.details).success,true);
});
test('All cinematic showcases validate, preserve 60 FPS, and survive a complete JSON round trip',()=>{
 assert.equal(cinematicTemplates.length,7);for(const p of cinematicTemplates){const s=cinematicScene(p.id);assert.equal(sceneSchema.safeParse(s).success,true,p.id);assert.equal(s.fps,60);assert.equal(s.duration,p.id==='aquarium'?140:p.id==='toy-factory'?42:p.id==='miniature-town'?40:p.id==='snow-globe'?16:10);assert.equal(s.set.id,p.id);if(p.id==='aquarium'){assert.equal(s.camera.shots.length,8);assert.equal(s.objects.length,0);}else if(p.id==='miniature-town'){assert.equal(s.camera.ride.enabled,true);assert.equal(s.camera.shotsEnabled,false);}else if(p.id==='toy-factory'){assert.equal(s.camera.shots.length,8);assert.equal(s.camera.factoryView,'cinematic');}else{assert.equal(s.lens.targetId,s.objects[0].id);assert.equal(s.camera.shots.length,3);}assert.deepEqual(sceneSchema.parse(JSON.parse(JSON.stringify(s))),s);}
 const old=demoScene(),changed=applyCinematicSet(old,'haunted-theater');assert.deepEqual(changed.objects,old.objects);assert.deepEqual(changed.camera,old.camera);assert.equal(changed.lighting,'ultraviolet');
});
test('Invalid optics, texture budgets and focus timelines are rejected',()=>{
 for(const patch of [{lens:{aperture:Infinity}},{lens:{aperture:0}},{lens:{distance:NaN}},{lens:{keys:[{time:9,distance:13}]}},{lens:{keys:[{time:1,distance:13},{time:1,distance:8}]}},{set:{scale:100}},{set:{id:'unknown'}}])assert.equal(sceneSchema.safeParse({...demoScene(),...patch}).success,false);
 const s=demoScene();s.objects[0].surfaceDetail.scale=200;assert.equal(sceneSchema.safeParse(s).success,false);
});
test('Path-traced export includes set geometry and omits every set descendant for transparent output',()=>{
 const scene=cinematicScene('christmas-pavilion'),world=new T.Scene(),set=buildSet(scene.set,-2.7),title=new T.Mesh(new T.BoxGeometry(),new T.MeshPhysicalMaterial());world.add(set,title);const flattened=new T.Scene(),cache=new Map<string,T.Object3D>();flattenTraceScene(world,flattened,cache,{castShadow:true});assert.ok(flattened.children.length>100);flattenTraceScene(world,flattened,cache,{castShadow:true,omit:[set]});assert.equal(flattened.children.length,1);assert.equal((flattened.children[0] as T.Mesh).geometry,title.geometry);disposeSet(set);title.geometry.dispose();
});
test('Cinematic controls render seven set choices, six finishes and focus picking controls',()=>{
 const scene=cinematicScene('neon-stage'),noop=()=>{};const html=renderToStaticMarkup(createElement('div',null,createElement(SetPanel,{scene,change:noop}),createElement(SurfaceDetailPanel,{object:scene.objects[0],change:noop}),createElement(FocusPanel,{scene,time:0,selected:scene.objects[0].id,change:noop,seek:noop,picking:false,setPicking:noop,distanceTo:()=>13,currentDistance:()=>13})));
 assert.equal((html.match(/class="cinema-set-card/g)||[]).length,7);assert.equal((html.match(/class="finish-preset/g)||[]).length,6);assert.match(html,/Pick in preview/);assert.match(html,/Create a focus pull/);assert.match(html,/Blur amount/);
});
