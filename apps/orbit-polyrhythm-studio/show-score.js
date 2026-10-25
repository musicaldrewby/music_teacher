import {WORLDS,CAMERAS} from './show-worlds.js';
import {sanitize} from './rhythm.js';
import {ALL_PRESETS,getFactoryPreset} from './factory-presets.js';
export const SHOW_VERSION=1;
export const SHOW_LIMIT=14400;
export const LOOKS=['Auto','Ice','Velvet','Ember','Aurora'];
// Scores contain only validated JSON data; this also works in restricted worklet globals.
const clone=x=>JSON.parse(JSON.stringify(x));
const ranges={bpm:[30,240],master:[0,100],'ambient.mix':[0,100],'ambient.decay':[1,30],'ambient.predelay':[0,250],'ambient.tone':[1000,14000],'ambient.width':[0,100],'ambient.lowcut':[40,600],'visual.glow':[0,100],'visual.speed':[0,2],'visual.zoom':[.8,1.2]};
const trackRanges={volume:[0,100],pan:[0,127],reverb:[0,100],delay:[0,100],gate:[5,400],probability:[0,100],motion:[0,100],motionRate:[4,48],swell:[0,100],swellBars:[2,16]};
function number(v,min,max,label){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error(`${label} must be between ${min} and ${max}.`);return v}
export function targetSpec(path){if(ranges[path])return {range:ranges[path]};if(path==='ambient.enabled')return {boolean:true};const m=/^tracks\.([0-7])\.(\w+)$/.exec(path);if(!m)throw Error(`Unsupported automation target: ${path}`);if(trackRanges[m[2]])return {range:trackRanges[m[2]]};if(['mute','solo'].includes(m[2]))return {boolean:true};if(['notes','pattern'].includes(m[2]))return {array:m[2]};throw Error(`Unsupported automation target: ${path}`)}
export function valueAt(object,path){return path.split('.').reduce((o,k)=>o?.[k],object)}
export function putValue(object,path,value){const keys=path.split('.'),last=keys.pop();let o=object;for(const key of keys)o=o[key];o[last]=Array.isArray(value)?[...value]:value}
export function normalizeShow(input){
 if(!input||input.type!=='orbit-show'||input.version!==1)throw Error('Choose an Orbit show file (version 1).');
 if(!Array.isArray(input.cues)||!input.cues.length||input.cues.length>1000)throw Error('A show needs 1–1000 cues.');
 if(input.cinema!==undefined&&typeof input.cinema!=='boolean')throw Error('Cinema needs true or false.');
 const out={cinema:input.cinema===true,type:'orbit-show',version:1,title:String(input.title||'Untitled show').slice(0,100),artist:String(input.artist||'Drew Wichman').slice(0,100),seed:number(input.seed??20261011,0,4294967295,'Seed')>>>0,tailSeconds:number(input.tailSeconds??12,0,60,'Tail'),fadeIn:number(input.fadeIn??3,0,30,'Fade in'),fadeOut:number(input.fadeOut??6,0,60,'Fade out'),cues:[]};
 let total=out.tailSeconds;const ids=new Set();
 for(let i=0;i<input.cues.length;i++){
  const c=input.cues[i],duration=number(c.duration,4,3600,`Cue ${i+1} duration`),state=sanitize(c.state||getFactoryPreset(c.preset)),visual={world:c.visual?.world??'Orbit Rings',camera:c.visual?.camera??'Drift',look:c.visual?.look??'Auto',glow:number(c.visual?.glow??70,0,100,'Glow'),speed:number(c.visual?.speed??.5,0,2,'Visual motion'),zoom:number(c.visual?.zoom??1,.8,1.2,'Zoom'),titles:c.visual?.titles!==false};
  if(!WORLDS.includes(visual.world))throw Error('Unknown visual world.');
  if(!CAMERAS.includes(visual.camera))throw Error('Unknown camera movement.');
  if(!LOOKS.includes(visual.look))throw Error('Unknown lighting look.');
  const id=String(c.id||`cue-${i+1}`).slice(0,80);if(ids.has(id))throw Error('Cue IDs must be unique.');ids.add(id);
  const transition=number(c.transition??Math.min(12,duration/2),0,Math.min(30,duration/2,i?out.cues[i-1].duration/2:30),'Crossfade');
  if(c.automation!==undefined&&!Array.isArray(c.automation))throw Error('Automation must be an array.');
  const automation=(c.automation||[]).map((a,j)=>{
   const path=String(a.path),spec=targetSpec(path),at=number(a.at,0,duration,'Automation time'),ramp=number(a.duration??0,0,duration-at,'Ramp duration');let value=a.value;
   if(spec.range)value=number(value,...spec.range,path);
   else if(spec.boolean){if(typeof value!=='boolean')throw Error(`${path} needs true or false.`)}
   else {if(state.tracks[+path.split('.')[1]].phrase)throw Error('Composed tracks use the phrase editor for note and pattern changes.');if(!Array.isArray(value)||!value.length||value.length>32||value.some(v=>!Number.isInteger(v)||v<0||v>(spec.array==='notes'?20:2)))throw Error(`Invalid ${path} phrase.`);if(spec.array==='pattern'&&value.length!==state.tracks[+path.split('.')[1]].steps)throw Error('Pattern length must match track steps.');value=[...value]}
   if(!spec.range&&ramp)throw Error('Phrase, pattern and on/off changes cannot be ramped.');
   const curve=a.curve??'smooth';if(!['smooth','linear'].includes(curve))throw Error('Unknown automation curve.');
   return {at,duration:ramp,path,value,curve,_order:j};
  }).sort((a,b)=>a.at-b.at||a._order-b._order).map(({_order,...a})=>a);
  if(automation.length>4096)throw Error('Too many automation points in one cue.');
  const ends=new Map();for(const a of automation){if((ends.get(a.path)??-1)>a.at)throw Error(`Overlapping ramps for ${a.path}.`);ends.set(a.path,a.at+a.duration)}
  out.cues.push({id,title:String(c.title||state.name).slice(0,100),duration,transition,state,visual,automation});total+=duration;
 }
 if(total>SHOW_LIMIT)throw Error('Keep the complete show within four hours.');
 if(out.fadeIn>total||out.fadeOut>total)throw Error('Fades must fit within the show.');
 return out;
}
export function cueLayout(show){let start=0;return show.cues.map((c,index)=>{const row={...c,index,start,end:start+c.duration};start=row.end;return row})}
export function showDuration(show){return show.cues.reduce((s,c)=>s+c.duration,show.tailSeconds)}
export const ease=(x,curve='smooth')=>{x=Math.max(0,Math.min(1,x));return curve==='linear'?x:x*x*(3-2*x)};
export function compileCue(cue){const lanes=new Map(),base={...clone(cue.state),visual:clone(cue.visual)};for(const a of cue.automation){const list=lanes.get(a.path)||[];let from=list.length?list.at(-1).value:valueAt(base,a.path);if(from===undefined)from=a.path.endsWith('.swellBars')?4:0;list.push({...a,from});lanes.set(a.path,list)}return {cue,base,lanes}}
export function sampleLane(list,time,initial){let low=0,high=list.length;while(low<high){const mid=(low+high)>>1;if(list[mid].at<=time)low=mid+1;else high=mid}if(!low)return initial;const a=list[low-1];return typeof a.value==='number'&&a.duration>0?a.from+(a.value-a.from)*ease((time-a.at)/a.duration,a.curve):a.value}
export function sampleCue(compiled,time){const out=clone(compiled.base);for(const [path,list] of compiled.lanes)putValue(out,path,sampleLane(list,time,valueAt(out,path)));return out}
export function seededRandom(seed){let n=seed>>>0;return ()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}}
export function makeCue(state,{id='cue-1',title=state.name,duration=120,transition=12}={}){return {id,title,duration,transition:Math.min(transition,duration/2),state:clone(state),visual:{world:'Auto',camera:'Drift',look:'Auto',glow:70,speed:.5,zoom:1,titles:true},automation:[]}}
export function createJourney({minutes=60,title='Beyond the Event Horizon',seed=20261011,style='horizon'}={}){
 const seconds=number(minutes,.5,240,'Minutes')*60,tail=Math.min(12,seconds*.12),count=Math.max(2,Math.min(12,Math.floor(seconds/90))),slot=(seconds-tail)/count;
 const names=style==='marimba'?['Obsidian Steps','Glass Canopy','Wood & Stars','Gravity Garden','Prism Dance','Tidal Machinery','Temple Circuit','Ember Relay','Quicksilver Eleven','Mallet Riot','Glass Canopy','Wood & Stars']:['Event Horizon','The Quiet Singularity','Dark Matter','Beyond the Horizon','Photon Rail','Tachyon Bloom','Gravity Engine','Midnight Transmission','Opal Exosphere','Solar Veil','First Light Beyond','Homeward Through Stars'];
 const cues=[];
 for(let i=0;i<count;i++){
  const state=getFactoryPreset(names[Math.round(i*(names.length-1)/(count-1))]);
  if(!state)throw Error('Journey preset missing.');state.key=2;state.scale='Minor';
  const cue=makeCue(state,{id:`movement-${i+1}`,title:state.name,duration:slot,transition:Math.min(16,slot*.2)});
  // A composed arc: quiet entrances, traded layers, phrase answers, then release.
  const arc=Math.sin(Math.PI*(i+.5)/count),random=seededRandom(seed+i*311);
  cue.visual.world=style==='marimba'?['Prism Garden','Liquid Echoes','Resonance Field','Aurora Veils','Prism Garden','Wave Cathedral'][i%6]:['Event Horizon','Liquid Echoes','Aurora Veils','Event Horizon','Resonance Field','Wave Cathedral','Event Horizon','Resonance Field','Aurora Veils','Liquid Echoes','Prism Garden','Event Horizon'][Math.round(i*11/(count-1))];
  cue.visual.camera=i%3===1?'Orbit':'Drift';
  cue.visual.glow=65+arc*25;cue.visual.speed=.15+arc*.55;
  state.tracks.forEach((t,k)=>{
   if(t.mute)return;
   const base=t.volume;cue.state.tracks[k].volume=base*(k<2?.72:.48);
   cue.automation.push({at:0,duration:Math.min(16,slot*.15,32*60/state.bpm*.6),path:`tracks.${k}.volume`,value:base*(.73+arc*.22),curve:'smooth'});
   // Every 8 bars, supporting parts trade prominence without changing the foundation.
   const phrase=8*4*60/state.bpm;
   for(let at=phrase;at<slot-phrase*.65;at+=phrase){
    cue.automation.push({at,duration:Math.min(phrase*.65,slot-at),path:`tracks.${k}.volume`,value:base*(.5+random()*.42),curve:'smooth'});
    if(k>0&&k<6&&t.bank!==128&&t.notes.length>1){const rotation=1+Math.floor(random()*(t.notes.length-1));cue.automation.push({at,duration:0,path:`tracks.${k}.notes`,value:t.notes.map((_,j)=>t.notes[(j+rotation)%t.notes.length]),curve:'linear'})}
   }
  });
  cue.automation.push({at:slot*.25,duration:slot*.5,path:'visual.zoom',value:1.1,curve:'smooth'});
  cues.push(cue);
 }
 return normalizeShow({cinema:true,type:'orbit-show',version:1,title,artist:'Drew Wichman',seed,tailSeconds:tail,fadeIn:Math.min(5,seconds*.05),fadeOut:Math.min(12,seconds*.1),cues});
}
export function summarizeShow(show){const layout=cueLayout(show);return {title:show.title,cinema:show.cinema,seconds:showDuration(show),seed:show.seed,cues:layout.map(c=>({id:c.id,title:c.title,start:c.start,duration:c.duration,crossfade:c.transition,world:c.visual.world,camera:c.visual.camera,bpm:c.state.bpm,automation:c.automation.length})),presetsAvailable:ALL_PRESETS.length}}
// Six complementary scenes, with a shared D-minor center and unhurried dissolves.
export function createVisualTour(){
 const scenes=[['Event Horizon','Event Horizon','Ice'],['Aurora Cathedral','Aurora Veils','Aurora'],['Wood & Stars','Prism Garden','Ice'],['Glass Canopy','Liquid Echoes','Aurora'],['Photon Rail','Resonance Field','Velvet'],['Homeward Through Stars','Wave Cathedral','Ice']];
 const cues=scenes.map(([name,world,look],i)=>{
  const state=getFactoryPreset(name);state.key=2;state.scale='Minor';
  const cue=makeCue(state,{id:`world-${i+1}`,duration:18,transition:4});
  cue.visual={...cue.visual,world,look,glow:90,speed:.6,camera:i%3===1?'Orbit':'Drift'};
  cue.automation.push({at:2,duration:14,path:'visual.zoom',value:1.08,curve:'smooth'});
  return cue;
 });
 return normalizeShow({type:'orbit-show',version:1,title:'Six Worlds — A Journey in Light',artist:'Drew Wichman',cinema:true,seed:20261011,tailSeconds:12,fadeIn:2,fadeOut:8,cues});
}
