import * as T from 'three';
import {ease} from './scene';
import type {Lens} from './cinematic';

export function sampleFocusDistance(lens:Lens,time:number){
 const keys=[...lens.keys].sort((a,b)=>a.time-b.time);if(!keys.length)return lens.distance;
 const a=[...keys].reverse().find(k=>k.time<=time)||keys[0],b=keys.find(k=>k.time>time)||a;
 const f=a===b?0:ease(Math.max(0,Math.min(1,(time-a.time)/(b.time-a.time))),b.easing);return a.distance+(b.distance-a.distance)*f;
}
// Both renderers focus on a plane perpendicular to the camera, not a sphere.
export function resolveFocus(lens:Lens,time:number,camera:T.PerspectiveCamera,target?:T.Object3D){
 let distance=sampleFocusDistance(lens,time);
 if(lens.mode==='target'&&target){camera.updateMatrixWorld(true);target.updateWorldMatrix(true,true);const box=new T.Box3().setFromObject(target),center=box.isEmpty()?target.getWorldPosition(new T.Vector3()):box.getCenter(new T.Vector3());distance=-center.applyMatrix4(camera.matrixWorldInverse).z;}
 return Math.max(camera.near*2,Math.min(500,Number.isFinite(distance)?distance:lens.distance));
}
export function previewAperture(camera:T.PerspectiveCamera,distance:number,aperture:number){
 // Match a thin-lens aperture in scene units. BokehShader's outer ring has radius .4.
 const tangent=Math.tan(T.MathUtils.degToRad(camera.getEffectiveFOV()/2));
 return aperture/(1.6*tangent*camera.aspect*Math.max(.1,distance));
}
export type PhysicalLensCamera=T.PerspectiveCamera & {fStop:number;focusDistance:number;apertureBlades:number;apertureRotation:number;anamorphicRatio:number};
export function configurePhysicalFocus(target:PhysicalLensCamera,source:T.PerspectiveCamera,lens:Lens,distance:number){
 // PhysicalCamera.copy expects physical fields; assign all of them after copying.
 target.copy(source);target.fStop=lens.enabled?target.getFocalLength()/(lens.aperture*1000):Infinity;target.focusDistance=distance;target.apertureBlades=0;target.apertureRotation=0;target.anamorphicRatio=1;target.updateProjectionMatrix();target.updateMatrixWorld(true);return target;
}
