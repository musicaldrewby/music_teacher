import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {OfflineAudioContext} from 'node-web-audio-api';
import {MusicAudio} from '../dist/audio.js';

// Execute the production input bindings. A release-triggered implementation
// fails these assertions before pointerup/selectend is ever dispatched.
const source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const slice=(from,to)=>source.slice(source.indexOf(from),source.indexOf(to,source.indexOf(from)));
const handlers=new Map(),played=[],released=[],held=[];
let hit=null,loads=0,finishLoad;
const surface={addEventListener:(name,fn)=>handlers.set(name,fn),setPointerCapture:()=>{},style:{}};
const context={soundOn:true,audio:{ctx:{state:'running'}},startSound:()=>{loads++;return new Promise(resolve=>finishLoad=resolve);},
 renderer:{domElement:surface},pointerHit:()=>hit,holdSynth:(...args)=>held.push(args),releaseSynth:t=>released.push(t),
 applySynthSlider:()=>{},ray:{},playUI:{isPlay:true},leaveDesktopFrame:()=>{},yaw:0,pitch:0,rig:{rotation:{}}};
vm.createContext(context);
vm.runInContext(slice('function playWhenReady(','\nfunction mat('),context);
vm.runInContext(slice('let drag=null;','\nwindow.addEventListener(\'keydown\''),context);
const event=(pointerId=1,button=0)=>({pointerId,button,clientX:10,clientY:20,detail:1,preventDefault:()=>{}});
const note={object:{userData:{spec:{type:'xylophone'},midi:60,action:()=>played.push('note')}}};
hit=note;handlers.get('pointerdown')(event());assert.deepEqual(played,['note'],'3D note begins on press');
assert.equal(loads,0,'warm live notes never wait on a loading promise');
handlers.get('pointerup')(event());assert.equal(played.length,1,'release cannot double-trigger');
handlers.get('pointerdown')(event(2,2));handlers.get('pointerup')(event(2,2));assert.equal(played.length,1,'right mouse is look-only');
hit={object:{userData:{action:()=>played.push('menu')}}};handlers.get('pointerdown')(event());assert.equal(played.length,1);
handlers.get('pointerup')(event());assert.equal(played.at(-1),'menu','room menus retain click behavior');
hit={object:{userData:{spec:{type:'synth'},midi:64}}};handlers.get('pointerdown')(event());assert.equal(held.length,1,'synth starts on press');
handlers.get('pointercancel')(event());assert.equal(released.at(-1),'mouse-scene');
context.soundOn=false;hit=note;handlers.get('pointerdown')(event());handlers.get('pointerup')(event());const before=played.length;
finishLoad(true);await Promise.resolve();assert.equal(played.length,before,'released startup gestures do not fire late');context.soundOn=true;

// Flat instrument buttons: mouse/touch press, keyboard activation, cancellation.
const button={setPointerCapture:()=>{}},buttonNotes=[],buttonOff=[];
context.bindPlayableButton(button,id=>buttonNotes.push(id),id=>buttonOff.push(id));
button.onpointerdown(event(8));assert.deepEqual(buttonNotes,[8]);button.onpointerup(event(8));button.onclick(event(8));assert.equal(buttonNotes.length,1);
button.onclick({...event(),detail:0});assert.deepEqual(buttonNotes,[8,null],'keyboard activation still works');
button.onpointerdown(event(9,2));assert.equal(buttonNotes.length,2,'secondary button does not play');
button.onpointerdown(event(10));button.onlostpointercapture(event(10));assert.equal(buttonOff.at(-1),10,'lost capture releases held synth');
context.soundOn=false;button.onpointerdown(event(11));button.onpointercancel(event(11));finishLoad(true);await Promise.resolve();assert.equal(buttonNotes.length,3);context.soundOn=true;

// Use the actual controller trigger binding, including release while loading.
const xrHandlers=new Map(),con={userData:{synthToken:'xr:0'},addEventListener:(name,fn)=>xrHandlers.set(name,fn)};
Object.assign(context,{con,xrRay:()=>hit,teleport:()=>{}});
vm.runInContext(slice("con.addEventListener('selectstart'","con.addEventListener('squeezestart'"),context);
hit=note;const count=played.length;xrHandlers.get('selectstart')();assert.equal(played.length,count+1,'VR trigger dispatches in the input event');
xrHandlers.get('selectend')();assert.equal(played.length,count+1);
context.soundOn=false;xrHandlers.get('selectstart')();xrHandlers.get('selectend')();finishLoad(true);await Promise.resolve();assert.equal(played.length,count+1);

// The master path must preserve an impulse's sample position at both common
// device rates. The previous DynamicsCompressor delayed every note by 6 ms.
for(const rate of [44100,48000]){
 const ctx=new OfflineAudioContext(2,rate/10,rate),audio=new MusicAudio();audio.init(ctx);
 const buffer=ctx.createBuffer(1,32,rate);buffer.getChannelData(0)[0]=.5;
 const input=ctx.createBufferSource();input.buffer=buffer;input.connect(audio.master);input.start(0);
 const result=await ctx.startRendering(),data=result.getChannelData(0);
 assert.ok(Math.abs(data[0]-.5*audio.level*.55)<1e-5,'master has no look-ahead or gain change on ordinary notes');
 assert.equal(data.findIndex(x=>Math.abs(x)>1e-5),0,'impulse sounds at sample zero');
 assert.equal(audio.limiter.oversample,'none');
}
{
 const ctx=new OfflineAudioContext(2,4800,48000),audio=new MusicAudio();audio.init(ctx);
 const buffer=ctx.createBuffer(1,4800,48000);buffer.getChannelData(0).fill(20);
 const input=ctx.createBufferSource();input.buffer=buffer;input.connect(audio.master);input.start();
 const data=(await ctx.startRendering()).getChannelData(0);assert.ok(data.every(x=>Number.isFinite(x)&&Math.abs(x)<1),'loud mixed peaks remain bounded');
}
// Minimum supported buffering is requested once; the device may choose larger.
const original=globalThis.AudioContext;let options,resumes=0;
globalThis.AudioContext=class{constructor(value){options=value;this.state='suspended';}async resume(){this.state='running';resumes++;}};
const audio=new MusicAudio();audio.init=ctx=>audio.ctx=ctx;await audio.start();await audio.start();assert.equal(options.latencyHint,0);assert.equal(resumes,1);globalThis.AudioContext=original;
audio.ctx={baseLatency:.005,outputLatency:.02};assert.equal(audio.latency().total,.025);audio.ctx={};assert.equal(audio.latency().total,null);
console.log('PASS: mouse/touch press onset, no release double-trigger, right-drag and menu behavior, synth cancellation, keyboard activation, immediate VR trigger, no stale startup notes, zero-delay master at 44.1/48 kHz, peak protection and minimum buffering request.');
