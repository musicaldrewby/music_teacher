import {STRINGS,chordAllows} from './music.js?v=standard-21-1';
import {DEFAULT_PRESET,getPreset} from './presets.js?v=dulcimer-default-1';
import {PresetBank} from './preset-bank.js';
export class AutoharpAudio{
  constructor(){this.ctx=null;this.loading=null;this.buffers=[];this.voices=new Set();this.active=Array.from({length:36},()=>[]);this.settings={volume:.7,tone:.55,reverb:.2};this.ready=false;this.chord=null;this.muted=false;this.presetId=DEFAULT_PRESET;this.loadToken=0;this.isSwitching=false;}
  async init(onProgress=()=>{}){
    if(this.ready){await this.ctx.resume();return;}
    if(this.loading){this.ctx?.resume();return this.loading;}
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(!AudioContext)throw new Error('This browser does not support Web Audio. Try Safari or Chrome.');
    this.ctx??=new AudioContext({latencyHint:'interactive'});
    // Resume within the user's gesture, before awaiting asset loads (Safari).
    await this.ctx.resume();
    this.loading=(async()=>{
      if(!this.master){
        const c=this.ctx;this.dry=c.createGain();this.wet=c.createGain();this.master=c.createGain();this.body=c.createBiquadFilter();this.body.type='peaking';this.body.frequency.value=290;this.body.Q.value=.75;this.body.gain.value=2;
        this.tone=c.createBiquadFilter();this.tone.type='lowpass';this.tone.Q.value=.55;
        this.compressor=c.createDynamicsCompressor();this.compressor.threshold.value=-10;this.compressor.knee.value=12;this.compressor.ratio.value=3;this.compressor.attack.value=.005;this.compressor.release.value=.18;
        this.body.connect(this.tone);this.tone.connect(this.dry);this.dry.connect(this.compressor);this.wet.connect(this.compressor);this.compressor.connect(this.master);this.master.connect(c.destination);
        this.impulse=this.makeImpulse();this.resetReverb();this.setSettings(this.settings);
      }
      this.bank??=new PresetBank(bytes=>this.ctx.decodeAudioData(bytes));
      await this.selectPreset(this.presetId,onProgress);
    })().catch(e=>{throw e;}).finally(()=>{this.loading=null;});return this.loading;
  }
  async selectPreset(id,onProgress=()=>{}){
    if(!getPreset(id))throw new Error('Unknown instrument sound.');
    if(!this.ctx){this.presetId=id;return true;}
    const token=++this.loadToken;this.isSwitching=true;
    try{
      const buffers=await this.bank.load(id,onProgress);
      if(token!==this.loadToken)return false;
      this.dampAll();this.buffers=buffers;this.presetId=id;this.ready=true;return true;
    }finally{if(token===this.loadToken)this.isSwitching=false;}
  }
  makeImpulse(){const c=this.ctx,n=Math.floor(c.sampleRate*1.65),b=c.createBuffer(2,n,c.sampleRate);let seed=1037;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296*2-1;};for(let ch=0;ch<2;ch++){const a=b.getChannelData(ch);let last=0;for(let i=0;i<n;i++){last=last*.55+rand()*.45;a[i]=last*Math.exp(-i/(c.sampleRate*.31))*.25;}[.017,.031,.047,.079].forEach((t,j)=>a[Math.floor((t+ch*.003)*c.sampleRate)]+=.28/(j+1));}return b;}
  resetReverb(){if(this.convolver){this.tone.disconnect(this.convolver);this.convolver.disconnect();}this.convolver=this.ctx.createConvolver();this.convolver.buffer=this.impulse;this.tone.connect(this.convolver);this.convolver.connect(this.wet);}
  setSettings(values){Object.assign(this.settings,values);if(!this.master)return;const t=this.ctx.currentTime;this.master.gain.setTargetAtTime(this.muted?0:this.settings.volume*.76,t,.02);this.wet.gain.setTargetAtTime(this.settings.reverb*.7,t,.02);this.tone.frequency.setTargetAtTime(1800+this.settings.tone*11000,t,.02);}
  setMuted(muted){this.muted=muted;this.setSettings({});}
  setChord(chord){this.chord=chord;for(const voice of this.voices)if(!chordAllows(chord,STRINGS[voice.index]))this.dampVoice(voice,.018);}
  dampVoice(v,release=.015){if(v.damped)return;v.damped=true;const now=this.ctx.currentTime;const gain=v.gain.gain;if(gain.cancelAndHoldAtTime)gain.cancelAndHoldAtTime(now);else{gain.cancelScheduledValues(now);gain.setValueAtTime(v.level,now);}gain.setTargetAtTime(.00001,now,release);try{v.source.stop(now+release*8+.02);}catch{}}
  dampAll(){if(!this.ctx)return;for(const v of this.voices)this.dampVoice(v,.012);if(this.convolver)this.resetReverb();}
  pluck(index,velocity=.6,position=.45,time=null){
    if(!this.ready||!this.buffers[index]||!chordAllows(this.chord,STRINGS[index]))return false;
    if(this.ctx.state!=='running')this.ctx.resume();
    const c=this.ctx,at=time??c.currentTime;
    for(const v of this.active[index])this.dampVoice(v,.012);
    const source=c.createBufferSource();source.buffer=this.buffers[index];const gain=c.createGain(),filter=c.createBiquadFilter(),pan=c.createStereoPanner();
    filter.type='lowpass';filter.Q.value=.45;filter.frequency.value=3400+velocity*7400+Math.abs(position-.5)*5000;
    pan.pan.value=(index/35-.5)*.5;const level=.17*Math.pow(Math.max(.06,Math.min(1,velocity)),.8);gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(level,at+.002);
    source.connect(filter);filter.connect(gain);gain.connect(pan);pan.connect(this.body);const v={source,gain,filter,pan,index,level,damped:false};this.voices.add(v);this.active[index].push(v);
    source.onended=()=>{this.voices.delete(v);this.active[index]=this.active[index].filter(x=>x!==v);source.disconnect();gain.disconnect();filter.disconnect();pan.disconnect();};source.start(at);return true;
  }
}
