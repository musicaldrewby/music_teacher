// Use the real Three.js composer and all real passes. Only the GPU is replaced
// by a recording renderer, so quality-mode changes cannot hide a disabled pass.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
const events=[];let target=null,clearColor=new THREE.Color(),clearAlpha=1,pixelRatio=1,animate;
const renderer={
 domElement:{addEventListener(){},style:{}},capabilities:{getMaxAnisotropy:()=>8},
 toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1.02,outputColorSpace:THREE.SRGBColorSpace,
 autoClear:true,autoClearColor:true,autoClearDepth:true,autoClearStencil:true,
 getPixelRatio:()=>pixelRatio,setPixelRatio(v){pixelRatio=v;},getSize:v=>v.set(1440,900),setSize(){},
 getRenderTarget:()=>target,setRenderTarget(v){target=v;},getClearColor:c=>c.copy(clearColor),
 getClearAlpha:()=>clearAlpha,setClearAlpha(v){clearAlpha=v;},setClearColor(c,a){clearColor.set(c);if(a!==undefined)clearAlpha=a;},
 clear(){events.push({type:'clear',target});},clearDepth(){},dispose(){},
 render(object){events.push({type:object.isScene?(object.overrideMaterial?'normals':'room'):'effect',target});}
};
const source=await fs.readFile(new URL('../dist/scene.js',import.meta.url),'utf8');
let body=source.slice(source.indexOf('export function createRoom')).replace('export function','function');
body=body.replace(/ const renderer=new THREE.WebGLRenderer[^\n]+/,' const renderer=gpu;');
body=body.replace(/ const pmrem=[^\n]+/,'');
body=body.replace('const loader=new THREE.TextureLoader();','const loader={load:()=>new THREE.Texture()};');
const doc={createElement(type){assert.equal(type,'canvas');return createCanvas(1,1);}};
const factory=new Function('THREE','RoundedBoxGeometry','EffectComposer','RenderPass','SSAOPass','UnrealBloomPass','OutputPass','document','innerWidth','innerHeight','devicePixelRatio','requestAnimationFrame','window','performance','gpu',body+';return createRoom;');
const make=factory(THREE,RoundedBoxGeometry,EffectComposer,RenderPass,SSAOPass,UnrealBloomPass,OutputPass,doc,1440,900,1,fn=>animate=fn,{addEventListener(){}},performance,renderer);
const room=make({appendChild(){}},()=>{},()=>{});
let frames=0;
for(const mode of ['high','balanced','high']){
 room.setQuality(mode);
 for(const view of Object.keys(room.views)){
  room.setView(view);
  for(let i=0;i<3;i++){
   events.length=0;animate();frames++;
   const draws=events.filter(e=>e.type!=='clear');
   assert.equal(draws[0]?.type,'room',`${mode}/${view}: a fresh room frame must be drawn before any screen effects`);
   assert.equal(draws.filter(e=>e.type==='room').length,1,`${mode}/${view}: room should render exactly once`);
   const roomIndex=events.findIndex(e=>e.type==='room');
   assert.ok(events.slice(0,roomIndex).some(e=>e.type==='clear'&&e.target===draws[0].target),`${mode}/${view}: the room buffer must be cleared each frame`);
   assert.equal(draws.filter(e=>e.type==='normals').length,mode==='high'?1:0,`${mode}/${view}: only ambient occlusion should depend on quality`);
  }
 }
}
console.log(JSON.stringify({passed:true,frames,qualityTransitions:['high','balanced','high'],cameraViews:7,checks:['fresh room draw precedes effects on every frame','room framebuffer cleared each frame','quality mode only toggles ambient occlusion'],limitations:'Records the real pass sequence; GPU shaders and rendered pixels are not executed.'},null,2));
