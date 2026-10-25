import {track,sanitize} from './rhythm.js';
// Original Berlin School studies. Eight authored harmonic measures, independent
// subdivisions, alternating contour and phrase accents; never sampled melodies.
export const BERLIN_CATEGORY='Berlin School';
export const BERLIN_PALETTES={
 'Tangerine Afterburn':[23,302,184],'Amber Autobahn':[36,213,323],
 'Violet Voltage':[272,163,30],'Glass Meridian':[193,282,44],
 'Red Desert Relay':[9,37,239],'Magnetic Night Train':[222,27,170],
 'Satellites in Thirteen':[162,285,51],'Chrome Mirage':[309,186,24],
 'Solar Spiral':[45,167,297],'Beyond the Last Signal':[248,198,344]
};
const colors={m:[0,3,7,12,14,15,19],M:[0,4,7,12,14,16,19],s:[0,2,7,12,14,19,24],d:[0,3,7,9,12,14,19]};
const harmony=text=>text.split(' ').map(token=>{const [,r,type]=/^(-?\d+)([mMsd])$/.exec(token);return {root:+r,type,pool:colors[type].map(n=>+r+n),label:(+r?'+'+r:'0')+' '+({m:'minor',M:'major',s:'sus2',d:'Dorian'})[type]};});
function phrasePart(program,octave,volume,h,events,{steps=16,...extra}={}){
 const phrase=h.map((chord,bar)=>{const page={label:`${bar<4?'A':'B'}${bar%4+1} · ${chord.label}`,pattern:Array(steps).fill(0),notes:Array.from({length:steps},()=>[]),gates:Array(steps).fill(70)};
  for(const [step,notes,gate,accent=1] of events(chord,bar)){if(notes==null)continue;if(step<0||step>=steps||!Number.isInteger(step))throw Error('Berlin phrase step out of range');page.pattern[step]=accent;page.notes[step]=Array.isArray(notes)?notes:[notes];page.gates[step]=gate;}return page;});
 return track(0,program,steps,phrase[0].pattern.filter(Boolean).length,{octave,volume,mode:'poly',pattern:phrase[0].pattern,phrase,notes:[0],voice:'melody',gate:100,reverb:0,delay:0,pan:64,probability:100,swell:35,swellBars:4,motion:0,motionRate:16,mute:false,...extra});
}
function sequence(program,octave,volume,h,a,b,{steps=16,mask='x'.repeat(steps),accent=4,gate=48,turn=0,...extra}={}){
 if(mask.length!==steps)throw Error('Berlin rhythm length mismatch');
 return phrasePart(program,octave,volume,h,(ch,bar)=>Array.from({length:steps},(_,j)=>{const motif=bar<4?a:b,shift=(bar%4===3?turn:0),index=motif[(j+shift)%motif.length];return [j,mask[j]==='.'?null:ch.pool[index%ch.pool.length],gate+(j%3===1?6:0),mask.includes('X')?(mask[j]==='X'?2:1):((j+bar*steps)%accent===0?2:1)];}),{steps,pan:35,delay:30,swell:46,motion:40,motionRate:11,...extra});
}
function bass(h,{program=38,volume=68,mask='X.x.X.xx',octave=1,...extra}={}){
 return phrasePart(program,octave,volume,h,(ch,bar)=>[...mask].flatMap((c,j)=>{const root=ch.root>5?ch.root-12:ch.root;return c==='.'?[]:[[j,root+(j===5?7:j===7&&bar%2?12:0),j===7?42:67,c==='X'?2:1]];}),{steps:8,swell:15,swellBars:4,evolveLock:true,...extra});
}
function pad(program,volume,h,{octave=2,pan=70,...extra}={}){
 return phrasePart(program,octave,volume,h,(ch,bar)=>{const third=ch.type==='M'?4:ch.type==='s'?2:3;const v=[ch.root+7,ch.root+12,ch.root+third+12,ch.root+19];if(bar%2)v[0]+=12;return [[0,[...new Set(v)],184]];},{steps:2,pan,swell:56,swellBars:8,motion:70,motionRate:13,...extra});
}
function reply(program,volume,h,{octave=4,...extra}={}){
 return phrasePart(program,octave,volume,h,(ch,bar)=>bar%2?[[4,ch.pool[2],120],[10,ch.pool[1],160]]:[[7,ch.pool[3],175],[14,ch.pool[4],80]],{octave,pan:95,delay:25,swell:65,swellBars:6,motion:24,...extra});
}
function drum(note,volume,h,patterns,{program=25,...extra}={}){
 const ps=Array.isArray(patterns)?patterns:[patterns];return phrasePart(program,3,volume,h,(_,bar)=>[...ps[bar%ps.length]].flatMap((c,j)=>c==='.'?[]:[[j,0,35,c==='X'?2:1]]),{bank:128,drum:note,evolveLock:true,swell:18,...extra});
}
function make(id,name,description,bpm,key,scale,h,parts,{mix=22,decay=7,tone=4200,evolve=38,humanize=0}={}){
 const tracks=Array.from({length:8},(_,i)=>parts[i]||track(i,0,4,0,{mute:true,volume:0,reverb:0,delay:0}));
 for(const t of tracks)if(!t.mute)t.volume=Math.min(96,Math.round(t.volume*(id===4?1.55:1.3)));
 return {id:'berlin-'+String(id).padStart(2,'0'),category:BERLIN_CATEGORY,description,state:sanitize({name,bpm,bars:1,key,scale,master:85,tracks,ambient:{enabled:true,mix,decay,tone,predelay:38,width:100,lowcut:240},evolution:{enabled:true,amount:evolve,seed:7240+id*173},groove:{feel:'straight',amount:60,humanize,seed:321+id}})};
}
const a=harmony('0m 0m 0m 0m 8M 8M 10s 0m');
const b=harmony('0m 0m 10M 10M 5m 5m 0m 0m');
const c=harmony('0d 0d 5M 5M 0d 0d 10M 0d');
const d=harmony('0m 0m 8M 8M 3M 3M 10s 0m');
const e=harmony('0m 0m 8M 8M 5m 1M 0m 0m');
const f=harmony('0s 0m 0s 0m 5m 5m 10s 0m');
const g=harmony('0m 0m 0m 0m 5m 5m 8M 0m');
const h=harmony('0m 0m 10M 10M 8M 8M 0m 0m');
const i=harmony('0d 0d 5M 5M 10M 10M 0d 0d');
const j=harmony('0m 0m 0s 0s 8M 8M 0s 0m');
export const BERLIN_PRESETS=[
 make(1,'Tangerine Afterburn','Rolling voltage · A clipped square-wave engine, seven-against-sixteen answers and wide string haze. The second half opens into amber chords, then drops back into the pulse.',116,9,'Minor',a,[
  sequence(80,3,44,a,[0,2,3,2,1,2,4,2],[0,2,4,3,2,1,2,3],{mask:'XxxxXxxxXxxxXx.x',gate:41,accent:4,pan:34,delay:37,turn:2}),
  sequence(81,3,25,a,[3,2,4,2,3,1,2],[4,3,2,5,3,2,1],{steps:7,mask:'x.xx.xx',gate:29,accent:3,pan:98,delay:39,swell:65,motion:64,motionRate:7}),
  bass(a),pad(89,31,a),pad(50,19,a,{pan:48,octave:3,swell:72,motionRate:19}),
  drum(36,48,a,'X.......X..x....'),drum(37,25,a,'....x.......x...'),drum(42,21,a,['x.x.x.x.x.x.x.x.','x.x.x.x.x.x.xx.x'],{pan:82})
 ],{mix:21,decay:7.2,evolve:38}),
 make(2,'Amber Autobahn','Night-drive momentum · An eight-note saw sequence, displaced eleven-step chiffer and deep eighth-note bass. Tight electronic drums keep the changing accents on the road.',124,4,'Minor',b,[
  sequence(81,2,39,b,[0,2,3,2,0,1,2,4],[0,2,4,3,2,1,3,2],{gate:38,accent:3,pan:40,delay:30,motion:56,motionRate:9}),
  sequence(83,4,26,b,[0,2,3,1,2,4,2,3,1,2,0],[3,2,1,4,2,3,0,2,1,3,2],{steps:11,mask:'x.x.xx.x.xx',gate:35,accent:5,pan:94,swell:60,delay:25}),
  bass(b,{program:39,volume:72,mask:'XxxxXxxx'}),pad(90,25,b,{pan:72,motion:74}),
  reply(50,22,b,{octave:3,pan:28,delay:17}),drum(36,49,b,'X...x...X...x...'),drum(38,28,b,'....X.......X...'),drum(42,20,b,'x.x.xxx.x.x.xxx.',{pan:87})
 ],{mix:17,decay:4.6,evolve:34}),
 make(3,'Violet Voltage','Seven meets eleven · Two glassy synth patterns rotate around a solid low pulse. Dorian pads brighten the middle while accents travel between the stereo edges. No kick or snare.',108,2,'Dorian',c,[
  sequence(80,3,39,c,[0,2,3,1,2,4,2],[0,3,2,4,1,3,2],{steps:7,gate:42,accent:3,pan:29,delay:35,motion:61,motionRate:7}),
  sequence(82,3,25,c,[3,2,1,2,4,3,2,0,2,3,1],[4,3,2,1,3,2,5,3,2,1,0],{steps:11,mask:'x.xx.x.x.xx',gate:34,accent:5,pan:100,delay:29,swell:70,motion:55,motionRate:11}),
  bass(c,{volume:69,mask:'X.x.X.x.'}),pad(95,24,c,{pan:69,motion:88,motionRate:9}),pad(89,24,c,{pan:51}),reply(98,16,c,{octave:4,pan:80}),drum(76,18,c,'...x..x....x..x.',{pan:22,delay:12})
 ],{mix:26,decay:9.2,evolve:52}),
 make(4,'Glass Meridian','Crystal circuitry · FM piano ripples in eight, square-wave lights answer in thirteen, and a soft string canopy hangs over the bass. Crisp attacks dissolve into a long blue space.',96,6,'Minor',d,[
  sequence(5,3,49,d,[0,2,3,4,3,2,1,2],[3,2,4,3,5,3,2,1],{steps:8,gate:79,accent:4,pan:33,delay:36,motion:29,swell:59}),
  sequence(80,3,24,d,[3,2,4,2,3,1,2,4,3,2,1,2,0],[4,3,2,1,2,3,5,3,2,4,3,1,2],{steps:13,mask:'x.x.xx.x.x.xx',gate:27,accent:5,pan:96,delay:33,swell:72}),
  bass(d,{program:39,volume:65,mask:'X...X.x.'}),pad(94,26,d),pad(49,25,d,{pan:40,swell:68,motion:42}),reply(92,17,d,{octave:3,pan:87}),drum(42,15,d,'x...x...x...x...', {pan:24})
 ],{mix:29,decay:11,tone:4700,evolve:34}),
 make(5,'Red Desert Relay','Maximum motion · A sixteenth-note saw engine, five-part answers and eleven metallic sparks race above deep toms. A dark semitone chord turn in measure six kicks the sequence back home.',132,0,'Minor',e,[
  sequence(81,3,36,e,[0,2,0,3,2,1,2,4],[0,3,2,4,3,2,1,2],{mask:'XxxxXxxxXxxxXxxx',gate:30,accent:3,pan:35,delay:32,motion:69,motionRate:7,turn:3}),
  sequence(80,3,30,e,[3,2,4,1,2],[4,3,2,5,3],{steps:5,gate:36,accent:2,pan:96,delay:40,motion:61,motionRate:9,swell:62}),
  bass(e,{program:38,octave:2,volume:74,mask:'Xx.xXxxx'}),pad(90,24,e,{pan:67,motion:76}),
  sequence(98,4,15,e,[0,2,3,2,1,4,3,2,1,2,0],[3,2,4,3,1,2,5,3,2,1,0],{steps:11,mask:'x..x.x..x..',gate:28,accent:5,pan:75,delay:24,swell:75}),
  drum(36,49,e,'X...x...X.x...x.'),drum(41,29,e,['......x.......x.','...x......x..xx.'],{pan:48}),drum(42,18,e,'x.x.x.x.x.x.x.xx',{pan:90})
 ],{mix:16,decay:5.3,tone:3800,evolve:57}),
 make(6,'Magnetic Night Train','Hypnotic transit · A three-three-two accent cycle turns inside a steady sixteenth-note pattern. Seven-step high signals and rounded bass pull through suspended and minor harmonies.',112,2,'Minor',f,[
  sequence(80,3,43,f,[0,2,3,0,2,4,2,1],[0,3,2,4,2,1,3,2],{mask:'XxxXxxXxXxxXxxXx',gate:43,accent:3,pan:32,delay:39,turn:1,motionRate:12}),
  sequence(83,4,22,f,[0,2,1,3,2,4,2],[2,3,1,2,4,3,2],{steps:7,mask:'.xx.x.x',gate:33,accent:4,pan:99,delay:36,swell:68}),
  bass(f,{program:39,volume:70,mask:'X.x.X.xx'}),pad(89,30,f,{pan:69}),reply(50,21,f,{octave:3,pan:44,motion:48}),drum(36,43,f,'X.......X.......'),drum(37,23,f,'....x.......x...'),drum(42,17,f,'x.x.x.x.x.x.x.x.',{pan:85})
 ],{mix:23,decay:8.2,evolve:41,humanize:3}),
 make(7,'Satellites in Thirteen','Thirteen against eight against five · Three separate synth orbits pass one another over a protected bass pulse. A long minor pedal lets the rhythm get strange before the harmony lifts.',118,7,'Minor',g,[
  sequence(80,3,38,g,[0,2,3,2,1,2,4,3,2,0,2,3,1],[0,3,2,4,3,2,1,5,3,2,4,1,2],{steps:13,mask:'x.xx.xxxx.x.x',gate:37,accent:5,pan:29,delay:33,motion:63,motionRate:13}),
  sequence(81,3,24,g,[3,2,4,2,1,2,3,2],[4,2,3,1,5,3,2,1],{steps:8,mask:'.xx.x.xx',gate:28,accent:3,pan:99,delay:36,swell:67}),
  bass(g,{volume:73,mask:'X.x.X.x.'}),pad(95,24,g,{pan:68,motion:86,motionRate:11}),
  sequence(82,4,18,g,[0,2,1,3,2],[2,1,3,4,2],{steps:5,mask:'x.xx.',gate:32,accent:2,pan:72,delay:30,swell:75}),drum(36,38,g,'X.......X.......'),drum(50,21,g,['...x......x.....','......x......x.x'],{pan:42}),drum(42,14,g,'x.x.x.x.x.x.x.x.',{pan:86})
 ],{mix:23,decay:7.5,evolve:60}),
 make(8,'Chrome Mirage','Neon propulsion · Clipped synth bass and square-wave octaves meet an off-center five-part marimba. The wood attack cuts through a violet polysynth haze and a tight electronic backbeat.',128,11,'Minor',h,[
  sequence(80,2,44,h,[0,2,3,2,0,3,2,4],[0,3,2,4,3,1,2,3],{gate:35,accent:4,pan:34,delay:31,motion:57,motionRate:9}),
  sequence(12,3,46,h,[3,2,1,2,4],[2,4,3,1,2],{steps:5,gate:61,accent:3,pan:97,delay:27,swell:65,motion:18}),
  bass(h,{program:39,volume:71,mask:'X.xxX.xx'}),pad(90,23,h,{pan:71}),reply(81,18,h,{octave:4,pan:85,motion:63,delay:33}),drum(36,48,h,'X...x...X..x....'),drum(38,27,h,'....X.......X...'),drum(42,18,h,'x.x.xx.x.x.x.xx.',{pan:79})
 ],{mix:18,decay:5.1,tone:4100,evolve:45}),
 make(9,'Solar Spiral','Bright, restless ascent · Seven-note square waves climb through Dorian harmony while twelve soft FM pulses and five crystal points interlock. Broad strings carry the lift; no drum kit.',104,9,'Dorian',i,[
  sequence(80,3,37,i,[0,1,2,3,2,4,3],[0,2,3,4,3,5,4],{steps:7,gate:43,accent:3,pan:32,delay:35,motion:54,motionRate:10}),
  sequence(5,3,40,i,[0,2,3,2,1,2],[3,2,4,2,1,3],{steps:12,mask:'x.xx.xx.xx.x',gate:58,accent:4,pan:93,delay:26,swell:64}),
  bass(i,{program:38,volume:65,mask:'X.x.X.x.'}),pad(50,27,i,{pan:71,octave:2}),pad(94,21,i,{pan:50,octave:3,motion:72}),
  sequence(98,4,15,i,[0,2,3,2,1],[3,2,4,3,2],{steps:5,mask:'x..x.',gate:55,accent:3,pan:80,delay:24,swell:75})
 ],{mix:28,decay:10,tone:5100,evolve:40}),
 make(10,'Beyond the Last Signal','Deep-space engine · A low square-wave ostinato moves immediately beneath bowed glass and dark choir haze. Seven-step lights and five slow bass pulses keep the darkness quietly alive.',88,2,'Minor',j,[
  sequence(80,2,39,j,[0,2,3,2,0,1,2,1],[0,2,4,3,2,1,3,2],{mask:'XxxxXx.xXxxxXx.x',gate:47,accent:4,pan:34,delay:38,motion:70,motionRate:8,swell:58}),
  sequence(92,3,27,j,[3,2,4,2,1,3,2],[4,3,2,1,3,4,2],{steps:7,mask:'x.x.xx.',gate:98,accent:3,pan:98,delay:20,motion:82,motionRate:11,swell:73}),
  sequence(38,1,63,j,[0,0,2,0,0],[0,2,0,0,3],{steps:5,gate:52,accent:5,pan:62,delay:0,motion:16,swell:20,evolveLock:true}),
  pad(89,29,j,{pan:55,motion:63}),pad(91,19,j,{pan:80,motion:80,motionRate:9}),reply(98,17,j,{octave:4,pan:90,swell:77,delay:33})
 ],{mix:33,decay:15,tone:3300,evolve:43})
];
