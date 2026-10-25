import * as T from 'three';
import {effectSchema,type Effect} from './directing';
export const effectCatalog=[
 {id:'smoke',name:'Chimney smoke',color:'#b4bed0',description:'Soft plumes that curl, expand and fade.',family:'Atmosphere'},
 {id:'fire',name:'Living flame',color:'#ff580a',description:'Layered golden flames with a flickering core.',family:'Fire & sparks'},
 {id:'embers',name:'Drifting embers',color:'#ff9a15',description:'Hot flecks rising in turbulent air.',family:'Fire & sparks'},
 {id:'magic-trail',name:'Magic trail',color:'#10dcff',description:'Luminous stardust left behind a moving emitter.',family:'Magic'},
 {id:'fireworks',name:'Firework burst',color:'#ff187c',description:'Spherical bursts with falling, fading sparks.',family:'Celebration'},
 {id:'portal',name:'Swirling portal',color:'#8b36ff',description:'A spiraling ring of light and stardust.',family:'Magic'},
 {id:'snow',name:'Snowfall',color:'#eff8ff',description:'Soft flakes drifting through a volume.',family:'Atmosphere'},
 {id:'leaves',name:'Autumn leaves',color:'#ef790a',description:'Curled leaves tumbling in the breeze.',family:'Atmosphere'},
 {id:'sparks',name:'Golden sparks',color:'#ff9b20',description:'Rising sparks with a gentle outward spread.',family:'Fire & sparks'},
 {id:'fireflies',name:'Fireflies',color:'#b6ff42',description:'Glowing points wandering and pulsing.',family:'Magic'},
 {id:'bubbles',name:'Bubbles',color:'#94dcff',description:'Translucent bubbles floating upward.',family:'Atmosphere'},
 {id:'confetti',name:'Confetti',color:'#ff296b',description:'Vivid ribbons falling and turning.',family:'Celebration'}
] as const;
export const advancedEffect=(kind:Effect['kind'])=>['smoke','fire','embers','magic-trail','fireworks','portal'].includes(kind);
const presets:Partial<Record<Effect['kind'],Partial<Effect>>>={
 smoke:{emitter:'point',size:[.6,.4,.6],count:55,scale:1.1,lifetime:7,interval:7,velocity:[0,.65,0],spread:.17,wind:[.12,0,0],turbulence:.3,opacity:.34,glow:0},
 fire:{emitter:'volume',position:[0,0,0],size:[.65,.12,.65],count:65,scale:1.1,lifetime:1.3,velocity:[0,1.1,0],spread:.15,turbulence:.18,opacity:.72,glow:2.5},
 embers:{emitter:'point',position:[0,.4,0],size:[.4,.2,.4],count:70,scale:.8,lifetime:3,velocity:[0,1.5,0],spread:.7,turbulence:.35,gravity:.2,glow:3},
 'magic-trail':{emitter:'point',size:[.15,.15,.15],count:150,scale:.8,lifetime:1.8,velocity:[0,0,0],spread:.1,turbulence:.1,glow:3,prewarm:false},
 fireworks:{emitter:'point',position:[0,4,0],size:[.1,.1,.1],count:180,scale:1.1,lifetime:2.8,interval:4,emission:'burst',repeat:true,prewarm:false,velocity:[0,.6,0],spread:2.4,gravity:1.1,glow:3},
 portal:{emitter:'ring',position:[0,2,0],size:[4,4,.2],count:200,scale:.9,lifetime:3,velocity:[0,0,0],spread:.1,turbulence:.1,glow:3}
};
export function makeEffect(kind:Effect['kind'],id:string,end=120):Effect{const info=effectCatalog.find(e=>e.id===kind)!;return effectSchema.parse({id,kind,name:info.name,color:info.color,end,...presets[kind]});}
const fract=(n:number)=>n-Math.floor(n),clamp=(n:number)=>Math.max(0,Math.min(1,n));
const rand=(i:number,seed:number,salt:number)=>fract(Math.sin(i*127.1+seed*71.7+salt*311.7)*43758.5453);
export type ParticlePose={position:[number,number,number];rotation:[number,number,number];glow:number;scale:number;opacity:number;alive:boolean;birthTime:number};
/** All particle ages and births come from absolute time, never accumulated frame deltas. */
export function particleClock(e:Effect,index:number,time:number){
 const t=(time-e.start)*e.speed,life=e.lifetime;
 let birth:number,age:number;
 if(e.emission==='burst'){birth=e.repeat?Math.floor(Math.max(0,t)/Math.max(e.interval,life))*Math.max(e.interval,life):0;age=t-birth;}
 else {const phase=(index+rand(index,e.seed,11)*.8)/e.count*life;birth=Math.floor((t-phase)/life)*life+phase;age=t-birth;}
 return {age,u:clamp(age/life),birthTime:e.start+birth/e.speed,alive:t>=0&&age>=0&&age<life&&(e.emission==='burst'||e.prewarm||birth>=-1e-8)};
}
export function effectPose(effect:Effect,index:number,time:number):ParticlePose{
 const r=(salt:number)=>rand(index,effect.seed,salt),t=Math.max(0,time-effect.start)*effect.speed;
 if(!advancedEffect(effect.kind)){
  const u=fract(r(1)+t*(.04+r(2)*.03));let x=(r(3)-.5)*effect.size[0],y=(.5-u)*effect.size[1],z=(r(4)-.5)*effect.size[2];
  if(effect.kind==='bubbles'||effect.kind==='sparks')y=(u-.5)*effect.size[1];
  x+=Math.sin(t*.5+r(5)*6)*effect.size[0]*.06;z+=Math.cos(t*.35+r(6)*6)*effect.size[2]*.05;
  if(effect.kind==='sparks'){x*=u;z*=u;}if(effect.kind==='fireflies')y=Math.sin(t*.6+r(1)*8)*effect.size[1]*.42;
  // Wrap the volume after wind displacement so a long snowfall never runs out of flakes.
  const values=[x,y,z].map((v,j)=>effect.wind[j]===0?v:((v+effect.wind[j]*t+effect.size[j]/2)%effect.size[j]+effect.size[j])%effect.size[j]-effect.size[j]/2);
  values[0]+=effect.turbulence*.3*Math.sin(t*1.3+r(6)*6);values[2]+=effect.turbulence*.3*Math.cos(t*1.1+r(5)*6);
  const rotation:[number,number,number]=effect.kind==='leaves'||effect.kind==='confetti'?[t*(.4+r(7)),t*.6+r(8)*6,t*.3+r(9)*6]:[0,0,0];
  return {position:values.map((v,j)=>v+effect.position[j]) as [number,number,number],rotation,glow:effect.kind==='fireflies'?.6+.5*Math.sin(t*1.8+r(1)*9):1,scale:1,opacity:effect.opacity,alive:true,birthTime:time};
 }
 const clock=particleClock(effect,index,time),{age,u}=clock;
 const angle=r(3)*Math.PI*2,yDir=r(4)*2-1,side=Math.sqrt(1-yDir*yDir),direction=[Math.cos(angle)*side,yDir,Math.sin(angle)*side];
 let x=0,y=0,z=0;
 if(effect.emitter==='volume'){x=(r(3)-.5)*effect.size[0];y=(r(4)-.5)*effect.size[1];z=(r(5)-.5)*effect.size[2];}
 if(effect.emitter==='ring'){x=Math.cos(angle)*effect.size[0]/2;y=Math.sin(angle)*effect.size[1]/2;z=(r(5)-.5)*effect.size[2];}
 const radial=effect.kind==='fireworks'?(.55+r(6)*.45):1;
 x+=(effect.velocity[0]+direction[0]*effect.spread*radial)*age;
 y+=(effect.velocity[1]+direction[1]*effect.spread*radial)*age;
 z+=(effect.velocity[2]+direction[2]*effect.spread*radial)*age;
 let scale=1,fade=Math.sin(Math.PI*u)**.65,glow=1;
 if(effect.kind==='smoke'){scale=.4+u*2.7;fade=Math.sin(Math.PI*u)**1.4;}
 if(effect.kind==='fire'){scale=(.55+Math.sin(Math.PI*u)*.65)*(1-u*.6);glow=.8+.2*Math.sin(t*11+r(7)*8);}
 if(effect.kind==='embers'){scale=(1-u*.65);glow=.7+.3*Math.sin(t*7+r(8)*9);}
 if(effect.kind==='magic-trail'){scale=.35+(1-u)*.9;fade=(1-u)**1.6*clamp(u*20);}
 if(effect.kind==='fireworks'){scale=.45+(1-u)*.8;fade=clamp(age*14)*(1-u)**.7;glow=1.1+.3*Math.sin(t*18+r(8)*9);}
 if(effect.kind==='portal'){
  const a=angle+t*1.5+u*Math.PI*1.4,ring=.83+.17*Math.sin(Math.PI*u);
  x=Math.cos(a)*effect.size[0]/2*ring;y=Math.sin(a)*effect.size[1]/2*ring;z=Math.sin(a*3+t)*effect.size[2]+(r(5)-.5)*effect.spread;
  scale=.45+.65*Math.sin(Math.PI*u);fade=.45+.55*Math.sin(Math.PI*u);
 }
 const flutter=effect.turbulence*Math.sin(Math.PI*u);
 x+=flutter*Math.sin(age*1.7+r(7)*6);y+=flutter*.35*Math.cos(age*1.5+r(8)*6);z+=flutter*Math.sin(age*1.3+r(9)*6);
 // Local emitter coordinates. Global forces are applied after the birth transform in updateEffects.
 return {position:[x+effect.position[0],y+effect.position[1],z+effect.position[2]],rotation:[r(7)*6+t*.1,r(8)*6+t*.13,r(9)*6+t*.16],glow,scale,opacity:fade*effect.opacity,alive:clock.alive,birthTime:clock.birthTime};
}
/** A soft RGBA cloud texture on crossed planes: stereo-safe, exportable mesh particles. */
export function cloudTexture(flame=false){
 const n=64,bytes=new Uint8Array(n*n*4),noise=(x:number,y:number)=>{const ix=Math.floor(x),iy=Math.floor(y),u=fract(x),v=fract(y),a=u*u*(3-2*u),b=v*v*(3-2*v);const h=(x:number,y:number)=>fract(Math.sin(x*127.1+y*311.7)*43758.5453);return (h(ix,iy)*(1-a)+h(ix+1,iy)*a)*(1-b)+(h(ix,iy+1)*(1-a)+h(ix+1,iy+1)*a)*b;};
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const dx=(x+.5)/n*2-1,dy=(y+.5)/n*2-1,r=Math.sqrt(dx*dx+dy*dy),cloud=noise(x/13,y/13)*.55+noise(x/6,y/6)*.3+noise(x/3,y/3)*.15,alpha=Math.max(0,1-r)**1.3*(flame?.9:clamp((cloud-.15)*1.8));const i=(y*n+x)*4;bytes[i]=255;bytes[i+1]=flame?Math.round(170+85*(1-r)):255;bytes[i+2]=flame?Math.round(30+190*Math.max(0,1-r*2)):255;bytes[i+3]=Math.round(clamp(alpha)*255);}
 const tex=new T.DataTexture(bytes,n,n,T.RGBAFormat);tex.colorSpace=T.SRGBColorSpace;tex.magFilter=T.LinearFilter;tex.minFilter=T.LinearFilter;tex.needsUpdate=true;return tex;
}
function plumeGeometry(){const position:number[]=[],uv:number[]=[],normal:number[]=[];for(let axis=0;axis<3;axis++){const plane=new T.PlaneGeometry(1,1).toNonIndexed();if(axis===1)plane.rotateY(Math.PI/2);if(axis===2)plane.rotateX(Math.PI/2);position.push(...plane.getAttribute('position').array);normal.push(...plane.getAttribute('normal').array);uv.push(...plane.getAttribute('uv').array);plane.dispose();}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(position,3));g.setAttribute('normal',new T.Float32BufferAttribute(normal,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));return g;}
export function buildEffects(effects:Effect[]){const root=new T.Group();root.name='3D effects';root.userData.particleSystem=true;for(const effect of effects){
 const group=new T.Group();group.name=effect.name||effect.kind;group.userData.effectId=effect.id;root.add(group);const colored=effect.kind==='confetti'||effect.kind==='leaves',soft=effect.kind==='smoke'||effect.kind==='fire',advanced=advancedEffect(effect.kind),luminous=['sparks','fireflies','fire','embers','magic-trail','fireworks','portal'].includes(effect.kind);
 const base=new T.MeshPhysicalMaterial({color:effect.color,roughness:effect.kind==='bubbles'?.04:.8,metalness:0,side:T.DoubleSide,emissive:effect.color,emissiveIntensity:luminous?2*effect.glow:0});
 if(soft){base.map=cloudTexture(effect.kind==='fire');if(effect.kind==='fire')base.emissiveMap=base.map;base.transparent=true;base.opacity=effect.opacity;base.depthWrite=false;base.forceSinglePass=true;}
 if(advanced||effect.opacity<1){base.transparent=true;base.depthWrite=false;}
 if(effect.kind==='bubbles'){base.transmission=.8;base.ior=1.08;base.thickness=.005;base.iridescence=1;base.transparent=true;base.opacity=.45*effect.opacity;base.depthWrite=false;}
 const materials=colored?[0,.07,-.08,.35].map(offset=>{const m=base.clone();m.color.offsetHSL(offset,.05,0);return m;}):[base];if(colored)base.dispose();
 let geometry:T.BufferGeometry;
 if(soft)geometry=plumeGeometry();
 else if(effect.kind==='leaves'){const shape=new T.Shape();shape.moveTo(0,-.15);shape.bezierCurveTo(-.16,-.05,-.16,.1,0,.2);shape.bezierCurveTo(.14,.1,.14,-.05,0,-.15);geometry=new T.ExtrudeGeometry(shape,{depth:.018,bevelEnabled:true,bevelSize:.01,bevelThickness:.008,bevelSegments:1,steps:1,curveSegments:5});}
 else if(effect.kind==='confetti')geometry=new T.BoxGeometry(.12,.22,.012);
 else geometry=new T.SphereGeometry(effect.kind==='bubbles'?.15:effect.kind==='sparks'?.025:.035,effect.kind==='bubbles'?12:6,effect.kind==='bubbles'?8:4);
 for(let i=0;i<effect.count;i++){const material=advanced?base.clone():materials[i%materials.length];if(advanced){const hue=effect.kind==='fireworks'?.12:effect.kind==='portal'?.06:.025;material.color.offsetHSL((rand(i,effect.seed,22)-.5)*hue,0,0);material.emissive.copy(material.color);}const mesh=new T.Mesh(geometry,material);mesh.name=group.name+' '+(i+1);mesh.userData.effectIndex=i;mesh.userData.baseParticleScale=effect.scale*(.6+rand(i,effect.seed,10)*.8);mesh.scale.setScalar(mesh.userData.baseParticleScale);mesh.castShadow=false;group.add(mesh);}
 if(advanced)base.dispose();
 }updateEffects(root,effects,0);return root;}
export type EmitterTransform=(effect:Effect,time:number)=>T.Matrix4;
export function updateEffects(root:T.Group,effects:Effect[],time:number,emitter?:EmitterTransform){for(const group of root.children){
 const effect=effects.find(e=>e.id===group.userData.effectId);group.visible=!!effect?.enabled&&time>=effect.start&&time<effect.end;if(!effect)continue;
 const rotation=new T.Quaternion().setFromEuler(new T.Euler(...effect.rotation.map(v=>v*Math.PI/180) as [number,number,number]));
 for(const child of group.children){const p=effectPose(effect,child.userData.effectIndex,time),advanced=advancedEffect(effect.kind),age=Math.max(0,(time-p.birthTime)*effect.speed),matrix=emitter?.(effect,advanced&&effect.kind!=='portal'?Math.max(0,p.birthTime):time);
  const local=new T.Vector3(...p.position).sub(new T.Vector3(...effect.position)).applyQuaternion(rotation).add(new T.Vector3(...effect.position));if(matrix)local.applyMatrix4(matrix);
  if(advanced){local.addScaledVector(new T.Vector3(...effect.wind),age);local.y-=effect.gravity*age*age/2;}
  child.position.copy(local);child.rotation.set(...p.rotation);child.scale.setScalar(child.userData.baseParticleScale*p.scale);if(effect.kind==='fire')child.scale.y*=1.9;child.visible=p.alive;
  const m=(child as T.Mesh).material as T.MeshPhysicalMaterial;if(advanced){m.opacity=p.opacity;m.emissiveIntensity=(effect.kind==='smoke'?0:2*effect.glow*p.glow);}else if(effect.kind==='fireflies')m.emissiveIntensity=(1.5+Math.sin(time*1.8)*.6)*effect.glow;else m.opacity=(effect.kind==='bubbles'?.45:1)*effect.opacity;
 }
}}
export function disposeEffects(root:T.Group){const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>();root.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{materials.add(m);const mat=m as T.MeshStandardMaterial;for(const tex of [mat.map,mat.emissiveMap])if(tex)textures.add(tex);});}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());root.clear();}
