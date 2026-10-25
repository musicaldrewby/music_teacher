import {harmony} from './music-presets.js?v=14';
export const ROLL={width:2048,height:1024,left:150,right:1650,top:180,bottom:732,drumTop:756,drumHeight:26};
export const INSTRUMENTS={gong:['Gong','#e9bd6a'],windchimes:['Wind chimes','#9ae5d9'],steelpan:['Steelpan','#ffcf77'],bass:['Bass machine','#73efb2'],piano:['Piano','#ffc66d'],sx:['Soprano xylophone','#ff9780'],ax:['Alto xylophone','#f57857'],bx:['Bass xylophone','#d96454'],sm:['Soprano metallophone','#94ece7'],am:['Alto metallophone','#5dd6d2'],bm:['Bass metallophone','#31aaa9'],glock:['Glockenspiel','#e6e9ff'],bw:['Boomwhackers','#b4e36b'],maracas:['Maracas','#f4d776'],tambourine:['Tambourine','#f39fca'],cowbell:['Cowbell','#bba2fb'],synth:['Synthesizer','#bca0ff'],drums:['Drum machine','#6caeff'],xylophone:['Xylophone','#f57857'],metallophone:['Metallophone','#5dd6d2']};
export const PERCUSSION=['kick','snare','hat','clap','maracas','tambourine','cowbell','gong'];
const labels=['Kick','Snare','Hi-hat','Clap','Maracas','Tambourine','Cowbell','Gong'];
export function instrument(event){return event.instrumentId||({glockenspiel:'glock',boomwhacker:'bw',kick:'drums',snare:'drums',hat:'drums',clap:'drums'}[event.type])||event.type;}
export function rollBeat(source,now){if(source.state==='stopped'||now<source.origin)return 0;const beats=source.bars*4;return (((now-source.origin)/source.beatSeconds)%beats+beats)%beats;}
export function splitNote(beat,duration,total){const start=((beat%total)+total)%total,len=Math.min(total,Math.max(.03,duration)),first=Math.min(len,total-start);return len>first?[[start,first],[0,len-first]]:[[start,first]];}
export function rollModel(source,now,title='Our music'){
 const notes=[];for(const [events,isNew]of [[source.events,false],[source.take,true]])for(const event of events){const held=source.activeCaptures?.get(event);const duration=held!==undefined?Math.max(.03,(Math.min(now,source.recordEnd)-held)/source.beatSeconds):event.duration;notes.push({...event,duration,isNew,held:held!==undefined,instrument:instrument(event)});}
 if(source.drumPattern)for(let measure=0;measure<source.bars;measure++)for(let voice=0;voice<4;voice++)for(let step=0;step<16;step++)if(source.drumPattern[voice][step])notes.push({type:PERCUSSION[voice],instrument:'drums',beat:measure*4+step/4,duration:.18,velocity:.75,backing:true});
 if(source.bassPattern)for(let bar=0;bar<source.bars;bar++)source.bassPattern.steps.forEach((step,i)=>{if(step)notes.push({type:'bass',instrument:'bass',midi:step.midi,beat:bar*4+i/4,duration:.22,backing:true});});
 const pitched=notes.filter(n=>!PERCUSSION.includes(n.type));let low=48,high=84;for(const n of pitched){low=Math.min(low,Math.floor(n.midi/12)*12);high=Math.max(high,Math.ceil(n.midi/12)*12);}
 const counts=new Map();for(const note of notes)counts.set(note.instrument,(counts.get(note.instrument)||0)+1);
 return{notes,low,high,counts,bars:source.bars,total:source.bars*4,bpm:source.bpm,harmony:source.harmony,title,state:source.state,mode:source.mode,status:source.status(now),beat:rollBeat(source,now)};
}
export class PianoRoll{
 constructor(canvas){this.canvas=canvas;canvas.width=1536;canvas.height=768;this.key=null;}
 draw(source,now,title){
  const beat=rollBeat(source,now);const key=[[...(source.mutedParts||[])].sort().join(','),source.visualRevision,source.state,source.mode,source.bars,title,Math.floor(beat),JSON.stringify(source.bassPattern),source.drumPattern?.flat().map(Number).join(''),source.activeCaptures?.size?Math.floor(now*8):'',source.state==='countin'?Math.ceil((source.recordStart-now)/source.beatSeconds):''].join('|');
  if(key===this.key)return false;this.key=key;const m=rollModel(source,now,title);this.model=m;
  const c=this.canvas.getContext('2d');c.save();c.scale(this.canvas.width/ROLL.width,this.canvas.height/ROLL.height);
  const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
  const text=(value,x,y,size=24,color='#b5c5dd',align='left')=>{c.font=`500 ${size}px sans-serif`;c.fillStyle=color;c.textAlign=align;c.fillText(value,x,y);};
  rect(0,0,2048,1024,'#081122');rect(0,0,2048,116,'#14213b');rect(0,0,2048,5,'#74e0e6');
  text('THE NOTE WALL',40,48,28,'#89eaf0');text(m.title.length>32?m.title.slice(0,31)+'…':m.title,40,89,31,'#edf4ff');
  const running=m.state==='recording',accent=running?'#ff7d93':'#80e5ed';
  text(m.status.toUpperCase(),1605,52,26,accent,'right');text(`${m.bpm} BPM   /   ${m.bars} MEASURES`,1605,89,23,'#a0b7d6','right');
  rect(1690,116,358,908,'#111e34');text('TAP TO MUTE / UNMUTE',1710,149,21,'#b9f2ed');text('ALL ON',2008,175,18,'#8df2d8','right');
  const x=ROLL.left,w=ROLL.right-x,h=ROLL.bottom-ROLL.top,row=h/(m.high-m.low+1);
  for(let midi=m.low;midi<=m.high;midi++){const y=ROLL.top+(m.high-midi)*row;rect(x,y,w,row,[1,3,6,8,10].includes(midi%12)?'#0b1629':'#102037');if(midi%12===0){rect(x,y,w,1,'#2a3e56');text('C'+(midi/12-1),x-18,y+Math.max(row,16)*.8,22,'#789bb9','right');}}
  for(let bar=0;bar<m.bars;bar++){text(String(bar+1).padStart(2,'0'),x+bar*w/m.bars+12,159,27,'#d4e8f6');if(bar%2)rect(x+bar*w/m.bars,ROLL.top,w/m.bars,h,'#ffffff04');}
  for(let lane=0;lane<PERCUSSION.length;lane++){const y=ROLL.drumTop+lane*ROLL.drumHeight;rect(x,y,w,ROLL.drumHeight-2,lane%2?'#15223a':'#0e1b31');text(labels[lane],x-16,y+20,20,'#9caecc','right');}
  const gridBottom=ROLL.drumTop+PERCUSSION.length*ROLL.drumHeight;
  for(let i=0;i<=m.total*4;i++){const gx=x+i/(m.total*4)*w;rect(gx,ROLL.top,i%16===0?3:1,gridBottom-ROLL.top,i%16===0?'#4a627e':i%4===0?'#2d425e':'#192b43');}
  c.save();c.beginPath();c.rect(x,ROLL.top,w,gridBottom-ROLL.top);c.clip();
  for(const n of m.notes){const lane=PERCUSSION.indexOf(n.type),meta=INSTRUMENTS[n.instrument]||['Instrument','#bac9dd'];let y,nh,duration=n.duration;
   if(lane>=0){y=ROLL.drumTop+lane*ROLL.drumHeight+4;nh=19;duration=Math.min(.22,n.duration);}
   else{y=ROLL.top+(m.high-n.midi)*row+1;nh=Math.max(3,row-2);}
   c.globalAlpha=source.mutedParts?.has(n.instrument)?.16:n.isNew?1:.83;
   for(const [beat,len]of splitNote(n.beat,duration,m.total)){const nx=x+beat/m.total*w,nw=Math.max(5,len/m.total*w-1);rect(nx,y,nw,nh,meta[1]);rect(nx,y,Math.min(nw,3),nh,'#f2f7ff');if(n.isNew){c.strokeStyle='#fff0d5';c.lineWidth=1.5;c.strokeRect(nx+.5,y+.5,nw-1,nh-1);}}
  }
  c.restore();
  const entries=m.counts.size?[...m.counts]:Object.keys(INSTRUMENTS).filter(k=>k!=='piano').slice(0,15).map(k=>[k,0]);
  this.parts=[];let cy=204;const spacing=Math.min(53,740/entries.length);for(const [id,count]of entries){const [name,color]=INSTRUMENTS[id]||['Instrument','#bac9dd'],muted=source.mutedParts?.has(id);this.parts.push({id,name,top:cy-25,bottom:cy-25+spacing,muted:!!muted});rect(1705,cy-25,328,spacing-3,muted?'#352c3a':'#192f46');rect(1720,cy-19,10,26,muted?'#765c6a':count?color:'#34435a');text(name,1743,cy,23,muted?'#b798a5':count?'#e1eafa':'#71869f');text(muted?'MUTED':'ON',2004,cy+15,16,muted?'#ff9faf':color,'right');cy+=spacing;}
  if(!m.notes.length){rect(470,410,850,130,'#162741');text('Your music starts here.',895,466,38,'#d4edf3','center');text('Record a phrase. Watch the notes appear.',895,505,25,'#92b5c9','center');}
  text(harmony(m.harmony).name+'  ·  PITCH ↑  TIME →',40,1002,19,'#7d97b5');text(m.state==='recording'?'NEW NOTES ARE OUTLINED  •  HOLD SYNTH KEYS TO STRETCH THEM':'YOUR INSTRUMENTS + DRUM PATTERN  •  ONE SHARED LOOP',1650,1002,19,accent,'right');
  c.restore();return true;
 }
 partAt(x,y){if(x<1690||x>2048)return null;if(y>=150&&y<179)return '__all__';return this.parts?.find(p=>y>=p.top&&y<p.bottom)?.id||null;}
 mirror(canvas,beat,visible,color='#83eff6'){
  const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.drawImage(this.canvas,0,0,canvas.width,canvas.height);
  if(!visible||!this.model)return;const x=(ROLL.left+beat/this.model.total*(ROLL.right-ROLL.left))*canvas.width/ROLL.width;c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.moveTo(x,ROLL.top*canvas.height/ROLL.height);c.lineTo(x,964*canvas.height/ROLL.height);c.stroke();
 }
}
