import * as T from 'three';
import {type Scene,type Obj,type Vec,makeObject} from './scene';
import {routeCurve} from './routes';
import {type Placement,type ProceduralMotion} from './procedural-schema';
import {random,tau} from './procedural-math';

export type InstancePose={position:Vec;rotation:Vec;scale:Vec};
export function placementPoses(p:Placement,scene:Pick<Scene,'paths'|'set'|'ground'>):InstancePose[]{
 const rng=random(p.seed),poses:InstancePose[]=[],route=scene.paths.find(r=>r.id===p.pathId),curve=route?routeCurve(route):null;
 for(let i=0;i<p.count;i++){
  let x=0,y=0,z=0,angle=0;const f=i/Math.max(1,p.count-1);
  if(p.mode==='grid'){const rows=Math.ceil(p.count/p.columns);x=(i%p.columns-(p.columns-1)/2)*p.spacing;z=(Math.floor(i/p.columns)-(rows-1)/2)*p.spacing;}
  if(p.mode==='ring'||p.mode==='spiral'){const a=(p.mode==='ring'?i/p.count:f*p.turns)*tau,r=p.mode==='ring'?p.radius:p.radius*(.15+.85*f);x=Math.cos(a)*r;z=Math.sin(a)*r;y=f*p.height;angle=-a;}
  if(p.mode==='scatter'){
   let valid=false;for(let tries=0;tries<200;tries++){x=(rng()-.5)*p.radius*2;z=(rng()-.5)*p.radius*2;y=rng()*p.height;if(poses.every(o=>Math.hypot(x-o.position[0],z-o.position[2])>=p.minimumDistance)){valid=true;break;}}
   if(!valid)break;angle=rng()*tau;
  }else if(p.mode==='path'){
   if(!curve||!route)break;const u=route.closed?i/p.count:f,point=curve.getPointAt(u),direction=curve.getTangentAt(u);if(route.space==='set'){point.multiplyScalar(scene.set.scale).applyAxisAngle(new T.Vector3(0,1,0),scene.set.rotation*Math.PI/180).add(new T.Vector3(0,scene.ground.height,scene.set.offsetZ));direction.applyAxisAngle(new T.Vector3(0,1,0),scene.set.rotation*Math.PI/180);}x=point.x;y=point.y;z=point.z;angle=Math.atan2(direction.x,direction.z);
  }
  if(p.mode!=='scatter'){x+=(rng()-.5)*p.jitter*p.spacing;z+=(rng()-.5)*p.jitter*p.spacing;}
  const s=1+(rng()-.5)*2*p.sizeVariation;poses.push({position:[x,y,z],rotation:[0,p.rotate?angle:0,0],scale:[s,s,s]});
 }return poses;
}
export function applyPlacement(source:T.Group,o:Obj,scene:Scene){
 const p=o.placement;if(!p.enabled)return source;const poses=placementPoses(p,scene);let vertices=0,meshes=0;source.traverse(n=>{if(n instanceof T.Mesh){vertices+=n.geometry.getAttribute('position')?.count||0;meshes++;}});
 if(poses.length*vertices>1_500_000||poses.length*meshes>1600)throw Error('This array is too detailed. Reduce its copy count or simplify the source object.');
 const root=new T.Group();root.userData={...source.userData,placementCount:poses.length};for(let i=0;i<poses.length;i++){const pivot=new T.Group(),copy=i===0?source:source.clone(true),pose=poses[i];pivot.position.fromArray(pose.position);pivot.rotation.set(...pose.rotation);pivot.scale.fromArray(pose.scale);pivot.add(copy);root.add(pivot);}return root;
}
export function proceduralOffset(p:ProceduralMotion,t:number,duration:number){const a=t/duration*tau*p.cycles+p.phase*Math.PI/180,r=p.amplitude,position:Vec=[0,0,0],rotation:Vec=[0,0,0];
 if(p.enabled){switch(p.kind){case 'float':position[1]=Math.sin(a)*r;break;case 'orbit':position[0]=(Math.cos(a)-1)*r;position[2]=Math.sin(a)*r;break;case 'figure-eight':position[0]=Math.sin(a)*r;position[2]=Math.sin(a*2)*r*.5;break;case 'helix':position[0]=(Math.cos(a)-1)*r;position[1]=Math.sin(a*2)*r*.4;position[2]=Math.sin(a)*r;break;case 'spring':position[1]=(Math.sin(a)+Math.sin(a*3)*.25)*r;break;case 'wave':position[1]=Math.sin(a)*r;rotation[2]=Math.sin(a)*.15*r;break;case 'spin':rotation[{x:0,y:1,z:2}[p.axis]]=a;break;}if(p.axis==='x'&&['float','spring','wave'].includes(p.kind)){position[0]=position[1];position[1]=0;}if(p.axis==='z'&&['float','spring','wave'].includes(p.kind)){position[2]=position[1];position[1]=0;}}
 return {position,rotation};
}
/** Freeze placement as ordinary child layers; the original layer remains the group transform. */
export function expandPlacement(scene:Scene,o:Obj):Scene{
 const poses=placementPoses(o.placement,scene);if(scene.objects.length+poses.length>40)throw Error('Editable copies must fit the 40-layer scene limit. Use fewer copies before freezing.');if(o.type==='group')throw Error('Freeze placement on a text, prop or imported model layer.');
 const group={...makeObject('group'),id:o.id,name:o.name+' · editable copies',position:o.position,rotation:o.rotation,scale:o.scale,parentId:o.parentId,pivot:o.pivot,keys:o.keys,motion:o.motion,amount:o.amount,speed:o.speed,sequence:{...o.sequence,unit:'object' as const},proceduralMotion:o.proceduralMotion,follow:o.follow,opacity:o.opacity,visible:o.visible};
 const children=poses.map((p,i)=>({...structuredClone(o),id:crypto.randomUUID(),name:o.name+' '+(i+1),parentId:group.id,position:p.position,rotation:p.rotation.map(n=>n*180/Math.PI) as Vec,scale:p.scale,pivot:[0,0,0] as Vec,keys:[],motion:'still' as const,placement:{...o.placement,enabled:false},follow:{...o.follow,enabled:false},sequence:{...o.sequence,enabled:false},proceduralMotion:{...o.proceduralMotion,enabled:false},opacity:1,interaction:{...o.interaction,enabled:false},reactions:[]}));return {...scene,objects:[...scene.objects.map(n=>n.id===o.id?group:n),...children]};
}
