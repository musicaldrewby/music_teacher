import {demoScene,makeObject,lightingSettingsSchema,type Scene,type Vec,type CameraPose,type Obj} from './scene';
import {routeSchema,followSchema,effectSchema,soundCueSchema,type SoundCue} from './directing';
import {makeShot} from './sequence';
import {FACTORY_DURATION} from './factory-timing';

/** One parcel travels through three stations, then leaves on an independently editable train. */
export function toyFactoryScene():Scene{
 const scene=demoScene();scene.name="Mr. Drew's Christmas Toy Factory";scene.duration=FACTORY_DURATION;scene.fps=60;scene.particles='none';scene.background='electric';scene.backgroundImage='';scene.floor=false;scene.ground={height:0,finish:'matte'};
 scene.set={...scene.set,id:'toy-factory',scale:1,rotation:0,offsetZ:0,accent:'#ffd06a',glow:1.1,decorations:true};
 scene.lighting='warm';scene.lightingSettings=lightingSettingsSchema.parse({bloom:.16,tone:'vivid',environment:1.4,keyColor:'#ffebc8',fillColor:'#80baff',rimColor:'#ffd276',keyPower:1.15,fillPower:1.1,rimPower:.9});scene.exposure=1.05;scene.shadows={mode:'soft',quality:2048,softness:2.5,strength:.9};scene.renderSettings={engine:'standard',samples:128,bounces:6};scene.lens.enabled=false;
 const parcel=makeObject('prop','factory-parcel');parcel.id='factory-hero-parcel';parcel.name='Our Christmas present';parcel.position=[-12,1.61,2];parcel.mechanism={enabled:true,start:0,duration:42};
 const key=(time:number,position:Vec,easing:Obj['keys'][number]['easing']='linear')=>({time,position,rotation:[0,0,0] as Vec,scale:[1,1,1] as Vec,easing});
 parcel.keys=[key(0,[-12,1.61,2]),key(6,[-12,1.61,2]),key(11,[-3,1.61,2]),key(14,[-3,1.61,2]),key(16,[0,1.61,2]),key(20,[0,1.61,2]),key(26,[11,1.61,2]),key(28,[11,4.1,2],'smooth'),key(30,[11,4.1,-4],'smooth'),key(32,[11,1.36,-4],'smooth'),key(42,[35,1.36,-4])];
 const route=routeSchema.parse({id:'factory-delivery-track',name:'Snowy Christmas delivery',points:[[15,.26,-4],[39,.26,-4]],space:'world',show:false});scene.paths=[route];
 const delivery=makeObject('group');delivery.id='factory-delivery-train';delivery.name='Christmas delivery train';delivery.position=[0,0,0];delivery.follow=followSchema.parse({enabled:true,pathId:route.id,start:32,duration:10,loop:false,orient:true});
 const train=makeObject('prop','train');train.id='factory-locomotive';train.name='Ruby steam locomotive';train.parentId=delivery.id;train.position=[0,0,0];
 const wagon=makeObject('prop','factory-wagon');wagon.id='factory-wagon';wagon.name='Brass delivery wagon';wagon.parentId=delivery.id;wagon.position=[0,0,-4];
 const title=makeObject();title.id='factory-opening-title';title.name='Christmas Toy Factory title';title.text='CHRISTMAS TOY FACTORY';title.font='bebasneue';title.size=1;title.spacing=.025;title.depth=.16;title.bevel=.025;title.position=[0,9.3,-5.5];title.material=title.bevelMaterial='champagne';title.sideMaterial=title.backMaterial='copper';title.sequence={...title.sequence,enabled:true,entrance:'fade',enter:.7,hold:1.5,leave:.8,exit:'fade',unit:'object',amount:.2};
 scene.objects=[parcel,delivery,train,wagon,title];
 const pose=(position:Vec,target:Vec,fov=44):CameraPose=>({position,target,fov});
 const shot=(name:string,duration:number,start:CameraPose,end?:CameraPose,transition:'cut'|'dissolve'='cut')=>({...makeShot(start,duration,name),move:!!end,end:end||start,easing:'linear' as const,transition,transitionDuration:.4});
 const shots=[
  shot('Welcome to the Toy Works',3,pose([-6,15,32],[0,3.8,0],54),pose([-4,13.5,29],[0,3.8,0],54)),
  shot('A wooden toy comes to life',3,pose([-15.2,5.5,9.2],[-12,2.55,2],43),pose([-14.2,5.1,9.2],[-12,2.55,2],43)),
  shot('Along the brass conveyor',5,pose([-15.8,2.61,3.15],[-12,2.55,2],48),pose([-6.8,2.61,3.15],[-3,2.55,2],48)),
  shot('Fold the Christmas paper',5,pose([-6.5,6.5,8],[-3,2.5,2],46),pose([-3.5,6.5,8],[0,2.5,2],46)),
  shot('A ribbon and a golden bow',4,pose([-4.2,5.2,9],[0,2.65,2],43),pose([-3.2,5,9],[0,2.65,2],43),'dissolve'),
  shot('Next stop: Christmas delivery',6,pose([-3.8,2.61,3.15],[0,2.7,2],48),pose([7.2,2.61,3.15],[11,2.7,2],48)),
  shot('The crane loads the train',6,pose([6.5,8,12],[11,3.7,-.6],46),pose([6.5,8,10],[11,3,-2],46)),
  shot('Off into the snowy night',10,pose([6,5.8,2.8],[13,2,-4],48),pose([30,5.8,2.8],[37,2,-4],48),'dissolve'),
 ];
 scene.camera={...scene.camera,factoryView:'cinematic',ride:{...scene.camera.ride,enabled:false},shotsEnabled:true,shots,keys:[],position:[...shots[0].start.position],target:[...shots[0].start.target],fov:54,motion:'still'};
 scene.effects=[effectSchema.parse({id:'factory-wrap-sparkle',kind:'sparks',position:[0,3,2],size:[3,2.5,3],count:28,scale:.55,color:'#ffd05a',speed:.5,start:19.2,end:21.2,seed:52}),effectSchema.parse({id:'factory-outdoor-snow',kind:'snow',position:[32,4,-4],size:[25,8,6],count:170,scale:1.1,color:'#ffffff',speed:.55,end:42,seed:25})];
 const cue=(id:string,kind:SoundCue['kind'],time:number,duration:number,volume:number,loop=false)=>soundCueSchema.parse({id,kind,time,duration,volume,loop});
 scene.audio={...scene.audio,enabled:true,volume:.7,assets:{},cues:[cue('factory-music','music-box',0,42,.32,true),...Array.from({length:6},(_,i)=>cue('toy-click-'+i,'impact',1.5+i*.55,.5,.14)),cue('paper-fold','whoosh',12.3,1.2,.16),cue('ribbon-spin','whoosh',17.3,1.2,.18),cue('bow-complete','chime',19.2,2.5,.4),cue('wagon-landing','impact',31.8,.8,.24),cue('delivery-bell','bell',32,2,.35),cue('delivery-whistle','whistle',33,3,.25),cue('delivery-rails','train',32,10,.28,true)]};
 return scene;
}
