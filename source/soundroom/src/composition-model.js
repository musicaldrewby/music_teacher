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

const partFields=['name','patch','volume','pan','reverb','delay','mute','solo','monitor','shape','zone'];
const copyPart=t=>Object.fromEntries(partFields.map(key=>[key,clone(t[key]??{enabled:false,low:0,high:127,velocityLow:1,velocityHigh:127})]));
export function capturePerformance(project,name,bank,effects,master,id=uid()){
 return {format:'soundroom-performance',version:1,id,name:name.trim().slice(0,80)||'Untitled performance',soundfont:{id:bank.id,name:bank.name},keyboardMode:project.keyboardMode||'single',tracks:project.tracks.map(copyPart),effects:clone(effects),master};
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
 const empty=createProject(presets);empty.keyboardMode=raw.keyboardMode==='layers'?'layers':'single';empty.tracks=raw.tracks.map(copyPart);const checked=validateProject(empty,presets);
 return capturePerformance(checked,raw.name,bank,effects,raw.master,typeof raw.id==='string'?raw.id.slice(0,100):uid());
}
export function applyPerformance(project,preset){
 // Copy only the shared part fields; the selected-scene note accessors stay bound.
 project.performanceName=preset.name;project.keyboardMode=preset.keyboardMode||'single';project.tracks.forEach((t,i)=>Object.assign(t,copyPart(preset.tracks[i])));
}
export function songTimeline(project){let start=0;return project.song.map(entry=>{const scene=project.scenes[entry.scene],item={...entry,name:scene.name,start,bars:scene.bars*entry.repeats};start+=item.bars;return item})}
export function moveSongEntry(song,id,boundary){const from=song.findIndex(e=>e.id===id);if(from<0)return;const to=Math.max(0,Math.min(song.length,boundary))-(boundary>from?1:0);if(from!==to){const [entry]=song.splice(from,1);song.splice(to,0,entry)}}

export function factoryPerformances(presets, bank) {
 const definitions = [
  {id:'glass-garden',name:'Glass Garden',description:'Celeste, bowed glass and a soft halo. Bells bloom into a long, airy tail.',parts:[['Celeste',80,58,0],['Bowed Glass',48,72,0],['Halo Pad',36,64,0]],reverb:42,delay:18},
  {id:'midnight-ep',name:'Midnight Electric Piano',description:'Tine electric piano with a quiet warm pad and spacious stereo echoes.',parts:[['Tine Electric Piano',100,64,0],['Warm Pad',44,64,0]],reverb:28,delay:24},
  {id:'cinematic-strings',name:'Cinematic Strings',description:'A broad string bed, soft choir and low cello. Cello stays below C4.',parts:[['Stereo Strings Slow',83,56,0],['Concert Choir',36,76,0],['Cello',65,64,0,0,59]],reverb:40,delay:0},
  {id:'clockwork',name:'Clockwork Orchestra',description:'Pizzicato, marimba and celeste. A light, percussive chamber ensemble.',parts:[['Pizzicato Strings',80,47,0],['Marimba',76,80,0],['Celeste',52,64,1,60,127]],reverb:24,delay:13},
  {id:'orff',name:'Orff Ensemble',description:'Low marimba on the left; xylophone and gentle glockenspiel from C4 upward.',parts:[['Marimba',96,56,0,0,59],['Xylophone',90,70,0,60,127],['Glockenspiel',48,64,0,60,127]],reverb:20,delay:0},
  {id:'after-hours',name:'After Hours Split',description:'Acoustic bass below C4; electric piano and a warm pad above the split.',parts:[['Acoustic Bass',101,64,0,0,59],['Tine Electric Piano',95,60,0,60,127],['Warm Pad',36,76,0,60,127]],reverb:25,delay:10},
  {id:'velvet-keys',name:'Velvet Keys',description:'Piano and strings for gentle playing. Bell piano enters at velocity 96 and above.',parts:[['Stereo Grand',95,64,0],['Stereo Strings Slow',42,55,0],['Bell Piano',65,76,0,0,127,96,127]],reverb:30,delay:8},
  {id:'starlight',name:'Starlight',description:'Soft synth chimes, breathy flute and a slow pad, spread across the stereo field.',parts:[['Synth Chime',68,45,0],['Flute',49,80,0],['Warm Pad',40,64,0]],reverb:40,delay:27}
 ];
 return definitions.map(d=>{
  const project=createProject(presets);project.keyboardMode='layers';
  project.tracks.forEach(t=>{t.zone.enabled=false});
  d.parts.forEach(([name,volume,pan,octave,low=0,high=127,velocityLow=1,velocityHigh=127],i)=>{
   const patch=presets.find(p=>p.name===name&&!p.isDrum);if(!patch)throw new Error('Missing factory instrument: '+name);
   Object.assign(project.tracks[i],{name,patch:clone(patch),volume,pan,reverb:75,delay:d.delay?55:0,zone:{enabled:true,low,high,velocityLow,velocityHigh}});
   project.tracks[i].shape.octave=octave;
  });
  const effects={reverbEnabled:true,reverbMix:d.reverb,reverbType:4,reverbDecay:78,reverbDamping:3,reverbPredelay:14,delayEnabled:d.delay>0,delayMix:d.delay,delayTime:100,delayFeedback:27,delayDamping:3,delayStereo:true};
  return {...capturePerformance(project,d.name,bank,effects,55,'factory:'+d.id),description:d.description,factory:true};
 });
}
