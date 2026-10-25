import {barBeats,totalBeats} from './catalog.js';
import {ENTRY_VALUES,writtenLength,scoreBeatX} from './score-entry.js';
import {scoreSelectionItem,scoreSelectionSpan,mergeScoreSelection,toggleScoreSelection,deleteScoreSelection,clearScoreSpan,removeScoreMeasures,copyScoreSelection,pasteScoreSelection} from './score-selection.js';
export const emptyScoreSelection=()=>({items:[],span:null,measures:null,anchor:null});
export function resetScoreSelection(state){state.selection=emptyScoreSelection();state.restId=null;}
export function mountScoreSelection(root,state,geometries,h){
 const p=h.project(),track=h.track(),per=barBeats(p),surface=root.ownerDocument.querySelector('#score-body'),doc=root.ownerDocument;
 const selection=state.selection??=emptyScoreSelection();
 selection.items=selection.items.flatMap(i=>{const e=(i.rest?track.rests:track.events)?.find(e=>e.id===i.id);return e?[i.whole?scoreSelectionItem(e,i.rest):i]:[];});
 const $=s=>root.querySelector(s),refresh=()=>{h.redraw();doc.querySelector('#score-body')?.focus({preventScroll:true});};
 const say=message=>{$('#score-entry-status').textContent=message;const feedback=doc.querySelector('#score-workspace-feedback');if(feedback&&doc.body.classList.contains('score-focus'))feedback.textContent=message;};
 const clear=()=>{h.stopPreview?.();resetScoreSelection(state);h.select(null);};
 const editable=state.tool==='select',hasSelection=selection.items.length>0||!!selection.measures;
 function apply(items,{span=null,measures=null,anchor=null}={}){
  h.stopPreview?.();
  state.tool='select';state.selection={items:mergeScoreSelection(items),span,measures,anchor};
  const single=state.selection.items.length===1&&!measures?state.selection.items[0]:null;
  h.select(single&&!single.rest?single.id:null);state.restId=single?.rest?single.id:null;
  state.beat=span?.from??(items.length?Math.min(...items.map(i=>i.from)):state.beat);
  if(single){const e=(single.rest?track.rests:track.events).find(e=>e.id===single.id),len=single.rest?e.duration:writtenLength(e),base=ENTRY_VALUES.find(v=>Math.abs(v.value-len)<1e-7)||ENTRY_VALUES.find(v=>v.value!==.25&&Math.abs(v.value*1.5-len)<1e-7);
   state.beat=single.from;if(base){state.base=base.value;state.dotted=base.value!==len;}
   if(!single.rest)h.choosePitch?.(e);
  }
  refresh();
 }
 function selectItem(e,rest=false,input={},token=null){
  if(Date.now()<(state.ignoreClickUntil||0))return;
  const item=scoreSelectionItem(e,rest),anchor={from:token?.beat??item.from,to:token?token.beat+token.duration:item.to};
  if(input.shiftKey&&selection.anchor){const span={from:Math.min(selection.anchor.from,anchor.from),to:Math.max(selection.anchor.to,anchor.to)};apply(scoreSelectionSpan(track,span.from,span.to),{span,anchor:selection.anchor});}
  else if(input.ctrlKey||input.metaKey||state.addToSelection)apply(toggleScoreSelection(selection.items,item),{anchor});
  else apply([item],{anchor});
 }
 function selectMeasure(bar,input={}){
  const anchor=input.shiftKey&&selection.measures?(selection.measures.anchor??selection.measures.first):bar,first=Math.min(anchor,bar),last=Math.max(anchor,bar),span={from:first*per,to:(last+1)*per};
  state.measureScope='part';apply(scoreSelectionSpan(track,span.from,span.to),{span,measures:{first,last,anchor},anchor:span});
 }
 function deleteSelected(){
  if(!hasSelection){say('Select notes or click a measure number first.');return;}
  const items=structuredClone(selection.items),span=selection.span,measures=selection.measures,scope=state.measureScope;
  state.beat=span?.from??Math.min(...items.map(i=>i.from));clear();
  h.edit(()=>{if(measures){for(const t of scope==='ensemble'?p.tracks:[track])clearScoreSpan(t,span.from,span.to);}else deleteScoreSelection(track,items);});
 }
 function copy(cut=false){
  try{state.clipboard=copyScoreSelection(p,track,selection.items,selection.span);if(cut){state.measureScope='part';deleteSelected();}else{refresh();doc.querySelector('#score-entry-status').textContent='Phrase copied. Move the cursor and choose Paste.';}}catch(e){say(e.message);}
 }
 function paste(){
  try{const draft=structuredClone(track),at=state.beat;pasteScoreSelection(p,draft,state.clipboard,at);clear();state.beat=at+state.clipboard.length;h.edit(()=>{track.events=draft.events;track.rests=draft.rests;});}catch(e){say(e.message);}
 }
 const noteCount=new Set(selection.items.filter(i=>!i.rest).map(i=>i.id)).size,restCount=new Set(selection.items.filter(i=>i.rest).map(i=>i.id)).size;
 const measureName=selection.measures?(selection.measures.first===selection.measures.last?`Measure ${selection.measures.first+1}`:`Measures ${selection.measures.first+1}–${selection.measures.last+1}`):'';
 if(editable){
  const panel=doc.createElement('div');panel.className='score-selection-tools';panel.innerHTML=`<div class="score-selection-summary" role="status"><strong>${measureName||`${noteCount} note${noteCount===1?'':'s'}${restCount?`, ${restCount} rest${restCount===1?'':'s'}`:''} selected`}</strong><span>${measureName?'Clear keeps later measures in place.':'Click a note · Shift-click a range · Drag a box'}</span></div><div class="score-selection-actions"><button class="score-tool ${state.addToSelection?'chosen':''}" id="score-add-selection" aria-pressed="${!!state.addToSelection}">Add to selection</button><button class="outline" id="score-select-measure">Select measure at cursor</button><button class="outline" id="score-copy" ${hasSelection?'':'disabled'}>Copy</button><button class="outline" id="score-cut" ${hasSelection?'':'disabled'}>Cut</button><button class="outline" id="score-paste" ${state.clipboard?'':'disabled'}>Paste</button>${selection.measures&&h.repeat?'<button class="outline" id="score-repeat-selection">Repeat to fill section…</button>':''}<button class="quiet" id="score-deselect" ${hasSelection?'':'disabled'}>Deselect</button></div>${selection.measures?`<div class="score-measure-actions"><label>Clear from<select id="score-clear-scope"><option value="part">This part only</option><option value="ensemble">Whole ensemble</option></select></label><button class="outline remove" id="score-clear-measures">Clear ${selection.measures.first===selection.measures.last?'measure':'measures'}</button><details><summary>Measure structure…</summary><p>Remove the selected measure space from every part in this section. Later music shifts earlier together. Repeated appearances of this section also update.</p><button class="outline remove" id="score-remove-measures" ${selection.measures.last-selection.measures.first+1>=p.bars?'disabled':''}>Remove measure space from ensemble…</button></details></div>`:''}`;
  $('.score-entry-status').before(panel);
  $('#score-add-selection').onclick=()=>{state.addToSelection=!state.addToSelection;refresh();};$('#score-select-measure').onclick=()=>selectMeasure(Math.min(p.bars-1,Math.floor(state.beat/per)));
  $('#score-repeat-selection')?.addEventListener('click',()=>h.repeat(selection.measures));
  $('#score-copy').onclick=()=>copy();$('#score-cut').onclick=()=>copy(true);$('#score-paste').onclick=paste;$('#score-deselect').onclick=()=>{clear();refresh();};
  if(selection.measures){$('#score-clear-scope').value=state.measureScope||'part';$('#score-clear-scope').onchange=e=>{state.measureScope=e.target.value;};$('#score-clear-measures').onclick=deleteSelected;
   $('#score-remove-measures').onclick=()=>h.confirm('Remove measure space?',`${measureName} will be removed from every part in this section. Later measures move earlier together. Undo can restore them.`,()=>{const {first,last}=selection.measures;clear();state.beat=Math.min(first*per,(p.bars-(last-first+1))*per);h.edit(()=>removeScoreMeasures(p,first,last));});
  }
 }
 $('#score-delete').disabled=!hasSelection;$('#score-delete').onclick=deleteSelected;
 const detailDelete=doc.querySelector('#delete-note');if(detailDelete&&hasSelection)detailDelete.onclick=deleteSelected;
 const selectedAt=(id,rest,from,to)=>selection.items.some(i=>i.id===id&&i.rest===rest&&i.from<to-1e-7&&i.to>from+1e-7);
 surface.querySelectorAll('[data-event-id],[data-rest-id]').forEach(el=>{
  const rest=!!el.dataset.restId,ids=rest?[el.dataset.restId]:(el.dataset.eventIds||el.dataset.eventId).split(' '),from=+el.dataset.scoreBeat,to=from+ +el.dataset.scoreDuration;
  const chosen=ids.map(id=>selectedAt(id,rest,from,to));el.classList.toggle('score-note-selected',chosen.every(Boolean));el.setAttribute('aria-pressed',String(chosen.some(Boolean)));
  el.querySelectorAll('.vf-notehead').forEach((head,i)=>head.classList.toggle('score-note-selected',!!chosen[i]));
 });
 const NS='http://www.w3.org/2000/svg',svgEl=(name,attrs)=>{const el=doc.createElementNS(NS,name);for(const [k,v]of Object.entries(attrs))el.setAttribute(k,v);return el;};
 for(const g of geometries.filter(g=>g.trackId===track.id)){
  g.svg.setAttribute('role','group');
  if(selection.span&&selection.span.from<g.end&&selection.span.to>g.start){const from=Math.max(g.start,selection.span.from),to=Math.min(g.end,selection.span.to),x=selection.measures?g.left:scoreBeatX(g,from),end=selection.measures?g.right:scoreBeatX(g,to);g.svg.prepend(svgEl('rect',{x,y:g.top+15,width:Math.max(4,end-x),height:g.bottom-g.top+15,fill:'#bf9b4f',opacity:.13,'pointer-events':'none',class:'score-range-highlight'}));}
  const button=svgEl('g',{role:'button',tabindex:0,'aria-label':`Select measure ${g.bar+1} in this part`,'aria-pressed':String(!!selection.measures&&g.bar>=selection.measures.first&&g.bar<=selection.measures.last),class:'score-measure-select','data-select-measure':g.bar+1});
  button.append(svgEl('rect',{x:g.left,y:(g.labelY??52)-20,width:44,height:30,rx:5,fill:'#f4f1e6',stroke:'#b9c4ac'}));const text=svgEl('text',{x:g.left+22,y:g.labelY??52,'text-anchor':'middle',fill:'#42583a','font-size':13});text.textContent=g.bar+1;button.append(text);
  button.onclick=e=>{e.stopPropagation();selectMeasure(g.bar,e);};button.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();selectMeasure(g.bar,e);}};g.svg.append(button);
 }
 surface.classList.toggle('score-selecting',editable);
 if(editable){
  let drag=null;
  surface.onpointerdown=e=>{
   if(e.button>0||e.target.closest?.('.score-measure-select'))return;
   drag={x:e.clientX,y:e.clientY,pointer:e.pointerId,add:e.ctrlKey||e.metaKey||state.addToSelection,box:null};
  };
  surface.onpointermove=e=>{
   if(!drag||e.pointerId!==drag.pointer)return;
   if(!drag.box&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<5)return;
   e.preventDefault();if(!drag.box){surface.setPointerCapture?.(e.pointerId);drag.box=doc.createElement('div');drag.box.className='score-selection-box';surface.append(drag.box);}
   Object.assign(drag.box.style,{left:Math.min(drag.x,e.clientX)+'px',top:Math.min(drag.y,e.clientY)+'px',width:Math.abs(e.clientX-drag.x)+'px',height:Math.abs(e.clientY-drag.y)+'px'});
  };
  surface.onpointerup=e=>{
   if(!drag)return;const d=drag;drag=null;if(!d.box)return;surface.releasePointerCapture?.(d.pointer);
   const box={left:Math.min(d.x,e.clientX),right:Math.max(d.x,e.clientX),top:Math.min(d.y,e.clientY),bottom:Math.max(d.y,e.clientY)},items=[];
   surface.querySelectorAll('[data-event-id],[data-rest-id]').forEach(el=>{
    const rest=!!el.dataset.restId,ids=rest?[el.dataset.restId]:(el.dataset.eventIds||el.dataset.eventId).split(' '),heads=[...el.querySelectorAll('.vf-notehead')];
    ids.forEach((id,index)=>{const bounds=(heads[index]||el).getBoundingClientRect();if(bounds.width&&bounds.right>=box.left&&bounds.left<=box.right&&bounds.bottom>=box.top&&bounds.top<=box.bottom){const from=+el.dataset.scoreBeat,to=from+ +el.dataset.scoreDuration;items.push({id,rest,from,to});}});
   });
   d.box.remove();state.ignoreClickUntil=Date.now()+150;apply(d.add?[...selection.items,...items]:items);
  };
  surface.onpointercancel=()=>{drag?.box?.remove();drag=null;};
 }
 return {selectItem,selectMeasure,deleteSelected,hasSelection,handleKey(e){
  const key=e.key.toLowerCase();if(e.altKey||e.repeat)return false;
  if((e.ctrlKey||e.metaKey)&&['a','c','x','v'].includes(key)){
   e.preventDefault();if(key==='a'){const span={from:0,to:totalBeats(p)};apply(scoreSelectionSpan(track,span.from,span.to),{span,anchor:span});}else if(key==='c')copy();else if(key==='x')copy(true);else paste();return true;
  }
  if(key==='escape'&&hasSelection){e.preventDefault();clear();refresh();return true;}
  if((key==='delete'||key==='backspace')&&hasSelection){e.preventDefault();deleteSelected();return true;}return false;
 }};
}
