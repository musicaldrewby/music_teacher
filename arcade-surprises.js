/* Independent seaside visitors. Each has its own randomized schedule and
   preferred light; occasional overlaps are intentional. Only visible,
   unpaused time counts, and each kind can have just one active instance.
   The fair has two gentle, continuous motions whenever nighttime is visible. */
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
 const between=(min,max)=>min+Math.random()*(max-min);
 function decoration(className,parent){
  const el=document.createElement('div');el.className=className;
  el.setAttribute('aria-hidden','true');parent.append(el);return el;
 }
 const plane=decoration('surprise-scene-plane',room);
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
 const fair=decoration('surprise-fair',plane);
 const wheelWindow=decoration('surprise-ferris-window fair-detail',fair);
 const wheel=decoration('surprise-ferris-lights',wheelWindow);
 // Trace the distant wheel in the existing night painting: center (1661,301),
 // radius (33,50). The artwork ends partway through its right-hand side.
 for(let i=0;i<24;i++){
  const angle=i/24*Math.PI*2;
  const bulb=decoration('ferris-bulb',wheel);
  bulb.style.left=`${33+33*Math.cos(angle)}px`;
  bulb.style.top=`${50+50*Math.sin(angle)}px`;
  bulb.style.setProperty('--bulb-delay',`${-i/2}s`);
  bulb.style.setProperty('--bulb-color',['#ffe4a3','#a8ebec','#ebafd5'][i%3]);
 }
 // A circular rotor is compressed to the painted wheel's perspective.
 // Only the lights move; the support legs and neighboring artwork stay fixed.
 const rotor=decoration('ferris-rotor',wheel);
 const spokes=decoration('ferris-spokes',rotor);
 for(let i=0;i<12;i++){
  const spoke=decoration('ferris-spoke',spokes);
  spoke.style.setProperty('--spoke-angle',`${i*30}deg`);
  spoke.style.setProperty('--spoke-color',i%2?'#a8ebec':'#ebafd5');
 }
 const fairLayers=[{el:wheelWindow,bounds:[1628,251,44,102]}];
 // Each string stays inside an open view of the pier, away from the pavilion
 // posts and the painted foreground machines. Coordinates match the 1672x940 art.
 const pierStrings=[
  {bounds:[254,370,268,75],points:[[4,12],[65,22],[125,34],[190,46],[263,66]],bulbs:28,duration:7.8,offset:0},
  {bounds:[574,418,163,38],points:[[2,20],[68,25],[159,30]],bulbs:18,duration:9.4,offset:2.6},
  {bounds:[1307,376,92,63],points:[[2,43],[43,28],[88,14]],bulbs:14,duration:8.6,offset:1.4},
  {bounds:[1500,337,172,55],points:[[2,43],[54,32],[111,19],[169,8]],bulbs:20,duration:10.2,offset:4.1}
 ];
 for(const string of pierStrings){
  const strip=decoration('surprise-pier-lights fair-detail',fair);
  const [x,y,width,height]=string.bounds;
  Object.assign(strip.style,{left:`${x}px`,top:`${y}px`,width:`${width}px`,height:`${height}px`});
  strip.style.setProperty('--pier-period',`${string.duration}s`);
  for(let i=0;i<string.bulbs;i++){
   const position=i/(string.bulbs-1)*(string.points.length-1);
   const segment=Math.min(string.points.length-2,Math.floor(position)),fraction=position-segment;
   const a=string.points[segment],b=string.points[segment+1];
   const bulb=decoration('pier-bulb',strip);
   bulb.style.left=`${a[0]+(b[0]-a[0])*fraction}px`;
   bulb.style.top=`${a[1]+(b[1]-a[1])*fraction}px`;
   bulb.style.setProperty('--pier-delay',`${-i/string.bulbs*string.duration-string.offset}s`);
   bulb.style.setProperty('--pier-color',['#ffe0a0','#ffecc4','#b5e4e5','#f0b8c7'][i%4]);
  }
  fairLayers.push({el:strip,bounds:string.bounds});
 }
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
 function layout(){
  // Match background-size:cover and the existing desktop/mobile crop exactly.
  const scale=Math.max(room.clientWidth/1672,room.clientHeight/940);
  plane.style.width='1672px';plane.style.height='940px';
  plane.style.left=`${(room.clientWidth-1672*scale)*(mobile.matches?.55:.5)}px`;
  plane.style.top=`${(room.clientHeight-940*scale)*.5}px`;
  plane.style.transform=`scale(${scale})`;
  syncFair();
 }
 layout();
 function sceneVisible(x,y,width,height){
  // Don't spend an event on scenery outside a narrow screen's natural crop.
  const r=room.getBoundingClientRect();
  const scale=Math.max(room.clientWidth/1672,room.clientHeight/940);
  const left=r.left+(room.clientWidth-1672*scale)*(mobile.matches?.55:.5)+x*scale;
  const top=r.top+(room.clientHeight-940*scale)*.5+y*scale;
  return Math.min(innerWidth,left+width*scale)-Math.max(0,left)>6&&
   Math.min(innerHeight,top+height*scale)-Math.max(0,top)>16;
 }
 function syncFair(){
  const darkness=Number.parseFloat(getComputedStyle(night).opacity)||0;
  const glow=motion.matches?0:Math.pow(Math.max(0,(darkness-.25)/.75),1.6);
  fair.style.setProperty('--fair-light',String(glow));
  for(const layer of fairLayers){
   const visible=sceneVisible(...layer.bounds);
   layer.el.hidden=!visible;
   layer.el.classList.toggle('is-running',visible&&glow>0&&!blocked());
  }
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
  syncFair();
 }
 new MutationObserver(syncPause).observe(root,{attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',syncPause);
 motion.addEventListener('change',syncPause);
 addEventListener('pageshow',syncPause);
 addEventListener('resize',()=>{layout();finish('gull');leaveCrab();finish('moth');});
 addEventListener('scroll',leaveCrab,{passive:true});
 function activity(){idleSince=clock;finish('attract');}
 document.addEventListener('pointerdown',activity,{passive:true});
 document.addEventListener('pointermove',activity,{passive:true});
 document.addEventListener('keydown',activity);
 shelf.addEventListener('scroll',()=>{activity();leaveCrab();},{passive:true});
 setInterval(()=>{
  const now=performance.now(),delta=now-lastTick;lastTick=now;
  syncFair();
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
   else if(kind==='ship')eligible=nightEnough(56000)&&sceneVisible(740,427,368,50);
   else if(kind==='attract'){
    machines=clock-idleSince>=15000?visibleMachines():[];eligible=machines.length>0;
   }
   // Random retries keep all night visitors from starting on the same frame.
   if(!eligible||!start(kind,machines))retryAt[kind]=clock+between(4000,12000);
  }
 },250);
})();
