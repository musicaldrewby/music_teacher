(function(root){
 'use strict';
 const M=root.UkeMelody,meters={'2/4':{steps:4,beat:2},'3/4':{steps:6,beat:2},'4/4':{steps:8,beat:2},'6/8':{steps:6,beat:3}};
 function bodyBars(song){let count=song.measures.length;while(count>1&&song.measures[count-1].ending)count--;return count;}
 function status(song){
  const n=song.notation;if(!n||!n.measures.some(m=>m.notes.some(v=>!v.rest)))return {ready:false,message:'Add melody notes in Melody maker to show sheet music.'};
  const cfg=meters[song.meter];if(!cfg||M.capacity(n.meter)!==cfg.steps*8)return {ready:false,message:'The score is in '+n.meter+' and the song is in '+song.meter+'. Use “Use score & present” to match them.'};
  const count=bodyBars(song),extra=n.measures.length-count;
  return {ready:true,message:extra>0?'The score has '+extra+' extra measure'+(extra===1?'':'s')+'. Use score & present to include them.':count>n.measures.length?'Unwritten measures show rests. Follows the song’s tempo and chord changes.':'Follows the song’s tempo, chord changes, and repeats.'};
 }
 function prepare(song){
  if(!status(song).ready)return null;const n=song.notation,cfg=meters[song.meter],count=bodyBars(song),second=60/song.tempo/cfg.beat;
  const score={...n,tempo:song.tempo*cfg.beat*8/M.meters[n.meter].unit,measures:Array.from({length:count},(_,i)=>({
   ...(n.measures[i]||{notes:[],reference:''}),chords:song.measures[i].chords.filter(c=>c.chord!=='--').map(c=>({at:c.step*8,name:c.chord}))
  }))};
  const plan=M.timeline(score),byBar=score.measures.map(()=>[]);
  for(const e of plan.events)byBar[e.bar].push({...e,step:e.time/second,endStep:(e.time+e.length)/second});
  return {score,cfg,second,count,byBar,events:byBar.flat(),hasLyrics:score.measures.some(m=>m.notes.some(n=>n.lyric)),showLyrics:song.showLyrics!==false};
 }
 function mapped(phase,p){if(phase<p.start)return p.start;if(phase<p.repeatEnd)return p.start+(phase-p.start)%p.length;return Math.min(p.scoreEnd-1e-6,p.bodyEnd+phase-p.repeatEnd);}
 function state(prepared,phase,p,countUntil=0){
  const counting=phase<countUntil,ending=!counting&&!p.loop&&phase>=p.repeatEnd,tick=mapped(counting?countUntil:phase,p),n=prepared.cfg.steps;
  const first=Math.floor(p.start/n),last=Math.min(prepared.score.measures.length-1,Math.ceil(p.bodyEnd/n)-1);
  const bar=Math.max(first,Math.min(last,Math.floor(tick/n))),active=!counting&&!ending?(prepared.byBar[bar]||[]).find(e=>tick>=e.step-1e-8&&tick<e.endStep-1e-8):null;
  const count=last-first+1,cycle=counting?0:Math.max(0,Math.floor((Math.min(phase,p.repeatEnd-1e-6)-p.start)/p.length));
  const ordinal=cycle*count+bar-first,willRepeat=p.loop||p.start+(cycle+1)*p.length<p.repeatEnd-1e-6;
  const nextBar=ending?null:bar<last?bar+1:willRepeat?first:null;
  return {bar,first,last,tick,counting,ending,ordinal,nextBar,cycled:cycle>0,active,progress:active?Math.max(0,Math.min(1,(tick-active.step)/(active.endStep-active.step))):0};
 }
 function guideEvents(prepared,tick){const bar=Math.floor(tick/prepared.cfg.steps);return (prepared.byBar[bar]||[]).filter(e=>!e.rest&&e.step>=tick-1e-8&&e.step<tick+1-1e-8);}
 // Explicit, undoable transfer: notation remains intact and becomes the song's accompaniment.
 function arrangement(song,fingerings){
  const n=M.normalize(song.notation),meter=n.meter==='2/2'?'4/4':n.meter,cfg=meters[meter];
  if(!cfg)throw Error('Band presentation currently supports 2/4, 3/4, 4/4, 6/8, and cut time. This score can still be printed or played with Listen.');
  const tempo=n.tempo*M.meters[n.meter].unit/(cfg.beat*8);if(tempo<40||tempo>200)throw Error('For cut time with the band, choose a half-note tempo from 40 to 100.');
  let chord='--';const bars=n.measures.map((m,i)=>{
   for(const c of m.chords){if(c.at%8)throw Error('Place ukulele chord changes on a beat or an eighth-note position before using the band.');if(!Object.hasOwn(fingerings,c.name))throw Error('Choose a supported ukulele chord: '+c.name);}
   const changes=m.chords.map(c=>({step:c.at/8,chord:c.name}));if(!changes.some(c=>c.step===0))changes.unshift({step:0,chord});chord=changes.at(-1)?.chord||chord;
   const words=m.notes.filter(n=>!n.rest&&n.lyric).map(n=>n.lyric).join(' ').replace(/-\s+/g,'');
   return {scoreId:m.scoreId,chords:changes,lyric:words||m.reference||'',lyricStart:0,lyricSpan:1,lyricPickup:0,sectionStart:song.measures[i]?.sectionStart||''};
  });
  const last=bars.flatMap(m=>m.chords).filter(c=>c.chord!=='--').at(-1)?.chord||'--';
  bars.push({chords:[{step:0,chord:last}],lyric:'One final strum ↓',lyricStart:0,lyricSpan:1,lyricPickup:0,ending:true,sectionStart:'Ending'});
  return {...song,meter,tempo,swing:n.meter==='6/8'?0:n.swing/200,scoreBandSwing:true,measures:bars,lyricPickup:0,starterEndingVersion:1,notation:{...n,showInPlayer:true},video:{...song.video,sheetMusic:true,guideMelody:n.guideMelody}};
 }
 root.UkeScorePlayback={meters,bodyBars,status,prepare,mapped,state,guideEvents,arrangement};
 if(typeof module!=='undefined'&&module.exports)module.exports=root.UkeScorePlayback;
})(typeof window!=='undefined'?window:globalThis);
