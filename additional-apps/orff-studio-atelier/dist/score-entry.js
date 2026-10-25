import {shiftExpression} from './expression.js';
// Score entry uses sounding pitches in the shared project and explicit written rhythms.
import {getInstrument,notesFor,writtenOctave,writtenClef,barBeats,totalBeats,scoreProject,uid} from './catalog.js';
import {notationEvents} from './notation.js';

export const ENTRY_VALUES=[{value:4,label:'Whole',key:'6'},{value:2,label:'Half',key:'5'},{value:1,label:'Quarter',key:'4'},{value:.5,label:'Eighth',key:'3'},{value:.25,label:'Sixteenth',key:'2'}];
const EPS=1e-7;
import {writtenLength} from './score-data.js';
export {writtenLength,validRestList,validTieBreaks} from './score-data.js';
export function entryPitches(p,t){
 const inst=getInstrument(t.instrument),offset=writtenOctave(inst);
 return notesFor(inst,p.key,t.pentatonic).filter(n=>n.enabled&&!t.removed?.includes(n.index)).map(n=>({...n,written:n.note+offset}));
}
export function staffStep(midi){
 // The score spells Eb, Ab and Bb with flats and C#/F# with sharps.
 const pc=((midi%12)+12)%12,index=[0,0,1,2,2,3,3,4,5,5,6,6][pc];
 return (Math.floor(midi/12)-1)*7+index;
}
export function pitchAtStaff(p,t,y,bottom,lineGap=10){
 const inst=getInstrument(t.instrument),choices=entryPitches(p,t);
 if(!choices.length)return null;
 if(inst.pads){const step=inst.pads.length===1?0:Math.max(0,Math.min(inst.pads.length-1,Math.round((bottom-y)/lineGap)));return choices.find(n=>n.index===step)||choices[0];}
 const low=writtenClef(inst)==='bass'?2*7+4:4*7+2,target=low+Math.round((bottom-y)/(lineGap/2));
 const rank=n=>Math.abs(staffStep(n.written)-target)*10+([0,2,4,5,7,9,11].includes(n.written%12)?0:1);
 return choices.reduce((best,n)=>rank(n)<rank(best)?n:best,choices[0]);
}
export function pitchForLetter(p,t,letter,around){
 const index='cdefgab'.indexOf(letter.toLowerCase());
 let choices=entryPitches(p,t).filter(n=>staffStep(n.written)%7===index);
 const natural=choices.filter(n=>n.written%12===[0,2,4,5,7,9,11][index]);if(natural.length)choices=natural;
 if(!choices.length)return null;
 return choices.reduce((a,b)=>Math.abs(b.written-around)<Math.abs(a.written-around)?b:a,choices[0]);
}
export function splitAround(events,start,end,{rests=false}={}){
 return events.flatMap(e=>{
  const span=rests?e.duration:Math.max(e.duration,writtenLength(e)),finish=e.beat+span;
  if(e.beat>=end-EPS||finish<=start+EPS)return [e];
  const parts=[];
  const fragment=(at,to,keepId)=>{
   const len=Math.round((to-at)*4)/4;if(len<.25-EPS)return;
   const q={...e,id:keepId?e.id:uid(),beat:at,duration:rests?len:Math.max(.01,Math.min(len,e.beat+e.duration-at))};
   if(!rests){q.writtenDuration=len;delete q.writtenDurationAuto;delete q.score;delete q.tieBreaks;}
   shiftExpression(q,0);parts.push(q);
  };
  if(e.beat<start-EPS)fragment(e.beat,start,true);
  if(finish>end+EPS&&(rests||e.beat+e.duration>end+EPS))fragment(end,finish,parts.length===0);
  return parts;
 });
}
export function removeRestsInSpan(track,start,end){track.rests=splitAround(track.rests||[],start,end,{rests:true});}
function validateEntry(p,t,{beat,duration,pitch,rest=false}){
 const total=totalBeats(p);
 if(!Number.isFinite(beat)||beat<0||beat>=total||Math.abs(beat*4-Math.round(beat*4))>EPS)throw Error('Choose an entry position inside the section.');
 if(!Number.isFinite(duration)||duration<.25||Math.abs(duration*4-Math.round(duration*4))>EPS)throw Error('Choose a supported note length.');
 if(beat+duration>total+EPS)throw Error('Add another measure, or choose a shorter length.');
 if(!rest&&!entryPitches(p,t).some(n=>n.note===pitch?.note&&(n.shift||0)===(pitch?.shift||0)))throw Error('Choose a pitch available on this instrument and bar setup.');
}
export function writeScoreEntry(p,t,{beat,duration,pitch,rest=false,velocity=.8,replaceId=null}){
 validateEntry(p,t,{beat,duration,pitch,rest});
 // Replace this span, retaining music on either side. A rest is an explicit silence.
 t.events=splitAround(t.events.filter(e=>e.id!==replaceId),beat,beat+duration);
 removeRestsInSpan(t,beat,beat+duration);
 const event={id:uid(),beat,duration};
 if(rest)t.rests.push(event);
 else{Object.assign(event,{note:pitch.note,shift:pitch.shift||0,velocity:velocity*(pitch.velocity??1),writtenDuration:duration});t.events.push(event);}
 t.events.sort((a,b)=>a.beat-b.beat);t.rests.sort((a,b)=>a.beat-b.beat);
 return event;
}
// Use the rhythm the student sees, including simplified recorded articulation.
export function scoreChordTiming(p,t,anchor){
 const score=scoreProject({...p,tracks:[t]}),printed=notationEvents(score,score.tracks[0],.25).find(e=>e.id===anchor.id);
 return {beat:printed?.beat??Math.round(anchor.beat*4)/4,duration:Math.max(.25,Math.round((printed?.duration??writtenLength(anchor))*4)/4)};
}
export function addScoreChordTone(p,t,{anchorId=null,beat,duration,pitch,velocity=.8}){
 const anchor=anchorId?t.events.find(e=>e.id===anchorId):null;
 if(anchorId&&!anchor)throw Error('Select a note to add harmony to.');
 if(anchor)({beat,duration}=scoreChordTiming(p,t,anchor));
 validateEntry(p,t,{beat,duration,pitch});
 // A repeated click must not layer another attack on an existing pitch.
 const existing=t.events.find(e=>Math.abs(Math.round(e.beat*4)/4-beat)<EPS&&e.note===pitch.note&&(e.shift||0)===(pitch.shift||0));
 if(existing)return {event:existing,added:false};
 const event={id:uid(),beat:anchor?.beat??beat,duration:anchor?.duration??duration,note:pitch.note,shift:pitch.shift||0,velocity:anchor?.velocity??velocity*(pitch.velocity??1),writtenDuration:duration};
 if(anchor?.tieBreaks?.length)event.tieBreaks=anchor.tieBreaks.filter(b=>b<duration-EPS);
 if(anchor?.articulations)event.articulations=[...anchor.articulations];
 if(anchor?.dynamicTone!==undefined)event.dynamicTone=structuredClone(anchor.dynamicTone);
 // Keep all existing voices and later notes; only explicit silence is consumed.
 removeRestsInSpan(t,beat,beat+duration);
 t.events.push(event);t.events.sort((a,b)=>a.beat-b.beat);
 return {event,added:true};
}
export function tieScoreNotes(t,id){
 const first=t.events.find(e=>e.id===id);if(!first)throw Error('Select the first note to tie.');
 const length=writtenLength(first),boundary=first.beat+length;
 const next=t.events.find(e=>e.id!==id&&Math.abs(e.beat-boundary)<EPS&&e.note===first.note&&(e.shift||0)===(first.shift||0));
 if(!next)throw Error('A tie needs an adjacent note of the same pitch and stroke.');
 const end=boundary+writtenLength(next);
 if((t.rests||[]).some(r=>r.beat<end-EPS&&r.beat+r.duration>first.beat+EPS))throw Error('Remove the rest between these notes before tying.');
 first.tieBreaks=[...(first.tieBreaks||[]),length,...(next.tieBreaks||[]).map(b=>b+length)];
 first.duration=first.writtenDuration=end-first.beat;delete first.writtenDurationAuto;delete first.score;
 t.events=t.events.filter(e=>e.id!==next.id);return first;
}
export function untieScoreNote(t,id){
 const e=t.events.find(e=>e.id===id);if(!e?.tieBreaks?.length)throw Error('Select a note with a manually added tie.');
 const bounds=[0,...e.tieBreaks,writtenLength(e)];
 const notes=bounds.slice(0,-1).map((from,i)=>{const n={...e,id:i?uid():e.id,beat:e.beat+from,duration:bounds[i+1]-from,writtenDuration:bounds[i+1]-from};delete n.tieBreaks;delete n.writtenDurationAuto;delete n.score;shiftExpression(n,0);return n;});
 t.events=t.events.filter(n=>n.id!==id).concat(notes).sort((a,b)=>a.beat-b.beat);return notes;
}
export function scoreBeatX(geometry,beat){
 const points=geometry.points;let a=points[0],b=points.at(-1);
 for(let i=1;i<points.length;i++)if(points[i].beat>=beat-EPS){a=points[i-1];b=points[i];break;}
 return a.x+(b.x-a.x)*Math.max(0,Math.min(1,(beat-a.beat)/(b.beat-a.beat||1)));
}
export function scoreXBeat(geometry,x,snap=.25){
 const points=geometry.points;let a=points[0],b=points.at(-1);
 for(let i=1;i<points.length;i++)if(points[i].x>=x){a=points[i-1];b=points[i];break;}
 const raw=a.beat+(b.beat-a.beat)*Math.max(0,Math.min(1,(x-a.x)/(b.x-a.x||1)));
 return Math.max(geometry.start,Math.min(geometry.end-snap,Math.round(raw/snap)*snap));
}
