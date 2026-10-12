(() => {
 'use strict';
 const button=document.getElementById('beachToggle'),icon=document.getElementById('beachIcon');
 if(!button)return;
 const AudioContext=window.AudioContext||window.webkitAudioContext;
 if(!AudioContext){button.disabled=true;button.setAttribute('aria-pressed','false');button.setAttribute('aria-label','Arcade sound is unavailable in this browser');button.title='Arcade sound is unavailable in this browser';icon.setAttribute('href','#i-sound-off');return;}
 const tracks={beach:'assets/audio/beach-seagulls-loop.wav',night:'assets/audio/weightless-dawn-night.mp3'};
 const positions={beach:0,night:0},levels={beach:.45,night:3};
 // Exactly one media element and one output: changing tracks always pauses the
 // old file first. There is no second audio player or overlapping crossfade.
 let enabled=true,context=null,gain=null,audio=null,selected=null,pageAway=false;
 let starting=false,blocked=false,attempt=0,lastTarget=null,restorePosition=false;
 let timer=0,suspendTimer=0,errorTimer=0;
 function available(){return enabled&&!document.hidden&&!pageAway;}
 function render(){
  const loading=available()&&audio&&!blocked&&audio.readyState<2;
  const playing=available()&&audio&&!audio.paused&&context?.state==='running';
  const label=enabled?(loading?'Loading arcade sound — click to mute':playing?'Mute arcade sound':'Arcade sound on — tap anywhere to start, or here to mute'):'Turn on arcade sound';
  button.setAttribute('aria-pressed',String(enabled));button.setAttribute('aria-label',label);button.title=label;
  button.setAttribute('aria-busy',String(Boolean(loading)));icon.setAttribute('href',enabled?'#i-sound-on':'#i-sound-off');
 }
 function notifyError(){
  const toast=document.getElementById('toast');if(!toast)return;
  clearTimeout(errorTimer);toast.textContent='Arcade sound could not load. Tap the speaker to try again.';
  toast.classList.add('visible');errorTimer=setTimeout(()=>toast.classList.remove('visible'),4500);
 }
 function setLevel(value,duration){
  const now=context.currentTime,param=gain.gain;
  if(typeof param.cancelAndHoldAtTime==='function')param.cancelAndHoldAtTime(now);
  else{const current=param.value;param.cancelScheduledValues(now);param.setValueAtTime(current,now);}
  param.linearRampToValueAtTime(value,now+duration);
 }
 function makeContext(){
  if(context)return;
  context=new AudioContext({latencyHint:'playback',sampleRate:44100});
  gain=context.createGain();gain.gain.value=0;gain.connect(context.destination);
  audio=new Audio();audio.loop=true;audio.preload='auto';audio.setAttribute('playsinline','');
  context.createMediaElementSource(audio).connect(gain);
  audio.addEventListener('loadedmetadata',()=>{
   if(!restorePosition||!selected||audio.readyState<1)return;
   restorePosition=false;
   if(positions[selected]>0&&Number.isFinite(audio.duration)){
    try{audio.currentTime=Math.min(positions[selected],Math.max(0,audio.duration-.1));}catch{}
   }
  });
  audio.addEventListener('playing',()=>{
   // A delayed download or resumed stream must enter gently as well.
   setLevel(0,0);setLevel(lastTarget??0,selected==='beach'?.9:.5);render();
  });
  audio.addEventListener('canplay',render);
  audio.addEventListener('error',()=>{blocked=true;render();if(available())notifyError();});
  context.addEventListener('statechange',render);
 }
 function selectTrack(track){
  if(selected===track)return false;
  audio.pause(); // Stop the outgoing file before changing the source or gain.
  if(selected&&Number.isFinite(audio.currentTime))positions[selected]=audio.currentTime;
  ++attempt;starting=false;blocked=false;
  setLevel(0,0);lastTarget=null;
  selected=track;restorePosition=true;
  audio.src=tracks[track];audio.load();
  return true;
 }
 function start(retry=false){
  if(!available()||!audio||starting||(!retry&&blocked)||!audio.paused)return;
  if(retry&&audio.error){blocked=false;restorePosition=true;audio.load();}
  const ticket=++attempt;starting=true;
  // Run in the gesture when supplied, without awaiting context.resume().
  Promise.resolve(audio.play()).then(()=>{
   if(ticket!==attempt)return;
   blocked=false;if(!available())audio.pause();
  }).catch(error=>{
   if(ticket!==attempt||error?.name==='AbortError')return;
   blocked=true;if(error?.name!=='NotAllowedError')notifyError();
  }).finally(()=>{if(ticket===attempt)starting=false;render();});
 }
 function sync(retry=false){
  if(!context||!available())return;
  const scene=window.ARCADE_DAY_NIGHT?.read()||{phase:null,mix:0};
  const phase=scene.phase,track=phase!==null&&phase>=30000?'night':'beach';
  const switched=selectTrack(track);
  // Beach fades over 2.5 seconds, reaches silence before dusk, then pauses.
  // Night follows the picture all the way back to zero at full daylight.
  const target=track==='night'?levels.night*scene.mix:levels.beach*(phase===null?1:Math.max(0,Math.min(1,(29800-phase)/2500)));
  if(target!==lastTarget){
   setLevel(target,switched?(track==='beach'?.9:.5):.1);lastTarget=target;
  }
  if(track==='beach'&&phase!==null&&phase>=29900){
   ++attempt;starting=false;audio.pause();
  }else start(retry);
 }
 function watch(){clearInterval(timer);sync();timer=setInterval(sync,100);}
 async function playSound(){
  if(!available())return;
  clearTimeout(suspendTimer);
  makeContext();
  const resume=context.resume();
  lastTarget=null;sync(true);
  try{await resume;if(available())sync();}
  catch(error){if(error?.name!=='NotAllowedError')notifyError();}
  render();
 }
 function pauseSound(){
  ++attempt;starting=false;clearTimeout(suspendTimer);lastTarget=null;
  if(context){
   setLevel(0,.2);
   suspendTimer=setTimeout(()=>{if(!available()){audio.pause();context.suspend().catch(()=>{});}},250);
  }
  render();
 }
 button.addEventListener('click',()=>{enabled=!enabled;if(enabled)void playSound();else pauseSound();render();});
 function firstInteraction(event){
  if(event.target?.closest?.('#beachToggle')||!enabled)return;
  if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;
  if(!audio||context?.state!=='running'||blocked)void playSound();
 }
 document.addEventListener('click',firstInteraction,true);
 document.addEventListener('keydown',firstInteraction,true);
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden){clearInterval(timer);pauseSound();}
  else{watch();if(enabled)void playSound();}
 });
 window.addEventListener('pagehide',()=>{pageAway=true;clearInterval(timer);pauseSound();});
 window.addEventListener('pageshow',event=>{pageAway=false;if(event.persisted&&!document.hidden){watch();if(enabled)void playSound();}});
 render();watch();void playSound();
})();
