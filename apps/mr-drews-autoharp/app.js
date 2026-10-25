import {STRINGS,CHORDS,NAMES,noteName,chordAllows,combineChords} from './music.js?v=standard-21-1';
import {AutoharpAudio} from './engine.js?v=standard-21-1';
import {PRESETS,getPreset,savedPreset,PRESET_PREFERENCE_VERSION} from './presets.js?v=dulcimer-default-1';
import {SCENES,CHORD_CENTERS,sceneGeometry,xAtY,nearestSegment,sweepStrings,photoPath} from './scene-math.js?v=spooky-scenes-1';
import {createSceneLayers,prepareSceneLayers} from './scene-layers.js?v=spooky-scenes-1';
import {createScene} from './scene.js?v=spooky-scenes-1';
import {createRecording} from './recording-ui.js?v=auto-strum-1';
import {createAutoStrum} from './auto-strum-ui.js?v=auto-strum-1';
import {getStrumPattern,clampTempo} from './auto-strum.js?v=auto-strum-1';
const $=id=>document.getElementById(id),svgNS='http://www.w3.org/2000/svg';
const audio=new AutoharpAudio();
let geometry=sceneGeometry(),autoStrum=null;
for(const preset of PRESETS){const option=document.createElement('option');option.value=preset.id;option.textContent=preset.name;$('presetSelect').append(option);}
const PLAYING_PREFERENCE_VERSION=3;
const state={autoPattern:'steady',autoTempo:92,mode:'latch',chord:CHORDS.find(c=>c.name==='C'),strength:.65,notes:false,muted:false,held:new Map(),pointers:new Map(),demo:false,demoTimers:[],visualTimers:[],audioPromise:null,intent:0};
const shortcuts=['1','2','3','4','5','6','7','q','w','e','r','t','y','u','a','s','d','f','g','h','j'];
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const glows=[],labels=[],vibrations=[];
let animationFrame=0,toastTimer,previousDemoChord=null;
function element(tag,attrs,parent){const el=document.createElementNS(svgNS,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));parent.append(el);return el;}
geometry.segments.forEach(s=>{
  glows.push(element('path',{d:photoPath(s.note,0,undefined,geometry,s.index),stroke:'#fff7b5','stroke-width':2.2,fill:'none',class:'string-glow'},$('stringGlows')));
  vibrations.push({start:0,velocity:0,y:520});
});
STRINGS.forEach((midi,i)=>{
  const label=element('text',{x:xAtY(i,535),y:540,'text-anchor':'middle',class:'note-label'},$('noteLabels'));label.textContent=NAMES[midi%12];labels.push(label);
});
// Labels are part of each photo layer, so they fade with that room instead of
// exposing the illustration's inaccurate original labels during a transition.
for(const scene of SCENES){
  if(scene.layered)createSceneLayers($(scene.photoId+'Layer'),scene.id);
  const faces=document.createElement('div');faces.className='chord-faces';faces.setAttribute('aria-hidden','true');
  const positions=sceneGeometry(scene.id).chords;
  CHORDS.forEach((chord,i)=>{const face=document.createElement('span'),p=positions[i];face.className='chord-face';face.textContent=chord.name;face.style.left=p.x+'px';face.style.top=p.y+'px';face.style.width=p.width+'px';face.style.height=p.height+'px';faces.append(face);});
  $(scene.photoId+'Layer').append(faces);
}
CHORDS.forEach((chord,i)=>{const b=document.createElement('button');b.type='button';b.dataset.index=i;b.dataset.quality=chord.quality;b.setAttribute('aria-label',`${chord.name} ${chord.quality==='seventh'?'dominant seventh':chord.quality} chord, key ${shortcuts[i].toUpperCase()}`);b.setAttribute('aria-pressed','false');b.title=`${chord.name} — ${shortcuts[i].toUpperCase()}`;b.style.left=CHORD_CENTERS[i].x+'px';b.style.top=CHORD_CENTERS[i].y+'px';b.style.setProperty('--face-width',CHORD_CENTERS[i].width+'px');b.style.setProperty('--face-height',CHORD_CENTERS[i].height+'px');b.innerHTML=`<span class="sr-only">${chord.name}</span>`;const option=document.createElement('option');option.value=i;option.textContent=chord.name;$('chordSelect').append(option);$('chordBoard').append(b);
  b.addEventListener('pointerdown',e=>{if(e.button!==0&&e.pointerType==='mouse')return;returnToInstrument();e.preventDefault();b.setPointerCapture(e.pointerId);stopDemo(false);ensureAudio();pressChord(i,`p${e.pointerId}`);});
  const release=e=>releaseChord(`p${e.pointerId}`);b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);
  b.addEventListener('click',e=>{if(e.detail===0){stopDemo(false);ensureAudio();if(state.mode==='hold'){toast('Hold a chord key and strum, or switch to Latch for click selection.');return;}setChord(chord);}});
});
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3700);}
async function ensureAudio(){
  if(audio.ready){if(audio.ctx.state!=='running')await audio.ctx.resume();return true;}
  if(state.audioPromise)return state.audioPromise;
  $('audioLabel').textContent='Warming up…';$('audioBtn').disabled=true;$('presetSelect').disabled=true;
  state.audioPromise=audio.init((done,total)=>{$('audioLabel').textContent=`Loading strings ${Math.round(done/total*100)}%`;}).then(()=>{
    audio.setChord(state.chord);$('audioBtn').classList.add('ready');$('audioLabel').textContent=state.muted?'Sound off':'Sound on';$('stageHint').textContent='Brush slowly. Strum freely.';updatePresetDescription();return true;
  }).catch(e=>{console.error('Audio initialization:',e);$('audioLabel').textContent='Retry sound';toast(e.message||'Sound could not start. Tap Retry sound.');return false;}).finally(()=>{state.audioPromise=null;$('audioBtn').disabled=false;$('presetSelect').disabled=false;});return state.audioPromise;
}
function setChord(chord){
  state.chord=chord;audio.setChord(chord);
  state.visualTimers=state.visualTimers.filter(pending=>{if(chordAllows(chord,STRINGS[pending.note]))return true;clearTimeout(pending.timer);return false;});
  document.querySelectorAll('#chordBoard button').forEach((b,i)=>{const active=!!chord&&(chord.bars||[chord]).some(bar=>bar.index===i);b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  const name=$('chordName');name.classList.toggle('open',!chord);name.classList.toggle('multiple-bars',!!chord?.bars);
  if(chord){name.replaceChildren(document.createTextNode(chord.bars?.length>2?`${chord.bars.length} bars`:chord.name));const quality=document.createElement('span');quality.textContent=chord.quality==='seventh'?'dominant 7':chord.quality;name.append(quality);$('chordTones').innerHTML=chord.pcs.map(pc=>NAMES[pc]).join(' <span>·</span> ')||'ALL STRINGS DAMPED';}
  else{name.textContent='Open';$('chordTones').textContent='ALL 36 STRINGS';}
  $('modeTag').textContent=chord?(state.mode==='latch'?'LATCHED':'HELD'):'NO DAMPING';
  STRINGS.forEach((m,i)=>{labels[i].style.fill=chordAllows(chord,m)?'#fff1b8':'#ad9c79';});
  geometry.segments.forEach(s=>{if(!chordAllows(chord,STRINGS[s.note])){vibrations[s.index].velocity=0;glows[s.index].style.opacity=0;}});
  $('chordSelect').value=chord?.bars?'held':chord?String(chord.index):'open';
  $('openBtn').setAttribute('aria-pressed',String(!chord));
}
function pressChord(i,id){state.held.delete(id);state.held.set(id,CHORDS[i]);setChord(state.mode==='hold'?combineChords([...state.held.values()]):CHORDS[i]);}
function releaseChord(id){if(!state.held.has(id))return;state.held.delete(id);if(state.mode==='hold')setChord(combineChords([...state.held.values()]));}
function setMode(mode){stopDemo(false);state.mode=mode;state.held.clear();document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('selected',b.dataset.mode===mode);b.setAttribute('aria-pressed',String(b.dataset.mode===mode));});$('modeDescription').textContent=mode==='latch'?'Tap a chord. It stays selected while you strum.':'Hold a chord with one hand. Strum with the other.';setChord(mode==='hold'?null:state.chord?.bars?.at(-1)||state.chord||CHORDS.find(c=>c.name==='C'));saveSettings();}
function animatePluck(i,velocity,y=geometry.barTop-35,segmentIndex=null){for(const s of geometry.byNote[i])if(segmentIndex==null||s.index===segmentIndex)vibrations[s.index]={start:performance.now(),velocity,y};$('noteFeedback').textContent=`${noteName(STRINGS[i])} · ${state.chord?.name||'Open strings'}`;if(!animationFrame)animationFrame=requestAnimationFrame(animateStrings);}
function animateStrings(now){let active=false;vibrations.forEach((v,i)=>{const age=(now-v.start)/1000;if(!v.velocity||age>2){glows[i].style.opacity=0;return;}active=true;const envelope=Math.exp(-age*3.8)*v.velocity,offset=reducedMotion?0:Math.sin(age*99)*envelope*2.1;glows[i].setAttribute('d',photoPath(geometry.segments[i].note,offset,v.y,geometry,i));glows[i].style.opacity=Math.min(.8,envelope*1.2);});animationFrame=active?requestAnimationFrame(animateStrings):0;}
function pick(i,velocity,y=geometry.barTop-35,segmentIndex=null){if(!audio.ready||!chordAllows(state.chord,STRINGS[i]))return;const position=(y-geometry.topY[i])/(geometry.bottom-geometry.topY[i]);if(audio.pluck(i,velocity,position))animatePluck(i,velocity,y,segmentIndex);}
const surface=$('stringSurface');
function point(e){const matrix=$('harp').getScreenCTM();const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());return {x:p.x,y:p.y,t:e.timeStamp};}
surface.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;returnToInstrument();e.preventDefault();stopDemo(false);surface.setPointerCapture(e.pointerId);const p=point(e);state.pointers.set(e.pointerId,{...p,last:-1});
  if(!audio.ready){ensureAudio().then(ok=>{if(ok&&state.pointers.has(e.pointerId)){const current=state.pointers.get(e.pointerId),hit=nearestSegment(current.x,current.y,geometry);if(hit)pick(hit.note,state.strength,current.y,hit.index);}});return;}
  const hit=nearestSegment(p.x,p.y,geometry);if(hit){pick(hit.note,state.strength,p.y,hit.index);state.pointers.get(e.pointerId).last=hit.note;}
});
surface.addEventListener('pointermove',e=>{
  if(!state.pointers.has(e.pointerId))return;e.preventDefault();const samples=e.getCoalescedEvents?.();for(const ev of samples?.length?samples:[e]){
    const prev=state.pointers.get(e.pointerId),p=point(ev),dx=p.x-prev.x;const speed=Math.abs(dx)/Math.max(5,p.t-prev.t);
    const velocity=Math.max(.12,Math.min(1,state.strength*(.6+Math.min(speed,4)*.22)));
    for(const {i,y,segmentIndex} of sweepStrings(prev,p,geometry)){pick(i,velocity,y,segmentIndex);prev.last=i;}
    state.pointers.set(e.pointerId,{...p,last:prev.last});
  }
});
function releasePointer(e){state.pointers.delete(e.pointerId);}surface.addEventListener('pointerup',releasePointer);surface.addEventListener('pointercancel',releasePointer);surface.addEventListener('lostpointercapture',releasePointer);
function performStrum(direction=1,strength=state.strength){if(!audio.ready)return;const list=STRINGS.map((_,i)=>i);if(direction<0)list.reverse();const at=audio.ctx.currentTime+.007;list.forEach((i,n)=>{const delay=n*.0072;if(audio.pluck(i,strength*(.9+.1*Math.sin(i*1.7)),.45,at+delay)){const timer=setTimeout(()=>{animatePluck(i,strength);state.visualTimers=state.visualTimers.filter(x=>x.timer!==timer);},delay*1000);state.visualTimers.push({timer,note:i});}});}
async function strum(direction){stopDemo(false);const intent=state.intent;if(await ensureAudio()&&state.intent===intent)performStrum(direction);}
function dampAll(){autoStrum?.stop();stopDemo(false);state.visualTimers.forEach(({timer})=>clearTimeout(timer));state.visualTimers=[];audio.dampAll();vibrations.forEach((v,i)=>{v.velocity=0;glows[i].style.opacity=0;});$('noteFeedback').textContent='Strings damped';if(!animationFrame)animationFrame=requestAnimationFrame(animateStrings);}
function stopDemo(restore=false){state.intent++;if(!state.demo)return;state.demo=false;state.demoTimers.forEach(clearTimeout);state.demoTimers=[];$('demoIcon').textContent='▷';$('demoLabel').textContent='Hear it play';$('demoBtn').setAttribute('aria-pressed','false');if(restore)setChord(previousDemoChord);}
async function startDemo(){autoStrum?.stop();if(state.demo){stopDemo(true);dampAll();return;}dampAll();const intent=++state.intent;if(!await ensureAudio()||state.intent!==intent)return;state.demo=true;previousDemoChord=state.chord;$('demoIcon').textContent='□';$('demoLabel').textContent='Stop demo';$('demoBtn').setAttribute('aria-pressed','true');
  const progression=['C','Am','F','G','C','Am','G','C'];progression.forEach((name,bar)=>{
    state.demoTimers.push(setTimeout(()=>{if(!state.demo)return;setChord(CHORDS.find(c=>c.name===name));performStrum(1,.57);},bar*1200));
    state.demoTimers.push(setTimeout(()=>{if(state.demo)performStrum(-1,.36);},bar*1200+600));
  });state.demoTimers.push(setTimeout(()=>stopDemo(true),progression.length*1200+700));
}
function saveSettings(){try{localStorage.setItem('drews-autoharp-v1',JSON.stringify({autoPattern:state.autoPattern,autoTempo:state.autoTempo,mode:state.mode,playingPreferenceVersion:PLAYING_PREFERENCE_VERSION,notes:state.notes,strength:state.strength,preset:audio.presetId,presetPreferenceVersion:PRESET_PREFERENCE_VERSION,...audio.settings}));}catch{}}
function updatePresetDescription(){const preset=getPreset(audio.presetId);$('presetSelect').value=audio.presetId;$('presetStatus').textContent=preset.description;}
$('presetSelect').addEventListener('change',async()=>{
  const id=$('presetSelect').value,previous=audio.presetId;if(!getPreset(id)||id===previous)return;
  dampAll();$('presetSelect').disabled=true;$('audioBtn').disabled=true;$('presetStatus').textContent='Loading this sound…';
  const progress=(n,total)=>{$('presetStatus').textContent=`Loading ${getPreset(id).name}… ${Math.round(n/total*100)}%`;};
  try{
    if(!audio.ready){audio.presetId=id;if(!await ensureAudio())throw new Error('This sound could not load. Please try again.');}
    else{await audio.ctx.resume();await audio.selectPreset(id,progress);}
    saveSettings();updatePresetDescription();$('noteFeedback').textContent=getPreset(id).name;
  }catch(e){audio.presetId=previous;$('presetSelect').value=previous;updatePresetDescription();toast(e.message||'The sound could not load. Your previous sound is still selected.');}
  finally{$('presetSelect').disabled=false;$('audioBtn').disabled=false;}
});
function sliderUpdate(id){const val=Number($(id).value)/100;$(id).style.setProperty('--fill',`${val*100}%`);if(id==='strength'){state.strength=val;$('strengthValue').textContent=val<.35?'Soft':val>.8?'Strong':'Natural';}else{audio.setSettings({[id]:val});$(id+'Value').textContent=id==='tone'?(val<.35?'Mellow':val>.72?'Bright':'Warm'):Math.round(val*100)+'%';}saveSettings();}
for(const id of ['volume','tone','reverb','strength'])$(id).addEventListener('input',()=>sliderUpdate(id));
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
$('audioBtn').addEventListener('click',async()=>{if(!audio.ready){await ensureAudio();return;}state.muted=!state.muted;if(state.muted)dampAll();audio.setMuted(state.muted);if(!state.muted)await audio.ctx.resume();$('audioLabel').textContent=state.muted?'Sound off':'Sound on';$('audioBtn').classList.toggle('ready',!state.muted);});
$('downBtn').addEventListener('click',()=>{returnToInstrument();strum(1);});$('upBtn').addEventListener('click',()=>{returnToInstrument();strum(-1);});$('dampBtn').addEventListener('click',()=>{returnToInstrument();dampAll();});$('demoBtn').addEventListener('click',startDemo);
$('chordSelect').addEventListener('change',()=>{const value=$('chordSelect').value;stopDemo(false);state.held.clear();setMode('latch');setChord(value==='open'?null:CHORDS[Number(value)]);});
$('openBtn').addEventListener('click',()=>{stopDemo(false);state.held.clear();setChord(null);});
$('notesBtn').addEventListener('click',()=>{state.notes=!state.notes;$('instrumentWrap').classList.toggle('show-notes',state.notes);$('notesBtn').textContent=state.notes?'Hide notes':'Show notes';$('notesBtn').setAttribute('aria-pressed',String(state.notes));saveSettings();});
function openHelp(){if(!$('helpDialog').open)$('helpDialog').showModal();}['helpBtn','footerHelp','modeHelp'].forEach(id=>$(id).addEventListener('click',openHelp));['closeHelp','startPlaying'].forEach(id=>$(id).addEventListener('click',()=>$('helpDialog').close()));
$('helpDialog').addEventListener('click',e=>{if(e.target===$('helpDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
const optionsTabs=[...document.querySelectorAll('[data-options-tab]')];
function selectOptionsTab(tab,focus=false){
  for(const button of optionsTabs){const selected=button===tab;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;$(button.getAttribute('aria-controls')).hidden=!selected;}
  if(focus)tab.focus({preventScroll:true});
}
for(const [index,tab] of optionsTabs.entries()){
  tab.addEventListener('click',()=>selectOptionsTab(tab));
  tab.addEventListener('keydown',e=>{let target;if(e.key==='ArrowRight')target=(index+1)%optionsTabs.length;else if(e.key==='ArrowLeft')target=(index+optionsTabs.length-1)%optionsTabs.length;else if(e.key==='Home')target=0;else if(e.key==='End')target=optionsTabs.length-1;else return;e.preventDefault();e.stopPropagation();selectOptionsTab(optionsTabs[target],true);});
}
function setOptions(open,moveFocus=true){$('optionsPanel').hidden=!open;$('optionsBtn').setAttribute('aria-expanded',String(open));if(moveFocus)(open?$('closeOptions'):$('scene')).focus({preventScroll:true});}
function returnToInstrument(){setOptions(false);}
$('optionsBtn').addEventListener('click',()=>setOptions($('optionsPanel').hidden));$('closeOptions').addEventListener('click',()=>setOptions(false));
// Dismiss the panel without swallowing the same tap's chord or string action.
document.addEventListener('pointerdown',e=>{if(!$('optionsPanel').hidden&&!$('optionsPanel').contains(e.target)&&!$('optionsBtn').contains(e.target))setOptions(false,false);},true);
for(const id of ['welcomeDialog','helpDialog'])$(id).addEventListener('close',returnToInstrument);
$('fullBtn').hidden=!document.documentElement.requestFullscreen;
$('fullBtn').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Full screen is unavailable in this browser. The instrument still fits your screen.');}});
document.addEventListener('fullscreenchange',()=>{$('fullBtn').setAttribute('aria-label',document.fullscreenElement?'Exit full screen':'Enter full screen');$('fullBtn').setAttribute('aria-pressed',String(!!document.fullscreenElement));});
document.addEventListener('keydown',e=>{if($('welcomeDialog').open||$('helpDialog').open||e.ctrlKey||e.metaKey||e.altKey)return;const key=e.key.toLowerCase();
  // Escape must also work while a menu field has focus.
  if(key==='escape'){e.preventDefault();dampAll();returnToInstrument();return;}
  if(['INPUT','TEXTAREA','SELECT','AUDIO'].includes(e.target.tagName)||e.target.isContentEditable||e.target.closest('#recordResult'))return;
  const index=shortcuts.indexOf(key);
  if(index>=0){e.preventDefault();if(e.repeat)return;stopDemo(false);ensureAudio();pressChord(index,`k${key}`);}
  else if(key===' '||key==='arrowdown'||key==='arrowup'){if(e.target.closest('button')&&!e.target.closest('#chordBoard'))return;e.preventDefault();if(!e.repeat)strum(key==='arrowup'?-1:1);}
  else if(key==='o'){e.preventDefault();stopDemo(false);state.held.clear();setChord(null);}
});
document.addEventListener('keyup',e=>releaseChord(`k${e.key.toLowerCase()}`));
function releaseAll(){state.pointers.clear();state.held.clear();if(state.mode==='hold')setChord(null);}
window.addEventListener('blur',()=>{releaseAll();dampAll();});document.addEventListener('visibilitychange',()=>{if(document.hidden){releaseAll();dampAll();}});
try{const saved=JSON.parse(localStorage.getItem('drews-autoharp-v1')||'null');if(saved){state.autoPattern=getStrumPattern(saved.autoPattern).id;state.autoTempo=clampTempo(saved.autoTempo??92);audio.presetId=savedPreset(saved);for(const id of ['volume','tone','reverb','strength'])if(Number.isFinite(saved[id]))$(id).value=String(Math.max(0,Math.min(1,saved[id]))*100);state.notes=!!saved.notes;$('instrumentWrap').classList.toggle('show-notes',state.notes);$('notesBtn').textContent=state.notes?'Hide notes':'Show notes';$('notesBtn').setAttribute('aria-pressed',String(state.notes));state.mode=saved.playingPreferenceVersion===PLAYING_PREFERENCE_VERSION&&saved.mode==='hold'?'hold':'latch';}}catch{}
updatePresetDescription();
for(const id of ['volume','tone','reverb','strength'])sliderUpdate(id);
setMode(state.mode);

function alignScene(id){
  releaseAll();dampAll();geometry=sceneGeometry(id);
  const dark=!!SCENES.find(scene=>scene.id===id)?.layered;
  for(const label of ['stageHint','noteFeedback'])$(label).classList.toggle('dark-scene',dark);
  $('barMask').setAttribute('y',geometry.barTop);$('barMask').setAttribute('height',geometry.barBottom-geometry.barTop);
  geometry.segments.forEach(s=>glows[s.index].setAttribute('d',photoPath(s.note,0,undefined,geometry,s.index)));
  for(let i=0;i<36;i++){labels[i].setAttribute('x',xAtY(i,geometry.barTop-20,geometry));labels[i].setAttribute('y',geometry.barTop-15);}
  document.querySelectorAll('#chordBoard button').forEach((button,i)=>{const p=geometry.chords[i];button.style.left=p.x+'px';button.style.top=p.y+'px';button.style.setProperty('--face-width',p.width+'px');button.style.setProperty('--face-height',p.height+'px');});
}
createScene({prepare:prepareSceneLayers,onSelect:returnToInstrument,onChange:alignScene,onBlend:(_,weight)=>{$('harp').style.opacity=String(weight);$('chordBoard').style.opacity=String(weight);},onError:toast});
autoStrum=createAutoStrum({audio,state,ensureAudio,stopDemo,dampAll,animatePluck,saveSettings,toast,returnToInstrument,openPanel:()=>{setOptions(true);selectOptionsTab($('strumTab'));}});
createRecording({audio,ensureAudio,returnToInstrument,dampAll,toast,prepareRecording:()=>{if(!autoStrum.isActive())dampAll();}});
function showWelcome(){releaseAll();dampAll();if(!$('welcomeDialog').open)$('welcomeDialog').showModal();}
$('welcomePlay').addEventListener('click',()=>{$('welcomeDialog').close();ensureAudio();});
$('aboutBtn').addEventListener('click',()=>{setOptions(false);showWelcome();});
$('welcomeDialog').showModal();
