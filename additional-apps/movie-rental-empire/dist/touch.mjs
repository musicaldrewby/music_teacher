export function fitScene(width,height){const scale=Math.min(width/1300,height/850);return {scale,x:(width-1300*scale)/2,y:(height-850*scale)/2};}
export function scenePoint(clientX,clientY,rect){const fit=fitScene(rect.width,rect.height);return {x:(clientX-rect.left-fit.x)/fit.scale,y:(clientY-rect.top-fit.y)/fit.scale};}

export class TabletUI{
 constructor({onAction,onView,message}){
  this.onAction=onAction;this.onView=onView;this.message=message;this.view='play';this.active=false;this.pointerHeld=false;this.sceneVisible=true;this.pointerIds=new Set();this.lastDraw=0;
  this.coarse=matchMedia('(any-pointer: coarse)');this.narrow=matchMedia('(max-width: 1024px)');
  const sync=()=>{const next=this.coarse.matches||this.narrow.matches,changed=next!==this.active;this.active=next;document.documentElement.classList.toggle('touch-ui',next);document.documentElement.dataset.touchView=this.view;document.getElementById('touchDock').hidden=false;this.measureHeader();if(changed)this.onView(this.view);};
  this.coarse.addEventListener('change',sync);this.narrow.addEventListener('change',sync);window.addEventListener('resize',()=>{this.measureHeader();});
  if('ResizeObserver'in window){this.observer=new ResizeObserver(()=>this.measureHeader());this.observer.observe(document.querySelector('.topbar'));}
  if('IntersectionObserver'in window){this.sceneObserver=new IntersectionObserver(entries=>{this.sceneVisible=entries[0].isIntersecting;});this.sceneObserver.observe(document.getElementById('scene'));}
  document.getElementById('touchStore').onclick=()=>this.setView('play');document.getElementById('touchManage').onclick=()=>this.setView('manage');
  document.getElementById('touchPause').onclick=()=>this.onAction('pause');document.getElementById('touchSpeed').onclick=()=>this.onAction('speed');document.getElementById('touchFull').onclick=()=>this.fullscreen();
  document.addEventListener('fullscreenchange',()=>{document.getElementById('touchFull').firstChild.textContent=document.fullscreenElement?'Exit full screen':'Full screen';this.measureHeader();});
  document.addEventListener('pointerdown',e=>{this.pointerIds.add(e.pointerId);this.pointerHeld=true;},{passive:true});
  const release=e=>{this.pointerIds.delete(e.pointerId);setTimeout(()=>{this.pointerHeld=this.pointerIds.size>0;},80);};document.addEventListener('pointerup',release,{passive:true});document.addEventListener('pointercancel',release,{passive:true});window.addEventListener('blur',()=>{this.pointerIds.clear();this.pointerHeld=false;});
  document.addEventListener('contextmenu',e=>{if(this.active&&e.target.closest('canvas,button,.cover'))e.preventDefault();});
  // Run after the game's controller has been assigned.
  queueMicrotask(sync);
 }
 measureHeader(){document.documentElement.style.setProperty('--touch-header-height',Math.ceil(document.querySelector('.topbar').getBoundingClientRect().height)+'px');}
 get managing(){return this.view==='manage';}
 setView(view,{scroll=true}={}){if(!['play','manage'].includes(view))return;this.view=view;if(view==='manage')document.documentElement.classList.remove('work-open');document.documentElement.dataset.touchView=view;document.getElementById('touchStore').setAttribute('aria-pressed',String(view==='play'));document.getElementById('touchManage').setAttribute('aria-pressed',String(view==='manage'));this.onView(view);if(this.active&&scroll)window.scrollTo({top:0,behavior:'auto'});}
 focusWork(){document.documentElement.classList.add('work-open');}

 sync({phase,paused,modal,waiting,day,clock,speed}){
  document.getElementById('touchWaiting').textContent=waiting?`${waiting} need you`:'All caught up';document.getElementById('touchSpeedValue').textContent=speed+'×';document.getElementById('touchClock').textContent=phase==='open'?clock:`Day ${phase==='closed'?day+1:day}`;
  const btn=document.getElementById('touchPause');btn.firstChild.textContent=phase!=='open'?'Open store':this.managing?'Paused':paused?'Resume':'Pause';btn.disabled=this.managing&&phase==='open';btn.setAttribute('aria-label',phase!=='open'?'Open the store':this.managing?'Paused while managing':paused?'Resume shift':'Pause shift');
 }
 enhanceNumbers(container){if(!this.active)return;container.querySelectorAll('input[type="number"]').forEach(input=>{input.inputMode='decimal';if(input.closest('.number-stepper'))return;const wrapper=document.createElement('div');wrapper.className='number-stepper';const minus=document.createElement('button'),plus=document.createElement('button');minus.type=plus.type='button';minus.textContent='−';plus.textContent='+';const name=input.getAttribute('aria-label')||input.parentElement.querySelector('label')?.textContent||'value';minus.setAttribute('aria-label','Decrease '+name);plus.setAttribute('aria-label','Increase '+name);minus.onclick=()=>{input.stepDown();input.dispatchEvent(new Event('change',{bubbles:true}));};plus.onclick=()=>{input.stepUp();input.dispatchEvent(new Event('change',{bubbles:true}));};input.before(wrapper);wrapper.append(minus,input,plus);});}
 async fullscreen(){try{if(document.fullscreenElement){await document.exitFullscreen();return;}if(!document.documentElement.requestFullscreen){this.message('Full screen is unavailable in this browser. You can still play in either orientation.');return;}await document.documentElement.requestFullscreen();try{await globalThis.screen?.orientation?.lock?.('landscape');}catch{} }catch{this.message('This browser did not allow full screen. Open the game directly in your tablet browser and try again.');}}
}
