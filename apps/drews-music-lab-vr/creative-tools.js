import {INSTRUMENTS,instrument} from './piano-roll.js?v=30';
export const CHALLENGES=[
 {id:'four',title:'Four-note melody',text:'Choose four notes. Give them a rhythm, then add a second instrument with Overdub.',stations:['steelpan','ax'],rhythm:'First beat'},
 {id:'answer',title:'Musical conversation',text:'Play a short question in measures 1–2. Overdub an answer on another instrument in measures 3–4.',stations:['ax','am']},
 {id:'three',title:'Three-instrument band',text:'Build a beat, add a bass line, then record a melody. Use the mixer to help each part be heard.',stations:['drums','bass','bw'],rhythm:'First beat'},
 {id:'rain',title:'A gentle rainstorm',text:'Start with light maraca taps. Overdub wind chimes, then a soft gong. Leave space between sounds.',stations:['maracas','windchimes','gong']}
];
export const GUIDE_STEPS={pick:['1 / 3 · Choose an instrument','Choose a sound you like. Try a few notes first.','choose-instrument'],record:['2 / 3 · Record your first part','Press Record, wait for four clicks, then play. The four-measure take ends automatically.','quick-record'],layer:['3 / 3 · Add another part','Choose another instrument, then Overdub. Press Stop when you finish adding notes.','quick-overdub'],done:['You made a song!','Listen, adjust the mixer, then Save Song to keep or share it.','quick-save']};
export class FirstSongGuide{
 constructor(){this.stage=null;this.inTake=false;this.before=0;}
 start(){this.stage='pick';this.inTake=false;}
 select(){if(this.stage==='pick')this.stage='record';}
 observe(r){if(!this.stage)return;const taking=r.state==='recording';
  if(taking&&!this.inTake&&((this.stage==='record'&&r.mode==='replace')||(this.stage==='layer'&&r.mode==='overdub'))){this.inTake=true;this.before=r.events.length;}
  if(this.inTake&&!r.taking){const success=r.events.length>this.before;this.inTake=false;if(success)this.stage=this.stage==='record'?'layer':'done';}
 }
 close(){this.stage=null;this.inTake=false;}
 get content(){return GUIDE_STEPS[this.stage]||null;}
}
export function songParts(source){const ids=new Set([...(source.events||[]),...(source.take||[])].map(instrument));if(source.drumPattern?.some(r=>r.some(Boolean)))ids.add('drums');if(source.bassPattern?.steps.some(Boolean))ids.add('bass');return [...ids].map(id=>({id,name:INSTRUMENTS[id]?.[0]||id,color:INSTRUMENTS[id]?.[1]||'#bca0ff',volume:source.mix?.[id]?.volume??1,muted:source.mix?.[id]?.muted??false}));}
export function mixLevel(source,id){const p=source.mix?.[id];return p?.muted?0:p?.volume??1;}
// Fixed-size canvas and bounded events: one texture, no new room lights.
export class Constellation{
 constructor(canvas){this.canvas=canvas;canvas.width=1024;canvas.height=512;this.stars=[];this.serial=0;}
 trigger(event,now){const id=instrument(event),color=INSTRUMENTS[id]?.[1]||'#bca0ff',lane=Math.max(0,Object.keys(INSTRUMENTS).indexOf(id)),pitch=event.midi??60;
  this.stars.push({id,color,at:now,x:72+((pitch*73+lane*137)%880),y:110+((pitch*37+lane*91)%280),strength:event.velocity??.75});if(this.stars.length>96)this.stars.shift();
 }
 clear(){this.stars.length=0;}
 draw(now,title,playing,calm=false){const c=this.canvas.getContext('2d'),w=1024,h=512;c.fillStyle='#071926';c.fillRect(0,0,w,h);const bg=c.createRadialGradient(512,255,20,512,255,560);bg.addColorStop(0,'#17384b');bg.addColorStop(1,'#071322');c.fillStyle=bg;c.fillRect(0,0,w,h);
  for(let i=0;i<64;i++){c.fillStyle='rgba(178,208,229,.28)';c.beginPath();c.arc((i*137.5)%w,76+(i*83.7)%390,i%5===0?1.7:.8,0,Math.PI*2);c.fill();}
  this.stars=this.stars.filter(s=>now-s.at<4&&now>=s.at);const previous=new Map();
  for(const s of this.stars){const age=now-s.at,alpha=Math.max(0,1-age/4),r=2+s.strength*4,prior=previous.get(s.id);c.globalAlpha=alpha*.5;c.strokeStyle=s.color;c.lineWidth=1.3;if(prior){c.beginPath();c.moveTo(prior.x,prior.y);c.lineTo(s.x,s.y);c.stroke();}previous.set(s.id,s);c.globalAlpha=alpha;c.fillStyle=s.color;c.beginPath();c.arc(s.x,s.y,r,0,Math.PI*2);c.fill();if(!calm){c.globalAlpha=alpha*.22;c.beginPath();c.arc(s.x,s.y,r+age*12,0,Math.PI*2);c.stroke();}}
  c.globalAlpha=1;c.textAlign='center';c.font='600 28px sans-serif';c.fillStyle='#f8eacb';c.fillText(title||'Your musical constellation',512,48,930);c.font='16px sans-serif';c.fillStyle='#adcfce';c.fillText(playing?'Each instrument has its own color · every note makes a star':'Press Play to light up your song',512,483);
 }
}
export function drawInstrumentIcon(canvas,id){canvas.width=144;canvas.height=88;const c=canvas.getContext('2d'),color=INSTRUMENTS[id]?.[1]||'#bca0ff';c.fillStyle='#193e43';c.fillRect(0,0,144,88);c.strokeStyle=color;c.lineWidth=3;c.fillStyle=color;
 if(['sx','ax','bx','sm','am','bm','glock','xylophone','metallophone'].includes(id)){for(let i=0;i<13;i++)c.fillRect(8+i*10,13+i*.7,7,62-i*2.4);}
 else if(id==='steelpan'||id==='gong'){c.beginPath();c.ellipse(72,44,54,32,0,0,Math.PI*2);c.stroke();for(let i=0;i<(id==='gong'?1:13);i++){const a=i/8*Math.PI*2,r=i<8?30:13;c.beginPath();c.ellipse(id==='gong'?72:72+Math.sin(a)*r,id==='gong'?44:44+Math.cos(a)*r*.65,id==='gong'?10:5,4,0,0,Math.PI*2);c.fill();}}
 else if(id==='synth'||id==='piano'){for(let i=0;i<10;i++){c.fillStyle='#f4eddb';c.fillRect(11+i*12,30,10,45);if(i%7!==2&&i%7!==6){c.fillStyle='#193e43';c.fillRect(18+i*12,30,6,25);}}c.fillStyle=color;c.fillRect(11,12,120,10);}
 else if(id==='bw'||id==='windchimes'){for(let i=0;i<(id==='bw'?8:6);i++){c.fillStyle=id==='bw'?['#e35c55','#ee9453','#e4cc62','#93bb5a','#4a9e89','#6c9db6','#a781bc','#e35c55'][i]:color;c.fillRect(15+i*15,12,10,64-i*6);}}
 else if(id==='drums'||id==='bass'){for(let row=0;row<3;row++)for(let col=0;col<8;col++){c.globalAlpha=(row+col)%3===0?1:.35;c.fillRect(10+col*16,17+row*21,12,13);}c.globalAlpha=1;}
 else if(id==='maracas'){for(const x of [49,95]){c.fillRect(x-3,38,6,36);c.beginPath();c.ellipse(x,29,17,22,x===49?-.3:.3,0,Math.PI*2);c.fill();}}
 else if(id==='tambourine'){c.beginPath();c.ellipse(72,44,43,30,0,0,Math.PI*2);c.stroke();for(let i=0;i<8;i++){c.beginPath();c.arc(72+Math.cos(i*Math.PI/4)*43,44+Math.sin(i*Math.PI/4)*30,5,0,Math.PI*2);c.fill();}}
 else{c.beginPath();c.moveTo(55,18);c.lineTo(89,18);c.lineTo(109,67);c.lineTo(35,67);c.closePath();c.stroke();c.fillRect(56,12,32,4);}
}
