import {validRestList,validTieBreaks,reconcileScoreRests} from './score-data.js';
import {validWrittenDuration} from './written-rhythm.js';
import {validDynamicTone} from './dynamics.js';
// Sections own notes; the ensemble owns instrument setup and mix.
// p.tracks is the editable working copy of the active section for the instrument,
// sequencer and notation editors. Capture it before switching or serializing.
const copy=value=>structuredClone(value);
const id=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);
const beats=p=>{const [n,d]=p.meter.split('/').map(Number);return n*4/d};
const validId=value=>typeof value==='string'&&/^[-a-zA-Z0-9_]{1,100}$/.test(value)&&!['__proto__','constructor','prototype'].includes(value);
export const SONG_LIMITS={sections:32,entries:64,repeats:16,bars:512,notes:200000};

export function ensureSong(p){
 if(p.sections)return p;
 const section={id:id(),name:'A',bars:p.bars,events:Object.fromEntries(p.tracks.map(t=>[t.id,copy(t.events)])),rests:Object.fromEntries(p.tracks.map(t=>[t.id,copy(t.rests||[])]))};
 p.sections=[section];p.activeSection=section.id;
 p.arrangement=[{id:id(),section:section.id,repeats:1,mutedTracks:[]}];
 return p;
}
export function syncSection(p){
 ensureSong(p);
 const active=p.sections.find(s=>s.id===p.activeSection);
 if(!active)throw Error('The active section is missing.');
 for(const t of p.tracks){reconcileScoreRests(t);if(t.events)for(const e of t.events)if(e.tieBreaks)e.tieBreaks=e.tieBreaks.filter(b=>b<(Number.isFinite(e.writtenDuration)?e.writtenDuration:Math.max(.25,Math.round(e.duration*4)/4)));}
 active.rests=Object.fromEntries(p.tracks.map(t=>[t.id,copy(t.rests||[])]));
 active.bars=p.bars;active.events=Object.fromEntries(p.tracks.map(t=>[t.id,copy(t.events)]));
 const ids=new Set(p.tracks.map(t=>t.id));
 for(const s of p.sections){for(const key of Object.keys(s.events))if(!ids.has(key))delete s.events[key];for(const key of Object.keys(s.rests||{}))if(!ids.has(key))delete s.rests[key];}
 for(const entry of p.arrangement)entry.mutedTracks=entry.mutedTracks.filter(key=>ids.has(key));
 return p;
}
export function hydrateSection(p,sectionId=p.activeSection){
 const s=p.sections.find(s=>s.id===sectionId);
 if(!s)throw Error('Choose an existing section.');
 p.activeSection=s.id;p.bars=s.bars;
 for(const t of p.tracks){t.events=copy(s.events[t.id]||[]);t.rests=copy(s.rests?.[t.id]||[]);}
 return s;
}
export function activateSection(p,sectionId){syncSection(p);return hydrateSection(p,sectionId)}
export function createSection(p,{name,source}={}){
 syncSection(p);
 if(p.sections.length>=SONG_LIMITS.sections)throw Error('A song can contain up to 32 reusable sections.');
 const original=source?p.sections.find(s=>s.id===source):null;
 if(source&&!original)throw Error('Choose an existing section to duplicate.');
 let next='';for(let n=0;!next;n++){const candidate=n<26?String.fromCharCode(65+n):'Section '+(n+1);if(!p.sections.some(s=>s.name===candidate))next=candidate;}
 const s={id:id(),name:String(name||next).trim().slice(0,40)||next,bars:original?.bars||p.bars,events:{}};
 if(original)s.events=Object.fromEntries(Object.entries(original.events).map(([track,events])=>[track,events.map(e=>({...copy(e),id:id()}))]));
 s.rests=original?Object.fromEntries(Object.entries(original.rests||{}).map(([track,rests])=>[track,rests.map(r=>({...copy(r),id:id()}))])):{};
 p.sections.push(s);return s;
}
export function deleteSection(p,sectionId){
 syncSection(p);
 if(p.sections.length===1)throw Error('Keep at least one section in your session.');
 p.sections=p.sections.filter(s=>s.id!==sectionId);
 p.arrangement=p.arrangement.filter(e=>e.section!==sectionId);
 if(p.activeSection===sectionId)hydrateSection(p,p.sections[0].id);
}
export function appendSection(p,sectionId){
 ensureSong(p);
 if(!p.sections.some(s=>s.id===sectionId))throw Error('Choose an existing section.');
 const entry={id:id(),section:sectionId,repeats:1,mutedTracks:[]};
 p.arrangement.push(entry);return entry;
}
export function moveEntry(p,entryId,to){
 const from=p.arrangement.findIndex(e=>e.id===entryId);
 if(from<0||!Number.isInteger(to)||to<0||to>=p.arrangement.length)return;
 const [entry]=p.arrangement.splice(from,1);p.arrangement.splice(to,0,entry);
}
export function songBars(p){return (p.arrangement||[]).reduce((n,e)=>n+(p.sections.find(s=>s.id===e.section)?.bars||0)*e.repeats,0)}
export function trimSections(p){
 syncSection(p);
 for(const s of p.sections){const end=s.bars*beats(p);for(const key of Object.keys(s.events))s.events[key]=s.events[key].filter(e=>e.beat<end).map(e=>({...e,duration:Math.min(e.duration,end-e.beat)}));}
 for(const s of p.sections){const end=s.bars*beats(p);for(const key of Object.keys(s.rests||{}))s.rests[key]=s.rests[key].filter(r=>r.beat<end).map(r=>({...r,duration:Math.min(r.duration,end-r.beat)}));for(const events of Object.values(s.events))for(const e of events)if(e.tieBreaks)e.tieBreaks=e.tieBreaks.filter(b=>b<Math.min(e.writtenDuration||e.duration,end-e.beat));}
 hydrateSection(p);
}
export function mapSectionNotes(p,fn){
 syncSection(p);
 for(const s of p.sections)for(const t of p.tracks)for(const e of s.events[t.id]||[])fn(e,t,s);
 hydrateSection(p);
}
export function validateSong(p){
 if(p.sections===undefined){if(p.arrangement!==undefined||p.activeSection!==undefined)throw Error('The project has incomplete song data.');return p;}
 const fail=message=>{throw Error(message||'The project contains invalid song sections.')};
 if(!Array.isArray(p.sections)||!p.sections.length||p.sections.length>32||!Array.isArray(p.arrangement)||p.arrangement.length>64)fail('Use up to 32 sections and 64 entries in the song form.');
 const trackIds=new Set(p.tracks.map(t=>t.id)),sections=new Map();let noteCount=0;
 for(const s of p.sections){
  if(!s||!validId(s.id)||sections.has(s.id)||typeof s.name!=='string'||!s.name.trim()||s.name.length>40||!Number.isInteger(s.bars)||s.bars<1||s.bars>64||!s.events||typeof s.events!=='object'||Array.isArray(s.events))fail();
  sections.set(s.id,s);
  if(s.rests!==undefined&&(!s.rests||typeof s.rests!=='object'||Array.isArray(s.rests)))fail('Invalid section rests.');
  for(const [track,rests]of Object.entries(s.rests||{})){if(!trackIds.has(track)||!validRestList(rests,s.bars*beats(p)))fail('A section contains an invalid written rest.');noteCount+=rests.length;}
  for(const [track,events] of Object.entries(s.events)){
   if(!validId(track)||!trackIds.has(track)||!Array.isArray(events)||events.length>20000)fail();
   const ids=new Set();noteCount+=events.length;
   for(const e of events){
    if(!e||!validTieBreaks(e)||!validId(e.id)||ids.has(e.id)||![e.beat,e.duration,e.note,e.velocity,e.shift??0].every(Number.isFinite)||e.beat<0||e.beat>=s.bars*beats(p)||e.duration<=0||e.duration>256||!Number.isInteger(e.note)||e.note<0||e.note>127||e.velocity<0||e.velocity>1||Math.abs(e.shift??0)>24||!validDynamicTone(e.dynamicTone)||!validWrittenDuration(e.writtenDuration))fail('A song section contains an invalid note.');
    ids.add(e.id);
   }
  }
 }
 if(!sections.has(p.activeSection)||sections.get(p.activeSection).bars!==p.bars)fail('The active section does not match the editor.');
 const entries=new Set();let expanded=0,total=0;
 for(const entry of p.arrangement){
  if(!entry||!validId(entry.id)||entries.has(entry.id)||!sections.has(entry.section)||!Number.isInteger(entry.repeats)||entry.repeats<1||entry.repeats>16||!Array.isArray(entry.mutedTracks)||entry.mutedTracks.length>p.tracks.length||entry.mutedTracks.some(key=>!trackIds.has(key))||new Set(entry.mutedTracks).size!==entry.mutedTracks.length)fail('The song form contains an invalid section, repeat count or entrance.');
  entries.add(entry.id);const s=sections.get(entry.section);total+=s.bars*entry.repeats;
  expanded+=Object.entries(s.events).reduce((n,[track,events])=>n+(entry.mutedTracks.includes(track)?0:events.length),0)*entry.repeats;
 }
 if(total>512)fail('Keep the full song within 512 measures. Reduce a repeat count or remove an appearance.');
 if(noteCount>200000||expanded>200000)fail('This arrangement is too large. Use fewer notes or repetitions.');
 return p;
}
export function compileSong(p){
 syncSection(p);validateSong(p);
 if(!p.arrangement.length)throw Error('Add a section to the song form first.');
 const {sections,arrangement,activeSection,...project}=p;
 const result={...copy(project),bars:songBars(p),sectionMarkers:[]};
 result.tracks=result.tracks.map(t=>({...t,events:[],rests:[]}));
 let bar=0;
 for(const entry of p.arrangement){
  const s=sections.find(s=>s.id===entry.section),length=s.bars*beats(p);
  for(let repeat=0;repeat<entry.repeats;repeat++){
   const offset=bar*beats(p);
   result.sectionMarkers.push({bar,beat:offset,name:s.name+(entry.repeats>1?' · '+(repeat+1)+'/'+entry.repeats:''),sectionId:s.id,entryId:entry.id,repetition:repeat+1,bars:s.bars});
   for(const t of result.tracks){
    if(entry.mutedTracks.includes(t.id))continue;
    for(const r of s.rests?.[t.id]||[])t.rests.push({...copy(r),id:entry.id+'-'+repeat+'-'+r.id,beat:offset+r.beat,duration:Math.min(r.duration,length-r.beat),sourceSection:s.id,sourceRest:r.id});
    for(const e of s.events[t.id]||[])t.events.push({...copy(e),id:entry.id+'-'+repeat+'-'+e.id,beat:offset+e.beat,duration:Math.min(e.duration,length-e.beat),...(Number.isFinite(e.writtenDuration)?{writtenDuration:Math.min(e.writtenDuration,length-e.beat)}:{}),sourceSection:s.id,sourceEvent:e.id});
   }
   bar+=s.bars;
  }
 }
 return result;
}
