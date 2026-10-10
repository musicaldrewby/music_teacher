/* Independent seaside visitors. Each has its own randomized schedule and
   preferred light; occasional overlaps are intentional. Only visible,
   unpaused time counts, and each kind can have just one active instance. */
(()=>{
 'use strict';
 const root=document.documentElement;
 const room=document.getElementById('roomImage');
 const night=document.querySelector('.room-image-night');
 const categories=document.getElementById('categories');
 const shelf=document.getElementById('recordShelf');
 if(!room||!night||!categories||!shelf)return;
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 const mobile=matchMedia('(max-width: 680px)');
 const sceneWidth=1672,sceneHeight=940;
 const between=(min,max)=>min+Math.random()*(max-min);
 function decoration(className,parent){
  const el=document.createElement('div');el.className=className;
  el.setAttribute('aria-hidden','true');parent.append(el);return el;
 }
 const plane=decoration('surprise-scene-plane',room);
 // Paint and animate in the same coordinate system. The room retains its
 // cover background as a fallback until this scene has been laid out.
 plane.append(night);
 const water=decoration('surprise-water-window',plane);
 const shimmer=document.querySelector('.ocean-shimmer');
 if(shimmer)water.append(shimmer);
 const sea=decoration('surprise-sea-window',plane);
 const boat=decoration('surprise-sailboat',sea);
 const sky=decoration('surprise-sky-window',plane);
 const star=decoration('surprise-shooting-star',sky);
 const shipWindow=decoration('surprise-ship-window surprise-night-event',plane);
 const ship=decoration('surprise-night-ship',shipWindow);
 decoration('ship-hull',ship);
 decoration('ship-cabins',ship);
 decoration('ship-windows',ship);
 decoration('ship-mast-light',ship);
 decoration('ship-reflection',ship);
 const gull=decoration('surprise-gull',document.body);
 decoration('surprise-gull-sprite',gull);
 const crab=decoration('surprise-crab',document.body);
 decoration('surprise-crab-sprite',crab);
 const mothWindow=decoration('surprise-moth-window surprise-night-event',plane);
 const moth=decoration('surprise-moth',mothWindow);
 decoration('surprise-moth-sprite',moth);
 const rules={
  gull:{duration:16000,cooldown:[150000,270000],first:[8000,14000]},
  crab:{duration:14000,cooldown:[180000,320000],first:[81000,94000]},
  moth:{duration:18000,cooldown:[130000,230000],first:[44000,55000]},
  star:{duration:1600,cooldown:[140000,260000],first:[52000,65000]},
  attract:{duration:4200,cooldown:[85000,150000],first:[68000,90000]},
  boat:{duration:42000,cooldown:[210000,340000],first:[25000,40000]},
  ship:{duration:32000,cooldown:[240000,390000],first:[119000,132000]}
 };
 let clock=0,lastTick=performance.now(),idleSince=0;
 const active=new Map();
 const due=Object.fromEntries(Object.entries(rules).map(([kind,rule])=>[kind,between(...rule.first)]));
 const retryAt=Object.fromEntries(Object.keys(rules).map(kind=>[kind,0]));
 const ready={gull:false,boat:false,crab:false,moth:false};
 function loadArt(kind,url){
  const img=new Image();
  img.onload=()=>{ready[kind]=true;};
  img.onerror=()=>{ready[kind]=false;};
  img.src=url;
 }
 loadArt('gull','assets/seagull-sprites.webp');
 loadArt('boat','assets/sailboat.webp');
 loadArt('crab','assets/boardwalk-crab.webp');
 loadArt('moth','assets/lantern-moth.webp');
 function blocked(){
  return document.hidden||motion.matches||root.classList.contains('motion-paused')||root.classList.contains('modal-open');
 }
 let wasBlocked=blocked();
 function cropOffset(position,remaining){
  const value=Number.parseFloat(position);
  if(!Number.isFinite(value))return remaining*.5;
  return position.endsWith('%')?remaining*value/100:value;
 }
 function layout(){
  // Fractional dimensions matter with the room's 1.5% overscan. Read the
  // crop from CSS rather than duplicating its mobile breakpoint in JS.
  // The room only translates for parallax; its measured size is unscaled.
  const {width,height}=room.getBoundingClientRect();
  if(!width||!height)return;
  const crop=getComputedStyle(room);
  const scale=Math.max(width/sceneWidth,height/sceneHeight);
  plane.style.width=`${sceneWidth}px`;plane.style.height=`${sceneHeight}px`;
  plane.style.left=`${cropOffset(crop.backgroundPositionX,width-sceneWidth*scale)}px`;
  plane.style.top=`${cropOffset(crop.backgroundPositionY,height-sceneHeight*scale)}px`;
  plane.style.transform=`scale(${scale})`;
  room.classList.add('scene-aligned');
 }
 layout();
 function sceneVisible(x,y,width,height){
  // Don't spend an event on scenery outside a narrow screen's natural crop.
  // Use the rendered scene (including parallax), not a second cover formula.
  const r=plane.getBoundingClientRect(),scale=r.width/sceneWidth;
  const left=r.left+x*scale,top=r.top+y*scale;
  return Math.min(innerWidth,left+width*scale)-Math.max(0,left)>6&&
   Math.min(innerHeight,top+height*scale)-Math.max(0,top)>16;
 }
 function windowVisible(el){
  return sceneVisible(el.offsetLeft,el.offsetTop,el.offsetWidth,el.offsetHeight);
 }
 function finish(kind){
  const event=active.get(kind);
  if(!event)return;
  event.el.classList.remove('is-active','is-perched','is-curious','is-resting','is-leaving','cabinet-attract');
  active.delete(kind);
  due[kind]=clock+between(...rules[kind].cooldown);
  retryAt[kind]=0;
 }
 function visibleMachines(ignoreInteraction=false){
  const bounds=shelf.getBoundingClientRect();
  return [...shelf.querySelectorAll('.machine')].filter(el=>{
   if(!el.isConnected||(!ignoreInteraction&&(el.matches(':hover')||el.contains(document.activeElement))))return false;
   const r=el.getBoundingClientRect();
   const visibleWidth=Math.min(r.right,bounds.right,innerWidth)-Math.max(r.left,bounds.left,0);
   const visibleHeight=Math.min(r.bottom,innerHeight)-Math.max(r.top,0);
   return r.width>0&&r.height>0&&visibleWidth/r.width>.85&&visibleHeight/r.height>.7;
  });
 }
 function nightPhase(){
  // Use the actual background animation, so pausing never desynchronizes us.
  const cycle=night.getAnimations?.().find(a=>a.animationName==='seaside-night');
  return cycle&&typeof cycle.currentTime==='number'?cycle.currentTime%80000:null;
 }
 function nightEnough(latest=67500){
  if(Number.parseFloat(getComputedStyle(night).opacity)<.98)return false;
  const phase=nightPhase();
  return phase!==null&&phase>=40000&&phase<=latest;
 }
 function daytime(){
  const phase=nightPhase();
  return Number.parseFloat(getComputedStyle(night).opacity)<.1&&(phase===null||phase<=16000);
 }
 function visibleLantern(){
  // Prefer brass lanterns; central string lights remain in the mobile crop.
  return [[544,256],[1127,256],[250,253],[1516,211],[812,143],[1042,168]]
   .find(([x,y])=>sceneVisible(x-18,y-18,36,36));
 }
 function start(kind,machines){
  let el,anchor=null;
  let duration=rules[kind].duration;
  if(kind==='gull'){
   const r=categories.getBoundingClientRect(),size=mobile.matches?82:106;
   if(r.top<60||r.top>innerHeight-70)return false;
   gull.style.width=gull.style.height=`${size}px`;
   const x=Math.max(0,r.left-12),y=r.top-size*.85+2;
   gull.style.setProperty('--gull-x',`${x}px`);
   gull.style.setProperty('--gull-y',`${y}px`);
   gull.style.setProperty('--gull-start-y',`${Math.max(0,y-55)}px`);
   gull.style.setProperty('--gull-exit-x',`${innerWidth+100}px`);
   gull.style.setProperty('--gull-exit-y',`${Math.max(-60,y-100)}px`);
   el=gull;
  }else if(kind==='crab'){
   anchor=visibleMachines(true).filter(machine=>machine.getBoundingClientRect().bottom<innerHeight-18)
    .sort((a,b)=>a.getBoundingClientRect().left-b.getBoundingClientRect().left)[0];
   if(!anchor)return false;
   const r=anchor.getBoundingClientRect(),size=mobile.matches?68:82;
   const x=r.left+Math.min(30,r.width*.1)-size*.45;
   const restX=Math.max(16,x-65),endX=-size-24;
   const exitDuration=Math.max(2600,(restX-endX)/75*1000);
   crab.style.width=crab.style.height=`${size}px`;
   crab.style.setProperty('--crab-start-x',`${Math.max(x,restX+45)}px`);
   crab.style.setProperty('--crab-pause-x',`${restX}px`);
   crab.style.setProperty('--crab-end-x',`${endX}px`);
   crab.style.setProperty('--crab-exit-duration',`${exitDuration}ms`);
   crab.style.setProperty('--crab-y',`${r.bottom-size*.83}px`);
   crab.style.setProperty('--crab-brightness','1');
   duration=7700+exitDuration;
   el=crab;
  }else if(kind==='moth'){
   const lantern=visibleLantern();if(!lantern)return false;
   mothWindow.style.left=`${lantern[0]}px`;mothWindow.style.top=`${lantern[1]}px`;
   el=moth;
  }else if(kind==='attract'){
   el=machines[Math.floor(Math.random()*machines.length)];
   if(!el)return false;
  }else if(kind==='boat')el=boat;
  else if(kind==='ship')el=ship;
  else el=star;
  if(kind==='ship'){
   // A slow 24–32 second pass, ending by dawn instead of lingering in daylight.
   duration=Math.min(duration,80000-nightPhase());
   ship.style.setProperty('--ship-duration',`${duration}ms`);
  }
  const event={kind,el,anchor,started:clock,duration};
  if(kind==='ship'||kind==='moth'){
   event.nightSurface=kind==='ship'?shipWindow:mothWindow;
   event.nightSurface.style.setProperty('--night-light',getComputedStyle(night).opacity);
  }
  active.set(kind,event);
  el.classList.add(kind==='attract'?'cabinet-attract':'is-active');
  return true;
 }
 function leaveCrab(){
  const event=active.get('crab');
  if(!event||event.leaving)return;
  // Scrolling or changing a category must not make a visible crab vanish.
  // Continue from its current screen position until the whole sprite is outside.
  const r=crab.getBoundingClientRect(),endX=-r.width-24;
  if(r.right<=0||r.top>=innerHeight||r.bottom<=0){finish('crab');return;}
  event.leaving=true;event.started=clock;
  event.duration=Math.max(1600,(r.left-endX)/90*1000);
  crab.style.setProperty('--crab-leave-x',`${r.left}px`);
  crab.style.setProperty('--crab-leave-y',`${r.top}px`);
  crab.style.setProperty('--crab-end-x',`${endX}px`);
  crab.style.setProperty('--crab-exit-duration',`${event.duration}ms`);
  crab.classList.remove('is-resting');crab.classList.add('is-leaving');
 }
 function updateActive(event){
  const {kind}=event;
  const elapsed=clock-event.started;
  const darkness=Number.parseFloat(getComputedStyle(night).opacity)||0;
  // The day/night cycle continues behind dialogs; discard a paused meteor if
  // that interval carried us into daylight before the dialog closed.
  if(kind==='star'&&darkness<.98){finish(kind);return;}
  if(event.nightSurface){
   event.nightSurface.style.setProperty('--night-light',String(darkness));
   if(darkness<.04){finish(kind);return;}
  }
  if(kind==='gull'){
   if(darkness>.9){finish(kind);return;}
   gull.classList.toggle('is-perched',elapsed>=4000&&elapsed<12000);
   gull.classList.toggle('is-curious',elapsed>=7500&&elapsed<9500);
  }
  if(kind==='crab'){
   crab.classList.toggle('is-resting',!event.leaving&&elapsed>=4900&&elapsed<7700);
   crab.style.setProperty('--crab-brightness',String(1-darkness*.4));
   if(!event.leaving&&!event.anchor.isConnected){leaveCrab();return;}
  }
  if(kind==='attract'&&(!event.el.isConnected||!visibleMachines().includes(event.el))){finish(kind);return;}
  if(kind==='gull'||kind==='boat')event.el.style.filter=`brightness(${1-darkness*.4})`;
  if(elapsed>=event.duration)finish(kind);
 }
 function syncPause(){
  // Reset the wall clock at every pause boundary; never count time away.
  wasBlocked=blocked();lastTick=performance.now();
  if(motion.matches)for(const kind of [...active.keys()])finish(kind);
 }
 new MutationObserver(syncPause).observe(root,{attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',syncPause);
 motion.addEventListener('change',syncPause);
 addEventListener('pageshow',()=>{layout();syncPause();});
 // Safari can resize the fixed room as browser chrome changes, independently
 // of the first orientation/resize event. Observe the actual containing box.
 if(typeof ResizeObserver==='function')new ResizeObserver(layout).observe(room);
 window.visualViewport?.addEventListener('resize',layout);
 mobile.addEventListener('change',layout);
 addEventListener('resize',()=>{layout();finish('gull');leaveCrab();finish('moth');});
 addEventListener('scroll',leaveCrab,{passive:true});
 function activity(){idleSince=clock;finish('attract');}
 document.addEventListener('pointerdown',activity,{passive:true});
 document.addEventListener('pointermove',activity,{passive:true});
 document.addEventListener('keydown',activity);
 shelf.addEventListener('scroll',()=>{activity();leaveCrab();},{passive:true});
 setInterval(()=>{
  const now=performance.now(),delta=now-lastTick;lastTick=now;
  if(blocked()){wasBlocked=true;return;}
  if(wasBlocked){wasBlocked=false;return;}
  // A suspended browser or busy device must not cause a burst of old events.
  if(delta>5000){
   for(const kind of [...active.keys()])finish(kind);
   for(const kind of Object.keys(rules)){
    due[kind]=Math.max(due[kind],clock+between(18000,55000));retryAt[kind]=0;
   }
   return;
  }
  clock+=Math.max(0,delta);
  for(const event of [...active.values()])updateActive(event);
  for(const kind of Object.keys(rules)){
   if(active.has(kind)||clock<due[kind]||clock<retryAt[kind])continue;
   let eligible=true,machines=[];
   if(kind in ready&&!ready[kind])eligible=false;
   else if(kind==='gull'||kind==='crab')eligible=daytime();
   else if(kind==='moth')eligible=nightEnough(58000)&&!!visibleLantern();
   else if(kind==='star')eligible=nightEnough();
   else if(kind==='boat')eligible=windowVisible(sea);
   else if(kind==='ship')eligible=nightEnough(56000)&&windowVisible(shipWindow);
   else if(kind==='attract'){
    machines=clock-idleSince>=15000?visibleMachines():[];eligible=machines.length>0;
   }
   // Random retries keep all night visitors from starting on the same frame.
   if(!eligible||!start(kind,machines))retryAt[kind]=clock+between(4000,12000);
  }
 },250);
})();
