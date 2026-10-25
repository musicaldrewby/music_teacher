import {track,sanitize} from './rhythm.js';

// Fifteen original arrangements, with eight written measures per part.
// All pitched notes are chromatic offsets from the project tonic. The bass and
// rhythm section are protected while the upper voices keep evolving.
export const GROOVE_TRIO_CATEGORIES=['Cosmic Marimba','Neon Night Drive','Gravity Games'];
export const GROOVE_TRIO_PALETTES={
 'Emberwood Spiral':[29,172,294], 'Moonlit Mallet Express':[215,41,281],
 'Prismatic Canopy':[148,312,48], 'Obsidian Bloom':[277,28,159],
 'Sunwheel Ceremony':[47,191,333], 'Electric Coastline':[184,326,39],
 'Midnight Overpass':[237,16,183], 'Violet Velocity':[291,175,49],
 'Tunnel of Afterimages':[13,251,164], 'Dawn on the Ring Road':[351,43,202],
 'Five Against the Floor':[169,32,307], 'Sevenfold Switch':[318,188,63],
 'Eleven Moons Dancing':[203,301,35], 'Thirteen-Step Fever':[7,166,284],
 'The Great Alignment':[261,44,182]
};
const intervals={m:[0,3,7,10,12,14,19],M:[0,4,7,9,12,14,19],d:[0,3,7,9,12,14,19],s:[0,5,7,12,14,17,19]};
const harmony=text=>text.split(' ').map(token=>{
 const match=/^(-?\d+)([mMds])$/.exec(token);if(!match)throw Error('Invalid groove harmony');
 const root=+match[1],kind=match[2];return {root,kind,pool:intervals[kind].map(n=>n+root)};
});
function part(program,octave,volume,h,events,{steps=16,...options}={}){
 const phrase=h.map((ch,bar)=>{
  const page={label:`${bar<4?'A':'B'}${bar%4+1} · ${ch.root===0?'Tonic':(ch.root>0?'+':'')+ch.root} ${ch.kind==='M'?'major':ch.kind==='d'?'Dorian':ch.kind==='s'?'open':'minor'}`,pattern:Array(steps).fill(0),notes:Array.from({length:steps},()=>[]),gates:Array(steps).fill(60)};
  for(const [at,notes,gate,accent=1] of events(ch,bar)){
   if(notes===null)continue;
   if(!Number.isInteger(at)||at<0||at>=steps||gate<5||gate>1600)throw Error('Invalid groove phrase');
   page.pattern[at]=accent;page.notes[at]=Array.isArray(notes)?notes:[notes];page.gates[at]=gate;
  }return page;
 });
 return track(0,program,steps,phrase[0].pattern.filter(Boolean).length,{octave,volume,mode:'poly',voice:'melody',notes:[0],pattern:phrase[0].pattern,phrase,gate:100,pan:64,reverb:0,delay:0,probability:100,swell:40,swellBars:4,motion:0,motionRate:16,mute:false,...options});
}
function seq(program,octave,volume,h,a,b,{steps=16,mask='X'+'x'.repeat(steps-1),gate=48,accentEvery=0,dyad=0,turn=1,...options}={}){
 const masks=Array.isArray(mask)?mask:[mask];if(masks.some(m=>m.length!==steps))throw Error('Groove mask length');
 return part(program,octave,volume,h,(ch,bar)=>{
  const motif=bar<4?a:b,pattern=masks[bar%masks.length];
  return [...pattern].flatMap((c,j)=>{
   if(c==='.')return [];
   const index=motif[(j+(bar%2?turn:0))%motif.length],pitch=ch.pool[index%ch.pool.length];
   const accent=c==='X'||(accentEvery>0&&(j+bar)%accentEvery===0)?2:1;
   // Open double stops punctuate the marimba line, leaving the other attacks single.
   return [[j,dyad&&accent===2?[pitch,pitch+dyad]:pitch,gate+(j%3===1?5:0),accent]];
  });
 },{steps,pan:38,delay:24,swell:56,swellBars:4,motion:24,motionRate:11,...options});
}
function bass(h,{program=38,volume=83,mask='X.x.X.xx',octave=2,walk=false,...options}={}){
 const masks=Array.isArray(mask)?mask:[mask],steps=masks[0].length;
 if(masks.some(p=>p.length!==steps))throw Error('Bass mask length');
 return part(program,octave,volume,h,(ch,bar)=>[...masks[bar%masks.length]].flatMap((c,j)=>{
  if(c==='.')return [];const root=ch.root>5?ch.root-12:ch.root;
  const next=h[(bar+1)%h.length].root;const pickup=next>5?next-12:next;
  return [[j,walk&&j===steps-1&&bar%2?pickup:root+(j===steps-3?7:j===steps-1?(root>0?7:12):0),j===steps-1?44:76,c==='X'?2:1]];
 }),{steps,evolveLock:true,swell:16,swellBars:4,pan:62,...options});
}
function chords(program,volume,h,{octave=3,style='pad',open=false,...options}={}){
 return part(program,octave,volume,h,(ch,bar)=>{
  const third=ch.kind==='M'?4:ch.kind==='s'?5:3;
  let voicing=open?[ch.root,ch.root+7,ch.root+12]:[ch.root+third,ch.root+7,ch.root+(ch.kind==='M'||ch.kind==='d'?9:10),ch.root+14];
  if(bar%2)voicing=[...voicing.slice(1),voicing[0]+12];
  if(style==='stabs')return [[3,voicing,112,1],[10,voicing.slice(0,3),156,1],...(bar%4===3?[[14,voicing.slice(1),70,1]]:[])];
  if(style==='pulse')return [[0,voicing,250,1],[8,voicing.slice(1),240,1]];
  return [[0,voicing,1450,1]];
 },{pan:77,swell:62,swellBars:8,motion:45,motionRate:13,...options});
}
function answer(program,octave,volume,h,a,b,{gate=170,...options}={}){
 return part(program,octave,volume,h,(ch,bar)=>{
  const motif=bar<4?a:b,positions=bar%2?[2,8,13]:[5,11,14];
  return positions.flatMap((at,j)=>{const pick=motif[(j+bar)%motif.length];return pick===null?[]:[[at,ch.pool[pick%ch.pool.length],j===2?gate*.55:gate,j===0&&bar%2?2:1]];});
 },{pan:94,delay:29,swell:68,swellBars:6,...options});
}
function drum(note,volume,h,mask,{program=25,...options}={}){
 const masks=Array.isArray(mask)?mask:[mask],steps=masks[0].length;if(masks.some(m=>m.length!==steps))throw Error('Drum mask length');
 return part(program,3,volume,h,(_,bar)=>[...masks[bar%masks.length]].flatMap((c,j)=>c==='.'?[]:[[j,0,32,c==='X'?2:1]]),{steps,bank:128,drum:note,swell:14,evolveLock:true,...options});
}
function make(id,category,name,description,bpm,key,scale,parts,{mix=22,decay=6,tone=4400,evolve=40,feel='straight',humanize=0,lift=1}={}){
 const tracks=Array.from({length:8},(_,i)=>parts[i]||track(i,0,4,0,{mute:true,volume:0,reverb:0,delay:0}));
 for(const t of tracks)if(!t.mute)t.volume=Math.min(100,Math.round(t.volume*lift));
 return {id,category,description,state:sanitize({name,bpm,key,scale,bars:1,master:85,tracks,ambient:{enabled:true,mix,decay,tone,predelay:32,width:100,lowcut:260},evolution:{enabled:true,amount:evolve,seed:30719+key*131+bpm*37},groove:{feel,amount:feel==='straight'?60:34,humanize,seed:967+bpm*13+key}})};
}
const CM=GROOVE_TRIO_CATEGORIES[0],ND=GROOVE_TRIO_CATEGORIES[1],GG=GROOVE_TRIO_CATEGORIES[2];
const cm1=harmony('0s 0s 5s 5s 10s 5s 0s 0s');
const cm2=harmony('0m 0m 8M 8M 5m 10M 0m 0m');
const cm3=harmony('0M 0M 9m 9m 5M 2m 7s 0M');
const cm4=harmony('0m 0m 8M 8M 5m 1M 0m 0m');
const cm5=harmony('0d 0d 5M 5M 10M 5M 0d 0d');
const nd1=harmony('0m 0m 8M 8M 3M 10M 0m 0m');
const nd2=harmony('0m 0s 0m 0s 5m 8M 10s 0m');
const nd3=harmony('0d 0d 10M 10M 5M 5M 0d 0d');
const nd4=harmony('0m 0m 8M 8M 5m 1M 7s 0m');
const nd5=harmony('0M 0M 9m 9m 5M 5M 7s 0M');
const gg1=harmony('0d 0d 0d 0d 5M 5M 10M 0d');
const gg2=harmony('0m 0m 5m 5m 8M 10M 0m 0m');
const gg3=harmony('0s 0s 5s 5s 10s 10s 0s 0s');
const gg4=harmony('0m 0m 0m 0m 8M 5m 1M 0m');
const gg5=harmony('0d 0d 5M 5M 10M 10M 0d 0d');
export const GROOVE_TRIO_PRESETS=[
 make('cosmic-marimba-01',CM,'Emberwood Spiral','Open fifths · Eight warm marimba pulses meet five wooden replies over a deep synth-bass pocket. Suspended harmony, hand drums and four-bar swells make the pattern breathe.',108,2,'Dorian',[
  seq(12,3,84,cm1,[0,2,3,1,2,4,3,2],[3,2,4,1,3,2,5,2],{steps:8,mask:'Xxx.Xxxx',dyad:7,gate:70,pan:32,swell:68,motion:8}),
  seq(12,4,48,cm1,[0,2,1,3,2],[3,1,2,4,2],{steps:5,mask:'x.xx.',gate:50,pan:99,delay:32,swell:72,motion:12}),
  bass(cm1,{volume:87,mask:'X.x.X.xx'}),chords(89,37,cm1,{open:true,octave:3,pan:68}),
  answer(5,3,39,cm1,[3,null,2,4],[4,3,null,2],{gate:145,pan:82}),
  drum(36,51,cm1,'X.......X..x....'),drum(64,32,cm1,['...x..x....x..x.','...x.....x.x..x.'],{program:0,pan:44}),drum(70,24,cm1,'x.x.x.x.x.x.xx.x',{program:0,pan:91})
 ],{mix:20,decay:5.8,evolve:37,humanize:5}),
 make('cosmic-marimba-02',CM,'Moonlit Mallet Express','Night-train marimba · A clipped sixteen-step mallet engine and seven-point vibraphone answers ride a firm electronic backbeat. The second phrase climbs, then leaves a little space before home.',120,9,'Minor',[
  seq(12,3,86,cm2,[0,2,4,2,1,2,3,2],[4,2,5,3,2,1,3,2],{mask:['X.xxXx.xX.xxXxxx','Xx.xX.xxXx.xXx..'],dyad:7,gate:59,pan:34,delay:28,swell:61}),
  seq(11,3,46,cm2,[4,2,3,1,2,5,2],[3,4,2,5,3,1,2],{steps:7,mask:'.xx.x.x',gate:86,pan:96,delay:31,swell:71}),
  bass(cm2,{program:39,volume:88,mask:'XxxxXx.x'}),chords(94,32,cm2,{pan:72,octave:2,motion:59}),
  answer(80,4,27,cm2,[0,2,null,3],[3,null,2,4],{gate:79,pan:84,motion:49}),
  drum(36,59,cm2,'X...x...X..x....'),drum(37,35,cm2,'....X.......X...'),drum(42,25,cm2,['x.x.x.x.x.x.x.x.','x.x.x.x.xx.x.xxx'],{pan:87})
 ],{mix:18,decay:4.8,evolve:43}),
 make('cosmic-marimba-03',CM,'Prismatic Canopy','Sunlit counterpoint · Marimba fourths, celesta in five and softly syncopated electric piano. A bright major phrase turns through its relative minor with a loose, gently swung percussion pocket.',94,5,'Major',[
  seq(12,3,89,cm3,[0,2,4,2,1,3,2,4],[4,2,5,4,3,2,1,2],{steps:8,mask:['X.xxX.xx','Xx..Xxxx'],dyad:5,gate:76,pan:36,swell:66,motion:8}),
  seq(8,4,46,cm3,[0,2,4,1,2],[4,3,2,1,2],{steps:5,mask:'x.x.x',gate:65,pan:96,swell:74,delay:28}),
  bass(cm3,{program:33,volume:92,mask:'X..xX.xx',walk:true}),chords(4,49,cm3,{style:'stabs',pan:79,motion:10,swell:48}),
  chords(89,29,cm3,{octave:2,pan:61,motion:36}),drum(36,43,cm3,'X.......X.....x.',{program:0}),drum(37,30,cm3,'....x.......x...', {program:0,pan:73}),drum(70,23,cm3,'x.x.xx.x.x.x.xx.',{program:0,pan:25})
 ],{mix:23,decay:6.4,evolve:34,feel:'swing',humanize:8}),
 make('cosmic-marimba-04',CM,'Obsidian Bloom','Dark wood, bright edges · Seven marimba attacks and eleven kalimba sparks grow over a slow bass pulse. Open fifths, bowed glass and an unexpected semitone chord turn give the darkness a glow.',82,0,'Minor',[
  seq(12,3,91,cm4,[0,2,4,2,1,3,2],[0,4,2,5,3,2,1],{steps:7,mask:'Xxx.Xxx',dyad:7,gate:82,pan:33,delay:32,swell:73,swellBars:6,motion:13}),
  seq(108,4,51,cm4,[4,2,3,2,1,4,2,5,3,2,0],[3,2,4,1,2,5,3,2,1,4,2],{steps:11,mask:'x..x.x..x.x',gate:64,pan:101,delay:32,swell:78}),
  bass(cm4,{program:39,volume:86,mask:'X...X.x.'}),chords(89,40,cm4,{octave:2,pan:66,motion:62,swell:68}),
  answer(92,3,32,cm4,[2,null,4,3],[4,3,null,2],{gate:230,pan:88,motion:61,swell:76}),
  drum(41,34,cm4,['X.........x.....','X......x.....x..'],{pan:44}),drum(69,23,cm4,'x..x..x.x..x..x.',{program:0,pan:80})
 ],{mix:28,decay:10.2,tone:3700,evolve:39}),
 make('cosmic-marimba-05',CM,'Sunwheel Ceremony','Wooden celebration · Two marimbas in twelve and seven, kalimba answers and hand drums. Open fourths light up a Dorian bass groove; the second half rises into a bigger, brighter response.',114,7,'Dorian',[
  seq(12,3,83,cm5,[0,2,4,2,1,2],[4,2,5,3,2,1],{steps:12,mask:'Xxx.XxXxx.Xx',dyad:5,gate:61,pan:30,swell:65,delay:24,motion:7}),
  seq(12,4,45,cm5,[4,2,3,1,2,5,2],[3,4,2,5,3,1,2],{steps:7,mask:'.xx.x.x',gate:56,pan:99,swell:73,delay:28,motion:10}),
  bass(cm5,{program:33,volume:91,mask:'X.x.Xxxx',walk:true}),chords(50,34,cm5,{octave:2,pan:69,swell:65,motion:41}),
  answer(108,4,43,cm5,[0,2,null,4],[4,null,3,2],{gate:123,pan:84}),drum(64,44,cm5,'X.....x...X..x..',{program:0,pan:46}),drum(63,28,cm5,['...x.....x...x..','..x...x....x..x.'],{program:0,pan:78}),drum(70,26,cm5,'x.x.x.x.x.x.xx.x',{program:0,pan:24})
 ],{mix:20,decay:5.6,evolve:44,humanize:7}),
 make('night-drive-01',ND,'Electric Coastline','Open-road momentum · A bright square-wave hook, five-step FM shimmer and rounded octave bass. Broad minor-to-major harmony rides a crisp backbeat, with little melodic answers from the first bar.',118,4,'Minor',[
  seq(80,3,57,nd1,[0,2,4,2,1,2,3,2],[4,2,5,3,2,1,3,2],{mask:'XxxxXx.xXxxxXx.x',gate:39,pan:34,delay:34,motion:54,swell:49}),
  seq(5,4,48,nd1,[4,2,3,1,2],[3,4,2,5,2],{steps:5,mask:'x.xx.',gate:61,pan:96,swell:68,delay:30,motion:15}),
  bass(nd1,{program:39,volume:92,mask:'XxxxXxxx'}),chords(90,37,nd1,{octave:2,pan:73,motion:65}),
  answer(81,3,31,nd1,[4,null,2,3],[5,4,null,2],{gate:145,pan:87,motion:59}),drum(36,63,nd1,'X...x...X..x....'),drum(38,37,nd1,'....X.......X...'),drum(42,25,nd1,['x.x.x.x.x.x.x.x.','x.x.xx.x.x.x.xx.'],{pan:82})
 ],{mix:18,decay:5.2,evolve:38}),
 make('night-drive-02',ND,'Midnight Overpass','Low-lit pursuit · A low saw sequence with three-three-two accents, muted guitar ticks and seven-step chiffer signals. The bass holds the road while suspended chords slowly reveal a darker skyline.',106,2,'Minor',[
  seq(81,2,53,nd2,[0,2,4,0,2,3,2,1],[0,4,2,5,3,2,1,2],{mask:'XxxXxxXxXxxXxxXx',gate:33,pan:36,delay:36,motion:72,motionRate:8,swell:56}),
  seq(28,3,52,nd2,[0,2,4,2,1,2,3,2],[4,2,3,1,2,5,2,1],{steps:8,mask:'.xx.x.xx',gate:42,pan:93,delay:31,swell:63,motion:16}),
  bass(nd2,{program:38,volume:91,mask:'X.x.Xx.x'}),chords(89,41,nd2,{octave:2,pan:68,motion:59}),
  seq(83,4,28,nd2,[0,2,3,1,2,4,2],[4,2,3,1,5,2,3],{steps:7,mask:'x..x.x.',gate:36,pan:83,delay:35,swell:76}),
  drum(36,59,nd2,'X.......X..x....'),drum(37,34,nd2,'....X.......X...'),drum(42,24,nd2,'x.x.x.x.x.xx.x.x',{pan:82})
 ],{mix:22,decay:7.2,tone:3800,evolve:44}),
 make('night-drive-03',ND,'Violet Velocity','Fast neon · A propulsive saw-wave hook, eleven-note FM sparks and a warm polysynth canopy. Dorian harmony gives the second half a lift while a firm four-on-the-floor kick keeps the pulse clear.',130,9,'Dorian',[
  seq(81,3,48,nd3,[0,2,4,2,0,1,2,3],[4,3,2,5,3,2,1,2],{mask:'XxxxXx.xXxxxXxxx',gate:29,pan:33,delay:30,swell:49,motion:67,motionRate:7}),
  seq(5,3,49,nd3,[4,2,3,2,1,2,5,3,2,4,2],[3,4,2,5,3,1,2,4,3,2,1],{steps:11,mask:'x.xx.x.x.xx',gate:50,pan:98,delay:26,swell:70}),
  bass(nd3,{program:39,volume:93,mask:'XxxxXxxx'}),chords(90,35,nd3,{octave:2,pan:69,motion:69}),
  answer(50,3,30,nd3,[4,2,null,3],[5,4,3,null],{gate:200,pan:84,swell:73}),drum(36,65,nd3,'X...x...X...x...'),drum(38,39,nd3,'....X.......X...'),drum(42,24,nd3,'x.xxx.x.x.xxx.x.',{pan:79})
 ],{mix:16,decay:4.3,evolve:46}),
 make('night-drive-04',ND,'Tunnel of Afterimages','Dark acceleration · A clipped low square engine, seven-note saw answers and glassy offbeat chords. The harmony dives through a semitone turn before the bass pulls the whole machine home.',124,0,'Minor',[
  seq(80,3,54,nd4,[0,2,4,2,1,2,0,3],[4,2,5,3,2,1,3,2],{mask:'Xx.xXxxxXx.xXxxx',gate:36,pan:35,delay:39,motion:64,motionRate:9,swell:54}),
  seq(81,3,33,nd4,[4,2,3,1,2,5,2],[3,4,2,5,3,1,2],{steps:7,mask:'.xx.x.x',gate:27,pan:98,delay:35,swell:71}),
  bass(nd4,{program:38,volume:93,mask:'X.xxXxxx'}),chords(5,48,nd4,{style:'stabs',octave:3,pan:84,delay:24,motion:25,swell:57}),
  chords(95,31,nd4,{octave:2,pan:66,motion:84,motionRate:9,swell:70}),drum(36,63,nd4,'X...x...X.x...x.'),drum(38,36,nd4,'....X.......X...'),drum(42,24,nd4,['x.x.xx.x.x.x.xx.','x.x.x.x.x.xx.xxx'],{pan:84})
 ],{mix:19,decay:6.1,tone:3900,evolve:49}),
 make('night-drive-05',ND,'Dawn on the Ring Road','The sky opens · A gentler synth arpeggio, seven-step electric piano and wide strings move from major light into a reflective minor answer. A patient drum pulse and soft-to-strong swells carry the return.',98,5,'Major',[
  seq(80,3,51,nd5,[0,2,4,2,1,2,3,2],[4,2,5,3,2,4,3,1],{steps:8,mask:'XxxxXx.x',gate:48,pan:35,delay:35,swell:62,motion:44}),
  seq(4,3,59,nd5,[4,2,3,1,2,5,2],[3,4,2,5,3,2,1],{steps:7,mask:'x.xx.x.',gate:88,pan:94,delay:26,swell:71,motion:18}),
  bass(nd5,{program:39,volume:88,mask:'X.x.X.xx'}),chords(50,39,nd5,{octave:2,pan:71,swell:69,motion:48}),
  answer(98,4,23,nd5,[0,null,2,4],[4,3,null,2],{gate:146,pan:87,swell:77}),drum(36,52,nd5,'X.......X..x....'),drum(37,30,nd5,'....x.......x...'),drum(42,22,nd5,'x.x.x.x.x.x.xx.x',{pan:82})
 ],{mix:26,decay:9.1,tone:4800,evolve:35}),
 make('gravity-games-01',GG,'Five Against the Floor','Five × seven × eight · Clavinet in five and marimba in seven dance around an eight-note FM figure. A straight kick and elastic bass keep this playful Dorian puzzle firmly in the pocket.',112,2,'Dorian',[
  seq(7,3,64,gg1,[0,2,4,1,2],[4,2,3,1,2],{steps:5,mask:'Xxx.x',gate:51,pan:28,swell:57,delay:24,motion:12}),
  seq(12,3,70,gg1,[4,2,3,1,2,5,2],[3,4,2,5,3,1,2],{steps:7,mask:'x.xx.xx',gate:64,pan:100,swell:69,delay:27,motion:9}),
  bass(gg1,{program:38,volume:92,mask:'Xx.xX.xx'}),chords(89,33,gg1,{octave:2,pan:66,motion:52}),
  seq(5,4,35,gg1,[0,2,4,2,1,3,2,4],[4,2,5,3,2,4,1,2],{steps:8,mask:'..x...x.',gate:65,pan:84,swell:76,delay:31}),
  drum(36,60,gg1,'X...x...X...x...'),drum(37,33,gg1,'....X.......X...'),drum(42,23,gg1,'x.x.x.x.x.x.x.x.',{pan:81})
 ],{mix:19,decay:5.4,evolve:53}),
 make('gravity-games-02',GG,'Sevenfold Switch','Seven × twelve × five · Square-wave accents in seven, twelve marimba subdivisions and five kalimba replies. Two contrasting melodic contours swap emphasis while the bass and backbeat stay grounded.',116,4,'Minor',[
  seq(80,3,52,gg2,[0,2,4,1,2,3,2],[4,2,3,5,2,1,2],{steps:7,mask:'Xxx.Xxx',gate:39,pan:31,delay:33,swell:59,motion:62}),
  seq(12,3,70,gg2,[4,2,3,2,1,2],[3,4,2,5,3,1],{steps:12,mask:'.xx.xx.xx.xx',gate:56,pan:98,delay:25,swell:70,motion:11}),
  bass(gg2,{program:39,volume:91,mask:'X.x.Xxxx'}),chords(90,33,gg2,{octave:2,pan:68,motion:66}),
  seq(108,4,40,gg2,[0,2,4,1,2],[4,3,2,1,2],{steps:5,mask:'x..x.',gate:65,pan:79,swell:78,delay:28}),
  drum(36,58,gg2,'X.......X..x....'),drum(38,34,gg2,'....X.......X...'),drum(42,23,gg2,'x.x.x.x.x.xx.x.x',{pan:83})
 ],{mix:20,decay:6,evolve:57}),
 make('gravity-games-03',GG,'Eleven Moons Dancing','Eleven × eight × three · Vibraphone in eleven, five-note celesta fragments over eight subdivisions, and three slow harp answers. Open harmony and gentle hand percussion make the arithmetic feel weightless.',92,7,'Dorian',[
  seq(11,3,77,gg3,[0,2,4,2,1,3,2,5,3,2,1],[4,2,3,5,2,1,4,3,2,5,2],{steps:11,mask:'X.xx.x.x.xx',gate:82,accentEvery:5,pan:29,delay:28,swell:65,motion:14}),
  seq(8,4,48,gg3,[4,2,3,1,2],[3,4,2,5,2],{steps:8,mask:'.xx.x.xx',gate:59,pan:100,delay:31,swell:73}),
  bass(gg3,{program:35,volume:93,mask:'X...X.x.'}),chords(89,38,gg3,{open:true,octave:3,pan:65,motion:58}),
  seq(46,3,42,gg3,[0,2,4],[4,2,1],{steps:3,mask:'x.x',gate:111,pan:80,swell:77,delay:24,motion:9}),
  drum(36,43,gg3,'X.......X.......',{program:0}),drum(64,32,gg3,['...x......x..x..','......x...x...x.'],{program:0,pan:42}),drum(70,22,gg3,'x.x.x.x.x.x.x.x.',{program:0,pan:88})
 ],{mix:27,decay:9.4,tone:4700,evolve:46}),
 make('gravity-games-04',GG,'Thirteen-Step Fever','Thirteen × eight × five · A restless square-wave line, eight marimba strokes and five bright chiffer signals. Dark harmonic turns and low tom replies sharpen the groove without moving its foundation.',128,0,'Minor',[
  seq(80,3,53,gg4,[0,2,4,2,1,3,2,5,3,2,0,2,1],[4,2,3,5,2,1,4,3,2,5,3,1,2],{steps:13,mask:'X.xx.xxxx.x.x',gate:32,accentEvery:5,pan:30,delay:32,swell:54,motion:69,motionRate:8}),
  seq(12,3,71,gg4,[4,2,3,1,2,5,3,2],[3,4,2,5,3,1,4,2],{steps:8,mask:'.xx.x.xx',gate:58,pan:99,delay:27,swell:68,motion:13}),
  bass(gg4,{program:38,volume:94,mask:'Xx.xXxxx'}),chords(95,31,gg4,{octave:2,pan:67,motion:85,motionRate:9}),
  seq(83,4,27,gg4,[0,2,4,1,2],[4,3,2,5,2],{steps:5,mask:'x.xx.',gate:30,pan:78,swell:78,delay:28}),
  drum(36,62,gg4,'X...x...X...x...'),drum(41,34,gg4,['....X.......X...','....X.....x.X..x'],{pan:46}),drum(42,24,gg4,'x.x.x.x.x.x.xx.x',{pan:83})
 ],{mix:18,decay:5.1,tone:3900,evolve:60}),
 make('gravity-games-05',GG,'The Great Alignment','Thirteen × eleven × seven · Three independent synth and mallet figures leave gaps for one another, then meet on the downbeat. Broad Dorian chords and slow swells give the busiest orbit room to breathe.',104,9,'Dorian',[
  seq(5,3,63,gg5,[0,2,4,2,1,3,2,5,3,2,0,2,1],[4,2,3,5,2,1,4,3,2,5,3,1,2],{steps:13,mask:'X..x.x..x.x.x',gate:64,pan:27,delay:28,swell:67,motion:22}),
  seq(80,3,40,gg5,[4,2,3,2,1,4,2,5,3,2,0],[3,4,2,5,3,1,4,2,3,5,2],{steps:11,mask:'.xx..x.xx.x',gate:33,pan:99,delay:33,swell:74,motion:65,motionRate:11}),
  bass(gg5,{program:39,volume:91,mask:'X.x.X.x.'}),chords(50,37,gg5,{octave:2,pan:67,motion:55,swell:71}),
  seq(12,4,45,gg5,[0,2,4,1,2,3,2],[4,2,3,5,2,1,2],{steps:7,mask:'x.x.xx.',gate:62,pan:79,delay:27,swell:78,motion:8}),
  drum(36,51,gg5,'X.......X.......'),drum(37,29,gg5,'....x.......x...'),drum(42,21,gg5,'x.x.x.x.x.x.x.x.',{pan:86})
 ],{mix:25,decay:8.3,evolve:58})
];
