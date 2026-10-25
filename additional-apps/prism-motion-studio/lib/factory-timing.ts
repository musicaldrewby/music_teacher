/** Fixed station choreography; editable layer keys carry the parcel and delivery train. */
export const FACTORY_DURATION=42;
export const factoryStages=[
 {id:'assembly',name:'Toy assembly',start:0,end:6},
 {id:'paper',name:'Box & paper',start:6,end:16},
 {id:'ribbon',name:'Ribbon & bow',start:16,end:20},
 {id:'loading',name:'Crane loading',start:20,end:32},
 {id:'departure',name:'Christmas delivery',start:32,end:42},
] as const;
export function factoryStage(time:number){return factoryStages.find(p=>time<p.end)||factoryStages.at(-1)!;}
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const phase=(time:number,start:number,end:number)=>clamp((time-start)/(end-start));
export const smooth=(t:number)=>{const u=clamp(t);return u*u*(3-2*u);};
export const factoryBeltTravel=(time:number)=>9*phase(time,6,11)+3*phase(time,14,16)+11*phase(time,20,26);
export function factoryCrane(time:number){
 const lift=smooth(phase(time,26,28)),travel=smooth(phase(time,28,30)),lower=smooth(phase(time,30,32));
 if(time<25.4)return {z:2,gripY:5.2,cable:1.4,closed:false};
 if(time<26){const gripY=5.2+(3.31-5.2)*smooth(phase(time,25.4,26));return {z:2,gripY,cable:6.6-gripY,closed:time>=25.8};}
 if(time<=32){const parcelY=1.61+2.49*lift-2.74*lower,gripY=parcelY+1.7;return {z:2-6*travel,gripY,cable:6.6-gripY,closed:time<31.95};}
 const reset=smooth(phase(time,32,35)),gripY=3.06+(5.2-3.06)*reset;return {z:-4+6*smooth(phase(time,35,39)),gripY,cable:6.6-gripY,closed:false};
}
/** Toy parts arrive one at a time, each ending exactly in its assembly sockets. */
export function toyPartDrop(index:number,time:number){const u=phase(time,.5+index*.55,1.5+index*.55),remaining=1-u;const bounce=u<.72?0:Math.sin((u-.72)/.28*Math.PI)*.10;return {height:remaining**3*.18+bounce*.4,drift:remaining**3*2.6,rotation:Math.sin(remaining*Math.PI)*.25,visible:time>=.5+index*.55,settled:u===1};}
export function parcelFinish(time:number){return {paper:time>=11,fold:smooth(phase(time,11,13.4)),lid:smooth(phase(time,13.4,14)),ribbon:smooth(phase(time,17.2,18.5)),bow:smooth(phase(time,18.5,19.5)),finished:time>=19.5};}
