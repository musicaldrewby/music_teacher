'use strict';
// Original accompaniment plans, matched to the editable starter arrangements.
// Mallet parts are chord tones, not recordings or transcriptions of the melodies.
const SONG_BANDS=[
 {id:'bells',name:'Morning bells',meter:'4/4',groove:'gentle',mallet:'bells',motif:[0,2,0],answer:2,phrase:4,levels:[32,12,10,23],description:'Soft bass and brushed rhythm, with bell answers in the closing phrases.'},
 {id:'rain',name:'Raindrop rhythm',meter:'2/4',groove:'gentle',mallet:'marimba',motif:[0,1],answer:1,phrase:2,levels:[27,10,18,19],description:'Quiet marimba drops and a light shaker under the singing.'},
 {id:'buns',name:'Bakery bounce',meter:'4/4',groove:'bounce',mallet:'marimba',motif:[2,1,0],answer:1,phrase:2,levels:[34,18,12,20],description:'A warm bass pulse and short marimba answers, following the mid-measure chord change.'},
 {id:'bridge',name:'Bridge march',meter:'2/4',groove:'march',mallet:'marimba',motif:[0,2],answer:1,phrase:2,levels:[35,23,12,12],description:'An easy two-beat march, with side stick and a small phrase-ending lift.'},
 {id:'skip',name:'Playground folk',meter:'4/4',groove:'folk',mallet:'marimba',motif:[0,2,1],answer:1,phrase:4,levels:[37,21,17,12],description:'Alternating bass notes, a light backbeat, and room for a lively strum.'},
 {id:'twinkle',name:'Starlight bells',meter:'4/4',groove:'gentle',mallet:'bells',motif:[0,2,1,2],answer:0,phrase:4,levels:[25,9,9,21],description:'Spacious bell arpeggios and soft bass, with a quieter final phrase.'},
 {id:'apple',name:'Orchard pulse',meter:'2/4',groove:'bounce',mallet:'marimba',motif:[0,2,0,1],answer:0,phrase:2,levels:[31,16,14,22],description:'A bouncy marimba pulse with a clear, gentle beat for the singing game.'},
 {id:'locket',name:'Pocket-size band',meter:'4/4',groove:'bounce',mallet:'marimba',motif:[1,2,0],answer:1,phrase:2,levels:[31,17,14,21],description:'Short marimba replies and an uncluttered rhythm for each line.'},
 {id:'together',name:'Circle waltz',meter:'3/4',groove:'waltz',mallet:'marimba',motif:[1,2],answer:0,phrase:4,levels:[34,15,11,22],description:'Bass on beat 1, then two soft marimba chords: one–two–three.'},
 {id:'farmer',name:'Barn dance',meter:'6/8',groove:'lilt',mallet:'marimba',motif:[0,2,1],answer:1,phrase:4,levels:[35,20,15,17],description:'Two lilting bass pulses per measure and a light tambourine lift.'},
 {id:'spider',name:'Rain to sunshine',meter:'6/8',groove:'gentle',mallet:'marimba',motif:[0,1,2],answer:1,phrase:4,levels:[28,13,18,22],description:'Marimba steps, a little more shaker for the rain, and bells when the sun comes out.'},
 {id:'bingo',name:'Clap-along band',meter:'4/4',groove:'clap',mallet:'marimba',motif:[0,2,0],answer:1,phrase:4,levels:[35,24,13,12],description:'A friendly bass groove, with hand claps during the spelling phrases.'},
 {id:'mountain',name:'Mountain folk band',meter:'4/4',groove:'folk',mallet:'marimba',motif:[0,2,1,2],answer:1,phrase:4,levels:[39,23,18,14],description:'A country root-and-fifth bass, side-stick backbeat, and a little tambourine at phrase endings.'},
 {id:'epo',name:'Sing & clap',meter:'4/4',groove:'clap',mallet:'marimba',motif:[0,2,1],answer:1,phrase:4,levels:[29,16,11,13],description:'A gentle bass pulse, light hand claps, and short marimba replies following F and C7. An original classroom backing track.'}
];
const BAND_STYLES={song:'Song arrangement',simple:'Simple beat',gentle:'Gentle accompaniment',folk:'Folk band'};
SONG_BANDS.forEach((p,i)=>{p.source=STARTERS[i].source;p.title=STARTERS[i].title;});
function recommendedBand(s){return SONG_BANDS.find(p=>(s.source?p.source===s.source:p.title===s.title)&&p.meter===s.meter)||null;}
function bandDefaults(s){const p=recommendedBand(s),v=p?.levels||[32,18,12,12];return {enabled:!!p,style:'song',ukulele:65,bass:v[0],drums:v[1],shaker:v[2],melody:v[3]};}
function normalizeBand(s,raw){const defaults=bandDefaults(s),b=raw&&typeof raw==='object'?raw:null;return {enabled:b?b.enabled===true:defaults.enabled,style:Object.hasOwn(BAND_STYLES,b?.style)?b.style:'song',...Object.fromEntries(['ukulele','bass','drums','shaker','melody'].map(k=>[k,Math.round(clamp(b?.[k]??defaults[k],0,100,defaults[k]))]))};}
for(const s of STARTERS)s.band=bandDefaults(s);
function bandProfile(s){const style=s.band?.style||'song',p=style==='song'?recommendedBand(s):null;if(p)return p;const groove=s.meter==='3/4'?'waltz':s.meter==='6/8'?'lilt':style==='gentle'?'gentle':style==='folk'?'folk':'march';return {id:'custom',name:style==='song'?'Classroom accompaniment':BAND_STYLES[style],meter:s.meter,groove,mallet:style==='gentle'?'bells':'marimba',motif:[0,2,1],answer:style==='simple'?3:1,phrase:4,description:'A steady accompaniment that follows your chords, meter, and tempo.'};}
function arrangementChord(s,tick){if(virtualEndingAt(s,tick))return lastPlayedChord(s);const cfg=METERS[s.meter],m=s.measures[Math.min(s.measures.length-1,Math.max(0,Math.floor(tick/cfg.steps)))];let chord='--';for(const c of m.chords)if(c.step<=tick%cfg.steps)chord=c.chord;return chord;}
function bandEvents(s,tick,bounds={start:0,end:s.measures.length*METERS[s.meter].steps,loop:s.loop}){
 if(!s.band?.enabled||tick<bounds.start||tick>=bounds.end)return [];
 const cfg=METERS[s.meter],chord=arrangementChord(s,tick);if(chord==='--')return [];
 const p=bandProfile(s),bar=Math.floor(tick/cfg.steps),step=tick%cfg.steps,beat=Math.floor(step/cfg.beat),onBeat=step%cfg.beat===0,first=tick-bounds.start<cfg.steps,last=!bounds.loop&&tick>=bounds.end-cfg.steps,phraseEnd=(bar+1)%p.phrase===0;
 const change=tick===bounds.start||arrangementChord(s,tick-1)!==chord;
 const root=({C:0,D:2,E:4,F:5,G:7,A:9,B:11}[chord[0]]+(chord[1]==='b'?-1:0)+12)%12;
 if(isEndingMeasure(s,tick))return step===0?[{instrument:'bass',note:36+root,channel:'bass',velocity:.78,length:cfg.steps*60/s.tempo/cfg.beat}]:[];
 const pcs=[...new Set(CHORD_FINGERINGS[chord].map((f,i)=>([67,60,64,69][i]+f)%12))].sort((a,b)=>(a-root+12)%12-(b-root+12)%12);
 const events=[],unit=60/s.tempo/cfg.beat,lift=first?.72:1;
 const hit=(instrument,note,channel,velocity,length)=>events.push({instrument,note,channel,velocity:Math.max(.05,Math.min(1,velocity)),length});
 const bassBeat=onBeat&&(s.meter==='3/4'?beat===0:s.meter==='4/4'?beat%2===0:true);
 if(bassBeat||change){const alternate=!change&&(s.meter==='4/4'?beat===2:beat%2===1);hit('bass',36+root+(alternate?7:0),'bass',.75,Math.min(1.2,unit*cfg.beat*.85));}
 // Final measures thin out after the last strong pulse; the shared cutoff is unchanged.
 if(onBeat&&(!last||step<cfg.steps-cfg.beat)){
  const back=s.meter==='3/4'?beat>0:s.meter==='4/4'?beat%2===1:beat===1;
  if(!back)hit('kick',36,'drums',.6*lift,.35);
  else {let sn=p.groove==='gentle'?'brush':p.groove==='march'&&phraseEnd?'snare':'stick';if(p.id==='bingo'&&/B–I–N–G–O/.test(s.measures[bar]?.lyric||s.measures[bar-1]?.lyric||''))sn='clap';hit(sn,sn==='clap'?39:sn==='brush'||sn==='snare'?38:37,'drums',.6*lift,.3);}
 }
 if(!first&&!last){const rain=p.id==='spider'&&bar>=4&&bar<8;hit(p.id==='mountain'&&!onBeat?'hat':'shaker',p.id==='mountain'&&!onBeat?42:82,'shaker',(onBeat?.48:.28)*(rain?1.35:1),.15);}
 if(phraseEnd&&!last&&step===cfg.steps-1&&['folk','march','lilt','clap'].includes(p.groove))hit('tambourine',54,'drums',.32,.45);
 let playMallet=false;
 if(last)playMallet=step===0;
 else if(p.id==='bells')playMallet=bar%8>=6&&onBeat&&beat<3;
 else if(p.id==='together')playMallet=onBeat&&beat>0;
 else if(p.id==='twinkle')playMallet=onBeat&&beat%2===1;
 else if(p.id==='apple')playMallet=step===2;
 else playMallet=onBeat&&bar%Math.max(1,p.answer+1)===p.answer&&beat>0;
 if(playMallet){const instrument=p.id==='spider'&&bar>=8&&bar<12?'bells':p.mallet,octave=instrument==='bells'?72:60,index=last?0:p.motif[(bar+beat)%p.motif.length]%pcs.length;
  hit(instrument,octave+pcs[index],'melody',(last?.65:.5)*lift,instrument==='bells'?1.3:.65);
  if(p.id==='together'&&!last)hit('marimba',60+pcs[(index+1)%pcs.length],'melody',.32,.5);
 }
 return events;
}
