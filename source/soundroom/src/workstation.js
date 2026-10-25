import {projectTempoMap} from './tempo-map.js';
import {createSongTimeline} from './composition-ui.js';
import {barBeats,songBeats,clone,uid,gridBeats,validateProject,patternProject,copyScene} from './sequencer-model.js';
import {editBars,arrangeProject,arrangementBars} from './arrangement.js';
import {readRecovery,writeRecovery,retainRecovery,PREVIOUS_KEY} from './recovery.js';
import {exportMIDI,safeFilename} from './export-formats.js';
import {clamp} from './performance-engine.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DRUMS={35:'Acoustic kick',36:'Kick',37:'Side stick',38:'Snare',39:'Clap',40:'Electric snare',41:'Low floor tom',42:'Closed hi-hat',43:'High floor tom',44:'Pedal hi-hat',45:'Low tom',46:'Open hi-hat',47:'Low-mid tom',48:'High-mid tom',49:'Crash',50:'High tom',51:'Ride',52:'China cymbal',53:'Ride bell',54:'Tambourine',55:'Splash',56:'Cowbell',57:'Crash 2',58:'Vibraslap',59:'Ride 2',60:'High bongo',61:'Low bongo',62:'Muted conga',63:'Open conga',64:'Low conga',65:'High timbale',66:'Low timbale',67:'High agogo',68:'Low agogo',69:'Cabasa',70:'Maracas',71:'Short whistle',72:'Long whistle',73:'Short guiro',74:'Long guiro',75:'Claves',76:'High woodblock',77:'Low woodblock',78:'Muted cuica',79:'Open cuica',80:'Muted triangle',81:'Open triangle'};
const laneInfo={sustain:{type:'cc',controller:64,max:127,name:'Sustain'},modulation:{type:'cc',controller:1,max:127,name:'Modulation'},expression:{type:'cc',controller:11,max:127,name:'Expression'},bend:{type:'bend',max:16383,name:'Pitch bend'},pressure:{type:'pressure',max:127,name:'Channel pressure'}};
export function createWorkstation(api,host){
 const $=id=>document.getElementById(id),p=()=>api.project(),track=()=>p().tracks[p().selectedTrack];
 let restoring=true,pendingRecovery=null,saveTimer=null,editor='piano',drumBar=1,drumSelection=null,laneSelection=null,laneGesture=null,exportWorker=null,exportURL=null,exportGeneration=0,exporting=false;
 const timeline=createSongTimeline(api);
 const serialise=()=>({...clone(p()),soundfont:host.bank(),effects:host.effects(),master:host.master()});
 function persistNow(){if(restoring||pendingRecovery||api.playing())return;try{if(writeRecovery(localStorage,serialise()))$('autosave-status').textContent='Autosaved on this device · '+new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});}catch{$('autosave-status').textContent='Autosave unavailable or storage full. Use Save song.'}}
 function persist(){if(restoring||pendingRecovery)return;clearTimeout(saveTimer);saveTimer=setTimeout(persistNow,700)}
 function checkpoint(){try{persistNow();retainRecovery(localStorage);$('recovery-previous').disabled=false}catch{}}
 function restore(entry){
  if(!entry)return false;
  if(entry.project.soundfont&&(entry.project.soundfont.id!==host.bank().id||entry.project.soundfont.name!==host.bank().name)){
   pendingRecovery=entry;$('recovery-banner').hidden=false;$('recovery-message').textContent='A saved session needs '+entry.project.soundfont.name+'. This version includes GeneralUser GS only. The saved session is kept until you choose Start fresh.';return false;
  }
  const next=validateProject(entry.project,host.presets());api.replace(next,entry.project.effects,entry.project.master);pendingRecovery=null;$('recovery-banner').hidden=true;$('autosave-status').textContent='Recovered '+next.name+' · saved '+new Date(entry.savedAt).toLocaleString();api.status('Recovered your last session from this device.');return true;
 }
 function initialise(){
  try{restore(readRecovery(localStorage));$('recovery-previous').disabled=!readRecovery(localStorage,PREVIOUS_KEY)}catch{$('autosave-status').textContent='Recovery could not be read. Open a saved project, or start a new session.';}
  restoring=false;
 }
 $('recovery-fresh').onclick=()=>{pendingRecovery=null;$('recovery-banner').hidden=true;checkpoint();persist()};
 $('recovery-previous').onclick=()=>{if(api.playing())return;try{const prior=readRecovery(localStorage,PREVIOUS_KEY);if(!prior)return;checkpoint();restoring=true;restore(prior);restoring=false;persist()}catch(e){restoring=false;api.status('Could not restore: '+e.message)}};
 for(const event of ['pagehide','beforeunload'])window.addEventListener(event,persistNow);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)persistNow()});
 for(const event of ['change','input','pointerup','click'])document.addEventListener(event,persist,true);

 function renderSceneState(sounding=null,progress=0){
  const state=api.sceneState();for(const button of document.querySelectorAll('[data-scene]')){
   const index=+button.dataset.scene;button.classList.toggle('queued',state.queued===index);button.classList.toggle('sounding',sounding===index);button.setAttribute('aria-pressed',String(p().selectedScene===index));button.disabled=state.locked;
   const label=button.querySelector('[data-scene-status]');if(label)label.textContent=state.queued===index?'Next measure':sounding===index?'Playing':p().selectedScene===index?'Selected':'Ready';
   button.style.setProperty('--measure-progress',String(sounding===index||state.queued===index?progress:0));
  }
 }
 function renderScenes(){
  const state=api.sceneState();$('scene-buttons').innerHTML=p().scenes.map((scene,i)=>`<button class="scene-button ${state.queued===i?'queued':''}" data-scene="${i}" aria-keyshortcuts="${i+1}" title="${scene.tempo} BPM · Key ${i+1} · starts next measure during playback" aria-pressed="${p().selectedScene===i}" ${state.locked?'disabled':''}><b>${i+1}</b><span>${esc(scene.name)}</span><small><em data-scene-status="${i}">${state.queued===i?'Next measure':p().selectedScene===i?(api.playing()?'Playing':'Selected'):'Ready'}</em> · ${scene.bars} bars</small><i aria-hidden="true"></i></button>`).join('');
  $('scene-name').value=p().scenes[p().selectedScene].name;$('scene-selected').textContent='Scene '+(p().selectedScene+1);$('performance-name').value=p().performanceName;
  $('performance-summary').textContent='Eight parts shared across all scenes.';renderSceneState();
 }
 function renderSong(){
  const selected=$('song-add-scene').value;$('song-add-scene').replaceChildren(...p().scenes.map((s,i)=>new Option((i+1)+' · '+s.name+' · '+s.bars+' bars · '+s.tempo+' BPM',String(i))));$('song-add-scene').value=selected||'0';
  $('arrangement-length').textContent=arrangementBars(p())+' measures · '+p().song.length+' entries';$('legacy-download').hidden=!p().legacyProject;timeline.render();
 }
 function guard(fn){try{return fn()}catch(e){api.status(e.message);return false}}
 $('scene-buttons').onclick=e=>{const button=e.target.closest('[data-scene]');if(button&&!button.disabled)api.chooseScene(+button.dataset.scene)};
 $('scene-name').onchange=()=>api.edit(()=>{p().scenes[p().selectedScene].name=$('scene-name').value.trim().slice(0,48)||'Scene '+(p().selectedScene+1)});
 $('performance-name').onchange=()=>api.edit(()=>{p().performanceName=$('performance-name').value.trim().slice(0,80)||'Untitled performance'});
 $('scene-copy-target').replaceChildren(...Array.from({length:8},(_,i)=>new Option('Scene '+(i+1),String(i))));$('scene-copy-target').value='1';
 $('scene-copy').onclick=()=>api.edit(()=>{const target=+$('scene-copy-target').value;copyScene(p(),p().selectedScene,target);return 'Copied the pattern to Scene '+(target+1)+'. Sounds remain shared. Undo restores the previous pattern.'});
 $('scene-clear').onclick=()=>api.edit(()=>{for(const t of p().scenes[p().selectedScene].tracks){t.notes=[];t.controllers=[]}return 'Cleared this pattern. The performance and other scenes are intact. Undo restores the notes.'});
 for(const action of ['copy','move','duplicate','erase'])$('bars-'+action).onclick=()=>guard(()=>api.edit(()=>editBars(p(),{from:+$('bars-from').value,to:+$('bars-to').value,target:+$('bars-target').value,scope:$('bars-scope').value,action})));
 $('song-add').onclick=()=>api.edit(()=>{if(p().song.length>=256)return 'The song already has 256 entries.';p().song.push({id:uid(),scene:+$('song-add-scene').value,repeats:1})});
 $('song-clear').onclick=()=>api.edit(()=>{p().song=[];return 'Song order cleared. All eight scene patterns are preserved.'});
 $('legacy-download').onclick=()=>{if(p().legacyProject)offerFile(JSON.stringify(p().legacyProject,null,2),'Soundroom_original_project.soundroom.json','application/json')};
 for(const id of ['punch-enabled','punch-from','punch-to'])$(id).onchange=()=>api.edit(()=>{
  const from=+$('punch-from').value,to=+$('punch-to').value;if(!Number.isInteger(from)||!Number.isInteger(to)||from<1||to<from||to>p().bars)return 'Choose punch measures within this pattern.';
  p().punch={enabled:$('punch-enabled').checked,from,to};return p().punch.enabled?'Punch records only measures '+from+'–'+to+'. Use Record over to replace that passage.':'Punch is off. Recording covers the whole track.';
 });

 function renderDrums(){
  drumBar=clamp(drumBar,1,p().bars);$('drum-bar').value=drumBar;$('drum-bar').max=p().bars;
  const isDrum=track().patch.isDrum;$('drum-warning').hidden=isDrum;$('drum-grid-scroll').hidden=!isDrum;
  const step=gridBeats(p().grid),unit=barBeats(p()),count=Math.ceil(unit/step),start=(drumBar-1)*unit;
  const pitches=[...new Set([36,38,42,46,49,51,37,39,45,48,54,56,...track().notes.map(n=>n.pitch),+$('drum-row').value])].sort((a,b)=>a-b);
  $('drum-grid').style.setProperty('--steps',count);
  $('drum-grid').innerHTML='<div class="drum-corner">'+esc(p().grid)+' steps</div>'+Array.from({length:count},(_,i)=>'<span class="drum-step-heading">'+(i+1)+'</span>').join('')+pitches.map(pitch=>`<button class="drum-name" data-drum-audition="${pitch}">${esc(DRUMS[pitch]||'MIDI '+pitch)}</button>`+Array.from({length:count},(_,i)=>{const beat=start+i*step,notes=track().notes.filter(n=>n.pitch===pitch&&n.start>=beat-.00001&&n.start<Math.min(start+unit,beat+step)-.00001),n=notes[0];return `<button class="drum-step ${n?'active':''} ${n&&n.id===drumSelection?'selected':''}" data-drum-pitch="${pitch}" data-drum-step="${i}" aria-label="${esc(DRUMS[pitch]||pitch)}, step ${i+1}${n?', velocity '+n.velocity:''}" aria-pressed="${!!n}" style="--velocity:${n?n.velocity/127:0}">${n?'<span>'+n.velocity+'</span>':''}</button>`}).join('')).join('');
 }
 $('drum-row').replaceChildren(...Object.entries(DRUMS).map(([n,name])=>new Option(name,n)));
 $('drum-row').onchange=renderDrums;$('drum-bar').onchange=()=>{drumBar=Math.round(+$('drum-bar').value)||1;renderDrums()};
 $('drum-prev').onclick=()=>{drumBar--;renderDrums()};$('drum-next').onclick=()=>{drumBar++;renderDrums()};
 $('drum-grid').onclick=async e=>{const audition=e.target.closest('[data-drum-audition]');if(audition){if(await host.ensureAudio())host.audition(+audition.dataset.drumAudition,+$('drum-velocity').value);return}const b=e.target.closest('[data-drum-step]');if(!b||api.playing())return;const pitch=+b.dataset.drumPitch,step=gridBeats(p().grid),start=(drumBar-1)*barBeats(p())+(+b.dataset.drumStep)*step,existing=track().notes.find(n=>n.pitch===pitch&&n.start>=start-.00001&&n.start<start+step-.00001);
  if(existing&&$('drum-tool').value==='velocity'){drumSelection=existing.id;$('drum-velocity').value=existing.velocity;$('drum-velocity-value').textContent=existing.velocity;api.select([existing.id]);renderDrums();return}
  api.edit(()=>{if(existing){track().notes=track().notes.filter(n=>n!==existing);drumSelection=null}else{const n={id:uid(),pitch,velocity:+$('drum-velocity').value,start,duration:Math.min(step*.8,.2,songBeats(p())-start)};n.original={start,duration:n.duration};track().notes.push(n);drumSelection=n.id;api.select([n.id])}});
  if(!existing&&await host.ensureAudio())host.audition(pitch,+$('drum-velocity').value);
 };
 $('drum-velocity').oninput=()=>{$('drum-velocity-value').textContent=$('drum-velocity').value};
 $('drum-velocity').onchange=()=>{const n=track().notes.find(n=>n.id===drumSelection);if(n)api.edit(()=>{n.velocity=+$('drum-velocity').value})};
 for(const b of document.querySelectorAll('[data-editor-choice]'))b.onclick=()=>{api.cancelStep();const changed=editor!==b.dataset.editorChoice;editor=b.dataset.editorChoice;renderEditor();if(changed&&editor==='piano')api.centerNotes(true)};

 function lane(){return $('expression-lane').value}
 function matchesLane(c){const info=laneInfo[lane()];return info&&c.type===info.type&&(info.type!=='cc'||c.controller===info.controller)}
 function renderLane(){
  const width=songBeats(p())*api.zoom(),kind=lane(),info=laneInfo[kind],isVelocity=kind==='velocity';$('lane-surface').style.width=width+'px';$('lane-surface').style.setProperty('--lane-grid',gridBeats(p().grid)*api.zoom()+'px');
  if(isVelocity)$('lane-data').innerHTML=track().notes.map(n=>`<span class="velocity-bar ${api.selected().has(n.id)?'selected':''}" data-velocity-note="${esc(n.id)}" style="left:${n.start*api.zoom()}px;height:${n.velocity/127*96}px" title="MIDI ${n.pitch}: ${n.velocity}"></span>`).join('');
  else{
   const list=track().controllers.filter(matchesLane).sort((a,b)=>a.beat-b.beat);let d='',previous=kind==='bend'?8192:kind==='expression'?127:0;d='M0 '+(100-previous/info.max*96);
   for(const c of list){const x=c.beat*api.zoom(),y=100-c.value/info.max*96;d+=' H'+x+' V'+y}d+=' H'+width;
   $('lane-data').innerHTML=`<svg width="${width}" height="108" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2"/></svg>`+list.map(c=>`<span class="controller-point ${laneSelection===c.id?'selected':''}" data-controller-id="${esc(c.id)}" style="left:${c.beat*api.zoom()}px;top:${100-c.value/info.max*96}px"></span>`).join('');
  }
  $('controller-fields').hidden=isVelocity;const chosen=track().controllers.find(c=>c.id===laneSelection&&matchesLane(c));$('controller-beat').disabled=$('controller-value').disabled=$('controller-delete').disabled=!chosen||api.playing();
  $('controller-value').max=info?.max||127;if(chosen){$('controller-beat').value=(chosen.beat+1).toFixed(3);$('controller-value').value=chosen.value}
  $('lane-hint').textContent=isVelocity?'Drag above a note start to change its velocity. Selected notes at the same position change together.':'Draw controller values on the grid. Choose Select / scroll to select a point, edit its values, or scroll with a finger.';
 }
 $('expression-lane').onchange=()=>{laneSelection=null;renderLane()};
 $('lane-tool').onchange=()=>{$('lane-surface').dataset.tool=$('lane-tool').value};
 function lanePoint(e){const r=$('lane-surface').getBoundingClientRect();return {beat:clamp((e.clientX-r.left)/api.zoom(),0,songBeats(p())-.001),height:clamp((100-(e.clientY-r.top))/96,0,1)}}
 function writeLane(e){const pos=lanePoint(e),kind=lane();if(kind==='velocity'){
  const nearest=[...track().notes].sort((a,b)=>Math.abs(a.start-pos.beat)-Math.abs(b.start-pos.beat))[0];if(!nearest)return;
  const selected=api.selected(),list=selected.has(nearest.id)?track().notes.filter(n=>selected.has(n.id)):track().notes.filter(n=>Math.abs(n.start-nearest.start)<.001);for(const n of list)n.velocity=clamp(Math.round(pos.height*127),1,127);api.select(list.map(n=>n.id));
 }else{
  const info=laneInfo[kind],step=gridBeats(p().grid),beat=Math.min(songBeats(p())-.001,Math.round(pos.beat/step)*step),value=kind==='sustain'?(pos.height>=.5?127:0):Math.round(pos.height*info.max);
  const prior=track().controllers.find(c=>matchesLane(c)&&Math.abs(c.beat-beat)<step/2);if(prior){prior.beat=beat;prior.value=value;laneSelection=prior.id}else{const c={id:uid(),type:info.type,...(info.type==='cc'?{controller:info.controller}:{}),beat,value};track().controllers.push(c);laneSelection=c.id}
 }api.renderNotes();persist()}
 $('lane-surface').addEventListener('pointerdown',e=>{
  if(api.playing()||e.button>0)return;if($('lane-tool').value==='select'){
   const point=e.target.closest('[data-controller-id]');if(point){laneSelection=point.dataset.controllerId;renderLane()}return;
  }
  e.preventDefault();api.snapshot();laneGesture=e.pointerId;$('lane-surface').setPointerCapture(e.pointerId);writeLane(e);
 });
 $('lane-surface').addEventListener('pointermove',e=>{if(laneGesture!==null&&laneGesture===e.pointerId){e.preventDefault();writeLane(e)}});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])$('lane-surface').addEventListener(event,()=>{if(laneGesture!==null){laneGesture=null;api.renderAll();persist()}});
 for(const id of ['controller-beat','controller-value'])$(id).onchange=()=>api.edit(()=>{const c=track().controllers.find(c=>c.id===laneSelection);if(!c)return;const v=+$(id).value;if(!Number.isFinite(v))return;if(id==='controller-beat')c.beat=clamp(v-1,0,songBeats(p())-.001);else c.value=clamp(Math.round(v),0,laneInfo[lane()].max)});
 $('controller-delete').onclick=()=>api.edit(()=>{track().controllers=track().controllers.filter(c=>c.id!==laneSelection);laneSelection=null});
 let syncing=false;for(const [from,to] of [['roll-scroll','lane-scroll'],['lane-scroll','roll-scroll']])$(from).addEventListener('scroll',()=>{if(syncing)return;syncing=true;$(to).scrollLeft=$(from).scrollLeft;syncing=false});
 function renderEditor(){
  for(const b of document.querySelectorAll('[data-editor-choice]'))b.setAttribute('aria-pressed',String(b.dataset.editorChoice===editor));
  $('track-overview').hidden=editor!=='overview';$('pattern-editor-heading').hidden=editor==='overview';$('roll-toolbar').hidden=editor==='overview';$('piano-tools').hidden=editor!=='piano';$('roll-find-notes').hidden=editor!=='piano';$('step-recorder').hidden=editor==='overview'||$('step-toggle').getAttribute('aria-pressed')!=='true';$('step-toggle').hidden=editor==='overview';$('step-hint').hidden=editor==='overview'||$('step-toggle').getAttribute('aria-pressed')!=='true';$('expression-panel').hidden=editor==='overview';$('piano-editor').hidden=editor!=='piano';$('drum-editor').hidden=editor!=='drums';document.body.dataset.patternEditor=editor;renderLane();if(editor==='drums')renderDrums();api.centerNotes();
 }

 function selectedExport(){return $('export-source').value==='arrangement'?arrangeProject(p()):patternProject(p())}
 function offerFile(bytes,name,mime){if(exportURL)URL.revokeObjectURL(exportURL);exportURL=URL.createObjectURL(new Blob([bytes],{type:mime}));const a=$('export-download');a.href=exportURL;a.download=name;a.textContent='Download '+name;a.hidden=false}
 function exportBusy(busy){exporting=busy;for(const id of ['export-midi','export-wav','export-stems','export-source','export-tail'])$(id).disabled=busy;$('export-cancel').hidden=!busy;$('export-progress').hidden=!busy}
 $('export-midi').onclick=()=>guard(()=>{if(api.playing())api.stop();const project=selectedExport();offerFile(exportMIDI(project),safeFilename(project.name)+'.mid','audio/midi');$('export-status').textContent='MIDI ready: eight tracks, tempo, meter, section markers and controllers. SoundFont samples and audio effects are not embedded.'});
 async function audioExport(stems){
  if(exporting)return;let generation=++exportGeneration;
  try{
   api.stop();const project=selectedExport(),effects=clone(host.effects()),master=host.master(),tail=+$('export-tail').value,estimate=(projectTempoMap(project).secondsAt(songBeats(project))+tail)*44100*4*(stems?8:1);
   if(estimate>180*1024*1024)throw new Error('This audio export is too large for the in-browser renderer. Use a shorter song, fewer effect-tail seconds, or MIDI export.');
   exportBusy(true);$('export-download').hidden=true;$('export-status').textContent='Preparing the SoundFont samples…';$('export-progress').value=0;
   const bank=await host.exportBank();if(generation!==exportGeneration)return;
   exportWorker=new Worker('./assets/export-worker.js?v=32',{type:'module'});
   exportWorker.onmessage=({data})=>{if(generation!==exportGeneration)return;if(data.type==='progress'){$('export-progress').value=data.percent;$('export-status').textContent=data.label+' · '+data.percent+'%'}else{
    exportWorker.terminate();exportWorker=null;exportBusy(false);
    if(data.type==='error'){$('export-status').textContent='Export failed: '+data.message;return}
    offerFile(data.buffer,data.name,data.mime);$('export-status').textContent=(stems?'Eight aligned WAV tracks ready in a ZIP.':'Stereo WAV ready.')+(data.clipped?' Some peaks clipped; lower the master volume and export again.':'')+' Includes '+tail+' seconds for release and effect tails.';
   }};
   exportWorker.onerror=e=>{exportWorker?.terminate();exportWorker=null;exportBusy(false);$('export-status').textContent='Export failed: '+(e.message||'Could not start the renderer.')};
   exportWorker.postMessage({project,bank,effects,master,tail,stems},[bank]);
  }catch(e){if(generation!==exportGeneration)return;exportWorker?.terminate();exportWorker=null;exportBusy(false);$('export-status').textContent=e.message}
 }
 $('export-wav').onclick=()=>audioExport(false);$('export-stems').onclick=()=>audioExport(true);$('export-cancel').onclick=()=>{exportGeneration++;exportWorker?.terminate();exportWorker=null;exportBusy(false);$('export-status').textContent='Export cancelled.'};
 function renderLock(){timeline.renderLock();
  if(api.playing()&&!exporting){for(const id of ['export-midi','export-wav','export-stems'])$(id).disabled=true}else if(!exporting){for(const id of ['export-midi','export-wav','export-stems'])$(id).disabled=false}
  for(const id of ['bars-copy','bars-move','bars-duplicate','bars-erase','scene-name','scene-copy','scene-copy-target','scene-clear','performance-name','song-add','song-clear','punch-enabled','punch-from','punch-to','recovery-previous'])$(id).disabled=api.playing();
 }
 function render(){
  // Length changes keep disabled punch settings valid; enabled ranges are checked before shortening.
  if(!p().punch.enabled){p().punch.from=Math.min(p().punch.from,p().bars);p().punch.to=clamp(p().punch.to,p().punch.from,p().bars)}
  $('punch-enabled').checked=p().punch.enabled;$('punch-from').value=p().punch.from;$('punch-to').value=p().punch.to;
  renderScenes();renderSong();renderEditor();renderLock();persist();
 }
 return {render,renderSongPosition:timeline.renderPosition,renderScenes,renderSceneState,renderEditor,renderLock,persist,persistNow,checkpoint,initialise};
}
