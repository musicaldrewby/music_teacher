import * as THREE from './vendor/three.module.min.js';
import {BLOCKS} from './data.js';
import {skylineSites} from './skyline.js';
import {horizonMaterial} from './horizon-ground.js';
import {blendMaterial,blendSlot} from './terrain-blend.js';

const matrix=new THREE.Matrix4(),neutral=new THREE.Color(.92,.92,.92);
const inks=new Map([4,5,12,15,22,28].map(id=>[id,new THREE.Color(BLOCKS[id].color).multiplyScalar(.78)]));
function changedTree(stream,f){
 if(!stream.edits.size)return false;
 const radius=f.kind==='cactus'?0:f.pine?Math.floor(f.height/2):2;
 for(let x=f.x-radius;x<=f.x+radius;x++)for(let z=f.z-radius;z<=f.z+radius;z++){
  if(!stream.editChunks.has(Math.floor(x/16)+','+Math.floor(z/16)))continue;
  for(let y=f.y;y<=f.y+f.height+1;y++)if(stream.edits.has(x+','+y+','+z))return true;
 }
 return false;
}
// A whole horizon of simple trunk and crown shapes uses one instanced draw.
// Moving one chunk updates only the slots for trees entering or leaving the ring.
export class DistantWoods{
 constructor(world,tileCount){
  this.world=world;this.parts=[];this.first=Infinity;this.last=-1;
  // A 16-block tile can intersect at most 4 x 4 six-block anchor cells.
  const capacity=tileCount*16*4,geo=new THREE.BoxGeometry(),mat=horizonMaterial(world.atlas,{woods:true});
  if(world.detailBlend)blendMaterial(mat,world.detailBlend,true);
  this.cells=new THREE.InstancedBufferAttribute(new Uint16Array(capacity),1).setUsage(THREE.DynamicDrawUsage);
  this.styles=new THREE.InstancedBufferAttribute(new Uint8Array(capacity),1).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('horizonStyle',this.styles);geo.setAttribute('valleyTile',this.cells);this.mesh=new THREE.InstancedMesh(geo,mat,capacity);
  this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.mesh.setColorAt(0,inks.get(5));this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  this.mesh.count=0;this.mesh.frustumCulled=false;
 }
 mark(i){this.first=Math.min(this.first,i);this.last=Math.max(this.last,i);}
 box(tile,x,y,z,w,h,d,id){
  const i=this.parts.length,part={i};tile.woods.push(part);this.parts.push(part);
  matrix.makeScale(w,h,d).setPosition(x,y+h*.5,z);this.mesh.setMatrixAt(i,matrix);this.mesh.setColorAt(i,this.world.atlas?neutral:inks.get(id));this.styles.setX(i,id-1);
  this.cells.setX(i,blendSlot(tile.x,tile.z));this.mark(i);
 }
 remove(tile){
  if(!tile.woods)return;
  while(tile.woods.length){
   const i=tile.woods.pop().i,end=this.parts.length-1,last=this.parts.pop();
   if(i===end)continue;
   this.parts[i]=last;last.i=i;
   for(const a of [this.mesh.instanceMatrix,this.mesh.instanceColor,this.cells,this.styles])a.array.copyWithin(i*a.itemSize,end*a.itemSize,(end+1)*a.itemSize);
   this.mark(i);
  }
  this.mesh.count=this.parts.length;
 }
 fill(tile){
  this.remove(tile);tile.woods=[];
  const g=this.world.generator,left=tile.x*16,top=tile.z*16,towers=skylineSites(g,left+8,top+8,24).filter(s=>s.type==='lookout');
  for(let gx=Math.floor(left/6);gx<=Math.floor((left+15)/6);gx++)for(let gz=Math.floor(top/6);gz<=Math.floor((top+15)/6);gz++){
   const f=g.naturalFeature(gx,gz,towers);
   if(!f||f.kind==='boulder'||f.x<left||f.x>=left+16||f.z<top||f.z>=top+16||changedTree(this.world.stream,f))continue;
   const x=f.x+.5,z=f.z+.5,h=f.height;
   if(f.kind==='cactus'){this.box(tile,x,f.y,z,1,h,1,28);continue;}
   this.box(tile,x,f.y,z,1,h,1,f.trunk);
   if(f.pine){
    const base=2*Math.floor(h/2)+.6;
    this.box(tile,x,f.y+1,z,base,2,base,f.leaf);
    this.box(tile,x,f.y+3,z,Math.max(1.8,base-2),h-3,Math.max(1.8,base-2),f.leaf);
    this.box(tile,x,f.y+h,z,1.3,2,1.3,f.leaf);
   }else{
    this.box(tile,x,f.y+h-3,z,4.6,4,4.6,f.leaf);
    this.box(tile,x,f.y+h+1,z,2.7,1,2.7,f.leaf);
   }
  }
  this.mesh.count=this.parts.length;
 }
 flush(){
  if(this.last<this.first)return;
  for(const a of [this.mesh.instanceMatrix,this.mesh.instanceColor,this.cells,this.styles]){
   a.addUpdateRange(this.first*a.itemSize,(this.last-this.first+1)*a.itemSize);a.needsUpdate=true;
  }
  this.first=Infinity;this.last=-1;
 }
 clear(){this.parts.length=0;this.mesh.count=0;this.first=Infinity;this.last=-1;}
}
