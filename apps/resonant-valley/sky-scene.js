import * as THREE from './vendor/three.module.min.js';
import {Noise} from './noise.js';
import {createValleySky,rainFront} from './valley-sky.js';
import {roofHeight} from './atmosphere.js';
import {createStarField} from './star-field.js';
const lerp=(a,b,t)=>a+(b-a)*t;
export class SkyScene {
 constructor(world){
  this.world=world;this.root=new THREE.Group();world.scene.add(this.root);this.roofs=new Map();this.roofAge=-1;
  this.paint=createValleySky();this.dome=this.paint.dome;this.root.add(this.dome,this.paint.clouds);
  const sunMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{color:{value:new THREE.Color('#fff0bb')},opacity:{value:1}},vertexShader:'varying vec2 v;void main(){v=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 v;uniform vec3 color;uniform float opacity;void main(){vec2 p=floor(v*16.)/16.;float d=length(p);if(d>1.)discard;gl_FragColor=vec4(color,opacity);}',toneMapped:false});
  this.sun=new THREE.Mesh(new THREE.PlaneGeometry(7,7),sunMaterial);this.sun.renderOrder=-15;this.root.add(this.sun);
  this.moon=new THREE.Mesh(new THREE.PlaneGeometry(7.5,7.5),new THREE.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,uniforms:{phase:{value:0},opacity:{value:1}},vertexShader:sunMaterial.vertexShader,fragmentShader:'varying vec2 v;uniform float phase;uniform float opacity;void main(){vec2 p=floor(v*20.)/20.;float r=dot(p,p);if(r>1.)discard;vec3 n=vec3(p,sqrt(1.-r));float lit=smoothstep(-.03,.08,dot(n,vec3(sin(phase),0.,-cos(phase))));float crater=.87+.13*step(.35,fract(sin(dot(floor(p*9.),vec2(17.3,91.7)))*437.1));gl_FragColor=vec4(mix(vec3(.055,.09,.18),vec3(.82,.9,1.)*crater,lit),opacity);}'}));this.moon.renderOrder=-14;this.root.add(this.moon);
  this.starGeo=new THREE.BufferGeometry();
  const starMaterial=new THREE.PointsMaterial({color:'#e8efff',vertexColors:true,size:.34,transparent:true,opacity:0,depthWrite:false,fog:false,toneMapped:false});
  // Small square points keep the pixel look; a few larger stars add variety.
  starMaterial.onBeforeCompile=shader=>{shader.vertexShader='attribute float starSize;\n'+shader.vertexShader.replace('gl_PointSize = size;','gl_PointSize = size * starSize;');};
  starMaterial.customProgramCacheKey=()=> 'valley-stars-v1';
  this.stars=new THREE.Points(this.starGeo,starMaterial);this.stars.renderOrder=-18;this.root.add(this.stars);
  this.meteor=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-23,70,-90),new THREE.Vector3(-11,65,-90)]),new THREE.LineBasicMaterial({color:'#dbf8ff',transparent:true,opacity:0,depthWrite:false,fog:false}));this.meteor.renderOrder=-16;this.root.add(this.meteor);
  this.aurora=new THREE.Mesh(new THREE.PlaneGeometry(170,45,24,1),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:{time:{value:0},opacity:{value:0}},vertexShader:'varying vec2 v;uniform float time;void main(){v=uv;vec3 p=position;p.z+=sin(p.x*.05+time*.12)*12.;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',fragmentShader:'varying vec2 v;uniform float time;uniform float opacity;void main(){float curtain=pow(.5+.5*sin(v.x*90.+sin(v.x*23.+time*.1)*4.),3.);float a=sin(v.y*3.14159)*curtain*opacity*.24;gl_FragColor=vec4(mix(vec3(.15,.85,.65),vec3(.44,.22,.95),v.y),a);}'}));this.aurora.renderOrder=-17;this.aurora.position.set(0,55,-110);this.root.add(this.aurora);
  this.rainData=new Float32Array(280*6);this.rainGeo=new THREE.BufferGeometry();this.rainGeo.setAttribute('position',new THREE.BufferAttribute(this.rainData,3));this.rain=new THREE.LineSegments(this.rainGeo,new THREE.LineBasicMaterial({color:'#a9d6f4',transparent:true,opacity:.5,depthWrite:false}));this.rain.frustumCulled=false;world.scene.add(this.rain);
  this.snowData=new Float32Array(220*3);this.snowGeo=new THREE.BufferGeometry();this.snowGeo.setAttribute('position',new THREE.BufferAttribute(this.snowData,3));this.snow=new THREE.Points(this.snowGeo,new THREE.PointsMaterial({color:'#f2f8ff',size:.11,transparent:true,opacity:.85,depthWrite:false}));this.snow.frustumCulled=false;world.scene.add(this.snow);
  this.splashData=new Float32Array(50*6);this.splashGeo=new THREE.BufferGeometry();this.splashGeo.setAttribute('position',new THREE.BufferAttribute(this.splashData,3));this.splashes=new THREE.LineSegments(this.splashGeo,this.rain.material);this.splashes.frustumCulled=false;world.scene.add(this.splashes);
  this.seed('Resonant Valley');
 }
 seed(seed){
  this.paint.seed(seed);this.noise=new Noise(seed+' sky');const stars=createStarField(seed);
  for(const [name,array,itemSize] of [['position',stars.position,3],['color',stars.color,3],['starSize',stars.size,1]]){
   const attribute=this.starGeo.getAttribute(name);
   if(attribute){attribute.array.set(array);attribute.needsUpdate=true;}
   else this.starGeo.setAttribute(name,new THREE.BufferAttribute(array,itemSize));
  }
  this.starGeo.computeBoundingSphere();this.roofs.clear();
 }
 roof(x,z){const key=Math.floor(x)+','+Math.floor(z);if(!this.roofs.has(key))this.roofs.set(key,roofHeight(this.world,x,z));return this.roofs.get(key);}
 update(t,s){
  const w=this.world,view=w.renderCamera||w.camera,p=view.position,sky=w.lightAt(p.x,p.y,p.z)[0],underwater=w.isWater(p.x,p.y,p.z),visible=sky>.1&&!underwater;
  this.root.position.copy(p);this.root.visible=visible;
  const angle=(s.phase-.22)*Math.PI*2,direction=new THREE.Vector3(Math.cos(angle),Math.sin(angle),-.32).normalize();
  this.paint.update(w.atmosphere.age,s,direction,p,rainFront(w.atmosphere));
  const horizon=this.dome.material.uniforms.horizon.value;
  w.scene.background.copy(horizon).multiplyScalar(Math.max(.008,sky));w.scene.fog.color.copy(underwater?new THREE.Color('#167ba5'):horizon);
  if(underwater)w.scene.background.set('#167ba5');
  const mist=s.mist*.68+s.rain*.17+s.snow*.25;
  w.scene.fog.near=underwater?1:lerp(Math.max(16,(w.viewDistance-1.3)*16),7,mist);w.scene.fog.far=underwater?18:lerp(w.horizon?145:w.viewDistance*16-2,25,mist);
  this.sun.visible=direction.y>-.025;this.sun.position.copy(direction).multiplyScalar(140);this.sun.quaternion.copy(view.quaternion);this.sun.material.uniforms.opacity.value=1-s.cloud*.88;
  const moonAngle=angle-s.moonIndex/8*Math.PI*2;this.moon.position.set(Math.cos(moonAngle),Math.sin(moonAngle),-.25).normalize().multiplyScalar(135);this.moon.visible=this.moon.position.y>-2&&s.moon>.01;this.moon.quaternion.copy(view.quaternion);this.moon.material.uniforms.phase.value=s.moonIndex/8*Math.PI*2;this.moon.material.uniforms.opacity.value=(.2+s.night*.8)*(1-s.cloud*.94);
  this.stars.rotation.z=-(s.day-1+s.phase)*Math.PI*2;this.stars.material.opacity=s.night*(1-s.cloud)*.95;
  this.meteor.material.opacity=s.meteor;this.meteor.position.set(((w.atmosphere.age%300)-296)*13,0,0);
  this.aurora.material.uniforms.time.value=t;this.aurora.material.uniforms.opacity.value=s.aurora;this.aurora.visible=s.aurora>.01;
  w.hemi.color.set('#a6c6ff').lerp(new THREE.Color('#eef8ff'),s.daylight);w.hemi.groundColor.set('#29416a').lerp(new THREE.Color('#587d9d'),s.daylight);w.hemi.intensity=lerp(.22+s.moon*.16,1.55,s.daylight)*(1-s.cloud*.23);
  w.sun.color.set(s.daylight>.5?'#ffffff':'#b5d1ff').lerp(new THREE.Color('#ffc18e'),this.dome.material.uniforms.daylight.value.y*.65);w.sun.intensity=lerp(.1+s.moon*.4,2.35,s.daylight)*(1-s.cloud*.79)+s.flash;
  const lightDir=s.elevation>0?direction:this.moon.position.clone().normalize();lightDir.y=Math.max(.16,lightDir.y);w.sun.position.copy(p).addScaledVector(lightDir,65);w.sun.target.position.copy(p);
  w.waterMaterial.uniforms.shade.value=lerp(.3+s.moon*.15,1,s.daylight)*(1-s.cloud*.22);
  for(const material of [w.material,w.floraMaterial,w.leafMaterial])material.color.setScalar(1-s.wet*.13);
  if(w.windUniform)w.windUniform.value=t*(.35+s.wind);
  if(t-this.roofAge>.8){this.roofs.clear();this.roofAge=t;}
  this.sheltered=this.roof(w.camera.position.x,w.camera.position.z)>w.camera.position.y+.2;
  this.rain.visible=s.rain>.025&&!underwater;this.snow.visible=s.snow>.025&&!underwater;this.splashes.visible=this.rain.visible;
  const drop=(i,speed,radius)=>{const x=p.x+(this.noise.random(i,3)-.5)*radius+Math.sin(t*.2+i)*s.wind,z=p.z+(this.noise.random(i,4)-.5)*radius;const y=p.y+11-((t*speed+this.noise.random(i,5)*18)%18);return [x,y,z,this.roof(x,z)];};
  if(this.rain.visible){const count=Math.floor(280*s.rain);this.rainGeo.setDrawRange(0,count*2);for(let i=0;i<count;i++){const [x,y,z,roof]=drop(i,17,27),hidden=y<=roof;this.rainData.set([x,hidden?-1000:y,z,x+s.wind*.08,hidden?-1000:Math.max(roof,y-.65),z],i*6);}this.rainGeo.attributes.position.needsUpdate=true;}
  if(this.snow.visible){const count=Math.floor(220*s.snow);this.snowGeo.setDrawRange(0,count);for(let i=0;i<count;i++){const [x,y,z,roof]=drop(i,1.3,25);const drift=x+Math.sin(t*.5+i)*.25;this.snowData.set([drift,y<=Math.max(roof,this.roof(drift,z))?-1000:y,z],i*3);}this.snowGeo.attributes.position.needsUpdate=true;}
  if(this.splashes.visible){const count=Math.floor(50*s.rain);this.splashGeo.setDrawRange(0,count*2);for(let i=0;i<count;i++){const [x,,z,roof]=drop(i+300,1,22),radius=.035+(t*3+i)%1*.12,y=Number.isFinite(roof)&&Math.abs(roof-p.y)<10?roof+.02:-1000;this.splashData.set([x-radius,y,z,x+radius,y,z],i*6);}this.splashGeo.attributes.position.needsUpdate=true;}
 }
}
