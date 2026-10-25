import * as T from 'three';
import {buildManualLighting} from './manual-lights';
import type {Scene} from './scene';
import {lightingPresets} from './lighting-presets';
export function buildLighting(s:Scene){
 if(s.manualRig.mode==='custom'){const rig=buildManualLighting(s);updateLighting(rig,s,0);return rig;}
 const town=['miniature-town','toy-factory'].includes(s.set.id),worldScale=town?(s.set.id==='toy-factory'?3:4)*s.set.scale:1;
 const preset=lightingPresets.find(p=>p.id===s.lighting)||lightingPresets.find(p=>p.id==='cinematic')!,cfg=s.lightingSettings,group=new T.Group();
 group.add(new T.AmbientLight('#ffffff',preset.ambient*cfg.ambient*cfg.intensity));
 const powers=[cfg.keyPower,cfg.fillPower,cfg.rimPower],colors=[cfg.keyColor,cfg.fillColor,cfg.rimColor];
 preset.lights.forEach((spec,index)=>{
  const light=spec.kind==='spot'?new T.SpotLight(colors[index]||spec.color,spec.power*cfg.intensity*powers[index],60,spec.angle,spec.penumbra,2):new T.DirectionalLight(colors[index]||spec.color,spec.power*cfg.intensity*powers[index]);
  light.position.fromArray(spec.position).multiplyScalar(worldScale);if(town&&light instanceof T.SpotLight){light.distance=240;light.intensity*=worldScale*worldScale;}light.target.position.fromArray(spec.target||[0,0,0]);light.castShadow=!!spec.shadow&&s.shadows.mode!=='off';
  light.shadow.mapSize.set(s.shadows.quality,s.shadows.quality);light.shadow.radius=s.shadows.softness;light.shadow.blurSamples=12;light.shadow.intensity=s.shadows.strength;light.shadow.bias=-.00008;light.shadow.normalBias=.025;light.shadow.camera.near=.2;light.shadow.camera.far=town?240:60;
  if(light instanceof T.DirectionalLight)Object.assign(light.shadow.camera,{left:-15*worldScale,right:15*worldScale,top:12*worldScale,bottom:-12*worldScale});
  light.shadow.camera.updateProjectionMatrix();(light as T.Light & {radius?:number}).radius=(spec.radius??.3)*s.shadows.softness;
  light.userData={basePosition:[...spec.position],baseTarget:[...(spec.target||[0,0,0])],basePower:light.intensity,baseColor:light.color.clone(),index};group.add(light,light.target);
 });updateLighting(group,s,0);return group;
}
export function updateLighting(group:T.Group,s:Scene,time:number){
 const cfg=s.lightingSettings,phase=time/s.duration*Math.PI*2*cfg.speed;
 group.rotation.y=cfg.rotation*Math.PI/180+(cfg.motion==='orbit'?phase:cfg.motion==='sweep'?Math.sin(phase)*.55:0);group.position.y=cfg.height;
 for(const light of group.children){if(!(light instanceof T.DirectionalLight||light instanceof T.SpotLight||light instanceof T.PointLight))continue;const i=light.userData.index;light.color.copy(light.userData.baseColor);
  const power=cfg.motion==='pulse'?.65+.35*(.5+.5*Math.sin(phase)):cfg.motion==='chase'?.35+.65*(.5+.5*Math.sin(phase+i*2*Math.PI/3)):1;light.intensity=light.userData.basePower*power;
  if(light instanceof T.PointLight)continue;light.target.position.fromArray(light.userData.baseTarget);if(cfg.motion==='sweep'&&light instanceof T.SpotLight){light.target.position.x+=Math.sin(phase+i*1.7)*2;light.target.position.y+=Math.cos(phase+i)*.5;}
 }
}
export function disposeLighting(group:T.Group){group.traverse(o=>{if(o instanceof T.DirectionalLight||o instanceof T.SpotLight||o instanceof T.PointLight){o.shadow.dispose();if(o instanceof T.SpotLight)o.map?.dispose();}});group.clear();}
export function createLightingEnvironment(s:Scene){
 const preset=lightingPresets.find(p=>p.id===s.lighting)||lightingPresets.find(p=>p.id==='cinematic')!,cfg=s.lightingSettings,w=256,h=128,data=new Float32Array(w*h*4);
 const colors=[cfg.keyColor,cfg.fillColor,cfg.rimColor],powers=[cfg.keyPower,cfg.fillPower,cfg.rimPower];
 const sources=(s.manualRig.mode==='custom'?[]:preset.lights).map((spec,i)=>({direction:new T.Vector3(...spec.position).normalize(),color:new T.Color(colors[i]||spec.color),power:powers[i]*cfg.intensity*(spec.kind==='spot'?spec.power/65:spec.power)}));
 const profile=s.manualRig.mode==='preset'?preset.environmentProfile:undefined;
 // Rectangular softboxes and windows give metals readable, extended reflections.
 // The sky/room base provides broad indirect fill instead of isolated hot dots.
 const basis=sources.map(source=>{const right=new T.Vector3().crossVectors(source.direction,new T.Vector3(0,1,0)).normalize();return {right,up:new T.Vector3().crossVectors(right,source.direction).normalize()};});
 const dir=new T.Vector3();for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const theta=(x/w-.5)*Math.PI*2,phi=y/h*Math.PI;dir.set(Math.sin(phi)*Math.cos(theta),-Math.cos(phi),Math.sin(phi)*Math.sin(theta));const offset=(y*w+x)*4;
  data[offset]=data[offset+1]=data[offset+2]=s.manualRig.mode==='custom'?(s.manualRig.environment>0?.12:0):.018*cfg.ambient;data[offset+3]=1;
  if(profile){
   const sky=Math.max(0,dir.y),base=(profile==='sky'?.06+.3*sky:.025+.025*sky)*cfg.ambient*cfg.intensity;
   data[offset]+=base*(profile==='interior'?1.15:.9);data[offset+1]+=base;data[offset+2]+=base*(profile==='interior'?.75:1.1);
  }
  for(const [i,source] of sources.entries()){
   const forward=dir.dot(source.direction);let shape=0;
   if(profile&&forward>0){
    const width=profile==='strip'?.13:profile==='window'?.42:.65,height=profile==='strip'?1.05:profile==='window'?.8:.45;
    const u=dir.dot(basis[i].right)/forward,v=dir.dot(basis[i].up)/forward;
    shape=profile==='sky'?Math.pow(Math.max(0,forward),3):Math.exp(-Math.pow(u/width,8)-Math.pow(v/height,8));
   }else if(!profile)shape=Math.pow(Math.max(0,forward),s.lighting==='studio'?18:45);
   const energy=shape*source.power*(profile?2.2:5);data[offset]+=source.color.r*energy;data[offset+1]+=source.color.g*energy;data[offset+2]+=source.color.b*energy;
  }
 }
 const texture=new T.DataTexture(data,w,h,T.RGBAFormat,T.FloatType);texture.mapping=T.EquirectangularReflectionMapping;texture.colorSpace=T.LinearSRGBColorSpace;texture.needsUpdate=true;return texture;
}
