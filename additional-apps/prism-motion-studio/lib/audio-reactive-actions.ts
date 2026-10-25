import {z} from 'zod';
import {audioReactionSchema,audioReactivitySchema,visualizerSchema} from './audio-reactive-schema';
import {makeObject,sceneSchema,type Scene} from './scene';
import {soundCueSchema} from './directing';
import {analysisReady,reactiveConflict} from './audio-reactivity';
export const audioLooks=[{id:'bars',name:'EQ bars',detail:'A 3D spectrum skyline'},{id:'ring',name:'EQ ring',detail:'Sound wrapped in a circle'},{id:'bounce',name:'Bounce',detail:'Text and objects follow bass'},{id:'lights',name:'Light pulse',detail:'A musical lift in brightness'}] as const;
export type AudioLook=typeof audioLooks[number]['id'];
export function checkAudioBudget(scene:Scene){if(new TextEncoder().encode(JSON.stringify(scene)).length>7_900_000)throw Error('This scene is close to its 8 MB limit. Use a smaller audio file or remove an imported asset.');return scene;}
export function attachAudio(scene:Scene,asset:Scene['audio']['assets'][string],at=0){
 if(scene.audio.cues.length>=40)throw Error('Remove a sound cue first (40 maximum).');const assetId=crypto.randomUUID(),start=Math.min(at,scene.duration-.1),cue=soundCueSchema.parse({id:crypto.randomUUID(),kind:'audio',assetId,time:start,duration:Math.min(asset.analysis?.duration||1,scene.duration-start),volume:1});
 const next={...scene,audio:{...scene.audio,enabled:true,assets:{...scene.audio.assets,[assetId]:asset},cues:[...scene.audio.cues,cue],reactivity:{...scene.audio.reactivity,cueId:cue.id}}};return {scene:checkAudioBudget(next),cueId:cue.id};
}
export function applyAudioLook(scene:Scene,look:AudioLook,cueId:string,targetIds:string[]=[]){
 const cue=scene.audio.cues.find(c=>c.id===cueId);if(!cue||!analysisReady(scene.audio.assets[cue.assetId]))throw Error('Upload or analyze an audio track first.');
 let next:Scene={...scene,objects:[...scene.objects],audio:{...scene.audio,reactivity:{...scene.audio.reactivity,enabled:true,cueId}}};
 if(look==='bars'||look==='ring'){
  let eq=next.objects.find(o=>o.type==='prop'&&o.prop==='equalizer');
  if(!eq){if(next.objects.length>=40)throw Error('Remove a layer before adding an equalizer (40 maximum).');eq=makeObject('prop','equalizer');eq.name='Audio equalizer';eq.position=[0,scene.ground.height+.08,-1.5];eq.material='mint-neon';next.objects.push(eq);}
  next.objects=next.objects.map(o=>o.id===eq!.id?{...o,visualizer:{...o.visualizer,layout:look}}:o);
 }else if(look==='bounce'){
  const ids=targetIds.length?targetIds:next.objects.filter(o=>o.type==='text'&&!reactiveConflict(o)).map(o=>o.id);
  if(!ids.length)throw Error('Add or select a text or object layer to animate.');
  for(const id of ids){const o=next.objects.find(o=>o.id===id);if(!o)throw Error('A selected audio target no longer exists.');if(reactiveConflict(o))throw Error('Turn off physics and arrays on the selected layer before enabling audio motion.');}
  next.objects=next.objects.map(o=>ids.includes(o.id)?{...o,audioReaction:{...o.audioReaction,enabled:true,kind:'bounce',band:'bass'}}:o);
 }else if(look==='lights')next.audio.reactivity={...next.audio.reactivity,lights:{...next.audio.reactivity.lights,enabled:true}};
 else throw Error('Unknown audio look');
 return sceneSchema.parse(next);
}
export function removeSoundCue(scene:Scene,id:string){const cues=scene.audio.cues.filter(c=>c.id!==id),assets=Object.fromEntries(Object.entries(scene.audio.assets).filter(([key])=>cues.some(c=>c.assetId===key))),reactivity=scene.audio.reactivity;return {...scene,audio:{...scene.audio,cues,assets,reactivity:reactivity.cueId===id?{...reactivity,cueId:'',enabled:false}:reactivity}};}

// Shared by the UI and agent tools; all writes still pass the full scene validator.
export function editAudioReactivity(scene:Scene,input:unknown){
 const request=audioEditSchema.parse(input);let next=scene;
 if(request.look)next=applyAudioLook(next,request.look,request.cueId||scene.audio.reactivity.cueId,request.targetIds);
 const r=next.audio.reactivity,settings=request.settings||{};
 next={...next,audio:{...next.audio,reactivity:{...r,...settings,...(request.cueId?{cueId:request.cueId}:{}),lights:{...r.lights,...settings.lights}}},objects:next.objects.map(o=>{const reaction=request.objectReactions.find(p=>p.id===o.id),visualizer=request.visualizers.find(p=>p.id===o.id);return {...o,...(reaction?{audioReaction:{...o.audioReaction,...reaction.reaction}}:{}),...(visualizer?{visualizer:{...o.visualizer,...visualizer.settings}}:{})};})};
 for(const edit of [...request.objectReactions,...request.visualizers])if(!next.objects.some(o=>o.id===edit.id))throw Error(`Audio target ${edit.id} does not exist.`);
 return sceneSchema.parse(next);
}

export const audioEditSchema=z.object({look:z.enum(['bars','ring','bounce','lights']).optional(),cueId:z.string().max(80).optional(),targetIds:z.array(z.string().max(80)).max(40).default([]),settings:audioReactivitySchema.omit({lights:true,cueId:true}).partial().extend({lights:audioReactivitySchema.shape.lights.removeDefault().partial().optional()}).optional(),objectReactions:z.array(z.object({id:z.string().max(80),reaction:audioReactionSchema.partial()})).max(40).default([]),visualizers:z.array(z.object({id:z.string().max(80),settings:visualizerSchema.partial()})).max(40).default([])});
