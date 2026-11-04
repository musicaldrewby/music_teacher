import * as THREE from './vendor/three.module.min.js';
import {SceneryMesh} from './scenery-mesh.js';
import {railEnds,railPoint} from './railway.js';
import {caveMaterial} from './cave-material.js';
function offset(p,side,up=0){return {x:p.x+p.dz*side,y:p.y+up,z:p.z-p.dx*side};}
function roadbed(b,t,active,extra=false){
 const from=railEnds(t)[0],steps=railEnds(t)[1]===(from+2)%4?1:5;
 for(let i=0;i<3;i++){
  const p=railPoint(t,from,(i+.5)/3);
  if(!extra)b.bar(offset(p,-.43,-.075),offset(p,.43,-.075),.13,.078,'#986a4a');
 }
 for(const side of [-.265,.265])for(let i=0;i<steps;i++){
  const a=railPoint(t,from,i/steps),c=railPoint(t,from,(i+1)/steps);
  b.bar(offset(a,side),offset(c,side),.062,.055,active?'#bfcddb':'#67758a');
 }
}
export function makeTrackMesh(world,tracks){
 const batch=new SceneryMesh(),lights=[],ends=[],tiles=[],pickBed=[];
 for(const tile of tracks){
  // The whole rail bed is targetable, including the empty space between its two narrow rails.
  for(const [u,v] of [[.025,.025],[.025,.975],[.975,.025],[.975,.025],[.025,.975],[.975,.975]]){
   const rise=tile.type==='railGrade'?[1-v,u,v,1-u][tile.r]:0;
   pickBed.push(tile.x+u,tile.y+.08+rise,tile.z+v);
  }
  roadbed(batch,tile,true);
  if(tile.type==='railSwitch'){
   roadbed(batch,{...tile,switched:!tile.switched},false,true);
   const p=railPoint(tile,railEnds(tile)[0],.47),lever=offset(p,.39);
   batch.box(lever.x,lever.y+.03,lever.z,.18,.12,.18,'#514249');
   batch.box(lever.x,lever.y+.15,lever.z,.09,.21,.09,tile.switched?'#58bfaa':'#efb056');
  }
  if(tile.type==='railGrade'){
   const high=railPoint(tile,railEnds(tile)[0],.83);
   for(const side of [-.27,.27]){const a=offset(high,side);batch.box(a.x,tile.y+.42,a.z,.11,.84,.11,'#795846');}
  }
  const pair=world.lightAt(tile.x+.5,tile.y+.4,tile.z+.5),vertices=batch.vertices.length/3;
  for(let i=lights.length/2;i<vertices;i++)lights.push(...pair);
  tiles.push(tile);ends.push(vertices/3);
 }
 const g=batch.geometry();g.setAttribute('blockLight',new THREE.Float32BufferAttribute(lights,2));const mat=new THREE.MeshLambertMaterial({vertexColors:true});caveMaterial(mat,{attributes:true});
 const m=new THREE.Mesh(g,mat);m.castShadow=false;m.receiveShadow=true;
 const bed=new THREE.BufferGeometry();bed.setAttribute('position',new THREE.Float32BufferAttribute(pickBed,3));bed.computeBoundingSphere();
 const pick=new THREE.Mesh(bed,mat);pick.visible=false;pick.userData.railAtFace=face=>tiles[Math.floor(face/2)];m.add(pick);
 m.userData.railAtFace=face=>{let lo=0,hi=ends.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(face<ends[mid])hi=mid;else lo=mid+1;}return tiles[lo];};return m;
}
