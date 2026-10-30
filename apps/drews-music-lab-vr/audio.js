import {preloadSoundfont,SoundFontVoice} from './soundfont.js?v=42';
import {BoomwhackerVoice} from './boomwhacker-voice.js?v=42';
import {ResonantVoice} from './resonant-voice.js?v=30';
import {SteelpanVoice} from './steelpan-voice.js?v=22';
export class MusicAudio {
 constructor(){this.ctx=null;this.level=.65;this.voices=[];}
 init(context){if(this.ctx)return;this.ctx=context;const c=this.ctx;this.master=c.createGain();this.master.gain.value=this.level*.55;const limiter=c.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=18;limiter.ratio.value=8;limiter.attack.value=.003;limiter.release.value=.15;this.master.connect(limiter);limiter.connect(c.destination);this.noise=c.createBuffer(1,c.sampleRate,c.sampleRate);let d=this.noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;this.reverb=c.createConvolver();let b=c.createBuffer(2,c.sampleRate*1.8,c.sampleRate);for(let ch=0;ch<2;ch++){let a=b.getChannelData(ch);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/a.length,3);}this.reverb.buffer=b;let wet=c.createGain();wet.gain.value=.13;this.reverb.connect(wet);wet.connect(this.master);}
 async start(){if(!this.ctx)this.init(new AudioContext());if(this.ctx.state!=='running')await this.ctx.resume();}
 galleryOutput(){if(!this.galleryBus){this.galleryBus=this.ctx.createGain();this.galleryAnalyser=this.ctx.createAnalyser();this.galleryAnalyser.fftSize=1024;this.galleryAnalyser.smoothingTimeConstant=.75;this.galleryBus.connect(this.galleryAnalyser);this.galleryAnalyser.connect(this.master);}return this.galleryBus;}
 async prepareSoundfont(){this.soundfont??=await preloadSoundfont();this.fontVoice??=new SoundFontVoice(this.ctx,this.master,this.reverb,this.soundfont);return this.soundfont;}
 async prepareBoomwhackers(){this.boomwhackers??=new BoomwhackerVoice(this.ctx,this.master,this.reverb);return this.boomwhackers.load();}
 async prepareResonant(){this.resonant??=new ResonantVoice(this.ctx,this.master,this.reverb);return this.resonant.load();}
 async prepareSteelpan(){this.steelpan??=new SteelpanVoice(this.ctx,this.master,this.reverb);return this.steelpan.load();}
 volume(v){this.level=v;if(this.master)this.master.gain.setTargetAtTime(v*.55,this.ctx.currentTime,.03);}
 metronomeClick(when,strong=false,level=.75){
  const c=this.ctx;if(!c||c.state!=='running'||!Number.isFinite(level)||level<=0)return;
  this.stickClicks??=new Map();const accent=!!strong;
  if(!this.stickClicks.has(accent)){
   const buffer=c.createBuffer(1,Math.ceil(c.sampleRate*.065),c.sampleRate),data=buffer.getChannelData(0),pitch=accent?1950:1650;let seed=8713,previous=0,peak=0;
   // A brief impact excites two damped wood resonances, with no reverb tail.
   for(let i=0;i<data.length;i++){const t=i/c.sampleRate;seed=(1664525*seed+1013904223)>>>0;const noise=seed/2147483648-1,impact=(noise-previous)*.24*Math.exp(-t/.0015);previous=noise;const body=.68*Math.sin(2*Math.PI*pitch*t)*Math.exp(-t/.009)+.27*Math.sin(2*Math.PI*pitch*1.67*t)*Math.exp(-t/.004);data[i]=(body+impact)*Math.min(1,t/.00025)*Math.min(1,(data.length-1-i)/(c.sampleRate*.003));peak=Math.max(peak,Math.abs(data[i]));}
   for(let i=0;i<data.length;i++)data[i]*=.9/Math.max(.001,peak);this.stickClicks.set(accent,buffer);
  }
  const source=c.createBufferSource(),gain=c.createGain(),at=Math.max(c.currentTime,when??c.currentTime);source.buffer=this.stickClicks.get(accent);gain.gain.setValueAtTime(Math.min(1,level)*.5*(accent?1.2:1),at);source.connect(gain);gain.connect(this.master);source.onended=()=>{source.disconnect();gain.disconnect();};source.start(at);
 }
 play(type,midi=60,velocity=.75,when,route){
  if(!this.ctx||this.ctx.state!=='running'&&!this.offline)return false;
  const at=when??this.ctx.currentTime;
  if(type==='gong'||type==='windchimes')return this.resonant?.play(type,midi,velocity,at,route);
  if(type==='steelpan'){this.steelpan??=new SteelpanVoice(this.ctx,this.master,this.reverb);this.steelpan.master=route?.master||this.master;this.steelpan.reverb=route?.reverb||this.reverb;return this.steelpan.play(midi,velocity,at);}
  if(type==='boomwhacker')return this.boomwhackers?.play(midi,velocity,at,route);
  return this.fontVoice?.play(type,midi,velocity,at,route);
 }
}
