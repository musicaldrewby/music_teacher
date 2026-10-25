import {craftedMaterial,type Finish} from './crafted-materials';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import * as THREE from 'three';
import {sceneryManifest,snowPosition,type Prop,type SceneryManifest} from './scenery';
import type {Project} from './project';
export function propGeometry(shape:Prop['shape']):THREE.BufferGeometry{
 if(shape==='box')return new RoundedBoxGeometry(1,1,1,2,.025);
 if(shape==='sphere')return new THREE.IcosahedronGeometry(1,3);
 if(shape==='cone')return new THREE.ConeGeometry(1,1,8);
 if(shape==='cylinder')return new THREE.CylinderGeometry(1,1,1,20);
 if(shape==='roof'){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([-.5,-.5,-.5,.5,-.5,-.5,0,.5,-.5,-.5,-.5,.5,.5,-.5,.5,0,.5,.5],3));g.setIndex([0,2,1,3,4,5,0,3,5,0,5,2,2,5,4,2,4,1,0,1,4,0,4,3]);g.computeVertexNormals();return g;}
 const path=new THREE.Shape();
 if(shape==='triangle'){path.moveTo(-.5,-.5);path.lineTo(.5,-.5);path.lineTo(0,.5);path.closePath();}
 else {for(let i=0;i<10;i++){const a=i*Math.PI/5+Math.PI/2,r=i%2?.43:1;const x=Math.cos(a)*r,y=Math.sin(a)*r;if(!i)path.moveTo(x,y);else path.lineTo(x,y);}path.closePath();}
 const g=new THREE.ExtrudeGeometry(path,{depth:1,bevelEnabled:false,steps:1});g.translate(0,0,-.5);return g;
}
function transform(prop:Prop){const m=new THREE.Matrix4(),q=new THREE.Quaternion().setFromEuler(new THREE.Euler(...prop.rotation.map(x=>x*Math.PI/180) as [number,number,number]));return m.compose(new THREE.Vector3(...prop.position),q,new THREE.Vector3(...prop.scale));}
export function skyGeometry(manifest:SceneryManifest){const g=new THREE.SphereGeometry(900,48,24),positions=g.getAttribute('position'),top=new THREE.Color(manifest.skyTop),horizon=new THREE.Color(manifest.skyHorizon),colors=[];for(let i=0;i<positions.count;i++){const f=THREE.MathUtils.smoothstep(positions.getY(i)/900,0,.22),c=horizon.clone().lerp(top,f);colors.push(c.r,c.g,c.b);}g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return g;}
export class SceneryObjects{
 manifest:SceneryManifest;snow:THREE.InstancedMesh|null=null;dummy=new THREE.Object3D();
 constructor(scene:THREE.Scene,p:Project){this.manifest=sceneryManifest(p);const m=this.manifest;
  if(m.theme!=='studio'){
   scene.background=new THREE.Color(m.skyTop);scene.fog=new THREE.FogExp2(m.skyHorizon,.0025);
   const sky=new THREE.Mesh(skyGeometry(m),new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,fog:false}));sky.name='Seasonal gradient sky';sky.frustumCulled=false;scene.add(sky);
   for(const prop of m.props){const finish=propFinish(prop),material=finish?craftedMaterial(finish,prop.color):new THREE.MeshStandardMaterial({color:prop.color,roughness:.62,metalness:prop.metal});material.emissive.set(prop.color);material.emissiveIntensity=prop.glow;const mesh=new THREE.Mesh(propGeometry(prop.shape),material);mesh.name=prop.name;mesh.applyMatrix4(transform(prop));mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);}
   for(const [x,z] of [[m.snowBounds.cx-11,m.snowBounds.cz-7],[m.snowBounds.cx+11,m.snowBounds.cz-7]]){const light=new THREE.PointLight(m.theme==='halloween'?'#ff780d':'#ffb33f',85,18,2);light.position.set(x,4,z);scene.add(light);}
  }
  if(m.snow.length){this.snow=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshBasicMaterial({color:'#e5f7ff'}),m.snow.length);this.snow.name='3D snowfall';this.snow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.snow.frustumCulled=false;scene.add(this.snow);this.update(0);}
 }
 update(time:number){if(!this.snow)return;this.manifest.snow.forEach((n,i)=>{this.dummy.position.set(...snowPosition(this.manifest,i,time));this.dummy.scale.setScalar(n.size);this.dummy.updateMatrix();this.snow!.setMatrixAt(i,this.dummy.matrix);});this.snow.instanceMatrix.needsUpdate=true;}
}
function serializeGeometry(g:THREE.BufferGeometry){const pos=g.getAttribute('position'),vertices=Array.from({length:pos.count},(_,i)=>[pos.getX(i),pos.getY(i),pos.getZ(i)]),index=g.getIndex(),faces=Array.from({length:(index?.count??pos.count)/3},(_,i)=>[0,1,2].map(j=>index?index.getX(i*3+j):i*3+j));const colors=g.getAttribute('color');const result={vertices,faces,...(colors?{colors:Array.from({length:colors.count},(_,i)=>[colors.getX(i),colors.getY(i),colors.getZ(i),1])}:{})};g.dispose();return result;}
export function exportScenery(p:Project){const manifest=sceneryManifest(p),shapes=[...new Set(manifest.props.map(p=>p.shape))];return {...manifest,geometries:Object.fromEntries(shapes.map(s=>[s,serializeGeometry(propGeometry(s))])),sky:manifest.theme==='studio'?null:serializeGeometry(skyGeometry(manifest)),props:manifest.props.map(p=>({...p,finish:propFinish(p),matrix:Array.from({length:4},(_,r)=>Array.from({length:4},(_,c)=>transform(p).elements[c*4+r]))}))};}

export function propFinish(p:Prop):Finish|undefined{const name=p.name.toLowerCase();if(/walnut|oak|wood|panel/.test(name))return 'wood';if(/brass|gold|lantern cap/.test(name))return 'brass';if(/velvet|runner/.test(name))return 'velvet';if(/stone|paving|courtyard|brick|slate|moon/.test(name))return 'stone';return undefined;}
