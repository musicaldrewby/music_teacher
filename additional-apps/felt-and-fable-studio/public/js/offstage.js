'use strict';
// This view belongs only to the editor. Scene cameras and exported pixels are unchanged.
let offstageEnabled=false,offstageView={x:W/2,y:H/2,zoom:.65},offstageSceneId=null;
let offstagePanMode=false,offstageSpace=false,offstageGesture=null,offstageListSignature='';
function offstageActive(){return offstageEnabled&&!presenting}
function shotCorners(){const p=cameraAt(scene(),animTime);return [[0,0],[W,0],[W,H],[0,H]].map(q=>cameraScreenToWorld(q,p));}
function shotRectangle(){const points=shotCorners(),xs=points.map(q=>q[0]),ys=points.map(q=>q[1]);return{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)}}
function offstageShotPath(g){shotCorners().forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.closePath();}
function viewRectangle(view){return{x:view.x-W/(2*view.zoom),y:view.y-H/(2*view.zoom),w:W/view.zoom,h:H/view.zoom}}
function boxOutside(a,b){return a.x+a.w<b.x||a.x>b.x+b.w||a.y+a.h<b.y||a.y>b.y+b.h}
function boxContained(a,b){return a.x>=b.x&&a.y>=b.y&&a.x+a.w<=b.x+b.w&&a.y+a.h<=b.y+b.h}
function offstagePose(o){return Object.assign(animationTree(o,animTime,true,sceneSeconds(scene())),cinemaVisualPose(o,animTime,scene(),basePose(editPiece(o)),true))}
function fitEditorBoxes(boxes,padding=.82){
 const x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y)),right=Math.max(...boxes.map(b=>b.x+b.w)),bottom=Math.max(...boxes.map(b=>b.y+b.h));
 return{x:(x+right)/2,y:(y+bottom)/2,zoom:Math.max(.02,Math.min(2,W*padding/Math.max(200,right-x),H*padding/Math.max(112.5,bottom-y)))};
}
function offstageBoxes(includePaths=true){
 const boxes=[shotRectangle()];
 for(const o of items()){
  if(o.hidden)continue;boxes.push(bounds([offstagePose(o)]));
  if(!includePaths)continue;
  for(const b of o.animationBlocks||[]){if(blockCategory(b)!=='path')continue;const anchor=pathAnchor(o,b);for(let i=0;i<=24;i++)boxes.push(bounds([{...o,...presetPose(b.preset,anchor,i/24,blockOptions(b))}]))}
  for(const key of o.keyframes||[])boxes.push(bounds([{...o,...key.pose}]));
 }
 return boxes;
}
function editorCamera(){
 if(!offstageActive())return cameraAt(scene(),animTime);
 if(offstageSceneId!==scene().id){offstageSceneId=scene().id;offstageView=fitEditorBoxes(offstageBoxes(false),.65)}
 return offstageView;
}
function setOffstage(on){
 if(!on&&blockPathEditing)endBlockPathEditing();
 offstageEnabled=!!on;offstageGesture=null;offstagePanMode=false;
 if(on){setCameraDragMode(false);offstageSceneId=scene().id;offstageView=fitEditorBoxes(offstageBoxes(false),.65)}
 if(!on)canvas.style.cursor=tool==='select'?'default':'crosshair';syncOffstageUI();draw();
}
function fitOffstageAll(){offstageEnabled=true;offstageSceneId=scene().id;offstageView=fitEditorBoxes(offstageBoxes(true),.78);syncOffstageUI();draw()}
function findSelectedOffstage(){
 const list=items().filter(o=>selected.includes(o.id));if(!list.length)return toast('Select a piece in Layers first, then choose Find selected.');
 offstageEnabled=true;offstageSceneId=scene().id;setCameraDragMode(false);
 offstageView=fitEditorBoxes(list.map(o=>bounds([offstagePose(o)])),.65);offstageView.zoom=Math.min(offstageView.zoom,cameraAt(scene(),animTime).zoom);
 syncOffstageUI();draw();
}
function locateLayerIfOutside(o){
 if(boxOutside(bounds([offstagePose(o)]),viewRectangle(editorCamera())))findSelectedOffstage();
}
function revealDraggedOffstage(){
 if(presenting||blockPathEditing)return;
 const list=items().filter(o=>selected.includes(o.id)&&!o.hidden);if(!list.length)return;
 const view=viewRectangle(editorCamera()),shot=shotRectangle();
 if(list.some(o=>boxOutside(bounds([offstagePose(o)]),offstageActive()?view:shot))){fitOffstageAll();toast('Offstage view: your piece is still here. The gold frame is the video shot.')}
}
function ensurePathWorkspaceVisible(){
 const o=selectedBlockPiece(),b=currentBlock();if(!o||!b)return;
 const anchor=pathAnchor(o,b),boxes=[];for(let i=0;i<=24;i++)boxes.push(bounds([{...o,...presetPose(b.preset,anchor,i/24,blockOptions(b))}]));
 if(boxes.some(box=>!boxContained(box,viewRectangle(editorCamera()))))fitOffstageAll();
}
function zoomOffstage(factor,screen=[W/2,H/2]){
 if(!offstageActive())return;const v=editorCamera(),point=cameraScreenToWorld(screen,v),zoom=Math.max(.02,Math.min(3,v.zoom*factor));
 offstageView={zoom,x:point[0]-(screen[0]-W/2)/zoom,y:point[1]-(screen[1]-H/2)/zoom};syncOffstageUI();draw();
}
let movieOffstageFrame=null;
function drawOffstageScene(g){
 const view=editorCamera(),shot=shotRectangle(),u=1/view.zoom;
 g.save();g.fillStyle='#4a5756';g.fillRect(0,0,W,H);applyCameraTransform(g,view);
 // Backdrop has its original world bounds. The neutral area around it is workspace.
 g.fillStyle=scene().bgColor||'#75a59c';g.fillRect(0,0,W,H);const bg=imageMap.get('bg'+scene().bg)||thumbMap.get('bg'+scene().bg);
 if(scene().bg>=0&&bg)g.drawImage(bg,0,0,W,H);else{g.save();g.globalAlpha=.24;g.fillStyle=g.createPattern(texture,'repeat');g.fillRect(0,0,W,H);g.restore()}
 const r=viewRectangle(view);g.fillStyle='#12212066';g.beginPath();g.rect(r.x,r.y,r.w,r.h);offstageShotPath(g);g.fill('evenodd');
 const duration=sceneSeconds(scene());
 for(const o of cinemaOrderedItems(scene())){
  const pose=animationTree(o,animTime,true,duration);Object.assign(pose,cinemaVisualPose(o,animTime,scene(),basePose(pose)));
  if(selected.includes(o.id)&&(pose.hidden||(pose.opacity??1)<=.02)){
   drawItem(g,{...pose,hidden:false,opacity:.3});const box=bounds([pose]);g.save();g.strokeStyle='#f8d77b';g.lineWidth=1.5*u;g.setLineDash([6*u,5*u]);g.strokeRect(box.x,box.y,box.w,box.h);g.restore();
   g.fillStyle='#fff7db';g.font=`${13*u}px system-ui`;g.fillText(o.name+' · '+(o.hidden?'hidden':'invisible at this time'),box.x,box.y-8*u);
  }else{drawItem(g,pose);}
 }
 // Render the actual cinematic result inside the video frame while preserving offstage handles.
 if(movieClips(scene()).length||scene().cinema?.grade||cineFinishActive(state.filmFinish)||cameraAt(scene(),animTime).roll){movieOffstageFrame??=makeCanvas(W,H);const m=movieOffstageFrame.getContext('2d');m.clearRect(0,0,W,H);drawScene(m,scene(),W,H,animTime,false,true);const p=cameraAt(scene(),animTime);g.save();g.translate(p.x,p.y);g.rotate((p.roll||0)*Math.PI/180);g.drawImage(movieOffstageFrame,-W/(2*p.zoom),-H/(2*p.zoom),W/p.zoom,H/p.zoom);g.restore()}
 // The frame stays visible over cutouts crossing its edge.
 g.strokeStyle='#ffe29a';g.lineWidth=3*u;g.beginPath();offstageShotPath(g);g.stroke();
 const label='VIDEO FRAME',x=shot.x+8*u,y=shot.y+7*u;g.font=`bold ${13*u}px system-ui`;g.fillStyle='#18302ae6';g.fillRect(x,y,108*u,22*u);g.fillStyle='#ffe8ad';g.fillText(label,x+6*u,y+16*u);
 g.restore();
}
function syncOffstageUI(){
 if(!$('toggleOffstage'))return;
 const active=offstageActive();$('toggleOffstage').setAttribute('aria-pressed',String(active));$('toggleOffstage').classList.toggle('active',active);$('offstageControls').hidden=!active;
 document.body.classList.toggle('offstage-open',active);$('offstageZoomValue').textContent=Math.round(editorCamera().zoom*100)+'%';
 $('offstagePan').setAttribute('aria-pressed',String(offstagePanMode));$('offstagePan').textContent=offstagePanMode?'Done panning':'Pan view';$('offstageFind').disabled=!selected.length;
 if(active&&!blockPathEditing&&!cameraDragMode)canvas.style.cursor=offstageGesture?'grabbing':offstagePanMode||offstageSpace?'grab':tool==='select'?'default':'crosshair';
 // Rebuild only when the list changes, so keyboard selection is stable.
 if(!active)return;
 const shot=shotRectangle(),list=items().filter(o=>boxOutside(bounds([offstagePose(o)]),shot)),signature=JSON.stringify(list.map(o=>[o.id,o.name,o.hidden]));
 if(signature!==offstageListSignature){offstageListSignature=signature;const select=$('offstagePieces');select.replaceChildren();const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=list.length?'Find offscreen piece ('+list.length+')…':'No offscreen pieces';select.append(placeholder);
  for(const o of list){const option=document.createElement('option');option.value=o.id;option.textContent=o.name+(o.hidden?' (hidden)':'');select.append(option)}select.value='';select.disabled=!list.length;
 }
}
function offstagePanDown(e){
 if(!offstageActive()||presenting||animRun||storyPlayback||cameraDragMode||(!offstagePanMode&&!offstageSpace&&e.button!==1)||![0,1].includes(e.button))return;
 if(blockPathEditing&&pathGesture)return;e.preventDefault();e.stopImmediatePropagation();offstageGesture={pointer:e.pointerId,x:e.clientX,y:e.clientY,view:{...editorCamera()}};canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';
}
function offstagePanMove(e){
 const d=offstageGesture;if(!d||d.pointer!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();const r=canvas.getBoundingClientRect();offstageView={...d.view,x:d.view.x-(e.clientX-d.x)*W/r.width/d.view.zoom,y:d.view.y-(e.clientY-d.y)*H/r.height/d.view.zoom};draw();
}
function offstagePanEnd(e){
 const d=offstageGesture;if(!d||d.pointer!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();offstageGesture=null;
 if(e.type==='pointercancel')offstageView=d.view;if(canvas.hasPointerCapture?.(e.pointerId))canvas.releasePointerCapture(e.pointerId);syncOffstageUI();draw();
}
function initOffstage(){
 $('toggleOffstage').onclick=()=>setOffstage(!offstageEnabled);$('offstageClose').onclick=()=>setOffstage(false);$('offstageFit').onclick=fitOffstageAll;$('offstageFind').onclick=findSelectedOffstage;
 $('offstageZoomOut').onclick=()=>zoomOffstage(1/1.25);$('offstageZoomIn').onclick=()=>zoomOffstage(1.25);
 $('offstagePan').onclick=()=>{setCameraDragMode(false);offstagePanMode=!offstagePanMode;syncOffstageUI()};
 $('offstagePieces').onchange=e=>{const o=items().find(o=>o.id===e.target.value);if(!o)return;selected=[o.id];refreshSelection();findSelectedOffstage();e.target.value=''};
 canvas.addEventListener('pointerdown',offstagePanDown,true);canvas.addEventListener('pointermove',offstagePanMove,true);canvas.addEventListener('pointerup',offstagePanEnd,true);canvas.addEventListener('pointercancel',offstagePanEnd,true);canvas.addEventListener('lostpointercapture',offstagePanEnd,true);
 canvas.addEventListener('dblclick',e=>{if(offstageActive()&&(offstagePanMode||offstageSpace)){e.preventDefault();e.stopImmediatePropagation()}},true);
 canvas.addEventListener('wheel',e=>{if(!offstageActive()||cameraDragMode||drag||pathGesture||offstageGesture||animRun||storyPlayback)return;e.preventDefault();const r=canvas.getBoundingClientRect();zoomOffstage(Math.exp(-Math.max(-100,Math.min(100,e.deltaY))*.002),[(e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height])},{passive:false});
 document.addEventListener('keydown',e=>{if(!offstageActive()||e.code!=='Space'||['INPUT','TEXTAREA','SELECT','BUTTON','SUMMARY'].includes(e.target.tagName)||document.querySelector('dialog[open]'))return;e.preventDefault();offstageSpace=true;syncOffstageUI()},true);
 document.addEventListener('keyup',e=>{if(e.code==='Space'){offstageSpace=false;syncOffstageUI()}},true);
 window.addEventListener('blur',()=>{offstageSpace=false;if(offstageGesture){offstageView=offstageGesture.view;offstageGesture=null}syncOffstageUI()});
 syncOffstageUI();
}
