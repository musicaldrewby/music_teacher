// Rebuild the simple, editable felt-board edition from the approved flat-cutout preview.
// Every prop is native felt geometry, including articulated arms, feet, and flying letters.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
(async()=>{
const sharp=require('sharp'),art=path.join(root,'story-source/skin-and-bones-basic'),backing=await sharp(path.join(art,'navy-felt.png')).resize(1600,900,{fit:'cover'}).webp({quality:90}).toBuffer();
fs.writeFileSync(path.join(art,'navy-felt.webp'),backing);
const imports={'import-skin-basic-backing':'data:image/webp;base64,'+backing.toString('base64')};
let serial=0;
const id=()=>`skin-basic-${++serial}`,copy=x=>JSON.parse(JSON.stringify(x));
const C={navy:'#101e40',plum:'#633656',roof:'#43284d',green:'#184b41',ground:'#2c4741',gray:'#9b9c9b',cream:'#f1e9d8',yellow:'#f8d35f',skin:'#eecb95',black:'#1d211f',wall:'#24414a',floor:'#314c47'};
const base=(name,x,y,w,h)=>({id:id(),name,x,y,w,h,bw:w,bh:h,rotation:0,opacity:1,fiber:.42,stitch:false,depth:'middle',depthContact:'free'});
const shape=(name,kind,x,y,w,h,color)=>({...base(name,x,y,w,h),type:'shape',shape:kind,color});
function poly(name,points,color){const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;return {...base(name,x+w/2,y+h/2,w,h),type:'path',points:points.map(p=>[p[0]-x,p[1]-y]),color};}
function group(name,x,y,w,h,bw,bh,children){return {...base(name,x,y,w,h),bw,bh,type:'group',children};}
function centered(parts,x,y){for(const o of parts){o.x-=x;o.y-=y;}return parts;}
const pose=o=>({x:o.x,y:o.y,w:o.w,h:o.h,rotation:o.rotation,opacity:o.opacity});
function keys(o,frames){o.keyframes=frames.map(([t,p])=>({t,ease:'smooth',pose:{...pose(o),...p}}));return o;}
function text(words,x,y,w,h,color=C.cream){return {...base(words,x,y,w,h),type:'text',text:words,color,fiber:.85};}
function ring(name,x,y,w,h,color,ratio=.53){return {...base(name,x,y,w,h),type:'boolean',op:'subtract',color,children:[shape('Outer felt oval','Oval',0,0,w,h,color),shape('Cut-out center','Oval',0,0,w*ratio,h*ratio,color)]};}
function lantern(x,y,scale=1){
 const p=[ring('Lantern handle',0,-67,45,47,C.gray,.67),shape('Warm yellow felt','Rectangle',0,0,63,89,C.yellow),poly('Lantern roof',[[-42,-43],[0,-71],[42,-43]],C.gray),shape('Lantern bottom','Rectangle',0,49,83,12,C.gray)];
 for(const n of [-31,0,31])p.push(shape('Lantern frame','Rectangle',n,1,9,94,C.gray));
 return group('Felt lantern',x,y,110*scale,175*scale,110,175,p);
}
function arm(name,x,y,carrying){
 const parts=[poly('Teal sleeve',[[0,-15],[105,-7],[108,24],[1,19]],C.green),shape('Hand','Oval',119,10,42,30,C.skin)];
 if(carrying)parts.push(lantern(132,96,.82));
 return group(name,x,y,340,360,340,360,parts);
}
function leg(name,x,y){return group(name,x,y,160,250,160,250,[shape('Thin ankle','Rectangle',0,42,24,106,C.skin),poly('Black felt shoe',[[-17,82],[13,81],[27,94],[51,101],[51,113],[-18,111]],C.black)]);}
function woman(x,ground=726,height=580,action='still',flip=false){
 const scale=height/680,left=leg('Left stepping foot',131,518),right=leg('Right stepping foot',252,518);
 const back=arm('Free hand',142,322,false);back.rotation=106;
 const front=arm('Lantern hand',241,322,true);
 const parts=[left,right,back,poly('Dark teal felt dress',[[151,286],[252,300],[326,557],[47,557]],C.green),front,
  poly('Angular face',[[189,83],[254,76],[276,111],[293,160],[325,196],[295,197],[301,231],[280,246],[235,232],[199,266],[166,223],[171,148]],C.skin),
  shape('Gray hair bun','Circle',133,111,86,86,C.gray),
  poly('Gray swept hair',[[143,82],[161,54],[205,37],[258,34],[280,43],[285,60],[271,84],[242,113],[216,146],[197,187],[185,211],[168,198],[150,173],[140,130]],C.gray),
  shape('Glasses arm','Rectangle',236,153,49,8,C.black),ring('Round glasses',272,151,58,65,C.black,.72),shape('Dark eye','Oval',276,151,14,22,C.black),
  poly('Stern mouth',[[265,220],[272,214],[282,211],[291,214],[292,220],[282,217],[274,219],[268,224]],C.black),
  poly('Plum shawl',[[164,233],[214,246],[279,409],[57,328]],C.plum)];
 if(action==='walk'){
  for(const [piece,sign] of [[left,1],[right,-1]])keys(piece,[[0,{rotation:sign*12}],[.3,{rotation:-sign*12}],[.6,{rotation:sign*12}],[.9,{rotation:-sign*12}],[1.2,{rotation:sign*12}],[1.5,{rotation:-sign*12}],[1.8,{rotation:sign*12}],[2.1,{rotation:-sign*12}],[2.4,{rotation:sign*12}],[2.7,{rotation:-sign*12}],[3,{rotation:sign*12}],[3.3,{rotation:-sign*12}],[3.6,{rotation:0}],[4.4,{rotation:0}]]);
  keys(front,[[0,{rotation:2}],[.6,{rotation:-4}],[1.2,{rotation:3}],[1.8,{rotation:-3}],[2.4,{rotation:3}],[3,{rotation:-3}],[3.6,{rotation:0}],[4.4,{rotation:0}]]);
 }else if(action==='lift')keys(front,[[0,{}],[.9,{rotation:-22}],[1.7,{rotation:-22}],[2.1,{rotation:-13}],[4.4,{rotation:-13}]]);
 else if(action==='reach'){
  // Bring the free hand forward; the lantern stays below the handle.
  back.rotation=0;back.x=227;back.y=401;
  keys(back,[[0,{rotation:70}],[1.2,{rotation:35}],[2.3,{rotation:0}],[4.4,{rotation:0}]]);
  front.rotation=38;front.y=381;
 }else if(action==='startle'){
  keys(back,[[0,{rotation:106}],[.22,{rotation:205}],[.8,{rotation:185}],[1.5,{rotation:155}],[4.4,{rotation:155}]]);
  keys(front,[[0,{rotation:0}],[.22,{rotation:-30}],[.9,{rotation:-20}],[1.5,{rotation:-8}],[4.4,{rotation:-8}]]);
 }
 // Convert all animated local positions to the character's center coordinates too.
 for(const o of parts){o.x-=220;o.y-=340;if(o.keyframes)for(const k of o.keyframes){k.pose.x-=220;k.pose.y-=340;}}
 return {...group('Old woman · '+action,x,ground-(631-340)*scale,440*scale,height,440,680,parts),flipX:flip};
}
function bareTree(x,bottom=740,h=420){
 const pts=[[.40,1],[.57,1],[.56,.59],[.80,.40],[.98,.35],[.94,.29],[.79,.33],[.88,.13],[.80,.10],[.69,.34],[.55,.46],[.51,.22],[.64,.02],[.57,0],[.44,.19],[.39,.05],[.31,.08],[.38,.40],[.20,.27],[.22,.13],[.14,.12],[.13,.29],[0,.20],[0,.29],[.28,.49],[.41,.61]];
 return poly('Bare plum tree',pts.map(([u,v])=>[x+(u-.5)*h*.65,bottom+(v-1)*h]),C.plum);
}
function stone(x,bottom,h=165,w=h*.65){return shape('Grave marker','Arch',x,bottom-h/2,w,h,C.gray);}
function crescent(x,y,size){return {...base('Yellow felt moon',x,y,size,size),type:'boolean',op:'subtract',color:C.yellow,children:[shape('Moon disc','Circle',0,0,size,size,C.yellow),shape('Moon cutout','Circle',size*.29,-size*.14,size*.92,size*.92,C.yellow)]};}
function moonAndStars(){const moon=crescent(185,145,180);return [moon,...[[370,85,42],[420,188,33]].map(([x,y,r])=>shape('Small felt star','Star',x,y,r,r,C.yellow))];}
function ground(){return poly('Green ground strip',[[0,736],[310,726],[790,738],[1210,724],[1600,734],[1600,900],[0,900]],C.ground);}
function cottage(x=380,bottom=731,scale=1){
 const parts=[shape('Plum cottage','Rectangle',0,0,360,250,C.plum),shape('Chimney','Rectangle',111,-156,39,115,C.plum),poly('Triangular roof',[[-205,-124],[0,-310],[205,-124]],C.roof),shape('Dark cottage doorway','Rectangle',11,56,87,138,C.black),shape('Cottage door','Rectangle',11,56,87,138,'#584536'),shape('Door knob','Circle',37,61,13,13,C.yellow),shape('Yellow window','Square',-116,-17,61,61,C.yellow),shape('Yellow window','Square',113,-17,61,61,C.yellow)];
 return group('The cottage',x,bottom-125*scale,460*scale,650*scale,460,650,parts);
}
function outside(){return [...moonAndStars(),ground(),poly('Path to the cottage',[[230,900],[328,732],[381,732],[374,900]],'#999f9c'),cottage(370,731,.85),stone(1115,730,140),stone(1270,730,195),stone(1390,730,120),bareTree(1490,745,400)];}
function cemetery(){return [...moonAndStars(),ground(),bareTree(65,730,410),stone(370,730,170),stone(1160,730,250),stone(1430,730,140),bareTree(1500,745,390)];}
function windowParts(){return [shape('Window frame','Rectangle',270,305,290,290,'#887781'),shape('Night window','Rectangle',270,305,262,262,C.navy),crescent(224,252,78),shape('Window mullion','Rectangle',270,305,13,265,'#887781'),shape('Window crossbar','Rectangle',270,306,265,13,'#887781')];}
function floor(){return [shape('Felt floor','Rectangle',800,825,1600,150,C.floor),shape('Wall skirting','Rectangle',800,741,1600,18,'#918b81')];}
function fireRoom(){
 const flames=[poly('Orange felt flame',[[250,687],[212,651],[226,608],[253,635],[268,581],[301,641],[290,687]],'#bd7946'),poly('Yellow felt flame',[[251,686],[240,658],[262,623],[282,660],[273,686]],C.yellow)];
 flames.forEach((f,i)=>keys(f,[[0,{rotation:-2}],[.6,{rotation:2}],[1.2,{rotation:-2}],[1.8,{rotation:1}],[2.5,{rotation:-1}],[3.2,{rotation:2}],[4.4,{rotation:0}]]));
 return [...floor(),shape('Simple fireplace','Rectangle',280,563,355,330,'#786c80'),shape('Fireplace opening','Arch',280,596,231,241,C.black),shape('Mantel shelf','Rectangle',280,404,401,29,C.roof),shape('Fireplace hearth','Rectangle',280,730,405,30,C.roof),...flames,...windowParts().map(o=>({...o,x:o.x+910,y:o.y-20}))];
}
function broom(x,y){return group('Broom',x,y,110,360,110,360,[shape('Broom handle','Rectangle',0,-38,13,255,'#bda37a'),poly('Broom bristles',[[-16,73],[18,73],[46,163],[-46,163]],'#b99358'),shape('Broom tie','Rectangle',0,86,48,12,C.roof)]);}
function closetRoom(open=false){
 const items=[...floor(),...windowParts(),shape('Closet frame','Rectangle',1070,475,342,510,'#827082'),shape('Dark closet opening','Rectangle',1070,483,300,494,'#0d1725')];
 if(open)items.push(broom(1150,546));
 const door=group('Wall-mounted closet door',1070,483,300,494,300,494,[shape('Plum closet door','Rectangle',0,0,300,494,C.plum),shape('Upper door panel','Rectangle',0,-98,231,189,'#57314e'),shape('Lower door panel','Rectangle',0,130,231,158,'#57314e'),shape('Closet handle','Circle',-109,51,21,21,C.yellow)]);
 if(open){door.w=62;door.x=1251;}items.push(door);return items;
}
function ghost(){
 const body=poly('Ivory ghost silhouette',[[0,-250],[55,-240],[91,-195],[99,-97],[133,-54],[186,-84],[216,-69],[230,-14],[223,60],[197,7],[176,42],[159,-2],[109,7],[103,121],[127,220],[83,192],[50,276],[3,218],[-35,252],[-70,190],[-114,223],[-92,113],[-113,8],[-158,-1],[-187,39],[-195,-6],[-226,45],[-218,-59],[-185,-83],[-133,-57],[-99,-102],[-89,-191],[-60,-233]],C.cream);
 const eye1=shape('Hollow left eye','Oval',-38,-135,39,69,C.black);eye1.rotation=18;const eye2=shape('Hollow right eye','Oval',38,-135,39,69,C.black);eye2.rotation=-18;
 return group('Closet ghost',1080,460,340,415,480,586,[body,eye1,eye2,shape('Wailing mouth','Oval',0,-49,53,105,C.black)]);
}
function bone(x,y,w=105,rotation=0){const parts=[shape('Bone shaft','Rectangle',0,0,70,18,C.cream)];for(const xx of [-39,39])for(const yy of [-9,9])parts.push(shape('Rounded bone end','Circle',xx,yy,25,25,C.cream));return {...group('Loose felt bone',x,y,w,w*.46,110,50,parts),rotation};}
function scene(caption,section,direction,items,hold=4.4,inside=false){const sid=id();return {id:sid,name:section,caption,bg:-1,bgColor:inside?C.wall:C.navy,duration:Math.max(1,hold+.2),items:[{...base('Navy felt backing',800,450,1600,900),type:'asset',asset:'import-skin-basic-backing',fiber:0,locked:true},...items.filter(o=>o.name!=='Navy felt backing')],cues:[],camera:{x:800,y:450,zoom:1},phrase:{id:sid,section,direction,holdAt:hold},director:{notes:direction,markers:[]}};}
function settle(s){function stop(o){const p=copy(o);if(p.keyframes)Object.assign(p,p.keyframes.at(-1).pose);delete p.keyframes;delete p.animationBlocks;if(p.children)p.children=p.children.map(stop);return p;}return s.items.filter(o=>!o.skinRefrain).map(stop);}
function letter(ch){if(ch==='O')return {...ring('OOH',0,0,127,164,C.cream,.53),text:ch};const o=poly('OOH',[[-62,-80],[-25,-80],[-25,-19],[25,-19],[25,-80],[62,-80],[62,80],[25,80],[25,17],[-25,17],[-25,80],[-62,80]],C.cream);o.text=ch;return o;}
function ooh(previous,n,custom){
 const items=custom||settle(previous);
 const paths={1:[[0,-220,350,.4,0],[.7,290,210,.8,1],[1.5,650,145,1,1],[2.5,910,202,1,1],[3.5,1290,125,.9,1],[4.4,1900,75,.6,0]],2:[[0,1870,135,.5,0],[.7,1310,170,.8,1],[1.5,1050,100,1,1],[2.5,790,190,1,1],[3.5,340,120,.9,1],[4.4,-290,60,.6,0]],3:[[0,880,530,.12,0],[.7,970,390,.4,1],[1.5,1110,215,.8,1],[2.5,810,130,1,1],[3.5,310,195,.9,1],[4.4,-290,65,.6,0]],4:[[0,1160,560,.1,0],[.7,1160,420,.35,1],[1.5,1100,215,.8,1],[2.5,820,125,1,1],[3.5,360,205,.9,1],[4.4,-290,65,.6,0]],5:[[0,1810,650,.3,0],[.7,1220,520,.6,1],[1.5,1090,250,.8,1],[2.5,800,125,1,1],[3.5,350,185,.9,1],[4.4,-290,65,.6,0]],6:[[0,1070,330,.1,0],[.7,1090,250,.5,1],[1.5,1090,155,.8,1],[2.5,830,115,1,1],[3.5,350,180,.9,1],[4.4,-290,65,.6,0]]};
 const letters=['O','O','H'].map((ch,i)=>{const o=letter(ch),w=o.w,h=o.h;o.name='OOH · '+(i+1);o.skinRefrain=true;keys(o,paths[n].map(([t,x,y,z,a],k)=>[t===0?0:t+i*.08,{x:x+(i-1)*145*z,y:y+i*10*z,w:w*z,h:h*z,opacity:a,rotation:k%2?-7:7}]));return o;});
 if(n===4){const at=items.findIndex(o=>o.name==='Grave marker'&&o.x===1160);items.splice(at,0,...letters);}else items.push(...letters);
 return scene('Ooh-ooh-ooh-ooh!','Ooh · '+n+' of 6',n===6?'Sing the last ooh softly. Press Next for the door.':'Sing the floating ooh, then wait for the next student’s press.',items,4.9,previous.bgColor===C.wall);
}
const scenes=[];
const title=scene('Skin and Bones','Ready to sing','Shiver, tiptoe, freeze! Each lyric and ooh waits for your next press.',[...outside(),woman(790,733,480),text('Skin and Bones',825,137,1060,118),text('Basic Felt Board',800,252,640,46)],.2);title.phrase.nextLabel='Start story · Space';scenes.push(title);
let w=woman(910,729,610);keys(w,[[0,{}],[.7,{rotation:-2}],[.95,{rotation:2}],[1.2,{rotation:-2}],[1.45,{rotation:2}],[1.7,{rotation:0}],[4.4,{}]]);
let s=scene('There was an old woman all skin and bones.','Verse 1 · By the fire','She shivers beside her fire. Copy her little shiver, then press Next.',[...fireRoom(),w],4.4,true);scenes.push(s,ooh(s,1));
s=scene('She lived down by the old graveyard.','Verse 2 · Her cottage','Point to her cottage, then the graves. Press Next when everyone is ready.',outside());scenes.push(s,ooh(s,2));
w=woman(425,730,560,'walk');keys(w,[[0,{}],[.6,{x:473,y:w.y-3}],[1.2,{x:536}],[1.8,{x:597,y:w.y-3}],[2.4,{x:658}],[3,{x:720,y:w.y-3}],[3.6,{x:780}],[4.4,{x:780}]]);
const departure=outside(),house=departure.find(o=>o.name==='The cottage'),houseDoor=house.children.find(o=>o.name==='Cottage door'),knob=house.children.find(o=>o.name==='Door knob');keys(houseDoor,[[0,{}],[1,{x:45,w:18}],[4.4,{x:45,w:18}]]);keys(knob,[[0,{}],[1,{x:47}],[4.4,{x:47}]]);
s=scene('One night she thought she’d take a walk.','Verse 3 · Leaving home','Her door opens and her feet tiptoe along. Walk with her.',[...departure,w]);scenes.push(s,ooh(s,3));
w=woman(280,733,565,'walk');keys(w,[[0,{}],[.6,{x:379,y:w.y-3}],[1.2,{x:478}],[1.8,{x:577,y:w.y-3}],[2.4,{x:676}],[3,{x:775,y:w.y-3}],[3.6,{x:880}],[4.4,{x:880}]]);
const cemeterySet=cemetery(),watcher=shape('A shadow peeks','Arch',1160,592,56,99,'#13222e');keys(watcher,[[0,{opacity:0}],[1,{opacity:0}],[1.4,{x:1063,y:548,opacity:.8}],[1.9,{x:1063,y:548,opacity:.8}],[2.3,{x:1160,opacity:0}],[4.4,{opacity:0}]]);cemeterySet.splice(cemeterySet.findIndex(o=>o.name==='Grave marker'&&o.x===1160),0,watcher);
s=scene('She walked down by the old graveyard.','Verse 4 · The graveyard','Tiptoe between the stones. Did that little shadow move?', [...cemeterySet,w]);scenes.push(s,ooh(s,4));
w=woman(655,731,580,'lift');keys(w,[[0,{}],[1.6,{}],[2.1,{x:630,rotation:-4}],[2.4,{x:630,rotation:0}],[4.4,{x:630}]]);
const bones=[bone(1070,708,132,-15),bone(1240,684,100,20),bone(1360,714,122,-8)];for(const [i,b]of bones.entries())keys(b,[[0,{opacity:0}],[.45+i*.15,{opacity:0}],[.8+i*.15,{opacity:1}],[1.6,{opacity:1}],[2.5,{x:b.x-(i?0:110),rotation:b.rotation-(i?0:205),opacity:1}],[4.4,{x:b.x-(i?0:110),rotation:b.rotation-(i?0:205),opacity:1}]]);
s=scene('She saw the bones a-layin’ around.','Verse 5 · The bones','She lifts her lantern. One bone rolls! Freeze with her.',[...cemetery(),...bones,w]);scenes.push(s);
const homeward=settle(s).filter(o=>!o.name.startsWith('Old woman'));w=woman(630,731,580,'walk',true);keys(w,[[0,{}],[.6,{x:570,y:w.y-3}],[1.2,{x:510}],[1.8,{x:450,y:w.y-3}],[2.4,{x:390}],[3,{x:330,y:w.y-3}],[3.6,{x:270}],[4.9,{x:270}]]);homeward.push(w);scenes.push(ooh(s,5,homeward));
w=woman(850,730,605,'reach');keys(w,[[0,{x:700}],[1.2,{x:775}],[2.3,{x:850}],[4.4,{x:850}]]);
s=scene('She went to the closet to get a broom.','Verse 6 · The broom closet','Back inside, she reaches for the closet handle.',[...closetRoom(),w],4.4,true);scenes.push(s,ooh(s,6));
const opening=settle(s),door=opening.find(o=>o.name==='Wall-mounted closet door');keys(door,[[0,{}],[.7,{}],[2.4,{w:62,x:1251}],[4.2,{w:62,x:1251}]]);
s=scene('She opened the door and…','Verse 7 · Wait for it…','Freeze. The closet is dark. The next press reveals BOO!',opening,4.2,true);scenes.push(s);
w=woman(850,730,605,'startle');keys(w,[[0,{}],[.22,{x:783,y:w.y-27,rotation:-5}],[.7,{x:768,rotation:-2}],[1.4,{x:800,rotation:0}],[4.4,{x:800}]]);
const g=ghost();keys(g,[[0,{w:68,h:83,y:577,opacity:0}],[.3,{w:365,h:446,y:425,opacity:1}],[.8,{w:340,h:415,y:440}],[1.7,{y:427,rotation:-2}],[3,{y:440,rotation:1}],[4.4,{y:433,rotation:0}]]);
const shout=text('BOO!',1040,128,570,149,C.cream);keys(shout,[[0,{w:100,h:30,opacity:0}],[.2,{w:600,h:169,opacity:1,rotation:-4}],[.5,{rotation:2}],[.8,{rotation:0}],[4.4,{}]]);
s=scene('BOO!','BOO! · The end','You did it! Restart to sing and play again.',[...closetRoom(true),g,w,shout],4.4,true);scenes.push(s);
const project={format:'felt-and-fable',version:1,title:'Skin and Bones · Basic Felt Board',active:0,scenes,imports,custom:[],audioAssets:{},music:{assetId:null,volume:1,loop:false,duck:false,fade:0},exportFps:30,exportCaptions:true,phraseShow:{version:1,enabled:true,defaultMode:'manual'},skinAndBonesBasicEdition:1,filmBrief:'Same traditional lyrics and 15 individually cued scenes as the detailed Skin and Bones. Simple scissor-cut felt shapes based on the approved preview. Separate native feet, arms, lantern, door, bones and cutout OOH letters. Fixed flat-board camera; distinct fireside, cottage, graveyard and closet sets. Every lyric and each of six oohs waits indefinitely for a student press. The ghost appears only on the final BOO cue. All artwork is editable and portable in the story and standalone classroom export.'};
fs.writeFileSync(path.join(root,'public/examples/skin-and-bones-basic.felt.json'),JSON.stringify(project));
console.log(JSON.stringify({scenes:scenes.length,bytes:JSON.stringify(project).length,imports:Object.keys(project.imports).length}));

})().catch(e=>{console.error(e);process.exit(1)});
