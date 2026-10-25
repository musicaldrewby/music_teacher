import type {Scene,Obj} from './scene';
import {AUDIO_STRIDE,AUDIO_BANDS,AUDIO_HZ,audioFingerprint,type AudioAnalysis,type AudioSignals} from './audio-reactive-schema';
const filtered=new WeakMap<AudioAnalysis,Map<number,Float32Array>>();
const checked=new WeakMap<object,boolean>();
export const quietSignals=():AudioSignals=>({level:0,bass:0,mids:0,treble:0,beat:0,spectrum:Array(AUDIO_BANDS).fill(0)});
export function analysisReady(asset:Scene['audio']['assets'][string]|undefined){if(!asset?.analysis)return false;let ok=checked.get(asset);if(ok===undefined){ok=asset.analysis.source===audioFingerprint(asset.data);checked.set(asset,ok);}return ok;}
function envelopes(a:AudioAnalysis,smoothness:number){const key=Math.round(smoothness*100);let cache=filtered.get(a);if(!cache){cache=new Map();filtered.set(a,cache);}const found=cache.get(key);if(found)return found;const values=new Float32Array(a.frames.length),rise=1-Math.exp(-1/(AUDIO_HZ*(.015+smoothness*.1))),fall=1-Math.exp(-1/(AUDIO_HZ*(.025+smoothness*.45)));for(let i=0;i<values.length;i++){const target=a.frames[i]/255,previous=i>=AUDIO_STRIDE?values[i-AUDIO_STRIDE]:0;values[i]=previous+(target-previous)*(target>=previous?rise:fall);}if(cache.size>=4)cache.delete(cache.keys().next().value!);cache.set(key,values);return values;}
export function sampleAudio(scene:Scene,time:number,unscaled=false):AudioSignals{
 const {audio}=scene,r=audio.reactivity,empty=quietSignals();if((!r.enabled&&!unscaled)||!audio.enabled||(!r.strength&&!unscaled))return empty;
 const cue=audio.cues.find(c=>c.id===r.cueId),asset=cue&&audio.assets[cue.assetId];if(!cue||!analysisReady(asset))return empty;
 const a=asset!.analysis!,elapsed=time-cue.time,length=cue.loop?cue.duration:Math.min(cue.duration,a.duration-cue.offset);
 if((!cue.loop&&cue.offset>=a.duration)||elapsed<0||elapsed>=length)return empty;
 const source=cue.loop?(cue.offset+elapsed)%a.duration:cue.offset+elapsed,frame=source*a.hz,lo=Math.floor(frame),hi=Math.min(lo+1,a.frames.length/AUDIO_STRIDE-1),frac=frame-lo,values=envelopes(a,r.smoothness);
 const fadeIn=Math.min(cue.fadeIn,length/2),fadeOut=Math.min(cue.fadeOut,length/2),fade=Math.min(fadeIn?elapsed/fadeIn:1,fadeOut?(length-elapsed)/fadeOut:1,1),gain=fade*cue.volume*audio.volume*(unscaled?1:r.strength);
 const v=Array.from({length:AUDIO_STRIDE},(_,j)=>(values[lo*AUDIO_STRIDE+j]*(1-frac)+values[hi*AUDIO_STRIDE+j]*frac)*gain);
 return {level:v[0],bass:v[1],mids:v[2],treble:v[3],beat:v[4],spectrum:v.slice(5)};
}
export function audioOverview(scene:Scene,cueId?:string){
 return scene.audio.cues.filter(c=>c.kind==='audio'&&(!cueId||c.id===cueId)).map(c=>{const asset=scene.audio.assets[c.assetId],a=asset?.analysis;return {cueId:c.id,assetId:c.assetId,name:asset?.name,analyzed:analysisReady(asset),sourceDuration:a?.duration,sceneStart:c.time,clipDuration:c.duration,offset:c.offset,loop:c.loop,estimatedBpm:a?.bpm||null,beats:a?.beats||[],envelope:a?Array.from({length:Math.min(120,Math.ceil(a.duration))},(_,i)=>{const t=i*a.duration/Math.min(120,Math.ceil(a.duration)),f=Math.min(Math.floor(t*a.hz),a.frames.length/AUDIO_STRIDE-1)*AUDIO_STRIDE;return {sourceTime:Math.round(t*100)/100,level:a.frames[f]/255,bass:a.frames[f+1]/255,mids:a.frames[f+2]/255,treble:a.frames[f+3]/255};}):[]};});
}
export function reactiveConflict(o:Obj){return o.body.mode!=='off'||o.placement.enabled;}
