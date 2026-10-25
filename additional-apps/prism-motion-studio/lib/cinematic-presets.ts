import {aquariumScene} from './aquarium-scene';
import {toyFactoryScene} from './factory-scene';
import {demoScene,lightingSettingsSchema,makeObject,type Scene} from './scene';
import {finishPresets,type SetSettings} from './cinematic';
import {setCatalog} from './sets';
import {TRAIN_ROUTE_POINTS} from './train-town';
import {routeSchema,followSchema,rideSchema,effectSchema,soundCueSchema} from './directing';
import {makeShot} from './sequence';

export function applyCinematicSet(scene:Scene,id:SetSettings['id']):Scene{
 const preset=setCatalog.find(p=>p.id===id);if(!preset||id==='none')return {...scene,set:{...scene.set,id:'none'}};
 if(id==='aquarium'){const reef=aquariumScene(scene.duration);return {...scene,set:reef.set,ground:reef.ground,background:reef.background,backgroundImage:'',floor:false,manualRig:reef.manualRig,lightingSettings:reef.lightingSettings,exposure:reef.exposure};}
 return {...scene,manualRig:{...scene.manualRig,mode:'preset'},set:{...scene.set,id,accent:preset.accent},background:preset.background,backgroundImage:'',lighting:preset.lighting,lightingSettings:lightingSettingsSchema.parse({bloom:.3,tone:'vivid',environment:1.2}),exposure:1,floor:id!=='toy-factory',ground:{...scene.ground,...(id==='snow-globe'?{height:-5.6}:{}),finish:id==='christmas-pavilion'?'matte':'satin'}};
}
export const cinematicTemplates=[
 {id:'aquarium',name:'Aquarium · A Living Reef',subtitle:'Swimming fish · flowing coral · a quiet camera journey'},
 {id:'toy-factory',name:'Christmas Toy Factory',subtitle:'One present’s journey · assembly to snowy delivery'},
 {id:'miniature-town',name:'Lantern Valley Express',subtitle:'First-person train ride · miniature town'},
 {id:'neon-stage',name:'Music Room premiere',subtitle:'Sapphire & gold · neon stage'},
 {id:'haunted-theater',name:'Midnight overture',subtitle:'Worn gold · haunted theater'},
 {id:'christmas-pavilion',name:'Christmas wishes',subtitle:'Rich red enamel · golden lights'},
 {id:'snow-globe',name:'Christmas snow globe',subtitle:'Swirling snow · glass globe reveal'}
] as const;
export function cinematicScene(id:Exclude<SetSettings['id'],'none'>):Scene{
 if(id==='aquarium')return aquariumScene();
 if(id==='toy-factory')return toyFactoryScene();
 if(id==='miniature-town')return trainTownScene();
 if(id==='snow-globe')return snowGlobeScene();
 let scene=applyCinematicSet(demoScene(),id);scene.name=cinematicTemplates.find(t=>t.id===id)!.name;scene.duration=10;scene.particles=id==='haunted-theater'?'dust':'stars';
 const title=scene.objects[0],sub=scene.objects[1],finish=finishPresets.find(p=>p.id===(id==='haunted-theater'?'worn-gold':'sapphire-gold'))!;
 Object.assign(title,{text:id==='neon-stage'?"MR. DREW'S\nMUSIC ROOM":id==='haunted-theater'?'MIDNIGHT\nOVERTURE':'MERRY\nCHRISTMAS',font:'bebasneue',size:1.65,lineHeight:1.1,position:[0,.7,0],rotation:[0,-5,0],depth:.3,bevel:.045,motion:'still',material:id==='christmas-pavilion'?'ruby-red':finish.face,sideMaterial:finish.sides,bevelMaterial:finish.bevel,backMaterial:finish.sides,surfaceDetail:{...finish.details},sequence:{...title.sequence,enabled:true,entrance:'rise',enter:1.4,hold:7.4,leave:1.2,exit:'fade',unit:'word',stagger:.15,amount:.45}});
 Object.assign(sub,{text:id==='neon-stage'?'LET THE MUSIC BEGIN':id==='haunted-theater'?'AN EVENING OF MYSTERY':'A SEASON OF WONDER',font:'bebasneue',size:.55,position:[0,-1.55,.15],rotation:[0,0,0],material:'champagne',sideMaterial:'copper',bevelMaterial:'champagne',sequence:{...sub.sequence,enabled:true,start:.7,entrance:'fade',enter:1,hold:7.1,leave:1.2,exit:'fade',unit:'object'}});
 const accent=makeObject('prop',id==='haunted-theater'?'moon':'star');accent.name='Foreground accent';accent.position=[-5.5,-1.5,2.5];accent.scale=[.42,.42,.42];accent.material='champagne';accent.motion='float';accent.amount=.1;
 scene.objects=[title,sub,accent];scene.lens={...scene.lens,enabled:true,mode:'target',targetId:title.id,aperture:.4};
 const a=makeShot({position:[2,1.2,16],target:[0,.3,0],fov:40},3,'Opening glide');a.move=true;a.end={position:[.5,.8,14.5],target:[0,.3,0],fov:40};
 const b=makeShot({position:[-3,1,14],target:[0,.3,0],fov:40},3,'Three-quarter detail');b.move=true;b.end={position:[-1,.8,14],target:[0,.3,0],fov:40};b.transition='dissolve';
 const c=makeShot({position:[0,.8,14.5],target:[0,.3,0],fov:40},4,'Hero title');c.transition='dissolve';
 scene.camera={...scene.camera,shotsEnabled:true,shots:[a,b,c]};return scene;
}

/** A continuous interior-to-exterior reveal, with editable titles and camera shots. */
export function snowGlobeScene():Scene{
 const scene=applyCinematicSet(demoScene(),'snow-globe');scene.name="Mr. Drew's Christmas Snow Globe";scene.duration=16;scene.fps=60;scene.particles='none';
 scene.set={...scene.set,scale:1,rotation:0,offsetZ:0,glow:1.15,snowfall:.75,glass:true};
 scene.lightingSettings=lightingSettingsSchema.parse({bloom:.18,tone:'vivid',environment:1.05,keyColor:'#fff0d2',fillColor:'#9abfff',rimColor:'#22baff',keyPower:.85,fillPower:.7,rimPower:1.1});
 scene.exposure=1;scene.ground={height:-5.6,finish:'satin'};scene.renderSettings={engine:'standard',samples:128,bounces:8};
 const title=makeObject(),sub=makeObject();title.id='christmas-title';title.name='Merry Christmas';title.text='MERRY\nCHRISTMAS';title.font='bebasneue';title.size=1.15;title.spacing=.025;title.lineHeight=1.12;title.depth=.24;title.bevel=.035;title.position=[0,.4,1.1];
 title.material='ruby-red';title.sideMaterial='copper';title.bevelMaterial='champagne';title.backMaterial='champagne';title.surfaceDetail={...finishPresets.find(p=>p.id==='sapphire-gold')!.details,strength:.14,roughness:.2};
 title.sequence={...title.sequence,enabled:true,entrance:'fade',enter:1.2,hold:14.8,leave:0,exit:'none',unit:'word',stagger:.12,amount:.2};
 sub.id='christmas-credit';sub.name="Mr. Drew's Music Room";sub.text="MR. DREW'S MUSIC ROOM";sub.font='bebasneue';sub.size=.29;sub.depth=.08;sub.bevel=.012;sub.spacing=.018;sub.position=[0,-1.13,1.15];sub.material=sub.bevelMaterial='champagne';sub.sideMaterial=sub.backMaterial='copper';
 sub.sequence={...sub.sequence,enabled:true,start:.7,entrance:'fade',enter:1,hold:14.3,leave:0,exit:'none',unit:'object'};scene.objects=[title,sub];
 const opening=makeShot({position:[1.2,.55,5.7],target:[0,.15,.8],fov:52},3,'Inside the Christmas miniature');opening.move=true;opening.end={position:[.5,.65,5.7],target:[0,.15,.8],fov:52};
 const reveal=makeShot(opening.end,8,'Pull back — reveal the snow globe');reveal.move=true;reveal.end={position:[2.8,2.4,21.5],target:[0,.3,0],fov:42};
 const hero=makeShot(reveal.end,5,'The Christmas keepsake');hero.move=true;hero.end={position:[-2,1.6,21.7],target:[0,.2,0],fov:42};
 scene.camera={...scene.camera,position:[...opening.start.position],target:[...opening.start.target],fov:52,motion:'still',shotsEnabled:true,shots:[opening,reveal,hero]};
 scene.lens={...scene.lens,enabled:true,mode:'target',targetId:title.id,aperture:.12,maxBlur:.012};return scene;
}

/** The route, wheels, camera and sounds all use absolute scene time. */
export function trainTownScene():Scene{
 const scene=applyCinematicSet(demoScene(),'miniature-town');scene.name="Mr. Drew's Lantern Valley Express";scene.duration=40;scene.fps=60;scene.objects=[];scene.particles='none';scene.floor=true;scene.ground={height:0,finish:'matte'};scene.set={...scene.set,scale:1,rotation:0,offsetZ:0,glow:1.1};
 scene.lighting='warm';scene.lightingSettings=lightingSettingsSchema.parse({bloom:.17,tone:'vivid',environment:1.5,keyColor:'#ffe6bf',fillColor:'#71b6ff',rimColor:'#ffc977',keyPower:1.2,fillPower:1.1,rimPower:.85});scene.exposure=1.05;scene.lens.enabled=false;
 const route=routeSchema.parse({id:'town-railway',name:'Lantern Valley railway',points:TRAIN_ROUTE_POINTS,closed:true,space:'set',show:false});scene.paths=[route];
 const train=makeObject('prop','train');train.id='lantern-express';train.name='Lantern Valley locomotive';train.position=[0,0,0];train.follow=followSchema.parse({enabled:true,pathId:route.id,duration:40,loop:true});scene.objects=[train];
 scene.camera={...scene.camera,shotsEnabled:false,shots:[],keys:[],ride:rideSchema.parse({...train.follow,mode:'cab'}),position:[0,2,18],target:[10,2,18],fov:65};
 scene.effects=[effectSchema.parse({id:'town-fireflies',kind:'fireflies',position:[0,2.2,0],size:[50,4,40],count:90,scale:1.4,color:'#c4ff4a',speed:.6,end:40,seed:24})];
 scene.audio={...scene.audio,enabled:true,volume:.65,assets:{},cues:[soundCueSchema.parse({id:'rail-rhythm',kind:'train',time:0,duration:40,loop:true,volume:.32,fadeIn:.8,fadeOut:.5}),soundCueSchema.parse({id:'departure-bell',kind:'bell',time:.3,duration:2,volume:.38}),soundCueSchema.parse({id:'departure-whistle',kind:'whistle',time:2.2,duration:3,volume:.28}),soundCueSchema.parse({id:'return-whistle',kind:'whistle',time:30,duration:3,volume:.22})]};
 return scene;
}
