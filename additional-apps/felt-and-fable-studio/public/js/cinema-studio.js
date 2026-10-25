'use strict';
// Optional, editable cinematic data. All times are seconds, all geometry is board space.
const STUDIO_MOTIONS={circle:'Circle someone',visit:'Visit partners',follow:'Follow a leader',freeze:'Freeze',scarf:'Scarf around heads'};
const STUDIO_LIGHTS={moonlight:[12,26,65,.52],sunrise:[244,166,88,.22],daylight:[255,255,255,0]};
let studioCameraOverride=null,studioShotCanvas=null,studioFrameClock=null;
function studioAbsolute(s,t,p){return studioFrameClock?.project===p?studioFrameClock.time:studioSceneStart(s,p)+t}
function studioProject(){return directorRenderProject||state}
function studioSceneStart(s,p=studioProject()){let at=0;for(const q of p.scenes){if(q.id===s.id)return at;at+=sceneSeconds(q,p)}return 0}
function studioFindScene(o){const p=studioProject();return directorRenderScene||p.scenes.find(s=>s.items.some(q=>q===o||q.id===o.id))||scene()}
function studioClip(o,t){return(o.choreography||[]).filter(c=>t>=c.start&&(t<c.start+c.duration||c.hold)).sort((a,b)=>b.start-a.start)[0]}
function studioFreezeTime(o,t){const c=studioClip(o,t);return c?.preset==='freeze'?c.start:t}
function studioNewMotion(preset,start=0,targets=[]){return{id:id(),preset,start,duration:4,targetIds:targets,radiusX:preset==='scarf'?85:180,radiusY:preset==='scarf'?28:65,turns:2,clockwise:true,lag:.5,offsetX:0,offsetY:0,autoDepth:true,hold:true,gripX:.06,gripY:.04,tipX:.88,tipY:.47}}
function studioTarget(c,u,s){const targets=c.targetIds.map(id=>s.items.find(o=>o.id===id)).filter(Boolean);if(!targets.length)return null;const progress=u*targets.length,i=Math.min(targets.length-1,Math.floor(progress)),local=u===1?1:progress-i;return{target:targets[i],next:targets[Math.min(i+1,targets.length-1)],local,index:i}}
function studioOrbit(c,t,s,seen=new Set()){
 const u=cinemaClamp((t-c.start)/c.duration,0,1),visit=c.preset==='visit'||c.preset==='scarf',part=studioTarget(c,visit?u:0,s);if(!part)return null;
 const local=visit?part.local:u,travel=visit&&part.next!==part.target?directorEase((local-.72)/.28,'cinematic'):0;
 const sample=o=>studioMotionPose(o,t,sceneSeconds(s),blockPoseAt(o,t,sceneSeconds(s)),s,new Set(seen));
 const a=sample(part.target),b=travel?sample(part.next):a,head=c.preset==='scarf',cy=(p,o)=>p.y+(head?-p.h*.3:0);
 const x=a.x+(b.x-a.x)*travel,y=cy(a,part.target)+(cy(b,part.next)-cy(a,part.target))*travel;
 const phase=(local/(visit&&part.next!==part.target ? .72 : 1));
 const angle=-Math.PI/2+Math.PI*2*c.turns*Math.min(1,phase)*(c.clockwise?1:-1),dy=Math.sin(angle)*c.radiusY;
 return{x:x+Math.cos(angle)*c.radiusX+c.offsetX,y:y+dy+c.offsetY,front:dy>=0,targetId:travel>.5?part.next.id:part.target.id};
}
function studioMotionBefore(o,c,duration,s,seen){const earlier={...o,choreography:(o.choreography||[]).filter(q=>q.start<c.start)},next=new Set(seen);next.delete(o.id);return studioMotionPose(earlier,c.start,duration,blockPoseAt(o,c.start,duration),s,next)}
function studioMotionPose(o,t,duration,p,s=studioFindScene(o),seen=new Set()){
 if(seen.has(o.id))return p;seen.add(o.id);const c=studioClip(o,t);if(!c||c.preset==='scarf')return p;
 const at=Math.min(t,c.start+c.duration);if(c.preset==='freeze')return studioMotionBefore(o,c,duration,s,seen);
 let result=p;
 if(c.preset==='follow'){const target=s.items.find(q=>q.id===c.targetIds[0]);if(!target)return p;const sample=Math.max(0,at-c.lag),q=studioMotionPose(target,sample,duration,blockPoseAt(target,sample,duration),s,new Set(seen));result={...p,x:q.x+c.offsetX,y:q.y+c.offsetY}}
 else{const orbit=studioOrbit(c,at,s,seen);if(!orbit)return p;result={...p,x:orbit.x,y:orbit.y}}
 const blend=directorEase(Math.min(1,(at-c.start)/Math.min(.35,c.duration*.15)),'smooth');if(blend<1){const from=studioMotionBefore(o,c,duration,s,seen);result.x=from.x+(result.x-from.x)*blend;result.y=from.y+(result.y-from.y)*blend}return result;
}
function studioPoseAt(o,t,duration,s=null){t=deskActorTime(o,t,s||studioFindScene(o));return rigRootPose(o,t,s||studioFindScene(o),deskRoutePose(o,t,studioPoseAtBase(o,t,duration,s)));}
function studioPoseAtBase(o,t,duration,s=null){
 const reused=reuseSample(o,t,s||studioFindScene(o));if(reused)return{...reused.pose};
 if(!o.choreography?.length&&(duration===undefined||t<=duration))return productionMotionPose(o,t,blockPoseAt(o,t,duration));s??=studioFindScene(o);const end=duration??sceneSeconds(s),sample=Math.min(t,end),p=studioMotionPose(o,sample,end,blockPoseAt(o,sample,end),s);
 // A moving dissolve uses post-roll at the final velocity, without replaying a scene.
 if(t>end&&t<=end+5){const a=studioMotionPose(o,Math.max(0,end-1/30),end,blockPoseAt(o,Math.max(0,end-1/30),end),s);for(const k of ['x','y','rotation'])p[k]+=(p[k]-a[k])*30*(t-end)}return productionMotionPose(o,t,p);
}
function studioScarfPose(o,t,s,p){
 const c=studioClip(o,t);if(c?.preset!=='scarf')return p;const orbit=studioOrbit(c,Math.min(t,c.start+c.duration),s,new Set([o.id]));if(!orbit)return p;
 // Keep the pinched corner at the held position, then aim the cloth's free end.
 const grip={x:p.x,y:p.y};
 const vx=(c.tipX-c.gripX)*o.w*(o.flipX?-1:1),vy=(c.tipY-c.gripY)*o.h*(o.flipY?-1:1),length=Math.max(1,Math.hypot(vx,vy));
 const angle=Math.atan2(orbit.y-grip.y,orbit.x-grip.x)-Math.atan2(vy,vx),scale=cinemaClamp(Math.hypot(orbit.x-grip.x,orbit.y-grip.y)/length,.1,8),w=o.w*scale,h=o.h*scale;
 const dx=(c.gripX-.5)*w*(o.flipX?-1:1),dy=(c.gripY-.5)*h*(o.flipY?-1:1);
 return{...p,w,h,rotation:angle*180/Math.PI,x:grip.x-dx*Math.cos(angle)+dy*Math.sin(angle),y:grip.y-dx*Math.sin(angle)-dy*Math.cos(angle)};
}
function studioOrder(s,t=animTime){const list=performanceOrder(s);if(!s.items.some(o=>o.choreography?.length))return list;const ranks=new Map(list.map((o,i)=>[o.id,i]));for(const o of list){const c=studioClip(o,t);if(!c?.autoDepth||!['circle','visit','scarf'].includes(c.preset))continue;const q=studioOrbit(c,Math.min(t,c.start+c.duration),s,new Set([o.id]));if(q&&ranks.has(q.targetId))ranks.set(o.id,ranks.get(q.targetId)+(q.front?.25:-.25));}for(const o of list)if(o.attachment&&o.attachment.order!=='scene'&&!o.choreography?.length)ranks.set(o.id,(ranks.get(o.attachment.parentId)??ranks.get(o.id))+.05);return list.sort((a,b)=>ranks.get(a.id)-ranks.get(b.id))}
function studioCameraForRow(s,row,t,rows=cinemaRows(s),p=studioProject(),depth=0){
 let a=row.shot.from,b=row.shot.to||a;const index=rows.indexOf(row);
 if(row.shot.connection==='continue'&&depth<100){if(index>0)a=studioCameraForRow(s,rows[index-1],rows[index-1].end,rows,p,depth+1);else{const previous=p.scenes[p.scenes.findIndex(q=>q.id===s.id)-1];if(previous){const pr=cinemaRows(previous);a=pr.length?studioCameraForRow(previous,pr.at(-1),pr.at(-1).end,pr,p,depth+1):cameraBaseAt(previous,sceneSeconds(previous,p))}}if(!row.shot.move)b=a}
 if(t>row.end){const a=studioCameraForRow(s,row,row.end,rows,p,depth),b=studioCameraForRow(s,row,Math.max(row.start,row.end-1/30),rows,p,depth),dt=Math.min(5,t-row.end)*30;return cameraClamp({x:a.x+(a.x-b.x)*dt,y:a.y+(a.y-b.y)*dt,zoom:a.zoom+(a.zoom-b.zoom)*dt,...(a.roll!==undefined?{roll:a.roll+((a.roll||0)-(b.roll||0))*dt}:{})})}
 return directorFollow(s,row,t,cinePathSample(row.shot,a,b,cinemaClamp((t-row.start)/row.shot.duration,0,1)));
}
function studioCameraAt(s,t){const rows=cinemaRows(s);if(!rows.length)return null;const row=rows.find(r=>t<r.end)||rows.at(-1);return studioCameraForRow(s,row,t,rows)}
function studioFrame(s,ids,kind='full',t=0,end=t,includeProps=true){
 if(!Array.isArray(ids)||!['wide','full','medium','close'].includes(kind))throw Error('Choose pieces and a supported frame size.'); const actors=s.items.filter(o=>ids.includes(o.id)&&!o.hidden);if(!actors.length)throw Error('Select one or more visible pieces to frame.');
 const selectedIds=new Set(ids),props=includeProps?s.items.filter(o=>!o.hidden&&(selectedIds.has(o.attachment?.parentId)||(o.propActions||[]).some(a=>selectedIds.has(a.actorId)))):[];
 const all=[...actors,...props],points=[];const prior=studioCameraOverride,priorScene=directorRenderScene;directorRenderScene=s;studioCameraOverride={sceneId:s.id,pose:cameraClamp()};
 try{for(const at of [t,(t+end)/2,end])for(const o of all){const q=cinemaVisualPose(o,at,s,studioPoseAt(o,at,sceneSeconds(s),s)),isActor=actors.includes(o);let crop={...q};if(isActor&&!props.length&&['medium','close'].includes(kind)){crop.h=q.h*(kind==='close'?.42:.7);crop.y=q.y-q.h/2+crop.h/2;crop.w=q.w*(kind==='close'?.72:1)}points.push(...corners(crop));if(o.type==='puppet'&&includeProps)for(const anchor of ['leftHand','rightHand']){const pt=cinemaAnchor(o,anchor,at,s),r=q.rotation*Math.PI/180,x=pt[0]*q.w/o.bw*(o.flipX?-1:1),y=pt[1]*q.h/o.bh*(o.flipY?-1:1);points.push([q.x+x*Math.cos(r)-y*Math.sin(r),q.y+x*Math.sin(r)+y*Math.cos(r)])}}}finally{studioCameraOverride=prior;directorRenderScene=priorScene}
 const xs=points.map(q=>q[0]),ys=points.map(q=>q[1]),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys),fill=kind==='wide'?.55:.8;
 return cameraClamp({x:(left+right)/2,y:(top+bottom)/2,zoom:Math.min(W*fill/Math.max(1,right-left),H*fill/Math.max(1,bottom-top),4)});
}
function studioShotTrick(s,row,kind,ids){
 if(!['reveal','reaction'].includes(kind))throw Error('Choose a supported shot trick.'); if(!row)throw Error('Add a shot first.');const shot=row.shot,home=studioCameraForRow(s,row,row.start),target=studioFrame(s,ids,'close',row.start,row.end,false);
 if(kind==='reveal'){shot.from=target;shot.to=studioFrame(s,ids,'wide',row.start,row.end,true);shot.move=true;shot.easing='cinematic';return}
 if(shot.duration<.9)throw Error('Use a shot at least 0.9 seconds long for a reaction and return.');if(cinemaRows(s).length>98)throw Error('There is room for 100 shots per scene.');const duration=shot.duration/3,shots=s.cinema.shots,i=shots.indexOf(shot);
 shots.splice(i,1,{...shot,duration,from:home,to:home,move:false},{id:id(),name:'Reaction',duration,from:target,to:target,move:false,connection:'cut'},{id:id(),name:'Return to scene',duration:shot.duration-duration*2,from:home,to:home,move:false,connection:'cut'});
}
function studioRenderShot(g,s,w,h,t,fullBoard,editing,p){
 const cameraTime=cineCameraTime(s,t),rows=cinemaRows(s),row=rows.find(r=>cameraTime<r.end)||rows.at(-1),i=rows.indexOf(row),duration=Math.min(row?.shot.dissolve||.6,(row?.shot.duration||1)/2);
 if(fullBoard||editing&&!animRun&&!storyPlayback&&!presenting||i<1||row.shot.connection!=='dissolve'||cameraTime-row.start>=duration){cinemaRenderContentBase(g,s,w,h,t,fullBoard,editing,p);return}
 const previous=studioCameraOverride,oldRow=rows[i-1];try{
 studioCameraOverride={sceneId:s.id,pose:studioCameraForRow(s,oldRow,cameraTime,rows,p)};cinemaRenderContentBase(g,s,w,h,t,fullBoard,editing,p);
 if(!studioShotCanvas||studioShotCanvas.width!==w||studioShotCanvas.height!==h)studioShotCanvas=makeCanvas(w,h);const out=studioShotCanvas.getContext('2d');out.clearRect(0,0,w,h);studioCameraOverride={sceneId:s.id,pose:studioCameraForRow(s,row,cameraTime,rows,p)};cinemaRenderContentBase(out,s,w,h,t,fullBoard,editing,p);g.save();g.globalAlpha=directorEase((cameraTime-row.start)/duration,'smooth');g.drawImage(studioShotCanvas,0,0);g.restore();
 }finally{studioCameraOverride=previous}
}
function studioLightingAt(s,t,p=studioProject()){if(!p.director?.lighting?.length)return null;const time=studioAbsolute(s,t,p),c=(p.director?.lighting||[]).filter(c=>time>=c.start).sort((a,b)=>b.start-a.start)[0];if(!c)return null;const u=directorEase((time-c.start)/c.duration,'cinematic'),a=STUDIO_LIGHTS[c.from],b=STUDIO_LIGHTS[c.to];return a.map((v,i)=>v+(b[i]-v)*u).map((v,i)=>i===3?v*c.strength:v)}
function studioDrawGlobal(g,s,t,p){const color=studioLightingAt(s,t,p);if(color){g.save();g.fillStyle=`rgba(${color.slice(0,3).map(Math.round)},${color[3]})`;g.fillRect(0,0,W,H);g.restore()}if(!p.director?.musicCues?.length)return;const absolute=studioAbsolute(s,t,p);for(const c of p.director?.musicCues||[]){const dt=absolute-c.time;if(dt<0||dt>=c.duration||c.effect==='none')continue;const u=dt/c.duration,alpha=Math.sin(Math.PI*u)*c.strength;g.save();if(c.effect==='pulse'){g.globalAlpha=alpha*.22;g.fillStyle='#fff2cb';g.fillRect(0,0,W,H)}else if(c.effect==='fade'){g.globalAlpha=alpha;g.fillStyle='#101824';g.fillRect(0,0,W,H)}else if(c.effect==='spotlight'){const gradient=g.createRadialGradient(W/2,H*.45,50,W/2,H*.45,750);gradient.addColorStop(0,'#08102000');gradient.addColorStop(1,movieColor('#081020',alpha*.85));g.fillStyle=gradient;g.fillRect(0,0,W,H)}else if(c.effect==='sparkle'){g.fillStyle='#ffe5a0';g.globalAlpha=alpha;for(let i=0;i<25;i++){const a=movieNoise(i+7)*Math.PI*2,r=(50+u*420)*movieNoise(i+19),x=W/2+Math.cos(a)*r*1.6,y=H/2+Math.sin(a)*r;g.beginPath();g.arc(x,y,3+movieNoise(i)*4,0,Math.PI*2);g.fill()}}g.restore()}}
function studioRemap(s,map){for(const o of s.items)for(const c of o.choreography||[]){c.id=id();c.targetIds=c.targetIds.map(v=>map.get(v)||v)}}
function studioDetach(ids){for(const o of items())if(!ids.includes(o.id)&&o.choreography?.some(c=>c.targetIds.some(v=>ids.includes(v)))){const p=cinemaVisualPose(o,animTime,scene());Object.assign(o,p);o.choreography=o.choreography.filter(c=>!c.targetIds.some(v=>ids.includes(v)))}}
function validateStudio(p){
 const num=(v,a,b,label)=>{if(!Number.isFinite(v)||v<a||v>b)throw Error('Invalid '+label+'.')},arr=(a,max,label)=>{if(a!==undefined&&(!Array.isArray(a)||a.length>max))throw Error('Invalid '+label+'.')};
 arr(p.director?.lighting,100,'lighting track');arr(p.director?.musicCues,500,'music cues');
 const lightIds=new Set(),cueIds=new Set();
 for(const c of p.director?.lighting||[]){if(typeof c.id!=='string'||lightIds.has(c.id))throw Error('Invalid lighting identity.');lightIds.add(c.id);if(!STUDIO_LIGHTS[c.from]||!STUDIO_LIGHTS[c.to])throw Error('Choose a lighting preset.');num(c.start,0,720000,'lighting start');num(c.duration,.2,7200,'lighting duration');num(c.strength,0,1,'lighting strength')}
 for(const c of p.director?.musicCues||[]){if(cueIds.has(c.id))throw Error('Music cue IDs must be unique.');cueIds.add(c.id);if(typeof c.id!=='string'||typeof c.label!=='string'||c.label.length>100||!['none','pulse','fade','sparkle','spotlight'].includes(c.effect))throw Error('Invalid music cue.');num(c.time,0,720000,'cue time');num(c.duration,.1,120,'cue length');num(c.strength,0,1,'cue strength')}
 for(const s of p.scenes){if(s.cinema?.transition?.moving!==undefined&&typeof s.cinema.transition.moving!=='boolean')throw Error('Invalid moving dissolve.');const ids=new Set(s.items.map(o=>o.id));for(const shot of s.cinema?.shots||[]){if(shot.connection!==undefined&&!['cut','continue','dissolve'].includes(shot.connection))throw Error('Invalid shot connection.');if(shot.dissolve!==undefined)num(shot.dissolve,.1,5,'shot dissolve');if(shot.follow?.lookAhead!==undefined)num(shot.follow.lookAhead,0,2,'camera look-ahead')}
 for(const o of s.items){const nested=q=>{for(const child of q.children||[]){if(child.choreography?.length)throw Error('Put choreography on the group, not a nested piece.');nested(child)}};nested(o);if(o.propActions?.length&&o.choreography?.length)throw Error('Use either prop actions or choreography on this piece.');arr(o.choreography,100,'choreography clips');const clipIds=new Set(),clips=[...(o.choreography||[])].sort((a,b)=>a.start-b.start);for(let i=0;i<clips.length;i++){const c=clips[i];if(typeof c.id!=='string'||clipIds.has(c.id)||!STUDIO_MOTIONS[c.preset])throw Error('Invalid choreography clip.');clipIds.add(c.id);num(c.start,0,7199,'choreography start');num(c.duration,.2,7200-c.start,'choreography duration');if(i&&c.start<clips[i-1].start+clips[i-1].duration-1e-7)throw Error('Choreography clips cannot overlap.');if(!Array.isArray(c.targetIds)||c.targetIds.length>30||c.targetIds.some(v=>v===o.id||!ids.has(v))||c.preset!=='freeze'&&!c.targetIds.length)throw Error('Choose another piece as the choreography target.');if(o.attachment&&c.preset!=='scarf')throw Error('Detach this piece before adding travel choreography.');if(c.preset==='scarf'&&!o.attachment)throw Error('Attach the scarf to a hand first.');for(const k of ['radiusX','radiusY'])num(c[k],1,2000,'orbit radius');num(c.turns,.25,20,'orbit turns');num(c.lag,0,10,'follow delay');for(const k of ['offsetX','offsetY'])num(c[k],-3000,3000,'motion offset');for(const k of ['gripX','gripY','tipX','tipY'])num(c[k],0,1,'scarf point');if(Math.hypot(c.tipX-c.gripX,c.tipY-c.gripY)<.01)throw Error('Scarf grip and tip must be different.');for(const k of ['clockwise','autoDepth','hold'])if(typeof c[k]!=='boolean')throw Error('Invalid choreography setting.')}}
 const visiting=new Set(),done=new Set();function visit(o){if(visiting.has(o.id))throw Error('Choreography cannot follow itself in a circle of dependencies.');if(done.has(o.id))return;visiting.add(o.id);for(const key of new Set([o.attachment?.parentId,...(o.choreography||[]).flatMap(c=>c.targetIds)])){const q=s.items.find(x=>x.id===key);if(q)visit(q)}visiting.delete(o.id);done.add(o.id)}s.items.forEach(visit);
 }return p;
}
