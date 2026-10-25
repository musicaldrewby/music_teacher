import * as THREE from './vendor/three.module.js';

const $=id=>document.getElementById(id);
const tonePresets={
 'Deep & warm':{wave:'triangle',cutoff:520,resonance:.7,decay:.46},
 'Round & smooth':{wave:'triangle',cutoff:580,resonance:.8,decay:.5},
 'Short & punchy':{wave:'square',cutoff:720,resonance:1,decay:.34},
 'Bright & buzzy':{wave:'sawtooth',cutoff:680,resonance:1.3,decay:.3},
 'Acid':{wave:'sawtooth',cutoff:900,resonance:2.8,decay:.25}
};
function button(text,action,style='secondary'){const b=document.createElement('button');b.textContent=text;b.className=style;b.onclick=action;return b;}
function selectField(label,items,value,change){const l=document.createElement('label');l.className='field';l.textContent=label;const select=document.createElement('select');for(const [id,title]of items){const o=document.createElement('option');o.value=id;o.textContent=title;o.disabled=id===''||id==='Custom';select.append(o);}select.value=value;select.onchange=()=>change(select.value);l.append(select);return l;}

export function setupPlayView(api){
 let mode='explore',showKeys=false,masked=false,stage=null,lastStation=null;
 const visibility=new Map();let oldBackground,oldFog;
 const toolbar=$('workspace-toolbar'),card=$('machine-card'),synthQuick=$('synth-quick');
 function restore(){if(!masked)return;for(const [object,visible]of visibility)object.visible=visible;visibility.clear();if(stage){api.scene.remove(stage);stage.geometry.dispose();stage.material.dispose();stage=null;}api.scene.background=oldBackground;api.scene.fog=oldFog;masked=false;}
 function hide(object){if(!visibility.has(object))visibility.set(object,object.visible);object.visible=false;}
 function focus(){
  restore();if(mode!=='play'||api.inVR()||!api.scene)return;
  const station=api.current();oldBackground=api.scene.background;oldFog=api.scene.fog;masked=true;
  for(const child of api.scene.children)if(child!==station.group&&child!==station.reachBase&&child!==api.rig&&!child.isLight)hide(child);
  // Keep the physical keyboard in Play. Its wall of controls remains in Explore / VR.
  if(station.type==='synth')for(const child of station.group.children){const bounds=new THREE.Box3().setFromObject(child);if(bounds.max.y>1.3)hide(child);}
  if(['drums','bass','notewall','gallery'].includes(station.type)&&station.group)hide(station.group);
  api.scene.background=new THREE.Color(0xd6d2be);api.scene.fog=null;
  stage=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.MeshStandardMaterial({color:0xd6d2be,roughness:1}));stage.rotation.x=-Math.PI/2;stage.position.y=-.015;stage.receiveShadow=true;api.scene.add(stage);
  api.renderer.shadowMap.needsUpdate=true;
 }
 function setMode(next,reset=true){mode=next;api.release();$('panel').close();document.body.classList.toggle('play-mode',mode==='play');$('view-play').setAttribute('aria-pressed',String(mode==='play'));$('view-explore').setAttribute('aria-pressed',String(mode==='explore'));focus();render();if(reset){if(mode==='play')api.fit();else api.overview();}}
 function chooser(){const p=api.panel('Choose an instrument');const grid=document.createElement('div');grid.className='instrument-grid';for(const s of api.specs.filter(s=>!['notewall','gallery'].includes(s.type))){const b=button('',()=>{$('panel').close();api.select(s.id);});b.className='instrument-choice';b.dataset.family=s.type;b.setAttribute('aria-pressed',String(s.id===api.current().id));const name=document.createElement('strong'),family=document.createElement('small');name.textContent=s.name;family.textContent=s.family;b.append(name,family);grid.append(b);}p.append(grid);}
 function settings(){const p=api.panel('Settings & help');const list=document.createElement('div');list.className='settings-list';const volume=document.createElement('label');volume.className='volume';volume.textContent='Volume';const input=document.createElement('input');input.type='range';input.min=0;input.max=1;input.step=.01;input.value=$('volume').value;input.oninput=()=>{$('volume').value=input.value;$('volume').oninput({target:input});};volume.append(input);list.append(volume,button('Seated play & height',api.comfort),button('Adjust instrument reach',api.placement),button('Performance check',api.performance),button('MIDI keyboard',api.midi),button('Teacher media',api.media),button('Teacher media setup',api.teacher),button('How to play',api.help));const credit=document.createElement('p');credit.className='music-summary';credit.innerHTML='Steelpan: acoustic recordings by Jeff Learman, public domain. Gong: psuess; wind chimes: perrydolia, CC0. <a href="./samples/steelpan/CREDITS.txt" target="_blank" rel="noopener">Steelpan credits</a> · <a href="./samples/steelpan/LICENSE.txt" target="_blank" rel="noopener">License</a> · <a href="./samples/resonant/CREDITS.txt" target="_blank" rel="noopener">Gong & chime credits</a>';list.append(credit);p.append(list);}
 function musicSettings(){const p=api.panel('Music settings');p.innerHTML='<div id="music-harmony"></div><label class="field">Speed (beats per minute)<input id="music-tempo" type="number" min="40" max="200"></label><p class="music-summary" id="tempo-hint"></p><label class="field"><span><input id="music-click" type="checkbox"> Metronome while recording and overdubbing</span></label><label class="field">Stick-click volume <output id="music-click-level"></output><input id="music-click-volume" type="range" min="0" max="100" step="1" style="width:100%"></label><button id="music-click-test" class="secondary">Test click</button><details><summary>More music options</summary><label class="field">VR mallet sensitivity<select id="music-mallet"><option value="light">Light</option><option value="normal">Normal</option><option value="firm">Firm</option></select></label><p class="music-summary">Gentle taps sound softer; faster strikes sound stronger and brighter. Light accepts gentler strokes. Firm helps prevent accidental notes. Your dynamics are kept when recording.</p><label class="field"><span><input id="music-snap" type="checkbox"> Snap recorded notes to the beat (16ths)</span></label><label class="field"><span><input id="music-five" type="checkbox"> Use a 5-note subset on pitched instruments</span></label><label class="field"><span><input id="music-lights" type="checkbox"> Light show with the beat</span></label></details>';
  api.harmonySelect('music-harmony','music');$('music-tempo').value=api.recorder.bpm;$('music-tempo').onchange=e=>{api.tempo(+e.target.value);refresh();};$('music-click').checked=api.recorder.metronome;$('music-click').onchange=e=>api.metronome(e.target.checked);$('music-click-volume').oninput=e=>api.setMetronomeVolume(+e.target.value/100);$('music-click-test').onclick=api.previewMetronome;$('music-mallet').value=api.malletSensitivity();$('music-mallet').onchange=e=>api.setMalletSensitivity(e.target.value);$('music-snap').checked=api.recorder.quantize;$('music-snap').onchange=e=>api.recorder.quantize=e.target.checked;$('music-five').checked=$('pentatonic').checked;$('music-five').onchange=e=>{$('pentatonic').checked=e.target.checked;$('pentatonic').onchange(e);};$('music-lights').checked=api.lights();$('music-lights').onchange=api.toggleLights;refresh();
 }
 function render(){
  const s=api.current(),isPlay=mode==='play'&&!api.inVR(),machine=['drums','bass'].includes(s.type);
  document.body.dataset.instrumentFamily=s.type;
  card.hidden=!isPlay||!['drums','bass','notewall','gallery'].includes(s.type);synthQuick.hidden=!isPlay||s.type!=='synth';
  $('keys').hidden=!showKeys;$('keys-toggle').setAttribute('aria-expanded',String(showKeys));$('keys-toggle').textContent=showKeys?'Hide controls':s.midi!==undefined?'On-screen keys':'More actions';document.body.classList.toggle('keys-open',showKeys);
  $('instrument-position').hidden=['notewall','gallery'].includes(s.type);$('instrument-position').onclick=api.placement;
  $('instrument-edit').hidden=!['synth','drums','bass','notewall','steelpan','gallery'].includes(s.type);$('instrument-edit').textContent=s.type==='notewall'?'Parts & mute':s.type==='steelpan'?'Mobile':'Edit';
  $('instrument-edit').onclick=()=>s.type==='gallery'?api.gallery():s.type==='steelpan'?api.mobile():api.edit(s.type);
  $('fit-instrument').hidden=isPlay&&['drums','bass','notewall','gallery'].includes(s.type);
  if(isPlay&&s.type==='gallery'){card.replaceChildren();const title=document.createElement('h2');title.textContent='Listening Room';card.append(title,button('Browse shared songs',api.gallery,'primary'));}else if(isPlay&&machine){card.replaceChildren();const h=document.createElement('h2');h.textContent=s.name;card.append(h);const presets=s.type==='drums'?api.drumPresets:api.bassPresets;
   card.append(selectField(s.type==='drums'?'Choose a rhythm':'Choose a bass line',[['','Choose a preset…'],...Object.entries(presets).map(([id,p])=>[id,p.category+' · '+id])],api.preset(s.type)||'',name=>{if(name)api.choosePreset(s.type,name);render();refresh();}));
   if(s.type==='bass')card.append(selectField('Bass sound',[['','Custom sound'],...Object.keys(tonePresets).map(n=>[n,n])],Object.keys(tonePresets).find(n=>Object.entries(tonePresets[n]).every(([k,v])=>api.bass()[k]===v))||'',name=>{if(tonePresets[name])api.bassTone(tonePresets[name]);}));
   const row=document.createElement('div');row.className='machine-actions';const play=button('Play',()=>api.toggleMachine(s.type),'primary');play.id='machine-play';row.append(play,button('Edit pattern',()=>api.edit(s.type)));card.append(row);const status=document.createElement('p');status.id='machine-status';status.setAttribute('role','status');card.append(status);
  }else if(isPlay&&s.type==='notewall'){card.innerHTML='<h2>Song Station</h2><progress id="parts-progress" class="loop-progress" max="16" value="0" aria-label="Position in the loop"></progress><div id="play-parts" class="part-mutes"></div>';const row=document.createElement('div');row.className='machine-actions';row.append(button('Mixer',api.mixer),button('Performance View',api.perform),button('Show notes',api.showNotes));card.append(row);$('instrument-edit').hidden=true;}
  if(isPlay&&s.type==='synth'){synthQuick.replaceChildren();const field=selectField('Sound',[['Custom','Custom'],...Object.keys(api.synthPresets).map(n=>[n,n])],api.synthPreset(),name=>api.chooseSynth(name));field.className='';synthQuick.append(field,button('Edit sound',()=>api.edit('synth')));}
  if(lastStation!==s.id){lastStation=s.id;focus();}refresh();
 }
 function refresh(){
  const r=api.recorder,s=api.current();$('music-summary').textContent=api.harmonyName()+' · '+r.bpm+' BPM';
  if($('music-click-volume')){$('music-click').checked=r.metronome;$('music-click-volume').value=Math.round(api.metronomeVolume()*100);$('music-click-level').textContent=$('music-click-volume').value+'%';$('music-click-test').disabled=r.taking;}
  const taking=r.taking,overdub=taking&&r.mode==='overdub';$('quick-overdub').textContent=overdub?(r.state==='countin'?'Overdub · Cancel':'Overdub · Finish'):'Overdub';
  if($('music-tempo')){$('music-tempo').disabled=!!r.events.length||r.state!=='stopped';if(document.activeElement!==$('music-tempo'))$('music-tempo').value=r.bpm;$('tempo-hint').textContent=$('music-tempo').disabled?'To change speed, stop and clear this loop. Undo can restore it.':'A comfortable starting speed is 100 BPM.';}
  if($('music-key')){$('music-key').value=r.harmony;$('music-key').disabled=r.state!=='stopped'||api.previewing();}
  if($('machine-play')){const phase=r.machinePhase(s.type,api.now()),empty=s.type==='bass'&&!api.bass().steps.some(Boolean);$('machine-play').disabled=empty&&!phase.enabled;$('machine-play').textContent=phase.queued?'Cancel start':phase.enabled?'Stop '+s.type:'Play '+s.type;$('machine-status').textContent=phase.queued?'Joining on the next measure…':phase.enabled?'Playing · beat '+(Math.floor(phase.step/4)+1):empty?'Choose a bass line to begin.':'Drums and bass join together on the beat.';}
  if($('play-parts')){const container=$('play-parts'),parts=api.parts(),key=JSON.stringify(parts);if(container.dataset.key!==key){container.dataset.key=key;container.replaceChildren();if(!parts.length){const empty=document.createElement('p');empty.textContent='Record a part to see it here.';container.append(empty);}for(const part of parts){const b=button((part.muted?'Muted · ':'On · ')+part.name,()=>api.mute(part.id));b.classList.toggle('muted',part.muted);b.setAttribute('aria-pressed',String(part.muted));container.append(b);}}const progress=api.progress();$('parts-progress').max=progress.total;$('parts-progress').value=progress.beat;}
 }
 $('choose-instrument').onclick=chooser;$('view-play').onclick=()=>setMode('play');$('view-explore').onclick=()=>setMode('explore');$('app-settings').onclick=settings;$('music-settings').onclick=musicSettings;$('quick-songs').onclick=api.songs;
 $('midi-shortcut').onclick=api.midi;
 $('keys-toggle').onclick=()=>{showKeys=!showKeys;render();api.fit();};
 if(api.renderer){api.renderer.xr.addEventListener('sessionstart',()=>{restore();document.body.classList.add('xr-active');$('panel').close();});api.renderer.xr.addEventListener('sessionend',()=>{document.body.classList.remove('xr-active');focus();render();api.fit();});}
 setMode('explore',false);
 return {get isPlay(){return mode==='play'&&!api.inVR();},select(){focus();render();if(mode==='play'&&!api.inVR())api.fit();},refresh,musicSettings,instruments:chooser,beforeRender(){if(masked)for(const object of visibility.keys())object.visible=false;},explore(){if(mode==='play')setMode('explore',false);},restore};
}
