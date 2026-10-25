import * as T from 'three';
import type {Obj,Scene,Vec} from './scene';
import {samplePose} from './scene';

export function boxCorners(box:T.Box3){return [0,1,2,3,4,5,6,7].map(i=>new T.Vector3(i&1?box.max.x:box.min.x,i&2?box.max.y:box.min.y,i&4?box.max.z:box.min.z));}
export function restWorldBox(object:Obj,local:T.Box3,time:number){const p=samplePose(object,time),matrix=new T.Matrix4().compose(new T.Vector3(...p.position),new T.Quaternion().setFromEuler(new T.Euler(...p.rotation.map(v=>v*Math.PI/180) as Vec)),new T.Vector3(...p.scale));return local.clone().applyMatrix4(matrix);}
// Conservative bounds keep an animated prop completely behind every visible title.
export function keepPropsBehindText(scene:Scene,groups:Map<string,T.Group>,skip?:T.Object3D){
 const boxes=scene.objects.filter(o=>o.type==='text'&&groups.get(o.id)?.visible).map(o=>new T.Box3().setFromObject(groups.get(o.id)!)).filter(b=>!b.isEmpty());if(!boxes.length)return;
 const back=Math.min(...boxes.map(b=>b.min.z));
 for(const o of scene.objects){const g=groups.get(o.id);if(o.type!=='prop'||!o.layout.behindText||!g?.visible||g===skip)continue;const box=new T.Box3().setFromObject(g);if(!box.isEmpty()){const shift=Math.max(0,box.max.z+o.layout.clearance-back),world=g.getWorldPosition(new T.Vector3());world.z-=shift;g.position.copy(g.parent?g.parent.worldToLocal(world):world);}g.updateMatrixWorld(true);}
}
export function fitObjectToCamera(object:Obj,local:T.Box3,time:number,camera:T.PerspectiveCamera,axis:'fit'|'horizontal'|'vertical'='fit',margin=.08):{position:Vec;scale:Vec}{
 if(local.isEmpty())throw Error('This layer has no geometry to frame.');camera.updateMatrixWorld(true);
 const pose=samplePose(object,time),box=restWorldBox(object,local,time),center=box.getCenter(new T.Vector3()),viewCenter=center.clone().applyMatrix4(camera.matrixWorldInverse);
 if(viewCenter.z>=-camera.near*2)throw Error('Move this layer in front of the camera before fitting it.');
 const destination=viewCenter.clone();if(axis!=='vertical')destination.x=0;if(axis!=='horizontal')destination.y=0;destination.applyMatrix4(camera.matrixWorld);
 let ratio=1;
 if(axis==='fit'){
  const ty=Math.tan(T.MathUtils.degToRad(camera.fov/2))*(1-2*margin),tx=ty*camera.aspect,depth=-viewCenter.z;
  ratio=100;
  for(const corner of boxCorners(box)){const v=corner.applyMatrix4(camera.matrixWorldInverse).sub(viewCenter);for(const [coordinate,tangent] of [[v.x,tx],[v.y,ty]]){const denominator=Math.abs(coordinate)+tangent*v.z;if(denominator>0)ratio=Math.min(ratio,tangent*depth/denominator);}if(v.z>0)ratio=Math.min(ratio,(depth-camera.near*2)/v.z);}
  if(!Number.isFinite(ratio)||ratio<=0)throw Error('Could not fit this layer to the camera.');
  // Respect the existing transform range while retaining proportions.
  for(const scale of pose.scale)if(scale!==0)ratio=Math.min(ratio,10000/Math.abs(scale));
 }
 const origin=new T.Vector3(...pose.position);return {position:destination.add(origin.sub(center).multiplyScalar(ratio)).toArray() as Vec,scale:pose.scale.map(v=>v*ratio) as Vec};
}
