import {isTrack} from './railway.js';
import * as THREE from './vendor/three.module.min.js';
import {crackPixels} from './mining.js';
export class BreakOverlay {
 constructor(scene){
  this.textures=Array.from({length:8},(_,stage)=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=32;const ctx=canvas.getContext('2d'),image=ctx.createImageData(32,32);image.data.set(crackPixels(stage));ctx.putImageData(image,0,0);const texture=new THREE.CanvasTexture(canvas);texture.magFilter=texture.minFilter=THREE.NearestFilter;texture.generateMipmaps=false;texture.colorSpace=THREE.SRGBColorSpace;return texture;});
  this.material=new THREE.MeshBasicMaterial({map:this.textures[0],transparent:true,alphaTest:.05,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3,toneMapped:false});
  this.root=new THREE.Group();scene.add(this.root);this.block=new THREE.Mesh(new THREE.BoxGeometry(1.004,1.004,1.004),this.material);this.block.renderOrder=5;this.root.add(this.block);this.parts=new THREE.Group();this.root.add(this.parts);this.clear();
 }
 clear(){this.root.visible=false;this.key=null;this.stage=-1;this.parts.clear();}
 show(target,progress,entityMesh){
  if(!target||progress<=0){this.clear();return;}
  const {hit,key}=target;
  if(key!==this.key){
   this.parts.clear();this.key=key;this.block.visible=!hit.entity;this.block.scale.set(1,1,1);this.block.rotation.set(0,0,0);
   if(isTrack(hit.entity?.type)){
    const e=hit.entity,grade=e.type==='railGrade';this.block.visible=true;this.block.position.set(e.x+.5,e.y+(grade?.59:.08),e.z+.5);
    this.block.rotation.order='YXZ';this.block.rotation.y=-e.r*Math.PI/2;this.block.rotation.x=grade?Math.PI/4:0;this.block.scale.set(.82,.065,grade?1.38:.96);
   }
   if(hit.entity&&entityMesh){entityMesh.updateWorldMatrix(true,true);entityMesh.traverse(source=>{if(!source.isMesh||!source.visible)return;const m=new THREE.Mesh(source.geometry,this.material);m.matrixAutoUpdate=false;m.matrix.copy(source.matrixWorld);m.renderOrder=5;this.parts.add(m);});}
   else if(hit.cell)this.block.position.set(hit.cell.x+.5,hit.cell.y+.5,hit.cell.z+.5);
  }
  this.root.visible=true;const stage=Math.min(7,Math.floor(progress*8));if(stage!==this.stage){this.stage=stage;this.material.map=this.textures[stage];}
 }
}
