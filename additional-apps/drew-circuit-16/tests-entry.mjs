import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeProject,validateProject,Clock,DRUMS,drumName,drumSound,writeMidiStep,nextMidiStep} from './dist/model.js';
import {MidiKeyboard} from './dist/midi.js';

// Custom drum keys survive both persisted projects and per-pattern copies.
let p=makeProject();const defaults=DRUMS.map(d=>d[1]);
assert.deepEqual(validateProject(p).patterns[0].drums.lanes.map(l=>l.note),defaults);
const notes=[56,63,76,80,0,127,69,54];
p.patterns[0].drums.lanes.forEach((l,i)=>{l.note=notes[i];l.name=drumName(0,l.note);l.on.fill(false);l.on[0]=true;});
p=validateProject(JSON.parse(JSON.stringify(p)));
assert.deepEqual(p.patterns[0].drums.lanes.map(l=>l.note),notes);
assert.deepEqual(p.patterns[1].drums.lanes.map(l=>l.note),defaults);
assert.deepEqual(new Clock(p).process(.01).filter(e=>e.ch===4&&e.kind==='note').map(e=>e.note),notes);
assert.equal(drumName(0,56),'Cowbell');assert.equal(drumName(48,42),'Timpani');assert.equal(drumName(56,56),'Foot Step');
assert.equal(drumSound(0,0),null);assert.ok(drumSound(56,0));
p.patterns[0].drums.lanes[0].note=-5;p.patterns[0].drums.lanes[1].note=999;delete p.patterns[0].drums.lanes[2].note;
const repaired=validateProject(p);assert.equal(repaired.patterns[0].drums.lanes[0].note,0);assert.equal(repaired.patterns[0].drums.lanes[1].note,127);assert.equal(repaired.patterns[0].drums.lanes[2].note,42);

// MIDI entry edits only the target step; optional dynamics and length-aware advance.
p=makeProject();p.scale='chromatic';let t=p.patterns[0].tracks[0];t.tie[3]=true;t.on[3]=false;
const original=p.patterns[0].tracks[1].notes.slice();
assert.equal(writeMidiStep(p,0,3,61,109),61);assert.equal(t.notes[3],61);assert.equal(t.velocity[3],85);assert.equal(t.tie[3],false);assert.equal(t.on[3],true);
assert.deepEqual(p.patterns[0].tracks[1].notes,original);
writeMidiStep(p,0,3,21,109,true);assert.equal(t.notes[3],21);assert.equal(t.velocity[3],109);
for(const note of [0,21,108,127])assert.equal(writeMidiStep(p,0,0,note,80),note);
assert.equal(validateProject(p).patterns[0].tracks[0].notes[0],127);
p.root=0;p.scale='major';assert.equal(writeMidiStep(p,0,2,61,80),60);
p.scale='chromatic';p.patterns[0].bass.octave=1;assert.equal(writeMidiStep(p,5,2,60,80),60);assert.equal(p.patterns[0].bass.notes[2],48);
assert.equal(writeMidiStep(p,5,8,60,80),null);assert.equal(writeMidiStep(p,4,0,60,80),null);
assert.equal(nextMidiStep(6,7,true),0);assert.equal(nextMidiStep(3,7,true),4);assert.equal(nextMidiStep(3,7,false),3);
p.patterns[1].tracks[0].on.fill(false);p.activePattern=1;writeMidiStep(p,0,4,72,99,true);assert.equal(p.patterns[1].tracks[0].notes[4],72);assert.equal(p.patterns[0].tracks[0].notes[4],57);

// Real Web MIDI event shape, permission behavior, input isolation and hot unplug.
const a={id:'a',name:'Keyboard A',state:'connected'},b={id:'b',name:'Keyboard B',state:'connected'};
const access={inputs:new Map([['a',a],['b',b]])};const received=[],states=[];let disconnected=0;
const midi=new MidiKeyboard({onNote:n=>received.push(n),onState:s=>states.push(s),onDisconnect:()=>disconnected++});
await midi.connect(async options=>{assert.deepEqual(options,{sysex:false});return access;});assert.equal(midi.input,a);assert.equal(b.onmidimessage,undefined);
a.onmidimessage({data:new Uint8Array([0x92,60,90])});a.onmidimessage({data:new Uint8Array([0x92,60,90])});a.onmidimessage({data:new Uint8Array([0xb2,7,100])});a.onmidimessage({data:new Uint8Array([0xf8])});assert.equal(received.length,1);
a.onmidimessage({data:new Uint8Array([0x92,60,0])});a.onmidimessage({data:new Uint8Array([0x92,60,70])});assert.equal(received.length,2);
a.onmidimessage({data:new Uint8Array([0x82,60,0])});a.onmidimessage({data:new Uint8Array([0x92,60,70])});assert.equal(received.length,3);
midi.select('b');assert.equal(a.onmidimessage,null);assert.equal(midi.input,b);
b.state='disconnected';access.onstatechange();assert.equal(midi.input,null);assert.equal(disconnected,1);assert.equal(states.at(-1).connected,false);
b.state='connected';access.onstatechange();assert.equal(midi.input,b);midi.disconnect();assert.equal(b.onmidimessage,null);assert.equal(access.onstatechange,null);
await assert.rejects(new MidiKeyboard().connect(async()=>{throw new Error('permission denied');}),/permission denied/);
await assert.rejects(new MidiKeyboard().connect(),/unavailable/);

// Audition and sequenced hits use the reassigned key in the actual synthesis engine.
globalThis.sampleRate=44100;let Processor;
globalThis.AudioWorkletProcessor=class{constructor(){this.port={postMessage:()=>{}};}};globalThis.registerProcessor=(n,c)=>Processor=c;
await import('./dist/processor.js');const data=Buffer.concat([1,2].map(i=>fs.readFileSync(`./dist/assets/generaluser-${i}.bin`)));
p=makeProject(5);for(let i=0;i<3;i++){p.patterns[0].drums.lanes[i].note=[56,63,76][i];p.patterns[0].drums.lanes[i].on[i*4]=true;}
const proc=new Processor({processorOptions:{project:validateProject(p),soundfont:data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),autoplay:true}});
const captured=[];const note=proc.note.bind(proc);proc.note=(e,f)=>{captured.push(e.note);note(e,f);};let peak=0;
for(let block=0;block<1000;block++){const out=Array.from({length:6},()=>[new Float32Array(128),new Float32Array(128)]);assert.equal(proc.process([],out),true);for(const sample of out[4][0])peak=Math.max(peak,Math.abs(sample));}
for(const n of [56,63,76])assert.ok(captured.includes(n));assert.ok(peak>.01);
console.log('PASS: drum assignment persistence and playback, kit-aware names, full MIDI range, scale and octave handling, velocity capture, auto-advance, input selection, note-off filtering, permission rejection and hot-plug recovery.');
