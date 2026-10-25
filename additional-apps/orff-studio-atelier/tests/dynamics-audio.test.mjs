import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {OfflineAudioContext} from 'node-web-audio-api';
import {AudioEngine,wavBytes} from '../dist/engine.js';
import {getInstrument,notesFor,newProject,newTrack} from '../dist/catalog.js';
import {voiceToneProfile} from '../dist/dynamics.js';
globalThis.OfflineAudioContext=OfflineAudioContext;
globalThis.fetch=async path=>new Response(await fs.readFile(new URL('../dist/'+path,import.meta.url)));

// Isolate tone from the room, limiter and level with a deterministic two-partial hit.
async function synthetic(inst,events){
 const ctx=new OfflineAudioContext(2,44100*2,44100),master=ctx.createGain(),send=ctx.createGain(),delaySend=ctx.createGain();master.connect(ctx.destination);
 const mix={ctx,master,send,delaySend,tracks:new Map(),bpm:100};
 const engine=Object.assign(Object.create(AudioEngine.prototype),{ctx,mix,manifest:{},buffers:new Map(),voices:new Set()});
 const sample=ctx.createBuffer(1,44100,44100),data=sample.getChannelData(0);
 for(let n=0;n<data.length;n++){const t=n/44100;data[n]=.2*Math.exp(-3*t)*(Math.sin(2*Math.PI*500*t)+Math.sin(2*Math.PI*8000*t));}
 const voices=[];
 for(let n=0;n<events.length;n++){
  const e=events[n];engine.buffers.set(engine.descriptor(inst,e.note).url,sample);
  voices.push(engine.play(inst,e,{id:'v'+n,volume:1,pan:e.pan??0},.05,mix));
 }
 return {buffer:await ctx.startRendering(),voices};
}
function partial(data,hz){let re=0,im=0;for(let n=4410;n<22050;n++){const a=2*Math.PI*hz*n/44100;re+=data[n]*Math.cos(a);im+=data[n]*Math.sin(a);}return Math.hypot(re,im);}
const power=data=>data.reduce((n,v)=>n+v*v,0);
function sameSamples(a,b){assert.equal(a.length,b.length);assert.ok(a.every((v,n)=>v===b[n]),'sample values match (signed zero is silence)');}
test('native filter response adds no resonant peak to soft strikes',()=>{
 const ctx=new OfflineAudioContext(1,128,44100),frequency=Float32Array.from({length:128},(_,i)=>20*(20000/20)**(i/127));
 const response=profile=>{
  if(!profile)return new Float32Array(frequency.length).fill(1);
  const shelf=ctx.createBiquadFilter(),low=ctx.createBiquadFilter();
  shelf.type='highshelf';shelf.frequency.value=profile.shelfHz;shelf.gain.value=profile.shelfDb;
  low.type='lowpass';low.frequency.value=profile.cutoffHz;low.Q.value=profile.q;
  const a=new Float32Array(frequency.length),b=new Float32Array(frequency.length),phase=new Float32Array(frequency.length);
  shelf.getFrequencyResponse(frequency,a,phase);low.getFrequencyResponse(frequency,b,phase);
  return a.map((v,n)=>v*b[n]);
 };
 for(const id of ['bass-bars','soprano-xylophone','alto-metallophone','soprano-glockenspiel','hand-drums','shakers','tenor-recorder']){
  const inst=getInstrument(id),event={note:notesFor(inst)[0].note,velocity:.2};
  const base=response(voiceToneProfile(inst,event)),soft=response(voiceToneProfile(inst,{...event,dynamicTone:1}));
  assert.ok(soft.every((v,n)=>v<=base[n]+1e-5),id+' has no added resonant bump');
  const nearlyOff=response(voiceToneProfile(inst,{...event,dynamicTone:.000001}));
  assert.ok(nearlyOff.every((v,n)=>Math.abs(v-base[n])<.00001),id+' returns smoothly to its baseline tone');
 }
});
test('native audio softens upper partials without changing strike timing, tail length or neighboring voices',async()=>{
 const inst=getInstrument('alto-xylophone'),base={note:60,shift:0,velocity:.3,duration:.5};
 const plain=await synthetic(inst,[base]),off=await synthetic(inst,[{...base,dynamicTone:0}]),warm=await synthetic(inst,[{...base,dynamicTone:1}]);
 sameSamples(off.buffer.getChannelData(0),plain.buffer.getChannelData(0));
 const a=plain.buffer.getChannelData(0),b=warm.buffer.getChannelData(0);
 assert.ok(partial(b,8000)/partial(b,500)<.5*partial(a,8000)/partial(a,500),'tone change is independent of loudness');
 assert.equal(warm.voices[0].at,plain.voices[0].at);assert.equal(warm.voices[0].end,plain.voices[0].end);
 assert.ok(b.slice(0,2205).every(v=>v===0));assert.ok(power(b.slice(33075,44100))>0,'natural tail continues');
 const chord=await synthetic(inst,[{...base,dynamicTone:1,pan:-1},{...base,velocity:1,dynamicTone:1,pan:1}]);
 const left=await synthetic(inst,[{...base,dynamicTone:1,pan:-1}]),right=await synthetic(inst,[{...base,velocity:1,pan:1}]);
 sameSamples(chord.buffer.getChannelData(0),left.buffer.getChannelData(0));
 sameSamples(chord.buffer.getChannelData(1),right.buffer.getChannelData(1));
 const metal=getInstrument('alto-metallophone');
 const legacy=await synthetic(metal,[{...base,velocity:1}]),full=await synthetic(metal,[{...base,velocity:1,dynamicTone:1}]);
 sameSamples(legacy.buffer.getChannelData(0),full.buffer.getChannelData(0));
});

class OfflineTestEngine extends AudioEngine {
 async init(){if(!this.ctx){this.ctx=new OfflineAudioContext(2,44100,44100);this.mix=this.createMix(this.ctx);}this.manifest=await this.manifestPromise;return this;}
}
test('real sample exports retain MIDI tone and natural tails through the shared offline renderer',async()=>{
 const engine=new OfflineTestEngine(),p=newProject();p.bpm=120;p.bars=2;p.reverb=0;p.delay=0;
 for(const id of ['alto-xylophone','alto-metallophone','soprano-glockenspiel','hand-drums','bass-bars','tenor-recorder']){
  const inst=getInstrument(id),n=notesFor(inst)[0],track=newTrack(id);track.volume=.15;
  track.events=[{id:id+'-soft',note:n.note,shift:n.shift||0,beat:0,duration:1,velocity:.25,dynamicTone:.8}];p.tracks.push(track);
 }
 const warm=await engine.render(p),off=structuredClone(p);for(const t of off.tracks)delete t.events[0].dynamicTone;
 const plain=await engine.render(off);assert.equal(warm.length,plain.length);assert.equal(warm.numberOfChannels,2);
 const a=warm.getChannelData(0),b=plain.getChannelData(0);assert.ok(a.every(Number.isFinite));assert.ok(power(a)>0&&power(a)<power(b));
 assert.notDeepEqual(a,b,'saved per-note tone reaches exported audio');
 const wav=new DataView(wavBytes(warm));assert.equal(wav.getUint32(40,true),warm.length*4);assert.equal(wav.getUint32(24,true),44100);
});
