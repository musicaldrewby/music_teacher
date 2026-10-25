import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeProject,Clock,DRUMS,drumVelocity,drumStatus} from './dist/model.js';
import {graph,applyGraph} from './dist/audio.js';

// Render the shipped SoundFont, one drum at a time, and check the selected patch.
globalThis.sampleRate=44100;
let Processor;
globalThis.AudioWorkletProcessor=class{constructor(){this.messages=[];this.port={postMessage:m=>this.messages.push(m)};}};
globalThis.registerProcessor=(name,cls)=>Processor=cls;
await import('./dist/processor.js');
const buffer=Buffer.concat([1,2].map(i=>fs.readFileSync(`./dist/assets/generaluser-${i}.bin`)));
let project=makeProject();
const processor=new Processor({processorOptions:{project,soundfont:buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength)}});
const kits=JSON.parse(fs.readFileSync('./dist/assets/presets.json')).filter(p=>p.drum);
for(const kit of kits){
 project.patterns[0].drums.kit=kit.program;
 processor.port.onmessage({data:{type:'state',project}});
 const channel=processor.synth.midiChannels[4];
 assert.equal(channel.drumChannel,true);
 assert.equal(channel.preset.name,kit.name);
 assert.equal(channel.preset.program,kit.program);
}
project=makeProject();processor.port.onmessage({data:{type:'state',project}});
const peaks=[];
for(let lane=0;lane<DRUMS.length;lane++){
 processor.clear();const [name,note]=DRUMS[lane];
 processor.port.onmessage({data:{type:'preview',ch:4,note,velocity:drumVelocity(project.patterns[0].drums.lanes[lane].volume)}});
 let peak=0;
 for(let block=0;block<345;block++){
  const out=Array.from({length:6},()=>[new Float32Array(128),new Float32Array(128)]);
  assert.equal(processor.process([],out),true);
  out.forEach((pair,ch)=>pair.forEach(samples=>samples.forEach(x=>{assert.ok(Number.isFinite(x));if(ch===4)peak=Math.max(peak,Math.abs(x));else assert.equal(x,0,`${name} leaked into channel ${ch}`);})));
 }
 assert.ok(peak>.005,`${name} must produce audible signal at the default lane level`);
 peaks.push(`${name}: ${peak.toFixed(4)}`);
}
assert.equal(processor.messages.filter(m=>m.type==='error').length,0);
project.patterns[0].drums.lanes.forEach(l=>l.volume=0);
assert.ok(!new Clock(project).process(4).some(e=>e.ch===4&&e.kind==='note'));
assert.equal(drumVelocity(0),0);assert.equal(drumVelocity(1,.5,1),127);

// Verify signal paths and gain behavior, including mute/solo, without a browser.
class Param{value=0;setTargetAtTime(v){this.value=v;}}
class Node{constructor(){this.connections=[];for(const key of ['gain','frequency','Q','pan','delayTime','threshold','knee','ratio','attack','release'])this[key]=new Param();}connect(node,output=0){this.connections.push({node,output});return node;}start(){}}
const ctx={sampleRate:100,currentTime:0,createGain:()=>new Node(),createBiquadFilter:()=>new Node(),createOscillator:()=>new Node(),createStereoPanner:()=>new Node(),createDelay:()=>new Node(),createConvolver:()=>new Node(),createDynamicsCompressor:()=>new Node(),createAnalyser:()=>new Node(),createBuffer:(channels,length)=>({getChannelData:()=>new Float32Array(length)})};
const reachable=(from,to,seen=new Set())=>{if(from===to)return true;if(seen.has(from))return false;seen.add(from);return(from.connections||[]).some(c=>reachable(c.node,to,seen));};
project=makeProject();const source=new Node(),g=graph(ctx,source,project);
assert.equal(source.connections.find(c=>c.output===4).node,g.mix[4].f);
assert.ok(reachable(g.mix[4].f,g.analyser),'Percussion must reach the output');
assert.ok(!reachable(g.mix[4].f,g.filter),'Melodic low-pass must not suppress percussion');
assert.ok(reachable(g.mix[0].f,g.filter),'Melodic tracks must retain the filter');
assert.ok(reachable(g.mix[4].f,g.wet),'Percussion retains reverb');
assert.ok(reachable(g.mix[4].f,g.dl),'Percussion retains delay');
assert.equal(g.mix[4].g.gain.value,.5);
project.fx.cutoff=120;applyGraph(g,project);assert.equal(g.mix[4].f.frequency.value,20000);
project.mix[4].mute=true;applyGraph(g,project);assert.equal(g.mix[4].g.gain.value,0);assert.match(drumStatus(project),/muted/);
project.mix[4].mute=false;project.mix[0].solo=true;applyGraph(g,project);assert.equal(g.mix[4].g.gain.value,0);assert.match(drumStatus(project),/soloed/);
project.mix[4].solo=true;applyGraph(g,project);assert.equal(g.mix[4].g.gain.value,.5);assert.equal(drumStatus(project),'');
project.mix[4].volume=0;applyGraph(g,project);assert.equal(g.mix[4].g.gain.value,0);assert.match(drumStatus(project),/level is at zero/);
assert.match(drumStatus(makeProject(5)),/No drum steps/);
project=makeProject();project.patterns[0].drums.lanes.forEach(l=>l.volume=0);assert.match(drumStatus(project),/lanes are at zero/);
project.master=0;assert.match(drumStatus(project),/Master volume/);
console.log('PASS: all 11 drum kits, eight isolated drum voices, audition velocity, no channel leakage, zero-level silence, filter bypass, effects routing, mute/solo, and status messages.');
console.log(peaks.join(' · '));
