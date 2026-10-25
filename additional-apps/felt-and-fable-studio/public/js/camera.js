'use strict';
// Camera coordinates are in the 1600 x 900 story world, not screen pixels.
let cameraZoomEditing=false,cameraDragMode=false,cameraGesture=null,cameraClipboard=null,cameraKeySignature='';
const CAMERA_EASES=['smooth','linear','hold'];
function cameraClamp(p){
 const roll=Math.max(-20,Math.min(20,Number.isFinite(p?.roll)?p.roll:0)),r=Math.abs(roll)*Math.PI/180,co=Math.cos(r),si=Math.sin(r);
 const zoom=Math.max(co+H/W*si,co+W/H*si,Math.min(4,Number.isFinite(p?.zoom)?p.zoom:1)),hx=(W*co+H*si)/(2*zoom),hy=(H*co+W*si)/(2*zoom);
 return {x:Math.max(hx,Math.min(W-hx,Number.isFinite(p?.x)?p.x:W/2)),y:Math.max(hy,Math.min(H-hy,Number.isFinite(p?.y)?p.y:H/2)),zoom,...(p?.roll!==undefined?{roll}:{})};
}
function cameraBaseAt(s,t=0){
 const shot=cinemaCameraAt(s,t);if(shot)return shot;const c=s.camera,keys=c?.keys;
 if(!keys?.length)return cameraClamp(c);
 if(t<=keys[0].t)return cameraClamp(keys[0].pose);
 if(t>=keys.at(-1).t)return cameraClamp(keys.at(-1).pose);
 let i=1;while(keys[i].t<t)i++;
 if(Math.abs(keys[i].t-t)<1e-9)return cameraClamp(keys[i].pose);
 const a=keys[i-1],b=keys[i],u=easeAnimation((t-a.t)/(b.t-a.t),a.ease);
 return cameraClamp({x:a.pose.x+(b.pose.x-a.pose.x)*u,y:a.pose.y+(b.pose.y-a.pose.y)*u,zoom:a.pose.zoom+(b.pose.zoom-a.pose.zoom)*u,...(a.pose.roll!==undefined||b.pose.roll!==undefined?{roll:(a.pose.roll||0)+((b.pose.roll||0)-(a.pose.roll||0))*u}:{})});
}
function cameraAt(s,t=0){if(studioCameraOverride?.sceneId===s.id)return studioCameraOverride.pose;t=cineCameraTime(s,t);return movieCameraAt(s,t,cameraBaseAt(s,t))}
function applyCameraTransform(g,p){g.translate(W/2,H/2);g.scale(p.zoom,p.zoom);if(p.roll)g.rotate(-p.roll*Math.PI/180);g.translate(-p.x,-p.y)}
function cameraScreenToWorld(p,c){const r=(c.roll||0)*Math.PI/180,x=(p[0]-W/2)/c.zoom,y=(p[1]-H/2)/c.zoom;return[x*Math.cos(r)-y*Math.sin(r)+c.x,x*Math.sin(r)+y*Math.cos(r)+c.y]}
function cameraWorldToScreen(p,c){const r=-(c.roll||0)*Math.PI/180,x=p[0]-c.x,y=p[1]-c.y;return[(x*Math.cos(r)-y*Math.sin(r))*c.zoom+W/2,(x*Math.sin(r)+y*Math.cos(r))*c.zoom+H/2]}
function validateCamera(s){
 if(s.camera===undefined)return;
 const c=s.camera;
 function check(p){if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||!Number.isFinite(p.zoom)||p.zoom<1||p.zoom>4||p.x<0||p.x>W||p.y<0||p.y>H)throw Error('Invalid camera framing.')}
 check(c);
 if(c.keys!==undefined){if(!Array.isArray(c.keys)||c.keys.length>1500)throw Error('Invalid camera keys.');let last=-1;for(const k of c.keys){if(!Number.isFinite(k.t)||k.t<0||k.t>7199||k.t<=last||!CAMERA_EASES.includes(k.ease))throw Error('Invalid camera timing.');check(k.pose);last=k.t}}
}
function cameraBusy(){return !!(animRun||storyPlayback||exportJob||presenting)}
function ensureCamera(s=scene()){if(!s.camera)s.camera=cameraClamp();return s.camera}
function cameraPutKey(s,t,p,ease){
 const c=ensureCamera(s);t=frameTime(t);const pose=cameraClamp(p);
 if(!c.keys?.length)c.keys=[{t:0,pose:cameraClamp(c),ease:'smooth'}];
 let k=c.keys.find(k=>Math.abs(k.t-t)<KEY_TOLERANCE);
 if(k){k.pose=pose;if(ease)k.ease=ease}else{if(c.keys.length>=1500)throw Error('This scene already has 1500 camera keys.');k={t,pose,ease:ease||'smooth'};c.keys.push(k);c.keys.sort((a,b)=>a.t-b.t)}return k;
}
function cameraWrite(p){if(cinemaWriteCamera(p))return;const c=ensureCamera();p=cameraClamp(p);if(c.keys?.length)cameraPutKey(scene(),animTime,p);else Object.assign(c,p);dirty=true;cameraKeySignature=''}
function cameraChange(p){if(cameraBusy())return;checkpoint();cameraWrite(p);refresh()}
function cameraFramePose(list,fill=.76){
 const current=cameraAt(scene(),animTime);if(!list.length)return current;
 const b=bounds(list);return cameraClamp({x:b.cx,y:b.cy,zoom:Math.min(4,Math.max(1,Math.min(W*fill/Math.max(1,b.w),H*fill/Math.max(1,b.h))))});
}
function cameraPreset(kind){
 if(cameraBusy())return;
 const c=cameraAt(scene(),animTime),list=chosen().filter(o=>!o.hidden),b=list.length?bounds(list):null;
 if(kind==='wide')cameraChange({x:W/2,y:H/2,zoom:1});
 else if(kind==='frame'){if(!list.length)return toast('Select a character or group first.');cameraChange(cameraFramePose(list))}
 else{const zoom=kind==='medium'?1.8:3;cameraChange({x:b?.cx??c.x,y:kind==='close'&&b?b.y+b.h*.32:(b?.cy??c.y),zoom})}
}
function setCameraDragMode(on){if(on)offstagePanMode=false;cameraDragMode=!!on;canvas.style.cursor=on?'grab':tool==='select'?'default':'crosshair';$('cameraDrag').classList.toggle('active',on);$('cameraDrag').setAttribute('aria-pressed',String(on));$('cameraDrag').textContent=on?'Done moving camera':'Drag camera on board'}
function openCameraPanel(){
 if(studioUIReady&&!['build','animate'].includes(studioWorkspace))setStudioWorkspace('animate');
 stopAnimationPreview();stopStoryPlayback();setTool('select');
 document.body.classList.remove('focus-board','hide-inspector','mobile-collection');if(window.innerWidth<=900)document.body.classList.add('mobile-properties');
 $('cameraPanel').open=true;syncWorkspaceChrome();$('propertiesPanel').scrollTop=0;renderCameraUI();
}
function cameraAddKey(){if(cameraBusy())return;if(scene().cinema?.shots?.length)return toast('Use the shot Start / End controls to edit camera motion.');const p=cameraAt(scene(),animTime);checkpoint();cameraPutKey(scene(),animTime,p);cameraKeySignature='';refresh()}
function cameraRemoveKey(){
 if(cameraBusy())return;const c=scene().camera,k=c?.keys?.find(k=>Math.abs(k.t-animTime)<KEY_TOLERANCE);if(!k)return;
 const p=cameraAt(scene(),animTime);checkpoint();c.keys=c.keys.filter(v=>v!==k);if(!c.keys.length){delete c.keys;Object.assign(c,p)}cameraKeySignature='';refresh();
}
function cameraClearMotion(){if(cameraBusy()||!scene().camera?.keys?.length)return;const p=cameraAt(scene(),animTime);checkpoint();scene().camera=p;cameraKeySignature='';refresh();toast('Camera motion cleared; the current framing is kept.')}
function cameraRetime(value){
 if(cameraBusy())return;const c=scene().camera,k=c?.keys?.find(k=>Math.abs(k.t-animTime)<KEY_TOLERANCE),v=Number(value);
 if(!k)return;if(!Number.isFinite(v)||v<0||v>7199){toast('Enter a key time from 0 to 7199 seconds.');renderCameraUI();return}
 const t=frameTime(v);if(c.keys.some(other=>other!==k&&Math.abs(other.t-t)<KEY_TOLERANCE)){toast('There is already a camera key at that time.');renderCameraUI();return}
 checkpoint();k.t=t;c.keys.sort((a,b)=>a.t-b.t);animTime=t;cameraKeySignature='';refresh();
}
function cameraQuickMove(kind){
 if(cameraBusy())return;if(scene().cinema?.shots?.length)return cinemaQuickShotMove(kind);if(scene().camera?.keys?.length&&!confirm('Replace the camera motion in this scene? You can undo this.'))return;
 let a=cameraAt(scene(),animTime),b;const length=sceneSeconds(scene());
 if(kind==='push'){b=chosen().length?cameraFramePose(chosen()):cameraClamp({...a,zoom:Math.min(4,a.zoom*1.65)})}
 else if(kind==='pull'){if(a.zoom===1)a=cameraClamp({...a,zoom:2.3});b=cameraClamp()}
 else{const zoom=Math.max(1.7,a.zoom);a=cameraClamp({x:W/(2*zoom),y:a.y,zoom});b=cameraClamp({x:W-W/(2*zoom),y:a.y,zoom})}
 checkpoint();scene().duration=length;scene().camera={...a,keys:[{t:0,pose:a,ease:'smooth'},{t:frameTime(length-1/ANIMATION_FPS),pose:b,ease:'smooth'}]};animTime=0;cameraKeySignature='';refresh();
}
function cameraNewShot(){
 if(cameraBusy())return;if(state.scenes.length>=100)return toast('A story can contain up to 100 scenes.');
 const current=scene(),p=cameraAt(current,animTime),frozen=current.items.map(o=>Object.assign(animationTree(copy(o),animTime),cinemaVisualPose(o,animTime,current)));
 function freeze(o){delete o.attachment;delete o.bubbleAim;delete o.tailTip;delete o.dialogue;if(o.acting){delete o.acting.cues;delete o.acting.phase}delete o.keyframes;delete o.animationBlocks;o.children?.forEach(freeze)}frozen.forEach(freeze);frozen.forEach(remapIDs);
 const next={id:id(),name:'Shot '+(state.scenes.length+1),bg:current.bg,bgColor:current.bgColor,caption:'',duration:6,items:frozen,camera:p};
 checkpoint();state.scenes.splice(state.active+1,0,next);switchScene(state.active+1);openCameraPanel();toast('New shot created. Choose a framing; your characters kept their positions.');
}
function renderCameraUI(){
 if(!$('cameraPanel'))return;const open=$('cameraPanel').open;
 $('openCamera').classList.toggle('active',open);$('openCamera').setAttribute('aria-expanded',String(open));if(!open)return;
 const p=cameraAt(scene(),animTime),keys=scene().camera?.keys||[],exact=keys.find(k=>Math.abs(k.t-animTime)<KEY_TOLERANCE),busy=cameraBusy(),total=sceneSeconds(scene());
 const set=(name,value)=>{if(document.activeElement!==$(name))$(name).value=value};
 set('cameraZoom',p.zoom);$('cameraZoomValue').textContent=Math.round(p.zoom*100)+'%';set('cameraX',Math.round(p.x));set('cameraY',Math.round(p.y));set('cameraTime',Number(animTime.toFixed(3)));set('cameraSeek',animTime);$('cameraSeek').max=total;$('cameraTime').max=total;
 $('cameraPlay').textContent=animRun?'Pause':'Play';set('cameraEase',exact?.ease||'smooth');set('cameraKeyTime',exact?Number(exact.t.toFixed(3)):'');
 for(const name of ['cameraWide','cameraMedium','cameraClose','cameraZoom','cameraX','cameraY','cameraDrag','cameraAddKey','cameraPush','cameraPull','cameraPan','cameraNewShot'])$(name).disabled=busy;
 $('cameraFrame').disabled=busy||!chosen().length;$('cameraDeleteKey').disabled=busy||!exact;$('cameraEase').disabled=busy||!exact;$('cameraKeyTime').disabled=busy||!exact;$('cameraClear').disabled=busy||!keys.length;$('cameraPaste').disabled=busy||!cameraClipboard;
 $('cameraKeyHint').textContent=keys.length?'Camera motion is on. Changes add or update a key at '+animTime.toFixed(2)+' s.':'Static shot. Add a camera key, move the playhead, then change the framing.';
 const sig=JSON.stringify([scene().id,keys,exact?.t]);if(sig!==cameraKeySignature){cameraKeySignature=sig;$('cameraKeys').replaceChildren();for(const k of keys){const b=document.createElement('button');b.textContent=k.t.toFixed(2)+' s';b.className=k===exact?'active':'';b.title='Camera key · '+k.ease;b.onclick=()=>seekAnimation(k.t);$('cameraKeys').append(b)}}
 const map=$('cameraMap'),g=map.getContext('2d');g.clearRect(0,0,map.width,map.height);drawScene(g,scene(),map.width,map.height,animTime,true);
 const sx=map.width/W,sy=map.height/H,points=[[0,0],[W,0],[W,H],[0,H]].map(q=>cameraScreenToWorld(q,p));
 g.fillStyle='#10282066';g.beginPath();g.rect(0,0,map.width,map.height);points.forEach((q,i)=>i?g.lineTo(q[0]*sx,q[1]*sy):g.moveTo(q[0]*sx,q[1]*sy));g.closePath();g.fill('evenodd');g.strokeStyle='#fff5a8';g.lineWidth=3;g.beginPath();points.forEach((q,i)=>i?g.lineTo(q[0]*sx,q[1]*sy):g.moveTo(q[0]*sx,q[1]*sy));g.closePath();g.stroke();
}
function cameraBeginGesture(e,source){
 if(!ready||e.button!==0||cameraBusy()||(source==='board'&&!cameraDragMode))return;
 e.preventDefault();e.stopImmediatePropagation();const el=source==='board'?canvas:$('cameraMap');el.setPointerCapture(e.pointerId);
 cameraGesture={source,pointer:e.pointerId,x:e.clientX,y:e.clientY,start:cameraAt(scene(),animTime),viewZoom:editorCamera().zoom,changed:false};if(source==='map')cameraMoveGesture(e);
}
function cameraMoveGesture(e){
 const d=cameraGesture;if(!d||d.pointer!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();
 let p;if(d.source==='map'){const r=$('cameraMap').getBoundingClientRect();p={...d.start,x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
 else{const r=canvas.getBoundingClientRect(),view={...d.start,zoom:d.viewZoom},a=cameraScreenToWorld([W/2,H/2],view),b=cameraScreenToWorld([W/2+(e.clientX-d.x)*W/r.width,H/2+(e.clientY-d.y)*H/r.height],view);p={...d.start,x:d.start.x-(b[0]-a[0]),y:d.start.y-(b[1]-a[1])}}
 p=cameraClamp(p);const cur=cameraAt(scene(),animTime);if(Math.abs(p.x-cur.x)+Math.abs(p.y-cur.y)<.01)return;
 if(!d.changed){checkpoint();d.changed=true}cameraWrite(p);draw();
}
function cameraEndGesture(e){const d=cameraGesture;if(!d||d.pointer!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();cameraGesture=null;if(d.changed)refresh()}
function initCameraUI(){
 $('openCamera').onclick=()=>{if($('cameraPanel').open){$('cameraPanel').open=false;setCameraDragMode(false);renderCameraUI()}else openCameraPanel()};
 $('cameraPanel').addEventListener('toggle',()=>{if(!$('cameraPanel').open)setCameraDragMode(false);renderCameraUI()});
 for(const [name,kind]of [['cameraWide','wide'],['cameraMedium','medium'],['cameraClose','close'],['cameraFrame','frame']])$(name).onclick=()=>cameraPreset(kind);
 $('cameraZoom').oninput=e=>{if(cameraBusy())return;if(!cameraZoomEditing){checkpoint();cameraZoomEditing=true}cameraWrite({...cameraAt(scene(),animTime),zoom:Number(e.target.value)});draw()};
 $('cameraZoom').onchange=e=>{if(cameraZoomEditing){cameraZoomEditing=false;refresh()}else cameraChange({...cameraAt(scene(),animTime),zoom:Number(e.target.value)})};
 $('cameraZoom').onblur=()=>{if(cameraZoomEditing){cameraZoomEditing=false;refresh()}};
 for(const [name,prop]of [['cameraX','x'],['cameraY','y']])$(name).onchange=e=>{const v=Number(e.target.value);if(Number.isFinite(v))cameraChange({...cameraAt(scene(),animTime),[prop]:v})};
 $('cameraDrag').onclick=()=>{if(cameraBusy())return;const on=!cameraDragMode;setTool('select');setCameraDragMode(on)};
 $('cameraAddKey').onclick=cameraAddKey;$('cameraDeleteKey').onclick=cameraRemoveKey;$('cameraClear').onclick=cameraClearMotion;$('cameraKeyTime').onchange=e=>cameraRetime(e.target.value);
 $('cameraEase').onchange=e=>{if(cameraBusy())return;const k=scene().camera?.keys?.find(k=>Math.abs(k.t-animTime)<KEY_TOLERANCE);if(k&&CAMERA_EASES.includes(e.target.value)){checkpoint();k.ease=e.target.value;cameraKeySignature='';refresh()}};
 $('cameraTime').onchange=e=>seekAnimation(e.target.value);$('cameraSeek').oninput=e=>seekAnimation(e.target.value);$('cameraStart').onclick=()=>seekAnimation(0);$('cameraPlay').onclick=playAnimationSlide;
 for(const [name,kind]of [['cameraPush','push'],['cameraPull','pull'],['cameraPan','pan']])$(name).onclick=()=>cameraQuickMove(kind);
 $('cameraCopy').onclick=()=>{cameraClipboard=cameraAt(scene(),animTime);renderCameraUI();toast('Framing copied. Paste it into any scene.')};$('cameraPaste').onclick=()=>{if(cameraClipboard)cameraChange(cameraClipboard)};$('cameraNewShot').onclick=cameraNewShot;
 for(const [el,source]of [[canvas,'board'],[$('cameraMap'),'map']]){
 el.addEventListener('pointerdown',e=>cameraBeginGesture(e,source),true);el.addEventListener('pointermove',cameraMoveGesture,true);el.addEventListener('pointerup',cameraEndGesture,true);el.addEventListener('pointercancel',cameraEndGesture,true);el.addEventListener('lostpointercapture',cameraEndGesture,true);
 }
 canvas.addEventListener('dblclick',e=>{if(cameraDragMode){e.preventDefault();e.stopImmediatePropagation()}},true);
 canvas.addEventListener('wheel',e=>{if(!cameraDragMode||cameraBusy())return;e.preventDefault();const c=cameraAt(scene(),animTime);cameraChange({...c,zoom:c.zoom*Math.exp(-Math.max(-100,Math.min(100,e.deltaY))*.002)})},{passive:false});
 $('cameraMap').addEventListener('keydown',e=>{const deltas={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},d=deltas[e.key];if(!d||cameraBusy())return;e.preventDefault();e.stopPropagation();const c=cameraAt(scene(),animTime),n=e.shiftKey?50:10;cameraChange({...c,x:c.x+d[0]*n,y:c.y+d[1]*n})});
}
