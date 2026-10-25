import {barBeats,songBeats,noteSegments,clone,uid,extractRange,eraseRange,patternProject,MAX_PATTERN_BARS,MAX_SONG_BARS} from './sequencer-model.js';

const freshNote=(n,start,duration)=>({...clone(n),id:uid(),start,duration,original:{start,duration}});
export function editBars(project,{from,to,target,scope='track',action='copy'}){
 if(!Number.isInteger(from)||!Number.isInteger(to)||from<1||to<from||to>project.bars)throw new Error('Choose a valid range of existing measures.');
 if(action==='duplicate')target=to+1;
 const count=to-from+1;if(action!=='erase'&&(!Number.isInteger(target)||target<1||target+count-1>MAX_PATTERN_BARS))throw new Error('The destination must fit within 256 measures.');
 const unit=barBeats(project),start=(from-1)*unit,end=to*unit,total=songBeats(project),dest=(target-1)*unit;
 const indices=scope==='all'?project.tracks.map((_,i)=>i):[project.selectedTrack];
 const captured=indices.map(i=>extractRange(project.tracks[i],start,end,total,project.loop));
 if(action==='erase'||action==='move')for(const i of indices)eraseRange(project.tracks[i],start,end,total,project.loop);
 if(action!=='erase'){
  // Growing a loop must not silently move an existing wrapped note's tail.
  if(target+count-1>project.bars&&project.loop)for(const t of project.tracks)t.notes=t.notes.flatMap(n=>noteSegments(n,total,true)).map(n=>freshNote(n,n.start,n.duration));
  project.bars=Math.max(project.bars,target+count-1);
  indices.forEach((i,k)=>{const t=project.tracks[i],copy=captured[k];t.notes.push(...copy.notes.map(n=>freshNote(n,n.start+dest,n.duration)));t.controllers.push(...copy.controllers.map(c=>({...c,id:uid(),beat:c.beat+dest})));});
 }
 return `${action==='erase'?'Erased':action==='move'?'Moved':action==='duplicate'?'Duplicated':'Copied'} measures ${from}–${to} ${scope==='all'?'on all tracks':'on the selected track'}. Undo is available.`;
}
export function arrangementBars(p){if(p.version===2)return p.song.reduce((sum,a)=>sum+p.scenes[a.scene].bars*a.repeats,0);return p.arrangement.reduce((sum,item)=>sum+(p.sections.find(s=>s.id===item.sectionId)?.bars||0)*item.repeats,0)}
export function arrangeProject(p){
 if(p.version===2){
  const bars=arrangementBars(p);if(!bars)throw new Error('Add a scene to the song first.');if(bars>MAX_SONG_BARS)throw new Error('Song length limit exceeded. Reduce repeats.');
  const out=patternProject(p);out.name=p.name;out.bars=bars;out.loop=false;out.punch={enabled:false,from:1,to:Math.min(4,bars)};out.sections=[];out.tempoChanges=[];out.tracks.forEach(t=>{t.notes=[];t.controllers=[]});let at=0;
  for(const entry of p.song){const source=patternProject(p,entry.scene);for(let repeat=0;repeat<entry.repeats;repeat++){
   if(!out.tempoChanges.length||out.tempoChanges.at(-1).tempo!==source.tempo)out.tempoChanges.push({beat:at*barBeats(p),tempo:source.tempo});
   out.sections.push({id:uid(),tempo:source.tempo,name:p.scenes[entry.scene].name,scene:entry.scene,from:at+1,bars:source.bars});
   source.tracks.forEach((t,i)=>{const part=extractRange(t,0,songBeats(source),songBeats(source),false);out.tracks[i].notes.push(...part.notes.map(n=>freshNote(n,n.start+at*barBeats(p),n.duration)));out.tracks[i].controllers.push(...part.controllers.map(c=>({...c,id:uid(),beat:c.beat+at*barBeats(p)})));});
   at+=source.bars;
   if(out.tracks.some(t=>t.notes.length+t.controllers.length>200000))throw new Error('This song has too many events to render. Reduce repeats.');
  }}out.tempo=out.tempoChanges[0].tempo;return out;
 }
 const bars=arrangementBars(p);if(!bars)throw new Error('Add a section to the arrangement first.');if(bars>64)throw new Error('The arrangement exceeds 64 measures. Reduce repeats or remove a section.');
 const out=clone(p);out.bars=bars;out.loop=false;out.punch.enabled=false;out.arrangement=[];out.sections=[];
 for(const t of out.tracks){t.notes=[];t.controllers=[]}
 let at=0;const unit=barBeats(p);
 for(const item of p.arrangement){const s=p.sections.find(s=>s.id===item.sectionId);if(!s)throw new Error('An arrangement section is missing.');
  for(let repeat=0;repeat<item.repeats;repeat++){
   out.sections.push({...s,id:uid(),from:at+1});
   p.tracks.forEach((t,i)=>{const part=extractRange(t,(s.from-1)*unit,(s.from+s.bars-1)*unit,songBeats(p),p.loop);out.tracks[i].notes.push(...part.notes.map(n=>freshNote(n,n.start+at*unit,n.duration)));out.tracks[i].controllers.push(...part.controllers.map(c=>({...c,id:uid(),beat:c.beat+at*unit})));});
   at+=s.bars;
  }
 }
 if(out.tracks.some(t=>t.notes.length>10000||t.controllers.length>20000))throw new Error('The arrangement exceeds the event limit for one track. Reduce repeats or use shorter sections.');
 return out;
}
