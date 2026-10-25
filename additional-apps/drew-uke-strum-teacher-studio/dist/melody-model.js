(function(root){
 'use strict';
 const meters={'2/4':{n:2,d:4,unit:16,label:'Quarter note'},'3/4':{n:3,d:4,unit:16,label:'Quarter note'},'4/4':{n:4,d:4,unit:16,label:'Quarter note'},'6/8':{n:6,d:8,unit:24,label:'Dotted quarter'},'2/2':{n:2,d:2,unit:32,label:'Half note'},'5/4':{n:5,d:4,unit:16,label:'Quarter note'},'7/8':{n:7,d:8,unit:8,label:'Eighth note'}};
 const durations={w:64,h:32,q:16,'8':8,'16':4,'32':2},names={w:'Whole',h:'Half',q:'Quarter','8':'Eighth','16':'16th'};
 const keys={C:{},G:{f:1},D:{f:1,c:1},A:{f:1,c:1,g:1},F:{b:-1},Bb:{b:-1,e:-1},Eb:{b:-1,e:-1,a:-1},Am:{},Em:{f:1},Dm:{b:-1}};
 const copy=x=>JSON.parse(JSON.stringify(x)),capacity=m=>meters[m].n*64/meters[m].d,ticks=n=>durations[n.duration]*(n.dotted?1.5:1),used=m=>m.notes.reduce((s,n)=>s+ticks(n),0);
 function note(raw){
  if(!raw||!Object.hasOwn(durations,raw.duration))throw Error('Choose a standard note length.');
  const pitch=String(raw.pitch||'c/4').toLowerCase();if(!/^[a-g]\/[3-6]$/.test(pitch))throw Error('Melody notes must be between C3 and B6.');
  return {pitch,duration:raw.duration,dotted:!!raw.dotted,rest:!!raw.rest,accidental:['#','b','n'].includes(raw.accidental)?raw.accidental:'',lyric:raw.rest?'':String(raw.lyric||'').slice(0,40)};
 }
 function normalize(raw){
  if(!raw||!meters[raw.meter])throw Error('Choose a supported score meter.');
  if(!Array.isArray(raw.measures)||!raw.measures.length||raw.measures.length>128)throw Error('A melody score needs 1–128 measures.');
  const cap=capacity(raw.meter),measures=raw.measures.map(m=>{const notes=(Array.isArray(m.notes)?m.notes:[]).slice(0,64).map(note),bar={notes,scoreId:typeof m.scoreId==='string'?m.scoreId:'',chords:[],reference:String(m.reference||'').slice(0,300)};if(used(bar)>cap)throw Error('A measure has more notes than its meter allows.');
   const map=new Map();for(const c of m.chords||[]){if(!Number.isInteger(c.at)||c.at<0||c.at>=cap)throw Error('A chord change falls outside its measure.');const name=String(c.name||'').slice(0,12);if(name)map.set(c.at,{at:c.at,name});}bar.chords=[...map.values()].sort((a,b)=>a.at-b.at);return bar;});
  return {version:1,meter:raw.meter,key:keys[raw.key]?raw.key:'C',tempo:Math.min(200,Math.max(40,Math.round(+raw.tempo||80))),swing:Math.min(100,Math.max(0,Math.round(+raw.swing||0))),composer:String(raw.composer||'').slice(0,120),measureNumbers:raw.measureNumbers!==false,showInPlayer:raw.showInPlayer!==false,guideMelody:raw.guideMelody===true,measures};
 }
 function fromSong(song){return normalize({meter:song.meter,tempo:song.tempo,swing:(song.swing||0)*200,composer:song.video?.composer||'',key:'C',measureNumbers:true,measures:song.measures.filter(m=>!m.ending).slice(0,128).map(m=>({notes:[],chords:m.chords.filter(c=>c.chord!=='--').map(c=>({at:c.step*8,name:c.chord})),reference:m.lyric||''}))});}
 function put(score,bar,raw,index=null){const n=note(raw),m=score.measures[bar];if(!m)throw Error('Choose a measure.');const next=m.notes.slice();if(index===null)next.push(n);else next[index]=n;if(next.reduce((s,n)=>s+ticks(n),0)>capacity(score.meter))throw Error('That note is too long for this measure. Choose a shorter length or move to the next measure.');m.notes=next;return next.length-1;}
 function changeMeter(score,meter){if(!meters[meter])throw Error('Choose a supported meter.');const cap=capacity(meter);if(score.measures.some(m=>used(m)>cap||m.chords.some(c=>c.at>=cap)))throw Error('Some notes or chords extend past this meter. Shorten those measures first, or start a blank score.');score.meter=meter;}
 function resolved(score,bar){const state={},base=keys[score.key],notes=score.measures[bar].notes;let at=0;return notes.map((n,index)=>{const [letter,oct]=n.pitch.split('/');if(!n.rest&&n.accidental)state[n.pitch]=n.accidental==='#'?1:n.accidental==='b'?-1:0;const alter=state[n.pitch]??base[letter]??0,midi=(+oct+1)*12+({c:0,d:2,e:4,f:5,g:7,a:9,b:11}[letter])+alter;const out={...n,index,at,ticks:ticks(n),midi,vexKey:letter+(alter===1?'#':alter===-1?'b':'')+'/'+oct};at+=out.ticks;return out;});}
 function rests(score,bar){let at=used(score.measures[bar]),left=capacity(score.meter)-at;if(at===0)return [{duration:'w',rest:true,generated:true,barRest:true,at:0,ticks:left,pitch:'b/4'}];const out=[],groups=score.meter==='7/8'?[16,32,56]:Array.from({length:Math.ceil(capacity(score.meter)/meters[score.meter].unit)},(_,i)=>Math.min(capacity(score.meter),(i+1)*meters[score.meter].unit));
  while(left){const end=groups.find(b=>b>at)||capacity(score.meter);let available=Math.min(left,end-at),choice;for(const [duration,size]of Object.entries({...durations,'64':1}).sort((a,b)=>b[1]-a[1])){for(const dotted of [true,false]){const t=size*(dotted?1.5:1);if(Number.isInteger(t)&&t<=available){choice={duration,dotted,ticks:t};break;}}if(choice)break;}out.push({...choice,pitch:'b/4',rest:true,generated:true,at});at+=choice.ticks;left-=choice.ticks;}return out;
 }
 function swingSupported(score){return meters[score.meter].d!==8;}
 function swingLabel(amount){return !amount?'Straight':amount<35?'Light swing':amount<80?'Swing':'Strong swing';}
 function feelMark(score){return swingSupported(score)&&score.swing>0?(swingLabel(score.swing)==='Swing'?'Swing eighths':swingLabel(score.swing)+' · eighth notes'):'';}
 function timeline(score,start=0){
  const second=60/(score.tempo*meters[score.meter].unit),cap=capacity(score.meter),events=[],amount=swingSupported(score)?Math.min(100,Math.max(0,+score.swing||0))/100:0;
  for(let b=start;b<score.measures.length;b++){
   const notes=resolved(score,b),straight=new Set();
   // Explicit dotted rhythms and subdivisions finer than eighths stay as written.
   for(const n of notes){for(const at of [n.at,n.at+n.ticks])if(at%8)straight.add(Math.floor(at/16));if(n.dotted||n.ticks<8)for(let beat=Math.floor(n.at/16);beat*16<n.at+n.ticks;beat++)straight.add(beat);}
   const warp=at=>{const beat=Math.floor(at/16),part=at%16;if(!amount||straight.has(beat))return at;const split=8+4*amount;return beat*16+(part<=8?part*split/8:split+(part-8)*(16-split)/8);};
   for(const n of notes){const at=warp(n.at),end=warp(n.at+n.ticks);events.push({...n,bar:b,time:((b-start)*cap+at)*second,length:(end-at)*second});}
  }
  return {events,total:(score.measures.length-start)*cap*second,second,capacity:cap,start};
 }
 function lyrics(score,text,bar,index=0){const tokens=String(text).trim().split(/\s+/).flatMap(word=>{const parts=word.split('-').filter(Boolean);return parts.map((p,i)=>p+(i<parts.length-1?'-':''));}).filter(Boolean);const targets=[];for(let b=bar;b<score.measures.length;b++)for(let n=b===bar?index:0;n<score.measures[b].notes.length;n++)if(!score.measures[b].notes[n].rest)targets.push(score.measures[b].notes[n]);if(tokens.length>targets.length)throw Error('Add more melody notes first: '+tokens.length+' syllables need '+tokens.length+' notes.');tokens.forEach((t,i)=>targets[i].lyric=t.slice(0,40));return tokens.length;}
 root.UkeMelody={meters,durations,names,keys,copy,capacity,ticks,used,note,normalize,fromSong,put,changeMeter,resolved,rests,swingSupported,swingLabel,feelMark,timeline,lyrics};if(typeof module!=='undefined'&&module.exports)module.exports=root.UkeMelody;
})(typeof window!=='undefined'?window:globalThis);
