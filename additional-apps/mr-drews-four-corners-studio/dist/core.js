export const VERSION = 2;
export const uid = () => globalThis.crypto?.randomUUID?.() || `fc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const clamp = (v, min, max) => Math.max(min, Math.min(max, Number(v) || 0));
export function clone(value){if(Array.isArray(value))return value.map(clone);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,clone(v)]));return value;}
export const LABELS = { numbers: ['1','2','3','4'], letters: ['A','B','C','D'], compass: ['N','S','E','W'], colors: ['Blue','Gold','Mint','Violet'] };
export function labelsFor(project){
  if(project.labels!=='colors')return LABELS[project.labels];
  if(project.settings.legacyColors)return ['Yellow','Red','Cyan','Purple'];
  return project.settings.theme==='sports'?['Blue','Red','Gold','Green']:LABELS.colors;
}
export function cornerColors(project){
  if(project.labels==='colors'){
    if(project.settings.legacyColors)return ['#9a771a','#b95650','#277d89','#8162a4'];
    if(project.settings.theme!=='sports')return ['#3a7cc2','#9c7d29','#398875','#8162a4'];
  }
  return ['#3a7cc2','#bc6254','#9c7d29','#398875'];
}
export const DEFAULT_SETTINGS = { theme:'sports',seconds:10,suspense:2.5,autoReveal:true,musicVolume:0.65,effectsVolume:0.35,reducedMotion:false,largeText:false };
export const RHYTHMS = [
  {id:'steady',name:'Four quarter notes',beats:[1,1,1,1]},
  {id:'first-pair',name:'Eighth notes on beat 1',beats:[.5,.5,1,1,1]},
  {id:'second-pair',name:'Eighth notes on beat 2',beats:[1,.5,.5,1,1]},
  {id:'third-pair',name:'Eighth notes on beat 3',beats:[1,1,.5,.5,1]},
  {id:'last-pair',name:'Eighth notes on beat 4',beats:[1,1,1,.5,.5]},
  {id:'two-pairs',name:'Eighth notes on beats 1 and 3',beats:[.5,.5,1,.5,.5,1]},
  {id:'half-notes',name:'Two half notes',beats:[2,2]},
  {id:'rest-ending',name:'Three quarters and a rest',beats:[1,1,1,{d:1,rest:true}]}
];
export const NOTES = ['C4','D4','E4','F4','G4','A4','B4','C5','D5','E5','F5','G5'];
export const INSTRUMENTS = ['trumpet','clarinet','violin','timpani','flute','guitar','xylophone','drum'];
export const DYNAMICS = ['pp','p','mp','mf','f','ff','crescendo','decrescendo'];
export function newSlide() {
  return { id:uid(),mode:'knowledge',question:'',centerType:'text',centerContent:'',graphic:null,sound:null,clip:{start:0,end:0},explanation:'',corners:Array.from({length:4},()=>({text:'',image:'',graphic:null,isCorrect:false})) };
}
export function newProject() { return {version:VERSION,id:uid(),name:'My Four Corners Game',rules:'all',labels:'numbers',settings:{...DEFAULT_SETTINGS},audio:{countdown:null,drumroll:null,happy:null,sad:null},assets:[],slides:[newSlide()],updatedAt:Date.now()}; }
const str = (v,max=5000) => typeof v==='string' ? v.slice(0,max) : '';
export function safeMedia(v) { return typeof v==='string' && /^(data:(image\/(png|jpe?g|gif|webp|svg\+xml|avif)|audio\/[a-z0-9.+-]+|video\/[a-z0-9.+-]+)[;,]|https?:\/\/)/i.test(v) ? v : ''; }
export function normalizeGraphic(g) {
  if(!g || typeof g!=='object') return null;
  const lists={rhythm:RHYTHMS.map(r=>r.id),note:NOTES,instrument:INSTRUMENTS,dynamic:DYNAMICS};
  return lists[g.kind]?.includes(g.value) ? {kind:g.kind,value:g.value} : null;
}
export function normalizeProject(raw) {
  if(!raw || typeof raw!=='object' || !Array.isArray(raw.slides) || !raw.slides.length) throw new Error('This file does not contain a Four Corners game. Choose a .4cr game file.');
  if(raw.slides.length>300) throw new Error('Please use a game with 300 rounds or fewer.');
  const p=newProject(),s=raw.settings||{};
  p.author=str(raw.author,120); p.id=str(raw.id,100)||uid(); p.name=str(raw.name,120)||'Imported Four Corners Game';
  p.rules=['safe','out','all'].includes(raw.rules)?raw.rules:'safe'; p.labels=Object.hasOwn(LABELS,raw.labels)?raw.labels:'numbers';
  p.settings={...DEFAULT_SETTINGS,theme:['sports','show','space','jungle'].includes(s.theme)?s.theme:'sports',seconds:s.seconds===undefined?10:clamp(s.seconds,3,120),suspense:s.suspense===undefined?2.5:clamp(s.suspense,0,6),autoReveal:!!s.autoReveal,musicVolume:s.musicVolume===undefined?.65:clamp(s.musicVolume,0,1),effectsVolume:s.effectsVolume===undefined?.35:clamp(s.effectsVolume,0,1),reducedMotion:!!s.reducedMotion,largeText:!!s.largeText};
  p.settings.legacyColors=!!s.legacyColors||(raw.version!==VERSION&&p.labels==='colors');
  for(const k of Object.keys(p.audio)) p.audio[k]=safeMedia(raw.audio?.[k])||null;
  const tracks=(Array.isArray(raw.audio?.countdownVariations)?raw.audio.countdownVariations:[]).slice(0,12).map(safeMedia).filter(Boolean);
  if(tracks.length)p.audio.countdownVariations=tracks;
  p.assets=(Array.isArray(raw.assets)?raw.assets:[]).slice(0,150).filter(a=>a&&safeMedia(a.src)).map(a=>({id:str(a.id,100)||uid(),name:str(a.name,120)||'Media',type:['audio','video'].includes(a.type)?a.type:'image',src:safeMedia(a.src)}));
  p.slides=raw.slides.map((s,i)=>{
    if(!s || !Array.isArray(s.corners) || s.corners.length!==4) throw new Error(`Round ${i+1} needs four corners. The file could not be opened.`);
    const slide=newSlide(); slide.id=uid(); slide.mode=['knowledge','prediction','roulette'].includes(s.mode)?s.mode:'knowledge';
    slide.question=str(s.question); slide.explanation=str(s.explanation); slide.centerType=['text','image','audio','video','graphic'].includes(s.centerType)?s.centerType:'text';
    slide.centerContent=slide.centerType==='text'?str(s.centerContent):safeMedia(s.centerContent); slide.graphic=normalizeGraphic(s.graphic);
    slide.clip={start:clamp(s.clip?.start,0,86400),end:clamp(s.clip?.end,0,86400)};
    if(s.sound?.type==='rhythm' && RHYTHMS.some(r=>r.id===s.sound.pattern)) slide.sound={type:'rhythm',pattern:s.sound.pattern,tempo:clamp(s.sound.tempo||100,40,200)};
    if(s.sound?.type==='melody' && Array.isArray(s.sound.notes)) slide.sound={type:'melody',notes:s.sound.notes.slice(0,32).map(n=>clamp(n,36,96)),tempo:clamp(s.sound.tempo||100,40,200)};
    let chosen=false;
    slide.corners=s.corners.map(c=>{const correct=!!c?.isCorrect&&!chosen;if(correct)chosen=true;return {text:str(c?.text,1200),image:safeMedia(c?.image),graphic:normalizeGraphic(c?.graphic),isCorrect:correct};});
    return slide;
  });
  p.updatedAt=Date.now();return p;
}
export function validateProject(p) {
  const errors=[];
  p.slides.forEach((s,i)=>{
    if(s.mode!=='roulette'&&!s.corners.some(c=>c.isCorrect)) errors.push({index:i,message:`Round ${i+1}: choose the correct corner.`});
    if(s.mode!=='roulette'&&s.corners.some(c=>!c.text.trim()&&!c.image&&!c.graphic)) errors.push({index:i,message:`Round ${i+1}: add text or a picture to all four corners.`});
    if(s.clip.end>0&&s.clip.end<=s.clip.start) errors.push({index:i,message:`Round ${i+1}: audio end must be after its start.`});
    if(['image','video'].includes(s.centerType)&&!s.centerContent) errors.push({index:i,message:`Round ${i+1}: add the prompt media or choose text.`});
    if(s.centerType==='audio'&&!s.centerContent&&!s.sound) errors.push({index:i,message:`Round ${i+1}: add audio or a built-in rhythm.`});
  });return errors;
}
export function shuffled(items,rng=Math.random) {const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function spinPath(winner,steps=20) {const order=[0,1,3,2];const target=order.indexOf(winner);const length=steps+((target-(steps-1)%4+4)%4);return Array.from({length},(_,i)=>order[i%4]);}
export function resultText(p,slide,winner) { const label=labelsFor(p)[winner]; if(p.rules==='out')return `Corner ${label} is out!`;if(p.rules==='safe')return `Corner ${label} is safe!`;return slide.mode==='roulette'?`Corner ${label} is selected!`:`Corner ${label} is correct!`; }
export function countdownSource(p,index=0){const tracks=p.audio.countdownVariations;return tracks?.length?tracks[Math.max(0,index)%tracks.length]:p.audio.countdown;}
export function hideMysteryContent(slide,state,edit=false){return slide.mode==='prediction'&&!edit&&state!=='revealed';}
export class RoundEngine {
  constructor(hooks={},scheduler={now:()=>performance.now(),set:(fn,ms)=>setTimeout(fn,ms),clear:id=>clearTimeout(id)}){this.hooks=hooks;this.scheduler=scheduler;this.jobs=new Set();this.epoch=0;this.state='idle';}
  later(fn,ms){const epoch=this.epoch;let id;id=this.scheduler.set(()=>{this.jobs.delete(id);if(epoch===this.epoch)fn();},ms);this.jobs.add(id);return id;}
  cancel(){this.epoch++;for(const id of this.jobs)this.scheduler.clear(id);this.jobs.clear();}
  stateTo(state){this.state=state;this.hooks.onState?.(state);}
  load(slide,settings){this.cancel();this.slide=slide;this.settings=settings;this.remaining=settings.seconds*1000;this.winner=null;this.lastTick=null;this.stateTo('choose');this.hooks.onTick?.(settings.seconds,1);}
  start(){if(!['choose','paused'].includes(this.state))return;this.cancel();this.deadline=this.scheduler.now()+this.remaining;this.stateTo('counting');this.pulse();}
  pulse(){this.remaining=Math.max(0,this.deadline-this.scheduler.now());const seconds=Math.ceil(this.remaining/1000);this.hooks.onTick?.(seconds,this.remaining/(this.settings.seconds*1000));if(seconds!==this.lastTick){this.lastTick=seconds;if(seconds>0)this.hooks.onSound?.('tick');}if(this.remaining<=0){this.stateTo('locked');this.hooks.onSound?.('lock');if(this.settings.autoReveal)this.later(()=>this.reveal(),600);return;}this.later(()=>this.pulse(),80);}
  pause(){if(this.state!=='counting')return;this.remaining=Math.max(0,this.deadline-this.scheduler.now());this.cancel();this.stateTo('paused');}
  reveal(){if(!['choose','paused','counting','locked'].includes(this.state))return;this.cancel();this.winner=this.slide.mode==='roulette'?Math.floor(Math.random()*4):this.slide.corners.findIndex(c=>c.isCorrect);if(this.winner<0){this.stateTo('choose');return;}this.stateTo('revealing');const duration=this.settings.reducedMotion?0:this.settings.suspense*1000;if(this.slide.mode==='roulette'&&duration>0){const path=spinPath(this.winner);const weights=path.map((_,i)=>.5+3*(i/path.length)**2);const sum=weights.reduce((a,b)=>a+b,0);let t=0;path.forEach((corner,i)=>{this.later(()=>{this.hooks.onSpin?.(corner);this.hooks.onSound?.('blip');},t);t+=duration*weights[i]/sum;});}else if(duration>0)this.hooks.onSound?.('suspense');this.later(()=>{this.stateTo('revealed');this.hooks.onReveal?.(this.winner);},duration);}
  stop(){this.cancel();this.stateTo('idle');}
}
