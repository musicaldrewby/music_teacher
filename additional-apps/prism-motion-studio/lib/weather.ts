import * as T from 'three';
import type {Scene} from './scene';
import {weatherKeySchema,type WeatherKey} from './playground-schema';
const wrap=(v:number,n:number)=>(v%n+n)%n;
export function sampleWeather(s:Scene,time:number):WeatherKey|null{
 const w=s.weather;if(!w.enabled||!w.keys.length)return null;const t=w.loop?wrap(time,s.duration):Math.max(0,Math.min(time,s.duration)),keys=w.keys;
 let a=keys[0],b=keys[0],f=0;
 if(t<keys[0].time&&w.loop){a=keys.at(-1)!;b=keys[0];f=(t+s.duration-a.time)/(s.duration+b.time-a.time);}
 else{a=[...keys].reverse().find(k=>k.time<=t)||keys[0];b=keys.find(k=>k.time>t)||a;if(b!==a)f=(t-a.time)/(b.time-a.time);else if(w.loop&&a.time<s.duration){b=keys[0];f=(t-a.time)/(s.duration+keys[0].time-a.time);}}
 f=Math.max(0,Math.min(1,f));f=f*f*(3-2*f);const out={...a,time:t};for(const k of ['daylight','clouds','fog','rain','snow','wind','lightning'] as const)out[k]=a[k]+(b[k]-a[k])*f;for(const k of ['sky','sun'] as const)out[k]='#'+new T.Color(a[k]).lerp(new T.Color(b[k]),f).getHexString();return out;
}
export function weatherFlash(s:Scene,t:number,w:WeatherKey){const clock=s.weather.loop?wrap(t,s.duration)/s.duration*7*Math.max(1,Math.round(s.duration/7)):t;const phase=wrap(clock+s.weather.seed*.13,7);return w.lightning*(phase<.08?2:phase>.18&&phase<.23?1.2:0);}
export function buildWeather(){const root=new T.Group();root.name='Weather timeline';root.userData.weather=true;const sphere=new T.SphereGeometry(1,10,7),flake=new T.IcosahedronGeometry(.06,0),drop=new T.CylinderGeometry(.012,.012,.65,4);
 for(let i=0;i<16;i++){const m=new T.Mesh(sphere,new T.MeshStandardMaterial({color:'#8194b5',roughness:1,transparent:true,opacity:0,depthWrite:false}));m.userData.kind='cloud';m.userData.index=i;m.scale.set(4+(i%3),1.2,2.8);root.add(m);}
 for(let i=0;i<8;i++){const m=new T.Mesh(sphere,new T.MeshBasicMaterial({color:'#9eb9cc',transparent:true,opacity:0,depthWrite:false}));m.userData.kind='fog';m.userData.index=i;m.scale.set(12,1.7,7);root.add(m);}
 for(const kind of ['snow','rain'])for(let i=0;i<240;i++){const m=new T.Mesh(kind==='snow'?flake:drop,new T.MeshStandardMaterial({color:kind==='snow'?'#ffffff':'#9ecfff',emissive:kind==='snow'?'#c2dcff':'#6596cb',emissiveIntensity:.3,transparent:true,opacity:0,depthWrite:false}));m.userData.kind=kind;m.userData.index=i;root.add(m);}return root;}
export function updateWeather(root:T.Group,s:Scene,time:number){const w=sampleWeather(s,time);root.visible=!!w;if(!w)return;const e=s.weather.extent,seed=s.weather.seed,loopTime=s.weather.loop?wrap(time,s.duration):time,phase=loopTime/s.duration*Math.PI*2;
 // Periodic paths also close at the loop boundary; intensity follows the weather cues.
 for(const child of root.children){const m=child as T.Mesh,kind=m.userData.kind as 'snow'|'rain'|'cloud'|'fog',i=m.userData.index,mat=m.material as T.MeshStandardMaterial;let opacity=0;const x=wrap(i*17.37+seed*3.1,e*2)-e,z=wrap(i*11.61+seed*.7,e*2)-e;
 if(kind==='snow'||kind==='rain'){const rate=kind==='snow'?2:14,cycles=Math.max(1,Math.round(s.duration*rate/20)),travel=s.weather.loop?loopTime/s.duration*20*cycles:loopTime*rate;opacity=w[kind]*Math.max(0,Math.min(1,(w[kind]*240-i)/12));m.position.set(x+Math.sin(phase+i)*w.wind*.5,s.ground.height+20-wrap(i*1.71+travel,20),z+Math.cos(phase+i)*.3);m.rotation.z=kind==='rain'?-w.wind*.025:phase+i;}
 else if(kind==='cloud'){opacity=w.clouds*.72;m.position.set(x+Math.sin(phase+i)*w.wind, s.ground.height+15+(i%3),z);mat.color.set(w.sun).lerp(new T.Color('#5b6b8c'),.65);}
 else{opacity=w.fog*.1;m.position.set(x+Math.sin(phase+i)*2,s.ground.height+1+(i%3)*1.2,z);}
 mat.opacity=opacity;m.visible=opacity>.001;}
}
