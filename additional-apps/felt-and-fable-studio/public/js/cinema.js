'use strict';
// Optional cinematic data. Existing version-1 stories keep their original rendering.
let cinemaOpen=false,cinemaTab='shots',cinemaShotId=null,cinemaShotEnd=false,cinemaGuides=false,cinemaUISignature='',cinemaTransitionCanvas=null;
const CINEMA_DEPTH={back:.65,middle:1,foreground:1.35};
const CINEMA_EXPRESSIONS=['happy','neutral','worried','surprised','angry','sleepy','sad'];
const CINEMA_POSES=['standing','sitting','pointing','waving','carrying','walking','cheering','shrugging','thinking','presenting','handsOnHips','startled','dancing'];
const CINEMA_LIGHTS=['none','night','sunset','spotlight','flashlight'];
const CINEMA_WEATHER=['none','rain','snow','fog','fireflies','lightning'];
const CINEMA_TRANSITIONS=['cut','fade','dissolve','iris','curtains'];
function cinemaConfig(s=scene()){return s.cinema||(s.cinema={})}
function cinemaClamp(n,min,max,fallback=min){n=Number(n);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback}
function cinemaRows(s=scene()){let at=0;return(s.cinema?.shots||[]).map(shot=>{const row={shot,start:at,end:at+shot.duration};at=row.end;return row})}
function cinemaCameraAt(s,t){return studioCameraAt(s,t)}
function cinemaCurrentShot(){const rows=cinemaRows(),row=rows.find(r=>animTime<r.end)||rows.at(-1);if(row&&cinemaShotId!==row.shot.id){cinemaShotId=row.shot.id;cinemaShotEnd=false}return row}
function cinemaWriteCamera(p){const rows=cinemaRows();if(!rows.length)return false;const row=rows.find(r=>animTime<r.end)||rows.at(-1),shot=row.shot;if(!cinemaShotEnd&&shot.connection==='continue')shot.connection='cut';p=cameraClamp(p);const tracking=directorTrackingOffset(scene(),row,animTime);p=cameraClamp({...p,x:p.x-tracking.x,y:p.y-tracking.y});delete shot.cameraSegment;delete shot.lockCamera;if(!shot.move)shot.from=shot.to=p;else shot[cinemaShotEnd?'to':'from']=p;dirty=true;cinemaUISignature='';return true}
function cinemaQuickShotMove(kind){const row=cinemaCurrentShot();if(!row)return;checkpoint();let a=cameraAt(scene(),animTime),b;if(kind==='push')b=chosen().length?cameraFramePose(chosen()):cameraClamp({...a,zoom:Math.min(4,a.zoom*1.65)});else if(kind==='pull')b=cameraClamp();else{a=cameraClamp({x:470,y:450,zoom:1.7});b=cameraClamp({x:1130,y:450,zoom:1.7})}delete row.shot.cameraSegment;delete row.shot.lockCamera;Object.assign(row.shot,{from:a,to:b,move:true});animTime=row.start;refresh()}
function cinemaLastTime(s){let reusableEnd=Math.max(0,...(s.reusablePerformances||[]).map(c=>c.start+c.duration));let fxEnd=movieClips(s).reduce((v,c)=>Math.max(v,c.start+c.duration),0);let end=Math.max(reusableEnd,fxEnd,cinemaRows(s).at(-1)?.end||0);for(const c of s.cues||[])if(!c.crossScene)end=Math.max(end,c.start+c.duration);for(const t of s.cinema?.titles||[])end=Math.max(end,t.start+t.duration);function walk(o){if(o.dialogue)end=Math.max(end,o.dialogue.start+o.dialogue.duration);for(const c of o.storyProp?.changes||[])end=Math.max(end,c.time+.1);for(const a of [...(o.acting?.cues||[]),...(o.performance?.clips||[]),...(o.propActions||[]),...(o.conversation?.clips||[])])end=Math.max(end,a.start+a.duration);o.children?.forEach(walk)}s.items.forEach(walk);return end}
function cinemaRemapScene(s){const map=new Map();function remap(o){const old=o.id;o.id=id();map.set(old,o.id);o.children?.forEach(remap)}s.items.forEach(remap);function links(o){if(o.attachment)o.attachment.parentId=map.get(o.attachment.parentId)||o.attachment.parentId;o.children?.forEach(links)}s.items.forEach(links);s.items.forEach(o=>{talkRemap(o,map);performanceRemap(o,map)});if(s.cinema?.look?.target)s.cinema.look.target=map.get(s.cinema.look.target)||null;if(s.cinema?.focus?.targetId)s.cinema.focus.targetId=map.get(s.cinema.focus.targetId)||null;for(const shot of s.cinema?.shots||[])if(shot.follow)shot.follow.targetId=map.get(shot.follow.targetId)||null;movieRemap(s,map);studioRemap(s,map);reuseRemap(s,map);craftRemap(s,map);rigRemap(s,map);return s}
function cinemaClearAttachments(o){if(o.rig)o.rig.commands=[];delete o.contact;delete o.occlusion;delete o.choreography;performanceClear(o);delete o.attachment;delete o.bubbleAim;delete o.tailTip;o.children?.forEach(cinemaClearAttachments);return o}
function cinemaOrderedItems(s,t=animTime){return reuseOrder(s,t,studioOrder(s,t))}
function cinemaDepthOffset(o,s,t){const factor=CINEMA_DEPTH[o.depth]??1;if(factor===1)return{x:0,y:0};const c=cameraAt(s,t);return{x:(1-factor)*(c.x-W/2),y:(1-factor)*(c.y-H/2)}}
function cinemaAttachmentPose(o,t,s,seen=new Set()){
 const a=o.attachment;if(!a||seen.has(o.id))return null;seen.add(o.id);const parent=s.items.find(p=>p.id===a.parentId);if(!parent)return null;
 const sample=a.release===null||a.release===undefined?t:Math.min(t,a.release),base=studioPoseAt(parent,sample,sceneSeconds(s),s),pp=cinemaVisualPose(parent,sample,s,base,false,seen),anchor=cinemaAnchor(parent,a.anchor,sample,s),r=pp.rotation*Math.PI/180;
 const sx=pp.w/parent.bw*(parent.flipX?-1:1),sy=pp.h/parent.bh*(parent.flipY?-1:1),x=(anchor[0]+a.dx)*sx,y=(anchor[1]+a.dy)*sy;
 return{x:pp.x+x*Math.cos(r)-y*Math.sin(r),y:pp.y+x*Math.sin(r)+y*Math.cos(r),w:o.w*Math.abs(sx)/a.parentScaleX,h:o.h*Math.abs(sy)/a.parentScaleY,rotation:pp.rotation+a.rotation,opacity:parent.hidden?0:(o.opacity??1)*(pp.opacity??1)};
}
function cinemaVisualPose(o,t,s,p=poseAt(o,t,sceneSeconds(s)),alreadyVisual=false,seen=new Set()){
 if(o.rope){const q=craftRopeGeometry(o,s,t),pts=q.points.concat(q.loop),xs=pts.map(p=>p.x),ys=pts.map(p=>p.y),lo=Math.min(...xs)-o.rope.width,hi=Math.max(...xs)+o.rope.width,top=Math.min(...ys)-o.rope.width,bottom=Math.max(...ys)+o.rope.width;return{...p,x:(lo+hi)/2,y:(top+bottom)/2,w:Math.max(1,hi-lo),h:Math.max(1,bottom-top),rotation:0};}const reused=reuseSample(o,t,s);if(reused){return cineDepthPose(o,s,t,reused.pose)}
 const actionPose=performancePropPose(o,deskActorTime(o,t,s),s);if(actionPose)return actionPose;const attached=cinemaAttachmentPose(o,t,s,seen);if(attached){if(o.dialogue&&(t<o.dialogue.start||t>=o.dialogue.start+o.dialogue.duration))attached.opacity=0;return studioScarfPose(o,t,s,attached);}
 if(alreadyVisual)return p;return craftContactPose(o,cineDepthPose(o,s,t,p),s,t,seen);
}
function cinemaSetAttached(o,key,value){
 if(o.rig){toast('Use Character motion to change this rig’s start, size, facing and actions.');return true;}
 if(o.propActions?.length&&key==='opacity'){o.opacity=value;return true}if(o.propActions?.length&&['x','y','rotation','w','h'].includes(key)){toast('Edit this prop in Prop actions. Use Choose position on board for a put-down destination.');return true}
 if(o.rope||o.contact){toast('Edit this piece’s rope endpoints or contact pin in Film → Staging.');return true}const a=o.attachment;if(!a)return false;const parent=items().find(p=>p.id===a.parentId);if(!parent){delete o.attachment;return false}
 if(key==='x'||key==='y'){const p=cinemaVisualPose(parent,animTime,scene()),cur=cinemaVisualPose(o,animTime,scene()),r=-p.rotation*Math.PI/180,dx=key==='x'?value-cur.x:0,dy=key==='y'?value-cur.y:0;a.dx+=(dx*Math.cos(r)-dy*Math.sin(r))/(p.w/parent.bw*(parent.flipX?-1:1));a.dy+=(dx*Math.sin(r)+dy*Math.cos(r))/(p.h/parent.bh*(parent.flipY?-1:1));return true}
 if(key==='w'||key==='h'){const current=cinemaVisualPose(o,animTime,scene());o[key]*=value/current[key];return true}
 if(key==='rotation'){a.rotation=value-cinemaVisualPose(parent,animTime,scene()).rotation;return true}return false;
}
function cinemaDetach(o){const raw=rawPiece(o);if(raw.propActions?.length){const p=cinemaVisualPose(raw,animTime,scene());Object.assign(raw,p);delete raw.propActions;delete raw.attachment;raw.depth='middle';return}if(!raw.attachment)return;const p=cinemaVisualPose(raw,animTime,scene());Object.assign(raw,p);delete raw.attachment;delete raw.bubbleAim;delete raw.tailTip;raw.depth='middle';delete raw.keyframes;delete raw.animationBlocks}
function cinemaDetachReferences(ids){rigDetachReferences(ids);craftDetachReferences(ids);reuseDetach(scene(),ids);studioDetach(ids);movieDetachReferences(ids);performanceDetachReferences(ids);for(const o of items())if(o.attachment&&ids.includes(o.attachment.parentId)&&!ids.includes(o.id))cinemaDetach(o)}
function cinemaAttach(parentId,anchor){if(cinemaSelected()?.propActions?.length)return toast('Clear the prop actions before changing its starting attachment.');const o=selected.length===1?items().find(o=>o.id===selected[0]):null,parent=items().find(p=>p.id===parentId);if(!o||!parent||o===parent||o.locked)return;let p=parent,seen=new Set([o.id]);while(p){if(seen.has(p.id))return toast('An accessory cannot attach back to itself.');seen.add(p.id);p=items().find(x=>x.id===p.attachment?.parentId)}checkpoint();const pp=cinemaVisualPose(parent,animTime,scene());delete o.animationBlocks;delete o.keyframes;o.attachment={parentId,anchor,dx:0,dy:0,rotation:0,parentScaleX:pp.w/parent.bw,parentScaleY:pp.h/parent.bh,release:null};o.depth=parent.depth||'middle';refresh();toast('Attached. Drag the accessory to fine-tune its position; it follows this character.')}
function cinemaDecorateTree(raw,t,tree){t=deskActorTime(raw,t,directorRenderScene||scene());
 rigDecorate(raw,t,tree,directorRenderScene||scene());if(raw.illustration)productionDecorate(raw,t,tree);if(raw.storyProp)tree.asset=storyPropAsset(raw,t);
 if(raw.type==='puppet')tree.acting=cinemaActingAt(raw,t);
 if(raw.type==='bubble')talkAimBubble(raw,tree,t);
 if(raw.dialogue){const d=raw.dialogue,dt=t-d.start;tree.opacity*=dt<0||dt>=d.duration?0:1;if(d.reveal==='words'&&dt>=0){const words=String(raw.text||'').split(/\s+/);tree.text=words.slice(0,Math.max(1,Math.ceil(dt*(d.wordsPerSecond||3)))).join(' ')}}
 return tree;
}
function cinemaActingAt(o,t,s=performanceScene()){t=deskActorTime(o,t,s);const reused=reuseActor(o,t,s);if(reused)return reused;t=studioFreezeTime(o,t);const a=o.acting||{},cue=(a.cues||[]).find(c=>t>=c.start&&t<c.start+c.duration);const phase=cue?t-cue.start:t,conversation=cue?null:conversationAt(o,t,s),performance=performanceAt(o,t,s);return{...a,...cue,conversation,performance,freeze:cue?undefined:a.freeze,expression:talkEmotion(o,t)||performance.expression||cue?.expression||conversation?.expression||a.expression||'happy',cues:undefined,phase,blink:a.blink!==false&&t%4.7>4.5,mouth:directorSpeechMouth(o,t)??((cue?.talk??a.talk)?Math.floor(t*8)%3:(performance.mouth||0))}}
let movieFrameCanvas=null;
function cinemaRenderContent(g,s,w,h,t,fullBoard,editing,project=state){return studioRenderShot(g,s,w,h,t,fullBoard,editing,project)}
function cinemaRenderContentBase(g,s,w,h,t,fullBoard,editing,project=state){
 const before=[directorRenderScene,directorRenderProject];directorRenderScene=s;directorRenderProject=project;try{
  const look=movieLookAt(s,t);let out=g;
  if(look){if(!movieFrameCanvas||movieFrameCanvas.width!==w||movieFrameCanvas.height!==h)movieFrameCanvas=makeCanvas(w,h);out=movieFrameCanvas.getContext('2d');out.clearRect(0,0,w,h)}
  drawSceneBase(out,s,w,h,t,fullBoard,editing);out.save();out.scale(w/W,h/H);cinemaDrawAtmosphere(out,s,t);movieDrawLights(out,s,t,fullBoard);movieDrawParticles(out,s,t,fullBoard);out.restore();
  if(look){g.save();if(look.mix!==undefined){g.filter=movieGradeFilter(look.baseline);g.drawImage(movieFrameCanvas,0,0);g.globalAlpha=look.mix}g.filter=movieGradeFilter(look);g.drawImage(movieFrameCanvas,0,0);g.restore()}
  g.save();g.scale(w/W,h/H);movieDrawLookTint(g,s,t);studioDrawGlobal(g,s,t,project);cinemaDrawTitles(g,s,t);g.restore();
 }finally{[directorRenderScene,directorRenderProject]=before}
}
function cinemaRender(g,s,w,h,t,fullBoard,editing,project){
 const tr=s.cinema?.transition,duration=Math.min(tr?.duration||0,sceneSeconds(s)/2),previewEditing=editing&&!animRun&&!storyPlayback&&!presenting;
 if(fullBoard||previewEditing||w<=320||!tr||tr.kind==='cut'||t>=duration||duration<=0){cinemaRenderContent(g,s,w,h,t,fullBoard,editing,project);return}
 const u=cinemaClamp(t/duration,0,1),index=project.scenes.findIndex(x=>x.id===s.id),previous=project.scenes[index-1];
 if(tr.kind==='dissolve'){
  if(previous)cinemaRenderContent(g,previous,w,h,tr.moving?sceneSeconds(previous,project)+t:Math.max(0,sceneSeconds(previous,project)-1/60),false,false,project);else{g.fillStyle='#14251e';g.fillRect(0,0,w,h)}
  if(!cinemaTransitionCanvas||cinemaTransitionCanvas.width!==w||cinemaTransitionCanvas.height!==h)cinemaTransitionCanvas=makeCanvas(w,h);const layer=cinemaTransitionCanvas.getContext('2d');layer.clearRect(0,0,w,h);cinemaRenderContent(layer,s,w,h,t,false,editing,project);g.save();g.globalAlpha=u;g.drawImage(cinemaTransitionCanvas,0,0);g.restore();return;
 }
 cinemaRenderContent(g,s,w,h,t,false,editing,project);g.save();g.scale(w/W,h/H);
 if(tr.kind==='fade'){g.globalAlpha=1-u;g.fillStyle='#101b17';g.fillRect(0,0,W,H)}
 if(tr.kind==='iris'){g.fillStyle='#101b17';g.beginPath();g.rect(0,0,W,H);g.arc(W/2,H/2,Math.hypot(W,H)*u/2,0,Math.PI*2,true);g.fill('evenodd')}
 if(tr.kind==='curtains'){const edge=(1-easeAnimation(u,'smooth'))*W/2;g.fillStyle='#713648';g.fillRect(0,0,edge,H);g.fillRect(W-edge,0,edge,H);g.fillStyle='#ffffff10';for(let x=0;x<edge;x+=50){g.fillRect(x,0,15,H);g.fillRect(W-x-15,0,15,H)}g.globalAlpha=.3;g.fillStyle=g.createPattern(texture,'repeat');g.fillRect(0,0,edge,H);g.fillRect(W-edge,0,edge,H)}g.restore();
}
function cinemaDrawAtmosphere(g,s,t){
 const look=s.cinema?.look;if(!look)return;const strength=look.strength??.5,kind=studioLightingAt(s,t)?'none':look.light||'none';g.save();
 if(kind==='night'){g.fillStyle=`rgba(12,26,65,${strength*.75})`;g.fillRect(0,0,W,H)}
 if(kind==='sunset'){const grad=g.createLinearGradient(0,0,W,H);grad.addColorStop(0,`rgba(242,156,63,${strength*.42})`);grad.addColorStop(1,`rgba(116,53,103,${strength*.3})`);g.fillStyle=grad;g.fillRect(0,0,W,H)}
 if(kind==='spotlight'||kind==='flashlight'){
  const u=cinemaClamp(t/sceneSeconds(s),0,1);let x=(look.x??.5)+((look.endX??look.x??.5)-(look.x??.5))*u,y=(look.y??.45)+((look.endY??look.y??.45)-(look.y??.45))*u;const target=s.items.find(o=>o.id===look.target);
  if(target){const p=cinemaVisualPose(target,t,s),q=cameraWorldToScreen([p.x,p.y],cameraAt(s,t));x=q[0]/W;y=q[1]/H}
  const radius=kind==='flashlight'?210:440,grad=g.createRadialGradient(x*W,y*H,30,x*W,y*H,radius);grad.addColorStop(0,'rgba(8,16,24,0)');grad.addColorStop(.45,'rgba(8,16,24,.03)');grad.addColorStop(1,`rgba(8,16,24,${.3+strength*.6})`);g.fillStyle=grad;g.fillRect(0,0,W,H);
 }
 const weather=look.weather||'none',density=look.density??.5,n=Math.round(25+density*100);g.lineCap='round';
 const noise=i=>{const q=Math.sin(i*127.1+32.7)*43758.5453;return q-Math.floor(q)};
 for(let i=0;i<n&&['rain','snow','fireflies'].includes(weather);i++){
  const speed=weather==='rain'?370:weather==='snow'?45:8,x=(noise(i*3)*1900+t*(weather==='rain'?-60:Math.sin(i)*10)+1900*50)%1900-150,y=(noise(i*3+1)*1200+t*speed*(.7+noise(i*3+2)))%1200-150;
  g.beginPath();if(weather==='rain'){g.strokeStyle='#aac9dc90';g.lineWidth=2;g.moveTo(x,y);g.lineTo(x-7,y+23);g.stroke()}else{g.globalAlpha=weather==='fireflies'?.3+.7*(Math.sin(t*2+i)+1)/2:.85;g.fillStyle=weather==='snow'?'#fff9ef':'#ffef98';g.arc(x,y,weather==='snow'?2+noise(i)*4:2.5,0,Math.PI*2);g.fill()}
 }
 if(weather==='fog'){g.globalAlpha=.04+density*.11;for(let i=0;i<9;i++){const x=((i*271+t*24)%2400)-350,y=450+Math.sin(i*2+t*.08)*270;const fog=g.createRadialGradient(x,y,0,x,y,480);fog.addColorStop(0,'#e9eee2');fog.addColorStop(1,'#e9eee200');g.fillStyle=fog;g.fillRect(x-480,y-480,960,960)}}
 if(weather==='lightning'&&t%7>.22&&t%7<.35){g.fillStyle=`rgba(242,242,255,${density*.45})`;g.fillRect(0,0,W,H)}g.restore();
}
function cinemaDrawTitles(g,s,t){for(const title of s.cinema?.titles||[]){const dt=t-title.start;if(dt<0||dt>=title.duration)continue;g.save();const fade=Math.min(.5,title.duration/4);g.globalAlpha=Math.min(1,dt/fade,(title.duration-dt)/fade);g.textAlign='center';g.textBaseline='middle';g.fillStyle=title.color||'#fff9e8';g.shadowColor='#12241ce0';g.shadowBlur=7;g.shadowOffsetY=3;
 if(title.kind==='credits'){g.font='600 40px Georgia,serif';const lines=title.text.split('\n').slice(0,60),step=57,y=H+60-dt/title.duration*(H+120+lines.length*step);lines.forEach((line,i)=>g.fillText(line,W/2,y+i*step,W-240))}
 else{g.font='700 74px Georgia,serif';const lines=bubbleLines(g,title.text,W-220).slice(0,4),y=H*.43-(lines.length-1)*44;lines.forEach((line,i)=>g.fillText(line,W/2,y+i*88,W-220));if(title.subtitle){g.font='400 30px system-ui';g.fillText(title.subtitle,W/2,y+lines.length*88+6,W-260)}}g.restore()}}
function cinemaDrawGuides(g){if(!cinemaGuides||presenting||exportJob||!cinemaOpen||offstageActive())return;g.save();g.strokeStyle='#fff9';g.lineWidth=1.3;g.setLineDash([8,9]);for(const x of [W/3,W*2/3]){g.beginPath();g.moveTo(x,0);g.lineTo(x,H);g.stroke()}for(const y of [H/3,H*2/3]){g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke()}g.restore()}
function validateCinemaProject(p){
 const number=(v,lo,hi)=>Number.isFinite(v)&&v>=lo&&v<=hi,checkNum=(v,lo,hi,label)=>{if(!number(v,lo,hi))throw Error('Invalid '+label+'.')},arr=(a,max,label)=>{if(a!==undefined&&(!Array.isArray(a)||a.length>max))throw Error('Invalid '+label+'.')};
 for(const s of p.scenes){const c=s.cinema||{};arr(c.shots,100,'shot list');arr(c.titles,100,'titles');arr(s.cues,250,'sound cues');const ids=new Set(s.items.map(o=>o.id));
  const shotIds=new Set();for(const shot of c.shots||[]){if(typeof shot.id!=='string'||shotIds.has(shot.id))throw Error('Invalid shot identity.');shotIds.add(shot.id);checkNum(shot.duration,.2,7200,'shot duration');if(typeof shot.name!=='string'||shot.name.length>80||typeof shot.move!=='boolean')throw Error('Invalid shot.');for(const pose of [shot.from,shot.to]){if(!pose)throw Error('Missing shot framing.');for(const key of ['x','y','zoom'])checkNum(pose[key],key==='zoom'?1:0,key==='zoom'?4:key==='x'?W:H,'shot framing')}}
  if(c.transition){if(!CINEMA_TRANSITIONS.includes(c.transition.kind))throw Error('Invalid transition.');checkNum(c.transition.duration,.1,5,'transition length')}
  if(c.look){if(!CINEMA_LIGHTS.includes(c.look.light)||!CINEMA_WEATHER.includes(c.look.weather))throw Error('Invalid scene atmosphere.');for(const k of ['strength','density','x','y','endX','endY'])checkNum(c.look[k],0,1,'lighting value')}
  for(const title of c.titles||[]){if(!['title','credits'].includes(title.kind)||typeof title.text!=='string'||title.text.length>4000||typeof title.subtitle!=='string'||title.subtitle.length>200||!/^#[0-9a-f]{6}$/i.test(title.color))throw Error('Invalid movie title.');checkNum(title.start,0,7199,'title start');checkNum(title.duration,.2,7200-title.start,'title duration')}
  for(const cue of s.cues||[])validateCinemaCue(cue,p);
  function check(o){wardrobeValidate(o);conversationValidate(o,s);if(o.depth!==undefined&&!Object.hasOwn(CINEMA_DEPTH,o.depth))throw Error('Invalid depth layer.');if(o.type==='puppet'&&!artById.get(o.asset)?.puppet)throw Error('This acting character is not in the collection.');if(o.dialogue){if(!['bubble','text'].includes(o.type))throw Error('Only text can have dialogue timing.');checkNum(o.dialogue.start,0,7199,'dialogue start');checkNum(o.dialogue.duration,.1,7200-o.dialogue.start,'dialogue duration');if(!['instant','words'].includes(o.dialogue.reveal))throw Error('Invalid dialogue reveal');checkNum(o.dialogue.wordsPerSecond,1,12,'dialogue speed')}
   if(o.acting){arr(o.acting.cues,150,'acting cues');for(const a of [o.acting,...(o.acting.cues||[])]){if(!CINEMA_EXPRESSIONS.includes(a.expression)||!CINEMA_POSES.includes(a.pose)||typeof a.talk!=='boolean')throw Error('Invalid acting pose.');if(a!==o.acting){checkNum(a.start,0,7199,'acting start');checkNum(a.duration,.1,7200-a.start,'acting duration')}}}
   if(o.attachment){const a=o.attachment;if(!ids.has(a.parentId)||a.parentId===o.id||!['leftHand','rightHand','head','back','center'].includes(a.anchor))throw Error('Invalid accessory attachment.');for(const k of ['dx','dy','rotation'])checkNum(a[k],-24000,24000,'accessory offset');for(const k of ['parentScaleX','parentScaleY'])checkNum(a[k],.00001,12000,'accessory scale');if(a.release!==null)checkNum(a.release,0,7200,'accessory release');let seen=new Set([o.id]),parent=s.items.find(x=>x.id===a.parentId);while(parent){if(seen.has(parent.id))throw Error('Circular accessory attachment.');seen.add(parent.id);parent=s.items.find(x=>x.id===parent.attachment?.parentId)}}o.children?.forEach(check)}s.items.forEach(check);
  if(cinemaLastTime(s)>7200)throw Error('A scene can last at most two hours.');
 }
 return p;
}
window.FeltCinema={render:cinemaRender,init:()=>cinemaInitUI(),sync:()=>cinemaSyncUI()};
