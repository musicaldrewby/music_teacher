import {sampleRoute} from './routes';
import {makeObject,blankScene,type Scene,type Obj,type Vec} from './scene';
import {bodySchema,weatherKeySchema,weatherSchema,directorSchema} from './playground-schema';
import {trainTownScene} from './cinematic-presets';
import {bakePhysics} from './physics-playground';
export function physicsProp(kind:'marble'|'ramp'|'domino'|'present',position:Vec=[0,3,0]):Obj{
 const o=makeObject('prop',kind==='marble'?'sphere':kind==='present'?'gift':'cube');o.name={marble:'Glass marble',ramp:'Collision ramp',domino:'Domino',present:'Falling present'}[kind];o.position=position;o.material=kind==='marble'?'ruby-red':kind==='ramp'?'wood':kind==='present'?'emerald-metal':'champagne';o.body=bodySchema.parse({mode:kind==='ramp'?'static':'dynamic',shape:kind==='marble'?'sphere':'box',bounce:kind==='marble'?.65:.12,friction:.4,size:kind==='present'?[1.54,1.5,1.34]:[1.6,1.6,1.6]});
 if(kind==='marble')o.scale=[.4,.4,.4];if(kind==='ramp'){o.scale=[4,.15,1.2];o.rotation=[0,0,-18];}if(kind==='domino')o.scale=[.08,1,.45];if(kind==='present')o.scale=[.5,.5,.5];return o;
}
export function addPhysicsKit(s:Scene,kind:'marble'|'ramp'|'domino'|'present'):Scene{
 const count=kind==='domino'?10:1;if(s.objects.length+count>40||s.objects.filter(o=>o.body.mode!=='off').length+count>24)throw Error('This kit needs more room: maximum 40 layers and 24 physics bodies.');
 const objects=kind==='domino'?Array.from({length:10},(_,i)=>{const o=physicsProp('domino',[-3+i*.5,s.ground.height+.81,0]);o.name=`Domino ${i+1}`;o.rotation=[0,0,-3];o.body.friction=.001;if(i===0){o.body.velocity=[0,0,0];o.body.spin=[0,0,-1];o.rotation=[0,0,-10];};return o;}):[physicsProp(kind,[0,s.ground.height+(kind==='ramp'?2:5),0])];return {...s,physics:{...s.physics,bake:null},objects:[...s.objects,...objects]};
}
/** Physics arrives as a saved take, so the first Play already runs the simulation. */
export async function winterPlaygroundScene(){const s=trainTownScene();s.name='Snowfall at the Toy Village';s.duration=24;s.effects=[];s.audio={...s.audio,enabled:false,cues:[]};s.set={...s.set,winter:true};s.camera.ride.enabled=false;s.paths[0].show=false;
 const train=s.objects[0];train.follow={...train.follow,start:8,duration:65,loop:true};
 const wagon=makeObject('prop','factory-wagon');wagon.id='winter-delivery-wagon';wagon.name='Toy delivery wagon';wagon.follow={...train.follow,offset:.97};s.objects.push(wagon);
 const at=sampleRoute(s,wagon.follow,0)!.position;
 const ramp=physicsProp('ramp',[at.x,2.2,at.z+1.9]);ramp.scale=[2,.1,1.1];ramp.rotation=[-18,0,0];ramp.body.friction=0;
 const presents=Array.from({length:3},(_,i)=>{const o=physicsProp('present',[at.x+(i-1)*.65,3.3+i*.6,at.z+2.3]);o.scale=[.38,.38,.38];o.body.bounce=.05;o.body.friction=.65;o.material=['ruby-red','emerald-metal','champagne'][i];return o;});
 const marbles=Array.from({length:2},(_,i)=>{const o=physicsProp('marble',[at.x-2,6+i,at.z+3]);o.material=['laser-cyan','deep-violet'][i];return o;});
 // Invisible editable proxies match the wagon deck and rails, and move with it.
 const proxies=([[0,1.02,0,1.8,.16,3],[.86,1.22,0,.08,.24,2.98],[-.86,1.22,0,.08,.24,2.98],[0,1.22,1.46,1.8,.24,.08],[0,1.22,-1.46,1.8,.24,.08]] as number[][]).map((v,i)=>{const o=makeObject('prop','cube');o.name='Wagon collider '+(i===0?'deck':i);o.position=v.slice(0,3) as Vec;o.scale=v.slice(3).map(n=>n/1.6) as Vec;o.opacity=0;o.follow={...wagon.follow};o.body=bodySchema.parse({mode:'kinematic',bounce:.05,friction:.9});return o;});
 s.objects.push(ramp,...presents,...marbles,...proxies);
 s.weather=weatherSchema.parse({enabled:true,extent:44,keys:[weatherKeySchema.parse({id:'day',time:0,sky:'#236ab8',sun:'#ffe3a0',daylight:1,clouds:.15}),weatherKeySchema.parse({id:'dusk',time:10,sky:'#59245f',sun:'#ff9d54',daylight:.6,clouds:.5,snow:.25,wind:1}),weatherKeySchema.parse({id:'snow',time:22,sky:'#071b53',sun:'#81b7ff',daylight:.3,clouds:.7,snow:.85,fog:.16,wind:1.5})]});
 s.camera.director=directorSchema.parse({enabled:true,start:8,targetId:train.id,distance:10,height:5,collisions:false});s.camera.position=[8,7,32];s.camera.target=[at.x,2,at.z+2];s.camera.fov=48;s.camera.shotsEnabled=true;
 const {makeShot}=await import('./sequence');const first=makeShot({position:[8,7,32],target:[at.x,2,at.z+2],fov:48},7,'Presents on the chute');first.move=true;first.end={position:[5,5,30],target:[at.x,1.5,at.z],fov:48};const second=makeShot({position:[32,20,35],target:[0,2,0],fov:52},9,'The village at dusk');second.transition='dissolve';second.move=true;second.end={position:[25,15,32],target:[0,2,0],fov:52};const third=makeShot({position:[-25,14,28],target:[0,2,0],fov:50},8,'Snow arrives');third.transition='dissolve';third.move=true;third.end={position:[-20,10,26],target:[0,2,0],fov:50};s.camera.shots=[first,second,third];s.physics.bake=await bakePhysics(s);return s;}
