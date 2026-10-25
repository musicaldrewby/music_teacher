import {LIVE_SONG,CHORDS,barEvents} from './arrangement.js';

// Short look-ahead scheduling keeps the musical clock independent of clicks.
export class LiveJam {
 constructor(ctx,destination,profile){
  this.ctx=ctx;this.profile=profile;this.cache=new Map();this.active=false;
  this.output=ctx.createGain();this.output.gain.value=.75;
  this.compressor=ctx.createDynamicsCompressor();this.compressor.threshold.value=-14;this.compressor.ratio.value=5;
  this.output.connect(this.compressor);this.compressor.connect(destination);
  this.noise=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.3),ctx.sampleRate);
  const data=this.noise.getChannelData(0);let seed=1983;
  for(let i=0;i<data.length;i++){seed=(seed*1664525+1013904223)>>>0;data[i]=seed/2147483648-1;}
 }
 setProfile(profile){this.profile=profile;}
 start(){if(this.active)return;this.active=true;this.bar=0;this.barStart=this.ctx.currentTime+.06;this.index=0;this.events=barEvents(this.profile,0);this.output.gain.setTargetAtTime(.75,this.ctx.currentTime,.025);this.tick();this.timer=setInterval(()=>this.tick(),25);}
 stop(){this.active=false;clearInterval(this.timer);this.output.gain.cancelScheduledValues(this.ctx.currentTime);this.output.gain.setTargetAtTime(0,this.ctx.currentTime,.025);}
 dispose(){this.stop();setTimeout(()=>{this.output.disconnect();this.compressor.disconnect();},500);}
 tick(){
  if(!this.active||this.ctx.state!=='running')return;
  const now=this.ctx.currentTime,beat=60/LIVE_SONG.bpm;
  if(now-this.barStart>beat*8){this.barStart=now+.06;this.index=0;this.events=barEvents(this.profile,this.bar);}
  for(let guard=0;guard<128;guard++){
   if(this.index>=this.events.length){this.bar=(this.bar+1)%LIVE_SONG.bars;this.barStart+=beat*4;this.index=0;this.events=barEvents(this.profile,this.bar);}
   const e=this.events[this.index],time=this.barStart+e.beat*beat;
   if(time>now+.16)break;
   if(time>=now-.02)this.voice(e,Math.max(now+.002,time),this.output,this.profile);
   this.index++;
  }
 }
 stringBuffer(midi,electric){
  const key=midi+':'+electric;if(this.cache.has(key))return this.cache.get(key);
  const sr=this.ctx.sampleRate,f=440*2**((midi-69)/12),period=Math.max(2,Math.round(sr/f));
  const buffer=this.ctx.createBuffer(1,Math.ceil(sr*1.6),sr),data=buffer.getChannelData(0);let seed=739+midi*31;
  for(let i=0;i<period;i++){seed=(seed*1664525+1013904223)>>>0;data[i]=(seed/2147483648-1)*.7;}
  const damp=electric?.9988:.995;
  for(let i=period;i<data.length;i++)data[i]=(data[i-period]+data[i-period+1])*.5*damp;
  this.cache.set(key,buffer);return buffer;
 }
 voice(e,time,out=this.output,p=this.profile){
  const ctx=this.ctx,gain=ctx.createGain(),duration=e.duration;
  const amp=e.velocity*(e.instrument==='keys'?.18:e.instrument==='bass'?.18:.32);
  gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,amp),time+.006);
  gain.gain.exponentialRampToValueAtTime(.0001,time+duration+.08);gain.connect(out);
  let source,filter;
  if(e.instrument==='guitar'||e.instrument==='lead'){
   source=ctx.createBufferSource();source.buffer=this.stringBuffer(e.midi,p.electric);
   source.detune.value=p.tier===0?-12:0;
   filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=p.electric?5500:p.amplified?3300:2100;
   source.connect(filter);filter.connect(gain);
  }else if(e.instrument==='hat'||e.instrument==='snare'){
   source=ctx.createBufferSource();source.buffer=this.noise;filter=ctx.createBiquadFilter();filter.type=e.instrument==='hat'?'highpass':'bandpass';filter.frequency.value=e.instrument==='hat'?7000:1800;filter.Q.value=.6;source.connect(filter);filter.connect(gain);
  }else{
   source=ctx.createOscillator();source.type=e.instrument==='bass'?'triangle':'sine';
   const hz=440*2**((e.midi-69)/12);
   source.frequency.setValueAtTime(e.instrument==='kick'?125:hz,time);
   if(e.instrument==='kick')source.frequency.exponentialRampToValueAtTime(42,time+.13);
   source.connect(gain);
  }
  source.start(time);source.stop(time+duration+.1);
  source.onended=()=>{source.disconnect();filter?.disconnect();gain.disconnect();};
 }
 perform(out,volume){
  const now=this.ctx.currentTime;if(this.lastHit!==undefined&&now-this.lastHit<.16)return;this.lastHit=now;
  const p=this.profile,beat=60/LIVE_SONG.bpm;
  let bar=this.bar,origin=this.barStart;
  if(this.active&&origin>now){bar=(bar+7)%8;origin-=4*beat;}
  const time=this.active?origin+Math.ceil((now-origin)/(beat/2))*(beat/2)+.005:now+.005;
  const chord=CHORDS[Math.floor((this.active?bar:0)/2)%4];
  const notes=p.tier>=3?[0,7,12]:p.tier>=2?[0,chord.third,7]:[0];
  notes.forEach((n,i)=>this.voice({instrument:'guitar',midi:chord.root+12+n,duration:.28,velocity:volume*(p.tier>=3?.65:.5)},time+i*(p.tier>=3?.085:.018),out,p));
 }
}
