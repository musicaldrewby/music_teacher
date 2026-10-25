import {assertFreeProject} from './edition.js';
import {validRestList,validTieBreaks} from './score-data.js';
import {validWrittenDuration} from './written-rhythm.js';
import {validateSong} from './song.js';
import {validDynamicTone} from './dynamics.js';
import {INSTRUMENTS,notesFor,noteName} from './music.js';
export {notesFor,noteName};
const order=["bass-xylophone", "alto-xylophone", "soprano-xylophone", "soprano-glockenspiel", "soprano-recorder", "hand-drums", "woodblock", "triangle"];
const details={castanets:'Hardwood shells · two acoustic strokes','side-drum':'Rope-tension snare · two acoustic strokes',timpani:'Tuned kettle drums · C2–A3','sopranino-recorder':'Bright F5–F7 · adapted soprano samples','bass-bars':'Eight deep wooden voices · C2–C3',tambourine:'Natural skin · crisp silver jingles',shakers:'Soft wooden shakers · short & long',maracas:'A natural pair · alternating shakes','sleigh-bells':'Brass bells · struck & shaken',cabasa:'Steel beads · soft & strong rubs',xylophones:'Warm wood · clear articulation',metallophones:'Satin metal · resonant sustain',glockenspiels:'Bright steel · delicate overtones',recorders:'Recorded woodwinds · expressive sustain','soprano-recorder':'Clear and singing · C5–C7','alto-recorder':'Warm and lyrical · F4–F6','tenor-recorder':'Rounded and mellow · C4–C6','bass-recorder':'Deep and breathy · F3–F5','hand-drums':'Five drums · lowest to highest',tubanos:'Three drums · original recordings',bongos:'A connected low and high pair','temple-blocks':'Five close-set wooden voices',gong:'Recorded gong · 30-second decay','wind-chimes':'Five recorded sweeps · up & down',triangle:'Open and muted strokes','suspended-cymbal':'Full crash and gentle strike','finger-cymbals':'A clear, singing chime',guiro:'Short and long scrapes',claves:'A dry, focused wood tone',woodblock:'Low and high wooden voices','agogo-bells':'Two metal bells · low & high',cowbell:'Ringing metal · open & muted',slapstick:'Hinged hardwood · a crisp clap',vibraslap:'A distinctive rattling decay'};
export const CATALOG=order.map(id=>{const i=INSTRUMENTS.find(x=>x.id===id);return {...i,name:id==='suspended-cymbal'?'Crash cymbal':i.name,category:i.zone==='drums'?'drums':i.zone,detail:details[id]||details[i.zone],short:i.name.replace('xylophone','xylo.').replace('metallophone','metal.').replace('glockenspiel','glock.')};});
export const getInstrument=id=>CATALOG.find(i=>i.id===id);
export const FAMILIES=[['all','All instruments'],['xylophones','Xylophones'],['glockenspiels','Glockenspiels'],['recorders','Recorders'],['drums','Drums & blocks'],['percussion','Small percussion'],['favorites','Favorites']];
export const isBarred=i=>i.shape==='bars'||i.shape==='bassbars';
export const KEYS=['a','s','d','f','g','h','j','k','l',';','\'','[',']'];
export const uid=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);
export const barBeats=p=>Number(p.meter.split('/')[0])*4/Number(p.meter.split('/')[1]);
export const totalBeats=p=>barBeats(p)*p.bars;
export const newProject=()=>({format:'orff-atelier',version:1,title:'Untitled session',composer:'',bpm:100,meter:'4/4',bars:4,key:'C',loop:true,master:.75,reverb:.18,delay:0,tracks:[]});
export const newTrack=instrument=>({id:uid(),instrument,name:getInstrument(instrument).name,volume:.8,pan:0,muted:false,solo:false,events:[],removed:[],pentatonic:false});
export function validateProject(data){
 assertFreeProject(data);
 if(!data||data.format!=='orff-atelier'||data.version!==1)throw Error('Choose a Mallet & Measure project file (.orff).');
 if(!Number.isFinite(data.bpm)||data.bpm<30||data.bpm>240||!['2/4','3/4','4/4','6/8'].includes(data.meter)||!Number.isInteger(data.bars)||data.bars<1||data.bars>64||!['C','G','F','Bb+F#'].includes(data.key))throw Error('The project has invalid song settings.');
 if(!Array.isArray(data.tracks)||data.tracks.length>64)throw Error('The project has too many tracks.');
 const p={...newProject(),...structuredClone(data)};p.title=String(p.title||'Untitled session').slice(0,100);p.composer=String(p.composer||'').slice(0,100);
 const ids=new Set();for(const t of p.tracks){if(!getInstrument(t.instrument)||typeof t.id!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(t.id)||ids.has(t.id)||!Array.isArray(t.events)||t.events.length>20000)throw Error('The project contains an invalid track.');ids.add(t.id);
  for(const k of ['volume','pan'])if(!Number.isFinite(t[k])||t[k]<(k==='pan'?-1:0)||t[k]>1)throw Error('Invalid track mix.');
  if(t.reverbSend!==undefined&&(!Number.isFinite(t.reverbSend)||t.reverbSend<0||t.reverbSend>1))throw Error('Invalid reverb send.');
  if(!validRestList(t.rests,totalBeats(p)))throw Error('The project contains an invalid written rest.');
  for(const e of t.events)if(!validTieBreaks(e)||typeof e.id!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(e.id)||![e.beat,e.duration,e.note,e.velocity,e.shift??0].every(Number.isFinite)||e.beat<0||e.beat>=totalBeats(p)||e.duration<=0||e.duration>256||e.note<0||e.note>127||!Number.isInteger(e.note)||e.velocity<0||e.velocity>1||Math.abs(e.shift??0)>24||!validDynamicTone(e.dynamicTone)||!validWrittenDuration(e.writtenDuration))throw Error('The project contains an invalid note.');
  t.removed=Array.isArray(t.removed)?t.removed.filter(n=>Number.isInteger(n)&&n>=0&&n<13):[];
 }
 for(const k of ['master','reverb','delay'])if(!Number.isFinite(p[k])||p[k]<0||p[k]>1)throw Error('Invalid master mix.');
 if(p.reverbDecay!==undefined&&(!Number.isFinite(p.reverbDecay)||p.reverbDecay<.3||p.reverbDecay>8))throw Error('Reverb decay must be between 0.3 and 8 seconds.');
 if(p.notation?.partOrder!==undefined){const order=p.notation.partOrder;if(!Array.isArray(order)||order.length>64||order.some(id=>typeof id!=='string')||new Set(order).size!==order.length)throw Error('Invalid score part order.');p.notation.partOrder=order.filter(id=>ids.has(id));}
 if(p.notation?.hideInactiveStaves!==undefined&&typeof p.notation.hideInactiveStaves!=='boolean')throw Error('Invalid inactive-staff setting.');
 validateSong(p);assertFreeProject(p);p.playbackScope='section';delete p.rehearsal;return p;
}
export function audibleTracks(p){const solo=p.tracks.some(t=>t.solo);return p.tracks.filter(t=>!t.muted&&(!solo||t.solo));}
export function quantizedBeat(beat,step,total){return Math.max(0,Math.min(total-step,Math.round(beat/step)*step));}
export function scoreProject(p){return {...p,tracks:p.tracks.map(t=>({...t,events:t.events.map(e=>({...e,score:{beat:Math.round(e.beat*4)/4,duration:e.duration,note:e.note,shift:e.shift||0}}))}))};}

export const RECORDER_KEYS=['a','w','s','e','d','f','t','g','y','h','u','j','k'];
// Classroom Orff written pitches; event pitches always remain sounding pitches.
// McGraw-Hill Spotlight on Music, Orff Introduction (Grade 3 sampler).
const writtenOffsets={'soprano-glockenspiel':-24,'alto-glockenspiel':-12,'soprano-xylophone':-12,'soprano-metallophone':-12,'bass-xylophone':12,'bass-metallophone':12,'bass-bars':24,'sopranino-recorder':-12,'soprano-recorder':-12,'bass-recorder':-12};
export const writtenOctave=i=>writtenOffsets[i.id]||0;
export const writtenClef=i=>i.family==='drum'?'percussion':['timpani','bass-recorder'].includes(i.id)?'bass':'treble';
export const octaveDescription=i=>{const offset=writtenOctave(i);return offset?`sounds ${Math.abs(offset)===24?'two octaves':'one octave'} ${offset<0?'higher':'lower'}`:'';};
