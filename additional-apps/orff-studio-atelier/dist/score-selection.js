import {shiftExpression} from './expression.js';
import {uid,barBeats,totalBeats,getInstrument,writtenOctave} from './catalog.js';
import {writtenLength,reconcileScoreRests} from './score-data.js';
import {entryPitches} from './score-entry.js';
const EPS=1e-7;
const length=(e,rest)=>rest?e.duration:Math.max(writtenLength(e),e.duration);
export const scoreSelectionItem=(e,rest=false)=>({id:e.id,rest,whole:true,from:e.beat,to:e.beat+(rest?e.duration:writtenLength(e))});
export function mergeScoreSelection(items){
 const result=[];
 for(const item of items.filter(x=>x.to>x.from+EPS).sort((a,b)=>Number(a.rest)-Number(b.rest)||a.id.localeCompare(b.id)||a.from-b.from)){
  const last=result.at(-1);
  if(last&&last.id===item.id&&last.rest===item.rest&&last.to>=item.from-EPS){last.to=Math.max(last.to,item.to);last.whole=!!last.whole||!!item.whole;}
  else result.push({...item});
 }
 return result;
}
export function scoreSelectionSpan(track,from,to){
 return [...track.events.map(e=>({...scoreSelectionItem(e),to:e.beat+length(e,false)})),...(track.rests||[]).map(e=>scoreSelectionItem(e,true))].filter(e=>e.from<to-EPS&&e.to>from+EPS).map(e=>({...e,whole:false,from:Math.max(from,e.from),to:Math.min(to,e.to)}));
}
export function toggleScoreSelection(items,item){
 const included=items.some(x=>x.id===item.id&&x.rest===item.rest&&x.from<=item.from+EPS&&x.to>=item.to-EPS);
 if(!included)return mergeScoreSelection([...items,item]);
 return items.flatMap(x=>x.id!==item.id||x.rest!==item.rest||x.to<=item.from||x.from>=item.to?[x]:[...(x.from<item.from?[{...x,whole:false,to:item.from}]:[]),...(x.to>item.to?[{...x,whole:false,from:item.to}]:[])]);
}
function fragment(e,from,to,rest,keepId=false){
 const q={...structuredClone(e),id:keepId?e.id:uid(),beat:from,duration:rest?to-from:Math.max(.01,Math.min(to-from,e.duration-(from-e.beat)))};
 if(!rest){
  q.writtenDuration=Math.max(.25,Math.round(Math.min(to-from,Math.max(0,e.beat+writtenLength(e)-from))*4)/4);
  delete q.writtenDurationAuto;delete q.score;
  if(q.tieBreaks)q.tieBreaks=q.tieBreaks.map(b=>e.beat+b-from).filter(b=>b>EPS&&b<q.writtenDuration-EPS);
 }
 shiftExpression(q,0);return q;
}
function subtractEvent(e,cuts,rest){
 let ranges=[[e.beat,e.beat+length(e,rest)]];
 for(const cut of cuts)ranges=ranges.flatMap(([a,b])=>cut.to<=a+EPS||cut.from>=b-EPS?[[a,b]]:[...(cut.from>a+EPS?[[a,cut.from]]:[]),...(cut.to<b-EPS?[[cut.to,b]]:[])]);
 // An articulation tail alone is not a new written note after a deletion.
 if(!rest)ranges=ranges.filter(([a])=>a<e.beat+writtenLength(e)-EPS);
 return ranges.map(([a,b],i)=>fragment(e,a,b,rest,i===0));
}
function addSilence(track,spans){
 track.rests??=[];
 const occupied=[...track.rests.map(r=>[r.beat,r.beat+r.duration]),...track.events.map(e=>[Math.floor((e.beat+EPS)*4)/4,Math.ceil((e.beat+Math.max(e.duration,writtenLength(e))-EPS)*4)/4])];
 for(const s of spans){
  let ranges=[[Math.max(0,Math.floor((s.from+EPS)*4)/4),Math.ceil((s.to-EPS)*4)/4]];
  for(const [a,b] of occupied)ranges=ranges.flatMap(([x,y])=>b<=x+EPS||a>=y-EPS?[[x,y]]:[...(a>x+EPS?[[x,a]]:[]),...(b<y-EPS?[[b,y]]:[])]);
  for(const [beat,end]of ranges)if(end-beat>=.25-EPS){track.rests.push({id:uid(),beat,duration:end-beat});occupied.push([beat,end]);}
 }
 track.rests.sort((a,b)=>a.beat-b.beat);
}
export function deleteScoreSelection(track,items){
 const chosen=mergeScoreSelection(items);
 for(const [key,rest]of [['events',false],['rests',true]])track[key]=(track[key]||[]).flatMap(e=>{
  const cuts=chosen.filter(s=>s.id===e.id&&s.rest===rest);return cuts.some(c=>c.whole)?[]:cuts.length?subtractEvent(e,cuts,rest):[e];
 });
 addSilence(track,chosen.filter(s=>!s.rest));
}
export function clearScoreSpan(track,from,to){
 deleteScoreSelection(track,scoreSelectionSpan(track,from,to));addSilence(track,[{from,to}]);
}
export function removeScoreMeasures(p,first,last=first){
 if(!Number.isInteger(first)||!Number.isInteger(last)||first<0||last<first||last>=p.bars)throw Error('Select an existing measure.');
 const count=last-first+1;if(count>=p.bars)throw Error('Keep at least one measure. Use Clear to empty the section.');
 const per=barBeats(p),from=first*per,to=(last+1)*per,amount=to-from;
 const collapse=x=>x<=from?x:x>=to?x-amount:from;
 for(const track of p.tracks)for(const [key,rest]of [['events',false],['rests',true]])track[key]=(track[key]||[]).flatMap(e=>{
  const expr=q=>{for(const key of ['hairpin','slur'])if(q[key])q[key]={...q[key],endBeat:collapse(q[key].endBeat)};return shiftExpression(q,0);};
  if(e.beat+length(e,rest)<=from+EPS)return [expr(e)];
  if(e.beat>=to-EPS)return [expr({...e,beat:e.beat-amount})];
  const beat=collapse(e.beat),written=collapse(e.beat+(rest?e.duration:writtenLength(e)))-beat;
  if(written<EPS)return [];
  const q={...e,beat,duration:rest?written:Math.max(.01,collapse(e.beat+e.duration)-beat)};
  if(!rest){q.writtenDuration=written;delete q.writtenDurationAuto;delete q.score;if(e.tieBreaks)q.tieBreaks=[...new Set(e.tieBreaks.map(b=>collapse(e.beat+b)-beat))].filter(b=>b>EPS&&b<written-EPS);}
  return [expr(q)];
 });
 p.bars-=count;
}
export function copyScoreSelection(p,track,items,span=null){
 const selected=mergeScoreSelection(items),from=span?.from??Math.min(...selected.map(e=>e.from)),to=span?.to??Math.max(...selected.map(e=>e.to));
 if(!Number.isFinite(from)||!Number.isFinite(to)||to<=from)throw Error('Select notes or a measure to copy.');
 const clip={instrument:track.instrument,length:to-from,events:[],rests:[]};
 for(const item of selected){const source=(item.rest?track.rests:track.events)?.find(e=>e.id===item.id);if(!source)continue;const e=item.whole?{...structuredClone(source),id:uid(),...(!item.rest?{writtenDuration:writtenLength(source)}:{})}:fragment(source,item.from,item.to,item.rest);delete e.writtenDurationAuto;delete e.score;e.beat-=from;shiftExpression(e,-from,clip.length);clip[item.rest?'rests':'events'].push(e);}
 addSilence(clip,[{from:0,to:clip.length}]);return clip;
}
export function pasteScoreSelection(p,track,clip,at){
 if(!clip)throw Error('Copy some music first.');
 if(at<0||at+clip.length>totalBeats(p)+EPS)throw Error('Add enough measures for the copied phrase before pasting.');
 const source=getInstrument(clip.instrument),target=getInstrument(track.instrument),choices=entryPitches(p,track),notes=clip.events.map(e=>{
  if((source.pads||target.pads)&&source.id!==target.id)throw Error('Paste percussion into the same kind of instrument to preserve its strokes.');
  const note=e.note+writtenOctave(source)-writtenOctave(target),pitch=choices.find(n=>n.note===note&&(n.shift||0)===(e.shift||0));
  if(!pitch)throw Error('This phrase contains a pitch unavailable in the selected part.');
  return shiftExpression({...structuredClone(e),id:uid(),beat:at+e.beat,note:pitch.note,shift:pitch.shift||0},at,totalBeats(p));
 });
 const draft=structuredClone(track);clearScoreSpan(draft,at,at+clip.length);
 // Remove the temporary silence before adding the copied notes and rests.
 draft.rests=(draft.rests||[]).flatMap(e=>subtractEvent(e,[{from:at,to:at+clip.length}],true));
 draft.events.push(...notes);draft.rests.push(...clip.rests.map(e=>({...structuredClone(e),id:uid(),beat:at+e.beat})));
 draft.events.sort((a,b)=>a.beat-b.beat);draft.rests.sort((a,b)=>a.beat-b.beat);reconcileScoreRests(draft);
 track.events=draft.events;track.rests=draft.rests;return notes;
}
