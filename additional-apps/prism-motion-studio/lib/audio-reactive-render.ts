import * as T from 'three';
import type {Obj,Scene} from './scene';
import type {AudioSignals} from './audio-reactive-schema';
export function buildEqualizer(o:Obj,material:T.Material){
 const group=new T.Group(),geo=new T.BoxGeometry(1,1,1);geo.translate(0,.5,0);
 const v=o.visualizer;
 for(let i=0;i<v.count;i++){const m=new T.Mesh(geo,material),angle=i/v.count*Math.PI*2,width=v.layout==='ring'?Math.min(.45,2*Math.PI*v.radius/v.count*.72):v.width/v.count*.72;
  if(v.layout==='ring'){m.position.set(Math.sin(angle)*v.radius,0,Math.cos(angle)*v.radius);m.rotation.y=angle;}else m.position.x=(i/(v.count-1)-.5)*v.width;
  m.scale.set(width,.06,width);m.castShadow=m.receiveShadow=true;m.userData.eqIndex=i;m.userData.eqCount=v.count;group.add(m);
 }return group;
}
// The engine restores authored transforms before applying these absolute-time signals.
export function applyAudioObject(group:T.Group,o:Obj,signals:AudioSignals){
 if(o.type==='prop'&&o.prop==='equalizer')group.traverse(node=>{if(node.userData.eqIndex!==undefined){const f=node.userData.eqIndex/(node.userData.eqCount-1)*(signals.spectrum.length-1),i=Math.floor(f),value=signals.spectrum[i]*(1-f+i)+(signals.spectrum[Math.min(i+1,signals.spectrum.length-1)]||0)*(f-i);node.scale.y=.06+o.visualizer.height*value;}});
 const r=o.audioReaction;if(!r.enabled||o.body.mode!=='off'||o.placement.enabled)return;const amount=signals[r.band]*r.strength;
 if(r.kind==='bounce')group.position.y+=amount*1.2;
 else if(r.kind==='pulse')group.scale.multiplyScalar(1+amount*.22);
 else if(r.kind==='sway'){group.rotation.z+=amount*.18;group.position.x+=amount*.35;}
}
export function applyAudioLights(lights:T.Group,scene:Scene,signals:AudioSignals){const cfg=scene.audio.reactivity.lights;if(!cfg.enabled||!scene.audio.reactivity.enabled)return;const amount=signals[cfg.band]*cfg.strength;lights.traverse(light=>{if(light instanceof T.PointLight||light instanceof T.SpotLight||light instanceof T.DirectionalLight)light.intensity*=1+amount*1.5;});}
