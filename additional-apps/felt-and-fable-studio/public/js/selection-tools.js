'use strict';
// HTML controls sit over the editing workspace; they never enter canvas exports.
window.FeltSelection=(()=>{
 let initialized=false,pointerHeld=false,selectionSignature='';
 const selectedPieces=()=>items().filter(o=>selected.includes(o.id));
 function usable(){return initialized&&ready&&['build','animate'].includes(studioWorkspace)&&tool==='select'&&!presenting&&!animRun&&!storyPlayback&&!exportJob&&!blockSoloRunning&&!blockPathEditing&&!performancePicking&&!drag&&!cameraGesture&&!cameraDragMode&&!pathGesture&&!offstageGesture&&!offstagePanMode&&!pointerHeld&&!document.querySelector('dialog[open]')}
 function closeMore(){
  $('selectionMoreMenu').hidden=true;$('selectionMore').setAttribute('aria-expanded','false');
 }
 function hide(){if(!initialized)return;$('selectionToolbar').hidden=true;closeMore()}
 // Prefer above the selection. Try the other edges when that would cover handles.
 function place(box,size,area){
  const pad=8,gap=12,maxX=Math.max(pad,area.width-size.width-pad),maxY=Math.max(pad,area.height-size.height-pad);
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v)),cx=(box.left+box.right)/2,cy=(box.top+box.bottom)/2;
  const candidates=[
   [cx-size.width/2,box.top-size.height-gap],
   [cx-size.width/2,box.bottom+gap],
   [box.right+gap,cy-size.height/2],
   [box.left-size.width-gap,cy-size.height/2],
   [pad,pad],[maxX,pad],[pad,maxY],[maxX,maxY]
  ].map(([x,y],order)=>{
   const left=clamp(x,pad,maxX),top=clamp(y,pad,maxY);
   const overlap=Math.max(0,Math.min(left+size.width,box.right+7)-Math.max(left,box.left-7))*Math.max(0,Math.min(top+size.height,box.bottom+7)-Math.max(top,box.top-7));
   return {x:Math.round(left),y:Math.round(top),score:overlap+order*.01};
  });
  candidates.sort((a,b)=>a.score-b.score);return {x:candidates[0].x,y:candidates[0].y};
 }
 function position(list){
  const bar=$('selectionToolbar'),area=document.querySelector('.workspace'),view=area.getBoundingClientRect(),board=canvas.getBoundingClientRect();
  if(view.width<24||view.height<24||!board.width||!board.height){hide();return}
  const camera=editorCamera(),points=list.flatMap(o=>corners(editPiece(o)));
  if(list.length===1&&!list[0].locked)points.push(rotateHandle(editPiece(list[0])));
  const projected=points.map(p=>{const [x,y]=cameraWorldToScreen(p,camera);return [board.left-view.left+x/W*board.width,board.top-view.top+y/H*board.height]});
  const box={left:Math.min(...projected.map(p=>p[0])),right:Math.max(...projected.map(p=>p[0])),top:Math.min(...projected.map(p=>p[1])),bottom:Math.max(...projected.map(p=>p[1]))};
  bar.style.maxWidth=Math.max(0,view.width-16)+'px';bar.style.maxHeight=Math.max(0,view.height-16)+'px';
  const rect=bar.getBoundingClientRect(),at=place(box,{width:Math.min(rect.width,view.width-16),height:Math.min(rect.height,view.height-16)},view);
  bar.style.left=at.x+'px';bar.style.top=at.y+'px';
 }
 function update(){
  if(!initialized)return;
  const list=selectedPieces();if(!usable()||!list.length){hide();return}
  const bar=$('selectionToolbar'),unlocked=list.filter(o=>!o.locked),count=list.length,n=unlocked.length,locked=count-n;
  const signature=list.map(o=>o.id).join('|');if(signature!==selectionSignature){closeMore();selectionSignature=signature}
  const label=count===1?list[0].name:count+' pieces selected';
  $('selectionLabel').textContent=label+(locked?' · '+(count===1?'Locked':locked+' locked'):'');$('selectionLabel').title=$('selectionLabel').textContent;
  for(const action of ['Delete','Duplicate']){
   const b=$('selection'+action),description=action+' '+(n===1?'piece':n+' pieces');
   $('selection'+action+'Label').textContent=action+(count>1?' '+n:'');b.disabled=n===0;
   b.setAttribute('aria-label',n?description+(locked?'; locked pieces are kept':''):'Unlock a piece to '+action.toLowerCase());
   b.title=n?description+(locked?' · '+locked+' locked kept':''): 'Unlock a piece first';
  }
  const oneGroup=count===1&&!!list[0].children;
  $('selectionGroup').hidden=count<2&&!oneGroup;
  $('selectionGroupLabel').textContent=oneGroup?'Ungroup':'Group';
  $('selectionGroup').disabled=oneGroup?!!list[0].locked||hasAnimation(list[0]):locked>0||list.some(hasAnimation);
  $('selectionGroup').title=$('selectionGroup').disabled?(locked?'Unlock selected pieces first':'Remove animation before regrouping'):(oneGroup?'Restore the pieces in this group':'Group '+count+' pieces');
  $('selectionLock').textContent=locked===count?'Unlock selected':'Lock selected';
  $('selectionFront').disabled=$('selectionBack').disabled=n===0;
  $('selectionAlignX').hidden=$('selectionAlignY').hidden=count<2;
  $('selectionAlignX').disabled=$('selectionAlignY').disabled=n===0;
  $('selectionUngroup').hidden=count===1||!list.some(o=>o.children);
  $('selectionUngroup').disabled=!list.some(o=>o.children&&!o.locked)||list.some(o=>o.children&&!o.locked&&hasAnimation(o));
  $('selectionUndo').disabled=!history.length;
  if(performanceReady)performanceSyncUI();bar.hidden=false;position(list);
 }
 function act(fn){if(!usable()||!selectedPieces().length)return;closeMore();fn();update();if($('selectionToolbar').hidden)canvas.focus()}
 function deleteSelection(){
  act(()=>{const n=selectedPieces().filter(o=>!o.locked).length;if(!n)return;remove();toast(n+' piece'+(n===1?'':'s')+' deleted. Undo restores '+(n===1?'it.':'them.'))});
 }
 function init(){
  initialized=true;const bar=$('selectionToolbar');
  $('selectionDelete').onclick=deleteSelection;$('selectionDuplicate').onclick=()=>act(duplicate);
  $('selectionGroup').onclick=()=>act(()=>{const list=selectedPieces();if(list.length===1&&list[0].children)ungroup();else combine()});
  for(const [button,target] of [['selectionLock','lock'],['selectionFront','front'],['selectionBack','back'],['selectionAlignX','alignX'],['selectionAlignY','alignY'],['selectionUngroup','ungroup']])$(button).onclick=()=>act(()=>$(target).click());
  $('selectionUndo').onclick=()=>act(undo);
  $('selectionMore').onclick=()=>{if(!usable())return;const open=$('selectionMoreMenu').hidden;$('selectionMoreMenu').hidden=!open;$('selectionMore').setAttribute('aria-expanded',String(open));update()};
  bar.addEventListener('pointerdown',e=>e.stopPropagation());
  bar.addEventListener('keydown',e=>{
   e.stopPropagation();
   if(e.key==='Escape'){e.preventDefault();if(!$('selectionMoreMenu').hidden){closeMore();$('selectionMore').focus();update()}else canvas.focus()}
   if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();act(()=>e.shiftKey?redo():undo())}
   if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();deleteSelection()}
  });
  document.addEventListener('pointerdown',e=>{
   if(e.target===canvas||e.target===$('cameraMap')){pointerHeld=true;hide()}
   else if(!bar.contains(e.target)){closeMore();update()}
  },true);
  for(const event of ['pointerup','pointercancel','lostpointercapture'])document.addEventListener(event,()=>{pointerHeld=false;requestAnimationFrame(update)},true);
  document.addEventListener('click',update);window.addEventListener('resize',update);window.addEventListener('blur',()=>{pointerHeld=false;hide()});
  update();
 }
 return {init,update,place};
})();
