import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const code=fs.readFileSync(new URL('../dist/beach-audio.js',import.meta.url),'utf8');
const flush=async()=>{for(let i=0;i<15;i++)await Promise.resolve();};
function harness({blockAutoplay=false,failDownload=false,delayed=false,reduced=false,sceneReady=true}={}){
 class Target{
  handlers=new Map();attributes={};classes=new Set();
  classList={add:n=>this.classes.add(n),remove:n=>this.classes.delete(n),contains:n=>this.classes.has(n)};
  addEventListener(name,fn){this.handlers.set(name,[...(this.handlers.get(name)||[]),fn]);}
  emit(name,event={}){for(const fn of this.handlers.get(name)||[])fn(event);}
  setAttribute(name,value){this.attributes[name]=value;}
 }
 class Param{value=0;ramps=[];cancelAndHoldAtTime(){}linearRampToValueAtTime(value,time){this.value=value;this.ramps.push({value,time});}}
 const state={elapsed:0,ready:sceneReady,gesture:false,unlocked:!blockAutoplay,media:[],contexts:[],events:[],downloads:[],pending:[],failDownload};
 const timers=new Map();let nextTimer=0;
 const button=new Target(),icon=new Target(),toast=new Target(),document=new Target(),window=new Target(),motion=new Target();
 motion.matches=reduced;document.documentElement=new Target();
 document.hidden=false;document.getElementById=id=>({beachToggle:button,beachIcon:icon,toast})[id];
 class Context extends Target{
  currentTime=1;state='suspended';gains=[];mediaSources=0;destination={};
  constructor(){super();state.contexts.push(this);}
  createGain(){const node={gain:new Param(),connect(){}};this.gains.push(node);return node;}
  createMediaElementSource(){this.mediaSources++;return {connect(){}};}
  resume(){if(state.gesture)state.unlocked=true;if(!state.unlocked)return Promise.reject(Object.assign(Error(),{name:'NotAllowedError'}));this.state='running';return Promise.resolve();}
  suspend(){this.state='suspended';return Promise.resolve();}
 }
 class Media extends Target{
  paused=true;_time=0;playCalls=0;error=null;readyState=0;duration=480;_src='';
  constructor(){super();state.media.push(this);assert.equal(state.media.length,1);}
  set currentTime(value){state.events.push(['seek',value]);this._time=value;}
  get currentTime(){return this._time;}
  set src(value){assert.equal(this.paused,true);state.events.push(['source',value]);this._src=value;}
  get src(){return this._src;}
  load(){state.events.push(['load']);this._time=0;this.readyState=1;this.emit('loadedmetadata');}
  play(){
   this.playCalls++;state.events.push(['play']);
   if(!state.unlocked)return Promise.reject(Object.assign(Error(),{name:'NotAllowedError'}));
   this.paused=false;this.readyState=4;this.emit('playing');return Promise.resolve();
  }
  pause(){state.events.push(['pause']);this.paused=true;}
 }
 window.AudioContext=Context;window.ARCADE_DAY_NIGHT={ready:()=>state.ready,read:()=>({phase:motion.matches?null:state.elapsed%80000,elapsed:state.elapsed})};
 vm.runInNewContext(code,{window,document,Audio:Media,matchMedia:()=>motion,
  fetch:url=>{state.downloads.push(url);const resolve=()=>state.failDownload?Promise.reject(Error('offline')):Promise.resolve({ok:true,blob:()=>Promise.resolve(url)});return delayed?new Promise((yes,no)=>state.pending.push(()=>resolve().then(yes,no))):resolve();},
  URL:{createObjectURL:blob=>'blob:'+blob},
  getComputedStyle(){throw Error('Audio must not force style recalculation');},
  setInterval(){throw Error('Steady playback must not poll or schedule fades');},
  setTimeout:(fn,delay)=>{const id=++nextTimer;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id)
 });
 return {state,document,window,button,toast,motion,
  get audio(){return state.media[0];},get context(){return state.contexts[0];},get level(){return this.context.gains[0].gain.value;},
  async advance(ms){state.elapsed+=ms;if(!this.audio.paused)this.audio._time=(this.audio._time+ms/1000)%480;await flush();},
  async gesture({speaker=false,key=null}={}){state.gesture=true;const event={target:{closest:()=>speaker?button:null},key,type:key?'keydown':'click'};document.emit(event.type,event);if(speaker)button.emit('click');state.gesture=false;await flush();},
  async finishFades(){for(const [id,{fn,delay}] of [...timers])if(delay<=500){timers.delete(id);fn();}await flush();},
  async visible(visible){document.hidden=!visible;document.emit('visibilitychange');await flush();},
  async paused(value){document.documentElement.classList[value?'add':'remove']('motion-paused');window.emit('arcade:motionchange');await flush();},
  async reduced(value){motion.matches=value;motion.emit('change');await flush();},
  async release(){for(const fn of state.pending.splice(0))fn();await flush();}
 };
}
const h=harness();await flush();
assert.match(h.audio.src,/arcade-day-night.mp3$/);assert.equal(h.audio.paused,false);assert.equal(h.level,1);
const events=h.state.events.length,ramps=h.context.gains[0].gain.ramps.length;
for(let i=0;i<12*800;i++)await h.advance(100);
assert.equal(h.state.events.length,events,'12 dusk/dawn cycles cause no reload, seek, pause, or play');
assert.equal(h.context.gains[0].gain.ramps.length,ramps,'all day/night fades are already in the recording');
assert.equal(h.state.downloads.length,1,'no network requests at any transition');
assert.equal(h.state.media.length,1);assert.equal(h.context.mediaSources,1);
await h.gesture({speaker:true});await h.finishFades();assert.equal(h.audio.paused,true);assert.equal(h.context.state,'suspended');
await h.advance(45000);await h.gesture();assert.equal(h.audio.paused,true,'mute survives unrelated gestures');
await h.gesture({speaker:true});assert.equal(h.audio.paused,false);assert.equal(h.audio.currentTime,45,'resume aligns to scene time');
await h.gesture({speaker:true});await h.gesture({speaker:true});assert.equal(h.level,1,'quick mute/unmute restores volume before delayed pause');
await h.visible(false);await h.finishFades();assert.equal(h.audio.paused,true);
await h.visible(true);assert.equal(h.audio.paused,false);
await h.paused(true);await h.finishFades();assert.equal(h.audio.paused,true);assert.match(h.button.title,/paused with animation/);
await h.paused(false);assert.equal(h.audio.paused,false);
h.window.emit('pagehide');await h.finishFades();assert.equal(h.audio.paused,true);
await h.gesture();assert.equal(h.audio.paused,true);
h.window.emit('pageshow',{persisted:true});await flush();assert.equal(h.audio.paused,false);
await h.reduced(true);assert.match(h.audio.src,/arcade-beach.mp3$/);assert.equal(h.audio.paused,false);
await h.paused(true);assert.equal(h.audio.paused,false,'reduced motion keeps static beach ambience');
await h.reduced(false);assert.equal(h.audio.paused,true,'animated soundtrack respects a paused scene');
await h.paused(false);assert.match(h.audio.src,/arcade-day-night.mp3$/);assert.equal(h.state.downloads.length,2,'preference changes reuse cached recordings');
const blocked=harness({blockAutoplay:true});await flush();assert.equal(blocked.audio.paused,true);
const denied=blocked.audio.playCalls;await blocked.advance(45000);assert.equal(blocked.audio.playCalls,denied);
await blocked.gesture({key:'Enter'});assert.equal(blocked.audio.paused,false);assert.equal(blocked.audio.currentTime,45,'autoplay unlock uses the current scene, not the rejected start time');
h.context.state='interrupted';h.context.emit('statechange');await h.advance(4000);h.audio._time-=4;
h.context.state='running';h.context.emit('statechange');assert.equal(h.audio.currentTime,(h.state.elapsed/1000)%480,'device interruption recovers alignment');
const slow=harness({delayed:true});await flush();await slow.advance(41000);await slow.release();assert.equal(slow.audio.currentTime,41,'slow initial download starts at the current scene');
const mutedLoad=harness({delayed:true});await flush();await mutedLoad.gesture({speaker:true});await mutedLoad.release();assert.equal(mutedLoad.audio.paused,true);
await mutedLoad.advance(45000);await mutedLoad.gesture({speaker:true});assert.equal(mutedLoad.audio.currentTime,45);
const pending=harness({sceneReady:false});await flush();assert.equal(pending.state.downloads.length,0,'wait for visual initialization before choosing a soundtrack');
pending.state.ready=true;pending.window.emit('arcade:scene-ready');await flush();assert.equal(pending.audio.paused,false);
const failed=harness({failDownload:true});await flush();assert.equal(failed.audio.paused,true);assert.match(failed.toast.textContent,/could not load/);
failed.state.failDownload=false;await failed.gesture();assert.equal(failed.audio.paused,false,'failed download can retry from a gesture');
console.log('Continuous audio checks passed: 12 cycles without reloads/seeks/network/gain writes; single player; mute, quick resume, visibility, motion, reduced motion, delayed loading, autoplay and retry.');
