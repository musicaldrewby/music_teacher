import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Clock,makeProject,validateProject,stepIndex,parseChain} from './dist/model.js';
for(let i=0;i<6;i++)assert.deepEqual(validateProject(makeProject(i)),makeProject(i));
assert.throws(()=>validateProject({version:7}));assert.throws(()=>parseChain('Z:2'));
assert.deepEqual([0,1,2,3,4,5,6,7].map(i=>stepIndex(i,4,'pendulum')),[0,1,2,3,2,1,0,1]);
let p=makeProject();p.tempo=120;p.evolution=0;p.patterns[0].tracks.forEach(t=>t.chance.fill(1));let c=new Clock(p);let events=c.process(2);const steps=events.filter(e=>e.kind==='step'&&e.ch===0);assert.equal(steps.length,16);assert.equal(steps[0].time,0);assert.equal(steps[15].time,1.875);
assert.deepEqual(events.filter(e=>e.kind==='step'&&e.ch===1).map(e=>e.idx),[0,1,2,3,4,5,6,0]);
c=new Clock(p);c.process(.5);c.queue(2);events=c.process(1.501);assert.equal(c.pattern,2);assert.ok(events.some(e=>e.kind==='pattern'&&Math.abs(e.time-1.5)<1e-6));
p.songMode=true;p.chain='A:1 C:1';c=new Clock(p);events=c.process(4.1);assert.deepEqual(events.filter(e=>e.kind==='pattern').map(e=>e.pattern),[2,0]);
p=makeProject();const a=new Clock(p),b=new Clock(p);assert.deepEqual(a.process(8),b.process(8));
globalThis.sampleRate=44100;const processors={};globalThis.AudioWorkletProcessor=class{constructor(){this.messages=[];this.port={postMessage:m=>this.messages.push(m)};}};globalThis.registerProcessor=(name,cls)=>processors[name]=cls;
await import('./dist/processor.js');const file=Buffer.concat([1,2].map(i=>fs.readFileSync('./dist/assets/generaluser-'+i+'.bin'))),soundfont=file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength);
const proc=new processors['circuit-synth']({processorOptions:{project:makeProject(),soundfont,autoplay:true}});const peaks=Array(6).fill(0);let valid=true;for(let block=0;block<1600;block++){const outputs=Array.from({length:6},()=>[new Float32Array(128),new Float32Array(128)]);assert.equal(proc.process([],outputs),true);for(let ch=0;ch<6;ch++)for(const sample of outputs[ch][0]){valid&&=Number.isFinite(sample);peaks[ch]=Math.max(peaks[ch],Math.abs(sample));}}
assert.ok(valid);for(let ch=0;ch<6;ch++)assert.ok(peaks[ch]>.001,`Channel ${ch} must produce audio`);assert.equal(proc.messages.filter(m=>m.type==='error').length,0);
proc.port.onmessage({data:{type:'stop'}});const silence=Array.from({length:6},()=>[new Float32Array(128),new Float32Array(128)]);proc.process([],silence);assert.ok(silence.every(pair=>pair.every(arr=>arr.every(v=>v===0))));
console.log('PASS: preset validation, clock timing, polymeter, direction, bar-boundary changes, chain loops, seeded variation, six-channel soundfont/analog rendering, and stop silence.');console.log('Channel peaks:',peaks.map(v=>v.toFixed(4)).join(', '));
