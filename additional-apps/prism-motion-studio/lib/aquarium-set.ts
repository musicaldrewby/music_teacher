import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {SetConfig} from './sets';

const TAU=Math.PI*2;
const random=(i:number,s=0)=>{const n=Math.sin(i*127.1+s*311.7+11)*43758.5453;return n-Math.floor(n);};
const v=(x:number,y:number,z:number)=>new T.Vector3(x,y,z);
type Mat=T.MeshStandardMaterial;

/** All deformation is done with stable mesh transforms, including tentacle joints.
 * This makes the reef seekable and keeps the same animation in Blender exports. */
export function buildAquarium(config:SetConfig){
 const root=new T.Group();root.name='Living coral reef';
 const sphere=new T.SphereGeometry(1,16,10),smallSphere=new T.SphereGeometry(1,10,6);
 const material=(color:string,roughness=.48,extra:T.MeshPhysicalMaterialParameters={})=>new T.MeshPhysicalMaterial({color,roughness,metalness:0,...extra});
 const sand=material('#ffffff',.94,{vertexColors:true});
 const rock=material('#326c73',.9),darkRock=material('#254955',.95);
 const coral=[material('#e76c81',.65),material('#ba7edf',.58),material('#edae63',.6),material('#69c4b6',.65)];
 const green=material('#368f7e',.56,{side:T.DoubleSide}),lime=material('#83c58b',.52,{side:T.DoubleSide});
 const anemoneMat=material('#bd89ce',.46,{emissive:'#533773',emissiveIntensity:.12*config.glow});
 const tipMat=material('#adebd8',.3,{emissive:'#66b6ae',emissiveIntensity:.24*config.glow});
 const mesh=(name:string,g:T.BufferGeometry,m:Mat,p:T.Object3D=root)=>{const n=new T.Mesh(g,m);n.name=name;n.castShadow=true;n.receiveShadow=true;n.userData.prismSet=true;p.add(n);return n;};
 const ellipsoid=(name:string,p:T.Vector3,size:T.Vector3,m:Mat,parent:T.Object3D=root)=>{const n=mesh(name,sphere,m,parent);n.position.copy(p);n.scale.copy(size);return n;};
 // Merge fixed reef geometry per material so richness does not imply thousands of draw calls.
 const batches=new Map<Mat,T.BufferGeometry[]>();
 const fixed=(g:T.BufferGeometry,m:Mat,p:T.Vector3,scale=v(1,1,1),rotation=new T.Euler())=>{const q=new T.Quaternion().setFromEuler(rotation);g.applyMatrix4(new T.Matrix4().compose(p,q,scale));const list=batches.get(m)||[];list.push(g);batches.set(m,list);};
 const rod=(a:T.Vector3,b:T.Vector3,r:number,m:Mat)=>{const d=b.clone().sub(a);const g=new T.CylinderGeometry(r*.65,r,d.length(),6);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(v(0,1,0),d.normalize()));fixed(g,m,a.clone().add(b).multiplyScalar(.5));};
 const bed=new T.PlaneGeometry(130,110,100,90);bed.rotateX(-Math.PI/2);
 const pos=bed.getAttribute('position'),colors:number[]=[];
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,-.12+Math.sin(x*.26+z*.12)*.11+Math.sin(z*2.9+x*.15)*.028);const shade=.87+.1*Math.sin(z*2.9+x*.15);const tint=new T.Color('#a8c9c2').lerp(new T.Color('#075066'),T.MathUtils.smoothstep(-z,15,45)).multiplyScalar(shade);colors.push(tint.r,tint.g,tint.b);}
 bed.setAttribute('color',new T.Float32BufferAttribute(colors,3));bed.computeVertexNormals();mesh('Rippling pale sand',bed,sand);
 const islands=[[-7,-1,1.3],[6,-3,1.1],[-6,-8,1.6],[7,-11,1.5],[-10,-16,1.8],[1,-18,1.45],[12,-20,1.6],[-13,4,1.4],[13,4,1.4]];
 for(let k=0;k<islands.length;k++){
  const [x,z,s]=islands[k];
  for(let j=0;j<4;j++)fixed(new T.IcosahedronGeometry(1,1),j%2?rock:darkRock,v(x+(random(k*7+j,1)-.5)*2.2*s,.22+j%2*.2,z+(random(k*7+j,2)-.5)*1.8*s),v(s*(.7+random(j,k)*.5),s*(.3+random(k,j)*.3),s*(.6+random(k+j,3)*.5)),new T.Euler(.1,j*1.7,.16));
  if(!config.decorations)continue;
  // Dense branching staghorn coral, with rounded tips.
  for(let c=0;c<3;c++){
   const id=k*13+c,base=v(x+(random(id,4)-.5)*2.7*s,.45,z+(random(id,5)-.5)*2*s),height=(.7+random(id,6))*s,m=coral[(k+c)%coral.length];
   for(let b=0;b<5;b++){
    const a=b*TAU/5+id,mid=base.clone().add(v(Math.cos(a)*height*.27,height*.65,Math.sin(a)*height*.27));rod(base,mid,.07*s,m);
    for(let n=0;n<3;n++){const tip=mid.clone().add(v(Math.cos(a+n-.8)*height*.25,height*(.24+random(id+n,9)*.28),Math.sin(a+n-.8)*height*.25));rod(mid,tip,.039*s,m);fixed(smallSphere.clone(),m,tip,v(.042*s,.055*s,.042*s));}
   }
  }
  // Layered lettuce/table coral in a contrasting green or lavender.
  for(let l=0;l<4;l++){const g=new T.SphereGeometry(1,24,10),p=g.getAttribute('position');for(let i=0;i<p.count;i++){const a=Math.atan2(p.getZ(i),p.getX(i));const r=1+.10*Math.sin(a*9+l);p.setXYZ(i,p.getX(i)*r,p.getY(i)*.09+Math.sin(a*6+l)*.055,p.getZ(i)*r);}g.computeVertexNormals();fixed(g,coral[(k+1)%4],v(x+s*.7,.46+l*.26,z+s*.6),v(s*(.9-l*.11),s,s*(.7-l*.09)));}
 }
 // Tall ribbon kelp: each blade is a jointed chain, anchored to its holdfast.
 for(let k=0;k<(config.decorations?18:6);k++){
  const x=(k%2?1:-1)*(8+random(k,14)*7),z=4-random(k,15)*29;
  const plant=new T.Group();plant.name='Swaying ribbon kelp';plant.position.set(x,.05,z);root.add(plant);
  let parent:T.Object3D=plant;const length=.7+random(k,16)*.48;
  for(let j=0;j<5;j++){
   const joint=new T.Group();joint.name='Kelp joint';joint.position.y=j?length:0;joint.userData.aquariumSway={phase:k*1.7-j*.48,amount:.10+j*.018,axis:'z'};parent.add(joint);
   const shape=new T.Shape();shape.moveTo(0,0);shape.bezierCurveTo(-.42,length*.3,-.28,length*.7,0,length);shape.bezierCurveTo(.35,length*.75,.44,length*.25,0,0);
   const blade=mesh('Ribbon blade',new T.ShapeGeometry(shape,8),k%3?green:lime,joint);blade.rotation.y=k*1.4+j*.3;
   parent=joint;
  }
 }
 if(config.decorations)for(let k=0;k<7;k++){
  const [x,z]=islands[k];const colony=new T.Group();colony.name='Pearl-tipped sea anemone';colony.position.set(x*.72,.3,z+1.6);root.add(colony);
  ellipsoid('Anemone cushion',v(0,.05,0),v(.65,.22,.6),anemoneMat,colony);
  for(let a=0;a<15;a++){
   const angle=a*2.39996,r=.15+Math.sqrt(a/15)*.36,h=.25+random(k*20+a,19)*.11;
   let parent:T.Object3D=colony;
   for(let j=0;j<3;j++){
    const joint=new T.Group();joint.name='Soft tentacle joint';joint.position.copy(j?v(0,h,0):v(Math.cos(angle)*r,.15,Math.sin(angle)*r));joint.userData.aquariumSway={phase:k+a*.65-j*.65,amount:.16+j*.06,axis:'both'};parent.add(joint);
    const g=new T.CylinderGeometry(.045-j*.009,.052-j*.008,h,6);g.translate(0,h/2,0);mesh('Flowing tentacle',g,anemoneMat,joint);
    if(j===2)ellipsoid('Luminous pearl tip',v(0,h,0),v(.055,.075,.055),tipMat,joint);
    parent=joint;
   }
  }
 }
 // Fine seafans are fixed branching meshes; their whole frond sways very slightly.
 for(let k=0;k<(config.decorations?7:0);k++){
  const [x,z,s]=islands[k],fan=new T.Group();fan.name='Rose sea fan';fan.position.set(x-s,.4,z-.4);fan.rotation.y=k*.7;root.add(fan);
  fan.userData.aquariumSway={phase:k,amount:.035,axis:'z',yaw:k*.7};
  const lines:T.BufferGeometry[]=[];
  for(let b=0;b<15;b++){const a=-1.2+b/14*2.4,points=[v(0,0,0),v(Math.sin(a)*s*.5,.8*s,0),v(Math.sin(a)*s*1.3,(1.5+Math.cos(a)*.4)*s,.05),v(Math.sin(a)*s*1.75,(1.8+Math.cos(a)*.5)*s,.1)];lines.push(new T.TubeGeometry(new T.CatmullRomCurve3(points),16,.018,4,false));}
  for(let row=1;row<=5;row++){const pts=Array.from({length:17},(_,j)=>{const a=-1.2+j/16*2.4;return v(Math.sin(a)*s*row*.31,(row*.32+Math.cos(a)*row*.075)*s,.03);});lines.push(new T.TubeGeometry(new T.CatmullRomCurve3(pts),24,.011,4,false));}
  const geo=mergeGeometries(lines)!;lines.forEach(g=>g.dispose());mesh('Sea fan lace',geo,coral[k%2],fan);
 }
 for(const [m,parts] of batches){const g=mergeGeometries(parts)!;parts.forEach(p=>p.dispose());mesh('Coral garden · '+m.color.getHexString(),g,m);}
 const fishColors=['#65cfe0','#f5b94c','#849cfa','#ec8f77'];
 const eye=material('#071d2a',.12);
 const finGeo=new T.Shape();finGeo.moveTo(0,0);finGeo.quadraticCurveTo(-.26,.13,-.52,.39);finGeo.quadraticCurveTo(-.40,0,-.52,-.39);finGeo.quadraticCurveTo(-.26,-.13,0,0);
 const tailGeometry=new T.ShapeGeometry(finGeo,10);
 for(let i=0;i<(config.decorations?36:12);i++){
  const school=i<16?0:i<28?1:2,fish=new T.Group();fish.name=['Blue chromis','Golden reef fish','Lavender angelfish'][school];fish.userData.aquariumFish=i;root.add(fish);
  const size=school===2?.7+random(i,20)*.35:.30+random(i,20)*.3;fish.scale.setScalar(size);
  const bodyMat=material('#ffffff',.27,{vertexColors:true,metalness:.18,clearcoat:.8,clearcoatRoughness:.2});
  const finMat=material(school===0?'#92e5f1':school===1?'#ffcd6b':'#b3a4ee',.34,{side:T.DoubleSide,transparent:true,opacity:.86});
  const bodyGeometry=sphere.clone(),bodyColors:number[]=[];const bp=bodyGeometry.getAttribute('position');
  for(let j=0;j<bp.count;j++){const color=new T.Color(fishColors[school]).lerp(new T.Color('#def4e9'),T.MathUtils.smoothstep(-bp.getY(j),.15,.92));bodyColors.push(color.r,color.g,color.b);}
  bodyGeometry.setAttribute('color',new T.Float32BufferAttribute(bodyColors,3));const body=mesh('Iridescent fish body',bodyGeometry,bodyMat,fish);body.scale.set(.68,school===2?.42:.28,.18);
  const tail=new T.Group();tail.name='Swimming tail';tail.position.x=-.60;tail.userData.aquariumTail=i;fish.add(tail);mesh('Forked tail fin',tailGeometry,finMat,tail);
  const dorsalShape=new T.Shape();dorsalShape.moveTo(.3,.18);dorsalShape.quadraticCurveTo(-.1,.72,-.49,.16);dorsalShape.lineTo(.3,.18);mesh('Dorsal sail',new T.ShapeGeometry(dorsalShape,8),finMat,fish);
  for(const side of [-1,1]){
   ellipsoid('Eye',v(.44,.08,side*.145),v(.065,.065,.037),eye,fish);
   const p=mesh('Pectoral fin',tailGeometry,finMat,fish);p.position.set(.13,-.05,side*.16);p.scale.set(.45,.5,.5);p.rotation.set(side*.7,side*.65,.5);p.userData.aquariumFin={i,side};
  }
 }
 // Clear bubbles with tiny pearly highlights, rising in several independent streams.
 const bubbleMat=material('#b8edf0',.08,{metalness:.3,transparent:true,opacity:.23,depthWrite:false,clearcoat:1});
 const shineMat=material('#c7f9ff',.14,{emissive:'#8edee8',emissiveIntensity:.25});
 for(let i=0;i<(config.decorations?68:24);i++){
  const bubble=new T.Group();bubble.name='Rising bubble';bubble.userData.aquariumBubble=i;root.add(bubble);bubble.scale.setScalar(.04+random(i,24)*.10);
  const n=mesh('Bubble shell',smallSphere,bubbleMat,bubble);n.castShadow=false;
  const shine=ellipsoid('Bubble glint',v(-.28,.48,.69),v(.18,.22,.09),shineMat,bubble);shine.castShadow=false;
 }
 animateAquarium(root,0);return root;
}

/** Smooth closed swimming paths never teleport at a visible edge. */
export function fishPose(i:number,time:number){
 const school=i<16?0:i<28?1:2;
 const a=time*[.085,-.067,.046][school]+i*.53;
 const rx=[10,8,7][school]+random(i,31)*2,rz=[3.3,4,4.6][school];
 const x=Math.cos(a)*rx,z=[-7,-15,-2][school]+Math.sin(a)*rz;
 const y=[3.8,5.5,3.1][school]+Math.sin(a*2+i)*.45+(random(i,32)-.5)*1.6;
 const speed=[.085,-.067,.046][school],dx=-Math.sin(a)*rx*speed,dz=Math.cos(a)*rz*speed;
 return {position:[x,y,z] as [number,number,number],yaw:Math.atan2(-dz,dx),bank:Math.sin(a+i)*.035};
}

export function animateAquarium(root:T.Group,time:number,energy=0){
 root.traverse(n=>{
  const d=n.userData;
  if(typeof d.aquariumFish==='number'){const p=fishPose(d.aquariumFish,time);n.position.set(...p.position);n.rotation.set(0,p.yaw,p.bank);}
  if(typeof d.aquariumTail==='number')n.rotation.y=Math.sin(time*4.5+d.aquariumTail*1.7)*(.32+energy*.06);
  if(d.aquariumFin){const {i,side}=d.aquariumFin;n.rotation.y=side*(.65+Math.sin(time*3.4+i)*.18);}
  if(d.aquariumSway){const {phase,amount,axis,yaw=0}=d.aquariumSway;n.rotation.z=Math.sin(time*.62+phase)*amount*(1+energy*.15);n.rotation.y=yaw;if(axis==='both')n.rotation.x=Math.cos(time*.49+phase)*amount*.65;}
  if(typeof d.aquariumBubble==='number'){
   const i=d.aquariumBubble,stream=i%4,phase=(random(i,33)+time*(.035+random(i,34)*.021))%1;
   n.position.set([-7,6,-2,10][stream]+Math.sin(time*.7+i)*.28,phase*12+.1,[-1,-6,-16,-18][stream]+Math.cos(time*.51+i)*.22);
  }
 });
}
