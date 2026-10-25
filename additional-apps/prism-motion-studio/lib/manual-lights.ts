import * as T from 'three';
import {syncLightPattern} from './light-patterns';
import type {Scene} from './scene';
import {manualRigSchema,manualLightSchema,type ManualLight} from './manual-light-schema';
export function startDark(s:Scene):Scene{return {...s,manualRig:manualRigSchema.parse({mode:'custom'}),lightingSettings:{...s.lightingSettings,intensity:1,ambient:0,environment:0,motion:'still',rotation:0,height:0,bloom:0},background:'black',backgroundImage:'',weather:{...s.weather,enabled:false},exposure:1};}
export function addManualLight(s:Scene,kind:ManualLight['kind']):Scene{
 if(s.manualRig.lights.length>=8)throw Error('Use up to eight individual lights.');
 const light=manualLightSchema.parse({id:crypto.randomUUID(),name:`${kind==='spot'?'Spotlight':kind==='point'?'Point light':'Directional light'} ${s.manualRig.lights.length+1}`,kind,intensity:kind==='directional'?3:kind==='spot'?220:100,shadow:kind!=='point'});
 return {...s,manualRig:{...s.manualRig,mode:'custom',lights:[...s.manualRig.lights,light]}};
}
export function buildManualLighting(s:Scene){
 const group=new T.Group();group.add(new T.AmbientLight('#ffffff',s.manualRig.ambient));
 for(const [index,spec] of s.manualRig.lights.entries()){
  const intensity=spec.enabled?spec.intensity*s.lightingSettings.intensity:0;
  const light=spec.kind==='point'?new T.PointLight(spec.color,intensity,spec.distance,2):spec.kind==='spot'?new T.SpotLight(spec.color,intensity,spec.distance,spec.angle*Math.PI/180,spec.penumbra,2):new T.DirectionalLight(spec.color,intensity);
  light.name=spec.name;light.position.fromArray(spec.position);light.castShadow=spec.shadow&&s.shadows.mode!=='off';
  light.shadow.mapSize.set(Math.min(s.shadows.quality,spec.kind==='point'?1024:2048),Math.min(s.shadows.quality,spec.kind==='point'?1024:2048));light.shadow.camera.near=.1;light.shadow.camera.far=spec.distance||1000;light.shadow.bias=-.0001;light.shadow.normalBias=.02;light.shadow.radius=s.shadows.softness;light.shadow.intensity=s.shadows.strength;
  if(light instanceof T.DirectionalLight)Object.assign(light.shadow.camera,{left:-30,right:30,top:30,bottom:-30});light.shadow.camera.updateProjectionMatrix();
  light.userData={customLight:true,lightId:spec.id,index,basePower:intensity,baseColor:light.color.clone(),baseTarget:spec.target};
  if(light instanceof T.SpotLight)syncLightPattern(light,spec.pattern);
  (light as T.Light&{radius?:number}).radius=.3*s.shadows.softness;group.add(light);if(!(light instanceof T.PointLight)){light.target.position.fromArray(spec.target);group.add(light.target);}
 }
 return group;
}
/** Set-piece fixtures are outside the main rig; switch those off too for an empty stage. */
export function applyFixtureLighting(world:T.Object3D,rig:T.Object3D,s:Scene){
 const off=s.manualRig.mode==='custom'&&!s.manualRig.fixtures;
 if(!off&&!world.userData.prismFixturesMuted)return;
 let cache=world.userData.prismFixtureCache as {rig:T.Object3D;lights:T.Light[]}|undefined;
 if(!cache||cache.rig!==rig){const lights:T.Light[]=[];world.traverse(node=>{if(!(node instanceof T.Light))return;for(let p:T.Object3D|null=node;p;p=p.parent)if(p===rig)return;lights.push(node);});cache={rig,lights};world.userData.prismFixtureCache=cache;}
 for(const node of cache.lights){if(off){node.userData.prismFixturePower??=node.intensity;node.intensity=0;}else if(node.userData.prismFixturePower!==undefined){node.intensity=node.userData.prismFixturePower;delete node.userData.prismFixturePower;}}
 world.userData.prismFixturesMuted=off;
}
/** Update slider/position edits without reallocating lights or their shadow textures. */
export function syncManualLighting(group:T.Group,s:Scene){
 const ambient=group.children.find(n=>n instanceof T.AmbientLight) as T.AmbientLight|undefined;if(ambient)ambient.intensity=s.manualRig.ambient;
 for(const [index,spec] of s.manualRig.lights.entries()){
  const light=group.children.find(n=>n.userData.lightId===spec.id) as T.PointLight|T.SpotLight|T.DirectionalLight|undefined;if(!light)continue;
  light.name=spec.name;light.position.fromArray(spec.position);light.userData.basePower=spec.enabled?spec.intensity*s.lightingSettings.intensity:0;light.userData.baseColor.set(spec.color);light.userData.baseTarget=[...spec.target];light.userData.index=index;
  if(light instanceof T.PointLight||light instanceof T.SpotLight){light.distance=spec.distance;light.shadow.camera.far=spec.distance||1000;light.shadow.camera.updateProjectionMatrix();}
  if(light instanceof T.SpotLight){light.angle=spec.angle*Math.PI/180;light.penumbra=spec.penumbra;syncLightPattern(light,spec.pattern);}
  if(!(light instanceof T.PointLight))light.target.position.fromArray(spec.target);
 }
}

/** Keep approximate brightness when changing between punctual and directional units. */
export function changeLightKind(light:ManualLight,kind:ManualLight['kind']):Partial<ManualLight>{
 const defaults={directional:3,spot:220,point:100};
 return {kind,intensity:Math.min(20000,Math.round(light.intensity/defaults[light.kind]*defaults[kind]*10)/10)};
}
