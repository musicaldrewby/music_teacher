// The clouds are small painted normal maps. All the low clouds and the
// approaching shower share one instanced draw; cirrus uses one seamless tile.
import * as THREE from './vendor/three.module.min.js';
import {Noise} from './noise.js';
import {automaticWeather,smooth} from './atmosphere.js';

const TAU=Math.PI*2;
const colors=Object.fromEntries(Object.entries({
  dayTop:'#438cc5',dayRim:'#c5dfec',nightTop:'#111939',nightRim:'#39496a',
  duskTop:'#585f9d',duskRim:'#d8a9a6',overTop:'#7c8fa8',overRim:'#aab8c7'
}).map(([name,hex])=>[name,new THREE.Color(hex)]));
const glColor=hex=>'vec3('+new THREE.Color(hex).toArray().map(c=>c.toFixed(5)).join(',')+')';
const domeVertex=`
varying vec3 sight;
void main(){
  sight=position;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
  gl_Position.z=gl_Position.w*.999999;
}`;
const skyFragment=`
uniform vec3 top,horizon,sunDir;
uniform vec4 daylight;
varying vec3 sight;
void main(){
  vec3 ray=normalize(sight);
  float h=max(0.,ray.y), face=max(0.,dot(ray,sunDir));
  float skyHeight=smoothstep(-.055,.89,h);
  vec3 sky=mix(horizon,top,pow(skyHeight,.67));
  float belt=exp(-pow((h-.09)*3.8,2.));
  float west=pow(face,2.);
  sky=mix(sky,${glColor('#ffb586')},daylight.y*belt*(.15+.62*west));
  sky=mix(sky,${glColor('#ffe1af')},daylight.y*pow(face,14.)*.58);
  sky+=${glColor('#efd8a6')}*pow(face,48.)*(.12*daylight.x+.24*daylight.y)*(1.-daylight.z);
  gl_FragColor=vec4(sky,1.);
  #include <colorspace_fragment>
}`;
const cirrusFragment=`
uniform sampler2D fibers;
uniform vec2 wisps;
uniform vec3 sunDir;
uniform vec4 daylight;
varying vec3 sight;
void main(){
  vec3 ray=normalize(sight);
  if(ray.y<=.025)discard;
  vec2 plane=ray.xz/(ray.y+.055);
  vec2 uv=vec2(plane.x*.88+plane.y*.47,plane.y*.88-plane.x*.47)*.122+wisps;
  float fiber=texture2D(fibers,uv).r;
  float arc=smoothstep(.03,.24,ray.y);
  float alpha=fiber*arc*(.12+.22*daylight.x+.23*daylight.y)*(1.-.42*daylight.z);
  vec3 tint=mix(${glColor('#73819c')},${glColor('#deedf1')},daylight.x);
  tint=mix(tint,${glColor('#ffc1aa')},daylight.y*(.50+.42*max(0.,dot(ray,sunDir))));
  gl_FragColor=vec4(tint,alpha);
  #include <colorspace_fragment>
}`;
const cloudVertex=`
attribute vec4 cloudPlace;
attribute vec4 cloudArt;
attribute float tier;
uniform vec3 sunDir;
uniform vec4 daylight;
uniform vec3 front;
uniform vec2 parallax;
uniform float drift;
varying vec2 panel,atlasTile;
varying vec3 localSun;
varying float west,fade,storm,fogMix,cut;
void main(){
  storm=step(2.5,tier);
  float angle=cloudPlace.x+drift*cloudArt.w;
  float range=cloudPlace.y,base=cloudPlace.z,w=cloudPlace.w,h=cloudArt.x;
  fade=1.-smoothstep(.30+.63*daylight.z,.48+.65*daylight.z,cloudArt.z);
  if(storm>.5){
    angle=front.z;range=mix(223.,64.,front.y);
    base=19.;w=81.;h=25.;
    fade=front.x;
  }
  vec2 compass=vec2(sin(angle),-cos(angle));
  vec2 centerXZ=compass*range+parallax*(1.-storm)*(.55+.18*tier);
  vec3 center=vec3(centerXZ.x,base+h*.50,centerXZ.y);
  float cardHeight=h;
  cut=0.;
  if(storm>.5){
    cardHeight=h+base+3.;
    center.y=(h+base-3.)*.5;
    cut=(base+3.)/cardHeight;
  }
  vec3 n=normalize(center),right=normalize(vec3(-n.z,0.,n.x)),up=cross(right,n);
  vec3 dir=normalize(center+right*(uv.x-.5)*w+up*(uv.y-.5)*cardHeight);
  localSun=vec3(dot(sunDir,right),dot(sunDir,up),-dot(sunDir,n));
  west=max(0.,dot(sunDir,n));
  fogMix=mix(.27,.055,smoothstep(.10,.5,n.y));
  panel=uv;
  float variant=cloudArt.y;
  atlasTile=vec2(mod(variant,4.),1.-floor(variant/4.));
  gl_Position=projectionMatrix*modelViewMatrix*vec4(dir*172.,1.);
  gl_Position.z=gl_Position.w*.999996;
}`;
const cloudFragment=`
uniform sampler2D paint,fibers;
uniform vec4 daylight;
uniform vec3 horizon;
uniform float fall;
varying vec2 panel,atlasTile;
varying vec3 localSun;
varying float west,fade,storm,fogMix,cut;
void main(){
  if(fade<.008)discard;
  vec2 q=vec2(panel.x,(panel.y-cut)/max(.01,1.-cut));
  vec4 data=vec4(0.);
  float brightEdge=0.;
  if(q.y>=0.&&q.y<=1.){
    vec2 uv=(atlasTile+clamp(q,vec2(.0032,.0064),vec2(.9968,.9936)))*vec2(.25,.5);
    data=texture2D(paint,uv);
    vec2 key=normalize(vec2(localSun.x,localSun.y+.40)+vec2(.001,.002));
    vec2 neighbor=clamp(q+key*vec2(.021,.040)+vec2(0.,.018),vec2(.0032,.0064),vec2(.9968,.9936));
    brightEdge=max(0.,data.a-texture2D(paint,(atlasTile+neighbor)*vec2(.25,.5)).a);
  }
  vec2 xy=data.rg*2.-1.;
  vec3 normal=vec3(xy,sqrt(max(0.,1.-dot(xy,xy))));
  float side=max(0.,dot(normal,normalize(localSun+vec3(0.,.47,.1))));
  float cap=smoothstep(.32,.85,q.y)*(.60+.40*max(normal.y,0.));
  float diffuse=clamp(.29*data.b+.28*(normal.y*.5+.5)+.45*side+.52*cap,0.,1.);
  // Quiet, broad bands retain the read of the pixel landscape at a distance.
  float broad=floor(diffuse*9.)/9.;
  diffuse=mix(diffuse,broad,.43);
  float dusk=daylight.y*(.74+.26*west), over=daylight.z;
  vec3 shade=mix(${glColor('#9eafcb')},${glColor('#755e84')},dusk);
  vec3 middle=mix(${glColor('#d9e4e8')},${glColor('#d69392')},dusk);
  vec3 rim=mix(${glColor('#fff4d9')},${glColor('#ffd297')},dusk);
  shade=mix(shade,${glColor('#768496')},over*.48);
  middle=mix(middle,${glColor('#9cacc0')},over*.38);
  vec3 cloud=mix(shade,middle,smoothstep(.15,.65,diffuse));
  float lining=max(smoothstep(.64,.94,diffuse)*(.70+.25*west),brightEdge*(.42+.54*west)*(.48+.52*dusk));
  cloud=mix(cloud,rim,lining*(1.-.46*over));
  cloud=mix(cloud,${glColor('#53627c')},storm*(.30+.19*(1.-diffuse)));
  vec3 afterDark=mix(${glColor('#25304b')},${glColor('#68738b')},diffuse*.74);
  cloud=mix(afterDark,cloud,clamp(daylight.x+.70*dusk,0.,1.));
  cloud=mix(cloud,horizon,fogMix+.11*over);
  float a=data.a*fade;
  float curtain=0.;
  if(storm>.5&&q.y<.27){
    float y=panel.y/max(cut,.001);
    float sx=panel.x+(1.-clamp(y,0.,1.))*.095;
    float edges=smoothstep(.10,.34,sx)*(1.-smoothstep(.66,.93,sx));
    float fibersA=texture2D(fibers,vec2(panel.y*.28+fall,sx*1.9)).r;
    float fringe=texture2D(fibers,vec2(fall*.13+panel.y*.07,sx*3.4)).r;
    float columns=.84+.10*sin(sx*22.+panel.y*2.)+.10*fringe;
    curtain=fade*edges*columns*(.56+.22*fibersA)*smoothstep(.02,.31+.16*fringe,y)*(1.-smoothstep(.10,.25,q.y));
  }
  if(a+curtain<.008)discard;
  vec3 water=mix(horizon,${glColor('#647591')},.73);
  water=mix(water,${glColor('#7b6d85')},dusk*.53);
  float total=a+curtain*(1.-a);
  gl_FragColor=vec4((cloud*a+water*curtain*(1.-a))/max(total,.001),total);
  #include <colorspace_fragment>
}`;

const wet=kind=>kind==='rain'||kind==='storm';
export function rainFront(a,climate=a.lastClimate){
  const slot=Math.floor(a.age/220),time=a.age-slot*220;
  const bearing=-.8+(a.noise.random(0,0,1511)-.5)*1.8;
  const actual=a.blend[1];
  if(a.weather!=='auto'){
    const active=wet(a.weather);
    return {strength:active?.68+.32*actual:actual*.6,approach:.12+.86*actual,bearing};
  }
  const current=automaticWeather(a.noise,slot,climate);
  if(wet(current)){
    const continuing=slot>0&&wet(automaticWeather(a.noise,slot-1,climate));
    return {strength:.94,approach:continuing?.96:.48+.48*smooth(0,30,time),bearing};
  }
  if(time>158&&wet(automaticWeather(a.noise,slot+1,climate))){
    const lead=smooth(158,220,time);
    return {strength:lead*.94,approach:lead*.48,bearing};
  }
  return {strength:actual*.85,approach:.96,bearing};
}

const common={side:THREE.BackSide,depthWrite:false,toneMapped:false};
function imageMap(name,repeat){
  // Simulation tests and offline world generation do not have a DOM or GPU.
  if(typeof document==='undefined')return new THREE.Texture();
  const texture=new THREE.TextureLoader().load(new URL('./assets/'+name,import.meta.url).href);
  texture.colorSpace=THREE.NoColorSpace;texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.magFilter=THREE.LinearFilter;
  if(repeat)texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  return texture;
}
export function createValleySky(){
  const paint=imageMap('valley-cumulus.png',false),fibers=imageMap('valley-cirrus.png',true);
  const uniforms={
    top:{value:new THREE.Color()},horizon:{value:new THREE.Color()},sunDir:{value:new THREE.Vector3(0,1,0)},
    daylight:{value:new THREE.Vector4(1,0,.12,0)},wisps:{value:new THREE.Vector2()},
    parallax:{value:new THREE.Vector2()},drift:{value:0},fall:{value:0},front:{value:new THREE.Vector3()},
    paint:{value:paint},fibers:{value:fibers}
  };
  const sphere=new THREE.SphereGeometry(187,32,18);
  const dome=new THREE.Mesh(sphere,new THREE.ShaderMaterial({...common,uniforms,vertexShader:domeVertex,fragmentShader:skyFragment}));dome.renderOrder=-20;
  const clouds=new THREE.Group();
  const veil=new THREE.Mesh(sphere,new THREE.ShaderMaterial({...common,transparent:true,uniforms,vertexShader:domeVertex,fragmentShader:cirrusFragment}));
  veil.renderOrder=-12;clouds.add(veil);
  const quad=new THREE.PlaneGeometry(1,1),geometry=new THREE.InstancedBufferGeometry();
  geometry.index=quad.index;geometry.setAttribute('position',quad.attributes.position);geometry.setAttribute('uv',quad.attributes.uv);
  const counts=[18,12,7,1],count=counts.reduce((a,b)=>a+b);
  const place=new THREE.InstancedBufferAttribute(new Float32Array(count*4),4);
  const art=new THREE.InstancedBufferAttribute(new Float32Array(count*4),4);
  const tier=new THREE.InstancedBufferAttribute(new Float32Array(count),1);
  geometry.setAttribute('cloudPlace',place);geometry.setAttribute('cloudArt',art);geometry.setAttribute('tier',tier);geometry.instanceCount=count;
  const banks=new THREE.Mesh(geometry,new THREE.ShaderMaterial({uniforms,vertexShader:cloudVertex,fragmentShader:cloudFragment,transparent:true,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));
  banks.material.forceSinglePass=true;banks.frustumCulled=false;banks.renderOrder=-11;clouds.add(banks);
  let offset=0;
  function seed(key){
    const noise=new Noise(key+' cloud paintings');
    offset=noise.random(0,0,601);
    let i=0;
    for(let row=0;row<counts.length;row++)for(let k=0;k<counts[row];k++,i++){
      const r=n=>noise.random(k,row,613+n*3);
      const angle=(k+.65*(r(0)-.5)+row*.43)*TAU/counts[row];
      const radius=[156,112,64,180][row]*(.91+.18*r(1));
      const low=[.031,.15,.59,0][row],span=[.11,.22,.92,.1][row];
      const base=radius*(low+span*r(2));
      const w=radius*([.25,.30,.42,.7][row]+r(3)*[.21,.30,.55,.25][row]);
      const h=w*([.20,.32,.22,.30][row]+[.25,.37,.31,.2][row]*r(4));
      const rank=k%4===1&&row<2?.06:r(5);
      place.setXYZW(i,angle,radius,base,w);
      art.setXYZW(i,h,Math.floor(r(6)*8),rank,[.38,.69,1.,0][row]);tier.setX(i,row);
    }
    place.needsUpdate=art.needsUpdate=tier.needsUpdate=true;
  }
  function update(t,s,sunDirection,position,front){
    const u=uniforms,day=s.daylight;
    const dusk=(1-smooth(.07,.43,Math.abs(s.elevation)))*smooth(-.29,-.08,s.elevation);
    const over=s.cloud*(.20+.8*day);
    u.top.value.copy(colors.nightTop).lerp(colors.dayTop,day).lerp(colors.duskTop,dusk*.88).lerp(colors.overTop,over*.52);
    u.horizon.value.copy(colors.nightRim).lerp(colors.dayRim,day).lerp(colors.duskRim,dusk*.93).lerp(colors.overRim,over*.57);
    u.top.value.addScalar(s.flash);u.horizon.value.addScalar(s.flash);
    u.sunDir.value.copy(sunDirection);u.daylight.value.set(day,dusk,s.cloud,s.night);
    u.drift.value=t*.00065;
    u.wisps.value.set(offset+t*.00017+position.x*.00006,.71*offset+t*.000045+position.z*.00006);
    u.parallax.value.set(Math.sin(position.x*.0014)*9,Math.sin(position.z*.0014)*9);
    u.front.value.set(front?.strength||0,front?.approach||0,front?.bearing||0);u.fall.value=t*.011;
  }
  seed('Resonant Valley');
  return {dome,clouds,seed,update,dispose(){
    dome.material.dispose();veil.material.dispose();banks.material.dispose();sphere.dispose();geometry.dispose();quad.dispose();paint.dispose();fibers.dispose();
  }};
}
