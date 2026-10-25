// Offline authoring only. All artwork travels inside the resulting story file.
const fs=require('fs'),path=require('path');
const {Image,createCanvas}=require('@napi-rs/canvas');
async function loadImage(source){const im=new Image();im.src='data:image/png;base64,'+(Buffer.isBuffer(source)?source:fs.readFileSync(source)).toString('base64');await im.decode();return im;}
const source=path.resolve(__dirname,'../story-source/no-more-pie');
const output=process.argv[2];
if(!output)throw Error('Usage: node scripts/create-no-more-pie.cjs OUTPUT.felt.json');
const imports={},meta={};let serial=0;
const id=stem=>stem+'-'+(++serial);
async function backdrop(name){const raw=fs.readFileSync(path.join(source,name+'.png')),im=await loadImage(raw);meta[name]=[im.width,im.height];imports['import-no-more-pie-'+name]='data:image/png;base64,'+raw.toString('base64');}
async function atlas(file,entries){
 const im=await loadImage(path.join(source,file+'.png')),sheet=createCanvas(im.width,im.height),g=sheet.getContext('2d');g.drawImage(im,0,0);
 for(const [name,x0,y0,x1,y1] of entries){
  const w=x1-x0,h=y1-y0,a=g.getImageData(x0,y0,w,h).data;let l=w,t=h,r=0,b=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(a[(y*w+x)*4+3]>18){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x+1);b=Math.max(b,y+1);}
  if(r<=l||b<=t)throw Error('Empty atlas cell: '+name);
  l=Math.max(0,l-2);t=Math.max(0,t-2);r=Math.min(w,r+2);b=Math.min(h,b+2);
  const c=createCanvas(r-l,b-t);c.getContext('2d').drawImage(im,x0+l,y0+t,r-l,b-t,0,0,r-l,b-t);
  meta[name]=[r-l,b-t];imports['import-no-more-pie-'+name]=c.toDataURL('image/png');
 }
}
function asset(key,name,x,bottom,height){const [bw,bh]=meta[key];return {id:id(key),type:'asset',asset:'import-no-more-pie-'+key,name,x,y:bottom-height/2,w:height*bw/bh,h:height,bw,bh,rotation:0,opacity:1,fiber:0,stitch:false,depth:'middle'};}
function widthAsset(key,name,x,bottom,width){const [w,h]=meta[key];return asset(key,name,x,bottom,width*h/w);}
function shape(name,x,y,w,h,color,kind='Rounded rectangle'){return {id:id('felt'),name,type:'shape',shape:kind,x,y,w,h,bw:w,bh:h,rotation:0,opacity:1,fiber:.65,stitch:true,color,depth:'middle'};}
function keys(o,frames){const base=Object.fromEntries(['x','y','w','h','rotation','opacity'].map(k=>[k,o[k]||0]));o.keyframes=frames.map(([t,changes])=>({t,ease:'smooth',pose:{...base,...changes}}));return o;}
function wobble(o,at=.25,amount=4){return keys(o,[[0,{}],[at,{}],[at+.30,{rotation:-amount}],[at+.65,{rotation:amount}],[at+1.05,{}]]);}
function entrance(o,delay=0){return keys(o,[[0,{opacity:0,y:o.y+20}],[delay+.1,{opacity:0,y:o.y+20}],[delay+.65,{opacity:1,y:o.y-12}],[delay+1.05,{}]]);}
function bear(pose='hungry',x=470,bottom=830,height=490){return asset('bear-'+pose,'Little bear · '+pose,x,bottom,height);}
function table(){return [shape('Table leg',855,718,34,240,'#9f6440'),shape('Table leg',1325,718,34,240,'#9f6440'),shape('Little kitchen table',1090,606,620,42,'#b57b50'),shape('Cream felt table runner',1090,581,520,12,'#f5e5cd')];}
function plate(key='empty',width=370,x=1090){return widthAsset(key,key==='empty'?'Empty pie plate · three crumbs':key==='bread'?'An enormous brown loaf':key==='meat'?'Red felt play-food on a plate':'Golden lattice pie',x,582,width);}
function bg(name){const o=asset(name,'Story backdrop · '+name,800,900,900);Object.assign(o,{w:1600,bw:1600,bh:900,depth:'back',locked:true});return o;}
const lines=['Oh my!','No more pie','Pie’s too sweet','I wanna piece of meat','Meat’s too red','I wanna piece of bread','Bread’s too brown','I think I’ll go to town','Town’s too far','I think I’ll take the car','Car’s too slow','I fell and hurt my toe','Toe gives me pain','I think I’ll take the train','Train has a wreck','I fell and hurt my neck','Oh my!','No more pie'];
const scenes=[];
const cam=(x=800,y=450,zoom=1)=>({x,y,zoom});
function scene(n,background,items,action,holdAt=2.2,camera=cam()){
 const location=n<=7||n>=17?'In the kitchen':n<=13?'On the road':'At the station';
 const s={id:'no-more-pie-phrase-'+String(n).padStart(2,'0'),name:String(n).padStart(2,'0')+' · '+lines[n-1],bg:-1,bgColor:'#f1dfc1',caption:lines[n-1],duration:4,items:[bg(background),...items],camera,notes:action,phrase:{id:'no-more-pie-phrase-'+String(n).padStart(2,'0'),section:location,direction:'Leader sings · everyone echoes',holdAt}};scenes.push(s);return s;
}
function cameraMove(s,end,t=1.8){const start={...s.camera};s.camera={...start,keys:[{t:0,ease:'smooth',pose:start},{t,ease:'smooth',pose:end}]};}
function sign(){return asset('sign','The way to town',1350,800,285);}
function steam(x,y){return [0,1,2].map(i=>{const c=shape('Soft cotton steam',x+i*24,y-i*24,45+i*15,35+i*13,'#fff4df','Oval');c.stitch=false;c.opacity=.8;return keys(c,[[0,{opacity:0}],[.25+i*.18,{opacity:0,y:y+30}],[1.1+i*.2,{opacity:.7,y:y-35-i*24}],[2.1+i*.15,{opacity:0,y:y-65-i*24}]]);});}
(async()=>{
 for(const name of ['kitchen','road','station'])await backdrop(name);
 await atlas('bear-poses',[
  ['bear-surprise',0,0,512,495],['bear-hungry',512,0,1024,495],['bear-shrug',1024,0,1536,495],
  ['bear-toe',0,495,512,1024],['bear-neck',512,495,1024,1024],['bear-walk',1024,495,1536,1024]]);
 await atlas('food-props',[
  ['pie',0,0,520,500],['empty',520,0,1030,500],['meat',1030,0,1536,500],
  ['bread',0,500,600,1024],['sugar',600,500,1000,1024],['snail',1000,500,1536,1024]]);
 await atlas('vehicles',[
  ['car',0,0,800,535],['train',800,0,1536,535],['pillows',0,535,870,1024],['sign',870,535,1536,1024]]);

 // First two lines are separate cues; there is no extra title screen to advance.
 scene(1,'kitchen',[...table(),plate(),wobble(bear('surprise'),.1,3)],'A surprised little bear discovers an empty pie plate.');
 scene(2,'kitchen',[...table(),wobble(plate(),.4,7),wobble(bear('shrug'),.25,3)],'The bear shrugs. The empty plate rocks once: only three crumbs.');
 let sugar=asset('sugar','A wobbly tower of sugar cubes',1340,582,290);
 scene(3,'kitchen',[...table(),plate('pie',365,1050),wobble(sugar,.5,8),bear('surprise')],'An imaginary pie appears beside a comically tall tower of sugar cubes. The tower wobbles but stays up.');
 scene(4,'kitchen',[...table(),entrance(plate('meat',380)),bear('hungry')],'The bear points hopefully as a piece of felt play-food arrives on its plate.');
 let meat=plate('meat',440);wobble(meat,.4,4);
 scene(5,'kitchen',[...table(),meat,wobble(bear('shrug'),.4,3)],'The bright red felt cutlet matches the bear’s red scarf. A puzzled shrug; no mess.',2.2,cam(830,480,1.08));
 scene(6,'kitchen',[...table(),entrance(plate('bread',415)),bear('hungry')],'A round brown loaf makes one soft landing on the table.');
 let loaf=plate('bread',560,1030),peek=bear('shrug',660);keys(peek,[[0,{x:810}],[.4,{x:810}],[1.7,{x:660}]]);
 scene(7,'kitchen',[...table(),peek,loaf],'The loaf is so enormous that the bear has to lean around it to peek at the class.');

 let walk=bear('walk',540,820,390);keys(walk,[[0,{x:280,rotation:-3}],[.6,{x:365,y:walk.y-9,rotation:3}],[1.2,{x:455,rotation:-3}],[1.8,{x:540,rotation:0}]]);
 scene(8,'road',[sign(),walk],'A few jaunty steps toward the tiny town on the distant hill.');
 let far=scene(9,'road',[sign(),wobble(bear('shrug',540,820,330),.4,3)],'The bear looks very small beside the long winding road. Town is still far away.',2.2,cam(650,565,1.18));cameraMove(far,cam());
 let car=asset('car','Little bear driving a teal car',650,820,420);keys(car,[[0,{x:-350}],[2,{x:650}]]);
 scene(10,'road',[sign(),car],'The little teal car rolls in. The bear is already at the wheel.');
 car=asset('car','The very slow little car',710,820,420);keys(car,[[0,{x:650}],[2.6,{x:710}]]);
 let snail=asset('snail','The surprisingly speedy snail',1280,857,115);keys(snail,[[0,{x:360}],[2.6,{x:1280}]]);
 scene(11,'road',[sign(),car,snail],'The car barely moves, while a cheerful snail overtakes it.',2.6);
 let toe=bear('toe',600,840,360);
 keys(toe,[[0,{y:toe.y-30,rotation:-5}],[.65,{y:toe.y+5,rotation:3}],[1.15,{}]]);
 scene(12,'road',[sign(),asset('snail','The snail pauses nearby',1070,845,105),toe],'A small seated plop and a clean little bandage on the toe. The snail pauses nearby. No injury detail.');
 toe=bear('toe',670,840,400);let star=shape('A little ouch star',810,660,34,34,'#efc56a','Star');keys(star,[[0,{opacity:0}],[.5,{opacity:.9,rotation:-12}],[1.15,{opacity:.9,rotation:12,y:640}],[1.9,{opacity:0,y:625}]]);
 scene(13,'road',[asset('snail','A quiet little friend',1080,845,105),wobble(toe,.4,2),star],'A closer look at the little bandaged toe; one small felt star floats away.',2.2,cam(690,620,1.28));

 let train=asset('train','Little bear in a toy train',600,697,390);keys(train,[[0,{x:-330}],[2,{x:600}]]);
 scene(14,'station',[train,...steam(780,260)],'The red-and-teal toy train arrives with three soft puffs of cotton steam.',2.6);
 train=asset('train','Toy train · a cushioned bump',820,697,390);
 const cushions=asset('pillows','A soft landing · three cushions',1265,704,310);
 keys(train,[[0,{x:600}],[1.05,{x:820}],[1.3,{x:825,rotation:-3,y:train.y-4}],[1.85,{x:815,rotation:-2}]]);
 keys(cushions,[[0,{}],[1.05,{}],[1.4,{x:1288,rotation:6}],[2,{x:1280,rotation:3}]]);
 scene(15,'station',[cushions,train],'The toy train gently bumps a cushion pile and tips a tiny bit. No smoke, damage or frightening crash.');
 let neck=bear('neck',540,845,485);
 scene(16,'station',[asset('pillows','The soft cushion pile',1190,705,275),wobble(neck,.4,2)],'The bear has a plush croissant-shaped travel pillow around its neck and gives a sheepish little wiggle.');
 neck=bear('neck',470,830,490);wobble(neck,.25,3);
 scene(17,'kitchen',[...table(),plate(),neck],'Back home, the bear still wears the silly travel pillow. Oh my!',2.2);
 let empty=plate();keys(empty,[[0,{}],[.45,{rotation:-7}],[1.05,{rotation:7}],[1.65,{}]]);
 neck=bear('neck',470,830,490);keys(neck,[[0,{}],[.65,{rotation:5,y:neck.y+8}],[1.55,{}]]);
 scene(18,'kitchen',[...table(),empty,neck],'The same three crumbs. The bear makes a tiny bow; there is still no pie.');

 const p={format:'felt-and-fable',version:1,title:'No More Pie',active:0,scenes,custom:[],imports,audioAssets:{},exportFps:60,phraseShow:{version:1,enabled:true,mode:'manual'},notes:'18 lyric lines from Drew’s supplied “LYRICS Oh My, No More Pie” sheet. Each line is one scene, including separate “Oh my!” and “No more pie” scenes at the beginning and end. Sing the leader line and the class echo before pressing Next or Space. Short visual actions freeze and wait indefinitely. No automatic timing or audio. All original artwork is embedded; scenes and animations remain editable. Open story, then Present.'};
 fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(p));
 fs.writeFileSync(path.join(source,'asset-metadata.json'),JSON.stringify(meta,null,2));
 console.log(JSON.stringify({file:output,scenes:scenes.length,embeddedAssets:Object.keys(imports).length,bytes:fs.statSync(output).size}));
})().catch(e=>{console.error(e);process.exit(1)});
