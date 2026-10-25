import {toyFactoryScene} from './factory-scene';
import {trainTownScene} from './cinematic-presets';
import {sceneSchema,samplePose,type Scene} from './scene';
import {stereoSchema} from './stereo';
import {effectSchema,soundCueSchema} from './directing';

export const stereoTemplates=[{id:'stereo-factory',name:'Christmas Factory · 3D test',subtitle:'10 seconds · full side-by-side · 60 FPS'},{id:'vr180-christmas-train',name:'Christmas Express · VR180',subtitle:'Snowy village · steady cab ride · Blender stereo'}] as const;
export function stereoScene(id:string):Scene{
 if(id==='stereo-factory'){
  const s=toyFactoryScene();s.name='Christmas Toy Factory — 10-second 3D test';s.duration=10;s.stereo=stereoSchema.parse({mode:'cinema',eyeSeparation:.065,convergence:14});
  s.objects=s.objects.map(o=>({...o,keys:o.keys.length?[...o.keys.filter(k=>k.time<10),{time:10,...samplePose(o,10),easing:'linear' as const}]:[],reactions:o.reactions.filter(r=>r.time+r.duration<=10)}));
  s.audio.cues=s.audio.cues.filter(c=>c.time<10).map(c=>({...c,duration:Math.min(c.duration,10-c.time)}));s.effects=s.effects.filter(e=>e.start<10).map(e=>({...e,end:Math.min(10,e.end)}));
  s.camera={...s.camera,shotsEnabled:false,shots:[],position:[-10,6.2,16],target:[-8,2.5,2],fov:52,motion:'still',keys:[]};return sceneSchema.parse(s);
 }
 const s=trainTownScene();s.name='Christmas Express — VR180 Snowy Village';s.duration=60;s.set.winter=true;s.stereo=stereoSchema.parse({mode:'vr180',quality:'preview'});s.objects[0].follow.duration=60;s.camera.ride={...s.camera.ride,duration:60,lookAhead:6,mode:'cab',levelHorizon:true};
 s.effects=[effectSchema.parse({id:'christmas-snow',kind:'snow',position:[0,4,0],size:[62,9,52],count:220,scale:.8,color:'#ffffff',speed:.35,end:60,seed:71})];
 s.audio.cues=s.audio.cues.map(c=>c.id==='rail-rhythm'?{...c,duration:60}:c.id==='return-whistle'?{...c,time:53}:c);s.audio.cues.push(soundCueSchema.parse({id:'christmas-music',kind:'music-box',duration:60,loop:true,volume:.28,fadeIn:1,fadeOut:2}));s.lens.enabled=false;return sceneSchema.parse(s);
}
