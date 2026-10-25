// Rebuild the editable, student-cued story from its preserved artwork.
const fs=require('fs'),path=require('path'),vm=require('vm');
const sharp=require('sharp');
const root=path.resolve(__dirname,'..'),art=path.join(root,'story-source/skin-and-bones/art');
let serial=0;const id=prefix=>'skin-'+prefix+'-'+(++serial),clone=x=>JSON.parse(JSON.stringify(x));
const imports={};
const base=(name,x,y,w,h)=>({id:id('piece'),name,x,y,w,h,bw:w,bh:h,rotation:0,opacity:1,fiber:0,stitch:false,depth:'middle',depthContact:'ground'});
const asset=(key,name,x,y,w,h)=>({...base(name,x,y,w,h),type:'asset',asset:'import-skin-'+key});
const shape=(name,kind,x,y,w,h,color)=>({...base(name,x,y,w,h),type:'shape',shape:kind,color,fiber:.42,stitch:true});
const text=(words,x,y,w,h,color='#eee2ff')=>({...base(words,x,y,w,h),type:'text',text:words,color,fiber:.22});
const pose=o=>({x:o.x,y:o.y,w:o.w,h:o.h,rotation:o.rotation,opacity:o.opacity});
function keys(o,frames){o.keyframes=frames.map(([t,q])=>({t,ease:'smooth',pose:{...pose(o),...q}}));return o;}
function block(preset,start,duration,extra={}){return {id:id('motion'),preset,start,duration,strength:.65,distance:250,direction:0,repeats:1,ease:'smooth',loop:'none',...extra};}
function backdrop(kind){return {...asset(kind,'Set · '+kind,800,450,1600,900),locked:true};}
function woman(x=660,y=485,h=570,which='woman',flip=false){const o=asset(which,'Old woman · '+which,x,y,h*2/3,h);o.flipX=flip;return o;}
function shade(x,y,w,h,opacity=.3){return {...shape('Soft ground shadow','Oval',x,y,w,h,'#121026'),opacity,fiber:0,stitch:false};}
function scene(caption,section,direction,items,hold=4.8){const sid=id('cue');return {id:sid,name:section,bg:-1,bgColor:'#17162b',caption,duration:Math.max(1,hold+.2),items,cues:[],camera:{x:800,y:450,zoom:1},cinema:{depthMode:'grounded'},phrase:{id:sid,section,direction,holdAt:hold},director:{notes:direction,markers:[]}};}
function groundShadow(w){const sh=shade(w.x,w.y+w.h*.48,w.w*.65,26);if(w.keyframes)sh.keyframes=w.keyframes.map(k=>({t:k.t,ease:k.ease,pose:{...pose(sh),x:k.pose.x,y:k.pose.y+k.pose.h*.48,w:k.pose.w*.65,opacity:.3*k.pose.opacity}}));return sh;}
function exterior(w){return [backdrop('exterior'),groundShadow(w),w];}
function graveyard(w,close=false){const bg=backdrop('graveyard');if(close)Object.assign(bg,{x:780,y:423,w:1760,h:990});return [bg,groundShadow(w),w];}
function cottagePath(w){const bg=backdrop('exterior');Object.assign(bg,{x:920,y:432.5,w:2000,h:1125});return [bg,groundShadow(w),w];}
function mist(s,density=.28){s.cinema.look={light:'none',weather:'fog',strength:0,density,x:.5,y:.5,endX:.5,endY:.5};return s;}
function foregroundBranch(){const b=asset('branch','Near branches',625,430,1600,1120);b.depthContact='free';keys(b,[[0,{x:595,rotation:-1}],[2.4,{x:630,rotation:.4}],[4.8,{x:660,rotation:-.4}]]);return b;}
function headstone(){return asset('stone','Peeking headstone',1335,520,205,310);}
function fireGlow(){
 const glow=[];
 for(let i=0;i<7;i++){
  const o={...shape('Flickering hearth light','Oval',205,505,200+i*40,170+i*35,'#ffb44f'),fiber:0,stitch:false,opacity:.018};
  keys(o,[[0,{opacity:.014}],[.6,{opacity:.025}],[1.3,{opacity:.012}],[2.1,{opacity:.028}],[2.9,{opacity:.015}],[3.6,{opacity:.022}],[4.8,{opacity:.017}]]);glow.push(o);
 }return glow;
}
function wallShadow(){const sh=asset('seated','Her stretching shadow',1090,307,520,580);Object.assign(sh,{color:'#03060d',opacity:.6,rotation:-10});keys(sh,[[0,{}],[1.3,{x:1155,y:282,w:590,h:630,opacity:.7,rotation:-15}],[3,{x:1110,y:297,w:550,h:595,opacity:.58,rotation:-11}],[4.8,{x:1130,y:292,w:560,h:610,opacity:.64,rotation:-13}]]);return sh;}
function interior(w,opened=false){
 // Crop the room toward the wall: its skirting now meets the door threshold
 // at y=707 instead of leaving a strip of floor behind a freestanding door.
 const wall={...backdrop('interior'),x:800,y:531,w:1888,h:1062};
 return [wall,{...asset(opened?'door-open':'door-closed',opened?'Open broom closet':'Broom closet',960,442,680,680),flipX:true},groundShadow(w),w];
}
function settle(s){const result=clone(s);result.items=result.items.filter(o=>!o.skinRefrain);for(const o of result.items){const last=o.keyframes?.at(-1)?.pose;if(last)Object.assign(o,last);delete o.keyframes;delete o.animationBlocks;}return result.items;}
function ooh(after,verse,custom){const items=custom||settle(after),letters=[];
 // Each refrain has its own stage action. Keep letter order even on reverse flights.
 // Entries are [time, group center x, y, scale, opacity, tilt].
 const paths={
  1:[[0,-320,420,.3,0,-12],[.7,350,220,.7,1,-8],[1.3,650,120,1,1,8],[2.1,880,160,1,1,-6],[3.3,1220,95,.9,1,8],[4.4,1920,40,.7,0,-6]],
  2:[[0,1920,70,.7,0,8],[.7,1330,95,.85,1,5],[1.3,1080,180,1,1,-6],[2.1,790,90,1,1,7],[3.3,350,145,.9,1,-5],[4.4,-350,60,.7,0,8]],
  3:[[0,980,465,.12,0,-8],[.7,1060,370,.4,.8,-5],[1.3,1150,235,.7,1,6],[2.1,910,115,1,1,-7],[3.3,450,160,.9,1,5],[4.4,-360,75,.65,0,0]],
  4:[[0,1335,520,.15,0,0],[.7,1335,470,.25,1,-5],[1.3,1250,270,.7,1,7],[2.1,960,125,1,1,-6],[3.3,480,170,1,1,7],[4.4,-370,85,.7,0,0]],
  5:[[0,1900,720,.5,0,8],[.7,1320,650,.65,1,-7],[1.3,1150,315,.85,1,6],[2.1,810,115,1,1,-5],[3.3,370,200,.85,1,7],[4.4,-370,60,.65,0,0]],
  6:[[0,970,235,.12,0,0],[.7,1000,170,.5,.8,-7],[1.3,1160,105,.8,1,8],[2.1,850,130,1,1,-6],[3.3,450,100,.9,1,6],[4.4,-370,60,.5,0,0]]
 };
 for(let echo=2;echo>=0;echo--)for(let i=0;i<3;i++){
  const o=text(['O','O','H'][i],0,200,150,170,echo?'#beaedf':verse===3?'#ffe6b5':'#f0e5ff');o.name=echo?'OOH · ghost trail':'OOH · '+(i+1);o.skinRefrain=true;
  const offset=(i-1)*150,delay=i*.09+echo*.1,alpha=echo?.09:1;
  keys(o,paths[verse].map(([t,x,y,scale,opacity,rotation])=>[t===0?0:t+delay,{x:x+offset*scale,y:y+i*6*scale,w:150*scale,h:170*scale,rotation,opacity:opacity*alpha}]));letters.push(o);
 }
 const stone=items.findIndex(o=>o.name==='Peeking headstone');if(verse===4&&stone>=0)items.splice(stone,0,...letters);else items.push(...letters);
 const directions=['','Shiver with her and sing the rising ooh. Press Next when ready.','Trace the floating ooh in the moonlit sky. Press Next when ready.','Tiptoe and follow the ooh rising from her lantern. Press Next when ready.','Watch the headstone: can you spot the peeking ooh? Sing, then press Next.','Freeze, then tiptoe home with her as you sing. Press Next when ready.','Sing the last ooh softly. Hold still and press Next for the door.'];
 const s=scene('Ooh-ooh-ooh-ooh!','Ooh · '+verse+' of 6',directions[verse],items,5.1);if(verse===4||verse===5)mist(s);return s;
}
function bone(x,y,w,angle){
 const parts=[shape('Bone shaft','Rectangle',0,0,w*.65,w*.16,'#e5d9bd')];
 for(const xx of [-w*.36,w*.36])for(const yy of [-w*.09,w*.09])parts.push(shape('Bone end','Circle',xx,yy,w*.23,w*.23,'#e5d9bd'));
 return {...base('Loose felt bone',x,y,w,w*.5),type:'group',rotation:angle,children:parts};
}
async function main(){
 for(const name of ['woman','reach','lowreach','startle','exterior','exterior-open','interior','graveyard','hearth','seated','turned','branch','lift','stone','ghost']){
  const encoded=await sharp(path.join(art,name+'.png')).webp({quality:92,alphaQuality:100}).toBuffer();
  fs.writeFileSync(path.join(art,name+'.webp'),encoded);imports['import-skin-'+name]='data:image/webp;base64,'+encoded.toString('base64');
 }
 for(const [name,file,source]of [['broom','assets/prepared/piece106.js','piece106'],['door-closed','assets/story-props/door-closed.js','story-door-closed'],['door-open','assets/story-props/door-open.js','story-door-open']]){
  const c={FELT_DATA:{}};vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(root,'asset-packs',file),'utf8'),c);imports['import-skin-'+name]=c.FELT_DATA[source];
 }
 const scenes=[];
 const titleWoman=woman(1180,510,560,'seated'),panel={...shape('Title felt panel','Rectangle',550,245,890,320,'#191326'),opacity:.83,stitch:false};
 const title=scene('Skin and Bones','Ready to sing','Shiver, tiptoe, freeze! Press Start story. Each lyric and ooh waits for your next press.',[backdrop('hearth'),panel,text('Skin and Bones',555,190,810,120,'#ffe6ab'),text('A spooky sing-along',550,300,650,52),titleWoman],.2);title.phrase.nextLabel='Start story · Space';scenes.push(title);
 let w=woman(865,492,590,'seated');keys(w,[[0,{rotation:-1}],[.65,{rotation:1}],[1.3,{rotation:0,opacity:1}],[1.7,{opacity:0}],[4.8,{opacity:0}]]);
 const turned=woman(865,492,590,'turned');keys(turned,[[0,{opacity:0}],[1.3,{opacity:0}],[1.7,{opacity:1}],[2.5,{rotation:-1.5}],[2.7,{rotation:1.5}],[2.9,{rotation:-1.5}],[3.1,{rotation:1.5}],[3.4,{rotation:0}],[4.8,{}]]);
 let s=scene('There was an old woman all skin and bones.','Verse 1 · By the fire','She turns toward us as her shadow stretches. Copy her little shiver, then press Next.',[backdrop('hearth'),...fireGlow(),wallShadow(),shade(865,752,400,26),w,turned]);scenes.push(s,ooh(s,1));
 const establishing=backdrop('exterior');keys(establishing,[[0,{}],[4.8,{w:1680,h:945,x:815,y:450}]]);
 s=scene('She lived down by the old graveyard.','Verse 2 · Her cottage','Her warm cottage stands beside the distant graveyard. Point to the graves, then press Next.',[establishing]);scenes.push(s,ooh(s,2));
 // The small porch figure grows naturally as she comes down the path toward us.
 w=woman(880,485,500);keys(w,[[0,{x:480,y:414,w:87,h:130,opacity:0}],[1.2,{x:490,y:425,w:110,h:165,opacity:0}],[1.55,{x:540,y:440,w:153,h:230,opacity:1}],[2.1,{x:625,y:465,w:200,h:300}],[2.55,{x:710,y:476,w:253,h:380}],[3,{x:795,y:480,w:300,h:450}],[3.55,{x:880,y:485,w:333.333,h:500}],[4.8,{x:880}]]);
 const departure=cottagePath(w),porch={...backdrop('exterior-open'),x:920,y:432.5,w:2000,h:1125};
 keys(porch,[[0,{opacity:0}],[.25,{opacity:0}],[.95,{opacity:1}],[4.8,{opacity:1}]]);
 const lifted=woman(480,414,130,'lift');keys(lifted,[[0,{opacity:0}],[.75,{opacity:0}],[1,{opacity:1}],[1.3,{x:510,y:432,w:120,h:180,opacity:1}],[1.55,{x:540,y:440,w:153,h:230,opacity:0}],[4.8,{opacity:0}]]);
 departure.splice(1,0,porch,lifted);
 s=scene('One night she thought she’d take a walk.','Verse 3 · Leaving home','Her door opens. She raises her lantern and steps down the path. Tiptoe along with her.',departure);scenes.push(s,ooh(s,3));
 w=woman(330,490,470);const walk=[[0,{}]];for(let i=1;i<=10;i++){const u=i/10,h=470-20*u,y=490+28*Math.sin(u*Math.PI)-(i%2?6:0);walk.push([i*.42,{x:330+i*75,y,w:h*2/3,h,rotation:i%2?1:-1}]);}walk.push([4.8,{x:1080,y:490,w:300,h:450,rotation:0}]);keys(w,walk);
 const graveItems=graveyard(w),watcher={...shape('Something behind the stone','Arch',1335,473,65,115,'#121929'),stitch:false,opacity:0};
 keys(watcher,[[0,{opacity:0}],[1.1,{opacity:0}],[1.45,{x:1270,y:454,opacity:.8}],[1.95,{x:1270,y:449,opacity:.8}],[2.35,{x:1335,y:473,opacity:0}],[4.8,{opacity:0}]]);
 graveItems.splice(1,0,watcher,headstone());graveItems.push(foregroundBranch());
 s=mist(scene('She walked down by the old graveyard.','Verse 4 · Through the graveyard','Tiptoe between the headstones. Did something move behind that one? Press Next when ready.',graveItems));scenes.push(s,ooh(s,4));
 const bones=[bone(790,710,130,-16),bone(900,690,104,24),bone(980,740,140,-6)];
 bones.forEach((b,i)=>keys(b,[[0,{opacity:0}],[.5+i*.18,{opacity:0}],[.85+i*.18,{opacity:1}],[1.6,{rotation:b.rotation}],[2,{x:b.x-(i===0?40:0),rotation:b.rotation-(i===0?100:5)}],[2.35,{x:b.x-(i===0?85:0),rotation:b.rotation-(i===0?185:-5)}],[2.65,{x:b.x-(i===0?105:0),rotation:b.rotation-(i===0?205:0)}],[4.8,{x:b.x-(i===0?105:0),rotation:b.rotation-(i===0?205:0)}]]));
 w=woman(1130,485,570,'lift',true);keys(w,[[0,{rotation:0}],[.7,{rotation:-3}],[1.4,{rotation:-3}],[1.95,{x:1160,rotation:3}],[2.25,{x:1160,rotation:0}],[4.8,{x:1160,rotation:0}]]);
 s=mist(scene('She saw the bones a-layin’ around.','Verse 5 · The bones','Her lantern reveals the bones. One rolls! Freeze with her until the next press.',[...graveyard(w,true),...bones]));
 // Keep the woman in front of the bones and reserve the low edge for lyrics.
 s.items.push(s.items.splice(2,1)[0],foregroundBranch());scenes.push(s);
 const returning=settle(s),rw=returning.find(o=>o.name.startsWith('Old woman'));rw.asset='import-skin-woman';rw.flipX=true;keys(rw,[[0,{x:1130}],[1.2,{x:950,y:475}],[2.4,{x:770,y:485}],[3.6,{x:590,y:475}],[5.1,{x:470,y:485}]]);returning[returning.findIndex(o=>o.name==='Soft ground shadow')]=groundShadow(rw);scenes.push(ooh(s,5,returning));
 w=woman(645,492,590,'lowreach');keys(w,[[0,{x:475}],[.8,{x:530,y:482}],[1.6,{x:585,y:492}],[2.4,{x:645,y:492}],[3.4,{rotation:2,x:665}],[4.8,{rotation:0,x:665}]]);
 s=scene('She went to the closet to get a broom.','Verse 6 · The broom closet','Back inside her cottage, she reaches toward the closet handle.',interior(w));scenes.push(s,ooh(s,6));
 w=woman(665,492,590,'lowreach');
 const doorScene=interior(w),closed=doorScene.find(o=>o.name==='Broom closet');
 // Retain the doorframe at full height while moving between its felt poses.
 const opened={...asset('door-open','Opening broom closet',960,442,680,680),flipX:true};keys(opened,[[0,{opacity:0}],[1.1,{opacity:0}],[2.4,{opacity:1}]]);
 keys(closed,[[0,{}],[.6,{}],[1.4,{x:990,w:630,opacity:.85}],[2.4,{x:1020,w:570,opacity:0}]]);
 doorScene.splice(1,0,opened);keys(w,[[0,{}],[1.2,{rotation:2}],[2.8,{rotation:0}],[4.2,{}]]);
 s=scene('She opened the door and…','Verse 7 · Wait for it…','Everybody freeze. The closet is dark. Hold the suspense—the next press reveals BOO!',doorScene,4.2);s.phrase.nextLabel='Next · Space';scenes.push(s);
 w=woman(665,492,590,'startle');keys(w,[[0,{}],[.2,{x:615,y:448,rotation:-8}],[.6,{x:600,y:490,rotation:-3}],[1.4,{x:640,y:492,rotation:0}],[4.8,{x:640}]]);
 const ending=interior(w,true),ghost=asset('ghost','Closet ghost',940,450,320,480),broom=asset('broom','The missing broom',1000,533,150,250);
 // Loom forward from the dark closet, then hover with restrained movement.
 keys(ghost,[[0,{y:520,w:80,h:120,opacity:0}],[.35,{y:420,w:353.333,h:530,opacity:1,rotation:-2}],[.8,{y:430,w:333.333,h:500,rotation:0}],[1.7,{y:420,rotation:-1.2}],[3.2,{y:430,rotation:.8}],[4.8,{y:425,rotation:0}]]);
 const boo=text('BOO!',1090,110,640,170,'#ffdea1');keys(boo,[[0,{w:140,h:42,opacity:0}],[.18,{w:690,h:188,opacity:1,rotation:-4}],[.4,{w:640,h:170,rotation:3}],[.75,{rotation:0}],[4.8,{}]]);
 ending.splice(2,0,broom,ghost);ending.push(boo);s=scene('BOO!','BOO! · The end','You did it! Restart to sing and play again.',ending);scenes.push(s);
 const project={format:'felt-and-fable',version:1,title:'Skin and Bones',active:0,scenes,imports,custom:[],audioAssets:{},music:{assetId:null,volume:1,loop:false,duck:false,fade:0},exportFps:30,exportCaptions:true,phraseShow:{version:1,enabled:true,defaultMode:'manual'},skinAndBonesEdition:4,filmBrief:'Traditional song. Fourteen independently triggered song cues plus a title screen. Opens by the fire, establishes the cottage, walks into the graveyard, discovers rolling bones, and returns to the wall-mounted closet. Six distinct ooh flights. Shiver, tiptoe and freeze prompts. Students sing live. The door and BOO are separate cues. Every cue waits indefinitely for Next, Space, or Right Arrow. Left Arrow goes back; Home restarts.'};
 fs.writeFileSync(path.join(root,'public/examples/skin-and-bones.felt.json'),JSON.stringify(project));
 console.log(JSON.stringify({scenes:scenes.length,songCues:14,oohs:6,bytes:fs.statSync(path.join(root,'public/examples/skin-and-bones.felt.json')).size}));
}
main().catch(e=>{console.error(e);process.exit(1)});
