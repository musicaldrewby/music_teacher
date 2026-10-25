import * as THREE from 'three';

// Locomotion is restricted to the existing clear classroom activity area (metres).
export const WALK_AREA={minX:-3.12,maxX:3.12,minZ:-4.85,maxZ:4.50};
export function inWalkArea(p){return p.x>=WALK_AREA.minX&&p.x<=WALK_AREA.maxX&&p.z>=WALK_AREA.minZ&&p.z<=WALK_AREA.maxZ;}
export function moveRigTo(rig,head,destination){
  rig.position.x+=THREE.MathUtils.clamp(destination.x,WALK_AREA.minX,WALK_AREA.maxX)-head.x;
  rig.position.z+=THREE.MathUtils.clamp(destination.z,WALK_AREA.minZ,WALK_AREA.maxZ)-head.z;
  rig.updateMatrixWorld(true);
}
export function turnRig(rig,head,angle){
  const offset=rig.position.clone().sub(head).applyAxisAngle(new THREE.Vector3(0,1,0),angle);
  rig.position.x=head.x+offset.x;rig.position.z=head.z+offset.z;rig.rotation.y+=angle;rig.updateMatrixWorld(true);
}
export function thumbstick(gamepad){
  if(!gamepad||gamepad.mapping!=='xr-standard')return [0,0];
  return [gamepad.axes[2]||0,gamepad.axes[3]||0];
}
export function createVR({renderer,scene,camera,room,haunting,lighting,flashlight,toggleFlashlight,applyLighting,state,toast,onExit}){
  const xr=renderer.xr;xr.enabled=true;xr.setReferenceSpaceType('local-floor');xr.setFramebufferScaleFactor(.85);xr.setFoveation(1);
  const rig=new THREE.Group();rig.name='VR player';scene.add(rig);
  const ui=new THREE.Group();ui.name='VR controls';ui.visible=false;scene.add(ui);
  const overlay=new THREE.Group();overlay.name='VR navigation';overlay.visible=false;scene.add(overlay);
  const button=document.getElementById('vrButton');
  const raycaster=new THREE.Raycaster(),head=new THREE.Vector3(),direction=new THREE.Vector3(),destination=new THREE.Vector3();
  const rotation=new THREE.Matrix4();
  let session=null,saved=null,walk=false,menuPending=false,snapReady=true,active=false,ending=false;
  const controllers=[],actions=[];
  function mesh(geometry,color){return new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color,toneMapped:false}));}
  function label(text,width,height){
    const c=document.createElement('canvas');c.width=1024;c.height=Math.round(1024*height/width);
    const ctx=c.getContext('2d');ctx.fillStyle='#18212f';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#edf4f5';
    ctx.font='500 42px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,c.height/2,980);
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
    const m=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}));
    m.userData.setText=value=>{ctx.fillStyle='#18212f';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#edf4f5';ctx.fillText(value,512,c.height/2,980);texture.needsUpdate=true;};return m;
  }
  const back=mesh(new THREE.BoxGeometry(1.12,1.04,.015),0x101822);ui.add(back);
  const title=label('MR. DREW’S CLASSROOM',1.04,.085);title.position.set(0,.45,.012);ui.add(title);
  const instructions=['Left trigger: hold, aim at floor, release to teleport','Right stick: snap turn · Right grip / A: flashlight','Left grip / X or right B: open or close this menu'];
  instructions.forEach((text,i)=>{const m=label(text,1.04,.055);m.position.set(0,.35-i*.065,.012);ui.add(m);});
  function action(text,x,y,callback){const m=label(text,.49,.095);m.position.set(x,y,.018);m.userData.action=callback;ui.add(m);actions.push(m);return m;}
  action('Spooky lighting',-.265,.085,()=>applyLighting('haunted'));
  action('Welcoming light',.265,.085,()=>applyLighting('welcoming'));
  action('Daylight',-.265,-.035,()=>applyLighting('daylight'));
  action('Blue hour',.265,-.035,()=>applyLighting('bluehour'));
  const torchButton=action('Flashlight: off',-.265,-.155,()=>{toggleFlashlight();refreshLabels();});
  const walkButton=action('Stick walking: off',.265,-.155,()=>{walk=!walk;refreshLabels();document.getElementById('vrWalking').checked=walk;});
  const fogButton=action('Fog motion: on',-.265,-.275,()=>{state.spookyMotion=!state.spookyMotion;document.getElementById('spookyMotion').checked=state.spookyMotion;refreshLabels();});
  action('Exit VR',.265,-.275,()=>endSession());
  action('Close menu',0,-.415,()=>{ui.visible=false;});
  function refreshLabels(){torchButton.userData.setText('Flashlight: '+(flashlight.active?'on':'off'));walkButton.userData.setText('Stick walking: '+(walk?'on':'off'));fogButton.userData.setText('Fog motion: '+(state.spookyMotion?'on':'off'));}
  function placeMenu(){
    camera.getWorldPosition(head);camera.getWorldDirection(direction);direction.y=0;
    if(direction.lengthSq()<.01)direction.set(0,0,-1);direction.normalize();
    ui.position.copy(head).addScaledVector(direction,1.35);ui.position.y=head.y-.08;
    ui.rotation.set(0,Math.atan2(-direction.x,-direction.z),0);ui.updateMatrixWorld(true);ui.visible=true;refreshLabels();
  }
  function toggleMenu(){if(!active)return;if(ui.visible)ui.visible=false;else placeMenu();for(const c of controllers)c.aiming=false;}
  const arcPositions=new Float32Array(51*3);
  const arcGeometry=new THREE.BufferGeometry();arcGeometry.setAttribute('position',new THREE.BufferAttribute(arcPositions,3));
  const arc=new THREE.Line(arcGeometry,new THREE.LineBasicMaterial({color:0x9ff4d9,toneMapped:false}));arc.frustumCulled=false;arc.visible=false;overlay.add(arc);
  const marker=mesh(new THREE.RingGeometry(.16,.23,40),0x9ff4d9);marker.rotation.x=-Math.PI/2;marker.visible=false;overlay.add(marker);
  const origin=new THREE.Vector3(),point=new THREE.Vector3(),previous=new THREE.Vector3();
  let teleportValid=false;
  function traceTeleport(controller){
    controller.updateWorldMatrix(true,false);origin.setFromMatrixPosition(controller.matrixWorld);
    rotation.extractRotation(controller.matrixWorld);direction.set(0,0,-1).applyMatrix4(rotation).normalize();
    previous.copy(origin);let count=1;teleportValid=false;arcPositions.set([origin.x,origin.y,origin.z]);
    for(let i=1;i<=50;i++){
      const t=i*.045;point.copy(origin).addScaledVector(direction,t*5);point.y-=4.9*t*t;
      if(point.y<=.012){
        const alpha=(previous.y-.012)/(previous.y-point.y);destination.copy(previous).lerp(point,alpha);destination.y=.012;
        teleportValid=inWalkArea(destination);arcPositions.set([destination.x,destination.y,destination.z],i*3);count=i+1;break;
      }
      arcPositions.set([point.x,point.y,point.z],i*3);count=i+1;previous.copy(point);
    }
    arc.geometry.attributes.position.needsUpdate=true;arc.geometry.setDrawRange(0,count);
    arc.material.color.setHex(teleportValid?0x9ff4d9:0xe99883);arc.visible=true;
    marker.visible=teleportValid;if(teleportValid)marker.position.copy(destination);
    return teleportValid;
  }
  function menuHit(c){
    if(!ui.visible||!c.node.visible)return null;
    c.node.updateWorldMatrix(true,false);rotation.extractRotation(c.node.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(c.node.matrixWorld);raycaster.ray.direction.set(0,0,-1).applyMatrix4(rotation).normalize();
    return raycaster.intersectObjects(actions,false)[0]||null;
  }
  for(let i=0;i<2;i++){
    const node=xr.getController(i),grip=xr.getControllerGrip(i);rig.add(node,grip);
    const ray=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1)]),new THREE.LineBasicMaterial({color:0xadcde2,toneMapped:false}));ray.scale.z=3;node.add(ray);
    const handle=mesh(new THREE.CapsuleGeometry(.025,.08,3,8),0x9cabb9);grip.add(handle);
    const torch=new THREE.Group();torch.visible=false;node.add(torch);
    const barrel=mesh(new THREE.CylinderGeometry(.028,.023,.14,12),0x3c4755);barrel.rotation.x=Math.PI/2;barrel.position.z=-.015;torch.add(barrel);
    const lens=mesh(new THREE.CircleGeometry(.027,16),0xffe8b5);lens.rotation.y=Math.PI;lens.position.z=-.087;torch.add(lens);
    const c={node,grip,ray,torch,source:null,aiming:false,buttons:[]};controllers.push(c);
    node.addEventListener('connected',e=>{c.source=e.data;c.buttons=[];});
    node.addEventListener('disconnected',()=>{c.source=null;c.aiming=false;c.buttons=[];torch.visible=false;flashlight.setMount(camera);});
    node.addEventListener('selectstart',()=>{
      if(!active||session?.visibilityState==='visible-blurred'||session?.visibilityState==='hidden')return;
      const hit=menuHit(c);if(hit){hit.object.userData.action();c.aiming=false;return;}
      if(c.source?.handedness==='left'&&!ui.visible){c.aiming=true;}
    });
    node.addEventListener('selectend',()=>{
      if(c.aiming&&active&&session?.visibilityState==='visible'&&node.visible&&traceTeleport(node)){
        camera.getWorldPosition(head);moveRigTo(rig,head,destination);
      }
      c.aiming=false;arc.visible=marker.visible=false;
    });
    node.addEventListener('squeezestart',()=>{if(!active||session?.visibilityState!=='visible')return;if(c.source?.handedness==='right'){toggleFlashlight();refreshLabels();}else toggleMenu();});
  }
  function resetShadow(light,size){light.shadow.map?.dispose();light.shadow.map=null;light.shadow.mapSize.set(size,size);light.shadow.needsUpdate=true;renderer.shadowMap.needsUpdate=true;}
  function start(){
    active=true;state.transition=null;state.keys.clear();state.drag=false;
    saved={position:camera.position.clone(),quaternion:camera.quaternion.clone(),fov:camera.fov,zoom:camera.zoom,ceiling:room.ceiling.visible,lights:lighting.ceiling.map(l=>l.visible),clouds:haunting.clouds.map(c=>c.sprite.visible),sunSize:lighting.sun.shadow.mapSize.x,torchSize:flashlight.beam.shadow.mapSize.x};
    rig.position.set(THREE.MathUtils.clamp(camera.position.x,-2.8,2.8),0,THREE.MathUtils.clamp(camera.position.z,-4.2,4.2));rig.rotation.set(0,state.yaw,0);
    rig.add(camera);camera.position.set(0,0,0);camera.quaternion.identity();rig.updateMatrixWorld(true);
    xr.cameraAutoUpdate=false;room.ceiling.visible=true;overlay.visible=true;menuPending=true;snapReady=true;
    walk=document.getElementById('vrWalking').checked;
    lighting.ceiling.forEach((l,i)=>l.visible=i%3===1);haunting.clouds.forEach((c,i)=>c.sprite.visible=i%3===0);
    resetShadow(lighting.sun,1024);resetShadow(flashlight.beam,512);
    button.textContent='Exit VR';button.disabled=false;document.body.classList.add('in-vr');
  }
  function finish(){
    if(!active)return;active=false;session=null;ending=false;
    flashlight.setMount(camera);ui.visible=overlay.visible=arc.visible=marker.visible=false;
    controllers.forEach(c=>{c.aiming=false;c.buttons=[];c.torch.visible=false;});
    scene.add(camera);camera.position.copy(saved.position);camera.quaternion.copy(saved.quaternion);camera.fov=saved.fov;camera.zoom=saved.zoom;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
    rig.position.set(0,0,0);rig.rotation.set(0,0,0);xr.cameraAutoUpdate=true;
    room.ceiling.visible=saved.ceiling;lighting.ceiling.forEach((l,i)=>l.visible=saved.lights[i]);haunting.clouds.forEach((c,i)=>c.sprite.visible=saved.clouds[i]);
    resetShadow(lighting.sun,saved.sunSize);resetShadow(flashlight.beam,saved.torchSize);
    button.textContent='Enter VR';button.disabled=false;document.body.classList.remove('in-vr');state.keys.clear();onExit();
  }
  xr.addEventListener('sessionstart',start);xr.addEventListener('sessionend',finish);
  async function endSession(){if(ending||!session)return;ending=true;try{await session.end();}catch{ending=false;toast('Use the headset’s system menu to exit VR.');}}
  button.onclick=async()=>{
    if(session){await endSession();return;}button.disabled=true;button.textContent='Opening VR…';
    try{
      session=await navigator.xr.requestSession('immersive-vr',{requiredFeatures:['local-floor'],optionalFeatures:['bounded-floor']});
      session.addEventListener('visibilitychange',()=>{controllers.forEach(c=>{c.aiming=false;c.buttons=[];});arc.visible=marker.visible=false;});
      await xr.setSession(session);
    }catch(error){
      const failed=session;session=null;if(failed)try{await failed.end();}catch{}
      finish();button.disabled=false;button.textContent='Enter VR';
      toast(error.name==='NotAllowedError'?'VR permission was declined. Press Enter VR to try again.':'Could not start VR. Open this link directly in the Quest Browser and try again.');console.warn('VR session could not start:',error);
    }
  };
  async function detect(){
    if(!window.isSecureContext||!navigator.xr){button.textContent='VR · Use Quest Browser';button.disabled=true;return;}
    try{const supported=await navigator.xr.isSessionSupported('immersive-vr');button.disabled=!supported;button.textContent=supported?'Enter VR':'VR · Headset unavailable';}
    catch{button.textContent='VR · Open site directly';button.disabled=true;}
  }
  navigator.xr?.addEventListener('devicechange',detect);detect();
  function update(dt,frame){
    if(!active||!frame)return;
    rig.updateMatrixWorld(true);xr.updateCamera(camera);
    if(menuPending){placeMenu();menuPending=false;}
    if(session.visibilityState!=='visible'){arc.visible=marker.visible=false;return;}
    const right=controllers.find(c=>c.source?.handedness==='right'&&c.node.visible);
    flashlight.setMount(right?right.node:camera);
    for(const c of controllers)c.torch.visible=c===right;
    camera.getWorldPosition(head);
    let snapX=0;
    for(const c of controllers){
      if(!c.source||!c.node.visible)continue;
      const gp=c.source.gamepad,[x,y]=thumbstick(gp);
      const pressed=index=>!!gp?.buttons[index]?.pressed;
      const edge=index=>pressed(index)&&!c.buttons[index];
      if(c.source.handedness==='right'){
        snapX=x;if(edge(4)){toggleFlashlight();refreshLabels();}if(edge(5))toggleMenu();
      }else if(c.source.handedness==='left'){
        if(edge(4))toggleMenu();
        if(walk&&!ui.visible&&(Math.abs(x)>.2||Math.abs(y)>.2)){
          camera.getWorldDirection(direction);direction.y=0;direction.normalize();
          const sx=Math.abs(x)>.2?x:0,sy=Math.abs(y)>.2?y:0,scale=dt*1.25/Math.max(1,Math.hypot(sx,sy));
          destination.set(head.x+(-direction.z*sx-direction.x*sy)*scale,head.y,head.z+(direction.x*sx-direction.z*sy)*scale);
          moveRigTo(rig,head,destination);xr.updateCamera(camera);camera.getWorldPosition(head);
        }
      }
      c.buttons=gp?gp.buttons.map(b=>b.pressed):[];
    }
    if(Math.abs(snapX)<.25)snapReady=true;
    if(Math.abs(snapX)>.7&&snapReady&&!ui.visible){turnRig(rig,head,-Math.sign(snapX)*Math.PI/6);snapReady=false;xr.updateCamera(camera);}
    let aiming=false;
    for(const c of controllers){
      c.ray.visible=!!c.source&&ui.visible;
      if(c.ray.visible){const hit=menuHit(c);c.ray.scale.z=hit?hit.distance:2;c.ray.material.color.setHex(hit?0xffe5a0:0xadcde2);}
      if(c.aiming&&!ui.visible&&c.node.visible){traceTeleport(c.node);aiming=true;}
    }
    if(!aiming)arc.visible=marker.visible=false;
  }
  return {update,rig,controllers,ui,toggleMenu,endSession,get active(){return active;}};
}
