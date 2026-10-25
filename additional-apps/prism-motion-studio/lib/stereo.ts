import {z} from 'zod';
import * as T from 'three';
import type {CameraPose,Scene,Vec} from './scene';

export const stereoSchema=z.object({mode:z.enum(['mono','cinema','vr180','vr360']).default('mono'),eyeSeparation:z.number().min(0).max(1).default(.065),convergence:z.number().min(.1).max(500).default(10),quality:z.enum(['preview','balanced','high']).default('balanced')});
export type Stereo=z.infer<typeof stereoSchema>;
export type StereoEye='left'|'right';
export type RenderPose=CameraPose&{filmOffset?:number};

/** Parallel eye axes with an asymmetric frustum: no toe-in or vertical disparity. */
export function stereoEyePose(pose:CameraPose,stereo:Stereo,eye:StereoEye):RenderPose{
 const position=new T.Vector3(...pose.position),target=new T.Vector3(...pose.target),forward=target.clone().sub(position).normalize();
 const right=new T.Vector3().crossVectors(forward,new T.Vector3(0,1,0));if(right.lengthSq()<1e-10)right.set(1,0,0);right.normalize();
 const offset=(eye==='left'?-.5:.5)*stereo.eyeSeparation;position.addScaledVector(right,offset);target.addScaledVector(right,offset);
 // Three's film width is35mm for landscape perspective cameras.
 return {position:position.toArray() as Vec,target:target.toArray() as Vec,fov:pose.fov,filmOffset:(-offset/stereo.convergence*35)||0};
}
export function configureRenderCamera(camera:T.PerspectiveCamera,pose:RenderPose){camera.position.set(...pose.position);camera.fov=pose.fov;camera.filmOffset=pose.filmOffset||0;camera.up.set(0,1,0);camera.lookAt(...pose.target);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);}
export function stereoDimensions(mode:Stereo['mode'],quality:Stereo['quality'],height=1080){
 if(mode==='mono'||mode==='cinema'){const eyeWidth=Math.round(height*16/9);return {eyeWidth,eyeHeight:height,width:eyeWidth*(mode==='cinema'?2:1),height,layout:mode==='cinema'?'SBS':'MONO'} as const;}
 if(mode==='vr180'){const side={preview:1920,balanced:2880,high:3840}[quality];return {eyeWidth:side,eyeHeight:side,width:side*2,height:side,layout:'SBS'} as const;}
 const width={preview:2048,balanced:4096,high:5760}[quality];return {eyeWidth:width,eyeHeight:width/2,width,height:width,layout:'TB'} as const;
}
export function exportRange(scene:Scene,time:number,test=false){const start=test?Math.max(0,Math.min(scene.duration-1/scene.fps,Math.round(time*scene.fps)/scene.fps)):0;const frames=Math.max(1,Math.round(Math.min(test?10:scene.duration,scene.duration-start)*scene.fps));return {start,duration:frames/scene.fps,frames};}
export const stereoSuffix=(mode:Stereo['mode'])=>({mono:'',cinema:'_LR_Full_SBS',vr180:'_LR_180',vr360:'_TB_360'}[mode]);
export function stereoPlayback(mode:Stereo['mode']){return {mono:'Regular 2D video',cinema:'Player: 3D side-by-side, full width, flat cinema screen.',vr180:'Player: 180° equirectangular, 3D side-by-side, left eye first.',vr360:'Player: 360° equirectangular, 3D top-bottom, left eye on top.'}[mode];}
