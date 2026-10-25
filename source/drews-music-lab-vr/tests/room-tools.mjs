import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {SYNTH_DEFAULT} from '../dist/synth.js';
import {LoopRecorder} from '../dist/recorder.js';
import {InstrumentPlacement,FrameMonitor,recordingCue} from '../dist/room-tools.js';
import {findMalletStrike} from '../dist/mallets.js';
const noop=()=>{};
const original={beat:0,type:'xylophone',instrumentId:'ax',midi:60,velocity:.7,duration:.5};
const r=new LoopRecorder({play:noop});r.events=[{...original}];
const initial=r.snapshot();
// Replacing an existing song and undoing restores the entire previous song.
r.startTake(0,{mode:'replace'});r.tick(r.recordStart);r.capture({...original,midi:64},r.recordStart+.1);r.finish(r.recordStart+1);
assert.equal(r.events[0].midi,64);assert.ok(r.undoLastTake(8));assert.deepEqual(r.snapshot(),initial);assert.equal(r.state,'stopped');assert.equal(r.undoLastTake(8),false);
// Each overdub keeps just its preceding song, including earlier overdubs.
function overdub(midi,now){r.startTake(now,{mode:'overdub'});r.tick(r.recordStart);r.capture({...original,midi},r.recordStart+.1);r.finish(r.recordStart+.5);}
overdub(65,10);const beforeSecond=r.snapshot();overdub(67,20);assert.equal(r.events.length,3);assert.ok(r.undoLastTake(25));assert.deepEqual(r.snapshot(),beforeSecond);
// Undo works during an active take, without committing a held synth note.
r.startTake(30,{mode:'overdub'});r.tick(r.recordStart);const release=r.capture({...original,type:'synth',instrumentId:'synth',patch:SYNTH_DEFAULT,midi:69},r.recordStart+.1);assert.equal(r.activeCaptures.size,1);assert.ok(r.undoLastTake(r.recordStart+.2));release(r.recordStart+1);assert.deepEqual(r.snapshot(),beforeSecond);assert.equal(r.take.length,0);assert.equal(r.activeCaptures.size,0);
// Cancelling a count-in preserves the previous undo; loading and New Song invalidate it.
overdub(70,40);const saved=r.snapshot();r.startTake(41,{mode:'replace'});r.finish(41.1);assert.deepEqual(r.snapshot(),saved);assert.ok(r.undoLastTake(42));assert.deepEqual(r.snapshot(),beforeSecond);
overdub(71,50);r.load(initial,60);assert.equal(r.undoLastTake(61),false);overdub(72,70);r.clear(80);assert.equal(r.undoLastTake(81),false);
// Undo Note leaves recording active and removes the last input, not the last beat.
r.startTake(90,{mode:'overdub'});r.tick(r.recordStart);r.capture({...original,midi:73},r.recordStart+1);r.capture({...original,midi:74},r.recordStart+r.length+.1);assert.ok(r.removeLastNote());assert.equal(r.take[0].midi,73);assert.equal(r.state,'recording');

const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},placement=new InstrumentPlacement(storage);
const station={id:'ax',type:'xylophone',x:2,z:-1,rot:Math.PI/2,group:new THREE.Group()};
const bar=new THREE.Mesh(new THREE.BoxGeometry(.1,.08,.5),new THREE.MeshStandardMaterial());bar.position.y=1;bar.userData.spec=station;station.group.add(bar);bar.geometry.computeBoundingBox();
placement.change('ax','height',.15);placement.change('ax','reach',.2);placement.apply(station);
assert.ok(Math.abs(station.group.position.x-2.2)<1e-8);assert.equal(station.group.position.y,.15);
const from=bar.localToWorld(new THREE.Vector3(0,.2,0)),to=bar.localToWorld(new THREE.Vector3(0,0,0));assert.equal(findMalletStrike([bar],from,to,new Set(),1000).hit,bar,'mallets hit the moved geometry');
placement.change('ax','reach',99);assert.equal(placement.get('ax').reach,.25);assert.equal(new InstrumentPlacement(storage).get('ax').height,.15);placement.change('ax','reset',0);assert.deepEqual(placement.get('ax'),{height:0,reach:0});
assert.deepEqual(new InstrumentPlacement({getItem:()=>'{bad'}).get('ax'),{height:0,reach:0});assert.equal(new InstrumentPlacement({setItem:()=>{throw Error();}}).change('ax','height',.05),false);
const monitor=new FrameMonitor();for(let i=0;i<=100;i++)monitor.sample(i*1000/90,'VR');assert.ok(Math.abs(monitor.report().fps-90)<.01);assert.ok(monitor.report().p95<11.12);monitor.sample(2000,'Desktop');assert.equal(monitor.report(),null,'VR and desktop results never mix');for(let i=0;i<=60;i++)monitor.sample(2000+i*1000/60,'Desktop');assert.ok(Math.abs(monitor.report().fps-60)<.01);monitor.sample(3400,'Desktop');assert.ok(monitor.report().fps<60,'slow frames are included');monitor.reset();assert.equal(monitor.report(),null,'visibility changes reset the sample');
const connections=[],param={setValueAtTime:noop,linearRampToValueAtTime:noop};const oscillator={frequency:param,connect:n=>connections.push(n),start:noop,stop:noop,disconnect:noop},gain={gain:param,connect:n=>connections.push(n),disconnect:noop},master={};recordingCue({ctx:{state:'running',currentTime:1,createOscillator:()=>oscillator,createGain:()=>gain},master,play:()=>{throw Error('Cue must not be a recorded note');}},true);assert.equal(connections[1],master);oscillator.onended();
console.log('PASS: undo replacement/overdubs/active take, count-in cancellation, new-song boundaries, latest note order, placement persistence/limits/collision, frame measurements, unrecorded cue.');
