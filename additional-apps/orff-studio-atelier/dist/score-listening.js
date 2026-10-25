import {totalBeats} from './catalog.js';
import {writtenLength} from './score-data.js';
import {scoreChordTiming} from './score-entry.js';
import {createPlayback,makePass} from './practice.js';

// A preview is a disposable snapshot. It never changes the song, mix or practice range.
export function scoreListeningPlan(project,track,state,selectedId=null){
 if(!track)throw Error('Choose an instrument part first.');
 const selection=state.selection||{},items=(selection.items||[]).filter(i=>i.rest?(track.rests||[]).some(r=>r.id===i.id):track.events.some(e=>e.id===i.id));
 let chosen=items;
 if(!chosen.length&&!selection.span){
  const anchor=track.events.find(e=>e.id===(state.tool==='chord'?state.chordId:selectedId))||track.events.find(e=>e.id===state.lastNote);
  if(anchor)chosen=track.events.filter(e=>Math.abs(e.beat-anchor.beat)<1e-7).map(e=>({id:e.id,whole:true,from:e.beat,to:e.beat+Math.max(e.duration,writtenLength(e))}));
 }
 if(!chosen.length&&!selection.span)throw Error('Select notes or measure numbers to hear them.');
 chosen=chosen.map(i=>{if(i.rest||!i.whole)return i;const e=track.events.find(e=>e.id===i.id),timing=scoreChordTiming(project,track,e);return {...i,from:e.beat,to:e.beat+Math.max(e.duration,timing.duration)};});
 const from=Math.max(0,selection.span?.from??Math.min(...chosen.map(i=>i.from))),to=Math.min(totalBeats(project),selection.span?.to??Math.max(...chosen.map(i=>i.to)));
 const events=chosen.filter(i=>!i.rest).flatMap(i=>{
  const source=track.events.find(e=>e.id===i.id),begin=i.whole?source.beat:Math.max(source.beat,i.from,from),end=Math.min(source.beat+source.duration,i.whole?to:i.to,to);
  return end>begin?[{...structuredClone(source),beat:begin,duration:begin===source.beat&&end===source.beat+source.duration?source.duration:end-begin}]:[];
 });
 if(!events.length||to<=from)throw Error('This selection contains only rests. Select some notes to hear.');
 const snapshot=structuredClone(project),previewTrack={...structuredClone(track),events,rests:[],muted:false,solo:false};
 snapshot.tracks=[previewTrack];
 return {project:snapshot,sourceTrack:structuredClone(track),from,to,noteIds:new Set(events.map(e=>e.id)),label:state.tool==='chord'&&!items.length?'Chord':selection.measures?'Selected measures':'Selection'};
}
export function createScoreListening(plan,now,loop=false){
 const tr=createPlayback(plan.project,{enabled:false,speed:1,countIn:false},plan.from,now,false);
 tr.range={...tr.range,a:plan.from,b:plan.to,first:plan.from};tr.repeat=loop;tr.passes=[makePass(tr,0,now+.12)];
 tr.scope='section';tr.scorePreview=true;tr.scoreSourceTrack=plan.sourceTrack;tr.scoreLabel=plan.label;tr.audible=new Set(plan.project.tracks.map(t=>t.id));tr.part=plan.project.tracks[0].id;tr.recorded=new Map();
 return tr;
}
