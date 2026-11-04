import * as THREE from './vendor/three.module.min.js';
const cube=new THREE.BoxGeometry(1,1,1).toNonIndexed().attributes.position;
const center=new THREE.Vector3(),scale=new THREE.Vector3(),point=new THREE.Vector3(),color=new THREE.Color();
const matrix=new THREE.Matrix4(),straight=new THREE.Quaternion(),along=new THREE.Quaternion(),forward=new THREE.Vector3(0,0,1);
export class SceneryMesh {
 constructor(){this.vertices=[];this.colors=[];}
 box(x,y,z,w,h,d,tint,rotation=straight){
  center.set(x,y,z);scale.set(w,h,d);matrix.compose(center,rotation,scale);color.set(tint);
  for(let i=0;i<cube.count;i++){
   point.fromBufferAttribute(cube,i).applyMatrix4(matrix);this.vertices.push(point.x,point.y,point.z);this.colors.push(color.r,color.g,color.b);
  }
 }
 bar(a,b,w,h,tint){
  const delta=point.set(b.x-a.x,b.y-a.y,b.z-a.z),length=delta.length();
  if(!length)return;
  along.setFromUnitVectors(forward,delta.normalize());
  this.box((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2,w,h,length+.003,tint,along);
 }
 geometry(){
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(this.vertices,3));g.setAttribute('color',new THREE.Float32BufferAttribute(this.colors,3));g.computeVertexNormals();if(this.vertices.length)g.computeBoundingSphere();else g.boundingSphere=new THREE.Sphere(new THREE.Vector3(),0);return g;
 }
}
