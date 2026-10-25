// Second staging edition: narration remains the master clock.
const fs=require('fs'),path=require('path'),{createCanvas,Image}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'../story-source/sleepy-hollow');
module.exports=async function revise(target){
 const p=JSON.parse(fs.readFileSync(target)),meta=JSON.parse(fs.readFileSync(root+'/asset-metadata.json'));let serial=0;
 const clone=x=>JSON.parse(JSON.stringify(x)),id=()=>`sleepy-revision-${++serial}`,aid=k=>'import-sleepy-'+k;
 const scene=c=>p.scenes.find(s=>s.id==='sleepy-'+c),duration=s=>{const i=p.scenes.indexOf(s),t=p.phraseShow.timing;return (t.starts[i+1]??t.end)-t.starts[i]};
 const originals=clone(p.scenes),template=who=>originals.flatMap(s=>s.items).find(o=>o.illustration?.poses[0].asset===aid(who+'-stand'));
 async function image(file){const a=new Image();a.src='data:image/'+(file.endsWith('.webp')?'webp':'png')+';base64,'+fs.readFileSync(file).toString('base64');await a.decode();return a;}
 function register(key,c){const b=c.toBuffer('image/webp',80);fs.writeFileSync(root+'/art/'+key+'.webp',b);p.imports[aid(key)]='data:image/webp;base64,'+b.toString('base64');meta[key]=[c.width,c.height];}
 for(const key of ['revision-hearth','revision-supper','revision-dance','revision-school','revision-orchard','revision-tree','revision-stream','revision-ridge','revision-farmhouse-night']){const a=await image(root+'/art-source/'+key+'.png'),c=createCanvas(1600,900);c.getContext('2d').drawImage(a,0,0,1600,900);register(key,c);}
 const base=(key,x,y,w,h,name)=>({id:id(),type:'asset',asset:aid(key),name:name||key,x,y,w,h,bw:meta[key][0],bh:meta[key][1],rotation:0,opacity:1,fiber:0,stitch:false,depth:'middle',depthContact:'ground'});
 const bg=key=>({...base(key,800,450,1600,900,'Set · '+key),locked:true});
 const keys=(o,rows)=>{const b=Object.fromEntries(['x','y','w','h','rotation','opacity'].map(k=>[k,o[k]]));o.keyframes=rows.map(([t,v])=>({t,ease:'linear',pose:{...b,...v}}));return o};
 const visible=(o,a,b=null)=>keys(o,[[0,{opacity:a>0?0:1}],...(a>0?[[a-.001,{opacity:0}],[a,{opacity:1}]]:[]),...(b===null?[]:[[b-.001,{opacity:1}],[b,{opacity:0}]])]);
 const cam=(x=800,y=450,zoom=1)=>({x,y,zoom});
 function cuts(s,rows){const d=duration(s);s.cinema.shots=rows.map(([at,view,name,to],i)=>({id:id(),name:name||'Story beat',duration:(rows[i+1]?.[0]??d)-at,from:view,to:to||view,move:!!to,easing:'cinematic',connection:'cut',path:{holdStart:.1,holdEnd:.2,bend:0}}));s.camera=rows[0][1];s.duration=Math.max(s.duration,d);s.phrase.holdAt=d;}
 function reset(s,key){s.items=[bg(key)];delete s.cinema.look;delete s.cinema.grade;delete s.cinema.transition;cuts(s,[[0,cam(),'Establish the space']]);}
 function actor(s,who,x,ground,h,pose='stand',facing='right'){
  const q=clone(template(who)),horse=['mounted','bareback','horseman'].includes(who);q.id=id();q.x=x;q.y=ground-h*(horse?570/600-.5:508/520-.5);q.h=h;q.w=h*q.bw/q.bh;q.asset=aid(who+'-'+pose);delete q.keyframes;q.illustration.defaultPose=pose;q.illustration.facing=facing;q.illustration.changes=[];s.items.push(q);return q;
 }
 const change=(q,time,poseId)=>q.illustration.changes.push({id:id(),time,poseId,facing:q.illustration.facing});
 function set(s,key){s.items[0]=bg(key)}
 // Reuse a strip of the painted tabletop as the foreground occluder. Plates and
 // food stay painted together in perspective, never separate floating shapes.
 const supper=await image(root+'/art/revision-supper.webp'),tableTop=540;
 const strip=createCanvas(1600,900-tableTop);strip.getContext('2d').drawImage(supper,0,tableTop,1600,900-tableTop,0,0,1600,900-tableTop);register('revision-supper-front',strip);
 function dining(s,who='ichabod'){reset(s,'revision-supper');const q=actor(s,who,800,1080,1000,'stand');s.items.push(base('revision-supper-front',800,(900+tableTop)/2,1600,900-tableTop,'Table and food · continuous foreground'));return q;}
 let s,q,r;
 s=scene('01B');reset(s,'revision-hearth');q=actor(s,'brom',830,805,425,'tell');change(q,4,'think');change(q,8,'tell');cuts(s,[[0,cam(),'Neighbors gather'],[5,cam(840,440,1.32),'The storyteller']]);
 s=scene('02A');reset(s,'revision-hearth');q=actor(s,'brom',870,805,445,'tell');r=actor(s,'katrina',650,820,390,'listen');change(q,6,'hand');change(r,9,'think');change(q,11,'tell');cuts(s,[[0,cam(),'The listeners'],[6,cam(900,410,1.5),'Brom describes the rider'],[11,cam(650,460,1.45),'A listener wonders']]);
 for(const c of ['03A','03B','08A'])set(scene(c),'revision-school');
 s=scene('03A');q=s.items.find(o=>o.illustration);change(q,8,'sing');cuts(s,[[0,cam(),'Teacher and pupils'],[5,cam(800,440,1.4),'Meet Ichabod'],[10,cam(),'Reading and writing']]);
 s=scene('03B');cuts(s,[[0,cam(790,400,1.45),'Proud of his voice'],[5,cam(),'The pupils hear every note']]);
 s=scene('04A');set(s,'revision-orchard');r=actor(s,'katrina',1120,785,400,'amused','left');change(r,7,'stand');cuts(s,[[0,cam(),'A welcome at the farm'],[7,cam(780,530,1.24),'Chores and appetite']]);
 s=scene('04B');q=dining(s);cuts(s,[[0,cam(),'Supper at a shared table'],[5.8,cam(1190,720,1.65),'The empty plate']]);
 s=scene('05A');reset(s,'revision-hearth');q=actor(s,'ichabod',800,860,500,'worry');r=actor(s,'brom',1060,810,410,'tell','left');change(q,5,'stand');change(q,8,'worry');cuts(s,[[0,cam(),'Safe among friends'],[5.8,cam(800,450,1.45),'Listening a little too closely']]);
 s=scene('05B');q=s.items.find(o=>o.illustration);change(q,4.3,'startled');change(q,8,'sing');cuts(s,[[0,cam(850,510,1.12),'Alone on the road'],[4.3,cam(975,700,1.8),'Only a frog'],[7.4,cam(740,450,1.5),'A frightened song']]);
 s=scene('06A');set(s,'revision-orchard');cuts(s,[[0,cam(810,500,1.05),'The singing lesson'],[6.5,cam(1020,430,1.6),'Katrina smiles'],[11,cam(),'The farm he admires']]);
 s=scene('06B');q=dining(s);r=actor(s,'katrina',1080,1080,900,'amused','left');s.items.push(s.items.splice(2,1)[0]);s.cinema.grade={preset:'dream',strength:.32};cuts(s,[[0,cam(),'His comfortable daydream'],[6,cam(880,650,1.3),'Always plenty of pie']]);
 s=scene('07A');set(s,'revision-orchard');r=actor(s,'katrina',1180,790,350,'amused','left');cuts(s,[[0,cam(),'A confident rival'],[8,cam(820,420,1.5),'Brom knows his own strength'],[16,cam(1090,460,1.3),'He loves an audience']]);
 s=scene('07B');set(s,'farmhouse');r=actor(s,'katrina',1110,775,350,'book','left');q=s.items.find(o=>o.illustration);change(q,4,'stand');cuts(s,[[0,cam(800,450,1.25),'Is Brom away?'],[4,cam(),'Another visit to Katrina']]);
 s=scene('09A');reset(s,'revision-farmhouse-night');const inside=3.236;visible(s.items[0],0,inside);const inner=bg('revision-supper');visible(inner,inside);s.items.push(inner);q=actor(s,'ichabod',800,1080,1000);visible(q,inside);r=base('revision-supper-front',800,(900+tableTop)/2,1600,900-tableTop,'Table and supper');visible(r,inside);s.items.push(r);cuts(s,[[0,cam(),'The welcoming windows'],[inside,cam(),'Inside: a table full of food']]);
 s=scene('09B');q=dining(s);cuts(s,[[0,cam(800,510,1.12),'A very happy guest'],[5,cam(930,690,1.5),'A little more supper'],[9,cam(800,460,1.4),'His dreams grow larger'],[13,cam(),'A cheerful shared meal']]);
 s=scene('10A');set(s,'revision-dance');q=s.items.find(o=>o.illustration?.poses[0].asset===aid('ichabod-stand'));r=s.items.find(o=>o.illustration?.poses[0].asset===aid('katrina-stand'));q.illustration.changes=[];r.illustration.changes=[];for(let i=0;i<12;i++){change(q,.5+i*.85,i%2?'stand':'dance');change(r,.7+i*.85,i%2?'amused':'dance');}cuts(s,[[0,cam(),'The fiddle and the dance'],[5.4,cam(670,460,1.35),'Every limb joins in'],[10.3,cam(1040,440,1.5),'Katrina smiles']]);
 s=scene('10B');reset(s,'revision-dance');q=actor(s,'brom',1090,840,510,'sit','left');actor(s,'ichabod',470,750,340,'dance');actor(s,'katrina',710,750,300,'dance','left');cuts(s,[[0,cam(1110,460,1.65),'Brom watches from his chair'],[6.7,cam(),'The dancers and their rival']]);
 s=scene('11A');reset(s,'revision-hearth');q=actor(s,'brom',900,810,460,'tell');r=actor(s,'ichabod',640,840,460,'worry');actor(s,'katrina',1110,815,385,'listen','left');change(q,5,'hand');change(q,9,'tell');change(r,13,'startled');cuts(s,[[0,cam(),'The guests settle down'],[5,cam(900,440,1.4),'Brom claims he raced the ghost'],[13,cam(640,450,1.6),'Ichabod believes every word'],[17,cam(),'The room listens']]);
 s=scene('11B');reset(s,'revision-hearth');q=actor(s,'ichabod',800,840,530,'worry');actor(s,'brom',1140,790,380,'tell','left');cuts(s,[[0,cam(800,420,1.65),'Remember the bridge'],[6.7,cam(),'Warm company, dark windows']]);
 s=scene('12A');reset(s,'farmhouse-interior');q=actor(s,'ichabod',740,810,490,'stand');r=actor(s,'katrina',1040,810,420,'think','left');change(q,4,'worry');cuts(s,[[0,cam(),'The guests have gone'],[2.2,cam(890,460,1.35),'A private conversation']]);
 s=scene('12B');reset(s,'farmhouse-interior');q=actor(s,'ichabod',740,810,490,'sad');r=actor(s,'katrina',1040,810,420,'think','left');const out=4.15;for(const o of s.items)visible(o,0,out);r=bg('revision-farmhouse-night');visible(r,out);s.items.push(r);q=actor(s,'ichabod',820,800,440,'sad');visible(q,out,8.1);r=actor(s,'mounted',800,800,530);visible(r,8.1);cuts(s,[[0,cam(890,460,1.35),'Their words remain private'],[out,cam(820,460,1.5),'His hopes have disappeared'],[8.1,cam(),'Back on Gunpowder'],[16,cam(1100,440,1.12),'The road ahead']]);
 for(const c of ['14A','14B'])set(scene(c),'revision-tree');
 s=scene('14A');actor(s,'mounted',1160,775,340);cuts(s,[[0,cam(),'The enormous tree'],[3.1,cam(490,280,1.7),'Something white'],[6.4,cam(1140,570,1.7),'Ichabod holds his breath'],[10.5,cam(490,280,1.9),'Only lightning-stripped wood']]);
 s=scene('14B');cuts(s,[[0,cam(480,280,1.7),'Branches overhead'],[2.6,cam(1000,510,1.5),'A nervous rider'],[5.6,cam(480,300,1.6),'The harmless source'],[9.5,cam(),'A breath of relief']]);
 for(const c of ['15A','15B','16A'])set(scene(c),'revision-stream');
 s=scene('15A');cuts(s,[[0,cam(),'The stream crossing'],[5,cam(1060,480,1.55),'Gunpowder refuses'],[11,cam(420,440,1.4),'Something in the trees'],[17,cam(1050,460,1.6),'Who is there?'],[21,cam(),'No answer']]);
 s=scene('15B');cuts(s,[[0,cam(820,630,1.4),'The stranger emerges'],[5,cam(820,610,1.6),'No reply']]);
 s=scene('16A');cuts(s,[[0,cam(800,600,1.2),'Side by side'],[6.3,cam(1140,600,1.6),'Ichabod slows'],[11,cam(430,600,1.6),'The stranger matches him'],[15,cam(800,600,1.2),'Only hooves between them']]);
 for(const c of ['16B','17P','17A','17B'])set(scene(c),'revision-ridge');
 s=scene('17B');cuts(s,[[0,cam(580,630,1.5),'The shape at the saddle'],[7.8,cam(1250,530,1.8),'Horror dawns'],[13.5,cam(870,530,1.25),'Go, Gunpowder!']]);
 // Chase movement starts with the spoken action; end on an intentional road hold.
 s=scene('18A');for(const o of s.items){if(o.keyframes)for(const k of o.keyframes)k.t=k.t*2.1+1;if(o.illustration)for(const c of o.illustration.changes)c.time=c.time*2.1+1;}cuts(s,[[0,cam(),'The riders race past']]);
 set(scene('18B'),'revision-stream');set(scene('19A'),'revision-tree');
 s=scene('19B');cuts(s,[[0,cam(),'A glimpse of safety'],[3.3,cam(1220,340,1.55),'The church'],[6.5,cam(800,650,1.5),'And the bridge']]);
 s=scene('20A');for(const o of s.items){if(o.keyframes)for(const k of o.keyframes)k.t+=9;if(o.illustration)for(const c of o.illustration.changes)c.time+=9;}cuts(s,[[0,cam(),'The bridge could save him'],[9,cam(),'Hooves strike the planks'],[14,cam(1250,620,1.3),'The road beyond']]);
 s=scene('22B');cuts(s,[[0,cam(430,680,1.6),'The abandoned saddle'],[9.2,cam(770,700,1.7),'Beyond the bridge: a hat'],[13,cam(1140,700,1.65),'Broken pumpkin'],[18,cam(),'No sign of Ichabod']]);
 s=scene('23A');set(s,'revision-orchard');
 s=scene('23B');set(s,'revision-hearth');cuts(s,[[0,cam(),'Neighbors hear the news'],[8,cam(650,450,1.45),'A new life elsewhere'],[15,cam(1000,450,1.45),'Still unsure what to believe']]);
 s=scene('24A');set(s,'revision-hearth');q=s.items.find(o=>o.illustration?.poses[0].asset===aid('katrina-stand'));change(q,6,'think');change(q,12.5,'amused');cuts(s,[[0,cam(),'Brom and Katrina'],[5,cam(680,450,1.55),'A knowing look'],[11.9,cam(680,440,1.65),'The laugh at the pumpkin']]);
 for(const s of p.scenes){
  const setKey=s.items[0].asset;
  if(['revision-hearth','revision-school','revision-dance'].some(k=>setKey===aid(k))){
   const factor=setKey===aid('revision-hearth')?1.45:setKey===aid('revision-school')?1.3:1.25;
   for(const o of s.items.filter(o=>o.illustration)){
    const ground=o.y+o.h*(508/520-.5),oldH=o.h;o.h*=factor;o.w*=factor;o.y=ground-o.h*(508/520-.5);
    for(const k of o.keyframes||[]){k.pose.h*=factor;k.pose.w*=factor;k.pose.y-=(o.h-oldH)*(508/520-.5);}
   }
  }
  for(const o of s.items){if(o.illustration)o.illustration.changes.sort((a,b)=>a.time-b.time);}s.director.notes+='\n\nSTAGING EDITION 2: distinct inhabited spaces, narration-led cuts, grounded props and character reactions.';}
 const used=new Set(p.scenes.flatMap(s=>s.items.flatMap(o=>[o.asset,...(o.illustration?.poses||[]).map(q=>q.asset)])));for(const k of Object.keys(p.imports))if(!used.has(k))delete p.imports[k];
 p.sleepyStagingEdition=2;p.filmBrief.notes+=' Staging edition 2: nine new sets, populated gatherings, corrected indoor/outdoor continuity, integrated tabletop food, reaction coverage and word-timed cuts.';
 fs.writeFileSync(root+'/asset-metadata.json',JSON.stringify(meta,null,2));fs.writeFileSync(target,JSON.stringify(p));console.log('Revised staging: '+p.scenes.reduce((n,s)=>n+s.cinema.shots.length,0)+' camera shots, same 49 narration cues.');
};
if(require.main===module)module.exports(process.argv[2]||'public/examples/sleepy-hollow.felt.json').catch(e=>{console.error(e);process.exitCode=1});
