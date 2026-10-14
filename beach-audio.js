(() => {
 'use strict';
 const button=document.getElementById('beachToggle'),icon=document.getElementById('beachIcon');
 if(!button)return;
 const AudioContext=window.AudioContext||window.webkitAudioContext;
 if(!AudioContext){button.disabled=true;button.setAttribute('aria-pressed','false');button.setAttribute('aria-label','Arcade sound is unavailable in this browser');button.title='Arcade sound is unavailable in this browser';icon.setAttribute('href','#i-sound-off');return;}
 const tracks={cycle:'assets/audio/arcade-day-night.mp3',beach:'assets/audio/arcade-beach.mp3'};
 const motion=matchMedia('(prefers-reduced-motion: reduce)'),downloads=new Map();
 let enabled=true,context=null,gain=null,audio=null,selected=null,pageAway=false;
 let starting=false,blocked=false,loading=false,attempt=0,needsAlign=true,sourceVersion=0;
 let suspendTimer=0,errorTimer=0;
 const scene=()=>window.ARCADE_DAY_NIGHT?.read()||{phase:null,mix:0,elapsed:0};
 const sceneReady=()=>window.ARCADE_DAY_NIGHT?.ready()??true;
 // The animated soundtrack pauses with the scene so its baked fades stay in step.
 // Reduced motion uses a separate, uninterrupted beach loop.
 function scenePaused(){return selected==='cycle'&&document.documentElement.classList.contains('motion-paused');}
 function available(){return enabled&&!document.hidden&&!pageAway&&!scenePaused();}
 function render(){
  const playing=available()&&audio&&!audio.paused&&context?.state==='running';
  const label=!enabled?'Turn on arcade sound':loading?'Loading arcade sound — click to mute':scenePaused()?'Arcade sound paused with animation — click to mute':playing?'Mute arcade sound':'Arcade sound on — tap anywhere to start, or here to mute';
  button.setAttribute('aria-pressed',String(enabled));button.setAttribute('aria-label',label);button.title=label;
  button.setAttribute('aria-busy',String(loading));icon.setAttribute('href',enabled?'#i-sound-on':'#i-sound-off');
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
 function align(){
  if(!needsAlign||audio.readyState<1)return;
  needsAlign=false;
  // Seek only on initial start, resume, or recovery — never at dusk or dawn.
  if(selected==='cycle'){
   const target=((scene().elapsed||0)/1000)%480;
   if(Math.abs(audio.currentTime-target)>.1)audio.currentTime=target;
  }
 }
 function start(retry=false){
  if(!available()||!audio||loading||audio.readyState<1||starting||(!retry&&blocked)||!audio.paused)return;
  clearTimeout(suspendTimer);needsAlign=true;align();
  const ticket=++attempt;starting=true;
  Promise.resolve(audio.play()).then(()=>{
   if(ticket!==attempt)return;
   blocked=false;if(!available())audio.pause();
  }).catch(error=>{
   if(ticket!==attempt||error?.name==='AbortError')return;
   blocked=true;if(error?.name!=='NotAllowedError')notifyError();
  }).finally(()=>{if(ticket===attempt)starting=false;render();});
 }
 function makeContext(){
  if(context)return;
  context=new AudioContext({latencyHint:'playback'});
  gain=context.createGain();gain.gain.value=0;gain.connect(context.destination);
  audio=new Audio();audio.loop=true;audio.preload='auto';audio.setAttribute('playsinline','');
  context.createMediaElementSource(audio).connect(gain);
  audio.addEventListener('loadedmetadata',()=>{start();render();});
  audio.addEventListener('playing',()=>{
   if(!available()){audio.pause();setLevel(0,0);return;}
   align();setLevel(1,.6);render();
  });
  audio.addEventListener('waiting',()=>{needsAlign=true;setLevel(0,.1);});
  audio.addEventListener('error',()=>{blocked=true;render();if(available())notifyError();});
  context.addEventListener('statechange',()=>{
   if(context.state!=='running')needsAlign=true;
   else if(available()&&!audio.paused){align();setLevel(1,.6);}
   render();
  });
 }
 async function prepare(){
  if(!sceneReady())return;
  const track=motion.matches||scene().phase===null?'beach':'cycle';
  if(selected===track&&audio.src&&!audio.error){start();return;}
  if(selected===track&&loading)return;
  const version=++sourceVersion;
  ++attempt;starting=false;audio.pause();setLevel(0,0);
  selected=track;loading=true;blocked=false;needsAlign=true;render();
  try{
   // Download the compressed recording once. All subsequent fades and six
   // day/night cycles play locally, without stream fetches or source changes.
   if(!downloads.has(track))downloads.set(track,fetch(tracks[track]).then(response=>{
    if(!response.ok)throw Error('Audio download failed');
    return response.blob();
   }).then(blob=>URL.createObjectURL(blob)).catch(error=>{downloads.delete(track);throw error;}));
   const url=await downloads.get(track);
   if(version!==sourceVersion)return;
   loading=false;audio.src=url;audio.load();render();
  }catch(error){
   if(version!==sourceVersion)return;
   loading=false;selected=null;blocked=true;render();if(enabled)notifyError();
  }
 }
 async function playSound(){
  if(!enabled||document.hidden||pageAway)return;
  clearTimeout(suspendTimer);makeContext();
  // Resume immediately in a gesture, even if the initial download is pending.
  if(scenePaused()){pauseSound();return;}
  const resume=context.resume();
  blocked=false;void prepare();start(true);
  if(available()&&!audio.paused&&needsAlign){align();setLevel(1,.6);}
  try{await resume;if(available())start();}
  catch(error){if(error?.name!=='NotAllowedError')notifyError();}
  render();
 }
 function pauseSound(){
  ++attempt;starting=false;needsAlign=true;clearTimeout(suspendTimer);
  if(context){
   setLevel(0,.15);
   suspendTimer=setTimeout(()=>{if(!available()){audio.pause();context.suspend().catch(()=>{});}},180);
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
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseSound();else if(enabled)void playSound();});
 window.addEventListener('pagehide',()=>{pageAway=true;pauseSound();});
 window.addEventListener('pageshow',event=>{pageAway=false;if(event.persisted&&!document.hidden&&enabled)void playSound();});
 window.addEventListener('arcade:scene-ready',()=>{if(enabled)void playSound();});
 window.addEventListener('arcade:motionchange',()=>{if(scenePaused())pauseSound();else if(enabled)void playSound();});
 motion.addEventListener('change',()=>{if(context){selected=null;if(enabled)void playSound();}});
 render();void playSound();
})();
