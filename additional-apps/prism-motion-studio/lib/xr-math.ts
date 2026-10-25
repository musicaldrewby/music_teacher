import * as T from 'three';
import {sceneSchema, type Scene, type Obj, type Vec, type CameraPose} from './scene';
import {makeShot} from './sequence';

export type XRScaleMode = 'miniature' | 'full';
export type Transform = {position:Vec;rotation:Vec;scale:Vec};
const degrees=180/Math.PI;
export function readTransform(node:T.Object3D):Transform {
 return {position:node.position.toArray(),rotation:[node.rotation.x*degrees,node.rotation.y*degrees,node.rotation.z*degrees],scale:node.scale.toArray()};
}
export function manipulationReason(o:Obj,scene:Scene):string {
 let current:Obj|undefined=o;
 while(current){
  if(current.follow.enabled)return 'Path-driven layers: edit their path in the desktop studio.';
  if(current.body.mode!=='off')return 'Physics layers: change their starting pose in the desktop studio, then rebake.';
  if(current.pivot.some(v=>v!==0))return 'Layers with custom pivots are arranged in the desktop studio.';
  if(current.layout.behindText)return 'This layer uses automatic placement behind text. Turn that off in the regular studio before grabbing it.';
  if(current.fracture.enabled||current.interaction.enabled)return 'Mechanism and fractured layers are arranged in the desktop studio.';
  if(scene.objects.some(n=>n.interaction.enabled&&n.interaction.targetId===current!.id))return 'This layer is driven by an interactive mechanism.';
  current=scene.objects.find(n=>n.id===current!.parentId);
 }
 return '';
}
/** Apply a local-space edit to the underlying animation, retaining unwrapped rotation keys. */
export function offsetObject(o:Obj,before:Transform,after:Transform):Obj {
 const dp=after.position.map((v,i)=>v-before.position[i]);
 const dr=after.rotation.map((v,i)=>T.MathUtils.euclideanModulo(v-before.rotation[i]+180,360)-180);
 const ratio=after.scale.map((v,i)=>v/before.scale[i]);
 if([...dp,...dr,...ratio].some(v=>!Number.isFinite(v))||before.scale.some(v=>Math.abs(v)<.001))throw Error('This object is too small at this frame. Move the playhead to its full-size pose.');
 const apply=(p:Transform):Transform=>({position:p.position.map((v,i)=>v+dp[i]) as Vec,rotation:p.rotation.map((v,i)=>v+dr[i]) as Vec,scale:p.scale.map((v,i)=>v*ratio[i]) as Vec});
 return {...o,...apply(o),keys:o.keys.map(k=>({...k,...apply(k)})),layout:{...o.layout,behindText:false}};
}
export function stagePlacement(mode:XRScaleMode,bounds:T.Box3,head:T.Vector3,forward:T.Vector3,spawn:CameraPose) {
 const facing=forward.clone().setY(0).normalize();if(facing.lengthSq()<.1)facing.set(0,0,-1);
 const size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
 const scale=mode==='miniature'?Math.max(.0001,Math.min(.35,1.65/Math.max(1,size.x,size.y,size.z))):1;
 const yaw=Math.atan2(-facing.x,-facing.z);
 const sourceDir=new T.Vector3(...spawn.target).sub(new T.Vector3(...spawn.position)).setY(0).normalize();
 const sourceYaw=Math.atan2(-sourceDir.x,-sourceDir.z);
 const rotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),mode==='miniature'?yaw:yaw-sourceYaw);
 const origin=mode==='miniature'?center:new T.Vector3(...spawn.position);
 // Align the scene's authored eye height to the actual seated or standing headset height.
 if(mode==='full')origin.y=spawn.position[1];
 const destination=mode==='miniature'?head.clone().addScaledVector(facing,1.8).add(new T.Vector3(0,-.48,0)):head.clone();
 const position=destination.sub(origin.multiplyScalar(scale).applyQuaternion(rotation));
 return {position,rotation,scale};
}
export function cameraFromHead(headMatrix:T.Matrix4,stageMatrix:T.Matrix4,fov=50):CameraPose {
 const inverse=stageMatrix.clone().invert();
 const position=new T.Vector3().setFromMatrixPosition(headMatrix).applyMatrix4(inverse);
 const target=new T.Vector3(0,0,-3).applyMatrix4(headMatrix).applyMatrix4(inverse);
 return {position:position.toArray(),target:target.toArray(),fov:Math.max(15,Math.min(90,fov))};
}
export function addXRView(scene:Scene,pose:CameraPose):Scene {
 if(scene.xrViews.length>=24)throw Error('24 views saved. Remove a view in the VR panel before capturing more.');
 return sceneSchema.parse({...scene,xrViews:[...scene.xrViews,{id:crypto.randomUUID(),name:`VR view ${String(scene.xrViews.length+1).padStart(2,'0')}`,...pose}]});
}
export function useXRView(scene:Scene,pose:CameraPose):Scene {
 return {...scene,camera:{...scene.camera,...pose,keys:[],motion:'still',shotsEnabled:false,factoryView:'cinematic',director:{...scene.camera.director,enabled:false},walk:{...scene.camera.walk,enabled:false},ride:{...scene.camera.ride,enabled:false},proceduralMotion:{...scene.camera.proceduralMotion,enabled:false}}};
}
export function viewToStoryboard(scene:Scene,view:Scene['xrViews'][number]):Scene {
 if(scene.camera.shots.length>=24)throw Error('The storyboard already has 24 shots.');
 const shots=structuredClone(scene.camera.shots),total=shots.reduce((sum,s)=>sum+s.duration,0);
 let duration=Math.min(3,scene.duration-total);
 if(duration<.25){
  const longest=shots.reduce((best,s,i)=>s.duration>(shots[best]?.duration||0)?i:best,0);
  if(!shots[longest]||shots[longest].duration<.5)throw Error('Make space in the storyboard for another shot.');
  duration=shots[longest].duration/2;shots[longest].duration=duration;shots[longest].transitionDuration=Math.min(duration,shots[longest].transitionDuration);
 }
 shots.push(makeShot(view,duration,view.name));
 const next=useXRView(scene,view);return sceneSchema.parse({...next,camera:{...next.camera,shots,shotsEnabled:true}});
}
