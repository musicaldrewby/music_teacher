(() => {
 'use strict';
 const room=document.querySelector('.room');
 if(!room)return;
 const night=room.querySelector('.room-image-night');
 const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
 let cycle=null,lastTime=null,lastState={phase:null,mix:0};
 function captureCycle(){
  cycle=night?.getAnimations?.().find(animation=>animation.animationName==='seaside-night')||null;
  lastTime=null;
 }
 // Match CSS ease-in-out (cubic-bezier(.42,0,.58,1)) within each ten-second
 // fade. Read the existing animation's time, never the element's computed
 // opacity: music and visitors stay synchronized without forcing style work.
 function ease(progress){
  let low=0,high=1;
  for(let i=0;i<18;i++){
   const t=(low+high)/2,inverse=1-t;
   const x=3*inverse*inverse*t*.42+3*inverse*t*t*.58+t*t*t;
   if(x<progress)low=t;else high=t;
  }
  const t=(low+high)/2;
  return t*t*(3-2*t);
 }
 function read(){
  const time=cycle?.currentTime;
  if(reducedMotion.matches||!cycle||cycle.playState==='idle'||typeof time!=='number')return {phase:null,mix:0};
  if(time===lastTime)return lastState;
  const phase=((time%80000)+80000)%80000;
  const mix=phase<=30000?0:phase<40000?ease((phase-30000)/10000):phase<=70000?1:1-ease((phase-70000)/10000);
  lastTime=time;lastState={phase,mix};
  return lastState;
 }
 window.ARCADE_DAY_NIGHT=Object.freeze({read});
 night?.addEventListener('animationstart',event=>{
  if(event.animationName==='seaside-night')captureCycle();
 });
 reducedMotion.addEventListener('change',captureCycle);
 // The existing animation control and visibility listener pause the whole scene.
 document.documentElement.classList.toggle('page-hidden',document.hidden);
 const ready=src=>new Promise((resolve,reject)=>{
  const image=new Image();
  image.onload=()=>{
   if(typeof image.decode==='function')image.decode().then(resolve,reject);
   else resolve();
  };
  image.onerror=reject;
  image.src=src;
 });
 // Start both synchronized animations only after both layers can paint.
 Promise.all([ready('assets/boardwalk.webp'),ready('assets/boardwalk-night.webp')])
  .then(()=>{room.classList.add('day-night-ready');captureCycle();})
  .catch(()=>{/* Keep the original sunset if the night image is unavailable. */});
})();
