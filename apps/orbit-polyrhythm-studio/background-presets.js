// Original background arrangements. All parts share an eight-measure harmonic
// phrase; secondary subdivisions supply the polyrhythm without losing the bass.
export const BACKGROUND_CATEGORY='Background Grooves';
export const BACKGROUND_PALETTES={
 'Window Seat':[39,176,226],'Honeyed Wood':[31,153,210],'Rain at the Desk':[214,170,288],
 'Paper Lantern Glow':[42,166,329],'Blue Hour Room':[228,183,302],'Small Hours':[280,38,205],
 'Sunday Current':[158,43,201],'Distant Chimes':[204,278,153],'Velvet Air':[305,196,42],'Night Train Home':[19,220,166]
};
const chords={
 I9:[0,[4,7,11,14],'Imaj9'],I6:[0,[4,7,9,14],'I6/9'],ii9:[2,[5,9,12,16],'ii9'],iii7:[4,[7,11,14],'iii7'],
 IV9:[5,[4,7,9,12],'IVmaj9'],V13:[7,[5,9,12,16],'V13sus4'],V9:[7,[5,9,11,14],'V9'],vi9:[9,[0,4,7,11],'vi9'],
 im9:[0,[3,7,10,14],'i9'],iv9:[5,[3,7,8,12],'iv9'],VI9:[8,[0,3,7,10],'♭VImaj9'],VII6:[10,[2,5,7,12],'♭VII6/9'],
 III9:[3,[2,5,7,10],'♭IIImaj9'],IV6:[5,[0,2,7,9],'IV6/9'],v7:[7,[2,5,10],'v7'],V7:[7,[5,7,11,14],'V7'],sus:[0,[2,7,12],'Isus2']
};
const H=s=>s.split(' '),P=s=>s.trim().split(/\s+/).map(n=>n==='-'?null:n.split('+').map(Number));
function part(program,octave,volume,h,events,{steps=16,...extra}={}){
 const phrase=h.map((c,bar)=>{const p={label:`${bar<4?'A':'B'}${bar%4+1} · ${chords[c][2]}`,pattern:Array(steps).fill(0),notes:Array.from({length:steps},()=>[]),gates:Array(steps).fill(80)};
  for(const [at,ns,length,accent=1] of events(c,bar)){if(ns===null)continue;if(!Number.isInteger(at)||at<0||at>=steps||length<=0)throw Error('Invalid background phrase');p.pattern[at]=accent;p.notes[at]=Array.isArray(ns)?ns:[ns];p.gates[at]=length*100;}return p;});
 return {program,bank:0,octave,volume,steps,mode:'poly',voice:'melody',notes:[0],pattern:phrase[0].pattern.map(n=>n===2?'X':n?'x':'.').join(''),phrase,gate:100,pan:64,reverb:0,delay:0,probability:100,swell:44,swellBars:4,motion:0,motionRate:16,...extra};
}
function melody(program,octave,volume,h,bars,{grid='gentle',art=.84,...extra}={}){
 const timing={gentle:[[0,6,11],[3.5,3,3]],reply:[[2,8,14],[3,3.5,1.5]],four:[[0,5,9,14],[3.5,2.5,3,1.5]],late:[[3,10],[4,4]],halves:[[0,9],[6,5]]}[grid];
 return part(program,octave,volume,h,(_,i)=>{const notes=P(bars[i]);if(notes.length!==timing[0].length)throw Error('Melody rhythm mismatch');return notes.map((n,j)=>[timing[0][j],n,timing[1][j]*art,1]);},extra);
}
function comp(program,volume,h,{style='soft',octave=3,...extra}={}){
 return part(program,octave,volume,h,(c,i)=>{const v=chords[c][1];if(style==='pad')return [[0,v,15.2]];if(style==='offbeat')return [[3,v.slice(0,3),3.3],[11,[...v.slice(1),v[0]+12],3.3]];if(style==='sparse')return i%2?[[7,v,7]]:[[0,v,9]];return [[0,v,5.5],[10,v.slice(1),4.5]];},{pan:78,swell:52,swellBars:8,...extra});
}
function arpeggio(program,volume,h,{steps=5,octave=3,art=.68,rests=true,...extra}={}){
 return part(program,octave,volume,h,(c,i)=>{const v=chords[c][1],order=i<4?[0,2,1,3,2,1,0]:[2,1,3,0,2,3,1];return Array.from({length:steps},(_,j)=>[j,rests&&(j+i)%5===4?null:v[order[j%order.length]%v.length],art]);},{steps,pan:90,swell:66,swellBars:6,...extra});
}
function bass(h,{program=32,volume=82,octave=2,style='pocket',...extra}={}){
 return part(program,octave,volume,h,(c,i)=>{let root=chords[c][0];if(root>5)root-=12;const next=chords[h[(i+1)%8]][0],fifth=root+7;
  if(style==='slow')return [[0,root,6.5],[9,i%2?fifth:root,5.4]];
  if(style==='steady')return [[0,root,2.8],[4,root,2.3],[8,fifth,2.6],[12,root,2.7]];
  return [[0,root,4.3],[7,fifth,2.3],[10,root,3.7],...(i%2?[[15,next>5?next-12:next,.6]]:[])];
 },{pan:62,swell:14,swellBars:4,...extra});
}
function percussion(drum,volume,h,patterns,{steps=16,program=0,...extra}={}){
 const ps=Array.isArray(patterns)?patterns:[patterns];return part(program,3,volume,h,(_,i)=>{const str=ps[i%ps.length];if(str.length!==steps)throw Error('Percussion step mismatch');return [...str].flatMap((x,j)=>x==='.'?[]:[[j,0,.4,x==='X'?2:1]]);},{bank:128,drum,steps,swell:12,...extra});
}
const room=(mix,decay,tone=4500)=>({enabled:true,mix,decay,tone,predelay:28,width:90,lowcut:240});
const make=(name,description,bpm,key,scale,ambient,parts)=>[name,BACKGROUND_CATEGORY,description,bpm,1,key,scale,ambient,parts];
const a=H('I9 I9 vi9 vi9 ii9 IV9 V13 I6'),b=H('im9 im9 IV6 IV6 VII6 v7 im9 im9'),c=H('im9 im9 VI9 VI9 iv9 VII6 v7 im9'),d=H('I6 I6 vi9 vi9 IV9 IV9 V13 I6'),e=H('im9 iv9 VII6 III9 im9 VI9 V13 im9'),f=H('I9 vi9 ii9 V13 I9 IV9 ii9 V9'),g=H('I6 IV9 I6 vi9 ii9 IV9 V13 I6'),h=H('im9 im9 VI9 VI9 III9 iv9 sus im9'),j=H('I9 I9 vi9 vi9 IV9 ii9 V13 I9'),k=H('im9 im9 VI9 VI9 iv9 IV6 V7 im9');
export const BACKGROUND_DEFS=[
 make('Window Seat','Warm focus · Vibraphone phrases, soft electric-piano chords and acoustic bass in a brushed pocket. The eight-measure answer opens gently, then settles home.',78,5,'Major',room(17,4.2),[
  melody(11,3,76,a,['12 14 16','19 - 16','16 19 14','12 - 11','14 17 16','16 14 12','14 - 12','16 14 12'],{pan:43,swell:48}),
  comp(4,48,a,{style:'offbeat',pan:82}),bass(a),percussion(36,39,a,['x.......x.......','x.........x.....'],{program:40}),percussion(38,30,a,'....x.......x...',{program:40,pan:74}),percussion(70,20,a,'x.x.x.x.x.x.x.x.',{pan:31})
 ]),
 make('Honeyed Wood','Five against four · Dulcimer ripples answer mellow vibraphone above acoustic bass, hand drum and a quiet shaker. Dorian harmony and independent swells keep the wooden texture moving.',86,2,'Dorian',room(19,4.6,4900),[
  melody(11,3,72,b,['12 15 19','17 - 15','17 21 19','14 - 12','14 17 19','17 - 14','15 14 12','7 - 12'],{grid:'gentle',pan:39,swell:53}),
  arpeggio(15,49,b,{steps:5,pan:87,swell:62}),bass(b,{volume:82}),percussion(64,37,b,['x.....x...x.....','x.......x....x..'],{pan:53}),percussion(70,23,b,'x.x.x.x.x.x.x.x.',{pan:94})
 ]),
 make('Rain at the Desk','Quiet concentration · Electric piano and three evenly spaced koto plucks drift over a round fretless bass. Sparse side-stick and shaker leave the phrases plenty of air.',72,9,'Minor',room(23,6.5,3700),[
  melody(4,3,69,c,['7 10 14','12 - 7','7 10 12','15 - 12','12 8 7','7 - 5','5 2 7','3 - 0'],{pan:46,swell:45}),
  arpeggio(107,45,c,{steps:3,octave:3,pan:86,art:.45,swell:60}),comp(4,40,c,{style:'sparse',octave:2,pan:71,swell:58}),bass(c,{program:35,volume:77,octave:1,style:'slow'}),percussion(37,24,c,'....x.......x...',{pan:42}),percussion(69,20,c,'x.x.x.x.x.x.x.x.',{pan:84})
 ]),
 make('Paper Lantern Glow','Light wooden groove · Koto and kalimba trade pentatonic fragments over a gentle acoustic bass. Three-against-four replies and soft hand percussion keep the melody unhurried.',82,2,'Major',room(20,5.3,4700),[
  melody(107,3,71,d,['12 14 19 16','14 - 12 -','9 12 16 19','16 - 14 -','12 16 19 21','19 - 16 -','14 19 16 14','12 - 7 -'],{grid:'four',art:.66,pan:37,swell:51}),
  arpeggio(108,52,d,{steps:3,pan:92,swell:64,art:.75}),bass(d,{volume:77,style:'slow'}),percussion(64,34,d,['x.......x.....x.','x.....x.........'],{pan:55}),percussion(70,19,d,'x.x.x.x.x.x.x.x.',{pan:87})
 ]),
 make('Blue Hour Room','After-dark lounge · Slow electric-piano voicings, a few low vibraphone notes and fretless bass. The harmony moves every measure while the brushed pulse stays subdued.',66,4,'Minor',room(24,7.2,3400),[
  melody(11,3,67,e,['7 14','12 8','7 12','10 14','14 10','12 7','9 12','7 3'],{grid:'late',pan:38,swell:60}),
  comp(4,58,e,{style:'sparse',pan:78,swell:48}),bass(e,{program:35,volume:79,style:'slow'}),percussion(36,33,e,'x.......x.......',{program:40}),percussion(38,28,e,'....x.......x...',{program:40,pan:78}),percussion(51,17,e,'x...x.x.x...x.x.',{program:40,pan:91})
 ]),
 make('Small Hours','Soft jazz clockwork · Vibraphone and Rhodes share a warm major-key conversation. A seven-part dulcimer figure sits low in the mix while the bass anchors the changing chords.',74,10,'Major',room(18,4.8,4100),[
  melody(11,2,78,f,['16 14 12','12 11 7','9 12 16','14 - 11','19 16 14','12 14 16','17 16 14','11 - 14'],{pan:40,swell:50}),
  comp(4,44,f,{octave:2,style:'offbeat',pan:81}),arpeggio(15,34,f,{steps:7,octave:3,pan:92,swell:72,art:.5}),bass(f,{octave:1,volume:82}),percussion(37,26,f,'....x.......x...',{pan:71}),percussion(70,19,f,'x.x.x.x.x.x.x.x.',{pan:28})
 ]),
 make('Sunday Current','Easy daytime motion · Clean jazz guitar, vibraphone answers and a relaxed acoustic-bass pocket. Gentle syncopation and open major chords bring a little lift without a busy lead.',94,0,'Major',room(14,3.1,5200),[
  melody(26,3,73,g,['12 16 19 16','17 - 16 12','14 16 19 21','19 - 16 12','14 17 16 14','16 - 14 12','14 16 12 9','12 - 7 -'],{grid:'four',art:.69,pan:38,swell:39}),
  melody(11,3,61,g,['- 7','12 9','- 9','7 4','- 12','9 7','- 9','7 4'],{grid:'late',pan:91,swell:65}),comp(26,38,g,{style:'offbeat',pan:77}),bass(g,{volume:84}),percussion(36,37,g,['x.......x..x....','x.....x.x.......']),percussion(37,29,g,'....x.......x...',{pan:70}),percussion(70,22,g,'x.x.x.x.x.x.x.x.',{pan:26})
 ]),
 make('Distant Chimes','Ambient pulse · Low tubular bells sound only at phrase openings while three-note celeste figures trace a soft rhythm. Warm pad and slow bass change colour beneath the ringing space.',62,7,'Minor',room(29,10.5,3300),[
  melody(8,3,56,h,['12 14 19','17 - 14','15 19 22','19 - 15','14 17 19','20 - 17','14 19 12','15 - 12'],{pan:78,swell:58}),
  part(14,2,39,h,(c,i)=>i%4===0?[[0,chords[c][0],10]]:[],{pan:40,swell:33,swellBars:8}),
  comp(89,34,h,{style:'pad',octave:3,pan:74,swell:65,motion:25,motionRate:12}),bass(h,{program:35,volume:69,octave:2,style:'slow'}),percussion(69,16,h,'x..x..x..x..',{steps:12,pan:91})
 ]),
 make('Velvet Air','Breathing harmony · A quiet concert choir supports sparse celeste replies and soft electric-piano chords. A slow bass and barely-there brush pulse give the ambience a gentle floor.',70,5,'Major',room(28,9,3600),[
  melody(8,3,54,j,['12 14','16 12','14 11','12 7','12 16','17 14','12 9','14 12'],{grid:'late',pan:85,swell:64}),
  comp(52,36,j,{style:'pad',pan:43,swell:70,swellBars:8,motion:14,motionRate:12}),comp(4,46,j,{style:'sparse',pan:72,swell:50}),bass(j,{program:35,volume:74,style:'slow'}),percussion(36,29,j,'x.......x.......',{program:40}),percussion(38,22,j,'....x.......x...',{program:40,pan:86})
 ]),
 make('Night Train Home','Steady late-night pocket · Rhodes, finger bass and soft brushes carry a muted seven-part dulcimer figure. The minor phrase brightens briefly in its second half before returning home.',88,2,'Minor',room(18,4.8,3900),[
  melody(4,3,71,k,['12 15 14','10 - 7','12 15 19','15 - 12','12 8 7','9 - 7','11 14 17','15 14 12'],{pan:42,swell:45}),
  comp(4,43,k,{style:'offbeat',pan:77}),arpeggio(15,37,k,{steps:7,pan:94,swell:68,art:.55}),bass(k,{program:33,volume:82,style:'steady'}),percussion(36,39,k,'x.......x..x....',{program:40}),percussion(38,28,k,'....x.......x...',{program:40,pan:74}),percussion(70,20,k,'x.x.x.x.x.x.x.x.',{pan:25})
 ])
];
