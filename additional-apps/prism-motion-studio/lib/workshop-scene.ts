import {toyFactoryScene} from './factory-scene';
import {makeObject,type Obj,type Scene,type Vec,type CameraPose} from './scene';
import {makeShot} from './sequence';
/** A walkable front aisle and a toy-scale workbench, with recorded interactive cues. */
export function workshopScene():Scene{
 const s=toyFactoryScene();s.name='Midnight in the Christmas Workshop';s.objects=s.objects.filter(o=>o.id!=='factory-opening-title');
 const add=(id:string,prop:Obj['prop'],position:Vec,scale:Vec,material:string,name:string)=>{const o=makeObject('prop',prop);Object.assign(o,{id,name,position,scale,material,sideMaterial:material,backMaterial:material,bevelMaterial:material,motion:'still'});s.objects.push(o);return o;};
 add('explorer-workbench','cube',[-8,1.5,5.3],[2.2,.12,1.05],'wood','Giant walnut workbench');for(const [i,x,z] of [[0,-9.4,4.7],[1,-6.6,4.7],[2,-9.4,5.9],[3,-6.6,5.9]])add('bench-leg-'+i,'cube',[x,.7,z],[.12,.9,.12],'wood','Workbench leg '+(i+1));
 const gear=add('explorer-drive-gear','gear',[-5.8,.8,4.9],[.6,.6,.6],'champagne','Clockwork discovery gear');
 const lever=add('explorer-lever','lever',[-7.15,0,5.1],[.55,.55,.55],'ruby-red','Ruby clockwork lever');lever.interaction={...lever.interaction,enabled:true,action:'spin',axis:'z',targetId:gear.id,label:'Start the clockwork',duration:.8,amount:.22};
 const door=add('explorer-door','door',[-4.4,0,4.6],[.6,.6,.6],'emerald-metal','Little emerald door');door.interaction={...door.interaction,enabled:true,label:'Open the emerald door'};
 const chest=add('explorer-chest','chest',[-2.5,0,5.1],[.55,.55,.55],'ruby-red','Christmas treasure chest');chest.interaction={...chest.interaction,enabled:true,label:'Open the Christmas chest'};
 const button=add('explorer-button','push-button',[0,0,5.2],[.7,.7,.7],'electric-blue','Magic title button');button.interaction={...button.interaction,enabled:true,action:'explode',targetId:'workshop-magic-title',duration:2.5,label:'Explode or rebuild the title'};
 const title=makeObject();Object.assign(title,{id:'workshop-magic-title',name:"Mr. Drew's wooden title",text:"MR. DREW'S\nMUSIC ROOM",font:'bebasneue',size:.7,depth:.22,bevel:.025,lineHeight:1.1,position:[3,2.3,4],material:'wood',sideMaterial:'wood',bevelMaterial:'champagne',backMaterial:'wood',motion:'still'});title.fracture={...title.fracture,enabled:true,trigger:'interaction',parts:5,force:1,spin:.3,insideColor:'#c18645',duration:2.5,seed:24};s.objects.push(title);
 const label=makeObject();Object.assign(label,{id:'workshop-plate',name:'Workbench brass plaque',text:'MIDNIGHT WORKSHOP',font:'bebasneue',size:.18,depth:.035,bevel:.005,position:[-8,1.48,6.16],material:'champagne',sideMaterial:'champagne',motion:'still'});s.objects.push(label);
 s.worldEvents=[{id:'title-pieces',controlId:button.id,time:0,value:1},{id:'clockwork-start',controlId:lever.id,time:3,value:1},{id:'door-open',controlId:door.id,time:7,value:1},{id:'chest-open',controlId:chest.id,time:11,value:1},{id:'title-rebuild',controlId:button.id,time:34,value:0}];
 const pose=(position:Vec,target:Vec,fov=65):CameraPose=>({position,target,fov});const shot=(name:string,duration:number,start:CameraPose,end?:CameraPose)=>({...makeShot(start,duration,name),move:!!end,end:end||start,easing:'smooth' as const});
 s.camera={...s.camera,shotsEnabled:true,walk:{enabled:false,samples:[]},ride:{...s.camera.ride,enabled:false},factoryView:'cinematic',shots:[
 shot('Toy-sized beneath the workbench',4,pose([-8,.28,5.8],[-7.15,.3,5.1]),pose([-7.8,.28,5.8],[-7.15,.3,5.1])),
 shot('Follow the little world',4,pose([-6.2,.36,6.5],[-4.4,.7,4.6]),pose([-5.2,.36,6.5],[-4.4,.7,4.6])),
 shot('The Christmas treasure chest',5,pose([-3,.65,7],[-2.5,.5,5.1],52)),
 shot('Clockwork at midnight',10,pose([-8,3.2,6.6],[-6,2.5,2],58),pose([4,3.2,6.6],[6,2.5,2],58)),
 shot('The snowy delivery railway',9,pose([6.5,1.4,-1],[12,1,-4],62),pose([12,1.4,-1],[17,1,-4],62)),
 shot('Wooden fragments become the music room',10,pose([3,2.4,12.5],[3,2.35,4],44),pose([3,2.4,11.4],[3,2.35,4],44))]};
 s.explorer={eyeHeight:.28,speed:.65,mode:'walk',collisions:true,spawn:pose([-8,.28,5.8],[-7.15,.3,5.1])};return s;
}
