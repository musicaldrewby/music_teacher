import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as T from 'three';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {lightPatternSchema,lightPatternPresets,patternUsesSeed} from '../lib/light-pattern-schema';
import {patternPixels,patternSampler} from '../lib/light-patterns';
import {demoScene,sceneSchema} from '../lib/scene';
import {startDark,addManualLight,syncManualLighting} from '../lib/manual-lights';
import {buildLighting,disposeLighting,updateLighting} from '../lib/lighting';
import {ManualLightPanel} from '../components/manual-light-panel';
import {flattenTraceScene} from '../lib/pathtrace';
import {patternTracingShader,enablePatternTracing,projectedPatternUV} from '../lib/pathtrace-light-patterns';
import {packLightPattern} from '../lib/blender-light-patterns';

test('Older custom lights default to no pattern, and all controls survive scene JSON roundtrip',()=>{
 const scene=addManualLight(startDark(demoScene()),'spot'),legacy=JSON.parse(JSON.stringify(scene));delete legacy.manualRig.lights[0].pattern;
 assert.equal(sceneSchema.parse(legacy).manualRig.lights[0].pattern.kind,'none');
 const pattern=lightPatternSchema.parse({kind:'leaves',size:1.7,rotation:-34,softness:.54,strength:.73,seed:846});scene.manualRig.lights[0].pattern=pattern;
 assert.deepEqual(sceneSchema.parse(JSON.parse(JSON.stringify(scene))).manualRig.lights[0].pattern,pattern);
 for(const patch of [{size:0},{rotation:Infinity},{softness:-1},{strength:2},{seed:1.5},{kind:'other'}])assert.equal(lightPatternSchema.safeParse(patch).success,false);
});
test('Every pattern contains light and dark areas; rendering and shuffle are deterministic',()=>{
 for(const preset of lightPatternPresets.filter(p=>p.id!=='none')){
  const p=lightPatternSchema.parse({kind:preset.id,softness:0}),a=patternPixels(p,96),b=patternPixels(p,96);assert.deepEqual(a,b);
  const values=Array.from(a).filter((_,i)=>i%4===0);assert.ok(values.some(v=>v<25),preset.id+' shadows');assert.ok(values.some(v=>v>230),preset.id+' light');
  const fraction=values.filter(v=>v<128).length/values.length;assert.ok(fraction>.1&&fraction<.9,`${preset.id} balanced coverage ${fraction}`);
 }
 assert.notDeepEqual(patternPixels(lightPatternSchema.parse({kind:'leaves',seed:1}),64),patternPixels(lightPatternSchema.parse({kind:'leaves',seed:2}),64));
});
test('Size and rotation change the projection; softness adds intermediate edges and zero strength restores the beam',()=>{
 const p=lightPatternSchema.parse({kind:'blinds',softness:0}),original=patternPixels(p,96);
 assert.notDeepEqual(patternPixels({...p,size:2},96),original);assert.notDeepEqual(patternPixels({...p,rotation:90},96),original);
 const sample=patternSampler(p),rotated=patternSampler({...p,rotation:90});
 for(const [u,v] of [[.23,.46],[.81,.29],[.1,.63]])assert.ok(Math.abs(rotated(u,v)-sample(1-v,u))<1e-5);
 const soft=patternPixels({...p,softness:1},96);assert.ok(Array.from(soft).filter((v,i)=>i%4===0&&v>25&&v<230).length>Array.from(original).filter((v,i)=>i%4===0&&v>25&&v<230).length);
 assert.ok(patternPixels({...p,strength:0},32).every(v=>v===255));
});
test('Each spotlight owns its pattern; live changes reuse textures, removing patterns releases them',()=>{
 let scene=addManualLight(startDark(demoScene()),'spot');scene=addManualLight(scene,'spot');scene.manualRig.lights[0].pattern.kind='blinds';scene.manualRig.lights[1].pattern.kind='leaves';
 const rig=buildLighting(scene),lights=rig.children.filter(n=>n instanceof T.SpotLight) as T.SpotLight[];
 assert.ok(lights[0].map);assert.ok(lights[1].map);assert.notEqual(lights[0].map,lights[1].map);
 const texture=lights[0].map!,other=lights[1].map!,oldVersion=texture.version;let disposed=false;texture.addEventListener('dispose',()=>{disposed=true;});
 scene.manualRig.lights[0].pattern.rotation=45;syncManualLighting(rig,scene);updateLighting(rig,scene,2);
 assert.equal(lights[0].map,texture);assert.ok(texture.version>oldVersion);assert.equal(lights[1].map,other);assert.equal(disposed,false);
 scene.manualRig.lights[0].pattern.kind='none';syncManualLighting(rig,scene);assert.equal(lights[0].map,null);assert.equal(disposed,true);
 let otherDisposed=false;other.addEventListener('dispose',()=>{otherDisposed=true;});disposeLighting(rig);assert.equal(otherDisposed,true);
});
test('Pattern picker and sliders appear on spotlights only, with a leaf shuffle action',()=>{
 const scene=addManualLight(startDark(demoScene()),'spot');scene.manualRig.lights[0].pattern.kind='leaves';
 const html=renderToStaticMarkup(createElement(ManualLightPanel,{scene,change:()=>{}}));
 for(const text of [...lightPatternPresets.map(p=>p.name),'Pattern size','Pattern rotation','Pattern softness','Pattern strength','Shuffle the leaves'])assert.ok(html.includes(text),text);
 scene.manualRig.lights[0].kind='point';assert.ok(!renderToStaticMarkup(createElement(ManualLightPanel,{scene,change:()=>{}})).includes('Projected light pattern'));
});
test('Projected UV matches the raster shadow-camera projection after moving and aiming the rig',()=>{
 const world=new T.Scene(),rig=new T.Group(),light=new T.SpotLight();light.position.set(3,4,6);light.target.position.set(-1,.5,0);light.angle=.6;
 rig.add(light,light.target);world.add(rig);rig.rotation.y=.7;rig.position.set(1,2,-3);world.updateMatrixWorld(true);light.shadow.updateMatrices(light);
 for(const point of [new T.Vector3(0,0,0),new T.Vector3(1,1,-2),light.target.getWorldPosition(new T.Vector3())]){
  const actual=point.clone().applyMatrix4(light.shadow.matrix),expected=projectedPatternUV(light,point);assert.ok(Math.abs(actual.x-expected.x)<1e-6);assert.ok(Math.abs(actual.y-expected.y)<1e-6);
 }
 light.shadow.dispose();
});
test('The pinned physical shader accepts projected masks and an incompatible shader fails explicitly',async()=>{
 const module='three-gpu-pathtracer/src/materials/pathtracing/PhysicalPathTracingMaterial.js';
 const {PhysicalPathTracingMaterial}=await import(module) as {PhysicalPathTracingMaterial:new()=>T.ShaderMaterial};
 const material=new PhysicalPathTracingMaterial();const patched=patternTracingShader(material.fragmentShader);
 assert.ok(patched.includes('patternUv'));assert.ok(patched.includes('getSpotAttenuation( light.coneCos, light.penumbraCos, cosTheta )'));
 assert.throws(()=>patternTracingShader('incompatible shader'),/Standard/);
 let resolution:number[]=[];const atlas={setTextures:(_renderer:unknown,_textures:unknown,width:number,height:number)=>{resolution=[width,height];}};
 const mock={fragmentShader:material.fragmentShader,iesProfiles:atlas,needsUpdate:false};enablePatternTracing({_pathTracer:{material:mock}});atlas.setTextures(null,[],0,0);assert.deepEqual(resolution,[512,512]);material.dispose();
});
test('Physical flattening and Blender packaging retain each lamp mask, even with shadows off',()=>{
 const scene=addManualLight(startDark(demoScene()),'spot');scene.manualRig.lights[0].pattern.kind='window';scene.shadows.mode='off';
 const world=new T.Scene(),rig=buildLighting(scene),target=new T.Scene(),cache=new Map<string,T.Object3D>();world.add(rig);const source=rig.children.find(n=>n instanceof T.SpotLight) as T.SpotLight;
 assert.equal(source.castShadow,false);assert.ok(source.map);flattenTraceScene(world,target,cache,{castShadow:false});
 const copy=target.children.find(n=>n instanceof T.SpotLight) as T.SpotLight&{iesMap:T.Texture};assert.equal(copy.iesMap,source.map);
 const packed=packLightPattern(source,'PRISM_L_0')!;assert.equal(packed.info.width,512);assert.equal(packed.bytes.length,512*512*4*4);
 const values=new Float32Array(packed.bytes.buffer),original=(source.map as T.DataTexture).image.data;
 for(let i=0;i<values.length;i+=137)assert.ok(Math.abs(values[i]-Number(original[i])/255)<1e-6);
 source.position.x=8;flattenTraceScene(world,target,cache,{castShadow:false});assert.equal(copy.position.x,8);assert.equal(copy.iesMap,source.map);
 scene.manualRig.lights[0].pattern.kind='none';syncManualLighting(rig,scene);flattenTraceScene(world,target,cache,{castShadow:false});assert.equal(copy.iesMap,null);assert.equal(packLightPattern(source,'PRISM_L_0'),undefined);disposeLighting(rig);
});


test('Every seeded pattern shuffles reproducibly without reusing another arrangement from the cache',()=>{
 for(const {id} of lightPatternPresets.filter(p=>patternUsesSeed(p.id))){
  const p=lightPatternSchema.parse({kind:id,seed:1}),a=patternPixels(p,96),b=patternPixels({...p,seed:138},96);
  assert.notDeepEqual(a,b,id);assert.deepEqual(patternPixels(p,96),a,id+' restores saved arrangement');
 }
});
test('New masks survive saving and pass unchanged to both export paths',()=>{
 const kinds=lightPatternPresets.slice(5).map(p=>p.id),scene=addManualLight(startDark(demoScene()),'spot'),world=new T.Scene(),rig=buildLighting(scene),target=new T.Scene(),cache=new Map<string,T.Object3D>();world.add(rig);
 const source=rig.children.find(n=>n instanceof T.SpotLight) as T.SpotLight;
 for(const kind of kinds){
  scene.manualRig.lights[0].pattern=lightPatternSchema.parse({kind,rotation:23,size:.8,softness:.3,strength:.8,seed:42});
  const saved=sceneSchema.parse(JSON.parse(JSON.stringify(scene)));assert.deepEqual(saved.manualRig.lights[0].pattern,scene.manualRig.lights[0].pattern);
  syncManualLighting(rig,saved);flattenTraceScene(world,target,cache,{castShadow:true});
  const copy=target.children.find(n=>n instanceof T.SpotLight) as T.SpotLight&{iesMap:T.Texture};assert.equal(copy.iesMap,source.map);
  const packed=packLightPattern(source,'PRISM_L_0')!,values=new Float32Array(packed.bytes.buffer),pixels=(source.map as T.DataTexture).image.data;
  for(let i=0;i<values.length;i+=113)assert.ok(Math.abs(values[i]-Number(pixels[i])/255)<1e-6,kind);
 }
 disposeLighting(rig);
});
