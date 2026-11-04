import {SOUNDS,sound,DEFAULT_PADS} from './catalog.js';
import {INSTRUMENTS,SCALES,NAMES,DRUMS,COLORS,clamp,uid,makeTrack,equipFoundSound,emptySong,normalizeSong,noteName} from './data.js';
const $=id=>document.getElementById(id);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEYS=['KeyA','KeyW','KeyS','KeyE','KeyD','KeyF','KeyT','KeyG','KeyY','KeyH','KeyU','KeyJ','KeyK'];
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
  for(const id of ['tempo','bars','key','scale'])$(id).addEventListener('change',()=>{this.history();this.song.bpm=clamp($('tempo').value,40,220);$('tempo').value=this.song.bpm;this.song.bars=Number($('bars').value);this.song.key=Number($('key').value);this.song.scale=$('scale').value;if(this.audio.playing&&this.audio.source==='studio')this.start(false);this.layout();this.keyboard();this.changed();});
  $('reverb').addEventListener('input',e=>{if(!(this.callbacks.reverbOwned?.()??true))return;this.song.reverb=+e.target.value;this.audio.setRoom(this.song.reverb);this.changed();});
  $('delay').addEventListener('input',e=>{if(!(this.callbacks.delayOwned?.()??true))return;this.song.delay=+e.target.value;this.audio.setEcho(this.song.delay,this.song.bpm);this.changed();});
  $('metronome').addEventListener('change',e=>this.audio.metronome=e.target.checked);
  $('instrument').addEventListener('change',e=>{this.history();const t=this.track();const wasDrum=t.instrument==='drums';if(!this.can(e.target.value)){e.target.value=t.instrument;this.callbacks.toast('Discover this instrument to use it.');return;}this.releaseAll();t.instrument=e.target.value;if(t.instrument==='drums'&&!t.pads)t.pads=this.makeTrack('drums').pads;t.name=INSTRUMENTS[t.instrument];if(wasDrum!== (t.instrument==='drums')){t.notes=t.notes.map(n=>({...n,p:t.instrument==='drums'?Number(Object.keys(t.pads||DEFAULT_PADS)[Math.abs(n.p)%Math.max(1,Object.keys(t.pads||DEFAULT_PADS).length)]):60+Math.abs(n.p)%12}));}this.sync();this.changed();});
  $('play').onclick=()=>this.audio.playing&&this.audio.source==='studio'?this.stop():this.start(false);
  $('stop').onclick=()=>{this.stop();this.callbacks.stopRecordUI();this.callbacks.playbackChanged();};
  $('live-record').onclick=()=>this.recording?this.stop():this.start(true);
  $('add-track').onclick=()=>this.addTrackMenu();$('undo-notes').onclick=()=>this.undoEdit();
  $('clear-track').onclick=()=>{this.history();this.track().notes=[];this.changed();};
  $('new-song').onclick=()=>this.popover('Start a new piece',`<p>Your current piece will be kept in your record collection.</p><button class="primary pop-full" id="new-confirm">Start with a blank page</button>`,()=>{$('new-confirm').onclick=()=>{if(this.song.tracks.some(t=>t.notes.length))this.callbacks.saveRecord(this.song,true);this.song=emptySong(this.callbacks.firstSound?.());this.selected=0;this.undo=[];this.stop();this.sync();this.changed();this.closePopover();};});
  $('studio-save').onclick=()=>this.popover('Make a record',`<p>Give this copy a title for your record shelf.</p><input id="record-title" aria-label="Record title" maxlength="70" value="${escape(this.song.title)}"><button id="confirm-record" class="primary pop-full">Save record</button><button id="save-with-sleeve" class="pop-full">Save &amp; design sleeve</button>`,()=>{
   const save=design=>{this.song.title=$('record-title').value.trim()||'Untitled piece';const record=this.callbacks.saveRecord(this.song);if(!record)return;this.sync();this.changed();this.closePopover();$('studio-status').textContent='Record added to your shelf';if(design)this.callbacks.openRecords(record);};
   $('confirm-record').onclick=()=>save(false);$('save-with-sleeve').onclick=()=>save(true);$('record-title').focus();
  });
  $('record-shelf').onclick=()=>this.callbacks.openRecords();$('song-menu').onclick=()=>this.fileMenu();
  $('advanced-toggle').onclick=()=>{const active=$('advanced-controls').classList.toggle('hidden')===false;$('studio-panel').classList.toggle('advanced',active);$('advanced-toggle').textContent=active?'Fewer controls':'More controls';this.dirty=true;};
  $('octave-down').onclick=()=>{this.octave=Math.max(2,this.octave-1);this.keyboard();};$('octave-up').onclick=()=>{this.octave=Math.min(6,this.octave+1);this.keyboard();};
  $('midi-connect').onclick=()=>this.connectMidi();$('kit-edit').onclick=()=>this.kitEditor();$('studio-collection').onclick=()=>this.callbacks.openCollection();
  this.canvas.addEventListener('pointerdown',e=>this.gridDown(e));this.canvas.addEventListener('pointermove',e=>this.gridMove(e));this.canvas.addEventListener('pointerup',e=>this.gridUp(e));this.canvas.addEventListener('pointercancel',e=>this.gridUp(e));this.canvas.addEventListener('contextmenu',e=>e.preventDefault());
  addEventListener('keydown',e=>{if(!this.visible||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||!$('studio-popover').classList.contains('hidden'))return;if((e.ctrlKey||e.metaKey)&&e.code==='KeyZ'){e.preventDefault();this.undoEdit();return;}if(e.repeat)return;const k=KEYS.indexOf(e.code);if(k>=0&&!e.ctrlKey&&!e.metaKey){e.preventDefault();const p=this.track().instrument==='drums'?Number(Object.keys(this.track().pads||DEFAULT_PADS)[k%Math.max(1,Object.keys(this.track().pads||DEFAULT_PADS).length)]):(this.octave+1)*12+k;this.noteOn(p,.75,e.code);}if(e.code==='Space'){e.preventDefault();$('play').click();}});
  addEventListener('keyup',e=>{if(KEYS.includes(e.code))this.noteOff(e.code);});
  addEventListener('blur',()=>this.releaseAll());
  new ResizeObserver(()=>{if(this.visible)this.layout();}).observe($('grid-scroll'));
  $('song-file').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>3e6)throw Error('Choose a composition file under 3 MB.');const raw=JSON.parse(await f.text());this.load(normalizeSong(raw.song||raw));this.closePopover();this.callbacks.toast('Composition opened.');}catch(err){this.callbacks.toast(err.message||'Could not open this composition.');}e.target.value='';});
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
  $('midi-connect').disabled=$('add-track').disabled=!hasFinds;
  $('studio-save').disabled=waiting;
  $('kit-edit').classList.toggle('hidden',track.instrument!=='drums'||!this.allowedTrack());
  $('track-capacity').textContent=this.song.tracks.length+' / '+this.limit()+' tracks · GeneralUser GS';
  $('reverb').disabled=!(this.callbacks.reverbOwned?.()??true);$('delay').disabled=!(this.callbacks.delayOwned?.()??true);
  $('reverb-control').title=$('reverb').disabled?'Discover a reverb processor':'Room reverb';$('delay-control').title=$('delay').disabled?'Discover an echo processor':'Echo repeats on the beat';
  const locked=this.song.tracks.some((t,i)=>i>=this.limit()||!this.can(t.instrument)||t.instrument==='drums'&&Object.values(t.pads||{}).some(id=>!this.can(id)));
  $('studio-access-note').textContent=!waiting&&locked?'Find the missing sounds or track expansions to hear the full piece.':'';
  $('song-title').value=this.song.title;$('tempo').value=this.song.bpm;$('bars').value=this.song.bars;$('key').value=this.song.key;$('scale').value=this.song.scale;$('reverb').value=this.song.reverb;$('delay').value=this.song.delay||0;
  $('selected-color').style.background=track.color;this.tracks();this.keyboard();this.layout();this.updateTransport();
 }
 tracks(){
  const list=$('track-list');list.replaceChildren();this.song.tracks.forEach((t,i)=>{const card=document.createElement('div');const locked=i>=this.limit()||!!t.instrument&&!this.can(t.instrument);card.className='track-card'+(i===this.selected?' active':'')+(locked?' locked':'');card.style.setProperty('--track',t.color);card.innerHTML=`<div class="track-title"><span class="track-dot"></span><strong>${escape(t.name)}</strong><button class="delete-track" aria-label="Remove ${escape(t.name)}">×</button></div><div class="track-mixer"><input type="range" min="0" max="1" step=".01" value="${t.volume}" aria-label="${escape(t.name)} volume"><button class="mute ${t.mute?'on':''}" aria-label="Mute ${escape(t.name)}">M</button><button class="solo ${t.solo?'on':''}" aria-label="Solo ${escape(t.name)}">S</button></div><label class="track-pan">Pan <input type="range" min="-1" max="1" step=".05" value="${t.pan}" aria-label="${escape(t.name)} pan"></label>`;
   if(locked)card.insertAdjacentHTML('beforeend',`<span class="track-locked-note">${i>=this.limit()?'Find a track expansion':'Sound undiscovered'}</span>`);
   card.onclick=e=>{if(e.target.closest('button,input'))return;this.selected=i;this.sync();};card.querySelector('.track-mixer input').oninput=e=>{t.volume=+e.target.value;this.changed();};card.querySelector('.track-pan input').oninput=e=>{t.pan=+e.target.value;this.changed();};card.querySelector('.mute').onclick=e=>{t.mute=!t.mute;e.target.classList.toggle('on',t.mute);this.changed();};card.querySelector('.solo').onclick=e=>{t.solo=!t.solo;e.target.classList.toggle('on',t.solo);this.changed();};card.querySelector('.delete-track').onclick=()=>{if(this.song.tracks.length<2){this.callbacks.toast('Keep one track. Clear its notes to start again.');return;}this.history();this.song.tracks.splice(i,1);this.selected=Math.min(this.selected,this.song.tracks.length-1);const restart=this.audio.playing&&this.audio.source==='studio';this.stop();if(restart)this.start(false);this.sync();this.changed();};if(!(this.callbacks.mixerOwned?.()??true)){card.querySelectorAll('input,.solo').forEach(el=>{el.disabled=true;el.title='Discover the mixer to unlock volume and pan';});}list.append(card);
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
  const tr=this.track();if(tr.instrument==='drums')this.rows=Object.keys(tr.pads||DEFAULT_PADS).map(Number).sort((a,b)=>b-a);else{const min=tr.instrument==='bass'?24:48,max=tr.instrument==='bass'?60:84,scale=SCALES[this.song.scale];const pitches=new Set(tr.notes.map(n=>n.p));this.rows=[];for(let p=max;p>=min;p--)if(scale.includes((p-this.song.key+120)%12)||pitches.has(p))this.rows.push(p);for(const p of pitches)if(!this.rows.includes(p))this.rows.push(p);this.rows.sort((a,b)=>b-a);}
  this.labelWidth=tr.instrument==='drums'?112:72;const width=Math.max(280,$('grid-scroll').clientWidth),steps=this.song.bars*16;this.cellWidth=Math.max(steps<=64?14:20,(width-this.labelWidth)/steps);this.cssWidth=Math.ceil(this.labelWidth+this.cellWidth*steps);this.cssHeight=this.ruler+this.rows.length*this.rowHeight;const dpr=1;this.canvas.width=Math.ceil(this.cssWidth*dpr);this.canvas.height=Math.ceil(this.cssHeight*dpr);this.canvas.style.width=this.cssWidth+'px';this.canvas.style.height=this.cssHeight+'px';this.ctx.setTransform(dpr,0,0,dpr,0,0);this.ctx.imageSmoothingEnabled=false;this.rulerCanvas.width=this.cssWidth;this.rulerCanvas.height=28;this.rulerCanvas.style.width=this.cssWidth+'px';this.rulerCtx.imageSmoothingEnabled=false;this.dirty=true;this.draw();
 }
 draw(){
  if(!this.ctx||!this.rows)return;
  const c=this.ctx,w=this.cssWidth,h=this.cssHeight,left=this.labelWidth,cw=this.cellWidth,rh=this.rowHeight,steps=this.song.bars*16,tr=this.track();
  c.clearRect(0,0,w,h);c.fillStyle='#1a2435';c.fillRect(0,0,w,h);
  c.fillStyle='#25334a';c.fillRect(0,0,left,h);c.fillStyle='#101928';c.fillRect(left-2,0,2,h);
  this.rows.forEach((p,i)=>{
   const y=this.ruler+i*rh;c.fillStyle=i%2?'#202e42':'#1b273a';c.fillRect(left,y,w-left,rh);
   if(p%12===this.song.key&&tr.instrument!=='drums'){c.fillStyle='#2a3b4e';c.fillRect(left,y,w-left,rh);c.fillStyle='#efb27d';c.fillRect(6,y+12,4,4);}
   c.fillStyle='#111b2a';c.fillRect(left,y,w-left,1);
   c.fillStyle=tr.instrument==='drums'?'#becbd8':p%12===this.song.key?'#f6dca7':'#96a9bd';
   c.font=`${tr.instrument==='drums'?12:14}px "Pixelify Sans"`;c.textAlign='right';
   c.fillText(tr.instrument==='drums'?this.drumLabel(p).slice(0,16):noteName(p),left-10,y+20);
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
   if(width>35){c.font='13px "Pixelify Sans"';c.fillStyle='#182234';c.textAlign='left';c.fillText(tr.instrument==='drums'?'':noteName(n.p),x+7,y+14);}
  });
  if(this.audio.playing&&this.audio.source==='studio'){
   const pos=this.audio.position();if(pos>=0){const x=Math.round(left+pos*cw);c.fillStyle='#fff0b8';c.fillRect(x,0,2,h);rc.fillStyle='#fff0b8';rc.fillRect(x,0,2,28);rc.fillRect(x-3,0,8,5);rc.fillRect(x-1,5,4,3);}
  }
  $('note-count').textContent=tr.notes.filter(n=>n.s<steps).length+' notes';this.dirty=false;
 }
 gridPoint(e){const r=this.canvas.getBoundingClientRect();return {s:Math.floor((e.clientX-r.left-this.labelWidth)/this.cellWidth),row:Math.floor((e.clientY-r.top-this.ruler)/this.rowHeight)};}
 async gridDown(e){if(e.button!==0&&e.button!==2)return;e.preventDefault();if(!this.track().instrument)return;const {s,row}=this.gridPoint(e);if(s<0||s>=this.song.bars*16||row<0||row>=this.rows.length)return;const pitch=this.rows[row],tr=this.track();this.history();const existing=tr.notes.find(n=>n.p===pitch&&s>=n.s&&s<n.s+n.d);if(existing){tr.notes.splice(tr.notes.indexOf(existing),1);this.changed();return;}if(e.button===2)return;const note={s,p:pitch,d:Math.min(+$('note-length').value,this.song.bars*16-s),v:+$('velocity').value};tr.notes.push(note);this.drag={note,start:s};this.canvas.setPointerCapture(e.pointerId);await this.previewNote(tr,pitch,Math.min(.8,note.d*60/this.song.bpm/4),note.v);this.changed();}
 gridMove(e){if(!this.drag)return;const {s}=this.gridPoint(e);if(s!==this.drag.start)this.drag.note.d=clamp(s-this.drag.start+1,1,this.song.bars*16-this.drag.start);this.dirty=true;}
 gridUp(e){if(this.drag){this.drag=null;try{this.canvas.releasePointerCapture(e.pointerId);}catch{}this.changed();}}
 keyboard(){
  const keyboard=$('keyboard');keyboard.replaceChildren();if(!this.allowedTrack()){$('octave-label').textContent='No playable sound';return;}const drum=this.track().instrument==='drums',base=(this.octave+1)*12;$('octave-label').textContent=drum?'Percussion':`${noteName(base)} – ${noteName(base+12)}`;const white=[0,2,4,5,7,9,11,12],black=[1,3,6,8,10];const make=(p,blackKey=false)=>{const b=document.createElement('button');b.className='piano-key'+(blackKey?' black':'')+(drum?' drum-key':'');b.dataset.pitch=p;b.setAttribute('aria-label',drum?this.drumLabel(p):noteName(p));b.innerHTML=`${drum?this.drumLabel(p):noteName(p)}<small>${drum?'':KEYS[(p-base)%13]?.replace('Key','')||''}</small>`;if(blackKey){const pos={1:1,3:2,6:4,8:5,10:6}[p-base];b.style.left=`${pos/8*100}%`;}
   b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);this.noteOn(p,.75,'pointer-'+e.pointerId);};b.onpointerup=e=>this.noteOff('pointer-'+e.pointerId);b.onpointercancel=e=>this.noteOff('pointer-'+e.pointerId);keyboard.append(b);};
  keyboard.classList.toggle('drum-keyboard',drum);if(drum)Object.keys(this.track().pads||DEFAULT_PADS).map(Number).forEach(p=>make(p));else{white.forEach(p=>make(base+p));black.forEach(p=>make(base+p,true));}
 }
 async noteOn(p,v,source){const initial=this.track();if(!this.allowedTrack()||!this.canPlayPitch(initial,p)){this.callbacks.toast('Discover this sound or expand your tracks to play it.');return;}if(!Number.isFinite(p))return;if(this.held.has(source))return;this.held.set(source,{pending:true});try{await this.audio.init();}catch(e){this.held.delete(source);this.callbacks.toast(e.message);return;}if(!this.held.has(source))return;if(this.track()!==initial||!this.allowedTrack()||!this.canPlayPitch(initial,p)){this.held.delete(source);return;}const mix=this.playable();this.audio.setRoom(mix.reverb);this.audio.setEcho(mix.delay,mix.bpm);const tr=this.track(),playable=mix.tracks[this.selected],handle=this.audio.audition(tr.instrument,p,12,v,playable.volume,playable.pads),entry={handle,p};if(this.recording&&this.audio.playing){const pos=this.audio.position();if(pos>=0){const snap=$('quantize').checked;const s=snap?Math.round(pos)% (this.song.bars*16):pos;entry.note={s,p,d:1,v};entry.started=this.audio.ctx.currentTime;entry.track=tr;tr.notes.push(entry.note);this.changed();if(!this.rows.includes(p))this.layout();}}this.held.set(source,entry);this.markKey(p,true);}
 noteOff(source){const entry=this.held.get(source);if(!entry)return;this.held.delete(source);if(entry.pending)return;entry.handle?.release();this.markKey(entry.p,false);if(entry.note){const d=(this.audio.ctx.currentTime-entry.started)/(60/this.song.bpm/4);entry.note.d=clamp($('quantize').checked?Math.max(1,Math.round(d)):d,.125,this.song.bars*16-entry.note.s);this.changed();}}
 markKey(p,on){$('keyboard').querySelector(`[data-pitch="${p}"]`)?.classList.toggle('active',on);}
 releaseAll(){for(const k of [...this.held.keys()])this.noteOff(k);}
 async start(record){if(!this.hasPlayableTrack()||record&&!this.allowedTrack()){this.callbacks.toast('Find an instrument to play this track.');return;}try{await this.audio.init();}catch(e){this.callbacks.toast(e.message);return;}if(!this.visible)return;this.callbacks.stopRecordUI();this.releaseAll();if(record)this.history();this.recording=record;this.audio.start(this.song,{countIn:record&&$('count-in').checked,prepareSong:s=>this.callbacks.prepareSong?.(s)??s});this.updateTransport();this.callbacks.playbackChanged();}
 stop(){this.releaseAll();this.audio.stop();this.recording=false;this.updateTransport();this.dirty=true;}
 updateTransport(){$('play').classList.toggle('playing',this.audio.playing&&this.audio.source==='studio');$('play').textContent=this.audio.playing&&this.audio.source==='studio'?'Ⅱ':'▶';$('play').setAttribute('aria-label',this.audio.playing&&this.audio.source==='studio'?'Pause composition':'Play composition');$('live-record').classList.toggle('recording',this.recording);if(!this.audio.playing)$('position-readout').textContent='1 : 1';}
 frame(t){if(!this.visible)return;if(this.audio.playing&&this.audio.source==='studio'){const pos=this.audio.position();$('position-readout').textContent=pos<0?`IN ${Math.ceil(-pos/4)}`:`${Math.floor(pos/16)+1} : ${Math.floor(pos%16/4)+1}`;if(t-(this.lastDraw||0)>.033){this.draw();this.lastDraw=t;}}else if(this.dirty)this.draw();}
 show(instrument){this.visible=true;if(instrument){let index=this.song.tracks.findIndex(t=>t.instrument===instrument);if(index<0&&this.can(instrument)){
  const slot=this.song.tracks.findIndex((t,i)=>i<this.limit()&&!t.instrument&&!t.notes.length);
  if(slot>=0){const next=this.makeTrack(instrument);Object.assign(this.song.tracks[slot],{instrument,name:next.name,pads:next.pads,padLocks:{}});index=slot;this.changed();}
 }if(index<0&&this.song.tracks.length<this.limit()&&this.can(instrument)){this.song.tracks.push(this.makeTrack(instrument));index=this.song.tracks.length-1;this.changed();}if(index>=0)this.selected=index;else if(!this.can(instrument))this.callbacks.toast('Discover this sound while exploring.');}this.sync();requestAnimationFrame(()=>{this.layout();const notes=this.track().notes;if(notes.length){const highest=Math.max(...notes.map(n=>n.p));const row=this.rows.indexOf(highest);$('grid-scroll').scrollTop=Math.max(0,row*this.rowHeight-35);}else $('grid-scroll').scrollTop=100;});}
 hide(){this.visible=false;this.releaseAll();if(this.recording)this.stop();this.closePopover();}
 load(song){this.stop();this.song=normalizeSong(song);this.selected=0;this.undo=[];this.sync();this.changed();}
 popover(title,body,bind){$('studio-popover').classList.remove('kit-editor');$('studio-popover').innerHTML=`<button class="pop-close" aria-label="Close dialog">×</button><h3>${escape(title)}</h3>${body}`;$('studio-popover').classList.remove('hidden');$('studio-popover').querySelector('.pop-close').onclick=()=>this.closePopover();bind?.();}
 closePopover(){$('studio-popover').classList.add('hidden');$('studio-popover').classList.remove('kit-editor');}
 fileMenu(){this.popover('Files & export','<button class="pop-full" id="export-song">Download editable composition</button><button class="pop-full" id="import-song">Open a composition</button><button class="primary pop-full" id="export-audio">Export WAV audio</button><p>A WAV includes one pass through your piece, followed by the instrument, reverb, and echo tails.</p>',()=>{
  $('export-audio').disabled=!this.hasPlayableTrack();if($('export-audio').disabled)$('export-audio').title='Find an instrument used in this piece to export audio';
  $('export-song').onclick=()=>this.callbacks.download(new Blob([JSON.stringify({format:'resonant-valley-composition',version:1,song:this.song},null,2)],{type:'application/json'}),this.song.title+'.composition.json');
  $('import-song').onclick=()=>$('song-file').click();$('export-audio').onclick=async()=>{const btn=$('export-audio');btn.disabled=true;btn.textContent='Rendering audio…';try{const blob=await this.audio.exportWav(this.playable());this.callbacks.download(blob,this.song.title+'.wav');btn.textContent='WAV downloaded';}catch(err){btn.textContent='Try export again';this.callbacks.toast('Audio export failed: '+err.message);}btn.disabled=false;};
 });}
 async connectMidi(){if(!navigator.requestMIDIAccess){$('midi-status').textContent='MIDI needs a browser with Web MIDI support.';return;}try{this.midi=await navigator.requestMIDIAccess({sysex:false});const bind=()=>{let count=0;for(const input of this.midi.inputs.values()){count++;input.onmidimessage=e=>{if(!this.visible)return;const [status,p,v]=e.data;const type=status&0xf0,source='midi-'+input.id+'-'+p;if(type===0x90&&v>0)this.noteOn(p,v/127,source);else if(type===0x80||(type===0x90&&!v))this.noteOff(source);};}$('midi-status').textContent=count?`${count} MIDI input${count>1?'s':''} connected`:'Plug in a MIDI keyboard to begin.';};bind();this.midi.onstatechange=bind;}catch(err){$('midi-status').textContent='MIDI permission was not granted.';}}
}
