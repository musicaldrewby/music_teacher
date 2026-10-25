import * as THREE from './vendor/three.module.js';

// Playable geometry stays separate from the room's decorative mesh batches.
export function buildResonantInstrument(s,{stationGroup,box,cylinder,label,makePlayable,noteName}){
 const g=stationGroup(s),brass=0xc99847,dark=0x213e4c;
 for(const x of [-.78,.78]){box(.065,2.28,.065,dark,x,1.14,0,g);box(.32,.07,.60,dark,x,.045,0,g);}
 box(1.64,.09,.09,dark,0,2.27,0,g);
 label(s.name.toUpperCase(),0,2.46,.06,1.65,.17,g,'#ffe3a3');
 if(s.type==='gong'){
  const profile=[[0,.085],[.07,.085],[.15,.073],[.24,.035],[.40,.015],[.50,.024],[.55,.075]].map(([r,y])=>new THREE.Vector2(r,y));
  const disc=new THREE.Mesh(new THREE.LatheGeometry(profile,64),new THREE.MeshStandardMaterial({color:brass,metalness:.76,roughness:.36,side:THREE.DoubleSide}));
  disc.rotation.x=Math.PI/2;disc.position.set(0,1.42,.12);disc.castShadow=true;disc.receiveShadow=true;
  disc.userData.hitCylinder={radius:.55,minY:.01,maxY:.085};g.add(disc);makePlayable(disc,s);
  // Concentric machining rings catch light without adding a texture download.
  for(const radius of [.25,.34,.43,.50]){const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,.0025,4,64),new THREE.MeshStandardMaterial({color:0xa17534,metalness:.7,roughness:.45}));ring.position.set(0,1.42,.153);g.add(ring);}
  for(const x of [-.28,.28]){const cord=cylinder(.006,.42,0x80633b,x,2.03,.14,g);cord.rotation.z=x<0?-.18:.18;}
  label('Strike gently · let it ring',0,.61,.18,1.65,.12,g,'#d2e4e8');
  s.resonantMeshes=[disc];
 }else{
  s.resonantMeshes=[];
  s.notes.forEach((note,i)=>{
   const x=(i-(s.notes.length-1)/2)*.235,length=.99-i*.072,top=1.96;
   cylinder(.004,2.22-top,0xc5ae76,x,(2.22+top)/2,.14,g);
   const tube=cylinder(.045,length,brass,x,top-length/2,.14,g);tube.material.metalness=.8;tube.material.roughness=.28;
   tube.userData.hitCylinder={radius:.045,minY:-length/2,maxY:length/2};makePlayable(tube,s,s.midi+note);s.resonantMeshes.push(tube);
   const rim=new THREE.Mesh(new THREE.TorusGeometry(.035,.009,6,16),new THREE.MeshStandardMaterial({color:0xe7d397,metalness:.65,roughness:.3}));rim.rotation.x=Math.PI/2;rim.position.set(x,top+.002,.14);g.add(rim);
   tube.userData.noteLabel=label(noteName(s.midi+note),x,.80,.18,.21,.12,g,'#ffe8b2');
  });
  label('Tap a tube · brush across',0,.61,.18,1.65,.12,g,'#d2e4e8');
 }
 return g;
}
