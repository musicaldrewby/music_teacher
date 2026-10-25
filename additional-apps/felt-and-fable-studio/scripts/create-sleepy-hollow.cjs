// Original felt artwork, editable manual narration beats. No synthetic narrator.
const fs=require('fs'),path=require('path');
const {Image,createCanvas}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'../story-source/sleepy-hollow'),src=root+'/art-source',out=root+'/art';
const imports={},meta={},scenes=[],beats=[];let serial=0;
const uid=k=>'sh-'+k+'-'+(++serial),aid=k=>'import-sleepy-'+k,clone=x=>JSON.parse(JSON.stringify(x));
const narration=JSON.parse(fs.readFileSync(root+'/narration.json'));
async function im(file){const a=new Image();a.src='data:image/png;base64,'+fs.readFileSync(file).toString('base64');await a.decode();return a;}
function register(key,c){const data=c.toBuffer('image/webp',92);fs.writeFileSync(out+'/'+key+'.webp',data);imports[aid(key)]='data:image/webp;base64,'+data.toString('base64');meta[key]=[c.width,c.height];}
async function background(key){const a=await im(src+'/'+key+'.png'),c=createCanvas(1600,900);c.getContext('2d').drawImage(a,0,0,1600,900);register(key,c);}
function bounds(g,x,y,w,h){const a=g.getImageData(x,y,w,h).data;let l=w,t=h,r=0,b=0;for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)if(a[(yy*w+xx)*4+3]>36){l=Math.min(l,xx);t=Math.min(t,yy);r=Math.max(r,xx+1);b=Math.max(b,yy+1);}if(r<=l)throw Error('Empty artwork');return{l:Math.max(0,l-3),t:Math.max(0,t-3),r:Math.min(w,r+3),b:Math.min(h,b+3)};}
async function atlas(file,entries,kind){const a=await im(src+'/'+file+'.png'),sheet=createCanvas(a.width,a.height),g=sheet.getContext('2d');g.drawImage(a,0,0);for(const [key,x,y,w,h,anchor]of entries){const q=bounds(g,x,y,w,h);let c,cg;if(kind==='cast'){c=createCanvas(512,520);cg=c.getContext('2d');const k=.96,dx=256-(anchor??(q.l+q.r)/2)*k,dy=508-q.b*k;cg.drawImage(a,x,y,w,h,dx,dy,w*k,h*k);}else if(kind==='horse'){c=createCanvas(900,600);cg=c.getContext('2d');const k=1,dx=450-(q.l+q.r)/2,dy=570-q.b;cg.drawImage(a,x,y,w,h,dx,dy,w*k,h*k);}else{c=createCanvas(q.r-q.l,q.b-q.t);c.getContext('2d').drawImage(a,x+q.l,y+q.t,c.width,c.height,0,0,c.width,c.height);}register(key,c);}}
function pose6(file,prefix,names,anchors=[]){return atlas(file,names.map((n,i)=>[prefix+'-'+n,i%3*512,Math.floor(i/3)*512,512,512,anchors[i]]),'cast');}
function item(key,x,ground,height,name=key){const[bw,bh]=meta[key]||[];if(!bw)throw Error('Missing '+key);return{id:uid(key),type:'asset',asset:aid(key),name,x,y:ground-height/2,w:height*bw/bh,h:height,bw,bh,rotation:0,opacity:1,fiber:0,stitch:false,depth:'middle',depthContact:'ground'};}
function shape(name,x,y,w,h,color,kind='Oval'){return{id:uid('felt'),type:'shape',name,shape:kind,x,y,w,h,bw:w,bh:h,color,rotation:0,opacity:1,fiber:.28,stitch:false,depth:'middle',depthContact:'ground'};}
function keys(o,rows,ease='smooth'){const base=Object.fromEntries(['x','y','w','h','rotation','opacity'].map(k=>[k,o[k]??0]));o.keyframes=rows.map(([t,p])=>({t,ease,pose:{...base,...p}}));return o;}
function appear(o,t=.1,d=.45){return keys(o,[[0,{opacity:0}],[t,{opacity:0}],[t+d,{}]]);}
function add(s,o){s.items.push(o);return o;}
function bg(key){const q=item(key,800,900,900,'Set · '+key);q.w=q.bw=1600;q.locked=true;return q;}
function shadow(s,x,y,w){const q=shape('Contact shadow',x,y+2,w,13,'#101d1b');q.opacity=.2;q.fiber=0;return add(s,q);}
const castPoses={ichabod:['stand','sing','startled','dance','sad','worry'],katrina:['stand','book','amused','dance','listen','think'],brom:['stand','tell','laugh','sit','hand','think'],mounted:['stand','step','gather','extend'],bareback:['stand','step','gather','extend'],horseman:['stand','extend','gather','raise']};
function actor(s,who,x=800,ground=790,height=430,pose='stand',facing='right',withShadow=true){const horse=['mounted','bareback','horseman'].includes(who),den=horse?600:520,base=horse?570:508;const q=item(who+'-'+pose,x,ground+height*(den-base)/den,height,who==='mounted'||who==='bareback'?'Ichabod on Gunpowder':who==='horseman'?'The silent rider':who==='ichabod'?'Ichabod Crane':who==='brom'?'Brom Bones':'Katrina Van Tassel');q.illustration={poses:castPoses[who].map(n=>({id:n,name:n,asset:aid(who+'-'+n),facing:'right'})),defaultPose:pose,facing,changes:[]};if(withShadow)q._shadow=shadow(s,x,ground,horse?height*.66:height*.28);add(s,q);return q;}
function pose(q,p,time){q.illustration.changes.push({id:uid('pose'),time,poseId:p,facing:q.illustration.facing});}
const cam=(x=800,y=450,zoom=1)=>({x,y,zoom});
function frame(s,a=cam(),b=a,travel=5){s.camera=clone(a);s.cinema.shots=[{id:uid('shot'),name:s.name,duration:travel,from:a,to:b,move:JSON.stringify(a)!==JSON.stringify(b),easing:'cinematic',connection:'cut',path:{holdStart:.08,holdEnd:.25,bend:0},notes:s.notes}];s.phrase.holdAt=Math.max(s.phrase.holdAt,travel);}
function look(s,light='none',strength=.2,weather='none'){s.cinema.look={light,weather,strength,density:.15,x:.5,y:.5,endX:.5,endY:.5};}
function dissolve(s){s.cinema.transition={kind:'dissolve',duration:.6};}
function leaf(s,x,y,delay=0){const q=shape('Falling autumn leaf',x,y,20,10,'#bd6329');add(s,q);keys(q,[[0,{opacity:0}],[delay+.05,{opacity:.8}],[delay+2,{x:x+65,y:y+200,rotation:80,opacity:.8}],[delay+4,{x:x+120,y:y+420,rotation:160,opacity:0}]],'linear');return q;}
function table(s){return add(s,item('table',835,1110,470,'Felt oak supper table'));}
function branch(s,x=1470){const q=item('bough',x,790,780,'Foreground leafy bough');q.rotation=90;q.opacity=.9;return add(s,q);}
function gallop(s,q,to,seconds=2.6,start=.2){
 // Stop-motion contact cycle: the extended stance is stationary. Translation
 // happens only during the lifted, gathered flight pose, never on planted hooves.
 const from=q.x,sh=q._shadow,count=Math.ceil(seconds/.4),dt=seconds/count,dx=(to-from)/count,rows=[[0,{}],[start,{}]],sr=[[0,{}],[start,{}]];
 q.illustration.defaultPose='extend';
 for(let j=0;j<count;j++){
  const t=start+j*dt,x=from+j*dx,land=t+dt,up=t+dt*.25,mid=t+dt*.62;
  rows.push([up,{x,y:q.y}],[mid,{x:x+dx*.5,y:q.y-q.h*.075}],[land,{x:x+dx,y:q.y}]);
  if(sh)sr.push([up,{x,opacity:.2}],[mid,{x:x+dx*.5,opacity:.1,w:sh.w*.8}],[land,{x:x+dx,opacity:.2}]);
  pose(q,'gather',up+.001);pose(q,'extend',land);
 }
 keys(q,rows,'linear');if(sh)keys(sh,sr,'linear');s.phrase.holdAt=Math.max(s.phrase.holdAt,start+seconds+.1);
}
function closeRider(s,who='mounted',p='stand',x=800){const q=actor(s,who,x,1120,1100,p,'right',false);return q;}
function dust(s,x=950){for(let i=0;i<5;i++){const q=add(s,shape('Road dust',x+i*50,740,120+i*18,60+i*8,'#b9a78e'));q.opacity=.28;keys(q,[[0,{opacity:0}],[.5+i*.1,{opacity:.25}],[2.8,{x:q.x+70,y:650-i*18,w:q.w*1.5,h:q.h*1.4,opacity:0}]]);}}
function make(section,letter,text){const code=section.id+letter,n=Number(section.id),s={id:'sleepy-'+code,name:code+' · '+section.title,bg:-1,bgColor:'#142624',caption:section.title,duration:Math.max(7,Math.ceil(text.replace(/\[[^\]]+\]/g,'').split(/\s+/).length/2.15)+1),items:[],cues:[],notes:section.delivery,phrase:{id:'sleepy-'+code,section:section.title,direction:'Read aloud · Space for the next shot',holdAt:5},director:{notes:'NARRATION — '+code+'\n'+text+'\n\nDELIVERY: '+section.delivery+'\n\nAdvance after the last words above. Scene durations are provisional until your voice is imported and timing recorded.',markers:[{id:uid('mark'),label:code+' · '+section.title,time:0}]},cinema:{depthMode:'grounded',liveCamera:true,shots:[]}};s._text=text;s._code=code;
 const set=n<=12?([1].includes(n)?'valley-day':[3,8].includes(n)&&letter==='A'?'schoolroom':[4,7,8,12].includes(n)&&!(n===4&&letter==='B')?'farmhouse':'farmhouse-interior'):n===19||n===20||n===21?'church-bridge-night':n>=22?'farmhouse':'woods-night';add(s,bg(set));frame(s);
 let q,r,p;
 switch(code){
 case'01A':frame(s,cam(),cam(850,470,1.08),6);leaf(s,270,180);leaf(s,1220,210,.8);s.cinema.titles=[{kind:'title',text:'The Legend of\nSleepy Hollow',subtitle:'Based on the story by Washington Irving',color:'#fff3d2',start:0,duration:3.8}];break;
 case'01B':look(s,'night',.62);dissolve(s);frame(s,cam(850,470,1.08));break;
 case'02A':q=actor(s,'brom',950,820,470,'tell');actor(s,'katrina',600,805,410,'listen');pose(q,'stand',2.8);frame(s,cam(800,515,1.2));break;
 case'02B':s.items=[bg('church-bridge-night')];look(s,'none',.1,'fog');frame(s,cam(),cam(1000,450,1.12),6);break;
 case'03A':q=actor(s,'ichabod',810,810,500);frame(s,cam(800,500,1.05));break;
 case'03B':s.items=[bg('schoolroom')];q=actor(s,'ichabod',770,820,560,'stand');pose(q,'sing',.45);frame(s,cam(820,400,1.5));break;
 case'04A':actor(s,'ichabod',700,800,430);p=add(s,item('basket',930,800,150,'Basket of kindling'));for(let i=0;i<5;i++){q=shape('Split firewood',910+i*10,693,10,60,'#63482b','Rectangle');q.rotation=i*9-18;add(s,q);}frame(s,cam(820,550,1.2));break;
 case'04B':actor(s,'ichabod',770,960,640,'stand', 'right',false);table(s);p=add(s,shape('A completely empty plate',830,666,240,43,'#eee0c1'));keys(p,[[0,{x:600}],[1.3,{x:830}]]);frame(s,cam(830,600,1.55));break;
 case'05A':q=actor(s,'ichabod',740,810,490,'worry');actor(s,'brom',1110,800,410,'tell');frame(s,cam(790,490,1.1),cam(740,420,1.4),5);break;
 case'05B':s.items=[bg('woods-night')];q=actor(s,'ichabod',740,765,470);pose(q,'startled',.8);add(s,item('frog',970,780,85,'A very ordinary frog'));frame(s,cam(850,565,1.23));break;
 case'06A':actor(s,'ichabod',610,815,510,'sing');q=actor(s,'katrina',1020,815,445,'book','left');pose(q,'amused',2.4);frame(s,cam(810,510,1.12));break;
 case'06B':q=actor(s,'ichabod',720,980,690,'stand','right',false);table(s);add(s,item('pie',1010,678,135,'Plenty of imaginary pie'));s.cinema.grade={preset:'dream',strength:.32};dissolve(s);frame(s,cam(850,540,1.25));break;
 case'07A':q=actor(s,'brom',820,810,540);pose(q,'hand',2.5);frame(s,cam(830,470,1.32));break;
 case'07B':actor(s,'ichabod',800,805,400,'worry');frame(s,cam(780,490,1.22));break;
 case'08A':actor(s,'ichabod',700,930,650,'stand','right',false);p=add(s,item('invitation',1060,725,160,'The Van Tassels’ invitation'));p.rotation=-8;keys(p,[[0,{rotation:-8}],[1,{rotation:0}]]);frame(s,cam(860,480,1.5));break;
 case'08B':q=actor(s,'mounted',800,800,550);pose(q,'step',1.2);pose(q,'stand',2);frame(s,cam());break;
 case'09A':s.items=[bg('farmhouse')];look(s,'sunset',.5);q=actor(s,'katrina',960,710,250);frame(s,cam(),cam(930,430,1.15),6);break;
 case'09B':actor(s,'ichabod',760,970,680,'stand','right',false);table(s);add(s,item('pie',1080,678,130,'One more pie'));add(s,shape('Supper plate',720,673,190,35,'#f0e2c5'));frame(s,cam(850,540,1.25));break;
 case'10A':q=actor(s,'ichabod',620,815,500,'stand');r=actor(s,'katrina',1040,815,440,'stand','left');for(let j=0;j<6;j++){pose(q,j%2?'stand':'dance',.35+j*.6);pose(r,j%2?'stand':'dance',.5+j*.6);}frame(s,cam(800,500,1.06));break;
 case'10B':q=actor(s,'brom',850,820,500,'sit');frame(s,cam(850,490,1.42));break;
 case'11A':q=actor(s,'brom',830,820,480,'stand');pose(q,'tell',.6);actor(s,'ichabod',480,820,490,'worry');actor(s,'katrina',1180,820,420,'listen','left');frame(s,cam(820,520,1.1));break;
 case'11B':q=actor(s,'ichabod',890,860,640,'worry');frame(s,cam(850,420,1.6),cam(1120,350,1.6),6);break;
 case'12A':look(s,'night',.4);frame(s,cam(950,450,1.16));break;
 case'12B':look(s,'night',.5);q=actor(s,'ichabod',840,800,400,'sad');frame(s,cam(840,520,1.1),cam(850,500,1),5);break;
 case'13A':q=actor(s,'mounted',800,754,515);pose(q,'step',1);pose(q,'stand',2);look(s,'night',.16);frame(s,cam(830,490,1.04));break;
 case'13B':closeRider(s);look(s,'night',.18);frame(s,cam(820,470,1.18));break;
 case'14A':frame(s,cam(420,390,1.45),cam(390,325,1.75),5);break;
 case'14B':q=actor(s,'mounted',990,750,355);frame(s,cam(400,350,1.55),cam(820,475,1.12),6);leaf(s,430,270);break;
 case'15A':q=actor(s,'mounted',1040,755,465);pose(q,'step',1);pose(q,'stand',1.7);frame(s,cam(1050,510,1.25));break;
 case'15B':q=add(s,item('stranger-lower',800,800,570,'A stranger · shoulders hidden above frame'));look(s,'night',.42);frame(s,cam(850,630,1.5));break;
 case'16A':add(s,item('stranger-lower',425,850,850,'The stranger’s horse and lower cloak'));add(s,item('mounted-lower',1170,850,850,'Gunpowder and Ichabod · lower detail'));look(s,'night',.28);frame(s,cam(800,560,1.13));break;
 case'16B':closeRider(s,'mounted');look(s,'night',.25);frame(s,cam(810,420,1.2),cam(790,390,1.28),5);break;
 case'17P':closeRider(s,'mounted');look(s,'night',.25);frame(s,cam(800,400,1.4));s.phrase.direction='Read the setup. Pause two beats. Space reveals the rider.';break;
 case'17A':q=actor(s,'horseman',820,780,650);look(s,'night',.2);frame(s,cam(810,410,1.13),cam(810,370,1.24),3);s.phrase.direction='Reveal: “There was no head.” Hold before advancing.';break;
 case'17B':q=actor(s,'horseman',580,1030,920,'stand','right',false);add(s,item('ichabod-startled-bust',1280,1080,750,'Ichabod’s frightened reaction'));look(s,'night',.22);frame(s,cam(870,530,1.25));break;
 case'18A':q=actor(s,'mounted',-360,760,480,'gather');r=actor(s,'horseman',-1060,760,490,'gather');gallop(s,q,2050,3.3);gallop(s,r,1740,3.3);look(s,'night',.18);dust(s,800);break;
 case'18B':closeRider(s,'mounted','gather',870);q=branch(s,2150);keys(q,[[0,{}],[1.3,{x:-650}]],'linear');look(s,'night',.2);frame(s,cam(850,480,1.12));break;
 case'19A':s.items=[bg('woods-night')];q=closeRider(s,'bareback','gather',940);p=add(s,item('saddle',640,810,210,'The borrowed saddle falls away'));keys(p,[[0,{y:560,rotation:0}],[.8,{x:520,y:740,rotation:80}],[1.3,{x:480,y:795,rotation:95}]]);look(s,'night',.23);frame(s,cam(820,540,1.15));break;
 case'19B':q=actor(s,'bareback',250,706,280,'gather');look(s,'night',.1);frame(s,cam(),cam(1050,420,1.15),5);break;
 case'20A':q=actor(s,'bareback',-230,706,280,'gather');r=actor(s,'horseman',-750,706,290,'gather');gallop(s,q,1760,3.1);gallop(s,r,1560,3.1);look(s,'night',.12);break;
 case'20B':actor(s,'horseman',590,706,390);q=add(s,item('ichabod-worry-bust',1280,1080,780,'Ichabod looks back'));look(s,'night',.24);frame(s,cam(900,450,1.1));break;
 case'21A':q=actor(s,'horseman',840,706,650,'stand');pose(q,'raise',.8);look(s,'night',.3);frame(s,cam(820,400,1.18));s.phrase.direction='Read through “saddle.” Space begins the throw.';break;
 case'21B':s.items=[bg('woods-night')];q=add(s,shape('A dark round shape',310,320,64,60,'#252a2a'));keys(q,[[0,{opacity:1}],[.32,{x:670,y:215,opacity:1}],[.64,{x:1020,y:580,opacity:1}],[.72,{x:1120,y:700,opacity:0}],[5,{opacity:0}]],'linear');branch(s,1480);p=add(s,item('hat',990,810,110,'Ichabod’s fallen hat'));appear(p,.7,.35);dust(s,960);look(s,'night',.22);s.phrase.direction='Read the tumble, pause three beats, then the quiet line.';break;
 case'22A':q=add(s,item('grazing',820,800,390,'Gunpowder home without saddle or rider'));shadow(s,820,800,430);s.items.splice(1,0,s.items.pop());dissolve(s);frame(s,cam(850,530,1.12));leaf(s,330,210);break;
 case'22B':s.items=[bg('valley-day')];add(s,item('saddle',380,825,230,'Fallen saddle · along the road'));add(s,item('hat',760,820,160,'Ichabod’s hat'));add(s,item('pumpkin',1150,820,250,'Broken pieces of an ordinary pumpkin'));frame(s,cam(810,700,1.22),cam(1050,700,1.45),6);break;
 case'23A':actor(s,'brom',650,800,455,'think');actor(s,'katrina',1000,800,410,'think','left');frame(s,cam(840,500,1.2));break;
 case'23B':q=actor(s,'brom',650,800,455,'tell');actor(s,'katrina',1000,800,410,'listen','left');pose(q,'think',3);frame(s,cam(840,470,1.3));break;
 case'24A':q=actor(s,'brom',680,805,480,'stand');actor(s,'katrina',1040,805,430,'stand','left');pose(q,'laugh',1.8);frame(s,cam(850,490,1.18));break;
 case'24B':s.items=[bg('valley-day')];look(s,'night',.58);frame(s,cam(1000,450,1.16),cam(),7);dissolve(s);s.cinema.titles=[{kind:'title',text:'The Legend of Sleepy Hollow',subtitle:'Based on the story by Washington Irving · A story for Drew Wichman',color:'#fff0d0',start:5,duration:Math.max(2,s.duration-5)}];break;
 default:throw Error('Unstaged '+code);
 }
 for(const o of s.items){delete o._shadow;if(o.illustration)o.illustration.changes.sort((a,b)=>a.time-b.time);}
 s.duration=Math.max(s.duration,s.phrase.holdAt+.5);beats.push({id:code,name:section.title,text,duration:s.duration,direction:s.phrase.direction});delete s._text;delete s._code;scenes.push(s);
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});{const a=await im(path.resolve(root,'../three-little-pigs/art/table.png')),c=createCanvas(a.width,a.height);c.getContext('2d').drawImage(a,0,0);register('table',c);}
 for(const [id,key]of [['piece76','basket'],['cinema-foreground-leafy-branches','bough']]){const vm=require('vm'),ctx={FELT_DATA:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('asset-packs/assets/prepared/'+id+'.js','utf8'),ctx);const a=new Image();a.src=ctx.FELT_DATA[id];await a.decode();const c=createCanvas(key==='bough'?550:a.width,key==='bough'?400:a.height);c.getContext('2d').drawImage(a,0,0);register(key,c);}
 for(const key of ['valley-day','farmhouse','schoolroom','farmhouse-interior','woods-night','church-bridge-night'])await background(key);
 await pose6('ichabod-poses','ichabod',castPoses.ichabod,[270,255,255,290,257,260]);await pose6('katrina-poses','katrina',castPoses.katrina,[290,265,270,288,270,270]);await pose6('brom-poses','brom',castPoses.brom,[265,260,263,270,260,260]);
 for(const p of ['startled','worry']){const a=await im(out+'/ichabod-'+p+'.webp'),c=createCanvas(512,310);c.getContext('2d').drawImage(a,0,0);register('ichabod-'+p+'-bust',c);}
 for(const [file,prefix]of [['ichabod-mounted','mounted'],['ichabod-bareback','bareback']])await atlas(file,castPoses[prefix].map((p,i)=>[prefix+'-'+p,i%2*768,Math.floor(i/2)*512,768,512]),'horse');
 await atlas('horseman-mounted',[['horseman-stand',0,0,768,510],['horseman-extend',768,0,768,510],['horseman-gather',0,510,850,514],['horseman-raise',850,510,686,514]],'horse');
 await atlas('props',[['hat',0,0,540,560],['pumpkin',540,0,500,560],['saddle',1040,0,496,560],['invitation',0,560,540,464],['pie',540,560,500,464],['frog',1040,560,496,464]]);
 await atlas('gunpowder-grazing',[['grazing',0,0,1536,1024]]);
 // Early inserts physically omit shoulders so no manual hold can reveal the mystery.
 for(const [from,to]of [['horseman-stand','stranger-lower'],['mounted-stand','mounted-lower']]){const a=await im(out+'/'+from+'.webp'),c=createCanvas(900,350);c.getContext('2d').drawImage(a,0,250,900,350,0,0,900,350);register(to,c);}
 const splits=['But after sunset','Before daylight','He also taught singing','Looking at that narrow','Walking home alone','Soon he was imagining','Ichabod had no wish','He borrowed an old horse','He tasted this','Across the room','Ichabod listened closely','What did they say?','He tried a little tune','A groan came from above','The shape moved out','The road rose gently',null,'Gunpowder took a turn','But that worry could wait','Ichabod turned to look','Ichabod ducked','The neighbors searched','Years later','Did Brom know'];
 narration.forEach((section,i)=>{const text=section.paragraphs.map(p=>typeof p==='string'?p:'['+p.cue+']').join('\n\n');if(i===16){const cut=text.indexOf('There was no head.'),cut2=text.indexOf('Something round');make(section,'P',text.slice(0,cut).trim());make(section,'A',text.slice(cut,cut2).trim());make(section,'B',text.slice(cut2).trim());}else{const cut=text.indexOf(splits[i]);if(cut<0)throw Error('Missing split '+section.id);make(section,'A',text.slice(0,cut).trim());make(section,'B',text.slice(cut).trim());}});
 const p={format:'felt-and-fable',version:1,title:'The Legend of Sleepy Hollow',active:0,scenes,imports,custom:[],audioAssets:{},exportFps:30,exportCaptions:false,exportNormalizeAudio:true,phraseShow:{version:1,enabled:true,mode:'manual'},filmBrief:{logline:'A hopeful schoolteacher rides home through a valley where every shadow has a story.',notes:'49 editable shots / 24 narration sections. Original felt artwork. Full narration is saved in each shot’s director notes and in the recording cue sheet. Present → Manual → Space advances one shot; the Horseman reveal waits for its own advance. No recorded voice or fixed narration timing yet. Record your narration, import the audio in Present → Music & timing, record scene changes, then download the story to keep the audio and timing together. Grounded sets; restrained camera moves and brief pose-based chase crossings. The ending remains uncertain. Based on the story by Washington Irving’s original story: https://www.gutenberg.org/ebooks/41'},filmFinish:{look:'none',strength:.5,glow:0,grain:0,vignette:.12,aspect:'native'}};
 const target=process.argv[2]||'public/examples/sleepy-hollow.felt.json';fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(p));fs.writeFileSync(root+'/beats.json',JSON.stringify(beats,null,2));fs.writeFileSync(root+'/asset-metadata.json',JSON.stringify(meta,null,2));
 const cueSheet=['THE LEGEND OF SLEEPY HOLLOW','Recording and manual presentation cue sheet','', 'OPEN: Felt & Fable → File → Sleepy Hollow story. Choose Present → Manual. Press Space after each block below. Back returns to the preceding shot. Actions run briefly, then hold for your voice.','', 'RECORDING: Record your voice as one audio file. In Present → Music & timing, import it and choose Record scene changes. Start recording, then press Space when each next block begins. Finish on the last scene after the narration ends. Completed timing becomes active for playback, timeline and video. Download the story to keep your voice and timing. Manual presentation remains available.','', 'The included scene lengths are visual rehearsal estimates, not saved narration timing. This edition contains no recorded narrator or soundtrack.','', ...beats.flatMap((b,i)=>[String(i+1).padStart(2,'0')+' / 49  —  '+b.id+' · '+b.name,b.direction,'',b.text,'','[SPACE → next shot]',''])].join('\n');fs.writeFileSync(root+'/Sleepy-Hollow-Recording-Cues.txt',cueSheet);fs.writeFileSync(path.join(path.dirname(target),'Sleepy-Hollow-Recording-Cues.txt'),cueSheet);
 if(fs.existsSync(root+'/narration.mp3'))require('./attach-sleepy-narration.cjs')(target);
 await require('./revise-sleepy-staging.cjs')(target);
 await require('./fix-sleepy-scale-and-dining.cjs')(target);
 await require('./revise-sleepy-acting.cjs')(target);
 console.log(JSON.stringify({file:target,scenes:scenes.length,assets:Object.keys(imports).length,bytes:fs.statSync(target).size}));
})().catch(e=>{console.error(e);process.exit(1)});
