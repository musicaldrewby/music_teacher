'use strict';
// Editor-only workspace controls. Drawn routes stay in a single animation block.
let animationPanelSize='compact',animationTab='timeline',pathPanelBefore='compact';
let pathEditingBlockId=null,pathDrawMode=false;
const drawnPathLengths=new WeakMap();
function drawnPathPoint(points,u){
 let data=drawnPathLengths.get(points);
 if(!data){const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));data={lengths,total:lengths.at(-1)};drawnPathLengths.set(points,data)}
 if(u<=0||!data.total)return points[0];if(u>=1)return points.at(-1);
 const distance=u*data.total;let i=1;while(i<data.lengths.length-1&&data.lengths[i]<distance)i++;
 const f=(distance-data.lengths[i-1])/Math.max(.000001,data.lengths[i]-data.lengths[i-1]),a=points[i-1],b=points[i];return [a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f];
}
function setAnimationPanelSize(size){
 animationPanelSize=size;$('animationPanel').dataset.size=size;
 $('animationMinimize').textContent=size==='minimized'?'Restore':'Minimize';$('animationMinimize').setAttribute('aria-expanded',String(size!=='minimized'));
 $('animationExpand').textContent=size==='expanded'?'Compact':'Expand';$('animationExpand').setAttribute('aria-pressed',String(size==='expanded'));
 $('animationContent').hidden=size==='minimized';requestAnimationFrame(()=>{fit();updateTimelineLayout()});
}
function setAnimationTab(tab){
 animationTab=tab;$('animationTimelineView').hidden=false;$('animationSettingsView').hidden=false;
 $('animationTimelineTab').setAttribute('aria-pressed',String(tab==='timeline'));$('animationSettingsTab').setAttribute('aria-pressed',String(tab==='settings'));
 if(tab==='settings'&&studioUIReady){$('cameraPanel').open=false;setCameraDragMode(false);revealStudioInspector();$('propertiesPanel').scrollTop=0}
 if(animationPanelSize==='minimized'&&!blockPathEditing)setAnimationPanelSize('compact');updateTimelineLayout();
}

function pathEditorPose(o){if(!animOpen||!blockPathEditing||presenting||animRun||storyPlayback)return null;const b=currentBlock();return b&&b.id===pathEditingBlockId&&selectedBlockPiece()===o?{...pathAnchor(o,b),opacity:Math.max(.5,o.opacity??1)}:null}
function syncPathWorkspace(){
 const active=animOpen&&blockPathEditing&&!presenting&&!animRun&&!storyPlayback;
 $('pathWorkspace').hidden=!active;canvas.classList.toggle('drawing-motion-path',active&&pathDrawMode);if(active)canvas.style.cursor=pathDrawMode?'crosshair':'default';else if(tool==='select'&&!cameraDragMode)canvas.style.cursor='default';
 $('pathDrawMode').setAttribute('aria-pressed',String(pathDrawMode));$('pathCurveMode').setAttribute('aria-pressed',String(!pathDrawMode&&!currentBlock()?.points));
 $('pathInstructions').textContent=pathDrawMode?'Drag from the Start circle to draw your route. Release to finish. Escape cancels the stroke.':currentBlock()?.points?'Route saved. Drag Start or End to adjust it, or choose Draw route to redraw. Done returns to the timeline.':'Drag Start to move the route, Bend to shape it, or End to choose the destination. Done returns to the timeline.';
}
function beginBlockPathEditing(mode='curve'){
 const o=selectedBlockPiece(),b=currentBlock();if(!blockEditable(o)||!b||blockCategory(b)!=='path'||(mode!=='draw'&&b.preset!=='path-custom'))return;
 stopAnimationPreview();stopStoryPlayback();setCameraDragMode(false);setTool('select');
 if(!blockPathEditing)pathPanelBefore=animationPanelSize;
 blockPathEditing=true;pathEditingBlockId=b.id;pathDrawMode=mode==='draw';blockRestEditing=false;animTime=b.start;offstagePanMode=false;ensurePathWorkspaceVisible();
 document.body.classList.remove('mobile-properties','mobile-collection');
 setAnimationPanelSize('minimized');renderAnimationUI();draw();syncWorkspaceChrome();requestAnimationFrame(fit);
}
function endBlockPathEditing(render=true){
 if(pathGesture)cancelPathGesture();const was=blockPathEditing;blockPathEditing=false;pathEditingBlockId=null;pathDrawMode=false;
 if(was)setAnimationPanelSize(pathPanelBefore);syncPathWorkspace();
 if(render){setAnimationTab('timeline');renderAnimationUI();draw();requestAnimationFrame(fit)}
}
function toggleBlockPath(){
 const o=selectedBlockPiece(),b=currentBlock();if(!blockEditable(o)||!b||blockCategory(b)!=='path')return;
 if(blockPathEditing){endBlockPathEditing();return}
 if(b.preset!=='path-custom'){
  const zero={x:0,y:0,w:1,h:1,rotation:0,opacity:1},end=presetPose(b.preset,zero,1,blockOptions(b)),mid=presetPose(b.preset,zero,.5,blockOptions(b));
  const blocks=copy(o.animationBlocks),c=blocks.find(c=>c.id===b.id);c.preset='path-custom';c.path=Math.hypot(end.x,end.y)<1?[125,-150,250,0]:[mid.x*2-end.x*.5,mid.y*2-end.y*.5,end.x,end.y];delete c.points;c.loop='none';
  if(!commitBlocks(o,blocks))return;toast('Custom curve enabled. Undo restores the preset.');
 }
 beginBlockPathEditing('curve');
}
function startDrawingObjectPath(){
 const o=selectedBlockPiece();if(!blockEditable(o))return;
 let b=currentBlock();if(!b||blockCategory(b)!=='path'){
  const start=frameTime(animTime),next=(o.animationBlocks||[]).filter(c=>blockCategory(c)==='path'&&c.start>start).sort((a,b)=>a.start-b.start)[0];
  const duration=frameTime(Math.min(3,7199-start,next?next.start-start:3));if(duration<.2)return toast('Move the playhead earlier to leave room for a path.');
  b={id:id(),preset:'path-custom',start,duration,strength:1,distance:250,direction:0,repeats:1,ease:'linear',loop:'none',path:[0,0,0,0]};
  // No displacement until a stroke is drawn; no keyframes are generated.
  if(!commitBlocks(o,[...(o.animationBlocks||[]),b]))return;selectedBlockId=b.id;
 }
 beginBlockPathEditing('draw');
}
function useSimpleCurve(){
 const o=selectedBlockPiece(),b=currentBlock();if(!blockEditable(o)||!b)return;
 if(b.preset!=='path-custom'||b.points||!b.path||Math.hypot(b.path[2],b.path[3])<1){
  const end=b.points?.at(-1)||[250,0],blocks=copy(o.animationBlocks),c=blocks.find(c=>c.id===b.id);
  c.preset='path-custom';c.loop='none';c.path=[end[0]/2,end[1]/2-120,end[0],end[1]];delete c.points;if(!commitBlocks(o,blocks))return;
 }
 pathDrawMode=false;syncPathWorkspace();draw();
}
function pathHandles(o,b){
 const p=pathAnchor(o,b),end=b.points?.at(-1);if(end)return [[p.x,p.y,'Start',0],[p.x+end[0],p.y+end[1],'End',2]];
 const [cx,cy,ex,ey]=b.path||[125,-125,250,0];return [[p.x,p.y,'Start',0],[p.x+cx,p.y+cy,'Bend',1],[p.x+ex,p.y+ey,'End',2]];
}
function drawBlockPath(g){
 if(!blockPathEditing){drawSelectedMotionRoute(g);return}const o=selectedBlockPiece(),b=currentBlock();if(!animOpen||!blockPathEditing||!o||!b||b.id!==pathEditingBlockId||presenting||animRun||storyPlayback)return;
 const p=pathAnchor(o,b),u=screenUnit(),pts=pathGesture?.kind==='draw'?pathGesture.points:b.points;
 g.save();g.lineWidth=3*u;g.strokeStyle='#12665e';g.setLineDash([7*u,5*u]);g.beginPath();g.moveTo(p.x,p.y);
 if(pts)for(const pt of pts)g.lineTo(p.x+pt[0],p.y+pt[1]);else {const [cx,cy,ex,ey]=b.path||[0,0,0,0];g.quadraticCurveTo(p.x+cx,p.y+cy,p.x+ex,p.y+ey)}g.stroke();g.setLineDash([]);
 const handles=pathHandles(o,b);
 if(!pts&&!pathDrawMode){g.strokeStyle='#b18538';g.lineWidth=u;g.beginPath();handles.forEach((h,i)=>i?g.lineTo(h[0],h[1]):g.moveTo(h[0],h[1]));g.stroke()}
 for(const h of pathDrawMode?handles.slice(0,1):handles){
  g.lineWidth=2*u;g.strokeStyle='#174e46';g.beginPath();g.arc(h[0],h[1],h[3]===0?11*u:9*u,0,Math.PI*2);g.fillStyle=h[3]===1?'#ffd677':'#fffefa';g.fill();g.stroke();
  g.font=`bold ${12*u}px system-ui`;g.lineWidth=4*u;g.strokeStyle='#fffefa';g.strokeText(h[2],h[0]+15*u,h[1]-12*u);g.fillStyle='#163e39';g.fillText(h[2],h[0]+15*u,h[1]-12*u);
 }
 g.restore();
}
function blockPathDown(e){
 if(!animOpen||!blockPathEditing||e.button!==0||!blockEditable()||pathGesture)return;
 const o=selectedBlockPiece(),b=currentBlock();if(!b||b.id!==pathEditingBlockId)return;
 e.preventDefault();e.stopImmediatePropagation();const pt=pos(e),anchor=pathAnchor(o,b),handles=pathHandles(o,b),h=handles.find(h=>Math.hypot(h[0]-pt[0],h[1]-pt[1])<20*screenUnit());
 if(pathDrawMode&&Math.hypot(anchor.x-pt[0],anchor.y-pt[1])>=24*screenUnit()){toast('Start at the white Start circle, then drag to draw your route.');return}
 if(!pathDrawMode&&!h){toast('Drag a labeled handle, or choose Draw route above the board.');return}
 pathGesture={pointerId:e.pointerId,kind:pathDrawMode?'draw':'handle',o,b,handle:h?.[3],anchor,home:basePose(o),start:pt,before:copy(o),points:[[0,0]]};canvas.setPointerCapture(e.pointerId);
}
function blockPathMove(e){
 const g=pathGesture;if(!g||g.pointerId!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();
 if(g.kind==='draw'){
  for(const event of (e.getCoalescedEvents?.().length?e.getCoalescedEvents():[e])){
   const pt=pos(event),point=[motionClamp(pt[0]-g.anchor.x,-12000,12000),motionClamp(pt[1]-g.anchor.y,-12000,12000)],last=g.points.at(-1);
   if(Math.hypot(point[0]-last[0],point[1]-last[1])>=2*screenUnit())g.points.push(point);
   if(g.points.length>2048)g.points=g.points.filter((p,i)=>i===0||i===g.points.length-1||i%2===0);
  }
 }else{
  const pt=pos(e);
  if(g.handle===0){const x=g.home.x+pt[0]-g.start[0],y=g.home.y+pt[1]-g.start[1];offsetKeys(g.o,x-g.o.x,y-g.o.y);g.o.x=x;g.o.y=y}
  else if(g.b.points){const points=copy(g.b.points);points[points.length-1]=[motionClamp(pt[0]-g.anchor.x,-12000,12000),motionClamp(pt[1]-g.anchor.y,-12000,12000)];g.b.points=points}
  else{const i=(g.handle-1)*2;g.b.path[i]=motionClamp(pt[0]-g.anchor.x,-12000,12000);g.b.path[i+1]=motionClamp(pt[1]-g.anchor.y,-12000,12000)}
 }
 draw();
}
function compactDrawnPath(points){
 // Preserve hand-drawn corners; reduce only points close to a straight segment.
 function simplify(list,tolerance){const keep=new Set([0,list.length-1]),stack=[[0,list.length-1]];
  while(stack.length){const [a,b]=stack.pop(),p=list[a],q=list[b],dx=q[0]-p[0],dy=q[1]-p[1],den=dx*dx+dy*dy;let best=tolerance*tolerance,index=-1;
   for(let i=a+1;i<b;i++){const v=list[i],t=den?motionClamp(((v[0]-p[0])*dx+(v[1]-p[1])*dy)/den,0,1):0,d=(v[0]-p[0]-t*dx)**2+(v[1]-p[1]-t*dy)**2;if(d>best){best=d;index=i}}
   if(index>=0){keep.add(index);stack.push([a,index],[index,b])}
  }return [...keep].sort((a,b)=>a-b).map(i=>list[i]);
 }
 let tolerance=Math.max(1,screenUnit()),result=simplify(points,tolerance);while(result.length>256){tolerance*=1.5;result=simplify(points,tolerance)}return result.map(p=>p.map(n=>Math.round(n*100)/100));
}
function cancelPathGesture(){
 const g=pathGesture;if(!g)return;pathGesture=null;if(g.kind==='handle')Object.assign(g.o,g.before);
 if(canvas.hasPointerCapture?.(g.pointerId))canvas.releasePointerCapture(g.pointerId);draw();
}
function blockPathEnd(e){
 const g=pathGesture;if(!g||g.pointerId!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();
 if(e.type==='pointercancel'||e.type==='lostpointercapture'){cancelPathGesture();renderBlockUI();return}
 if(g.kind==='draw')blockPathMove(e);pathGesture=null;if(canvas.hasPointerCapture?.(e.pointerId))canvas.releasePointerCapture(e.pointerId);
 if(g.kind==='draw'){
  const points=compactDrawnPath(g.points),length=points.reduce((n,p,i)=>n+(i?Math.hypot(p[0]-points[i-1][0],p[1]-points[i-1][1]):0),0);
  if(length<8*screenUnit()){toast('Drag farther to draw a route. Your previous path is unchanged.');draw();return}
  const blocks=copy(g.o.animationBlocks),b=blocks.find(b=>b.id===g.b.id);b.preset='path-custom';b.points=points;delete b.path;b.loop='none';b.repeats=1;
  if(commitBlocks(g.o,blocks,'Route saved as one animation block. Click Done, then Play scene.'))pathDrawMode=false;
 }else{
  const after=copy(g.o);Object.assign(g.o,g.before);if(JSON.stringify(after)!==JSON.stringify(g.before)){checkpoint();Object.assign(g.o,after)}refresh();
 }
 ensurePathWorkspaceVisible();syncPathWorkspace();draw();
}
function initAnimationWorkspace(){
 setAnimationPanelSize('compact');setAnimationTab('timeline');
 $('animationMinimize').onclick=()=>setAnimationPanelSize(animationPanelSize==='minimized'?'compact':'minimized');
 $('animationExpand').onclick=()=>setAnimationPanelSize(animationPanelSize==='expanded'?'compact':'expanded');
 $('animationTimelineTab').onclick=()=>{if(blockPathEditing)endBlockPathEditing();setAnimationTab('timeline')};
 $('animationSettingsTab').onclick=()=>{if(blockPathEditing)endBlockPathEditing();setAnimationTab('settings')};
 $('drawObjectPath').onclick=startDrawingObjectPath;$('pathDrawMode').onclick=()=>{cancelPathGesture();pathDrawMode=true;syncPathWorkspace();draw()};$('pathCurveMode').onclick=useSimpleCurve;
 $('pathDone').onclick=()=>endBlockPathEditing();$('pathPlay').onclick=()=>{const b=currentBlock();endBlockPathEditing();if(b)animTime=b.start;playAnimationSlide()};
 canvas.addEventListener('pointerdown',blockPathDown,true);canvas.addEventListener('pointermove',blockPathMove,true);canvas.addEventListener('pointerup',blockPathEnd,true);canvas.addEventListener('pointercancel',blockPathEnd,true);canvas.addEventListener('lostpointercapture',blockPathEnd,true);
 document.addEventListener('keydown',e=>{if(!blockPathEditing||e.key!=='Escape')return;e.preventDefault();e.stopImmediatePropagation();if(pathGesture){cancelPathGesture();syncPathWorkspace()}else endBlockPathEditing()},true);
}
