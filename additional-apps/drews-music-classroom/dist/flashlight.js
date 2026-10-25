import * as THREE from 'three';

// Camera-mounted torch: a focused shadow-casting core and a faint outer spill.
export function createFlashlight(camera) {
  const target=new THREE.Object3D();target.name='Flashlight aim';target.position.set(0,0,-12);camera.add(target);
  const beam=new THREE.SpotLight(0xffefd9,90,22,.31,.65,1.5);
  beam.name='Flashlight beam';beam.position.set(.10,-.07,-.08);beam.target=target;
  beam.castShadow=true;beam.shadow.mapSize.set(1024,1024);beam.shadow.camera.near=.06;beam.shadow.camera.far=22;
  beam.shadow.bias=-.0001;beam.shadow.normalBias=.012;beam.shadow.radius=2;camera.add(beam);
  const spill=new THREE.SpotLight(0xdce7ef,5,15,.66,1,1.5);
  spill.name='Flashlight soft spill';spill.position.copy(beam.position);spill.target=target;camera.add(spill);
  beam.visible=spill.visible=false;
  let active=false,dirty=false,mount=camera;
  function setMount(parent){
    if(mount===parent)return;mount=parent;parent.add(beam,spill,target);
    const handheld=parent!==camera;beam.position.set(handheld?0:.10,handheld?0:-.07,-.08);spill.position.copy(beam.position);dirty=true;
  }
  const lastCameraMatrix=new THREE.Matrix4();
  function setActive(value){active=!!value;beam.visible=spill.visible=active;dirty=true;}
  function update(renderer){
    mount.updateWorldMatrix(true,true);
    if(dirty||(active&&!lastCameraMatrix.equals(mount.matrixWorld))){
      renderer.shadowMap.needsUpdate=true;beam.shadow.needsUpdate=true;
      lastCameraMatrix.copy(mount.matrixWorld);dirty=false;
    }
  }
  return {beam,spill,target,setActive,setMount,update,get active(){return active;}};
}
