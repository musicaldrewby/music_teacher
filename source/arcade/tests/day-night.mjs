import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const code=fs.readFileSync(new URL('../dist/day-night.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../dist/style.css',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};

function harness({failImage=false,reduced=false}={}){
 const listeners=new Map(),images=[],classes=new Set();
 const state={cycle:{animationName:'seaside-night',currentTime:0,playState:'running'},animationReads:0};
 const motion={matches:reduced,addEventListener:(name,fn)=>listeners.set('motion:'+name,fn)};
 const night={
  getAnimations(){state.animationReads++;return motion.matches?[]:[state.cycle];},
  addEventListener:(name,fn)=>listeners.set(name,fn)
 };
 const room={querySelector:()=>night,classList:{add:name=>classes.add(name)}};
 class Image{
  constructor(){images.push(this);}
  set src(value){this.url=value;}
  decode(){this.decoded=true;return Promise.resolve();}
 }
 const window={dispatchEvent(){}};
 vm.runInNewContext(code,{
  window,Image,Event,matchMedia:()=>motion,
  document:{hidden:false,querySelector:()=>room,documentElement:{classList:{toggle(){}}}},
  getComputedStyle(){throw Error('Scene timing must not read computed styles');}
 });
 return {
  state,classes,images,window,
  read:()=>window.ARCADE_DAY_NIGHT.read(),
  at(time){state.cycle.currentTime=time;return this.read();},
  async load(){for(const image of images)failImage?image.onerror():image.onload();await flush();},
  reduced(value){motion.matches=value;listeners.get('motion:change')();},
  restart(cycle){state.cycle=cycle;listeners.get('animationstart')({animationName:'seaside-night'});}
 };
}

// Guard the shared timing contract: audio must match these visual keyframes.
assert.match(css,/\.day-night-ready \.room-image-night\{animation:seaside-night 80s ease-in-out infinite\}/);
assert.match(css,/@keyframes seaside-night\{0%,37\.5%\{opacity:0\}50%,87\.5%\{opacity:1\}100%\{opacity:0\}\}/);
assert.ok(html.indexOf('src="day-night.js')<html.indexOf('src="beach-audio.js'));

const h=harness();
assert.equal(h.read().mix,0,'daylight until both paintings are decoded');
await h.load();
assert.ok(h.classes.has('day-night-ready'));
assert.ok(h.images.every(image=>image.decoded));
for(const [time,mix] of [[0,0],[30000,0],[35000,.5],[40000,1],[55000,1],[70000,1],[75000,.5],[80000,0],[115000,.5]]){
 assert.ok(Math.abs(h.at(time).mix-mix)<.00001,`light and sound match at ${time} ms`);
}
assert.ok(Math.abs(h.at(32500).mix-.12916193)<.00001,'quarter fade follows CSS ease-in-out');
let last=0;
for(let time=30000;time<=40000;time+=10){
 const {mix}=h.at(time);
 assert.ok(mix>=last&&mix-last<.002&&mix<=1,'dusk is continuous and monotonic');last=mix;
 assert.ok(Math.abs(mix+h.at(time+40000).mix-1)<.00001,'dawn mirrors dusk');
}
assert.ok(h.at(79999).mix<.00001&&h.at(80000).mix===0,'no jump at the loop boundary');
const reads=h.state.animationReads;
h.at(37000);h.state.cycle.playState='paused';
const paused=h.read().mix;
for(let i=0;i<100;i++)assert.equal(h.read().mix,paused,'paused CSS animation holds the audio level');
assert.equal(h.state.animationReads,reads,'sampling reuses the animation without re-querying the scene');
h.reduced(true);assert.equal(h.read().mix,0);
h.restart({animationName:'seaside-night',currentTime:0,playState:'running'});
h.reduced(false);assert.equal(h.read().mix,0);
assert.equal(h.at(55000).mix,1,'a restarted CSS animation is followed');
h.state.cycle.playState='idle';assert.equal(h.read().mix,0,'removed animation returns to daylight');
const failed=harness({failImage:true});await failed.load();
assert.equal(failed.classes.has('day-night-ready'),false);assert.equal(failed.read().mix,0);
const reduced=harness({reduced:true});await reduced.load();assert.equal(reduced.read().mix,0);
console.log('Day/night checks passed: decode gate, eased dusk/dawn, loop continuity, shared paused timing, reduced motion, restart, image failure, and no computed-style polling.');
