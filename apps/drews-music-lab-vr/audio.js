import {ResonantVoice} from './resonant-voice.js?v=30';
import {SteelpanVoice} from './steelpan-voice.js?v=22';
export class MusicAudio {
 constructor(){this.ctx=null;this.level=.65;this.voices=[];}
 init(context){if(this.ctx)return;this.ctx=context;const c=this.ctx;this.master=c.createGain();this.master.gain.value=this.level*.55;const limiter=c.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=18;limiter.ratio.value=8;limiter.attack.value=.003;limiter.release.value=.15;this.master.connect(limiter);limiter.connect(c.destination);this.noise=c.createBuffer(1,c.sampleRate,c.sampleRate);let d=this.noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;this.reverb=c.createConvolver();let b=c.createBuffer(2,c.sampleRate*1.8,c.sampleRate);for(let ch=0;ch<2;ch++){let a=b.getChannelData(ch);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/a.length,3);}this.reverb.buffer=b;let wet=c.createGain();wet.gain.value=.13;this.reverb.connect(wet);wet.connect(this.master);}
 async start(){if(!this.ctx)this.init(new AudioContext());if(this.ctx.state!=='running')await this.ctx.resume();}
 galleryOutput(){if(!this.galleryBus){this.galleryBus=this.ctx.createGain();this.galleryAnalyser=this.ctx.createAnalyser();this.galleryAnalyser.fftSize=1024;this.galleryAnalyser.smoothingTimeConstant=.75;this.galleryBus.connect(this.galleryAnalyser);this.galleryAnalyser.connect(this.master);}return this.galleryBus;}
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
 tone(freq,type,at,amp,decay,wave='sine',ratio=1){let c=this.ctx,o=c.createOscillator(),g=c.createGain();o.type=wave;o.frequency.setValueAtTime(freq*ratio,at);g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(Math.max(.0002,amp),at+.004);g.gain.exponentialRampToValueAtTime(.0001,at+decay);o.connect(g);g.connect(this.destination?.master||this.master);g.connect(this.destination?.reverb||this.reverb);o.start(at);o.stop(at+decay+.02);o.onended=()=>{o.disconnect();g.disconnect();};}
 burst(at,amp,decay,cutoff=3500,filter='highpass'){let c=this.ctx,s=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter();s.buffer=this.noise;f.type=filter;f.frequency.value=cutoff;f.Q.value=.6;g.gain.setValueAtTime(amp,at);g.gain.exponentialRampToValueAtTime(.0001,at+decay);s.connect(f);f.connect(g);g.connect(this.destination?.master||this.master);s.start(at,Math.random()*.3);s.stop(at+decay);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();};}
 play(type,midi=60,velocity=.75,when,route){if(!this.ctx||this.ctx.state!=='running'&&!this.offline)return;this.destination=route;try{let t=when??this.ctx.currentTime,f=440*2**((midi-69)/12),v=velocity*.26,brightness=.3+.7*Math.max(0,Math.min(1,velocity));const tone=(ratio,a,d,w='sine')=>this.tone(f,type,t,v*a,d,w,ratio);
 if(type==='gong'||type==='windchimes'){this.resonant?.play(type,midi,velocity,t,route);}
 else if(type==='piano'){tone(1,1,2.5);tone(2,.37,1.8);tone(3,.14,1.1);tone(4.002,.065,.65);this.burst(t,.018*velocity,.045,1600,'lowpass');}
 else if(type==='steelpan'){this.steelpan??=new SteelpanVoice(this.ctx,this.master,this.reverb);this.steelpan.master=route?.master||this.master;this.steelpan.reverb=route?.reverb||this.reverb;this.steelpan.play(midi,velocity,t);}
 else if(type==='xylophone'){tone(1,1,.52);tone(3,.42*brightness,.2);tone(6,.10*brightness**2,.08);this.burst(t,.025*velocity*brightness,.022,1200+900*brightness,'bandpass');}
 else if(type==='metallophone'||type==='glockenspiel'){let d=type==='glockenspiel'?2.1:3.7;tone(1,.75,d);tone(2.756,.25*brightness,d*.5);tone(5.404,.10*brightness**2,d*.3);tone(8.93,.035*brightness**2,.1);}
 else if(type==='boomwhacker'){tone(1,1,.3);tone(2,.22*brightness,.13);this.burst(t,.14*velocity*brightness,.06,450+350*brightness,'lowpass');}
 else if(type==='cowbell'){f=560;tone(1,.5,.26,'square');tone(1.49,.28,.17,'square');}
 else if(type==='maracas'){this.burst(t,.6*velocity,.1,4500);this.burst(t+.035,.2*velocity,.08,6500);}
 else if(type==='tambourine'){this.burst(t,.5*velocity,.3,6000);f=1850;[1,1.34,1.79,2.31,2.89].forEach(r=>tone(r,.09,.32,'square'));}
 else if(type==='kick'){let c=this.ctx,o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(155,t);o.frequency.exponentialRampToValueAtTime(43,t+.13);g.gain.setValueAtTime(.65*velocity,t);g.gain.exponentialRampToValueAtTime(.0001,t+.38);o.connect(g);g.connect(this.destination?.master||this.master);o.start(t);o.stop(t+.4);o.onended=()=>{o.disconnect();g.disconnect();};}
 else if(type==='snare'){f=185;tone(1,.65,.13);this.burst(t,.53*velocity,.19,1600);}
 else if(type==='hat'){this.burst(t,.3*velocity,.06,7000);}
 else if(type==='clap'){[0,.013,.027].forEach(d=>this.burst(t+d,.35*velocity,.085,1500,'bandpass'));}
 }finally{this.destination=null;}
 }
}
