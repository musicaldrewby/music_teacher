import * as T from 'three';
import {Engine} from './engine';
import {SoundPreview} from './audio';
import {bakeIsCurrent} from './physics-playground';
import {sampleCamera} from './sequence';
import {sceneSchema,type Scene,type CameraPose} from './scene';
import {manipulationReason,offsetObject,readTransform,stagePlacement,cameraFromHead,addXRView,type Transform,type XRScaleMode} from './xr-math';

type Options={mode:XRScaleMode;quality:'balanced'|'sharp';shadows:boolean;seated:boolean};
type Controller={ray:T.Group;grip:T.Group;line:T.Line;source?:XRInputSource;turnReady:boolean;menuDown:boolean};
type Grab={controller:Controller;node:T.Object3D;id:string;piece:boolean;before:Transform;offset:T.Matrix4;factor:number;matrix:T.Matrix4};
type PanelButton={x:number;y:number;w:number;h:number;label:string;action:()=>void};
export type XRReport={active:boolean;message:string;time:number;playing:boolean;views:number;changed:boolean};

/** A separate renderer keeps immersive frame pacing and settings independent of export. */
export class XRStudio {
 readonly engine:Engine;
 readonly world=new T.Scene();
 readonly stage=new T.Group();
 readonly rig=new T.Group();
 readonly camera=new T.PerspectiveCamera(50,16/9,.02,3000);
 private panelCanvas:HTMLCanvasElement;
 private panelTexture:T.CanvasTexture;
 private panel:T.Mesh<T.PlaneGeometry,T.MeshBasicMaterial>;
 private controllers:Controller[]=[];
 private buttons:PanelButton[]=[];
 private raycaster=new T.Raycaster();
 private session?:XRSession;
 private grab?:Grab;
 private history:Scene[]=[];
 private bounds=new T.Box3();
 private sound=new SoundPreview();
 private original:string;
 private disposed=false;
 private busy=false;
 private ending=false;
 private placed=false;
 private last=0;
 private lastPanel=0;
 private message='Point at a layer and hold the trigger to move it.';
 private selected='';
 private hover='';
 playing=false;
 time:number;
 draft:Scene;
 onReport?:(state:XRReport)=>void;
 onFinish?:(scene:Scene,changed:boolean)=>void;
 constructor(canvas:HTMLCanvasElement,scene:Scene,time:number,private options:Options,private spawn:CameraPose){
  this.draft=structuredClone(scene);this.original=JSON.stringify(scene);this.time=time;
  this.engine=new Engine(canvas,false);
  this.engine.renderer.xr.enabled=true;
  this.engine.renderer.xr.setReferenceSpaceType('local-floor');
  this.engine.renderer.xr.setFramebufferScaleFactor(options.quality==='sharp'?1.15:.85);
  this.engine.renderer.xr.setFoveation(options.quality==='sharp'?.25:.65);
  this.engine.renderer.shadowMap.enabled=options.shadows;
  this.engine.renderer.setSize(960,540,false);
  this.stage.add(this.engine.world);this.world.add(this.stage,this.rig);this.rig.add(this.camera);
  this.panelCanvas=document.createElement('canvas');this.panelCanvas.width=1200;this.panelCanvas.height=680;
  this.panelTexture=new T.CanvasTexture(this.panelCanvas);this.panelTexture.colorSpace=T.SRGBColorSpace;
  this.panel=new T.Mesh(new T.PlaneGeometry(1.12,.635),new T.MeshBasicMaterial({map:this.panelTexture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false}));
  this.panel.renderOrder=1000;this.world.add(this.panel);
  for(let i=0;i<2;i++){
   const ray=this.engine.renderer.xr.getController(i),grip=this.engine.renderer.xr.getControllerGrip(i);
   const line=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3(0,0,-1)]),new T.LineBasicMaterial({color:i?'#80e9ff':'#bba5ff',transparent:true,opacity:.8,depthTest:false}));line.scale.z=4;line.renderOrder=999;ray.add(line);
   const handle=new T.Mesh(new T.CapsuleGeometry(.018,.07,3,8),new T.MeshBasicMaterial({color:i?'#80e9ff':'#bba5ff'}));handle.rotation.x=Math.PI/2;grip.add(handle);
   const c:Controller={ray,grip,line,turnReady:true,menuDown:false};this.controllers.push(c);this.rig.add(ray,grip);
   ray.addEventListener('connected',e=>{c.source=e.data;});
   ray.addEventListener('disconnected',()=>{if(this.grab?.controller===c)this.release();c.source=undefined;});
   ray.addEventListener('selectstart',()=>this.select(c));
   ray.addEventListener('selectend',()=>{if(this.grab?.controller===c)this.release();});
   ray.addEventListener('squeezestart',()=>this.select(c,true));
   ray.addEventListener('squeezeend',()=>{if(this.grab?.controller===c)this.release();});
  }
 }
 async prepare(){
  await this.engine.sync(this.draft);if(this.disposed)return;this.configureQuality();
  this.engine.sample(this.time);this.bounds.makeEmpty();
  for(const node of [...this.engine.objects.values(),...(this.engine.stage?[this.engine.stage]:[])]){
   node.traverse(n=>{if(n instanceof T.Mesh&&n.visible&&!n.userData.editorHelper&&!n.userData.globeGlass){n.geometry.computeBoundingBox();if(n.geometry.boundingBox)this.bounds.union(n.geometry.boundingBox.clone().applyMatrix4(n.matrixWorld));}});
  }
  if(this.bounds.isEmpty())this.bounds.set(new T.Vector3(-2,0,-2),new T.Vector3(2,3,2));
  // Prepare audio off the immersive frame loop; audio failures do not block VR.
  void this.sound.prepare(this.draft).catch(()=>{});
 }
 async enter(){
  if(this.disposed||this.session)return;
  if(!navigator.xr)throw Error('Open Prism in Quest Browser to enter VR.');
  // Request immediately within the Enter VR click, before any asynchronous work.
  const pending=navigator.xr.requestSession('immersive-vr',{requiredFeatures:['local-floor'],optionalFeatures:['bounded-floor']});
  void this.sound.unlock().catch(()=>{});
  const session=await pending;
  if(this.disposed){await session.end();return;}
  this.session=session;session.addEventListener('end',this.finish,{once:true});session.addEventListener('visibilitychange',this.visibility);
  try{
   await this.engine.renderer.xr.setSession(session);
   if(this.disposed||this.session!==session){await session.end().catch(()=>{});return;}
   this.engine.renderer.setAnimationLoop(this.frame);this.report('VR ready. Hold a trigger to grab. A or X brings back the controls.');
  }catch(e){session.removeEventListener('end',this.finish);session.removeEventListener('visibilitychange',this.visibility);this.session=undefined;await session.end().catch(()=>{});throw e;}
 }
 private visibility=()=>{if(this.session?.visibilityState!=='visible'){this.release();this.setPlaying(false);}};
 private report(message=this.message){this.message=message;this.onReport?.({active:!!this.session,message,time:this.time,playing:this.playing,views:this.draft.xrViews.length,changed:JSON.stringify(this.draft)!==this.original});this.drawPanel();}
 private setPlaying(value:boolean){
  if(value&&(this.busy||this.grab))return;
  if(value&&this.draft.objects.some(o=>o.body.mode==='dynamic')&&!bakeIsCurrent(this.draft)){this.report('Bake the physics simulation in the regular studio before playback.');return;}
  this.playing=value;
  if(value)void this.sound.play(this.draft,()=>this.time,()=>this.playing&&!this.disposed).catch(()=>this.report('Animation playing. Audio could not start.'));
  else this.sound.stop();this.drawPanel();
 }
 private head(){const c=this.engine.renderer.xr.getCamera();return {position:new T.Vector3().setFromMatrixPosition(c.matrixWorld),forward:new T.Vector3(0,0,-1).transformDirection(c.matrixWorld)};}
 private configureQuality(){
  const renderer=this.engine.renderer;renderer.shadowMap.enabled=this.options.shadows;renderer.shadowMap.type=T.PCFSoftShadowMap;
  this.engine.lights.traverse(n=>{if(n instanceof T.DirectionalLight||n instanceof T.SpotLight||n instanceof T.PointLight)n.shadow.mapSize.set(512,512);});
 }
 private recenterPanel(){
  const {position,forward}=this.head(),flat=forward.clone().setY(0).normalize();if(flat.lengthSq()<.1)flat.set(0,0,-1);
  this.panel.position.copy(position).addScaledVector(flat,1.15).add(new T.Vector3(0,-.58,0));
  this.panel.quaternion.setFromRotationMatrix(new T.Matrix4().lookAt(this.panel.position,position,new T.Vector3(0,1,0)));
  // Plane front (+Z) faces the viewer.
  this.panel.lookAt(position);this.panel.visible=true;
 }
 private place(){
  this.rig.position.set(0,0,0);this.rig.rotation.set(0,0,0);this.rig.updateMatrixWorld(true);
  this.engine.renderer.xr.updateCamera(this.camera);
  const {position,forward}=this.head();
  const spawn=structuredClone(this.spawn);if(this.options.mode==='full'&&this.options.seated)spawn.position[1]=this.draft.ground.height+this.draft.explorer.eyeHeight;
  const p=stagePlacement(this.options.mode,this.bounds,position,forward,spawn);
  this.stage.position.copy(p.position);this.stage.quaternion.copy(p.rotation);this.stage.scale.setScalar(p.scale);this.stage.updateMatrixWorld(true);
  if(this.engine.floor)this.engine.floor.visible=this.options.mode==='full'&&this.draft.floor;
  this.recenterPanel();this.placed=true;this.report(this.options.mode==='miniature'?'Miniature stage. Hold a trigger to arrange layers.':'Full size. Left stick to move; right stick to snap turn.');
 }
 private aim(c:Controller){
  c.ray.updateWorldMatrix(true,false);this.raycaster.ray.origin.setFromMatrixPosition(c.ray.matrixWorld);this.raycaster.ray.direction.set(0,0,-1).transformDirection(c.ray.matrixWorld);this.raycaster.far=30;
  const ui=this.panel.visible?this.raycaster.intersectObject(this.panel)[0]:undefined;
  if(ui?.uv)return {ui,hit:undefined};
  const candidates=[...this.engine.objects.values(),...(this.engine.stage?[this.engine.stage]:[])];
  const hit=this.raycaster.intersectObjects(candidates,true).find(h=>{
   if(!(h.object instanceof T.Mesh))return false;
   let p:T.Object3D|null=h.object;while(p){if(!p.visible||p.userData.editorHelper||p.userData.globeGlass)return false;p=p.parent;}
   const mats=Array.isArray(h.object.material)?h.object.material:[h.object.material];return mats.some(m=>m.visible&&m.opacity>.05);
  });return {ui:undefined,hit};
 }
 private select(c:Controller,gripOnly=false){
  if(this.busy||this.ending||this.grab)return;
  const {ui,hit}=this.aim(c);
  if(ui?.uv&&!gripOnly){const x=ui.uv.x*1200,y=(1-ui.uv.y)*680;this.buttons.find(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h)?.action();return;}
  if(!hit)return;
  let node:T.Object3D|null=hit.object;
  while(node&&!node.userData.id)node=node.parent;
  let id=node?.userData.id as string|undefined,piece=false;
  if(!id){id=this.engine.setPieces?.pick(hit.object);node=id?this.engine.setPieces?.nodes.get(id)||null:null;piece=true;}
  if(!node||!id)return;
  const object=this.draft.objects.find(o=>o.id===id);
  if(object){const reason=manipulationReason(object,this.draft);if(reason){this.report(reason);return;}}
  if(readTransform(node).scale.some(v=>Math.abs(v)<.001)){this.report('Advance to a frame where this layer is full size.');return;}
  this.setPlaying(false);node.updateWorldMatrix(true,false);
  const source=c.source?.gripSpace?c.grip:c.ray;source.updateWorldMatrix(true,false);
  this.grab={controller:c,node,id,piece,before:readTransform(node),offset:source.matrixWorld.clone().invert().multiply(node.matrixWorld),factor:1,matrix:node.matrixWorld.clone()};
  this.selected=object?.name||this.engine.setPieces?.infos.find(n=>n.id===id)?.name||'Set piece';
  this.report(`Holding ${this.selected}. Turn your hand to rotate; thumbstick up/down changes size.`);
 }
 private release(){
  const grab=this.grab;if(!grab)return;this.grab=undefined;
  try{
   let next:Scene;
   if(grab.piece){
    const edit=this.engine.setPieces!.transformEdit(grab.node);
    next=grab.id.startsWith('copy:')?{...this.draft,setEdits:{...this.draft.setEdits,duplicates:this.draft.setEdits.duplicates.map(d=>'copy:'+d.id===grab.id?{...d,...edit}:d)}}:{...this.draft,setEdits:{...this.draft.setEdits,pieces:{...this.draft.setEdits.pieces,[grab.id]:edit}}};
   }else next={...this.draft,objects:this.draft.objects.map(o=>o.id===grab.id?offsetObject(o,grab.before,readTransform(grab.node)):o)};
   next=sceneSchema.parse(next);this.history.push(this.draft);this.history=this.history.slice(-20);this.draft=next;
   if(grab.piece){this.busy=true;void this.engine.sync(next).then(()=>{this.busy=false;this.configureQuality();this.report(`${this.selected} placed. Undo is available.`);}).catch(e=>{this.busy=false;this.report(e.message);});}
   else {this.engine.scene=next;this.report(`${this.selected} placed. Undo is available.`);}
  }catch{this.engine.sample(this.time);this.report('That placement exceeds the scene limits. The previous pose was restored.');}
 }
 private capture(){
  if(this.grab||this.busy)return;
  try{this.stage.updateMatrixWorld(true);const head=this.engine.renderer.xr.getCamera();
   const pose=cameraFromHead(head.matrixWorld,this.stage.matrixWorld,this.spawn.fov);
   const next=addXRView(this.draft,pose);this.history.push(this.draft);this.draft=next;this.engine.scene=next;this.report(`Captured ${next.xrViews.at(-1)!.name}. Find it under VR views after exiting.`);
  }catch(e){this.report((e as Error).message);}
 }
 private undo(){
  if(this.grab||this.busy)return;const previous=this.history.pop();if(!previous){this.report('Nothing to undo in this VR session.');return;}
  this.setPlaying(false);this.draft=previous;this.busy=true;void this.engine.sync(previous).then(()=>{this.busy=false;this.configureQuality();this.report('Last VR edit undone.');}).catch(e=>{this.busy=false;this.report(e.message);});
 }
 private input(dt:number){
  const head=this.head();
  for(const c of this.controllers){
   const gamepad=c.source?.gamepad;if(!gamepad)continue;
   const axes=gamepad.axes,x=axes.length>=4?axes[2]:axes[0]||0,y=axes.length>=4?axes[3]:axes[1]||0;
   const menu=!!(gamepad.buttons[4]?.pressed||gamepad.buttons[5]?.pressed);if(menu&&!c.menuDown)this.recenterPanel();c.menuDown=menu;
   if(this.grab?.controller===c){this.grab.factor=T.MathUtils.clamp(this.grab.factor*Math.exp(-y*dt*1.4),.05,20);continue;}
   if(this.grab||this.busy)continue;
   if(c.source?.handedness==='left'&&this.options.mode==='full'){
    const f=head.forward.clone().setY(0).normalize(),r=new T.Vector3(-f.z,0,f.x);
    const speed=1.5*dt;if(Math.abs(y)>.2)this.rig.position.addScaledVector(f,-y*speed);if(Math.abs(x)>.2)this.rig.position.addScaledVector(r,x*speed);
   }else if(c.source?.handedness==='right'){
    if(Math.abs(x)<.3)c.turnReady=true;
    if(Math.abs(x)>.7&&c.turnReady){c.turnReady=false;const angle=-Math.sign(x)*Math.PI/6;
     if(this.options.mode==='full'){const center=head.position;this.rig.position.sub(center).applyAxisAngle(new T.Vector3(0,1,0),angle).add(center);this.rig.rotation.y+=angle;this.recenterPanel();}
     else {const center=this.bounds.getCenter(new T.Vector3()).applyMatrix4(this.stage.matrixWorld);this.stage.position.sub(center).applyAxisAngle(new T.Vector3(0,1,0),angle).add(center);this.stage.rotateY(angle);}
    }
   }
  }
 }
 private frame=(now:number)=>{
  if(this.disposed||this.ending||!this.session)return;
  const dt=Math.min(.05,Math.max(0,(now-(this.last||now))/1000));this.last=now;
  if(this.session.visibilityState==='hidden')return;
  try{
   this.world.updateMatrixWorld(true);this.engine.renderer.xr.updateCamera(this.camera);
   if(!this.placed)this.place();
   this.input(dt);
   this.rig.updateMatrixWorld(true);this.engine.renderer.xr.updateCamera(this.camera);
   if(this.playing&&!this.busy)this.time=this.sound.clock()??((this.time+dt)%this.draft.duration);
   if(!this.busy)this.engine.sample(this.time);
   this.world.environment=this.engine.world.environment;this.world.environmentIntensity=this.engine.world.environmentIntensity;this.world.environmentRotation.copy(this.engine.world.environmentRotation);
   this.world.background=this.engine.world.background;
   // Physically scaled lights retain their apparent brightness on the miniature stage.
   const scale=this.stage.scale.x;if(!this.busy)this.engine.lights.traverse(n=>{if(n instanceof T.PointLight||n instanceof T.SpotLight)n.intensity*=scale*scale;});
   if(this.engine.floor)this.engine.floor.visible=this.options.mode==='full'&&this.draft.floor;
   this.world.updateMatrixWorld(true);
   if(this.grab){const g=this.grab,source=g.controller.source?.gripSpace?g.controller.grip:g.controller.ray;g.matrix.copy(source.matrixWorld).multiply(g.offset);
    const local=g.node.parent!.matrixWorld.clone().invert().multiply(g.matrix);local.decompose(g.node.position,g.node.quaternion,g.node.scale);g.node.scale.multiplyScalar(g.factor);g.node.updateMatrixWorld(true);
   }
   this.hover='';for(const c of this.controllers){if(!c.source)continue;const {ui,hit}=this.aim(c);c.line.scale.z=ui?.distance||hit?.distance||4;if(ui?.uv){const x=ui.uv.x*1200,y=(1-ui.uv.y)*680;this.hover=this.buttons.find(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h)?.label||'';}}
   if(now-this.lastPanel>200){this.drawPanel();this.lastPanel=now;}
   this.engine.renderer.render(this.world,this.camera);
  }catch(e){this.setPlaying(false);this.report('VR rendering stopped: '+(e as Error).message);void this.exit();}
 };
 private drawPanel(){
  const ctx=this.panelCanvas.getContext('2d')!;ctx.clearRect(0,0,1200,680);ctx.fillStyle='#111728f5';ctx.beginPath();ctx.roundRect(0,0,1200,680,32);ctx.fill();ctx.strokeStyle='#557188';ctx.lineWidth=3;ctx.stroke();
  ctx.fillStyle='#b7f1df';ctx.font='700 30px sans-serif';ctx.fillText('PRISM / VR STUDIO',40,55);
  ctx.fillStyle='#ffffff';ctx.font='600 23px sans-serif';ctx.fillText(`${this.options.mode==='miniature'?'MINIATURE STAGE':'FULL SIZE'}  ·  ${this.time.toFixed(1)} / ${this.draft.duration}s  ·  ${this.draft.xrViews.length} views`,40,96);
  this.buttons=[];
  const actions:[string,()=>void][]=[
   [this.playing?'Pause':'Play',()=>this.setPlaying(!this.playing)],['Restart',()=>{this.setPlaying(false);this.time=0;}],['Capture view',()=>this.capture()],
   [this.options.mode==='miniature'?'Enter full size':'Miniature stage',()=>{if(this.grab)return;this.options.mode=this.options.mode==='miniature'?'full':'miniature';this.place();}],['Recenter',()=>{if(!this.grab)this.place();}],['Undo',()=>this.undo()],
   ['Back 1 sec',()=>{this.setPlaying(false);this.time=Math.max(0,this.time-1);}],['Forward 1 sec',()=>{this.setPlaying(false);this.time=Math.min(this.draft.duration-1/this.draft.fps,this.time+1);}],['Exit & apply',()=>{void this.exit();}],
  ];
  actions.forEach(([label,action],i)=>{const x=40+(i%3)*380,y=125+Math.floor(i/3)*94,w=360,h=78;ctx.fillStyle=this.hover===label?'#3b695f':'#263448';ctx.beginPath();ctx.roundRect(x,y,w,h,12);ctx.fill();ctx.fillStyle='#ffffff';ctx.font='600 25px sans-serif';ctx.fillText(label,x+18,y+48);this.buttons.push({label,action,x,y,w,h});});
  ctx.fillStyle='#a6cbbf';ctx.font='23px sans-serif';const words=this.message.split(' ');let line='',y=446;for(const word of words){if(ctx.measureText(line+word).width>1100){ctx.fillText(line,40,y);y+=30;line='';}line+=word+' ';}ctx.fillText(line,40,y);
  ctx.fillStyle='#b8c3d3';ctx.font='21px sans-serif';ctx.fillText('Hold trigger / grip: move + rotate   ·   Stick while holding: resize',40,569);ctx.fillText('A / X: bring controls here   ·   Right stick: 30° turn',40,603);ctx.fillText('Edits apply on exit. Save the scene in the studio to keep them.',40,641);
  this.panelTexture.needsUpdate=true;
 }
 async exit(){if(this.ending)return;this.release();this.ending=true;this.playing=false;this.sound.stop();if(this.session)await this.session.end().catch(()=>{this.ending=false;this.report('Could not exit. Use the headset system menu, then return to Prism.');});}
 private finish=()=>{
  this.release();this.playing=false;this.sound.stop();this.engine.renderer.setAnimationLoop(null);this.session?.removeEventListener('visibilitychange',this.visibility);this.session=undefined;this.ending=false;
  if(!this.disposed)this.onFinish?.(this.draft,JSON.stringify(this.draft)!==this.original);
 };
 dispose(){if(this.disposed)return;this.disposed=true;this.engine.renderer.setAnimationLoop(null);this.playing=false;this.sound.dispose();const session=this.session;this.session=undefined;session?.removeEventListener('end',this.finish);session?.removeEventListener('visibilitychange',this.visibility);if(session)void session.end().catch(()=>{});
  this.panel.geometry.dispose();this.panel.material.dispose();this.panelTexture.dispose();for(const c of this.controllers){c.ray.traverse(n=>{if(n instanceof T.Mesh||n instanceof T.Line){n.geometry.dispose();(Array.isArray(n.material)?n.material:[n.material]).forEach(m=>m.dispose());}});c.grip.traverse(n=>{if(n instanceof T.Mesh){n.geometry.dispose();(Array.isArray(n.material)?n.material:[n.material]).forEach(m=>m.dispose());}});}this.engine.dispose();
 }
}
