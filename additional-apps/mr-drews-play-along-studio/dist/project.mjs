import {defaultRhythm,validateRhythm,rhythmAt} from './rhythm.mjs';
import {THEMES,ART_STYLES,ACTIONS} from './catalog.mjs';
export {THEMES,ART_STYLES,ACTIONS} from './catalog.mjs';
export const PAIRED_ACTIONS=['pat','clap','stomp','snap','tap'];
export const MAX_AUDIO_BYTES=100*1024*1024,MAX_CLIP=480;
export const clone=x=>JSON.parse(JSON.stringify(x));
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const uid=()=>globalThis.crypto?.randomUUID?.()||'cue-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);
export const formatTime=(n,precise=false)=>{n=Math.max(0,Number(n)||0);return Math.floor(n/60)+':'+(precise?(n%60).toFixed(2).padStart(5,'0'):String(Math.floor(n%60)).padStart(2,'0'));};
export const TRANSITIONS={dissolve:'Studio dissolve',sweep:'Paper sweep',iris:'Iris reveal',zoom:'Cinematic zoom',curtain:'Theater curtain',none:'Clean cut'};
export const DEFAULT_SHOW={titleEnabled:true,titleSeconds:4,subtitle:'A movement play-along',credit:'Created by Drew Wichman',instructionsEnabled:true,instructionSeconds:5,instructions:'Watch the pictures. Follow the highlights. Move with the music.',countdown:true,endEnabled:true,endSeconds:4,endTitle:'Great job!',endSubtitle:'You found your groove.',transition:'sweep',transitionSeconds:.7,pageTransition:'flow',fadeIn:.35,fadeOut:1.2};
export function newProject(){return {version:2,title:'Your next play-along',theme:'woodland',artStyle:'felt',showLabels:true,textFree:false,reducedMotion:false,word:'Hey!',audio:null,trimIn:0,trimOut:0,volume:.9,pairSounds:true,pairVolume:.7,events:[],rhythm:defaultRhythm(),show:{...DEFAULT_SHOW}};}
const number=(value,min,max,label)=>{const n=Number(value);if(!Number.isFinite(n)||n<min||n>max)throw new Error(label+' is out of range.');return n;};
export function validateProject(raw){
 if(raw?.version===1)return migrateLegacy(raw);
 if(!raw||raw.version!==2)throw new Error('Choose a Play-Along Studio project file.');
 const p={...newProject(),...clone(raw)};delete p.packedAudio;p.rhythm=validateRhythm(p.rhythm);
 if(!THEMES[p.theme]||!ART_STYLES[p.artStyle])throw new Error('This project uses unknown artwork.');
 p.title=String(p.title||'My play-along').slice(0,100);p.word=String(p.word||'Hey!').slice(0,30);p.showLabels=!!p.showLabels;p.textFree=!!p.textFree;p.reducedMotion=!!p.reducedMotion;
 p.pairSounds=!!p.pairSounds;p.pairVolume=number(p.pairVolume,0,1,'Paired sound level');p.volume=number(p.volume,0,1,'Audio volume');p.trimIn=number(p.trimIn,0,86400,'Audio start');p.trimOut=number(p.trimOut,0,86400,'Audio end');
 if(p.trimOut<p.trimIn||p.trimOut-p.trimIn>MAX_CLIP+.0001)throw new Error('Choose a song segment up to eight minutes long.');
 if(p.audio){if(typeof p.audio.id!=='string'||!p.audio.id)throw new Error('Invalid audio attachment.');p.audio={id:p.audio.id,name:String(p.audio.name||'Your track').slice(0,200),duration:number(p.audio.duration,0,86400,'Audio duration')};if(p.trimOut>p.audio.duration+.01)throw new Error('The selected end is beyond your audio file.');}
 p.show={...DEFAULT_SHOW,...p.show};for(const key of ['titleEnabled','instructionsEnabled','endEnabled','countdown'])p.show[key]=!!p.show[key];
 for(const key of ['titleSeconds','instructionSeconds','endSeconds'])p.show[key]=number(p.show[key],1,20,'Slide length');
 for(const key of ['subtitle','credit','instructions','endTitle','endSubtitle'])p.show[key]=String(p.show[key]||'').slice(0,key==='instructions'?240:100);
 if(!TRANSITIONS[p.show.transition])throw new Error('Unknown transition.');if(!['flow','cut'].includes(p.show.pageTransition))throw new Error('Unknown score transition.');
 p.show.transitionSeconds=number(p.show.transitionSeconds,.2,1.5,'Transition length');p.show.fadeIn=number(p.show.fadeIn,0,3,'Audio fade in');p.show.fadeOut=number(p.show.fadeOut,0,3,'Audio fade out');
 if(!Array.isArray(p.events)||p.events.length>4000)throw new Error('Use up to 4,000 movement cues.');const ids=new Set();
 p.events=p.events.map(e=>{
  if(!e||typeof e.id!=='string'||ids.has(e.id)||!ACTIONS[e.action])throw new Error('Invalid movement cue.');ids.add(e.id);
  if(e.rhythm!=null&&!['swing','compound'].includes(e.rhythm))throw new Error('Unknown cue rhythm.');
  const extra={};let hits=e.hits??1;
  if(e.rhythm==='compound'){if(!Array.isArray(e.slots)||!e.slots.length||e.slots.length>3||e.slots.some(n=>![0,1,2].includes(n))||new Set(e.slots).size!==e.slots.length)throw new Error('Choose at least one of the three subdivisions.');extra.rhythm='compound';extra.slots=[...e.slots].sort();hits=extra.slots.length;}
  else if(e.rhythm==='swing'){extra.rhythm='swing';hits=2;}
  if(![1,2,3].includes(hits)||(hits>1||extra.rhythm)&&!PAIRED_ACTIONS.includes(e.action)||hits===3&&!extra.rhythm)throw new Error('Paired and compound rhythms support pat, clap, stomp, snap, and tap.');
  return {...extra,hits,gap:extra.rhythm==='compound'||hits===1?null:e.gap==null?null:number(e.gap,.02,2,'Second hit delay'),id:e.id,at:number(e.at,0,86400,'Cue time'),action:e.action,word:String(e.word??p.word).slice(0,30)};
 }).sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
 for(let i=1;i<p.events.length;i++)if(p.events[i].at-p.events[i-1].at<1/120-1e-8)throw new Error('Keep cues at least 0.009 seconds apart.');
 return p;
}
export function migrateLegacy(old){
 const p=newProject();p.title=String(old.title||p.title);p.theme=THEMES[old.theme]?old.theme:p.theme;p.artStyle=ART_STYLES[old.artStyle]?old.artStyle:'kids';p.showLabels=old.view!=='pictures';p.textFree=old.view==='pictures';p.word=old.word||'Hey!';
 const bpm=clamp(Number(old.bpm)||100,45,200),sections=Array.isArray(old.sections)?old.sections:[],intro=sections[0]?.kind==='intro'?sections[0].repeats*8*60/bpm:0,offset=Number(old.audioOffset)||0;
 let beat=0;for(const s of sections){for(let r=0;r<Math.min(16,s.repeats||1);r++)for(let i=0;i<16;i++){
  if(s.kind!=='pattern'||(i%2&&!s.pattern?.[i]))continue;const at=(beat+r*8+i/2)*60/bpm-(old.audioAlignment==='lesson'?0:intro)+offset;
  if(at>=0)p.events.push({id:uid(),at,action:ACTIONS[s.pattern?.[i]]?s.pattern[i]: 'rest',word:p.word});
 }beat+=(s.repeats||1)*8;}
 const end=beat*60/bpm,estimate=offset+end-(old.audioAlignment==='lesson'?0:intro);p.audio=old.audio?{...old.audio,duration:estimate}:null;p.trimIn=offset;p.trimOut=offset+Math.min(MAX_CLIP,Math.max(1,estimate-offset));
 if(!old.audio){p.trimIn=0;p.trimOut=0;p.events=[];}
 const s=old.presentation||{};p.show={...p.show,titleEnabled:s.opening??true,endEnabled:s.closing??true,subtitle:s.subtitle||p.show.subtitle,credit:s.credit??p.show.credit,endTitle:s.endTitle||p.show.endTitle,endSubtitle:s.endSubtitle||p.show.endSubtitle};
 return validateProject(p);
}
const cache=new WeakMap(),rhythmCache=new WeakMap();
export function activeEvents(p){if(!cache.has(p))cache.set(p,p.events.filter(e=>e.at>=p.trimIn&&e.at<p.trimOut));return cache.get(p);}
// One timing plan drives every pulse, waveform mark, preview sound and MP4 sample.
export function cueTiming(p,e){
 if(!rhythmCache.has(p)){
  const events=activeEvents(p),map=new Map();events.forEach((cue,i)=>{
   const next=events[i+1],previous=events[i-1],feel=rhythmAt(p,cue.at),end=Math.min(next?.at??p.trimOut,p.trimOut,p.rhythm?.enabled?feel.end:Infinity);
   const beat=p.rhythm?.enabled?feel.beat:next?next.at-cue.at:previous?cue.at-previous.at:.5;
   let offsets=cue.rhythm==='compound'?cue.slots.map(slot=>slot*beat/3):cue.hits===2?[0,cue.gap??beat*(cue.rhythm==='swing'?feel.swing:.5)]:[0];
   const room=Math.max(.0001,end-cue.at-.001),last=offsets.at(-1),compressed=last>room;
   if(compressed)offsets=offsets.map(n=>n*room/last);
   const times=offsets.map(n=>cue.at+n);map.set(cue.id,{gap:times.length>1?times[1]-times[0]:0,end,beat,times,compressed,swing:feel.swing,meter:feel.meter});
  });rhythmCache.set(p,map);
 }
 return rhythmCache.get(p).get(e?.id)||{gap:.25,end:p.trimOut,beat:.5,times:e?[e.at]:[],compressed:false};
}
export function showTiming(p){const s=p.show,title=s.titleEnabled?s.titleSeconds:0,instructions=s.instructionsEnabled?s.instructionSeconds:0,lead=title+instructions,clip=Math.max(0,p.trimOut-p.trimIn),outro=s.endEnabled?s.endSeconds:0;return {title,instructions,lead,clip,outro,audioEnd:lead+clip,total:lead+clip+outro};}
export const songToShow=(p,at)=>showTiming(p).lead+at-p.trimIn;
export const showToSong=(p,at)=>p.trimIn+at-showTiming(p).lead;
export function frameAt(p,seconds){
 const t=showTiming(p),s=clamp(seconds,0,t.total),events=activeEvents(p),song=showToSong(p,s);
 let lo=0,hi=events.length;while(lo<hi){const mid=(lo+hi)>>1;if(events[mid].at<=song+1e-8)lo=mid+1;else hi=mid;}const index=lo-1,page=Math.max(0,Math.floor(index/8));
 const phase=s<t.title?'title':s<t.lead?'instructions':s<t.audioEnd||!t.outro?'activity':'ending';
 const start=phase==='title'?0:phase==='instructions'?t.title:phase==='activity'?t.lead:t.audioEnd,end=phase==='title'?t.title:phase==='instructions'?t.lead:phase==='activity'?t.audioEnd:t.total;
 const event=events[index],next=events[index+1],hit=event?cueTiming(p,event).times.filter(at=>at<=song+1e-8).length-1:-1,elapsed=event?Math.max(0,song-(cueTiming(p,event).times[hit]??event.at)):0,hold=event?Math.max(.05,(next?.at??p.trimOut)-event.at):1;
 return {...t,phase,start,end,local:s-start,seconds:s,song,index,page,pages:Math.max(1,Math.ceil(events.length/8)),events:events.slice(page*8,page*8+8),active:phase==='activity'&&index>=0?index%8:-1,hit,elapsed,hold,progress:t.clip?clamp((s-t.lead)/t.clip,0,1):0,finished:seconds>=t.total&&t.total>0};
}
export function addCue(p,at,action,word=p.word,hits=1,rhythm={}){
 if(!p.audio||p.trimOut<=p.trimIn)throw new Error('Load your audio first.');if(!ACTIONS[action])throw new Error('Choose a movement.');
 const next=clone(p),time=clamp(Number(at),p.trimIn,Math.max(p.trimIn,p.trimOut-.009));if(!Number.isFinite(time))throw new Error('Invalid cue time.');
 const near=next.events.find(e=>Math.abs(e.at-time)<.04);if(near){near.at=time;near.action=action;near.word=word;near.hits=hits;near.gap=null;delete near.rhythm;delete near.slots;Object.assign(near,rhythm);}else next.events.push({id:uid(),at:time,action,word,hits,...rhythm});return validateProject(next);
}
export function audioGain(p,sourceSeconds){const len=p.trimOut-p.trimIn,local=sourceSeconds-p.trimIn;if(local<0||local>=len)return 0;const fadeIn=Math.min(p.show.fadeIn,len/2),fadeOut=Math.min(p.show.fadeOut,len/2);return p.volume*Math.min(fadeIn?clamp(local/fadeIn,0,1):1,fadeOut?clamp((len-local)/fadeOut,0,1):1);}
export function audioPlan(p,showOffset=0){const t=showTiming(p),elapsed=Math.max(0,showOffset-t.lead);return {delay:Math.max(0,t.lead-showOffset),offset:p.trimIn+elapsed,duration:Math.max(0,t.clip-elapsed)};}
