import {directorCamera} from './director';
import {proceduralOffset} from './procedural-placement';
import {sampleWalk} from './walk';
import {factoryCamera} from './factory-camera';
import {rideCamera} from './routes';
import {samplePerformance,entranceEffects,exitEffects} from './performance';
import {ease,type Scene,type Obj,type Vec,type Shot,type CameraPose} from './scene';

const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const blendVec=(a:Vec,b:Vec,f:number)=>a.map((v,i)=>v+(b[i]-v)*f) as Vec;
export function blendCamera(a:CameraPose,b:CameraPose,f:number):CameraPose{return {position:blendVec(a.position,b.position,f),target:blendVec(a.target,b.target,f),fov:a.fov+(b.fov-a.fov)*f};}
export function shotRanges(shots:Shot[]){let start=0;return shots.map(shot=>{const range={shot,start,end:start+shot.duration};start=range.end;return range;});}
export function shotPose(shot:Shot,local:number){return shot.move?blendCamera(shot.start,shot.end,ease(clamp(local/shot.duration),shot.easing)):shot.start;}
export function sampleCamera(scene:Scene,time:number):{current:CameraPose;previous?:CameraPose;mix:number;shotId?:string}{
 const directed=directorCamera(scene,time);if(directed)return {current:directed,mix:1};
 const walk=sampleWalk(scene.camera.walk,time);if(walk)return {current:walk,mix:1};
 const factory=factoryCamera(scene,time);if(factory)return {current:factory,mix:1};
 const ride=rideCamera(scene,time);if(ride)return {current:ride,mix:1};
 const c=scene.camera;
 if(c.shotsEnabled&&c.shots.length){const ranges=shotRanges(c.shots);const i=Math.max(0,ranges.findIndex(r=>time<r.end));const active=time>=ranges.at(-1)!.end?ranges.length-1:i;const r=ranges[active],local=Math.max(0,time-r.start);const current=shotPose(r.shot,local);
  if(active>0&&r.shot.transition==='dissolve'&&r.shot.transitionDuration>0&&local<r.shot.transitionDuration)return {current,previous:shotPose(ranges[active-1].shot,ranges[active-1].shot.duration),mix:clamp(local/r.shot.transitionDuration),shotId:r.shot.id};
  return {current,mix:1,shotId:r.shot.id};
 }
 let current:CameraPose={position:[...c.position],target:[...c.target],fov:c.fov};const keys=[...c.keys].sort((a,b)=>a.time-b.time);
 if(keys.length){const a=[...keys].reverse().find(k=>k.time<=time)||keys[0],b=keys.find(k=>k.time>time)||a;current=blendCamera(a,b,a===b?0:ease(clamp((time-a.time)/(b.time-a.time)),'smooth'));}
 const phase=time/scene.duration*Math.PI*2,position=[...current.position] as Vec,target=current.target;
 if(c.motion==='orbit'){const x=position[0]-target[0],z=position[2]-target[2],ang=Math.sin(phase)*c.amount*.25;position[0]=target[0]+x*Math.cos(ang)+z*Math.sin(ang);position[2]=target[2]+z*Math.cos(ang)-x*Math.sin(ang);}
 if(c.motion==='dolly')position[2]+=Math.sin(phase)*c.amount;if(c.motion==='crane')position[1]+=Math.sin(phase)*c.amount;
 const procedural=proceduralOffset(c.proceduralMotion,time,scene.duration);for(let i=0;i<3;i++)position[i]+=procedural.position[i];
 return {current:{...current,position},mix:1};
}
export function makeShot(pose:CameraPose,duration:number,name='Camera shot'):Shot{return {id:crypto.randomUUID(),name,duration,start:structuredClone(pose),end:structuredClone(pose),move:false,easing:'smooth',transition:'cut',transitionDuration:Math.min(.6,duration)};}
export function fitSequence(sequence:Obj['sequence'],duration:number):Obj['sequence']{
 const start=Math.min(sequence.start,Math.max(0,duration-.05)),available=duration-start,total=sequence.enter+sequence.hold+sequence.leave;
 if(total<=0)return {...sequence,start,hold:available};
 const ratio=Math.min(1,available/total);return {...sequence,start,enter:sequence.enter*ratio,hold:sequence.hold*ratio,leave:sequence.leave*ratio};
}
export type StagePose={position:Vec;rotation:Vec;scale:number;stretch?:Vec;blur?:number;curtain?:number;echo?:number;pull?:number;opacity:number;visible:boolean};
export function sampleStage(q:Obj['sequence'],time:number,index=0,count=1):StagePose{
 const local=time-q.start,total=q.enter+q.hold+q.leave;
 const result:StagePose={position:[0,0,0],rotation:[0,0,0],scale:1,opacity:1,visible:local>=0&&local<total};
 if(!q.enabled)return {...result,visible:true};
 if(!result.visible)return {...result,opacity:0};
 const progress=(t:number,duration:number)=>{if(duration===0)return 1;const delay=Math.min(q.stagger,count>1?duration*.7/(count-1):0);return ease(clamp((t-(q.reverse?count-1-index:index)*delay)/Math.max(.00001,duration-(count-1)*delay)),q.easing);};
 const entering=local<q.enter,exiting=local>=q.enter+q.hold;
 if(!entering&&!exiting)return result;
 const f=entering?1-progress(local,q.enter):progress(local-q.enter-q.hold,q.leave),kind=entering?q.entrance:q.exit,a=q.amount;
 if(([...entranceEffects,...exitEffects] as readonly string[]).includes(kind)){const custom=samplePerformance(kind,entering?1-f:f,index,a,q.settle);const [x,y]=custom.position;if(q.direction==='left'){custom.position[0]=-x;custom.rotation[2]*=-1;}else if(q.direction==='up'||q.direction==='down'){custom.position[0]=-y;custom.position[1]=x*(q.direction==='up'?1:-1);}return {...result,...custom,scale:1,stretch:custom.scale};}
 if(kind!=='none')result.opacity=1-f;
 switch(kind){
  case 'rise':result.position[1]=-3*f*a;break;
  case 'fly-in':result.position[0]=-8*f*a;result.rotation[1]=f*1.1;break;
  case 'assemble':case 'scatter':{const angle=index*2.399963+1.1;result.position=[Math.cos(angle)*5*f*a,Math.sin(angle)*3*f*a,2*f*a];result.rotation=[f*Math.sin(index+1),f*Math.cos(index+1),f*Math.sin(index*3)];break;}
  case 'pop':case 'shrink':result.scale=Math.max(.001,1-f);break;
  case 'fall':result.position[1]=-4*f*a;result.rotation[2]=f*.35;break;
 }
 return result;
}
