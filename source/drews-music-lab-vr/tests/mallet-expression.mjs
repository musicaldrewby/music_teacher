import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../dist/vendor/three.module.js';
import {malletVelocity,malletImpactVelocity,malletFeedback,deliberateMalletStrike} from '../dist/mallets.js';
import {MusicAudio} from '../dist/audio.js';
import {LoopRecorder} from '../dist/recorder.js';
const from=new THREE.Vector3(0,1,0),velocities=[.2,.8,1.6,3].map(malletVelocity);
assert.ok(velocities[0]<.3&&velocities[3]>.99,'audible soft taps and full accents');
for(let i=1;i<velocities.length;i++)assert.ok(velocities[i]>velocities[i-1]);
for(const speed of [-1,0,NaN,Infinity,20])assert.ok(malletVelocity(speed)>=.12&&malletVelocity(speed)<=1);
for(const hz of [60,72,90,120]){
 const dt=1/hz,to=from.clone().add(new THREE.Vector3(0,-.8*dt,0));
 assert.ok(Math.abs(malletImpactVelocity('xylophone',from,to,dt)-malletVelocity(.8))<1e-10,'frame-rate independent strength');
 assert.ok(deliberateMalletStrike('xylophone',from,to,dt));
 const sideways=to.clone().add(new THREE.Vector3(.015,0,0));
 assert.equal(malletImpactVelocity('xylophone',from,sideways,dt),malletImpactVelocity('xylophone',from,to,dt),'sideways motion cannot inflate bar strength');
}
assert.equal(deliberateMalletStrike('xylophone',from,from.clone().add(new THREE.Vector3(.02,0,0)),1/90),false,'side brushes remain rejected');
const pulses=[],controller={userData:{source:{gamepad:{hapticActuators:[{pulse:(strength,ms)=>{pulses.push([strength,ms]);return Promise.resolve();}}]}}}};
malletFeedback(controller,velocities[0]);malletFeedback(controller,velocities[3]);assert.ok(pulses[1][0]>pulses[0][0]&&pulses[1][1]>pulses[0][1]);
assert.doesNotThrow(()=>malletFeedback({userData:{}},.8));controller.userData.source.gamepad.hapticActuators[0].pulse=()=>{throw Error('unsupported');};assert.doesNotThrow(()=>malletFeedback(controller,.8));
// Compare actual tone partials: loud strikes change timbre as well as gain.
const audio=new MusicAudio();audio.ctx={state:'running',currentTime:0};audio.burst=()=>{};
for(const type of ['xylophone','metallophone','glockenspiel','boomwhacker']){
 let tones=[];audio.tone=(...args)=>tones.push(args);audio.play(type,60,velocities[0]);const soft=tones;tones=[];audio.play(type,60,velocities[3]);const hard=tones;
 assert.ok(hard[0][3]>soft[0][3]);assert.ok(hard[1][3]/hard[0][3]>soft[1][3]/soft[0][3],'accent has a brighter overtone balance');
}
// Synth contact opens once, holds, and releases without repeat attacks.
const source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const start=source.indexOf('function updateSynthMallet('),end=source.indexOf('\nfunction ',start+1);
const holds=new Map(),notes=[],key={userData:{spec:{type:'synth'},midi:60},position:{y:1}},con={userData:{malletToken:'left',contacts:new Set()}};
const context={synthHolds:holds,isAllowed:()=>true,malletVelocity,malletStillTouches:()=>false,releaseSynth:t=>holds.delete(t),holdSynth:(t,m,v,velocity)=>{notes.push(velocity);holds.set(t,{visual:v});return true;}};
vm.createContext(context);vm.runInContext(source.slice(start,end),context);
assert.ok(context.updateSynthMallet(con,{hit:key,contacts:new Set([key])},from,.2));
assert.equal(context.updateSynthMallet(con,{hit:null,contacts:new Set([key])},from,2),false);assert.equal(notes.length,1);assert.equal(notes[0],velocities[0]);
context.updateSynthMallet(con,{hit:null,contacts:new Set()},from,0);assert.equal(holds.size,0);
// Capture, save/load, and replay preserve the exact strike strengths.
const recorded=new LoopRecorder({play:()=>{}});recorded.startTake(0,{mode:'replace'});recorded.tick(recorded.recordStart);
velocities.forEach((velocity,i)=>recorded.capture({type:'xylophone',instrumentId:'ax',midi:60+i*2,velocity},recorded.recordStart+.2+i*.3));recorded.finish(recorded.recordStart+2);
const played=[],replay=new LoopRecorder({play:e=>played.push(e.velocity)});replay.load(recorded.snapshot(),0);assert.deepEqual(replay.events.map(e=>e.velocity),velocities);replay.play(0);for(let t=0;t<2;t+=.025)replay.tick(t);assert.deepEqual(played,velocities);
console.log('PASS: mallet dynamics across frame rates, directional accents, haptics fallback, brighter tone, sustained synth contact and recorded/playback strength.');
