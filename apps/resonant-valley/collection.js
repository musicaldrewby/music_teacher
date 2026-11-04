import {SOUNDS,sound,soundId,DEFAULT_PADS} from './catalog.js';
import {discoveryKey,discoverySites,firstCasePosition} from './discovery-sites.js';
import {TerrainGenerator} from './terrain.js';
export const RARITY_COLORS={common:'#a9bdcf',uncommon:'#79d4b4',rare:'#b6a0ff',legendary:'#ffce72'};
const rank={common:0,uncommon:1,rare:2,legendary:3};
export const hash=text=>{let n=2166136261;for(const ch of String(text)){n^=ch.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;};
export const trackPrice=capacity=>capacity>=16?0:capacity<4?50:capacity<8?90:capacity<12?150:220;
export const expansionCost=capacity=>({3:12+capacity*2,4:4+Math.floor(capacity/2),14:4+Math.floor(capacity/3)});
const knownSound=id=>typeof id==='string' && ['instrument','drum'].includes(sound(id)?.kind);
export function newCollection(){
 return {version:2,id:Math.random().toString(36).slice(2),owned:[],capacity:1,credits:0,mixer:false,reverb:false,delay:false,starter:false,claimed:[],recent:[],dry:0,rareDry:0};
}

// The old ledger listed piano for everyone. A natural piano roll was recorded
// as a duplicate, so check the claimed cases before taking that sound away.
function previouslyFoundPiano(claims,{generator:config,habitats=true}={}){
 const common=SOUNDS.filter(s=>s.kind==='instrument'&&s.rarity==='common');
 const generators=new Map();let sawStarter=false;
 for(const key of claims){
  const match=/^1\|(.+)\|(starter|(?:case|buried):(-?\d+):(-?\d+))$/s.exec(key);
  if(!match)continue;
  const [,seed,id,cx,cz]=match;
  if(id==='starter'&&!sawStarter){sawStarter=true;continue;} // The original first case excluded piano.
  if(hash(key+'rarity')%100>=55||hash(key+'kind')%100<58||common[hash(key+'sound')%common.length].id!=='piano')continue;
  let generator=generators.get(seed);
  if(!generator){
   // Heights and case positions depend on seed and legacy layout, never player builds.
   generator=new TerrainGenerator({seed,firstCaseVersion:1,caseLayoutVersion:1,legacy:config?.seed===seed?!!config.legacy:seed==='Original valley'});
   generators.set(seed,generator);
  }
  const starter=id==='starter'?firstCasePosition(generator):null;
  const bx=starter?Math.floor(starter.x/16):Number(cx),bz=starter?Math.floor(starter.z/16):Number(cz);
  const site=discoverySites(generator,bx,bz).find(s=>s.id===id);
  if(site&&(!habitats||cacheReward(generator,site).id==='piano'))return true;
 }
 return false;
}
export function normalizeCollection(raw,history={}){
 const p=newCollection();
 if(raw?.version!==1&&raw?.version!==2)return p;
 p.id=String(raw.id||p.id).slice(0,64);
 p.claimed=[...new Set((Array.isArray(raw.claimed)?raw.claimed:[]).filter(k=>typeof k==='string'&&k.length<160))].slice(0,50000);
 const recent=(Array.isArray(raw.recent)?raw.recent:[]).filter(knownSound).map(soundId).slice(0,12);
 const recorded=(Array.isArray(raw.owned)?raw.owned:[]).filter(knownSound).map(soundId);
 // Old pre-collection imports could infer ownership just from a composition.
 // Preserve their notes, but only a discovery ledger grants sounds.
 p.owned=[...new Set(raw.version===1&&!p.claimed.length?recent:recorded)];
 if(raw.version===1&&p.owned.includes('piano')&&!recent.includes('piano')&&!previouslyFoundPiano(p.claimed,history))p.owned=p.owned.filter(id=>id!=='piano');
 p.recent=recent.filter(id=>p.owned.includes(id));
 p.capacity=Math.floor(Math.max(1,Math.min(16,Number(raw.capacity)||1)));
 p.credits=Math.max(0,Math.min(999999,Number(raw.credits)||0))|0;
 for(const key of ['mixer','reverb','delay','starter'])p[key]=!!raw[key]&&(raw.version===2||p.claimed.length>0);
 p.dry=Math.max(0,Math.min(4,raw.dry|0));p.rareDry=Math.max(0,Math.min(12,raw.rareDry|0));
 return p;
}
export const hasSound=(p,id)=>id==='drums'?p.owned.some(key=>sound(key)?.kind==='drum'):knownSound(id)&&p.owned.includes(soundId(id));
export const capacity=p=>p.capacity;
export function ownedPads(p){return Object.fromEntries(Object.entries(DEFAULT_PADS).filter(([,id])=>hasSound(p,id)));}
export const habitatFamilies={forest:['Reeds','Flutes'],taiga:['Strings','Ensembles'],alpine:['Chromatic percussion','Strings'],wetland:['Percussion','Tom','Hat'],desert:['World instruments','Guitars'],beach:['Brass','Cymbal'],river:['Flutes','Reeds']};
export function cacheReward(generator,site){
 const seed=discoveryKey(generator,site),roll=hash(seed+'rarity')%100;
 const rarity=roll<55?'common':roll<85?'uncommon':roll<98?'rare':'legendary';
 const kind=hash(seed+'kind')%100;
 if(kind<10)return {kind:'expansion',name:'Track expansion',rarity:'uncommon'};
 if(kind<16)return {kind:'mixer',name:'Mixer · volume and pan',rarity:'uncommon'};
 if(kind<21)return {kind:'reverb',name:'Reverb processor',rarity:'uncommon'};
 if(kind<26)return {kind:'delay',name:'Echo processor',rarity:'rare'};
 let pool=SOUNDS.filter(s=>s.rarity===rarity&&(kind<58?s.kind==='drum':s.kind==='instrument'));
 if(!pool.length)pool=SOUNDS.filter(s=>s.rarity===rarity);
 const biome=Number.isFinite(site.x)&&Number.isFinite(site.z)?generator.column?.(site.x,site.z)?.biome:null,favored=pool.filter(s=>habitatFamilies[biome]?.includes(s.family));
 if(favored.length&&hash(seed+'habitat')%4!==0)pool=favored;
 const s=pool[hash(seed+'sound')%pool.length];return {...s,kind:'sound'};
}
export function claimCache(current,generator,site){
 const key=discoveryKey(generator,site);if(current.claimed.includes(key))return null;
 const p=structuredClone(current),rewards=[];p.claimed.push(key);let added=false,rare=false;
 const grant=r=>{let duplicate=false;
  if(r.kind==='sound'){duplicate=p.owned.includes(r.id);if(!duplicate){p.owned.push(r.id);p.recent=[r.id,...p.recent.filter(id=>id!==r.id)].slice(0,12);}}
  if(r.kind==='expansion'){duplicate=p.capacity>=16;if(!duplicate)p.capacity++;}
  if(r.kind==='reverb'){duplicate=p.reverb;p.reverb=true;}
  if(r.kind==='delay'){duplicate=p.delay;p.delay=true;}
  if(r.kind==='mixer'){duplicate=p.mixer;p.mixer=true;}
  if(duplicate)p.credits+=12;else added=true;
  if(rank[r.rarity]>=2)rare=true;rewards.push({...r,duplicate});
 };
 if(site.starter&&!p.starter){
  p.starter=true;
  const pool=SOUNDS.filter(s=>s.kind==='instrument'&&s.rarity==='common'&&!p.owned.includes(s.id));
  const choice=pool[hash(key+'first-sound')%pool.length];
  if(choice)grant({...choice,kind:'sound'});
  else{p.credits+=12;rewards.push({kind:'credits',name:'12 collection credits',rarity:'common'});}
  return {profile:p,rewards,credits:p.credits-current.credits};
 }

 const reward=cacheReward(generator,site);grant(reward);p.credits+=8+hash(key+'credits')%13;
 if(p.dry>=4&&!added){const pool=SOUNDS.filter(s=>!p.owned.includes(s.id)&&rank[s.rarity]<=rank[reward.rarity]);if(pool.length)grant({...pool[hash(key+'new')%pool.length],kind:'sound',bonus:true});}
 if(p.rareDry>=12&&!rare){const pool=SOUNDS.filter(s=>s.rarity==='rare'&&!p.owned.includes(s.id));if(pool.length)grant({...pool[hash(key+'rare')%pool.length],kind:'sound',bonus:true});}
 p.dry=added?0:Math.min(4,p.dry+1);p.rareDry=rare?0:Math.min(12,p.rareDry+1);
 return {profile:p,rewards,credits:p.credits-current.credits};
}

// Apply collection permissions to playback/export without altering saved music.
// Ownership is shared across building modes.
export function playableSong(song,p){
 return {...song,reverb:p.reverb?song.reverb:0,delay:p.delay?(song.delay||0):0,tracks:song.tracks.map((t,i)=>{
  const available=i<p.capacity&&hasSound(p,t.instrument),pads=t.instrument==='drums'?Object.fromEntries(Object.entries(t.pads||DEFAULT_PADS).filter(([,id])=>hasSound(p,id))):t.pads;
  return {...t,pads,notes:available?t.notes.filter(n=>t.instrument!=='drums'||pads[n.p]):[],mute:!available||t.mute,solo:available&&p.mixer&&t.solo,volume:p.mixer?t.volume:.7,pan:p.mixer?t.pan:0};
 })};
}
