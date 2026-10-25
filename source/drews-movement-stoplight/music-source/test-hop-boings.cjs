const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const code=fs.readFileSync('dist/pattern-engine.js','utf8'),settle=()=>new Promise(r=>setImmediate(r));
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function harness({slow=false}={}){
 const elements=new Map(),voices=[],gains=[],events=[],intervals=[],domListeners={};let audio,release,randomIndex=0;
 const loading=new Promise(r=>release=r),fakeMath=Object.create(Math);fakeMath.random=()=>[.02,.30,.61,.95,.61,.02,.95,.30][randomIndex++%8];
 function element(id){if(!elements.has(id))elements.set(id,{setAttribute(){},addEventListener(){},classList:{toggle(){}},value:65});return elements.get(id)}
 function gain(){const g={gain:{value:1,setValueAtTime(v){this.value=v},linearRampToValueAtTime(v){this.value=v},cancelScheduledValues(){},setTargetAtTime(v){this.value=v}},connect(n){this.target=n},disconnect(){}};gains.push(g);return g}
 class Audio{
  constructor(){audio=this;this.currentTime=0;this.state='running'}createGain(){return gain()}
  async decodeAudioData(data){const match=data.url.match(/hop-samples\/b(\d)/);return{duration:match?.5:data.url.includes('/stop.')?4.8:9.6,sample:match?Number(match[1]):null}}
  createBufferSource(){const v={connect(n){this.target=n},disconnect(){},start(at,offset){this.at=at;this.offset=offset},stop(at){this.stoppedAt=at}};voices.push(v);return v}
 }
 const document={hidden:false,getElementById:element,querySelectorAll:()=>[],addEventListener:(name,fn)=>domListeners[name]=fn};
 const window={AudioContext:Audio,dispatchEvent:e=>events.push(e)};
 vm.runInNewContext(code,{Math:fakeMath,window,document,localStorage:{getItem:()=>null,setItem(){}},performance:{now:()=>0},CustomEvent:class{constructor(type,{detail}){this.type=type;this.detail=detail}},setInterval:f=>intervals.push(f),fetch:async url=>{if(slow&&url.includes('hop-samples'))await loading;return{ok:true,arrayBuffer:async()=>({url})}}});
 function step(t){audio.currentTime=t;intervals.forEach(f=>f());for(const v of voices){if(!v.ended&&((v.stoppedAt!==undefined&&v.stoppedAt<=t)||(!v.loop&&v.at+v.buffer.duration<=t))){v.ended=true;v.onended?.();}}}
 return{engine:window.MovementMusic,document,element,voices,gains,events,release,step,advance(to){for(let t=audio.currentTime+.01;t<to;t+=.01)step(t);step(to)},boings:()=>voices.filter(v=>v.buffer.sample),hide(){document.hidden=true;domListeners.visibilitychange()}};
}
(async()=>{
 const h=harness();await h.engine.requestMotion('hop');await settle();h.advance(19.27);
 const heard=h.boings().filter(v=>v.at<=19.27);assert.equal(heard.length,33,'one boing per beat across two loop wraps');
 heard.forEach((v,i)=>{near(v.at,.06+i*.6);assert.equal(v.loop,false);assert.equal(v.target.target.target,h.gains[0],'effect follows music master gain')});
 assert.equal(new Set(heard.map(v=>v.buffer.sample)).size,4,'all four samples selectable');
 assert.notEqual(heard[0].buffer.sample,heard[4].buffer.sample,'selection is made per beat, not a fixed phrase');
 h.element('musicToggle').onclick();assert.equal(h.gains[0].gain.value,0,'mute controls boings too');h.element('musicToggle').onclick();assert(h.gains[0].gain.value>0);
 h.engine.stop();const count=h.boings().length;h.advance(22);assert.equal(h.boings().length,count,'no beats after immediate freeze');
 assert(heard.every(v=>v.ended||v.stoppedAt!==undefined));
 const transition=harness();await transition.engine.requestMotion('hop');await settle();transition.advance(1);await transition.engine.requestMotion('walk');transition.advance(4);
 assert(transition.boings().every(v=>v.at<2.46),'boings stop at the next measure when switching');
 const canceled=harness();await canceled.engine.requestMotion('walk');await settle();canceled.advance(2.39);await canceled.engine.requestMotion('hop');const canceledBeat=canceled.boings()[0];assert(canceledBeat,'queued Hop pre-schedules its first beat');await canceled.engine.requestMotion('jog');canceled.advance(4);assert(canceledBeat.stoppedAt<canceledBeat.at,'canceling queued Hop cancels its scheduled boing');assert.equal(canceled.boings().length,1);
 const retained=harness();await retained.engine.requestMotion('hop');await settle();retained.advance(.7);await retained.engine.requestMotion('walk');await retained.engine.requestMotion('hop');retained.advance(3);assert(retained.boings().some(v=>Math.abs(v.at-2.46)<1e-6),'canceling an exit restores Hop beats');
 const preview=harness();await preview.element('musicTrackList').onclick({target:{closest:()=>({dataset:{preview:'hop'}})}});preview.advance(2);assert.equal(preview.boings().filter(v=>v.at<=2).length,4);near(preview.boings()[0].at,.03);preview.hide();const previewCount=preview.boings().length;preview.advance(4);assert.equal(preview.boings().length,previewCount,'hiding the page stops preview boings');
 const delayed=harness({slow:true});const work=delayed.engine.requestMotion('hop');await settle();delayed.engine.stop();delayed.release();await work;await settle();assert.equal(delayed.voices.length,0,'late sample loads cannot override freeze');
 const stalled=harness();await stalled.engine.requestMotion('hop');await settle();stalled.step(5);assert(stalled.boings().length<=2,'a stalled tab never plays a burst of missed beats');
 console.log('PASS: random sample selection, exact beat grid over loop wraps, shared mute/volume, freeze/transition cancellation, preview, visibility, late loading, no catch-up bursts.');
})().catch(e=>{console.error(e);process.exitCode=1});
