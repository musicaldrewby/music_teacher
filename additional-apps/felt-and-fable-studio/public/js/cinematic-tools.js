'use strict';
// Cinematography is evaluated from the film clock, including held song scenes.
// All fields are optional so existing projects keep their original picture.
let cineClock=null,cineFinishCanvas=null,cineGlowCanvas=null,cineGrainCanvas=null,cineRevealCanvas=null;
const CINE_COMPOSITIONS=[['wide','Establishing','Let the setting tell the story.'],['two','Two-shot','Keep two characters in the conversation.'],['close','Close-up','Bring the audience to the expression.'],['extreme','Extreme close-up','Give a small reaction a big moment.'],['shoulder','Over-the-shoulder layout','Frame one subject past another silhouette.'],['insert','Detail / insert','Show the letter, fish, key, or other clue.']];
const CINE_FOREGROUNDS={branches:'cinema-foreground-leafy-branches',curtains:'cinema-foreground-theater-curtains',doorway:'cinema-foreground-stone-arch',railing:'cinema-foreground-harbor-railing'};
const CINE_FINISH_DEFAULT={look:'none',strength:.5,glow:0,grain:0,vignette:0,aspect:'native'};
const CINE_FINISH_PRESETS={clean:{...CINE_FINISH_DEFAULT},storybook:{look:'warm',strength:.45,glow:.12,grain:.12,vignette:.18,aspect:'native'},moonlight:{look:'moon',strength:.45,glow:.14,grain:.1,vignette:.28,aspect:'2.39'},classic:{look:'noir',strength:.75,glow:.06,grain:.3,vignette:.32,aspect:'2'},dream:{look:'dream',strength:.4,glow:.3,grain:.08,vignette:.12,aspect:'native'}};
function cineCameraTime(s,t){return s.cinema?.liveCamera&&cineClock?.sceneId===s.id?cineClock.time:t;}
function cinePathSample(shot,a,b,fraction){
 const segment=shot.cameraSegment;
 if(segment){fraction=segment.start+(segment.end-segment.start)*fraction;shot=segment.motion;a=shot.from;b=shot.to;}
 if(!shot.move)return cameraClamp(a);
 const path=shot.path||{},start=path.holdStart||0,end=path.holdEnd||0;
 const u=directorEase(cinemaClamp((fraction-start)/Math.max(.001,1-start-end),0,1),shot.easing||'smooth');
 const bend=path.bend||0,dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy)||1;
 // Quadratic Bezier: bend is the midpoint's perpendicular displacement in board pixels.
 const cx=(a.x+b.x)/2-dy/length*bend*2,cy=(a.y+b.y)/2+dx/length*bend*2;
 const pose={x:(1-u)**2*a.x+2*(1-u)*u*cx+u*u*b.x,y:(1-u)**2*a.y+2*(1-u)*u*cy+u*u*b.y,zoom:a.zoom+(b.zoom-a.zoom)*u};
 if(a.roll!==undefined||b.roll!==undefined)pose.roll=(a.roll||0)+((b.roll||0)-(a.roll||0))*u;
 return cameraClamp(pose);
}
function cineSliceMotion(shot,lo,hi){
 const source=shot.cameraSegment;
 const motion=source?copy(source.motion):{from:copy(shot.from),to:copy(shot.to),move:shot.move,easing:shot.easing||'smooth',path:copy(shot.path||{})};
 const start=source?source.start+(source.end-source.start)*lo:lo,end=source?source.start+(source.end-source.start)*hi:hi;
 return{motion,start,end};
}
function cineDepthMode(s){return s.cinema?.depthMode||'grounded';}
function cineGroundContact(o,s){
 if(cineDepthMode(s)!=='grounded')return false;
 return o.depthContact==='ground'||o.depthContact!=='free'&&(o.type==='puppet'||(o.depth||'middle')==='middle');
}
function cineDepthValue(o,s){return cineGroundContact(o,s)?1:o.depthFactor??s.cinema?.depthLayers?.[o.depth||'middle'];}
function cineDepthPose(o,s,t,p){
 const explicit=cineDepthValue(o,s),factor=explicit??(CINEMA_DEPTH[o.depth]??1);if(factor===1)return p;const c=cameraAt(s,t);
 if(explicit===undefined)return{...p,x:p.x+(1-factor)*(c.x-W/2),y:p.y+(1-factor)*(c.y-H/2)};
 const scale=explicit===undefined?1:(1+(c.zoom-1)*factor)/c.zoom;
 return{...p,x:W/2+(p.x-W/2)*scale+(1-factor)*(c.x-W/2),y:H/2+(p.y-H/2)*scale+(1-factor)*(c.y-H/2),w:p.w*scale,h:p.h*scale};
}
function cineBackgroundTransform(g,s,t){
 // A painted floor and its standing cast must share the camera transform.
 // Keep the saved floating settings so switching modes is reversible.
 if(cineDepthMode(s)==='grounded')return;
 const factor=s.cinema?.backgroundDepth;if(factor===undefined)return;
 const c=cameraAt(s,t),r=Math.abs((c.roll||0)*Math.PI/180),coverX=Math.cos(r)+H/W*Math.sin(r),coverY=Math.cos(r)+W/H*Math.sin(r);
 const scale=Math.max(coverX,coverY,factor*c.zoom+(1-factor)*coverX,factor*c.zoom+(1-factor)*coverY)/c.zoom;
 g.translate(W/2+(1-factor)*(c.x-W/2),H/2+(1-factor)*(c.y-H/2));g.scale(scale,scale);g.translate(-W/2,-H/2);
}
function cineComposition(s,kind,subjectId,partnerId,t=0,project=state){
 if(phrasePlaybackTiming(project))t=Math.min(t,phraseHold(s,project));
 if(!CINE_COMPOSITIONS.some(c=>c[0]===kind))throw Error('Choose a composition.');
 if(kind==='wide')return cameraClamp();
 const subject=s.items.find(o=>o.id===subjectId&&!o.hidden),partner=s.items.find(o=>o.id===partnerId&&!o.hidden&&o!==subject);
 if(!subject)throw Error('Choose a visible subject.');
 if(['two','shoulder'].includes(kind)&&!partner)throw Error('Choose two different visible pieces.');
 if(kind==='two')return studioFrame(s,[subject.id,partner.id],'full',t,t,false);
 const p=studioFrame(s,[subject.id],kind==='insert'?'full':'close',t,t,false);
 if(kind==='extreme')return cameraClamp({...p,zoom:Math.min(4,p.zoom*1.45)});
 if(kind==='shoulder'){
  const a=studioPoseAt(subject,t,sceneSeconds(s),s),b=studioPoseAt(partner,t,sceneSeconds(s),s),side=b.x<a.x?-1:1;
  const zoom=Math.max(1,Math.min(p.zoom,W*.72/Math.max(1,Math.abs(b.x-a.x)+b.w*.2)));
  return cameraClamp({...p,x:p.x+side*W/zoom*.24,zoom});
 }
 return p;
}
function cineEnsureShots(s,p){
 const duration=sceneSeconds(s,p),hold=phraseHold(s,p);s.cinema??={};
 if(duration<.2)throw Error('A camera shot needs at least 0.2 seconds in this scene.');
 if(phrasePlaybackTiming(p)){s.phrase??={};s.phrase.holdAt??=hold;}
 if(!s.cinema.shots?.length){const from=cameraBaseAt(s,0);s.cinema.shots=[{...deskNewShot(s,p),from,to:cameraBaseAt(s,Math.max(0,duration-1/60)),move:!!s.camera?.keys?.length}];}
 const shots=s.cinema.shots,total=shots.reduce((n,q)=>n+q.duration,0);
 if(Math.abs(total-duration)>.00001){
  // Match the already recorded interval, never rewrite the song's scene boundaries.
  if(duration<shots.length*.2)throw Error('This recorded scene is too short for its existing shots. Remove a shot before editing the camera.');
  const extra=duration-shots.length*.2,weight=Math.max(.000001,total-shots.length*.2);
  shots.forEach(q=>q.duration=.2+extra*(q.duration-.2)/weight);
  shots.at(-1).duration+=duration-shots.reduce((n,q)=>n+q.duration,0);
 }
 s.cinema.liveCamera=true;return shots;
}
function cineOperation(p,op){
 if(!['composeShot','setShotPath','holdShot','setDepth','setForegroundReveal','addForeground','setFilmFinish','saveFilmLook','cutAtMusic'].includes(op.op))return false;
 if(op.op==='setFilmFinish'){p.filmFinish=copy(op.finish);return true;}
 if(op.op==='saveFilmLook'){
  const name=productionText(op.name,60,'look name').trim();if(!name)throw Error('Give the look a name.');
  p.savedFilmLooks??=[];const at=p.savedFilmLooks.findIndex(x=>x.name===name),entry={name,finish:copy(op.finish)};
  if(at>=0)p.savedFilmLooks[at]=entry;else p.savedFilmLooks.push(entry);return true;
 }
 if(op.op==='cutAtMusic'){
  const fps=p.exportFps===30?30:60,time=Math.round(productionNumber(op.time,0,720000,'cut time')*fps)/fps,tl=storyTimeline(p,fps),r=tl.find(r=>time>=r.start-1e-7&&time<r.end-1e-7);
  if(!r)throw Error('Choose a cue inside the film.');cineEnsureShots(r.scene,p);
  const local=time-r.start,rows=cinemaRows(r.scene),existing=rows.find(q=>Math.abs(q.start-local)<1/fps/2);
  if(existing)return true;const row=rows.find(q=>local>q.start&&local<q.end);
  if(!row)throw Error('Choose a cue inside a shot.');
  deskOperation(p,{op:'splitShot',sceneId:r.scene.id,shotId:row.shot.id,time:local});return true;
 }
 const s=p.scenes.find(s=>s.id===op.sceneId);if(!s)throw Error('Choose a scene.');s.cinema??={};
 if(op.op==='setDepth'){
  if((op.value!==undefined||op.contact!==undefined)&&!op.pieceId)throw Error('Choose a scenery piece first.');
  if(op.mode!==undefined)s.cinema.depthMode=op.mode;
  if(op.layers!==undefined)s.cinema.depthLayers=copy(op.layers);
  if(op.background!==undefined){if(op.background===null)delete s.cinema.backgroundDepth;else s.cinema.backgroundDepth=op.background;}
  if(op.pieceId){const o=s.items.find(o=>o.id===op.pieceId);if(!o||o.locked)throw Error('Choose an unlocked piece.');if(o.attachment||o.propActions?.length)throw Error('This prop inherits depth from its character. Choose the character instead.');if(op.contact!==undefined){if(op.contact==='auto')delete o.depthContact;else o.depthContact=op.contact;}if(op.value===null)delete o.depthFactor;else if(op.value!==undefined)o.depthFactor=op.value;}
  return true;
 }
 if(op.op==='setForegroundReveal'){if(op.reveal===null)delete s.cinema.foregroundReveal;else{s.cinema.foregroundReveal=copy(op.reveal);s.cinema.transition={kind:'cut',duration:.5};}return true;}
 if(op.op==='addForeground'){
  const asset=CINE_FOREGROUNDS[op.kind],art=artById.get(asset);if(!art)throw Error('Choose foreground scenery.');
  s.items.push({id:id(),type:'asset',asset,name:art.name,x:W/2,y:H/2,w:W,h:H,bw:art.preparedSize[0],bh:art.preparedSize[1],rotation:0,color:null,fiber:0,stitch:false,depth:'foreground',depthFactor:1.35});return true;
 }
 cineEnsureShots(s,p);const row=cinemaRows(s).find(r=>r.shot.id===op.shotId)||(!op.shotId?cinemaRows(s)[0]:null);if(!row)throw Error('Choose a shot.');const shot=row.shot;
 if(op.op==='composeShot'){
  const pose=cineComposition(s,op.kind,op.subjectId,op.partnerId,row.start,p);
  delete shot.cameraSegment;delete shot.follow;shot.connection='cut';
  if(op.end==='from'||op.end==='to'){shot[op.end]=pose;shot.move=true;}else{shot.from=pose;shot.to=copy(pose);shot.move=false;delete shot.path;}
 }else if(op.op==='setShotPath'){
  delete shot.cameraSegment;shot.path=copy(op.path);shot.easing=op.easing;shot.from=cameraClamp({...shot.from,roll:op.fromRoll});shot.to=cameraClamp({...shot.to,roll:op.toRoll});shot.move=!!op.move;
 }else{
  const time=cinemaClamp(op.time??row.start,row.start,row.end),pose=studioCameraForRow(s,row,time,cinemaRows(s),p);
  shot.from=pose;shot.to=copy(pose);shot.move=false;shot.connection='cut';delete shot.cameraSegment;delete shot.path;delete shot.follow;
  // Existing camera clips must not move a deliberately held shot.
  shot.lockCamera=true;
 }
 if(op.op!=='holdShot')delete shot.lockCamera;return true;
}
function cineRevealAt(s,t,p){
 const at=p.scenes.findIndex(q=>q.id===s.id),incoming=s.cinema?.foregroundReveal,next=p.scenes[at+1],outgoing=next?.cinema?.foregroundReveal,length=p.classroomHolds?.[at]??sceneSeconds(s,p);
 const half=(r,other)=>Math.min(r.duration/2,length/2,other?(p.classroomHolds?.[p.scenes.indexOf(other)]??sceneSeconds(other,p))/2:Infinity);
 if(incoming){const span=half(incoming,p.scenes[at-1]);if(t<span)return{...incoming,cover:1-directorEase(t/span,'smooth')};}
 if(outgoing){const span=half(outgoing,next);if(t>length-span)return{...outgoing,cover:directorEase((t-length+span)/span,'smooth')};}
 return null;
}
function cineDrawReveal(g,w,h,reveal){
 if(!cineRevealCanvas||cineRevealCanvas.width!==w||cineRevealCanvas.height!==h)cineRevealCanvas=makeCanvas(w,h);const layer=cineRevealCanvas.getContext('2d');layer.clearRect(0,0,w,h);cinePaintReveal(layer,w,h,reveal);g.drawImage(cineRevealCanvas,0,0);
}
function cinePaintReveal(g,w,h,reveal){
 const u=reveal.cover;if(u<=0)return;g.save();g.scale(w/W,h/H);
 if(reveal.direction==='right'){g.translate(W,0);g.scale(-1,1);}
 const color={curtains:'#74364e',branches:'#183e32',doorway:'#65534a'}[reveal.kind];g.fillStyle=color;
 if(reveal.kind==='curtains'){
  const edge=(W/2+2)*u;g.fillRect(0,0,edge,H);g.fillRect(W-edge,0,edge,H);
  for(let x=0;x<edge;x+=46){const grad=g.createLinearGradient(x,0,x+46,0);grad.addColorStop(0,'#1b102844');grad.addColorStop(.55,'#f1b8ab33');grad.addColorStop(1,'#1b102844');g.fillStyle=grad;g.fillRect(x,0,Math.min(46,edge-x),H);g.save();g.translate(W,0);g.scale(-1,1);g.fillRect(x,0,Math.min(46,edge-x),H);g.restore();}
 }else{
  const edge=(W+170)*u-170;g.fillRect(0,0,Math.max(0,edge),H);
  if(reveal.kind==='branches'){
   // An opaque hedge sweeps over the cut; leaf tips soften its leading edge.
   for(let i=0;i<17;i++){g.fillStyle=i%2?'#28523d':'#1b4433';g.beginPath();g.ellipse(edge+18+Math.sin(i*2.7)*22,i*60-20,88,47,Math.sin(i)*.7,0,Math.PI*2);g.fill();}
  }else{g.fillStyle='#372d28';g.fillRect(edge-12,0,12,H);g.fillStyle='#8e7962';g.fillRect(edge-52,0,35,H);g.strokeStyle='#3e342e';g.lineWidth=3;for(let y=80;y<H;y+=100){g.beginPath();g.moveTo(0,y);g.lineTo(edge-52,y);g.stroke();}}
 }
 g.globalAlpha=.2;g.globalCompositeOperation='source-atop';g.fillStyle=g.createPattern(texture,'repeat');g.fillRect(0,0,W,H);
 g.restore();
}
function cineFinishActive(f){return !!f&&(f.look!=='none'&&f.strength>0||f.glow>0||f.grain>0||f.vignette>0||f.aspect!=='native');}
function cineDrawFinish(g,source,w,h,f,t,sceneId){
 g.save();g.filter=f.look==='none'?'none':movieGradeFilter({preset:f.look,strength:f.strength});g.drawImage(source,0,0,w,h);g.filter='none';
 if(f.glow>0){
  const gw=Math.max(160,Math.round(w/3)),gh=Math.max(90,Math.round(h/3));if(!cineGlowCanvas||cineGlowCanvas.width!==gw||cineGlowCanvas.height!==gh)cineGlowCanvas=makeCanvas(gw,gh);
  const out=cineGlowCanvas.getContext('2d');out.clearRect(0,0,gw,gh);out.filter='brightness(0.6) contrast(2) blur('+Math.max(2,gw/120)+'px)';out.drawImage(source,0,0,gw,gh);out.filter='none';g.globalCompositeOperation='screen';g.globalAlpha=f.glow*.38;g.drawImage(cineGlowCanvas,0,0,w,h);g.globalCompositeOperation='source-over';g.globalAlpha=1;
 }
 if(f.grain>0){
  cineGrainCanvas??=makeCanvas(192,108);const out=cineGrainCanvas.getContext('2d'),data=out.createImageData(192,108);let seed=2166136261;for(const c of String(sceneId))seed=Math.imul(seed^c.charCodeAt(0),16777619);seed^=Math.floor(t*60+1e-6);
  for(let i=0;i<data.data.length;i+=4){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;const shade=(seed>>>0)&255;data.data[i]=data.data[i+1]=data.data[i+2]=shade;data.data[i+3]=255;}
  out.putImageData(data,0,0);g.globalAlpha=f.grain*.12;g.imageSmoothingEnabled=false;g.drawImage(cineGrainCanvas,0,0,w,h);g.globalAlpha=1;
 }
 if(f.vignette>0){const v=g.createRadialGradient(w/2,h*.48,h*.16,w/2,h*.48,Math.hypot(w,h)*.54);v.addColorStop(0,'#08151000');v.addColorStop(.45,'#08151000');v.addColorStop(1,'rgba(6,15,12,'+f.vignette*.85+')');g.fillStyle=v;g.fillRect(0,0,w,h);}
 if(f.aspect!=='native'){const bar=Math.max(0,(h-w/Number(f.aspect))/2);g.fillStyle='#080e0d';g.fillRect(0,0,w,bar);g.fillRect(0,h-bar,w,bar);}
 g.restore();
}
function cineRender(g,s,w,h,time,fullBoard,editing,p){
 const prior=cineClock;cineClock={sceneId:s.id,time};const t=phrasePlaybackTiming(p)?Math.min(time,phraseHold(s,p)):time;
 try{
  const finish=!fullBoard&&cineFinishActive(p.filmFinish)?p.filmFinish:null;let out=g;
  if(finish){if(!cineFinishCanvas||cineFinishCanvas.width!==w||cineFinishCanvas.height!==h)cineFinishCanvas=makeCanvas(w,h);out=cineFinishCanvas.getContext('2d');out.clearRect(0,0,w,h);}
  if(window.FeltCinema)FeltCinema.render(out,s,w,h,t,fullBoard,editing,p);else drawSceneBase(out,s,w,h,t,fullBoard,editing);
  const reveal=!fullBoard&&!(editing&&!animRun&&!storyPlayback&&!presenting)&&cineRevealAt(s,time,p);if(reveal)cineDrawReveal(out,w,h,reveal);
  if(finish)cineDrawFinish(g,cineFinishCanvas,w,h,finish,time,s.id);
 }finally{cineClock=prior;}
}
function cineValidate(p){
 const num=(v,a,b,label)=>productionNumber(v,a,b,label),pose=q=>{if(!q)throw Error('Missing camera pose.');num(q.x,0,W,'camera X');num(q.y,0,H,'camera Y');num(q.zoom,1,4,'camera zoom');if(q.roll!==undefined)num(q.roll,-20,20,'camera tilt');};
 const path=q=>{if(!q)return;num(q.bend??0,-800,800,'camera bend');num(q.holdStart??0,0,.9,'starting hold');num(q.holdEnd??0,0,.9,'ending hold');if((q.holdStart||0)+(q.holdEnd||0)>.95)throw Error('Leave at least 5% of the shot for camera travel.');};
 const finish=f=>{if(!f||!['none',...Object.keys(MOVIE_LOOK_FILTERS)].includes(f.look)||!['native','2','2.39'].includes(f.aspect))throw Error('Choose a film look and picture shape.');for(const k of ['strength','glow','grain','vignette'])num(f[k],0,1,'film '+k);};
 if(p.filmFinish)finish(p.filmFinish);if(p.savedFilmLooks!==undefined){if(!Array.isArray(p.savedFilmLooks)||p.savedFilmLooks.length>30)throw Error('Keep up to 30 saved looks.');for(const q of p.savedFilmLooks){productionText(q.name,60,'look name');finish(q.finish);}}
 for(const s of p.scenes){const c=s.cinema||{};if(c.liveCamera!==undefined&&typeof c.liveCamera!=='boolean')throw Error('Invalid camera clock.');
  if(c.depthMode!==undefined&&!['grounded','floating'].includes(c.depthMode))throw Error('Choose Grounded set or Floating layers.');
  if(c.backgroundDepth!==undefined)num(c.backgroundDepth,0,2,'background depth');
  if(c.depthLayers)for(const key of Object.keys(c.depthLayers)){if(!Object.hasOwn(CINEMA_DEPTH,key))throw Error('Choose a scenery layer.');num(c.depthLayers[key],0,2,'layer depth');}
  if(c.foregroundReveal){const r=c.foregroundReveal;if(!['curtains','branches','doorway'].includes(r.kind)||!['left','right'].includes(r.direction))throw Error('Choose a foreground reveal.');num(r.duration,.2,5,'reveal length');}
  if(s.camera){pose(s.camera);for(const k of s.camera.keys||[])pose(k.pose);}
  for(const shot of c.shots||[]){if(shot.follow?.originStart!==undefined){num(shot.follow.originStart,0,7200,'tracking start');num(shot.follow.originEnd,shot.follow.originStart,7200,'tracking end');}pose(shot.from);pose(shot.to);path(shot.path);if(shot.lockCamera!==undefined&&typeof shot.lockCamera!=='boolean')throw Error('Invalid held camera.');const seg=shot.cameraSegment;if(seg){num(seg.start,0,1,'camera segment start');num(seg.end,seg.start+.00000001,1,'camera segment end');pose(seg.motion?.from);pose(seg.motion?.to);path(seg.motion.path);if(typeof seg.motion.move!=='boolean'||!DIRECTOR_EASES.includes(seg.motion.easing))throw Error('Invalid camera segment.');}}
  const walk=o=>{if(o.depthFactor!==undefined)num(o.depthFactor,0,2,'piece depth');if(o.depthContact!==undefined&&!['auto','ground','free'].includes(o.depthContact))throw Error('Choose an automatic, on-ground, or free-depth piece.');o.children?.forEach(walk);};s.items.forEach(walk);
 }return p;
}
window.FeltCinematography={version:1,apply:input=>directorApplyActions(input),composition:cineComposition,summary:()=>({finish:copy(state.filmFinish||CINE_FINISH_DEFAULT),looks:copy(state.savedFilmLooks||[]),shots:deskShotRows().map(({shot,...r})=>({...r,path:shot.path||null,held:!!shot.lockCamera}))})};
