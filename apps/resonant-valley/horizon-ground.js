import * as THREE from './vendor/three.module.min.js';
import {BLOCKS} from './data.js';
import {SEA_LEVEL} from './terrain.js';
import {hash3} from './noise.js';
import {blendSlot} from './terrain-blend.js';
import {TILE,CELL,PAD,WIDTH,HEIGHT} from './atlas-layout.js';

const STEP=2, N=16/STEP, STRIDE=N+2, WATER_STYLE=128;
const WATER_TOP=SEA_LEVEL+.62;
const perTile=N*N+2*N*(N-1)+4*N; // tops, internal interfaces, perimeter
export const groundTileVertices=perTile*4;
const white=new THREE.Color(0xffffff),deep=new THREE.Color('#397ca6'),shoal=new THREE.Color('#489baf');
const inks=Object.fromEntries(Object.entries(BLOCKS).map(([id,b])=>[id,new THREE.Color(b.color)]));

// Repeat the actual face art once per world block, even on a tall cliff or a
// large distant tree. Unwrapped derivatives keep mip choice stable at repeats.
export function horizonMaterial(atlas,{woods=false,backing=false}={}){
 const mat=new THREE.MeshLambertMaterial({map:atlas??null,vertexColors:!woods,depthWrite:!backing,side:THREE.FrontSide,alphaTest:woods ? .4 : 0});
 if(!atlas)return mat;
 mat.onBeforeCompile=shader=>{
  const vary='varying vec2 vHorizonPlane;\nvarying vec2 vHorizonStyle;\n';
  shader.vertexShader=(woods?'attribute float horizonStyle;\n':'')+vary+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    vec3 hp=position;
    #ifdef USE_INSTANCING
     hp=(instanceMatrix*vec4(hp,1.)).xyz;
    #endif
    vHorizonPlane=abs(normal.y)>.5?vec2(hp.x,-hp.z):(abs(normal.x)>.5?vec2(-normal.x*hp.z,hp.y):vec2(normal.z*hp.x,hp.y));
    vHorizonStyle=${woods?'vec2(horizonStyle,0.)':'uv'};`);
  shader.fragmentShader=vary+shader.fragmentShader.replace('#include <map_fragment>',`
   #ifdef USE_MAP
   vec2 span=vec2(${TILE/WIDTH},${TILE/HEIGHT});
   vec2 gx=dFdx(vHorizonPlane)*span,gy=dFdy(vHorizonPlane)*span;
   if(vHorizonStyle.x<127.5){
    float code=floor(vHorizonStyle.x+.5),tile=mod(code,32.),variant=floor(code/32.);
    if(tile==30. && vHorizonStyle.y>=1.)tile=vHorizonStyle.y<4.?1.:2.;
    if(tile==20. && vHorizonStyle.y>=1.)tile=vHorizonStyle.y<2.?1.:2.;
    vec2 slot=vec2(mod(tile,8.)+8.*mod(variant,2.),floor(tile/8.)+4.*floor(variant/2.));
    vec2 start=(slot*${CELL}.+${PAD}.)/vec2(${WIDTH}.,${HEIGHT}.);
    vec2 origin=vec2(start.x,1.-start.y-span.y);
    diffuseColor*=textureGrad(map,origin+fract(vHorizonPlane)*span,gx,gy);
   }
   #endif`);
 };
 mat.customProgramCacheKey=()=>woods?'valley-distant-tree-art-v1':'valley-distant-block-art-v1';
 return mat;
}

// Slots stay fixed as the window moves. Only the used vertices of a new tile
// are uploaded. Precomputed quad indices are copied in bulk when coverage changes.
export class HorizonGround{
 constructor(tileCount){
  const g=this.geometry=new THREE.BufferGeometry(),count=groundTileVertices*tileCount;
  for(const [name,array,size,normalized] of [
   ['position',new Float32Array(count*3),3,false],['normal',new Int8Array(count*3),3,true],
   ['color',new Uint8Array(count*3),3,true],['uv',new Float32Array(count*2),2,false],
   ['valleyTile',new Uint16Array(count),1,false]]){
   g.setAttribute(name,new THREE.BufferAttribute(array,size,normalized).setUsage(THREE.DynamicDrawUsage));
  }
  this.pattern=new Uint32Array(tileCount*perTile*6);
  for(let p=0,i=0;p<count;p+=4){this.pattern.set([p,p+1,p+2,p,p+2,p+3],i);i+=6;}
  g.setIndex(new THREE.BufferAttribute(new Uint32Array(this.pattern.length),1).setUsage(THREE.DynamicDrawUsage));g.setDrawRange(0,0);
  this.heights=new Float32Array(STRIDE*STRIDE);this.tops=new Uint8Array(STRIDE*STRIDE);this.beds=new Int16Array(STRIDE*STRIDE);
 }
 fill(tile,terrain,textured,samples=null){
  const {heights,tops,beds}=this,g=this.geometry,a=g.attributes,left=tile.x*16,back=tile.z*16;
  const slot=blendSlot(tile.x,tile.z),first=tile.slot*groundTileVertices;let vertex=first;
  for(let z=-1;z<=N;z++)for(let x=-1;x<=N;x++){
   const wx=left+x*STEP+1,wz=back+z*STEP+1,i=(z+1)*STRIDE+x+1,c=samples?.[i]||terrain.column(wx,wz);
   heights[i]=Math.max(WATER_TOP,c.h+1);beds[i]=c.h;
   tops[i]=c.h<SEA_LEVEL?0:(c.id??terrain.material(c,0,wx,wz));
  }
  const face=(x,y,z,ux,uy,uz,vx,vy,vz,nx,ny,nz,style,ink,shade)=>{
   for(let k=0;k<4;k++){
    const u=k===1||k===2?1:0,v=k>=2?1:0,at=vertex++;
    a.position.setXYZ(at,x+u*ux+v*vx,y+u*uy+v*vy,z+u*uz+v*vz);
    a.normal.setXYZ(at,nx,ny,nz);a.color.setXYZ(at,ink.r*shade,ink.g*shade,ink.b*shade);
    a.uv.setXY(at,style,vy*(1-v));a.valleyTile.setX(at,slot);
   }
  };
  for(let z=0;z<N;z++)for(let x=0;x<N;x++){
   const i=(z+1)*STRIDE+x+1,wx=left+x*STEP,wz=back+z*STEP,h=heights[i],id=tops[i];
   const grain=hash3(6789,wx,beds[i],wz),variant=Math.floor(grain*4)*32;
   const topStyle=id?variant+id-1:WATER_STYLE,sideStyle=id===1?variant+30:topStyle;
   const ink=id?(textured?white:inks[id]):(beds[i]>=0?shoal:deep),shade=.95+.04*grain;
   face(wx,h,wz+STEP, STEP,0,0, 0,0,-STEP, 0,1,0, topStyle,ink,shade);
   const east=heights[i+1],west=heights[i-1],south=heights[i+STRIDE],north=heights[i-STRIDE];
   if(h>east)face(wx+STEP,east,wz+STEP,0,0,-STEP,0,h-east,0,1,0,0,sideStyle,ink,shade*.86);
   if(h>west)face(wx,west,wz,0,0,STEP,0,h-west,0,-1,0,0,sideStyle,ink,shade*.72);
   if(h>south)face(wx,south,wz+STEP,STEP,0,0,0,h-south,0,0,0,1,sideStyle,ink,shade*.9);
   if(h>north)face(wx+STEP,north,wz,-STEP,0,0,0,h-north,0,0,0,-1,sideStyle,ink,shade*.78);
  }
  tile.faceCount=(vertex-first)/4;
  for(const attr of Object.values(a)){attr.addUpdateRange(first*attr.itemSize,(vertex-first)*attr.itemSize);attr.needsUpdate=true;}
 }
 show(tiles,needsBacking){
  const g=this.geometry,index=g.index;let count=0;
  for(const t of tiles)if(t.ready&&needsBacking(t)){
   const first=t.slot*perTile*6,length=t.faceCount*6;
   index.array.set(this.pattern.subarray(first,first+length),count);count+=length;
  }
  if(count)index.addUpdateRange(0,count);index.needsUpdate=true;g.setDrawRange(0,count);
 }
}
