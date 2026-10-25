// Optional composed phrases: chromatic pitches relative to the track's tonic,
// independent onset patterns and articulation for up to sixteen measures.
const clamp=(v,a,b,f)=>Number.isFinite(+v)?Math.max(a,Math.min(b,+v)):f;
export function sanitizePhrase(input,steps){
 if(!Array.isArray(input)||!input.length||input.length>16)throw Error('A composed phrase needs 1–16 measures.');
 return input.map((p,i)=>{
  if(!p||!Array.isArray(p.notes)||p.notes.length!==steps||!Array.isArray(p.pattern)||p.pattern.length!==steps)throw Error('Phrase measures must match the track’s step count.');
  return {label:String(p.label||`Measure ${i+1}`).slice(0,48),pattern:p.pattern.map(v=>[0,1,2].includes(v)?v:0),notes:p.notes.map(ns=>{if(!Array.isArray(ns)||ns.length>4)throw Error('Use up to four notes on a phrase step.');return ns.map(n=>Math.round(clamp(n,-24,48,0)))}),gates:Array.from({length:steps},(_,j)=>clamp(p.gates?.[j],5,1600,85))};
 });
}
export function phrasePage(t,count=0){return t.phrase?.[Math.floor(Math.max(0,count)/t.steps)%t.phrase.length];}
export function stepEvent(t,count){const page=phrasePage(t,count),step=count%t.steps;return {hit:(page?.pattern||t.pattern)[step],gate:page?page.gates[step]*t.gate/100:t.gate};}
export function composedNotes(t,s,count){const page=phrasePage(t,count);if(!page)return null;const base=(t.octave+1)*12+s.key;return page.notes[count%t.steps].map(n=>Math.max(0,Math.min(127,base+n)));}
export function soundingTracks(state,beat){return state.tracks.map(t=>{if(!t.phrase)return t;const step=t.mode==='poly'?state.bars*4/t.steps:.25,p=phrasePage(t,Math.floor((beat+1e-8)/step));return {...t,pattern:p.pattern};});}
const NAMES=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
export function formatPitches(notes,t,s){return notes.map(n=>{const m=(t.octave+1)*12+s.key+n;return NAMES[(m%12+12)%12]+(Math.floor(m/12)-1)}).join(' ');}
export function parsePitches(text,t,s){if(!text.trim()||text.trim()==='-')return [];const tokens=text.trim().split(/[\s,+]+/);if(tokens.length>4)throw Error('Use up to four notes, for example D4 F4 A4.');return tokens.map(token=>{const m=/^([A-Ga-g])([#♯b♭]?)(-?\d)$/.exec(token);if(!m)throw Error('Use note names with octaves, for example D4 F4 A4, or a dash for a rest.');const midi=({C:0,D:2,E:4,F:5,G:7,A:9,B:11})[m[1].toUpperCase()]+(['#','♯'].includes(m[2])?1:['b','♭'].includes(m[2])?-1:0)+(+m[3]+1)*12,offset=midi-((t.octave+1)*12+s.key);if(midi<0||midi>127||offset< -24||offset>48)throw Error('That note is outside this track’s range.');return offset;});}
