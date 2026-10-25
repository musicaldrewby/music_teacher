import {clone,uid,barBeats} from './sequencer-model.js';
import {capturePerformance,validatePerformance,applyPerformance,songTimeline,moveSongEntry} from './composition-model.js';
const html=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createPerformanceLibrary(api,host){
 const $=id=>document.getElementById(id),key='soundroom-performances-v1';let items=[],selected='',deleted=null,readError=false;
 const message=text=>{$('preset-status').textContent=text};
 try{const raw=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(raw)||raw.length>128)throw new Error('Invalid preset collection');items=raw.map(x=>validatePerformance(x,host.presets(),host.bank()));selected=items[0]?.id||''}catch{readError=true;message('Saved presets could not be read. Export any available backups before clearing browser storage. Existing data has been kept.')}
 const current=()=>items.find(x=>x.id===selected);
 function render(){
  $('preset-select').replaceChildren(...(items.length?items.map(x=>new Option(x.name,x.id)):[new Option('No saved performances','')]));$('preset-select').value=selected;
  const preset=current();$('preset-selected-name').textContent=preset?'Selected: '+preset.name:'No saved preset selected';$('preset-update').title=preset?'Update '+preset.name:'Choose a preset in Recall';$('preset-parts').innerHTML=(preset?.tracks||api.project().tracks).map((t,i)=>`<span title="${html(t.patch.name)}"><b>${i+1}</b> ${html(t.patch.name)}</span>`).join('');
  renderLock();
 }
 function renderLock(){const locked=api.playing();for(const id of ['preset-save','preset-update','preset-load','preset-delete','preset-import','preset-name','preset-select'])$(id).disabled=locked||readError||(['preset-load','preset-update','preset-delete'].includes(id)&&!current());$('preset-export').disabled=!current();$('preset-undo-delete').disabled=locked||!deleted||readError}
 function write(next,text,nextSelected=selected){try{if(next.length>128)throw new Error('The collection is full (128 performances). Export and delete one first.');localStorage.setItem(key,JSON.stringify(next));items=next;selected=nextSelected;render();message(text);return true}catch(e){message('Could not save presets: '+e.message);return false}}
 function capture(id){return capturePerformance(api.project(),$('preset-name').value,host.bank(),host.effects(),host.master(),id)}
 $('preset-select').onchange=()=>{selected=$('preset-select').value;$('preset-name').value=current()?.name||'';render()};
 $('preset-save').onclick=()=>{if(api.playing()||readError)return;const next=capture();write([...items,next],'Saved “'+next.name+'” on this device.',next.id)};
 $('preset-update').onclick=()=>{if(api.playing()||readError||!current())return;const next=capture(selected);write(items.map(x=>x.id===selected?next:x),'Updated “'+next.name+'”.')};
 $('preset-load').onclick=()=>{if(api.playing()||!current())return;const next=clone(current());api.beforeLoad();if(api.edit(()=>{applyPerformance(api.project(),next);host.restoreEffects(next.effects,next.master);api.apply();return 'Loaded performance “'+next.name+'”. Patterns and song order kept. Undo restores the previous sound setup.'}))message('Loaded “'+next.name+'”. Song patterns kept; Undo is available.')};
 $('preset-delete').onclick=()=>{if(api.playing()||!current())return;const previous=clone(current()),index=items.findIndex(x=>x.id===selected),next=items.filter(x=>x.id!==selected);if(write(next,'Preset deleted. Undo delete is available.',next[0]?.id||'')){deleted={preset:previous,index};renderLock()}};
 $('preset-undo-delete').onclick=()=>{if(api.playing()||!deleted)return;const next=[...items];next.splice(deleted.index,0,deleted.preset);if(write(next,'Preset restored.',deleted.preset.id)){deleted=null;renderLock()}};
 $('preset-export').onclick=()=>{const preset=current();if(!preset)return;const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(preset,null,2)],{type:'application/json'}));a.href=url;a.download=(preset.name.replace(/[^a-z0-9_-]+/gi,'_')||'Performance')+'.soundroom-performance.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);message('Exported “'+preset.name+'”. Import this file on another device.')};
 $('preset-import').onclick=()=>$('preset-file').click();
 $('preset-file').onchange=async()=>{try{const file=$('preset-file').files[0];if(!file||api.playing()||readError)return;if(file.size>1024*1024)throw new Error('Performance files must be smaller than 1 MB.');const next=validatePerformance(JSON.parse(await file.text()),host.presets(),host.bank());if(api.playing())throw new Error('Stop playback before importing a performance.');next.id=uid();if(write([...items,next],'Imported “'+next.name+'”. Choose Load selected to use it.',next.id))$('preset-name').value=next.name}catch(e){message('Could not import: '+e.message)}finally{$('preset-file').value=''}};
 $('preset-name').value=items[0]?.name||'My performance';render();return {render,renderLock};
}

export function createSongTimeline(api){
 const $=id=>document.getElementById(id),p=()=>api.project();let selected=null,drag=null,entries=[],total=0,sounding=null;
 function render(){
  entries=songTimeline(p());total=entries.reduce((n,e)=>n+e.bars,0);if(!entries.some(e=>e.id===selected))selected=entries[0]?.id||null;
  const scale=+$('song-timeline-zoom').value,canvas=$('song-timeline-canvas');canvas.style.width=scale&&total?Math.max(1,total*scale)+'px':'100%';
  const interval=Math.max(1,Math.ceil(total/32));$('song-timeline-ruler').innerHTML=Array.from({length:Math.ceil(total/interval)},(_,i)=>`<span style="left:${i*interval/total*100}%">${i*interval+1}</span>`).join('');
  $('song-timeline-blocks').innerHTML=entries.map((e,i)=>`<article class="song-block ${selected===e.id?'selected':''}" data-song-entry="${html(e.id)}" style="left:${e.start/total*100}%;width:${e.bars/total*100}%;--scene-hue:${[112,190,270,36,335,160,215,55][e.scene]}"><button class="song-block-select" data-song-select="${html(e.id)}" aria-pressed="${selected===e.id}" aria-label="Entry ${i+1}: ${html(e.name)}, scene ${e.scene+1}, measures ${e.start+1} to ${e.start+e.bars}, repeat ${e.repeats}"><small>${e.start+1}–${e.start+e.bars} · S${e.scene+1}</small><b>${html(e.name)}</b><span>×${e.repeats}</span></button><button class="song-drag-handle" data-song-drag="${html(e.id)}" aria-label="Drag ${html(e.name)} to reorder; or use Move earlier and Move later below" title="Drag to reorder">⠿</button></article>`).join('');
  $('song-timeline-empty').hidden=!!entries.length;$('song-timeline-scroll').hidden=!entries.length;renderSelection();renderPosition(0,false);
 }
 function renderSelection(){
  const index=entries.findIndex(e=>e.id===selected),entry=entries[index];$('song-selected-entry').replaceChildren(...(entries.length?entries.map((e,i)=>new Option((i+1)+' · '+e.name+' ×'+e.repeats,e.id)):[new Option('No song entries','')]));$('song-selected-entry').value=selected||'';$('song-entry-repeats').value=entry?.repeats||1;$('song-entry-scene').replaceChildren(...p().scenes.map((scene,i)=>new Option((i+1)+' · '+scene.name,String(i))));$('song-entry-scene').value=String(entry?.scene??0);
  for(const el of document.querySelectorAll('[data-song-select]')){const on=el.dataset.songSelect===selected;el.setAttribute('aria-pressed',String(on));el.closest('[data-song-entry]')?.classList.toggle('selected',on)}
  renderLock();
 }
 function renderLock(){const locked=api.playing(),index=entries.findIndex(e=>e.id===selected);for(const id of ['song-entry-earlier','song-entry-later','song-entry-duplicate','song-entry-remove','song-entry-repeats','song-entry-scene','song-selected-entry'])$(id).disabled=locked||index<0||(id==='song-entry-earlier'&&index===0)||(id==='song-entry-later'&&index===entries.length-1);for(const el of document.querySelectorAll('[data-song-drag]'))el.disabled=locked;if(locked)cancelDrag()}
 function select(id){if(entries.some(e=>e.id===id)){selected=id;renderSelection()}}
 $('song-timeline-blocks').onclick=e=>{const b=e.target.closest('[data-song-select]');if(b)select(b.dataset.songSelect)};
 $('song-selected-entry').onchange=()=>select($('song-selected-entry').value);
 $('song-timeline-zoom').onchange=render;
 for(const [id,delta] of [['song-entry-earlier',-1],['song-entry-later',1]])$(id).onclick=()=>api.edit(()=>{const i=p().song.findIndex(e=>e.id===selected);if(i>=0)moveSongEntry(p().song,selected,i+(delta>0?2:-1))});
 $('song-entry-duplicate').onclick=()=>api.edit(()=>{if(p().song.length>=256)throw new Error('The song already has 256 entries.');const i=p().song.findIndex(e=>e.id===selected);if(i<0)return;const entry={...p().song[i],id:uid()};p().song.splice(i+1,0,entry);selected=entry.id;return 'Duplicated song entry. Both entries use the same scene pattern.'});
 $('song-entry-remove').onclick=()=>api.edit(()=>{const i=p().song.findIndex(e=>e.id===selected);if(i>=0)p().song.splice(i,1)});
 $('song-entry-scene').onchange=()=>api.edit(()=>{const entry=p().song.find(e=>e.id===selected);if(entry)entry.scene=Math.max(0,Math.min(7,Math.round(+$('song-entry-scene').value)||0))});
 $('song-entry-repeats').onchange=()=>api.edit(()=>{const e=p().song.find(e=>e.id===selected);if(e)e.repeats=Math.max(1,Math.min(64,Math.round(+$('song-entry-repeats').value)||1))});
 function cancelDrag(){drag=null;$('song-drop-marker').hidden=true}
 const surface=$('song-timeline-blocks');
 surface.addEventListener('pointerdown',e=>{const handle=e.target.closest('[data-song-drag]');if(!handle||api.playing()||e.button>0)return;e.preventDefault();select(handle.dataset.songDrag);drag={id:selected,pointer:e.pointerId,boundary:entries.findIndex(x=>x.id===selected)};surface.setPointerCapture(e.pointerId)});
 surface.addEventListener('pointermove',e=>{if(!drag||drag.pointer!==e.pointerId)return;e.preventDefault();const rect=$('song-timeline-canvas').getBoundingClientRect(),bar=(e.clientX-rect.left)/(rect.width||rect.right-rect.left)*total;let boundary=entries.findIndex(x=>bar<x.start+x.bars/2);if(boundary<0)boundary=entries.length;drag.boundary=boundary;$('song-drop-marker').hidden=false;$('song-drop-marker').style.left=(boundary<entries.length?entries[boundary].start/total*100:100)+'%';const scroll=$('song-timeline-scroll'),r=scroll.getBoundingClientRect();if(e.clientX>r.right-36)scroll.scrollLeft+=24;else if(e.clientX<r.left+36)scroll.scrollLeft-=24});
 surface.addEventListener('pointerup',e=>{if(!drag||drag.pointer!==e.pointerId)return;const {id,boundary}=drag;cancelDrag();const from=p().song.findIndex(x=>x.id===id);if(boundary!==from&&boundary!==from+1)api.edit(()=>moveSongEntry(p().song,id,boundary))});
 for(const event of ['pointercancel','lostpointercapture'])surface.addEventListener(event,cancelDrag);
 function renderPosition(beat,playing){
  const bar=beat/barBeats(p()),head=$('song-timeline-playhead');head.hidden=!playing||!total;head.style.left=Math.max(0,Math.min(100,bar/total*100||0))+'%';const id=playing?entries.find(e=>bar>=e.start&&bar<e.start+e.bars)?.id:null;
  if(id!==sounding){sounding=id;for(const el of document.querySelectorAll('[data-song-entry]'))el.classList.toggle('sounding',el.dataset.songEntry===id)}
 }
 return {render,renderLock,renderPosition};
}
