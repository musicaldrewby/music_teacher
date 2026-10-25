import {clone,uid,createProject,validateProject,patchKey} from './sequencer-model.js';

// Step entry has no wall-clock dependency. A gesture is one chord and one undo.
export class StepRecorder {
 constructor(commit){this.commit=commit;this.enabled=false;this.cursor=0;this.length=.25;this.held=new Set();this.chord=new Map();this.previous=[];}
 cancel(){this.held.clear();this.chord.clear();this.previous=[]}
 seek(beat,total){if(this.held.size)return;this.cursor=Math.max(0,Math.min(total,beat));this.previous=[]}
 on(owner,pitch,velocity,total){if(!this.enabled||this.cursor>=total-1e-8)return false;this.held.add(owner);this.chord.set(pitch,Math.max(velocity,this.chord.get(pitch)||0));return true}
 off(owner,total){
  if(!this.held.delete(owner)||this.held.size)return false;
  const start=this.cursor,duration=Math.min(this.length,total-start);
  const notes=[...this.chord].map(([pitch,velocity])=>({id:uid(),pitch,velocity,start,duration,original:{start,duration}}));this.chord.clear();
  if(notes.length&&duration>1e-8&&this.commit(notes)){this.previous=notes.map(n=>n.id);this.cursor=Math.min(total,start+duration);return true}return false;
 }
 rest(total){if(!this.held.size)this.seek(this.cursor+this.length,total)}
 back(total){if(!this.held.size)this.seek(this.cursor-this.length,total)}
 canTie(notes,total){return !this.held.size&&this.cursor<total-1e-8&&this.previous.length>0&&this.previous.every(id=>notes.some(n=>n.id===id&&Math.abs(n.start+n.duration-this.cursor)<1e-7))}
 tie(notes,total,edit){if(!this.canTie(notes,total))return false;const duration=Math.min(this.length,total-this.cursor);if(!edit(()=>{for(const id of this.previous){const n=notes.find(n=>n.id===id);n.duration+=duration;n.original={start:n.start,duration:n.duration}}}))return false;this.cursor+=duration;return true}
}

const partFields=['name','patch','volume','pan','reverb','delay','mute','solo','monitor','shape'];
const copyPart=t=>Object.fromEntries(partFields.map(key=>[key,clone(t[key])]));
export function capturePerformance(project,name,bank,effects,master,id=uid()){
 return {format:'soundroom-performance',version:1,id,name:name.trim().slice(0,80)||'Untitled performance',soundfont:{id:bank.id,name:bank.name},tracks:project.tracks.map(copyPart),effects:clone(effects),master};
}
export function validatePerformance(raw,presets,bank){
 if(raw?.format!=='soundroom-performance'||raw.version!==1||typeof raw.name!=='string'||!raw.name.trim()||!Array.isArray(raw.tracks)||raw.tracks.length!==8)throw new Error('Choose a Soundroom performance preset with eight parts.');
 if(raw.soundfont?.id!==bank.id||raw.soundfont?.name!==bank.name)throw new Error('This performance needs a different SoundFont.');
 const number=(value,min,max)=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;
 for(const t of raw.tracks){
  if(!t||typeof t.name!=='string'||!t.patch||!presets.some(p=>patchKey(p)===patchKey(t.patch)))throw new Error('A performance part has an unavailable instrument.');
  if(!['volume','pan','reverb','delay'].every(k=>Number.isInteger(t[k])&&number(t[k],0,127))||!['mute','solo','monitor'].every(k=>typeof t[k]==='boolean'))throw new Error('Invalid performance mixer settings.');
  if(!t.shape||!number(t.shape.octave,-2,2)||!Number.isInteger(t.shape.octave)||!number(t.shape.tune,-100,100)||!['attack','release','brightness'].every(k=>number(t.shape[k],0,127)))throw new Error('Invalid sound shaping settings.');
 }
 const ranges={reverbMix:[0,100],reverbType:[0,5],reverbDecay:[0,127],reverbDamping:[0,7],reverbPredelay:[0,127],delayMix:[0,100],delayTime:[70,115],delayFeedback:[0,75],delayDamping:[0,7]},effects={};
 for(const [key,[min,max]] of Object.entries(ranges)){if(!number(raw.effects?.[key],min,max))throw new Error('Invalid effect settings.');effects[key]=raw.effects[key]}
 for(const key of ['reverbEnabled','delayEnabled','delayStereo']){if(typeof raw.effects?.[key]!=='boolean')throw new Error('Invalid effect settings.');effects[key]=raw.effects[key]}
 if(!number(raw.master,0,100))throw new Error('Invalid master level.');
 const empty=createProject(presets);empty.tracks=raw.tracks.map(copyPart);const checked=validateProject(empty,presets);
 return capturePerformance(checked,raw.name,bank,effects,raw.master,typeof raw.id==='string'?raw.id.slice(0,100):uid());
}
export function applyPerformance(project,preset){
 // Copy only the shared part fields; the selected-scene note accessors stay bound.
 project.performanceName=preset.name;project.tracks.forEach((t,i)=>Object.assign(t,copyPart(preset.tracks[i])));
}
export function songTimeline(project){let start=0;return project.song.map(entry=>{const scene=project.scenes[entry.scene],item={...entry,name:scene.name,start,bars:scene.bars*entry.repeats};start+=item.bars;return item})}
export function moveSongEntry(song,id,boundary){const from=song.findIndex(e=>e.id===id);if(from<0)return;const to=Math.max(0,Math.min(song.length,boundary))-(boundary>from?1:0);if(from!==to){const [entry]=song.splice(from,1);song.splice(to,0,entry)}}
