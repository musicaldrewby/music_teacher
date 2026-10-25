import {applyCinematicSet} from './cinematic-presets';
import {demoScene,makeObject,sceneSchema,type Obj,type Vec,type CameraPose} from './scene';
import {makeEffect} from './effects';
import {routeSchema,followSchema,soundCueSchema} from './directing';
import {makeShot} from './sequence';
/** A lit winter pavilion with a small fire, orbiting stardust and a fireworks finale. */
export function particleGardenScene(){
 const s=applyCinematicSet(demoScene(),'christmas-pavilion');s.name='Emberlight · Winter Particle Garden';s.duration=30;s.fps=60;s.objects=[];s.particles='none';s.background='electric';s.ground={height:-2.7,finish:'satin'};s.lightingSettings={...s.lightingSettings,bloom:.38,ambient:.75,environment:1.15,keyColor:'#ffbc64',fillColor:'#168dff',rimColor:'#953cff',keyPower:1.25,fillPower:.75,rimPower:1.1};s.exposure=1;
 const prop=(id:string,kind:Obj['prop'],p:Vec,scale:Vec,material:string)=>{const o=makeObject('prop',kind);Object.assign(o,{id,name:id.replaceAll('-',' '),position:p,scale,material,sideMaterial:material,bevelMaterial:material,backMaterial:material});s.objects.push(o);return o;};
 const title=makeObject();Object.assign(title,{id:'emberlight-title',name:'Emberlight title',text:'EMBERLIGHT',font:'bebasneue',size:1.15,depth:.25,bevel:.035,position:[-.5,1.1,1.3],material:'electric-blue',sideMaterial:'gunmetal',bevelMaterial:'champagne',backMaterial:'gunmetal'});s.objects.push(title);
 const sub=makeObject();Object.assign(sub,{id:'garden-credit',name:'Winter particle garden',text:"MR. DREW'S MUSIC ROOM",font:'bebasneue',size:.26,depth:.05,bevel:.008,position:[-.5,.1,1.35],material:'champagne'});s.objects.push(sub);
 prop('brazier-base','cylinder',[-4.3,-2.05,1.3],[.7,.48,.7],'gunmetal');
 const rim=prop('brazier-rim','torus',[-4.3,-1.65,1.3],[.65,.65,.28],'champagne');rim.rotation=[90,0,0];
 for(let i=0;i<3;i++){const log=prop('firewood-'+i,'cylinder',[-4.3,-1.62,1.3],[.13,.42,.13],'wood');log.rotation=[90,i*60,0];}
 prop('portal-plinth','cylinder',[5,-2.18,-1.5],[1.45,.35,1.45],'gunmetal');
 prop('portal-brass-frame','torus',[5,.3,-1.5],[2.4,2.4,.3],'champagne');
 const star=prop('stardust-comet','star',[0,0,0],[.17,.17,.17],'mint-neon');star.motion='tumble';star.speed=1.5;
 s.paths=[routeSchema.parse({id:'stardust-orbit',name:'Stardust garden loop',points:[[-6,2,1],[-2,4,0],[4,3,-1],[6,1,1],[2,-.6,3],[-3,0,3]],closed:true,show:false})];star.follow=followSchema.parse({enabled:true,pathId:'stardust-orbit',duration:10,orient:false});
 const effect=(kind:Parameters<typeof makeEffect>[0],id:string,p:Vec)=>({...makeEffect(kind,id,30),position:p});
 s.effects=[
 {...effect('fire','brazier-flame',[-4.3,-1.55,1.3]),count:55,size:[.5,.12,.5],scale:.8},
 {...effect('embers','warm-embers',[-4.3,-1.4,1.3]),count:55,scale:.7,wind:[.16,0,-.08]},
 {...effect('smoke','brazier-smoke',[-4.3,-.85,1.3]),count:40,scale:.85,opacity:.25,wind:[.22,0,-.12],color:'#7b91b5'},
 {...effect('magic-trail','comet-tail',[0,0,0]),attachmentId:star.id,count:140,scale:.9,lifetime:2.6,interval:3,color:'#06e9ff'},
 {...effect('portal','violet-vortex',[5,.3,-1.2]),count:170,size:[4.3,4.3,.2],color:'#9e2bff'},
 {...effect('fireworks','ruby-fireworks',[-5,6,-7]),count:130,start:19,end:30,interval:5,color:'#ff1765'},
 {...effect('fireworks','gold-fireworks',[5,7,-9]),count:110,start:21,end:30,interval:5,seed:76,color:'#ffbe1a'},
 {...effect('snow','winter-flurries',[0,4,0]),count:100,size:[20,13,16],wind:[.3,0,.05],turbulence:.2,scale:.8}
 ];
 const pose=(position:Vec,target:Vec,fov=48):CameraPose=>({position,target,fov});const shot=(name:string,duration:number,start:CameraPose,end:CameraPose)=>({...makeShot(start,duration,name),move:true,end,transition:'dissolve' as const,transitionDuration:.7});
 s.camera={...s.camera,motion:'still',position:[1,2.6,19],target:[0,.7,0],fov:48,shotsEnabled:true,shots:[
 shot('Welcome to Emberlight',6,pose([1,2.6,19],[0,.7,0]),pose([-.7,2.1,17.5],[0,.7,0])),
 shot('Firelight and curling smoke',5,pose([-6.8,.5,6.3],[-4.1,-.5,1.3],50),pose([-5.6,.4,5.6],[-4.1,-.5,1.3],50)),
 shot('Through the stardust',5,pose([-6,2.8,10],[0,1.8,0],58),pose([-1,3.2,11],[1,1.5,0],58)),
 shot('The violet vortex',5,pose([7.6,1.6,7.5],[5,.3,-1.2],48),pose([5.8,1,7],[5,.3,-1.2],48)),
 shot('Fireworks over the winter garden',9,pose([.5,3.2,25],[0,2,-2],51),pose([-.5,3,23],[0,2,-2],51))]};
 s.explorer={...s.explorer,eyeHeight:1.2,speed:2,spawn:pose([0,-1.2,6],[0,.5,-1],65)};s.lens.enabled=false;
 s.audio={...s.audio,volume:.3,cues:[soundCueSchema.parse({id:'opening-chimes',kind:'chime',time:0,duration:3,volume:.25}),soundCueSchema.parse({id:'portal-whoosh',kind:'whoosh',time:16,duration:2,volume:.2})]};
 return sceneSchema.parse(s);
}
