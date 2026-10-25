import {demoScene,lightingSettingsSchema,sceneSchema,type Scene,type Vec} from './scene';
import {manualRigSchema} from './manual-light-schema';
import {makeShot} from './sequence';

/** A quiet camera journey through the reef. The music is supplied separately. */
export function aquariumScene(duration=140):Scene{
 const scene=demoScene();scene.name='Aquarium · A Living Reef';scene.duration=duration;scene.fps=60;
 scene.objects=[];scene.floor=false;scene.particles='none';scene.ground={height:0,finish:'matte'};
 scene.set={...scene.set,id:'aquarium',accent:'#8ce2dd',scale:1,rotation:0,offsetZ:0,decorations:true,glow:1};
 scene.background='ocean';scene.backgroundColor='#075066';scene.exposure=1.05;
 scene.lightingSettings=lightingSettingsSchema.parse({bloom:.12,tone:'filmic',environment:.55});
 scene.manualRig=manualRigSchema.parse({mode:'custom',ambient:.45,environment:.55,fixtures:false,lights:[
  {id:'water-sun',name:'Filtered sunlight',kind:'directional',color:'#d3f8ef',intensity:2.1,position:[-8,18,5],target:[0,0,-9],shadow:true},
  {id:'blue-depth',name:'Blue water fill',kind:'directional',color:'#75b5e0',intensity:1.0,position:[10,7,-18],target:[0,2,-5]},
  {id:'coral-fill',name:'Soft coral fill',kind:'directional',color:'#ffe5cc',intensity:.7,position:[0,5,12],target:[0,1,-8]},
  {id:'surface-ripples',name:'Caustic light',kind:'spot',color:'#b6fff0',intensity:1900,position:[-2,15,-5],target:[0,0,-7],angle:68,penumbra:.8,pattern:{kind:'ripples',size:1.5,strength:.7,softness:.27,seed:42}},
 ]});
 scene.shadows={...scene.shadows,mode:'soft'};scene.lens.enabled=false;
 const pose=(position:Vec,target:Vec,fov=52)=>({position,target,fov});
 const journey=[
  {name:'Enter the blue garden',seconds:20,start:pose([1,5.4,17],[0,2.4,-8]),end:pose([-1,4.3,13],[0,2.5,-8])},
  {name:'Chromis above the reef',seconds:18,start:pose([-11,4.7,8],[-2,3.3,-7],55),end:pose([-8,4.1,7],[1,3.3,-7],55)},
  {name:'Anemone garden',seconds:20,start:pose([-1,2.7,6],[-5,1.25,.2],47),end:pose([-2.5,2.3,5],[-5,1.3,.2],49)},
  {name:'Across the golden school',seconds:17,start:pose([12,5.3,6],[0,3.7,-10],54),end:pose([9,4.4,3],[-2,3.6,-10],54)},
  {name:'Drift over the coral canopy',seconds:18,start:pose([4,11,10],[0,1.2,-7],56),end:pose([-2,9.2,7],[0,1.3,-8],56)},
  {name:'Sea fans and ribbons',seconds:18,start:pose([1,3.2,5],[6,1.8,-4],51),end:pose([2.5,2.8,4],[6.5,1.9,-5],51)},
  {name:'The silver-blue procession',seconds:17,start:pose([-8,4.2,7],[0,3.6,-7],54),end:pose([-5,4.4,10],[1,3.4,-7],54)},
  {name:'Return to the open water',seconds:12,start:pose([0,4.7,13],[0,2.4,-8],52),end:pose([1,6.2,19],[0,2.8,-9],52)},
 ];
 const ratio=duration/140;
 const shots=journey.map((j,i)=>{const shot=makeShot(j.start,j.seconds*ratio,j.name);shot.id='aquarium-shot-'+(i+1);shot.end=j.end;shot.move=true;shot.easing='smooth';shot.transition=i?'dissolve':'cut';shot.transitionDuration=Math.min(2.2,shot.duration*.15);return shot;});
 // Absorb floating point summation at the last shot, preserving exact audio length.
 shots[shots.length-1].duration=duration-shots.slice(0,-1).reduce((sum,s)=>sum+s.duration,0);
 scene.camera={...scene.camera,...shots[0].start,shotsEnabled:true,shots,motion:'still',amount:0,keys:[]};
 scene.xrViews=[{id:'reef-view',name:'Among the fish',...pose([0,3.4,3],[0,3,-8],60)},{id:'coral-view',name:'Coral garden',...pose([-1,2.7,6],[-5,1.2,0],55)}];
 return sceneSchema.parse(scene);
}
