import * as THREE from './vendor/three.module.min.js';
import {TOOLS} from './equipment.js';
export class HeldEquipment {
 constructor(scene,camera){
  this.camera=camera;scene.add(camera);
  this.foreground=new THREE.Scene();
  this.viewCamera=new THREE.PerspectiveCamera();
  this.root=new THREE.Group();this.foreground.add(this.root);this.root.position.set(.38,-.39,-.65);this.root.rotation.z=-.25;this.models={};this.lastSwing=-10;
  const part=(g,w,h,d,x,y,z,color)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshBasicMaterial({color}));m.position.set(x,y,z);g.add(m);return m;};
  // Faceted silhouettes keep the carried tools recognizable against dark rock.
  const forge=(g,points,depth,color,z=-depth/2)=>{
   const shape=new THREE.Shape();shape.moveTo(...points[0]);
   for(const point of points.slice(1))shape.lineTo(...point);
   shape.closePath();
   const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false});
   const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color}));
   mesh.position.z=z;g.add(mesh);
  };
  for(const [id,tool] of Object.entries(TOOLS)){
   if(!tool.kind)continue;
   const g=new THREE.Group(),head=tool.wooden?'#af7842':'#92aaba',edge=tool.wooden?'#ebbe80':'#d2e4e8';
   part(g,.049,.48,.05,0,0,0,'#a36c42');part(g,.014,.43,.006,-.011,0,.027,'#dca66c');
   if(tool.kind==='pickaxe'){
    forge(g,[[-.27,.13],[-.21,.225],[-.13,.273],[-.048,.29],[.033,.29],[.117,.255],[.197,.195],[.263,.09],[.274,.04],[.202,.128],[.12,.18],[.046,.204],[-.063,.213],[-.16,.196]],.073,head);
    forge(g,[[-.255,.15],[-.208,.228],[-.13,.273],[-.047,.29],[.033,.29],[.116,.255],[.19,.199],[.103,.235],[.025,.261],[-.059,.265],[-.139,.241],[-.205,.211]],.003,edge,.038);
    part(g,.058,.067,.088,0,.237,0,'#bd8a52');
   }else if(tool.kind==='axe'){
    forge(g,[[-.086,.28],[.045,.28],[.083,.24],[.149,.226],[.208,.214],[.21,.15],[.189,.09],[.138,.055],[.087,.107],[.094,.146],[.045,.174],[-.076,.181]],.069,head);
    forge(g,[[.201,.207],[.209,.15],[.187,.09],[.139,.056],[.118,.079],[.162,.113],[.184,.166]],.003,edge,.036);
    part(g,.055,.046,.082,0,.241,0,'#c49157');
   }else{
    forge(g,[[-.037,.16],[-.108,.181],[-.106,.277],[-.079,.33],[0,.397],[.083,.329],[.109,.275],[.11,.18],[.037,.16]],.048,head);
    forge(g,[[0,.19],[-.015,.25],[0,.366],[.021,.259]],.003,edge,.026);
    part(g,.055,.072,.062,0,.165,0,'#af8555');
   }
   this.root.add(g);this.models[id]=g;
  }
  const hand=new THREE.Group();part(hand,.12,.27,.14,0,-.06,0,'#477ccc');part(hand,.16,.17,.18,0,.13,-.025,'#d8a17c');part(hand,.055,.1,.09,-.09,.1,.025,'#b97c59');this.root.add(hand);this.models.hand=hand;
  this.torch=new THREE.Group();this.foreground.add(this.torch);this.torch.position.set(-.36,-.36,-.62);this.torch.rotation.z=.12;
  part(this.torch,.055,.34,.055,0,0,0,'#9b683d');this.flame=part(this.torch,.09,.14,.09,0,.21,0,'#ffb34e');part(this.flame,.045,.11,.045,0,-.01,.045,'#fff0bb');
  this.light=new THREE.PointLight('#ffd19a',0,11,1.3);this.light.position.set(-.17,-.12,-.24);this.light.castShadow=true;this.light.shadow.mapSize.set(256,256);this.light.shadow.bias=-.001;this.light.shadow.normalBias=.025;this.light.shadow.camera.near=.06;this.light.shadow.camera.far=11;camera.add(this.light);
 }
 render(renderer){
  if(!this.root.visible&&!this.torch.visible)return;
  this.viewCamera.projectionMatrix.copy(this.camera.projectionMatrix);
  this.viewCamera.projectionMatrixInverse.copy(this.camera.projectionMatrixInverse);
  // Keep the completed world image and give the carried equipment its own depth buffer contents.
  const autoClear=renderer.autoClear;
  renderer.autoClear=false;
  try{
   renderer.clearDepth();
   renderer.render(this.foreground,this.viewCamera);
  }finally{
   renderer.autoClear=autoClear;
  }
 }
 swing(){this.lastSwing=performance.now()/1000;}
 update(t,{tool=null,torch=false,visible=false,sky=1,world}){
  const toolFit=Math.min(1,this.camera.aspect/(16/9));
  this.root.scale.setScalar(toolFit);this.root.position.x=.38*toolFit;this.torch.position.x=-.36*Math.min(1,this.camera.aspect);
  this.light.visible=visible&&torch;
  this.root.visible=visible&&!!this.models[tool];for(const [id,m] of Object.entries(this.models))m.visible=id===tool;
  const age=t-this.lastSwing,k=age>=0&&age<.28?Math.sin(age/.28*Math.PI):0;this.root.rotation.x=-k*.8;this.root.rotation.z=-.25+k*.2;this.root.position.z=-.65-k*(tool==='hand'?.19:.08);this.root.position.y=-.31-.08*toolFit+k*.045;
  this.torch.visible=visible&&torch;this.flame.scale.y=1+Math.sin(t*4.2)*.06;this.light.intensity=visible&&torch?19*(1+Math.sin(t*3.1)*.025):0;
  this.light.position.set(-.17,-.12,-.24);this.camera.updateMatrixWorld();const position=this.light.getWorldPosition(new THREE.Vector3());if(world.get(position.x,position.y,position.z)&&world.get(position.x,position.y,position.z)!==255)this.light.position.set(0,0,0);
  const brightness=torch?1:Math.max(.12,sky);this.models[tool]?.traverse(m=>{if(m.isMesh){m.userData.baseColor??=m.material.color.clone();m.material.color.copy(m.userData.baseColor).multiplyScalar(brightness);}});
 }
}
