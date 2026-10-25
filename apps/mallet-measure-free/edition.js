export const FREE_INSTRUMENTS=Object.freeze(['bass-xylophone','alto-xylophone','soprano-xylophone','soprano-glockenspiel','soprano-recorder','hand-drums','woodblock','triangle']);
export const MAX_TRACKS=5,MAX_BARS=4;
export function assertFreeProject(p){
 if(!p||typeof p!=='object')throw Error('Choose a Mallet & Measure project (.orff).');
 if(p.bars>MAX_BARS||p.sections?.some(s=>s.bars>MAX_BARS))throw Error('This project needs more than four measures. Open it in the full Orff Ensemble Studio.');
 if(p.tracks?.length>MAX_TRACKS)throw Error('This project needs more than five tracks. Open it in the full Orff Ensemble Studio.');
 if(p.tracks?.some(t=>!FREE_INSTRUMENTS.includes(t.instrument)))throw Error('This project uses instruments from the full Orff Ensemble Studio. Your current session has been kept.');
 if(p.sections!==undefined&&(!Array.isArray(p.sections)||p.sections.length!==1))throw Error('Multiple song sections are available in the full Orff Ensemble Studio.');
 if(p.arrangement!==undefined&&(!Array.isArray(p.arrangement)||p.arrangement.length!==1||p.arrangement[0]?.repeats!==1))throw Error('Song arrangements are available in the full Orff Ensemble Studio.');
 const total=p.bars*Number(p.meter?.split('/')[0])*4/Number(p.meter?.split('/')[1]);
 for(const t of p.tracks||[]){
  for(const e of t.events||[]){
   if(e.beat+e.duration>total+1e-7)throw Error('A note extends beyond the four-measure loop. Shorten it in the full studio before opening.');
   if(t.instrument==='hand-drums'&&![41,43,45,47,50].includes(e.note))throw Error('This project contains an invalid hand-drum note.');
  }
 }
}
