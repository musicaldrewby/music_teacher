import {availableNoteLength} from './note-duration.js';
// Preview only while dragging; commit once so a resize is one Undo step.
export function mountSequenceDuration(roll,{project,track,event,index,grid,total,commit,status}){
 if(!event)return ()=>{};
 const doc=roll.ownerDocument,win=doc.defaultView;
 const outline=doc.createElement('div');outline.className='sequence-duration-outline';
 const cell=roll.querySelector(`[data-cell="${index},0"]`);
 if(!cell)return ()=>{};
 const handle=doc.createElement('button');handle.type='button';handle.className='sequence-duration-handle';handle.setAttribute('role','slider');
 handle.setAttribute('aria-label','Note duration. Drag left or right, or use the arrow keys.');handle.title='Drag to shorten or lengthen · Arrow keys also adjust length';
 const minimum=.25;
 handle.setAttribute('aria-valuemin',String(minimum));
 const max=Math.floor((availableNoteLength(project,track,event)+1e-7)/minimum)*minimum;
 const step=max<grid?minimum:grid;
 handle.setAttribute('aria-valuemax',String(Math.max(minimum,max)));handle.disabled=max<minimum;
 const limit=event.beat+max<total?'the next note':'the section end';
 status(handle.disabled?'This note is less than a sixteenth from the next note. Move that note first.':`Drag to resize. Smallest length: sixteenth. Stops at ${limit}.`);
 const label=doc.createElement('span');label.className='sequence-duration-label';outline.append(label,handle);roll.append(outline);
 let drag=null,preview=event.duration,disposed=false;
 const draw=value=>{
  preview=value;const base=cell.offsetLeft||80;
  outline.style.left=`calc(${base}px + (100% - ${base}px) * ${event.beat/total})`;
  outline.style.width=`calc((100% - ${base}px) * ${value/total})`;
  outline.style.top=`${cell.offsetTop}px`;
  handle.setAttribute('aria-valuenow',String(value));handle.setAttribute('aria-valuetext',`${Number(value.toFixed(3))} quarter-note beats`);
  label.textContent=`${Number(value.toFixed(2))} beats`;
 };
 draw(event.duration);
 const observer=win.ResizeObserver?new win.ResizeObserver(()=>draw(preview)):null;observer?.observe(roll);
 const clamp=value=>Math.max(minimum,Math.min(max,value<grid?Math.round(value/minimum)*minimum:Math.round(value/step)*step));
 const move=e=>{
  if(!drag||e.pointerId!==drag.id)return;e.preventDefault();
  const scroll=roll.closest('.sequence-scroll'),rect=scroll.getBoundingClientRect();
  if(rect.width&&e.clientX>rect.right-24)scroll.scrollLeft+=16;else if(rect.width&&e.clientX<rect.left+100)scroll.scrollLeft-=16;
  draw(clamp(drag.duration+(e.clientX-drag.x+scroll.scrollLeft-drag.scroll)/drag.pixelsPerBeat));
  status(`Note length: ${Number(preview.toFixed(2))} quarter-note beats. Release to apply; Escape cancels.`);
 };
 const finish=(e,cancel=false)=>{
  if(!drag||e.pointerId!==undefined&&e.pointerId!==drag.id)return;
  const id=drag.id;drag=null;outline.classList.remove('resizing');
  if(handle.hasPointerCapture?.(id))handle.releasePointerCapture(id);
  if(cancel){draw(event.duration);status('Duration change cancelled.');}
  else if(Math.abs(preview-event.duration)>1e-7)commit(preview);
 };
 handle.onpointerdown=e=>{
  if(e.button>0||handle.disabled)return;e.preventDefault();e.stopPropagation();
  const rect=roll.getBoundingClientRect(),labelWidth=cell.offsetLeft||80,pixelsPerBeat=(rect.width-labelWidth)/total;
  if(pixelsPerBeat<=0)return;
  drag={id:e.pointerId,x:e.clientX,duration:event.duration,scroll:roll.closest('.sequence-scroll').scrollLeft,pixelsPerBeat};
  handle.setPointerCapture?.(e.pointerId);outline.classList.add('resizing');handle.focus({preventScroll:true});
 };
 handle.onclick=e=>{e.preventDefault();e.stopPropagation();};
 const cancel=e=>finish(e,true),key=e=>{
  if(e.key==='Escape'&&drag){e.preventDefault();e.stopPropagation();finish({},true);return;}
  if(e.target!==handle||!['ArrowLeft','ArrowRight','ArrowDown','ArrowUp'].includes(e.key))return;
  e.preventDefault();e.stopPropagation();const value=clamp(event.duration+(['ArrowLeft','ArrowDown'].includes(e.key)?-step:step));
  if(Math.abs(value-event.duration)>1e-7)commit(value);
 };
 doc.addEventListener('pointermove',move);doc.addEventListener('pointerup',finish);doc.addEventListener('pointercancel',cancel);doc.addEventListener('keydown',key,true);
 handle.addEventListener('lostpointercapture',cancel);
 return ()=>{if(disposed)return;disposed=true;drag=null;observer?.disconnect();doc.removeEventListener('pointermove',move);doc.removeEventListener('pointerup',finish);doc.removeEventListener('pointercancel',cancel);doc.removeEventListener('keydown',key,true);outline.remove();};
}
