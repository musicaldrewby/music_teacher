import {TempoMap} from './tempo-map.js';
import {clamp} from './performance-engine.js';
export const GRID_OPTIONS=[['1/1','Whole',4],['1/2','Half',2],['1/4','Quarter',1],['1/8','Eighth',.5],['1/16','Sixteenth',.25],['1/32','Thirty-second',.125],['1/64','Sixty-fourth',.0625],['1/4T','Quarter triplet',2/3],['1/8T','Eighth triplet',1/3],['1/16T','Sixteenth triplet',1/6]];
export const gridBeats=id=>GRID_OPTIONS.find(g=>g[0]===id)?.[2]||.25;
export const barBeats=p=>p.meter[0]*4/p.meter[1];
export const songBeats=p=>(p.version===2?p.scenes[p.selectedScene||0].bars:p.bars)*barBeats(p);
export const MAX_PATTERN_BARS=256;
export const MAX_SONG_BARS=16384;
// A human downbeat can land just before the count-in ends. Capture that
// small anticipation at beat one without admitting the rest of the count-in.
export const RECORD_START_GRACE_SECONDS=.15;
export const clone=value=>{const copy=JSON.parse(JSON.stringify(value));return copy?.format==='soundroom-project'&&copy.version===2?bindProject(copy):copy};
let serial=0;
export const uid=()=>Date.now().toString(36)+'-'+(++serial).toString(36);
export const patchKey=p=>[p.isGMGSDrum?1:0,p.bankMSB,p.bankLSB,p.program].join(':');
export function createTimelineProject(presets){
 const programs=[0,32,48,4,24,89,80,0];
 return {format:'soundroom-project',version:1,name:'Untitled song',tempo:100,bars:4,meter:[4,4],loop:true,countIn:1,metronome:'record',clickVolume:65,clickTone:'click',clickAccent:true,grid:'1/16',snap:true,recordGrid:'1/16',recordMode:'overdub',quantizeGrid:'1/16',strength:100,quantizeLength:false,swing:0,selectedTrack:0,armedTrack:0,punch:{enabled:false,from:1,to:4},sections:[],arrangement:[],tracks:programs.map((program,i)=>({name:i===7?'Drums':'Track '+(i+1),patch:clone(presets.find(p=>i===7?p.isGMGSDrum:p.program===program&&!p.isDrum&&p.bankMSB===0)||presets[0]),volume:100,pan:64,reverb:80,delay:64,mute:false,solo:false,monitor:true,shape:{octave:0,tune:0,attack:64,release:64,brightness:64},notes:[],controllers:[]}))};
}
// Canonical saved data has one shared performance and eight independent patterns.
// The editor/recorder facade points directly at the selected scene; replacing an
// event array or undoing an edit cannot leave a stale copy in another pattern.
export function bindProject(p){
 if(p?.version!==2)return p;
 const fallback=p.tempo;for(const scene of p.scenes)scene.tempo??=fallback;
 Object.defineProperty(p,'tempo',{configurable:true,enumerable:true,get:()=>p.scenes[p.selectedScene].tempo,set:value=>{p.scenes[p.selectedScene].tempo=value}});
 for(const key of ['bars','punch'])Object.defineProperty(p,key,{configurable:true,enumerable:false,get:()=>p.scenes[p.selectedScene][key],set:value=>{p.scenes[p.selectedScene][key]=value}});
 p.tracks.forEach((track,i)=>{for(const key of ['notes','controllers'])Object.defineProperty(track,key,{configurable:true,enumerable:false,get:()=>p.scenes[p.selectedScene].tracks[i][key],set:value=>{p.scenes[p.selectedScene].tracks[i][key]=value}})});
 return p;
}
export function createProject(presets){
 const p=createTimelineProject(presets);delete p.bars;delete p.punch;delete p.sections;delete p.arrangement;
 p.version=2;p.performanceName='Untitled performance';p.selectedScene=0;p.sceneSwitch='bar';p.song=[];
 p.tracks.forEach(t=>{delete t.notes;delete t.controllers});
 p.scenes=Array.from({length:8},(_,i)=>({name:'Scene '+(i+1),tempo:p.tempo,bars:4,punch:{enabled:false,from:1,to:4},tracks:Array.from({length:8},()=>({notes:[],controllers:[]}))}));return bindProject(p);
}
export function patternProject(p,index=p.selectedScene||0){
 if(p.version!==2)return clone(p);
 const {scenes,tracks,song,legacyProject,...settings}=p,s=scenes[index];
 return {...settings,version:1,name:s.name,tempo:s.tempo,bars:s.bars,punch:clone(s.punch),sections:[{id:'scene-'+index,name:s.name,from:1,bars:s.bars,scene:index}],arrangement:[],tracks:tracks.map((t,i)=>({...clone(t),notes:clone(s.tracks[i].notes),controllers:clone(s.tracks[i].controllers)}))};
}
export function copyScene(p,from,to){
 if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||from>7||to<0||to>7||from===to)throw new Error('Choose a different destination scene.');
 const name=p.scenes[to].name;p.scenes[to]={...clone(p.scenes[from]),name};for(const t of p.scenes[to].tracks){for(const e of [...t.notes,...t.controllers])e.id=uid()}
}
export function snapBeat(beat,grid,swing=0){const step=gridBeats(grid),index=Math.round(beat/step),candidates=[index-1,index,index+1].map(i=>i*step+(Math.abs(i%2)===1?step*.5*swing/100:0));return candidates.reduce((a,b)=>Math.abs(a-beat)<=Math.abs(b-beat)?a:b)}
// Keep a played note whole in the project. Split only for display/playback, so
// quantizing a loop-spanning note cannot create two attacks at the downbeat.
export function noteSegments(note,total,loop=true){
 const first=Math.min(note.duration,total-note.start),parts=[{...note,duration:first,offset:0,continues:loop&&note.duration>first+.000001}];
 if(loop&&note.duration>first+.000001)parts.push({...note,start:0,duration:note.duration-first,offset:first,continues:false});
 return parts.filter(n=>n.duration>=.001);
}
export function quantizeNotes(notes,{grid='1/16',strength=100,length=false,swing=0,total=Infinity,wrap=false}={}){
 for(const n of notes){n.original??={start:n.start,duration:n.duration};const o=n.original,amount=clamp(strength,0,100)/100;
  n.start=Math.max(0,o.start+(snapBeat(o.start,grid,swing)-o.start)*amount);if(n.start>=total)n.start=wrap?n.start%total:Math.max(0,Math.floor((total-.000001)/gridBeats(grid))*gridBeats(grid));
  n.duration=Math.max(.01,o.duration+(length?(Math.max(gridBeats(grid),Math.round(o.duration/gridBeats(grid))*gridBeats(grid))-o.duration)*amount:0));n.duration=Math.min(n.duration,wrap?total:total-n.start);
 }
}
export function restoreTiming(notes,total,wrap=false){for(const n of notes)if(n.original){n.start=clamp(n.original.start,0,total-.001);n.duration=clamp(n.original.duration,.001,wrap?total:total-n.start)}}
const freshNote=(n,start,duration)=>({...clone(n),id:uid(),start,duration,original:{start,duration}});
const controllerKey=c=>c.type+':'+(c.controller??'');
// Include notes crossing either edge and chase controllers at a new section.
export function extractRange(track,start,end,total,loop=false){
 const notes=track.notes.flatMap(n=>noteSegments(n,total,loop)).flatMap(n=>{
  const a=Math.max(start,n.start),b=Math.min(end,n.start+n.duration);
  return b-a>=.001?[freshNote(n,a-start,b-a)]:[];
 });
 const state=new Map([['cc:64',{type:'cc',controller:64,value:0}],['cc:1',{type:'cc',controller:1,value:0}],['cc:11',{type:'cc',controller:11,value:127}],['bend:',{type:'bend',value:8192}],['pressure:',{type:'pressure',value:0}]]);
 for(const c of [...track.controllers].sort((a,b)=>a.beat-b.beat))if(c.beat<start)state.set(controllerKey(c),c);
 const controllers=[...state.values()].map(c=>({...c,id:uid(),beat:0}));
 controllers.push(...track.controllers.filter(c=>c.beat>=start&&c.beat<end).map(c=>({...c,id:uid(),beat:c.beat-start})));
 controllers.push({id:uid(),beat:end-start,type:'cc',controller:64,value:0});
 return {notes,controllers};
}
export function eraseRange(track,start,end,total,loop=false){
 track.notes=track.notes.flatMap(n=>{
  const pieces=noteSegments(n,total,loop);
  if(!pieces.some(x=>x.start<end&&x.start+x.duration>start))return [n];
  return pieces.flatMap(x=>{
   const out=[];
   if(x.start<start)out.push(freshNote(x,x.start,Math.min(start,x.start+x.duration)-x.start));
   if(x.start+x.duration>end)out.push(freshNote(x,Math.max(end,x.start),x.start+x.duration-Math.max(end,x.start)));
   return out.filter(x=>x.duration>=.001);
  });
 });
 // Restore the controller state at the far edge, keeping the next passage intact.
 const restore=new Map([['cc:64',{type:'cc',controller:64,value:0}]]);for(const c of [...track.controllers].sort((a,b)=>a.beat-b.beat))if(c.beat<end)restore.set(controllerKey(c),c);
 track.controllers=track.controllers.filter(c=>c.beat<start||c.beat>=end);
 track.controllers.push({id:uid(),beat:start,type:'cc',controller:64,value:0});
 if(end<total)for(const c of restore.values())if(!track.controllers.some(x=>x.beat===end&&controllerKey(x)===controllerKey(c)))track.controllers.push({...c,id:uid(),beat:end});
}

export class Recorder {
 constructor(project,onChange=()=>{}){this.project=project;this.onChange=onChange;this.held=new Map();this.active=false;this.track=0;}
 start(track){
  this.active=true;this.track=track;this.held.clear();const p=this.project,t=p.tracks[track];
  // A pedal or bend played during a punch must not leak into the next passage.
  if(p.punch.enabled){const end=p.punch.to*barBeats(p),state=new Map([['cc:64',{type:'cc',controller:64,value:0}],['cc:1',{type:'cc',controller:1,value:0}],['cc:11',{type:'cc',controller:11,value:127}],['bend:',{type:'bend',value:8192}],['pressure:',{type:'pressure',value:0}]]);for(const c of [...t.controllers].sort((a,b)=>a.beat-b.beat))if(c.beat<end)state.set(controllerKey(c),c);for(const c of state.values())if(!t.controllers.some(x=>x.beat===end&&controllerKey(x)===controllerKey(c)))t.controllers.push({...c,id:uid(),beat:end})}
  if(p.recordMode==='replace'){if(p.punch.enabled)eraseRange(t,(p.punch.from-1)*barBeats(p),p.punch.to*barBeats(p),songBeats(p),p.loop);else{t.notes=[];t.controllers=[]}}
 }
 window(beat){const p=this.project,total=songBeats(p),cycle=p.loop?Math.max(0,Math.floor(beat/total)):0;return p.punch.enabled?{start:cycle*total+(p.punch.from-1)*barBeats(p),end:cycle*total+p.punch.to*barBeats(p)}:{start:cycle*total,end:cycle*total+total}}
 noteOn(owner,note,velocity,beat){if(!this.active||beat<-RECORD_START_GRACE_SECONDS*this.project.tempo/60||!this.project.loop&&beat>=songBeats(this.project)-.001)return;const w=this.window(beat),grace=RECORD_START_GRACE_SECONDS*this.project.tempo/60;if(this.project.punch.enabled&&(beat<w.start-grace||beat>=w.end))return;this.noteOff(owner,beat);this.held.set(owner,{note,velocity,beat:Math.max(w.start,beat),performedBeat:beat,punchEnd:this.project.punch.enabled?w.end:Infinity})}
 noteOff(owner,beat){const held=this.held.get(owner);if(!held)return;this.held.delete(owner);const p=this.project,total=songBeats(p);let start=held.beat%total,duration=clamp(Math.min(beat,held.punchEnd)-held.performedBeat,.01,total);
  if(p.punch.enabled)duration=Math.min(duration,held.punchEnd-held.beat);
  if(!p.loop)duration=Math.min(duration,total-start);if(duration<.001)return;
  const n={id:uid(),pitch:held.note,velocity:held.velocity,start,duration,original:{start,duration}};
  if(p.recordGrid!=='off')quantizeNotes([n],{grid:p.recordGrid,total,wrap:p.loop&&!p.punch.enabled});if(p.punch.enabled){const a=(p.punch.from-1)*barBeats(p),b=p.punch.to*barBeats(p);n.start=clamp(n.start,a,b-.001);n.duration=Math.min(n.duration,b-n.start)}p.tracks[this.track].notes.push(n);this.onChange({track:this.track,note:n,firstCycle:Math.max(0,Math.floor(beat/total))+1});
 }
 controller(event,beat){if(!this.active||beat<-RECORD_START_GRACE_SECONDS*this.project.tempo/60||!this.project.loop&&beat>=songBeats(this.project))return;const w=this.window(beat);if(this.project.punch.enabled&&(beat<w.start-RECORD_START_GRACE_SECONDS*this.project.tempo/60||beat>=w.end))return;const total=songBeats(this.project),controller={id:uid(),beat:Math.max(this.project.punch.enabled?w.start:0,beat)%total,...event};this.project.tracks[this.track].controllers.push(controller);this.onChange({track:this.track,controller,firstCycle:Math.max(0,Math.floor(beat/total))+1})}
 stop(beat){for(const owner of [...this.held.keys()])this.noteOff(owner,beat);this.active=false}
}
export function trackAudible(p,i){const t=p.tracks[i];return !t.mute&&(!p.tracks.some(x=>x.solo)||t.solo)}
// A captured event becomes playback on the next pass. A short note snapped
// ahead of the playhead must not sound twice during the pass that recorded it.
export function compileRecordedChange(p,{track,note,controller,firstCycle}){
 if(!p.loop)return [];
 const channel=track+8;
 if(note)return noteSegments(note,songBeats(p),true).flatMap(n=>{
  const cycle=firstCycle+(n.offset>0?1:0);
  return [{beat:n.start,order:3,message:[0x90+channel,n.pitch,n.velocity],firstCycle:cycle},{beat:n.start+n.duration,order:1,message:[0x80+channel,n.pitch,0],firstCycle:cycle}];
 });
 const c=controller,message=c.type==='bend'?[0xe0+channel,c.value&127,c.value>>7]:c.type==='pressure'?[0xd0+channel,c.value]:[0xb0+channel,c.controller,c.value];
 return [{beat:c.beat,order:2,message,firstCycle}];
}
export function compileScore(p,recording=false){
 if(p.version===2)p=patternProject(p);
 const length=songBeats(p),events=[];
 for(const [i,t] of p.tracks.entries()){
  const channel=i+8;
  for(const [cc,value] of [[64,0],[1,0],[11,127]])events.push({beat:0,order:0,message:[0xb0+channel,cc,value]});
  events.push({beat:0,order:0,message:[0xe0+channel,0,64]},{beat:0,order:0,message:[0xd0+channel,0]});
  for(const note of t.notes){if(note.start<0||note.start>=length)continue;for(const n of noteSegments(note,length,p.loop))events.push({beat:n.start,order:3,message:[0x90+channel,n.pitch,n.velocity]},{beat:n.start+n.duration,order:1,message:[0x80+channel,n.pitch,0]})}
  for(const c of t.controllers){if(c.beat>=length)continue;let message=c.type==='bend'?[0xe0+channel,c.value&127,c.value>>7]:c.type==='pressure'?[0xd0+channel,c.value]:[0xb0+channel,c.controller,c.value];events.push({beat:c.beat,order:2,message})}
  events.push({beat:length,order:1,message:[0xb0+channel,64,0]});
 }
 const count=recording?p.countIn*barBeats(p):0,click=p.metronome==='on'||recording&&p.metronome==='record';
 const unit=4/p.meter[1];for(let beat=-count;beat<length;beat+=unit)if(beat<0||click)events.push({beat,order:4,click:true,accent:Math.abs(beat%barBeats(p))<.001});
 events.sort((a,b)=>a.beat-b.beat||a.order-b.order);
 return {events,length,loop:p.loop,secondsPerBeat:60/p.tempo,tempoChanges:p.tempoChanges||[],countIn:count,clickVolume:p.clickVolume/100,clickTone:p.clickTone||'click',clickAccent:p.clickAccent!==false};
}
// Runs inside the AudioWorklet, independent of main-thread rendering and timers.
export class AudioTimeline {
 constructor(){this.playing=false;this.events=[]}
 start(score,origin){Object.assign(this,score);this.tempoMap=new TempoMap(60/score.secondsPerBeat,score.tempoChanges);this.duration=this.tempoMap.secondsAt(this.length);this.origin=origin;this.scheduledThrough=-Infinity;this.index=0;this.cycle=0;this.playing=true;this.loopIndex=this.events.findIndex(e=>e.beat>=0);if(this.loopIndex<0)this.loopIndex=this.events.length}
 stop(){this.playing=false}
 // Insert only the new events, retaining the current cursor and clock. No
 // whole-score clone/sort is needed for each key release or expression event.
 append(events){for(const e of events){let low=0,high=this.events.length;while(low<high){const mid=(low+high)>>>1,x=this.events[mid];if(x.beat<e.beat||x.beat===e.beat&&x.order<=e.order)low=mid+1;else high=mid}this.events.splice(low,0,e);if(low<this.index)this.index++}this.loopIndex=this.events.findIndex(e=>e.beat>=0);if(this.loopIndex<0)this.loopIndex=this.events.length}
 position(time){const seconds=time-this.origin,cycle=this.loop&&seconds>=0?Math.floor(seconds/this.duration):0;return cycle*this.length+this.tempoMap.beatAt(seconds-cycle*this.duration)}
 timeAt(beat){const cycle=this.loop&&beat>=0?Math.floor(beat/this.length):0;return this.origin+cycle*this.duration+this.tempoMap.secondsAt(beat-cycle*this.length)}
 replace(score,time){const absolute=this.position(Math.max(time,this.scheduledThrough));Object.assign(this,score);this.tempoMap=new TempoMap(60/score.secondsPerBeat,score.tempoChanges);this.duration=this.tempoMap.secondsAt(this.length);this.loopIndex=this.events.findIndex(e=>e.beat>=0);if(this.loopIndex<0)this.loopIndex=this.events.length;this.cycle=Math.max(0,Math.ceil(absolute/this.length)-1);this.index=this.events.findIndex(e=>e.beat+this.cycle*this.length>=absolute);if(this.index<0)this.index=this.events.length}
 tick(now,end,emit){if(!this.playing)return;this.scheduledThrough=end;let guard=0;
  while(guard++<50000){
   if(this.index>=this.events.length){const boundary=this.origin+(this.cycle+1)*this.duration;if(!this.loop){if(now>=boundary)this.playing=false;return}this.cycle++;this.index=this.loopIndex;if(!this.events.length)return}
   const e=this.events[this.index],time=this.origin+this.cycle*this.duration+this.tempoMap.secondsAt(e.beat);
   if(time>=end)return;this.index++;if(this.cycle>=(e.firstCycle||0)&&time>=now-.01)emit(e,Math.max(now,time));
  }
 }
}
export function validateTimeline(raw,presets){
 if(!raw||raw.format!=='soundroom-project'||raw.version!==1||!Array.isArray(raw.tracks)||raw.tracks.length!==8)throw new Error('Choose a Soundroom eight-track project file.');
 const p=createTimelineProject(presets),num=(v,a,b,label)=>{if(!Number.isFinite(v)||v<a||v>b)throw new Error('Invalid '+label+' in project.');return v};
 p.name=String(raw.name||'Untitled session').slice(0,80);p.tempo=num(raw.tempo,30,300,'tempo');p.bars=num(raw.bars,1,MAX_PATTERN_BARS,'length');if(!Number.isInteger(p.bars))throw new Error('Project bars must be whole numbers.');
 if(!Array.isArray(raw.meter)||![2,3,4,5,6,7,9,12].includes(raw.meter[0])||![4,8].includes(raw.meter[1]))throw new Error('Invalid meter.');p.meter=[...raw.meter];
 for(const k of ['loop','snap','quantizeLength'])p[k]=!!raw[k];
 for(const k of ['grid','quantizeGrid'])if(GRID_OPTIONS.some(g=>g[0]===raw[k]))p[k]=raw[k];
 p.recordGrid=raw.recordGrid==='off'||GRID_OPTIONS.some(g=>g[0]===raw.recordGrid)?raw.recordGrid:p.recordGrid;
 p.recordMode=raw.recordMode==='replace'?'replace':'overdub';p.countIn=[0,1,2].includes(raw.countIn)?raw.countIn:1;p.metronome=['off','on','record'].includes(raw.metronome)?raw.metronome:'record';
 p.clickTone=['click','wood','rim','beep'].includes(raw.clickTone)?raw.clickTone:'click';p.clickAccent=raw.clickAccent!==false;
 for(const [k,a,b] of [['clickVolume',0,100],['strength',0,100],['swing',0,100]])p[k]=num(raw[k]??p[k],a,b,k);
 p.selectedTrack=clamp(Math.floor(raw.selectedTrack||0),0,7);p.armedTrack=clamp(Math.floor(raw.armedTrack??p.selectedTrack),-1,7);
 const total=songBeats(p);
 const integer=(v,a,b,label)=>{num(v,a,b,label);if(!Number.isInteger(v))throw new Error('Invalid '+label+'.');return v};
 if(raw.punch){const from=integer(raw.punch.from,1,MAX_PATTERN_BARS,'punch start'),to=integer(raw.punch.to,1,MAX_PATTERN_BARS,'punch end');if(raw.punch.enabled&&(from>p.bars||to>p.bars))throw new Error('Punch must fit in the song.');p.punch={enabled:!!raw.punch.enabled,from:Math.min(from,p.bars),to:Math.min(to,p.bars)}}else p.punch.to=Math.min(4,p.bars);
 if(p.punch.to<p.punch.from)throw new Error('Punch end must follow punch start.');
 if(raw.sections!==undefined){if(!Array.isArray(raw.sections)||raw.sections.length>128)throw new Error('Too many sections.');const ids=new Set();p.sections=raw.sections.map(s=>{if(typeof s.id!=='string'||s.id.length>100||ids.has(s.id))throw new Error('Invalid section ID.');ids.add(s.id);const from=integer(s.from,1,p.bars,'section start'),bars=integer(s.bars,1,p.bars-from+1,'section length');return {id:s.id,name:String(s.name||'Section').slice(0,48),from,bars}})}
 if(raw.arrangement!==undefined){if(!Array.isArray(raw.arrangement)||raw.arrangement.length>128)throw new Error('Too many arrangement entries.');p.arrangement=raw.arrangement.map(a=>{if(!p.sections.some(s=>s.id===a.sectionId))throw new Error('Missing arrangement section.');return {id:uid(),sectionId:a.sectionId,repeats:integer(a.repeats,1,16,'section repeats')}})}
 p.tracks=raw.tracks.map((t,i)=>{if(!Array.isArray(t.notes)||t.notes.length>10000||!Array.isArray(t.controllers)||t.controllers.length>20000)throw new Error('Track event limit exceeded.');const out=p.tracks[i];out.name=String(t.name||out.name).slice(0,32);
  const patch=presets.find(x=>t.patch&&patchKey(x)===patchKey(t.patch));if(!patch)throw new Error('A saved patch is missing. Load the project’s SoundFont first.');out.patch=clone(patch);
  for(const k of ['volume','pan','reverb','delay'])out[k]=num(t[k],0,127,k);for(const k of ['mute','solo','monitor'])out[k]=!!t[k];
  for(const [k,a,b] of [['octave',-2,2],['tune',-100,100],['attack',0,127],['release',0,127],['brightness',0,127]])out.shape[k]=num(t.shape?.[k]??out.shape[k],a,b,k);
  out.notes=t.notes.map(n=>{const start=num(n.start,0,total-.000001,'note start'),duration=num(n.duration,.001,total+.00001,'note duration'),pitch=num(n.pitch,0,127,'pitch'),velocity=num(n.velocity,1,127,'velocity');if(!Number.isInteger(pitch)||!Number.isInteger(velocity))throw new Error('Invalid MIDI note.');const original=n.original?{start:num(n.original.start,0,total,'original start'),duration:num(n.original.duration,.001,total,'original duration')}:{start,duration};return {id:uid(),start,duration,pitch,velocity,original}});
  out.controllers=t.controllers.map(c=>{if(!['cc','bend','pressure'].includes(c.type)||c.type==='cc'&&![1,11,64].includes(c.controller))throw new Error('Unsupported controller event.');return {id:uid(),beat:num(c.beat,0,total,'controller timing'),type:c.type,...(c.type==='cc'?{controller:c.controller}:{}),value:num(c.value,0,c.type==='bend'?16383:127,'controller value')}});return out;
 });return p;
}

function sharedSettings(target,source){for(const key of ['name','tempo','meter','loop','countIn','metronome','clickVolume','clickTone','clickAccent','grid','snap','recordGrid','recordMode','quantizeGrid','strength','quantizeLength','swing','selectedTrack','armedTrack'])target[key]=clone(source[key])}
function sceneFromTimeline(t,name=t.name){return {name:String(name).slice(0,48),tempo:t.tempo,bars:t.bars,punch:clone(t.punch),tracks:t.tracks.map(x=>({notes:clone(x.notes),controllers:clone(x.controllers)}))}}
function assignPerformance(p,t){p.tracks=t.tracks.map(x=>{const out=clone(x);delete out.notes;delete out.controllers;return out});bindProject(p)}
export function validateProject(raw,presets){
 if(raw?.version===1){
  const legacy=validateTimeline(raw,presets),p=createProject(presets);sharedSettings(p,legacy);p.scenes.forEach(scene=>scene.tempo=legacy.tempo);assignPerformance(p,legacy);p.performanceName=legacy.name+' performance';p.scenes[0]=sceneFromTimeline(legacy,'Imported pattern');
  // Keep the complete original, including every old section, available to download.
  p.legacyProject={...clone(legacy),...(raw.soundfont?{soundfont:clone(raw.soundfont)}:{}),...(raw.effects?{effects:clone(raw.effects)}:{}),...(Number.isFinite(raw.master)?{master:raw.master}:{})};
  let next=1;
  if(legacy.arrangement.length){
   const arranged=clone(legacy);arranged.bars=legacy.arrangement.reduce((n,a)=>n+legacy.sections.find(s=>s.id===a.sectionId).bars*a.repeats,0);arranged.punch={enabled:false,from:1,to:Math.min(4,arranged.bars)};arranged.tracks.forEach(t=>{t.notes=[];t.controllers=[]});let at=0;
   if(arranged.bars<=256){for(const a of legacy.arrangement){const section=legacy.sections.find(s=>s.id===a.sectionId);for(let repeat=0;repeat<a.repeats;repeat++){legacy.tracks.forEach((t,i)=>{const part=extractRange(t,(section.from-1)*barBeats(legacy),(section.from+section.bars-1)*barBeats(legacy),songBeats(legacy),legacy.loop);arranged.tracks[i].notes.push(...part.notes.map(n=>({...n,start:n.start+at,original:{start:n.start+at,duration:n.duration}})));arranged.tracks[i].controllers.push(...part.controllers.map(c=>({...c,beat:c.beat+at})))});at+=section.bars*barBeats(legacy)}}
    if(arranged.tracks.every(t=>t.notes.length<=10000&&t.controllers.length<=20000)){p.scenes[next]=sceneFromTimeline(arranged,'Imported song');p.song=[{id:uid(),scene:next,repeats:1}];next++}
   }
  }
  for(const section of legacy.sections){if(next>=8)break;const t=clone(legacy);t.bars=section.bars;t.punch={enabled:false,from:1,to:Math.min(4,t.bars)};t.tracks=t.tracks.map(x=>({...x,...extractRange(x,(section.from-1)*barBeats(t),(section.from+section.bars-1)*barBeats(t),songBeats(legacy),legacy.loop)}));p.scenes[next++]=sceneFromTimeline(t,section.name)}
  if(!p.song.length)p.song=[{id:uid(),scene:0,repeats:1}];return bindProject(p);
 }
 if(!raw||raw.format!=='soundroom-project'||raw.version!==2||!Array.isArray(raw.tracks)||raw.tracks.length!==8||!Array.isArray(raw.scenes)||raw.scenes.length!==8)throw new Error('Choose a Soundroom song with an eight-part performance and eight scenes.');
 const p=createProject(presets),validated=[];
 for(const scene of raw.scenes){if(!scene||!Array.isArray(scene.tracks)||scene.tracks.length!==8)throw new Error('Every scene needs eight pattern tracks.');validated.push(validateTimeline({...raw,version:1,tempo:scene.tempo===undefined?raw.tempo:scene.tempo,bars:scene.bars,punch:scene.punch,sections:[],arrangement:[],tracks:raw.tracks.map((t,i)=>({...t,notes:scene.tracks[i].notes,controllers:scene.tracks[i].controllers}))},presets))}
 sharedSettings(p,validated[0]);assignPerformance(p,validated[0]);p.performanceName=String(raw.performanceName||'Untitled performance').slice(0,80);
 if(!Number.isInteger(raw.selectedScene)||raw.selectedScene<0||raw.selectedScene>7)throw new Error('Invalid selected scene.');p.selectedScene=raw.selectedScene;p.sceneSwitch='bar';p.scenes=validated.map((t,i)=>sceneFromTimeline(t,String(raw.scenes[i].name||'Scene '+(i+1)).slice(0,48)));
 if(!Array.isArray(raw.song)||raw.song.length>256)throw new Error('A song can have up to 256 scene entries.');
 p.song=raw.song.map(a=>{if(!Number.isInteger(a.scene)||a.scene<0||a.scene>7||!Number.isInteger(a.repeats)||a.repeats<1||a.repeats>64)throw new Error('Invalid scene order or repeat count.');return {id:uid(),scene:a.scene,repeats:a.repeats}});
 if(p.song.reduce((sum,a)=>sum+p.scenes[a.scene].bars*a.repeats,0)>MAX_SONG_BARS)throw new Error('Song length limit exceeded.');
 if(raw.legacyProject)p.legacyProject={...validateTimeline(raw.legacyProject,raw.legacyProject.tracks?.map(t=>t.patch)||presets),...(raw.legacyProject.soundfont?{soundfont:clone(raw.legacyProject.soundfont)}:{}),...(raw.legacyProject.effects?{effects:clone(raw.legacyProject.effects)}:{}),...(Number.isFinite(raw.legacyProject.master)?{master:raw.legacyProject.master}:{})};
 return bindProject(p);
}
