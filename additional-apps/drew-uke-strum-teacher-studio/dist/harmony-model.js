(function(root){
 'use strict';
 const copy=x=>JSON.parse(JSON.stringify(x)),meters={'2/4':4,'3/4':6,'4/4':8,'6/8':6};let serial=0;
 const id=()=> 'bar-'+Date.now().toString(36)+'-'+(++serial).toString(36)+'-'+Math.random().toString(36).slice(2,7);
 const bandMeter=n=>n.meter==='2/2'?'4/4':n.meter;
 const body=s=>s.measures.filter(m=>!m.ending);
 function validChords(n,fingerings){for(const m of n.measures)for(const c of m.chords){if(c.at%8)throw Error('Place chord changes on a beat or “and” so they can follow the ukulele band.');if(!Object.hasOwn(fingerings,c.name))throw Error('Choose a supported ukulele chord: '+c.name);}}
 function fromArrangement(s){
  const n=s.notation;if(!n||!meters[bandMeter(n)])return false;
  if(bandMeter(n)!==s.meter)root.UkeMelody.changeMeter(n,s.meter);
  const prior=new Map(n.measures.filter(m=>m.scoreId).map(m=>[m.scoreId,m])),seen=new Set();
  n.measures=body(s).slice(0,128).map(m=>{
   const old=prior.get(m.scoreId);if(!m.scoreId||seen.has(m.scoreId))m.scoreId=id();seen.add(m.scoreId);
   return {...copy(old||{notes:[],reference:m.lyric||''}),scoreId:m.scoreId,chords:m.chords.map(c=>({at:c.step*8,name:c.chord}))};
  });
  s.harmonyVersion=1;return true;
 }
 function fromNotation(s,fingerings,patterns){
  const n=s.notation,meter=bandMeter(n);if(!meters[meter])return false;validChords(n,fingerings);
  const prior=new Map(s.measures.filter(m=>m.scoreId).map(m=>[m.scoreId,m])),seen=new Set(),endings=s.measures.filter(m=>m.ending),lastChord=body(s).at(-1)?.chords.at(-1)?.chord;let chord='--';
  const measures=n.measures.map(m=>{
   const old=prior.get(m.scoreId);if(!m.scoreId||seen.has(m.scoreId))m.scoreId=id();seen.add(m.scoreId);
   const changes=m.chords.map(c=>({step:c.at/8,chord:c.name})).sort((a,b)=>a.step-b.step);if(!changes.some(c=>c.step===0))changes.unshift({step:0,chord});chord=changes.at(-1).chord;
   return {...copy(old||{lyric:m.reference||'',lyricStart:0,lyricSpan:1,lyricPickup:0,sectionStart:''}),ending:false,scoreId:m.scoreId,chords:changes,lyricStart:Math.min(old?.lyricStart||0,meters[meter]-1)};
  });
  for(const m of endings)if(m.chords.length===1&&m.chords[0].chord===lastChord)m.chords=[{step:0,chord}];
  s.measures=[...measures,...body(s).slice(128),...endings];s.meter=meter;if(patterns[s.pattern]?.timeSignature!==meter)s.pattern=Object.keys(patterns).find(k=>patterns[k].timeSignature===meter);if(meter==='6/8')s.swing=0;
  fromArrangement(s);return true;
 }
 function load(s,raw,fingerings,patterns){
  if(!s.notation)return s;
  s.measures.forEach((m,i)=>m.scoreId=raw.measures[i]?.scoreId||raw.notation?.measures[i]?.scoreId||id());
  s.notation.measures.forEach((m,i)=>m.scoreId=m.scoreId||body(s)[i]?.scoreId||id());
  if(!meters[bandMeter(s.notation)])return s;
  // Keep legacy off-grid chord placements intact until the teacher moves them.
  if(s.notation.measures.some(m=>m.chords.some(c=>c.at%8||!Object.hasOwn(fingerings,c.name))))return s;
  // Existing written scores are the starting point; thereafter the arrangement
  // is canonical on disk and notation chord arrays are its synchronized view.
  if(raw.harmonyVersion===1||body(s).length>128)fromArrangement(s);
  else if(bandMeter(s.notation)===s.meter){
   const n=s.notation,bars=body(s);n.measures.forEach((m,i)=>{if(!m.chords.length&&bars[i])m.chords=bars[i].chords.map(c=>({at:c.step*8,name:c.chord}));});for(let i=n.measures.length;i<Math.min(128,bars.length);i++)n.measures.push({scoreId:bars[i].scoreId,notes:[],reference:bars[i].lyric||'',chords:bars[i].chords.map(c=>({at:c.step*8,name:c.chord}))});
   fromNotation(s,fingerings,patterns);
  }
  return s;
 }
 root.UkeHarmony={id,body,bandMeter,fromArrangement,fromNotation,load};
 if(typeof module!=='undefined'&&module.exports)module.exports=root.UkeHarmony;
})(typeof window!=='undefined'?window:globalThis);
