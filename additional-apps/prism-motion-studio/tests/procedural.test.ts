import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {buildGenerator,generatorCatalog,generatorPreset,sampleGenerator} from '../lib/procedural-generators';
import {materialSample,createProceduralMaps,proceduralMaterialPresets,applyProceduralMaterial,boxProject} from '../lib/procedural-material';
import {applyPlacement,placementPoses,proceduralOffset,expandPlacement} from '../lib/procedural-placement';
import {makeObject,demoScene,sceneSchema} from '../lib/scene';
import {proceduralShowcaseScene} from '../lib/procedural-scene';
import {sampleCamera} from '../lib/sequence';
import {animateGroup} from '../lib/motion';
import {disposeModel} from '../lib/models';
import {buildBlenderTransfer,BakeTracks} from '../lib/blender-transfer';
import {flattenTraceScene} from '../lib/pathtrace';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {GeneratorPanel,ProceduralLibrary,ProceduralMaterialPanel,PlacementPanel} from '../components/procedural-panel';
const near=(a:number,b:number,eps=1e-6)=>assert.ok(Math.abs(a-b)<eps,`${a} differs from ${b}`);
function snapshot(g:T.Group){g.updateMatrixWorld(true);const values:number[]=[];g.traverse(o=>{values.push(...o.matrixWorld.elements,o.visible?1:0);if(o instanceof T.Mesh)values.push(...(o.morphTargetInfluences||[]));});return values;}
function fingerprint(g:T.Group){const hash=createHash('sha256');g.updateMatrixWorld(true);g.traverse(o=>{hash.update(JSON.stringify(o.matrixWorld.elements));if(o instanceof T.Mesh){hash.update(Buffer.from(o.geometry.getAttribute('position').array.buffer));for(const m of Array.isArray(o.material)?o.material:[o.material])hash.update(JSON.stringify((m as T.MeshStandardMaterial).color?.toArray()));}});return hash.digest('hex');}
test('all 23 generator presets build finite meshes with usable normals and stable seeds',()=>{
 for(const entry of generatorCatalog){const p=generatorPreset(entry.id),a=buildGenerator(p),b=buildGenerator(p);let meshes=0,triangles=0;a.traverse(o=>{if(!(o instanceof T.Mesh))return;meshes++;const pos=o.geometry.getAttribute('position');assert.ok([...pos.array].every(Number.isFinite),entry.id);assert.ok(o.geometry.getAttribute('normal'));triangles+=(o.geometry.index?.count||pos.count)/3;});assert.ok(meshes>0,entry.id);assert.ok(triangles<300000,entry.id+' triangle budget');assert.equal(fingerprint(a),fingerprint(b),entry.id+' determinism');disposeModel(a);disposeModel(b);}
});
test('generator animation loops exactly and is independent of previous samples',()=>{
 for(const entry of generatorCatalog){const p=generatorPreset(entry.id),g=buildGenerator(p);sampleGenerator(g,p,0,24);const first=snapshot(g);sampleGenerator(g,p,5.6,24);const middle=snapshot(g);sampleGenerator(g,p,19.3,24);sampleGenerator(g,p,5.6,24);const repeated=snapshot(g);middle.forEach((v,i)=>near(v,repeated[i]));sampleGenerator(g,p,24,24);const end=snapshot(g);first.forEach((v,i)=>near(v,end[i]));disposeModel(g);}
});
test('material maps tile, preserve data color spaces and vary by seed',()=>{
 for(const preset of proceduralMaterialPresets){const p=preset.settings;for(const t of [.1,.36,.72]){const a=materialSample(p,0,t),b=materialSample(p,1,t),c=materialSample(p,t,0),d=materialSample(p,t,1);for(const key of ['value','height','wear','emission'] as const){near(a[key],b[key]);near(c[key],d[key]);}}
  const a=createProceduralMaps(p,32),b=createProceduralMaps({...p,seed:p.seed+1},32);assert.notDeepEqual(a.color.image.data,b.color.image.data,p.pattern);assert.equal(a.color.colorSpace,T.SRGBColorSpace);assert.equal(a.normal.colorSpace,T.NoColorSpace);assert.equal(a.normal.wrapS,T.RepeatWrapping);Object.values(a).concat(Object.values(b)).forEach(t=>t.dispose());}
});
test('material overrides can target a named imported surface and preserve other materials',()=>{
 const a=new T.MeshStandardMaterial({color:'red'});a.name='Brick facade';const b=new T.MeshStandardMaterial({color:'blue'});b.name='Windows';const g=new T.Group(),brick=new T.Mesh(new T.BoxGeometry(),a),window=new T.Mesh(new T.BoxGeometry(),b);g.add(brick,window);const original=window.material;
 applyProceduralMaterial(g,{...proceduralMaterialPresets[3].settings,materialName:'Brick facade'});assert.ok(brick.material.map);assert.equal(window.material,original);assert.ok(brick.geometry.getAttribute('uv'));disposeModel(g);
});
test('box projection respects world scale and preserves animated morph topology',()=>{
 const g=buildGenerator(generatorPreset('water')),m=g.children[0] as T.Mesh,geo=boxProject(m.geometry,new T.Matrix4().makeScale(2,2,2));assert.equal(geo.morphAttributes.position!.length,4);assert.equal(geo.morphAttributes.position![0].count,geo.getAttribute('position').count);assert.ok([...geo.getAttribute('uv').array].every(Number.isFinite));geo.dispose();disposeModel(g);
});
test('scatter honors minimum center spacing, has deterministic poses and reports dense shortfall',()=>{
 const s=demoScene(),o=makeObject('prop','sphere');o.placement={...o.placement,enabled:true,mode:'scatter',count:60,radius:4,minimumDistance:1};const a=placementPoses(o.placement,s),b=placementPoses(o.placement,s);assert.deepEqual(a,b);for(let i=0;i<a.length;i++)for(let j=0;j<i;j++)assert.ok(Math.hypot(a[i].position[0]-a[j].position[0],a[i].position[2]-a[j].position[2])>=1);assert.ok(a.length>10);assert.ok(placementPoses({...o.placement,radius:.1,minimumDistance:20},s).length<60);
});
test('frozen arrays preserve group placement and create valid editable layers',()=>{
 const s=demoScene(),o=makeObject('prop','cube');o.position=[2,3,4];o.placement={...o.placement,enabled:true,mode:'ring',count:7,jitter:0,sizeVariation:0};s.objects=[o];const result=expandPlacement(s,o);assert.equal(result.objects.length,8);assert.equal(result.objects[0].type,'group');assert.deepEqual(result.objects[0].position,o.position);assert.ok(result.objects.slice(1).every(n=>n.parentId===o.id&&!n.placement.enabled));assert.ok(sceneSchema.safeParse(result).success);
 const source=new T.Group();source.add(new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial()));const array=applyPlacement(source,o,s);assert.equal(array.children.length,7);assert.equal(array.userData.placementCount,7);disposeModel(array);
});
test('procedural motion retains old scene transforms when disabled and loops in matrix space',()=>{
 for(const kind of ['float','orbit','figure-eight','helix','spring','wave','spin'] as const){const o=makeObject('prop','cube');o.proceduralMotion={...o.proceduralMotion,kind,enabled:true,cycles:3};const g=new T.Group();animateGroup(g,o,0,12);g.updateMatrix();const a=[...g.matrix.elements];animateGroup(g,o,12,12);g.updateMatrix();a.forEach((v,i)=>near(v,g.matrix.elements[i]));}
 const p=makeObject().proceduralMotion;assert.deepEqual(proceduralOffset(p,3,8),{position:[0,0,0],rotation:[0,0,0]});
});
test('Blender handoff retains four water morphs and samples animated weights separately',()=>{
 const p=generatorPreset('water'),root=buildGenerator(p),world=new T.Scene();world.add(root);sampleGenerator(root,p,3,24);const transfer=buildBlenderTransfer(world),source=transfer.sources[0].mesh,copy=transfer.group.children[0] as T.Mesh;assert.equal(copy.geometry.morphAttributes.position!.length,4);assert.deepEqual(copy.morphTargetInfluences,[0,0,0,0]);const tracks=new BakeTracks(3);for(let i=0;i<3;i++){sampleGenerator(root,p,i*3,24);tracks.add('PRISM_SHAPE_'+transfer.sources[0].id,i,[...source.morphTargetInfluences!]);}assert.equal(tracks.pack().tracks[0].stride,4);assert.equal(tracks.pack().tracks[0].count,3);
 const target=new T.Scene();flattenTraceScene(world,target,new Map(),{castShadow:true});const traced=target.children[0] as T.Mesh;assert.deepEqual(traced.morphTargetInfluences,source.morphTargetInfluences);transfer.dispose();disposeModel(root);
});
test('new settings are backwards compatible and showcase camera closes its loop',()=>{
 const old:any=demoScene();old.objects.forEach((o:any)=>{delete o.generator;delete o.proceduralMaterial;delete o.placement;delete o.proceduralMotion;});delete old.camera.proceduralMotion;const parsed=sceneSchema.parse(old);assert.equal(parsed.objects[0].proceduralMaterial.enabled,false);assert.equal(parsed.objects[0].placement.enabled,false);assert.equal(parsed.camera.proceduralMotion.enabled,false);const scene=proceduralShowcaseScene(),a=sampleCamera(scene,0).current,b=sampleCamera(scene,scene.duration).current;a.position.forEach((v,i)=>near(v,b.position[i]));assert.equal(scene.duration,24);assert.ok(scene.objects.some(o=>o.generator.kind==='water'&&o.prop==='procedural'));
 const invalid=structuredClone(parsed);invalid.objects[0].placement.enabled=true;invalid.objects[0].placement.mode='path';invalid.objects[0].placement.pathId='missing';assert.equal(sceneSchema.safeParse(invalid).success,false);
});

test('growth reverses without accumulation and freezing holds the selected phase',()=>{
 for(const kind of ['city','forest','vine','crystals','fractal','tunnel'] as const){const p={...generatorPreset(kind),growth:'assemble' as const,growthLoop:true},g=buildGenerator(p);sampleGenerator(g,p,0,24);const a=snapshot(g);sampleGenerator(g,p,12,24);const b=snapshot(g);assert.notDeepEqual(a,b);sampleGenerator(g,p,24,24);a.forEach((v,i)=>near(v,snapshot(g)[i]));const frozen={...p,animated:false,frozenPhase:.5};sampleGenerator(g,frozen,3,24);const c=snapshot(g);sampleGenerator(g,frozen,19,24);c.forEach((v,i)=>near(v,snapshot(g)[i]));disposeModel(g);}
});
test('water exports four actual glTF shape targets, not only preview state',async()=>{
 const {GLTFExporter}=await import('three/addons/exporters/GLTFExporter.js');const prior=globalThis.FileReader;
 class Reader {result:ArrayBuffer|string|null=null;onloadend:((e:unknown)=>void)|null=null;readAsArrayBuffer(blob:Blob){void blob.arrayBuffer().then(bytes=>{this.result=bytes;this.onloadend?.({target:this});});}readAsDataURL(blob:Blob){void blob.arrayBuffer().then(bytes=>{this.result='data:application/octet-stream;base64,'+Buffer.from(bytes).toString('base64');this.onloadend?.({target:this});});}}
 globalThis.FileReader=Reader as unknown as typeof FileReader;const world=new T.Group();world.add(buildGenerator(generatorPreset('water')));const transfer=buildBlenderTransfer(world);
 try{const bytes=await new GLTFExporter().parseAsync(transfer.group,{binary:true,onlyVisible:false}) as ArrayBuffer,v=new DataView(bytes),json=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,20,v.getUint32(12,true))));assert.equal(json.meshes[0].primitives[0].targets.length,4);assert.ok(json.meshes[0].primitives[0].targets.every((t:any)=>t.POSITION!==undefined&&t.NORMAL!==undefined));assert.deepEqual(json.meshes[0].weights,[0,0,0,0]);}finally{globalThis.FileReader=prior;transfer.dispose();disposeModel(world);}
});
test('procedural library and inspectors expose the promised controls without WebGL',()=>{
 const scene=proceduralShowcaseScene(),o=scene.objects.find(o=>o.generator.kind==='crystals'&&o.prop==='procedural')!,noop=()=>{};o.placement.enabled=true;o.proceduralMaterial=proceduralMaterialPresets[0].settings;
 const html=renderToStaticMarkup(createElement('div',null,createElement(ProceduralLibrary,{scene,object:o,change:noop,select:noop,time:0,toast:noop,showEffects:noop,showcase:noop}),createElement(GeneratorPanel,{object:o,change:noop,time:0,duration:24,frame:noop}),createElement(ProceduralMaterialPanel,{object:o,change:noop,scene}),createElement(PlacementPanel,{scene,object:o,change:noop,replace:noop,toast:noop})));
 for(const text of ['Procedural Studio','Alpine terrain','Neon district','Ocean &amp; ripples','Aurora curtains','Seed','Growth &amp; assembly','Frame generator','Pattern / preset','Freeze as editable layers'])assert.ok(html.includes(text),text);
});
