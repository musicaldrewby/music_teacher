import {recordSharingEnabled} from './record-sharing.js';
import {RAIL_ITEMS} from './railway.js';
import {TOOLS} from './equipment.js';
import {SOUNDS,sound,soundId,DEFAULT_PADS} from './catalog.js';
export const BLOCKS = {
  1:{name:'Meadow',color:'#62b943',category:'Landscape',texture:'grass'},
  2:{name:'Earth',color:'#8e5c3f',category:'Landscape',texture:'dirt'},
  3:{name:'Stone',color:'#879aaf',category:'Building',texture:'stone'},
  4:{name:'Oak log',color:'#774529',category:'Building',texture:'bark'},
  5:{name:'Oak leaves',color:'#48ad42',category:'Landscape',texture:'leaf'},
  6:{name:'Wood boards',color:'#d2964e',category:'Building',texture:'plank'},
  7:{name:'Brick',color:'#c94e42',category:'Building',texture:'brick'},
  8:{name:'Glass',color:'#9bdeff',category:'Building',texture:'glass',transparent:true},
  9:{name:'Terracotta',color:'#b93c40',category:'Building',texture:'roof'},
  10:{name:'Sand',color:'#f0d18a',category:'Landscape',texture:'sand'},
  11:{name:'White stone',color:'#e1eaf3',category:'Building',texture:'stone'},
  12:{name:'Copper leaves',color:'#f58a31',category:'Landscape',texture:'leaf'},
  13:{name:'Slate',color:'#465b89',category:'Building',texture:'stone'},
  14:{name:'Clay',color:'#9d8ba9',category:'Landscape',texture:'dirt'},
  15:{name:'Birch log',color:'#edece5',category:'Building',texture:'birch'},
  16:{name:'Deep blue',color:'#356cce',category:'Building',texture:'plank'},
  17:{name:'Rose plaster',color:'#df78a1',category:'Building',texture:'sand'},
  18:{name:'Path',color:'#b5834f',category:'Landscape',texture:'sand'},
  19:{name:'Moss stone',color:'#729e72',category:'Building',texture:'stone'},
  20:{name:'Walnut boards',color:'#653d34',category:'Building',texture:'plank'},
  21:{name:'Snow',color:'#edf7ff',category:'Landscape',texture:'snow'},
  22:{name:'Pine needles',color:'#218a61',category:'Landscape',texture:'leaf'},
  23:{name:'Sandstone',color:'#e4b65f',category:'Building',texture:'stone'},
  24:{name:'Gravel',color:'#7c8fa3',category:'Landscape',texture:'stone'},
  26:{name:'Cottonwood log',color:'#938273',category:'Building',texture:'bark'},
  27:{name:'Cottonwood leaves',color:'#85b358',category:'Landscape',texture:'leaf'},
  25:{name:'Blue shale',color:'#627fae',category:'Building',texture:'stone'},
  29:{name:'Buried instrument case',color:'#c59cff',category:'Discovery',texture:'relic'},
  28:{name:'Cactus',color:'#349548',category:'Landscape',texture:'bark'},
};
export const FURNITURE = {
  roofSlope:{name:'Shingled roof slope',color:'#b4644e',category:'Building'},
  beam:{name:'Exposed oak beam',color:'#9c6b46',category:'Building'},
  shutter:{name:'Louvered shutters',color:'#578e89',category:'Building'},
  sign:{name:'Painted shop sign',color:'#c29158',category:'Building'},
  minecart:{name:'Minecart',color:'#8998ad',category:'Railway'},
  bed:{name:'Bed',color:'#6588dc',category:'Furniture'},
  piano:{name:'Piano',color:'#5b4037',category:'Instruments',instrument:'piano'},
  marimba:{name:'Marimba',color:'#b48a51',category:'Instruments',instrument:'marimba'},
  drums:{name:'Drum kit',color:'#a6684c',category:'Instruments',instrument:'drums'},
  bells:{name:'Bells',color:'#dccb7a',category:'Instruments',instrument:'bells'},
  record:{name:'Record player',color:'#b27751',category:'Furniture'},
  gigPoster:{name:'Opening Night poster',color:'#e6aa76',category:'Furniture'},
  exchangeCrate:{name:recordSharingEnabled?'Station exchange crate':'Station record shelf',color:'#a687a5',category:'Furniture'},
  crate:{name:'Record crate',color:'#ab7852',category:'Furniture'},
  desk:{name:'Studio desk',color:'#4d6370',category:'Furniture'},
  bench:{name:'Bench',color:'#b58b5f',category:'Furniture'},
  torch:{name:'Torch',color:'#ffba5e',category:'Tools'},
  lantern:{name:'Lantern',color:'#edcc85',category:'Furniture'},
  door:{name:'Oak door',color:'#ad8557',category:'Furniture'},
  steps:{name:'Oak stairs',color:'#ba905f',category:'Furniture'},
  workbench:{name:'Crafting bench',color:'#957455',category:'Furniture'},
  planter:{name:'Flower box',color:'#b67667',category:'Furniture'},
};
export const ITEMS = {...BLOCKS,...FURNITURE,...RAIL_ITEMS,...TOOLS,stick:{name:'Sticks',color:'#d7a567',category:'Building',component:true}};
export const COLORS=['#ffb84d','#69b7ff','#f47cba','#ae8cff','#46d2b1','#ffdc55','#87d94e','#ff8368'];
export const INSTRUMENTS={...Object.fromEntries(SOUNDS.filter(s=>s.kind==='instrument').map(s=>[s.id,s.name])),drums:'Custom drum kit'};
export const SCALES={pentatonic:[0,2,4,7,9],major:[0,2,4,5,7,9,11],minor:[0,2,3,5,7,8,10],chromatic:[0,1,2,3,4,5,6,7,8,9,10,11]};
export const NAMES=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
export const DRUMS={36:'Kick',38:'Snare',42:'Closed hat',46:'Open hat',45:'Low tom',50:'High tom',39:'Clap',51:'Ride'};
export const noteName=n=>`${NAMES[((n%12)+12)%12]}${Math.floor(n/12)-1}`;
export const clamp=(n,a,b)=>Math.min(b,Math.max(a,Number(n)||0));
export const uid=()=>Math.random().toString(36).slice(2,10);
export function makeTrack(instrument=null,i=0){return {id:uid(),name:INSTRUMENTS[instrument]||'Empty track',instrument,color:COLORS[i%COLORS.length],volume:instrument==='bass'?.5:.7,pan:0,mute:false,solo:false,pads:instrument==='drums'?{...DEFAULT_PADS}:undefined,padLocks:{},notes:[]};}
export function equipFoundSound(track,piece){
  if(!piece)return;
  const drum=piece.kind==='drum';
  track.instrument=drum?'drums':piece.id;track.name=INSTRUMENTS[track.instrument];
  track.pads=drum?{[piece.note]:piece.id}:undefined;track.padLocks={};
}
export function emptySong(piece=null){const track=makeTrack();equipFoundSound(track,piece);return {id:uid(),title:'Untitled piece',bpm:96,bars:4,key:0,scale:'major',reverb:0,delay:0,tracks:[track]};}
export function demoSong(which=0){
  const s=emptySong();s.title=which?'By the Water':'First Light';s.bpm=which?84:100;s.tracks=[makeTrack('marimba',0),makeTrack('piano',1),makeTrack('bass',2),makeTrack('drums',3)];
  s.tracks[1].volume=.35;s.tracks[2].volume=.35;s.tracks[3].volume=.24;
  const phrase=which?[67,64,62,60,62,64,69,67,64,62,64,67,69,67,62,60]:[60,64,67,69,67,64,62,64,67,72,69,67,64,62,60,64];
  phrase.forEach((pitch,i)=>s.tracks[0].notes.push({s:i*4,p:pitch,d:i%4===3?3.3:2.8,v:.7+(i%4===0?.13:0)}));
  [[48,52,55],[45,48,52],[53,57,60],[55,59,62]].forEach((ch,b)=>{
    ch.forEach(p=>s.tracks[1].notes.push({s:b*16,p:p+12,d:14,v:.55}));
    [0,8].forEach(o=>s.tracks[2].notes.push({s:b*16+o,p:ch[0]-12,d:6,v:.65}));
    [0,8].forEach(o=>s.tracks[3].notes.push({s:b*16+o,p:36,d:1,v:.6}));
    [4,12].forEach(o=>s.tracks[3].notes.push({s:b*16+o,p:38,d:1,v:.38}));
    [0,2,4,6,8,10,12,14].forEach(o=>s.tracks[3].notes.push({s:b*16+o,p:42,d:1,v:o%4===0?.3:.18}));
  });return s;
}
export function normalizeSong(raw){
  if(!raw||!Array.isArray(raw.tracks)||raw.tracks.length>16)throw Error('This is not a valid composition.');
  const song={id:typeof raw.id==='string'?raw.id.slice(0,40):uid(),title:String(raw.title||'Untitled piece').slice(0,70),bpm:clamp(raw.bpm,40,220),bars:[1,2,4,8].includes(raw.bars)?raw.bars:4,key:clamp(raw.key,0,11)|0,scale:Object.hasOwn(SCALES,raw.scale)?raw.scale:'major',reverb:clamp(raw.reverb,0,.6),delay:clamp(raw.delay,0,.5),tracks:[]};
  song.tracks=raw.tracks.slice(0,16).map((t,i)=>({...makeTrack(Object.hasOwn(INSTRUMENTS,t.instrument)?t.instrument:null,i),name:String(t.name||INSTRUMENTS[t.instrument]||'Empty track').slice(0,35),volume:clamp(t.volume,0,1),pan:clamp(t.pan,-1,1),mute:!!t.mute,solo:!!t.solo,pads:t.instrument==='drums'?Object.fromEntries(Object.entries(t.pads&&typeof t.pads==='object'?t.pads:DEFAULT_PADS).filter(([n,id])=>Number.isInteger(+n)&&+n>=24&&+n<=96&&sound(id)?.kind==='drum').slice(0,48).map(([n,id])=>[n,soundId(id)])):undefined,padLocks:Object.fromEntries(Object.entries(t.padLocks||{}).filter(([n])=>+n>=24&&+n<=96).map(([n,v])=>[n,!!v])),notes:(Array.isArray(t.notes)?t.notes:[]).slice(0,4096).filter(n=>Number.isFinite(n.s)&&Number.isFinite(n.p)).map(n=>({s:clamp(n.s,0,127.999),p:clamp(n.p,t.instrument==='drums'?24:0,t.instrument==='drums'?96:127)|0,d:clamp(n.d,.125,128),v:clamp(n.v??.7,1/127,1)}))}));
  if(!song.tracks.length)song.tracks=[makeTrack()];return song;
}
export const RECIPES=[
 {item:6,count:4,cost:{log:1}}, {item:'stick',count:4,cost:{6:2}},
 {item:'woodPickaxe',count:1,cost:{6:3,stick:2}}, {item:'woodAxe',count:1,cost:{6:3,stick:2}}, {item:'woodShovel',count:1,cost:{6:1,stick:2}},
 {item:'workbench',count:1,cost:{6:4}},
 {item:'pickaxe',count:1,cost:{3:3,stick:2},bench:true}, {item:'axe',count:1,cost:{3:3,stick:2},bench:true}, {item:'shovel',count:1,cost:{3:1,stick:2},bench:true},
 {item:'torch',count:4,cost:{log:1,6:1}},
 {item:'rail',count:12,cost:{6:2,3:2}},{item:'railBend',count:4,cost:{6:1,3:1}},
 {item:'railGrade',count:4,cost:{6:2,3:2}},{item:'railSwitch',count:1,cost:{6:2,3:1}},
 {item:'minecart',count:1,cost:{6:4,3:3}},
 {item:'roofSlope',count:4,cost:{9:2,6:1}},{item:'beam',count:4,cost:{4:1}}, {item:'beam',count:4,cost:{26:1}},
 {item:'shutter',count:2,cost:{6:2}},{item:'sign',count:1,cost:{6:2}},
 {item:'gigPoster',count:1,cost:{6:1}},{item:'exchangeCrate',count:1,cost:{6:5}},
 {item:'crate',count:1,cost:{6:4}},
  {item:'bed',count:1,cost:{6:6,4:2}},

  {item:20,count:4,cost:{4:1,3:1}}, {item:8,count:4,cost:{10:3,3:1}}, {item:7,count:4,cost:{14:3}}, {item:9,count:4,cost:{14:2,3:1}},
 {item:'door',count:1,cost:{6:4}}, {item:'steps',count:2,cost:{6:3}}, {item:'bench',count:1,cost:{6:4}}, {item:'lantern',count:1,cost:{3:2,8:1}}, {item:'planter',count:1,cost:{6:2,2:1}},
 {item:'record',count:1,cost:{6:6,3:3}}, {item:'piano',count:1,cost:{6:8,3:4}}, {item:'marimba',count:1,cost:{6:6,4:2}}, {item:'drums',count:1,cost:{6:4,14:2}}, {item:'bells',count:1,cost:{3:6,6:2}}, {item:'desk',count:1,cost:{6:6,3:2}},
];
