// Ten composed marimba worlds. Melody arrays advance on rests as well as hits.
// Zero-based degrees 0 / 3 / 4 are tonic / perfect fourth / perfect fifth.
const M=(pattern,notes,octave,volume,extra={})=>({program:12,pattern,notes,octave,volume,mode:'step',gate:78,reverb:5,delay:10,swell:62,swellBars:4,...extra});
const D=(drum,pattern,volume,extra={})=>({program:0,bank:128,drum,pattern,notes:[0],voice:'single',volume,mode:'step',gate:38,reverb:4,delay:0,...extra});
const A=(decay,mix,tone=5000)=>({enabled:true,decay,mix,tone,predelay:38,width:100,lowcut:220});
export const MARIMBA_DEFS=[
 ['Obsidian Steps','Marimba','Pure marimba · Five against seven over a low fifth. Dark wooden attacks swell in overlapping four-bar waves.',108,1,2,'Minor',A(3.6,17,3900),[
  M('XxxXx',[0,4,7,4,3],3,67,{mode:'poly',pan:35,swell:68}),
  M('x.xX.xx',[7,10,7,11,7,4,3],4,52,{mode:'poly',pan:96,swellBars:6}),
  M('X.......x.......',[0,0,0,0,4],2,73,{voice:'fifth',swell:28,delay:0}),
  M('..x...X...x..x..',[0,3,7,4,3,0,4],3,44,{pan:71,swell:75,swellBars:8})]],
 ['Prism Dance','Marimba','Pure marimba · Three, four and five meet in a bright one-bar cycle. Open fourths flash between the answering lines.',118,1,0,'Major',A(2.8,14,6800),[
  M('Xxx',[0,3,4,7,4,3,0],4,57,{mode:'poly',pan:29,swell:55}),
  M('Xxxx',[0,4,0,3,4],3,65,{mode:'poly',pan:76,swell:40,swellBars:6}),
  M('xX.xx',[7,4,3,7,10,7,4],4,49,{mode:'poly',pan:102,swell:68}),
  M('....x.......X...',[0,3,4],3,45,{voice:'fourth',pan:46,swell:65,swellBars:8}),
  M('X.......x.......',[0,0,0,0,4],2,68,{swell:25,delay:0})]],
 ['Temple Circuit','Marimba','Driving · A 3–3–2 accent pattern, a seven-step marimba answer and hand drums around a steady kick.',126,1,4,'Minor',A(2.4,12,4300),[
  M('X.xX.xX.X.xX.xX.',[0,4,7,3,4,7,4,3],3,64,{pan:38,swell:52}),
  M('x.Xx..x',[7,4,3,7,10,7,4,3,0],4,46,{pan:94,swell:76,swellBars:6}),
  M('..x...x...x...x.',[0,3,4,3,0],3,39,{voice:'fourth',pan:74,swell:60,delay:17}),
  D(36,'X...x...X...x...',66),D(64,'x..x..x...x.x...',48,{pan:28}),D(75,'...x..x....x..x.',34,{pan:101}),D(70,'x.x.x.x.x.x.x.x.',29,{pan:78,swell:30,swellBars:4})]],
 ['Glass Canopy','Marimba','Atmospheric · Delicate fourths and climbing wooden figures above warm suspended light. A clear swell within the first phrase.',82,2,5,'Major',A(11,32,6100),[
  M('X.x.xX.x.x.x',[0,3,4,7,4,3,7],4,62,{mode:'poly',pan:32,gate:130,delay:24,swell:78,swellBars:4}),
  M('x..X.x.',[7,10,7,4,3],4,47,{mode:'poly',voice:'fourth',pan:97,gate:140,swell:65,swellBars:6}),
  M('X.x.',[0,0,4],2,69,{mode:'poly',voice:'fifth',gate:160,swell:35,delay:0}),
  M('x.x',[0,3,4,3,0],3,27,{program:89,mode:'poly',gate:150,reverb:0,delay:0,motion:50,motionRate:10,swell:45,swellBars:8}),
  M('.....x...x.....x',[7,4,3,7,10,7,4],5,32,{mode:'poly',pan:73,gate:150,delay:28,swell:78})]],
 ['Gravity Garden','Marimba','Pure marimba · Seven- and eleven-step figures rotate over low fifths. Different swell lengths continually change which pattern leads.',104,1,9,'Minor',A(4.4,20,4500),[
  M('X.xx.x.',[0,4,7,4,3,0,3,4,7],3,66,{pan:32,swell:70,swellBars:4}),
  M('x..X.x..x.x',[7,10,7,11,7,4,3],4,52,{pan:96,swell:78,swellBars:6}),
  M('X.......x.......',[0,0,0,0,4],2,73,{voice:'fifth',swell:30,swellBars:8,delay:0}),
  M('...x..X...x..',[0,3,7,4,3,0,4],3,43,{pan:70,voice:'fourth',swell:78,swellBars:5}),
  M('......x.......x.',[7,4,3,7,11],5,32,{pan:47,swell:85,swellBars:8,delay:22})]],
 ['Wood & Stars','Marimba','Horizon companion · Three marimba orbits climb through dark D-minor pads. Wide fourths, low fifths and breathing starlight.',76,2,2,'Minor',A(16,36,3800),[
  M('X.xx.x.xX.x.',[0,4,7,4,3,7,4],3,66,{mode:'poly',pan:34,gate:115,swell:72,swellBars:4,delay:23}),
  M('x.X.x.x',[7,10,7,11,7,4,3],4,48,{mode:'poly',voice:'fourth',pan:96,gate:140,swell:78,swellBars:6}),
  M('X.x.',[0,0,4],2,62,{mode:'poly',voice:'fifth',gate:150,swell:40,delay:0}),
  M('xx',[0,0,3,0,4],2,35,{program:89,mode:'poly',gate:118,delay:0,reverb:0,motion:55,motionRate:12,swell:35,swellBars:8}),
  M('xxx',[4,7,4,3,0],4,25,{program:92,mode:'poly',gate:160,pan:81,delay:0,reverb:0,motion:72,motionRate:7,swell:55,swellBars:6}),
  M('....x..x...',[7,11,7,10,7,4],5,32,{mode:'poly',pan:47,gate:155,swell:82,delay:32})]],
 ['Mallet Riot','Marimba','Driving · Fast marimba offbeats, a five-step fourths riff, rubbery bass and crisp electronic drums. Strong accents without a wall of notes.',138,1,7,'Dorian',A(2,11,5800),[
  M('X.xX..x.X..x.x.x',[0,4,7,3,4,7,4,0,3],3,64,{pan:31,swell:48,swellBars:4,gate:60}),
  M('x.X.x',[7,4,3,0,4,7,3],4,44,{voice:'fourth',pan:97,swell:68,swellBars:6,gate:55,delay:16}),
  M('X.....x.X..x....',[0,0,4,0,0,3,0],1,48,{program:38,gate:72,swell:0,delay:0}),
  D(36,'X...x...X..x....',62,{program:25}),D(39,'....X.......X...',43,{program:25}),D(42,'x.xx.x.xx.x.x.xx',28,{program:25,pan:87}),D(46,'......x.......x.',24,{program:25,pan:39}),
  M('...........x..x.',[7,10,7,11,7],5,31,{pan:68,swell:78,swellBars:8,delay:22})]],
 ['Quicksilver Eleven','Marimba','Pure marimba · An eleven-step lead skates past a thirteen-step answer, while a four-beat anchor keeps the floor beneath you.',124,1,0,'Minor',A(3.2,15,6300),[
  M('X.x..xX.x..',[0,4,7,4,3,7,10],3,67,{pan:31,swell:65,swellBars:4}),
  M('x..X.x..x.X..',[7,4,3,7,11,7,4,0,3],4,53,{pan:96,swell:72,swellBars:5}),
  M('X...x...X...x...',[0,0,4,0],2,69,{swell:25,delay:0}),
  M('...x..x..X..x..',[0,3,4,3,0,4,7],3,39,{voice:'fifth',pan:64,swell:75,swellBars:6}),
  M('.......x......x.',[7,10,7,4,3],5,29,{pan:76,swell:82,swellBars:8,delay:20})]],
 ['Ember Relay','Marimba','Hand-drum groove · Low and high marimbas answer on alternating offbeats, with open fourths and crossfading four-bar swells.',112,1,5,'Dorian',A(3.8,18,4200),[
  M('X..x..X...x..x..',[0,4,7,4,3,0,3],3,68,{pan:31,swell:65}),
  M('..x..X..x..x...X',[7,10,7,4,3,7,11],4,57,{pan:99,swell:65}),
  M('....x.......X...',[0,3,4,3,0],3,44,{voice:'fourth',pan:71,swell:75,swellBars:6}),
  M('X.......x.......',[0,0,0,0,4],2,65,{swell:25,delay:0}),
  D(64,'X..x...x..X...x.',47,{pan:48}),D(63,'...x..x..x.x....',39,{pan:88}),D(70,'x.x.x.x.x.x.x.x.',29,{pan:26}),D(75,'x..x..x...x.x...',27,{pan:105})]],
 ['Tidal Machinery','Marimba','Deep groove · A slow half-time drum pocket beneath quick wooden gears. Four- and eight-bar waves rise into a luminous, spacious crest.',92,2,11,'Minor',A(8,27,4600),[
  M('X.xx..x.X.x..x.x',[0,4,7,3,4,7,4,3,0],3,67,{pan:34,swell:75,swellBars:4,delay:19}),
  M('x.X.x.x',[7,10,7,4,3,7,11],4,45,{voice:'fifth',pan:94,swell:82,swellBars:8,delay:23}),
  M('X.......x..x....',[0,0,4,0,3,0,0],2,68,{gate:110,swell:32,delay:0}),
  D(36,'X.........x.....',58),D(37,'........X.......',42,{delay:13}),D(42,'x.x.x.x.x.x.x.x.',26,{pan:79,swell:35,swellBars:4}),
  M('xx',[0,3,0,4],3,24,{program:94,mode:'poly',voice:'fourth',gate:125,reverb:0,delay:0,motion:60,motionRate:10,swell:55,swellBars:8}),
  M('.....x...x...',[7,4,3,7,10,7],5,31,{mode:'poly',pan:53,gate:130,swell:80,swellBars:6,delay:28})]]
];
