import * as T from 'three';
import type {Scene,CameraPose} from './scene';
import type {Route,Follow} from './directing';
const curves=new WeakMap<Route,T.CatmullRomCurve3>();
export function routeCurve(route:Route){let curve=curves.get(route);if(!curve){curve=new T.CatmullRomCurve3(route.points.map(p=>new T.Vector3(...p)),route.closed,'centripetal');curve.arcLengthDivisions=2400;curves.set(route,curve);}return curve;}
export function pathProgress(follow:Follow,time:number){const raw=(Math.max(time,follow.start)-follow.start)/follow.duration+follow.offset;return follow.loop?((raw%1)+1)%1:Math.min(1,Math.max(0,raw));}
export function sampleRoute(scene:Scene,follow:Follow,time:number){
 const route=scene.paths.find(p=>p.id===follow.pathId);if(!route||!follow.enabled)return null;const curve=routeCurve(route),u=pathProgress(follow,time),position=curve.getPointAt(u),tangent=curve.getTangentAt(u).normalize();
 if(tangent.lengthSq()<.01)tangent.set(0,0,1);let distance=u*curve.getLength();
 if(route.space==='set'){const yaw=T.MathUtils.degToRad(scene.set.rotation),rotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),yaw);position.multiplyScalar(scene.set.scale).applyQuaternion(rotation).add(new T.Vector3(0,scene.ground.height,scene.set.offsetZ));tangent.applyQuaternion(rotation);distance*=scene.set.scale;}
 const rotation=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().lookAt(new T.Vector3(),tangent,new T.Vector3(0,1,0))).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI));
 return {position,tangent,rotation,distance};
}
export function rideCamera(scene:Scene,time:number):CameraPose|null{
 const ride=scene.camera.ride,at=sampleRoute(scene,ride,time);if(!at)return null;
 if(ride.mode==='overview'){const route=scene.paths.find(p=>p.id===ride.pathId)!,box=new T.Box3().setFromPoints(route.points.map(p=>new T.Vector3(...p))),center=box.getCenter(new T.Vector3()),span=Math.max(box.getSize(new T.Vector3()).length(),8),position=center.clone().add(new T.Vector3(.7,.8,.9).multiplyScalar(span));if(route.space==='set'){const q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),T.MathUtils.degToRad(scene.set.rotation)),offset=new T.Vector3(0,scene.ground.height,scene.set.offsetZ);center.multiplyScalar(scene.set.scale).applyQuaternion(q).add(offset);position.multiplyScalar(scene.set.scale).applyQuaternion(q).add(offset);}return {position:position.toArray() as [number,number,number],target:center.toArray() as [number,number,number],fov:48};}
 const eye=ride.mode==='chase'?new T.Vector3(0,5,-9):new T.Vector3(...ride.eye);const position=eye.applyQuaternion(at.rotation).add(at.position);
 const target=at.position.clone().addScaledVector(at.tangent,ride.mode==='chase'?3:ride.lookAhead);target.y+=ride.mode==='chase'?1.3:ride.eye[1]-.12;if(ride.levelHorizon)target.y=position.y;
 return {position:position.toArray() as [number,number,number],target:target.toArray() as [number,number,number],fov:ride.mode==='chase'?52:ride.fov};
}
export function buildRouteGuides(scene:Scene){const group=new T.Group();group.userData.editorHelper=true;group.name='Motion path guides';for(const path of scene.paths.filter(p=>p.show)){
 const curve=routeCurve(path),line=new T.Line(new T.BufferGeometry().setFromPoints(curve.getPoints(200)),new T.LineBasicMaterial({color:'#29f5d1',depthTest:false,transparent:true,opacity:.8}));line.renderOrder=20;
 if(path.space==='set'){line.scale.setScalar(scene.set.scale);line.rotation.y=T.MathUtils.degToRad(scene.set.rotation);line.position.set(0,scene.ground.height,scene.set.offsetZ);}group.add(line);
 }return group;}
