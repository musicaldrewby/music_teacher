import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../dist/vendor/three.module.js';
import {buildResonantInstrument} from '../dist/resonant-instruments.js';
import {ResonantVoice} from '../dist/resonant-voice.js';
import {findMalletStrike} from '../dist/mallets.js';
import {LoopRecorder,validateSong} from '../dist/recorder.js';
import {rollModel,PERCUSSION,ROLL} from '../dist/piano-roll.js';
import {InstrumentPlacement} from '../dist/room-tools.js';
import {optimizeRoom} from '../dist/performance.js';
const text=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
function fn(name){const start=text.search(new RegExp('^function '+name+'\\(', 'm'));assert.ok(start>=0,name);const rest=text.slice(start),end=rest.slice(1).search(/^(?:async )?function /m);return end<0?rest:rest.slice(0,end+1);}
const noop=()=>{},draw=new Proxy({},{get:()=>noop}),document={createElement:()=>({width:512,height:64,getContext:()=>draw})};
const ctx={THREE,document,instrumentPlacement:new InstrumentPlacement(),openInstrumentPicker:noop,goSongStation:noop,enterGallery:noop,openRoomTools:noop,openPerformance:noop,scene:new THREE.Scene(),c:{teal:0x214e51},clickable:[],barMeshes:[],current:{id:''},selectStation:noop,playNote:noop};vm.createContext(ctx);
for(const n of ['mat','box','cylinder','textPlane','label','noteName','stationGroup','makePlayable'])vm.runInContext(fn(n),ctx);
const gong={id:'gong',type:'gong',name:'Gong',x:3.9,z:8.1,rot:Math.PI};
const chimes={id:'windchimes',type:'windchimes',name:'Wind chimes',x:6,z:8.1,rot:Math.PI,midi:72,notes:[0,2,4,7,9,12]};
for(const s of [gong,chimes])buildResonantInstrument(s,ctx);
ctx.scene.updateMatrixWorld(true);for(const m of ctx.barMeshes)m.geometry.computeBoundingBox();
assert.equal(ctx.barMeshes.length,7);
for(const m of ctx.barMeshes){const from=m.localToWorld(new THREE.Vector3(0,m.userData.spec.type==='gong'?.4:0,m.userData.spec.type==='gong'?0:.2));const to=m.localToWorld(new THREE.Vector3(0,m.userData.spec.type==='gong'?.04:0,0));const strike=findMalletStrike(ctx.barMeshes,from,to,new Set(),1000);assert.equal(strike.hit,m,'each gong/tube independently reachable');assert.ok(strike.contacts.has(m));assert.equal(findMalletStrike(ctx.barMeshes,to,to,strike.contacts,1200).hit,null,'resting mallet does not retrigger');}
const disc=gong.resonantMeshes[0],outsideA=disc.localToWorld(new THREE.Vector3(.50,.4,.50)),outsideB=disc.localToWorld(new THREE.Vector3(.50,.04,.50));assert.equal(findMalletStrike([disc],outsideA,outsideB,new Set(),1300).hit,null,'gong corners outside the circular face do not sound');
globalThis.document=document;optimizeRoom(ctx.scene,new THREE.Group());for(const m of ctx.barMeshes)assert.ok(m.parent,'playable instruments survive room batching');
const played=[],recorder=new LoopRecorder({play:e=>played.push(e)});recorder.startTake(0,{mode:'replace',bars:4});const at=recorder.recordStart;recorder.tick(at);recorder.capture({type:'gong',instrumentId:'gong',velocity:.8},at+.1);recorder.capture({type:'windchimes',instrumentId:'windchimes',midi:79,velocity:.6},at+.4);recorder.finish(at+1);
const song=validateSong(recorder.snapshot('Chime loop'));assert.deepEqual(song.events.map(e=>e.instrumentId),['gong','windchimes']);const restored=new LoopRecorder({play:e=>played.push(e)});restored.load(song,10);restored.play(10);for(let t=10;t<11;t+=.04)restored.tick(t);assert.ok(played.some(e=>e.type==='gong'));assert.ok(played.some(e=>e.type==='windchimes'&&e.midi===79));assert.ok(rollModel(restored,11).counts.has('gong'));assert.ok(ROLL.drumTop+PERCUSSION.length*ROLL.drumHeight<=964,'gong lane remains within note wall');
// Exercise real sample loading and scheduling with a small Web Audio graph stub.
let failed=true;globalThis.fetch=async()=>{if(failed){failed=false;return {ok:false};}return {ok:true,arrayBuffer:async()=>new ArrayBuffer(16)};};
const nodes=[];function param(value=0){return {value,setValueAtTime(v,t){this.value=v;this.at=t;},cancelScheduledValues:noop,setTargetAtTime(v,t){this.target=v;this.at=t;}};}
function node(){const n={connections:[],connect(other){this.connections.push(other);},disconnect(){this.disconnected=true;}};nodes.push(n);return n;}
const audio={currentTime:2,decodeAudioData:async()=>({duration:11}),createGain:()=>Object.assign(node(),{gain:param()}),createBiquadFilter:()=>Object.assign(node(),{frequency:param(),Q:param()}),createBufferSource:()=>Object.assign(node(),{playbackRate:param(1),start(t){this.startAt=t;},stop(t){this.stopAt=t;}})};
const master=node(),reverb=node(),voice=new ResonantVoice(audio,master,reverb);await assert.rejects(voice.load());await voice.load();assert.equal(voice.buffers.size,2,'failed download can be retried');
const route={master:node(),reverb:node()};voice.play('windchimes',74,.4,3,route);const hit=[...voice.voices][0];assert.ok(Math.abs(hit.source.playbackRate.value-1)<.001,'D5 recording tuned to measured fundamental');assert.equal(hit.source.startAt,3);assert.ok(hit.gain.connections.includes(route.master),'playback uses part-mute gain');
voice.play('gong',60,.8,3);const live=[...voice.voices][1];voice.stopPlayback();assert.ok(hit.source.stopAt);assert.equal(live.source.stopAt,undefined,'playback stop leaves live acoustic tail alone');
for(let i=0;i<30;i++)voice.play('windchimes',72+i%12,.7,2);assert.ok(voice.voices.size<=20,'ringing voices bounded');
for(const n of nodes)if(n.onended)n.onended();assert.equal(voice.voices.size,0);assert.ok(hit.gain.disconnected);
console.log('PASS: gong/chime reach, isolated mallet hits, circular gong boundary, release/restrike, batching, recording roundtrip, note-wall lane, acoustic loading/retry, tuning, playback routing/stopping, bounded voices and cleanup.');
