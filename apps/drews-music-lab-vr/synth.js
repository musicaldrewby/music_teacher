export const SYNTH_PARAMS = [
 {key:'detune',label:'Oscillator spread',min:0,max:30,step:1,unit:'ct'},
 {key:'attack',label:'Attack',min:.005,max:2,step:.005,unit:'s'},
 {key:'decay',label:'Decay',min:.03,max:2,step:.01,unit:'s'},
 {key:'sustain',label:'Sustain',min:0,max:1,step:.01,unit:'%'},
 {key:'release',label:'Release',min:.03,max:4,step:.01,unit:'s'},
 {key:'cutoff',label:'Filter cutoff',min:80,max:12000,step:1,unit:'Hz',log:true},
 {key:'resonance',label:'Resonance',min:.1,max:10,step:.1,unit:'Q'},
 {key:'filterEnv',label:'Filter envelope',min:0,max:4,step:.05,unit:'oct'},
 {key:'delayMix',label:'Delay mix',min:0,max:.65,step:.01,unit:'%'},
 {key:'delayTime',label:'Delay time',min:.06,max:.8,step:.01,unit:'s'},
 {key:'feedback',label:'Delay feedback',min:0,max:.62,step:.01,unit:'%'},
 {key:'reverbMix',label:'Reverb mix',min:0,max:.7,step:.01,unit:'%'},
 {key:'modMix',label:'Modulation mix',min:0,max:.8,step:.01,unit:'%'},
 {key:'modRate',label:'Modulation rate',min:.08,max:3,step:.01,unit:'Hz'}
];
export const SYNTH_DEFAULT={wave:'sawtooth',filter:'lowpass',mod:'chorus',detune:9,attack:.22,decay:.5,sustain:.65,release:1.4,cutoff:2200,resonance:1.2,filterEnv:.7,delayMix:.17,delayTime:.32,feedback:.28,reverbMix:.3,modMix:.3,modRate:.45};
export const SYNTH_PRESETS={
 'Dream pad':{...SYNTH_DEFAULT},
 'Glass pluck':{...SYNTH_DEFAULT,wave:'triangle',detune:3,attack:.005,decay:.22,sustain:.08,release:.6,cutoff:6000,filterEnv:0,delayMix:.25,reverbMix:.4,mod:'off'},
 'Retro lead':{...SYNTH_DEFAULT,wave:'sawtooth',detune:5,attack:.012,decay:.16,sustain:.7,release:.22,cutoff:1700,resonance:3,filterEnv:1.8,reverbMix:.14,mod:'phaser',modMix:.35,modRate:.3},
 'Round bass':{...SYNTH_DEFAULT,wave:'square',detune:0,attack:.008,decay:.16,sustain:.35,release:.12,cutoff:350,resonance:1.4,filterEnv:1.5,delayMix:0,reverbMix:0,mod:'off'},
 'Flange sweep':{...SYNTH_DEFAULT,wave:'sawtooth',attack:.08,decay:.3,sustain:.85,release:.9,cutoff:5200,filterEnv:0,mod:'flanger',modMix:.65,modRate:.22,reverbMix:.18},
 'Pure sine':{...SYNTH_DEFAULT,wave:'sine',detune:0,attack:.015,decay:.3,sustain:.7,release:.5,cutoff:12000,filterEnv:0,mod:'off',delayMix:0,reverbMix:.12},

 'Warm strings':{...SYNTH_DEFAULT,attack:.65,decay:.8,sustain:.8,release:2.1,cutoff:1400,detune:17,reverbMix:.4},
 'Space choir':{...SYNTH_DEFAULT,wave:'triangle',filter:'bandpass',cutoff:1200,resonance:2,attack:.7,release:2.8,mod:'phaser',modMix:.5,reverbMix:.6},
 'Soft organ':{...SYNTH_DEFAULT,wave:'sine',attack:.005,decay:.05,sustain:1,release:.14,detune:7,cutoff:8000,filterEnv:0,delayMix:0,reverbMix:.22},
 'Bubble keys':{...SYNTH_DEFAULT,wave:'sine',attack:.005,decay:.12,sustain:.12,release:.3,cutoff:3000,filterEnv:1,delayMix:.3,delayTime:.18,mod:'off'},
 'Pixel jump':{...SYNTH_DEFAULT,wave:'square',attack:.005,decay:.09,sustain:.1,release:.1,cutoff:6400,filterEnv:0,detune:0,mod:'off',reverbMix:.08,delayMix:.08},
 'Brass burst':{...SYNTH_DEFAULT,wave:'sawtooth',attack:.055,decay:.22,sustain:.6,release:.2,cutoff:900,filterEnv:2.1,resonance:1.5,detune:12,mod:'off'},
 'Velvet bass':{...SYNTH_DEFAULT,wave:'triangle',attack:.015,decay:.4,sustain:.45,release:.2,cutoff:420,filterEnv:.5,detune:2,mod:'off',delayMix:0,reverbMix:.05},
 'Rubber bass':{...SYNTH_DEFAULT,wave:'sawtooth',attack:.005,decay:.18,sustain:.1,release:.15,cutoff:260,filterEnv:3.4,resonance:4,mod:'off',delayMix:0,reverbMix:0},
 'Moon bells':{...SYNTH_DEFAULT,wave:'sine',attack:.005,decay:1.2,sustain:.04,release:1.8,cutoff:12000,filterEnv:0,detune:19,delayMix:.24,reverbMix:.5},
 'Music box':{...SYNTH_DEFAULT,wave:'triangle',attack:.005,decay:.36,sustain:.03,release:.4,cutoff:7200,filterEnv:0,detune:0,mod:'off',delayMix:.12,reverbMix:.32},
 'Ocean pad':{...SYNTH_DEFAULT,filter:'lowpass',cutoff:750,attack:1.25,decay:1.1,sustain:.8,release:3.4,mod:'chorus',modMix:.7,detune:26,reverbMix:.65},
 'Robot voice':{...SYNTH_DEFAULT,wave:'square',filter:'bandpass',cutoff:1650,resonance:5,attack:.02,decay:.2,sustain:.55,release:.2,mod:'phaser',modRate:1.7,modMix:.7},
 'Sparkle echo':{...SYNTH_DEFAULT,wave:'triangle',attack:.005,decay:.26,sustain:.05,release:.6,cutoff:9000,detune:11,delayMix:.48,delayTime:.38,feedback:.5,reverbMix:.35},
 'Gentle flute':{...SYNTH_DEFAULT,wave:'sine',attack:.09,decay:.12,sustain:.8,release:.28,cutoff:6000,filterEnv:0,detune:3,mod:'chorus',modMix:.12,delayMix:.05,reverbMix:.3},
 'Sunrise swell':{...SYNTH_DEFAULT,wave:'sawtooth',attack:1.7,decay:1.1,sustain:.85,release:3.8,cutoff:560,filterEnv:3.0,detune:23,reverbMix:.6,delayMix:.3},
 'Laser pluck':{...SYNTH_DEFAULT,wave:'sawtooth',attack:.005,decay:.08,sustain:0,release:.12,cutoff:600,filterEnv:4,resonance:6,mod:'off',delayMix:.3,delayTime:.14,reverbMix:.1},
 'Dream piano':{...SYNTH_DEFAULT,wave:'triangle',attack:.005,decay:.8,sustain:.2,release:1.2,cutoff:5000,filterEnv:.3,detune:5,mod:'chorus',modMix:.18,reverbMix:.42},
 'Electric shimmer':{...SYNTH_DEFAULT,wave:'sawtooth',filter:'highpass',cutoff:650,filterEnv:0,attack:.1,decay:.6,sustain:.65,release:1.8,mod:'flanger',modRate:.8,modMix:.45,delayMix:.2}
};
export function normalized(p,value){return p.log?Math.log(value/p.min)/Math.log(p.max/p.min):(value-p.min)/(p.max-p.min);}
export function fromNormalized(p,t){t=Math.max(0,Math.min(1,t));return p.log?p.min*(p.max/p.min)**t:p.min+(p.max-p.min)*t;}
export function formatParam(p,value){if(p.unit==='%')return Math.round(value*100)+'%';if(p.key==='cutoff')return value>=1000?(value/1000).toFixed(1)+' kHz':Math.round(value)+' Hz';return (p.step>=1?Math.round(value):value.toFixed(2))+' '+p.unit;}
export class WallSynth {
 constructor(audio){this.audio=audio;this.patch={...SYNTH_DEFAULT};this.voices=new Map();this.serial=0;this.fx=null;}
 set(key,value){if(['wave','filter','mod'].includes(key)){const allowed={wave:['sine','triangle','sawtooth','square'],filter:['lowpass','highpass','bandpass'],mod:['off','chorus','flanger','phaser']};if(!allowed[key].includes(value))throw Error('Unknown synth setting');}else{const p=SYNTH_PARAMS.find(p=>p.key===key);if(!p||!Number.isFinite(+value))throw Error('Invalid synth parameter');value=Math.max(p.min,Math.min(p.max,+value));}this.patch[key]=value;this.update(key);}
 preset(name){if(!SYNTH_PRESETS[name])throw Error('Unknown preset');this.allOff();this.patch={...SYNTH_PRESETS[name]};this.update();}
 init(){if(this.fx||!this.audio.ctx)return;const c=this.audio.ctx,gain=v=>{const n=c.createGain();n.gain.value=v;return n;};const input=gain(1),sum=gain(.7),dry=gain(1);input.connect(dry);dry.connect(sum);const modGains={},lfos=[];
 // Chorus: two gently modulated delays, panned to opposite sides.
 const chorus=gain(0);chorus.connect(sum);for(const sign of [-1,1]){let d=c.createDelay(.1),lfo=c.createOscillator(),depth=gain(.0035),pan=c.createStereoPanner();d.delayTime.value=.019;pan.pan.value=sign*.75;lfo.frequency.value=.45*(sign===1?1.07:1);input.connect(d);d.connect(pan);pan.connect(chorus);lfo.connect(depth);depth.connect(d.delayTime);lfo.start();lfos.push({lfo,mult:sign===1?1.07:1});}modGains.chorus=chorus;
 // Flanger: a short moving comb filter with strictly bounded feedback.
 const flange=gain(0),fd=c.createDelay(.04),flfo=c.createOscillator(),fdepth=gain(.0023),ffb=gain(.27);fd.delayTime.value=.0035;input.connect(fd);fd.connect(ffb);ffb.connect(fd);fd.connect(flange);flange.connect(sum);flfo.connect(fdepth);fdepth.connect(fd.delayTime);flfo.start();lfos.push({lfo:flfo,mult:1});modGains.flanger=flange;
 // Phaser: four swept all-pass stages mixed with the dry signal.
 const phase=gain(0),plfo=c.createOscillator();let prev=input;[250,600,1400,3200].forEach(base=>{const ap=c.createBiquadFilter(),depth=gain(base*.65);ap.type='allpass';ap.frequency.value=base;ap.Q.value=.7;prev.connect(ap);prev=ap;plfo.connect(depth);depth.connect(ap.frequency);});prev.connect(phase);phase.connect(sum);plfo.start();lfos.push({lfo:plfo,mult:1});modGains.phaser=phase;
 const delay=c.createDelay(1),feedback=gain(.28),damp=c.createBiquadFilter(),delayWet=gain(0),verb=c.createConvolver(),verbWet=gain(0);delay.delayTime.value=.32;damp.type='lowpass';damp.frequency.value=3800;sum.connect(this.audio.master);sum.connect(delay);delay.connect(damp);damp.connect(feedback);feedback.connect(delay);delay.connect(delayWet);delayWet.connect(this.audio.master);verb.buffer=this.audio.reverb.buffer;sum.connect(verb);verb.connect(verbWet);verbWet.connect(this.audio.master);this.fx={input,sum,dry,modGains,lfos,delay,feedback,delayWet,verbWet};this.update();}
 update(key){if(!this.fx)return;const p=this.patch,t=this.audio.ctx.currentTime,set=(a,v)=>a.setTargetAtTime(v,t,.025);const f=this.fx;set(f.dry.gain,p.mod==='off'?1:1-p.modMix*.25);for(const [name,g]of Object.entries(f.modGains))set(g.gain,p.mod===name?p.modMix*(name==='chorus'?.5:.8):0);f.lfos.forEach(({lfo,mult})=>set(lfo.frequency,p.modRate*mult));set(f.delay.delayTime,p.delayTime);set(f.feedback.gain,p.feedback);set(f.delayWet.gain,p.delayMix);set(f.verbWet.gain,p.reverbMix);for(const voice of this.voices.values()){if(voice.released)continue;if(!key||key==='wave')voice.osc.forEach(o=>o.type=p.wave);if(!key||key==='detune')voice.osc.forEach((o,i)=>set(o.detune,(i?1:-1)*p.detune/2));voice.filter.type=p.filter;set(voice.filter.Q,p.resonance);if(!key||['cutoff','filterEnv','filter'].includes(key)){voice.filter.frequency.cancelScheduledValues(t);set(voice.filter.frequency,Math.min(this.audio.ctx.sampleRate*.45,p.cutoff));}}}
 noteOn(midi,velocity=.75,options={}){const c=this.audio.ctx;if(!c||c.state!=='running'&&!this.audio.offline)return()=>{};if(!Number.isFinite(midi)||midi<12||midi>120)throw Error('Invalid synth note');this.init();if(!this.audio.offline&&this.voices.size>=12){const old=this.voices.values().next().value;old.release(.012);old.osc.forEach(o=>{try{o.stop(c.currentTime+.015);}catch{}});this.voices.delete(old.id);}const p={...this.patch},t=options.when??c.currentTime,id=++this.serial,filter=c.createBiquadFilter(),amp=c.createGain(),osc=[],peak=.14*Math.max(.05,Math.min(1,velocity)),nyquist=c.sampleRate*.45;
 filter.type=p.filter;filter.Q.value=p.resonance;const base=Math.min(p.cutoff,nyquist),high=Math.min(base*2**p.filterEnv,nyquist);filter.frequency.setValueAtTime(base,t);filter.frequency.exponentialRampToValueAtTime(high,t+p.attack);filter.frequency.exponentialRampToValueAtTime(Math.max(30,base+(high-base)*p.sustain),t+p.attack+p.decay);amp.gain.setValueAtTime(.0001,t);amp.gain.linearRampToValueAtTime(peak,t+p.attack);amp.gain.linearRampToValueAtTime(peak*p.sustain,t+p.attack+p.decay);filter.connect(amp);amp.connect(this.fx.input);
 const v={id,osc,filter,amp,released:false,release:(duration,atTime)=>{const now=atTime??c.currentTime;if(v.released&&now>=v.releaseAt)return;v.released=true;v.releaseAt=now;const end=now+(duration??p.release);if(amp.gain.cancelAndHoldAtTime)amp.gain.cancelAndHoldAtTime(now);else{const elapsed=now-t,value=elapsed<p.attack?peak*elapsed/p.attack:elapsed<p.attack+p.decay?peak*(1-(1-p.sustain)*(elapsed-p.attack)/p.decay):peak*p.sustain;amp.gain.cancelScheduledValues(now);amp.gain.setValueAtTime(Math.max(.0001,value),now);}amp.gain.linearRampToValueAtTime(.0001,end);osc.forEach(o=>o.stop(end+.025));}};
 for(let i=0;i<2;i++){let o=c.createOscillator();o.type=p.wave;o.frequency.value=440*2**((midi-69)/12);o.detune.value=(i?1:-1)*p.detune/2;o.connect(filter);o.start(t);osc.push(o);}let ended=0;osc.forEach(o=>o.onended=()=>{o.disconnect();if(++ended===2){filter.disconnect();amp.disconnect();this.voices.delete(id);}});this.voices.set(id,v);if(Number.isFinite(options.durationSec))v.release(undefined,t+options.durationSec);return v.release;}
 tap(midi,velocity=.75){let release=this.noteOn(midi,velocity);setTimeout(release,480);}
 dispose(){this.allOff();if(this.fx){this.fx.lfos.forEach(({lfo})=>{try{lfo.stop();}catch{}lfo.disconnect();});for(const key of ['input','sum','delayWet','verbWet','feedback'])this.fx[key].disconnect();this.fx=null;}}
 allOff(){for(const v of this.voices.values())v.release(.045);}
}
