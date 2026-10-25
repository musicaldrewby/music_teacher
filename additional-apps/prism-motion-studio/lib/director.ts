import * as T from 'three';
import type {Scene,Obj,Vec,CameraPose} from './scene';
import {animateGroup} from './motion';
import {sampleRoute} from './routes';
import {bodyPose,samplePhysics} from './physics-playground';
import {sampleInteractions} from './interactions';
import {makeShot} from './sequence';
export function subjectMatrix(s:Scene,o:Obj,t:number,depth=0):T.Matrix4{
 const g=new T.Group();animateGroup(g,o,t,s.duration);const parent=s.objects.find(p=>p.id===o.parentId),parentMatrix=parent&&depth<12?subjectMatrix(s,parent,t,depth+1):undefined,route=sampleRoute(s,o.follow,t);
 if(route){if(o.follow.orient){g.position.applyQuaternion(route.rotation);g.quaternion.premultiply(route.rotation);}g.position.add(route.position);if(parentMatrix){g.position.applyMatrix4(parentMatrix.clone().invert());if(o.follow.orient)g.quaternion.premultiply(new T.Quaternion().setFromRotationMatrix(new T.Matrix4().extractRotation(parentMatrix)).invert());}}
 sampleInteractions(g,o,s,t);const physics=samplePhysics(s,o.id,t);if(physics){g.position.copy(physics.position);g.quaternion.copy(physics.quaternion);}g.updateMatrix();return parentMatrix?g.matrix.premultiply(parentMatrix):g.matrix;
}
export function avoidColliders(s:Scene,p:CameraPose,t:number,subjectId=''):CameraPose{
 const eye=new T.Vector3(...p.position),target=new T.Vector3(...p.target),delta=eye.clone().sub(target),distance=delta.length();if(distance<.001)return p;const ray=new T.Ray(target,delta.normalize());let nearest=distance;
 for(const o of s.objects){if(o.id===subjectId||o.body.mode==='off')continue;const pose=samplePhysics(s,o.id,t)||bodyPose(s,o,t),matrix=new T.Matrix4().compose(pose.position,pose.quaternion,new T.Vector3(...o.scale)),local=ray.clone().applyMatrix4(matrix.clone().invert()),hit=new T.Vector3();let result:T.Vector3|null;
 if(o.body.shape==='sphere')result=local.intersectSphere(new T.Sphere(new T.Vector3(),o.body.radius+.2/Math.min(...o.scale)),hit);else{const half=new T.Vector3(...o.body.size).multiplyScalar(.5).addScalar(.2/Math.min(...o.scale));result=local.intersectBox(new T.Box3(half.clone().negate(),half),hit);}
 if(result){hit.applyMatrix4(matrix);nearest=Math.min(nearest,Math.max(.25,target.distanceTo(hit)-.2));}}
 eye.copy(target).addScaledVector(delta,nearest);if(s.floor)eye.y=Math.max(s.ground.height+.25,eye.y);return {...p,position:eye.toArray() as Vec};
}
export function directorCamera(s:Scene,t:number):CameraPose|null{
 const d=s.camera.director,o=s.objects.find(o=>o.id===d.targetId);if(!d.enabled||t<d.start||!o)return null;
 const center=new T.Vector3(),forward=new T.Vector3();let weight=0;
 for(let i=0;i<5;i++){const sample=Math.max(0,t-d.smoothing*i/4),matrix=subjectMatrix(s,o,sample),w=5-i;center.addScaledVector(new T.Vector3().setFromMatrixPosition(matrix),w);const at=sampleRoute(s,o.follow,sample),velocity=samplePhysics(s,o.id,Math.min(s.duration,sample+.04)),before=samplePhysics(s,o.id,Math.max(0,sample-.04));const direction=at?.tangent.clone()||(velocity&&before?velocity.position.sub(before.position):new T.Vector3(0,0,1).transformDirection(matrix));direction.y=0;if(direction.lengthSq()<.0001)direction.set(0,0,1);forward.addScaledVector(direction.normalize(),w);weight+=w;}
 center.divideScalar(weight);forward.normalize();let eye:T.Vector3,target=center.clone().add(new T.Vector3(0,.5,0));
 if(d.mode==='orbit'){const angle=t/s.duration*Math.PI*2*d.orbitTurns;eye=center.clone().add(new T.Vector3(Math.sin(angle)*d.distance,d.height,Math.cos(angle)*d.distance));}
 else if(d.mode==='ride'){eye=center.clone().add(new T.Vector3(0,d.height,0));target=eye.clone().addScaledVector(forward,d.lookAhead);}
 else eye=center.clone().addScaledVector(forward,-d.distance).add(new T.Vector3(0,d.height,0));
 const pose={position:eye.toArray() as Vec,target:target.toArray() as Vec,fov:s.camera.fov};return d.collisions?avoidColliders(s,pose,t,o.id):pose;
}
export function smoothWalk(s:Scene,seconds=.3){const input=s.camera.walk.samples;return input.map((p,i)=>{if(i===0||i===input.length-1)return structuredClone(p);const window=input.filter(x=>Math.abs(x.time-p.time)<=seconds),mean=(key:'position'|'target')=>p[key].map((_,axis)=>window.reduce((n,x)=>n+x[key][axis],0)/window.length) as Vec;return {...p,position:mean('position'),target:mean('target')};});}
export function subjectShots(s:Scene,id:string,time:number){const o=s.objects.find(o=>o.id===id);if(!o)return [];const c=new T.Vector3().setFromMatrixPosition(subjectMatrix(s,o,time)),size=Math.max(...o.scale)*3,span=Math.max(4,size),duration=s.duration/3;return [[1,.65,1.5],[-.7,.3,.8],[0,1.4,1.1]].map((v,i)=>{const p={position:c.clone().add(new T.Vector3(...v).multiplyScalar(span)).toArray() as Vec,target:c.toArray() as Vec,fov:45};const shot=makeShot(p,duration,['Establishing glide','Subject detail','High reveal'][i]);shot.move=true;shot.end={...p,position:c.clone().add(new T.Vector3(v[0]+.25,v[1],v[2]-.12).multiplyScalar(span)).toArray() as Vec};shot.transition=i?'dissolve':'cut';return shot;});}
