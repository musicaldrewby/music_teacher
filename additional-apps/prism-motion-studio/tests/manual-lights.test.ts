import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as T from 'three';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {demoScene,sceneSchema} from '../lib/scene';
import {buildLighting,updateLighting,createLightingEnvironment,disposeLighting} from '../lib/lighting';
import {startDark,addManualLight,applyFixtureLighting} from '../lib/manual-lights';
import {flattenTraceScene} from '../lib/pathtrace';
import {ManualLightPanel} from '../components/manual-light-panel';

test('Start dark removes all rig and environment illumination without deleting objects or camera work',()=>{
 const original=demoScene(),s=startDark(original);assert.deepEqual(s.objects,original.objects);assert.deepEqual(s.camera,original.camera);assert.equal(s.background,'black');assert.equal(s.manualRig.mode,'custom');assert.equal(s.manualRig.lights.length,0);assert.equal(s.manualRig.ambient,0);assert.equal(s.manualRig.environment,0);
 const rig=buildLighting(s);assert.ok(rig.children.filter(n=>n instanceof T.Light).every(n=>(n as T.Light).intensity===0));const env=createLightingEnvironment(s);const data=env.image.data as Float32Array;assert.ok(data.every((v,i)=>i%4===3?v===1:v===0));disposeLighting(rig);env.dispose();assert.equal(original.manualRig.mode,'preset');
});
test('Adding exactly one point, spot, or directional light builds only the requested light',()=>{
 for(const kind of ['point','spot','directional'] as const){const s=addManualLight(startDark(demoScene()),kind),rig=buildLighting(s);const lights=rig.children.filter(n=>n instanceof T.Light&&!(n instanceof T.AmbientLight)) as T.Light[];assert.equal(lights.length,1);assert.equal(lights[0].type,kind==='point'?'PointLight':kind==='spot'?'SpotLight':'DirectionalLight');assert.ok(lights[0].intensity>0);assert.deepEqual(lights[0].position.toArray(),[3,4,5]);disposeLighting(rig);}
});
test('Individual colors, positions, target, cone, range and power persist and disabling a light stays dark while sampling',()=>{
 let s=addManualLight(startDark(demoScene()),'spot');s.manualRig.lights[0]={...s.manualRig.lights[0],color:'#ff0055',position:[1,3,4],target:[2,0,-1],angle:22,penumbra:.7,distance:50,intensity:320};s=sceneSchema.parse(JSON.parse(JSON.stringify(s)));const rig=buildLighting(s),light=rig.children.find(n=>n instanceof T.SpotLight) as T.SpotLight;
 assert.equal(light.color.getHexString(),'ff0055');assert.equal(light.intensity,320);assert.deepEqual(light.position.toArray(),[1,3,4]);assert.deepEqual(light.target.position.toArray(),[2,0,-1]);assert.ok(Math.abs(light.angle-22*Math.PI/180)<1e-8);assert.equal(light.distance,50);assert.equal(light.penumbra,.7);disposeLighting(rig);
 s.manualRig.lights[0].enabled=false;const off=buildLighting(s);for(const t of [0,3,8]){updateLighting(off,s,t);assert.equal((off.children.find(n=>n instanceof T.SpotLight) as T.SpotLight).intensity,0);}disposeLighting(off);
});
test('Lights built into sets turn off and restore without touching the chosen custom light',()=>{
 const s=addManualLight(startDark(demoScene()),'point'),world=new T.Scene(),rig=buildLighting(s),fixture=new T.PointLight('#00ff00',15);world.add(rig,fixture);applyFixtureLighting(world,rig,s);assert.equal(fixture.intensity,0);assert.equal((rig.children.find(n=>n instanceof T.PointLight) as T.PointLight).intensity,100);
 s.manualRig.fixtures=true;applyFixtureLighting(world,rig,s);assert.equal(fixture.intensity,15);s.manualRig.fixtures=false;applyFixtureLighting(world,rig,s);assert.equal(fixture.intensity,0);s.manualRig.mode='preset';applyFixtureLighting(world,rig,s);assert.equal(fixture.intensity,15);disposeLighting(rig);
});
test('Point lights retain world position, color, range and changing power in the physical renderer',()=>{
 const scene=addManualLight(startDark(demoScene()),'point');scene.manualRig.lights[0].distance=40;const world=new T.Scene(),rig=buildLighting(scene),target=new T.Scene(),cache=new Map<string,T.Object3D>();rig.position.set(2,0,1);world.add(rig);flattenTraceScene(world,target,cache,{castShadow:true});const source=rig.children.find(n=>n instanceof T.PointLight) as T.PointLight,copy=target.children.find(n=>n instanceof T.PointLight) as T.PointLight;
 assert.ok(copy);assert.deepEqual(copy.position.toArray(),[5,4,6]);assert.equal(copy.distance,40);assert.equal(copy.intensity,source.intensity);source.intensity=12;flattenTraceScene(world,target,cache,{castShadow:true});assert.equal(copy.intensity,12);disposeLighting(rig);
});
test('Legacy scenes retain preset rigs; duplicate IDs, nonfinite fields and more than eight lights are rejected',()=>{
 const old=JSON.parse(JSON.stringify(demoScene()));delete old.manualRig;assert.equal(sceneSchema.parse(old).manualRig.mode,'preset');let s=startDark(demoScene());for(let i=0;i<8;i++)s=addManualLight(s,'point');assert.throws(()=>addManualLight(s,'spot'),/eight/);const duplicate=structuredClone(s);duplicate.manualRig.lights[1].id=duplicate.manualRig.lights[0].id;assert.equal(sceneSchema.safeParse(duplicate).success,false);s.manualRig.lights[0].position[0]=Infinity;assert.equal(sceneSchema.safeParse(s).success,false);
});
test('Light builder exposes a dark-stage action and the actual selected light controls',()=>{
 const s=addManualLight(startDark(demoScene()),'spot'),html=renderToStaticMarkup(createElement(ManualLightPanel,{scene:s,change:()=>{}}));for(const label of ['Start dark','Point light','Spotlight','Directional','Light position','Aim at','Cone half-angle','Cast shadows'])assert.ok(html.includes(label),label);
});

test('Live slider updates retain light identity while updating authored power, color and position',async()=>{
 const {syncManualLighting}=await import('../lib/manual-lights');const s=addManualLight(startDark(demoScene()),'spot'),rig=buildLighting(s),source=rig.children.find(n=>n instanceof T.SpotLight) as T.SpotLight;
 s.manualRig.lights[0].intensity=75;s.manualRig.lights[0].color='#1122ff';s.manualRig.lights[0].position=[-2,3,6];s.manualRig.lights[0].angle=20;
 syncManualLighting(rig,s);updateLighting(rig,s,0);assert.equal(rig.children.find(n=>n instanceof T.SpotLight),source);assert.equal(source.intensity,75);assert.equal(source.color.getHexString(),'1122ff');assert.deepEqual(source.position.toArray(),[-2,3,6]);assert.ok(Math.abs(source.angle-20*Math.PI/180)<1e-8);disposeLighting(rig);
});
