import {keyboardKeys,malletBars,roomAnchor,localRay,pickRoom,pickWorkspace} from './xr-geometry.js';
import {createSpatialWorkspace} from './xr-spatial-workspace.js';
import {createMalletInput} from './xr-mallets.js';
import {createXRInput} from './xr-input.js';
import {createXRRenderer} from './xr-renderer.js';

export function createWebXR(host,env={document,navigator,XRWebGLLayer:globalThis.XRWebGLLayer},makeRenderer=createXRRenderer){
 const $=id=>env.document.getElementById(id),xr=env.navigator.xr;
 let supported=false,checking=false,entering=false,session=null,renderer=null,space=null,anchor=null,raf=null,lastUI=-Infinity,state=null,floorSpace=false;
 let page='play',filter='all',patchPage=0,keys=[],keySignature='',room=null,lastFrame=0,pendingFile=null,uiDirty=true,runtimeError='',pedalActive=false;const gestures=new Map(),systemButtons=new Map(),pedals=new Set();
 const input=createXRInput({noteOn:(note,owner)=>host.noteOn(note,owner),noteOff:owner=>host.noteOff(owner),action:act=>action(act)});
 const mallets=createMalletInput({noteOn:(note,owner,velocity)=>host.noteOn(note,owner,velocity),noteOff:owner=>host.noteOff(owner)});
 function pedal(source,on){if(on)pedals.add(source);else if(source)pedals.delete(source);else pedals.clear();const next=pedals.size>0;if(next!==pedalActive){pedalActive=next;host.sustain?.(next);invalidate()}}
 function release(source){if(source){input.lift(source);mallets.remove(source)}else{input.reset();mallets.reset()}pedal(source,false)}
 const workspace=createSpatialWorkspace(host,{release,invalidate,search:()=>{patchPage=0},recenter:()=>{release();anchor=null},handoff:id=>{pendingFile=id;void end()}},env.storage);
 function updateKeys(){const o=workspace.options,signature=JSON.stringify(o);if(signature!==keySignature){keySignature=signature;keys=o.instrument==='mallets'?malletBars(o.base,o.chromatic,o.height):keyboardKeys(o.base).map(k=>({...k,y:k.y+o.height}))}}
 const message=text=>{$('vr-status').textContent=text};
 function controls(){
  $('vr-enter').disabled=!supported||checking||entering||!!session;
  $('vr-enter').textContent=entering?'Opening VR…':session?'VR is active':host.ready()?'Enter VR':'Enable sound for VR';
  $('vr-exit').hidden=!session;$('vr-check').disabled=checking||entering||!!session;
 }
 async function check(){
  if(entering||session)return;checking=true;controls();
  try{supported=!!xr&&await xr.isSessionSupported('immersive-vr');message(supported?'Quest ready. Enable sound, then enter your studio.':'Open this site in Meta Quest Browser on your headset to enter VR. The regular keyboard works here.')}catch{supported=false;message('VR support could not be checked. Open this site directly in Quest Browser and try again.')}
  finally{checking=false;controls()}
 }
 function invalidate(){uiDirty=true}
 function roomState(){
  const list=host.patches().map((p,index)=>({...p,index})).filter(p=>p.name.toLowerCase().includes(workspace.ui.soundSearch.trim().toLowerCase())).filter(p=>filter==='all'||(filter==='favorites'?p.favorite:filter==='recent'?p.recentOrder>=0:filter==='drums'?p.isDrum:filter==='gm'?!p.isDrum&&p.bankMSB===0&&p.bankLSB===0:!p.isDrum&&(p.bankMSB!==0||p.bankLSB!==0)));if(filter==='recent')list.sort((a,b)=>a.recentOrder-b.recentOrder);
  const pageCount=Math.max(1,Math.ceil(list.length/8));patchPage=Math.max(0,Math.min(patchPage,pageCount-1));
  return {...workspace.snapshot(state),gripSustain:pedalActive,page,filter,base:workspace.options.base,patchPage,pageCount,patches:list.slice(patchPage*8,patchPage*8+8).map(p=>({...p,selected:p.program===state.patch.program&&p.bankMSB===state.patch.bankMSB&&p.bankLSB===state.patch.bankLSB&&p.isDrum===state.patch.isDrum}))};
 }
 function refresh(time){if(time-lastUI<(workspace.dragging||uiDirty?33:100))return;host.tick();const next={...host.snapshot(),workspace:host.workspaceSnapshot?.(workspace.ui)};if(state&&next.inputGeneration!==state.inputGeneration)release();state=next;room=roomState();renderer.update(state,room,input.hovered);lastUI=time;uiDirty=false}
 function hit(frame,source){
  if(!anchor||!space||!renderer||source.targetRayMode!=='tracked-pointer')return null;
  const pose=frame.getPose(source.targetRaySpace,space);if(!pose)return null;
  const ray=localRay(pose.transform,anchor);updateKeys();return {...ray,hit:renderer.surfaces?pickWorkspace(ray.origin,ray.direction,keys,workspace.panels,renderer.surfaces):pickRoom(ray.origin,ray.direction,keys,renderer.buttons)};
 }
 function action(act){
  if(!session)return;
  if(workspace.action(act))return;
  if(['track','patch','scene','transport','octave','recenter','exit'].includes(act.type))release();
  if(act.type==='exit'){void end();return}
  if(act.type==='recenter'){anchor=null;return}
  if(act.type==='page'){page=act.value}
  else if(act.type==='filter'){filter=act.value;patchPage=0}
  else if(act.type==='patch-page'){patchPage+=act.value}
  else Promise.resolve(host.action(act)).catch(()=>message('That control could not complete. Stop playback and try again.'));
  invalidate();
 }
 function selectStart(event){if(session?.visibilityState!=='visible')return;const ray=hit(event.frame,event.inputSource);if(workspace.begin(event.inputSource,ray?.hit,ray)){gestures.set(event.inputSource,'select')}else input.press(event.inputSource,ray?.hit);invalidate()}
 function selectEnd(event){if(gestures.get(event.inputSource)==='select'){workspace.finish(event.inputSource);gestures.delete(event.inputSource)}input.lift(event.inputSource);invalidate()}
 function squeezeStart(event){
  if(session?.visibilityState!=='visible')return;const source=event.inputSource,ray=hit(event.frame,source);if(!ray||workspace.isDragging(source))return;
  if(ray.hit?.kind==='grab'&&workspace.begin(source,ray.hit,ray))gestures.set(source,'squeeze');
  else if(workspace.options.gripPedal&&(!ray.hit||Number.isInteger(ray.hit.note)))pedal(source,true);
 }
 function squeezeEnd(event){const source=event.inputSource;if(gestures.get(source)==='squeeze'){workspace.finish(source);gestures.delete(source)}pedal(source,false)}
 function sourceChange(event){for(const source of event.removed){release(source);input.remove(source);workspace.cancel(source);gestures.delete(source);systemButtons.delete(source)}invalidate()}
 function cancelInteraction(){release();workspace.cancel();gestures.clear()}
 function visibility(){if(session?.visibilityState!=='visible'){cancelInteraction();host.suspend()}else{host.resume();invalidate()}}
 function recenter(){cancelInteraction();anchor=null;invalidate()}
 function cleanup(current){
  if(!current||session!==current)return;
  if(raf!==null)current.cancelAnimationFrame(raf);raf=null;cancelInteraction();input.clear();systemButtons.clear();
  current.removeEventListener('squeezestart',squeezeStart);current.removeEventListener('squeezeend',squeezeEnd);current.removeEventListener('selectstart',selectStart);current.removeEventListener('selectend',selectEnd);current.removeEventListener('inputsourceschange',sourceChange);current.removeEventListener('visibilitychange',visibility);current.removeEventListener('end',onEnd);
  space?.removeEventListener('reset',recenter);renderer?.dispose();renderer=null;space=null;anchor=null;session=null;entering=false;host.ended();controls();if(pendingFile&&$('vr-file-action')){$('vr-file-action').hidden=false;$('vr-file-action').textContent='Continue: '+(host.fileLabel?.(pendingFile)||'open browser control');message('Your song is kept. Tap Continue below for the browser file or device dialog, then return with Enter VR.')}else message(runtimeError||'Back at the keyboard. Your sounds, scenes and song are still here.');
 }
 function onEnd(){cleanup(session)}
 async function end(){const current=session;if(!current)return;cancelInteraction();try{await current.end()}catch{message('Use the Quest system menu to leave VR.')} }
 function frame(time,xrFrame){
  const current=session;if(!current||xrFrame.session!==current||!renderer||!space)return;
  try{
   raf=current.requestAnimationFrame(frame);
   if(current.visibilityState!=='visible')return;
   const pose=xrFrame.getViewerPose(space);if(!pose){cancelInteraction();return}
   if(!anchor)anchor=roomAnchor(pose.transform);updateKeys();
   refresh(time);const dt=Math.min(.05,Math.max(0,(time-lastFrame)/1000));lastFrame=time;
   const rays=[],malletModels=[];
   for(const source of current.inputSources){
    const ray=hit(xrFrame,source),moving=workspace.move(source,ray,dt);
    if(ray){rays.push(ray);if(!moving)input.update(source,ray.hit)}else{input.lift(source);workspace.cancel(source)}
    const grip=source.gripSpace&&xrFrame.getPose(source.gripSpace,space);
    if(!ray||!grip)pedal(source,false);
    if(grip&&workspace.options.instrument==='mallets'){
     const local=localRay(grip.transform,anchor),tip=local.origin.map((o,i)=>o+local.direction[i]*.30);malletModels.push({origin:local.origin,tip,hand:source.handedness});
     mallets.update(source,tip,time,keys,{...workspace.options,velocity:state?.velocity??96,enabled:!moving&&!source.gamepad?.buttons?.[0]?.pressed});
    }else mallets.remove(source);
    const reset=source.gamepad?.mapping==='xr-standard'&&!!source.gamepad.buttons[5]?.pressed;if(reset&&!systemButtons.get(source)){workspace.reset();invalidate()}systemButtons.set(source,reset);
   }
   if(!anchor)return;
   const displayInput={notes:new Set([...input.notes,...mallets.notes]),hovered:input.hovered};
   renderer.render(current,pose,anchor,keys,displayInput,rays,state,floorSpace?Math.max(.8,anchor.y):1.25,{...room,panels:workspace.panels,options:workspace.options,mallets:malletModels});

  }catch(error){runtimeError='VR stopped: '+String(error?.message||'Unexpected error').slice(0,160)+'. Your song is kept. Try Enter VR again.';cancelInteraction();host.suspend();void end();message(runtimeError)}
 }
 async function enter(){
  if(!supported||checking||entering||session)return;
  const currentState=host.snapshot();if(currentState.recording||currentState.busy){message('Finish the current take before entering VR.');return}
  if(!host.ready()){
   entering=true;controls();message('Loading the included SoundFont…');
   try{if(await host.ensureAudio())message('Sound is ready. Tap Enter VR to open the room.');else message('Sound did not load. Check your connection and try again.')}catch{message('Sound did not load. Try enabling sound again.')}
   finally{entering=false;controls()}return;
  }
  entering=true;pendingFile=null;runtimeError='';lastUI=-Infinity;if($('vr-file-action'))$('vr-file-action').hidden=true;controls();let current;
  try{
   // Keep requestSession directly inside the click's user activation.
   current=await xr.requestSession('immersive-vr',{requiredFeatures:['local'],optionalFeatures:['local-floor']});session=current;
   current.addEventListener('end',onEnd);host.resume();host.started();
   renderer=makeRenderer({document:env.document,onLost:()=>{cancelInteraction();host.suspend();void end()}});
   await renderer.gl.makeXRCompatible();if(session!==current)return;
   current.updateRenderState({baseLayer:new env.XRWebGLLayer(current,renderer.gl,{alpha:false,depth:true,stencil:false,antialias:true,framebufferScaleFactor:1}),depthNear:.05,depthFar:20});
   let reference;try{reference=await current.requestReferenceSpace('local-floor');floorSpace=true}catch{reference=await current.requestReferenceSpace('local');floorSpace=false}
   if(session!==current)return;space=reference;space.addEventListener('reset',recenter);
   current.addEventListener('squeezestart',squeezeStart);current.addEventListener('squeezeend',squeezeEnd);current.addEventListener('selectstart',selectStart);current.addEventListener('selectend',selectEnd);current.addEventListener('inputsourceschange',sourceChange);current.addEventListener('visibilitychange',visibility);
   invalidate();raf=current.requestAnimationFrame(frame);message('VR is active. Choose Strike or Hold on the sound panel. Mallets / Keys includes the optional grip sustain pedal.');
  }catch(error){
   if(current){try{await current.end()}catch{}cleanup(current)}
   message(error.name==='NotAllowedError'?'VR permission was declined. Tap Enter VR to try again.':error.name==='NotSupportedError'?'Immersive VR is unavailable in this browser. Try Meta Quest Browser.':'VR could not start. '+(error.message||'Please try again.'));
  }finally{entering=false;controls()}
 }
 if($('vr-file-action'))$('vr-file-action').onclick=()=>{if(pendingFile)host.runFileAction?.(pendingFile)};
 $('vr-enter').onclick=enter;$('vr-exit').onclick=end;$('vr-check').onclick=check;
 xr?.addEventListener?.('devicechange',check);void check();
 return {get active(){return entering||!!session},get presenting(){return !!session},enter,end,check,refresh:controls};
}
