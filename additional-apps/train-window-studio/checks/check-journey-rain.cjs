// Native Canvas checks for the production wet-glass simulation. No browser.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto'),path=require('node:path');
const {createCanvas}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||process.cwd()]}));
const source=fs.readFileSync('dist/app.js','utf8');
const api=new Function('LOOP','TAU','AUDIO_RATE','state',source.slice(source.indexOf('const SCENES='),source.indexOf('const WINDOWS='))+
 source.slice(source.indexOf('const clamp01='),source.indexOf('\nlet renderer'))+
 source.slice(source.indexOf('function createWetGlass('),source.indexOf('\nasync function prepareGraphicsProgram'))+
 source.slice(source.indexOf('function readSample('),source.indexOf('\nfunction createAudioEngine'))+
 '\nreturn {SCENES,journeyFrame,createWetGlass,mixSamples};')(300,Math.PI*2,48000,{});
const {SCENES,journeyFrame,createWetGlass,mixSamples}=api;
const settings={scene:'country',speed:1,wind:-.8,gust:.55,rainAmount:1,snowAmount:0,stations:true,tunnels:true,bridges:true,journey:false,weatherCycle:false};
// All portal kinds use geometric shelter, even with optional tunnels disabled.
for(const scene of Object.keys(SCENES))for(const stations of [false,true])for(const tunnels of [false,true])for(const journey of [false,true]){
 const s={...settings,scene,stations,tunnels,journey,route:['country','halloween','bayou']};
 for(const [a,b] of [[188,202],[238,252],...(tunnels?[[48,68]]:[]),...(journey?[[-8,8]]:[])]){
  for(let t=a;t<=b;t+=.25)assert.equal(journeyFrame(t,s).rainExposure,0,'Rain under tunnel cover at '+t);
  assert.equal(journeyFrame(a-1,s).rainExposure,1);assert.equal(journeyFrame(b+1,s).rainExposure,1);
 }
 assert.equal(journeyFrame(120,s).rainExposure,1,'Station is still exposed to rain');
}
const wet=createWetGlass(1280,720,createCanvas),hash=(t,s=settings)=>crypto.createHash('sha256').update(wet.draw(t,s).getContext('2d').getImageData(0,0,1280,720).data).digest('hex');
const wrap=(t,n)=>((t%n)+n)%n;
function motionAt(w,t,s){
 w.draw(t,s);let side=0,down=0,count=0;
 for(const run of w.runs){const age=wrap(t/s.speed-run.birth,300/s.speed),index=Math.floor(age*60)*4,p=run.points;
  if(age>run.release+.1&&age<run.end-.1&&index+7<p.length){side+=Math.abs(p[index+4]-p[index])*60;down+=(p[index+5]-p[index+1])*60;count++;}
 }
 return {count,side:side/Math.max(1,count),down:down/Math.max(1,count)};
}
const started=performance.now(),zero=hash(0),firstFrameMs=performance.now()-started;
const summary=[];let carriedThrough=0;
for(const time of [40,47.8,48,48.2,50,58,68,70,90,100,108,112,114,120,126,130,138,148,188,195,202,238,245,252,299.98,300]){
 const digest=hash(time),motion=motionAt(wet,time,settings);summary.push({time,...motion});
 for(const run of wet.runs){
  assert.ok(journeyFrame(run.birth*settings.speed,settings).rainExposure>0,'Every drop originates outside cover');
  assert.ok(run.end+7<run.period,'Trails finish before the episode repeats');
  const before=wrap(47.9-run.birth,300),after=wrap(48.1-run.birth,300);
  if(before>run.release&&after<run.end)carriedThrough++;
 }
 if(time===120){assert.ok(motion.count>5&&motion.down>1,'Rain keeps draining at the station');assert.ok(motion.side<.02,'No station-sideways drift');}
 if(time===300)assert.equal(digest,zero,'Exact loop closure');
}
assert.ok(carriedThrough>0,'Existing drops continue across the entrance');
const once=hash(107.75);for(let t=0;t<300;t+=5)wet.draw(t,settings);assert.equal(hash(107.75),once,'Cache eviction and arbitrary scrubbing preserve pixels');
assert.ok(wet.stats.cached<=384);assert.ok(wet.stats.bytes<20*1024*1024);
const denseCache=wet.stats;
const drift=t=>summary.find(row=>row.time===t).side;
assert.ok(drift(90)>drift(100)&&drift(100)>drift(108),'Progressive braking');
assert.ok(drift(130)<drift(138)&&drift(138)<drift(148),'Progressive acceleration');
const rev=wet.revision;hash(50,{...settings,tunnels:false});assert.equal(wet.revision,rev+1);assert.equal(journeyFrame(50,{...settings,tunnels:false}).rainExposure,1);
const scenarios=[];
for(const speed of [.75,1,1.5])for(const wind of [-1,1])for(const gust of [0,1]){
 const s={...settings,speed,wind,gust},w=createWetGlass(480,270,createCanvas);
 const cruise=motionAt(w,90,s),braking=motionAt(w,108,s),stop=motionAt(w,120,s),depart=motionAt(w,148,s);
 assert.ok(cruise.side>1&&depart.side>1,'Travel produces wind shear');
 assert.ok(braking.side<cruise.side*.25,'Lateral drift eases during braking');
 assert.ok(stop.count>3&&stop.down>1,'Drops drain during the stop');assert.ok(stop.side<.02,'Drift stops for both wind directions, all gusts and speeds');
 scenarios.push({speed,wind,gust,cruise,braking,stop,depart});
}
// Rendering common timestamps via different FPS histories must agree exactly.
const fpsSettings={...settings,rainAmount:.6};const frames={};
for(const fps of [15,30,60]){
 const w=createWetGlass(480,270,createCanvas);for(let f=0;f<=2*fps;f++)w.draw(111+f/fps,fpsSettings);
 frames[fps]=crypto.createHash('sha256').update(w.canvas.getContext('2d').getImageData(0,0,480,270).data).digest('hex');
}
assert.equal(frames[15],frames[60]);assert.equal(frames[30],frames[60]);
// Connected-route wraps, cycling weather and settings changed while paused.
const routeSettings={...settings,journey:true,route:['country','halloween','bayou'],weatherCycle:true};
const routeStart=hash(0,routeSettings);hash(299.99,routeSettings);assert.equal(hash(900,routeSettings),routeStart);
for(const r of wet.runs)assert.ok(journeyFrame(r.birth,routeSettings).rainExposure>0);
// Live and offline rain gains both use the same shelter curve. Isolate rain.
const levels={rumble:0,wheels:0,rainVolume:1,music:0,master:1,musicLoop:true};
const bank={rain:{sampleRate:48000,length:8,channels:[new Float32Array(8).fill(.2)]}};
for(const time of [48,58,67.9,195,245])assert.ok(mixSamples(bank,levels,0,64,1,time,0,time,settings).every(x=>x===0));
assert.ok(mixSamples(bank,levels,0,64,1,120,0,120,settings).every(x=>x>.09));
const live={ctx:{currentTime:0},state:{...settings,time:58,playing:true},mixer:{...levels,enabled:true},gains:{},echoSend:null,sources:[],master:{gain:{setTargetAtTime(){}}},document:{hidden:false},journeyFrame};
for(const name of ['rain','rumble','wheels','music'])live.gains[name]={gain:{setTargetAtTime(v){this.value=v;}}};
vm.runInNewContext(source.slice(source.indexOf(' function updateGains(){'),source.indexOf(' function tick(now){'))+';updateGains();',live);assert.equal(live.gains.rain.gain.value,0);
live.state.time=120;vm.runInNewContext('updateGains()',live);assert.equal(live.gains.rain.gain.value,.6);
const result={firstFrameMs,carriedThrough,cache:denseCache,summary,scenarios,frameRateHashes:frames,browserTested:false};
if(process.env.RAIN_REVIEW){fs.mkdirSync(process.env.RAIN_REVIEW,{recursive:true});fs.writeFileSync(path.join(process.env.RAIN_REVIEW,'results.json'),JSON.stringify(result,null,2));
 for(const time of [47.8,48.2,58,70,90,108,120,130,148,195])fs.writeFileSync(path.join(process.env.RAIN_REVIEW,'wet-'+time+'.png'),wet.draw(time,settings).toBuffer('image/png'));
}
console.log('PASS: all tunnel types shelter new rain; existing drops drain; station drift stops and resumes across both wind directions, gust extremes and all speeds; canvas output is deterministic across FPS, seeks, cache eviction and loops; live/export audio matches shelter. Native Canvas, not browser playback.');
console.log(JSON.stringify({firstFrameMs,cache:result.cache,station:summary.find(r=>r.time===120),carriedThrough}));
