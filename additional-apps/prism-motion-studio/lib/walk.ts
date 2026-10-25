import type {CameraPose,Scene} from './scene';
export function sampleWalk(walk:Scene['camera']['walk'],time:number):CameraPose|null{const a=walk.samples;if(!walk.enabled||!a.length)return null;if(time<=a[0].time)return a[0];if(time>=a[a.length-1].time)return a[a.length-1];let lo=0,hi=a.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(a[m].time<=time)lo=m;else hi=m;}const x=a[lo],y=a[hi],t=(time-x.time)/(y.time-x.time);return {position:x.position.map((v,i)=>v+(y.position[i]-v)*t) as CameraPose['position'],target:x.target.map((v,i)=>v+(y.target[i]-v)*t) as CameraPose['target'],fov:x.fov+(y.fov-x.fov)*t};}
export class WalkRecorder{
 samples:Scene['camera']['walk']['samples']=[];elapsed=0;
 constructor(public start:number,pose:CameraPose){this.add(start,pose);}
 private add(time:number,pose:CameraPose){this.samples.push({time,...structuredClone(pose)});}
 step(dt:number,pose:CameraPose,end:number){this.elapsed=Math.min(end-this.start,this.elapsed+Math.max(0,dt));const time=this.start+this.elapsed;if(time-this.samples.at(-1)!.time>=1/30-1e-5||time>=end)this.capture(time,pose);return time;}
 capture(time:number,pose:CameraPose){if(this.samples.at(-1)!.time===time)this.samples[this.samples.length-1]={time,...structuredClone(pose)};else if(this.samples.length<3601)this.add(time,pose);}
 finish(pose:CameraPose){this.capture(this.start+this.elapsed,pose);return this.samples;}
}
