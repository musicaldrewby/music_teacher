import {demoScene,makeObject,sceneSchema,type Vec} from './scene';
import {generatorPreset,terrainHeight} from './procedural-generators';
import {proceduralMaterialPresets} from './procedural-material';
import type {Generator} from './procedural-schema';

export function proceduralShowcaseScene(){
 const s=demoScene();s.name='The Luminous Isles · Procedural Studio';s.duration=24;s.fps=60;s.objects=[];s.floor=false;s.particles='none';s.background='electric';s.ground.height=-2.7;s.lighting='neon';s.exposure=.95;
 s.lightingSettings={...s.lightingSettings,bloom:.28,ambient:.8,environment:1.1,keyColor:'#48a9ff',fillColor:'#ff9c39',rimColor:'#933bff',keyPower:1.2,fillPower:.7,rimPower:1};
 const add=(kind:Generator['kind'],id:string,position:Vec,patch:Partial<Generator>={})=>{const o=makeObject('prop','procedural');o.id=id;o.name=id.replaceAll('-',' ');o.generator={...generatorPreset(kind),...patch};o.position=position;s.objects.push(o);return o;};
 const island=add('island','main-island',[0,-2.7,0],{width:24,depth:24,height:8,seed:512,detail:4,colorA:'#08785b',colorB:'#527d98',colorC:'#405f70'});
 add('water','sapphire-ocean',[0,-2.35,0],{width:100,depth:100,amplitude:.12,cycles:3,colorA:'#035183'});
 const ground=(x:number,z:number)=>terrainHeight(island.generator,x,z)-2.7;
 for(const [i,x,z,h] of [[0,-4,-3,4.2],[1,-7,1,3.1],[2,7,1,3.4],[3,4,-6,3.8],[4,-3,-7,3.2]])add('tree','island-tree-'+i,[x,ground(x,z),z],{height:h,width:3,depth:3,seed:41+i*43,detail:3,amplitude:.6,colorA:'#07634f',colorB:'#10a77b',colorC:'#543520'});
 add('crystals','violet-crystal-garden',[4,ground(4,-1)-.15,-1],{width:3,depth:3,height:3.8,count:9,seed:77,colorA:'#4221bb',colorB:'#00cce5',colorC:'#ec238d'});
 add('building','island-observatory',[-3,ground(-3,-2),-2],{width:2.7,depth:2.7,height:4,seed:87,colorA:'#173c5c',colorB:'#ffb13c',colorC:'#13cbe7'});
 const arch=makeObject('prop','torus');arch.id='island-arch';arch.name='Brushed gold portal';arch.position=[2,ground(2,1)+1.8,1];arch.scale=[1.7,1.7,.4];arch.material='champagne';arch.proceduralMaterial={...proceduralMaterialPresets.find(p=>p.id==='metal')!.settings,colorA:'#96601e',colorB:'#f6ca5f',colorC:'#4e2d0b',scale:2};s.objects.push(arch);
 add('aurora','emerald-aurora',[-4,12,-28],{width:65,height:16,depth:8,count:3,amplitude:1.2,cycles:1,colorA:'#00d992',colorB:'#7922ff',colorC:'#00c8ef'});
 add('clouds','distant-clouds',[0,10,-36],{width:70,height:3,depth:12,count:7,seed:21,amplitude:.5,colorA:'#203e78',colorB:'#43639b'});
 add('stars','night-stars',[0,8,-40],{width:130,height:55,depth:40,count:120,seed:101});
 add('sky','panoramic-midnight',[0,0,0],{width:160,depth:160,height:80,colorA:'#020725',colorB:'#122957',colorC:'#020b23'});
 const title=makeObject();title.id='luminous-title';title.name='Luminous title';title.text='LUMINOUS';title.font='bebasneue';title.size=1.5;title.depth=.22;title.bevel=.04;title.position=[0,4.7,7];title.rotation=[0,24,0];title.proceduralMaterial={...proceduralMaterialPresets.find(p=>p.id==='marble')!.settings,colorA:'#126aa3',colorB:'#a7f7ff',colorC:'#053672',scale:.6,roughness:.2};s.objects.push(title);
 const sub=makeObject();sub.id='isles-subtitle';sub.name='Procedural studio subtitle';sub.text='PROCEDURAL WORLDS';sub.font='bebasneue';sub.size=.38;sub.depth=.07;sub.position=[0,3.85,7];sub.rotation=[0,24,0];sub.material='champagne';s.objects.push(sub);
 s.camera={...s.camera,position:[22,12,31],target:[0,2,-3],fov:46,motion:'still',proceduralMotion:{...s.camera.proceduralMotion,enabled:true,kind:'figure-eight',amplitude:1.8,cycles:1}};
 s.explorer={...s.explorer,mode:'fly',speed:3,spawn:{position:[0,2,11],target:[0,3,0],fov:65}};
 return sceneSchema.parse(s);
}
