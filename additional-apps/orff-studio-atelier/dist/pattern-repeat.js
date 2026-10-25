import {shiftExpression} from './expression.js';
import {barBeats,totalBeats,uid} from './catalog.js';
import {writtenLength} from './score-data.js';
import {clearScoreSpan} from './score-selection.js';

const EPS=1e-7;
const endOf=(e,rest)=>e.beat+(rest?e.duration:Math.max(e.duration,writtenLength(e)));
function clipItem(e,from,to,rest){
 const start=Math.max(from,e.beat),end=Math.min(to,endOf(e,rest));
 if(end<=start+EPS)return null;
 const q={...structuredClone(e),id:uid(),beat:start};delete q.score;
 if(rest)q.duration=end-start;
 else if(start>e.beat+EPS||end<endOf(e,false)-EPS){
  q.duration=Math.max(.01,Math.min(end,e.beat+e.duration)-start);
  q.writtenDuration=Math.max(.25,Math.min(end,e.beat+writtenLength(e))-start);
  if(q.tieBreaks)q.tieBreaks=q.tieBreaks.map(b=>e.beat+b-start).filter(b=>b>EPS&&b<q.writtenDuration-EPS);
 }
 shiftExpression(q,0,to);return q;
}

// Measures are zero based and inclusive. Copies are independent project notes.
export function planPatternRepeat(p,track,first,last){
 if(!track||!Number.isInteger(first)||!Number.isInteger(last)||first<0||last<first||last>=p.bars)throw Error('Choose a valid range of source measures.');
 if(last===p.bars-1)throw Error('Choose a pattern ending before the last measure, or lengthen the section first.');
 const per=barBeats(p),from=first*per,to=(last+1)*per,end=totalBeats(p),length=to-from;
 const source={events:[],rests:[]};
 for(const [key,rest]of [['events',false],['rests',true]])source[key]=(track[key]||[]).map(e=>clipItem(e,from,to,rest)).filter(Boolean);
 if(!source.events.length&&!source.rests.length)throw Error('The selected measures are empty. Choose a pattern with notes or written rests.');
 const additions={events:[],rests:[]};
 for(let at=to;at<end-EPS;at+=length)for(const [key,rest]of [['events',false],['rests',true]])for(const e of source[key]){
  const q=clipItem(shiftExpression({...structuredClone(e),beat:at+e.beat-from},at-from,Math.min(at+length,end)),at,Math.min(at+length,end),rest);
  if(q)additions[key].push(q);
  if(additions[key].length>20000)throw Error('This repeat creates too many notes or rests. Use a shorter section.');
 }
 const conflicts=track.events.some(e=>e.beat<end-EPS&&endOf(e,false)>to+EPS)||(track.rests||[]).some(e=>e.beat<end-EPS&&endOf(e,true)>to+EPS);
 return {from,to,end,length,first,last,conflicts,...additions};
}

export function repeatPattern(p,track,first,last,{replace=false}={}){
 const plan=planPatternRepeat(p,track,first,last);
 if(plan.conflicts&&!replace)throw Error('The later measures contain music. Choose Replace later measures to continue.');
 const draft=structuredClone(track);
 if(plan.conflicts){clearScoreSpan(draft,plan.to,plan.end);draft.rests=draft.rests.filter(r=>r.beat<plan.to-EPS);}
 draft.events.push(...plan.events);draft.rests=[...(draft.rests||[]),...plan.rests];
 if(draft.events.length>20000||draft.rests.length>20000)throw Error('This repeat creates too many notes or rests. Use a shorter section.');
 draft.events.sort((a,b)=>a.beat-b.beat);draft.rests.sort((a,b)=>a.beat-b.beat);
 track.events=draft.events;track.rests=draft.rests;return plan;
}

export function extendSection(p,bars,repeatTrackIds=[]){
 if(!Number.isInteger(bars)||bars<=p.bars||bars>64)throw Error('Choose a longer section, up to 64 measures.');
 const ids=new Set(repeatTrackIds);
 if([...ids].some(id=>!p.tracks.some(t=>t.id===id)))throw Error('Choose an existing instrument part.');
 const target={...p,bars},drafts=p.tracks.filter(t=>ids.has(t.id)).map(t=>{
  const draft=structuredClone(t);repeatPattern(target,draft,0,p.bars-1,{replace:true});return draft;
 });
 for(const draft of drafts){const t=p.tracks.find(t=>t.id===draft.id);t.events=draft.events;t.rests=draft.rests;}
 p.bars=bars;
}
