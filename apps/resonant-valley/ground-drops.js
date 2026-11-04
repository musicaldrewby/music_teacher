import {BLOCKS,FURNITURE} from './data.js';
import {MIN_Y,MAX_Y,WORLD_LIMIT,solid} from './terrain.js';
import {isTrack} from './railway.js';
import {signData} from './cabin-parts.js';
import {cratePack} from './record-sleeve.js';
import {DropArt} from './drop-art.js';

export const DROP_LIMIT=1024;
const RADIUS=.17, GRACE=.65, REACH=1.45;
const horizontal=[['x','vx'],['z','vz']];
const validItem=id=>(typeof id==='number'||typeof id==='string')&&((Object.hasOwn(BLOCKS,id)&&Number(id)!==29)||Object.hasOwn(FURNITURE,id)||isTrack(id));
function packing(item,extra){
 if(!extra||typeof extra.id!=='string'||!extra.id||extra.id.length>80)return null;
 if(item==='crate')return cratePack(extra);
 if(item==='sign')return {id:extra.id,...signData(extra)};
 return null;
}
function unobstructed(world,d,x,y,z){
 const steps=Math.ceil(Math.hypot(x-d.x,y-d.y,z-d.z)/.15);
 for(let i=1;i<=steps;i++){
  const f=i/steps;
  if(solid(world.get(d.x+(x-d.x)*f,d.y+(y-d.y)*f,d.z+(z-d.z)*f)))return false;
 }
 return true;
}
export class GroundDrops{
 constructor(world,art=new DropArt(world)){
  this.world=world;this.art=art;this.entries=new Map();this.nextId=1;this.clock=0;this.nextLight=0;
 }
 get full(){return this.entries.size>=DROP_LIMIT;}
 has(id){return this.entries.has(id);}
 remove(id){
  const drop=this.entries.get(id);if(!drop)return false;
  if(drop.mesh)this.world.scene.remove(drop.mesh);
  this.entries.delete(id);return true;
 }
 add(id,item,x,y,z,extra,pop){
  const angle=id*2.39996;
  this.entries.set(id,{id,item:Object.hasOwn(BLOCKS,item)?Number(item):item,x,y,z,pack:packing(item,extra),
   vx:pop?Math.cos(angle)*.65:0,vy:pop?2.4:0,vz:pop?Math.sin(angle)*.65:0,age:0,phase:angle,mesh:null});
 }
 spawn(item,cell,extra){
  if(this.full||!validItem(item))return null;
  const id=this.nextId++;this.add(id,item,cell.x+.5,cell.y+.46,cell.z+.5,extra,true);return id;
 }
 serialize(){return Array.from(this.entries.values(),({id,item,x,y,z,pack})=>({id,item,x,y,z,...(pack?{pack}:{})}));}
 restore(raw){
  for(const id of this.entries.keys())this.remove(id);
  this.nextId=1;this.nextLight=0;
  if(!Array.isArray(raw))return;
  for(const d of raw.slice(0,DROP_LIMIT)){
   if(!d||!Number.isInteger(d.id)||d.id<1||d.id>2**48||this.has(d.id)||!validItem(d.item))continue;
   if(![d.x,d.y,d.z].every(Number.isFinite)||Math.abs(d.x)>WORLD_LIMIT+1||Math.abs(d.z)>WORLD_LIMIT+1||d.y<MIN_Y||d.y>MAX_Y+2)continue;
   this.add(d.id,d.item,d.x,d.y,d.z,d.pack,false);this.nextId=Math.max(this.nextId,d.id+1);
  }
 }
 settle(d,dt){
  const w=this.world;
  if(d.vx===0&&d.vy===0&&d.vz===0&&solid(w.get(d.x,d.y-RADIUS-.02,d.z))&&!solid(w.get(d.x,d.y,d.z)))return;
  // A newly placed block can cover a waiting pickup. Lift it back to open air.
  while(d.y<MAX_Y+1&&solid(w.get(d.x,d.y,d.z))){d.y=Math.floor(d.y)+1.19;d.vy=0;}
  const wet=w.isWater(d.x,d.y-.12,d.z);
  d.vy=wet?Math.min(1.4,d.vy+7*dt):Math.max(-9,d.vy-11*dt);
  for(const [axis,speed] of horizontal){
   if(!d[speed])continue;
   const next=d[axis]+d[speed]*dt,edge=next+Math.sign(d[speed])*RADIUS;
   const x=axis==='x'?edge:d.x,z=axis==='z'?edge:d.z;
   if(Math.abs(edge)>WORLD_LIMIT+.95||!w.isReady(x,z)||solid(w.get(x,d.y,z)))d[speed]=0;else d[axis]=next;
  }
  const next=d.y+d.vy*dt,edge=next+(d.vy>0?RADIUS:-RADIUS);
  if(solid(w.get(d.x,edge,d.z))){
   if(d.vy<0){d.y=Math.floor(edge)+1+RADIUS+.014;d.vx=d.vz=0;}else d.y=Math.floor(edge)-RADIUS-.005;
   d.vy=0;
  }else d.y=Math.max(MIN_Y+.2,next);
 }
 step(dt,eye,eyeHeight,collect){
  if(!this.entries.size||dt<=0)return;
  dt=Math.min(dt,.05);this.clock+=dt;
  const lightDue=this.clock>=this.nextLight;if(lightDue)this.nextLight=this.clock+.2;
  for(const d of this.entries.values()){
   const near=Math.abs(d.x-eye.x)<=32&&Math.abs(d.z-eye.z)<=32&&Math.abs(d.y-eye.y)<=32&&this.world.isReady(d.x,d.z);
   if(!near){if(d.mesh){this.world.scene.remove(d.mesh);d.mesh=null;}continue;}
   d.age+=dt;
   const feet=eye.y-eyeHeight,bodyY=Math.max(feet+.22,Math.min(eye.y-.1,d.y));
   const distance=Math.hypot(eye.x-d.x,bodyY-d.y,eye.z-d.z);
   const pull=collect&&d.age>=GRACE&&distance<REACH&&unobstructed(this.world,d,eye.x,bodyY,eye.z);
   if(pull){
    if(distance<.32){this.remove(d.id);collect(d);continue;}
    const f=Math.min(1,dt*8);d.x+=(eye.x-d.x)*f;d.y+=(bodyY-d.y)*f;d.z+=(eye.z-d.z)*f;d.vx=d.vy=d.vz=0;
   }else this.settle(d,dt);
   const first=!d.mesh;
   if(first){d.mesh=this.art.create(d.item);this.world.scene.add(d.mesh);}
   d.mesh.position.set(d.x,d.y+.065+Math.sin(this.clock*2.7+d.phase)*.05,d.z);
   d.mesh.rotation.y=d.phase+this.clock*1.7;
   if(first||lightDue)this.art.setLight(d.mesh,...this.world.lightAt(d.x,d.y,d.z));
  }
 }
}
