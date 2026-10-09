(() => {
 'use strict';
 const button=document.getElementById('beachToggle'),icon=document.getElementById('beachIcon');
 if(!button)return;
 const AudioContext=window.AudioContext||window.webkitAudioContext;
 if(!AudioContext){button.disabled=true;button.setAttribute('aria-pressed','false');button.setAttribute('aria-label','Beach sound is unavailable in this browser');button.title='Beach sound is unavailable in this browser';icon.setAttribute('href','#i-sound-off');return;}
 const level=.45;
 // Each fresh visit starts with sound enabled; mute lasts for this visit only.
 let enabled=true,context=null,gain=null,source=null,buffer=null,loading=null;
 let request=0,suspendTimer=0,errorTimer=0;
 function render(){
  const playing=enabled&&source&&context?.state==='running'&&!document.hidden;
  const label=enabled?(loading?'Loading beach sounds — click to mute':playing?'Mute beach sounds':'Beach sounds on — click anywhere to start, or here to mute'):'Turn on beach sounds';
  button.setAttribute('aria-pressed',String(enabled));
  button.setAttribute('aria-label',label);button.title=label;
  button.setAttribute('aria-busy',String(Boolean(loading)));
  icon.setAttribute('href',enabled?'#i-sound-on':'#i-sound-off');
 }
 function notifyError(){
  const toast=document.getElementById('toast');if(!toast)return;
  clearTimeout(errorTimer);toast.textContent='Beach sound could not load. Tap the speaker to try again.';
  toast.classList.add('visible');errorTimer=setTimeout(()=>toast.classList.remove('visible'),4500);
 }
 function makeContext(){
  if(context)return;
  context=new AudioContext({latencyHint:'playback',sampleRate:44100});
  gain=context.createGain();gain.gain.value=0;gain.connect(context.destination);
  context.addEventListener('statechange',render);
 }
 function loadBuffer(){
  if(buffer)return Promise.resolve(buffer);
  if(loading)return loading;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),60000);
  loading=(async()=>{
   const response=await fetch('assets/audio/beach-seagulls-loop.wav',{signal:controller.signal});
   if(!response.ok)throw Error('Audio download failed');
   buffer=await context.decodeAudioData(await response.arrayBuffer());
   return buffer;
  })().finally(()=>{clearTimeout(timeout);loading=null;render();});
  render();return loading;
 }
 function setLevel(value,timeConstant){
  const now=context.currentTime,param=gain.gain;
  if(typeof param.cancelAndHoldAtTime==='function')param.cancelAndHoldAtTime(now);
  else{const current=param.value;param.cancelScheduledValues(now);param.setValueAtTime(current,now);}
  param.setTargetAtTime(value,now,timeConstant);
 }
 async function playSound(){
  if(!enabled||document.hidden)return;
  const ticket=++request;clearTimeout(suspendTimer);
  try{
   makeContext();
   // Attempt autoplay; retry resume() synchronously on a gesture when required.
   const resume=context.resume(),audio=loadBuffer();
   const [,decoded]=await Promise.all([resume,audio]);
   if(ticket!==request||!enabled||document.hidden)return;
   if(!source){
    source=context.createBufferSource();source.buffer=decoded;
    source.loop=true;source.loopStart=0;source.loopEnd=decoded.duration;
    source.connect(gain);source.start();
   }
   setLevel(level,.3);render();
  }catch(error){
   if(ticket!==request)return;
   if(error?.name==='NotAllowedError'){render();return;}
   enabled=false;render();notifyError();
  }
 }
 function pauseSound(){
  ++request;clearTimeout(suspendTimer);
  if(context){
   setLevel(0,.06);
   suspendTimer=setTimeout(()=>{
    if(!enabled||document.hidden)context.suspend().catch(()=>{});
   },400);
  }
  render();
 }
 button.addEventListener('click',()=>{
  enabled=!enabled;
  if(enabled)void playSound();else pauseSound();
  render();
 });
 function firstInteraction(event){
  if(event.target?.closest?.('#beachToggle')||!enabled)return;
  if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;
  if(!source||context?.state!=='running')void playSound();
 }
 // A browser may defer sound until a gesture. Muting prevents these retries.
 document.addEventListener('click',firstInteraction,true);
 document.addEventListener('keydown',firstInteraction,true);
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden)pauseSound();else if(enabled)void playSound();
 });
 window.addEventListener('pagehide',pauseSound);
 window.addEventListener('pageshow',event=>{if(event.persisted&&enabled&&!document.hidden)void playSound();});
 render();
 void playSound();
})();
