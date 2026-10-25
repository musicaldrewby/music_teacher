// A single bridge to the existing controls keeps settings, validation and presets in sync.
export const XR_GROUPS={
 record:['Record & timing',[['seq-tempo','Tempo'],['seq-meter','Meter'],['seq-record-grid','Record quantization'],['seq-record-mode','Record mode'],['seq-count-in','Count-in'],['seq-loop','Loop pattern'],['punch-enabled','Punch recording'],['punch-from','Punch from measure'],['punch-to','Punch through measure']]],
 scene:['Scene settings',[['scene-name','Scene name'],['seq-bars','Pattern measures'],['scene-copy-target','Copy destination'],['scene-copy','Copy scene pattern'],['scene-clear','Clear scene pattern']]],
 track:['Part settings',[['track-name','Part name'],['track-patch','Instrument'],['track-monitor','Monitor live input'],['seq-clear-track','Clear this track'],['velocity','Keyboard velocity'],['sustain','Sustain']]],
 shape:['Sound shaping',[['shape-octave','Octave shift'],['shape-tune','Fine tune'],['shape-attack','Attack'],['shape-release','Release'],['shape-brightness','Brightness'],['shape-reset','Reset sound shaping']]],
 reverb:['Reverb',[['reverb-toggle','Reverb on / off'],['reverb','Reverb amount'],['reverb-type','Room / hall / plate'],['reverb-decay','Decay'],['reverb-damping','Damping'],['reverb-predelay','Pre-delay'],['effects-reset','Reset both effects']]],
 delay:['Delay',[['delay-toggle','Delay on / off'],['delay','Delay amount'],['delay-mode','Stereo / center'],['delay-time','Delay time'],['delay-feedback','Feedback'],['delay-damping','Damping']]],
 quantize:['Quantize & grid',[['seq-grid','Editing grid'],['seq-snap','Snap editor to grid'],['seq-quant-grid','Quantize selected notes to'],['seq-strength','Quantize strength'],['seq-swing','Swing'],['seq-length-quant','Quantize lengths too'],['seq-quantize','Apply quantize'],['seq-restore','Restore original timing']]],
 notes:['Selected notes',[['note-pitch','MIDI pitch'],['note-start','Start beat'],['note-length','Length in beats'],['note-velocity','Velocity'],['notes-all','Select all notes'],['notes-none','Deselect notes'],['notes-delete','Delete selected notes'],['notes-duplicate','Duplicate selected notes'],['xr-transpose--12','Transpose down an octave'],['xr-transpose--1','Transpose down a semitone'],['xr-transpose-1','Transpose up a semitone'],['xr-transpose-12','Transpose up an octave']]],
 measures:['Measure editing',[['bars-from','From measure'],['bars-to','Through measure'],['bars-target','Destination measure'],['bars-scope','Apply to'],['bars-copy','Copy measures'],['bars-duplicate','Duplicate measures'],['bars-move','Move measures'],['bars-erase','Erase measures']]],
 step:['Step recording',[['step-toggle','Step recording on / off'],['step-length','Step length'],['step-rest','Rest'],['step-tie','Tie previous chord'],['step-back','Back one step'],['step-measure','Cursor measure'],['step-beat','Cursor beat'],['step-go','Set cursor']]],
 song:['Song entry',[['song-add-scene','Scene to add'],['song-add','Add scene to song'],['song-selected-entry','Selected song entry'],['song-entry-scene','Entry scene'],['song-entry-repeats','Entry repeats'],['song-entry-earlier','Move earlier'],['song-entry-later','Move later'],['song-entry-duplicate','Duplicate entry'],['song-entry-remove','Remove entry'],['song-clear','Clear song order']]],
 metronome:['Metronome',[['seq-click','When to click'],['seq-click-tone','Click sound'],['seq-click-volume','Click volume'],['seq-click-accent','Accent beat one'],['seq-click-preview','Preview / stop click']]],
 midi:['MIDI input',[['midi-connect','Connect MIDI · browser permission'],['midi-input','Input device'],['midi-channel','Receive channel'],['midi-record-adjustment','Recording adjustment (ms)'],['midi-adjustment-reset','Reset recording adjustment']]],
 performance:['Performances',[['performance-name','Performance name'],['preset-select','Saved performance'],['preset-name','Preset name'],['preset-load','Load selected'],['preset-save','Save new performance'],['preset-update','Update selected'],['preset-delete','Delete selected'],['preset-undo-delete','Undo preset deletion'],['preset-export','Export performance file ↗'],['preset-import','Import performance file ↗']]],
 project:['Song files',[['seq-name','Song name'],['seq-new','New song'],['seq-save','Save song file ↗'],['seq-load','Open song file ↗'],['recovery-previous','Restore previous session'],['seq-undo','Undo'],['seq-redo','Redo']]],
 export:['Export music',[['export-source','Export source'],['export-tail','Effect tail'],['export-midi','Render MIDI file'],['export-wav','Render stereo WAV'],['export-stems','Render eight WAV tracks'],['export-cancel','Cancel render'],['export-download','Download ready file ↗']]],
 audition:['Audition',[['demo-scale','Play scale demo'],['demo-chord','Play chord demo'],['demo-phrase','Play phrase demo'],['stop','All notes off'],['volume','Master volume'],['velocity','Keyboard velocity'],['sustain','Sustain']]]
};
export const XR_FILE_CONTROLS=new Set(['seq-save','seq-load','preset-export','preset-import','export-download','midi-connect']);
const allowed=new Set(Object.values(XR_GROUPS).flatMap(g=>g[1].map(f=>f[0])));
export function createXRControls(document,studio,storage){
 const $=id=>document.getElementById(id);let songSlots=[],slotError='',notice='';const songKey='soundroom-vr-songs-v1';
 try{const raw=JSON.parse(storage?.getItem(songKey)||'[]');if(!Array.isArray(raw)||raw.length>24)throw Error('Invalid saved songs');songSlots=raw.filter(x=>x&&typeof x.id==='string'&&x.project?.format==='soundroom-project')}catch{slotError='Saved songs could not be read. Existing storage was preserved.'}
 function read(id,label){
  if(id.startsWith('xr-transpose-'))return {id,label,kind:'button',disabled:studio.playing||studio.diagnostics().starting||studio.diagnostics().finishing||!studio.xrSelection().length};
  const el=$(id);if(!el)return {id,label,kind:'button',disabled:true};
  const type=el.getAttribute('type'),tag=el.tagName.toLowerCase(),kind=tag==='select'?'select':tag==='button'||tag==='a'?'button':type==='checkbox'?'check':type==='range'?'range':type==='number'?'number':'text';
  const options=kind==='select'?Array.from(el.options||el.children||[]).map(o=>({value:String(o.value),label:o.label||o.textContent})):undefined;
  const value=kind==='check'?!!el.checked:el.value;
  return {id,label,kind,value,options,defaultValue:kind==='range'?Number(el.getAttribute('value')||0):undefined,min:Number(el.min||el.getAttribute('min')||0),max:Number(el.max||el.getAttribute('max')||100),step:Number(el.step||el.getAttribute('step')||1),maxLength:Number(el.maxLength>0?el.maxLength:el.getAttribute('maxlength')||80),
   disabled:!!el.disabled||(id==='shape-octave'&&studio.playing)||(kind==='button'&&!!el.hidden),active:el.getAttribute('aria-pressed')==='true',external:XR_FILE_CONTROLS.has(id),display:kind==='select'?options.find(o=>o.value===String(value))?.label||String(value):kind==='check'?(value?'On':'Off'):String(value??'')};
 }
 function groups(){return Object.fromEntries(Object.entries(XR_GROUPS).map(([id,[label,fields]])=>[id,{label,fields:fields.map(([id,label])=>read(id,label))}]))}
 async function control(id,value,phase='commit'){
  if(!allowed.has(id)||XR_FILE_CONTROLS.has(id))return;
  if(id.startsWith('xr-transpose-')){if(!read(id,id).disabled)studio.xrEdit({type:'transpose',delta:Number(id.slice(13))});return}
  const el=$(id),field=read(id,id);if(!el||field.disabled)return;
  if(field.kind==='button'){
   if(id==='step-toggle'&&!studio.diagnostics().stepEnabled)studio.setView('sequence');
   await el.onclick?.();
  }else{
   if(field.kind==='check')el.checked=!!value;
   else if(field.kind==='select'){if(!field.options.some(o=>o.value===String(value)))return;el.value=String(value)}
   else if(field.kind==='range'||field.kind==='number'){
    if(!Number.isFinite(Number(value)))return;let next=Number(value);if(el.hasAttribute?.('min')||el.getAttribute('min')!==null)next=Math.max(field.min,next);if(el.hasAttribute?.('max')||el.getAttribute('max')!==null)next=Math.min(field.max,next);el.value=String(next);
   }else el.value=String(value).slice(0,field.maxLength);
   if(field.kind==='range'&&el.oninput)await el.oninput({target:el});else await el.onchange?.({target:el});
  }
  studio.persist();
 }
 async function slots(action,id){
  if(studio.playing||studio.diagnostics().starting||studio.diagnostics().finishing||slotError)return;
  try{
   if(action==='load'){const item=songSlots.find(x=>x.id===id);if(item){await studio.openSaved(item.project);notice=$('studio-status').textContent}return}
   const next=action==='delete'?songSlots.filter(x=>x.id!==id):[...songSlots,{id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),project:studio.serialise()}];
   if(next.length>24)throw Error('24 saved songs reached. Export and remove a slot first.');
   storage.setItem(songKey,JSON.stringify(next));songSlots=next;notice=action==='delete'?'Saved slot removed. The open song is unchanged.':'Saved a copy of this song on the headset.';
  }catch(error){notice='Could not save or open: '+error.message}
 }
 function snapshot(ui={}){
  const p=studio.project,d=studio.diagnostics(),track=p.tracks[p.selectedTrack],barBeats=p.meter[0]*4/p.meter[1],bar=Math.max(0,Math.min(p.bars-1,ui.bar||0)),from=bar*barBeats,to=Math.min(p.bars*barBeats,from+(ui.span||1)*barBeats),length=p.bars*barBeats;
  const notes=track.notes.filter(n=>n.start<to&&n.start+n.duration>from||p.loop&&n.start+n.duration>length&&n.start+n.duration-length>from).slice(0,2048).map(n=>({...n})),levels=studio.xrLevels?.()||[];
  return {name:p.name,bars:p.bars,barBeats,totalBeats:length,meter:[...p.meter],grid:p.grid,snap:p.snap,step:d.stepEnabled,stepCursor:d.stepCursor,beat:d.beat,
   selected:studio.xrSelection(),notes,noteCount:track.notes.length,controllers:track.controllers.filter(c=>c.beat>=from&&c.beat<to).map(c=>({...c})),
   mix:p.tracks.map((t,i)=>({index:i,name:t.name,patch:t.patch.name,volume:t.volume,pan:t.pan,reverb:t.reverb,delay:t.delay,mute:t.mute,solo:t.solo,monitor:t.monitor,notes:t.notes.length,level:Math.round((levels[i]||0)*24)/24})),
   song:p.song.map(e=>({...e,name:p.scenes[e.scene].name,bars:p.scenes[e.scene].bars*e.repeats})),songSelection:$('song-selected-entry').value,
   groups:groups(),status:$('studio-status').textContent,presetStatus:$('preset-status').textContent,midiStatus:$('midi-status').textContent,exportStatus:$('export-status').textContent,exportProgress:Number($('export-progress').value)||0,
   slots:songSlots.map(x=>({id:x.id,name:x.project.name})),slotStatus:slotError||notice};
 }
 return {snapshot,control,slots};
}
