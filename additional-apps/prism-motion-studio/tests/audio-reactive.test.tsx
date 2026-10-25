import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createElement as h} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as T from 'three';
import {analyzePCM,type PCM} from '../lib/audio-analysis';
import {audioAnalysisSchema,audioFingerprint,AUDIO_STRIDE} from '../lib/audio-reactive-schema';
import {sampleAudio,audioOverview,analysisReady} from '../lib/audio-reactivity';
import {attachAudio,applyAudioLook,editAudioReactivity,removeSoundCue} from '../lib/audio-reactive-actions';
import {buildEqualizer,applyAudioObject,applyAudioLights} from '../lib/audio-reactive-render';
import {blankScene,demoScene,makeObject,sceneSchema} from '../lib/scene';
import {Engine} from '../lib/engine';
import {animateGroup} from '../lib/motion';
import {buildLighting,updateLighting,disposeLighting} from '../lib/lighting';
import {buildBlenderTransfer,sampleMeshTransform} from '../lib/blender-transfer';
import {flattenTraceScene} from '../lib/pathtrace';
import {AudioPanel} from '../components/audio-panel';
import {audioSchema} from '../lib/directing';
const data='data:audio/wav;base64,AAAA';
const pcm=(freq:number,seconds=2,invert=false):PCM=>{const samples=Float32Array.from({length:24000*seconds},(_,i)=>.5*Math.sin(2*Math.PI*freq*i/24000));return {sampleRate:24000,length:samples.length,numberOfChannels:invert?2:1,getChannelData:(c)=>c?Float32Array.from(samples,v=>-v):samples};};
function constantAsset(){return {name:'Test track',data,analysis:audioAnalysisSchema.parse({version:1,duration:4,hz:20,source:audioFingerprint(data),frames:Array.from({length:81*21},(_,i)=>i%21===4?128:255),beats:[.5,1,1.5,2,2.5,3],bpm:120})};}
function musicalScene(){const s=attachAudio(demoScene(),constantAsset()).scene;s.audio.volume=1;s.audio.cues[0].fadeIn=0;s.audio.cues[0].fadeOut=0;s.audio.reactivity.enabled=true;return s;}
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);

test('Analysis separates frequency ranges, keeps inverted stereo and produces deterministic bounded envelopes',async()=>{
 for(const [hz,band] of [[90,1],[900,2],[6000,3]] as const){const a=await analyzePCM(pcm(hz),data),b=await analyzePCM(pcm(hz,2,true),data);assert.deepEqual(a.frames,b.frames);assert.ok(audioAnalysisSchema.safeParse(a).success);const sample=a.frames.slice(20*AUDIO_STRIDE,21*AUDIO_STRIDE);assert.ok(sample[band]>200);for(const other of [1,2,3].filter(i=>i!==band))assert.ok(sample[other]<45,`${hz}: ${sample.slice(0,4)}`);const repeat=await analyzePCM(pcm(hz),data);assert.deepEqual(repeat,a);}
 const silence=await analyzePCM(pcm(0),data);assert.ok(silence.frames.every(v=>v===0));assert.equal(silence.bpm,0);assert.deepEqual(silence.beats,[]);
});
test('Beat estimates find regular percussive onsets; silence and malformed source durations stay safe',async()=>{
 const base=pcm(70,6),samples=base.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]*=Math.exp(-(i/24000%.5)*30);const result=await analyzePCM({...base,getChannelData:()=>samples},data);assert.ok(result.beats.length>=8);assert.ok(Math.abs(result.bpm-120)<=5,JSON.stringify(result.beats));assert.equal(audioAnalysisSchema.safeParse({...result,frames:result.frames.slice(1)}).success,false);assert.equal(audioAnalysisSchema.safeParse({...result,beats:[2,1]}).success,false);await assert.rejects(analyzePCM({...base,length:24000*601},data),/10 minutes/);
});
test('Source timing honors offsets, loops, cue boundaries, fades, volume, mute, and zero strength',()=>{
 const s=musicalScene(),c=s.audio.cues[0];c.time=1;c.duration=6;c.offset=2;s.audio.reactivity.smoothness=0;
 assert.equal(sampleAudio(s,.9).level,0);assert.ok(sampleAudio(s,2).level>.99);assert.equal(sampleAudio(s,3).level,0);c.loop=true;assert.ok(sampleAudio(s,5).level>.99);c.offset=10;near(sampleAudio(s,5).level,sampleAudio(s,2).level);
 c.offset=0;c.fadeIn=1;c.fadeOut=1;near(sampleAudio(s,1).level,0);assert.ok(sampleAudio(s,1.5).level>.49&&sampleAudio(s,1.5).level<.51);assert.equal(sampleAudio(s,7).level,0);near(sampleAudio(s,6.5).level,.5);c.volume=.5;s.audio.volume=.4;near(sampleAudio(s,6.5).level,.1);s.audio.enabled=false;assert.equal(sampleAudio(s,2).level,0);s.audio.enabled=true;s.audio.reactivity.strength=0;assert.equal(sampleAudio(s,2).level,0);
});
test('Smoothing is independent of playback order; mismatched analysis cannot drive a scene',()=>{
 const s=musicalScene();s.audio.reactivity.smoothness=.8;const first=sampleAudio(s,1.123);for(const t of [3,0,2,1.3,3.9])sampleAudio(s,t);assert.deepEqual(sampleAudio(s,1.123),first);const id=s.audio.cues[0].assetId;s.audio.assets[id]={...s.audio.assets[id],data:data+'A'};assert.equal(analysisReady(s.audio.assets[id]),false);assert.equal(sampleAudio(s,1).level,0);
});
test('Looks preserve scenes, reuse one editable equalizer and validate agent updates',()=>{
 const s=musicalScene(),cueId=s.audio.reactivity.cueId,bars=applyAudioLook(s,'bars',cueId),ring=applyAudioLook(bars,'ring',cueId);assert.deepEqual(bars.objects.slice(0,-1),s.objects);assert.deepEqual(bars.camera,s.camera);assert.equal(ring.objects.length,bars.objects.length);const eq=ring.objects.at(-1)!;assert.equal(eq.visualizer.layout,'ring');const next=editAudioReactivity(ring,{look:'bounce',cueId,targetIds:['main-title'],settings:{strength:.6,lights:{enabled:true}},visualizers:[{id:eq.id,settings:{count:48}}],objectReactions:[{id:'main-title',reaction:{band:'beat',kind:'pulse'}}]});assert.equal(next.objects[0].audioReaction.band,'beat');assert.equal(next.objects.at(-1)!.visualizer.count,48);assert.equal(next.audio.reactivity.lights.enabled,true);assert.equal(next.audio.reactivity.lights.strength,.7);assert.ok(sceneSchema.safeParse(next).success);assert.throws(()=>editAudioReactivity(s,{settings:{strength:7}}));assert.throws(()=>editAudioReactivity(s,{objectReactions:[{id:'missing',reaction:{enabled:true}}]}),/does not exist/);
 const physics=structuredClone(s);physics.objects[0].body.mode='dynamic';assert.throws(()=>applyAudioLook(physics,'bounce',cueId,['main-title']),/physics/);assert.equal(sceneSchema.safeParse({...s,objects:[{...s.objects[0],audioReaction:{...s.objects[0].audioReaction,enabled:true},placement:{...s.objects[0].placement,enabled:true}}]}).success,false);
});
test('Reactive transforms and lighting reset on seek; equalizer topology survives Blender and physical transfer',()=>{
 const base=musicalScene(),s=applyAudioLook(base,'bars',base.audio.reactivity.cueId),o=s.objects.at(-1)!,root=buildEqualizer(o,new T.MeshStandardMaterial()),world=new T.Scene();world.add(root);const signals=sampleAudio(s,1);animateGroup(root,o,1,s.duration);applyAudioObject(root,o,signals);world.updateMatrixWorld(true);const ids=root.children.map(n=>n.uuid),first=root.children.map(n=>sampleMeshTransform(n as T.Mesh));
 animateGroup(root,o,5,s.duration);applyAudioObject(root,o,sampleAudio(s,5));assert.ok(root.children.every(n=>n.scale.y===.06));animateGroup(root,o,1,s.duration);applyAudioObject(root,o,signals);world.updateMatrixWorld(true);assert.deepEqual(root.children.map(n=>sampleMeshTransform(n as T.Mesh)),first);assert.deepEqual(root.children.map(n=>n.uuid),ids);
 const transfer=buildBlenderTransfer(world);assert.equal(transfer.sources.length,32);const traced=new T.Scene();flattenTraceScene(world,traced,new Map(),{castShadow:true});assert.equal(traced.children.length,32);transfer.dispose();
 const title=makeObject(),titleGroup=new T.Group();title.audioReaction={enabled:true,kind:'bounce',band:'bass',strength:1};animateGroup(titleGroup,title,1,s.duration);applyAudioObject(titleGroup,title,signals);assert.ok(titleGroup.position.y>title.position[1]);animateGroup(titleGroup,title,5,s.duration);applyAudioObject(titleGroup,title,sampleAudio(s,5));assert.deepEqual(titleGroup.position.toArray(),title.position);
 const lights=buildLighting(s);s.audio.reactivity.lights.enabled=true;updateLighting(lights,s,1);const powers=lights.children.filter(n=>n instanceof T.DirectionalLight||n instanceof T.SpotLight||n instanceof T.PointLight).map(n=>(n as T.Light).intensity);applyAudioLights(lights,s,signals);const active=lights.children.filter(n=>n instanceof T.DirectionalLight||n instanceof T.SpotLight||n instanceof T.PointLight);assert.ok(active.some((n,i)=>(n as T.Light).intensity>powers[i]));updateLighting(lights,s,5);applyAudioLights(lights,s,sampleAudio(s,5));assert.deepEqual(active.map(n=>(n as T.Light).intensity),powers);disposeLighting(lights);
});
test('Deleting the source clears dangling reactivity; legacy scenes parse with reactions off',()=>{
 const s=musicalScene(),removed=removeSoundCue(s,s.audio.reactivity.cueId);assert.equal(removed.audio.reactivity.enabled,false);assert.equal(removed.audio.reactivity.cueId,'');assert.deepEqual(removed.audio.assets,{});assert.ok(sceneSchema.safeParse(removed).success);
 const legacy=JSON.parse(JSON.stringify(demoScene()));delete legacy.audio.reactivity;legacy.objects.forEach((o:any)=>{delete o.audioReaction;delete o.visualizer;});const parsed=sceneSchema.parse(legacy);assert.equal(parsed.audio.reactivity.enabled,false);assert.ok(parsed.objects.every(o=>!o.audioReaction.enabled));assert.deepEqual(audioSchema.parse({}).reactivity,parsed.audio.reactivity);
});
test('Audio overview gives agent meaningful analysis without embedded bytes; UI exposes accessible simple controls',()=>{
 const s=musicalScene(),overview=audioOverview(s);assert.equal(overview[0].estimatedBpm,120);assert.ok(overview[0].envelope.length);assert.ok(!JSON.stringify(overview).includes('base64'));const html=renderToStaticMarkup(h(AudioPanel,{scene:s,object:s.objects[0],time:1,change:()=>{},select:()=>{},seek:()=>{},toast:()=>{},current:()=>s}));for(const label of ['Upload audio','EQ bars','EQ ring','Bounce','Light pulse','Strength slider','Smoothness slider','Audio preview position','Reactive lights','Clip timing'])assert.ok(html.includes(label),label);assert.ok(html.includes('Extend scene to track'));const empty=blankScene();assert.ok(renderToStaticMarkup(h(AudioPanel,{scene:empty,time:0,change:()=>{},select:()=>{},seek:()=>{},toast:()=>{},current:()=>empty})).includes('Try a demo beat'));
});


test('The shared engine sampler drives audio geometry and lights without frame history',()=>{
 const base=musicalScene(),scene=applyAudioLook(base,'bars',base.audio.reactivity.cueId),o=scene.objects.at(-1)!;scene.objects=[o];scene.audio.reactivity.lights.enabled=true;
 const root=new T.Group(),group=buildEqualizer(o,new T.MeshStandardMaterial()),world=new T.Scene(),lights=buildLighting(scene);group.userData.id=o.id;root.add(group);world.add(root,lights);
 const engine=Object.assign(Object.create(Engine.prototype),{scene,world,root,lights,objects:new Map([[o.id,group]]),disposed:false});
 engine.sample(1);const height=group.children[0].scale.y;assert.ok(height>.1);const lit=lights.children.filter(n=>n instanceof T.SpotLight||n instanceof T.DirectionalLight||n instanceof T.PointLight).map(n=>(n as T.Light).intensity);
 engine.sample(5);assert.equal(group.children[0].scale.y,.06);engine.sample(1);near(group.children[0].scale.y,height);assert.deepEqual(lights.children.filter(n=>n instanceof T.SpotLight||n instanceof T.DirectionalLight||n instanceof T.PointLight).map(n=>(n as T.Light).intensity),lit);disposeLighting(lights);
});
