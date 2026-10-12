(() => {
 'use strict';
 const button=document.getElementById('beachToggle'),icon=document.getElementById('beachIcon');
 if(!button)return;
 const AudioContext=window.AudioContext||window.webkitAudioContext;
 if(!AudioContext){button.disabled=true;button.setAttribute('aria-pressed','false');button.setAttribute('aria-label','Arcade sound is unavailable in this browser');button.title='Arcade sound is unavailable in this browser';icon.setAttribute('href','#i-sound-off');return;}
 const beachLevel=.45,nightLevel=3;
 // Each fresh visit starts with sound enabled; mute lasts for this visit only.
 let enabled=true,context=null,gain=null,beachGain=null,nightGain=null,source=null,buffer=null,loading=null;
 let music=null,musicUnlocked=false,musicBlocked=false,musicStarting=false,musicAttempt=0;
 let nightMix=0,warmingMusic=false,lastMix=-1,nightTimer=0,musicPauseTimer=0,pageAway=false;
 let request=0,suspendTimer=0,errorTimer=0;
 function render(){
  const playing=enabled&&(source||(music&&!music.paused))&&context?.state==='running'&&!document.hidden;
  const label=enabled?(loading?'Loading arcade sound — click to mute':playing?'Mute arcade sound (beach and night music)':'Arcade sound on — tap anywhere to start, or here to mute'):'Turn on arcade sound (beach and night music)';
  button.setAttribute('aria-pressed',String(enabled));
  button.setAttribute('aria-label',label);button.title=label;
  button.setAttribute('aria-busy',String(Boolean(loading)));
  icon.setAttribute('href',enabled?'#i-sound-on':'#i-sound-off');
 }
 function notifyError(message='Beach sound could not load. Tap the speaker to try again.'){
  const toast=document.getElementById('toast');if(!toast)return;
  clearTimeout(errorTimer);toast.textContent=message;
  toast.classList.add('visible');errorTimer=setTimeout(()=>toast.classList.remove('visible'),4500);
 }
 function makeContext(){
  if(context)return;
  context=new AudioContext({latencyHint:'playback',sampleRate:44100});
  gain=context.createGain();gain.gain.value=0;gain.connect(context.destination);
  beachGain=context.createGain();beachGain.gain.value=beachLevel;beachGain.connect(gain);
  nightGain=context.createGain();nightGain.gain.value=0;nightGain.connect(gain);
  // Stream the five-minute recording rather than decoding it all into iPad memory.
  music=new Audio('assets/audio/weightless-dawn-night.mp3');
  music.loop=true;music.preload='auto';music.setAttribute('playsinline','');
  context.createMediaElementSource(music).connect(nightGain);
  music.addEventListener('error',()=>{
   musicBlocked=true;
   if(enabled&&!document.hidden)notifyError('Night music could not load. Tap the speaker to try again.');
  });
  music.addEventListener('playing',()=>{
   // A late download or a return to the page should also enter gently.
   setLevel(nightGain.gain,0,0);
   setLevel(nightGain.gain,nightLevel*nightMix,.5);
   render();
  });
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
 function setLevel(param,value,duration){
  const now=context.currentTime;
  if(typeof param.cancelAndHoldAtTime==='function')param.cancelAndHoldAtTime(now);
  else{const current=param.value;param.cancelScheduledValues(now);param.setValueAtTime(current,now);}
  param.linearRampToValueAtTime(value,now+duration);
 }
 function wantsMusic(){return enabled&&!document.hidden&&!pageAway&&(nightMix>0||warmingMusic)&&context?.state==='running';}
 function startMusic(prime=false,retry=false){
  if(!music||(!prime&&!wantsMusic())||(musicBlocked&&!retry)||(musicStarting&&!retry))return;
  if(!music.paused&&!musicStarting)return;
  if(retry&&music.error)music.load();
  const attempt=++musicAttempt;
  musicStarting=true;
  // Invoke play() in the same user gesture as resume(), before either is awaited.
  Promise.resolve(music.play()).then(()=>{
   if(attempt!==musicAttempt)return;
   musicUnlocked=true;musicBlocked=false;
   if(!wantsMusic())music.pause();
  }).catch(error=>{
   if(attempt!==musicAttempt)return;
   if(error?.name==='AbortError')return;
   musicBlocked=true;
   if(error?.name!=='NotAllowedError')notifyError('Night music could not load. Tap the speaker to try again.');
  }).finally(()=>{if(attempt===musicAttempt)musicStarting=false;render();});
 }
 function syncNight(){
  if(document.hidden||pageAway)return;
  // Follow the background animation without polling computed styles during
  // its full-screen crossfade. Pauses and reduced motion use the same clock.
  const scene=window.ARCADE_DAY_NIGHT?.read();
  nightMix=scene?.mix||0;
  // Start the decoder silently before the full-screen fade needs GPU time.
  // Only the existing night opacity controls audible music; daylight stays quiet.
  warmingMusic=scene?.phase>=28000&&scene?.phase<=30000;
  if(!context)return;
  if(lastMix!==nightMix){
   setLevel(nightGain.gain,nightLevel*nightMix,.12);
   setLevel(beachGain.gain,beachLevel*(1-.6*nightMix),.12);
   lastMix=nightMix;
  }
  if(wantsMusic()){
   clearTimeout(musicPauseTimer);musicPauseTimer=0;
   startMusic();
  }else if(nightMix===0&&!musicPauseTimer&&!music.paused){
   // Finish the short final ramp, then preserve the playhead for the next night.
   musicPauseTimer=setTimeout(()=>{musicPauseTimer=0;if(!wantsMusic())music.pause();},150);
  }
 }
 function watchNight(){
  clearInterval(nightTimer);syncNight();
  nightTimer=setInterval(syncNight,100);
 }
 async function playSound(fromGesture=false){
  if(!enabled||document.hidden||pageAway)return;
  const ticket=++request;clearTimeout(suspendTimer);
  try{
   makeContext();
   // Attempt autoplay; retry resume() synchronously on a gesture when required.
   const resume=context.resume();
   syncNight();setLevel(gain.gain,1,.4);
   // Prime silently in daylight so iPad can start this element at the next dusk.
   startMusic(fromGesture&&!musicUnlocked,fromGesture);
   const [,decoded]=await Promise.all([resume,loadBuffer()]);
   if(ticket!==request||!enabled||document.hidden||pageAway)return;
   syncNight();
   if(!source){
    source=context.createBufferSource();source.buffer=decoded;
    source.loop=true;source.loopStart=0;source.loopEnd=decoded.duration;
    source.connect(beachGain);source.start();
   }
   render();
  }catch(error){
   if(ticket!==request)return;
   if(error?.name==='NotAllowedError'){render();return;}
   render();notifyError();
  }
 }
 function pauseSound(){
  ++request;clearTimeout(suspendTimer);
  clearTimeout(musicPauseTimer);musicPauseTimer=0;
  if(context){
   setLevel(gain.gain,0,.2);
   suspendTimer=setTimeout(()=>{
    if(!enabled||document.hidden||pageAway){music.pause();context.suspend().catch(()=>{});}
   },250);
  }
  render();
 }
 button.addEventListener('click',()=>{
  enabled=!enabled;
  if(enabled)void playSound(true);else pauseSound();
  render();
 });
 function firstInteraction(event){
  if(event.target?.closest?.('#beachToggle')||!enabled)return;
  if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;
  if(!source||context?.state!=='running'||!musicUnlocked||musicBlocked)void playSound(true);
 }
 // A browser may defer sound until a gesture. Muting prevents these retries.
 document.addEventListener('click',firstInteraction,true);
 document.addEventListener('keydown',firstInteraction,true);
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden){clearInterval(nightTimer);pauseSound();}
  else{watchNight();if(enabled)void playSound();}
 });
 window.addEventListener('pagehide',()=>{pageAway=true;clearInterval(nightTimer);pauseSound();});
 window.addEventListener('pageshow',event=>{pageAway=false;if(event.persisted&&!document.hidden){watchNight();if(enabled)void playSound();}});
 render();
 watchNight();
 void playSound();
})();
