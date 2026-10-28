import * as THREE from './vendor/three.module.js';

// Keep the center aisle and the route into the Listening Room open.
export const COZY_LAYOUT = Object.freeze({
  sx:[-4.85,-4.5], ax:[-5.05,0], bx:[-4.85,4.4],
  sm:[4.85,-4.5], am:[5.05,0], bm:[4.85,4.4],
  maracas:[-7.4,7.2], tambourine:[-5.35,7.2], cowbell:[-3.3,7.2]
});
export function arrangeCozyStudio(stations) {
  for (const station of stations) {
    const position=COZY_LAYOUT[station.id];
    if(position) [station.x,station.z]=position;
  }
}

function roundedShape(width,height,radius) {
  const x=-width/2,y=-height/2,r=Math.min(radius,width/2,height/2),s=new THREE.Shape();
  s.moveTo(x+r,y);s.lineTo(x+width-r,y);s.quadraticCurveTo(x+width,y,x+width,y+r);
  s.lineTo(x+width,y+height-r);s.quadraticCurveTo(x+width,y+height,x+width-r,y+height);
  s.lineTo(x+r,y+height);s.quadraticCurveTo(x,y+height,x,y+height-r);
  s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;
}

export function buildCozyStudio(scene,stations) {
  const studio=new THREE.Group();studio.name='Cozy creative studio';scene.add(studio);
  const blockers=[];
  function solid(geometry,color,x,y,z,parent=studio,name='Studio detail') {
    const m=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.94}));
    m.position.set(x,y,z);m.name=name;m.receiveShadow=true;parent.add(m);return m;
  }
  const box=(w,h,d,color,x,y,z,parent,name)=>solid(new THREE.BoxGeometry(w,h,d),color,x,y,z,parent,name);
  const cylinder=(r,h,color,x,y,z,parent,name)=>solid(new THREE.CylinderGeometry(r,r,h,12),color,x,y,z,parent,name);
  function cushion(w,h,d,color,x,y,z,parent=studio) {
    const geometry=new THREE.ExtrudeGeometry(roundedShape(w,h,.065),{depth:d-.06,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.03,bevelThickness:.03,curveSegments:3});
    geometry.translate(0,0,-(d-.06)/2);return solid(geometry,color,x,y,z,parent,'Linen cushion');
  }
  function rug(w,d,color,x,z,r=.22) {
    const group=new THREE.Group();group.name='Flat woven rug';group.position.set(x,.045,z);studio.add(group);
    for(const [inset,tone,y]of [[0,0xc9b598,0],[.14,color,.002]]) {
      const m=solid(new THREE.ShapeGeometry(roundedShape(w-inset,d-inset,r),5),tone,0,y,0,group,'Woven surface');m.rotation.x=-Math.PI/2;
    }
    return group;
  }
  function lamp(x,z,height=1.8,parent=studio) {
    cylinder(.25,.045,0x765a3d,x,.04,z,parent,'Lamp base');
    cylinder(.018,height-.4,0x8f7654,x,(height-.4)/2,z,parent,'Brass lamp stem');
    const shade=solid(new THREE.CylinderGeometry(.23,.36,.46,20,1,true),0xe9d7b6,x,height-.25,z,parent,'Linen lampshade');
    shade.material.side=THREE.DoubleSide;shade.material.emissive.setHex(0x6b4d24);shade.material.emissiveIntensity=.24;
    const glow=solid(new THREE.CircleGeometry(.32,20),0xffdf9e,x,height-.482,z,parent,'Warm lamp diffuser');
    glow.rotation.x=Math.PI/2;glow.material=new THREE.MeshBasicMaterial({color:0xffdf9e,side:THREE.DoubleSide});
  }
  function planter(x,z,height=.9,parent=studio) {
    const pot=solid(new THREE.CylinderGeometry(.19,.14,.31,12),0xb27d60,x,.19,z,parent,'Terracotta pot');
    for(let i=0;i<5;i++) {
      const a=i*2.4,leaf=solid(new THREE.SphereGeometry(.14,8,6),i%2?0x708774:0x536f59,x+Math.cos(a)*.12,height-.2+i*.07,z+Math.sin(a)*.12,parent,'Quiet green foliage');
      leaf.scale.set(.65,2.1,.45);leaf.rotation.z=Math.cos(a)*.4;
    }
    return pot;
  }
  function blocker(w,h,d,x,y,z) {
    // Occlude floor-selection rays without rendering another mesh or adding a light.
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshBasicMaterial({visible:false}));
    m.position.set(x,y,z);m.userData.action=()=>{};m.name='Furniture ray boundary';studio.add(m);blockers.push(m);
  }

  for(const s of stations.filter(s=>['xylophone','metallophone'].includes(s.type)))
    rug(2.65,2.35,s.type==='xylophone'?0x986f58:0x6e8a77,s.x,s.z+.30);
  rug(4.6,3.6,0x73816b,0,2.35,.65);
  rug(2.55,2.35,0xb09b72,0,-3.2,.4);
  rug(6.25,2.1,0x9c8167,-5.35,7.35,.35);
  rug(1.15,12.8,0x8a8077,7.35,-.9,.22);

  // Narrow linen folds sit at window mullions, leaving the landscape exposed.
  for(const z of [-8,-4.6,-1.2,2.2,5.6,9]) {
    for(let i=0;i<4;i++) {
      const fold=cylinder(.085,2.78,i%2?0xc7baa0:0xd9ceb8,-9.04+(i%2)*.035,2.45,z+(i-1.5)*.105,studio,'Linen window curtain');
      fold.scale.x=.58;
    }
  }
  box(.06,.065,18.1,0x8f7756,-8.99,3.91,.5,studio,'Curtain rail');

  // Low window bench and a few books: outside every playing position.
  box(.72,.53,2.7,0x967453,-8.55,.30,2.15,studio,'Oak window bench');
  cushion(.75,.15,2.7,0xb3bca4,-8.55,.66,2.15);
  for(let i=0;i<6;i++) box(.13,.28+(i%3)*.04,.25,[0xb78b70,0x667f70,0xc4b18c][i%3],-8.48,.94,1.15+i*.15,studio,'Studio sketchbook');
  lamp(-8.2,4.05);planter(-8.25,.25);
  blocker(.78,.83,2.8,-8.55,.42,2.15);

  // Two small abstract prints use geometry, with no downloads or raster assets.
  for(const [i,x]of [-7.35,-5.80].entries()) {
    const art=new THREE.Group();art.name='Framed studio print';art.position.set(x,1.62,-9.12);studio.add(art);
    box(1.15,1.1,.075,0x94714f,0,0,0,art);
    box(1.01,.96,.015,0xe6d7b9,0,0,.045,art);
    const arch=solid(new THREE.CircleGeometry(.34,24,0,Math.PI),i?0x6a8877:0xbd8e62,0,-.15,.058,art,'Abstract arch');
    solid(new THREE.CircleGeometry(.11,20),i?0xc0a075:0x8c7769,.24,.25,.06,art,'Abstract sun');
    box(.68,.025,.015,0x9b8869,0,-.27,.061,art);
  }

  // Side-facing sofas leave a continuous 4.7 m central listening aisle.
  rug(5.1,6.2,0x8d9a7f,0,14.35,.55);
  for(const side of [-1,1]) {
    const sofa=new THREE.Group();sofa.name='Listening lounge sofa';sofa.position.set(side*3.03,0,14.25);sofa.rotation.y=side>0?-Math.PI/2:Math.PI/2;studio.add(sofa);
    box(2.8,.25,.93,0x876749,0,.20,0,sofa);
    cushion(2.65,.22,.86,0xb5bea4,0,.43,.02,sofa);
    cushion(2.8,.7,.20,0x879f89,0,.79,-.40,sofa);
    for(const end of [-1,1]) {
      cushion(.19,.36,.90,0x879f89,end*1.36,.64,0,sofa);
      const pillow=cushion(.48,.44,.16,end<0?0xc5a17b:0xe1d3b6,end*.87,.78,-.22,sofa);pillow.rotation.z=end*.1;
    }
    blocker(1.08,1.12,2.98,side*3.03,.56,14.25);
    cylinder(.37,.045,0xa4815c,side*3.05,.57,11.68,studio,'Lounge side table');
    cylinder(.045,.53,0x7c6247,side*3.05,.29,11.68);
    lamp(side*3.25,16.6,1.75);
    planter(side*3.25,10.25,.8);
  }

  // One stationary floor outline, never a flashing effect or an extra light.
  const focus=new THREE.Mesh(new THREE.RingGeometry(.78,.805,48),new THREE.MeshBasicMaterial({color:0xd3b26e,transparent:true,opacity:.75,side:THREE.DoubleSide,depthWrite:false}));
  focus.name='Selected instrument outline';focus.rotation.x=-Math.PI/2;focus.userData.dynamic=true;focus.visible=false;scene.add(focus);
  function select(station) {
    focus.visible=!!station&&!['notewall','gallery'].includes(station.type);
    if(!focus.visible)return;
    const p=station.group?.position||station,angle=station.rot||0,wall=['drums','bass','synth','boomwhacker'].includes(station.type),offset=wall?1.15:.18;
    focus.position.set(p.x+Math.sin(angle)*offset,.065,p.z+Math.cos(angle)*offset);
    focus.scale.set(station.type==='steelpan'?1:1.15,wall?.75:1,1);focus.rotation.z=-angle;
  }
  return {root:studio,focus,blockers,select};
}
