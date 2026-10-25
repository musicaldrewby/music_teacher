'use strict';
// Open before the artwork scripts load, keeping the title immediately available.
(() => {
 const screen=document.getElementById('welcomeScreen');
 const start=document.getElementById('welcomeStart');
 const status=document.getElementById('welcomeStatus');
 const reload=document.getElementById('welcomeReload');
 let initialized=false,entered=false,returnFocus=null;
 function paintPreview(){
  if(typeof ready==='undefined'||!ready)return;
  const preview=document.getElementById('welcomePreview');
  try{drawScene(preview.getContext('2d'),scene(),preview.width,preview.height,0);preview.classList.add('is-ready')}catch{/* A preview failure must never prevent entry. */}
 }
 function show(){
  if(initialized){
   stopAnimationPreview();stopStoryPlayback();if(blockPathEditing)endBlockPathEditing();
   start.querySelector('span').textContent=entered?'Return to studio':'Start creating';paintPreview();
  }
  returnFocus=document.activeElement;
  if(!screen.open)screen.showModal();
  if(initialized)start.focus();else{screen.tabIndex=-1;screen.focus()}
 }
 start.addEventListener('click',()=>{
  if(!initialized)return;
  entered=true;screen.close();
  if(returnFocus&&returnFocus!==document.body&&returnFocus!==screen&&returnFocus.isConnected)returnFocus.focus();
  else document.getElementById('board').focus();
 });
 reload.addEventListener('click',()=>window.location.reload());
 screen.addEventListener('cancel',event=>event.preventDefault());
 screen.addEventListener('keydown',event=>event.stopPropagation());
 window.FeltWelcome={
  ready(){initialized=true;start.disabled=false;document.getElementById('welcomeContinue').disabled=false;start.querySelector('span').textContent='Start creating';status.textContent='Your studio is ready.';reload.hidden=true;paintPreview();if(screen.open&&(document.activeElement===screen||document.activeElement===document.body))start.focus()},
  failed(){start.disabled=true;document.getElementById('welcomeContinue').disabled=true;status.textContent='The artwork could not load. Check your connection, then reload.';reload.hidden=false},
  show,
  connect(){document.getElementById('openWelcome').addEventListener('click',show)}
 };
 show();
})();
