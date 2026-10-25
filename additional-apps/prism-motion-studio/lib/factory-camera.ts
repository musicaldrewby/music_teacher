import * as T from 'three';
import type {Scene,CameraPose,Vec} from './scene';
import {samplePose} from './scene';
export function factoryCamera(scene:Scene,time:number):CameraPose|null{
 if(scene.set.id!=='toy-factory'||scene.camera.factoryView==='cinematic')return null;
 if(scene.camera.factoryView==='overview'){
  const q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),scene.set.rotation*Math.PI/180),offset=new T.Vector3(0,scene.ground.height,scene.set.offsetZ),convert=(p:Vec)=>new T.Vector3(...p).multiplyScalar(scene.set.scale).applyQuaternion(q).add(offset).toArray() as Vec;
  return {position:convert([5,21,37]),target:convert([1,2,-.5]),fov:53};
 }
 const parcel=scene.objects.find(o=>o.prop==='factory-parcel'&&o.type==='prop');if(!parcel)return null;
 const p=new T.Vector3(...samplePose(parcel,time).position),target=p.clone().add(new T.Vector3(0,.85,0));
 return {position:p.clone().add(new T.Vector3(-3.8,1,1.15)).toArray() as Vec,target:target.toArray() as Vec,fov:48};
}
