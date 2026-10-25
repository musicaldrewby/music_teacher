import {samplePhysics} from './physics-playground';
import * as T from 'three';
import type {Scene,Obj} from './scene';
import type {Effect} from './directing';
import {animateGroup} from './motion';
import {sampleRoute} from './routes';
import {sampleInteractions} from './interactions';
/** Transform-only sampling leaves the visible scene untouched, including when seeking backward. */
export function createEmitterSampler(scene:Scene){
 const objects=new Map(scene.objects.map(o=>[o.id,o])),scratch=new Map<string,T.Group>(),cache=new Map<string,T.Matrix4>();
 const sampleObject=(o:Obj,time:number,depth=0):T.Matrix4=>{
  if(depth>12)return new T.Matrix4();const key=o.id+'|'+time;const known=cache.get(key);if(known)return known;
  let g=scratch.get(o.id);if(!g){g=new T.Group();if(o.prop==='door'||o.prop==='chest'){const hinge=new T.Group();hinge.userData.interactivePart='hinge';g.add(hinge);}scratch.set(o.id,g);}
  animateGroup(g,o,time,scene.duration);const parent=objects.get(o.parentId),parentMatrix=parent?sampleObject(parent,time,depth+1):undefined,route=sampleRoute(scene,o.follow,time);
  if(route){const offset=g.position.clone(),q=g.quaternion.clone();if(o.follow.orient){offset.applyQuaternion(route.rotation);g.quaternion.copy(route.rotation).multiply(q);}g.position.copy(route.position).add(offset);if(parentMatrix){g.position.applyMatrix4(parentMatrix.clone().invert());if(o.follow.orient)g.quaternion.premultiply(new T.Quaternion().setFromRotationMatrix(new T.Matrix4().extractRotation(parentMatrix)).invert());}}
  sampleInteractions(g,o,scene,time);const physical=samplePhysics(scene,o.id,time);if(physical){g.position.copy(physical.position);g.quaternion.copy(physical.quaternion);}g.updateMatrix();const matrix=g.matrix.clone();if(parentMatrix)matrix.premultiply(parentMatrix);if(cache.size>8192)cache.clear();cache.set(key,matrix);return matrix;
 };
 return (effect:Effect,time:number)=>{const object=objects.get(effect.attachmentId);if(object)return sampleObject(object,time);const route=sampleRoute(scene,effect.follow,time);return route?new T.Matrix4().compose(route.position,effect.follow.orient?route.rotation:new T.Quaternion(),new T.Vector3(1,1,1)):new T.Matrix4();};
}
