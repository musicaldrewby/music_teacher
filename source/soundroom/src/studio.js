import {projectTempoMap} from './tempo-map.js';
import {trackColor} from './usability-model.js';
import {StepRecorder} from './composition-model.js';
import {createPerformanceLibrary} from './composition-ui.js';
import {arrangeProject,arrangementBars} from './arrangement.js';
import {createWorkstation} from './workstation.js';
import {GRID_OPTIONS,gridBeats,barBeats,songBeats,noteSegments,clone,uid,patchKey,createProject,patternProject,MAX_SONG_BARS,snapBeat,quantizeNotes,restoreTiming,Recorder,compileScore,compileRecordedChange,trackAudible,validateProject} from './sequencer-model.js';
import {clamp} from './performance-engine.js';
import {METRONOME_SOUNDS} from './metronome.js';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const noteName=n=>['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][n%12]+(Math.floor(n/12)-1);
const drumNames={35:'Acoustic kick',36:'Kick',37:'Side stick',38:'Snare',39:'Clap',40:'Electric snare',41:'Low tom',42:'Closed hat',43:'Low tom',44:'Pedal hat',45:'Mid tom',46:'Open hat',47:'Mid tom',48:'High tom',49:'Crash',50:'High tom',51:'Ride',54:'Tambourine',56:'Cowbell'};
export function createStudio(host){
 let clickPreviewTimer=null,clickPreviewActive=false,clickPreviewToken=0;
 let performanceLibrary=null;
 let pendingNoteCenter=true;
 let workstation=null,playbackProject=null,playbackTempo=null,queuedScene=null,sceneQueueId=0,sceneChanges=[];const $=id=>document.getElementById(id);let project=createProject(host.presets()),playing=false,recording=false,starting=false,startToken=0,origin=null,absoluteBeat=0,view='perform',tool='draw',selection=new Set(),undo=[],redo=[],dirty=false,gesture=null,px=56,meters=[],pendingInput=[],startTimer=null,endTimer=null;
 let recordedPaintTimer=null,recordedPaint=[],engineCapture=false,finishing=null,finishTimer=null,inputSerial=0;const pendingLive=new Map();
 const step=new StepRecorder(notes=>edit(()=>{track().notes.push(...notes);selection=new Set(notes.map(n=>n.id));return 'Step entered · '+notes.length+' note'+(notes.length===1?'':'s')+'.'}));let stepToken=0;
 const recorder=new Recorder(project,change=>{
  dirty=true;if(!playing||origin===null)return;
  const events=compileRecordedChange(project,change);
  if(events.length)host.post({type:'soundroom-append',runId:startToken,events});
  // Never rebuild the editor, track list or autosave inside a MIDI callback.
  if(view==='sequence'&&change.note){recordedPaint.push(change);if(recordedPaintTimer===null)recordedPaintTimer=setTimeout(paintRecordedNotes,50)}
 });
 function cancelRecordedPaint(){clearTimeout(recordedPaintTimer);recordedPaintTimer=null;recordedPaint=[]}
 function paintRecordedNotes(){
  const changes=recordedPaint;recordedPaint=[];recordedPaintTimer=null;
  if(view!=='sequence'||!recording)return;
  const total=songBeats(project),notes=changes.filter(c=>c.track===project.selectedTrack).flatMap(c=>noteSegments(c.note,total,project.loop));
  if(notes.length)$('roll-notes').insertAdjacentHTML('beforeend',notes.map(noteMarkup).join(''));
  $('note-count').textContent=track().notes.length+' notes · recording';
  const overview=$('track-list').querySelector('[data-track="'+project.armedTrack+'"] .track-overview span');
  if(overview)overview.textContent=project.tracks[project.armedTrack].notes.length+' notes';
 }

 function status(message){$('studio-status').textContent=message}
 function historyState(){return {project:clone(project),effects:clone(host.effects()),master:host.master(),cursor:step.cursor}}
 function restoreState(state){project=state.project;host.restoreEffects(state.effects,state.master);step.cancel();step.cursor=Math.min(state.cursor,songBeats(project))}
 function snapshot(){undo.push(historyState());if(undo.length>30)undo.shift();redo=[];dirty=true;updateHistory();workstation?.persist()}
 function updateHistory(){$('seq-undo').disabled=!undo.length||playing||!!finishing;$('seq-redo').disabled=!redo.length||playing||!!finishing}
 function track(){return project.tracks[project.selectedTrack]}
 function inputTrack(){return recording?project.armedTrack:project.selectedTrack}
 function timeBeat(time=host.inputTime()){const beat=origin===null?0:playbackTempo?playbackTempo.beatAt(time-origin):(time-origin)*project.tempo/60;return Math.abs(beat)<1e-9?0:beat}
 function displaySelected(){host.displayTrack(track(),project.selectedTrack);$('active-track').textContent=(project.selectedTrack+1)+' / '+track().name;renderInspector()}
 function applyTrack(i,mix=true){const synth=host.synth();if(!synth)return;const t=project.tracks[i];for(const ch of [i,i+8]){synth.midiChannels[ch].setDrums(t.patch.isGMGSDrum);synth.controllerChange(ch,0,t.patch.bankMSB);synth.controllerChange(ch,32,t.patch.bankLSB);synth.programChange(ch,t.patch.program);synth.pitchWheelRange(ch,2);synth.midiChannels[ch].setSystemParameter('fineTune',t.shape.tune);synth.controllerChange(ch,73,t.shape.attack);synth.controllerChange(ch,72,t.shape.release);synth.controllerChange(ch,74,t.shape.brightness)}if(mix)applyMixer()}
 function applyMixer(){const s=host.synth();if(!s)return;const fx=host.effects();for(const [i,t] of project.tracks.entries())for(const ch of [i,i+8]){s.midiChannels[ch].setSystemParameter('gain',trackAudible(project,i)&&(ch>=8||t.monitor)?.9:0);s.controllerChange(ch,7,t.volume);s.controllerChange(ch,10,t.pan);s.controllerChange(ch,91,fx.reverbEnabled?t.reverb:0);s.controllerChange(ch,94,fx.delayEnabled?t.delay:0);s.controllerChange(ch,93,0)}}
 function applyAllTracks(){for(let i=0;i<8;i++)applyTrack(i,false);applyMixer()}
 function attachAudio(){const a=host.audio(),s=host.synth();meters=[];if(a?.createAnalyser&&s?.connectChannel){const silent=a.createGain();silent.gain.value=0;silent.connect(a.destination);for(let i=0;i<8;i++){const analyser=a.createAnalyser();analyser.fftSize=256;analyser.connect(silent);s.connectChannel(analyser,i);s.connectChannel(analyser,i+8);meters.push({analyser,samples:new Float32Array(256)})}}applyAllTracks()}
 function chooseTrack(i){if(i===project.selectedTrack)return;disableStep();host.clearLive();project.selectedTrack=i;pendingNoteCenter=true;selection.clear();displaySelected();renderTracks();renderNotes();renderMixer();status('Track '+(i+1)+' selected. '+(recording?'Recording continues on track '+(project.armedTrack+1)+'.':'Choose its patch or play your controller.'))}
 function chooseScene(index){
  if(!Number.isInteger(index)||index<0||index>7)return;
  if(recording||starting||playbackProject){status(recording?'Finish the take before changing scenes.':'Stop song playback before selecting a pattern.');return}
  if(playing){queuedScene=index;const queueId=++sceneQueueId;host.post({type:'soundroom-queue',runId:startToken,queueId,scene:index,barBeats:barBeats(project),score:compileScore(patternProject(project,index))});workstation?.renderScenes();status('Scene '+(index+1)+' queued · starts on beat 1 of the next measure.');return}
  disableStep();stopClickPreview();host.clearLive();step.cursor=0;project.selectedScene=index;pendingNoteCenter=true;selection.clear();renderAll();status('Scene '+(index+1)+' · '+project.scenes[index].name+' · '+project.bars+' measures. The performance is shared across all scenes.');
 }
 function syncScene(){let changed=false;while(sceneChanges.length&&host.inputTime()>=sceneChanges[0].origin){const change=sceneChanges.shift();project.selectedScene=change.scene;origin=change.origin;absoluteBeat=Math.max(0,timeBeat());selection.clear();if(change.queueId===sceneQueueId)queuedScene=null;changed=true}if(changed){pendingNoteCenter=true;renderAll();status('Playing scene '+(project.selectedScene+1)+' · '+project.scenes[project.selectedScene].name+'.')}}
 function setView(next){if(next!=='sequence')disableStep();if(next==='sequence'&&view!==next)pendingNoteCenter=true;view=next;host.onWorkspace?.(next);document.body.dataset.workspace=view;for(const b of document.querySelectorAll('[data-workspace-choice]'))b.setAttribute('aria-pressed',String(b.dataset.workspaceChoice===view));$('sequence-panel').hidden=view!=='sequence';$('song-panel').hidden=view!=='song';$('mixer-panel').hidden=view!=='mixer';if(view==='sequence')renderNotes();renderTransport()}
 async function start(record,alternate=null){if(starting||finishing)return;disableStep();if(playing){stop();if(!record||finishing)return}stopClickPreview();starting=true;const token=++startToken;renderTransport();
  try{if(!await host.ensureAudio()||token!==startToken)return;host.clearLive();host.stopDemos();
   if(record){if(project.armedTrack<0)project.armedTrack=project.selectedTrack;snapshot();recorder.start(project.armedTrack)}
   engineCapture=false;pendingLive.clear();recording=record;playing=true;queuedScene=null;sceneChanges=[];playbackProject=alternate;playbackTempo=alternate?projectTempoMap(alternate):null;origin=null;pendingInput=[];const score=compileScore(alternate||project,record);absoluteBeat=-score.countIn;applyAllTracks();
   status('Starting audio…');startTimer=setTimeout(()=>{if(token===startToken&&origin===null){stop(false);status('Audio did not start. Enable sound and try again.')}},5000);
   // Prepare the editor before starting the audio clock, including with no count-in.
   renderTracks();renderNotes();host.post({type:'soundroom-start',runId:token,score});
  }finally{if(!playing||origin!==null)starting=false;renderTransport()}
 }
 function finishStopped(notify){
  renderTransport();renderTracks();renderNotes();
  if(notify)status('Stopped. '+(dirty?'Save your project to keep this session.':'Ready to record or edit.'));
  workstation?.persistNow();
 }
 function stop(notify=true){
  disableStep();if(finishing)return;
  cancelRecordedPaint();stopClickPreview();const runId=startToken++;starting=false;playing=false;
  clearTimeout(startTimer);clearTimeout(endTimer);startTimer=endTimer=null;
  if(recording&&engineCapture)finishing={runId,origin,inputs:pendingInput,notify};
  else if(recording){recorder.stop(Math.max(0,timeBeat()));dirty=true}
  pendingInput=[];recording=false;playbackProject=null;playbackTempo=null;queuedScene=null;sceneChanges=[];origin=null;absoluteBeat=0;
  // Keep recording state until the audio thread confirms its final events.
  // Save/New/Record stay locked during this brief finalization.
  if(finishing)finishTimer=setTimeout(()=>{if(finishing){const time=host.audio()?.currentTime||0;finishTake(time,finishing.origin,true)}},5000);
  host.post({type:'soundroom-stop',runId});host.clearLive();
  if(finishing){renderTransport();status('Finishing recorded notes…')}else finishStopped(notify);
 }
 function finishTake(time,stopOrigin,estimated=false){
  const take=finishing;if(!take)return;clearTimeout(finishTimer);finishTimer=null;
  const start=take.origin??stopOrigin;
  if(estimated)take.inputs.push(...pendingLive.values());pendingLive.clear();
  if(Number.isFinite(start)){
   for(const e of take.inputs)recorder[e.method](...e.args,(e.time-start)*project.tempo/60);
   recorder.stop(Math.max(0,(time-start)*project.tempo/60));
  }else recorder.stop(0);
  finishing=null;dirty=true;finishStopped(take.notify);
  if(estimated)status('Audio stopped responding. The take was kept; its final pending input times were estimated. Enable sound before recording again.');
 }
 function renderTransport(){
  $('seq-play').textContent=playing&&!recording?'■ Stop':view==='song'?'▶ Play song':'▶ Play pattern';$('seq-record').textContent=recording?'■ Finish take':'● Record';$('seq-record').setAttribute('aria-pressed',String(recording));$('seq-play').disabled=starting||!!finishing;$('seq-record').disabled=starting||!!finishing||view==='song';
  $('seq-loop').setAttribute('aria-pressed',String(project.loop));$('seq-loop').textContent='Pattern loop '+(project.loop?'on':'off');
  for(const id of ['seq-tempo','tempo-down','tempo-up','seq-bars','seq-meter','seq-count-in','seq-record-mode','seq-record-grid','seq-click','seq-click-preview','seq-loop','seq-quantize','seq-restore','seq-clear-track','seq-save','seq-load','seq-new'])$(id).disabled=playing||starting||!!finishing;
  $('project-save').disabled=playing||starting||!!finishing;renderRecordSummary();host.recordingState?.(recording||starting||!!finishing);$('track-monitor').disabled=recording||!!finishing;
  $('roll-scroll').setAttribute('aria-disabled',String(playing));updateHistory();renderPosition();workstation?.renderLock();performanceLibrary?.renderLock();renderStep();
 }
 function renderTempo(){
  const beat=Math.min(Math.max(0,absoluteBeat),songBeats(playbackProject||project)-1e-9),section=playbackProject?.sections.find(s=>beat>=(s.from-1)*barBeats(project)&&beat<(s.from+s.bars-1)*barBeats(project)),scene=section?.scene??project.selectedScene;
  const value=playbackTempo?playbackTempo.tempoAt(Math.max(0,absoluteBeat)):project.tempo,locked=playing||starting||!!finishing,input=$('seq-tempo');
  if(locked||document.activeElement!==input)input.value=value;
  $('tempo-context').textContent='Scene '+(scene+1)+(locked?' · '+(playbackProject?'Song':'Playing'):' · Pattern');
  const hint='Scene '+(scene+1)+' · '+project.scenes[scene].name+'. '+(locked?'Stop playback to edit tempo.':'Set this pattern’s tempo, 30–300 BPM.');
  $('tempo-control').title=hint;input.title=hint;input.setAttribute('aria-label','Scene '+(scene+1)+' tempo in beats per minute');
 }
 function renderPosition(){renderTempo();const pp=playbackProject||project,total=songBeats(pp),beat=absoluteBeat<0?absoluteBeat:pp.loop?absoluteBeat%total:Math.min(absoluteBeat,total);$('seq-position').textContent=beat<0?'Count '+Math.ceil(-beat*pp.meter[1]/4):String(Math.min(pp.bars,Math.floor(beat/barBeats(pp))+1)).padStart(2,'0')+' : '+String(Math.floor((beat%barBeats(pp))*pp.meter[1]/4)+1).padStart(2,'0');const inPunch=!project.punch.enabled||beat>=(project.punch.from-1)*barBeats(project)&&beat<project.punch.to*barBeats(project);$('seq-state').textContent=recording?(beat<0?'Count-in':!inPunch?'Waiting for punch':(project.recordMode==='replace'?'Record over T':'Overdub T')+(project.armedTrack+1)):playing?(playbackProject?'Song':'Pattern '+(project.selectedScene+1)):'Stopped';const section=pp.sections?.find(s=>beat>=(s.from-1)*barBeats(pp)&&beat<(s.from+s.bars-1)*barBeats(pp));$('seq-current-section').textContent=section?.name||project.scenes[project.selectedScene].name;workstation?.renderSceneState(playing?(playbackProject?section?.scene:project.selectedScene):null,playing&&beat>=0?((beat%barBeats(pp))+barBeats(pp))%barBeats(pp)/barBeats(pp):0);$('roll-playhead').style.left=(70+Math.max(0,beat)*px)+'px';$('roll-playhead').hidden=!playing||!!playbackProject;const fraction=Math.max(0,beat)/total;$('overview-playhead').style.left=`calc(var(--overview-offset) * ${1-fraction} + ${fraction*100}%)`;$('overview-playhead').hidden=!playing||!!playbackProject;workstation?.renderSongPosition(beat,playing&&!!playbackProject)}
 function renderTracks(){renderRecordSummary();$('nav-track').replaceChildren(...project.tracks.map((t,i)=>new Option((i+1)+' / '+t.name,String(i))));$('nav-track').value=String(project.selectedTrack);const total=songBeats(project);$('track-list').innerHTML=project.tracks.map((t,i)=>`<div class="seq-track ${i===project.selectedTrack?'selected':''}" data-track="${i}" style="--track-color:${trackColor(i)}"><button class="track-select" data-action="select" aria-pressed="${i===project.selectedTrack}"><b>${String(i+1).padStart(2,'0')}</b><span>${escape(t.name)}<small>${escape(t.patch.name)}</small></span></button><div class="track-buttons"><button data-action="arm" aria-label="Arm track ${i+1}" aria-pressed="${project.armedTrack===i}" ${playing?'disabled':''}>R</button><button data-action="mute" aria-label="Mute track ${i+1}" aria-pressed="${t.mute}">M</button><button data-action="solo" aria-label="Solo track ${i+1}" aria-pressed="${t.solo}">S</button></div><button class="track-overview" data-action="select" aria-label="Open track ${i+1}, ${t.notes.length} notes">${t.notes.slice(0,2000).flatMap(n=>noteSegments(n,total,project.loop)).map(n=>`<i style="left:${n.start/total*100}%;width:${Math.max(.2,n.duration/total*100)}%;top:${8+(127-n.pitch)/127*24}px"></i>`).join('')}<span>${t.notes.length? t.notes.length+' notes':'Ready to record'}</span></button></div>`).join('');renderPlayStrip();workstation?.persist()}
 function renderInspector(){
  const t=track();$('track-name').value=t.name;$('track-patch').replaceChildren(...host.presets().map(p=>new Option(String(p.program+1).padStart(3,'0')+' · '+p.name+(p.isDrum?' [drums]':''),patchKey(p))));$('track-patch').value=patchKey(t.patch);
  $('track-monitor').checked=t.monitor;$('editor-track').textContent='Track '+(project.selectedTrack+1)+' · '+t.name;
 }
 function noteMarkup(n){return `<button type="button" class="roll-note ${selection.has(n.id)?'selected':''}" data-note-id="${escape(n.id)}" aria-label="${noteName(n.pitch)}, beat ${(n.start+1).toFixed(2)}, length ${n.duration.toFixed(2)}" aria-pressed="${selection.has(n.id)}" style="left:${n.start*px}px;top:${(127-n.pitch)*24+2}px;width:${Math.max(5,n.duration*px)}px;opacity:${.5+n.velocity/254}"><span>${escape(noteName(n.pitch))}</span>${n.continues?'':'<i class="resize-note" aria-hidden="true"></i>'}</button>`}
 function renderNotes(){cancelRecordedPaint();const total=songBeats(project),height=128*24;const surface=$('roll-surface');surface.style.width=(70+total*px)+'px';surface.style.height=(height+28)+'px';
  $('roll-grid').style.width=total*px+'px';$('roll-grid').style.height=height+'px';$('roll-grid').style.setProperty('--grid-width',gridBeats(project.grid)*px+'px');$('roll-grid').style.setProperty('--bar-width',barBeats(project)*px+'px');
  $('roll-ruler').innerHTML=Array.from({length:project.bars},(_,i)=>`<span style="left:${70+i*barBeats(project)*px}px;width:${barBeats(project)*px}px">${i+1}</span>`).join('');
  $('roll-labels').innerHTML=Array.from({length:128},(_,r)=>{const n=127-r;return `<span class="${[1,3,6,8,10].includes(n%12)?'black':''}">${escape(track().patch.isDrum&&drumNames[n]||noteName(n))}</span>`}).join('');
  $('roll-notes').innerHTML=track().notes.flatMap(n=>noteSegments(n,total,project.loop)).map(noteMarkup).join('');
  $('note-count').textContent=track().notes.length+' notes · '+selection.size+' selected';renderNoteFields();renderPosition();renderStep();workstation?.renderEditor();
 }
 function centerNotes(force=false){
  if(force)pendingNoteCenter=true;
  const scroll=$('roll-scroll'),height=scroll.clientHeight;
  if(!pendingNoteCenter||view!=='sequence'||$('piano-editor').hidden||!(height>28))return;
  const t=track(),counts=new Uint32Array(128);let low=127,high=0,total=0,pitch=t.patch.isDrum?42:60;
  for(const note of t.notes){if(!Number.isInteger(note.pitch)||note.pitch<0||note.pitch>127)continue;counts[note.pitch]++;total++;low=Math.min(low,note.pitch);high=Math.max(high,note.pitch)}
  if(total){
   pitch=(low+high)/2;
   // Keep a wide-range part on actual notes instead of an empty octave between them.
   if((high-low+3)*24>height-28){let seen=0;for(let n=low;n<=high;n++){seen+=counts[n];if(seen>=total/2){pitch=n;break}}}
  }
  scroll.scrollTop=clamp((127-pitch)*24+12-(height-28)/2,0,Math.max(0,128*24+28-height));pendingNoteCenter=false;
 }
 $('roll-find-notes').onclick=()=>centerNotes(true);
 function chosen(){return track().notes.filter(n=>selection.has(n.id))}
 function renderNoteFields(){const list=chosen(),n=list[0];$('note-selection-summary').textContent=list.length?list.length+' selected · Track '+(project.selectedTrack+1)+' · '+track().name:'Select notes in the piano roll to edit their values.';for(const id of ['note-pitch','note-start','note-length','note-velocity'])$(id).disabled=!n||playing;
  if(n){$('note-pitch').value=n.pitch;$('note-start').value=(n.start+1).toFixed(3);$('note-length').value=n.duration.toFixed(3);$('note-velocity').value=n.velocity}
 }
 function renderMixer(){$('mixer-strips').innerHTML=project.tracks.map((t,i)=>`<article class="mixer-strip ${i===project.selectedTrack?'selected':''}" data-mix-track="${i}" style="--track-color:${trackColor(i)}"><button class="mix-name" data-mix-action="select"><b>${String(i+1).padStart(2,'0')}</b>${escape(t.name)}</button><div class="mix-patch">${escape(t.patch.name)}</div><div class="mix-switches"><button data-mix-action="mute" aria-pressed="${t.mute}" aria-label="Mute track ${i+1}">M</button><button data-mix-action="solo" aria-pressed="${t.solo}" aria-label="Solo track ${i+1}">S</button></div><div class="level-meter" role="meter" aria-label="Track ${i+1} signal level" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="track-meter-${i}"><i></i></div>${[['volume','Volume'],['pan','Pan'],['reverb','Reverb send'],['delay','Delay send']].map(([key,label])=>`<label for="mix-${i}-${key}" class="mix-control ${key==='volume'?'fader':''}"><span>${label}<button type="button" class="value-button" data-mix-value="${key}" title="Type a value or reset ${label}"><output data-mix-output="${i}-${key}">${mixValue(key,t[key])}</output></button></span><input id="mix-${i}-${key}" type="range" min="0" max="127" value="${t[key]}" data-mix-param="${key}" aria-label="Track ${i+1} ${label}"></label>`).join('')}</article>`).join('')}
 function mixValue(key,value){return key==='pan'?(value===64?'C':value<64?'L '+Math.round((64-value)/64*100):'R '+Math.round((value-64)/63*100)):Math.round(value/127*100)+'%'}
 function renderRecordSummary(){
  const i=project.armedTrack<0?project.selectedTrack:project.armedTrack,t=project.tracks[i],scene=project.scenes[project.selectedScene],grid=project.recordGrid==='off'?'Free timing':project.recordGrid+' grid';
  const summary=(recording?'Recording → ':'Record → ')+'Scene '+(project.selectedScene+1)+' · '+scene.name+' · T'+(i+1)+' '+t.name+' · '+(project.recordMode==='replace'?'Record over':'Overdub')+' · '+grid+(project.countIn?' · '+project.countIn+' bar count-in':'');
  $('record-summary').textContent=summary;$('record-summary').title=summary;$('transport-dock').dataset.recording=String(recording);
  const input=inputTrack(),selected=project.tracks[project.selectedTrack],live=project.tracks[input];
  $('play-target').textContent='Selected: T'+(project.selectedTrack+1)+' '+selected.name+' · Keys / MIDI: T'+(input+1)+' '+live.name;$('play-target').title=$('play-target').textContent;
  for(const id of ['nav-track','editor-track','play-target','inspector-context'])$(id).style.setProperty('--track-color',trackColor(project.selectedTrack));
  $('record-summary').style.setProperty('--track-color',trackColor(i));
  $('inspector-context').textContent='Scene '+(project.selectedScene+1)+' · '+scene.name+' / T'+(project.selectedTrack+1)+' '+selected.name;
  $('record-target').textContent='Records Track '+(i+1)+' · '+t.name+' in Scene '+(project.selectedScene+1)+'.';$('project-title').textContent=project.name;
 }
 function renderRecordMode(){renderRecordSummary();$('record-mode-help').textContent=project.recordMode==='replace'?(project.punch.enabled?'Record over replaces only the punch range on the armed track. Undo restores it.':'Record over replaces the armed track with a fresh take. Undo restores it.'):'Overdub keeps existing notes and adds your new performance.'}
 function renderSettings(){renderRecordMode();renderMetronome();for(const [id,key] of [['seq-name','name'],['seq-tempo','tempo'],['seq-bars','bars'],['seq-count-in','countIn'],['seq-click','metronome'],['seq-click-volume','clickVolume'],['seq-grid','grid'],['seq-record-grid','recordGrid'],['seq-record-mode','recordMode'],['seq-quant-grid','quantizeGrid'],['seq-strength','strength'],['seq-swing','swing']])$(id).value=project[key];$('seq-meter').value=project.meter.join('/');$('seq-snap').checked=project.snap;$('seq-length-quant').checked=project.quantizeLength;$('seq-strength-value').textContent=project.strength+'%';$('seq-swing-value').textContent=project.swing+'%'}
 function renderAll(){renderSettings();renderTracks();renderInspector();renderNotes();renderMixer();renderTransport();displaySelected();workstation?.render();performanceLibrary?.render()}
 function edit(fn){if(step.held.size){status("Release the chord before editing.");return false}if(playing||starting||finishing){status('Stop playback before editing notes. Mixer controls remain live.');return false}snapshot();let message;try{message=fn();if(arrangementBars(project)>MAX_SONG_BARS)throw new Error('The song order is too long. Reduce repeats or remove entries.');if(project.tracks.some(t=>t.notes.length>10000||t.controllers.length>20000))throw new Error('This edit exceeds the event limit for one track. Use a shorter range or fewer repeats.')}catch(e){restoreState(undo.pop());recorder.project=project;applyAllTracks();renderAll();status(e.message);return false}renderAll();status(typeof message==='string'?message:'Edited. Undo is available.');return true}
 function afterModel(){step.cancel();step.cursor=Math.min(step.cursor,songBeats(project));recorder.project=project;selection.clear();applyAllTracks();renderAll()}
 function history(back){if(playing||starting||finishing)return;step.cancel();host.clearLive();const source=back?undo:redo,target=back?redo:undo;if(!source.length)return;target.push(historyState());restoreState(source.pop());dirty=true;afterModel();status(back?'Undone.':'Redone.')}
 function capture(method,args,time){if(!recording)return;if(origin===null){pendingInput.push({method,args,time});return}recorder[method](...args,timeBeat(time))}
 function recordOn(owner,note,velocity,time){if(step.enabled&&!playing){step.on(owner,note,velocity,songBeats(project));renderStep();return}capture('noteOn',[owner,note,velocity],time)}
 function recordOff(owner,time){if(step.enabled&&!playing){if(step.off(owner,songBeats(project))){const entered=track().notes.filter(n=>step.previous.includes(n.id)),scroll=$('roll-scroll');if(entered.length&&scroll.clientHeight){const y=(127-Math.max(...entered.map(n=>n.pitch)))*24;if(y<scroll.scrollTop||y>scroll.scrollTop+scroll.clientHeight-70)scroll.scrollTop=Math.max(0,y-60)}}renderStep();return}capture('noteOff',[owner],time)}
 function recordController(event,time){capture('controller',[event],time)}
 function recordLive(method,args,messages,adjustment=0){
  if(!recording)return;engineCapture=true;
  const inputId=++inputSerial;pendingLive.set(inputId,{method,args,time:(host.audio()?.currentTime||0)+adjustment});
  host.post({type:'soundroom-live-input',runId:startToken,inputId,method,args,messages,adjustment});
 }
 function receive(message){
  if(message.type==='soundroom-input-recorded'){
   if(!['noteOn','noteOff','controller'].includes(message.method))return;
   if(finishing&&message.runId===finishing.runId){pendingLive.delete(message.inputId);finishing.inputs.push(message)}
   else if(recording&&message.runId===startToken){pendingLive.delete(message.inputId);capture(message.method,message.args,message.time)}
   return;
  }
  if(message.type==='soundroom-stopped'&&finishing&&message.runId===finishing.runId){
   finishTake(message.time,message.origin);return;
  }
  if(!playing||message.runId!==startToken)return;
  if(message.type==='soundroom-scene-switched'){sceneChanges.push(message);sceneChanges.sort((a,b)=>a.origin-b.origin);syncScene();return}
  if(message.type==='soundroom-scene-queued')return;
  syncScene();
  if(message.type==='soundroom-started'){
   origin=message.origin;starting=false;clearTimeout(startTimer);startTimer=null;
   const buffered=pendingInput;pendingInput=[];for(const e of buffered)capture(e.method,e.args,e.time);
   status(recording?(project.recordMode==='replace'?'Recording over track ':'Overdubbing track ')+(project.armedTrack+1)+(project.countIn?' after the count-in.':'.'):'Playing all audible tracks.');renderTransport();return;
  }
  if(message.type!=='soundroom-position'||origin===null)return;
  absoluteBeat=Math.max(recording?-project.countIn*barBeats(project):0,timeBeat());renderPosition();
  if(!message.playing&&endTimer===null){const token=startToken,remaining=Math.max(0,origin+(playbackTempo?playbackTempo.secondsAt(songBeats(playbackProject)):songBeats(project)*60/project.tempo)-host.inputTime());endTimer=setTimeout(()=>{if(token===startToken)stop()},remaining*1000)}
 }
 function save(){if(finishing){status('Finishing recorded notes before saving…');return}const data={...clone(project),soundfont:host.bank(),effects:host.effects(),master:host.master()};const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.href=url;a.download=(project.name.replace(/[^a-z0-9_-]+/gi,'_')||'Soundroom')+'.soundroom.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);dirty=false;status('Song saved with its shared performance, all eight scenes and song order. SoundFont samples stay separate.')}
 async function load(file){if(!file||finishing)return;try{if(file.size>64*1024*1024)throw new Error('Song files must be smaller than 64 MB.');const raw=JSON.parse(await file.text());if(raw.soundfont&&(raw.soundfont.id!==host.bank().id||raw.soundfont.name!==host.bank().name))throw new Error('This project uses '+raw.soundfont.name+'. Soundroom now includes GeneralUser GS only. Your current song has been kept.');const next=validateProject(raw,host.presets());workstation?.checkpoint();stop(false);snapshot();project=next;host.restoreEffects(raw.effects,raw.master);afterModel();dirty=false;status('Opened '+project.name+'.'+(raw.version===1?' Original music is in Scene 1. An original-project backup is available in Song mode.':''))}catch(e){status('Could not open project: '+e.message)}finally{$('seq-file').value=''}}

 function disableStep(){stepToken++;step.enabled=false;step.cancel();renderStep()}
 function renderStep(){
  const total=songBeats(project);step.cursor=Math.min(step.cursor,total);const locked=playing||starting||!!finishing,held=step.held.size>0,end=step.cursor>=total-1e-8,measure=Math.floor(step.cursor/barBeats(project))+1,beat=(step.cursor%barBeats(project))*project.meter[1]/4+1;
  $('step-recorder').hidden=!step.enabled;$('step-controls').hidden=!step.enabled;$('step-hint').hidden=!step.enabled;$('step-recorder').classList.toggle('enabled',step.enabled);$('step-toggle').disabled=locked;$('step-toggle').textContent=step.enabled?'Step recording on':'Step recording off';$('step-toggle').setAttribute('aria-pressed',String(step.enabled));
  for(const id of ['step-length','step-rest','step-back','step-measure','step-beat','step-go'])$(id).disabled=locked||held||!step.enabled;
  $('step-rest').disabled||=end;$('step-back').disabled||=step.cursor===0;$('step-tie').disabled=locked||!step.enabled||!step.canTie(track().notes,total);
  $('step-position').textContent=end?'Pattern end':String(measure).padStart(2,'0')+' : '+String(Math.round(beat*1000)/1000).padStart(2,'0');
  if(document.activeElement!==$('step-measure'))$('step-measure').value=Math.min(project.bars,measure);if(document.activeElement!==$('step-beat'))$('step-beat').value=Math.round(beat*1000)/1000;
  $('step-measure').max=project.bars;$('step-beat').max=project.meter[0]+.999;
  $('step-playhead').hidden=!step.enabled||view!=='sequence';$('step-playhead').style.left=(70+step.cursor*px)+'px';
  const scroll=$('roll-scroll'),x=70+step.cursor*px;if(step.enabled&&scroll.clientWidth){if(x>scroll.scrollLeft+scroll.clientWidth-30)scroll.scrollLeft=Math.max(0,x-scroll.clientWidth+70);else if(x<scroll.scrollLeft+70)scroll.scrollLeft=Math.max(0,x-100)}
  $('step-hint').textContent=!step.enabled?'Turn on to enter notes from MIDI or the keyboard, one step at a time. A chord advances when you release its last key.':held?'Release all keys to enter this chord. MIDI velocities are preserved.':end?'End of pattern. Use Back or Set cursor to continue, or increase the pattern length.':'Entering Track '+(project.selectedTrack+1)+' · tap the piano roll to set the cursor. Rest skips a step; Tie extends the previous chord. Back moves without deleting.';
 }
 $('step-length').replaceChildren(...GRID_OPTIONS.map(([v,label])=>new Option(label+' · '+v,v)));$('step-length').value='1/16';
 $('step-toggle').onclick=async()=>{if(playing||starting||finishing)return;if(step.enabled){disableStep();host.clearLive();return}const token=++stepToken;try{if(!await host.ensureAudio()||token!==stepToken||view!=='sequence'||playing||starting||finishing)return;host.clearLive();step.cancel();step.enabled=true;renderStep();status('Step recording · Track '+(project.selectedTrack+1)+'. Play a note or chord, then release.')}catch(e){status(e.message)}};
 $('step-length').onchange=()=>{if(!step.held.size)step.length=gridBeats($('step-length').value);renderStep()};
 $('step-rest').onclick=()=>{if(step.enabled){step.rest(songBeats(project));renderStep()}};
 $('step-back').onclick=()=>{if(step.enabled){step.back(songBeats(project));renderStep()}};
 $('step-tie').onclick=()=>{if(step.enabled){step.tie(track().notes,songBeats(project),edit);renderStep()}};
 $('step-go').onclick=()=>{if(!step.enabled)return;const measure=+$('step-measure').value,beat=+$('step-beat').value;if(!Number.isInteger(measure)||measure<1||measure>project.bars||!Number.isFinite(beat)||beat<1||beat>=project.meter[0]+1){status('Choose a measure and beat within this pattern.');return}step.seek((measure-1)*barBeats(project)+(beat-1)*4/project.meter[1],songBeats(project));renderStep()};
 function renderPlayStrip(){
  $('play-track-strip').innerHTML=project.tracks.map((t,i)=>`<article class="play-part ${project.selectedTrack===i?'selected':''} ${t.mute?'muted':''}" data-track="${i}" style="--track-color:${trackColor(i)}"><button class="play-part-select" data-action="select" aria-label="Select track ${i+1}: ${escape(t.name)}, ${escape(t.patch.name)}" aria-pressed="${project.selectedTrack===i}"><b>${i+1} · ${escape(t.name)}</b><span>${escape(t.patch.name)}</span></button><div class="play-part-controls"><button data-action="arm" aria-label="Arm track ${i+1}" aria-pressed="${project.armedTrack===i}" ${playing||starting||finishing?'disabled':''}>R</button><button data-action="mute" aria-label="Mute track ${i+1}" aria-pressed="${t.mute}">M</button><div class="play-part-signal" id="play-meter-${i}" role="meter" aria-label="Track ${i+1} activity" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div></div></article>`).join('');
 }

 // Build event controls once, then render state separately.
 for(const id of ['seq-grid','seq-quant-grid'])$(id).replaceChildren(...GRID_OPTIONS.map(([v,label])=>new Option(v+' · '+label,v)));
 $('seq-record-grid').replaceChildren(new Option('Off · keep my timing','off'),...GRID_OPTIONS.map(([v,label])=>new Option(v+' · '+label,v)));
 for(const b of document.querySelectorAll('[data-workspace-choice]'))b.onclick=()=>{setView(b.dataset.workspaceChoice);b.blur()};
 function transport(action){
  if(action==='stop')return stop();if(starting||finishing)return;
  if(action==='record')return recording?stop():start(true);
  if(action!=='pattern'&&action!=='song')return;
  if(playing)return stop();try{return start(false,action==='song'?arrangeProject(project):null)}catch(e){status(e.message)}
 }
 $('seq-play').onclick=()=>transport(view==='song'?'song':'pattern');$('seq-record').onclick=()=>transport('record');$('seq-stop').onclick=()=>transport('stop');$('seq-loop').onclick=()=>{project.loop=!project.loop;dirty=true;renderTransport()};
 $('seq-undo').onclick=()=>history(true);$('seq-redo').onclick=()=>history(false);
 $('seq-save').onclick=save;$('seq-load').onclick=()=>$('seq-file').click();$('seq-file').onchange=()=>load($('seq-file').files[0]);$('seq-new').onclick=()=>{workstation?.checkpoint();return edit(()=>{disableStep();host.clearLive();step.cursor=0;project=createProject(host.presets());recorder.project=project;selection.clear();applyAllTracks()})};
 $('seq-name').onchange=()=>{project.name=$('seq-name').value.trim().slice(0,80)||'Untitled song';dirty=true;renderRecordSummary();workstation?.persist()};
 function setTempo(value){
  if(playing||starting||finishing){renderTempo();return}
  if(!Number.isFinite(value)||value<=0){$('seq-tempo').value=project.tempo;return}
  value=clamp(Math.round(value),30,300);if(value===project.tempo){$('seq-tempo').value=value;return}
  stopClickPreview();if(!edit(()=>{project.tempo=value;return 'Scene '+(project.selectedScene+1)+' tempo: '+value+' BPM. Saved with this pattern.'}))$('seq-tempo').value=project.tempo;
 }
 $('seq-tempo').onchange=()=>setTempo(Number($('seq-tempo').value));
 $('tempo-down').onclick=()=>setTempo(project.tempo-1);$('tempo-up').onclick=()=>setTempo(project.tempo+1);
 for(const [id,key,min,max] of [['seq-bars','bars',1,256],['seq-count-in','countIn',0,2]])$(id).onchange=()=>{if(playing)return;const value=clamp(Number($(id).value)||min,min,max);if(key==='bars'&&value<project.bars&&project.tracks.some(t=>t.notes.some(n=>n.start+n.duration>value*barBeats(project))||t.controllers.some(c=>c.beat>value*barBeats(project)))||key==='bars'&&value<project.bars&&(project.punch.enabled&&project.punch.to>value)){status('Move or delete events beyond the new end before shortening the song.');renderSettings();return}edit(()=>{project[key]=Math.round(value)})};
 $('seq-meter').onchange=()=>{if(playing)return;const meter=$('seq-meter').value.split('/').map(Number),newLength=project.bars*meter[0]*4/meter[1];if(project.scenes.some(scene=>scene.tracks.some(t=>t.notes.some(n=>n.start+n.duration>scene.bars*meter[0]*4/meter[1])||t.controllers.some(c=>c.beat>scene.bars*meter[0]*4/meter[1])))){status('One or more scenes have notes beyond the new end. Increase those pattern lengths before choosing this meter.');renderSettings();return}edit(()=>project.meter=meter)};
 for(const [id,key] of [['seq-record-grid','recordGrid'],['seq-record-mode','recordMode'],['seq-click','metronome'],['seq-grid','grid'],['seq-quant-grid','quantizeGrid']])$(id).onchange=()=>{project[key]=$(id).value;dirty=true;if(key==='grid')renderNotes();if(key==='recordMode')renderRecordMode();renderRecordSummary()};
 const clickSettings=()=>({clickTone:project.clickTone,clickAccent:project.clickAccent,clickVolume:project.clickVolume/100});
 function renderMetronome(){
  $('seq-click-tone').value=project.clickTone;$('seq-click-accent').checked=project.clickAccent;$('seq-click-volume').value=project.clickVolume;$('seq-click-volume-value').textContent=project.clickVolume+'%';
  const name=METRONOME_SOUNDS.find(([id])=>id===project.clickTone)?.[1]||'Bright click';
  $('seq-click-summary').textContent=(project.metronome==='off'?'Off':project.metronome==='on'?'Play & record':'Record')+' · '+name+' · '+project.clickVolume+'%';
  $('metronome-open').textContent='Click: '+(project.metronome==='off'?'off':project.metronome==='on'?'on':'record');$('metronome-open').setAttribute('aria-label','Metronome settings · '+name+' · '+project.clickVolume+'%');
  $('seq-click-preview').textContent=clickPreviewActive?'■ Stop preview':'▶ Preview one bar';$('seq-click-preview').setAttribute('aria-pressed',String(clickPreviewActive));
 }
 function updateClick(){dirty=true;renderMetronome();host.post({type:'soundroom-metronome',settings:clickSettings()});workstation?.persist()}
 function stopClickPreview(){clickPreviewToken++;clickPreviewActive=false;clearTimeout(clickPreviewTimer);clickPreviewTimer=null;host.post({type:'soundroom-click-preview',cancel:true});renderMetronome()}
 async function previewClick(){
  if(playing||starting)return;if(clickPreviewActive){stopClickPreview();return}
  const token=++clickPreviewToken;clickPreviewActive=true;renderMetronome();
  try{
   if(!await host.ensureAudio()){if(token===clickPreviewToken)stopClickPreview();return}
   if(token!==clickPreviewToken||playing||starting)return;
   host.post({type:'soundroom-click-preview',settings:clickSettings(),tempo:project.tempo,meter:[...project.meter]});
   const duration=(project.meter[0]-1)*60/project.tempo*4/project.meter[1]+.15;
   clickPreviewTimer=setTimeout(()=>{if(token===clickPreviewToken)stopClickPreview()},duration*1000);
  }catch(e){if(token===clickPreviewToken)stopClickPreview();status('Could not preview the metronome: '+e.message)}
 }
 $('seq-click-tone').replaceChildren(...METRONOME_SOUNDS.map(([id,label])=>new Option(label,id)));
 $('seq-click-tone').onchange=()=>{project.clickTone=$('seq-click-tone').value;updateClick()};
 $('seq-click-accent').onchange=()=>{project.clickAccent=$('seq-click-accent').checked;updateClick()};
 $('seq-click-volume').oninput=$('seq-click-volume').onchange=()=>{project.clickVolume=clamp(Number($('seq-click-volume').value)||0,0,100);updateClick()};
 $('seq-click').onchange=()=>{if(playing||starting)return;project.metronome=$('seq-click').value;updateClick()};
 $('seq-click-preview').onclick=previewClick;
 $('seq-snap').onchange=()=>{project.snap=$('seq-snap').checked};$('seq-length-quant').onchange=()=>{project.quantizeLength=$('seq-length-quant').checked};
 for(const [id,key] of [['seq-strength','strength'],['seq-swing','swing']])$(id).oninput=()=>{project[key]=+$(id).value;$(id+'-value').textContent=project[key]+'%'};
 $('seq-quantize').onclick=()=>edit(()=>quantizeNotes(selection.size?chosen():track().notes,{grid:project.quantizeGrid,strength:project.strength,length:project.quantizeLength,swing:project.swing,total:songBeats(project),wrap:project.loop}));
 $('seq-restore').onclick=()=>edit(()=>restoreTiming(selection.size?chosen():track().notes,songBeats(project),project.loop));
 $('seq-clear-track').onclick=()=>edit(()=>{track().notes=[];track().controllers=[];selection.clear()});
 $('nav-track').onchange=()=>chooseTrack(+$('nav-track').value);
 function trackAction(e){const row=e.target.closest('[data-track]'),button=e.target.closest('[data-action]');if(!row||!button||button.disabled)return;const i=+row.dataset.track,action=button.dataset.action;if(action==='select')chooseTrack(i);else if(action==='arm'){if(playing||starting||finishing)return;project.armedTrack=project.armedTrack===i?-1:i;chooseTrack(i);renderTracks();status(project.armedTrack<0?'No track armed. Record will arm the selected track.':'Track '+(i+1)+' armed.')}else if(action==='mute'||action==='solo'){project.tracks[i][action]=!project.tracks[i][action];dirty=true;applyMixer();renderTracks();renderMixer()}}
 $('track-list').onclick=trackAction;$('play-track-strip').onclick=trackAction;
 $('track-name').onchange=()=>edit(()=>{track().name=$('track-name').value.trim().slice(0,32)||'Track '+(project.selectedTrack+1)});
 $('track-patch').onchange=()=>{if(playing&&recording){status('Finish this take before changing its patch.');renderInspector();return}const patch=host.presets().find(p=>patchKey(p)===$('track-patch').value);if(patch){host.rememberPatch?.(patch);disableStep();host.clearLive();snapshot();track().patch=clone(patch);applyTrack(project.selectedTrack);displaySelected();renderTracks();renderNotes();renderMixer()}};
 $('track-monitor').onchange=()=>{track().monitor=$('track-monitor').checked;applyMixer();dirty=true};
 $('mixer-strips').onclick=e=>{const value=e.target.closest('[data-mix-value]');if(value){const strip=value.closest('[data-mix-track]');if(strip){e.preventDefault?.();host.editValue?.(+strip.dataset.mixTrack,value.dataset.mixValue,value)}return}const row=e.target.closest('[data-mix-track]'),button=e.target.closest('[data-mix-action]');if(!row||!button)return;const i=+row.dataset.mixTrack,action=button.dataset.mixAction;if(action==='select')chooseTrack(i);else{project.tracks[i][action]=!project.tracks[i][action];dirty=true;applyMixer();renderTracks();renderMixer()}};
 $('mixer-strips').oninput=e=>{const input=e.target.closest('[data-mix-param]'),row=e.target.closest('[data-mix-track]');if(!input||!row)return;const i=+row.dataset.mixTrack,key=input.dataset.mixParam;project.tracks[i][key]=+input.value;dirty=true;applyMixer();const output=$('mixer-strips').querySelector(`[data-mix-output="${i}-${key}"]`);if(output)output.textContent=mixValue(key,+input.value)};
 $('seq-zoom').oninput=()=>{px=+$('seq-zoom').value;renderNotes()};
 for(const b of document.querySelectorAll('[data-roll-tool]'))b.onclick=()=>{tool=b.dataset.rollTool;for(const x of document.querySelectorAll('[data-roll-tool]'))x.setAttribute('aria-pressed',String(x===b));$('roll-surface').dataset.tool=tool};
 function point(e){const r=$('roll-surface').getBoundingClientRect();return {beat:clamp((e.clientX-r.left-70)/px,0,songBeats(project)-.001),pitch:clamp(127-Math.floor((e.clientY-r.top-28)/24),0,127)}}
 function snapped(value){return project.snap?Math.max(0,snapBeat(value,project.grid)):value}
 $('roll-surface').addEventListener('pointerdown',e=>{if(step.enabled){if(e.button>0||step.held.size||e.target.closest('.roll-labels'))return;step.seek(snapped(point(e).beat),songBeats(project));renderStep();return}if(e.button>0||e.target.closest('.roll-ruler,.roll-labels'))return;if(playing){status('Stop playback before editing notes.');return}if(tool==='pan')return;const rect=$('roll-surface').getBoundingClientRect();if(e.clientX<rect.left+70||e.clientY<rect.top+28)return;e.preventDefault();$('roll-surface').setPointerCapture(e.pointerId);const pos=point(e),el=e.target.closest('[data-note-id]'),note=el&&track().notes.find(n=>n.id===el.dataset.noteId);
  if(tool==='erase'){if(note)edit(()=>{track().notes=track().notes.filter(n=>n!==note);selection.delete(note.id)});return}
  if(note){if(e.shiftKey){selection.has(note.id)?selection.delete(note.id):selection.add(note.id);renderNotes();return}if(!selection.has(note.id))selection=new Set([note.id]);snapshot();gesture={pointer:e.pointerId,kind:e.target.closest('.resize-note')?'resize':'move',pos,notes:chosen().map(clone)};host.audition(note.pitch,note.velocity);renderNotes()}
  else if(tool==='select'){selection.clear();gesture={pointer:e.pointerId,kind:'select',pos};renderNotes()}
  else{snapshot();const start=Math.min(snapped(pos.beat),songBeats(project)-.01),n={id:uid(),pitch:pos.pitch,start,duration:Math.min(gridBeats(project.grid),songBeats(project)-start),velocity:host.velocity()};n.original={start:n.start,duration:n.duration};track().notes.push(n);selection=new Set([n.id]);gesture={pointer:e.pointerId,kind:'draw',pos,id:n.id};host.audition(n.pitch,n.velocity);renderNotes()}
 });
 $('roll-surface').addEventListener('pointermove',e=>{if(!gesture||gesture.pointer!==e.pointerId)return;e.preventDefault();const pos=point(e),g=gesture;
  if(g.kind==='select'){const low=Math.min(g.pos.pitch,pos.pitch),high=Math.max(g.pos.pitch,pos.pitch),from=Math.min(g.pos.beat,pos.beat),to=Math.max(g.pos.beat,pos.beat);selection=new Set(track().notes.filter(n=>n.pitch>=low&&n.pitch<=high&&noteSegments(n,songBeats(project),project.loop).some(part=>part.start<=to&&part.start+part.duration>=from)).map(n=>n.id));const box=$('roll-selection');box.hidden=false;Object.assign(box.style,{left:(70+from*px)+'px',top:(28+(127-high)*24)+'px',width:Math.max(2,(to-from)*px)+'px',height:((high-low+1)*24)+'px'})}
  else if(g.kind==='draw'){const n=track().notes.find(n=>n.id===g.id);n.duration=clamp(snapped(pos.beat+gridBeats(project.grid))-n.start,.01,songBeats(project)-n.start);n.original={start:n.start,duration:n.duration}}
  else{let delta=pos.beat-g.pos.beat;if(project.snap)delta=Math.round(delta/gridBeats(project.grid))*gridBeats(project.grid);let pitchDelta=pos.pitch-g.pos.pitch;
   if(g.kind==='move'){delta=clamp(delta,-Math.min(...g.notes.map(n=>n.start)),songBeats(project)-Math.max(...g.notes.map(n=>n.start+(project.loop ? .001 : n.duration))));pitchDelta=clamp(pitchDelta,-Math.min(...g.notes.map(n=>n.pitch)),127-Math.max(...g.notes.map(n=>n.pitch)))}
   for(const original of g.notes){const n=track().notes.find(n=>n.id===original.id);if(g.kind==='move'){n.start=original.start+delta;n.pitch=original.pitch+pitchDelta}else n.duration=clamp(original.duration+delta,.01,project.loop?songBeats(project):songBeats(project)-n.start);n.original={start:n.start,duration:n.duration}}
  }renderNotes();
 });
 function endGesture(e){if(gesture?.pointer!==e.pointerId)return;gesture=null;$('roll-selection').hidden=true;renderTracks();renderNotes()}
 for(const type of ['pointerup','pointercancel','lostpointercapture'])$('roll-surface').addEventListener(type,endGesture);
 $('roll-surface').addEventListener('contextmenu',e=>e.preventDefault());
 $('notes-all').onclick=()=>{selection=new Set(track().notes.map(n=>n.id));renderNotes()};$('notes-none').onclick=()=>{selection.clear();renderNotes()};$('notes-delete').onclick=()=>edit(()=>{track().notes=track().notes.filter(n=>!selection.has(n.id));selection.clear()});
 for(const b of document.querySelectorAll('[data-transpose-notes]'))b.onclick=()=>edit(()=>{const list=chosen();if(!list.length)return;const delta=clamp(+b.dataset.transposeNotes,-Math.min(...list.map(n=>n.pitch)),127-Math.max(...list.map(n=>n.pitch)));list.forEach(n=>n.pitch+=delta)});
 for(const [id,key] of [['note-pitch','pitch'],['note-start','start'],['note-length','duration'],['note-velocity','velocity']])$(id).onchange=()=>edit(()=>{let value=+$(id).value;if(!Number.isFinite(value))return;for(const n of chosen()){if(key==='start')n.start=clamp(value-1,0,songBeats(project)-(project.loop ? .001 : n.duration));else if(key==='duration')n.duration=clamp(value,.01,project.loop?songBeats(project):songBeats(project)-n.start);else n[key]=clamp(Math.round(value),key==='velocity'?1:0,127);if(key==='start'||key==='duration')n.original={start:n.start,duration:n.duration}}});
 $('notes-duplicate').onclick=()=>edit(()=>{const list=chosen();if(!list.length)return;const first=Math.min(...list.map(n=>n.start)),end=Math.max(...list.map(n=>n.start+n.duration)),delta=Math.max(barBeats(project),Math.ceil((end-first)/barBeats(project))*barBeats(project));const needed=Math.ceil((end+delta)/barBeats(project));if(needed>256){return 'The copy would exceed 256 measures.'}project.bars=Math.max(project.bars,needed);const copies=list.map(n=>({...clone(n),id:uid(),start:n.start+delta,original:{start:n.start+delta,duration:n.duration}}));track().notes.push(...copies);selection=new Set(copies.map(n=>n.id))});

 // The immersive editors operate on the same model and Undo stack as the page.
 function xrEdit(command){
  const {type}=command;
  if(type==='select'){
   if(playing||starting||finishing)return false;
   if(command.toggle){selection.has(command.id)?selection.delete(command.id):selection.add(command.id)}else selection=new Set(command.id?[command.id]:[]);
   renderNotes();return true;
  }
  return edit(()=>{
   const total=songBeats(project),finite=(v,fallback)=>Number.isFinite(v)?v:fallback;
   if(type==='note-add'){
    const start=clamp(snapped(finite(command.start,0)),0,total-.01),duration=clamp(finite(command.duration,gridBeats(project.grid)),.01,project.loop?total:total-start);
    const n={id:uid(),pitch:clamp(Math.round(finite(command.pitch,60)),0,127),velocity:clamp(Math.round(finite(command.velocity,host.velocity())),1,127),start,duration,original:{start,duration}};
    track().notes.push(n);selection=new Set([n.id]);host.audition(n.pitch,n.velocity);
   }else if(type==='note-update'){
    const n=track().notes.find(n=>n.id===command.id);if(!n)return;
    const moves=Number.isFinite(command.start),resizes=Number.isFinite(command.duration);
    n.pitch=clamp(Math.round(finite(command.pitch,n.pitch)),0,127);if(moves)n.start=clamp(snapped(command.start),0,total-(project.loop?.01:Math.min(total,n.duration)));
    if(resizes)n.duration=clamp(command.duration,.01,project.loop?total:total-n.start);n.velocity=clamp(Math.round(finite(command.velocity,n.velocity)),1,127);if(moves||resizes)n.original={start:n.start,duration:n.duration};selection=new Set([n.id]);
   }else if(type==='note-delete'){track().notes=track().notes.filter(n=>n.id!==command.id);selection.delete(command.id)}
   else if(type==='transpose'){const notes=chosen();if(notes.length){const delta=clamp(Math.round(command.delta)||0,-Math.min(...notes.map(n=>n.pitch)),127-Math.max(...notes.map(n=>n.pitch)));notes.forEach(n=>n.pitch+=delta)}}
   else if(type==='controller-set'){
    const lanes={sustain:['cc',64,127],modulation:['cc',1,127],expression:['cc',11,127],bend:['bend',null,16383],pressure:['pressure',null,127]},lane=lanes[command.lane];if(!lane)return;
    let event=track().controllers.find(c=>c.id===command.id);
    const beat=Number.isFinite(command.beat)?clamp(snapped(command.beat),0,total-.001):event?.beat||0,value=clamp(Math.round(finite(command.value,event?.value||0)),0,lane[2]);
    event||=track().controllers.find(c=>c.type===lane[0]&&(lane[1]===null||c.controller===lane[1])&&Math.abs(c.beat-beat)<.001);
    if(!event){event={id:uid(),type:lane[0],...(lane[1]!==null?{controller:lane[1]}:{})};track().controllers.push(event)}Object.assign(event,{beat,value:command.lane==='sustain'?(value>=64?127:0):value});
   }else if(type==='controller-delete')track().controllers=track().controllers.filter(c=>c.id!==command.id);
  });
 }
 function xrMix(index,key,value){
  if(!Number.isInteger(index)||index<0||index>7)return;
  const t=project.tracks[index];if(['volume','pan','reverb','delay'].includes(key))t[key]=clamp(Math.round(Number(value)||0),0,127);else if(['mute','solo'].includes(key))t[key]=!!value;else return;
  dirty=true;applyMixer();renderMixer();renderPlayStrip();workstation?.persist();
 }
 const api={get project(){return project},get playing(){return playing},get recording(){return recording},get inputTrack(){return inputTrack()},inputShape(){return project.tracks[inputTrack()].shape},monitor(){return project.tracks[inputTrack()].monitor&&trackAudible(project,inputTrack())},recordOn,recordOff,recordController,recordLive,receive,attachAudio,applyAllTracks,applyMixer,stop,setView,chooseScene,transport,xrEdit,xrMix,
  xrSelection:()=>[...selection],xrSelectTrack:chooseTrack,persist:()=>workstation?.persist(),
  xrLevels:()=>meters.map(m=>{m.analyser.getFloatTimeDomainData(m.samples);let peak=0;for(const sample of m.samples)peak=Math.max(peak,Math.abs(sample));return Math.min(1,peak*2.2)}),
  serialise:()=>({...clone(project),soundfont:host.bank(),effects:host.effects(),master:host.master()}),
  openSaved:raw=>load({name:raw.name||'Saved song',size:JSON.stringify(raw).length,text:async()=>JSON.stringify(raw)}),
  selectPerformanceTrack(i){if(playing||starting||finishing||!Number.isInteger(i)||i<0||i>7)return;chooseTrack(i);project.armedTrack=i;dirty=true;renderTracks();renderTransport()},
  setPatch(p){disableStep();snapshot();track().patch=clone(p);applyTrack(project.selectedTrack);renderInspector();renderTracks();renderMixer()},setShape(s){track().shape={...s};dirty=true;applyTrack(project.selectedTrack)},
  tick(){if(playing)syncScene();if(playing&&origin!==null){absoluteBeat=Math.max(recording?-project.countIn*barBeats(project):0,timeBeat());renderPosition()}if(view==='mixer'||view==='perform'){for(let i=0;i<meters.length;i++){const m=meters[i];m.analyser.getFloatTimeDomainData(m.samples);let signal=0;for(const sample of m.samples)signal=Math.max(signal,Math.abs(sample));const peak=Math.min(100,signal*220),el=$(view==='perform'?'play-meter-'+i:'track-meter-'+i);if(el){el.firstElementChild.style.width=peak+'%';el.setAttribute('aria-valuenow',String(Math.round(peak)))}}const master=$('master-meter');if(master){const peak=clamp(host.level()*300,0,100);master.firstElementChild.style.width=peak+'%';master.setAttribute('aria-valuenow',String(Math.round(peak)))}}},
  diagnostics(){return {playing,recording,starting,finishing:!!finishing,origin,selectedScene:project.selectedScene,queuedScene,sceneCount:project.scenes.length,sceneBars:project.scenes.map(s=>s.bars),songPlaying:!!playbackProject,tempo:playbackTempo?playbackTempo.tempoAt(Math.max(0,absoluteBeat)):project.tempo,beat:absoluteBeat,selectedTrack:project.selectedTrack,armedTrack:project.armedTrack,stepEnabled:step.enabled,stepCursor:step.cursor,noteCounts:project.tracks.map(t=>t.notes.length)}}};
 performanceLibrary=createPerformanceLibrary({project:()=>project,playing:()=>playing||starting||!!finishing||step.held.size>0,edit,apply:applyAllTracks,beforeLoad:()=>{disableStep();host.clearLive()}},host);
 workstation=createWorkstation({project:()=>project,playing:()=>playing||starting||!!finishing,status,snapshot,edit,cancelStep:disableStep,chooseScene,sceneState:()=>({queued:queuedScene,locked:recording||starting||!!playbackProject}),zoom:()=>px,selected:()=>selection,select:ids=>{selection=new Set(ids)},renderNotes,centerNotes,renderAll,stop,play:next=>start(false,next),
 setProject:next=>{project=next;recorder.project=project;selection.clear();applyAllTracks()},
 replace:(next,effects,master)=>{stop(false);undo=[];redo=[];project=next;recorder.project=project;selection.clear();host.restoreEffects(effects,master);afterModel()}
 },host);
 setView('perform');renderAll();workstation.initialise();return api;
}
