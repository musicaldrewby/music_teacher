import {type Track,type Project,noteTime,audible,stationLayout} from './project';
export type V3=[number,number,number];
export const isContraption=(machine:string)=>machine==='waterfall'||machine==='pipeworks';
export const machineNames={marimba:'Marble marimba',bells:'Bell garden',drums:'Drum factory',waterfall:'Marimba Waterfall',pipeworks:'Midnight Pipeworks'};
export function pitchesFor(t:Track){const pitches=[...new Set(t.notes.map(n=>n.midi))].sort((a,b)=>a-b);return pitches.length?pitches:[60];}
export function samplePath(points:V3[],u:number):V3{const a=Math.max(0,Math.min(1,u))*(points.length-1),i=Math.min(points.length-2,Math.floor(a)),f=a-i;return points[i].map((v,k)=>v+(points[i+1][k]-v)*f) as V3;}
export function cubic(a:V3,b:V3,c:V3,d:V3,count=60):V3[]{return Array.from({length:count+1},(_,i)=>{const t=i/count,s=1-t;return a.map((v,k)=>s*s*s*v+3*s*s*t*b[k]+3*s*t*t*c[k]+t*t*t*d[k]) as V3;});}
export function contraptionPlan(t:Track,width:number){
 const pitches=pitchesFor(t),organ=t.machine==='pipeworks',columns=Math.ceil(pitches.length/3),spacing=organ?Math.min(.62,(width-3)/pitches.length):.65;
 const keys=pitches.map((pitch,i)=>{const row=organ?0:Math.floor(i/columns),col=organ?i:i%columns,n=organ?pitches.length:Math.min(columns,pitches.length-row*columns),x=(col-(n-1)/2)*spacing,y=organ?2.15:1.85+row*1.35,z=organ?.9:2.25-row*1.85;
  const hit:V3=[x,y+.265,z],gate:V3=[x,y+1.05,z-1.2],lip:V3=[x,y+.55,z-.45];
  const approach=cubic(gate,[x-.14,y+.95,z-1.05],[x+.14,y+.75,z-.8],lip);
  return {pitch,row,x,y,z,hit,gate,lip,approach,length:1.25+(pitches.length-i)/pitches.length*.45,pipeHeight:organ?2.6+(pitches.length-i)/pitches.length*2.8:0};
 });
 const supply:V3[]=Array.from({length:181},(_,i)=>{const u=i/180,a=u*Math.PI*3;return [Math.cos(a)*(width/2-1.2),7.3-u*1.7,-1.7+Math.sin(a)*1.65];});
 return {kind:t.machine,width,keys,supply,liftX:width/2-.45,height:8};
}
export type ContraptionPlan=ReturnType<typeof contraptionPlan>;
export function contraptionBall(k:ContraptionPlan['keys'][number],age:number):V3{
 if(age<-.38)return samplePath(k.approach,(age+1.4)/1.02);
 if(age<0){const u=(age+.38)/.38;return [k.x,k.lip[1]+(k.hit[1]-k.lip[1])*u*u,k.lip[2]+(k.hit[2]-k.lip[2])*u];}
 if(age<.48){const u=age/.48;return [k.x,k.hit[1]+.8*4*u*(1-u)-.64*u,k.z+1.05*u];}
 const u=(age-.48)/.28;return [k.x,k.hit[1]-.64-.52*u,k.z+1.05];
}
export function keyActivity(p:Project,t:Track,pitch:number,time:number){if(!audible(p,t))return {hit:0,held:0};let hit=0,held=0;for(const n of t.notes){if(n.midi!==pitch)continue;const age=time-noteTime(p,n);if(age>=0&&age<.24)hit=Math.max(hit,n.velocity*(1-age/.24)*Math.sin(age/.24*Math.PI));if(age>=0&&age<n.duration/p.speed)held=Math.max(held,n.velocity);}return {hit,held};}
export function liftPosition(plan:ContraptionPlan,index:number,time:number):V3{const perimeter=16.4,phase=((time*.9+index*perimeter/16)%perimeter+perimeter)%perimeter;if(phase<7.2)return [plan.liftX,.55+phase,-1.3];if(phase<8.2){const a=(phase-7.2)*Math.PI;return [plan.liftX,7.75+.5*Math.sin(a),-1.8+.5*Math.cos(a)];}if(phase<15.4)return [plan.liftX,7.75-(phase-8.2),-2.3];const a=(phase-15.4)*Math.PI;return [plan.liftX,.55-.5*Math.sin(a),-1.8-.5*Math.cos(a)];}
export function machineLayouts(p:Project){return stationLayout(p).map((s,i)=>({...s,plan:isContraption(p.tracks[i].machine)?contraptionPlan(p.tracks[i],s.width):null}));}
