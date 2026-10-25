// Rebuild the classroom chant with embedded felt art and editable story pieces.
const fs=require('fs'),path=require('path'),sharp=require('sharp');
const root=path.resolve(__dirname,'..'),art=path.join(root,'story-source/dark-dark-wood/art-basic');
let serial=0;const id=()=>`dark-wood-${++serial}`;
const base=(name,x,y,w,h)=>({id:id(),name,x,y,w,h,bw:w,bh:h,rotation:0,opacity:1,fiber:0,stitch:false,depth:'middle',depthContact:'ground'});
const asset=(key,name,x=800,y=450,w=1600,h=900)=>({...base(name,x,y,w,h),type:'asset',asset:'import-dark-'+key});
const shape=(name,kind,x,y,w,h,color)=>({...base(name,x,y,w,h),type:'shape',shape:kind,color,fiber:.6,stitch:true});
const text=(words,x,y,w,h,color='#fff1cf')=>({...base(words,x,y,w,h),type:'text',text:words,color,fiber:.1});
const pose=o=>({x:o.x,y:o.y,w:o.w,h:o.h,rotation:o.rotation,opacity:o.opacity});
const keys=(o,frames)=>{o.keyframes=frames.map(([t,q])=>({t,ease:'smooth',pose:{...pose(o),...q}}));return o};
const backdrop=(key)=>({...asset(key,'Felt set · '+key),locked:true});
const levels=['ppp','pp','p','mp','mf','f','ff'];
const names=['Very, very soft','Very soft','Soft','Medium soft','Medium loud','Loud','Very loud'];
const captions=[
 'In a dark, dark wood there was a dark, dark house.',
 'And in that dark, dark house there was a dark, dark room.',
 'And in that dark, dark room there was a dark, dark closet.',
 'And in that dark, dark closet there was a dark, dark shelf.',
 'And on that dark, dark shelf there was a dark, dark box.',
 'And in that dark, dark box there was a...',
 'GHOST!'
];
function dynamic(i){
 const panel=shape('Dynamics card','Rounded rectangle',180,111,290,180,'#161c32');panel.opacity=.94;panel.stitch=false;
 const label=text(levels[i],180,88,210,100),meaning=text(names[i],180,145,255,28,'#ffe0a2');
 const bars=levels.map((d,n)=>({...shape('Volume step · '+d,'Rounded rectangle',99+n*27,183,17,10+n*3,n<=i?'#f2c977':'#556071'),stitch:false,fiber:0}));
 return [panel,label,meaning,...bars];
}
function scene(i,section,items,hold=4){const sid=id();return {id:sid,name:section,bg:-1,bgColor:'#151a2c',caption:captions[i],duration:hold+.2,items:[...items,...dynamic(i)],cues:[],camera:{x:800,y:450,zoom:1},phrase:{id:sid,section:`${i+1}. ${section} · ${levels[i]}`,direction:`${names[i]}. Teacher first, then students echo at the same volume.`,holdAt:hold},director:{notes:'Live echo chant. Keep this scene for both the teacher and student response. Advance only when ready.',markers:[]}};}
function boxParts(x,y,w){const h=w*.57;
 const shadow={...shape('Box shadow','Oval',x,y+h*.5,w*1.02,10,'#0e101f'),opacity:.12,stitch:false,fiber:0};
 const body=asset('box','Dark felt box · open body',x,y,w,h);
 const lid=asset('lid','Closed felt lid',x,y-h*.42,w*1.07,h*.26);
 return {back:[shadow],front:[body],lid};
}
async function main(){
 const imports={};for(const key of ['wood','room','closet']){const b=await sharp(path.join(art,key+'.png')).resize(1920,1080,{fit:'cover'}).webp({quality:91}).toBuffer();fs.writeFileSync(path.join(art,key+'.webp'),b);imports['import-dark-'+key]='data:image/webp;base64,'+b.toString('base64')}
 for(const key of ['box','lid','ghost']){const b=await sharp(path.join(art,key+'.png')).trim().webp({quality:92,alphaQuality:100}).toBuffer();fs.writeFileSync(path.join(art,key+'.webp'),b);imports['import-dark-'+key]='data:image/webp;base64,'+b.toString('base64')}
 const scenes=[],readyId=id(),titleBg=backdrop('wood');
 scenes.push({id:readyId,name:'Ready to chant',bg:-1,bgColor:'#151a2c',caption:'Listen to your teacher. Echo each phrase. Start very softly.',duration:1,items:[titleBg,{...shape('Title card','Rounded rectangle',800,310,1080,340,'#161c32'),opacity:.9,stitch:false},text('In a Dark, Dark Wood',800,245,995,105),text('A spooky echo chant',800,348,800,55,'#eed6b0'),text('ppp   →   pp   →   p   →   mp   →   mf   →   f   →   ff',800,418,940,42,'#f0c97d')],cues:[],camera:{x:800,y:450,zoom:1},phrase:{id:readyId,section:'Ready to chant',direction:'Teacher first. Students echo. Each phrase gets a little louder.',holdAt:.2,nextLabel:'Start chant · Space'}});
 let bg=backdrop('wood');keys(bg,[[0,{}],[4,{w:1760,h:990,x:770,y:430}]]);scenes.push(scene(0,'The woods', [bg]));
 bg=backdrop('room');keys(bg,[[0,{}],[4,{w:1664,h:936,x:794,y:449}]]);scenes.push(scene(1,'The dark room',[bg]));
 bg=backdrop('room');Object.assign(bg,{w:2112,h:1188,x:600,y:460});keys(bg,[[0,{w:1984,h:1116,x:645}],[4,{}]]);scenes.push(scene(2,'The closet',[bg]));
 bg=backdrop('closet');keys(bg,[[0,{w:1728,h:972,y:440}],[4,{}]]);scenes.push(scene(3,'The shelf',[bg]));
 let b=boxParts(865,470,390);scenes.push(scene(4,'The dark box',[backdrop('closet'),...b.back,...b.front,b.lid]));
 bg=backdrop('closet');Object.assign(bg,{w:2050,h:1153,x:800,y:460});b=boxParts(850,467,570);
 keys(b.lid,[[0,{}],[1.6,{}],[1.7,{rotation:-2}],[1.85,{rotation:2}],[2,{rotation:-2}],[2.2,{rotation:0}],[3,{rotation:1}],[3.3,{rotation:0}],[4.5,{}]]);
 scenes.push(scene(5,'Wait for it…',[bg,...b.back,...b.front,b.lid],4.5));
 bg=backdrop('closet');Object.assign(bg,{w:2050,h:1153,x:800,y:460});b=boxParts(850,467,570);
 const ghost=asset('ghost','The spooky felt ghost',850,260,430,400);
 keys(ghost,[[0,{y:520,w:75,h:70,opacity:0}],[.18,{y:285,w:473,h:440,opacity:1,rotation:-5}],[.5,{y:240,w:430,h:400,rotation:4}],[1.4,{y:265,rotation:-3}],[2.4,{y:240,rotation:3}],[3.4,{y:260,rotation:0}],[4.5,{y:260}]]);
 keys(b.lid,[[0,{}],[.3,{x:1230,y:340,rotation:22}],[.7,{x:1250,y:590,rotation:14}],[4.5,{x:1250,y:590,rotation:14}]]);
 const shout=text('GHOST!',1280,145,500,115);keys(shout,[[0,{opacity:0,w:100,h:25}],[.25,{opacity:1,w:550,h:130,rotation:-3}],[.5,{w:500,h:115,rotation:0}],[4.5,{}]]);
 scenes.push(scene(6,'GHOST!',[bg,...b.back,ghost,...b.front,b.lid,shout],4.5));
 scenes.at(-1).phrase.direction='Very loud! Teacher calls GHOST, students echo. Restart to chant again.';
 const p={format:'felt-and-fable',version:1,title:'In a Dark, Dark Wood',active:0,scenes,imports,custom:[],audioAssets:{},music:{assetId:null,volume:1,loop:false,duck:false,fade:0},exportFps:30,exportCaptions:true,phraseShow:{version:1,enabled:true,defaultMode:'manual',manualInstruction:'Teacher chants → Students echo → Space for the next phrase'},filmBrief:'Seven phrases from Drew’s supplied chant image, with the exact ppp, pp, p, mp, mf, f, ff progression. One ready screen. Each scene holds for the teacher and student echo. The ghost appears only on the final cue. No automatic speech, soundtrack, or scene advance.'};
 p.artStyle='basic-felt-board';p.artEdition=2;
 fs.writeFileSync(path.join(root,'public/examples/dark-dark-wood.felt.json'),JSON.stringify(p));console.log(JSON.stringify({scenes:scenes.length,phrases:7,dynamics:levels,bytes:JSON.stringify(p).length}));
}
main().catch(e=>{console.error(e);process.exit(1)});
