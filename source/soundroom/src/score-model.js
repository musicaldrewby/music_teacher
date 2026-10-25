import {TempoMap} from './tempo-map.js';
import {uid,clone,patchKey} from './sequencer-model.js';
export const MAX_PARTS=32,MAX_EVENTS=200000,MAX_BEATS=65536;
const num=(v,a,b,label,integer=false)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<a||v>b||integer&&!Number.isInteger(v))throw Error('Invalid '+label+'.');return v};
const list=(a,max,label)=>{if(!Array.isArray(a)||a.length>max)throw Error('Invalid '+label+'.');return a};
export function newPart(presets,program=0,drums=false,name='Part 1'){
 const patch=presets.find(p=>!!p.isGMGSDrum===drums&&p.program===program&&p.bankMSB===0&&p.bankLSB===0)||presets.find(p=>!!p.isGMGSDrum===drums);
 if(!patch)throw Error('Instrument is unavailable.');
 return {id:uid(),name,patch:clone(patch),volume:100,pan:64,reverb:55,mute:false,solo:false,notes:[],controllers:[],programs:[]};
}
export function createScore(presets){return {format:'soundroom-composition',version:1,id:uid(),name:'Untitled composition',length:16,tempo:120,tempoChanges:[],meters:[{beat:0,numerator:4,denominator:4}],markers:[],tracks:[newPart(presets)],master:65,notes:'',source:''}}
export function validateScore(raw,presets){
 if(raw?.format!=='soundroom-composition'||raw.version!==1)throw Error('Choose a Soundroom composition file.');
 const p={format:raw.format,version:1,id:typeof raw.id==='string'?raw.id.slice(0,100):uid(),name:String(raw.name||'Untitled composition').slice(0,100),length:num(raw.length,.001,MAX_BEATS,'song length'),tempo:num(raw.tempo,10,1000,'tempo'),master:num(raw.master??65,0,100,'master volume'),notes:String(raw.notes||'').slice(0,10000),source:String(raw.source||'').slice(0,2000)};
 p.tempoChanges=list(raw.tempoChanges||[],10000,'tempo map').map(x=>({beat:num(x.beat,0,p.length,'tempo position'),tempo:num(x.tempo,10,1000,'tempo'),curve:x.curve==='linear'?'linear':'step'})).sort((a,b)=>a.beat-b.beat);
 p.meters=list(raw.meters||[{beat:0,numerator:4,denominator:4}],1000,'meters').map(x=>({beat:num(x.beat,0,p.length,'meter position'),numerator:num(x.numerator,1,32,'meter numerator',true),denominator:num(x.denominator,1,32,'meter denominator',true)})).sort((a,b)=>a.beat-b.beat);
 if(!p.meters.length||p.meters[0].beat!==0||p.meters.some(m=>![1,2,4,8,16,32].includes(m.denominator)))throw Error('The meter map must begin at beat zero and use a power-of-two denominator.');
 p.markers=list(raw.markers||[],1000,'markers').map(x=>({id:uid(),beat:num(x.beat,0,p.length,'marker position'),name:String(x.name||'Section').slice(0,80)})).sort((a,b)=>a.beat-b.beat);
 let events=0;
 p.tracks=list(raw.tracks,MAX_PARTS,'parts').map((t,i)=>{
  const patch=presets.find(x=>t.patch&&patchKey(x)===patchKey(t.patch));if(!patch)throw Error('Part '+(i+1)+' has an unavailable instrument.');
  const out={id:typeof t.id==='string'?t.id.slice(0,100):uid(),name:String(t.name||'Part '+(i+1)).slice(0,64),patch:clone(patch),mute:!!t.mute,solo:!!t.solo};
  for(const k of ['volume','pan','reverb'])out[k]=num(t[k]??(k==='pan'?64:k==='reverb'?55:100),0,127,k,true);
  out.notes=list(t.notes,MAX_EVENTS,'notes').map(n=>{const start=num(n.start,0,p.length-.0000001,'note start'),duration=num(n.duration,.001,p.length,'note length');if(start+duration>p.length+.0001)throw Error('A note extends past the song end.');return{id:uid(),start,duration,pitch:num(n.pitch,0,127,'pitch',true),velocity:num(n.velocity,1,127,'velocity',true)}});
  out.controllers=list(t.controllers||[],MAX_EVENTS,'expression events').map(c=>{if(!['cc','bend','pressure'].includes(c.type))throw Error('Invalid expression event.');return {beat:num(c.beat,0,p.length,'expression position'),type:c.type,...(c.type==='cc'?{controller:num(c.controller,0,119,'controller',true)}:{}),value:num(c.value,0,c.type==='bend'?16383:127,'expression value',true)}});
  out.programs=list(t.programs||[],10000,'instrument changes').map(c=>({beat:num(c.beat,0,p.length,'instrument position'),program:num(c.program,0,127,'program',true)}));
  events+=out.notes.length*2+out.controllers.length+out.programs.length;return out;
 });
 if(!p.tracks.length||events>MAX_EVENTS)throw Error('Use 1–32 parts and no more than 200,000 events.');
 if(new TempoMap(p.tempo,p.tempoChanges).secondsAt(p.length)>14400)throw Error('Composition playback is limited to four hours.');return p;
}
export const audible=(p,i)=>!p.tracks[i].mute&&(!p.tracks.some(t=>t.solo)||p.tracks[i].solo);
export function compileComposition(p,{from=0,speed=1}={}){
 num(from,0,p.length-.0000001,'start position');num(speed,.25,2,'practice speed');
 const map=new TempoMap(p.tempo,p.tempoChanges),events=[];
 for(const [i,t] of p.tracks.entries()){
  if(!audible(p,i))continue;const channel=16+i,add=(beat,order,message)=>events.push({beat:beat-from,order,message,offset:channel});
  // Chase expression/program state and sustained notes when entering at a marker.
  const state=new Map();for(const c of [...t.controllers].sort((a,b)=>a.beat-b.beat))if(c.beat<from)state.set(c.type+':'+(c.controller??''),c);
  for(const c of [...state.values(),...t.controllers.filter(c=>c.beat>=from)]){const b=Math.max(from,c.beat);add(b,2,c.type==='cc'?[176,c.controller,c.value]:c.type==='bend'?[224,c.value&127,c.value>>7]:[208,c.value])}
  const programs=t.programs.filter(c=>c.beat<from);if(programs.length)add(from,1,[192,programs.at(-1).program]);for(const c of t.programs)if(c.beat>=from)add(c.beat,1,[192,c.program]);
  for(const n of t.notes){const end=n.start+n.duration;if(end<=from)continue;add(Math.max(from,n.start),4,[144,n.pitch,n.velocity]);add(end,0,[128,n.pitch,0])}
  add(p.length,5,[176,64,0]);add(p.length,5,[176,123,0]);
 }
 events.sort((a,b)=>a.beat-b.beat||a.order-b.order);
 const startPoint=map.point(from,'beat');const changes=[{beat:0,tempo:map.tempoAt(from)*speed,curve:startPoint.curve||'step'},...p.tempoChanges.filter(x=>x.beat>from).map(x=>({...x,beat:x.beat-from,tempo:x.tempo*speed}))];
 return {events,length:p.length-from,loop:false,secondsPerBeat:60/changes[0].tempo,tempoChanges:changes,countIn:0,clickVolume:0,clickTone:'click',clickAccent:false};
}
export function expressionRamp(track,from,to,start,end){
 num(from,0,MAX_BEATS,'ramp start');num(to,from+.001,MAX_BEATS,'ramp end');num(start,0,127,'expression',true);num(end,0,127,'expression',true);
 track.controllers=track.controllers.filter(c=>!(c.type==='cc'&&c.controller===11&&c.beat>=from&&c.beat<=to));
 const steps=Math.min(1024,Math.max(1,Math.ceil((to-from)*8)));
 for(let i=0;i<=steps;i++)track.controllers.push({beat:from+(to-from)*i/steps,type:'cc',controller:11,value:Math.round(start+(end-start)*i/steps)});
 track.controllers.sort((a,b)=>a.beat-b.beat);
}
export function scorePosition(p,beat){let measure=1,active=p.meters[0];for(const m of p.meters.slice(1)){if(m.beat>beat)break;measure+=Math.ceil((m.beat-active.beat)/(active.numerator*4/active.denominator));active=m}const unit=active.numerator*4/active.denominator,offset=Math.max(0,beat-active.beat);return {measure:measure+Math.floor(offset/unit),beat:1+(offset%unit)*active.denominator/4,meter:active.numerator+'/'+active.denominator}}
