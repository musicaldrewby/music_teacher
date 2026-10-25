// Deterministic audio-clock tests; no browser or audio device required.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const elements=new Map(),voices=[],events=[],intervals=[],listeners=new Map(),deferred=new Map();let audio;const gains=[];
function el(id){if(!elements.has(id))elements.set(id,{setAttribute(){},addEventListener(){},classList:{toggle(){}},value:65});return elements.get(id)}
function gain(){const node={connections:[],gain:{value:1,cancelScheduledValues(){},setValueAtTime(v){this.value=v},linearRampToValueAtTime(v){this.value=v},setTargetAtTime(v){this.value=v}},connect(n){this.connections.push(n)},disconnect(n){this.connections=this.connections.filter(x=>x!==n)}};gains.push(node);return node;}
class Audio{constructor(){this.currentTime=0;this.state='running';this.destination={speaker:true};audio=this}createGain(){return gain()}createMediaStreamDestination(){const track={stops:0,stop(){this.stops++}};return{stream:{getTracks:()=>[track]}}}async decodeAudioData(){return{duration:9.6}}createBufferSource(){const v={connect(){},disconnect(){},start(at,offset){this.at=at;this.offset=offset},stop(at){this.stoppedAt=at}};voices.push(v);return v}}
const window={AudioContext:Audio,dispatchEvent(e){events.push(e);for(const f of listeners.get(e.type)||[])f(e)},addEventListener(k,f){if(!listeners.has(k))listeners.set(k,[]);listeners.get(k).push(f)}};
const document={hidden:false,getElementById:el,querySelectorAll:()=>[],addEventListener(){}};
const context=vm.createContext({window,document,localStorage:{getItem:()=>null,setItem(){}},performance:{now:()=>0},CustomEvent:class{constructor(type,{detail}){this.type=type;this.detail=detail}},setInterval:f=>intervals.push(f),fetch:async url=>{if(deferred.has(url))await deferred.get(url).promise;return{ok:true,arrayBuffer:async()=>new ArrayBuffer(1)}}});
vm.runInContext(fs.readFileSync('dist/pattern-engine.js','utf8'),context);
const engine=window.MovementMusic,settle=()=>new Promise(r=>setImmediate(r));
function step(t){audio.currentTime=t;intervals.forEach(f=>f())}
const commits=()=>events.filter(e=>e.type==='movementcommitted').map(e=>e.detail.id);
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
(async()=>{
 await engine.requestMotion('walk');await settle();near(voices[0].at,.06);assert.equal(commits().length,0);step(.059);assert.equal(commits().length,0);step(.06);assert.equal(commits().at(-1),'walk');
 step(.9);await engine.requestMotion('jog');const jog=voices.at(-1);near(jog.at,2.46);near(jog.offset,2.4);assert.equal(commits().at(-1),'walk');step(2.459);assert.equal(commits().at(-1),'walk');step(2.46);assert.equal(commits().at(-1),'jog');
 step(2.8);await engine.requestMotion('skip');const skip=voices.at(-1);await engine.requestMotion('gallop');assert(skip.stoppedAt<skip.at,'superseded queued source is canceled');near(voices.at(-1).at,4.86);step(4.86);assert.equal(commits().at(-1),'gallop');assert(!commits().includes('skip'));
 step(5.1);await engine.requestMotion('stop');assert.equal(commits().at(-1),'gallop');step(7.26);assert.equal(commits().at(-1),'stop');
 step(7.4);await engine.requestMotion('hop');near(voices.at(-1).at,9.66);near(voices.at(-1).offset,0);assert.equal(voices.at(-1).loopEnd,9.6);step(9.66);assert.equal(commits().at(-1),'hop');assert.equal(events.filter(e=>e.type==='movementclock').at(-1).detail.bar,1,'four-measure counter wraps to one');
 step(10);await engine.requestMotion('march');const march=voices.at(-1);engine.stop();assert(march.stoppedAt<march.at);assert.equal(commits().at(-1),'stop');step(12.06);assert.equal(commits().at(-1),'stop');
 el('musicToggle').onclick();await engine.requestMotion('walk');step(12.1201);assert.equal(commits().at(-1),'walk');step(12.7);await engine.requestMotion('slide');step(14.519);assert.equal(commits().at(-1),'walk');step(14.5201);assert.equal(commits().at(-1),'slide','muted mode still follows measures');
 const prepared=await engine.prepare();assert.equal(prepared,audio);assert.equal(engine.clock(),audio.currentTime);engine.setRandomSeed(4);engine.setRandomSeed(null);
 // Fresh context with a slow asset: do not schedule until loaded; stop wins the race.
 let release;const slow=new Promise(r=>release=r);const ctx2=vm.createContext({...context,window:{...window},fetch:async()=>{await slow;return{ok:true,arrayBuffer:async()=>new ArrayBuffer(1)}}});
 vm.runInContext(fs.readFileSync('dist/pattern-engine.js','utf8'),ctx2);const e2=ctx2.window.MovementMusic;const work=e2.requestMotion('tiptoe');await settle();e2.stop();const count=voices.length;release();await work;await settle();assert.equal(voices.length,count,'late audio load cannot override immediate STOP');
 console.log('PASS: exact bar scheduling, phase offsets, queued-light timing, latest selection wins, quantized red, frozen measures, immediate override, muted clock, load cancellation.');
})().catch(e=>{console.error(e);process.exitCode=1});
