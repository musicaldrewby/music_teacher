// Fourth staging edition: literal acting, spatial continuity, and distinct journey locations.
const fs=require('fs'),path=require('path');
module.exports=async function revise(target){
 const p=JSON.parse(fs.readFileSync(target));const meta=await require('./prepare-sleepy-acting.cjs')(p);let serial=0;
 const clone=x=>JSON.parse(JSON.stringify(x)),id=()=>`sleepy-acting-${++serial}`,aid=k=>'import-sleepy-'+k;
 const scene=c=>p.scenes.find(s=>s.id==='sleepy-'+c),duration=s=>{const i=p.scenes.indexOf(s),t=p.phraseShow.timing;return(t.starts[i+1]??t.end)-t.starts[i];};
 const names={ichabod:'Ichabod Crane',brom:'Brom Bones',katrina:'Katrina Van Tassel',mounted:'Ichabod on Gunpowder'};
 const originals=clone(p.scenes),template=who=>originals.flatMap(s=>s.items).find(o=>o.name===names[who]&&o.illustration),baseHeight={ichabod:640,brom:704,katrina:576};
 const newPoses={ichabod:['attentive','teach','invitation','greet','seated-listen','seated-uneasy','chores','disappointed'],brom:['watch','seated-listen','converse','knowing'],katrina:['seated-listen','welcome','skeptical','reply'],mounted:['sad','uneasy']};
 function expand(o,who){for(const pose of newPoses[who]||[])if(!o.illustration.poses.some(x=>x.id===pose))o.illustration.poses.push({id:pose,name:pose.replaceAll('-',' '),asset:aid(who+'-'+pose),facing:'right'});return o;}
 function ground(o,who,x,floor=815,scale=1){o.x=x;o.h=baseHeight[who]*scale;o.w=o.h*512/520;o.y=floor-o.h*(508/520-.5);delete o.keyframes;o.characterScale={character:who,standingHeight:baseHeight[who],perspectiveScale:scale,groundPlane:floor,posture:/seated|watch/.test(o.illustration.defaultPose)?'seated':'standing'};return o;}
 function actor(s,who,x,floor,scale,pose,facing='right'){const o=expand(clone(template(who)),who);o.id=id();o.asset=aid(who+'-'+pose);o.illustration.defaultPose=pose;o.illustration.facing=facing;o.illustration.changes=[];ground(o,who,x,floor,scale);s.items.push(o);return o;}
 function horse(s,x,floor,h,pose='stand'){const o=expand(clone(template('mounted')),'mounted');o.id=id();o.x=x;o.h=h;o.w=h*1.5;o.y=floor-h*.45;delete o.keyframes;o.illustration.defaultPose=pose;o.illustration.changes=[];o.asset=aid('mounted-'+pose);s.items.push(o);return o;}
 const base=(key,x,y,w,h)=>({id:id(),type:'asset',asset:aid(key),name:key,x,y,w,h,bw:meta[key][0],bh:meta[key][1],rotation:0,opacity:1,fiber:0,stitch:false,depth:'middle',depthContact:'ground'});
 const bg=key=>({...base(key,800,450,1600,900),locked:true});
 const cam=(x=800,y=450,zoom=1)=>({x,y,zoom});
 function cuts(s,rows){rows=rows.filter(r=>r[0]<duration(s));s.cinema.shots=rows.map(([at,view,name,to],i)=>({id:id(),name,duration:(rows[i+1]?.[0]??duration(s))-at,from:view,to:to||view,move:!!to,easing:'cinematic',connection:'cut',path:{holdStart:.1,holdEnd:.1,bend:0}}));s.camera=rows[0][1];s.phrase.holdAt=duration(s);s.duration=Math.max(s.duration,duration(s));}
 function reset(s,key){s.items=[bg(key)];delete s.cinema.look;delete s.cinema.grade;delete s.cinema.transition;cuts(s,[[0,cam(),'Establish the place']]);}
 function visible(o,a,b=null){const pose=Object.fromEntries(['x','y','w','h','rotation','opacity'].map(k=>[k,o[k]]));o.keyframes=[{t:0,ease:'linear',pose:{...pose,opacity:a>0?0:1}},...(a>0?[{t:a-.001,ease:'linear',pose:{...pose,opacity:0}},{t:a,ease:'linear',pose:{...pose,opacity:1}}]:[]),...(b!==null?[{t:b-.001,ease:'linear',pose:{...pose,opacity:1}},{t:b,ease:'linear',pose:{...pose,opacity:0}}]:[])];return o;}
 function change(o,time,poseId){o.illustration.changes.push({id:id(),time,poseId,facing:o.illustration.facing});}
 function pose(o,poseId){o.illustration.defaultPose=poseId;o.asset=aid(o.characterScale.character+'-'+poseId);o.illustration.changes=[];}
 // Every actor has the new quiet poses available, with consistent standing height.
 for(const s of p.scenes)for(const o of s.items){const who=Object.keys(baseHeight).find(w=>names[w]===o.name&&o.illustration);if(who){expand(o,who);const floor=o.y+o.h*(508/520-.5);o.characterScale={character:who,standingHeight:baseHeight[who],perspectiveScale:o.h/baseHeight[who],groundPlane:floor,posture:'standing'};}}
 let s,q,r;
 for(const code of ['01B','02A','07A','23A','23B','24A']){s=scene(code);for(const o of s.items.filter(o=>o.characterScale)){const w=o.characterScale.character;ground(o,w,o.x,815,1);}q=s.items.find(o=>o.name===names.brom);pose(q,['01B','02A','23B'].includes(code)?'converse':'knowing');if(code==='01B')change(q,8,'tell');if(code==='02A'){change(q,6,'hand');change(q,11,'converse');}if(code==='24A')change(q,12.5,'laugh');}
 // Teaching is not singing; an attentive teacher and a chalk slate carry the meaning.
 s=scene('03A');q=s.items.find(o=>o.name===names.ichabod);ground(q,'ichabod',810,745,1.1);pose(q,'attentive');change(q,9.4,'teach');cuts(s,[[0,cam(),'Teacher and pupils'],[5,cam(810,390,1.3),'Meet Ichabod'],[9.4,cam(),'Reading and writing']]);
 s=scene('03B');q=s.items.find(o=>o.name===names.ichabod);ground(q,'ichabod',810,745,1.1);pose(q,'attentive');change(q,.45,'sing');
 s=scene('04A');reset(s,'lodging-stable-morning');q=actor(s,'ichabod',1040,805,1,'chores');cuts(s,[[0,cam(),'Helping at a village host’s farm'],[7,cam(1040,460,1.25),'Chores make an appetite']]);
 s=scene('05A');reset(s,'revision-hearth');q=actor(s,'ichabod',590,785,1,'seated-listen');r=actor(s,'brom',1030,765,.92,'converse','left');change(q,6,'seated-uneasy');change(r,7.8,'tell');cuts(s,[[0,cam(),'Seated by the fire among friends'],[5.8,cam(480,455,2),'A seated listener']]);
 s=scene('05B');q=s.items.find(o=>o.name===names.ichabod);ground(q,'ichabod',730,815,1);pose(q,'attentive');change(q,.8,'startled');change(q,8,'sing');cuts(s,[[0,cam(),'Alone after supper'],[4.3,cam(975,700,1.8),'Only a frog'],[7.4,cam(730,390,1.45),'Singing for courage']]);
 s=scene('06A');reset(s,'revision-orchard');q=actor(s,'ichabod',610,815,1,'attentive');r=actor(s,'katrina',1030,815,1,'welcome','left');change(q,5,'greet');change(r,8,'skeptical');cuts(s,[[0,cam(),'Katrina at the Van Tassel orchard'],[6.5,cam(1030,370,1.45),'Katrina’s smile'],[11,cam(),'The prosperous farm']]);
 s=scene('07B');reset(s,'farmhouse');q=actor(s,'ichabod',660,815,1,'greet');r=actor(s,'katrina',1090,815,1,'welcome','left');change(q,4,'attentive');cuts(s,[[0,cam(),'A daytime visit to the Van Tassels'],[4,cam(870,430,1.2),'A quiet greeting']]);
 s=scene('08A');reset(s,'revision-school');q=actor(s,'ichabod',800,745,1.1,'invitation');cuts(s,[[0,cam(),'The invitation at school'],[3.1,cam(800,410,1.3),'Reading the invitation']]);
 s=scene('08B');reset(s,'lodging-stable-dusk');const mountAt=10.4,laneAt=14.3;visible(s.items[0],0,laneAt);q=base('ichabod-ready-gunpowder',1040,780-590*.45,885,590);s.items.push(visible(q,0,mountAt));r=horse(s,1040,780,760);visible(r,mountAt,laneAt);q=bg('orchard-lane-dusk');s.items.push(visible(q,laneAt));r=horse(s,680,780,650);visible(r,laneAt);cuts(s,[[0,cam(),'Borrowing Gunpowder at the timber stable'],[7,cam(1040,420,1.25),'Coat brushed, ready to mount'],[mountAt,cam(),'Up into the saddle'],[laneAt,cam(),'A short dusk ride toward the white Van Tassel house',cam(870,450,1.04)]]);
 // Keep the dancers in the foreground and Brom against the far wall.
 s=scene('10A');for(const o of s.items.filter(o=>o.characterScale)){const w=o.characterScale.character;ground(o,w,w==='ichabod'?520:870,825,1);}cuts(s,[[0,cam(),'The fiddle and the dance'],[5.4,cam(540,450,1.25),'Every limb joins in'],[10.3,cam(870,390,1.35),'Katrina smiles']]);
 s=scene('10B');reset(s,'revision-dance');q=actor(s,'brom',1220,640,.8,'watch','left');actor(s,'ichabod',490,825,1,'dance');actor(s,'katrina',810,825,1,'dance','left');cuts(s,[[0,cam(),'The width of the room separates them'],[3,cam(1250,330,2.6),'Brom watches from the far wall'],[6.7,cam(620,460,1.18),'The dancers forget their distant rival']]);
 function gathering(s){reset(s,'revision-hearth');actor(s,'ichabod',530,765,1,'seated-listen');actor(s,'katrina',1320,765,1,'seated-listen','left');return actor(s,'brom',1030,795,1,'converse');}
 s=scene('11A');q=gathering(s);r=s.items.find(o=>o.name===names.ichabod);change(q,5,'tell');change(q,9,'hand');change(r,13,'seated-uneasy');cuts(s,[[0,cam(),'Guests settle into chairs'],[5,cam(1030,350,1.4),'Brom claims he raced the ghost'],[13,cam(480,430,2.1),'Ichabod listens from his chair'],[17,cam(),'The seated company listens']]);
 s=scene('11B');q=gathering(s);pose(s.items.find(o=>o.name===names.ichabod),'seated-uneasy');cuts(s,[[0,cam(480,430,2.1),'Remember the bridge'],[6.7,cam(),'The same room, deepening darkness']]);
 s=scene('12A');reset(s,'farmhouse-interior');q=actor(s,'ichabod',650,815,1,'greet');r=actor(s,'katrina',1050,815,1,'reply','left');change(q,4,'attentive');cuts(s,[[0,cam(),'The guests have gone'],[2.2,cam(850,430,1.2),'A private conversation']]);
 s=scene('12B');reset(s,'farmhouse-interior');q=actor(s,'ichabod',650,815,1,'disappointed');r=actor(s,'katrina',1050,815,1,'skeptical','left');const outside=4.15,onHorse=8.1;for(const o of s.items)visible(o,0,outside);q=bg('revision-farmhouse-night');s.items.push(visible(q,outside));q=actor(s,'ichabod',840,815,1,'disappointed');visible(q,outside,onHorse);r=horse(s,840,815,760,'sad');visible(r,onHorse);cuts(s,[[0,cam(850,430,1.2),'The answer is private'],[outside,cam(),'Leaving the white Van Tassel house at night'],[onHorse,cam(),'Back on Gunpowder'],[16,cam(1050,430,1.12),'Only now: the lonely night road']]);
 s=scene('22A');s.items=[bg('lodging-stable-morning'),base('grazing',1000,780-460*.5,460*meta.grazing[0]/meta.grazing[1],460)];cuts(s,[[0,cam(),'Gunpowder returns to the same timber stable'],[6,cam(1050,550,1.14),'His owner’s gate, the following morning']]);
 // Foreground road detail requires a full-size horse; distant bridge views retain their established scale.
 s=scene('13A');reset(s,'woods-night');q=horse(s,800,780,650,'uneasy');cuts(s,[[0,cam(),'The lonely night road'],[8,cam(800,370,1.4),'Remembering the stories']]);
 for(const code of ['14A','15A']){s=scene(code);q=s.items.find(o=>o.name===names.mounted);q.h=650;q.w=975;q.y=780-650*.45;delete q.keyframes;}
 s=scene('18A');for(const o of s.items.filter(o=>o.illustration)){o.y-=o.h*.45*.25;o.h*=1.25;o.w*=1.25;for(const k of o.keyframes||[]){k.pose.y-=k.pose.h*.45*.25;k.pose.h*=1.25;k.pose.w*=1.25;}}
 s=scene('21A');q=s.items.find(o=>o.illustration);q.h=390;q.w=585;q.y=706-390*.45;delete q.keyframes;cuts(s,[[0,cam(840,460,1.75),'The rider beyond the bridge'],[2.7,cam(840,420,1.9),'The raised shape']]);
 for(const code of ['13B','14A','14B','15A','16B','17P']){for(const o of scene(code).items.filter(o=>o.name===names.mounted)){expand(o,'mounted');if(['stand','step'].includes(o.illustration.defaultPose)){o.illustration.defaultPose='uneasy';o.asset=aid('mounted-uneasy');}for(const c of o.illustration.changes)if(['stand','step'].includes(c.poseId))c.poseId='uneasy';}}

 // Keep the enlarged rider's head in frame and leave tree inserts unobstructed.
 for(const code of ['14A','14B']){s=scene(code);q=s.items.find(o=>o.name===names.mounted);s.items=s.items.filter(o=>o.name!=='Contact shadow');q.x=1160;q.h=650;q.w=975;q.y=780-650*.45;delete q.keyframes;
  const reaction=s.cinema.shots[code==='14A'?2:1];reaction.from=cam(1160,350,1.7);reaction.to=cam(1160,350,1.7);
  const periods=code==='14A'?[[0,3.1],[6.4,10.5]]:[[2.6,5.6],[9.5,duration(s)+1]];
  const op={x:q.x,y:q.y,w:q.w,h:q.h,rotation:q.rotation,opacity:0};q.keyframes=[{t:0,ease:'linear',pose:{...op,opacity:periods[0][0]===0?1:0}}];
  for(const [a,b]of periods){if(a>0)q.keyframes.push({t:a-.001,ease:'linear',pose:{...op,opacity:0}},{t:a,ease:'linear',pose:{...op,opacity:1}});if(b<duration(s))q.keyframes.push({t:b-.001,ease:'linear',pose:{...op,opacity:1}},{t:b,ease:'linear',pose:{...op,opacity:0}});}
 }
 // Singing is only an acted verb, not a generic conversational gesture.
 const singing=new Set(['sleepy-03B','sleepy-05B']);
 for(const s of p.scenes){for(const o of s.items){if(o.name===names.ichabod&&o.illustration&&!singing.has(s.id)){if(o.illustration.defaultPose==='sing')o.illustration.defaultPose='attentive';o.illustration.changes=o.illustration.changes.filter(c=>c.poseId!=='sing');}if(o.illustration)o.illustration.changes.sort((a,b)=>a.time-b.time);}
  s.director.notes=s.director.notes.replace(/\nACTING EDITION 4:[^\n]*/g,'');
 }
 for(const code of ['03A','03B','04A','05A','05B','06A','07B','08A','08B','10A','10B','11A','11B','12A','12B','22A'])scene(code).director.notes+='\nACTING EDITION 4: narration-specific poses; seated listeners with chair-supported anatomy; physical proportions adjusted only for scene depth; separate host’s timber stable and white Van Tassel destination; dusk outward trip, night departure, morning return.';
 const used=new Set(p.scenes.flatMap(s=>s.items.flatMap(o=>[o.asset,...(o.illustration?.poses||[]).map(q=>q.asset)])));for(const k of Object.keys(p.imports))if(!used.has(k))delete p.imports[k];
 p.sleepyStagingEdition=4;p.filmBrief.notes+=' Acting edition 4: 16 quiet human poses, two mounted expressions, preparation beside Gunpowder, seated fireside listeners, visible room depth and distinct dusk/morning horse-owner stable.';
 fs.writeFileSync(target,JSON.stringify(p));console.log('Acting edition 4: '+fs.statSync(target).size+' bytes; same '+p.scenes.length+' narration cues.');
};
if(require.main===module)module.exports(process.argv[2]||'public/examples/sleepy-hollow.felt.json').catch(e=>{console.error(e);process.exitCode=1});
