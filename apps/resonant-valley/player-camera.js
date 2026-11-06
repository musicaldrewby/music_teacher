import * as THREE from './vendor/three.module.min.js';
// Slab intersection with a padded box: clearance protects the whole near plane,
// including diagonal corners. A starting overlap retracts all the way to the eye.
export function boxEntry(origin,direction,box,padding=0,limit=Infinity){
 let near=0,far=limit;
 for(const [axis,size] of [['x','w'],['y','h'],['z','d']]){
  const lo=box[axis]-padding,hi=box[axis]+box[size]+padding,v=direction[axis],p=origin[axis];
  if(Math.abs(v)<1e-9){if(p<lo||p>hi)return Infinity;continue;}
  const a=(lo-p)/v,b=(hi-p)/v;near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));
  if(near>far)return Infinity;
 }
 return far<0?Infinity:near;
}
export function cameraClearance(world,origin,direction,length,radius=.21,ignoreEntity=null){
 let nearest=length;
 const end={x:origin.x+direction.x*length,y:origin.y+direction.y*length,z:origin.z+direction.z*length};
 const bounds={};for(const a of ['x','y','z'])bounds[a]=[Math.floor(Math.min(origin[a],end[a])-radius),Math.floor(Math.max(origin[a],end[a])+radius)];
 for(let x=bounds.x[0];x<=bounds.x[1];x++)for(let z=bounds.z[0];z<=bounds.z[1];z++)for(let y=bounds.y[0];y<=bounds.y[1];y++){
  const id=world.get(x,y,z);if((!id||id===255)&&world.isReady(x,z))continue;
  nearest=Math.min(nearest,boxEntry(origin,direction,{x,y,z,w:1,h:1,d:1},radius,nearest));
 }
 const check=e=>{
  if(e.id===ignoreEntity)return;
  const b=['roofSlope','steps'].includes(e.type)?{x:e.x,y:e.y,z:e.z,w:1,h:1,d:1}:world.entityBounds(e);
  if(b)nearest=Math.min(nearest,boxEntry(origin,direction,b,radius,nearest));
 };
 for(const e of world.entities)check(e);for(const e of world.discoveryEntities?.values()||[])check(e);
 return Math.max(0,nearest-.025);
}
export class PlayerCamera{
 constructor(world){this.world=world;this.camera=world.camera.clone();this.camera.rotation.order='YXZ';this.direction=new THREE.Vector3();this.offset=new THREE.Vector3();this.last=new THREE.Vector3(Infinity,Infinity,Infinity);this.distance=null;this.third=false;this.mode='first';}
 reset(){this.distance=null;this.last.set(Infinity,Infinity,Infinity);}
 setMode(mode){const next=mode==='third'?'third':'first';if(next!==this.mode){this.mode=next;this.reset();}}
 update(dt=0){
  const w=this.world,eye=w.camera;
  this.third=false;
  if(this.mode!=='third')return eye;
  eye.updateWorldMatrix(true,false);eye.getWorldDirection(this.direction);
  const yaw=eye.rotation.y;
  this.offset.copy(this.direction).multiplyScalar(-3.8);this.offset.x+=Math.cos(yaw)*.65;this.offset.y+=.18;this.offset.z-=Math.sin(yaw)*.65;
  const length=this.offset.length();this.offset.multiplyScalar(1/length);
  const allowed=cameraClearance(w,eye.position,this.offset,length,.21,w.playerState?.riding?.id);
  if(this.distance===null||eye.position.distanceToSquared(this.last)>16)this.distance=allowed;
  else if(allowed<this.distance)this.distance=allowed;
  else this.distance+=(allowed-this.distance)*(1-Math.exp(-Math.min(.1,dt)*10));
  this.last.copy(eye.position);
  if(this.distance<.8)return eye;
  this.camera.projectionMatrix.copy(eye.projectionMatrix);this.camera.projectionMatrixInverse.copy(eye.projectionMatrixInverse);this.camera.aspect=eye.aspect;this.camera.fov=eye.fov;
  this.camera.position.copy(eye.position).addScaledVector(this.offset,this.distance);this.camera.quaternion.copy(eye.quaternion);this.camera.updateWorldMatrix(true,false);this.third=true;return this.camera;
 }
}
