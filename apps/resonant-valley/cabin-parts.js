import * as THREE from './vendor/three.module.min.js';
import {sleeveBytes,validSleeve} from './record-sleeve.js';
export const CABIN_PARTS=new Set(['roofSlope','beam','shutter','sign']);
export const BLANK_SIGN='9'.repeat(256);
export function signData(sign){
 return {art:validSleeve(sign?.art)?sign.art:BLANK_SIGN,caption:typeof sign?.caption==='string'?sign.caption.trim().slice(0,24):''};
}
export function mountRotation(type,face,rotation){
 if(!['sign','shutter'].includes(type)||!face||face[1]!==0)return rotation;
 return face[2]>0?0:face[0]<0?1:face[2]<0?2:3;
}
function signFace(e,group){
 const {art,caption}=signData(e),bytes=sleeveBytes(art,true);
 const texture=new THREE.DataTexture(bytes,16,16,THREE.RGBAFormat);texture.minFilter=texture.magFilter=THREE.NearestFilter;texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;
 const picture=new THREE.Mesh(new THREE.PlaneGeometry(.53,.53),new THREE.MeshLambertMaterial({map:texture}));
 picture.position.set(caption?-.18:0,.64,-.286);picture.userData.ownedSleeveTexture=texture;group.add(picture);
 if(!caption||typeof document==='undefined')return;
 const canvas=document.createElement('canvas');canvas.width=96;canvas.height=48;const ctx=canvas.getContext('2d');
 ctx.fillStyle='#553b34';ctx.fillRect(0,0,96,48);ctx.fillStyle='#ffe5a2';ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
 const words=caption.match(/.{1,12}(?:\s|$)|.{1,12}/g)||[caption];
 words.forEach((line,i)=>ctx.fillText(line.trim(),48,24+(i-(words.length-1)/2)*15,92));
 const label=new THREE.CanvasTexture(canvas);label.magFilter=label.minFilter=THREE.NearestFilter;label.colorSpace=THREE.SRGBColorSpace;
 const m=new THREE.Mesh(new THREE.PlaneGeometry(.39,.27),new THREE.MeshLambertMaterial({map:label}));m.userData.ownedSleeveTexture=label;m.position.set(.30,.64,-.286);group.add(m);
}
export function buildCabinPart(e,group,box){
 if(e.type==='roofSlope'){
  // A solid wedge has a shingled top, exposed verge, and a flush underside.
  const profile=new THREE.Shape();profile.moveTo(-.5,0);profile.lineTo(.5,0);profile.lineTo(.5,.95);profile.lineTo(-.5,.06);profile.closePath();
  const g=new THREE.ExtrudeGeometry(profile,{depth:1,bevelEnabled:false});g.rotateY(Math.PI/2);g.translate(-.5,0,0);
  const shell=new THREE.Mesh(g,new THREE.MeshLambertMaterial({color:'#89573f'}));shell.castShadow=shell.receiveShadow=true;group.add(shell);
  for(let row=0;row<4;row++)for(let col=0;col<2;col++){const z=-.375+row*.25,shingle=box(.498,.043,.347,-.25+col*.5,.52-.89*z,z,['#ab5a48','#bc6e53','#a85246','#c07857'][(row+col)%4]);shingle.rotation.x=Math.atan(.89);}
 }
 if(e.type==='beam'){
  box(1,.33,.32,0,.79,0,'#825136');box(1,.055,.33,0,.91,0,'#b18256');
  for(const x of [-.37,.37]){box(.105,.36,.345,x,.78,0,'#524438');box(.044,.052,.352,x,.79,0,'#c4a17a');}
 }
 if(e.type==='shutter'){
  for(const side of [-1,1]){
   const hinge=new THREE.Group();hinge.position.set(side*.45,.5,-.41);hinge.rotation.y=e.open?-side*Math.PI*.48:0;group.add(hinge);
   const leaf=(w,h,d,x,y,z,c)=>{const b=box(w,h,d,x,y,z,c);hinge.add(b);return b;};
   for(const x of [0,-side*.39])leaf(.055,.92,.07,x,0,0,'#305f60');
   for(const y of [-.43,.43])leaf(.43,.067,.08,-side*.20,y,0,'#518a82');
   for(let i=0;i<5;i++)leaf(.35,.108,.047,-side*.2,-.30+i*.15,.012,'#79a99a').rotation.x=-.23;
   for(const y of [-.27,.27])leaf(.09,.045,.093,0,y,0,'#d4a664');
  }
 }
 if(e.type==='sign'){
  box(1,.73,.10,0,.64,-.36,'#a77a51');box(.93,.62,.035,0,.64,-.31,'#5a4037');
  if(!e.face||e.face[1]!==0)box(.13,.85,.13,0,.43,-.41,'#7d543a');
  for(const x of [-.46,.46])for(const y of [.33,.95])box(.035,.035,.025,x,y,-.297,'#ecd499');
  signFace(e,group);
 }
}
export function buildCart(box){
 box(.74,.1,.81,0,.17,0,'#503f3e');box(.58,.06,.65,0,.24,0,'#956448');
 for(const x of [-.36,.36]){
  box(.07,.36,.83,x,.37,0,'#637889');box(.095,.06,.88,x,.57,0,'#b4c9ce');
  for(const z of [-.27,.27]){box(.09,.15,.17,x,.105,z,'#3b3d49');box(.10,.067,.07,x,.105,z,'#977955');}
 }
 for(const z of [-.395,.395]){box(.71,.35,.06,0,.37,z,'#8499a2');box(.77,.06,.08,0,.57,z,'#c3cdd1');}
 box(.62,.07,.24,0,.34,.04,'#a47851');
}
