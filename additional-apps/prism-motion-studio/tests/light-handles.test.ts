import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as T from 'three';
import {demoScene,sceneSchema} from '../lib/scene';
import {addManualLight,startDark} from '../lib/manual-lights';
import {buildLighting,updateLighting,disposeLighting} from '../lib/lighting';
import {LightHandles,lightHandleId,authorLightPoint} from '../lib/light-handles';
import {buildBlenderTransfer} from '../lib/blender-transfer';
import {flattenTraceScene} from '../lib/pathtrace';
const close=(a:number[],b:number[])=>a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<1e-7,`${a} ≈ ${b}`));

test('Custom lights expose independently pickable position and aim handles at the actual world coordinates',()=>{
 let s=addManualLight(startDark(demoScene()),'point');s=addManualLight(s,'spot');s.lightingSettings.rotation=35;s.lightingSettings.height=2;
 const world=new T.Scene(),rig=buildLighting(s),handles=new LightHandles();world.add(rig,handles.root);handles.update(s,rig,'');world.updateMatrixWorld(true);assert.equal(handles.nodes.size,3);
 for(const spec of s.manualRig.lights){const light=rig.children.find(n=>n.userData.lightId===spec.id)!;close(handles.nodes.get(lightHandleId(spec.id,'position'))!.position.toArray(),light.getWorldPosition(new T.Vector3()).toArray());}
 const selected=handles.nodes.get(lightHandleId(s.manualRig.lights[0].id,'position'))!;const ray=new T.Raycaster(selected.position.clone().add(new T.Vector3(0,0,2)),new T.Vector3(0,0,-1));assert.ok(handles.pick(ray)?.startsWith('light:'));handles.dispose();disposeLighting(rig);
});
test('Dragging a light previews illumination immediately and converts its saved pose through the rotated rig',()=>{
 const s=addManualLight(startDark(demoScene()),'point');s.lightingSettings.rotation=60;s.lightingSettings.height=3;const rig=buildLighting(s),handles=new LightHandles(),world=new T.Scene();world.add(rig,handles.root);handles.update(s,rig,'');const node=handles.nodes.get(lightHandleId(s.manualRig.lights[0].id,'position'))!;
 node.position.set(-2,4,7);world.updateMatrixWorld(true);handles.update(s,rig,node.userData.id,node,2);const light=rig.children.find(n=>n instanceof T.PointLight)!;close(light.getWorldPosition(new T.Vector3()).toArray(),[-2,4,7]);const edit=handles.edit(node,s,rig,2);s.manualRig.lights[0].position=edit.value;const stored=sceneSchema.parse(JSON.parse(JSON.stringify(s))),next=buildLighting(stored);close(next.children.find(n=>n instanceof T.PointLight)!.getWorldPosition(new T.Vector3()).toArray(),[-2,4,7]);handles.dispose();disposeLighting(rig);disposeLighting(next);
});
test('Dragging a swept spotlight target subtracts the current sweep offset before saving',()=>{
 const s=addManualLight(startDark(demoScene()),'spot');s.lightingSettings.motion='sweep';s.lightingSettings.rotation=-20;s.lightingSettings.height=1;const time=2.3,rig=buildLighting(s),handles=new LightHandles(),world=new T.Scene();world.add(rig,handles.root);updateLighting(rig,s,time);handles.update(s,rig,'',undefined,time);const id=s.manualRig.lights[0].id,node=handles.nodes.get(lightHandleId(id,'target'))!;
 node.position.set(4,2,-3);world.updateMatrixWorld(true);const saved=authorLightPoint(s,id,'target',node.position,rig,time);s.manualRig.lights[0].target=saved;const next=buildLighting(s);updateLighting(next,s,time);close((next.children.find(n=>n instanceof T.SpotLight) as T.SpotLight).target.getWorldPosition(new T.Vector3()).toArray(),[4,2,-3]);handles.dispose();disposeLighting(rig);disposeLighting(next);
});
test('Editor handles are omitted from Blender and physical renders, and hidden handles cannot be picked',()=>{
 const s=addManualLight(startDark(demoScene()),'spot'),rig=buildLighting(s),handles=new LightHandles(),world=new T.Scene();world.add(rig,handles.root);handles.update(s,rig,'');const transfer=buildBlenderTransfer(world);assert.equal(transfer.sources.length,0);const target=new T.Scene();flattenTraceScene(world,target,new Map(),{castShadow:true});assert.equal(target.children.filter(n=>n instanceof T.Mesh||n instanceof T.Line).length,0);handles.enabled=false;handles.update(s,rig,'');assert.equal(handles.pick(new T.Raycaster()),undefined);transfer.dispose();handles.dispose();disposeLighting(rig);
});
test('Deleting lights and changing spotlight types removes stale handles and guide lines',()=>{
 const s=addManualLight(startDark(demoScene()),'spot'),handles=new LightHandles(),rig=buildLighting(s);handles.update(s,rig,'');assert.equal(handles.nodes.size,2);s.manualRig.lights=[];handles.update(s,rig,'');assert.equal(handles.nodes.size,0);assert.equal(handles.root.children.length,0);handles.dispose();disposeLighting(rig);
});
