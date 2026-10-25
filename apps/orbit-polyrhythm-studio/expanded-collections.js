// Composed two-cycle phrases: melody lists name sounding notes, never accidental rests.
// Polymetric parts keep their own loop length; shared-cycle parts use mode: 'poly'.
const R=(program,pattern,melody,octave,volume,extra={})=>{
 let n=0;const phrase=pattern.repeat(pattern.length<=16?2:1);
 const notes=[...phrase].map(c=>c==='.'?0:melody[n++%melody.length]);
 return {program,pattern,notes,octave,volume,mode:'step',gate:75,reverb:4,delay:10,swell:38,swellBars:4,...extra};
};
const D=(drum,pattern,volume,extra={})=>({program:0,bank:128,drum,pattern,notes:[0],voice:'single',volume,mode:'step',gate:38,reverb:5,delay:0,...extra});
const P=(program,pattern,melody,octave,volume,extra={})=>R(program,pattern,melody,octave,volume,{mode:'poly',gate:140,reverb:0,delay:0,motion:62,motionRate:10,swell:45,swellBars:8,...extra});
// Short, separated flute replies: 16 steps over 8 beats, 72% gates, no room/echo send.
const F=(program,pattern,melody,volume,extra={})=>R(program,pattern,melody,4,volume,{mode:'poly',gate:72,reverb:0,delay:0,swell:35,swellBars:4,...extra});
const A=(decay,mix,tone=4800,predelay=38)=>({enabled:mix>0,decay,mix,tone,predelay,width:100,lowcut:220});
export const COLLECTION_CATEGORIES=['Liquid Metal','Midnight Machines','Bamboo & Strings','Gravity Drums','Velvet After Dark','Slow Supernovas'];
export const COLLECTION_DEFS=[
// LIQUID METAL — four different metallic attacks, with deliberately separated registers.
['Mercury Courtyard','Liquid Metal','Vibraphone and steel-pan replies skip across a clave pocket; bright fourths rise above a patient low fifth.',106,1,2,'Dorian',A(4.8,23,5700),[
 R(11,'X..x..X...x..x..',[0,4,7,6,4,2,3,4,7,4],3,60,{pan:33,gate:140,swell:60}),
 R(114,'..X..x..X..x...x',[4,7,6,4,2,4,3,2,0,4],4,48,{pan:96,gate:85,swell:68,swellBars:6}),
 R(11,'X.......x.......',[0,0,3,4],2,53,{voice:'fifth',swell:24,delay:0,gate:160}),
 R(8,'...x..x',[7,9,8,7,6,4],5,30,{pan:74,delay:23,swell:74}),
 D(75,'X..x..x...x.x...',34,{pan:24}),D(64,'X.......x..x....',42),D(70,'x.x.x.x.x.x.x.x.',25,{pan:104})]],
['Silver Current','Liquid Metal','Vibraphone only. Three and five ripple past a steady four, while opposing swells bring each phrase to the surface.',92,1,7,'Major',A(7,28,6500),[
 R(11,'Xxx',[0,4,7,4,2,4],3,64,{mode:'poly',pan:31,gate:125,swell:72}),
 R(11,'xX.xx',[7,9,8,7,6,4,6,7],4,48,{mode:'poly',pan:98,gate:105,swell:78,swellBars:6}),
 R(11,'Xxxx',[0,4,3,4,0,4,5,4],2,56,{mode:'poly',gate:85,swell:28,delay:0}),
 R(11,'....x.......x...',[0,3,4,0],3,40,{voice:'fourth',pan:69,gate:160,swell:76,swellBars:8})]],
['Chromium Rain','Liquid Metal','Celeste droplets and tiny glockenspiel answers above soft vibraphone. An intricate rain pattern with no drum kit.',74,2,0,'Major',A(12,34,5300,52),[
 R(8,'X.x..x.X..x.x...',[7,9,8,7,4,6,7,9,11,9,8,7],4,51,{mode:'poly',pan:29,gate:130,delay:25,swell:70}),
 R(11,'X.x.x',[0,4,3,4,0,5],3,60,{mode:'poly',pan:87,gate:145,swell:55,swellBars:6}),
 R(9,'....x...x..',[7,6,4,6,7,9],5,27,{mode:'poly',pan:103,gate:90,swell:76}),
 P(94,'xx',[0,3,0,4],3,24,{voice:'fifth',pan:58,motion:53}),
 R(11,'X...x...',[0,0,3,4],2,51,{mode:'poly',gate:140,swell:25,delay:0})]],
['Molten Blue','Liquid Metal','Steel drums take the melody while electric bass and dry drums hold a syncopated pocket. Vibraphone fourths answer in the gaps.',114,1,9,'Dorian',A(3.2,16,6400),[
 R(114,'X.x..X.x..x.X.x.',[0,2,4,7,6,4,2,0,2,4,5,4],4,58,{pan:35,gate:65,swell:47}),
 R(11,'..x...x..X...x..',[4,2,0,3,4,2,0,4],3,43,{voice:'fourth',pan:96,gate:90,swell:62,swellBars:6}),
 R(33,'X.....x.X..x..x.',[0,0,4,0,6,0,0,3,4,0],2,64,{gate:64,swell:15,delay:0}),
 D(36,'X.......x..x....',62),D(37,'....X.......X...',49),D(42,'x.x.xx.x.x.x.xx.',27,{pan:80}),D(70,'..x...x...x...x.',22,{pan:28})]],
['Bell Foundry','Liquid Metal','Low tubular-bell punctuation, clipped steel-pan gears and bright metallic clicks. Seven steps circle a solid pulse.',100,1,0,'Minor',A(6.4,24,3600,65),[
 R(114,'X..x.x.',[0,4,3,0,4,7],3,54,{pan:31,gate:55,swell:65}),
 R(11,'..X..x..x.X..',[7,4,3,4,7,6,4,2],4,42,{pan:99,gate:80,swell:72,swellBars:6}),
 R(14,'X...............',[0,4],3,30,{gate:65,swell:25,delay:0}),
 D(36,'X...x...X...x...',60),D(53,'...x..x....x..x.',28,{pan:86}),D(76,'x...x..',33,{pan:21}),
 R(11,'........x.......',[0,3],3,37,{voice:'fifth',pan:66,gate:155,swell:75,swellBars:8})]],
['Lunar Alloy','Liquid Metal','Dark bowed glass, low vibraphone and isolated celeste sparks. Metallic phrases bloom into a deep, slowly moving room.',62,2,4,'Minor',A(19,39,3300,75),[
 R(11,'X..x.x..',[0,4,3,4,7,4],3,57,{mode:'poly',pan:34,gate:160,swell:73,delay:26}),
 P(92,'xxx',[4,6,7,6,4,2],4,31,{pan:89,gate:160,motion:80,motionRate:8}),
 P(89,'xx',[0,0,3,4],2,42,{gate:120,motion:52,motionRate:13}),
 R(8,'..x.x..',[7,9,8,7],5,29,{mode:'poly',pan:103,gate:140,swell:82,swellBars:6,delay:29}),
 R(11,'x..',[0,3],2,45,{mode:'poly',voice:'fifth',gate:120,swell:40,delay:0}),
 P(95,'x.x.x',[7,6,4,2,4,6],4,21,{pan:28,motion:87,motionRate:7})]],
// MIDNIGHT MACHINES — a stable floor and one changing, off-center counterline.
['Neon Switchyard','Midnight Machines','A round synth bass locks to the kick while clipped square-wave notes trade seven-step signals overhead.',118,1,2,'Minor',A(3.6,16,3900),[
 R(38,'X..x....X.x...x.',[0,0,4,0,6,0,0,3,4,0],1,63,{gate:64,delay:0,swell:15}),
 R(80,'..x.X.x...x.X.x.',[0,4,7,4,2,4,6,4,0,3,4,2],3,36,{pan:32,gate:37,delay:31,swell:60}),
 R(81,'x..X.x.',[7,9,7,6,4,6],4,22,{pan:98,gate:28,delay:34,swell:74,swellBars:6}),
 D(36,'X...x...X...x...',66,{program:25}),D(39,'....X.......X...',43,{program:25}),D(42,'x.x.x.x.x.x.x.x.',27,{program:25,pan:88}),
 P(89,'x...',[0,3],3,24,{voice:'fifth',gate:190,swell:60,motion:55})]],
['Blacktop Sequence','Midnight Machines','A rolling minor sequence with a grounded octave bass and a sparse electric-piano reply. Long-drive momentum, with room around the snare.',110,2,9,'Minor',A(5,20,4400),[
 R(80,'X.x.xX.xX.x.x.x.',[0,4,7,4,2,4,6,4,0,4,7,9,7,4],3,39,{pan:34,gate:45,delay:29,swell:64}),
 R(38,'X.......x..x....',[0,7,4,0,7,3],1,62,{gate:85,delay:0,swell:12}),
 R(5,'...x..x...x..',[7,6,4,2,4,6],4,35,{pan:97,gate:110,swell:72,swellBars:6}),
 D(36,'X.....x.X.......',62,{program:25}),D(38,'....X.......X...',43,{program:25}),D(42,'x.x.x.x.x.xx.x.x',25,{program:25,pan:84}),
 P(94,'xx',[0,5,3,4],3,23,{voice:'chord',gate:112,pan:63,motion:71,motionRate:9})]],
['Ghost Train Relay','Midnight Machines','An eleven-step pluck and a thirteen-step metallic answer pass a steady four-beat rhythm. Dark, tilted and propulsive.',122,1,4,'Minor',A(4.2,18,3700),[
 R(81,'X.x..x.X..x',[0,4,7,4,3,0,2,4,6,4],3,28,{pan:28,gate:25,delay:33,swell:62}),
 R(28,'..x.X..x..X..',[7,6,4,2,4,7,9,7],4,43,{pan:97,gate:46,delay:21,swell:73,swellBars:5}),
 R(38,'X...x...X...x...',[0,0,4,0,0,3,4,0],1,58,{gate:66,swell:14,delay:0}),
 D(36,'X...x...X...x...',64,{program:25}),D(37,'....X.......X...',42,{program:25}),D(42,'x.x.x.x.x.x.x.x.',24,{program:25,pan:85}),
 R(98,'.......x.......x',[7,11,9,7],5,22,{pan:67,gate:95,delay:31,swell:85,swellBars:8})]],
['Circuit Breakwater','Midnight Machines','A deep one-drop groove with organ stabs and filtered synth fragments. The echoes answer while the rhythm leaves open space.',82,2,0,'Minor',A(8,25,3200,60),[
 R(34,'X.....x...X..x..',[0,0,4,0,0,3,4,0],1,66,{gate:108,swell:15,delay:0}),
 R(16,'..x...x...x...x.',[0,0,3,0,0,4,3,0],3,39,{voice:'chord',pan:32,gate:27,delay:47,swell:59}),
 R(80,'x...x..',[7,4,6,4],3,28,{pan:98,gate:31,delay:42,swell:73,swellBars:6}),
 D(36,'........X.......',66),D(37,'........X.......',48,{delay:14}),D(42,'x.x.x.x.x.x.x.x.',25,{pan:85}),D(75,'...x..x....x..x.',22,{pan:23,delay:28}),
 P(89,'x.x',[0,3,0,4],3,22,{mode:'poly',gate:155,motion:62,motionRate:12})]],
['Afterimage Drive','Midnight Machines','Fast offbeat synth chords, a low pulse and a five-step glass signal. Gradual swells lift the groove without burying the kick.',128,1,7,'Dorian',A(3.8,17,4900),[
 R(38,'X...x...X...x...',[0,0,4,0,0,3,4,0],1,59,{gate:63,delay:0,swell:16}),
 R(80,'..x...x...x...x.',[0,3,0,4,0,3,5,4],3,35,{voice:'fifth',gate:37,pan:33,delay:22,swell:65}),
 R(98,'X..xx',[7,9,7,6,4,6],4,31,{gate:70,pan:98,delay:31,swell:78,swellBars:6}),
 D(36,'X...x...X...x...',65,{program:25}),D(39,'....X.......X...',44,{program:25}),D(42,'x.x.x.x.x.x.x.x.',23,{program:25,pan:83}),D(46,'......x.......x.',22,{program:25,pan:27}),
 P(94,'x...',[4,0],4,21,{gate:200,motion:75,motionRate:8,swell:65})]],
['Zero Hour Signals','Midnight Machines','Half-time drums, a low repeating signal and small stereo fragments. Quiet tension grows into each four-bar crest.',94,2,5,'Minor',A(10,30,3400,62),[
 R(38,'X.......x..x....',[0,0,4,0,0,3],1,60,{gate:95,delay:0,swell:26}),
 R(80,'..x...X...x..x..',[0,4,7,4,2,4,6,4],3,32,{pan:34,gate:52,delay:38,swell:75}),
 R(31,'x...x..',[7,9,7,6],4,38,{pan:97,gate:100,delay:29,swell:80,swellBars:6}),
 D(36,'X.........x.....',60,{program:25}),D(37,'........X.......',44,{program:25}),D(42,'x.x.x.x.x.x.x.x.',22,{program:25,pan:85}),
 P(89,'xx',[0,3,0,4],2,35,{gate:120,motion:56,motionRate:13}),P(95,'xxx',[4,6,7,6,4,2],4,20,{pan:71,motion:83,motionRate:7})]],
// BAMBOO & STRINGS — all flute notes are brief replies, with breathing spaces.
['Paper Lantern Steps','Bamboo & Strings','Koto and kalimba share a nimble stepping pattern. A few short pan-flute replies appear between phrases, never as a sustained drone.',96,2,2,'Pentatonic',A(5.5,21,4900),[
 R(107,'X.x..X.x..x.X.x.',[0,2,3,4,3,2,0,2,3,5,4,3],3,63,{pan:31,gate:100,swell:54}),
 R(108,'..x.X..x..X..',[5,3,2,0,2,3,4,3],4,49,{pan:96,gate:85,swell:68,swellBars:6}),
 R(32,'X.......x.......',[0,3,0,2],2,52,{gate:95,delay:0,swell:15}),
 F(75,'....xx......x.x.',[3,2,0,2,3,4,3,2],33,{pan:70}),
 D(64,'X.......x..x....',37),D(70,'x.x.x.x.x.x.x.x.',24,{pan:22})]],
['Reed & River','Bamboo & Strings','Warm nylon guitar, gentle harp and a low plucked pulse. Shakuhachi answers in short two- and three-note breaths.',78,2,9,'Pentatonic',A(6.5,23,4200),[
 R(24,'X..x..x.X..x..x.',[0,2,3,2,0,2,3,4,3,2,0,3],3,64,{pan:33,gate:115,swell:53}),
 R(46,'..x.X..x..x.X..x',[5,3,2,3,4,3,2,0,2,3,5,4],4,43,{mode:'poly',pan:96,gate:130,swell:70,swellBars:6}),
 F(77,'...xx......xxx..',[3,2,0,2,3,4,3,2,0,2],32,{pan:71}),
 R(32,'X.......x.......',[0,3,0,2],2,49,{mode:'poly',gate:90,swell:20,delay:0}),
 D(69,'x..x.x..x..x.x..',24,{mode:'poly',pan:24}),D(64,'X.......x.......',32,{mode:'poly'})]],
['Courtyard Fireflies','Bamboo & Strings','Kalimba and pizzicato strings tumble through five- and seven-step loops. Tiny celeste glints keep this one entirely plucked and struck.',108,1,0,'Major',A(4.2,18,6100),[
 R(108,'X.x.x',[0,4,2,4,7,6],4,59,{pan:31,gate:80,swell:65}),
 R(45,'..X.x.x',[0,4,3,4,0,2],3,56,{pan:97,gate:52,swell:62,swellBars:6}),
 R(24,'X.......x.......',[0,3,0,4],3,46,{voice:'fifth',gate:95,swell:28,delay:0}),
 R(8,'.....x.......x..',[7,9,8,7],5,28,{pan:75,gate:100,delay:25,swell:80,swellBars:8}),
 D(76,'x...x..',30,{pan:22}),D(70,'x.x.x.x.x.x.x.x.',22,{pan:103})]],
['Cedar Footprints','Bamboo & Strings','Low marimba and muted guitar circle a hand-drum pulse. The flute only adds clipped, separated little replies.',102,2,5,'Dorian',A(4.8,19,4300),[
 R(12,'X..x.X..x..X.x..',[0,4,7,4,3,2,0,4,5,4,2,0],3,61,{pan:34,gate:70,swell:63}),
 R(28,'..x.X..x.X..x',[4,6,4,2,4,5,4,2,1,0],4,45,{pan:97,gate:38,delay:20,swell:70,swellBars:6}),
 R(32,'X.......x..x....',[0,4,0,3,4,0],2,56,{gate:85,swell:18,delay:0}),
 F(75,'...x..x.....xx..',[4,2,1,0,2,4,5,4],30,{pan:72,gate:65}),
 D(64,'X...x..x...x....',40),D(75,'..x...x...x..x..',27,{pan:23}),D(70,'x.x.x.x.x.x.x.x.',22,{pan:96})]],
['Silk Thread Compass','Bamboo & Strings','Koto and shamisen pull in different directions over a calm bass pulse. Brief bamboo-flute phrases make space for the strings to answer.',88,2,7,'Pentatonic',A(7,22,3900),[
 R(107,'X..x.X.x..x',[0,2,3,2,0,3,4,3,2,0],3,61,{pan:29,gate:115,swell:63}),
 R(106,'..X.x..x.X..x',[3,2,0,2,3,4,3,2,0,3],4,43,{pan:99,gate:66,delay:16,swell:73,swellBars:6}),
 F(77,'....xxx.....xx..',[3,4,3,2,0,2,3,2,0,2],29,{pan:68}),
 R(32,'X...x...',[0,3,0,2],2,52,{mode:'poly',gate:100,swell:18,delay:0}),
 D(64,'X.......x.......',35,{mode:'poly'}),D(76,'...x..x...x..',24,{pan:23,delay:9})]],
['Rain Between Leaves','Bamboo & Strings','A drumless canopy of kalimba, harp and soft strings. Short plucked motifs start moving immediately; no flute in this quieter world.',68,2,2,'Pentatonic',A(10,29,4600,50),[
 R(108,'X.x..X.x.x..',[0,2,3,5,3,2,0,2,4,3],4,58,{mode:'poly',pan:31,gate:125,delay:23,swell:73}),
 R(46,'x.x.x..',[3,2,0,2,3,4,3,2,0,3],4,47,{mode:'poly',pan:97,gate:150,swell:75,swellBars:6}),
 R(24,'X...x...',[0,3,0,2],3,57,{mode:'poly',gate:140,swell:34,delay:0}),
 P(48,'xx',[0,2,0,3],3,24,{voice:'fifth',gate:115,motion:37,motionRate:14,swell:64}),
 R(108,'....x..x...',[5,4,3,2],5,30,{mode:'poly',pan:72,gate:125,swell:82,swellBars:8,delay:29})]],
// GRAVITY DRUMS — every active part is an unpitched kit sound.
['Orbiting Hands','Gravity Drums','Three-against-four conga voices above a clear low-drum pulse. Ghost taps and an offbeat shaker turn it into a conversation.',106,1,0,'Minor',A(2.9,14,4500),[
 D(64,'X...x...X...x...',62),D(63,'Xxx',54,{mode:'poly',pan:31,swell:55,swellBars:4}),
 D(60,'Xxxx',44,{mode:'poly',pan:97,swell:63,swellBars:6}),D(62,'..x..x..x...x..x',30,{pan:48}),
 D(70,'..x...x...x...x.',30,{pan:101}),D(75,'X..x..x...x.x...',33,{pan:24,swell:35,swellBars:4})]],
['Basalt Procession','Gravity Drums','Low floor toms and five-beat hand drums march through a dark hall. Widely spaced metal accents leave the center uncluttered.',80,2,0,'Minor',A(6.5,24,3000,60),[
 D(41,'X...x...X...x...',65,{mode:'poly'}),D(45,'X.x.x',49,{mode:'poly',pan:31,swell:57,swellBars:4}),
 D(47,'x..X.x.',42,{mode:'poly',pan:98,swell:68,swellBars:6}),D(64,'X..x....x..x....',48,{mode:'poly',pan:53}),
 D(53,'x......',25,{mode:'poly',pan:89,swell:72,swellBars:8}),D(69,'x.x.x.x.x.x.x.x.',25,{mode:'poly',pan:23}),D(75,'...x..x..',27,{mode:'poly',pan:106})]],
['Satellite Breaks','Gravity Drums','A broken electronic kick pattern, tight backbeat and eleven-step rim clicks. The hats swell while the kick stays dependable.',124,1,0,'Minor',A(2.1,10,6200,22),[
 D(36,'X..x....X.x...x.',67,{program:25}),D(38,'....X.......X...',49,{program:25}),
 D(42,'x.xx.x.x.x.xx.x.',27,{program:25,pan:83,swell:52,swellBars:4}),D(37,'X..x..x.x..',34,{program:25,pan:25,swell:68,swellBars:6}),
 D(46,'......x.......x.',24,{program:25,pan:98}),D(50,'............x.x.',29,{program:25,swell:72,swellBars:8}),D(39,'............x...',25,{program:25,pan:61})]],
['Woodblock Paradox','Gravity Drums','High and low woodblocks run in seven and nine while a kick and side stick mark the bar. Crisp, dry and mischievous.',112,1,0,'Minor',A(2.4,11,5700),[
 D(76,'X..x.x.',45,{pan:27,swell:64,swellBars:4}),D(77,'x..X.x..x',49,{pan:99,swell:70,swellBars:6}),
 D(36,'X...x...X...x...',60),D(37,'....X.......X...',43),D(70,'x.x.x.x.x.x.x.x.',25,{pan:78}),
 D(75,'...x..x....x..x.',28,{pan:49}),D(67,'x....x.....',25,{pan:107,swell:76,swellBars:8})]],
['Tin Roof Ritual','Gravity Drums','Shakers, guiro and little metal taps above an understated hand drum. Soft-to-strong waves create a busy rain without a heavy backbeat.',90,2,0,'Minor',A(5.5,22,3800,45),[
 D(64,'X.......x..x....',56,{mode:'poly'}),D(70,'x.xx.x.x.x.xx.x.',35,{mode:'poly',pan:28,swell:63,swellBars:4}),
 D(69,'x..x.x..x.x..x.',35,{mode:'poly',pan:98,swell:70,swellBars:6}),D(73,'...x..x....x..x.',31,{mode:'poly',pan:48}),
 D(80,'x...x..',28,{mode:'poly',pan:83,swell:74,swellBars:8}),D(53,'..x..x...',25,{mode:'poly',pan:22}),D(61,'...x...x',35,{mode:'poly',pan:102})]],
['Zero-G Drumline','Gravity Drums','A steady kick holds the room while toms trade short answers in five and seven. Snare accents and quiet ghosts sharpen the edges.',116,1,0,'Minor',A(3.8,16,4100),[
 D(36,'X...x...X...x...',65),D(38,'....X.......X...',46),D(45,'X..xx',40,{pan:29,swell:64,swellBars:4}),
 D(47,'..X.x..',37,{pan:99,swell:74,swellBars:6}),D(42,'x.x.x.x.x.x.x.x.',24,{pan:77}),
 D(38,'..x....x..x....x',22,{pan:61,swell:40,swellBars:4}),D(75,'...x..x....x..x.',25,{pan:21}),D(49,'x...............................',18,{swell:65,swellBars:8})]],
// VELVET AFTER DARK — close-register harmony, audible bass, and restrained drums.
['Velvet Sidewalk','Velvet After Dark','Electric-piano chords fall behind the bass while muted guitar answers on offbeats. A warm, uncluttered late-night pocket.',94,2,2,'Dorian',A(4.7,18,4100),[
 R(4,'..x...x...x..x..',[0,0,3,0,0,4,3,0],3,51,{voice:'chord',pan:32,gate:130,swell:50}),
 R(33,'X.....x.X..x..x.',[0,0,4,0,6,0,0,3,4,0],2,62,{gate:85,swell:14,delay:0}),
 R(28,'...x..x....x..x.',[4,6,4,2,4,5,4,2],4,40,{pan:98,gate:32,delay:19,swell:68,swellBars:6}),
 D(36,'X.......x..x....',58),D(37,'....X.......X...',46),D(42,'x.x.x.x.x.x.x.x.',24,{pan:82}),
 R(11,'.....x.....',[7,6,4,2],4,30,{pan:70,gate:155,swell:78,swellBars:8})]],
['Amber Booth','Velvet After Dark','A mellow piano-and-vibraphone duet over upright bass and brushed drums. Five-note replies gently lean across the bar.',82,2,5,'Major',A(5.5,22,4700),[
 R(4,'X.....x...x...x.',[0,0,3,4,0,5,3,4],3,49,{voice:'chord',pan:35,gate:155,swell:46}),
 R(11,'x..X.x.',[7,6,4,2,4,6],4,42,{mode:'poly',pan:97,gate:140,delay:17,swell:72,swellBars:6}),
 R(32,'X...x...X...x...',[0,4,3,4,0,5,3,4],2,61,{mode:'poly',gate:82,swell:16,delay:0}),
 D(36,'X.......x.......',49,{program:40}),D(38,'....X.......X...',42,{program:40}),D(51,'X.xxX.xxX.xxX.xx',26,{program:40,pan:84}),D(38,'..x....x..x....x',19,{program:40})]],
['Plum Neon','Velvet After Dark','Glassy FM piano and clavinet hooks weave around a round electric bass. The rhythm is tight; the melodic layers rise and fall independently.',104,1,7,'Dorian',A(3.5,16,5900),[
 R(5,'..X...x...X..x..',[0,0,3,0,0,4,3,0],3,50,{voice:'chord',pan:31,gate:100,swell:55}),
 R(7,'x..x..X...x.x...',[4,6,4,2,4,5,4,2,1,0,2,4],3,43,{pan:99,gate:31,delay:13,swell:65,swellBars:6}),
 R(33,'X..x....X..x..x.',[0,0,4,0,6,0,0,3,4,0],2,61,{gate:60,swell:15,delay:0}),
 D(36,'X.....x.X.......',59),D(38,'....X.......X...',46),D(42,'x.x.xx.x.x.x.xx.',24,{pan:83}),
 R(11,'......x.......x.',[7,6,4,2],4,29,{pan:67,gate:135,swell:78,swellBars:8,delay:21})]],
['Raincheck Lounge','Velvet After Dark','Soft electric piano, clean guitar and fretless bass in a slow pocket. Warm chord answers arrive before the last resonance fades.',72,2,9,'Minor',A(8,27,3600,58),[
 R(4,'X.....x...x.....',[0,5,3,0,3,4],3,49,{voice:'chord',pan:34,gate:175,swell:55}),
 R(27,'..x..x...x..x...',[7,6,4,2,4,6,7,4],4,41,{pan:96,gate:95,delay:22,swell:72,swellBars:6}),
 R(35,'X.......x..x....',[0,4,0,5,4,0],2,58,{gate:130,swell:19,delay:0}),
 D(36,'X.........x.....',52),D(37,'........X.......',43),D(42,'x.x.x.x.x.x.x.x.',22,{pan:83}),
 P(89,'xx',[0,5,3,4],3,21,{gate:115,motion:51,motionRate:12,swell:66})]],
['Blue Velvet Elevator','Velvet After Dark','Vibraphone takes a seven-step walk past close electric-piano chords. A simple bass line and side stick keep the changing pattern grounded.',98,1,0,'Dorian',A(5,20,4500),[
 R(11,'X.x..x.',[0,2,4,6,4,2],4,49,{pan:32,gate:115,swell:68}),
 R(5,'..x...x...x...x.',[0,0,3,0,0,4,3,0],3,45,{voice:'chord',pan:96,gate:105,swell:53,swellBars:6}),
 R(33,'X.......x..x....',[0,4,0,3,4,0],2,60,{gate:91,swell:15,delay:0}),
 D(36,'X.....x.X.......',57),D(37,'....X.......X...',46),D(42,'x.x.x.x.x.x.x.x.',24,{pan:83}),
 R(28,'.....x....x..',[7,6,4,2],4,30,{pan:69,gate:31,delay:20,swell:78,swellBars:8})]],
['Last Table by the Window','Velvet After Dark','A drumless electric-piano trio: low plucked bass, warm chords and delicate vibraphone. Small phrases overlap in a relaxed three-against-four flow.',68,2,4,'Minor',A(10,30,4200,52),[
 R(4,'X.x.x.x.',[0,5,3,4,0,3,5,4],3,53,{mode:'poly',voice:'chord',gate:150,pan:33,swell:57}),
 R(11,'xXx',[7,6,4,2,4,6],4,43,{mode:'poly',pan:96,gate:125,delay:24,swell:77,swellBars:6}),
 R(32,'Xxxx',[0,5,3,4,0,3,5,4],2,61,{mode:'poly',gate:92,swell:20,delay:0}),
 R(4,'....x..x...',[7,9,8,7],4,31,{mode:'poly',pan:70,gate:130,swell:80,swellBars:8,delay:28})]],
// SLOW SUPERNOVAS — long dynamic arcs plus early, independently moving upper voices.
['The First Spark','Slow Supernovas','Deep D-minor warmth with crystal flickers from the opening. A soft repeating line gradually comes forward through eight-bar pad swells.',64,2,2,'Minor',A(20,42,3500,70),[
 P(89,'xx',[0,0,5,0],2,43,{gate:120,motion:55,motionRate:13,swell:42}),
 P(94,'xx',[0,5,3,4],3,31,{voice:'chord',gate:112,pan:56,motion:77,motionRate:10,swell:61}),
 P(92,'xxxxx',[4,6,7,6,4,2,4,6,7,4],4,28,{gate:152,pan:88,motion:80,motionRate:7,swell:70,swellBars:6}),
 P(95,'xxx',[7,6,4,6,7,8],4,22,{gate:166,pan:29,motion:86,motionRate:11,swell:73}),
 R(98,'X.x.x.x.',[7,9,11,9,7,6,4,6],4,27,{mode:'poly',pan:37,gate:145,delay:33,swell:78,swellBars:4}),
 R(80,'..x...x...x...x.',[0,4,2,4,6,4,2,0],3,19,{gate:61,pan:98,delay:34,swell:85,swellBars:8})]],
['Ember Halo','Slow Supernovas','Amber pads and electric-piano sparks grow into broad waves. The low foundation stays calm while upper voices change within seconds.',70,2,7,'Major',A(18,39,4900,60),[
 P(89,'xx',[0,3,0,4],2,43,{gate:121,motion:52,motionRate:14,swell:42}),
 P(90,'xx',[0,3,5,4],3,30,{voice:'chord',gate:113,pan:55,motion:78,motionRate:9,swell:63}),
 P(94,'xxxxx',[4,6,7,6,4,2,4,6,8,7],4,27,{gate:154,pan:89,motion:81,motionRate:7,swell:70,swellBars:6}),
 P(91,'xxx',[7,8,7,6,4,6],4,22,{gate:168,pan:30,motion:83,motionRate:11,swell:72}),
 R(4,'X.x..X.x.x..',[0,2,4,6,4,2,1,2,4,7],4,30,{mode:'poly',pan:38,gate:130,delay:28,swell:76,swellBars:4}),
 R(46,'..x.x..',[7,9,8,7],4,25,{mode:'poly',pan:99,gate:145,delay:25,swell:79,swellBars:8})]],
['Black Sun Bloom','Slow Supernovas','A deep low pad, dark bowed voices and small bell signals. Six- and eight-bar swells reveal new layers without sudden entrances.',58,2,0,'Minor',A(24,43,2900,90),[
 P(89,'xx',[0,0,3,4],1,46,{gate:124,motion:56,motionRate:14,swell:43}),
 P(92,'xxxxx',[0,2,4,2,0,1,2,4,6,4],3,31,{gate:152,pan:33,motion:83,motionRate:8,swell:68,swellBars:6}),
 P(94,'xx',[0,3,5,4],3,30,{voice:'chord',gate:113,pan:75,motion:72,motionRate:12,swell:61}),
 P(95,'xxx',[4,6,7,6,4,2],3,25,{gate:158,pan:97,motion:91,motionRate:7,swell:76}),
 R(11,'X..x.x..',[0,4,2,4,6,4],3,28,{mode:'poly',pan:44,gate:170,delay:28,swell:77,swellBars:4}),
 R(14,'x.......',[0,4],3,14,{mode:'poly',pan:87,gate:120,delay:14,swell:82,swellBars:8}),
 R(31,'..x.x..',[7,9,7,6],4,25,{mode:'poly',pan:26,gate:150,delay:31,swell:79,swellBars:6})]],
['Violet Accretion','Slow Supernovas','Seven- and eleven-step plucks circle violet pad swells. Quiet rhythmic detail is present immediately, then slowly takes the foreground.',84,2,5,'Dorian',A(17,37,4200,55),[
 P(89,'xx',[0,3,0,4],2,41,{gate:120,motion:54,motionRate:13,swell:42}),
 P(94,'xx',[0,3,0,4],3,29,{voice:'chord',gate:112,pan:56,motion:77,motionRate:10,swell:59}),
 P(91,'xxxxx',[4,6,7,6,4,2,4,6,5,4],4,24,{gate:164,pan:89,motion:86,motionRate:7,swell:74,swellBars:6}),
 P(95,'xxx',[7,8,7,6,4,6],4,21,{gate:165,pan:30,motion:85,motionRate:11,swell:70}),
 R(28,'X..x.x.',[0,4,2,4,6,4],3,32,{pan:37,gate:55,delay:34,swell:78,swellBars:4}),
 R(31,'..x.X..x..x',[7,9,7,6,4,6,7,8],4,27,{pan:98,gate:100,delay:30,swell:82,swellBars:8}),
 R(11,'x.x.x',[0,2,4,2,0,1],3,24,{mode:'poly',gate:150,pan:72,swell:66,swellBars:6})]],
['A Thousand Quiet Suns','Slow Supernovas','Luminous pads, celeste and harp share a hopeful ascending phrase. Moving details arrive early; larger waves crest over eight bars.',62,2,0,'Major',A(22,42,5300,70),[
 P(89,'xx',[0,3,0,4],2,42,{gate:123,motion:53,motionRate:15,swell:42}),
 P(94,'xx',[0,3,5,4],3,31,{voice:'chord',gate:113,pan:55,motion:76,motionRate:11,swell:62}),
 P(88,'xxxxx',[4,6,7,8,7,4,2,4,6,7],4,27,{gate:152,pan:31,motion:72,motionRate:7,swell:72,swellBars:6}),
 P(91,'xxx',[7,9,8,7,6,4],4,23,{gate:173,pan:91,motion:85,motionRate:9,swell:76}),
 R(8,'X.x.x.x.',[7,9,8,7,6,4,6,7],4,27,{mode:'poly',pan:39,gate:140,delay:31,swell:76,swellBars:4}),
 R(46,'x..x.x.',[0,2,4,6,4,2],4,28,{mode:'poly',pan:99,gate:150,delay:27,swell:79,swellBars:8})]],
['Home Beyond the Redshift','Slow Supernovas','A patient return through warm pads, bowed glass and a distant music-box phrase. A soft low pulse gives the long swells a sense of travel.',68,2,9,'Minor',A(21,41,3700,80),[
 P(89,'xx',[0,0,5,0],2,43,{gate:122,motion:54,motionRate:14,swell:43}),
 P(94,'xx',[0,5,3,4],3,30,{voice:'chord',gate:113,pan:55,motion:76,motionRate:10,swell:61}),
 P(92,'xxxxx',[4,6,7,6,4,2,4,6,7,4],4,28,{gate:160,pan:88,motion:78,motionRate:7,swell:71,swellBars:6}),
 P(95,'xxx',[7,6,4,6,8,7],4,22,{gate:165,pan:30,motion:87,motionRate:11,swell:75}),
 R(10,'X.x.x.x.',[7,6,4,6,7,9,8,7],4,24,{mode:'poly',pan:39,gate:140,delay:29,swell:78,swellBars:4}),
 R(38,'X...x...X...x...',[0,0,4,0,0,5,0,4],1,27,{gate:75,delay:0,swell:45,swellBars:8}),
 R(11,'x.x.x',[0,2,4,2,0,1],3,25,{mode:'poly',pan:98,gate:165,delay:24,swell:72,swellBars:6})]],
];
