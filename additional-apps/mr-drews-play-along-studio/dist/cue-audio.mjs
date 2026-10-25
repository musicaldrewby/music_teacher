import {activeEvents,cueTiming,songToShow} from './project.mjs';
// Short original percussion accents, not a music generator. Shared sample data
// and absolute sample positions keep preview and offline export aligned.
export const CUE_RATE=48000;
const samples=new Map(),plans=new WeakMap();
export function movementSample(action){
 if(samples.has(action))return samples.get(action);
 const seconds={clap:.13,pat:.13,stomp:.19,snap:.075,tap:.09}[action]||.09;
 const out=new Float32Array(Math.ceil(seconds*CUE_RATE));let seed=1207+action.charCodeAt(0),low=0,peak=0;
 for(let i=0;i<out.length;i++){
  const t=i/CUE_RATE;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/2147483648-1;low+=.16*(noise-low);let v;
  if(action==='clap'){const burst=[0,.009,.019].reduce((sum,d)=>sum+(t>=d?Math.exp(-(t-d)*85):0),0);v=(noise-low)*burst+noise*.28*Math.exp(-t*34);}
  else if(action==='snap')v=(noise-low)*Math.exp(-t*130)+.25*Math.sin(t*2*Math.PI*1750)*Math.exp(-t*190);
  else if(action==='stomp')v=Math.sin(2*Math.PI*(59*t+1.1*(1-Math.exp(-t*30))))*Math.exp(-t*24)+low*.65*Math.exp(-t*55);
  else if(action==='pat')v=.7*Math.sin(t*2*Math.PI*155)*Math.exp(-t*57)+low*1.4*Math.exp(-t*52);
  else v=(Math.sin(t*2*Math.PI*720)+.4*Math.sin(t*2*Math.PI*1210))*Math.exp(-t*90)+noise*.2*Math.exp(-t*180);
  v*=Math.min(1,t/.0008)*Math.min(1,(seconds-t)/.008);out[i]=v;peak=Math.max(peak,Math.abs(v));
 }
 for(let i=0;i<out.length;i++)out[i]*=.15/(peak||1);samples.set(action,out);return out;
}
export function cueAudioPlan(p){
 if(!p.pairSounds||!p.pairVolume)return [];
 if(plans.has(p))return plans.get(p);
 const hits=[];for(const e of activeEvents(p)){if(e.hits<2&&e.rhythm!=='compound')continue;const timing=cueTiming(p,e);timing.times.forEach((at,part)=>hits.push({at:songToShow(p,at),end:songToShow(p,timing.times[part+1]??timing.end),action:e.action}));}
 const plan=hits.map(hit=>{
  const original=movementSample(hit.action),start=Math.round(hit.at*CUE_RATE),length=Math.max(1,Math.min(original.length,Math.round(hit.end*CUE_RATE)-start)),data=length===original.length?original:original.slice(0,length);
  if(data!==original)for(let i=Math.max(0,length-240);i<length;i++)data[i]*=(length-1-i)/Math.min(240,length);
  return {start,data};
 });plans.set(p,plan);return plan;
}
export const songHeadroom=p=>cueAudioPlan(p).length?.85:1;
export function mixCueAudio(p,channels,from,rate=CUE_RATE){
 const plan=cueAudioPlan(p);if(!plan.length)return channels;
 const frame=Math.round(from*rate),scale=CUE_RATE/rate,volume=p.pairVolume;
 for(const hit of plan){const start=Math.max(0,Math.ceil(hit.start/scale-frame)),end=Math.min(channels[0].length,Math.ceil((hit.start+hit.data.length)/scale-frame));
  for(let i=start;i<end;i++){const at=Math.round((frame+i)*scale)-hit.start,v=(hit.data[at]||0)*volume;channels[0][i]+=v;channels[1][i]+=v;}
 }return channels;
}
