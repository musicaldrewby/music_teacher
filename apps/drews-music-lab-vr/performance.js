import * as THREE from './vendor/three.module.js';

// Bake only decoration into parent-local meshes. Playable notes, controls,
// moving sliders, live labels and controller rigs retain their own objects.
function mergeGeometry(items,vertexColors=false){
  const attributes={position:[],normal:[],uv:[],...(vertexColors?{color:[]}: {})},indices=[];let offset=0;
  for(const {mesh,uvRect} of items){
    mesh.updateMatrix();const geometry=mesh.geometry.clone().applyMatrix4(mesh.matrix);
    for(const name of ['position','normal','uv']){
      const a=geometry.getAttribute(name);
      for(let i=0;i<a.count;i++){
        if(name==='uv'&&uvRect){attributes.uv.push(uvRect.x+a.getX(i)*uvRect.w,uvRect.y+a.getY(i)*uvRect.h);}
        else{attributes[name].push(a.getX(i),a.getY(i));if(a.itemSize===3)attributes[name].push(a.getZ(i));}
      }
    }
    const count=geometry.attributes.position.count;
    if(vertexColors)for(let i=0;i<count;i++)attributes.color.push(mesh.material.color.r,mesh.material.color.g,mesh.material.color.b);
    if(geometry.index)for(let i=0;i<geometry.index.count;i++)indices.push(offset+geometry.index.getX(i));
    else for(let i=0;i<count;i++)indices.push(offset+i);
    offset+=count;geometry.dispose();
  }
  const result=new THREE.BufferGeometry();
  for(const [name,values] of Object.entries(attributes))result.setAttribute(name,new THREE.Float32BufferAttribute(values,name==='uv'?2:3));
  result.setIndex(indices);result.computeBoundingBox();result.computeBoundingSphere();return result;
}
function materialKey(m){return [m.type,m.roughness,m.metalness,m.side,m.fog,m.toneMapped,m.emissive?.getHex(),m.emissiveIntensity].join(':');}
export function optimizeRoom(scene,rig){
  const groups=new Map(),labels=new Map();let input=0,batches=0,labelInput=0,labelBatches=0;
  scene.updateMatrixWorld(true);
  scene.traverse(m=>{
    if(!m.isMesh||m.isInstancedMesh||m.children.length||!m.parent)return;
    for(let p=m;p;p=p.parent)if(p===rig)return;
    const mat=m.material;
    if(m.userData.staticText){if(!labels.has(m.parent))labels.set(m.parent,[]);labels.get(m.parent).push(m);return;}
    if(Array.isArray(mat)||(!mat.isMeshStandardMaterial&&!mat.isMeshBasicMaterial)||mat.transparent||mat.map||mat.alphaMap||mat.vertexColors||m.userData.dynamic||m.userData.action||m.userData.floor||m.userData.spec||m.userData.slider)return;
    if(!m.geometry.attributes.position||!m.geometry.attributes.normal||!m.geometry.attributes.uv)return;
    const cell=m.parent===scene?Math.floor(m.position.x/5)+','+Math.floor(m.position.z/5):'station';
    const key=[m.parent.uuid,cell,materialKey(mat),m.castShadow,m.receiveShadow].join('|');
    if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m);
  });
  for(const meshes of groups.values()){
    if(meshes.length<2)continue;
    const first=meshes[0],material=first.material.clone();material.color.setHex(0xffffff);material.vertexColors=true;
    const batch=new THREE.Mesh(mergeGeometry(meshes.map(mesh=>({mesh})),true),material);
    batch.name='Room decoration batch';batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;batch.matrixAutoUpdate=false;
    first.parent.add(batch);for(const m of meshes){m.removeFromParent();m.geometry.dispose();m.material.dispose();}input+=meshes.length;batches++;
  }
  // Static text atlases combine note names and fixed button captions, while
  // keeping each visibility-toggle group separate (e.g. synth Easy / More).
  for(const [parent,meshes] of labels){
    if(meshes.length<2)continue;
    let page=[],x=2,y=2,row=0;
    const flush=()=>{
      if(!page.length)return;
      const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=2**Math.ceil(Math.log2(y+row+2));
      const ctx=canvas.getContext('2d');
      for(const p of page)ctx.drawImage(p.mesh.userData.canvas,p.x,p.y);
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
      const items=page.map(p=>({mesh:p.mesh,uvRect:{x:p.x/canvas.width,y:1-(p.y+p.h)/canvas.height,w:p.w/canvas.width,h:p.h/canvas.height}}));
      const batch=new THREE.Mesh(mergeGeometry(items),new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide,depthWrite:false}));
      batch.name='Static text atlas';batch.matrixAutoUpdate=false;parent.add(batch);
      for(const {mesh,x,y,w,h} of page){mesh.userData.atlas={canvas,texture,x,y,w,h};mesh.removeFromParent();mesh.geometry.dispose();mesh.material.map.dispose();mesh.material.dispose();}
      labelInput+=page.length;labelBatches++;page=[];x=2;y=2;row=0;
    };
    for(const mesh of meshes){
      const {width:w,height:h}=mesh.userData.canvas;
      if(w>1020||h>1020)continue;
      if(x+w+2>1024){x=2;y+=row+4;row=0;}
      if(y+h+2>1024)flush();
      page.push({mesh,x,y,w,h});x+=w+4;row=Math.max(row,h);
    }
    flush();
  }
  scene.traverse(m=>{
    if(!m.isMesh||m.userData.dynamic||m.userData.slider||m.userData.whiteboard)return;
    for(let p=m;p;p=p.parent)if(p===rig)return;
    m.updateMatrix();m.matrixAutoUpdate=false;
  });
  scene.updateMatrixWorld(true);
  const stats={decorationMeshes:input,decorationBatches:batches,staticLabels:labelInput,labelBatches,drawsRemoved:input-batches+labelInput-labelBatches};
  scene.userData.optimization=stats;return stats;
}

export function configureVRPerformance(renderer,getScene=()=>null){
  // These settings apply before entering XR. Desktop pixel ratio does not
  // control the stereo framebuffer. Keep center detail with moderate foveation.
  renderer.xr.setFramebufferScaleFactor?.(.9);
  renderer.xr.setFoveation?.(.5);
  const desktopShadows=renderer.shadowMap.enabled;
  const setShadows=enabled=>{
    renderer.shadowMap.enabled=enabled;
    const materials=new Set();getScene()?.traverse(object=>{if(object.material)for(const material of (Array.isArray(object.material)?object.material:[object.material]))materials.add(material);});
    // Three's shader program must be refreshed when shadow sampling changes.
    for(const material of materials)material.needsUpdate=true;
  };
  renderer.xr.addEventListener('sessionstart',()=>setShadows(false));
  renderer.xr.addEventListener('sessionend',()=>{setShadows(desktopShadows);renderer.shadowMap.needsUpdate=true;});
}
