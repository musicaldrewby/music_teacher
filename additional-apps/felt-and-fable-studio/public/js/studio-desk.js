'use strict';
// Private production additions. Saved fields are optional; old films keep their timing.
function deskActorTime(o,t,s,seen=new Set()){
 if(!o||seen.has(o.id))return t;seen.add(o.id);
 const action=(o.propActions||[]).filter(a=>a.start<=t).sort((a,b)=>a.start-b.start).at(-1);
 const owner=o.attachment?.parentId||(action&&action.kind!=='putdown'?action.actorId:null);
 const parent=s?.items?.find(q=>q.id===owner);
 if(parent&&(!o.attachment||o.attachment.release==null||t<o.attachment.release))return deskActorTime(parent,t,s,seen);
 const fps=o.feltMotion?.fps||0;
 return fps?Math.floor(Math.max(0,t)*fps+1e-7)/fps:t;
}
function deskRectContains(r,p,epsilon=0){return p.x>r.x+epsilon&&p.x<r.x+r.w-epsilon&&p.y>r.y+epsilon&&p.y<r.y+r.h-epsilon;}
function deskSegmentBlocked(a,b,r){
 // Slab intersection with an open rectangle. A route may touch a boundary.
 let lo=0,hi=1;
 for(const axis of ['x','y']){const d=b[axis]-a[axis],min=r[axis]+1e-5,max=r[axis]+r[axis==='x'?'w':'h']-1e-5;
  if(Math.abs(d)<1e-9){if(a[axis]<=min||a[axis]>=max)return false;continue;}
  let u=(min-a[axis])/d,v=(max-a[axis])/d;if(u>v)[u,v]=[v,u];lo=Math.max(lo,u);hi=Math.min(hi,v);if(lo>=hi)return false;
 }return hi>0&&lo<1;
}
function deskPlanRoute(stage,from,to,clearance=30){
 const area=stage?.walkArea||{x:0,y:0,w:1600,h:900};
 const inside=p=>p.x>=area.x+clearance&&p.x<=area.x+area.w-clearance&&p.y>=area.y+clearance&&p.y<=area.y+area.h-clearance;
 const obstacles=(stage?.obstacles||[]).map(r=>({x:r.x-clearance,y:r.y-clearance,w:r.w+2*clearance,h:r.h+2*clearance}));
 if(!inside(from)||!inside(to))throw Error('Both foot positions must fit inside the walking area, including clearance.');
 if(obstacles.some(r=>deskRectContains(r,from)||deskRectContains(r,to)))throw Error('A foot position is inside an obstacle. Move it or reduce clearance.');
 const nodes=[{...from},{...to}];for(const r of obstacles)for(const p of [{x:r.x,y:r.y},{x:r.x+r.w,y:r.y},{x:r.x+r.w,y:r.y+r.h},{x:r.x,y:r.y+r.h}])if(inside(p)&&!obstacles.some(q=>deskRectContains(q,p)))nodes.push(p);
 const distance=nodes.map(()=>Infinity),previous=nodes.map(()=>-1),visited=new Set();distance[0]=0;
 for(let step=0;step<nodes.length;step++){
  let u=-1;for(let i=0;i<nodes.length;i++)if(!visited.has(i)&&(u<0||distance[i]<distance[u]))u=i;
  if(u<0||!Number.isFinite(distance[u]))break;if(u===1)break;visited.add(u);
  for(let v=0;v<nodes.length;v++)if(v!==u&&!visited.has(v)&&!obstacles.some(r=>deskSegmentBlocked(nodes[u],nodes[v],r))){const d=distance[u]+Math.hypot(nodes[u].x-nodes[v].x,nodes[u].y-nodes[v].y);if(d<distance[v]){distance[v]=d;previous[v]=u;}}
 }
 if(!Number.isFinite(distance[1]))throw Error('No clear route fits. Widen the walking area or move an obstacle.');
 const points=[];for(let at=1;at!==-1;at=previous[at])points.unshift(nodes[at]);return points;
}
function deskRoutePose(o,t,p){
 const r=o.feltRoute;if(!r)return p;
 const u=directorEase(Math.max(0,Math.min(1,(t-r.start)/r.duration)),r.easing||'smooth'),points=r.points;
 const lengths=points.slice(1).map((q,i)=>Math.hypot(q.x-points[i].x,q.y-points[i].y)),total=lengths.reduce((a,b)=>a+b,0);let left=u*total,index=0;
 while(index<lengths.length-1&&left>lengths[index])left-=lengths[index++];const a=points[index],b=points[index+1]||a,f=lengths[index]?left/lengths[index]:0;
 const moving=t>=r.start&&t<r.start+r.duration,bob=moving&&r.gait==='walk'?-Math.abs(Math.sin((t-r.start)*Math.PI*3))*4:0;
 return{...p,x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f-p.h*.48+bob};
}
function deskNewShot(s,p=state){return{id:id(),name:'Establish the scene',duration:sceneSeconds(s,p),from:cameraClamp(),to:cameraClamp(),move:false,connection:'cut',easing:'cinematic'};}
function deskOperation(p,op){
 if(!['setFeltMotion','setStage','setRoute','editShot','splitShot','removeShot','setFilmBrief'].includes(op.op))return false;
 if(op.op==='setFilmBrief'){p.filmBrief={logline:String(op.logline||'').slice(0,1000),notes:String(op.notes||'').slice(0,6000)};return true;}
 const s=p.scenes.find(s=>s.id===op.sceneId);if(!s)throw Error('Choose a scene.');const o=s.items.find(o=>o.id===op.pieceId);
 if(op.op==='setFeltMotion'){if(!o||o.locked)throw Error('Choose an unlocked piece.');o.feltMotion={fps:Number(op.fps)};return true;}
 if(op.op==='setStage'){
  s.feltStage=op.stage===null?undefined:copy(op.stage);deskValidateStage(s.feltStage);
  for(const actor of s.items)if(actor.feltRoute){const r=actor.feltRoute;r.points=deskPlanRoute(s.feltStage,r.from,r.to,r.clearance);}return true;
 }
 if(op.op==='setRoute'){
  if(!o||o.locked)throw Error('Choose an unlocked piece.');if(op.route===null){delete o.feltRoute;return true;}
  if(o.attachment||o.contact||o.propActions?.length||o.choreography?.length||o.storyActions?.length||o.animationBlocks?.length||o.keyframes?.length||reuseHas(o,s))throw Error('Remove this piece’s existing travel, contact, or saved performance before adding a route. Acting and held props can remain.');
  const r=copy(op.route);r.start=Number(r.start);r.duration=Number(r.duration);r.clearance=Number(r.clearance??30);r.gait??='glide';r.easing??='smooth';
  for(const q of [r.from,r.to]){if(!q)throw Error('Choose start and finish foot positions.');productionNumber(q.x,-12000,12000,'foot X');productionNumber(q.y,-12000,12000,'foot Y');}
  productionNumber(r.clearance,0,300,'foot clearance');r.points=deskPlanRoute(s.feltStage,r.from,r.to,r.clearance);o.feltRoute=r;return true;
 }
 cineEnsureShots(s,p);
 const rows=cinemaRows(s),row=rows.find(r=>r.shot.id===op.shotId)||(!op.shotId?rows[0]:null);if(!row)throw Error('Choose a camera shot.');const index=rows.indexOf(row),shots=s.cinema.shots;
 if(op.op==='editShot'){
  if(op.name!==undefined)row.shot.name=productionText(op.name,80,'shot name');
  if(op.notes!==undefined)row.shot.notes=String(op.notes).slice(0,2000);
  if(op.duration!==undefined){const duration=Math.round(productionNumber(Number(op.duration),.2,7200,'shot length')*60)/60,delta=duration-row.shot.duration,next=shots[index+1];
   if(Math.abs(delta)>1e-6){if(!next||next.duration-delta<.2)throw Error('This change needs room in the next shot. Adjust scene length in Film, or select an earlier shot.');next.duration-=delta;row.shot.duration=duration;}}
  const motionChanged=['from','to'].some(k=>op[k]&&JSON.stringify(cameraClamp({...row.shot[k],...op[k]}))!==JSON.stringify(row.shot[k]))||op.easing!==undefined&&op.easing!==row.shot.easing||op.move!==undefined&&op.move!==row.shot.move;
  if(motionChanged){delete row.shot.cameraSegment;delete row.shot.lockCamera;}
  for(const key of ['from','to'])if(op[key])row.shot[key]=cameraClamp({...row.shot[key],...op[key]});
  if(op.move!==undefined)row.shot.move=!!op.move;if(op.easing)row.shot.easing=op.easing;
  if(!row.shot.move)row.shot.to=copy(row.shot.from);
 }else if(op.op==='splitShot'){
  const local=Number(op.time);if(!Number.isFinite(local)||local-row.start<.2||row.end-local<.2)throw Error('Split at least 0.2 seconds from either end of the shot.');
  const motionSource=copy(row.shot);if(row.shot.connection==='continue'&&!row.shot.cameraSegment)motionSource.from=studioCameraForRow(s,row,row.start,rows,p);if(row.shot.follow){row.shot.follow.originStart??=row.start;row.shot.follow.originEnd??=row.end;}
  const split=studioCameraForRow(s,row,local,rows,p),tail=copy(row.shot);tail.id=id();tail.name=(tail.name+' · next').slice(0,80);tail.duration=row.end-local;tail.from=split;tail.connection='cut';
  const fraction=(local-row.start)/row.shot.duration;tail.cameraSegment=cineSliceMotion(motionSource,fraction,1);const head=cineSliceMotion(motionSource,0,fraction);row.shot.cameraSegment=head;
  row.shot.duration=local-row.start;row.shot.to=split;shots.splice(index+1,0,tail);
 }else{if(shots.length===1)throw Error('Keep at least one shot.');const recipient=shots[index+1]||shots[index-1];recipient.duration+=row.shot.duration;shots.splice(index,1);}
 return true;
}
function deskValidateStage(stage){if(!stage)return;const rect=r=>{if(!r)throw Error('Missing stage rectangle.');for(const k of ['x','y'])productionNumber(r[k],0,k==='x'?1600:900,'stage '+k);productionNumber(r.w,1,1600,'stage width');productionNumber(r.h,1,900,'stage height');if(r.x+r.w>1600||r.y+r.h>900)throw Error('Keep stage rectangles inside the 1600 × 900 board.');};rect(stage.walkArea);if(!Array.isArray(stage.obstacles)||stage.obstacles.length>24)throw Error('Use at most 24 obstacles.');stage.obstacles.forEach(rect);}
function deskValidate(p){
 for(const s of p.scenes){deskValidateStage(s.feltStage);for(const shot of s.cinema?.shots||[])if(shot.notes!==undefined&&(typeof shot.notes!=='string'||shot.notes.length>2000))throw Error('Shot notes are too long.');
  const walk=o=>{if(o.feltMotion&&![0,8,12,15,24].includes(o.feltMotion.fps))throw Error('Choose smooth, 8, 12, 15, or 24 poses per second.');
   if(o.feltRoute){const r=o.feltRoute;if(o.attachment||o.contact||o.propActions?.length||o.choreography?.length||o.storyActions?.length||o.animationBlocks?.length||o.keyframes?.length||reuseHas(o,s))throw Error('A planned route cannot share another travel system.');
    productionNumber(r.start,0,7199,'route start');productionNumber(r.duration,.2,7200-r.start,'route duration');productionNumber(r.clearance,0,300,'clearance');if(!['glide','walk','rigid'].includes(r.gait)||!['smooth','linear','cinematic'].includes(r.easing))throw Error('Invalid route movement.');
    if(!Array.isArray(r.points)||r.points.length<2||r.points.length>100)throw Error('Invalid route points.');const expected=deskPlanRoute(s.feltStage,r.from,r.to,r.clearance);if(JSON.stringify(expected)!==JSON.stringify(r.points))throw Error('Route no longer matches the stage. Replan it.');
   }o.children?.forEach(walk);};s.items.forEach(walk);
 }return p;
}
function deskShotRows(p=state){return storyTimeline(p).flatMap(r=>{const shots=cinemaRows(r.scene).filter(q=>q.start<r.duration);if(shots.length)shots.at(-1).end=r.duration;return(shots.length?shots:[{shot:{id:null,name:'Full scene',from:cameraBaseAt(r.scene,0),to:cameraBaseAt(r.scene,r.duration),move:!!r.scene.camera?.keys?.length},start:0,end:r.duration}]).map(q=>({sceneId:r.scene.id,sceneName:r.scene.name,shotId:q.shot.id,name:q.shot.name,start:r.start+q.start,end:r.start+q.end,localStart:q.start,localEnd:q.end,notes:q.shot.notes||'',shot:q.shot}));});}
function deskCompactPlan(p=state){const plan=directorExportPlan(p);plan.custom=[];const artwork=new Set();for(const s of plan.scenes)for(const key of sceneAssetIds(s))artwork.add(key);plan.imports=Object.fromEntries(Object.entries(plan.imports||{}).filter(([key])=>artwork.has(key)));const audio=new Set([plan.music?.assetId,...plan.scenes.map(s=>s.narration?.assetId),...plan.scenes.flatMap(s=>(s.cues||[]).map(c=>c.assetId))]);plan.audioAssets=Object.fromEntries(Object.entries(plan.audioAssets||{}).filter(([key])=>audio.has(key)));return plan;}
function deskReview(p=state){const notes=[];for(const s of p.scenes){const zoom=Math.max(1,...(s.cinema?.shots||[]).flatMap(q=>[q.from?.zoom||1,q.to?.zoom||1]));const bg=imageMap.get('bg'+s.bg);if(bg&&bg.width<1920*zoom*.85)notes.push({sceneId:s.id,message:s.name+': the closest camera shot enlarges the background beyond its native resolution. Use sharper artwork or a wider shot.'});for(const o of s.items){const im=imageMap.get(o.asset),need=o.w/1600*1920*zoom;if(im&&o.type==='asset'&&im.width<need*.8)notes.push({sceneId:s.id,message:o.name+': close-up may soften this artwork.'});}}return notes;}
window.FeltStudioDesk={version:1,apply:directorApplyActions,planRoute:deskPlanRoute,exportPlan:deskCompactPlan,summary:()=>({revision:directorRevision(),brief:copy(state.filmBrief||{}),shots:deskShotRows().map(({shot,...r})=>r),stages:state.scenes.map(s=>({sceneId:s.id,stage:copy(s.feltStage||null),pieces:s.items.filter(o=>o.feltMotion||o.feltRoute).map(o=>({id:o.id,motion:copy(o.feltMotion||null),route:copy(o.feltRoute||null)}))}))}),review:deskReview};
