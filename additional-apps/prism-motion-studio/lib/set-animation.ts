import * as T from 'three';
import {animateAquarium} from './aquarium-set';
import {animateFactorySet} from './factory-animation';
import {SNOW_GLOBE} from './snow-globe';

const fract=(v:number)=>v-Math.floor(v);
const seed=(index:number,salt:number)=>fract(Math.sin((index+1)*127.1+salt*311.7)*43758.5453);

/** Sample absolute time so scrubbing, two-camera dissolves and frame exports agree. */
export function snowflakePose(index:number,time:number,target=new T.Vector3()){
 const {center,radius,snowY}=SNOW_GLOBE,ceiling=center[1]+radius-.22;
 const phase=fract(seed(index,1)-time*(.033+seed(index,2)*.022));
 const y=snowY+.14+phase*(ceiling-snowY-.14);
 const limit=Math.sqrt(Math.max(0,(radius-.22)**2-(y-center[1])**2));
 const r=limit*Math.sqrt(seed(index,3))*.94,angle=seed(index,4)*Math.PI*2+time*(.09+seed(index,5)*.14)+Math.sin(time*.35+index)*.1;
 return target.set(center[0]+Math.cos(angle)*r,y,center[2]+Math.sin(angle)*r);
}

/** Real meshes work in both the fast renderer and the physical export. */
export function buildGlobeSnow(amount:number){
 const group=new T.Group();group.name='Snow inside the globe';group.userData.globeSnow=true;
 const count=Math.round(Math.max(0,Math.min(1,amount))*360);if(!count)return group;
 const geometry=new T.SphereGeometry(1,6,4),material=new T.MeshStandardMaterial({color:'#f0f6ff',roughness:.86,emissive:'#c3ddff',emissiveIntensity:.16});
 for(let i=0;i<count;i++){
  const flake=new T.Mesh(geometry,material);flake.name='Snowflake';flake.userData.snowIndex=i;flake.userData.prismSet=true;
  flake.scale.setScalar(.022+seed(i,6)*.027);snowflakePose(i,0,flake.position);flake.castShadow=false;flake.receiveShadow=false;group.add(flake);
 }
 return group;
}

export function updateSetAnimation(group:T.Group,time:number,energy=0){
 if(group.userData.setId==='aquarium'){animateAquarium(group,time,energy);return;}
 if(group.userData.setId==='toy-factory'){animateFactorySet(group,time);return;}
 if(group.userData.setId!=='snow-globe')return;
 group.traverse(child=>{if(typeof child.userData.snowIndex==='number')snowflakePose(child.userData.snowIndex,time,child.position);});
}

/** Keep a near-clipped glass wall out of an interior camera move. */
export function updateSetView(group:T.Group,camera:T.Camera,showGlass:boolean){
 if(group.userData.setId!=='snow-globe')return;
 group.updateWorldMatrix(true,false);camera.updateWorldMatrix(true,false);
 const eye=group.worldToLocal(camera.getWorldPosition(new T.Vector3()));
 const outside=eye.distanceTo(new T.Vector3(...SNOW_GLOBE.center))>SNOW_GLOBE.radius+.1;
 group.traverse(child=>{if(child.userData.globeGlass)child.visible=showGlass&&outside;});
}
