import * as THREE from './vendor/three.module.min.js';

// 32 exceeds the diameter of the entire visible horizon. Each resident chunk
// owns one byte, shared by its detailed meshes and its distant representation.
const SIDE=32;
export const blendSlot=(cx,cz)=>(cx&31)+SIDE*(cz&31);
export function markChunk(geometry,cx,cz){
 const ids=new Uint16Array(geometry.getAttribute('position').count).fill(blendSlot(cx,cz));
 geometry.setAttribute('valleyTile',new THREE.BufferAttribute(ids,1));
}
export class TerrainBlend{
 constructor(){
  this.cells=new Map();this.bytes=new Uint8Array(SIDE*SIDE);this.dirty=false;
  this.texture=new THREE.DataTexture(this.bytes,SIDE,SIDE,THREE.RedFormat);
  this.texture.magFilter=this.texture.minFilter=THREE.NearestFilter;this.texture.needsUpdate=true;
 }
 add(key,cx,cz){if(!this.cells.has(key))this.cells.set(key,{cx,cz,slot:blendSlot(cx,cz),weight:0,detailed:false});}
 remove(key){
  const tile=this.cells.get(key);if(!tile)return;
  this.bytes[tile.slot]=0;this.cells.delete(key);this.dirty=true;
 }
 level(key){const c=this.cells.get(key);return c?this.bytes[c.slot]:0;}
 step(position,radius,dt,proxies){
  const outer=(radius+.5)*16,step=Math.min(.1,Math.max(0,dt))/.44;let membership=false;
  for(const [key,c] of this.cells){
   const d=Math.max(Math.abs(c.cx*16+8-position.x),Math.abs(c.cz*16+8-position.z));
   const ready=proxies?.get(key)?.ready;
   // A short time-based handoff settles even when the player stops on the
   // boundary. Separate entry/exit thresholds keep small reversals stable.
   if(!ready)c.detailed=d<outer;
   else if(d<=outer-5)c.detailed=true;
   else if(d>=outer+1)c.detailed=false;
   const goal=Number(c.detailed);
   if(!ready||d<=21)c.weight=goal;
   else c.weight+=Math.max(-step,Math.min(step,goal-c.weight));
   const level=Math.round(c.weight*255),old=this.bytes[c.slot];
   if(old===level)continue;
   this.bytes[c.slot]=level;this.dirty=true;
   if(old===255||level===255)membership=true;
  }
  if(this.dirty){this.texture.needsUpdate=true;this.dirty=false;}
  return membership;
 }
}
// Both representations hand over the same solid two-block world columns.
// The pattern is anchored to the terrain, including in shadows and water.
export function blendMaterial(material,field,coarse=false){
 const before=material.onBeforeCompile,key=material.customProgramCacheKey(),main=/void\s+main\s*\(\s*\)\s*\{/;
 material.onBeforeCompile=function(shader,renderer){
  before.call(this,shader,renderer);
  shader.uniforms.valleyCoverage={value:field.texture};
  const vary='varying float vDetailMix;\nvarying vec2 vHandoffXZ;\n';
  shader.vertexShader='attribute float valleyTile;\nuniform sampler2D valleyCoverage;\n'+vary+shader.vertexShader.replace(main,`$&
   vDetailMix=texture2D(valleyCoverage,(vec2(mod(valleyTile,32.),floor(valleyTile/32.))+.5)/32.).r;
   if(${coarse?'vDetailMix>=1.':'vDetailMix<=0.'}){gl_Position=vec4(2.,2.,2.,1.);return;}
   vec4 handoffPoint=vec4(position,1.);vec3 handoffNormal=normal;
   #ifdef USE_INSTANCING
    handoffPoint=instanceMatrix*handoffPoint;handoffNormal=mat3(instanceMatrix)*handoffNormal;
   #endif
   vHandoffXZ=(modelMatrix*handoffPoint).xz-sign((mat3(modelMatrix)*handoffNormal).xz)*.001;
  `);
  shader.fragmentShader=vary+`float valleyColumnThreshold(){
   vec2 column=mod(floor(vHandoffXZ*.5),8.);
   return (column.x*2.+column.y+1.)/23.;
  }\n`+shader.fragmentShader.replace(main,'$&\n'+(coarse?'if(vDetailMix>0. && vDetailMix>=valleyColumnThreshold())discard;':'if(vDetailMix<1. && vDetailMix<valleyColumnThreshold())discard;'));
 };
 material.customProgramCacheKey=()=>key+(coarse?'-valley-far-columns-v2':'-valley-near-columns-v2');
 return material;
}
