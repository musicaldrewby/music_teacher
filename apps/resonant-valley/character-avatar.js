import * as THREE from './vendor/three.module.min.js';
import {caveMaterial} from './cave-material.js';
import {AVATAR_PARTS,characterPalette,characterSettings,paintCharacterAtlas} from './character-style.js';

export class CharacterAvatar{
 constructor(world){
  this.world=world;this.root=new THREE.Group();this.root.name='Valley explorer';world.scene.add(this.root);this.root.visible=false;
  this.canvas=document.createElement('canvas');this.texture=new THREE.CanvasTexture(this.canvas);this.texture.magFilter=this.texture.minFilter=THREE.NearestFilter;this.texture.generateMipmaps=false;this.texture.colorSpace=THREE.SRGBColorSpace;
  this.light={value:new THREE.Vector2(1,0)};this.material=caveMaterial(new THREE.MeshLambertMaterial({map:this.texture}),{light:this.light});
  this.accent=caveMaterial(new THREE.MeshLambertMaterial(),{light:this.light});
  const box=(w,h,d,part,parent=this.root,x=0,y=0,z=0)=>{
   const geo=new THREE.BoxGeometry(w,h,d),uv=geo.attributes.uv,row=AVATAR_PARTS.indexOf(part);
   for(let face=0;face<6;face++)for(let i=0;i<4;i++){const at=face*4+i;uv.setXY(at,(face*16+.5+uv.getX(at)*15)/96,1-(row*16+.5+(1-uv.getY(at))*15)/80);}
   const mesh=new THREE.Mesh(geo,this.material);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
  };
  box(.50,.62,.28,'body',this.root,0,1.01,0);box(.33,.42,.15,'pack',this.root,0,1.03,.20);
  this.head=new THREE.Group();this.head.position.y=1.32;this.root.add(this.head);box(.47,.47,.44,'head',this.head,0,.235,0);
  const limb=(x,y,part,w,h,d)=>{const joint=new THREE.Group();joint.position.set(x,y,0);this.root.add(joint);box(w,h,d,part,joint,0,-h/2,0);return joint;};
  this.leftArm=limb(-.36,1.29,'arm',.21,.60,.24);this.rightArm=limb(.36,1.29,'arm',.21,.60,.24);
  this.leftLeg=limb(-.135,.70,'leg',.22,.70,.26);this.rightLeg=limb(.135,.70,'leg',.22,.70,.26);
  this.headphones=new THREE.Group();this.head.add(this.headphones);
  for(const x of [-.256,.256]){const m=new THREE.Mesh(new THREE.BoxGeometry(.065,.20,.20),this.accent);m.position.set(x,.24,0);m.castShadow=true;this.headphones.add(m);}
  this.cap=new THREE.Mesh(new THREE.BoxGeometry(.51,.10,.49),this.accent);this.cap.position.set(0,.46,-.015);this.cap.castShadow=true;this.head.add(this.cap);
  this.tools=new Map();this.grip=new THREE.Group();this.grip.position.set(0,-.55,-.07);this.grip.rotation.x=-.65;this.rightArm.add(this.grip);
  for(const [id,original] of Object.entries(world.hands.models)){
   if(id==='hand')continue;const model=original.clone(true);
   model.traverse(m=>{if(m.isMesh){m.material=caveMaterial(new THREE.MeshLambertMaterial({color:m.userData.baseColor||m.material.color}),{light:this.light});m.castShadow=m.receiveShadow=true;}});
   model.scale.setScalar(.85);model.visible=false;this.grip.add(model);this.tools.set(id,model);
  }
  this.torch=world.hands.torch.clone(true);this.torch.position.set(0,-.52,-.10);this.torch.rotation.set(.2,0,0);this.torch.scale.setScalar(.85);this.leftArm.add(this.torch);
  this.torch.traverse(m=>{if(m.isMesh){m.material=caveMaterial(new THREE.MeshLambertMaterial({color:m.material.color}),{light:this.light});m.castShadow=true;}});
  this.last=new THREE.Vector3(Infinity,Infinity,Infinity);this.phase=0;this.walk=0;this.lastSwing=-10;this.setStyle({});
 }
 setStyle(value){
  this.settings=characterSettings(value);const p=characterPalette(this.settings);paintCharacterAtlas(this.canvas,this.settings);this.texture.needsUpdate=true;
  this.accent.color.set(p.accent);this.headphones.visible=p.style==='headphones';this.cap.visible=p.style==='cap';
 }
 swing(){this.lastSwing=performance.now()/1000;}
 reset(){this.last.set(Infinity,Infinity,Infinity);this.walk=0;}
 update(t,dt,state={},visible=false){
  const w=this.world,p=w.camera.position,ride=state.riding,crouch=!ride&&(state.eyeHeight??1.66)<1.54;
  this.root.visible=visible&&state.visible!==false;
  const distance=Math.hypot(p.x-this.last.x,p.z-this.last.z),moving=Number.isFinite(distance)&&distance<1&&dt>0?Math.min(1,distance/dt/3):0;
  this.last.copy(p);this.walk+=(moving-this.walk)*Math.min(1,dt*14);if(moving>.01)this.phase+=distance*9;
  const stride=Math.sin(this.phase)*.62*this.walk,feet=p.y-(ride?1.30:state.eyeHeight??1.66);
  this.root.position.set(p.x,feet,p.z);this.root.rotation.y=ride&&Number.isFinite(state.ridingHeading)?state.ridingHeading:w.camera.rotation.y;this.root.scale.y=crouch?.84:1;
  this.head.rotation.x=Math.max(-.65,Math.min(.65,w.camera.rotation.x));const headTurn=w.camera.rotation.y-this.root.rotation.y;this.head.rotation.y=Math.max(-.9,Math.min(.9,Math.atan2(Math.sin(headTurn),Math.cos(headTurn))));
  this.leftLeg.rotation.x=ride?1.25:stride;this.rightLeg.rotation.x=ride?1.25:-stride;
  this.leftArm.rotation.set(-stride*.8,0,.045);this.rightArm.rotation.set(stride*.8,0,-.045);
  if(ride){this.root.position.y-=.32;this.leftArm.rotation.x=this.rightArm.rotation.x=.45;}
  else if(state.swimming){this.leftArm.rotation.x=1.15+stride*.5;this.rightArm.rotation.x=1.15-stride*.5;}
  else if(state.flying){this.leftArm.rotation.z=.26;this.rightArm.rotation.z=-.26;}
  else if(state.grounded===false){this.leftArm.rotation.z=.15;this.rightArm.rotation.z=-.15;}
  const age=t-this.lastSwing,k=age>=0&&age<.28?Math.sin(age/.28*Math.PI):0;
  if(k)this.rightArm.rotation.x=.55+k*1.2;
  const tool=w.heldState.tool;for(const [id,model] of this.tools)model.visible=id===tool;
  this.torch.visible=!!w.heldState.torch;if(this.torch.visible)this.leftArm.rotation.x=.4;
  this.light.value.set(...w.lightAt(p.x,p.y-.4,p.z));
 }
}
