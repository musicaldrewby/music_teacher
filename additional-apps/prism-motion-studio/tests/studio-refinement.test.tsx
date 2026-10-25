import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createElement as h} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as T from 'three';
import {blankScene,demoScene,makeObject,sceneSchema} from '../lib/scene';
import {materials} from '../lib/material-presets';
import {createStudioMaterial,createMaterialMaps,disposeMaterialMaps,needsMaterialMaps} from '../lib/material-surfaces';
import {materialChoice,materialSelected,supportsMaterialLibrary} from '../lib/material-actions';
import {lightingPresets} from '../lib/lighting-presets';
import {applyLightingPreset} from '../lib/lighting-actions';
import {applyCinematicSet} from '../lib/cinematic-presets';
import {createLightingEnvironment} from '../lib/lighting';
import {addManualLight,startDark,changeLightKind} from '../lib/manual-lights';
import {buildBlenderTransfer} from '../lib/blender-transfer';
import LightingPanel from '../components/lighting-panel';
import {MaterialLibrary} from '../components/material-library';

test('Everyday presets restore a calibrated look and preserve stored custom lights, geometry and camera work',()=>{
 const old=addManualLight(startDark(demoScene()),'spot');old.lightingSettings.keyPower=0;old.lightingSettings.rotation=70;old.exposure=2;
 for(const p of lightingPresets.filter(p=>p.group==='everyday')){
  const s=sceneSchema.parse(applyLightingPreset(old,p.id));assert.equal(s.lighting,p.id);assert.equal(s.manualRig.mode,'preset');assert.deepEqual(s.manualRig.lights,old.manualRig.lights);assert.deepEqual(s.objects,old.objects);assert.deepEqual(s.camera,old.camera);
  assert.equal(s.lightingSettings.tone,'filmic');assert.equal(s.lightingSettings.bloom,0);assert.equal(s.lightingSettings.motion,'still');assert.equal(s.lightingSettings.keyPower,1);assert.equal(s.lightingSettings.rotation,0);assert.equal(s.exposure,1);assert.equal(s.shadows.softness,p.softness);
 }
 assert.equal(old.manualRig.mode,'custom');assert.equal(applyLightingPreset(old,'missing'),old);assert.equal(blankScene().lighting,'soft-studio');
});
test('Cinematic set selection restores its lighting even after Start dark',()=>{
 const old=addManualLight(startDark(demoScene()),'point'),s=applyCinematicSet(old,'neon-stage');assert.equal(s.manualRig.mode,'preset');assert.deepEqual(s.manualRig.lights,old.manualRig.lights);assert.deepEqual(s.objects,old.objects);assert.ok(sceneSchema.safeParse(s).success);
});
test('Broad studio environments are deterministic, distinct, responsive to power and truly dark at zero',()=>{
 const images=new Set<string>();
 for(const id of ['soft-studio','window-daylight','overcast','warm-interior','product']){
  const s=applyLightingPreset(demoScene(),id),a=createLightingEnvironment(s),b=createLightingEnvironment(s);
  assert.deepEqual(a.image.data,b.image.data);const data=a.image.data as Float32Array;assert.ok(data.every(v=>Number.isFinite(v)&&v>=0));
  images.add(Buffer.from(data.buffer).toString('base64'));s.lightingSettings.intensity=0;s.lightingSettings.ambient=0;const dark=createLightingEnvironment(s);
  assert.ok(dark.image.data.every((v,i)=>i%4===3?v===1:v===0));a.dispose();b.dispose();dark.dispose();
 }
 assert.equal(images.size,5);
});
test('Material IDs remain unique and glass, ceramic and plastics use dielectric rather than metal shading',()=>{
 assert.equal(new Set(materials.map(p=>p.id)).size,materials.length);
 for(const p of materials){const m=createStudioMaterial(p);assert.ok(m instanceof T.MeshPhysicalMaterial);assert.ok([m.roughness,m.metalness,m.clearcoat,m.opacity].every(v=>v>=0&&v<=1));
  if(['glass','plastic','ceramic'].includes(p.texture))assert.equal(m.metalness,0,p.id);
  if(p.texture==='glass'){assert.ok(m.transmission>=.9,p.id);assert.equal(m.ior,1.5);}
  m.dispose();
 }
 for(const id of ['champagne','chrome','wood','marble','foil','denim','bronze'])assert.ok(materials.some(p=>p.id===id));
});
test('Natural and brushed materials have independent, repeatable color, roughness and normal maps',()=>{
 for(const id of ['wood','marble','granite','denim','copper','oak','brass','linen','concrete','porcelain']){
  const p=materials.find(m=>m.id===id)!;assert.ok(needsMaterialMaps(p));const maps=createMaterialMaps(p),again=createMaterialMaps(p);
  for(const key of ['color','normal','roughness'] as const){assert.deepEqual(maps[key].image.data,again[key].image.data);assert.equal(maps[key].wrapS,T.RepeatWrapping);assert.equal(maps[key].generateMipmaps,true);}
  assert.equal(maps.color.colorSpace,T.SRGBColorSpace);assert.equal(maps.normal.colorSpace,T.NoColorSpace);assert.equal(maps.roughness.colorSpace,T.NoColorSpace);assert.notDeepEqual(maps.color.image.data,maps.roughness.image.data);
  assert.ok(maps.normal.image.data.some((v,i)=>i%4===0&&v!==128),id);
  const m=createStudioMaterial(p,'#aabbcc',.5,maps);assert.equal(m.map,maps.color);assert.equal(m.normalMap,maps.normal);assert.equal(m.roughnessMap,maps.roughness);assert.equal(m.color.getHexString(),'aabbcc');assert.equal(m.opacity,.5);
  let disposed=0;Object.values(maps).forEach(map=>map.addEventListener('dispose',()=>disposed++));m.dispose();assert.equal(disposed,0);disposeMaterialMaps(maps);assert.equal(disposed,3);disposeMaterialMaps(again);
 }
});
test('Material changes clear overlapping custom finishes without erasing an unrelated face finish',()=>{
 const o=makeObject();o.surfaceDetail.enabled=true;o.surfaceDetail.target='face';o.proceduralMaterial.enabled=true;o.proceduralMaterial.target='face';o.tint='#112233';
 const sides={...o,...materialChoice(o,'oak','sideMaterial')};assert.equal(sides.sideMaterial,'oak');assert.equal(sides.material,o.material);assert.equal(sides.surfaceDetail.enabled,true);assert.equal(sides.proceduralMaterial.enabled,true);
 const face={...o,...materialChoice(o,'porcelain','material')};assert.equal(face.material,'porcelain');assert.equal(face.surfaceDetail.enabled,false);assert.equal(face.proceduralMaterial.enabled,false);assert.equal(face.tint,'#ffffff');assert.equal(o.tint,'#112233');
 const all={...o,...materialChoice(o,'brass','all')};assert.ok(materialSelected(all,'brass','all'));all.sideMaterial='wood';assert.equal(materialSelected(all,'brass','all'),false);
 const prop=makeObject('prop','sphere'),changed={...prop,...materialChoice(prop,'linen','backMaterial')};assert.equal(changed.material,'linen');assert.equal(materialSelected(changed,'linen','backMaterial'),true);assert.equal(supportsMaterialLibrary({...o,type:'model'}),false);
});
test('New PBR material maps and transmission survive the Blender geometry handoff',()=>{
 const p=materials.find(m=>m.id==='brass')!,maps=createMaterialMaps(p),m=createStudioMaterial(p,'#ffffff',1,maps),glass=createStudioMaterial(materials.find(p=>p.id==='clear-glass')!);
 const world=new T.Group(),g=new T.BoxGeometry();world.add(new T.Mesh(g,m),new T.Mesh(g,glass));const transfer=buildBlenderTransfer(world),copy=transfer.materials.get(m) as T.MeshPhysicalMaterial;
 assert.equal(copy.map,maps.color);assert.equal(copy.normalMap,maps.normal);assert.equal(copy.roughnessMap,maps.roughness);assert.equal(copy.metalness,1);assert.equal((transfer.materials.get(glass) as T.MeshPhysicalMaterial).transmission,1);
 transfer.dispose();m.dispose();glass.dispose();g.dispose();disposeMaterialMaps(maps);
});
test('Changing lamp type uses sensible units, preserves zero power, and stays within scene limits',()=>{
 const s=addManualLight(startDark(demoScene()),'spot'),spot=s.manualRig.lights[0];assert.equal(changeLightKind(spot,'directional').intensity,3);assert.equal(changeLightKind(spot,'point').intensity,100);assert.equal(changeLightKind({...spot,intensity:0},'directional').intensity,0);
 assert.equal(changeLightKind({...spot,kind:'directional',intensity:20000},'spot').intensity,20000);
});
test('Everyday lighting and the material collection expose concise, labeled controls and clear empty states',()=>{
 const html=renderToStaticMarkup(h(LightingPanel,{scene:blankScene(),change:()=>{},onTrace:()=>{}}));
 for(const label of ['Everyday','Creative','Custom lights','Soft studio','Window daylight','Product softboxes','Exposure slider','Light intensity slider','Render quality'])assert.ok(html.includes(label),label);
 assert.ok(!html.includes('Start dark'));assert.ok(html.includes('aria-pressed="true"'));
 const library=(query:string,object=makeObject())=>renderToStaticMarkup(h(MaterialLibrary,{object,surface:'all',onSurface:()=>{},query,onQuery:()=>{},onApply:()=>{}}));
 assert.match(library(''),/Glazed porcelain/);assert.match(library('glass'),/Clear glass/);assert.match(library('glass'),/Smoked glass/);assert.match(library('nonexistent'),/No matching materials/);
 const empty=renderToStaticMarkup(h(MaterialLibrary,{surface:'all',onSurface:()=>{},query:'',onQuery:()=>{},onApply:()=>{}}));assert.match(empty,/Select a text or object layer/);assert.match(empty,/disabled/);
});
