import test from 'node:test';
import assert from 'node:assert/strict';
import {Soundtrack} from '../dist/audio.js';
import {newGame} from '../dist/engine.js';

// Adapter contract tests, not a substitute for listening in a real browser.
const param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){}});
class AudioNode {constructor(){this.gain=param();this.frequency=param();this.detune=param();this.Q=param();this.threshold=param();this.ratio=param();this.started=false;this.stopped=false;}connect(){}disconnect(){}start(){this.started=true;}stop(){this.stopped=true;}}
class AudioContext {constructor(){this.currentTime=0;this.sampleRate=8000;this.state='running';this.destination=new AudioNode();}resume(){return Promise.resolve();}createGain(){return new AudioNode();}createDynamicsCompressor(){return new AudioNode();}createBiquadFilter(){return new AudioNode();}createOscillator(){return new AudioNode();}createBufferSource(){return new AudioNode();}createBuffer(channels,length){const data=new Float32Array(length);return {getChannelData:()=>data};}decodeAudioData(){return Promise.resolve({});}}

test('Live Jam and recordings switch exclusively and mute stops the scheduler',async()=>{
 const oldWindow=globalThis.window,oldFetch=globalThis.fetch;globalThis.window={AudioContext};globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)});
 const errors=[],s=newGame(),audio=new Soundtrack(()=>{},m=>errors.push(m),()=>s);
 try{
  await audio.set({choice:'live',enabled:true});assert.ok(audio.live.active);assert.equal(audio.current,null);
  await audio.set({choice:'garage'});assert.equal(audio.live.active,false);assert.equal(audio.current.id,'garage');const recording=audio.current.src;
  await audio.set({choice:'live'});assert.ok(recording.stopped);assert.ok(audio.live.active);assert.equal(audio.current,null);
  await audio.set({enabled:false});assert.equal(audio.live.active,false);assert.equal(audio.enabled,false);assert.deepEqual(errors,[]);
 }finally{audio.stop();globalThis.window=oldWindow;globalThis.fetch=oldFetch;}
});
test('A recording that finishes loading late cannot interrupt Live Jam',async()=>{
 const oldWindow=globalThis.window,oldFetch=globalThis.fetch;globalThis.window={AudioContext};let release,started;
 const began=new Promise(r=>started=r);globalThis.fetch=()=>{started();return new Promise(r=>release=()=>r({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)}));};
 const audio=new Soundtrack(()=>{},()=>{},()=>newGame());
 try{const loading=audio.set({choice:'garage',enabled:true});await began;await audio.set({choice:'live'});release();await loading;assert.equal(audio.choice,'live');assert.ok(audio.live.active);assert.equal(audio.current,null);}
 finally{audio.stop();globalThis.window=oldWindow;globalThis.fetch=oldFetch;}
});
