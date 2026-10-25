import * as THREE from './vendor/three.module.js';

export const MALLET_RADIUS=.019;
export const MALLET_SENSITIVITY={light:{speed:.15,down:.10,ratio:.24},normal:{speed:.24,down:.16,ratio:.34},firm:{speed:.38,down:.27,ratio:.48}};
const cache=new WeakMap();
const sweep=new THREE.Box3(),start=new THREE.Vector3(),end=new THREE.Vector3(),delta=new THREE.Vector3(),point=new THREE.Vector3(),center=new THREE.Vector3();

// Exact sphere-to-box distance avoids the oversized square corners of an
// expanded AABB. Conservative advancement also catches strokes between poses.
function distanceToSurface(bounds,p,shape){
 if(!shape)return bounds.distanceToPoint(p);
 return Math.hypot(Math.max(0,Math.hypot(p.x,p.z)-shape.radius),Math.max(shape.minY-p.y,0,p.y-shape.maxY));
}
function sphereEntry(bounds,from,motion,radius,shape){
  const length=motion.length();let t=0;
  for(let i=0;i<32;i++){
    point.copy(from).addScaledVector(motion,t);
    const gap=distanceToSurface(bounds,point,shape)-radius;
    if(gap<=.000001)return t;
    if(length<.000001)return null;
    t+=gap/length;
    if(t>1)return null;
  }
  return null;
}
export function findMalletStrike(meshes,from,to,previousContacts,now){
  const contacts=new Set();let hit=null,first=Infinity,nearest=Infinity;
  sweep.min.copy(from).min(to).addScalar(-MALLET_RADIUS);
  sweep.max.copy(from).max(to).addScalar(MALLET_RADIUS);
  for(const mesh of meshes){
    const bounds=mesh.geometry.boundingBox;if(!bounds)continue;
    let data=cache.get(mesh);
    if(!data||!data.matrix.equals(mesh.matrixWorld)){
      const scale=new THREE.Vector3().setFromMatrixScale(mesh.matrixWorld);
      data={matrix:mesh.matrixWorld.clone(),inverse:mesh.matrixWorld.clone().invert(),world:bounds.clone().applyMatrix4(mesh.matrixWorld),radius:MALLET_RADIUS/Math.min(scale.x,scale.y,scale.z)};
      cache.set(mesh,data);
    }
    // Most instruments are far from the player's hands. Skip their fine checks.
    if(!sweep.intersectsBox(data.world))continue;
    start.copy(from).applyMatrix4(data.inverse);end.copy(to).applyMatrix4(data.inverse);
    if(distanceToSurface(bounds,end,mesh.userData.hitCylinder)<=data.radius)contacts.add(mesh);
    if(previousContacts.has(mesh)||now-mesh.userData.lastHit<=90)continue;
    delta.subVectors(end,start);const fraction=sphereEntry(bounds,start,delta,data.radius,mesh.userData.hitCylinder);
    if(fraction===null)continue;
    const proximity=end.distanceToSquared(bounds.getCenter(center));
    if(fraction<first-.000001||(Math.abs(fraction-first)<.000001&&proximity<nearest)){first=fraction;nearest=proximity;hit=mesh;}
  }
  return {hit,contacts};
}

// Horizontal bars and steelpan notes should sound from an intentional
// downward stroke. Wall instruments keep their natural forward interaction.
export function deliberateMalletStrike(type,from,to,dt,sensitivity='normal'){
  if(!['xylophone','metallophone','glockenspiel','steelpan'].includes(type))return true;
  const profile=MALLET_SENSITIVITY[sensitivity]||MALLET_SENSITIVITY.normal;
  const seconds=Math.max(.001,dt),distance=from.distanceTo(to),speed=distance/seconds,down=(from.y-to.y)/seconds;
  return speed>=profile.speed&&down>=profile.down&&down/Math.max(speed,.001)>=profile.ratio;
}

// A 4 mm release margin absorbs tracking jitter without enlarging note entry.
export function malletStillTouches(mesh,tip,margin=.004){
  const bounds=mesh.geometry.boundingBox;if(!bounds)return false;
  const data=cache.get(mesh);
  if(!data||!data.matrix.equals(mesh.matrixWorld))return false;
  point.copy(tip).applyMatrix4(data.inverse);
  return bounds.distanceToPoint(point)<=data.radius+margin;
}

// Dynamics are independent of the accidental-hit threshold. A comfortable
// 3 m/s stroke reaches full strength; gentle taps keep an audible soft floor.
export function malletVelocity(speed){
 if(!Number.isFinite(speed)||speed<=0)return .12;
 return .12+.88*(1-Math.exp(-Math.min(3,speed)/1.5))/(1-Math.exp(-2));
}
export function malletImpactVelocity(type,from,to,dt){
 const seconds=Math.max(.001,dt);
 const speed=['xylophone','metallophone','glockenspiel','steelpan'].includes(type)
  ?Math.max(0,from.y-to.y)/seconds:from.distanceTo(to)/seconds;
 return malletVelocity(speed);
}
export function malletFeedback(controller,velocity){
 const actuator=controller.userData.source?.gamepad?.hapticActuators?.[0];
 // Haptics are optional: an unavailable actuator must never interrupt playing.
 try{actuator?.pulse(.06+.40*velocity,12+Math.round(18*velocity))?.catch?.(()=>{});}catch{}
}
