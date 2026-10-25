
'use strict';
const $=id=>document.getElementById(id);
const BEAT_TIMING={"walking_period_seconds":1.0,"finale_hit_seconds":120.675091,"walking_anchor_seconds":0.675091,"beat_period_seconds":0.5,"estimated_bpm":120,"tapped_every_n_beats":2,"missing_walking_pulses_filled":[61.675091,81.675091,91.675091,103.675091,107.675091],"raw_taps_seconds":[1.707826,2.669858,3.669666,4.676713,5.687264,6.64802,7.656157,8.649836,9.694252,10.68325,11.679573,12.666415,13.651399,14.652458,15.681485,16.673705,17.682646,18.674684,19.691794,20.646703,21.627546,22.614907,23.687161,24.66391,25.704694,26.677336,27.656201,28.67439,29.681503,30.681564,31.67188,32.677514,33.673469,34.690829,35.69375,36.672082,37.663853,38.663903,39.683224,40.657936,41.69217,42.658081,43.692353,44.701585,45.640247,46.674596,47.660657,48.683773,49.727019,50.697026,51.662869,52.67795,53.701183,54.657034,55.666172,56.664052,57.655266,58.695348,59.665348,60.658813,62.641338,63.690623,64.671807,65.686993,66.638612,67.681985,68.678945,69.631548,70.653008,71.721587,72.67366,73.700586,74.691528,75.643138,76.677371,77.697953,78.663418,79.711917,80.692832,82.686799,83.704177,84.670015,85.636681,86.666026,87.681171,88.73484,89.696555,90.692529,92.65028,93.662327,94.675471,95.690496,96.68771,97.701996,98.704102,99.699253,100.63509,101.690156,102.675091,104.66917,105.710535,106.770173,108.631208,109.686581,110.6634,111.684147,112.6647,113.708813,114.648643,115.667248,116.665967,117.64177,118.61264,119.667298,120.767138],"source_track":{"filename":"sneakycat.wav","size_bytes":23447782,"mime_type":"audio/wav","sha256":"ff825f8d7f955f57bba498327158ef6a12a267ddc54c6d93d6a186eb0a90e919","duration_seconds":121.875,"decoded_sample_rate":48000},"embedded_mp3_sha256":"528212a32eb5bfab876935341efb3f0d59f8b1fb12bc3f61e269f23cd51d3bf1","alignment_note":"A fixed one-second walking grid inferred from the taps. Phase is the median tap phase. MP3 transient analysis is consistent with this phase; the source WAV itself was not supplied. No unverified codec offset is applied."};
// One shared audio clock schedules the music, surprise sounds, and count-in.
let gameAudioContext=null;
function audioClock(){if(!gameAudioContext){const AudioContextClass=window.AudioContext||window.webkitAudioContext;if(!AudioContextClass)throw new Error('Web Audio is unavailable');gameAudioContext=new AudioContextClass({latencyHint:'interactive'})}return gameAudioContext}
class GameAudio {
 constructor(){this.src='';this.buffer=null;this.source=null;this.gain=null;this.offset=0;this.startedAt=0;this.paused=true;this.ended=false;this.error=null;this.loop=false;this._volume=1;this.operation=0;this.loading=0;this.plannedPause=null}
 get duration(){return this.buffer?this.buffer.duration:NaN}
 get currentTime(){if(this.paused||!this.source)return this.offset;return Math.min(this.duration,this.offset+Math.max(0,audioClock().currentTime-this.startedAt))}
 set currentTime(value){const playing=!this.paused;this.pause();this.offset=Math.max(0,Math.min(Number(value)||0,Number.isFinite(this.duration)?this.duration:Infinity));this.ended=false;if(playing)this.play().catch(()=>{})}
 get volume(){return this._volume}
 set volume(value){this._volume=Math.max(0,Math.min(1,value));if(this.gain)this.gain.gain.value=this._volume}
 async load(){const load=++this.loading;this.pause();this.error=null;try{const response=await fetch(this.src);if(!response.ok)throw new Error('Audio unavailable');const data=await response.arrayBuffer(),buffer=await audioClock().decodeAudioData(data);if(load!==this.loading)return;this.buffer=buffer;this.offset=0;this.ended=false;this.oncanplay?.()}catch(error){if(load!==this.loading)return;this.error=error;this.onerror?.()}}
 async play(when){
  if(!this.buffer)throw new Error('Audio is still loading');if(!this.paused)return;
  const operation=++this.operation,c=audioClock();await c.resume();if(operation!==this.operation)return;
  if(this.ended||this.offset>=this.duration)this.offset=0;
  if(!this.gain){this.gain=c.createGain();this.gain.connect(c.destination)}this.gain.gain.value=this._volume;
  const source=c.createBufferSource();source.buffer=this.buffer;source.connect(this.gain);this.source=source;this.startedAt=Math.max(c.currentTime,Number.isFinite(when)?when:c.currentTime);this.paused=false;this.ended=false;
  source.onended=()=>{
   if(this.source!==source||operation!==this.operation)return;
   const planned=this.plannedPause;this.plannedPause=null;this.source=null;this.paused=true;source.disconnect();
   if(planned){this.offset=planned.position;this.ended=false;planned.callback()}
   else{this.offset=this.duration;this.ended=true;this.onended?.()}
  };
  source.start(this.startedAt,this.offset);
 }
 pauseAt(position,callback){
  if(this.paused||!this.source||position<this.currentTime||position>=this.duration)return false;
  this.plannedPause={position,callback};this.source.stop(this.startedAt+position-this.offset);return true;
 }
 pause(){
  const position=this.currentTime;this.operation++;this.plannedPause=null;
  if(this.source){const source=this.source;source.onended=null;try{source.stop()}catch{}source.disconnect();this.source=null}
  this.offset=position;this.paused=true;
 }
}
let queuedLook=null,pulseResume=null,countInSounds=[];
function nextDownbeat(position){const p=BEAT_TIMING.beat_period_seconds*4,a=BEAT_TIMING.finale_hit_seconds;return a+Math.ceil((position-a)/p-1e-9)*p}
function cancelPulseWork(){queuedLook=null;pulseResume=null;for(const node of countInSounds){try{node.stop()}catch{}}countInSounds=[]}
function playCountIn(when){
 const c=audioClock(),o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(900,when);o.frequency.exponentialRampToValueAtTime(420,when+.035);g.gain.setValueAtTime(.12,when);g.gain.exponentialRampToValueAtTime(.0001,when+.065);o.connect(g);g.connect(c.destination);countInSounds.push(o);o.onended=()=>{o.disconnect();g.disconnect();countInSounds=countInSounds.filter(n=>n!==o)};o.start(when);o.stop(when+.07);
}
function triggerLook(options={}){
 if(!running||paused||phase==='look'||queuedLook||resumingWalk||((songFinished||roundState!=='play')&&!options.forcePhoto))return;
 // The marked final downbeat starts the photoshoot; its musical tail may ring underneath.
 if(roundState==='finale'){executeLook(options);return}
 const music=slots[0].audio,target=nextDownbeat((silent?walkTime:music.currentTime)+.06);
 if(target>=selfieIntroStart())return; // Keep the closing invitation clear of other freezes.
 const ticket={options,target,action:roundActionSerial};queuedLook=ticket;
 if(silent){syncTeacherControls();return}
 if(!music.pauseAt(target,()=>{if(queuedLook!==ticket)return;queuedLook=null;if(!running||paused||ticket.action!==roundActionSerial)return;executeLook(options)}))queuedLook=null;
 syncTeacherControls();
}
function finishPulseResume(){
 const p=pulseResume;if(!p)return;
 if(p.epoch!==walkResumeEpoch||p.serial!==eventSerial||!running||paused){pulseResume=null;return}
 if(audioClock().currentTime<p.when)return;
 pulseResume=null;resumingWalk=false;phase='walk';phaseTime=0;nextLook=timing();activeStab=null;clearPhotos();cue('SNEAK…','Tiptoe to the music.');volume();
}

const SHAPE_HOLD_SECONDS=8;
const SHAPES=[
 {name:'Tall stretch',level:'HIGH',size:1.3,screen:.60},
 {name:'High V',level:'HIGH',size:1.3,screen:.60},
 {name:'Side stretch',level:'HIGH',size:1.3,screen:.60},
 {name:'Wide star',level:'MIDDLE',size:1.12,screen:.54},
 {name:'Twist',level:'MIDDLE',size:1.12,screen:.54},
 {name:'Round arms',level:'MIDDLE',size:1.12,screen:.54},
 {name:'Balance',level:'MIDDLE',size:1.12,screen:.54},
 {name:'Small ball',level:'LOW',size:.78,screen:.39},
 {name:'Sky reach',level:'HIGH',size:1.3,screen:.60},
 {name:'Diagonal wings',level:'MIDDLE',size:1.12,screen:.54},
 {name:'Seated butterfly',level:'LOW',size:.90,screen:.43},
 {name:'Overhead oval',level:'HIGH',size:1.3,screen:.60},
 {name:'Self hug',level:'MIDDLE',size:1.12,screen:.54},
 {name:'Seated side reach',level:'LOW',size:1.02,screen:.48},
 {name:"Diamond squat",level:"MIDDLE",size:1.2,screen:.56},
 {name:"Lightning balance",level:"HIGH",size:1.2,screen:.56},
 {name:"Kneeling wings",level:"LOW",size:1.05,screen:.56},
 {name:"Ready stance",level:"MIDDLE",size:1.2,screen:.56}
];
const shapeSprites=Array(SHAPES.length).fill(null);
let activeShape=-1,shapeBag=[],lastShape=-1;
const SHAPE_CYCLE_KEY='sneaky-cat-shape-cycle-v5';
const SHAPE_CYCLE_ROSTER=SHAPES.map(s=>s.name).join('|');
function shapesReady(){return shapeSprites.every(Boolean)}
// A new round clears only the current pose; unused poses carry across games.
function resetShapeTour(){activeShape=-1}
function restoreShapeCycle(){
 try{
  const data=JSON.parse(localStorage.getItem(SHAPE_CYCLE_KEY));
  if(!data||data.roster!==SHAPE_CYCLE_ROSTER||!Array.isArray(data.bag)||data.bag.length>SHAPES.length||new Set(data.bag).size!==data.bag.length||!data.bag.every(i=>Number.isInteger(i)&&i>=0&&i<SHAPES.length)||!Number.isInteger(data.last)||data.last<0||data.last>=SHAPES.length||data.bag.includes(data.last))return;
  shapeBag=data.bag.slice();lastShape=data.last;
 }catch{} // File-mode or privacy restrictions still allow the in-memory cycle.
}
function saveShapeCycle(){try{localStorage.setItem(SHAPE_CYCLE_KEY,JSON.stringify({roster:SHAPE_CYCLE_ROSTER,bag:shapeBag,last:lastShape}))}catch{}}
function chooseShape(){
 const pool=activePosePool("solo");shapeBag=shapeBag.filter(i=>pool.includes(i));
 if(!shapeBag.length){
  shapeBag=shuffleScenes(pool.slice());
  // Do not repeat the last pose at the boundary between shuffled cycles.
  const end=shapeBag.length-1;
  if(shapeBag[end]===lastShape)[shapeBag[0],shapeBag[end]]=[shapeBag[end],shapeBag[0]];
 }
 activeShape=shapeBag.pop();lastShape=activeShape;saveShapeCycle();return SHAPES[activeShape];
}
restoreShapeCycle();
function ordinaryShapeFreeze(){return running&&phase==='look'&&roundState==='play'&&!photoSession}
function showingShape(){return running&&phase==='look'&&roundState==='play'&&!photoSession&&activeShape>=0&&!!shapeSprites[activeShape]}
function shapeCue(){const shape=SHAPES[activeShape];cue('FREEZE!',shape?shape.level+' · '+shape.name+' — Copy her shape!':'Copy her shape!',true);$('cue').className='visible freeze shape-freeze'}
function shapeLayout(h){const sprite=shapeSprites[activeShape],spec=SHAPES[activeShape],ph=h*spec.size;return {h:ph,w:ph*sprite.width/sprite.height}}
function shapeAutoReleaseTime(){return silent?SHAPE_HOLD_SECONDS:SHAPE_HOLD_SECONDS-2*BEAT_TIMING.walking_period_seconds-.10}
function loadSinglePose(src,group,index){
 const im=new Image();im.onerror=artworkFailed;
 im.onload=()=>{try{const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;c.getContext('2d').drawImage(im,0,0);(group==='solo'?shapeSprites:partnerSprites)[index]=c;updateSummary()}catch{artworkFailed()}};
 im.src=src;
}
function loadShapeSheet(src,index){
 const im=new Image();im.onerror=artworkFailed;
 im.onload=()=>{
  try{
   const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const q=c.getContext('2d',{willReadFrequently:true});q.drawImage(im,0,0);const pixels=q.getImageData(0,0,c.width,c.height),d=pixels.data;
   for(let j=0;j<d.length;j+=4){const excess=Math.min(d[j],d[j+2])-d[j+1];if(excess>90&&d[j]>150&&d[j+2]>150)d[j+3]=Math.round(d[j+3]*(1-Math.min(1,(excess-90)/60)))}q.putImageData(pixels,0,0);
   // Sheet 1 uses only its three top-row poses; both raised-rear poses are excluded.
   const regions=index===0?[[0,0,512,512],[512,0,512,512],[1024,0,512,512],[0,512,512,512],[512,512,512,512]]:[[0,0,512,512],[512,0,512,512],[1024,0,512,512]];
   if(index>=2)regions.splice(0,regions.length,[0,0,512,1024],[512,0,512,1024],[1024,0,512,1024]);
   if(index>=4)regions.splice(0,regions.length,[0,0,512,512],[512,0,478,512],[990,0,546,512],[0,512,530,512],[530,512,494,512]);
   regions.forEach(([rx,ry,rw,rh],i)=>{
    const sx=c.width/1536,sy=c.height/1024,x0=Math.round(rx*sx),y0=Math.round(ry*sy),x1=Math.round((rx+rw)*sx),y1=Math.round((ry+rh)*sy);let left=x1,right=x0,top=y1,bottom=y0;
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){if(d[(y*c.width+x)*4+3]>32){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}}
    if(right<=left||bottom<=top)throw Error('Pose artwork missing');left=Math.max(x0,left-2);top=Math.max(y0,top-2);right=Math.min(x1-1,right+2);bottom=Math.min(y1-1,bottom+2);
    const sprite=document.createElement('canvas');sprite.width=right-left+1;sprite.height=bottom-top+1;sprite.getContext('2d').drawImage(c,left,top,sprite.width,sprite.height,0,0,sprite.width,sprite.height);if(index>=4)partnerSprites[(index-4)*5+i]=sprite;else shapeSprites[([0,5,8,11][index])+i]=sprite;
   });updateSummary();
  }catch(error){artworkFailed()}
 };im.src=src;
}

const PARTNER_FINAL_HOLD_SECONDS=8;
const PARTNER_SHOT_INTERVAL=1.2;
const PARTNER_SHAPES=[
 {name:'Sky and seat',size:1.12,levels:['HIGH','LOW']},
 {name:'Kneeling high five',size:1.12,levels:['MIDDLE','HIGH']},
 {name:'Diagonal connection',size:1.12,levels:['HIGH','MIDDLE']},
 {name:'Seated rainbow',size:1.12,levels:['LOW','HIGH']},
 {name:'Balance link',size:1.12,levels:['HIGH','LOW']},
 {name:'Tall and tucked',size:1.12,levels:['HIGH','LOW']},
 {name:'High-low arch',size:1.12,levels:['MIDDLE','HIGH']},
 {name:'Side reach link',size:1.02,levels:['LOW','MIDDLE']},
 {name:'Seated salute',size:1.12,levels:['HIGH','LOW']},
 {name:'Zigzag reach',size:1.12,levels:['MIDDLE','HIGH']},
 {name:"Linked balance",size:1.12,levels:["HIGH", "HIGH"]},
 {name:"Partner diamond",size:1.12,levels:["MIDDLE", "MIDDLE"]},
 {name:"Seated connection",size:1.12,levels:["LOW", "LOW"]}
];
const partnerSprites=Array(PARTNER_SHAPES.length).fill(null);
let partnerBag=[],lastPartner=-1;
function partnersReady(){return partnerSprites.every(Boolean)}
function choosePartner(){
 const pool=activePosePool("partner");partnerBag=partnerBag.filter(i=>pool.includes(i));
 if(!partnerBag.length){partnerBag=shuffleScenes(pool.slice());const end=partnerBag.length-1;if(partnerBag[end]===lastPartner)[partnerBag[0],partnerBag[end]]=[partnerBag[end],partnerBag[0]]}
 lastPartner=partnerBag.pop();return lastPartner;
}
function showingPartner(){return !!(photoSession&&Number.isInteger(photoSession.partner)&&partnerSprites[photoSession.partner])}
function partnerLayout(h){const sprite=partnerSprites[photoSession.partner],ph=h*PARTNER_SHAPES[photoSession.partner].size;return {h:ph,w:ph*sprite.width/sprite.height}}

const POSE_SELECTION_KEY='sneaky-cat-pose-selection-v1';
function readPoseSelection(){
 const selection={solo:SHAPES.map((_,i)=>i),partner:PARTNER_SHAPES.map((_,i)=>i)};
 try{const saved=JSON.parse(localStorage.getItem(POSE_SELECTION_KEY));
  for(const [group,specs] of [['solo',SHAPES],['partner',PARTNER_SHAPES]]){
   if(!Array.isArray(saved?.[group]))continue;
   const chosen=specs.flatMap((pose,i)=>saved[group].includes(pose.name)?[i]:[]);
   if(chosen.length)selection[group]=chosen;
  }
 }catch{}return selection;
}
let poseSelection=readPoseSelection(),poseDraft=null,posePickerGroup='solo';
const poseThumbs={solo:[],partner:[]};
function activePosePool(group){return sessionOptions.poses?.[group]||poseSelection[group]}
function savePoseSelection(){try{localStorage.setItem(POSE_SELECTION_KEY,JSON.stringify({solo:poseSelection.solo.map(i=>SHAPES[i].name),partner:poseSelection.partner.map(i=>PARTNER_SHAPES[i].name)}))}catch{}}
function updatePoseSelectionLabel(){
 $('poseSelectionSummary').textContent=poseSelection.solo.length+' solo · '+poseSelection.partner.length+' partner';
}
function updatePosePickerState(){
 if(!poseDraft)return;
 $('soloPoseTab').textContent='Solo freezes ('+poseDraft.solo.length+'/'+SHAPES.length+')';
 $('partnerPoseTab').textContent='Partner finales ('+poseDraft.partner.length+'/'+PARTNER_SHAPES.length+')';
 $('soloPoseTab').setAttribute('aria-pressed',String(posePickerGroup==='solo'));
 $('partnerPoseTab').setAttribute('aria-pressed',String(posePickerGroup==='partner'));
 const specs=posePickerGroup==='solo'?SHAPES:PARTNER_SHAPES;
 $('poseGroupCount').textContent=poseDraft[posePickerGroup].length+' of '+specs.length+' selected';
 const valid=poseDraft.solo.length>0&&poseDraft.partner.length>0;
 $('posePickerDone').disabled=!valid;
 $('posePickerMessage').textContent=valid?'Selected poses shuffle without repeats until each set is used.':'Choose at least one solo pose and one partner pose.';
 $('posePickerMessage').className=valid?'':'pose-selection-warning';
}
function poseThumbnail(group,index){
 if(poseThumbs[group][index])return poseThumbs[group][index];
 const sprite=(group==='solo'?shapeSprites:partnerSprites)[index];
 const c=document.createElement('canvas');c.width=300;c.height=220;
 const q=c.getContext('2d'),scale=Math.min(276/sprite.width,196/sprite.height);
 q.drawImage(sprite,(300-sprite.width*scale)/2,(220-sprite.height*scale)/2,sprite.width*scale,sprite.height*scale);
 c.setAttribute('aria-hidden','true');poseThumbs[group][index]=c;return c;
}
function updatePoseCard(button,group,index){const selected=poseDraft[group].includes(index);button.setAttribute('aria-pressed',String(selected));button.className='pose-option'+(selected?' is-selected':'');button.querySelector('.pose-check').textContent=selected?'✓':'+'}
function togglePose(group,index,button){
 if(!poseDraft||!$('posePicker').open)return;
 const list=poseDraft[group],at=list.indexOf(index);if(at>=0)list.splice(at,1);else list.push(index);
 updatePoseCard(button,group,index);updatePosePickerState();
}
function renderPosePickerGroup(group){
 posePickerGroup=group;
 const specs=group==='solo'?SHAPES:PARTNER_SHAPES,grid=$('posePickerGrid');grid.replaceChildren();
 specs.forEach((pose,index)=>{
  const button=document.createElement('button');button.type='button';
  const check=document.createElement('span');check.className='pose-check';check.setAttribute('aria-hidden','true');
  const name=document.createElement('span');name.className='pose-option-name';name.textContent=pose.name;
  const level=document.createElement('span');level.className='pose-option-level';level.textContent=group==='solo'?pose.level:pose.levels.join(' + ');
  button.setAttribute('aria-label',pose.name+', '+level.textContent.toLowerCase());
  button.append(poseThumbnail(group,index),check,name,level);button.onclick=()=>togglePose(group,index,button);
  grid.append(button);updatePoseCard(button,group,index);
 });
 $('posePickerScroll').scrollTop=0;updatePosePickerState();
}
function openPosePicker(){
 if(running||starting||transitioning||menuBrowsing||!artworkReady()||$('home').hidden)return;
 poseDraft={solo:poseSelection.solo.slice(),partner:poseSelection.partner.slice()};
 renderPosePickerGroup('solo');$('posePicker').showModal();$('posePickerDone').focus();
}
function closePosePicker(){poseDraft=null;$('posePicker').close();$('choosePosesBtn').focus()}
function setPoseGroupSelection(all){
 if(!poseDraft)return;poseDraft[posePickerGroup]=all?(posePickerGroup==='solo'?SHAPES:PARTNER_SHAPES).map((_,i)=>i):[];renderPosePickerGroup(posePickerGroup);
}
function applyPoseSelection(){
 if(!poseDraft||!poseDraft.solo.length||!poseDraft.partner.length)return false;
 for(const group of ['solo','partner']){
  const next=poseDraft[group].slice().sort((a,b)=>a-b);
  if(next.join(',')!==poseSelection[group].join(',')){
   if(group==='solo'){shapeBag=[];saveShapeCycle()}else partnerBag=[];
  }
  poseSelection[group]=next;
 }
 savePoseSelection();updatePoseSelectionLabel();closePosePicker();return true;
}
$('choosePosesBtn').onclick=openPosePicker;
$('posePickerCancel').onclick=closePosePicker;
$('posePickerDone').onclick=applyPoseSelection;
$('posePicker').addEventListener('cancel',()=>{poseDraft=null});
$('soloPoseTab').onclick=()=>renderPosePickerGroup('solo');
$('partnerPoseTab').onclick=()=>renderPosePickerGroup('partner');
$('poseSelectAll').onclick=()=>setPoseGroupSelection(true);
$('poseClearAll').onclick=()=>setPoseGroupSelection(false);
updatePoseSelectionLabel();

const ART={background:window.SneakyCatAssets["albuquerque"]};
let sessionOptions={chain:false,teacher:false};
let appReady=false,menuBrowsing=false,menuSlide=null,menuChoiceSerial=0;
let artworkError=false;
function updateHomeMenu(){if(typeof currentScene==='undefined')return;$('homeLevelName').textContent=sceneInfo().name;$('levelChoiceHint').textContent=$('homeChain').checked?'Choose your first stop':'Choose your place'}
function setMenuBusy(busy){menuBrowsing=busy;$('prevLevelBtn').disabled=busy;$('nextLevelBtn').disabled=busy;$('homeChain').disabled=busy;$('homePlayMode').disabled=busy;$('choosePosesBtn').disabled=busy||!artworkReady();if(busy)$('startBtn').disabled=true;else updateSummary()}
function cancelMenuBrowse(){menuChoiceSerial++;if(menuSlide){const finish=menuSlide.resolve;menuSlide=null;finish(false)}setMenuBusy(false)}
function loadMenuScene(id){if(sceneCache[id])return Promise.resolve(sceneCache[id]);return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{sceneCache[id]=im;resolve(im)};im.onerror=()=>reject(new Error('Background unavailable'));im.src=SCENES.find(s=>s.id===id).src})}
async function cycleMenuLevel(direction){
 if(!appReady||menuBrowsing||starting||transitioning||running||$('home').hidden)return;
 const serial=++menuChoiceSerial;setMenuBusy(true);const index=SCENES.findIndex(s=>s.id===currentScene),id=SCENES[(index+direction+SCENES.length)%SCENES.length].id;
 try{const im=await loadMenuScene(id);if(serial!==menuChoiceSerial)return;
  const changed=await new Promise(resolve=>{menuSlide={from:bg,to:im,id,direction,age:0,duration:.85,fadeOut:.22,fadeIn:.32,fromRail:sceneInfo().rail||.689,toRail:SCENES.find(s=>s.id===id).rail||.689,resolve};$('homeLevelName').textContent=SCENES.find(s=>s.id===id).name;$('homeLevelName').animate?.([{opacity:0,transform:'translateX('+direction*18+'px)'},{opacity:1,transform:'translateX(0)'}],{duration:650,easing:'ease-out'})});
  if(changed&&serial===menuChoiceSerial){bg=im;currentScene=id;menuSlide=null;pendingSceneTour=null;resetSceneTour();updateScenePreview()}
 }catch(e){if(serial===menuChoiceSerial){updateHomeMenu();notify('That background could not load. Please try again.')}}finally{if(serial===menuChoiceSerial)setMenuBusy(false)}
}
async function revealOpening(){for(let i=0;i<160;i++){if(artworkReady()&&slots.every(s=>s.ready))break;await sceneDelay(50)}await sceneDelay(500);appReady=true;updateSummary();$('bootVeil').className='is-open';await sceneDelay(1400);$('bootVeil').hidden=true}
async function returnHome(){if(transitioning||starting||menuBrowsing)return;const token=++roundActionSerial;if(running)pauseGame();if(!await coverScene('Sneaky Cat','Another little adventure?')||token!==roundActionSerial)return;endGame({covered:true});await revealScene(180)}
let bg=new Image();bg.onload=updateSummary;bg.onerror=artworkFailed;bg.src=ART.background;
const walkSheet=new Image();let spriteSurface=null;
// Prepare a keyed sprite texture once at load. Only the outside, neutral
// checker background is cleared; enclosed eye highlights remain intact.
walkSheet.onload=()=>{const out=document.createElement('canvas');out.width=walkSheet.naturalWidth;out.height=walkSheet.naturalHeight;const dc=out.getContext('2d',{willReadFrequently:true});dc.drawImage(walkSheet,0,0);const pixels=dc.getImageData(0,0,out.width,out.height),data=pixels.data,W=out.width,H=out.height;const seen=new Uint8Array(W*H),queue=new Int32Array(W*H);let head=0,tail=0;
function visit(x,y){if(x<0||y<0||x>=W||y>=H)return;const k=y*W+x;if(seen[k])return;seen[k]=1;const j=k*4,lo=Math.min(data[j],data[j+1],data[j+2]),hi=Math.max(data[j],data[j+1],data[j+2]);if(lo>=105&&hi-lo<48){queue[tail++]=k;data[j+3]=0}}
for(let cell=0;cell<9;cell++){const left=(cell%3)*418,top=Math.floor(cell/3)*418;for(let n=0;n<418;n++){visit(left+n,top);visit(left+n,top+417);visit(left,top+n);visit(left+417,top+n)}}
while(head<tail){const k=queue[head++],x=k%W,y=Math.floor(k/W);visit(x-1,y);visit(x+1,y);visit(x,y-1);visit(x,y+1)}dc.putImageData(pixels,0,0);spriteSurface=out;updateSummary()};
walkSheet.onerror=artworkFailed;
walkSheet.src=window.SneakyCatAssets["walk-original"];
const modelImage=new Image();let modelSurface=null;
modelImage.onload=()=>{const c=document.createElement('canvas');c.width=modelImage.naturalWidth;c.height=modelImage.naturalHeight;const p=c.getContext('2d',{willReadFrequently:true});p.drawImage(modelImage,0,0);const im=p.getImageData(0,0,c.width,c.height),d=im.data;for(let j=0;j<d.length;j+=4){const excess=Math.min(d[j],d[j+2])-d[j+1];if(excess>90&&d[j]>150&&d[j+2]>150)d[j+3]=Math.round(d[j+3]*(1-Math.min(1,(excess-90)/60)))}p.putImageData(im,0,0);modelSurface=c;updateSummary();};
modelImage.onerror=artworkFailed;
modelImage.src=window.SneakyCatAssets["model-original"];
const drawnWalkImage=new Image();let drawnWalkSurface=null;
drawnWalkImage.onload=()=>{const c=document.createElement('canvas');c.width=drawnWalkImage.naturalWidth;c.height=drawnWalkImage.naturalHeight;const p=c.getContext('2d',{willReadFrequently:true});p.drawImage(drawnWalkImage,0,0);const im=p.getImageData(0,0,c.width,c.height),d=im.data;for(let j=0;j<d.length;j+=4){const excess=Math.min(d[j],d[j+2])-d[j+1];if(excess>90&&d[j]>150&&d[j+2]>150)d[j+3]=Math.round(d[j+3]*(1-Math.min(1,(excess-90)/60)))}p.putImageData(im,0,0);drawnWalkSurface=c;updateSummary();};
drawnWalkImage.onerror=artworkFailed;
drawnWalkImage.src=window.SneakyCatAssets["walk-hand-drawn"];
const canvas=$('scene'),ctx=canvas.getContext('2d');
const slots=[{"label": "Music", "name": "sneakycat.mp3", "src": window.SneakyCatAssets["sneakycat"]}, {"label": "Stab 1", "name": "stab1.mp3", "src": window.SneakyCatAssets["stab1"]}, {"label": "Stab 2", "name": "stab2.mp3", "src": window.SneakyCatAssets["stab2"]}, {"label": "Stab 3", "name": "stab3.mp3", "src": window.SneakyCatAssets["stab3"]}];
let track=.06,direction=1,turnTime=-1,gaitDistance=0;
let gameElapsed=0,photoSession=null,eventSerial=0,flashAmount=0,cameraZoom=1,cameraTX=0,cameraTY=0;
let running=false,paused=false,silent=false,phase='walk',phaseTime=0,walkTime=0,nextLook=12,looks=0,lookMix=0,lastStab=-1,activeStab=null,toastTimer,starting=false;
slots.forEach(s=>{s.audio=new GameAudio();s.audio.preload='auto';s.audio.loop=false;s.ready=false});
function artworkReady(){return !!(shapesReady()&&partnersReady()&&drawnWalkSurface&&spriteSurface&&modelSurface&&bg.complete&&bg.naturalWidth&&!artworkError)}
function artworkFailed(){artworkError=true;updateSummary()}
function updateSummary(){
 const audioReady=slots.every(s=>s.ready),audioError=slots.some(s=>s.audio.error);
 $('choosePosesBtn').disabled=!appReady||!artworkReady()||menuBrowsing||starting||transitioning||running;
 $('soundSummary').textContent=artworkError?'Artwork could not load. Reload the game to try again.':audioError?'Audio could not load. Reload the game to try again.':!audioReady?'Loading music and sounds…':!artworkReady()?'Preparing the cat and scenery…':'';
 $('startBtn').disabled=!(appReady&&audioReady&&artworkReady())||menuBrowsing||starting||transitioning||running;
}
function loadSounds(){slots.forEach((s,i)=>{const a=s.audio;s.ready=false;a.loop=false;a.oncanplay=()=>{s.ready=true;updateSummary();volume()};a.onerror=()=>{s.ready=false;$('soundSummary').textContent='Audio could not load. Reload the game to try again.';$('startBtn').disabled=true;if(running)pauseGame('Audio could not play. Reload the game to try again.')};a.onended=()=>{if(i===0&&slots[0].audio===a)requestRoundEnding()};a.src=s.src;a.load()})}

function notify(t){clearTimeout(toastTimer);$('toast').textContent=t;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,6500)}
function timing(){return (10+Math.random()*10)/1.2}
function volume(){slots[0].audio.volume=.8;slots.slice(1).forEach(s=>s.audio.volume=.9)}
function cue(title,text,freeze=false){$('cueTitle').textContent=title;$('cueText').textContent=text;$('cue').className='visible'+(freeze?' freeze':'')}
let transitionEpoch=0,transitioning=false;
let instructionSkipRequested=false,instructionHoldResolve=null;
function skipInstructions(){if(!transitioning||$('gameInstructions').hidden)return;instructionSkipRequested=true;$('beginInstructionsBtn').disabled=true;instructionHoldResolve?.()}
$('beginInstructionsBtn').onclick=skipInstructions;
function instructionDelay(ms){if(instructionSkipRequested)return Promise.resolve();return new Promise(resolve=>{let timer;const finish=()=>{clearTimeout(timer);if(instructionHoldResolve===finish)instructionHoldResolve=null;resolve()};instructionHoldResolve=finish;timer=setTimeout(finish,ms)})}
const sceneDelay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function cancelTransition(){instructionHoldResolve?.();instructionSkipRequested=false;transitionEpoch++;transitioning=false;$('gameInstructions').hidden=true;$('sceneTransition').className='';$('sceneTransition').setAttribute('aria-hidden','true')}
async function coverScene(title,kicker,instructions=false){const epoch=++transitionEpoch;transitioning=true;instructionSkipRequested=false;$('beginInstructionsBtn').disabled=false;$('gameInstructions').hidden=!instructions;$('transitionTitle').textContent=title;$('transitionKicker').textContent=kicker;$('sceneTransition').setAttribute('aria-hidden','false');$('sceneTransition').className='is-visible'+(instructions?' is-instructions':'');await sceneDelay(620);if(instructions&&epoch===transitionEpoch&&!instructionSkipRequested)$('beginInstructionsBtn').focus?.();return epoch===transitionEpoch}
async function revealScene(hold=1800){const epoch=transitionEpoch;if($('gameInstructions').hidden)await sceneDelay(hold);else await instructionDelay(hold);if(epoch!==transitionEpoch)return false;$('sceneTransition').classList.remove('is-visible');await sceneDelay(920);if(epoch!==transitionEpoch)return false;transitioning=false;$('sceneTransition').className='';$('gameInstructions').hidden=true;$('sceneTransition').setAttribute('aria-hidden','true');updateSummary();return true}
async function startGame(demo,options={}){
 if(!appReady||menuBrowsing||starting||running||$('posePicker').open)return false;if(!artworkReady()||(!demo&&!slots.every(s=>s.ready))){updateSummary();notify(artworkError?'Artwork could not load. Reload the game to try again.':'The cat, scenery, and sounds are still loading. Please try again in a moment.');return false}
 if(!$('home').hidden)sessionOptions=Object.freeze({chain:$('homeChain').checked,teacher:$('homePlayMode').value==='teacher',poses:Object.freeze({solo:Object.freeze(poseSelection.solo.slice()),partner:Object.freeze(poseSelection.partner.slice())})});
 cancelPulseWork();cancelGameResume();const token=++roundActionSerial;starting=true;$('startBtn').disabled=true;silent=demo;phase='walk';songFinished=false;finaleTailPlaying=false;volume();
 try{
  // Unlock this embedded music element in the button gesture, then keep the transition silent.
  if(!demo){slots[0].audio.loop=false;slots[0].audio.currentTime=0;const primed=slots[0].audio.play();slots[0].audio.pause();await primed.catch(e=>{if(e.name!=='AbortError')throw e})}
  if(token!==roundActionSerial)return false;
  if(!options.covered&&!await coverScene(sceneInfo().name,options.continueTour?'Let’s sneak':'How to play',!options.continueTour))return false;
  if(token!==roundActionSerial)return false;
  running=false;paused=false;roundFinished=false;roundState='starting';walkResumeEpoch++;resumingWalk=false;gameElapsed=0;
  if(!options.continueTour){resetSceneTour();resetShapeTour()}activeShape=-1;photoSession=null;eventSerial++;flashAmount=0;cameraZoom=1;cameraTX=0;cameraTY=0;clearPhotos();track=.06;direction=1;turnTime=-1;gaitDistance=0;phaseTime=0;walkTime=0;nextLook=timing();looks=0;lookMix=0;activeStab=null;
  $('roundEnd').hidden=true;$('home').hidden=true;$('game').setAttribute('data-menu','false');$('toolbar').hidden=true;$('cue').className='';$('silentLabel').hidden=!silent;$('pauseVeil').hidden=true;$('pauseBtn').textContent='Pause';
  // Use the gameplay composition while revealing, without advancing the song or the cat.
  roundFinished=true;
  if(!await revealScene(options.continueTour?1800:12000)||token!==roundActionSerial)return false;
  roundFinished=false;running=true;roundState='play';
  if(!demo){slots[0].audio.currentTime=0;await slots[0].audio.play()}
  if(token!==roundActionSerial){if(!running)slots[0].audio.pause();return false}
  $('toolbar').hidden=false;cue('SNEAK…','Tiptoe to the music.');
  if(document.hidden)pauseGame();return true;
 }catch(e){if(token===roundActionSerial){slots.forEach(s=>s.audio.pause());running=false;cancelTransition();if(options.continueTour)showRoundComplete();else{roundState='idle';$('home').hidden=false;$('game').setAttribute('data-menu','true')}notify('Music could not start. Press Play again, or reload the game.')}return false}
 finally{if(token===roundActionSerial){starting=false;updateSummary()}}
}
function clearPhotos(){activeShape=-1;photoSession=null;flashAmount=0;$('cameraFlash').style.opacity=0;$('photoBorder').hidden=true;$('photoStrip').hidden=true;$('photoStrip').replaceChildren();}
function readyStabs(){return [1,2,3].filter(i=>slots[i].ready)}
function teacherCanResume(){return phase==='look'&&roundState==='play'&&!songFinished&&(!activeStab||activeStab.ended)&&(!photoSession||photoSession.complete)&&(!ordinaryShapeFreeze()||phaseTime>=SHAPE_HOLD_SECONDS)}
function syncTeacherControls(){const blocked=!running||paused||starting||transitioning||songFinished||!!queuedLook||resumingWalk;for(const id of ['teacherFreezeBtn','teacherSuperBtn']){const button=$(id);if(button.hidden===sessionOptions.teacher)button.hidden=!sessionOptions.teacher;const available=roundState==='play'&&(phase==='walk'||(id==='teacherFreezeBtn'&&teacherCanResume()));const locked=blocked||!available;if(button.disabled!==locked)button.disabled=locked}const label=queuedLook?'On beat 1…':resumingWalk?'Get ready…':phase==='look'?'Resume music':'Freeze';if($('teacherFreezeBtn').textContent!==label)$('teacherFreezeBtn').textContent=label}
function teacherFreeze(superFreeze=false){if(!sessionOptions.teacher||!running||paused||starting||transitioning||roundState!=='play'||songFinished)return;if(phase==='look'){if(!superFreeze&&teacherCanResume())resumeWalk();return}if(phase!=='walk')return;if(superFreeze)triggerLook({forcePhoto:true,teacherSuper:true});else triggerLook();syncTeacherControls()}
function finishTeacherPhoto(){if(roundState!=='super')return;if(photoSession)photoSession.complete=true;activeStab=null;roundState='play';syncTeacherControls()}
function executeLook(options={}){if(!running||paused||phase==='look'||((songFinished||roundState!=='play')&&!options.forcePhoto))return;if(options.teacherSuper)roundState='super';phase='look';eventSerial++;phaseTime=0;looks++;if(!(roundState==='finale'&&finaleTailPlaying))slots[0].audio.pause();volume();const special=options.forcePhoto===true;activeShape=-1;if(special){const pool=readyStabs();for(let j=pool.length-1;j>0;j--){const k=Math.floor(Math.random()*(j+1));[pool[j],pool[k]]=[pool[k],pool[j]]}photoSession={stage:0,queue:[0,1,2].map(i=>pool.length?pool[i%pool.length]:null),age:0,hold:0,pending:false,waiting:false,captured:false};$('photoStrip').replaceChildren();$('photoStrip').hidden=false;$('photoBorder').hidden=false;if(roundState==='finale'){photoSession.partner=choosePartner();prepareSceneTour();beginPhotoShot(0)}else beginPhotoShot(0)}else{photoSession=null;chooseShape();shapeCue();if(!silent){let pool=readyStabs();if(pool.length>1)pool=pool.filter(i=>i!==lastStab);const i=pool[Math.floor(Math.random()*pool.length)];if(i){lastStab=i;activeStab=slots[i].audio;activeStab.currentTime=0;const serial=eventSerial;activeStab.play().catch(()=>{if(serial!==eventSerial)return;activeStab=null;pauseGame('The surprise sound could not play. Press Resume to try again.')})}else pauseGame('The included sounds are not ready. Reload the game to try again.')}}}
function photoCue(){if(showingPartner()){cue('PARTNER POSE FREEZE!',PARTNER_SHAPES[photoSession.partner].name+' — '+(photoSession.stage===2?'Hold your connection!':'Photo '+(photoSession.stage+1)+' of 3'),true);$('cue').className='visible freeze shape-freeze partner-freeze';return}cue('GROUP POSE FREEZE!',photoSession.stage===2?'Superstar! Hold that pose.  3 / 3':'Strike a pose.  '+(photoSession.stage+1)+' / 3',true);$('cue').className='visible freeze group-pose'}
function beginPhotoShot(stage){const p=photoSession;if(!p)return;if(showingPartner()&&stage===0)p.snapCamera=true;$('photoStrip').hidden=false;$('photoBorder').hidden=false;p.stage=stage;p.age=0;p.hold=0;p.pending=false;p.waiting=false;p.captured=false;flashAmount=.85;activeStab=null;photoCue();if(silent)return;let i=p.queue[stage];if(!i||!slots[i].ready)i=readyStabs()[0];if(!i){p.waiting=true;pauseGame('The included surprise sound is not ready. Reload the game to try again.');return}lastStab=i;activeStab=slots[i].audio;activeStab.currentTime=0;p.pending=true;const serial=eventSerial;activeStab.play().then(()=>{if(serial===eventSerial&&photoSession===p)p.pending=false}).catch(()=>{if(serial!==eventSerial||photoSession!==p)return;p.pending=false;p.waiting=true;pauseGame('The surprise sound could not play. Press Resume to try again.')})}
function updatePhotoshoot(dt){
 const p=photoSession;if(!p||p.waiting||p.complete)return;p.age+=dt;
 if(showingPartner()){
  if(p.pending)return;
  // Fire the three photos at a steady pace; sound tails may ring underneath.
  if(p.stage<2&&p.age>=PARTNER_SHOT_INTERVAL){beginPhotoShot(p.stage+1);return}
  if(p.stage===2&&p.age>=PARTNER_FINAL_HOLD_SECONDS&&(silent||!activeStab||activeStab.ended))completeRound();
  return;
 }
 const ended=silent?p.age>=1.25:!p.pending&&activeStab&&activeStab.ended;if(!ended)return;
 if(p.stage<2&&p.age>=1.1)beginPhotoShot(p.stage+1);else if(p.stage===2){p.hold+=dt;if(p.hold>=1.4&&phaseTime>=4){if(roundState==='super')finishTeacherPhoto();else completeRound()}}
}
function capturePhoto(){const p=photoSession;if(!p||p.captured||p.age<(showingPartner()?.15:.24))return;const c=document.createElement('canvas');c.width=240;c.height=135;c.setAttribute('aria-label','Photo '+(p.stage+1));const q=c.getContext('2d');const sw=canvas.width,sh=canvas.height,sourceH=Math.min(sh,sw*9/16),sourceW=sourceH*16/9;q.drawImage(canvas,(sw-sourceW)/2,(sh-sourceH)/2,sourceW,sourceH,0,0,240,135);$('photoStrip').append(c);p.captured=true}
let resumingWalk=false,walkResumeEpoch=0;
async function resumeWalk(){
 if(resumingWalk||!running||paused)return;if(songFinished){beginRoundFinale();return}
 resumingWalk=true;const epoch=++walkResumeEpoch,serial=eventSerial;
 try{
  if(silent){resumingWalk=false;phase='walk';phaseTime=0;nextLook=timing();activeStab=null;clearPhotos();cue('SNEAK…','Tiptoe to the music.');return}
  if(slots[0].audio.ended){resumingWalk=false;requestRoundEnding();beginRoundFinale();return}
  const c=audioClock();await c.resume();if(epoch!==walkResumeEpoch||serial!==eventSerial||!running||paused)return;
  const first=c.currentTime+.10,when=first+BEAT_TIMING.walking_period_seconds*2;
  pulseResume={when,epoch,serial};playCountIn(first);playCountIn(first+BEAT_TIMING.walking_period_seconds);
  cue('GET READY…','Two pulses… then step on ONE.');if(ordinaryShapeFreeze())$('cue').className='visible shape-freeze';
  await slots[0].audio.play(when);
  if(epoch!==walkResumeEpoch||serial!==eventSerial||!running||paused)return;
  finishPulseResume();
 }catch(e){if(epoch===walkResumeEpoch&&running){cancelPulseWork();resumingWalk=false;pauseGame('Music could not resume. Press Resume to try again.')}}
}
function pauseGame(message){if(!running)return;cancelPulseWork();cancelGameResume();if(paused){slots.forEach(s=>s.audio.pause());return;}walkResumeEpoch++;resumingWalk=false;paused=true;flashAmount=0;$('cameraFlash').style.opacity=0;slots.forEach(s=>s.audio.pause());if(activeStab)activeStab.pause();$('pauseVeil').hidden=false;$('pauseBtn').textContent='Resume';cue('PAUSED','Ready when you are.');if(message)notify(message)}
// Async audio completions belong only to the game and pause that requested them.
let gameResumeEpoch=0,resumingGame=false;
function cancelGameResume(){gameResumeEpoch++;resumingGame=false}
async function resumeGame(){
 if(!running||!paused||resumingGame||starting||transitioning||document.hidden)return;
 const epoch=++gameResumeEpoch,action=roundActionSerial,serial=eventSerial;
 const current=()=>epoch===gameResumeEpoch&&action===roundActionSerial&&serial===eventSerial&&running&&paused&&!transitioning&&!document.hidden;
 resumingGame=true;volume();
 try{
  if(!silent){
   if(((!songFinished&&roundState==='play'&&phase==='walk')||(finaleTailPlaying&&roundState==='finale'))&&!slots[0].audio.ended){await slots[0].audio.play();if(!current())return}
   if(activeStab&&!activeStab.ended&&!(photoSession&&photoSession.waiting)){await activeStab.play();if(!current())return}
  }
  if(!current())return;
  paused=false;
  if(photoSession&&photoSession.waiting)beginPhotoShot(photoSession.stage);
  if(paused)return;
  $('pauseVeil').hidden=true;$('pauseBtn').textContent='Pause';
  photoSession?photoCue():phase==='look'?(ordinaryShapeFreeze()?shapeCue():cue('FREEZE!','The cat is watching.',true)):cue('SNEAK…','Tiptoe to the music.');
 }catch(e){if(current()){slots.forEach(s=>s.audio.pause());notify('Audio could not resume. Press Resume to try again.')}}
 finally{if(epoch===gameResumeEpoch)resumingGame=false}
}
function endGame(options={}){cancelPulseWork();cancelGameResume();cancelMenuBrowse();if(!options.covered)cancelTransition();walkResumeEpoch++;resumingWalk=false;roundActionSerial++;starting=false;roundState='idle';songFinished=false;finaleTailPlaying=false;roundFinished=false;$('roundEnd').hidden=true;$('startBtn').disabled=false;pendingSceneTour=null;eventSerial++;if(activeStab)activeStab.pause();clearPhotos();running=false;paused=false;phase='walk';activeStab=null;slots.forEach(s=>{s.audio.pause();if(s.ready)s.audio.currentTime=0});$('home').hidden=false;$('game').setAttribute('data-menu','true');updateHomeMenu();cameraZoom=1;cameraTX=0;cameraTY=0;$('toolbar').hidden=true;$('cue').className='';$('pauseVeil').hidden=true;$('silentLabel').hidden=true;volume();updateSummary()}
$('teacherFreezeBtn').onclick=()=>teacherFreeze();$('teacherSuperBtn').onclick=()=>teacherFreeze(true);
$('startBtn').onclick=()=>startGame(false);$('pauseBtn').onclick=()=>paused?resumeGame():pauseGame();$('endBtn').onclick=returnHome;
$('fullBtn').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if($('game').requestFullscreen)await $('game').requestFullscreen();else notify('Use your browser’s full-screen option.')}catch(e){notify('Use your browser’s full-screen option.')}};document.addEventListener('fullscreenchange',()=>{$('fullBtn').textContent=document.fullscreenElement?'Exit full screen':'Full screen'});
function handleGameKey(e){
 if($('game').dataset.welcome==='true'||!$('welcome').hidden)return;
 if($('posePicker').open)return;
 if(!appReady||menuBrowsing||transitioning||starting||e.repeat||e.ctrlKey||e.altKey||e.metaKey||e.isComposing)return;
 const target=e.target;
 if(target&&(target.isContentEditable||/^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)))return;
 const key=(e.key||'').toLowerCase();
 if(sessionOptions.teacher&&running&&(key==='f'||key==='g')){
  e.preventDefault();teacherFreeze(key==='g');return;
 }
 if(e.code==='Space'&&target?.tagName!=='BUTTON'){
  e.preventDefault();if(running)paused?resumeGame():pauseGame();else startGame(false);
 }
}
document.addEventListener('keydown',handleGameKey);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGame()});
let width=1280,height=720,previous=0,ambientTime=0;
function resize(){const r=canvas.getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,2);width=r.width;height=r.height;canvas.width=Math.round(width*d);canvas.height=Math.round(height*d);ctx.setTransform(d,0,0,d,0,0)}window.addEventListener('resize',resize);resize();
// Cached, softly feathered cloud wisps; all motion uses the paused-aware scene clock.
function makeCloud(seed){const c=document.createElement('canvas');c.width=640;c.height=180;const q=c.getContext('2d');let state=seed;const rand=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296};for(let i=0;i<95;i++){const x=65+rand()*510,y=83+Math.sin(x/105)*12+(rand()-.5)*38,r=18+rand()*44;const g=q.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(155,188,215,.075)');g.addColorStop(.45,'rgba(107,150,190,.035)');g.addColorStop(1,'rgba(93,139,183,0)');q.fillStyle=g;q.beginPath();q.ellipse(x,y,r,r*.58,0,0,Math.PI*2);q.fill()}return c}
const cloudWisps=[makeCloud(271),makeCloud(804),makeCloud(1948)];
function atmosphereLevel(){return .75}
// Eight intact walk frames, then one watching frame. No image deformation.
const frameRects=[[0, 48, 418, 344], [418, 48, 418, 344], [836, 48, 418, 344], [0, 455, 418, 344], [418, 455, 418, 344], [836, 456, 418, 344], [0, 865, 418, 344], [418, 864, 418, 344], [836, 867, 418, 344]];
// Every walking pose is one complete illustration. There are no limb cutouts,
// skeletal transforms, mesh warps or separate front/rear animation systems.
const drawnWalkRects=[[0.0, 64, 443.5, 352], [443.5, 64, 443.5, 352], [887.0, 64, 443.5, 352], [1330.5, 64, 443.5, 352], [0.0, 471, 443.5, 352], [443.5, 471, 443.5, 352], [887.0, 471, 443.5, 352], [1330.5, 471, 443.5, 352]];
function walkingFrame(){return running?Math.floor(gaitDistance/.23*drawnWalkRects.length)%drawnWalkRects.length:0}
function drawCatFrame(frame,x,y,w,h,flip,pivotScale=1){if(showingPartner()){const p=partnerLayout(h);ctx.drawImage(partnerSprites[photoSession.partner],x-p.w/2,y-p.h,p.w,p.h);return}if(showingShape()){const p=shapeLayout(h);ctx.save();ctx.translate(x,y);ctx.scale(flip,1);ctx.drawImage(shapeSprites[activeShape],-p.w/2,-p.h,p.w,p.h);ctx.restore();return}ctx.save();ctx.translate(x,y);ctx.scale(flip*pivotScale,1);if(photoSession&&photoSession.stage>0&&modelSurface){const index=photoSession.stage-1,pw=h*700/680;ctx.drawImage(modelSurface,index*768+48,168,704,680,-pw/2,-h,pw,h)}else if(frame===8&&spriteSurface){const r=frameRects[8];ctx.drawImage(spriteSurface,r[0],r[1],r[2],r[3],-w/2,-h,w,h)}else if(drawnWalkSurface){const r=drawnWalkRects[walkingFrame()],pw=h*r[2]/r[3];ctx.drawImage(drawnWalkSurface,r[0],r[1],r[2],r[3],-pw/2,-h,pw,h)}ctx.restore()}
function advancePatrol(dt,catW){if(turnTime>=0){turnTime+=dt;if(turnTime>=.48){direction*=-1;turnTime=-1}return}const span=Math.max(1,width-catW*1.3);const distance=catW*.23*dt;const old=track;track=Math.max(0,Math.min(1,track+direction*distance/span));gaitDistance+=Math.abs(track-old)*span/catW;if(track===0||track===1)turnTime=0}
// Exact diatonic rows: C through upper A. Empty slots retain their full spacing.
const ORFF_NOTES=['C','D','E','F','G','A','B','C','D','E','F','G','A'];
const ORFF_ROWS=[
 {id:'left-xylophone',a0:[251,433],b0:[315,462],a1:[493,383],b1:[547,405],metal:false,missing:[]},
 {id:'small-metallophone',a0:[528,448],b0:[563,464],a1:[639,414],b1:[675,431],metal:true,missing:[]},
 {id:'bass-xylophone',a0:[748,377],b0:[708,413],a1:[989,403],b1:[965,431],metal:false,missing:[]},
 {id:'right-metallophone',a0:[1080,451],b0:[1057,481],a1:[1232,478],b1:[1215,502],metal:true,missing:[]},
 {id:'front-xylophone',a0:[517,517],b0:[483,557],a1:[710,531],b1:[694,565],metal:false,missing:[]},
 {id:'pentatonic-xylophone',a0:[872,529],b0:[847,566],a1:[1121,535],b1:[1113,572],metal:false,missing:[3,6,10]}
];
let orffBarSurface=null;
function getOrffBarSurface(){
 if(orffBarSurface)return orffBarSurface;
 const c=document.createElement('canvas');c.width=1672;c.height=941;const p=c.getContext('2d');
 const mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
 function polygon(points,fill){p.beginPath();points.forEach((pt,i)=>i?p.lineTo(...pt):p.moveTo(...pt));p.closePath();p.fillStyle=fill;p.fill()}
 for(const row of ORFF_ROWS){
  const dx=((row.a1[0]+row.b1[0])-(row.a0[0]+row.b0[0]))/24,dy=((row.a1[1]+row.b1[1])-(row.a0[1]+row.b0[1]))/24;
  ORFF_NOTES.forEach((note,i)=>{
   if(row.missing.includes(i))return;
   const a=mix(row.a0,row.a1,i/12),b=mix(row.b0,row.b1,i/12),half=.405;
   const aa=[a[0]-dx*half,a[1]-dy*half],ab=[a[0]+dx*half,a[1]+dy*half],ba=[b[0]-dx*half,b[1]-dy*half],bb=[b[0]+dx*half,b[1]+dy*half];
   const depth=row.metal?2.7:4.3,drop=pt=>[pt[0],pt[1]+depth];
   p.save();p.shadowColor='#140b08aa';p.shadowBlur=2;p.shadowOffsetY=3;
   polygon([aa,ab,bb,ba],row.metal?'#666154':'#2a1916');p.restore();
   polygon([ba,bb,drop(bb),drop(ba)],row.metal?'#6e695e':'#33201e');
   polygon([ab,bb,drop(bb),drop(ab)],row.metal?'#898578':'#462b27');
   const gradient=p.createLinearGradient(a[0],a[1],b[0],b[1]);
   gradient.addColorStop(0,row.metal?'#dbd3ba':'#865044');gradient.addColorStop(.42,row.metal?'#aaa79b':'#643932');gradient.addColorStop(1,row.metal?'#bbb6a6':'#75453a');
   polygon([aa,ab,bb,ba],gradient);
   p.save();p.beginPath();p.moveTo(...aa);p.lineTo(...ab);p.lineTo(...bb);p.lineTo(...ba);p.closePath();p.clip();
   for(let g=0;g<6;g++){const t=(g+.5)/6,from=mix(aa,ab,t),to=mix(ba,bb,t);p.strokeStyle=row.metal?'rgba(246,240,216,.14)':'rgba(34,17,12,.17)';p.lineWidth=.45;p.beginPath();p.moveTo(...from);p.lineTo(...to);p.stroke()}
   p.restore();p.strokeStyle=row.metal?'#ede4c388':'#c1906a88';p.lineWidth=.6;p.beginPath();p.moveTo(...aa);p.lineTo(...ab);p.lineTo(...bb);p.stroke();
   for(const t of [.17,.82]){const pin=mix(a,b,t);p.fillStyle='#241f1b';p.beginPath();p.ellipse(pin[0],pin[1],row.metal?.85:.95,.65,0,0,Math.PI*2);p.fill();p.fillStyle='#d7c4a4';p.fillRect(pin[0]-.25,pin[1]-.35,.5,.35)}
   if(row.id==='pentatonic-xylophone'){const at=mix(a,b,.60);p.font='bold 4px Georgia';p.textAlign='center';p.fillStyle='#eed5a8';p.fillText(note,at[0],at[1])}
  });
 }
 orffBarSurface=c;return c;
}

// Small cached silhouette glows keep the finale effect off the main rendering workload.
// The closing invitation follows the music clock, so Pause holds it in place.
function finaleMusicTime(){return Math.min(BEAT_TIMING.finale_hit_seconds,Number.isFinite(slots[0].audio.duration)?slots[0].audio.duration:Infinity)}
function selfieIntroStart(){return Math.max(0,finaleMusicTime()-4*BEAT_TIMING.walking_period_seconds)}
function selfieIntroState(){
 if(!running||transitioning||roundState!=='play'||phase!=='walk'||photoSession||songFinished)return null;
 const t=silent?walkTime:slots[0].audio.currentTime,start=selfieIntroStart();
 if(t<start||t>=finaleMusicTime())return null;
 return {age:t-start,opacity:Math.min(1,Math.max(0,(t-start-.35)/.4))};
}
function drawCheeseBubble(intro){
 if(!intro||intro.opacity<=0)return;
 const font=Math.max(20,Math.min(48,width*.048,height*.072)),w=font*6.6,h=font*1.65,left=(width-w)/2,top=Math.max(18,height*.15),r=font*.42;
 ctx.save();ctx.globalAlpha=intro.opacity;ctx.translate(0,(1-intro.opacity)*12);
 ctx.beginPath();ctx.moveTo(left+r,top);ctx.lineTo(left+w-r,top);ctx.quadraticCurveTo(left+w,top,left+w,top+r);ctx.lineTo(left+w,top+h-r);ctx.quadraticCurveTo(left+w,top+h,left+w-r,top+h);ctx.lineTo(width*.5+font*.5,top+h);ctx.lineTo(width*.5-font*.15,top+h+font*.55);ctx.lineTo(width*.5-font*.05,top+h);ctx.lineTo(left+r,top+h);ctx.quadraticCurveTo(left,top+h,left,top+h-r);ctx.lineTo(left,top+r);ctx.quadraticCurveTo(left,top,left+r,top);ctx.closePath();
 ctx.fillStyle='#fff8e6';ctx.fill();ctx.strokeStyle='#553b30';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#352922';ctx.font='italic bold '+font+'px Georgia, serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('Say Cheese!',width/2,top+h*.51);ctx.restore();
}

let depthMix=0;
function sceneBackdropFrame(sx,sy,sw,sh,floor){
 if(menuSlide||(!running&&!roundFinished))return {x:sx,y:sy,w:sw,h:sh};
 const rail=sceneRail(),zoom=Math.max(.01,cameraZoom),railOnScreen=cameraTY+zoom*floor;
 const scale=Math.max(1+.12*lookMix,(width+2)/(zoom*sw),(railOnScreen+1)/(zoom*sh*rail),(height-railOnScreen+1)/(zoom*sh*(1-rail)));
 const w=sw*scale,h=sh*scale,left=-cameraTX/zoom,right=(width-cameraTX)/zoom;
 return {x:Math.max(right-w,Math.min(left,(width-w)/2)),y:floor-h*rail,w,h};
}

function render(now){finishPulseResume();syncTeacherControls();const dt=Math.min((now-previous)/1000||0,.06);previous=now;if(!paused)ambientTime+=dt;if(menuSlide)menuSlide.age+=dt;
if(running&&!paused&&!transitioning){gameElapsed+=dt;phaseTime+=dt;if(roundState==='play'){
 const musicalPosition=silent?walkTime:slots[0].audio.currentTime;
 if(phase==='walk'&&musicalPosition>=finaleMusicTime())requestRoundEnding(true);
 else if(!silent&&slots[0].audio.ended)requestRoundEnding();
 if(songFinished)beginRoundFinale();
 if(roundState==='play'&&!songFinished){if(phase==='walk'){walkTime+=dt;if(silent&&queuedLook&&walkTime>=queuedLook.target){const ticket=queuedLook;queuedLook=null;walkTime=ticket.target;executeLook(ticket.options)}if(phase==='walk'&&!selfieIntroState()){const sceneH=Math.max(height,width/(1672/941));advancePatrol(dt,Math.min(sceneH*.33,width*.40)*1.23);if(!sessionOptions.teacher&&phaseTime>=nextLook)triggerLook()}}else if(!sessionOptions.teacher&&phaseTime>=shapeAutoReleaseTime()&&(!activeStab||activeStab.ended))resumeWalk()}
 }else if(roundState==='finale'||roundState==='super')updatePhotoshoot(dt)}
const selfieIntro=selfieIntroState();if(!running||menuSlide)depthMix=0;else if(!paused){const focusTarget=(phase==='look'||selfieIntro)?(showingPartner()?1:.78):0;depthMix+=(focusTarget-depthMix)*(1-Math.exp(-dt*7))}if(selfieIntro)$('cue').className='';const target=running&&(phase==='look'||selfieIntro)?1:0;if(!paused){lookMix+=(target-lookMix)*(1-Math.exp(-dt*10));flashAmount=Math.max(0,flashAmount-dt*5.5)}$('cameraFlash').style.opacity=flashAmount;
const ratio=1672/941,sh=Math.max(height,width/ratio),sw=sh*ratio,sx=(width-sw)/2,sy=(height-sh)/2,catH=Math.min(sh*((running||roundFinished)?.33:.25),width*.40),catW=catH*1.23,floor=sy+sh*sceneRail(),span=Math.max(1,width-catW*1.3),x=(running||roundFinished)?catW*.65+track*span:width*.51;
const turning=turnTime>=0,progress=turning?Math.min(1,turnTime/.48):0,flip=turning?(progress<.5?direction:-direction):direction,pivotScale=turning&&phase!=='look'&&!selfieIntro?.85+.15*Math.abs(Math.cos(progress*Math.PI)):1;
let z=1+lookMix*.10,tx=(1-z)*width*(.22+track*.56),ty=(1-z)*height*.58;if(showingShape()){const p=shapeLayout(catH);z=Math.min(2.3,height*SHAPES[activeShape].screen/p.h,width*.76/p.w);tx=width*.5-x*z;ty=height*.58-(floor-p.h*.5)*z}if(selfieIntro){z=3.2;const faceX=x+flip*catW*.24,faceY=floor-catH*.73;tx=width*.50-faceX*z;ty=height*.55-faceY*z}if(photoSession){const stage=photoSession.stage;z=(roundState==='super'?[1.16,1.44,1.82]:[3.2,3.35,3.5])[stage];const faceX=x+flip*catW*(stage===0?.24:.25),faceY=floor-catH*.73;tx=width*.50-faceX*z;ty=height*.48-faceY*z}if(showingPartner()){const p=partnerLayout(catH);z=Math.min(2.3,height*[.53,.56,.59][photoSession.stage]/p.h,width*.78/p.w);tx=width*.5-x*z;ty=height*.57-(floor-p.h*.5)*z;if(photoSession.snapCamera){cameraZoom=z;cameraTX=tx;cameraTY=ty;photoSession.snapCamera=false}}if(!paused){const ease=1-Math.exp(-dt*10);cameraZoom+=(z-cameraZoom)*ease;cameraTX+=(tx-cameraTX)*ease;cameraTY+=(ty-cameraTY)*ease}
ctx.clearRect(0,0,width,height);ctx.save();ctx.translate(cameraTX,cameraTY);ctx.scale(cameraZoom,cameraZoom);
const backdrop=sceneBackdropFrame(sx,sy,sw,sh,floor);
function paintMenuBackdrop(im,offset=0){if(!im.complete||!im.naturalWidth)return;ctx.save();if(menuSlide){ctx.beginPath();ctx.rect(offset,0,width,height);ctx.clip()}const r=menuSlide?{x:sx,y:sy,w:sw,h:sh}:backdrop;window.SneakyCatDepth.prepare(im,SCENES.find(s=>sceneCache[s.id]===im)||sceneInfo(),im===sceneCache['music-classroom']?getOrffBarSurface():null);ctx.drawImage(im,offset+r.x,r.y,r.w,r.h);if(im===sceneCache['music-classroom'])ctx.drawImage(getOrffBarSurface(),offset+r.x,r.y,r.w,r.h);ctx.restore()}

if(menuSlide){const slide=menuSlide;const t=Math.max(0,Math.min(1,(slide.age-slide.fadeOut)/slide.duration)),ease=t*t*t*(t*(t*6-15)+10);paintMenuBackdrop(slide.from,-slide.direction*ease*width);paintMenuBackdrop(slide.to,slide.direction*(1-ease)*width);if(slide.age>=slide.fadeOut+slide.duration+slide.fadeIn&&!slide.finished){slide.finished=true;slide.resolve(true)}}else{paintMenuBackdrop(bg);drawCityAtmosphere(backdrop.x,backdrop.y,backdrop.w,backdrop.h);if(depthMix>.005){const soft=window.SneakyCatDepth.prepare(bg,sceneInfo(),currentScene==='music-classroom'?getOrffBarSurface():null);if(soft){ctx.save();ctx.globalAlpha=depthMix;ctx.drawImage(soft,backdrop.x,backdrop.y,backdrop.w,backdrop.h);ctx.restore()}}}

const frame=selfieIntro||((running||roundFinished)&&phase==='look')?8:0;ctx.save();ctx.globalAlpha*=menuCatOpacity();ctx.save();ctx.fillStyle='#03101a75';ctx.filter='blur(5px)';ctx.beginPath();ctx.ellipse(x,floor+4,showingPartner()?partnerLayout(catH).w*.4:catW*.30,catH*.022,0,0,Math.PI*2);ctx.fill();ctx.restore();drawCatFrame(frame,x,floor,catW,catH,flip,pivotScale);ctx.restore();ctx.restore();
if(lookMix>.01){const g=ctx.createRadialGradient(width/2,height/2,height*.3,width/2,height/2,Math.max(width,height)*.7);g.addColorStop(0,'#050c1600');g.addColorStop(1,'rgba(5,12,22,'+lookMix*.55+')');ctx.fillStyle=g;ctx.fillRect(0,0,width,height)}drawCheeseBubble(selfieIntro);capturePhoto();requestAnimationFrame(render)}
const SCENES=window.SneakyCatLevels;
$('chainLevelLabel').textContent='Chain all '+SCENES.length+' levels';
let currentScene='albuquerque',sceneLoadSerial=0;
const sceneCache={albuquerque:bg};
function sceneRail(){if(!menuSlide)return sceneInfo().rail||.689;return menuSlide.age>=menuSlide.fadeOut+menuSlide.duration?menuSlide.toRail:menuSlide.fromRail}
function menuCatOpacity(){if(!menuSlide||running||$('home').hidden)return 1;const s=menuSlide,smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};if(s.age<s.fadeOut)return 1-smooth(s.age/s.fadeOut);return smooth((s.age-s.fadeOut-s.duration)/s.fadeIn)}
function sceneInfo(){return SCENES.find(s=>s.id===currentScene)}
function updateScenePreview(){const s=sceneInfo();canvas.setAttribute('aria-label',s.ariaLabel||(s.id==='music-classroom'?'Sneaky Cat walks along a wooden cabinet ledge in an Orff music classroom.':s.id==='arcade'?'Sneaky Cat walks along a fence beside an inner-city arcade at sunset.':s.id==='roblox'?'Sneaky Cat walks along a smooth wall overlooking a Brookhaven RP-inspired neighborhood at sunset.':s.id==='minecraft'?'Sneaky Cat walks along a stone-brick wall overlooking a Minecraft-inspired valley at sunset.':s.id==='fortnite'?'Sneaky Cat walks along a brick wall overlooking a Fortnite-inspired island at sunset.':(s.id==='chicago'||s.id==='memphis')?'Sneaky Cat walks along a riverside ledge at sunset in '+s.name+'.':'Sneaky Cat walks along a moonlit ledge in '+s.name+'.'));updateHomeMenu()}
function makeLight(rgb){const c=document.createElement('canvas');c.width=c.height=80;const q=c.getContext('2d'),g=q.createRadialGradient(40,40,0,40,40,40);g.addColorStop(0,'rgba('+rgb+',.75)');g.addColorStop(.13,'rgba('+rgb+',.38)');g.addColorStop(.45,'rgba('+rgb+',.09)');g.addColorStop(1,'rgba('+rgb+',0)');q.fillStyle=g;q.fillRect(0,0,80,80);return c}
const cityLights={gold:makeLight('255,202,103'),cyan:makeLight('82,222,255'),pink:makeLight('255,103,192'),firefly:makeLight('242,240,156')};
function cityGlow(x,y,r,type,alpha){ctx.globalAlpha=alpha;ctx.drawImage(cityLights[type],x-r,y-r,r*2,r*2)}
function drawCityAtmosphere(sx,sy,sw,sh){const level=atmosphereLevel();if(!level&&currentScene!=='rainy-london')return;const t=ambientTime;ctx.save();ctx.translate(sx,sy);ctx.scale(sw/1672,sh/941);
 window.SneakyCatScenery.draw(ctx,currentScene,t,level);
 const extra=sceneInfo();
 if(extra.lights){
  // Cached glow sprites remain fixed to lights painted into each backdrop.
  extra.lights.forEach(([x,y,r],i)=>cityGlow(x,y,r,extra.lightColor||'gold',level*(.08+.018*Math.sin(t*.7+i*1.4))));
  const pool=extra.reflections;
  if(pool)for(let i=0;i<24;i++){
   ctx.globalAlpha=level*(.035+.018*Math.sin(t*.7+i*1.3));ctx.fillStyle='#ffdc99';
   ctx.fillRect(pool.x+(i*61)%pool.width+Math.sin(t*.4+i),pool.y+(i%pool.rows)*9,3+i%4*2,.8);
  }
 }else if(currentScene==='new-orleans'){
  const lamps=[[210,217,76],[294,506,48],[441,480,34],[661,422,32],[1444,571,58],[1625,558,35]];
  lamps.forEach(([x,y,r],i)=>cityGlow(x,y,r,'gold',level*(.22+.07*Math.sin(t*1.8+i*2)+.025*Math.sin(t*4.1+i))));
  for(let i=0;i<7;i++){const x=70+(i*247)%1540+Math.sin(t*.34+i)*14,y=360+(i*53)%270+Math.cos(t*.41+i*2)*12;cityGlow(x,y,7,'firefly',level*.48*Math.pow((1+Math.sin(t*.8+i*2))/2,2))}
 }else if(currentScene==='san-francisco'){
  // Two cached feathered wisps move slowly over the distant bay.
  for(let i=0;i<3;i++){const u=(t/(130+i*41)+i*.3)%1;ctx.globalAlpha=level*.70*Math.pow(Math.sin(Math.PI*u),2);ctx.drawImage(cloudWisps[i],260+u*850,341+i*19,640,112)}
  // Small warm reflection strokes stay within open water.
  for(let i=0;i<20;i++){ctx.globalAlpha=level*(.07+.12*(1+Math.sin(t*.9+i))/2);ctx.fillStyle='#e9c18d';const x=1040+(i%4)*112+Math.sin(i*4.1)*14,y=451+Math.floor(i/4)*10;ctx.fillRect(x+Math.sin(t*.3+i)*4,y,8+(i%3)*6,.9)}
 }else if(currentScene==='paris'){
  cityGlow(196,201,75,'gold',level*(.22+.06*Math.sin(t*1.4)));
  // Fine slow twinkles follow the silhouette of the painted tower.
  for(let i=0;i<23;i++){const y=191+i*10.2,spread=3+Math.pow((y-180)/250,2)*54,x=1261+Math.sin(i*2.399)*spread,a=level*.70*Math.pow((1+Math.sin(t*1.3+i*2.4))/2,9);cityGlow(x,y,4,'gold',a)}
  for(let i=0;i<15;i++){ctx.globalAlpha=level*(.05+.15*(1+Math.sin(t*.7+i*2))/2);ctx.fillStyle='#ffd79e';ctx.fillRect(968+(i%5)*52+Math.sin(i*3)*6,508+Math.floor(i/5)*15,6+i%4*3,1)}
 }else if(currentScene==='state-fair'){
  // A gentle traveling glow follows the wheel bulbs; the painted ride stays intact.
  for(let i=0;i<42;i++){const a=i*Math.PI*2/42,x=1225+174*Math.cos(a),y=354+192*Math.sin(a);if(y>505)continue;cityGlow(x,y,7,'gold',level*(.12+.46*Math.pow((1+Math.sin(i*.65-t*.65))/2,4)))}
  for(let i=0;i<11;i++)cityGlow(359+i*29,497+Math.sin(i*1.4)*7,10,'gold',level*(.10+.20*(1+Math.sin(t*.7+i*.5))/2));
  cityGlow(667,316,23,'pink',level*(.13+.09*Math.sin(t*.6)));
 }else if(currentScene==='albuquerque'){
  // Warm candle glow follows the farolitos painted on the adobe rooftops.
  [[309,521],[345,521],[382,522],[326,581],[369,582],[426,582],[464,580],[671,560],[714,560],[857,589],[1388,580],[1431,581],[1476,581]].forEach(([x,y],i)=>cityGlow(x,y,10,'gold',level*(.15+.12*(1+Math.sin(t*1.8+i*1.7))/2)));
  [[1364,487,12],[1428,479,28],[1520,486,20]].forEach(([x,y,r],i)=>cityGlow(x,y,r,'gold',level*(.08+.32*Math.pow((1+Math.sin(t*.45+i*2))/2,3))));
  const u=(t/170)%1;ctx.globalAlpha=level*.22*Math.sin(Math.PI*u);ctx.drawImage(cloudWisps[0],410+u*420,185,610,90);
 }else if(currentScene==='midnight-jazz-club'){
  // Cached glow textures keep the neon soft and inexpensive to animate.
  cityGlow(1562,335,65,'cyan',level*(.17+.09*(1+Math.sin(t*.65))/2));
  cityGlow(1604,308,37,'pink',level*(.14+.08*(1+Math.sin(t*.65+1.2))/2));
  for(let i=0;i<16;i++)cityGlow(1015+i*27.6,357-i*5.0,8,'gold',level*(.10+.14*(1+Math.sin(t*.8+i*.45))/2));
  [[1146,487,24],[1267,469,23],[1489,480,26]].forEach(([x,y,r],i)=>cityGlow(x,y,r,'gold',level*(.15+.05*Math.sin(t*1.1+i))));
 }else if(currentScene==='arcade'){
  // Small warm bulbs complement the natural sunset palette.
  [[319,275,10],[395,289,10],[473,385,10],[584,401,10],[408,454,22],[151,126,32],[1104,367,20],[1554,402,22]].forEach(([x,y,r],i)=>cityGlow(x,y,r,'gold',level*(.07+.025*(1+Math.sin(t*.6+i*1.4))/2)));
 }else if(currentScene==='las-vegas'){
  cityGlow(78,285,18,'gold',level*(.20+.05*Math.sin(t*.7)));
  const bulbs=[[27,360],[55,337],[88,324],[123,321],[159,342],[194,362],[185,385],[145,407],[110,419],[67,397],[34,377]];
  bulbs.forEach(([x,y],i)=>cityGlow(x,y,7,'gold',level*(.12+.20*Math.pow((1+Math.sin(t*1.2-i*.65))/2,3))));
  for(let i=0;i<24;i++){const a=i*Math.PI*2/24;cityGlow(1180+65*Math.cos(a),466+91*Math.sin(a),6,'cyan',level*(.12+.18*(1+Math.sin(t*.75-i*.35))/2))}
  cityGlow(1435,386,15,'cyan',level*(.16+.04*Math.sin(t*.45)));
  for(let i=0;i<22;i++){ctx.globalAlpha=level*(.08+.13*(1+Math.sin(t*.9+i*1.7))/2);ctx.fillStyle=i%3?'#ffdfa0':'#a8d9ee';ctx.fillRect(602+(i*71)%421+Math.sin(t*.7+i)*3,591+(i%5)*4,5+i%4*3,.9)}
 }else if(currentScene==='grand-canyon'){
  // Warm sunset reflections stay fixed to the painted river.
  [[1014,491,10],[1054,505,8],[971,543,12],[945,557,8],[986,588,9]].forEach(([x,y,r],i)=>cityGlow(x,y,r,'gold',level*(.055+.035*Math.sin(t*.7+i*1.8))));
 }else if(currentScene==='ukraine'){
  [[278,250,12],[366,405,13],[504,558,12],[952,563,8],[1324,608,8],[1399,456,13],[1562,456,13]].forEach(([x,y,r],i)=>cityGlow(x,y,r,'gold',level*(.09+.022*Math.sin(t*.65+i*1.4))));
  // Dnipro reflections between the bridge and the foreground treetops.
  for(let i=0;i<18;i++){const x=1009+(i*43)%215,y=489+(i%6)*8;ctx.globalAlpha=level*(.05+.025*Math.sin(t*.8+i*1.3));ctx.fillStyle='#ffdb8c';ctx.fillRect(x+Math.sin(t*.5+i)*1.5,y,3+i%3*2,.8)}
 }else if(currentScene==='chicago'){
  // Slow, small glows remain anchored to the painted Riverwalk lamps.
  [[337,330,14],[517,425,12],[584,432,10],[1066,443,10],[1273,439,12],[1580,466,13]].forEach(([x,y,r],i)=>cityGlow(x,y,r,'gold',level*(.10+.025*Math.sin(t*.75+i*1.6))));
  for(let i=0;i<28;i++){const x=560+(i*61)%580,y=558+(i%7)*11;ctx.globalAlpha=level*(.045+.025*Math.sin(t*.8+i*1.3));ctx.fillStyle='#ffdc99';ctx.fillRect(x+Math.sin(t*.5+i)*1.2,y,4+i%4*3,.9)}
 }else if(currentScene==='memphis'){
  // Gentle blues-club light and Mississippi shimmer; the glass pyramid stays crisp.
  [[53,178,35],[271,274,36],[332,496,22],[584,502,16]].forEach(([x,y,r],i)=>cityGlow(x,y,r,'gold',level*(.09+.025*Math.sin(t*.7+i*1.4))));
  for(let i=0;i<25;i++){const x=889+(i*73)%680,y=533+(i%8)*12;ctx.globalAlpha=level*(.045+.022*Math.sin(t*.7+i*1.5));ctx.fillStyle='#ffda91';ctx.fillRect(x+Math.sin(t*.4+i)*1.2,y,4+i%3*3,.8)}
 }else if(currentScene==='fortnite'){
  // Small cached light textures brighten the distant towers and water gently.
  [[487,187,12],[873,214,12]].forEach(([x,y,r],i)=>cityGlow(x,y,r,'cyan',level*(.12+.04*Math.sin(t*.65+i*2))));
  for(let i=0;i<18;i++){const x=1102+(i*19)%91,y=423+(i%8)*19;ctx.globalAlpha=level*(.045+.025*Math.sin(t*.7+i*1.3));ctx.fillStyle='#ffe0a1';ctx.fillRect(x+Math.sin(t*.4+i),y,4+i%3*3,.8)}
 }else if(currentScene==='roblox'){
  [[550,209,23],[743,352,15],[1026,356,16],[1092,355,16]].forEach(([x,y,r],i)=>cityGlow(x,y,r,'gold',level*(.07+.014*Math.sin(t*.65+i*1.4))));
 }else if(currentScene==='minecraft'){
  [[344,403,13],[437,397,12],[642,435,12],[718,443,12],[525,336,10],[993,483,10],[1142,486,10]].forEach(([x,y,r],i)=>cityGlow(x,y,r,'gold',level*(.085+.022*Math.sin(t*1.3+i*1.7))));
  for(let i=0;i<12;i++){const x=1194+(i*13)%43,y=408+(i%6)*15;ctx.globalAlpha=level*(.04+.017*Math.sin(t*.65+i*1.3));ctx.fillStyle='#ffdda0';ctx.fillRect(x,y,3+i%3*3,1)}
 }else if(currentScene==='music-classroom'){
  [[123,113,55],[814,225,28]].forEach(([x,y,r],i)=>cityGlow(x,y,r,'gold',level*(.06+.01*Math.sin(t*.6+i))));
 }else if(currentScene==='skatepark'){
  [[100,270,24],[425,275,24],[780,310,23],[1129,314,19],[1360,255,24],[1589,185,29]].forEach(([x,y,r],i)=>cityGlow(x,y,r,'gold',level*(.16+.025*Math.sin(t*.8+i*2))));
  [[335,100,31],[1065,218,24]].forEach(([x,y,r])=>cityGlow(x,y,r,'cyan',level*.10));
 }else if(currentScene==='rainy-london'){
  [[430,440,36],[382,456,24],[1217,616,17]].forEach(([x,y,r],i)=>cityGlow(x,y,r,'gold',level*(.13+.04*Math.sin(t*.9+i))));
  drawLondonRain(t,.75);
 }else if(currentScene==='tokyo'){
  [[833,474,42,'cyan'],[853,520,32,'cyan'],[915,484,30,'pink'],[1020,608,38,'pink'],[817,550,26,'pink'],[157,266,72,'gold']].forEach(([x,y,r,c],i)=>cityGlow(x,y,r,c,level*(.18+.13*(1+Math.sin(t*.7+i*1.3))/2)));
  for(let i=0;i<9;i++){const u=(t/(32+i*1.7)+i*.113)%1,x=280+u*960+Math.sin(u*12+i)*36,y=90+u*530;ctx.save();ctx.translate(x,y);ctx.rotate(t*.35+i);ctx.globalAlpha=level*.5*Math.min(1,u*12,(1-u)*12);ctx.fillStyle=i%2?'#d8abd2':'#efc2d9';ctx.beginPath();ctx.ellipse(0,0,2.8,1.5,0,0,Math.PI*2);ctx.fill();ctx.restore()}
 }
 ctx.restore();
}
updateScenePreview();

// A chain is one finite tour: each scene is completed once, then Game over.
let sceneTourBag=[],pendingSceneTour=null,completedScenes=new Set();
function shuffleScenes(ids){for(let i=ids.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]]}return ids}
function resetSceneTour(){completedScenes.clear();pendingSceneTour=null;sceneTourBag=shuffleScenes(SCENES.map(s=>s.id).filter(id=>id!==currentScene))}
function prepareSceneTour(force=false){
 if(!force&&!chainRounds())return null;if(pendingSceneTour)return pendingSceneTour;
 if(!sceneTourBag.length)return null;
 const id=sceneTourBag[0],ticket={id,promise:null};pendingSceneTour=ticket;
 ticket.promise=new Promise((resolve,reject)=>{if(sceneCache[id]){resolve(sceneCache[id]);return}const im=new Image();im.onload=()=>{sceneCache[id]=im;resolve(im)};im.onerror=()=>reject(new Error('Background unavailable'));im.src=SCENES.find(s=>s.id===id).src});
 ticket.promise.catch(()=>{});return ticket;
}
resetSceneTour();

// Three batched rain passes give depth without per-drop filters or image allocations.
const londonRainLayers=[{count:175,speed:245,length:16,width:.8,alpha:.29},{count:105,speed:420,length:28,width:1.15,alpha:.42},{count:48,speed:690,length:40,width:1.6,alpha:.56}];
function drawLondonRain(t,level){
 if(level<=0)return;ctx.save();ctx.globalAlpha=1;ctx.lineCap='round';
 londonRainLayers.forEach((layer,depth)=>{ctx.strokeStyle='rgba(191,216,235,'+layer.alpha*level+')';ctx.lineWidth=layer.width;ctx.beginPath();const count=Math.ceil(layer.count*(.35+.65*level));
  for(let i=0;i<count;i++){const seed=i*1.61803398875+depth*17.43,phase=(Math.sin(seed*78.23)*43758.5453)%1,offset=(Math.sin(seed*12.91)*12741.287)%1,x=((offset+1)*1832-t*layer.speed*.115)%1832,y=(((phase+1)*1041+t*layer.speed*(.88+(i%7)*.035))%1041)-50,xx=(x+1832)%1832-80,len=layer.length*(.8+(i%5)*.09);ctx.moveTo(xx,y);ctx.lineTo(xx-len*.115,y+len)}ctx.stroke();
 });
 // Brief expanding rings sit on the painted wet coping, below the walking paws.
 for(let i=0;i<26;i++){const p=(t*(.95+(i%4)*.17)+i*.371)%1;if(p>.42)continue;const age=p/.42,x=26+(i*149.37)%1620,y=639+(i%4)*3;ctx.globalAlpha=level*(1-age)*.36;ctx.strokeStyle='#c0dcef';ctx.lineWidth=.65;ctx.beginPath();ctx.ellipse(x,y,1+age*5,.35+age*1.25,0,0,Math.PI*2);ctx.stroke()}
 ctx.restore();
}

let roundState='idle',songFinished=false,roundFinished=false,roundActionSerial=0,finaleTailPlaying=false;
function chainRounds(){return sessionOptions.chain}
function requestRoundEnding(musicalHit=false){if(!running||roundState!=='play'||songFinished)return;songFinished=true;finaleTailPlaying=musicalHit&&!silent&&!slots[0].audio.ended;if(!finaleTailPlaying)slots[0].audio.pause();}
function beginRoundFinale(){if(!running||paused||roundState!=='play'||!songFinished)return;if(activeStab&&!activeStab.ended&&!silent)return;activeStab=null;roundState='finale';phase='walk';triggerLook({forcePhoto:true})}
function showRoundComplete(){
 roundState='over';roundFinished=true;running=false;paused=false;const finishedTour=chainRounds()&&completedScenes.size===SCENES.length;
 $('roundEndTitle').textContent=finishedTour?'What a night!':'Superstar finish!';
 $('roundEndText').textContent=finishedTour?'All '+SCENES.length+' places. One sneaky superstar.':sceneInfo().name+' · Great sneaking. Great freezing.';
 $('roundEnd').hidden=false;$('nextRoundBtn').textContent=finishedTour?'Choose a level':'Next place';$('nextRoundBtn').disabled=false;$('replayRoundBtn').disabled=false;
 $('photoStrip').hidden=true;$('photoBorder').hidden=true;$('toolbar').hidden=true;$('cue').className='';$('pauseVeil').hidden=true;$('silentLabel').hidden=true;
}
function completeRound(){
 if(roundState!=='finale')return;cancelPulseWork();eventSerial++;if(photoSession)photoSession.complete=true;slots.forEach(s=>s.audio.pause());if(activeStab)activeStab.pause();activeStab=null;
 completedScenes.add(currentScene);sceneTourBag=sceneTourBag.filter(id=>!completedScenes.has(id));running=false;roundFinished=true;paused=false;$('toolbar').hidden=true;$('cue').className='';
 if(chainRounds()&&sceneTourBag.length){startNextRound()}else{pendingSceneTour=null;showRoundComplete()}
}
async function startNextRound(){
 if(starting||roundState==='between')return false;
 if(!sceneTourBag.length){if(chainRounds()){showRoundComplete();return false}resetSceneTour()}
 const token=++roundActionSerial;roundState='between';$('nextRoundBtn').disabled=true;$('replayRoundBtn').disabled=true;
 const ticket=prepareSceneTour(true);if(!ticket){showRoundComplete();return false}
 try{
  const [im,covered]=await Promise.all([ticket.promise,coverScene(SCENES.find(s=>s.id===ticket.id).name,'Next stop')]);
  if(!covered||token!==roundActionSerial||pendingSceneTour!==ticket)return false;
  if(document.hidden){cancelTransition();showRoundComplete();return false}
  ++sceneLoadSerial;bg=im;currentScene=ticket.id;updateScenePreview();pendingSceneTour=null;
  const began=await startGame(silent,{continueTour:true,covered:true});if(began)sceneTourBag=sceneTourBag.filter(id=>id!==ticket.id);else if(roundState!=='idle'&&!running)showRoundComplete();return began;
 }catch(e){if(token!==roundActionSerial)return false;pendingSceneTour=null;cancelTransition();showRoundComplete();notify('The next background could not load. Press Next place to try again.');return false}
}
$('nextRoundBtn').onclick=()=>{if(chainRounds()&&completedScenes.size===SCENES.length)returnHome();else startNextRound()};
$('replayRoundBtn').onclick=()=>startGame(silent);
$('roundHomeBtn').onclick=returnHome;
$('prevLevelBtn').onclick=()=>cycleMenuLevel(-1);$('nextLevelBtn').onclick=()=>cycleMenuLevel(1);$('homeChain').onchange=updateHomeMenu;$('homePlayMode').onchange=updateHomeMenu;

loadShapeSheet(window.SneakyCatAssets["solo-sheet-1"],0);
loadShapeSheet(window.SneakyCatAssets["solo-sheet-2"],1);
loadShapeSheet(window.SneakyCatAssets["solo-sheet-3"],2);
loadShapeSheet(window.SneakyCatAssets["solo-sheet-4"],3);
loadShapeSheet(window.SneakyCatAssets["partner-sheet-1"],4);
loadShapeSheet(window.SneakyCatAssets["partner-sheet-2"],5);
loadSounds();requestAnimationFrame(render);revealOpening();
loadSinglePose(window.SneakyCatAssets["diamond-squat"],"solo",14);
loadSinglePose(window.SneakyCatAssets["lightning-balance"],"solo",15);
loadSinglePose(window.SneakyCatAssets["kneeling-wings"],"solo",16);
loadSinglePose(window.SneakyCatAssets["ready-stance"],"solo",17);
loadSinglePose(window.SneakyCatAssets["linked-balance"],"partner",10);
loadSinglePose(window.SneakyCatAssets["partner-diamond"],"partner",11);
loadSinglePose(window.SneakyCatAssets["seated-connection"],"partner",12);
