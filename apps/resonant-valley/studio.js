import {SOUNDS,sound,DEFAULT_PADS} from './catalog.js';
import {INSTRUMENTS,NAMES,DRUMS,clamp,makeTrack,equipFoundSound,emptySong,normalizeSong} from './data.js';
import {PIANO_CODES,keyboardRange,pitchName} from './studio-pitches.js';
import {StudioMidi} from './studio-midi.js';
const $=id=>document.getElementById(id);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export class Studio{
 constructor(engine,song,callbacks){this.audio=engine;this.song=song;this.callbacks=callbacks;this.selected=0;this.octave=4;this.recording=false;this.held=new Map();this.undo=[];this.dirty=true;this.visible=false;this.canvas=$('note-grid');this.ctx=this.canvas.getContext('2d');this.rowHeight=30;this.labelWidth=72;this.ruler=0;this.rulerCanvas=$('grid-ruler');this.rulerCtx=this.rulerCanvas.getContext('2d');this.bind();this.sync();document.fonts?.ready.then(()=>{this.layout();this.dirty=true;});}
 can(id){return !!id&&(this.callbacks.canInstrument?.(id)??true);}
 hasFinds(){return !this.callbacks.firstSound||!!this.callbacks.firstSound();}
 hasPlayableTrack(){return this.song.tracks.some((track,i)=>i<this.limit()&&this.can(track.instrument));}
 canPlayPitch(track,pitch){
  return this.can(track.instrument)&&(track.instrument!=='drums'||this.can((track.pads??DEFAULT_PADS)[pitch]));
 }
 fillEmptyTrack(piece){
  if(!piece||!this.can(piece.id))return false;
  const index=this.song.tracks.findIndex((t,i)=>i<this.limit()&&!t.instrument&&!t.notes.length);
  if(index<0)return false;
  equipFoundSound(this.song.tracks[index],piece);this.selected=index;this.sync();return true;
 }
 playable(){return this.callbacks.prepareSong?.(this.song)??this.song;}
 async previewNote(track,pitch,duration,velocity){const index=this.song.tracks.indexOf(track);if(index<0||index>=this.limit()||!this.canPlayPitch(track,pitch)){this.callbacks.toast('Discover this sound or expand your tracks to play it.');return;}try{await this.audio.init();if(this.song.tracks[index]!==track||!this.canPlayPitch(track,pitch)||index>=this.limit())return;const mix=this.playable(),t=mix.tracks[index];if(!t)return;this.audio.setRoom(mix.reverb);this.audio.setEcho(mix.delay,mix.bpm);return this.audio.audition(t.instrument,pitch,duration,velocity,t.volume,t.pads);}catch(e){this.callbacks.toast(e.message);}}
 allowedTrack(){return this.selected<this.limit()&&this.can(this.track().instrument);}
 limit(){return this.callbacks.trackLimit?.()??16;}
 makeTrack(id){const t=makeTrack(id,this.song.tracks.length);if(id==='drums'){t.pads=Object.fromEntries(Object.entries(DEFAULT_PADS).filter(([,sound])=>this.can(sound)));if(!Object.keys(t.pads).length){const piece=SOUNDS.find(s=>s.kind==='drum'&&this.can(s.id));if(piece)t.pads[piece.note]=piece.id;}}return t;}
 track(){return this.song.tracks[this.selected]||this.song.tracks[0];}
 changed(){this.dirty=true;this.callbacks.change(this.song);$('studio-status').textContent='Edits saved on this device';}
 history(){this.undo.push(JSON.stringify(this.song));if(this.undo.length>35)this.undo.shift();}
 undoEdit(){if(!this.undo.length)return;this.song=normalizeSong(JSON.parse(this.undo.pop()));this.selected=Math.min(this.selected,this.song.tracks.length-1);this.stop();this.sync();this.changed();}
 bind(){
  NAMES.forEach((n,i)=>{const o=document.createElement('option');o.value=i;o.textContent=n;$('key').append(o);});
  $('song-title').addEventListener('input',e=>{this.song.title=e.target.value||'Untitled piece';this.changed();});
  for(const id of ['tempo','bars','key','scale'])$(id).addEventListener('change',()=>{this.releaseAll();this.history();this.song.bpm=clamp($('tempo').value,40,220);$('tempo').value=this.song.bpm;this.song.bars=Number($('bars').value);this.song.key=Number($('key').value);this.song.scale=$('scale').value;if(this.audio.playing&&this.audio.source==='studio')this.start(false);this.scaleChoices();this.keyboard();this.layout();if(id==='key'||id==='scale')this.focusRange();this.changed();});
  $('reverb').addEventListener('input',e=>{if(!(this.callbacks.reverbOwned?.()??true))return;this.song.reverb=+e.target.value;this.audio.setRoom(this.song.reverb);this.changed();});
  $('delay').addEventListener('input',e=>{if(!(this.callbacks.delayOwned?.()??true))return;this.song.delay=+e.target.value;this.audio.setEcho(this.song.delay,this.song.bpm);this.changed();});
  $('metronome').addEventListener('change',e=>this.audio.metronome=e.target.checked);
  $('instrument').addEventListener('change',e=>{this.history();const t=this.track();const wasDrum=t.instrument==='drums';if(!this.can(e.target.value)){e.target.value=t.instrument;this.callbacks.toast('Discover this instrument to use it.');return;}this.releaseAll();t.instrument=e.target.value;if(t.instrument==='drums'&&!t.pads)t.pads=this.makeTrack('drums').pads;t.name=INSTRUMENTS[t.instrument];if(wasDrum!== (t.instrument==='drums')){t.notes=t.notes.map(n=>({...n,p:t.instrument==='drums'?Number(Object.keys(t.pads||DEFAULT_PADS)[Math.abs(n.p)%Math.max(1,Object.keys(t.pads||DEFAULT_PADS).length)]):60+Math.abs(n.p)%12}));}this.sync();this.changed();});
  $('play').onclick=()=>this.audio.playing&&this.audio.source==='studio'?this.stop():this.start(false);
  $('stop').onclick=()=>{this.stop();this.callbacks.stopRecordUI();this.callbacks.playbackChanged();};
  $('live-record').onclick=()=>this.recording?this.stop():this.start(true);
  $('add-track').onclick=()=>this.addTrackMenu();$('undo-notes').onclick=()=>this.undoEdit();
  $('clear-track').onclick=()=>{this.history();this.track().notes=[];this.changed();};
  $('new-song').onclick=()=>this.popover('Start a new piece',`<p>Your current piece will be kept in your record collection.</p><button class="primary pop-full" id="new-confirm">Start with a blank page</button>`,()=>{$('new-confirm').onclick=()=>{if(this.song.tracks.some(t=>t.notes.length))this.callbacks.saveRecord(this.song,true);this.song=emptySong(this.callbacks.firstSound?.());this.selected=0;this.octave=4;this.undo=[];this.stop();this.sync();this.changed();this.closePopover();};});
  $('studio-save').onclick=()=>this.popover('Make a record',`<p>Give this copy a title for your record shelf.</p><input id="record-title" aria-label="Record title" maxlength="70" value="${escape(this.song.title)}"><button id="confirm-record" class="primary pop-full">Save record</button><button id="save-with-sleeve" class="pop-full">Save &amp; design sleeve</button>`,()=>{
   const save=design=>{this.song.title=$('record-title').value.trim()||'Untitled piece';const record=this.callbacks.saveRecord(this.song);if(!record)return;this.sync();this.changed();this.closePopover();$('studio-status').textContent='Record added to your shelf';if(design)this.callbacks.openRecords(record);};
   $('confirm-record').onclick=()=>save(false);$('save-with-sleeve').onclick=()=>save(true);$('record-title').focus();
  });
  $('record-shelf').onclick=()=>this.callbacks.openRecords();$('song-menu').onclick=()=>this.fileMenu();
  $('advanced-toggle').onclick=()=>{const active=$('advanced-controls').classList.toggle('hidden')===false;$('studio-panel').classList.toggle('advanced',active);$('advanced-toggle').textContent=active?'Fewer controls':'More controls';this.scaleChoices();this.dirty=true;};
  const shiftOctave=step=>{this.releaseAll();this.octave+=step;this.keyboard();this.layout();this.focusRange();};
  $('octave-down').onclick=()=>shiftOctave(-1);$('octave-up').onclick=()=>shiftOctave(1);
  this.midi=new StudioMidi(this);$('kit-edit').onclick=()=>this.kitEditor();$('studio-collection').onclick=()=>this.callbacks.openCollection();
  this.canvas.addEventListener('pointerdown',e=>this.gridDown(e));this.canvas.addEventListener('pointermove',e=>this.gridMove(e));this.canvas.addEventListener('pointerup',e=>this.gridUp(e));this.canvas.addEventListener('pointercancel',e=>this.gridUp(e));this.canvas.addEventListener('contextmenu',e=>e.preventDefault());
  addEventListener('keydown',e=>{
   if(!this.visible||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||!$('studio-popover').classList.contains('hidden'))return;
   if((e.ctrlKey||e.metaKey)&&e.code==='KeyZ'){e.preventDefault();this.undoEdit();return;}
   if(e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;
   const index=PIANO_CODES.indexOf(e.code);
   const key=this.track().instrument==='drums'&&index>=0?this.keys[index%this.keys.length]:this.keys.find(k=>k.code===e.code);
   if(key){e.preventDefault();this.noteOn(key.pitch,.75,e.code);}
   if(e.code==='Space'&&!e.target.closest?.('#keyboard, #pitch-labels')){e.preventDefault();$('play').click();}
  });
  addEventListener('keyup',e=>{if(PIANO_CODES.includes(e.code))this.noteOff(e.code);});
  addEventListener('blur',()=>this.releaseAll());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.releaseAll();});
  new ResizeObserver(()=>{if(this.visible)this.layout();}).observe($('grid-scroll'));
  $('song-file').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>3e6)throw Error('Choose a composition file under 3 MB.');const raw=JSON.parse(await f.text());this.load(normalizeSong(raw.song||raw));this.closePopover();this.callbacks.toast('Composition opened.');}catch(err){this.callbacks.toast(err.message||'Could not open this composition.');}e.target.value='';});
 }
 scaleChoices(){
  const select=$('scale'),advanced=$('studio-panel').classList.contains('advanced')&&this.hasFinds();
  for(const [value,label] of [['pentatonic','Pentatonic'],['minor','Natural minor']]){
   const option=select.querySelector('option[value="'+value+'"]');
   if(advanced||this.song.scale===value){if(!option)select.add(new Option(label,value));}
   else option?.remove();
  }
  select.value=this.song.scale;
 }
 sync(){
  this.selected=Math.max(0,Math.min(this.selected,this.song.tracks.length-1));
  const track=this.track(),hasFinds=this.hasFinds(),waiting=!hasFinds&&!this.song.tracks.some(t=>t.notes.length);
  const choices=Object.entries(INSTRUMENTS).filter(([id])=>this.can(id)||id===track.instrument);
  const options=choices.map(([id,name])=>`<option value="${id}" ${this.can(id)?'':'disabled'}>${escape(name)}${this.can(id)?'':' · undiscovered'}</option>`);
  if(!track.instrument)options.unshift('<option value="" disabled>Choose a discovered sound</option>');
  $('instrument').innerHTML=options.join('');$('instrument').disabled=!hasFinds;$('instrument').value=track.instrument||'';
  if(waiting)$('first-find-clue').textContent=this.callbacks.firstFindClue?.()||'Look for the brass case near your cabin.';
  $('studio-panel').classList.toggle('waiting-for-find',waiting);$('studio-first-find').classList.toggle('hidden',!waiting);
  $('play').disabled=!this.hasPlayableTrack();$('live-record').disabled=!this.allowedTrack();
  this.midi?.describeReady();
  $('add-track').disabled=!hasFinds;
  $('studio-save').disabled=waiting;
  $('kit-edit').classList.toggle('hidden',track.instrument!=='drums'||!this.allowedTrack());
  $('track-capacity').textContent=this.song.tracks.length+' / '+this.limit()+' tracks · GeneralUser GS';
  $('reverb').disabled=!(this.callbacks.reverbOwned?.()??true);$('delay').disabled=!(this.callbacks.delayOwned?.()??true);
  $('reverb-control').title=$('reverb').disabled?'Discover a reverb processor':'Room reverb';$('delay-control').title=$('delay').disabled?'Discover an echo processor':'Echo repeats on the beat';
  const locked=this.song.tracks.some((t,i)=>i>=this.limit()||!this.can(t.instrument)||t.instrument==='drums'&&Object.values(t.pads||{}).some(id=>!this.can(id)));
  $('studio-access-note').textContent=!waiting&&locked?'Find the missing sounds or track expansions to hear the full piece.':'';
  $('song-title').value=this.song.title;$('tempo').value=this.song.bpm;$('bars').value=this.song.bars;$('key').value=this.song.key;this.scaleChoices();$('reverb').value=this.song.reverb;$('delay').value=this.song.delay||0;
  $('selected-color').style.background=track.color;this.tracks();this.keyboard();this.layout();this.updateTransport();
 }
 tracks(){
  const list=$('track-list');list.replaceChildren();this.song.tracks.forEach((t,i)=>{const card=document.createElement('div');const locked=i>=this.limit()||!!t.instrument&&!this.can(t.instrument);card.className='track-card'+(i===this.selected?' active':'')+(locked?' locked':'');card.style.setProperty('--track',t.color);card.innerHTML=`<div class="track-title"><span class="track-dot"></span><strong>${escape(t.name)}</strong><button class="delete-track" aria-label="Remove ${escape(t.name)}">×</button></div><div class="track-mixer"><input type="range" min="0" max="1" step=".01" value="${t.volume}" aria-label="${escape(t.name)} volume"><button class="mute ${t.mute?'on':''}" aria-label="Mute ${escape(t.name)}">M</button><button class="solo ${t.solo?'on':''}" aria-label="Solo ${escape(t.name)}">S</button></div><label class="track-pan">Pan <input type="range" min="-1" max="1" step=".05" value="${t.pan}" aria-label="${escape(t.name)} pan"></label>`;
   if(locked)card.insertAdjacentHTML('beforeend',`<span class="track-locked-note">${i>=this.limit()?'Find a track expansion':'Sound undiscovered'}</span>`);
   card.onclick=e=>{if(e.target.closest('button,input'))return;this.releaseAll();this.selected=i;this.sync();this.focusRange();};card.querySelector('.track-mixer input').oninput=e=>{t.volume=+e.target.value;this.changed();};card.querySelector('.track-pan input').oninput=e=>{t.pan=+e.target.value;this.changed();};card.querySelector('.mute').onclick=e=>{t.mute=!t.mute;e.target.classList.toggle('on',t.mute);this.changed();};card.querySelector('.solo').onclick=e=>{t.solo=!t.solo;e.target.classList.toggle('on',t.solo);this.changed();};card.querySelector('.delete-track').onclick=()=>{if(this.song.tracks.length<2){this.callbacks.toast('Keep one track. Clear its notes to start again.');return;}this.history();this.song.tracks.splice(i,1);this.selected=Math.min(this.selected,this.song.tracks.length-1);const restart=this.audio.playing&&this.audio.source==='studio';this.stop();if(restart)this.start(false);this.sync();this.changed();};if(!(this.callbacks.mixerOwned?.()??true)){card.querySelectorAll('input,.solo').forEach(el=>{el.disabled=true;el.title='Discover the mixer to unlock volume and pan';});}list.append(card);
  });
 }
 addTrackMenu(){if(this.song.tracks.length>=this.limit()){this.popover('Expand your studio',`<p>You have ${this.limit()} track${this.limit()===1?'':'s'}. Find, craft, or buy an expansion module in your collection.</p><button id="open-upgrades" class="primary pop-full">View expansions</button>`,()=>{$('open-upgrades').onclick=()=>this.callbacks.openCollection();});return;}
  this.popover('Add an instrument','<input id="instrument-search" class="pop-search" aria-label="Search available instruments" placeholder="Search your sounds…"><div class="pop-list" id="instrument-choices"></div>',()=>{
   const render=()=>{const q=$('instrument-search').value.toLowerCase();$('instrument-choices').innerHTML=Object.entries(INSTRUMENTS).filter(([id,name])=>this.can(id)&&name.toLowerCase().includes(q)).map(([id,name])=>`<button data-instrument="${id}">${escape(name)}</button>`).join('');$('instrument-choices').querySelectorAll('[data-instrument]').forEach(b=>b.onclick=()=>{this.history();this.song.tracks.push(this.makeTrack(b.dataset.instrument));this.selected=this.song.tracks.length-1;if(this.audio.playing&&this.audio.source==='studio')this.start(false);this.sync();this.changed();this.closePopover();});};$('instrument-search').oninput=render;render();
  });
 }
 drumLabel(p){const name=sound(this.track().pads?.[p]||DEFAULT_PADS[p])?.name||DRUMS[p]||'Drum';return name.split(' · ').at(-1);}
 kitEditor(){
  const tr=this.track();if(tr.instrument!=='drums'||!this.allowedTrack())return;tr.pads??=this.makeTrack('drums').pads;tr.padLocks??={};
  const available=SOUNDS.filter(s=>s.kind==='drum'&&this.can(s.id));
  const options=(id)=>[...available,...(this.can(id)?[]:[sound(id)].filter(Boolean))].filter(s=>s.family===sound(id)?.family||s.id===id).map(s=>`<option value="${s.id}" ${s.id===id?'selected':''}>${escape(s.name)}</option>`).join('');
  const randomize=lane=>{const current=sound(tr.pads[lane]),pool=available.filter(s=>s.family===current?.family&&(current.family!=='Hat'||s.hat===current.hat));if(pool.length)tr.pads[lane]=pool[Math.floor(Math.random()*pool.length)].id;};
  this.popover('Your custom drum kit',`<p>One track. Mix pieces from any discovered kit.</p><div class="kit-actions"><button id="random-kit">Randomize sounds</button><button id="kit-undo">Undo</button></div>${Object.entries(tr.pads).map(([lane,id])=>`<div class="kit-row"><span>${escape(this.drumLabel(lane))}</span><select data-pad="${lane}" aria-label="Sound for drum lane ${lane}">${options(id)}</select><button data-hit="${lane}" aria-label="Audition drum">▶</button><button data-random="${lane}" aria-label="Randomize drum lane ${lane}" ${tr.padLocks[lane]?'disabled':''}>↻</button><label><input data-lock="${lane}" type="checkbox" ${tr.padLocks[lane]?'checked':''}>Lock</label><button data-remove="${lane}" aria-label="Remove drum lane">×</button></div>`).join('')}<div class="kit-add"><select id="new-drum" aria-label="Add a drum sound">${available.map(s=>`<option value="${s.id}">${escape(s.name)}</option>`).join('')}</select><button id="add-drum">Add lane</button></div>`,()=>{
   $('studio-popover').classList.add('kit-editor');
   $('random-kit').onclick=()=>{this.history();Object.keys(tr.pads).forEach(lane=>{if(!tr.padLocks[lane])randomize(lane);});this.sync();this.changed();this.kitEditor();};
   $('kit-undo').onclick=()=>{this.undoEdit();this.kitEditor();};
   $('studio-popover').querySelectorAll('[data-random]').forEach(b=>b.onclick=()=>{if(tr.padLocks[b.dataset.random])return;this.history();randomize(b.dataset.random);this.sync();this.changed();this.kitEditor();});
   $('studio-popover').querySelectorAll('[data-pad]').forEach(select=>select.onchange=()=>{if(!this.can(select.value))return;this.history();tr.pads[select.dataset.pad]=select.value;this.sync();this.changed();this.kitEditor();});
   $('studio-popover').querySelectorAll('[data-lock]').forEach(box=>box.onchange=()=>{tr.padLocks[box.dataset.lock]=box.checked;$('studio-popover').querySelector(`[data-random="${box.dataset.lock}"]`).disabled=box.checked;this.changed();});
   $('studio-popover').querySelectorAll('[data-hit]').forEach(b=>b.onclick=()=>this.previewNote(tr,Number(b.dataset.hit),.5,.75));
   $('studio-popover').querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{if(Object.keys(tr.pads).length<2)return;this.history();const lane=Number(b.dataset.remove);delete tr.pads[lane];delete tr.padLocks[lane];tr.notes=tr.notes.filter(n=>n.p!==lane);this.sync();this.changed();this.kitEditor();});
   $('add-drum').onclick=()=>{if(Object.keys(tr.pads).length>=48)return;const id=$('new-drum').value,piece=sound(id);if(!piece||!this.can(id))return;let lane=piece.note;if(tr.pads[lane])lane=Array.from({length:73},(_,i)=>i+24).find(n=>!tr.pads[n]);if(lane===undefined)return;this.history();tr.pads[lane]=id;this.sync();this.changed();this.kitEditor();};
  });
 }
 layout(){
  const tr=this.track(),drum=tr.instrument==='drums',pitches=new Set(this.keyPitches);
  if(!drum)for(const n of tr.notes)pitches.add(n.p);
  this.rows=[...pitches].sort((a,b)=>b-a);
  this.rowHeight=clamp(Math.floor(($('grid-scroll').clientHeight-28)/Math.max(1,this.rows.length)),24,50);
  const labels=$('pitch-labels');labels.replaceChildren();
  labels.style.width=(drum?112:72)+'px';labels.style.setProperty('--row-height',this.rowHeight+'px');
  for(const p of this.rows){
   const name=this.label(p),button=document.createElement('button');
   button.type='button';button.dataset.pitch=p;button.textContent=name;
   button.classList.toggle('in-range',this.keyPitches.has(p));
   button.classList.toggle('tonic',!drum&&p%12===this.song.key);
   button.classList.toggle('active',this.sounding(p));
   button.disabled=!this.allowedTrack()||!this.canPlayPitch(tr,p);
   button.title=this.keyPitches.has(p)?'Hear '+name:'Hear '+name+' · saved note outside the keyboard';
   button.setAttribute('aria-label',button.title);button.onclick=()=>this.previewNote(tr,p,.55,.75);labels.append(button);
  }
  this.labelWidth=tr.instrument==='drums'?112:72;const width=Math.max(280,$('grid-scroll').clientWidth),steps=this.song.bars*16;this.cellWidth=Math.max(steps<=64?14:20,(width-this.labelWidth)/steps);this.cssWidth=Math.ceil(this.labelWidth+this.cellWidth*steps);this.cssHeight=this.ruler+this.rows.length*this.rowHeight;const dpr=1;this.canvas.width=Math.ceil(this.cssWidth*dpr);this.canvas.height=Math.ceil(this.cssHeight*dpr);this.canvas.style.width=this.cssWidth+'px';this.canvas.style.height=this.cssHeight+'px';this.ctx.setTransform(dpr,0,0,dpr,0,0);this.ctx.imageSmoothingEnabled=false;this.rulerCanvas.width=this.cssWidth;this.rulerCanvas.height=28;this.rulerCanvas.style.width=this.cssWidth+'px';this.rulerCtx.imageSmoothingEnabled=false;this.dirty=true;this.draw();
 }
 label(p){return this.track().instrument==='drums'?this.drumLabel(p):pitchName(p,this.song.key,this.song.scale);}
 focusRange(){const top=this.track().instrument==='drums'?0:this.rows.indexOf(this.range.high);$('grid-scroll').scrollTop=Math.max(0,top*this.rowHeight);}
 draw(){
  if(!this.ctx||!this.rows)return;
  const c=this.ctx,w=this.cssWidth,h=this.cssHeight,left=this.labelWidth,cw=this.cellWidth,rh=this.rowHeight,steps=this.song.bars*16,tr=this.track();
  c.clearRect(0,0,w,h);c.fillStyle='#1a2435';c.fillRect(0,0,w,h);
  c.fillStyle='#25334a';c.fillRect(0,0,left,h);c.fillStyle='#101928';c.fillRect(left-2,0,2,h);
  this.rows.forEach((p,i)=>{
   const y=this.ruler+i*rh;c.fillStyle=this.keyPitches.has(p)?(i%2?'#26374d':'#203046'):'#192434';c.fillRect(left,y,w-left,rh);
   if(p%12===this.song.key&&tr.instrument!=='drums'&&this.keyPitches.has(p)){c.fillStyle='#304454';c.fillRect(left,y,w-left,rh);}
   if(this.sounding(p)){c.fillStyle='#65513f';c.fillRect(left,y,w-left,rh);}
   c.fillStyle='#111b2a';c.fillRect(left,y,w-left,1);
  });
  const rc=this.rulerCtx;rc.clearRect(0,0,w,28);rc.fillStyle='#25334a';rc.fillRect(0,0,w,28);rc.fillStyle='#e7c38c';rc.font='12px \"Pixelify Sans\"';rc.textAlign='left';rc.fillText('BAR',12,19);
  for(let s=0;s<=steps;s++){
   const x=Math.round(left+s*cw);c.fillStyle=s%16===0?'#77859a':s%4===0?'#40536c':'#2d3b50';c.fillRect(x,this.ruler,s%16===0?2:1,h-this.ruler);
   if(s%4===0&&s<steps){rc.font='14px "Pixelify Sans"';rc.fillStyle=s%16===0?'#f2cf95':'#879bb3';rc.textAlign='left';rc.fillText(s%16===0?`${s/16+1}`:`${s%16/4+1}`,x+6,19);if(s%16===0){rc.fillStyle='#efb27d';rc.fillRect(x,0,4,4);}}
  }
  tr.notes.forEach(n=>{
   if(n.s>=steps)return;const row=this.rows.indexOf(n.p);if(row<0)return;
   const x=Math.round(left+n.s*cw)+2,y=this.ruler+row*rh+4,width=Math.max(5,Math.round(Math.min(n.d,steps-n.s)*cw)-4),height=rh-8;
   c.fillStyle='#101725';c.fillRect(x+2,y+3,width,height);
   c.fillStyle=tr.color;c.fillRect(x,y,width,height);
   c.fillStyle='#ffffff66';c.fillRect(x,y,width,2);c.fillRect(x,y,2,height);
   c.fillStyle='#00000040';c.fillRect(x,y+height-2,width,2);c.fillRect(x+width-2,y,2,height);
   c.fillStyle='#1c2b44';c.fillRect(x+3,y+height-6,Math.max(1,Math.round((width-6)*n.v)),2);
   if(width>35&&tr.instrument!=='drums'){c.font='13px "Pixelify Sans"';c.fillStyle='#182234';c.textAlign='left';c.fillText(this.label(n.p),x+7,y+14);}
  });
  if(this.audio.playing&&this.audio.source==='studio'){
   const pos=this.audio.position();if(pos>=0){const x=Math.round(left+pos*cw);c.fillStyle='#fff0b8';c.fillRect(x,0,2,h);rc.fillStyle='#fff0b8';rc.fillRect(x,0,2,28);rc.fillRect(x-3,0,8,5);rc.fillRect(x-1,5,4,3);}
  }
  $('note-count').textContent=tr.notes.filter(n=>n.s<steps).length+' notes';this.dirty=false;
 }
 gridPoint(e){const r=this.canvas.getBoundingClientRect();return {s:Math.floor((e.clientX-r.left-this.labelWidth)/this.cellWidth),row:Math.floor((e.clientY-r.top-this.ruler)/this.rowHeight)};}
 async gridDown(e){if(e.button!==0&&e.button!==2)return;e.preventDefault();this.canvas.focus({preventScroll:true});if(!this.track().instrument)return;const {s,row}=this.gridPoint(e);if(s<0||s>=this.song.bars*16||row<0||row>=this.rows.length)return;const pitch=this.rows[row],tr=this.track();this.history();const existing=tr.notes.find(n=>n.p===pitch&&s>=n.s&&s<n.s+n.d);if(existing){tr.notes.splice(tr.notes.indexOf(existing),1);this.changed();return;}if(e.button===2)return;const note={s,p:pitch,d:Math.min(+$('note-length').value,this.song.bars*16-s),v:+$('velocity').value};tr.notes.push(note);this.drag={note,start:s};this.canvas.setPointerCapture(e.pointerId);await this.previewNote(tr,pitch,Math.min(.8,note.d*60/this.song.bpm/4),note.v);this.changed();}
 gridMove(e){if(!this.drag)return;const {s}=this.gridPoint(e);if(s!==this.drag.start)this.drag.note.d=clamp(s-this.drag.start+1,1,this.song.bars*16-this.drag.start);this.dirty=true;}
 gridUp(e){if(this.drag){this.drag=null;try{this.canvas.releasePointerCapture(e.pointerId);}catch{}this.changed();}}
 keyboard(){
  const keyboard=$('keyboard'),drum=this.track().instrument==='drums',playable=this.allowedTrack();
  keyboard.replaceChildren();keyboard.classList.toggle('drum-keyboard',drum);
  this.range=keyboardRange(this.song.key,this.song.scale,this.octave);this.octave=this.range.octave;
  this.keys=drum?Object.keys(this.track().pads||DEFAULT_PADS).map((n,i)=>({pitch:Number(n),code:PIANO_CODES[i]})):this.range.keys;
  this.keyPitches=new Set(this.keys.map(k=>k.pitch));
  const rangeLabel=drum?'':this.label(this.range.low)+'–'+this.label(this.range.high);
  $('octave-label').textContent=!playable?'No playable sound':drum?'Percussion':rangeLabel;
  $('grid-range').textContent=drum?this.keys.length+' drum lanes':'Keyboard '+rangeLabel;
  $('octave-down').disabled=!playable||drum||this.octave<=1;
  $('octave-up').disabled=!playable||drum||this.octave>=this.range.maxOctave;
  $('keyboard-tip').textContent=playable?this.keys.map(k=>k.code?.slice(3)).filter(Boolean).join(' '):'';
  if(!playable)return;
  for(const {pitch,code,blackAt} of this.keys){
   const button=document.createElement('button'),name=this.label(pitch);
   button.type='button';button.className='piano-key';button.dataset.pitch=pitch;button.textContent=name;
   button.setAttribute('aria-label',name);button.classList.toggle('drum-key',drum);
   if(blackAt){button.classList.add('black');button.style.left=(blackAt/8*100)+'%';}
   if(!drum&&pitch%12===this.song.key)button.classList.add('tonic');
   if(code){const shortcut=document.createElement('small');shortcut.textContent=code.slice(3);button.append(shortcut);}
   button.onpointerdown=e=>{e.preventDefault();this.canvas.focus({preventScroll:true});button.setPointerCapture(e.pointerId);this.noteOn(pitch,.75,'pointer-'+e.pointerId);};
   button.onpointerup=button.onpointercancel=e=>this.noteOff('pointer-'+e.pointerId);
   button.onkeydown=e=>{if(e.code==='Enter'||e.code==='Space'){e.preventDefault();if(!e.repeat)this.noteOn(pitch,.75,'button-'+pitch);}};
   button.onkeyup=e=>{if(e.code==='Enter'||e.code==='Space'){e.preventDefault();this.noteOff('button-'+pitch);}};
   button.onblur=()=>this.noteOff('button-'+pitch);keyboard.append(button);
  }
 }
 async noteOn(p,v,source,time){
  const track=this.track();
  if(!this.allowedTrack()||!this.canPlayPitch(track,p)){this.callbacks.toast('Discover this sound or expand your tracks to play it.');return;}
  if(!Number.isInteger(p)||p<0||p>127||this.held.has(source))return;
  if(!this.audio.ready||this.audio.ctx?.state!=='running'){
   const pending={pending:true};this.held.set(source,pending);
   try{await this.audio.init();}catch(e){if(this.held.get(source)===pending)this.held.delete(source);this.callbacks.toast(e.message);return;}
   if(this.held.get(source)!==pending)return;
   if(this.track()!==track||!this.allowedTrack()||!this.canPlayPitch(track,p)){this.held.delete(source);return;}
  }
  const mix=this.playable(),audible=mix.tracks[this.selected];
  this.audio.setRoom(mix.reverb);this.audio.setEcho(mix.delay,mix.bpm);
  const entry={p,handle:this.audio.audition(track.instrument,p,null,v,audible.volume,audible.pads)};
  this.held.set(source,entry);
  if(this.recording&&this.audio.playing){
   const started=time??this.audio.ctx.currentTime,pos=this.audio.position(started);
   if(pos>=0){
    const s=$('quantize').checked?Math.round(pos)%(this.song.bars*16):pos;
    entry.note={s,p,d:1,v};entry.started=started;track.notes.push(entry.note);
    this.changed();if(!this.rows.includes(p))this.layout();
   }
  }
  this.markKey(p);
 }
 noteOff(source,time){
  const entry=this.held.get(source);if(!entry)return;
  this.held.delete(source);if(entry.pending)return;
  entry.handle?.release();this.markKey(entry.p);
  if(entry.note){
   const d=((time??this.audio.ctx.currentTime)-entry.started)/(60/this.song.bpm/4);
   entry.note.d=clamp($('quantize').checked?Math.max(1,Math.round(d)):d,.125,this.song.bars*16-entry.note.s);this.changed();
  }
 }
 sounding(p){for(const entry of this.held.values())if(entry.p===p)return true;return false;}
 markKey(p){
  const on=this.sounding(p),selector='[data-pitch="'+p+'"]';
  $('keyboard').querySelector(selector)?.classList.toggle('active',on);
  $('pitch-labels').querySelector(selector)?.classList.toggle('active',on);
  this.dirty=true;
 }
 releaseAll(){this.midi?.clear();for(const k of [...this.held.keys()])this.noteOff(k);}
 async start(record){if(!this.hasPlayableTrack()||record&&!this.allowedTrack()){this.callbacks.toast('Find an instrument to play this track.');return;}try{await this.audio.init();}catch(e){this.callbacks.toast(e.message);return;}if(!this.visible)return;this.callbacks.stopRecordUI();this.releaseAll();if(record)this.history();this.recording=record;this.audio.start(this.song,{countIn:record&&$('count-in').checked,prepareSong:s=>this.callbacks.prepareSong?.(s)??s});this.updateTransport();this.callbacks.playbackChanged();}
 stop(){this.releaseAll();this.audio.stop();this.recording=false;this.updateTransport();this.dirty=true;}
 updateTransport(){$('play').classList.toggle('playing',this.audio.playing&&this.audio.source==='studio');$('play').textContent=this.audio.playing&&this.audio.source==='studio'?'Ⅱ':'▶';$('play').setAttribute('aria-label',this.audio.playing&&this.audio.source==='studio'?'Pause composition':'Play composition');$('live-record').classList.toggle('recording',this.recording);if(!this.audio.playing)$('position-readout').textContent='1 : 1';}
 frame(t){if(!this.visible)return;if(this.audio.playing&&this.audio.source==='studio'){const pos=this.audio.position();$('position-readout').textContent=pos<0?`IN ${Math.ceil(-pos/4)}`:`${Math.floor(pos/16)+1} : ${Math.floor(pos%16/4)+1}`;if(t-(this.lastDraw||0)>.033){this.draw();this.lastDraw=t;}}else if(this.dirty)this.draw();}
 show(instrument){this.visible=true;if(instrument){let index=this.song.tracks.findIndex(t=>t.instrument===instrument);if(index<0&&this.can(instrument)){
  const slot=this.song.tracks.findIndex((t,i)=>i<this.limit()&&!t.instrument&&!t.notes.length);
  if(slot>=0){const next=this.makeTrack(instrument);Object.assign(this.song.tracks[slot],{instrument,name:next.name,pads:next.pads,padLocks:{}});index=slot;this.changed();}
 }if(index<0&&this.song.tracks.length<this.limit()&&this.can(instrument)){this.song.tracks.push(this.makeTrack(instrument));index=this.song.tracks.length-1;this.changed();}if(index>=0)this.selected=index;else if(!this.can(instrument))this.callbacks.toast('Discover this sound while exploring.');}this.sync();requestAnimationFrame(()=>{this.layout();const notes=this.track().notes;if(notes.length){const highest=Math.max(...notes.map(n=>n.p));const row=this.rows.indexOf(highest);$('grid-scroll').scrollTop=Math.max(0,row*this.rowHeight-35);}else this.focusRange();});}
 hide(){this.visible=false;this.releaseAll();if(this.recording)this.stop();this.closePopover();}
 load(song){this.stop();this.song=normalizeSong(song);this.octave=4;this.selected=0;this.undo=[];this.sync();this.changed();}
 popover(title,body,bind){$('studio-popover').classList.remove('kit-editor');$('studio-popover').innerHTML=`<button class="pop-close" aria-label="Close dialog">×</button><h3>${escape(title)}</h3>${body}`;$('studio-popover').classList.remove('hidden');$('studio-popover').querySelector('.pop-close').onclick=()=>this.closePopover();bind?.();}
 closePopover(){$('studio-popover').classList.add('hidden');$('studio-popover').classList.remove('kit-editor');}
 fileMenu(){this.popover('Files & export','<button class="pop-full" id="export-song">Download editable composition</button><button class="pop-full" id="import-song">Open a composition</button><button class="primary pop-full" id="export-audio">Export WAV audio</button><p>A WAV includes one pass through your piece, followed by the instrument, reverb, and echo tails.</p>',()=>{
  $('export-audio').disabled=!this.hasPlayableTrack();if($('export-audio').disabled)$('export-audio').title='Find an instrument used in this piece to export audio';
  $('export-song').onclick=()=>this.callbacks.download(new Blob([JSON.stringify({format:'resonant-valley-composition',version:1,song:this.song},null,2)],{type:'application/json'}),this.song.title+'.composition.json');
  $('import-song').onclick=()=>$('song-file').click();$('export-audio').onclick=async()=>{const btn=$('export-audio');btn.disabled=true;btn.textContent='Rendering audio…';try{const blob=await this.audio.exportWav(this.playable());this.callbacks.download(blob,this.song.title+'.wav');btn.textContent='WAV downloaded';}catch(err){btn.textContent='Try export again';this.callbacks.toast('Audio export failed: '+err.message);}btn.disabled=false;};
 });}
}
