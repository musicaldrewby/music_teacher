import {drawExpression} from './expression-view.js';
import {scoreTracks,scorePartLabel} from './score-order.js';
import {writtenDuration} from './written-rhythm.js';
import {byId,beatsPerBar,loopBeats,noteName} from './music.js';
import {writtenOctave,writtenClef,octaveDescription} from './catalog.js';
const names=['c','c#','d','eb','e','f','f#','g','ab','a','bb','b'];
export const writtenKey=n=>`${names[n%12]}/${Math.floor(n/12)-1}`;
export function notationEvents(pattern,track,grid=.5){
 const total=loopBeats(pattern),inst=byId(track.instrument),ordered=track.events.map((e,index)=>({e,index,beat:Math.max(0,Math.min(total-(e.score?.beat!==undefined?.25:grid),e.score?.beat??Math.round(e.beat/grid)*grid))})).sort((a,b)=>a.beat-b.beat);
 return ordered.filter(({e})=>!e.score?.hidden).map(({e,index,beat})=>{
  const next=ordered.find(n=>n.beat>beat)?.beat??Infinity;
  const restStart=(track.rests||[]).filter(r=>r.beat>=beat+1e-7).reduce((end,r)=>Math.min(end,r.beat),total);
  const raw=e.score?.duration??e.duration,engraved=writtenDuration(pattern,inst,e,beat,next,e.score?.duration??Math.round(raw/grid)*grid);
  return {...e,index,id:e.id??String(index),beat,duration:Math.max(e.score ? .25 : grid,Math.min(total-beat,restStart-beat,engraved)),note:e.score?.note??e.note,shift:e.score?.shift??e.shift??0,tieBreaks:e.tieBreaks};
 });
}
const lengths=[[4,'w'],[3,'h',true],[2,'h'],[1.5,'q',true],[1,'q'],[.75,'8',true],[.5,'8'],[.25,'16']];
function splitSpan(start,end,metric,source,simple=false){
 const out=[];let at=start;
 while(at<end-1e-8){const relative=at%metric;let limit=end-at;
  if(relative>1e-7)limit=Math.min(limit,metric-relative);
  // Eighth–quarter–eighth is readable within a half-bar; retain the middle bar division.
  if(source&&simple&&Math.abs(at%1-.5)<1e-8&&end-at>=1-1e-8&&Math.floor(at/2)===Math.floor((at+1-1e-8)/2))limit=1;
  const forced=source?.tieBreaks?.map(b=>source.beat+b).find(b=>b>at+1e-7);if(forced!==undefined)limit=Math.min(limit,forced-at);
  const [duration,glyph,dot]=lengths.find(([n])=>n<=limit+1e-8)||lengths.at(-1);
  out.push({beat:at,duration,glyph,dot:!!dot,source,rest:!source});at+=duration;
 }return out;
}
function restSpan(start,end,pattern,track){
 const metric=pattern.meter==='6/8'?1.5:1,rests=(track.rests||[]).filter(r=>r.beat<end&&r.beat+r.duration>start),cuts=[...new Set([start,end,...rests.flatMap(r=>[Math.max(start,r.beat),Math.min(end,r.beat+r.duration)])])].sort((a,b)=>a-b);
 return cuts.slice(0,-1).flatMap((at,i)=>{const rest=rests.find(r=>at>=r.beat-1e-7&&at<r.beat+r.duration-1e-7);return splitSpan(at,cuts[i+1],metric,null).map(t=>({...t,restId:rest?.id}));});
}
export function notationVoices(pattern,track,grid=.5,{chords=false}={}){
 let events=notationEvents(pattern,track,grid);
 if(chords){const groups=new Map();for(const e of events){const key=e.beat+':'+e.duration+':'+JSON.stringify(e.tieBreaks||[]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(e)}events=[...groups.values()].map(notes=>({...notes[0],chord:notes.slice().sort((a,b)=>a.note-b.note)}));}
 // Higher simultaneous voices go above lower voices; equal-duration notes share a stem.
 events.sort((a,b)=>a.beat-b.beat||b.note-a.note);
 const lanes=[];for(const e of events){let lane=lanes.find(l=>(l.at(-1).beat+l.at(-1).duration)<=e.beat+1e-7);if(!lane){lane=[];lanes.push(lane);}lane.push(e);}
 if(!lanes.length)lanes.push([]);const per=beatsPerBar(pattern);
 return lanes.map(lane=>Array.from({length:pattern.bars},(_,bar)=>{const start=bar*per,end=start+per,tokens=[];let at=start;
  for(const e of lane){if(e.beat>=end||e.beat+e.duration<=start)continue;const a=Math.max(start,e.beat),b=Math.min(end,e.beat+e.duration);if(a>at)tokens.push(...restSpan(at,a,pattern,track));tokens.push(...splitSpan(a,b,pattern.meter==='6/8'?1.5:1,e,['2/4','4/4'].includes(pattern.meter)));at=b;}
  if(at<end)tokens.push(...restSpan(at,end,pattern,track));return tokens;
 }));
}
export function staffSpec(id){const i=byId(id),percussion=i.family==='drum';return {clef:writtenClef(i),percussion,octave:writtenOctave(i)};}
export function drumKey(inst,event){if(inst.pads.length===1)return 'b/4';const n=inst.pads.findIndex(p=>p[1]===event.note&&(p[2]||0)===event.shift);return ['e/4','g/4','b/4','d/5','f/5'][Math.max(0,n)%5];}
export function renderPatternScore(container,pattern,ids,grid=.5,{flow=globalThis.Vex?.Flow,onNote,onRest,onMeasure,layout='part',measures,continuous=false,scale=1}={}){
 if(!flow)throw Error('The notation engine could not load. Please refresh the studio.');
 const ordered=scoreTracks(pattern).map(t=>t.id);
 ids=ids.slice().sort((a,b)=>{const rank=id=>{const t=pattern.tracks.find(t=>t.id===id)||pattern.tracks.find(t=>t.instrument===id);return t?ordered.indexOf(t.id):ordered.length};return rank(a)-rank(b)});
 const {Renderer,Stave,StaveNote,Voice,Formatter,Accidental,Dot,Beam,Fraction,StaveTie}=flow;
 const doc=container.ownerDocument,ties=new Map(),[num,den]=pattern.meter.split('/').map(Number);
 const prepared=new Map(ids.map(id=>{const track=pattern.tracks.find(t=>t.id===id)||pattern.tracks.find(t=>t.instrument===id)||{instrument:id,events:[]};return [id,{track,lanes:notationVoices(pattern,track,grid,{chords:true})}]}));
 const compact=layout==='teacher';container.classList.toggle('compact-score',compact);
 const hideInactive=compact&&!continuous&&pattern.notation?.hideInactiveStaves!==false;
 const sectionStarts=new Set((pattern.sectionMarkers||[]).map(s=>s.bar));
 let previousVisible=new Set();
 const breaks=new Set(continuous?[]:[...(pattern.notation?.lineBreaks||[]),...(pattern.notation?.pageBreaks||[])].map(n=>n-1));
 const requested=measures??(compact?(pattern.notation?.teacherMeasures??4):(pattern.notation?.partMeasures??pattern.notation?.measures??'auto'));
 const expressive=pattern.tracks.some(t=>t.events.some(e=>e.dynamic||e.articulations?.length||e.hairpin||e.slur))||pattern.notation?.noteNames;
 const baseWidth=(compact?1080:800)/Math.max(.8,Math.min(1.4,scale)),canvasHeight=compact?(expressive?220:140):240,staveY=compact?(expressive?60:20):80;
 const baseUsable=baseWidth-20;
 const demand=bar=>Math.max(...[...prepared.values()].map(({lanes})=>{
 const tokens=lanes.flatMap(l=>l[bar]),onsets=new Set(tokens.map(t=>t.beat)).size;
 return (compact?70:120)+onsets*(compact?22:27)+Math.max(0,lanes.length-1)*24;
 }));
 for(let first=0;first<pattern.bars;){
 let count=Math.min([1,2,4].includes(requested)?requested:2,pattern.bars-first);
 {for(let b=first+1;b<first+count;b++)if(breaks.has(b)||(hideInactive&&sectionStarts.has(b))){count=b-first;break;}}
 if(requested==='auto'&&count===2&&demand(first)+demand(first+1)>baseUsable)count=1;
 const activeIds=hideInactive?ids.filter(id=>prepared.get(id).lanes.some(lane=>lane.slice(first,first+count).some(bar=>bar.some(token=>!token.rest)))):ids;
 // A completely silent system still shows its measures and rests for counting.
 const visibleIds=activeIds.length?activeIds:ids;
 const weights=Array.from({length:count},(_,i)=>demand(first+i)+(compact&&i===0?80:0)),sum=weights.reduce((a,b)=>a+b,0);
 const canvasWidth=Math.max(baseWidth,compact?sum+20:baseWidth),usable=canvasWidth-20,widths=weights.map(n=>usable*n/sum);

  const system=doc.createElement('section');system.className='score-system';system.dataset.firstMeasure=first+1+(pattern.measureOffset||0);system.dataset.measureCount=count;if(!continuous&&pattern.notation?.pageBreaks?.includes(first+1))system.dataset.pageBreak='true';container.append(system);
  const parts=visibleIds.map(id=>{
   const track=prepared.get(id).track,inst=byId(track.instrument),spec=staffSpec(track.instrument),lanes=prepared.get(id).lanes;
   const returning=hideInactive&&!previousVisible.has(id);
   const group=doc.createElement('div');group.className='score-staff';group.dataset.trackId=track.id||id;const label=doc.createElement('h4');label.textContent=scorePartLabel(track,inst,{abbreviate:first>0&&!returning})+(spec.octave&&(!compact||first===0||returning)?' · '+octaveDescription(inst):'')+(compact?'':' · mm. '+(first+1+(pattern.measureOffset||0))+'–'+(first+count+(pattern.measureOffset||0)));group.append(label);system.append(group);
   if(compact&&spec.percussion&&inst.pads.length>1){const key=doc.createElement('p');key.className='compact-stroke-key';key.textContent=inst.pads.map((pad,index)=>pad[0]+' = '+['bottom','second','middle','fourth','top'][index%5]+' line').join(' · ');group.append(key);}
   if(spec.percussion&&!compact){
    const legend=doc.createElement('div');legend.className='score-legend';legend.setAttribute('aria-label','Percussion notation key');group.append(legend);
    inst.pads.forEach((pad,index)=>{const entry=doc.createElement('div');entry.className='stroke-key';legend.append(entry);
     const icon=doc.createElement('div');entry.append(icon);const r=new Renderer(icon,Renderer.Backends.SVG);r.resize(92,70);const c=r.getContext();
     const stave=new Stave(0,-25,90,{num_lines:5});if(inst.pads.length===1){stave.setConfigForLines([0,0,1,0,0].map(visible=>({visible:!!visible})));stave.setBegBarType(flow.Barline.type.NONE);stave.setEndBarType(flow.Barline.type.NONE)}stave.setStyle({strokeStyle:'#222',fillStyle:'#222'});stave.setContext(c).draw();
     const keyNote=new StaveNote({clef:'percussion',keys:[drumKey(inst,{note:pad[1],shift:pad[2]||0})],duration:'q',stem_direction:1});
     Formatter.FormatAndDraw(c,stave,[keyNote]);const text=doc.createElement('span');text.textContent=pad[0]+(inst.pads.length>1?' = '+['bottom line','second line','middle line','fourth line','top line'][index%5]:'');entry.append(text);
     const svg=icon.querySelector('svg');svg.setAttribute('aria-hidden','true');svg.setAttribute('viewBox','0 0 92 70');
    });
   }
   const paper=doc.createElement('div');paper.className='staff-music';group.append(paper);const renderer=new Renderer(paper,Renderer.Backends.SVG);renderer.resize(canvasWidth,canvasHeight);const ctx=renderer.getContext();ctx.setFont('Arial',12);
   return {id,inst,spec,lanes,paper,ctx,returning,track,anchors:[]};
  });
  for(let b=first;b<first+count;b++){
   const width=widths[b-first],offset=widths.slice(0,b-first).reduce((a,b)=>a+b,0);
   const measures=parts.map(part=>{
    const {inst,spec,lanes,ctx}=part,stave=new Stave(10+offset,staveY,width,{num_lines:5});if(spec.percussion&&inst.pads.length===1){stave.setConfigForLines([0,0,1,0,0].map(visible=>({visible:!!visible})));stave.setBegBarType(flow.Barline.type.NONE);stave.setEndBarType(flow.Barline.type.NONE)}if(b===first&&(!continuous||b+(pattern.measureOffset||0)===0)){stave.addClef(spec.clef);if(!compact||first===0||part.returning)stave.addTimeSignature(pattern.meter);}
    const voiceNotes=lanes.map((lane,vi)=>lane[b].map(t=>{
     const keys=t.rest?[spec.clef==='bass'?'d/3':'b/4']:(t.source.chord||[t.source]).map(e=>spec.percussion?drumKey(inst,e):writtenKey(e.note+spec.octave));
     const note=new StaveNote({clef:spec.clef,keys,duration:t.glyph+(t.rest?'r':''),dots:t.dot?1:0,auto_stem:!spec.percussion&&lanes.length===1,...(spec.percussion||lanes.length>1?{stem_direction:vi%2?-1:1}:{})});
     if(t.dot)Dot.buildAndAttach([note],{all:true});if(t.rest&&lanes.length>1)note.setKeyLine(0,vi%2?0:4);return {note,t};
    }));
    const voices=voiceNotes.map(ns=>new Voice({num_beats:num,beat_value:den}).addTickables(ns.map(n=>n.note)));
    if(!spec.percussion)Accidental.applyAccidentals(voices,'C');
    const beams=voiceNotes.flatMap((ns,vi)=>Beam.generateBeams(ns.map(n=>n.note),{groups:[new Fraction(pattern.meter==='6/8'?3:1,pattern.meter==='6/8'?8:4)],stem_direction:spec.percussion||lanes.length>1?(vi%2?-1:1):undefined}));
    return {...part,stave,voiceNotes,voices,beams};
   });
   const start=Math.max(...measures.map(m=>m.stave.getNoteStartX())),end=Math.min(...measures.map(m=>m.stave.getNoteEndX())),formatter=new Formatter();
   for(const m of measures){m.stave.setNoteStartX(start);formatter.joinVoices(m.voices);}
   formatter.format(measures.flatMap(m=>m.voices),Math.max(100,end-start-25));
   for(const m of measures){const {id,inst,spec,stave,ctx,voices,voiceNotes,beams}=m;stave.setStyle({strokeStyle:'#222',fillStyle:'#222'});stave.setContext(ctx).draw();if(spec.percussion&&inst.pads.length===1){ctx.fillRect(10+offset,stave.getYForLine(2)-8,1,16);ctx.fillRect(10+offset+width,stave.getYForLine(2)-8,1,16)}const marker=pattern.sectionMarkers?.find(mark=>mark.bar===b);if(marker&&(!compact||id===visibleIds[0])){ctx.save();ctx.setFont('Arial',14,'bold');ctx.fillText(marker.name,15+offset,compact?12:28);ctx.restore();}if(!compact||id===visibleIds[0])ctx.fillText(String(b+1+(pattern.measureOffset||0)),15+offset,compact?32:52);voices.forEach(v=>v.draw(ctx,stave));beams.forEach(beam=>beam.setContext(ctx).draw());
    for(const [vi,ns] of voiceNotes.entries())for(const {note,t} of ns){m.anchors.push({id:t.source?.id,beat:t.beat,x:note.getAbsoluteX()+5,y:Math.min(...note.getYs()),bottomY:Math.max(...note.getYs()),note:t.source?.note,notes:t.source?.chord?.map(e=>e.note)});if(t.rest){const el=note.getSVGElement();if(el){el.dataset.restBeat=t.beat;el.dataset.scoreBeat=t.beat;el.dataset.scoreDuration=t.duration;if(t.restId)el.dataset.restId=t.restId;if(onRest){el.style.cursor='pointer';el.setAttribute('role','button');el.setAttribute('tabindex','0');el.setAttribute('aria-label',`Rest at measure ${b+1}, beat ${t.beat%beatsPerBar(pattern)+1}`);el.onclick=e=>onRest(id,t,e);el.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();onRest(id,t,e);}};}}continue;}const key=id+':'+vi,previous=ties.get(key);
     if(previous?.id===t.source.id&&Math.abs(previous.end-t.beat)<1e-7){if(previous.ctx===ctx)new StaveTie({first_note:previous.note,last_note:note,first_indices:(t.source.chord||[t.source]).map((_,i)=>i),last_indices:(t.source.chord||[t.source]).map((_,i)=>i)}).setContext(ctx).draw();else{new StaveTie({first_note:previous.note,first_indices:(t.source.chord||[t.source]).map((_,i)=>i),last_indices:(t.source.chord||[t.source]).map((_,i)=>i)}).setContext(previous.ctx).draw();new StaveTie({last_note:note,first_indices:(t.source.chord||[t.source]).map((_,i)=>i),last_indices:(t.source.chord||[t.source]).map((_,i)=>i)}).setContext(ctx).draw();}}
     ties.set(key,{id:t.source.id,note,ctx,end:t.beat+t.duration});const el=note.getSVGElement();if(el){el.dataset.eventId=t.source.id;el.dataset.scoreBeat=t.beat;el.dataset.scoreDuration=t.duration;el.dataset.eventIds=(t.source.chord||[t.source]).map(e=>e.id).join(' ');}if(el&&onNote){el.style.cursor='pointer';el.setAttribute('role','button');el.setAttribute('tabindex','0');el.setAttribute('aria-label','Edit '+inst.name+' '+(spec.percussion?'hit':noteName(t.source.note)));el.onclick=e=>onNote(id,t.source.index,e,t);el.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();onNote(id,t.source.index,e,t);}};if(t.source.chord?.length>1){el.querySelectorAll('.vf-notehead').forEach((head,i)=>{const source=t.source.chord[i];if(!source)return;head.setAttribute('tabindex','0');head.setAttribute('role','button');head.setAttribute('aria-label','Edit chord note '+(spec.percussion?inst.pads.find(p=>p[1]===source.note&&(p[2]||0)===source.shift)?.[0]:noteName(source.note)));head.onclick=e=>{e.stopPropagation();onNote(id,source.index,e,t)};head.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();onNote(id,source.index,e,t)}}})}}
    }
    if(onMeasure){
     const positions=new Map();for(const ns of voiceNotes)for(const {note,t}of ns)if(!positions.has(t.beat))positions.set(t.beat,note.getAbsoluteX()+5);
     const barStart=b*beatsPerBar(pattern),barEnd=barStart+beatsPerBar(pattern);positions.set(barEnd,end-12);
     if(!positions.has(barStart))positions.set(barStart,start+8);
     const points=[...positions].sort((a,b)=>a[0]-b[0]).map(([beat,x])=>({beat,x}));
     onMeasure({trackId:id,bar:b,labelY:compact?32:52,start:barStart,end:barEnd,left:10+offset,right:10+offset+width,top:stave.getYForLine(0)-35,bottom:stave.getYForLine(4),lineGap:stave.getSpacingBetweenLines(),points,svg:m.paper.querySelector('svg')});
    }
   }
  }
  for(const {paper,inst,track,anchors,spec} of parts){const svg=paper.querySelector('svg');svg.setAttribute('viewBox',`0 0 ${canvasWidth} ${canvasHeight}`);svg.setAttribute('role','img');svg.setAttribute('aria-label',`${inst.name}, measures ${first+1+(pattern.measureOffset||0)} to ${first+count+(pattern.measureOffset||0)}`);svg.style.width='100%';svg.style.height='auto';drawExpression(svg,track,anchors,{from:first*beatsPerBar(pattern),to:(first+count)*beatsPerBar(pattern),top:staveY+40,bottom:staveY+80,width:canvasWidth,names:pattern.notation?.noteNames,octave:spec.octave,percussion:spec.percussion});}
  previousVisible=new Set(visibleIds);first+=count;
 }
}
