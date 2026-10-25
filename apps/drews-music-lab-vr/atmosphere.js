import * as THREE from './vendor/three.module.js';
import {OutdoorWeather} from './weather.js?v=34';

// Static geometry and three shadow-free fill lights keep the room XR-friendly.
export function addAtmosphere(scene){
  const basic=color=>new THREE.MeshBasicMaterial({color});
  const solid=color=>new THREE.MeshStandardMaterial({color,roughness:.9});
  function mesh(geometry,material,x,y,z){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);scene.add(m);if(material.isMeshBasicMaterial&&y>3.9&&y<4.2){m.userData.dynamic=true;m.userData.baseColor=material.color.clone();scene.userData.showFixtures.push(m);}return m;}
  const sky=new THREE.Mesh(new THREE.SphereGeometry(65,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{zenith:{value:new THREE.Color(0x172a66)},horizon:{value:new THREE.Color(0xe99182)}},vertexShader:'varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform vec3 zenith;uniform vec3 horizon;uniform float cloud;uniform float time;uniform float flash;varying vec3 vDirection;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}void main(){vec3 d=normalize(vDirection);float h=smoothstep(0.0,0.65,d.y);vec3 color=mix(horizon,zenith,h);vec2 p=d.xz/(max(d.y,0.0)+.23)*2.8+vec2(time*.012,0.0);float n=noise(p)*.6+noise(p*2.1)*.3+noise(p*4.2)*.1;float clouds=smoothstep(.58-cloud*.24,.8-cloud*.17,n)*smoothstep(-.02,.18,d.y);color=mix(color,mix(horizon,vec3(.3,.34,.4),cloud*.8),clouds*(.48+cloud*.4));gl_FragColor=vec4(color+flash,1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'}));
  scene.add(sky);scene.userData.showLights=[];scene.userData.showFixtures=[];
  const sun=mesh(new THREE.SphereGeometry(2.1,20,12),basic(0xffe7a5),-43,20,0);sun.userData.dynamic=true;
  const moon=mesh(new THREE.SphereGeometry(2.7,32,20),basic(0xffdfa9),-40,11,-15);moon.material.fog=false;moon.userData.dynamic=true;
  // Layered mountains and a still lake are real scenery in both headset eyes.
  mesh(new THREE.BoxGeometry(45,.1,85),solid(0x243f68),-33,-.16,0);
  mesh(new THREE.PlaneGeometry(13,78),new THREE.MeshStandardMaterial({color:0x668bba,metalness:.65,roughness:.28}),-18,-.07,0).rotation.x=-Math.PI/2;
  for(let row=0;row<2;row++)for(let i=0;i<11;i++){
    const h=7+Math.sin(i*2.1+row)*3+row*3;
    const m=mesh(new THREE.ConeGeometry(6+row*2,h,5),solid(row?0x6c648c:0x475a7b),-27-row*12,h/2-.3,i*7-35+row*2);m.rotation.y=i*.8;
  }
  const points=[];for(let i=0;i<110;i++){const t=i*2.399963;points.push(-20-(i%11)*2.5,12+(i*7%29),Math.sin(t)*38);}
  const stars=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(points,3)),new THREE.PointsMaterial({color:0xe4f0ff,size:.10,sizeAttenuation:true,fog:false}));scene.add(stars);scene.userData.weather=new OutdoorWeather(scene,sky,stars,sun,moon);
  for(const [x,z,color] of [[-5.5,0,0xffe0b4],[5.5,2,0xb9ded0],[0,-5,0xffeac9]]){const light=new THREE.PointLight(color,14,13,2);light.position.set(x,3.5,z);light.userData.baseIntensity=14;light.userData.baseColor=light.color.clone();scene.userData.showLights.push(light);scene.add(light);}
  // Luminous coves, floating ring fixtures and colorful acoustic wall tiles.
  for(const [x,color] of [[-9.05,0xffdfb0],[9.05,0xc8e0d1]])mesh(new THREE.BoxGeometry(.045,.055,18.5),basic(color),x,3.96,0);
  for(const z of [-9.13,9.13])mesh(new THREE.BoxGeometry(18,.055,.045),basic(z<0?0xf3ddb5:0xffd7a3),0,3.96,z);
  for(const [z,color] of [[-3.5,0xc8e6d8],[2,0xffdfad]]){
    const ring=mesh(new THREE.TorusGeometry(1.15,.035,8,64),basic(color),0,4.04,z);ring.rotation.x=Math.PI/2;
    for(const x of [-.9,.9])mesh(new THREE.CylinderGeometry(.008,.008,.46,6),solid(0x51648a),x,4.32,z);
  }
  for(let i=0;i<7;i++){
    const tile=mesh(new THREE.CylinderGeometry(.36,.36,.09,6),solid([0x8aab9b,0x9e7b66,0xc0a26c][i%3]),-7.8+i*.88,2.0+Math.sin(i*.9)*.34,9.12);tile.rotation.x=Math.PI/2;
  }
  for(const x of [-4.7,4.7])for(const z of [-4.7,0,4.7])mesh(new THREE.BoxGeometry(1.5,.035,.025),basic(x<0?0xffc26f:0xbce5d8),x,.06,z+.65);
}
