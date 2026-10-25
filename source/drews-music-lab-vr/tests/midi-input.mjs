import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../dist/vendor/three.module.js';
import {MIDIInputController,midiTargets} from '../dist/midi-input.js';
import {HARMONIES,harmony,tunedBar} from '../dist/music-presets.js';
import {LoopRecorder} from '../dist/recorder.js';
import {SYNTH_DEFAULT} from '../dist/synth.js';
const noop=()=>{},source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
function fn(name){const start=source.search(new RegExp('^(?:async )?function '+name+'\\(','m'));assert.ok(start>=0,name);const rest=source.slice(start),end=rest.slice(1).search(/^(?:async )?function /m);return rest.slice(0,end+1);}
const diatonic=[0,2,4,5,7,9,11,12,14,16,17,19,21];
const specs=vm.runInNewContext(source.match(/const specs=(\[[\s\S]*?\n\]);/)[1],{diatonic});
const bars=specs.filter(s=>['xylophone','metallophone','glockenspiel'].includes(s.type));
const draw=new Proxy({},{get:()=>noop}),document={createElement:()=>({width:512,height:64,getContext:()=>draw})};
const ctx={THREE,document,diatonic,specs:bars,barMeshes:[],clickable:[],scene:new THREE.Scene(),c:{wood:0,metal:0,teal:0,darkWood:0,ink:0},instrumentPlacement:{apply:noop},current:{},selectStation:noop,playNote:noop,studio:{},recorder:{harmony:'c-ionian'},harmony,HARMONIES,tunedBar,pent:false,releaseSynthHolds:noop,updateWorldLabel:noop,renderKeys:noop,presetUI:{},bassWorld:{},$:()=>null};
vm.createContext(ctx);for(const name of ['mat','box','cylinder','sphere','textPlane','label','noteName','stationGroup','table','makePlayable','makeBars','isAllowed','applyRoomHarmony'])vm.runInContext(fn(name),ctx);
for(const s of bars)ctx.makeBars(s);
for(const id of Object.keys(HARMONIES)){
 ctx.recorder.harmony=id;ctx.applyRoomHarmony();
 for(const s of bars){const targets=midiTargets(s,ctx.barMeshes,ctx.isAllowed),expected=new Set(diatonic.map(n=>tunedBar(s.midi+n,id)));assert.equal(targets.size,13,s.name+' always has 13 bars');
  for(let note=0;note<128;note++)assert.equal(targets.has(note),expected.has(note),s.id+' '+id+' MIDI '+note);
  assert.ok([...targets.keys()].every(n=>![1,3,8].includes(n%12)),'no C sharp, E flat or G sharp added');
  for(const target of targets.values())assert.equal(target.midi,target.mesh.userData.midi,'MIDI matches the actual displayed bar');
 }
}
const alto=bars.find(s=>s.id==='ax');ctx.recorder.harmony='c-ionian';ctx.applyRoomHarmony();let targets=midiTargets(alto,ctx.barMeshes,ctx.isAllowed);assert.ok(targets.has(65)&&targets.has(71));assert.ok(!targets.has(66)&&!targets.has(70)&&!targets.has(84));
ctx.recorder.harmony='g-ionian';ctx.applyRoomHarmony();targets=midiTargets(alto,ctx.barMeshes,ctx.isAllowed);assert.ok(targets.has(66)&&targets.has(78)&&!targets.has(65)&&!targets.has(77)&&!targets.has(70));
ctx.recorder.harmony='f-ionian';ctx.applyRoomHarmony();targets=midiTargets(alto,ctx.barMeshes,ctx.isAllowed);assert.ok(targets.has(70)&&!targets.has(71)&&!targets.has(66));
ctx.pent=true;targets=midiTargets(alto,ctx.barMeshes,ctx.isAllowed);assert.ok(targets.size<13);assert.ok([...targets.keys()].every(ctx.isAllowed));ctx.pent=false;
assert.equal(midiTargets(specs.find(s=>s.type==='bass'),ctx.barMeshes).size,0,'sequencer does not acquire extra playable pitches');
assert.deepEqual([...midiTargets({type:'drums'},[]).keys()],[36,38,39,42]);

// Real MIDI messages through mock Web MIDI input ports, including lifecycle races.
function port(id){return{id,name:'Keyboard '+id,state:'connected',onmidimessage:null,close:async()=>{},send(data){this.onmidimessage?.({data:new Uint8Array(data)});}};}
const a=port('a'),b=port('b'),access={inputs:new Map([['a',a]]),onstatechange:null};let options,ready=true,now=0,released=0;const played=[],feedback=[];
let inventory=new Map([[60,{type:'synth',midi:60,instrumentId:'synth'}],[62,{type:'xylophone',midi:62,instrumentId:'ax'}]]);
const recorder=new LoopRecorder({play:noop});recorder.startTake(0,{mode:'replace'});now=recorder.recordStart;recorder.tick(now);
const input=new MIDIInputController({navigator:{requestMIDIAccess:async value=>{options=value;return access;}},targets:()=>inventory,ready:()=>ready,feedback:m=>feedback.push(m),play:(target,velocity,token)=>{played.push({...target,velocity,token});const end=recorder.capture({...target,velocity,patch:SYNTH_DEFAULT},now);if(target.type==='synth')return()=>{released++;end(now);};}});
assert.equal(await input.connect(),true);assert.deepEqual(options,{sysex:false});assert.equal(input.port,a);
a.send([0x90,61,100]);a.send([0x90,59,100]);assert.equal(played.length,0);assert.equal(recorder.take.length,0,'unavailable pitches never enter recordings');
a.send([0x90,60,64]);assert.equal(played.at(-1).velocity,64/127);assert.equal(recorder.take.length,1);now+=.6;a.send([0x90,60,0]);assert.equal(released,1,'zero-velocity note-on is note-off');assert.ok(Math.abs(recorder.take[0].duration-1)<1e-8);
a.send([0x90,60,100]);a.send([0xb0,64,127]);a.send([0x80,60,0]);assert.equal(input.active.size,1);a.send([0xb0,64,0]);assert.equal(input.active.size,0,'pedal up releases held synth note');
a.send([0x90,60,100]);a.send([0x91,60,100]);assert.equal(input.active.size,2,'channels have independent holds');a.send([0xb0,123,0]);assert.equal(input.active.size,1);a.send([0xb1,120,0]);assert.equal(input.active.size,0);
a.send([0x90,60,100]);a.send([0x90,60,110]);assert.equal(input.active.size,1,'repeated key replaces its old voice');ready=false;a.send([0x80,60,0]);assert.equal(input.active.size,0,'note-offs still work while menus suspend note-ons');a.send([0x90,62,100]);assert.equal(input.active.size,0);ready=true;
const before=played.length;for(const message of [[0xe0,0,127],[0xc0,5],[0xf8],[0x90,60],[0x90,60,200]])a.send(message);assert.equal(played.length,before,'pitch bend/program/clock/malformed messages cannot extend the range');
a.send([0x90,60,100]);access.inputs.set('b',b);access.onstatechange();assert.equal(input.port,a,'plugging in another device does not change the active input');input.select('b');assert.equal(input.active.size,0);assert.equal(a.onmidimessage,null);b.send([0x90,60,100]);b.state='disconnected';access.onstatechange();assert.equal(input.active.size,0);assert.equal(input.port,null);b.state='connected';access.onstatechange();assert.equal(input.port,b);
b.send([0x90,60,100]);input.releaseAll();inventory=new Map([[62,{type:'xylophone',midi:62}]]);b.send([0x90,60,100]);assert.equal(input.active.size,0,'new instrument/tuning takes effect immediately');
input.disconnect();assert.equal(b.onmidimessage,null);assert.equal(input.enabled,false);
const unavailable=new MIDIInputController({navigator:{},targets:()=>inventory,play:noop});assert.equal(await unavailable.connect(),false);assert.match(unavailable.message,/unavailable/);
const denied=new MIDIInputController({navigator:{requestMIDIAccess:async()=>{throw{name:'NotAllowedError'};}},targets:()=>inventory,play:noop});assert.equal(await denied.connect(),false);assert.match(denied.message,/blocked/);
let resolve;const delayed=new MIDIInputController({navigator:{requestMIDIAccess:()=>new Promise(r=>resolve=r)},targets:()=>inventory,play:noop});const pending=delayed.connect();delayed.disconnect();resolve(access);assert.equal(await pending,false);assert.equal(delayed.enabled,false,'late permission must not re-enable disconnected input');
console.log('PASS: all 128 MIDI pitches against 13 physical bars in every key/mode; accidental replacements and 5-note filter; velocity/recording/duration; pedals/channels/note-offs; ignored pitch bend; disconnect/reconnect/permission lifecycle.');
