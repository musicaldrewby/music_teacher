// Stop is one strike: quantized in normal use, immediate for Freeze now,
// silent for settings/visibility, and unable to arrive late over a new motion.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('dist/pattern-engine.js','utf8');
const settle=()=>new Promise(r=>setImmediate(r));
function harness(slow=false){
 const elements=new Map(),voices=[],events=[],intervals=[];let audio,release;
 const loading=new Promise(r=>release=r);
 const element=id=>{if(!elements.has(id))elements.set(id,{setAttribute(){},addEventListener(){},classList:{toggle(){}},value:65});return elements.get(id)};
 const gain=()=>({gain:{setValueAtTime(){},linearRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(){}},connect(){},disconnect(){}});
 class Audio{
  constructor(){audio=this;this.currentTime=0;this.state='running'}createGain(){return gain()}
  async decodeAudioData(data){return{duration:data.stop?4.8:9.6,stop:data.stop}}
  createBufferSource(){const v={connect(){},disconnect(){},start(at,offset){this.at=at;this.offset=offset},stop(at){this.stoppedAt=at}};voices.push(v);return v}
 }
 const document={hidden:false,getElementById:element,querySelectorAll:()=>[],addEventListener(){}};
 const window={AudioContext:Audio,dispatchEvent:e=>events.push(e)};
 vm.runInNewContext(source,{window,document,localStorage:{getItem:()=>null,setItem(){}},performance:{now:()=>0},CustomEvent:class{constructor(type,{detail}){this.type=type;this.detail=detail}},setInterval:f=>intervals.push(f),fetch:async url=>{if(slow)await loading;return{ok:true,arrayBuffer:async()=>({stop:url.includes('/stop.')})}}});
 return{engine:window.MovementMusic,document,element,voices,events,release,step:t=>{audio.currentTime=t;intervals.forEach(f=>f())}};
}
(async()=>{
 const h=harness();await h.engine.requestMotion('walk');await settle();h.step(.06);h.step(.7);
 await h.engine.requestMotion('stop');const cue=h.voices.at(-1);
 assert.equal(cue.loop,false);assert.equal(cue.buffer.duration,4.8);assert.equal(cue.offset,0);assert(Math.abs(cue.at-2.46)<1e-6);
 h.step(2.459);assert.equal(h.events.filter(e=>e.type==='movementcommitted').at(-1).detail.id,'walk');h.step(2.46);
 const count=h.voices.length;h.step(12);assert.equal(h.voices.length,count,'red does not retrigger its chord');
 await h.engine.requestMotion('jog');h.step(12.06);await h.engine.requestMotion('stop',{immediate:true});
 assert.equal(h.events.filter(e=>e.type==='movementcommitted').at(-1).detail.id,'stop','Freeze light commits synchronously');
 await settle();assert.equal(h.voices.length,count+2);assert.equal(h.voices.at(-1).loop,false);
 const afterFreeze=h.voices.length;await h.engine.requestMotion('stop',{immediate:true,silent:true});await settle();assert.equal(h.voices.length,afterFreeze,'settings stop is silent');
 h.element('musicToggle').onclick();await h.engine.requestMotion('stop',{immediate:true});await settle();assert.equal(h.voices.length,afterFreeze,'muting also mutes Stop');
 const p=harness();await p.element('musicTrackList').onclick({target:{closest:()=>({dataset:{preview:'stop'}})}});assert.equal(p.voices.at(-1).loop,false);
 p.voices.at(-1).onended();assert(!p.element('musicStatus').textContent.startsWith('Preview:'),'one-shot preview clears itself');
 const slow=harness(true);await slow.engine.requestMotion('stop',{immediate:true});await settle();slow.engine.stop();slow.release();await settle();await settle();assert.equal(slow.voices.length,0,'silent stop cancels late cue load');
 const held=harness();await held.engine.requestMotion('walk');held.step(.06);held.step(.5);await held.engine.requestMotion('jog');
 const commits=held.events.filter(e=>e.type==='movementcommitted').length;held.engine.hold();held.step(3);
 assert.equal(held.events.filter(e=>e.type==='movementcommitted').length,commits,'holding cancels queued changes without replacing the current cue');
 assert(held.voices.every(v=>v.stoppedAt!==undefined),'holding stops active and queued music');
 assert.equal(held.events.filter(e=>e.type==='movementclock').at(-1).detail.running,false);
 await held.engine.requestMotion('walk');held.step(3.06);assert.equal(held.events.filter(e=>e.type==='movementcommitted').at(-1).detail.id,'walk','held motion can restart');
 // Stop resets the next pattern to bar one, including after a non-four-bar freeze.
 const reset=harness();await reset.engine.requestMotion('walk');reset.step(.06);reset.step(.7);await reset.engine.requestMotion('stop');reset.step(2.46);
 reset.step(2.9);await reset.engine.requestMotion('jog');const cancelled=reset.voices.at(-1);reset.engine.cancelQueue();assert(cancelled.stoppedAt<cancelled.at);
 reset.step(5);await reset.engine.requestMotion('skip');const resumed=reset.voices.at(-1);assert(Math.abs(resumed.at-7.26)<1e-6,'restart still waits for a downbeat');assert.equal(resumed.offset,0,'first movement after Stop starts at measure one');reset.step(7.26);assert.equal(reset.events.filter(e=>e.type==='movementclock').at(-1).detail.bar,1);
 reset.step(7.7);await reset.engine.requestMotion('jog');assert(Math.abs(reset.voices.at(-1).offset-2.4)<1e-6,'direct movement changes retain musical phase');
 const muted=harness();await muted.engine.requestMotion('walk');muted.step(.06);muted.element('musicToggle').onclick();muted.step(.7);await muted.engine.requestMotion('stop');muted.step(2.46);muted.step(5);await muted.engine.requestMotion('jog');muted.step(7.26);assert.equal(muted.events.filter(e=>e.type==='movementclock').at(-1).detail.bar,1,'muted measure clock also restarts');
 console.log('PASS: one-shot Stop, immediate override, post-Stop measure-one restart, retained downbeat timing, canceled restart, direct-change continuity, muted restart and late-load cancellation.');
})().catch(e=>{console.error(e);process.exitCode=1});
