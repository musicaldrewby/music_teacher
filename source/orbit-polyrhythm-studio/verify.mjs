import fs from 'node:fs';
import assert from 'node:assert/strict';
import {preset,euclid,interval,notesFor,sanitize} from './dist/rhythm.js';
globalThis.sampleRate=44100;
globalThis.AudioWorkletProcessor=class{constructor(){this.messages=[];this.port={postMessage:m=>this.messages.push(m)}}};
globalThis.registerProcessor=()=>{};
const {OrbitProcessor}=await import('./dist/processor.js');
const processor=new OrbitProcessor();
const data=Buffer.concat([0,1,2,3].map(i=>fs.readFileSync(`dist/assets/generaluser-${i}.bin`)));
const s=preset();
await processor.message({type:'init',font:data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),state:s});
assert(processor.ready,JSON.stringify(processor.messages));
for(let n=1;n<=32;n++)for(let hits=0;hits<=n;hits++)for(let rot=0;rot<n;rot++)assert.equal(euclid(n,hits,rot).filter(Boolean).length,hits);
const l=new Float32Array(128),r=new Float32Array(128);
function render(blocks){let energy=0,peak=0;for(let k=0;k<blocks;k++){l.fill(0);r.fill(0);processor.process([] ,[[l,r]]);for(const x of l){assert(Number.isFinite(x));energy+=x*x;peak=Math.max(peak,Math.abs(x))}}return{energy,peak}}
await processor.message({type:'play'});
let first=render(1);assert(first.energy>0,'First beat should sound in the first audio block');
let a=render(3446);assert(a.energy>0,'Preset must produce audio');
assert(Math.abs(processor.beat-(3447*128/44100*s.bpm/60))<1e-7,'Beat clock should match audio frames');
const events=[];const original=processor.playNotes.bind(processor);processor.playNotes=(ch,n,v,d)=>{events.push({ch,frame:processor.frame});original(ch,n,v,d)};
let timing=preset();timing.bpm=120;timing.bars=1;timing.tracks.forEach((t,i)=>{t.mute=i>1;t.steps=i===0?3:4;t.hits=t.steps;t.pattern=euclid(t.steps,t.steps)});await processor.message({type:'state',state:timing});await processor.message({type:'play'});const start=processor.frame;render(Math.ceil(2*44100/128));
for(const ch of [0,1]){const actual=events.filter(e=>e.ch===ch).map(e=>e.frame-start);const expected=Array.from({length:ch===0?3:4},(_,i)=>Math.round(i*2*44100/(ch===0?3:4)));assert.deepEqual(actual.slice(0,expected.length),expected,`Exact ${ch===0?3:4} subdivisions`)}
await processor.message({type:'scene',state:preset('Midnight Engine'),id:2});render(400);assert(processor.pending,'Scene waits until boundary');render(400);assert.equal(processor.state.name,'Midnight Engine');
await processor.message({type:'stop'});assert.equal(processor.running,false);assert.equal(processor.beat,0);assert.equal(processor.offs.length,0);
processor.synth.setSystemParameter('effectsEnabled',false);
let maxPeak=0;const silent=[];for(const p of JSON.parse(fs.readFileSync('dist/assets/presets.json','utf8'))){processor.synth.stopAllChannels(true);const t={...s.tracks[0],program:p.program,bank:p.bank};processor.patch(8,t);assert.equal(processor.synth.midiChannels[8].preset.name,p.name);processor.synth.noteOn(8,p.bank===128?(p.keys.includes(38)?38:p.keys[0]):60,100);const result=render(60);maxPeak=Math.max(maxPeak,result.peak);if(result.energy<1e-10)silent.push(p.name);}
assert.equal(silent.length,0,`Silent presets: ${silent}`);
for(const name of ['Glass Orbits','Desert Afterglow','Midnight Engine','Floating Bells'])assert.deepEqual(sanitize(preset(name)),preset(name));
console.log(JSON.stringify({passed:true,presets:269,exactPolyrhythmTiming:true,sceneBoundary:true,euclideanPatterns:true,finiteAudio:true,peakBeforeMaster:maxPeak,firstBlockEnergy:first.energy},null,2));
