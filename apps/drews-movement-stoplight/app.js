'use strict';
const MOVES = [
 {id:'walk',name:'Walking',cue:'Walk',hint:'Easy steps. Find your own space.',tip:'Steady, alternating steps',color:'#27f532',head:[34, 11],pose:'M32 24 29 39 M29 39 40 50 44 62 51 62 M29 39 22 50 14 62 8 62 M32 26 43 35 50 33 M31 26 22 36 15 38',detail:''},
 {id:'jog',name:'Jogging',cue:'Jog',hint:'A gentle pace. Keep some space.',tip:'Light, steady steps at an easy pace',color:'#2877ff',head:[37, 11],pose:'M34 24 29 39 M29 39 42 44 43 55 50 55 M29 39 20 49 11 44 8 42 M33 27 43 32 49 24 M32 26 22 29 19 38',detail:'M6 24 13 24 M4 32 11 32'},
 {id:'skip',name:'Skipping',cue:'Skip',hint:'Step, hop. Step, hop.',tip:'A step and hop, alternating feet',color:'#ff9900',head:[32, 10],pose:'M32 23 31 38 M31 38 43 37 45 48 51 48 M31 38 26 49 29 60 35 60 M32 26 43 21 47 12 M31 26 21 35 13 31',detail:'M7 58 Q3 48 10 42 M6 44 10 42 12 47'},
 {id:'gallop',name:'Galloping',cue:'Gallop',hint:'Step, together. Keep one foot in front.',tip:'One foot leads; the other follows',color:'#ed00d9',head:[35, 11],pose:'M33 24 30 39 M30 39 43 48 48 61 55 61 M30 39 21 51 27 61 34 61 M33 26 44 32 49 26 M31 27 22 32 17 27',detail:'M8 67 55 67 M50 64 55 67 50 70'},
 {id:'tiptoe',name:'Tiptoeing',cue:'Tiptoe',hint:'Up on your toes. Quiet as a mouse.',tip:'Small, quiet steps on the toes',color:'#00e9d5',head:[32, 10],pose:'M32 23 31 38 M31 38 26 49 26 55 30 62 34 62 M31 38 41 49 40 55 44 62 48 62 M32 26 43 29 48 23 M31 26 21 29 16 23',detail:'M28 67 35 67 M43 67 50 67'},
 {id:'march',name:'Marching',cue:'March',hint:'Lift your knees. Find a steady beat.',tip:'Strong steps with lifted knees',color:'#ffd000',head:[31, 10],pose:'M31 23 31 39 M31 39 45 39 45 52 52 52 M31 39 29 51 29 63 36 63 M31 26 20 36 13 30 M32 26 43 29 47 21',detail:''},
 {id:'hop',name:'Hopping',cue:'Hop',hint:'One foot. Little hops.',tip:'Take off and land on the same foot',color:'#a346ff',head:[32, 9],pose:'M32 22 32 37 M32 37 29 48 30 58 37 58 M32 37 44 42 41 49 47 49 M32 25 21 26 15 18 M33 25 44 24 49 17',detail:'M25 65 40 65 M9 56 9 44 M5 49 9 44 13 49'},
 {id:'jump',name:'Jumping',cue:'Jump',hint:'Two feet together. Land softly.',tip:'Take off and land on two feet',color:'#ff5c00',head:[32, 8],pose:'M32 21 32 35 M32 35 26 46 25 56 20 56 M32 35 38 46 39 56 44 56 M31 24 21 24 15 14 M33 24 43 24 49 14',detail:'M17 64 27 64 M37 64 47 64 M8 54 8 43 M4 48 8 43 12 48 M56 54 56 43 M52 48 56 43 60 48'},
 {id:'slide',name:'Sliding',cue:'Slide',hint:'Step sideways. Bring the other foot alongside.',tip:'Travel sideways: step, together. Keep one foot leading.',color:'#00dbff',head:[28, 10],pose:'M28 23 30 39 M30 39 28 50 26 60 32 60 M30 39 43 47 51 59 58 59 M27 26 17 31 8 28 M29 26 41 29 50 24',detail:'M15 67 55 67 M50 63 55 67 50 71'},
];
const STOP={id:'stop',name:'Stop',cue:'STOP',hint:'Freeze like a statue.',color:'#ff1830'};
const BASICS=['walk','jog','skip','gallop','tiptoe'];
const DEFAULTS={selected:BASICS,size:'standard',moveTime:15,stopTime:5,order:'shuffle',stopMode:'always',timing:{},showSignal:true,showNext:false,cleanVideo:false,backgroundMotion:true,sessionLength:0,customSeconds:60,endOnStop:true,sound:false};
let prefs={...DEFAULTS,selected:[...BASICS]};
try{const saved=JSON.parse(localStorage.getItem('movement-stoplight-v1'));if(saved&&Array.isArray(saved.selected)){prefs={...prefs,...saved};const savedIds=saved.selected.map(id=>id==='run'?'jog':id);prefs.selected=MOVES.filter(m=>savedIds.includes(m.id)).map(m=>m.id);if(!['compact','standard','large'].includes(prefs.size))prefs.size='standard';if(![5,10,15,20,30,45,60].includes(+prefs.moveTime))prefs.moveTime=15;if(![3,5,8,10].includes(+prefs.stopTime))prefs.stopTime=5;if(!['shuffle','sequence'].includes(prefs.order))prefs.order='shuffle';}}catch{}
prefs.stopMode=['never','sometimes','always'].includes(prefs.stopMode)?prefs.stopMode:'always';
prefs.timing=prefs.timing&&typeof prefs.timing==='object'?prefs.timing:{};
for(const m of MOVES){const t=prefs.timing[m.id]||{};prefs.timing[m.id]={seconds:Math.max(2.4,Math.min(120,Number(t.seconds)||Number(prefs.moveTime))),weight:Math.max(1,Math.min(100,Number(t.weight)||1))};}
prefs.showNext=prefs.showNext===true;
prefs.backgroundMotion=prefs.backgroundMotion!==false;
prefs.cleanVideo=prefs.cleanVideo===true;prefs.endOnStop=prefs.endOnStop!==false;
if(!['0','60','120','180','300','custom'].includes(String(prefs.sessionLength)))prefs.sessionLength=0;
prefs.customSeconds=Math.max(5,Math.min(3600,Math.round(Number(prefs.customSeconds)||60)));
let sceneryRun=false,playbackHeld=false,sessionStarted=null,sessionEnding=false,sessionComplete=false,controlsTimer=null;
let current='stop',lastMove=null,auto=false,deadline=0,duration=0,timer=null,audio=null,queuedMove=null,queueLoading=false,phasePending=false,playCommitChime=true;
const $=id=>document.getElementById(id);
function icon(m){if(m.id==='stop')return '<svg viewBox="0 0 64 72" aria-hidden="true"><path d="M18 47 10 36c-3-4 2-8 5-5l8 8V16c0-5 7-5 7 0v17V9c0-5 7-5 7 0v24V13c0-5 7-5 7 0v22V20c0-5 7-5 7 0v26c0 14-7 21-18 21-8 0-11-9-15-20Z" fill="currentColor"/></svg>';return `<svg viewBox="0 0 64 72" aria-hidden="true"><circle cx="${m.head[0]}" cy="${m.head[1]}" r="7" fill="currentColor"/><path d="${m.pose}" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="${m.detail}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;}
function selectedMoves(){return MOVES.filter(m=>prefs.selected.includes(m.id));}
function save(){try{localStorage.setItem('movement-stoplight-v1',JSON.stringify(prefs));}catch{}}
function fitSignal(){
 const count=prefs.selected.length+1,small=innerWidth<760,presenting=document.body.classList.contains('present');
 if(presenting){
  const available=innerHeight-(prefs.cleanVideo?40:100),gap=innerHeight<500?5:12;
  const cap={compact:110,standard:160,large:205}[prefs.size];
  const size=Math.max(8,Math.min(cap,(available-64-gap*(count-1))/count-4,innerWidth*.15));
  document.documentElement.style.setProperty('--lamp',Math.floor(size)+'px');
  document.documentElement.style.setProperty('--signal-gap',gap+'px');
 }else{
  const base={compact:47,standard:65,large:85}[prefs.size],available=Math.max(240,innerHeight-235);
  const fit=Math.floor((available-34)/count-16);
  document.documentElement.style.setProperty('--lamp',Math.max(small?29:32,Math.min(base,fit,small?47:85))+'px');
 }
}
function renderSignal(){const list=[STOP,...selectedMoves()];$('signal').innerHTML=list.map(m=>`<button type="button" class="lamp-row" data-move="${m.id}" style="--color:${m.color}" aria-label="${m.name}" aria-pressed="false"><span class="lens-wrap"><span class="lens">${icon(m)}</span></span><span class="lamp-label">${m.id==='stop'?'STOP':m.cue}</span></button>`).join('');$('motionControls').innerHTML=list.map(m=>`<button type="button" class="motion-button ${m.id==='stop'?'stop-button':''}" style="--color:${m.color}" data-move="${m.id}" aria-pressed="false">${icon(m)}<span>${m.name}</span></button>`).join('');$('next').disabled=!prefs.selected.length;$('startSession').disabled=!prefs.selected.length;$('autoToggle').disabled=!prefs.selected.length;fitSignal();paint();}
function paint(){const m=MOVES.find(m=>m.id===current)||STOP;document.documentElement.style.setProperty('--active',m.color);document.querySelector('.cue').style.setProperty('--active',m.color);$('cueIcon').innerHTML=icon(m);$('cueTitle').textContent=m.cue;$('cueHint').textContent=m.hint;$('cueFoot').textContent=!prefs.showNext?(current==='stop'?'Hold your freeze.':'Keep moving.') :auto?(current==='stop'?'Hold your freeze. A new motion is coming.':'Keep moving until the red light.'):(current==='stop'?'Ready when you are.':'Watch for the next light.');document.querySelectorAll('[data-move]').forEach(b=>{const active=b.dataset.move===current;b.classList.toggle('is-active',active);b.setAttribute('aria-pressed',String(active));});$('modeLabel').textContent=auto?'AUTO PLAY':'TEACHER CONTROL';$('autoToggle').textContent=auto?'Ⅱ Pause auto':'▶ Auto play';$('countdown').hidden=!auto||!prefs.showNext||prefs.cleanVideo;document.body.classList.toggle('clean-video',prefs.cleanVideo);document.body.classList.toggle('background-paused',!prefs.backgroundMotion);renderQueue();updateSessionStatus();document.body.classList.toggle('no-signal',!prefs.showSignal);$('signalToggle').textContent=prefs.showSignal?'Hide signal':'Show signal';$('signalToggle').setAttribute('aria-pressed',String(prefs.showSignal));$('sound').textContent=prefs.sound?'Chime on':'Chime off';$('sound').setAttribute('aria-pressed',String(prefs.sound));}
function unlockAudio(){if(!prefs.sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});}catch{}}
function chime(stop){if(!prefs.sound)return;unlockAudio();if(!audio)return;try{const t=audio.currentTime;const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.setValueAtTime(stop?392:660,t);osc.frequency.exponentialRampToValueAtTime(stop?261:880,t+.14);gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.1,t+.015);gain.gain.exponentialRampToValueAtTime(.0001,t+.3);osc.connect(gain);gain.connect(audio.destination);osc.start(t);osc.stop(t+.32);window.dispatchEvent(new CustomEvent('movementchime',{detail:{stop}}));}catch{}}
function setMove(id,playSound=true,immediate=false){
 if(id!=='stop'&&!prefs.selected.includes(id))return;
 playCommitChime=playSound;window.MovementMusic.requestMotion(id,{immediate,silent:!playSound});
}
function showQueue(detail={}){
 queuedMove=detail.id||null;queueLoading=Boolean(detail.loading);renderQueue();
}
function renderQueue(){
 const visible=prefs.showNext&&!prefs.cleanVideo&&Boolean(queuedMove);
 document.querySelectorAll('[data-move]').forEach(b=>b.classList.toggle('is-queued',visible&&b.dataset.move===queuedMove));
 $('queueStatus').hidden=!visible;
 const m=MOVES.find(m=>m.id===queuedMove)||STOP;
 $('queueName').textContent=visible?'NEXT: '+m.name.toUpperCase():'';
 $('queueWait').textContent=visible?(queueLoading?'Preparing music…':'On the next measure'):'';
}
window.addEventListener('movementqueued',e=>showQueue(e.detail));
window.addEventListener('movementcommitted',e=>{
 const id=e.detail.id;if(id!=='stop'&&!sceneryRun)startScenery();playbackHeld=false;current=id;if(id!=='stop')lastMove=id;phasePending=false;paint();
 if(playCommitChime&&!e.detail.silent)chime(id==='stop');
 if(sessionEnding&&id==='stop'){sessionEnding=false;sessionComplete=true;updateSessionStatus();}
 if(auto){if(sessionStarted===null)sessionStarted=performance.now();beginPhase(e.detail.time);}
});
window.addEventListener('movementclock',e=>{
 const d=e.detail;$('measureLabel').textContent=d.running?'MEASURE '+d.bar:'100 BPM';
 document.querySelectorAll('[data-beat]').forEach(b=>b.classList.toggle('beat-on',d.running&&Number(b.dataset.beat)===d.beat));
 if(prefs.showNext&&!prefs.cleanVideo&&queuedMove&&d.remaining!==null)$('queueWait').textContent='Next downbeat · '+Math.max(1,Math.ceil(d.remaining/.6))+' beat'+(Math.ceil(d.remaining/.6)===1?'':'s');
});
function chooseNext(){const list=prefs.selected;if(!list.length)return'stop';if(prefs.order==='sequence')return list[(list.indexOf(lastMove)+1)%list.length];const pool=list.filter(id=>id!==lastMove);const choices=pool.length?pool:list;let pick=Math.random()*choices.reduce((n,id)=>n+prefs.timing[id].weight,0);return choices.find(id=>(pick-=prefs.timing[id].weight)<0)||choices.at(-1);}
function pauseAuto(){sessionStarted=null;sessionEnding=false;sessionComplete=false;auto=false;clearInterval(timer);timer=null;phasePending=false;window.MovementMusic.cancelQueue();paint();}
function manual(id){pauseAuto();setMove(id);}
function freezeNow(){pauseAuto();setMove('stop',true,true);}
function sessionSeconds(){return prefs.sessionLength==='custom'?prefs.customSeconds:Number(prefs.sessionLength);}
function updateSessionStatus(){
 const total=sessionSeconds();
 const remaining=total&&sessionStarted!==null?Math.max(0,Math.ceil(total-(performance.now()-sessionStarted)/1000)):total;
 const time=Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0');
 $('sessionStatus').textContent=sessionEnding?'Finishing on Stop…':sessionComplete?'Session complete':auto?(total?'Session remaining · '+time:'Auto play · no time limit'):(total?'Session length · '+time:'Session length · no time limit');
}
function finishSession(){
 sceneryRun=false;
 auto=false;clearInterval(timer);timer=null;phasePending=false;sessionEnding=false;
 window.MovementMusic.cancelQueue();
 if(prefs.endOnStop&&current!=='stop'){sessionEnding=true;setMove('stop');}
 else{sessionComplete=true;window.MovementMusic.hold();playbackHeld=true;}
 paint();
}
function beginPhase(startAt){const seconds=current==='stop'?+prefs.stopTime:prefs.timing[current].seconds;duration=Math.ceil(seconds/2.4-1e-8)*2400;const late=Number.isFinite(startAt)&&window.MovementMusic.clock?Math.max(0,window.MovementMusic.clock()-startAt)*1000:0;deadline=performance.now()+duration-late;tick();}
function tick(){
 if(!auto)return;
 updateSessionStatus();
 if(sessionStarted!==null&&sessionSeconds()>0&&performance.now()-sessionStarted>=sessionSeconds()*1000){finishSession();return;}
 if(sessionStarted===null)return;
 const remaining=deadline-performance.now();
 if(remaining<=180&&!phasePending){const next=current==='stop'||prefs.stopMode==='never'||(prefs.stopMode==='sometimes'&&Math.random()>=.35)?chooseNext():'stop';if(next===current){if(remaining<=0)beginPhase();}else{phasePending=true;setMove(next);}}
 $('countNumber').textContent=phasePending?'↗':String(Math.max(1,Math.ceil((deadline-performance.now())/1000)));
 $('countUnit').textContent=phasePending?'next measure':'seconds';
 $('timeFill').style.width=Math.max(0,Math.min(100,(deadline-performance.now())/duration*100))+'%';
}
function startScenery(){sceneryRun=true;window.dispatchEvent?.(new CustomEvent('movementgamestart',{detail:{duration:sessionSeconds()||120,seed:Math.floor(Math.random()*0xffffffff)}}));}
function startAuto(){
 if(!prefs.selected.length)return;sceneryRun=false;window.MovementMusic.cancelQueue();unlockAudio();auto=true;phasePending=false;sessionStarted=null;sessionEnding=false;sessionComplete=false;
 if(current==='stop'||playbackHeld){phasePending=true;setMove(current==='stop'?chooseNext():current);}else{sessionStarted=performance.now();paint();beginPhase();}
 clearInterval(timer);timer=setInterval(tick,100);paint();
}
function updateSelection(ids){
 pauseAuto();prefs.selected=MOVES.filter(m=>ids.includes(m.id)).map(m=>m.id);
 if(current!=='stop'&&!prefs.selected.includes(current))setMove('stop',false,true);
 if(!prefs.selected.includes(lastMove))lastMove=null;save();renderOptions();renderSignal();
}
function renderOptions(){$('motionOptions').innerHTML=MOVES.map(m=>`<label class="motion-option"><input type="checkbox" value="${m.id}" ${prefs.selected.includes(m.id)?'checked':''}>${icon(m)}<span><strong>${m.name}</strong><small>${m.tip}</small></span></label>`).join('');$('selectedCount').textContent=`${prefs.selected.length} of ${MOVES.length} motions`;renderTiming();}
function renderTiming(){$('motionTiming').innerHTML=selectedMoves().map(m=>`<tr><th scope="row">${m.cue}</th><td><input type="number" min="2.4" max="120" step="0.1" data-timing="${m.id}" data-field="seconds" aria-label="${m.cue} seconds" value="${prefs.timing[m.id].seconds}"></td><td><input type="number" min="1" max="100" step="1" data-timing="${m.id}" data-field="weight" aria-label="${m.cue} weight" value="${prefs.timing[m.id].weight}"></td></tr>`).join('');}
$('motionTiming').onchange=e=>{const {timing:id,field}=e.target.dataset;if(!prefs.timing[id]||!['seconds','weight'].includes(field))return;const value=Number(e.target.value),minimum=field==='seconds'?2.4:1,maximum=field==='seconds'?120:100;prefs.timing[id][field]=Math.max(minimum,Math.min(maximum,Number.isFinite(value)?value:minimum));e.target.value=prefs.timing[id][field];save();};
function openSettings(){pauseAuto();setMove('stop',false,true);renderOptions();$('signalSize').value=prefs.size;$('moveTime').value=prefs.moveTime;$('stopTime').value=prefs.stopTime;$('autoOrder').value=prefs.order;$('stopMode').value=prefs.stopMode;$('stopTime').disabled=prefs.stopMode==='never';$('showNextMotion').checked=prefs.showNext;$('cleanVideo').checked=prefs.cleanVideo;$('backgroundMotion').checked=prefs.backgroundMotion;$('sessionLength').value=prefs.sessionLength;$('customSeconds').value=prefs.customSeconds;$('customSecondsRow').hidden=prefs.sessionLength!=='custom';$('endOnStop').checked=prefs.endOnStop;$('settings').showModal();}
document.addEventListener('click',e=>{const b=e.target.closest('[data-move]');if(b){unlockAudio();manual(b.dataset.move);}});
$('settingsOpen').onclick=openSettings;$('playHome').onclick=()=>{document.querySelector('.stage').scrollIntoView?.({behavior:'smooth'});};
$('signalToggle').onclick=()=>{prefs.showSignal=!prefs.showSignal;save();paint();};
$('selectAll').onclick=()=>updateSelection(MOVES.map(m=>m.id));$('selectNone').onclick=()=>updateSelection([]);$('selectBasics').onclick=()=>updateSelection(BASICS);
$('motionOptions').addEventListener('change',()=>{const focusValue=document.activeElement.value;updateSelection([...$('motionOptions').querySelectorAll('input:checked')].map(e=>e.value));$('motionOptions').querySelector(`input[value="${focusValue}"]`)?.focus();});
for(const [id,key]of[['signalSize','size'],['moveTime','moveTime'],['stopTime','stopTime'],['autoOrder','order'],['stopMode','stopMode']])$(id).onchange=e=>{prefs[key]=e.target.value;if(key==='moveTime'){for(const m of MOVES)prefs.timing[m.id].seconds=Number(prefs.moveTime);renderTiming();}$('stopTime').disabled=prefs.stopMode==='never';save();fitSignal();};
$('showNextMotion').onchange=e=>{prefs.showNext=e.target.checked;save();paint();};
$('cleanVideo').onchange=e=>{prefs.cleanVideo=e.target.checked;save();paint();fitSignal();};
$('backgroundMotion').onchange=e=>{prefs.backgroundMotion=e.target.checked;save();paint();};
$('sessionLength').onchange=e=>{prefs.sessionLength=e.target.value;$('customSecondsRow').hidden=prefs.sessionLength!=='custom';sessionComplete=false;save();updateSessionStatus();};
$('customSeconds').onchange=e=>{prefs.customSeconds=Math.max(5,Math.min(3600,Math.round(Number(e.target.value)||60)));e.target.value=prefs.customSeconds;save();updateSessionStatus();};
$('endOnStop').onchange=e=>{prefs.endOnStop=e.target.checked;save();};
$('startSession').onclick=()=>{$('settings').close();startAuto();present(true);};
$('freezeNow').onclick=freezeNow;
$('cancelQueued').onclick=()=>{window.MovementMusic.cancelQueue();if(auto)pauseAuto();};
$('autoToggle').onclick=()=>auto?pauseAuto():startAuto();$('next').onclick=()=>manual(chooseNext());$('sound').onclick=()=>{prefs.sound=!prefs.sound;unlockAudio();save();paint();if(prefs.sound)chime(false);};
function present(on){document.body.classList.toggle('present',on);$('exitPresent').hidden=!on;fitSignal();if(on){if(!document.fullscreenElement)document.documentElement.requestFullscreen?.().catch(()=>{});if(!prefs.cleanVideo)$('exitPresent').focus();else{document.activeElement?.blur();document.body.classList.remove('show-controls');}if(!prefs.cleanVideo)revealControls();}else{if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});$('present').focus();}}
function revealControls(){
 if(!document.body.classList.contains('present'))return;
 document.body.classList.add('show-controls');clearTimeout(controlsTimer);
 controlsTimer=setTimeout(()=>document.body.classList.remove('show-controls'),1800);
}
document.addEventListener('pointermove',revealControls);document.addEventListener('pointerdown',revealControls);
$('present').onclick=()=>present(true);$('exitPresent').onclick=()=>present(false);
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&document.body.classList.contains('present'))present(false);});
document.addEventListener('keydown',e=>{if($('settings').open||$('musicLibrary').open||$('videoExport').open||document.getElementById('recordSetup')?.open||document.getElementById('gameStudio')?.open||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey||e.repeat)return;if(e.code==='KeyA'){e.preventDefault();auto?pauseAuto():startAuto();}if(e.code==='Space'){e.preventDefault();if(current==='stop'&&!queuedMove)manual(prefs.selected.includes(lastMove)?lastMove:chooseNext());else freezeNow();}if(e.key==='ArrowRight'){e.preventDefault();manual(chooseNext());}if(e.key==='Escape'&&document.body.classList.contains('present'))present(false);});
document.addEventListener('visibilitychange',()=>{if(document.hidden){pauseAuto();setMove('stop',false,true);}});window.addEventListener('resize',fitSignal);
window.addEventListener('openmusiclibrary',()=>{pauseAuto();setMove('stop',false,true);});
renderOptions();renderSignal();

function gameConfig(){return{seconds:sessionSeconds()||120,freezeSeconds:Number(prefs.stopTime),stopMode:prefs.stopMode,order:prefs.order,endOnStop:prefs.endOnStop,motion:prefs.backgroundMotion,moves:MOVES.map(m=>({id:m.id,seconds:prefs.timing[m.id].seconds,weight:prefs.selected.includes(m.id)?prefs.timing[m.id].weight:0}))};}
window.MovementData={MOVES,STOP,openSettings,gameConfig,resetForRecording:()=>{sceneryRun=false;pauseAuto();setMove('stop',false,true);},getCurrent:()=>current,finishRecording:()=>{sceneryRun=false;pauseAuto();window.MovementMusic.hold();playbackHeld=true;},getPreferences:()=>({...prefs,selected:[...prefs.selected]})};
window.addEventListener('openvideoexport',()=>{pauseAuto();setMove('stop',false,true);});
