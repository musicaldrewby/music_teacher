import * as THREE from 'three';
import { buildRoom, ROOM } from './room.js';
import { createHaunting } from './haunting.js';
import { createFlashlight } from './flashlight.js';
import { createVR } from './vr.js';

const $=id=>document.getElementById(id);
const surface=$('scene');
const state={yaw:0,pitch:0,transition:null,quality:'high',keys:new Set(),drag:false,view:'front',moved:false,mood:'haunted',spookyMotion:true};
const presets={
  front:{pos:[.35,1.72,3.75],target:[.2,1.66,-5.8],number:'01',title:'Front of the room',subtitle:'Double doors & display'},
  right:{pos:[-3.10,1.78,-.2],target:[ROOM.width/2,1.6,0],number:'02',title:'The teaching wall',subtitle:'Entry door, whiteboard & storage closets'},
  rear:{pos:[-.25,1.75,-3.95],target:[-.75,1.55,5.8],number:'03',title:'The back wall',subtitle:'Built-in sink, desk nook, piano & percussion'},
  left:{pos:[2.1,1.90,2.9],target:[-ROOM.width/2+.1,2.25,3.0],number:'04',title:'Ukuleles & Orff',subtitle:'Matching window & ukulele-rack width'},
  overview:{pos:[3.0,4.15,4.35],target:[-.6,.9,-.8],number:'05',title:'Room overview',subtitle:'Open movement space & perimeter instruments'}
};
let renderer,scene,camera,room,environment,resizeObserver,firstFrame=true;
let lighting,haunting,flashlight,vr,shadowTick=0;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const lightMoods={
  haunted:{hemi:.22,fill:.055,sun:2.05,bounce:.25,ceiling:1.5,sunColor:0x739dcf,bounceColor:0x7946ab,ceilingColor:0x7b939f,skyColor:0x25345d,environment:.10},
  welcoming:{hemi:1.35,fill:.16,sun:2.25,bounce:.85,ceiling:19,sunColor:0xe1edff,bounceColor:0xffdfb0,ceilingColor:0xffedcf,skyColor:0xffffff,environment:.4},
  daylight:{hemi:1.8,fill:.14,sun:3.0,bounce:.65,ceiling:14,sunColor:0xfff2df,bounceColor:0xe7efff,ceilingColor:0xf2f5ff,skyColor:0xffffff,environment:.4},
  bluehour:{hemi:.56,fill:.12,sun:.55,bounce:.45,ceiling:30,sunColor:0xa3c5ff,bounceColor:0xffcc8d,ceilingColor:0xffd19b,skyColor:0x677eac,environment:.24}
};
function applyLighting(name){
  if(!lighting||!lightMoods[name])return;const p=lightMoods[name];
  for(const key of['hemi','fill','sun','bounce'])lighting[key].intensity=p[key];
  lighting.sun.color.setHex(p.sunColor);lighting.bounce.color.setHex(p.bounceColor);
  for(const light of lighting.ceiling){light.intensity=p.ceiling;light.color.setHex(p.ceilingColor);}
  room.materials['Ceiling light'].emissive.setHex(p.ceilingColor);room.materials['Window sky'].color.setHex(p.skyColor);scene.environmentIntensity=p.environment;
  const spooky=name==='haunted';state.mood=name;haunting?.setActive(spooky);
  scene.fog=spooky?new THREE.FogExp2(0x0b1420,.055):null;
  scene.background.setHex(spooky?0x070c15:0xc3d1d1);
  lighting.hemi.color.setHex(spooky?0x657991:0xe3edff);lighting.hemi.groundColor.setHex(spooky?0x142024:0x989080);
  room.materials['Ceiling light'].emissiveIntensity=spooky?.24:1.25;
  document.body.classList.toggle('haunted',spooky);
  $('hauntToggle').setAttribute('aria-pressed',String(spooky));$('hauntToggleLabel').textContent=spooky?'Spooky mode: on':'Spooky mode: off';
  $('sceneTagline').textContent=spooky?'AFTER HOURS · ULTIMATE SPOOKY':'THE ROOM, IN THREE DIMENSIONS';
  $('hauntControls').hidden=!spooky;$('mood').value=name;
  lighting.sun.target.position.set(2.0,.1,-1.2);
  renderer.shadowMap.needsUpdate=true;
}
function updateHaunting(dt){
  if(state.mood!=='haunted')return;
  const still=reducedMotion.matches||!state.spookyMotion;
  haunting.update(dt,still);
  const t=haunting.time;
  // Out-of-phase fixtures slowly sag and recover, with no rapid flashes.
  let fixtureAverage=0;
  lighting.ceiling.forEach((light,i)=>{
    const phase=t*.40+i*1.17;
    const dip=Math.pow(Math.max(0,Math.sin(t*.17+i*.73)),12);
    const wavering=.77+.15*Math.sin(phase)+.08*Math.sin(t*1.25+i*.91);
    light.intensity=(i%3===1?2.6:.85)*wavering*(1-.84*dip);fixtureAverage+=light.intensity;
  });
  room.materials['Ceiling light'].emissiveIntensity=.06+fixtureAverage/90;
  // A very slow shift in moonlight lets the existing instruments cast moving shadows.
  lighting.sun.target.position.set(2.0+Math.sin(t*.095)*.42,.1,-1.2+Math.cos(t*.075)*.32);
  shadowTick+=dt;if(!still&&shadowTick>.16){renderer.shadowMap.needsUpdate=true;shadowTick=0;}

}
let last=performance.now(),toastTimer=0;
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3200);}
function failure(message){const card=$('loading').querySelector('.loading-card');card.innerHTML='';const h=document.createElement('h2');h.textContent='The classroom couldn’t open';const p=document.createElement('p');p.textContent=message;const b=document.createElement('button');b.className='primary';b.textContent='Try again';b.onclick=()=>location.reload();card.append(h,p,b);$('loading').style.opacity='1';$('loading').hidden=false;}
function render(){if(renderer&&scene&&camera){flashlight?.update(renderer);renderer.render(scene,camera);}}
function toggleFlashlight(){
  if(!flashlight)return;flashlight.setActive(!flashlight.active);
  $('flashlightToggle').setAttribute('aria-pressed',String(flashlight.active));
  $('flashlightLabel').textContent=flashlight.active?'Flashlight on':'Flashlight off';
  if(!vr?.active)toast(flashlight.active?'Flashlight on · Press F to turn it off':'Flashlight off');
}
function makeEnvironment(){
  const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d');
  const g=ctx.createLinearGradient(0,0,0,256);g.addColorStop(0,'#eeece0');g.addColorStop(.40,'#dfddd0');g.addColorStop(.53,'#8f9997');g.addColorStop(1,'#454c4c');ctx.fillStyle=g;ctx.fillRect(0,0,512,256);
  ctx.fillStyle='#fffdf1';for(let i=0;i<5;i++)ctx.fillRect(28+i*100,34,35,28);ctx.fillStyle='#d5edff';ctx.fillRect(300,74,60,50);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.mapping=THREE.EquirectangularReflectionMapping;
  const pmrem=new THREE.PMREMGenerator(renderer);const map=pmrem.fromEquirectangular(tex);pmrem.dispose();tex.dispose();return map;
}
function pointCamera(){camera.rotation.order='YXZ';camera.rotation.set(state.pitch,state.yaw,0);}
function angles(position,target){const d=new THREE.Vector3(...target).sub(new THREE.Vector3(...position));return{yaw:Math.atan2(-d.x,-d.z),pitch:Math.atan2(d.y,Math.hypot(d.x,d.z))};}
function changeView(name,instant=false){
  const p=presets[name];if(!p||!camera||vr?.active)return;
  const a=angles(p.pos,p.target);let delta=a.yaw-state.yaw;while(delta>Math.PI)delta-=Math.PI*2;while(delta<-Math.PI)delta+=Math.PI*2;
  if(instant||matchMedia('(prefers-reduced-motion: reduce)').matches){camera.position.set(...p.pos);state.yaw+=delta;state.pitch=a.pitch;state.transition=null;pointCamera();}
  else state.transition={start:performance.now(),from:camera.position.clone(),to:new THREE.Vector3(...p.pos),yaw0:state.yaw,yaw1:state.yaw+delta,pitch0:state.pitch,pitch1:a.pitch};
  state.view=name;state.moved=false;room.ceiling.visible=name!=='overview';
  $('viewNumber').textContent=p.number;$('viewTitle').textContent=p.title;$('viewSubtitle').textContent=p.subtitle;
  for(const b of document.querySelectorAll('[data-view]')){const active=b.dataset.view===name;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));}
}
function freeView(){state.transition=null;if(!state.moved){state.moved=true;$('viewTitle').textContent='Looking around';$('viewSubtitle').textContent='Choose a wall below to return to a saved view';for(const b of document.querySelectorAll('[data-view]')){b.classList.remove('active');b.setAttribute('aria-pressed','false');}}}
function move(forward,strafe,amount){
  if(vr?.active)return;
  freeView();const x=(-Math.sin(state.yaw)*forward+Math.cos(state.yaw)*strafe)*amount,z=(-Math.cos(state.yaw)*forward-Math.sin(state.yaw)*strafe)*amount;
  // Keep navigation within the clear activity area, away from walls and stands.
  camera.position.x=THREE.MathUtils.clamp(camera.position.x+x,-ROOM.width/2+1.58,ROOM.width/2-1.58);
  camera.position.z=THREE.MathUtils.clamp(camera.position.z+z,-4.85,4.50);
}
function updateSize(){if(!renderer||vr?.active)return;const w=innerWidth,h=innerHeight;renderer.setPixelRatio(Math.min(devicePixelRatio||1,state.quality==='high'?1.75:1));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
function download(blob,filename){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
async function init(){
  try{
    renderer=new THREE.WebGLRenderer({canvas:surface,antialias:true,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:true});
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    scene=new THREE.Scene();scene.background=new THREE.Color(0xc3d1d1);
    camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.035,70);scene.add(camera);flashlight=createFlashlight(camera);
    environment=makeEnvironment();scene.environment=environment.texture;scene.environmentIntensity=.35;
    room=buildRoom();scene.add(room.root);haunting=createHaunting();scene.add(haunting.root);
    const hemi=new THREE.HemisphereLight(0xe3edff,0x989080,1.35);scene.add(hemi);
    const fill=new THREE.AmbientLight(0xffecd5,.16);scene.add(fill);
    // Soft daylight enters from the actual square-window side of the room.
    const sun=new THREE.DirectionalLight(0xe1edff,2.25);sun.position.set(-ROOM.width/2+.65,4.7,3.0);sun.target.position.set(2.0,.1,-1.2);scene.add(sun,sun.target);
    sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-8;sun.shadow.camera.right=8;sun.shadow.camera.top=8;sun.shadow.camera.bottom=-8;sun.shadow.camera.near=.2;sun.shadow.camera.far=24;sun.shadow.bias=-.00015;sun.shadow.normalBias=.025;sun.shadow.radius=3;
    const bounce=new THREE.DirectionalLight(0xffdfb0,.85);bounce.position.set(ROOM.width/2-.7,4.5,-4.3);bounce.target.position.set(-3,1,3);scene.add(bounce,bounce.target);
    const ceilingLights=[];
    for(const x of[-3,0,3])for(const z of[-3.6,0,3.6]){const l=new THREE.PointLight(0xffedcf,19,9,2);l.position.set(x,5.0,z);scene.add(l);ceilingLights.push(l);}
    lighting={hemi,fill,sun,bounce,ceiling:ceilingLights};applyLighting('haunted');
    updateSize();changeView('front',true);wireControls();
    vr=createVR({renderer,scene,camera,room,haunting,lighting,flashlight,toggleFlashlight,applyLighting,state,toast,onExit:updateSize});
    const timer=new THREE.Clock();
    function animate(now,frame){
      const dt=Math.min(timer.getDelta(),.04);
      if(!vr?.active&&state.transition){const t=state.transition,u=THREE.MathUtils.clamp((now-t.start)/1250,0,1),s=u*u*u*(u*(u*6-15)+10);camera.position.lerpVectors(t.from,t.to,s);state.yaw=THREE.MathUtils.lerp(t.yaw0,t.yaw1,s);state.pitch=THREE.MathUtils.lerp(t.pitch0,t.pitch1,s);if(u===1)state.transition=null;pointCamera();}
      let f=0,s=0;
      if(state.keys.has('w')||state.keys.has('arrowup')||state.keys.has('forward'))f++;
      if(state.keys.has('s')||state.keys.has('arrowdown')||state.keys.has('back'))f--;
      if(state.keys.has('a')||state.keys.has('arrowleft')||state.keys.has('left'))s--;
      if(state.keys.has('d')||state.keys.has('arrowright')||state.keys.has('right'))s++;
      if(f||s)move(f,s,dt*1.8/(f&&s?Math.SQRT2:1));
      vr?.update(dt,frame);
      updateHaunting(dt);
      render();
      if(firstFrame){firstFrame=false;$('loading').style.opacity='0';setTimeout(()=>$('loading').hidden=true,650);renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;}
    }
    renderer.setAnimationLoop(animate);
    // A small inspection API supports geometric validation and future edits.
    window.classroom={scene,camera,room,renderer,changeView,haunting,applyLighting,flashlight,toggleFlashlight,vr};
  }catch(error){console.error(error);failure('This view needs WebGL 2. Try a current desktop browser with hardware acceleration enabled. If it still fails, reload the page.');}
}
function wireControls(){
  const pointers=new Map();let pinchDistance=0;
  surface.addEventListener('pointerdown',e=>{if(vr?.active||e.button!==0)return;surface.focus({preventScroll:true});surface.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});state.drag=true;pinchDistance=0;});
  surface.addEventListener('pointermove',e=>{
    if(vr?.active||!pointers.has(e.pointerId))return;const previous=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2){const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(pinchDistance)move(1,0,(distance-pinchDistance)*.015);pinchDistance=distance;return;}
    freeView();state.yaw-=(e.clientX-previous.x)*.0035;state.pitch=THREE.MathUtils.clamp(state.pitch-(e.clientY-previous.y)*.0035,-1.25,1.20);pointCamera();
  });
  const end=e=>{pointers.delete(e.pointerId);pinchDistance=0;state.drag=pointers.size>0;};surface.addEventListener('pointerup',end);surface.addEventListener('pointercancel',end);
  surface.addEventListener('wheel',e=>{e.preventDefault();move(1,0,-THREE.MathUtils.clamp(e.deltaY,-140,140)*.004);},{passive:false});
  addEventListener('keydown',e=>{
    const tag=e.target.tagName?.toLowerCase();
    if(['input','select','textarea'].includes(tag)||e.target.isContentEditable||$('help').open)return;
    const k=e.key.toLowerCase();
    if(k==='f'&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();if(!e.repeat)toggleFlashlight();return;}
    if(tag==='button')return;
    if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){e.preventDefault();state.keys.add(k);}
    if(k==='escape'){$('settings').hidden=true;$('settingsButton').setAttribute('aria-expanded','false');}
  });
  addEventListener('keyup',e=>state.keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>state.keys.clear());
  document.addEventListener('visibilitychange',()=>{state.keys.clear();if(document.hidden)state.drag=false;});
  for(const b of document.querySelectorAll('[data-move]')){b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);state.keys.add(b.dataset.move);});for(const ev of['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>state.keys.delete(b.dataset.move));}
  for(const b of document.querySelectorAll('[data-view]'))b.addEventListener('click',()=>{changeView(b.dataset.view);surface.focus({preventScroll:true});});
  $('settingsButton').onclick=()=>{$('settings').hidden=!$('settings').hidden;$('settingsButton').setAttribute('aria-expanded',String(!$('settings').hidden));};
  $('closeSettings').onclick=()=>{$('settings').hidden=true;$('settingsButton').setAttribute('aria-expanded','false');$('settingsButton').focus();};
  $('helpButton').onclick=()=>{$('help').showModal();state.keys.clear();};
  $('light').oninput=e=>{const value=Number(e.target.value);renderer.toneMappingExposure=1.02*value;$('lightValue').textContent=value<.9?'Soft':value>1.15?'Bright':'Natural';};
  $('mood').onchange=e=>applyLighting(e.target.value);
  $('flashlightToggle').onclick=toggleFlashlight;
  $('hauntToggle').onclick=()=>applyLighting(state.mood==='haunted'?'welcoming':'haunted');
  $('spookyMotion').onchange=e=>{state.spookyMotion=e.target.checked;};
  $('quality').onchange=e=>{state.quality=e.target.value;renderer.shadowMap.enabled=true;updateSize();toast(state.quality==='high'?'High detail enabled':'Balanced rendering enabled');};
  $('spots').onchange=e=>{room.spots.visible=e.target.checked;};
  $('fullscreenButton').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if($('viewer').requestFullscreen)await $('viewer').requestFullscreen();else toast('Fullscreen is not available in this browser.');}catch{toast('Fullscreen is not available in this view.');}};
  document.addEventListener('fullscreenchange',()=>{$('fullscreenButton').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen');});
  $('photoButton').onclick=()=>{render();surface.toBlob(blob=>{if(!blob){toast('Could not save this view. Please try again.');return;}download(blob,'Drews_Classroom_'+state.view+'.png');toast('Classroom view saved.');},'image/png');};
  $('modelButton').onclick=async()=>{
    const b=$('modelButton');b.disabled=true;b.textContent='Preparing the 3D model…';toast('Preparing geometry and textures. This can take a moment.');
    try{const {GLTFExporter}=await import('./vendor/GLTFExporter.js');const exporter=new GLTFExporter();const result=await exporter.parseAsync(haunting.exportWithRoom(room.root),{binary:true,onlyVisible:false,maxTextureSize:1024});download(new Blob([result],{type:'model/gltf-binary'}),state.mood==='haunted'?'Drews_Haunted_Classroom.glb':'Drews_Music_Classroom.glb');toast('3D model saved.');}
    catch(e){console.error(e);toast('The model could not be saved. Please try again.');}
    finally{b.disabled=false;b.innerHTML='Download 3D model <span>GLB</span>';}
  };
  addEventListener('resize',updateSize);
  surface.addEventListener('webglcontextlost',e=>{e.preventDefault();renderer.setAnimationLoop(null);failure('The graphics connection was interrupted. Reload the classroom to continue.');});
}
// Let the initial loading card paint before assembling the complete scene.
requestAnimationFrame(()=>setTimeout(init,60));
