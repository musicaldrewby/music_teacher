import * as THREE from 'three';

// Atmosphere only: no characters or creature geometry in the scene or export.
export function createHaunting() {
  const root=new THREE.Group();root.name='After-hours atmosphere';root.visible=false;
  const clouds=[],lamps=[];
  let active=false,elapsed=0;
  function light(color,power,x,y,z,distance){const l=new THREE.PointLight(color,power,distance,2);l.position.set(x,y,z);root.add(l);lamps.push({light:l,power});return l;}

  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d');
  for(let n=0;n<24;n++){
    const x=64+Math.sin(n*2.39)*31,y=64+Math.cos(n*1.77)*23,r=23+n%5*4;
    const gradient=ctx.createRadialGradient(x,y,0,x,y,r);gradient.addColorStop(0,'rgba(255,255,255,.12)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  }
  const mistTexture=new THREE.CanvasTexture(canvas);
  for(let i=0;i<42;i++){
    const mat=new THREE.SpriteMaterial({map:mistTexture,color:i%3?0x8b9eaf:0x6a8984,transparent:true,opacity:.30,depthWrite:false});
    const cloud=new THREE.Sprite(mat);cloud.name='Rolling floor mist';cloud.scale.set(3.4+i%4*.55,.65+i%3*.15,1);cloud.renderOrder=4;root.add(cloud);
    clouds.push({sprite:cloud,x:Math.sin(i*3.4)*3.25,z:Math.cos(i*2.3)*4.3,phase:i*1.7});
  }
  // Thin higher wisps catch the moonlight without obscuring the classroom.
  for(let i=0;i<7;i++){
    const cloud=new THREE.Sprite(new THREE.SpriteMaterial({map:mistTexture,color:0x839aaa,transparent:true,opacity:.065,depthWrite:false}));
    cloud.name='Moonlit haze';cloud.scale.set(4.2,.7,1);root.add(cloud);
    clouds.push({sprite:cloud,x:Math.sin(i*2.5)*2.6,z:Math.cos(i*1.8)*3.7,phase:i*2.1,high:true});
  }
  const motePositions=new Float32Array(90*3),moteBase=new Float32Array(90*3);
  for(let i=0;i<90;i++){moteBase[i*3]=Math.sin(i*3.17)*3.5;moteBase[i*3+1]=.3+(i%37)/37*3.4;moteBase[i*3+2]=Math.cos(i*2.41)*4.8;}
  motePositions.set(moteBase);const moteGeometry=new THREE.BufferGeometry();moteGeometry.setAttribute('position',new THREE.BufferAttribute(motePositions,3));
  const motes=new THREE.Points(moteGeometry,new THREE.PointsMaterial({color:0x90acba,size:.012,transparent:true,opacity:.32,depthWrite:false}));motes.name='Dust in the moonlight';root.add(motes);
  light(0x6337b1,19,-3.65,.35,-3.8,6.5);
  light(0xac192b,23,2.8,.45,4.8,5.8);
  light(0x719c58,14,3.5,.24,-2.6,5.4);
  light(0xaa2934,9,-1.95,1.2,-5.85,3.8);

  function update(dt,reducedMotion=false){
    if(!active)return;elapsed+=reducedMotion?0:dt;const t=elapsed;
    clouds.forEach(({sprite,x,z,phase,high})=>{
      sprite.position.set(x+Math.sin(t*.075+phase)*.55,(high?1.65:.22)+Math.sin(t*.13+phase)*(high?.13:.065),z+Math.cos(t*.065+phase)*.40);
      sprite.material.opacity=high?.060+.012*Math.sin(t*.19+phase):.27+.055*Math.sin(t*.19+phase);
    });
    for(let i=0;i<90;i++){motePositions[i*3]=moteBase[i*3]+Math.sin(t*.10+i)*.18;motePositions[i*3+1]=moteBase[i*3+1]+Math.sin(t*.19+i)*.17;motePositions[i*3+2]=moteBase[i*3+2];}moteGeometry.attributes.position.needsUpdate=true;
    lamps.forEach(({light,power},i)=>{const pulse=.77+.17*Math.sin(t*.37+i*1.3)+.06*Math.sin(t*.83+i);light.intensity=power*pulse;});
  }
  function setActive(value){active=!!value;root.visible=active;if(active)update(0);}
  function exportWithRoom(room){const g=new THREE.Group();g.name='Music classroom';g.add(room.clone(true));return g;}
  return {root,clouds,setActive,update,exportWithRoom,get active(){return active;},get time(){return elapsed;}};
}
