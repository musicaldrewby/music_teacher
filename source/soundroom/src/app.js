import {createComposer} from './score-ui.js';
import {createValueEditor} from './value-editor.js';
import {trackColor,createSoundShortcuts} from './usability-model.js';
import {createWorkspaceLayout} from './workspace-layout.js';
import {createWebXR} from './webxr.js';
import {createXRControls,XR_FILE_CONTROLS,XR_GROUPS} from './xr-controls.js';
import {inputAudioTime} from './audio-clock.js';
import {createStudio} from './studio.js';
import INCLUDED_FONTS from './soundfonts.json';
import { WorkletSynthesizer } from 'spessasynth_lib';
import { VoiceLedger, decodeMIDI, clamp } from './performance-engine.js';
import { SynthEffects, delayMilliseconds } from './synth-effects.js';
const $=id=>document.getElementById(id);
const lcdPalettes={green:{ink:'#30440a',baseline:'#68950a'},purple:{ink:'#f5dfff',baseline:'#a96cda'}};
let lcdTheme=document.documentElement.dataset.lcdTheme==='purple'?'purple':'green';
function setLCDTheme(theme){
 lcdTheme=theme==='purple'?'purple':'green';
 document.documentElement.dataset.lcdTheme=lcdTheme;
 document.querySelectorAll('[data-theme-choice]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.themeChoice===lcdTheme)));
 $('lcd-style-name').textContent=lcdTheme==='purple'?'Purple LCD':'Green LCD';
 try{localStorage.setItem('soundroom-lcd-theme',lcdTheme)}catch{}
}
for(const button of document.querySelectorAll('[data-theme-choice]'))button.addEventListener('click',()=>{setLCDTheme(button.dataset.themeChoice);button.blur()});
setLCDTheme(lcdTheme);

const families=['Piano','Chromatic percussion','Organ','Guitar','Bass','Strings','Ensemble','Brass','Reeds','Pipes','Synth lead','Synth pad','Synth effects','Ethnic','Percussive','Sound effects'];
const noteNames=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const keyCodes=['KeyA','KeyW','KeyS','KeyE','KeyD','KeyF','KeyT','KeyG','KeyY','KeyH','KeyU','KeyJ','KeyK','KeyO','KeyL','KeyP','Semicolon'];
const keyLabels=['A','W','S','E','D','F','T','G','Y','H','U','J','K','O','L','P',';'];
const drumNotes={35:'Acoustic kick',36:'Kick',37:'Side stick',38:'Snare',39:'Clap',40:'Electric snare',41:'Low floor tom',42:'Closed hi-hat',43:'High floor tom',44:'Pedal hi-hat',45:'Low tom',46:'Open hi-hat',47:'Low-mid tom',48:'High-mid tom',49:'Crash',50:'High tom',51:'Ride',52:'China cymbal',53:'Ride bell',54:'Tambourine',55:'Splash',56:'Cowbell',57:'Crash 2',58:'Vibraslap',59:'Ride 2',60:'High bongo',61:'Low bongo',62:'Muted conga',63:'Open conga',64:'Low conga',65:'High timbale',66:'Low timbale',67:'High agogo',68:'Low agogo',69:'Cabasa',70:'Maracas',71:'Short whistle',72:'Long whistle',73:'Short guiro',74:'Long guiro',75:'Claves',76:'High woodblock',77:'Low woodblock',78:'Muted cuica',79:'Open cuica',80:'Muted triangle',81:'Open triangle'};
const pads=[36,38,42,46,49,51,37,39,45,48,54,56];
let presets=[], selected, filtered=[], filter='all',base=48,keyCount=37;
let valueEditor=null;let shortcutStorage;try{shortcutStorage=localStorage}catch{}
const soundShortcuts=createSoundShortcuts(shortcutStorage);
const workspaceUI=createWorkspaceLayout();let patternKeyboard=false,effectPage='reverb',effectDetail='main',shapePage='tone',presetPage='recall';
let lcdPage='sounds',patchBrowserOpen=false,patchSearchOpen=false,patchPage=0,partIndex=0,partName='Track 1';
let lcdMeasuredWidth=0,lcdSizeQueued=false,lastPageSize=null;
const lcdWidth=()=>$('patch-screen').getBoundingClientRect().width||Math.max(260,window.innerWidth-64);
const patchesPerPage=()=>(lcdWidth()<600?1:2)*(compactLayout?2:3);
let studio=null,composer=null,workletNode=null,vr=null;
let audio, synth, gain, analyser, ready=false, initPromise=null;
let sustainEnabled=false, spaceSustain=false, xrSustain=false, demoTimers=[], demoToken=0, demoMode=null;
const owners=new Map(), keyboardNotes=new Map(), pointerNotes=new Map(), midiPedals=new Set();
let performanceView=false;
let effects, reverbEnabled=true, delayEnabled=false;
let actionGeneration=0;
let midiAccess=null, midiPort='all', midiChannel='all', midiConnecting=false;
const channels=Array.from({length:16},(_,i)=>i); // 0–7 live input, 8–15 sequence playback.
let capturedMessages=null;
function sendLiveMIDI(message){
 if(capturedMessages){capturedMessages.push(message);return}
 if(!synth)return;const [status,a,b]=message,ch=status&15;
 switch(status&0xf0){case 0x90:synth.noteOn(ch,a,b);break;case 0x80:synth.noteOff(ch,a);break;case 0xb0:synth.controllerChange(ch,a,b);break;case 0xe0:synth.pitchWheel(ch,a|(b<<7));break;case 0xd0:synth.channelPressure(ch,a);break}
}
const voices=new VoiceLedger((ch,n,v)=>sendLiveMIDI([0x90+ch,n,v]),(ch,n)=>sendLiveMIDI([0x80+ch,n,0]));
const catalogSort=(a,b)=>(Number(a.isDrum)-Number(b.isDrum))||(a.program-b.program)||(a.bankMSB-b.bankMSB)||(a.bankLSB-b.bankLSB)||(Number(b.isGMGSDrum)-Number(a.isGMGSDrum));
const normalize=p=>({...p,name:p.name.split('\0')[0].trim()||'Unnamed patch'});
const patchID=p=>[p.isGMGSDrum?1:0,p.bankMSB,p.bankLSB,p.program].join(':');
const group=p=>p.isDrum?'Drum kits':families[Math.floor(p.program/8)];
const isGM=p=>!p.isDrum&&p.bankMSB===0&&p.bankLSB===0;
const noteName=n=>noteNames[n%12]+(Math.floor(n/12)-1);
const includedFont=INCLUDED_FONTS.find(font=>font.id==='generaluser');
const currentSoundFont={...includedFont,presets:includedFont.presets.map(normalize).sort(catalogSort)},bankDownloads=new Map();
presets=currentSoundFont.presets;selected=presets.find(isGM)||presets[0];
const shape={octave:0,tune:0,attack:64,release:64,brightness:64};
for(const f of [...families,'Drum kits']) {const o=document.createElement('option');o.value=f;o.textContent=f;$('family').append(o)}
function renderPatchScreen(){
 for(const key of ['sounds','performance','shape','effects'])$('lcd-'+key+'-page').hidden=lcdPage!==key;
 for(const key of ['reverb','delay'])$('lcd-'+key+'-page').hidden=effectPage!==key;
 document.querySelectorAll('[data-effect-page]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.effectPage===effectPage)));
 document.querySelectorAll('[data-lcd-page]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lcdPage===lcdPage)));
 $('lcd-effects-tools').hidden=lcdPage!=='effects';
 $('lcd-home').hidden=patchBrowserOpen;$('lcd-browser').hidden=!patchBrowserOpen;$('lcd-done').hidden=!patchBrowserOpen;
 $('lcd-search-panel').hidden=!patchBrowserOpen||!patchSearchOpen;
 for(const id of ['patchlist','lcd-browser-status','lcd-pagination'])$(id).hidden=patchSearchOpen;
 $('lcd-category').value=filter;
 for(const page of ['tone','pitch'])$('shape-'+page+'-controls').hidden=shapePage!==page;
 for(const page of ['recall','save','manage'])$('preset-'+page+'-page').hidden=presetPage!==page;
 for(const effect of ['reverb','delay'])for(const detail of ['main','tone'])$(effect+'-'+detail+'-controls').hidden=effectDetail!==detail;
 for(const [attr,current] of [['shape-page',shapePage],['preset-page',presetPage],['effect-detail',effectDetail]])document.querySelectorAll('[data-'+attr+']').forEach(b=>b.setAttribute('aria-pressed',String(b.getAttribute('data-'+attr)===current)));
 $('patch-screen').classList.toggle('browsing',patchBrowserOpen);$('patchname').setAttribute('aria-expanded',String(patchBrowserOpen));
 $('lcd-search-toggle').setAttribute('aria-expanded',String(patchBrowserOpen&&patchSearchOpen));
 $('lcd-search-toggle').textContent=patchSearchOpen?'Results':$('search').value||$('family').value!=='all'?'Search •':'Search';
 document.querySelectorAll('[data-filter]').forEach(b=>{const active=patchBrowserOpen&&b.dataset.filter===filter;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
}
// CSS gives every page the same height. Measure only the real screen width
// to choose fitting patch pages; navigation never resizes the instrument.
function measureLCDSize(){
 const screen=$('patch-screen'),width=lcdWidth(),size=patchesPerPage();
 if(Math.abs(width-lcdMeasuredWidth)<.5&&size===lastPageSize)return;
 const first=patchPage*(lastPageSize||size);screen.dataset.narrow=String(width<600);screen.dataset.categoryPicker=String(width<860);
 screen.style.setProperty('--lcd-patch-columns',width<600?'1':'2');screen.style.setProperty('--lcd-patch-rows',compactLayout?'2':'3');lcdMeasuredWidth=width;
 if(size!==lastPageSize){lastPageSize=size;patchPage=Math.floor(first/size);renderList()}
}
function requestLCDSize(){
 if(lcdSizeQueued)return;lcdSizeQueued=true;
 requestAnimationFrame(()=>{lcdSizeQueued=false;measureLCDSize()});
}
let compactLayout=false;
try{compactLayout=localStorage.getItem('soundroom-compact-layout')==='true'}catch{}
function setCompactLayout(on){
 compactLayout=!!on;document.documentElement.dataset.layout=on?'compact':'standard';$('compact-layout').setAttribute('aria-pressed',String(compactLayout));
 try{localStorage.setItem('soundroom-compact-layout',String(compactLayout))}catch{}
 lcdMeasuredWidth=0;measureLCDSize();$('patch-screen').scrollTop=0;
}
$('compact-layout').onclick=()=>{setCompactLayout(!compactLayout);$('compact-layout').blur()};
function initialiseLCDSize(){
 measureLCDSize();
 document.fonts?.ready.then(()=>{lcdMeasuredWidth=0;requestLCDSize()});
 if(typeof ResizeObserver==='function')new ResizeObserver(requestLCDSize).observe($('patch-screen'));
}
function setLCDPage(page){if(page==='midi'){workspaceUI.setSettings('midi');workspaceUI.open('settings');renderMIDITiming();return}if(['reverb','delay'].includes(page)){if(effectPage!==page)effectDetail='main';effectPage=page;page='effects'}if(!['sounds','performance','shape','effects'].includes(page))return;lcdPage=page;renderPatchScreen();$('patch-screen').scrollTop=0}
function closeProjectMenu(restoreFocus=false){
 const menu=$('project-menu');if(!menu.open)return;menu.open=false;
 if(restoreFocus)$('project-menu-toggle').focus({preventScroll:true});
}
function arrangeWorkspace(view){
 composer?.setVisible(view==='compose');
 if(view!=='perform')setPerformance(false);
 const station=$('play-station'),content=$('workspace-content');if(view==='perform'){station.append($('scene-panel'));content.insertBefore(station,$('song-panel'))}else{content.insertBefore($('scene-panel'),$('sequence-panel'));content.insertBefore(station,$('workstation-footer'))}station.hidden=view!=='perform'&&!(view==='sequence'&&patternKeyboard);
 $('scene-panel').hidden=!['perform','sequence'].includes(view);$('workspace-content').scrollTop=0;workspaceUI.close(false);
 $(view==='mixer'?'mixer-master-controls':'performance-settings').append($('master-volume-control'));
 closeProjectMenu();
}
function openPatchBrowser(category=filter){
 const changed=category!==filter;filter=category;patchBrowserOpen=true;patchSearchOpen=false;lcdPage='sounds';
 if(changed){$('search').value='';$('family').value='all';patchPage=0}
 renderList({revealSelected:!changed});
}
function renderList({revealSelected=false,resetPage=false}={}){
 const term=$('search').value.trim().toLowerCase(),family=$('family').value;
 filtered=soundShortcuts.list(presets,filter).filter(p=>(['all','favorites','recent'].includes(filter)||filter==='gm'&&isGM(p)||filter==='gs'&&!p.isDrum&&!isGM(p)||filter==='drums'&&p.isDrum)&&(family==='all'||group(p)===family)&&(!term||[p.name,group(p),p.program+1,p.bankMSB].join(' ').toLowerCase().includes(term)));
 const size=patchesPerPage(),pages=Math.max(1,Math.ceil(filtered.length/size)),selectedIndex=filtered.findIndex(p=>patchID(p)===patchID(selected));
 if(resetPage)patchPage=0;else if(revealSelected&&selectedIndex>=0)patchPage=Math.floor(selectedIndex/size);patchPage=clamp(patchPage,0,pages-1);
 $('lcd-page-number').textContent='Page '+(patchPage+1)+' / '+pages;$('lcd-page-prev').disabled=patchPage===0;$('lcd-page-next').disabled=patchPage>=pages-1;
 $('resultcount').textContent=filtered.length+' sounds'+(term||family!=='all'?' · filtered':'');$('patchlist').replaceChildren();renderPatchScreen();
 $('lcd-search-result').textContent=filtered.length+' matching sounds';
 if(!filtered.length){const empty=document.createElement('div');empty.className='empty';empty.textContent=filter==='favorites'?'Star a sound to keep it here.':filter==='recent'?'Sounds you choose will appear here.':'No matching sounds. Clear Search or choose another category.';$('patchlist').append(empty);return}
 const frag=document.createDocumentFragment();
 for(const p of filtered.slice(patchPage*size,(patchPage+1)*size)){const b=document.createElement('button');b.className='patch'+(patchID(p)===patchID(selected)?' selected':'');b.dataset.patch=patchID(p);b.setAttribute('aria-pressed',String(patchID(p)===patchID(selected)));b.title=p.name;const num=document.createElement('span');num.className='num';num.textContent=String(p.program+1).padStart(3,'0');const text=document.createElement('span'),name=document.createElement('div'),meta=document.createElement('div');name.className='pname';name.textContent=p.name;meta.className='pmeta';meta.textContent=p.isGMGSDrum?'Drum kit · GM/GS':`Bank ${p.bankMSB}${p.bankLSB?' / '+p.bankLSB:''} · ${group(p)}`;text.append(name,meta);b.append(num,text);if(patchID(p)===patchID(selected)){const dot=document.createElement('span');dot.className='dot';dot.textContent='●';b.append(dot)}b.onclick=()=>{selectPatch(p);$('patchlist').querySelector('.selected')?.focus({preventScroll:true})};const row=document.createElement('div');row.className='patch-item';const star=document.createElement('button');star.className='patch-favorite';star.dataset.favorite=patchID(p);star.textContent=soundShortcuts.favorite(p)?'★':'☆';star.setAttribute('aria-pressed',String(soundShortcuts.favorite(p)));star.setAttribute('aria-label',(soundShortcuts.favorite(p)?'Remove favorite: ':'Favorite: ')+p.name);star.onclick=()=>{soundShortcuts.toggle(p);renderList();renderFavorite();const focus=document.querySelector?.('[data-favorite="'+patchID(p)+'"]');(focus||$('patchlist').querySelector('button'))?.focus({preventScroll:true})};row.append(b,star);frag.append(row)}
 $('patchlist').append(frag);
}
function renderFavorite(){const on=soundShortcuts.favorite(selected);$('patch-favorite-current').textContent=on?'★ Favorite':'☆ Favorite';$('patch-favorite-current').setAttribute('aria-pressed',String(on))}
$('patch-favorite-current').onclick=()=>{soundShortcuts.toggle(selected);renderFavorite();renderList()};
function renderSelection(){
 renderFavorite();$('soundroom-instrument').style.setProperty('--track-color',trackColor(partIndex));
 $('lcd-mode').textContent='Part '+(partIndex+1)+' / '+partName;$('browser-part').textContent='Part '+(partIndex+1);$('lcd-current').textContent='Loaded · '+selected.name;
 $('lcd-shape-part').textContent='Part '+(partIndex+1)+' · '+selected.name;
 $('patchname').textContent=selected.name;$('patchfamily').textContent=group(selected);
 $('programtag').textContent='Program '+String(selected.program+1).padStart(3,'0');$('banktag').textContent=selected.isGMGSDrum?'GM/GS drum bank':`Bank ${selected.bankMSB}${selected.bankLSB?' / '+selected.bankLSB:''}`;$('typetag').textContent=selected.isDrum?'Percussion':isGM(selected)?'General MIDI':'Bank variation';
 $('demo-scale').textContent=selected.isDrum?'▷ Kit sweep':'▷ Scale';$('demo-chord').textContent=selected.isDrum?'▷ Backbeat':'▷ Chords';$('demo-phrase').textContent=selected.isDrum?'▷ Groove':'▷ Phrase';
 $('keyboardtitle').textContent=selected.isDrum?'Play percussion on the keys':'Play the keyboard';$('drumpads').hidden=!selected.isDrum;
 $('lastnote').textContent='—';$('notedetail').textContent='Play a note';
 renderShape();
}
function applyPatch(){
 if(!ready)return;
 if(studio){studio.applyAllTracks();return}
 for(const ch of channels){
  synth.midiChannels[ch].setDrums(selected.isGMGSDrum);
  synth.controllerChange(ch,0,selected.bankMSB);synth.controllerChange(ch,32,selected.bankLSB);synth.programChange(ch,selected.program);
  synth.controllerChange(ch,7,100);synth.controllerChange(ch,11,127);synth.controllerChange(ch,10,64);synth.pitchWheelRange(ch,2);
 }
 applyShape();applyEffects();sustain();
}
function selectPatch(p){
 const oldMode=demoMode,changedType=p.isDrum!==selected.isDrum;
 panic();selected=p;soundShortcuts.used(p);studio?.setPatch(p);if(changedType){base=p.isDrum?36:48}
 applyPatch();renderSelection();renderList({revealSelected:true});renderKeyboard();
 if(oldMode&&ready)playDemo(oldMode);
}
function renderShape(){
 for(const name of ['octave','tune','attack','release','brightness']){
  $('shape-'+name).value=shape[name];
  $('shape-'+name+'-value').textContent=name==='octave'?(shape[name]>0?'+':'')+shape[name]+' oct':name==='tune'?(shape[name]>0?'+':'')+shape[name]+' ct':shape[name]===64?'Default':(shape[name]>64?'+':'')+(shape[name]-64);
 }
}
function applyShape(){
 if(studio){studio.setShape(shape);return}
 if(!ready)return;
 for(const ch of channels){
  synth.midiChannels[ch].setSystemParameter('gain',.9);
  synth.midiChannels[ch].setSystemParameter('fineTune',shape.tune);
  synth.controllerChange(ch,73,shape.attack);synth.controllerChange(ch,72,shape.release);synth.controllerChange(ch,74,shape.brightness);
 }
}
function maxBase(){return Math.floor((128-keyCount)/12)*12}
function renderKeyboard(){
 const board=$('keyboard');board.replaceChildren();const whiteCount=(keyCount-1)/12*7+1,w=100/whiteCount;let white=0;
 board.style.setProperty('--keyboard-max-width',whiteCount*48+'px');
 for(let n=base;n<base+keyCount;n++){const black=[1,3,6,8,10].includes(n%12),b=document.createElement('button');b.type='button';b.className='key '+(black?'black':'white')+(n%12===0?' c-key':'');b.dataset.note=n;b.tabIndex=-1;b.setAttribute('aria-label',noteName(n)+(selected.isDrum&&drumNotes[n]?' · '+drumNotes[n]:''));b.style.left=(black?(white-.31)*w:white*w)+'%';b.style.width=(black?.62*w:w)+'%';if(!black)white++;
  const binding=document.createElement('span');binding.className='binding';binding.textContent=keyLabels[n-base]||'';const label=document.createElement('span');label.className='notelabel';label.textContent=noteName(n);b.append(binding,label);b.title=selected.isDrum?(drumNotes[n]||noteName(n)):noteName(n);board.append(b)
 }
 $('keyrange').textContent=noteName(base)+' – '+noteName(base+keyCount-1);$('octdown').disabled=base<=12;$('octup').disabled=base>=maxBase();
}
function drawPads(){for(const n of pads){const b=document.createElement('button');b.className='pad';b.dataset.note=n;b.tabIndex=-1;const title=document.createElement('b');title.textContent=drumNotes[n];const detail=document.createElement('small');detail.textContent=noteName(n)+' · '+n;b.append(title,detail);$('drumpads').append(b)}}
function setStatus(title,detail,error=false){$('status').textContent=title;$('statusdetail').textContent=detail;$('statusdetail').classList.toggle('error',error)}
async function loadSoundFont(font){
 if(!bankDownloads.has(font.id)){
  const download=(async()=>{
   let received=0;
   const parts=await Promise.all(font.chunks.map(async url=>{
    const response=await fetch(url,{cache:'force-cache'});
    if(!response.ok)throw new Error('The sound bank could not be downloaded. Please try again.');
    const bytes=new Uint8Array(await response.arrayBuffer());received+=bytes.length;
    setStatus('Opening '+font.name+'…', (received/1048576).toFixed(1)+' MB of samples loaded.');return bytes;
   }));
   const result=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;
   for(const part of parts){result.set(part,offset);offset+=part.length}
   return result.buffer;
  })().catch(e=>{bankDownloads.delete(font.id);throw e});
  bankDownloads.set(font.id,download);
 }
 // Worklet transfers detach buffers, so the cached original must never be sent.
 return (await bankDownloads.get(font.id)).slice(0);
}
async function ensureAudio(){
 if(ready){try{await audio.resume();return true}catch(e){setStatus('Sound is paused',e.message,true);return false}}
 if(initPromise)return initPromise;
 $('enable').disabled=true;$('enable').textContent='Loading…';setStatus('Opening your sound bank…','Loading your instrument samples. Please wait a moment.');
 initPromise=(async()=>{try{
  const Audio=window.AudioContext||window.webkitAudioContext;audio=new Audio({latencyHint:'interactive'});await audio.resume();
  if(!audio.audioWorklet)throw new Error('This browser does not support the audio engine. Please try an updated browser.');
  await audio.audioWorklet.addModule('./assets/soundroom-processor.js?v=33');
  synth=new WorkletSynthesizer(audio,{audioNodeCreators:{worklet:(context,name,options)=>{workletNode=new AudioWorkletNode(context,'soundroom-worklet',options);return workletNode}}});
  if(workletNode){const engineMessage=workletNode.port.onmessage;workletNode.port.onmessage=event=>{if(event.data.type?.startsWith('composition-'))composer?.receive(event.data);else if(event.data.type?.startsWith('soundroom-'))studio?.receive(event.data);else engineMessage?.call(workletNode.port,event)}}synth.setLogLevel(false,false,false);gain=audio.createGain();gain.gain.value=+$('volume').value/100;analyser=audio.createAnalyser();analyser.fftSize=2048;
  synth.connect(gain);gain.connect(analyser);analyser.connect(audio.destination);
  await synth.isReady;await synth.soundBankManager.addSoundBank(await loadSoundFont(currentSoundFont),currentSoundFont.id);
  synth.setSystemParameter('voiceCap',128);synth.setSystemParameter('chorusGain',0);synth.setSystemParameter('delayGain',0);
  ready=true;effects=new SynthEffects(synth,[]);studio?.attachAudio();applyPatch();applyEffects();$('startbar').classList.add('ready');setStatus('Sound is ready.','Choose a patch, play the keys, or try a demo.');vr?.refresh();
  return true;
 }catch(e){ready=false;try{synth?.destroy();await audio?.close()}catch{}synth=null;setStatus('Could not start the sound engine',e.message,true);$('enable').disabled=false;$('enable').textContent='Try again';return false}
 finally{initPromise=null}})();return initPromise;
}
function effectSettings(){return {
 reverbEnabled,delayEnabled,reverbMix:+$('reverb').value,reverbType:+$('reverb-type').value,reverbDecay:+$('reverb-decay').value,
 reverbDamping:+$('reverb-damping').value,reverbPredelay:+$('reverb-predelay').value,
 delayMix:+$('delay').value,delayTime:+$('delay-time').value,delayFeedback:+$('delay-feedback').value,
 delayDamping:+$('delay-damping').value,delayStereo:$('delay-mode').value==='stereo'
}}
function applyEffects(){if(ready){effects.apply(effectSettings());studio?.applyMixer()}renderEffects()}
function renderEffects(){
 for(const name of ['reverb','delay']){
  const on=name==='reverb'?reverbEnabled:delayEnabled;
  $(name+'-toggle').setAttribute('aria-pressed',String(on));$(name+'-toggle').textContent=on?'On':'Off';
  $(name+'value').textContent=$(name).value+'%';
 }
 $('reverb-decay-value').textContent=$('reverb-decay').value;
 $('reverb-damping-value').textContent=$('reverb-damping').value+'/7';
 $('reverb-predelay-value').textContent=$('reverb-predelay').value+' ms';
 $('delay-time-value').textContent=Math.round(delayMilliseconds(+$('delay-time').value))+' ms';
 $('delay-feedback-value').textContent=$('delay-feedback').value+'%';$('delay-damping-value').textContent=$('delay-damping').value+'/7';
}
function highlight(n,on){document.querySelectorAll('[data-note="'+n+'"]').forEach(k=>k.classList.toggle('playing',on))}
function eventAudioTime(timestamp){return inputAudioTime(audio,timestamp,performance.now())}
// Capture the sound that is monitored, using the same audio-thread command
// for playback and its recording timestamp. External monitoring keeps the
// original MIDI timestamp mapped to the click reaching the listener.
function captureLive(method,args,time,play,monitored,adjustment=0){
 if(studio?.recording&&monitored&&workletNode){
  const messages=[];capturedMessages=messages;
  try{play()}finally{capturedMessages=null}
  studio.recordLive(method,args,messages,adjustment);
 }else{
  play();const api={noteOn:'recordOn',noteOff:'recordOff',controller:'recordController'}[method];studio?.[api](...args,time);
 }
}
function noteOn(n,owner,velocity=+$('velocity').value,time=eventAudioTime(),adjustment=0){
 if(!ready||!Number.isInteger(n)||n<0||n>127)return;release(owner,time,adjustment);
 const inputShape=studio?.inputShape()||shape,note=n+inputShape.octave*12;if(note<0||note>127)return;
 const channel=studio?.inputTrack??0,monitored=!studio||studio.monitor();
 owners.set(owner,{note:n,soundNote:note,velocity,channel,monitored,adjustment});
 captureLive('noteOn',[owner,note,velocity],time,()=>{if(monitored)voices.press(owner,channel,note,velocity)},monitored,adjustment);
 highlight(n,true);$('lastnote').textContent=noteName(n);$('notedetail').textContent='Velocity '+velocity;
}
function release(owner,time=eventAudioTime(),adjustment){
 const held=owners.get(owner);if(!held)return;owners.delete(owner);
 captureLive('noteOff',[owner],time,()=>voices.release(owner),held.monitored,adjustment??held.adjustment);
 if(![...owners.values()].some(x=>x.note===held.note))highlight(held.note,false);
}
function liveController(event,time=eventAudioTime(),adjustment=0){
 if(!ready)return;const channel=studio?.inputTrack??0;
 const message=event.type==='bend'?[0xe0+channel,event.value&127,event.value>>7]:event.type==='pressure'?[0xd0+channel,event.value]:[0xb0+channel,event.controller,event.value];
 captureLive('controller',[event],time,()=>sendLiveMIDI(message),!studio||studio.monitor(),adjustment);
}
function sustain(time=eventAudioTime(),adjustment=0){const on=sustainEnabled||spaceSustain||xrSustain||midiPedals.size>0;liveController({type:'cc',controller:64,value:on?127:0},time,adjustment);$('sustain').setAttribute('aria-pressed',String(on));$('sustain').textContent='Sustain '+(on?'on':'off')}
function stopDemo(){demoToken++;demoTimers.forEach(clearTimeout);demoTimers=[];demoMode=null;document.querySelectorAll('.audition .active').forEach(b=>b.classList.remove('active'));for(const k of [...owners.keys()])if(k.startsWith('demo:'))release(k)}
function clearLive(){actionGeneration++;stopDemo();for(const owner of [...owners.keys()])release(owner);voices.clear();keyboardNotes.clear();pointerNotes.clear();midiPedals.clear();sustainEnabled=false;spaceSustain=false;xrSustain=false;sustain();if(ready){for(let ch=0;ch<8;ch++){synth.controllerChange(ch,120,0);synth.controllerChange(ch,64,0);synth.pitchWheel(ch,8192);synth.controllerChange(ch,1,0);synth.controllerChange(ch,11,127);synth.channelPressure(ch,0)}}document.querySelectorAll('.playing').forEach(k=>k.classList.remove('playing'))}
function panic(){composer?.stop();studio?.stop(false);clearLive();if(ready)synth.stopAll(true)}
function transpose(delta){panic();base=clamp(base+delta,12,maxBase());renderKeyboard()}
async function playDemo(mode){
 if(demoMode===mode){panic();return}const request=actionGeneration;if(!await ensureAudio()||request!==actionGeneration)return;panic();demoMode=mode;$('demo-'+mode).classList.add('active');const token=demoToken,events=[],v=+$('velocity').value,root=base+12;
 const add=(t,n,d,scale=1)=>events.push({t,n,d,v:Math.max(1,Math.min(127,Math.round(v*scale)))});
 if(selected.isDrum){
  if(mode==='scale')pads.forEach((n,i)=>add(i*.32,n,.15));
  else {const step=mode==='phrase'?.23:.3,count=mode==='phrase'?32:16;for(let i=0;i<count;i++){add(i*step,i%8===7?46:42,.08,i%2?.65:.85);if(i%8===0||i%8===4||(mode==='phrase'&&i%8===3))add(i*step,36,.14);if(i%8===2||i%8===6)add(i*step,38,.12,.95);if(mode==='phrase'&&i>=28)add(i*step,[48,47,45,43][i-28],.16,.9)}}
 } else if(mode==='scale'){[0,2,4,5,7,9,11,12,11,9,7,5,4,2,0].forEach((x,i)=>add(i*.23,root+x,.2,.85+(i%4)*.05))}
 else if(mode==='chord'){[[0,4,7,11],[0,4,5,9],[-1,2,5,9],[0,4,7,12]].forEach((c,i)=>c.forEach((n,j)=>add(i*1.35+j*.012,root+n,1.15,.8+j*.04)))}
 else {const melody=[0,4,7,11,9,7,4,2,0,5,9,12,11,9,7,4,2,5,9,11,12,11,7,2,0,4,7,12];melody.forEach((n,i)=>add(i*.23,root+n,i===melody.length-1?1.3:.24,.72+(i%4)*.07));[0,5,7,0].forEach((n,i)=>add(i*1.84,root-12+n,1.5,.62))}
 for(const [i,e] of events.entries()){const owner='demo:'+i;demoTimers.push(setTimeout(()=>{if(demoToken===token)noteOn(e.n,owner,e.v)},e.t*1000));demoTimers.push(setTimeout(()=>{if(demoToken===token)release(owner)},(e.t+e.d)*1000))}
 const end=Math.max(...events.map(e=>e.t+e.d));demoTimers.push(setTimeout(()=>{if(demoToken===token)stopDemo()},(end+.15)*1000));
}
function pointerTarget(e){const el=document.elementFromPoint(e.clientX,e.clientY);return el?.closest('.key,.pad')}
for(const el of [$('keyboard'),$('drumpads')]){
 el.addEventListener('pointerdown',async e=>{const target=e.target.closest('[data-note]');if(!target||e.button>0)return;e.preventDefault();document.activeElement?.blur();const n=+target.dataset.note;pointerNotes.set(e.pointerId,n);el.setPointerCapture(e.pointerId);if(await ensureAudio()&&pointerNotes.has(e.pointerId))noteOn(pointerNotes.get(e.pointerId),'ptr:'+e.pointerId,undefined,eventAudioTime(e.timeStamp))});
 el.addEventListener('pointermove',e=>{if(!pointerNotes.has(e.pointerId))return;const target=pointerTarget(e),n=target?+target.dataset.note:null;if(n===pointerNotes.get(e.pointerId))return;release('ptr:'+e.pointerId,eventAudioTime(e.timeStamp));pointerNotes.set(e.pointerId,n);if(n!==null)noteOn(n,'ptr:'+e.pointerId,undefined,eventAudioTime(e.timeStamp))});
 el.addEventListener('lostpointercapture',e=>{release('ptr:'+e.pointerId,eventAudioTime(e.timeStamp));pointerNotes.delete(e.pointerId)});
}
for(const type of ['pointerup','pointercancel'])window.addEventListener(type,e=>{release('ptr:'+e.pointerId,eventAudioTime(e.timeStamp));pointerNotes.delete(e.pointerId)});
const editing=e=>$('lcd-help-dialog').open||valueEditor?.active||e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement||e.target instanceof HTMLTextAreaElement||e.target.isContentEditable||e.target.closest?.('summary')||$('help').open||$('project-menu').open;
window.addEventListener('keydown',async e=>{if(e.code==='Escape'){if($('lcd-help-dialog').open){$('lcd-help-dialog').close();$('lcd-help').focus({preventScroll:true});e.preventDefault();return}if(valueEditor?.active){valueEditor.close();e.preventDefault();return}if(workspaceUI.close()){e.preventDefault();return}panic();closeProjectMenu(true);return}if(editing(e)||e.defaultPrevented||e.isComposing||e.ctrlKey||e.metaKey||e.altKey||document.body.dataset.workspace==='compose')return;if(e.code==='Space'){if(e.target instanceof HTMLButtonElement)return;e.preventDefault();spaceSustain=true;sustain(eventAudioTime(e.timeStamp));return}if(e.repeat)return;const sceneKey=!e.shiftKey&&(e.key?/^([1-8])$/.exec(e.key):/^(?:Digit|Numpad)([1-8])$/.exec(e.code));if(sceneKey){e.preventDefault();studio?.chooseScene(+sceneKey[1]-1);return}if(e.code==='KeyZ'){transpose(-12);return}if(e.code==='KeyX'){transpose(12);return}const idx=keyCodes.indexOf(e.code);if(idx<0)return;e.preventDefault();const n=base+idx;keyboardNotes.set(e.code,n);if(await ensureAudio()&&keyboardNotes.has(e.code))noteOn(n,'key:'+e.code,undefined,eventAudioTime(e.timeStamp))});
window.addEventListener('keyup',e=>{if(e.code==='Space'){spaceSustain=false;sustain(eventAudioTime(e.timeStamp))}if(keyboardNotes.has(e.code)){release('key:'+e.code,eventAudioTime(e.timeStamp));keyboardNotes.delete(e.code)}});
window.addEventListener('blur',()=>{if(!vr?.active)panic()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&!vr?.active)panic()});
$('enable').onclick=async()=>{await ensureAudio();$('enable').blur()};$('search').oninput=()=>renderList({resetPage:true});$('family').onchange=()=>renderList({resetPage:true});
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>openPatchBrowser(b.dataset.filter));
document.querySelectorAll('[data-lcd-page]').forEach(b=>b.onclick=()=>setLCDPage(b.dataset.lcdPage));
document.querySelectorAll('[data-effect-page]').forEach(b=>b.onclick=()=>setLCDPage(b.dataset.effectPage));
$('lcd-category').onchange=()=>openPatchBrowser($('lcd-category').value);
for(const attr of ['shape-page','preset-page','effect-detail'])document.querySelectorAll('[data-'+attr+']').forEach(b=>b.onclick=()=>{const value=b.getAttribute('data-'+attr);if(attr==='shape-page')shapePage=value;else if(attr==='preset-page')presetPage=value;else effectDetail=value;renderPatchScreen()});
$('lcd-help').onclick=()=>$('lcd-help-dialog').showModal();$('lcd-help-close').onclick=()=>{$('lcd-help-dialog').close();$('lcd-help').focus({preventScroll:true})};
$('lcd-show-results').onclick=()=>{patchSearchOpen=false;renderPatchScreen();($('patchlist').querySelector('.selected')||$('patchlist').querySelector('button')||$('lcd-search-toggle')).focus({preventScroll:true})};
$('pattern-keyboard-toggle').onclick=()=>{patternKeyboard=!patternKeyboard;$('play-station').hidden=!patternKeyboard;$('pattern-keyboard-toggle').setAttribute('aria-expanded',String(patternKeyboard));$('pattern-keyboard-toggle').textContent=patternKeyboard?'Hide keyboard':'Show keyboard';if(patternKeyboard)$('play-keyboard').scrollIntoView({block:'nearest'})};
document.querySelectorAll('[data-open-lcd]').forEach(b=>b.onclick=()=>{studio?.setView('perform');setLCDPage(b.dataset.openLcd);$('soundroom-instrument').scrollIntoView({block:'start'});$('lcd-tab-'+(['reverb','delay'].includes(b.dataset.openLcd)?'effects':b.dataset.openLcd)).focus({preventScroll:true})});
$('seq-export').onclick=()=>{closeProjectMenu();workspaceUI.open('export',$('project-menu-toggle'));$('export-source').value=document.body.dataset.workspace==='song'?'arrangement':'tracks';$('export-heading').focus({preventScroll:true})};
$('project-save').onclick=()=>$('seq-save').click();
$('project-menu').addEventListener('click',e=>{if(e.target.closest('button'))closeProjectMenu($('project-menu').contains(document.activeElement))});
document.addEventListener('click',e=>{if(!$('project-menu').contains(e.target))closeProjectMenu()});
$('patchname').onclick=()=>{openPatchBrowser();($('patchlist').querySelector('.selected')||$('patchlist').querySelector('button'))?.focus({preventScroll:true})};
$('lcd-done').onclick=()=>{patchBrowserOpen=false;patchSearchOpen=false;renderPatchScreen();$('patchname').focus({preventScroll:true})};
$('lcd-search-toggle').onclick=()=>{const show=!patchBrowserOpen||!patchSearchOpen;openPatchBrowser();patchSearchOpen=show;renderPatchScreen();if(show)$('search').focus({preventScroll:true});else $('lcd-search-toggle').blur()};
$('lcd-clear-search').onclick=()=>{$('search').value='';$('family').value='all';renderList({resetPage:true});$('search').focus({preventScroll:true})};
for(const [id,delta] of [['lcd-page-prev',-1],['lcd-page-next',1]])$(id).onclick=()=>{patchPage+=delta;renderList();$(id).blur()};
window.addEventListener('resize',measureLCDSize);
for(const [id,offset] of [['prev',-1],['next',1]])$(id).onclick=()=>{if(!filtered.length)return;let i=filtered.findIndex(p=>patchID(p)===patchID(selected));selectPatch(filtered[(i+offset+filtered.length)%filtered.length]);$('patchlist').querySelector('.selected')?.scrollIntoView({block:'nearest'});$(id).blur()};
for(const mode of ['scale','chord','phrase'])$('demo-'+mode).onclick=()=>{playDemo(mode);$('demo-'+mode).blur()};$('stop').onclick=()=>{panic();$('stop').blur()};$('sustain').onclick=()=>{sustainEnabled=!sustainEnabled;sustain();$('sustain').blur()};
$('octdown').onclick=()=>{transpose(-12);$('octdown').blur()};$('octup').onclick=()=>{transpose(12);$('octup').blur()};
for(const id of ['volume','velocity'])$(id).oninput=()=>{$(id+'value').textContent=$(id).value+(id==='velocity'?'':'%');if(id==='volume'&&gain)gain.gain.setTargetAtTime(+$(id).value/100,audio.currentTime,.02)};
$('about').onclick=()=>{panic();$('help').showModal()};$('closehelp').onclick=()=>$('help').close();$('help').addEventListener('click',e=>{if(e.target===$('help')){const r=$('help').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('help').close()}});
// Keyboard range and sound shaping.
$('key-count').onchange=()=>{panic();keyCount=+$('key-count').value;base=Math.min(base,maxBase());renderKeyboard()};
for(const name of ['octave','tune','attack','release','brightness'])$('shape-'+name).oninput=()=>{
 if(name==='octave'){panic()}shape[name]=+$('shape-'+name).value;applyShape();renderShape();
};
$('shape-reset').onclick=()=>{Object.assign(shape,{attack:64,release:64,brightness:64,tune:0});applyShape();renderShape();$('shape-reset').blur()};
for(const name of ['reverb','delay']){
 $(name+'-toggle').onclick=()=>{if(name==='reverb')reverbEnabled=!reverbEnabled;else delayEnabled=!delayEnabled;applyEffects();$(name+'-toggle').blur()};
 $(name).oninput=()=>{if(name==='reverb')reverbEnabled=true;else delayEnabled=true;applyEffects()};
}
for(const id of ['reverb-type','delay-mode'])$(id).onchange=applyEffects;
for(const id of ['reverb-decay','reverb-damping','reverb-predelay','delay-time','delay-feedback','delay-damping'])$(id).oninput=applyEffects;
$('effects-reset').onclick=()=>{
 reverbEnabled=true;delayEnabled=false;
 for(const [id,value] of Object.entries({reverb:25,'reverb-type':4,'reverb-decay':64,'reverb-damping':2,'reverb-predelay':12,delay:25,'delay-time':100,'delay-feedback':35,'delay-damping':2,'delay-mode':'stereo'}))$(id).value=value;
 applyEffects();$('effects-reset').blur();
};
function setPerformance(on){
 performanceView=on;document.body.classList.toggle('performance-view',on);
 $('performance-view').setAttribute('aria-pressed',String(on));$('performance-view').textContent=on?'Normal keyboard':'Expand keyboard';
}
$('performance-view').onclick=()=>{setPerformance(!performanceView);$('performance-view').blur()};
const fullscreenElement=()=>document.fullscreenElement||document.webkitFullscreenElement;
function updateFullscreen(){$('fullscreen').textContent=fullscreenElement()?'Exit full screen':'Full screen'}
$('fullscreen').onclick=async()=>{
 const hint=$('view-hint');hint.hidden=true;
 try{
  if(fullscreenElement())await(document.exitFullscreen?.()??document.webkitExitFullscreen?.());
  else {
   const request=document.documentElement.requestFullscreen||document.documentElement.webkitRequestFullscreen;
   if(!request){hint.textContent='This browser does not offer full screen. Use Performance view, or add Soundroom to your iPad Home Screen.';hint.hidden=false;setPerformance(true);return}
   await request.call(document.documentElement);setPerformance(true);
  }
 }catch{hint.textContent='Full screen is unavailable here. Performance view gives the keyboard more room.';hint.hidden=false;setPerformance(true)}
 updateFullscreen();$('fullscreen').blur();
};
document.addEventListener('fullscreenchange',updateFullscreen);document.addEventListener('webkitfullscreenchange',updateFullscreen);
for(const el of [$('keyboard'),$('drumpads')])el.addEventListener('contextmenu',e=>e.preventDefault());

// Browser MIDI input. No output ports or SysEx access are requested.
const midiAdjustments=new Map();let midiLastDelivery=null;
try{const saved=JSON.parse(localStorage.getItem('soundroom-midi-adjustments-v2')||'{}');for(const [id,ms] of Object.entries(saved))if(Number.isFinite(ms))midiAdjustments.set(id,clamp(Math.round(ms),-250,250))}catch{}
const midiAdjustment=()=>midiAdjustments.get(midiPort)||0;
function renderMIDITiming(){
 if(document.activeElement!==$('midi-record-adjustment'))$('midi-record-adjustment').value=midiAdjustment();
 const base=audio?.baseLatency,output=audio?.outputLatency;
 const latency=Number.isFinite(base)&&Number.isFinite(output)?Math.round((base+output)*1000)+' ms':'not reported';
 $('midi-timing-info').textContent='Audio output delay: '+latency+'. MIDI delivery: '+(midiLastDelivery===null?'play a note to measure.':Math.round(midiLastDelivery)+' ms.');
}
$('midi-record-adjustment').onchange=()=>{
 if(studio?.recording){renderMIDITiming();return}
 const value=Number($('midi-record-adjustment').value);
 midiAdjustments.set(midiPort,Number.isFinite(value)?clamp(Math.round(value),-250,250):0);$('midi-record-adjustment').value=midiAdjustment();
 try{localStorage.setItem('soundroom-midi-adjustments-v2',JSON.stringify(Object.fromEntries(midiAdjustments)))}catch{}
 renderMIDITiming();
};
$('midi-adjustment-reset').onclick=()=>{if(studio?.recording)return;$('midi-record-adjustment').value=0;$('midi-record-adjustment').onchange()};
renderMIDITiming();
for(let ch=1;ch<=16;ch++){const o=document.createElement('option');o.value=ch-1;o.textContent='Channel '+ch;$('midi-channel').append(o)}
function renderMIDI(){
 const inputs=[...midiAccess.inputs.values()].filter(p=>p.state==='connected');
 $('midi-input').replaceChildren(new Option('All inputs','all'));
 for(const port of inputs)$('midi-input').append(new Option(port.name||'MIDI keyboard',port.id));
 if(midiPort!=='all'&&!inputs.some(p=>p.id===midiPort))$('midi-input').append(new Option('Selected input disconnected',midiPort));
 $('midi-input').value=midiPort;$('midi-input').disabled=!inputs.length;
 $('midi-status').textContent=!inputs.length?'MIDI access ready. Connect a keyboard to your device.':midiPort!=='all'&&!inputs.some(p=>p.id===midiPort)?'Selected input disconnected. Reconnect it or choose another input.':inputs.length+' MIDI input'+(inputs.length===1?'':'s')+' connected · ready to play';
}
function handleMIDI(port,data,timestamp){
 if(document.hidden||!ready||(midiPort!=='all'&&midiPort!==port.id))return;
 const msg=decodeMIDI(data);if(!msg||(midiChannel!=='all'&&msg.channel!==+midiChannel))return;
 const source='midi:'+port.id+':'+msg.channel,owner=source+':'+msg.note;
 const received=performance.now();midiLastDelivery=Number.isFinite(timestamp)?Math.max(0,received-timestamp):null;
 const adjustment=midiAdjustment()/1000,time=inputAudioTime(audio,timestamp,received)+adjustment;
 if(msg.type==='on'){if(audio.state==='suspended')audio.resume().catch(()=>{});noteOn(msg.note,owner,msg.velocity,time,adjustment)}
 else if(msg.type==='off')release(owner,time,adjustment);
 else if(msg.type==='bend'||msg.type==='pressure')liveController({type:msg.type,value:msg.value},time,adjustment);
 else if(msg.type==='cc'){
  if(msg.controller===64){msg.value>=64?midiPedals.add(source):midiPedals.delete(source);sustain(time,adjustment)}
  else if(msg.controller===1||msg.controller===11)liveController({type:'cc',controller:msg.controller,value:msg.value},time,adjustment);
  else if(msg.controller===120||msg.controller===123)panic();
  else if(msg.controller===121){midiPedals.delete(source);sustain(time,adjustment);for(const [controller,value] of [[1,0],[11,127]])liveController({type:'cc',controller,value},time,adjustment);liveController({type:'bend',value:8192},time,adjustment);liveController({type:'pressure',value:0},time,adjustment)}
 }
}
function bindMIDI(){for(const port of midiAccess.inputs.values())port.onmidimessage=event=>handleMIDI(port,event.data,event.timeStamp);renderMIDI()}
$('midi-connect').onclick=async()=>{
 if(midiConnecting)return;midiConnecting=true;$('midi-connect').disabled=true;
 try{
  if(!navigator.requestMIDIAccess)throw new Error('MIDI input is unavailable in this browser. Try desktop Chrome or Edge. The touch keyboard works here.');
  // Request device access in the user gesture while audio unlocks and loads.
  const [access,audioReady]=await Promise.all([navigator.requestMIDIAccess({sysex:false}),ensureAudio()]);
  midiAccess=access;
  midiAccess.onstatechange=event=>{if(event.port.type==='input'&&event.port.state==='disconnected')panic();bindMIDI()};
  bindMIDI();$('midi-connect').textContent='Refresh inputs';
  if(!audioReady)$('midi-status').textContent='MIDI connected. Use Enable sound to finish starting the sound engine.';
 }catch(e){$('midi-status').textContent=e.name==='NotAllowedError'?'MIDI permission was not granted. Allow MIDI in your browser’s site settings, then try again.':e.message||'MIDI could not connect. Please try again.'}
 finally{midiConnecting=false;$('midi-connect').disabled=false;$('midi-connect').blur()}
};
$('midi-input').onchange=()=>{panic();midiPort=$('midi-input').value;renderMIDI();renderMIDITiming()};
$('midi-channel').onchange=()=>{panic();midiChannel=$('midi-channel').value};
if(!navigator.requestMIDIAccess){$('midi-connect').disabled=true;$('midi-connect').textContent='MIDI unavailable';$('midi-status').textContent='This browser has no Web MIDI input. Use the touch keyboard here, or desktop Chrome / Edge for a MIDI controller.'}

const scope=$('scope'),pen=scope.getContext('2d'),samples=new Float32Array(2048);let frame=0;
function paint(){requestAnimationFrame(paint);if(document.hidden||vr?.presenting||++frame%2)return;studio?.tick();if(workspaceUI.current==='settings'&&workspaceUI.settings==='midi'&&frame%30===0)renderMIDITiming();const w=Math.round(scope.clientWidth*devicePixelRatio),h=Math.round(scope.clientHeight*devicePixelRatio);if(scope.width!==w||scope.height!==h){scope.width=w;scope.height=h}pen.clearRect(0,0,w,h);pen.lineWidth=devicePixelRatio;pen.strokeStyle=lcdPalettes[lcdTheme].baseline;pen.beginPath();pen.moveTo(0,h/2);pen.lineTo(w,h/2);pen.stroke();if(!analyser)return;analyser.getFloatTimeDomainData(samples);pen.strokeStyle=lcdPalettes[lcdTheme].ink;pen.lineWidth=1.5*devicePixelRatio;pen.beginPath();for(let i=0;i<samples.length;i++){const x=i/(samples.length-1)*w,y=h/2+samples[i]*h*1.5;i?pen.lineTo(x,y):pen.moveTo(x,y)}pen.stroke()}
studio=createStudio({
 editValue:(index,key,trigger)=>valueEditor?.openMix(index,key,trigger),rememberPatch:p=>soundShortcuts.used(p),presets:()=>presets,bank:()=>({id:currentSoundFont.id,name:currentSoundFont.name}),audio:()=>audio,inputTime:()=>eventAudioTime(),synth:()=>ready?synth:null,
 recordingState:locked=>{for(const id of ['midi-record-adjustment','midi-adjustment-reset'])$(id).disabled=locked},onWorkspace:arrangeWorkspace,exportBank:()=>loadSoundFont(currentSoundFont),ensureAudio,post:message=>workletNode?.port.postMessage(message),clearLive,stopDemos:stopDemo,effects:effectSettings,master:()=>+$('volume').value,velocity:()=>+$('velocity').value,
 displayTrack:(track,index)=>{selected=track.patch;partIndex=index;partName=track.name;Object.assign(shape,track.shape);renderSelection();renderList({revealSelected:true});renderKeyboard()},
 audition:(note,velocity)=>{if(!ready)return;const owner='editor-preview';voices.press(owner,studio.inputTrack,note,velocity);setTimeout(()=>voices.release(owner),180)},
 level:()=>{if(!analyser)return 0;analyser.getFloatTimeDomainData(samples);return Math.sqrt(samples.reduce((s,x)=>s+x*x,0)/samples.length)},
 restoreEffects:(settings,master)=>{if(settings&&typeof settings==='object'){const fields={reverbMix:['reverb',0,100],reverbType:['reverb-type',0,5],reverbDecay:['reverb-decay',0,127],reverbDamping:['reverb-damping',0,7],reverbPredelay:['reverb-predelay',0,127],delayMix:['delay',0,100],delayTime:['delay-time',70,115],delayFeedback:['delay-feedback',0,75],delayDamping:['delay-damping',0,7]};for(const [key,[id,min,max]] of Object.entries(fields))if(Number.isFinite(settings[key]))$(id).value=clamp(settings[key],min,max);reverbEnabled=!!settings.reverbEnabled;delayEnabled=!!settings.delayEnabled;$('delay-mode').value=settings.delayStereo?'stereo':'mono';applyEffects()}if(Number.isFinite(master)){$('volume').value=clamp(master,0,100);$('volume').oninput()}}
});
composer=createComposer({presets:()=>presets,ensureAudio,post:m=>workletNode?.port.postMessage(m),exportBank:()=>loadSoundFont(currentSoundFont),open:()=>studio.setView('compose'),stopScenes:()=>studio.stop(false),stopDemos:stopDemo,clearLive,recording:()=>studio.recording,sceneProject:()=>studio.serialise(),setMaster:value=>{if(gain)gain.gain.value=value},restoreMaster:()=>{if(gain)gain.gain.value=+$('volume').value/100}});
valueEditor=createValueEditor(document,{track:i=>studio.project.tracks[i],mix:studio.xrMix,persist:studio.persist,locked:id=>id==='shape-octave'&&studio.playing});
// VR is another controller and display for this same performance, never a second clock.
let vrStorage;try{vrStorage=localStorage}catch{}
const xrControls=createXRControls(document,studio,vrStorage);
vr=createWebXR({
 ready:()=>ready,ensureAudio,patches:()=>{const recent=soundShortcuts.recent;return presets.map(p=>({...p,favorite:soundShortcuts.favorite(p),recentOrder:recent.indexOf(patchID(p))}))},
 noteOn:(note,owner,velocity)=>noteOn(note,owner,velocity),noteOff:owner=>release(owner),tick:()=>studio.tick(),
 sustain:on=>{if(xrSustain!==on){xrSustain=on;sustain()}},
 workspaceSnapshot:xrControls.snapshot,control:xrControls.control,slots:xrControls.slots,edit:studio.xrEdit,mix:studio.xrMix,selectTrack:studio.xrSelectTrack,
 fileLabel:id=>Object.values(XR_GROUPS).flatMap(g=>g[1]).find(f=>f[0]===id)?.[1]||'Browser control',
 runFileAction:id=>{if(XR_FILE_CONTROLS.has(id)&&!$(id).disabled)$(id).click()},
 resume:()=>{if(audio?.state==='suspended')audio.resume().catch(()=>{})},
 started:()=>{clearLive();workspaceUI.close(false)},suspend:panic,
 ended:()=>{if(studio.recording)studio.stop();workspaceUI.open('vr',$('open-vr'))},
 snapshot:()=>{
  const p=studio.project,d=studio.diagnostics(),t=p.tracks[p.selectedTrack],armed=p.armedTrack<0?p.selectedTrack:p.armedTrack;
  return {theme:lcdTheme,track:p.selectedTrack,trackName:t.name,patch:t.patch,patchName:t.patch.name,program:t.patch.program+1,bank:t.patch.bankMSB+':'+t.patch.bankLSB,drums:t.patch.isDrum,
   tracks:p.tracks.map(t=>({name:t.name,patch:t.patch.name})),scenes:p.scenes.map(s=>s.name),scene:p.selectedScene,queued:d.queuedScene,armed,
   playing:d.playing,recording:d.recording,song:d.songPlaying,busy:d.starting||d.finishing,locked:d.playing||d.starting||d.finishing,sceneLocked:d.recording||d.songPlaying||d.starting||d.finishing,
   measureProgress:d.playing&&d.beat>=0?(d.beat%(p.meter[0]*4/p.meter[1]))/(p.meter[0]*4/p.meter[1]):0,position:$('seq-position').textContent,transport:$('seq-state').textContent,tempo:d.tempo,
   recordSummary:'S'+(p.selectedScene+1)+' / T'+(armed+1)+' '+p.tracks[armed].name+' / '+(p.recordMode==='replace'?'RECORD OVER':'OVERDUB')+' / '+(p.recordGrid==='off'?'FREE TIMING':p.recordGrid+' GRID')+' / '+p.countIn+' BAR COUNT-IN',
   monitor:studio.monitor(),inputGeneration:actionGeneration,velocity:+$('velocity').value,sustain:sustainEnabled||spaceSustain||xrSustain||midiPedals.size>0,volume:+$('volume').value,reverb:reverbEnabled?+$('reverb').value:0,delay:delayEnabled?+$('delay').value:0};
 },
 action:action=>{
  const d=studio.diagnostics(),locked=d.playing||d.starting||d.finishing;
  if(action.type==='theme')setLCDTheme(lcdTheme==='purple'?'green':'purple');
  else if(action.type==='track'&&!locked)studio.selectPerformanceTrack(action.value);
  else if(action.type==='favorite'&&presets[action.value]){soundShortcuts.toggle(presets[action.value]);renderFavorite();renderList()}
  else if(action.type==='patch'&&!locked&&presets[action.value])selectPatch(presets[action.value]);
  else if(action.type==='xylophone'&&!locked){const p=presets.find(p=>!p.isDrum&&p.name.toLowerCase().includes('xylophone'));if(p)selectPatch(p)}
  else if(action.type==='scene')studio.chooseScene(action.value);
  else if(action.type==='transport')return studio.transport(action.value);
  else if(action.type==='level'&&['volume','reverb','delay'].includes(action.value)){
   const id=action.value,enabled=id==='volume'||(id==='reverb'?reverbEnabled:delayEnabled);
   $(id).value=clamp((enabled?+$(id).value:0)+action.delta,0,100);$(id).oninput();
  }
 }
},{document,navigator,storage:vrStorage,XRWebGLLayer:window.XRWebGLLayer});
if(window.innerWidth<600){keyCount=25;$('key-count').value='25'}
$('bank-credit').textContent=currentSoundFont.credit+' · SpessaSynth playback engine';renderList();renderSelection();renderKeyboard();drawPads();renderEffects();setCompactLayout(compactLayout);initialiseLCDSize();paint();
// Read-only diagnostics for local verification of the embedded bank and output.
window.soundroom={get sequencer(){return studio?.diagnostics()},get soundFont(){return currentSoundFont.id},get soundFontName(){return currentSoundFont.name},get ready(){return ready},get presetCount(){return presets.length},get selected(){return {...selected}},get voices(){return synth?.voiceCount||0},get activeNotes(){return [...voices.notes.keys()]},get shape(){return {...shape}},get effects(){return effectSettings()},get actualPatch(){return synth?.midiChannels[0].patch},get level(){if(!analyser)return 0;analyser.getFloatTimeDomainData(samples);return Math.sqrt(samples.reduce((s,x)=>s+x*x,0)/samples.length)}};
