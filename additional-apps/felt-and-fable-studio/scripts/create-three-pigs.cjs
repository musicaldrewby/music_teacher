// Three Little Pigs: editable scenes, whole-character poses, saved speech and Foley.
const fs=require('fs'),path=require('path');
const {createCanvas,Image}=require('@napi-rs/canvas');
const h=require('./app-harness.cjs');
const root=path.resolve('story-source/three-little-pigs'),art=root+'/art';
const imports={},meta={},scenes=[];let serial=0;
const uid=p=>p+'-'+(++serial),clone=x=>JSON.parse(JSON.stringify(x));
async function image(file){const i=new Image();i.src=fs.readFileSync(file);await i.decode();return i;}
async function register(key,file){const im=await image(file),c=createCanvas(im.width,im.height);c.getContext('2d').drawImage(im,0,0);imports['import-pigs-'+key]=c.toDataURL('image/webp',.92);meta[key]=[im.width,im.height];return im;}
function item(key,x,bottom,height,name=key){if(!meta[key])throw Error('Missing story artwork '+key);const[bw,bh]=meta[key];return{id:uid(key),type:'asset',asset:'import-pigs-'+key,name,x,y:bottom-height/2,w:height*bw/bh,h:height,bw,bh,rotation:0,opacity:1,fiber:0,stitch:false,depth:'middle'};}
function shape(name,x,y,w,height,color,kind='Rounded rectangle'){return{id:uid('felt'),name,type:'shape',shape:kind,x,y,w,h:height,bw:w,bh:height,rotation:0,opacity:1,fiber:.5,stitch:false,color,depth:'middle'};}
function keys(o,rows,ease='smooth'){const base=Object.fromEntries(['x','y','w','h','rotation','opacity'].map(k=>[k,o[k]??0]));o.keyframes=rows.map(([t,p])=>({t:Number(t.toFixed(4)),ease,pose:{...base,...p}}));return o;}
function bob(o,t=.5,a=2){return keys(o,[[0,{}],[t,{}],[t+.25,{rotation:-a}],[t+.55,{}]]);}
function appear(o,t,d=.3){return keys(o,[[0,{opacity:0}],[Math.max(.01,t),{opacity:0}],[t+d,{opacity:1}]]);}
function disappear(o,t,d=.25){return keys(o,[[0,{}],[t,{}],[t+d,{opacity:0}]]);}
function bg(key){const o=item(key,800,900,900,'Set · '+key);o.w=1600;o.bw=1600;o.bh=900;o.locked=true;return o;}
function floorShadow(s,o){const q=shape('Contact shadow · '+o.name,o.x,o.y+o.h*(432/448-.5),o.w*.55,15,'#243728','Oval');q.opacity=.15;q.fiber=0;s.items.push(q);return q;}
function cast(s,who,x,bottom=802,height=255,facing='right',pose='stand'){
 height/=who==='wolf'?.88:.74;bottom+=height*(1-432/448);
 const key=meta[who+'-'+pose]?who+'-'+pose:who+'-stand',o=item(key,x,bottom,height,who[0].toUpperCase()+who.slice(1));
 o.flipX=facing==='left';o.illustration={poses:['stand','walk-a','walk-b','sleep','flower','build','puff','sit','wet'].filter(p=>meta[who+'-'+p]).map(p=>({id:p,name:p,asset:'import-pigs-'+who+'-'+p,facing:'right'})),defaultPose:pose,facing,changes:[]};
 if(!o.illustration.poses.some(p=>p.id===pose))o.illustration.defaultPose='stand';
 const sh=floorShadow(s,o);s.items.push(o);o._shadow=sh;return o;
}
function pose(o,p,t=0){if(!o.illustration.poses.some(x=>x.id===p))return;if(t===0)o.illustration.defaultPose=p;else o.illustration.changes.push({id:uid('pose'),time:t,poseId:p,facing:o.illustration.facing});}
function walk(o,to,start,end,run=false){
 const from=o.x,dir=to>from?'right':'left';o.illustration.facing=dir;
 keys(o,[[0,{}],[start,{}],[end,{x:to}]],'linear');
 const steps=Math.max(2,Math.ceil(Math.abs(to-from)/(run?78:48))),dt=(end-start)/steps;
 for(let i=0;i<steps;i++){const time=start+i*dt;pose(o,i%2?'stand':'walk-a',Math.max(.001,time));}
 pose(o,'stand',end);if(o._shadow)keys(o._shadow,[[0,{}],[start,{}],[end,{x:to}]],'linear');
}
function cue(s,preset,start=0,duration=1.2,volume=.32){s.cues.push(h.run('cinemaNewCue()'));Object.assign(s.cues.at(-1),{id:uid('sound'),name:preset,preset,start,duration,volume,fadeIn:.02,fadeOut:.08});}
function house(s,kind='brick',x=1090,bottom=815,height=570){const o=item(kind+'-house',x,bottom,height,kind+' cottage');s.items.push(o);return o;}
function flower(s,x=920,bottom=640,height=64){const o=item('flower',x,bottom,height,'Poppy’s flower');s.items.push(o);return o;}
function stack(s,kind,x=520,y=800,count=9){const out=[];for(let i=0;i<count;i++){const row=Math.floor(i/3),col=i%3;const o=shape(kind,x+col*43-row*7,y-row*27,kind==='straw'?68:52,kind==='straw'?8:kind==='sticks'?11:24,kind==='straw'?'#dcb554':kind==='sticks'?'#996237':'#bf654a');o.rotation=kind==='bricks'?0:(i%3-1)*9;s.items.push(o);out.push(o);}return out;}
function openDoor(s,at=.2){const q={id:uid('doorway'),type:'path',name:'Open doorway',points:[[0,120],[9,68],[43,23],[87,0],[135,0],[181,23],[219,68],[225,120],[225,426],[0,426]],x:162,y:373,w:225,h:426,bw:225,bh:426,rotation:0,opacity:1,color:'#26382d',fiber:.2,stitch:false};s.items.splice(1,0,q);const door=item('door-panel',162,586,426,'Door on its hinge');s.items.splice(2,0,door);keys(door,[[0,{}],[at,{}],[at+.7,{x:63,w:27}]]);return door;}
function world(s){s.items.push(bg('meadow'));}
function interior(s){s.items.push(bg('interior'));}
function group(s,opts={}){return ['pip','poppy','bruno'].map((w,i)=>cast(s,w,(opts.x??510)+i*(opts.spacing??215),opts.bottom??805,opts.height??245,opts.facing??'right'));}
function pushCam(s,x=800,y=470,z=1.12,toZ=z){s.cinema.shots=[{id:uid('shot'),name:s.name,duration:s.duration,from:h.run(`cameraClamp(${JSON.stringify({x,y,zoom:z})})`),to:h.run(`cameraClamp(${JSON.stringify({x,y,zoom:toZ})})`),move:z!==toZ,easing:'cinematic',connection:'cut',notes:s.notes}];}
function storm(s,o,at,kind){
 // Detach the roof and wall panels from the original cottage artwork.
 const [bw,bh]=meta[kind+'-house'];o.opacity=0;
 for(let i=0;i<6;i++){
  const col=i%3,row=Math.floor(i/3),key=kind+'-panel-'+i,part=item(key,o.x+(col-1)*o.w/3,o.y-o.h/2+(row+.5)*o.h/2+o.h/4,o.h/2,'Falling '+kind+' section');
  part.w=o.w/3;part.y=o.y-o.h/2+(row+.5)*o.h/2;s.items.push(part);
  const dx=150+(i*113)%410,dy=-160+(i%3)*110;
  keys(part,[[0,{}],[at,{}],[at+.55,{x:part.x+dx*.48,y:part.y+dy*.6,rotation:(i-2)*22}],[at+1.4,{x:part.x+dx,y:850+(i%2)*25,rotation:(i-2)*48,opacity:.9}],[at+2.1,{x:part.x+dx+70,y:880,rotation:(i-2)*48,opacity:0}]],'linear');
 }
 for(let i=0;i<18;i++){const q=shape(kind+' debris',o.x-180+(i*43)%360,o.y-120+(i*37)%300,kind==='straw'?65:80,kind==='straw'?7:13,kind==='straw'?'#dcba67':'#91633c');q.opacity=0;q.rotation=i*21;s.items.push(q);keys(q,[[0,{opacity:0}],[at,{opacity:0}],[at+.18,{opacity:1}],[at+1.2,{x:q.x+300+(i*71)%380,y:q.y-200+(i*39)%480,rotation:i*63,opacity:.9}],[at+2,{x:q.x+500,y:910,rotation:i*71,opacity:0}]],'linear');}
 cue(s,'wind',at,Math.min(2.5,s.duration-at),.9);cue(s,'snap',at+.12,.3,.42);
}
function breath(s,w,at=.5){pose(w,'puff',at);keys(w,[[0,{}],[at,{}],[at+.7,{rotation:-3}],[at+1.25,{rotation:2}],[at+1.9,{}]]);}
function mark(s,text,at=0){s.director??={markers:[]};s.director.markers.push({id:uid('mark'),label:text,time:at});}
function splashAudio(){
 const rate=24000,length=1.8,pcm=Buffer.alloc(Math.ceil(rate*length)*2);let seed=7919,low=0;
 const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const drops=Array.from({length:26},()=>({at:.12+random()*1.05,f:260+random()*1150,a:.025+random()*.045}));
 for(let i=0;i<pcm.length/2;i++){const t=i/rate,n=random()*2-1;low=.72*low+.28*n;let v=.52*low*Math.exp(-t*3.8)*(1-Math.exp(-t*90))+.09*n*Math.exp(-t*7);for(const d of drops){const u=t-d.at;if(u>=0&&u<.16)v+=d.a*Math.sin(2*Math.PI*d.f*(u-u*u*1.9))*Math.exp(-u*32);}v*=Math.min(1,t/.008,(length-t)/.08);pcm.writeInt16LE(Math.round(Math.max(-.9,Math.min(.9,v))*32767),i*2);}
 const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(36+pcm.length,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(rate,24);header.writeUInt32LE(rate*2,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);return{name:'Cold-water splash · original Foley',duration:length,data:'data:audio/wav;base64,'+Buffer.concat([header,pcm]).toString('base64')};
}
function buildScene(b,index){
 const hold=['field-joke','flower-joke','brick-hold','house-joke','wolf-submerged','end'].includes(b.action)?1.3:.65;
 const duration=Math.ceil((b.duration+.35+hold)*30)/30;
 const s={id:'pigs-'+b.id,name:b.id+' · '+b.name,bg:-1,bgColor:'#a6bb83',caption:b.text,duration:Math.max(b.action==='splash'?2.4:2.6,duration),items:[],cues:[],notes:b.name+' · '+b.action,cinema:{shots:[]},phrase:{id:'pigs-'+b.id,section:b.name,direction:'Read aloud · advance when ready',holdAt:Math.max(2,duration-.05)}};
 const a=b.action,t=Math.max(.5,b.duration*.45),late=Math.max(.9,b.duration*.72);
 const indoors=['brick-rescue','flower-joke','three-refuse','house-joke','roof-sound','tub-idea','tub-plan','tub-push','splash','wolf-submerged','wolf-pop','wolf-out','door-cord','door-open','supper','rabbit-knock','spoons-stop','welcome-rabbit','warm-ending'].includes(a);
 indoors?interior(s):world(s);
 let pigs=[],w,p,hh,fl,props;
 const straw=['straw-build','straw-ready','straw-fall','pip-sleep','straw-knock','straw-demand','pip-peek','pip-refuse','straw-threat','straw-breath','straw-collapse'].includes(a);
 const sticks=['sticks-gather','sticks-build','sticks-admire','sticks-lean','sticks-rescue','field-joke','sticks-knock','sticks-demand','two-refuse','sticks-threat','sticks-breath','sticks-collapse'].includes(a);
 const brick=['bricks-build','bricks-rows','pip-visits','poppy-visits','brick-ready','bruno-rest','brick-arrive','brick-knock','brick-demand','brick-threat','brick-breath','brick-hold','wolf-retry','wolf-tired','chimney-idea','chimney-enter','chimney-fall'].includes(a);
 if(straw){hh=house(s,'straw');p=cast(s,'pip',825,810,245,'left');}
 if(sticks){hh=house(s,'stick');p=cast(s,'poppy',820,810,245,'left');fl=flower(s,940,590);}
 if(brick){hh=house(s,'brick');fl=flower(s,950,610);if(index<20)p=cast(s,'bruno',795,810,250);}
 if(/^(straw|sticks|brick)-(knock|demand|threat|breath|collapse|hold)$/.test(a)||['wolf-retry','wolf-tired','chimney-idea','brick-arrive'].includes(a))w=cast(s,'wolf',425,812,325);
 switch(a){
 case'journey':pigs=group(s,{x:350,spacing:250});pigs.forEach((q,i)=>walk(q,q.x+170,.3+i*.1,s.duration-.6));break;
 case'pip-intro':p=cast(s,'pip',800,805,360);walk(p,900,.3,Math.min(2.4,s.duration-.4));break;
 case'poppy-intro':p=cast(s,'poppy',760,805,355,'right','flower');if(!meta['poppy-flower'])flower(s,870,630);bob(p,.7);break;
 case'bruno-intro':p=cast(s,'bruno',800,805,355);bob(p,1,2);break;
 case'plots':pigs=group(s);[470,800,1130].forEach(x=>{const q=shape('A sunny building spot',x,820,240,30,'#e3c78c','Oval');q.opacity=.45;s.items.splice(1,0,q);});pigs.forEach((q,i)=>bob(q,.6+i*2,2));break;
 case'race':pigs=group(s);pigs.forEach((q,i)=>walk(q,q.x+(i===0?-550:300),t+i*.4,s.duration-.2,i===0));break;
 case'straw-build':props=stack(s,'straw',540,815,12);appear(hh,s.duration*.6,1.5);props.forEach((q,i)=>keys(q,[[0,{}],[.2+i*.3,{}],[.7+i*.3,{x:hh.x-80+(i%3)*50,y:hh.y+80-Math.floor(i/3)*35,opacity:0}]]));bob(p,t);break;
 case'straw-ready':bob(p,late);break;
 case'straw-fall':{const q=shape('Loose straw',980,300,72,8,'#e5be60');s.items.push(q);keys(q,[[0,{}],[1,{x:855,y:645,rotation:60}],[t,{x:855,y:645,rotation:60}],[t+.7,{x:620,y:550,rotation:180,opacity:0}]]);bob(p,t);break;}
 case'pip-sleep':pose(p,'sleep');p.x=930;p.y=716;p.w*=.85;p.h*=.85;disappear(p,s.duration-.8);break;
 case'sticks-gather':props=stack(s,'sticks',580,815,12);hh.opacity=0;fl.opacity=0;walk(p,600,.4,Math.min(3,s.duration-.5));break;
 case'sticks-build':props=stack(s,'sticks',580,815,9);appear(hh,1,2);appear(fl,late);props.forEach((q,i)=>disappear(q,.5+i*.28));break;
 case'sticks-admire':walk(p,720,.3,1.5);bob(p,late);break;
 case'sticks-lean':keys(hh,[[0,{}],[1.2,{rotation:-3}]]);keys(fl,[[0,{}],[1.2,{rotation:-12}],[late,{rotation:0}]]);break;
 case'bricks-build':case'bricks-rows':{hh.opacity=0;fl.opacity=0;pose(p,'build');props=stack(s,'bricks',1020,810,15);props.forEach((q,i)=>appear(q,.25+Math.floor(i/3)*s.duration/6,.1));cue(s,'soft-landing',.5,.45,.22);break;}
 case'pip-visits':hh.opacity=0;fl.opacity=0;stack(s,'bricks',1000,810,21);pose(p,'build');pigs=[cast(s,'pip',320),p];walk(pigs[0],620,.3,2.5);bob(p,t);break;
 case'poppy-visits':hh.opacity=0;fl.opacity=0;stack(s,'bricks',1000,810,21);pose(p,'build');pigs=[cast(s,'poppy',550,810,245,'right','flower'),p];bob(pigs[0],1);bob(p,t);break;
 case'brick-ready':appear(hh,.3,.7);bob(p,1);break;
 case'bruno-rest':bob(fl,.7);keys(p,[[0,{}],[late,{y:p.y+18,rotation:-2}]]);break;
 case'wolf-intro':w=cast(s,'wolf',1000,820,430,'left');keys(w,[[0,{}],[t,{rotation:-3}],[late,{}]]);break;
 case'wolf-sniff':w=cast(s,'wolf',400,820,350);walk(w,800,.4,t);bob(w,t+.2,3);break;
 case'straw-knock':case'sticks-knock':case'brick-knock':walk(w,620,.2,Math.min(2,t));cue(s,'knock',Math.min(s.duration-1.3,t),1.2,.6);bob(hh,t,.7);break;
 case'straw-demand':case'sticks-demand':case'brick-demand':bob(w,.5,2);break;
 case'pip-peek':keys(p,[[0,{}],[1,{x:p.x-45,rotation:-5}],[late,{}]]);w=cast(s,'wolf',430,815,325);break;
 case'pip-refuse':bob(p,.5,3);break;
 case'straw-threat':case'sticks-threat':case'brick-threat':breath(s,w,late);break;
 case'straw-breath':case'sticks-breath':case'brick-breath':breath(s,w,.4);cue(s,'wind',late,Math.min(1.5,s.duration-late),.65);break;
 case'straw-collapse':storm(s,hh,.25,'straw');walk(p,1500,.5,s.duration-.1,true);break;
 case'pip-run':p=cast(s,'pip',250);walk(p,1450,.2,s.duration-.2,true);cue(s,'steps',.2,Math.min(2,s.duration-.3),.3);break;
 case'sticks-rescue':pigs=[cast(s,'pip',500),p];walk(pigs[0],740,.3,2);bob(p,late);break;
 case'field-joke':pigs=[cast(s,'pip',600),p];bob(pigs[0],t,3);break;
 case'two-refuse':pigs=[cast(s,'pip',600),p];pigs.forEach((q,i)=>bob(q,.7+i*.18,3));break;
 case'sticks-collapse':pigs=[cast(s,'pip',650),p];storm(s,hh,late,'stick');pigs.forEach((q,i)=>walk(q,1560+i*160,Math.min(late+.1,s.duration-1),s.duration-.1,true));keys(fl,[[0,{}],[late,{}],[s.duration-.1,{x:1480,y:550,rotation:30}]]);break;
 case'two-run':pigs=[cast(s,'pip',300),cast(s,'poppy',60)];pigs.forEach((q,i)=>walk(q,1500-i*240,.2,s.duration-.2,true));cue(s,'steps',.2,Math.min(2,s.duration-.3),.3);break;
 case'brick-rescue':pigs=group(s,{x:420,spacing:215});walk(pigs[0],560,.1,1.8,true);walk(pigs[1],755,.2,2,true);bob(pigs[2],late);cue(s,'door',late,Math.min(1.4,s.duration-late),.3);break;
 case'flower-joke':pigs=group(s);pose(pigs[1],'flower');if(!meta['poppy-flower'])fl=flower(s,840,620);bob(pigs[1],late);break;
 case'brick-arrive':walk(w,560,.2,t);bob(w,late,3);break;
 case'three-refuse':pigs=group(s);pigs.forEach((q,i)=>bob(q,t+i*.12,2));break;
 case'brick-hold':pose(w,'puff');break;
 case'house-joke':pigs=group(s);bob(pigs[0],t);bob(pigs[2],late);break;
 case'wolf-retry':breath(s,w,.6);cue(s,'wind',t,Math.min(1.8,s.duration-t),.7);break;
 case'wolf-tired':pose(w,'sit',t);{const leaf=shape('One small leaf',w.x+15,300,36,19,'#b28b44','Oval');s.items.push(leaf);keys(leaf,[[0,{}],[t,{}],[late,{y:555,rotation:45}]]);}break;
 case'chimney-idea':bob(w,t,-3);break;
 case'roof-sound':pigs=group(s);pigs.forEach((q,i)=>bob(q,t+i*.15,-2));cue(s,'steps',.7,2,.3);break;
 case'tub-idea':case'tub-plan':pigs=group(s,{x:350,spacing:185});s.items.push(item('tub',1000,815,165,'Cold washing water'));pigs.forEach((q,i)=>bob(q,.6+i*.7,2));break;
 case'tub-push':{if(meta['pig-tub-push']){const q=item('pig-tub-push',850,820,340,'Three pigs push the tub together');s.items.push(q);keys(q,[[0,{}],[.3,{}],[s.duration-.5,{x:1240,y:620-q.h*.66/2,w:q.w*.66,h:q.h*.66}]],'linear');}else{pigs=group(s,{x:470,spacing:175,height:225});const tub=item('tub',1020,817,175,'Cold washing water');s.items.push(tub);keys(tub,[[0,{}],[.3,{}],[s.duration-.5,{x:1300,y:555,w:tub.w*.7,h:tub.h*.7}]],'linear');pigs.forEach(q=>walk(q,q.x+200,.3,s.duration-.5));}cue(s,'rope-creak',.5,1.2,.18);break;}
 case'chimney-enter':case'chimney-fall':{w=cast(s,'wolf',1225,390,260,'left');if(w._shadow)w._shadow.opacity=0;w.occlusion=[{pieceId:hh.id,rect:[0,0,1,1]}];if(a==='chimney-enter')keys(w,[[0,{}],[t,{y:w.y+120}]]);else keys(w,[[0,{y:w.y+100}],[.5,{y:w.y+100}],[late,{y:w.y+450,opacity:0}]],'linear');break;}
 case'splash':case'wolf-submerged':case'wolf-pop':case'wolf-out':{w=cast(s,'wolf',1300,620,260,'left',a==='wolf-pop'||a==='wolf-out'?'wet':'stand');w._shadow.opacity=0;const tub=item('tub',1300,620,155,'The cold-water splash');if(a!=='wolf-out')s.items.push(item('hearth-mask',1300,900,400,'Hearth foreground mask'));s.items.push(tub);if(a==='splash'){keys(w,[[0,{y:-120}],[.55,{y:565}],[1.1,{y:565}]],'linear');for(let i=0;i<16;i++){const q=shape('Felt water droplet',1300,500,10+(i%3)*4,16+(i%3)*3,'#97c9d0','Oval');q.opacity=0;s.items.push(q);keys(q,[[0,{opacity:0}],[.55,{opacity:0}],[.7,{opacity:.85}],[1.2,{x:1300+(i-7)*21,y:360+(i%4)*25}],[2,{x:1300+(i-7)*27,y:700,opacity:0}]],'linear');}cue(s,'rain',.55,1.5,.8);cue(s,'soft-landing',.55,.45,.5);}else if(a==='wolf-submerged')w.y=565;else if(a==='wolf-pop')keys(w,[[0,{y:565}],[.7,{y:450}]]);else{walk(w,920,.3,s.duration-.5);w.illustration.changes=[];const grow=1.15;keys(w,[[0,{}],[.3,{}],[s.duration-.5,{x:920,y:810-w.h*grow/2,w:w.w*grow,h:w.h*grow}]],'linear');for(let i=0;i<5;i++){const q=shape('Drip',1220-i*50,650+i*25,10,15,'#83b7c9','Oval');s.items.push(q);appear(q,.4+i*.3);}}break;}
 case'door-cord':case'door-open':{pigs=group(s,{x:500,spacing:175,height:300,bottom:795});const table=item('table',690,1010,360,'Kitchen table');s.items.push(table);w=cast(s,'wolf',1140,810,320,'left','wet');if(a==='door-cord'){const cord={id:uid('cord'),type:'pen',name:'Door latch cord',points:[[0,0],[1,1]],x:603,y:550,w:655,h:200,bw:655,bh:200,rotation:0,opacity:1,color:'#b9a078',penWidth:5,fiber:.4,stitch:false,rope:{from:{x:222,y:395},to:{pieceId:pigs[2].id,u:.7,v:.72},length:750,slack:22,tension:.7,loopRadius:0,endMode:'pinned',width:5,actions:[{id:uid('pull'),start:t,duration:.5,values:{tension:1,slack:0}}]}};s.items.push(cord);bob(pigs[2],t);}else{openDoor(s,.2);s.items.splice(s.items.indexOf(w),1);s.items.splice(3,0,w);w._shadow.opacity=0;cue(s,'door',.2,1.5,.3);walk(w,170,.8,s.duration-.3,true);const scale=.66;keys(w,[[0,{}],[.8,{}],[1.8,{x:1100,y:610-w.h*scale/2,w:w.w*scale,h:w.h*scale,opacity:1}],[s.duration-.55,{x:170,y:588-w.h*scale/2,w:w.w*scale,h:w.h*scale,opacity:1}],[s.duration-.15,{x:170,y:588-w.h*scale/2,w:w.w*scale,h:w.h*scale,opacity:0}]],'linear');w.illustration.changes=[];}break;}
 case'wolf-exit':w=cast(s,'wolf',1000,815,325,'left','wet');walk(w,-260,.2,s.duration-.2,true);w.illustration.changes=[];cue(s,'steps',.2,2,.32);break;
 case'rebuild':case'teamwork':case'three-houses':{[420,800,1180].forEach((x,i)=>{const houseObj=house(s,'brick',x,690,350);if(a==='rebuild')appear(houseObj,.3+i*1.4);if(a==='three-houses')flower(s,x-70,600,45);});pigs=group(s,{x:460,spacing:285,height:220});if(a==='teamwork'){props=stack(s,'bricks',380,815,6);walk(pigs[0],580,.4,t);pose(pigs[2],'build');bob(pigs[1],t);}else pigs.forEach((q,i)=>bob(q,.5+i*.7));break;}
 case'rabbit-reveal':case'rabbit-buns':house(s,'brick',1030,810,570);p=item('rabbit',740,815,330,'Rabbit brought buns');s.items.push(p);bob(p,t,2);break;
 case'supper':case'rabbit-knock':case'spoons-stop':case'welcome-rabbit':case'warm-ending':{pigs=group(s,{x:600,spacing:195,height:300,bottom:800});s.items.push(item('table',810,1030,380,'Supper table'));if(a==='rabbit-knock')cue(s,'knock',Math.min(1.4,s.duration-1.3),1.2,.55);if(['welcome-rabbit','warm-ending'].includes(a)){const r=item('rabbit',330,820,285,'Rabbit with warm buns');s.items.push(r);if(a==='rabbit-reveal')appear(r,t);else if(a==='welcome-rabbit'){openDoor(s,0.1);keys(r,[[0,{x:170,y:588-r.h*.66/2,w:r.w*.66,h:r.h*.66}],[t,{x:470}]]);}else bob(r,t,2);}if(meta.buns&&['warm-ending','welcome-rabbit'].includes(a))s.items.push(item('buns',830,650,75,'Warm buns'));if(a==='spoons-stop'){if(meta['pigs-spoons']){s.items=s.items.slice(0,1);const q=item('pigs-spoons',810,920,420,'Three spoons stop together');s.items.push(q);bob(q,.2,.4);}}else pigs.forEach((q,i)=>bob(q,.5+i*.4,1.5));break;}
 case'end':[420,800,1180].forEach(x=>{house(s,'brick',x,710,355);flower(s,x-70,620,42);});pigs=group(s,{x:550,spacing:250,height:230});pigs.forEach((q,i)=>bob(q,.6+i*.3));cue(s,'chime',s.duration-2.5,2.4,.2);break;
 default:throw Error('Unstaged beat: '+a);
 }
 for(const q of s.items){delete q._shadow;if(q.illustration)q.illustration.changes.sort((a,b)=>a.time-b.time);}
 if(b.file){const assetId='pigs-voice-'+b.id;s.cues.push(h.run('cinemaNewCue()'));Object.assign(s.cues.at(-1),{id:'voice-'+b.id,name:b.name+' · narration',assetId,start:.25,duration:b.duration,volume:1,fadeIn:.01,fadeOut:.03,generatedSpeech:true,duckMusic:true,crossScene:false,productionNarration:{text:b.text,spokenText:b.text,voice:{engine:'neural',speaker:'bm_fable',style:'storyteller',pitch:1,speed:.97,delivery:'normal'},slot:b.duration+.05}});}
 if(a.endsWith('intro'))pushCam(s,800,520,1.15,1.2);else if(['chimney-enter','chimney-fall'].includes(a))pushCam(s,1120,330,1.5,1.5);else if(['splash','wolf-submerged','wolf-pop'].includes(a))pushCam(s,1120,460,1.5,1.5);else if(['pip-peek','pip-refuse','straw-demand','sticks-demand','brick-demand','flower-joke','house-joke'].includes(a))pushCam(s,850,560,1.45,1.45);else if(['journey','plots','race','rebuild','three-houses','end'].includes(a))pushCam(s,800,450,1,1);else if(['door-cord','door-open','welcome-rabbit'].includes(a))pushCam(s,800,450,1,1);else if(indoors)pushCam(s,800,550,1.3,1.3);else pushCam(s,850,550,1.35,1.35);
 mark(s,b.name,.25);scenes.push(s);return s;
}
(async()=>{
 await h.ready;
 const manifest=JSON.parse(fs.readFileSync(art+'/manifest.json','utf8')).assets;
 for(const[key,v]of Object.entries(manifest))await register(key,path.join(art,typeof v==='string'?v:(v.file||v.filename)));
 await register('door-panel',art+'/door-panel.png');
 {const im=await image(art+'/interior.png'),stage=createCanvas(1600,900);stage.getContext('2d').drawImage(im,0,0,1600,900);const c=createCanvas(420,400);c.getContext('2d').drawImage(stage,-1090,-500);imports['import-pigs-hearth-mask']=c.toDataURL('image/webp',.95);meta['hearth-mask']=[420,400];}
 for(const kind of ['straw','stick']){const im=await image(path.join(art,typeof manifest[kind+'-house']==='string'?manifest[kind+'-house']:(manifest[kind+'-house'].file||manifest[kind+'-house'].filename)));for(let i=0;i<6;i++){const w=Math.ceil(im.width/3),hh=Math.ceil(im.height/2),c=createCanvas(w,hh);c.getContext('2d').drawImage(im,-(i%3)*im.width/3,-Math.floor(i/3)*im.height/2);const key=kind+'-panel-'+i;imports['import-pigs-'+key]=c.toDataURL('image/webp',.92);meta[key]=[w,hh];}}
 let beats=JSON.parse(fs.readFileSync(root+'/voiced-beats.json'));if(process.argv.includes('--draft')){const ready=beats;beats=JSON.parse(fs.readFileSync(root+'/beats.json')).map(([name,text,action],i)=>ready[i]||({id:String(i+1).padStart(2,'0'),name,text,action,file:null,duration:text.split(/\s+/).length/2.5+.7}));}else if(beats.length!==76)throw Error('All 76 narration beats must finish first.');
 beats.forEach(buildScene);
 const p={format:'felt-and-fable',version:1,title:'The Three Little Pigs',active:0,scenes,custom:[],imports,exportFps:30,exportCaptions:true,exportNormalizeAudio:true,audioAssets:{},phraseShow:{version:1,enabled:true,mode:'manual'},filmBrief:{logline:'Three neighbors build three very different homes, and discover what holds up when a boastful wolf comes calling.',notes:'76 editable visual beats. Usually one or two spoken sentences per beat. Whole-character three-quarter felt pose swaps; no face-only turns or stretched limbs. Camera holds let the repeated refrains and jokes land. Fable narration is saved in each scene. Present offers manual read-aloud pages; Play movie and MP4 use the full voiced timeline. Pigs stay safe; the wolf lands in cold water. Story and artwork created for Drew’s private Felt & Fable studio.'},production:{version:1,markers:[],bindings:[],narrator:{voice:{engine:'neural',speaker:'bm_fable',style:'storyteller',pitch:1,speed:.97,delivery:'normal'},pronunciations:[]}}};
 let time=0;for(const [i,b]of beats.entries()){p.production.markers.push({id:'beat-'+b.id,label:b.name,time});time+=scenes[i].duration;if(b.file)p.audioAssets['pigs-voice-'+b.id]={name:b.name+' · Fable',data:'data:audio/mpeg;base64,'+fs.readFileSync(root+'/'+b.file).toString('base64'),duration:b.duration};}
 p.audioAssets['pigs-water-splash']=splashAudio();const splash=scenes.find(s=>s.notes.endsWith(' · splash'));const water=splash.cues.find(c=>c.preset==='rain');water.assetId='pigs-water-splash';water.name='Cold-water splash';water.volume=1.1;
 h.context.pigs=p;h.run('audioDefaults(pigs);validateProject(pigs)');
 fs.writeFileSync('public/examples/three-little-pigs.felt.json',JSON.stringify(p));
 fs.writeFileSync(root+'/shot-list.json',JSON.stringify(beats.map((b,i)=>({beat:i+1,name:b.name,text:b.text,action:b.action,start:p.production.markers[i].time,duration:scenes[i].duration})),null,2));
 console.log(JSON.stringify({scenes:scenes.length,duration:time,minutes:time/60,images:Object.keys(imports).length,voices:Object.keys(p.audioAssets).length,bytes:fs.statSync('public/examples/three-little-pigs.felt.json').size}));
})().catch(e=>{console.error(e);process.exitCode=1});
