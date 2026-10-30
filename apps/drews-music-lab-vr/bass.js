import {BASS_PROGRAMS} from './soundfont.js?v=42';
import {BASS_PRESETS,degreeNote} from './music-presets.js?v=21';
export {BASS_PRESETS} from './music-presets.js?v=21';
export function bassPreset(name,key='c-ionian'){const p=BASS_PRESETS[name]||BASS_PRESETS['Deep pulse'];return{presetName:Object.hasOwn(BASS_PRESETS,name)?name:'Deep pulse',wave:p.wave,cutoff:p.cutoff,resonance:p.resonance,decay:p.decay,steps:p.degrees.map((degree,i)=>degree===null?null:{midi:degreeNote(degree,key),accent:p.accents.includes(i),slide:p.slides.includes(i)})};}
export function emptyBass(){const p=bassPreset('Deep pulse');delete p.presetName;return{...p,steps:Array(16).fill(null)};}
export function validateBass(value){if(value==null)return null;if(!value||!['sawtooth','square','triangle'].includes(value.wave)||!Number.isFinite(value.cutoff)||value.cutoff<100||value.cutoff>4000||!Number.isFinite(value.resonance)||value.resonance<.5||value.resonance>10||!Number.isFinite(value.decay)||value.decay<.06||value.decay>.6||!Array.isArray(value.steps)||value.steps.length!==16)throw Error('Invalid bass pattern.');if(value.presetName!==undefined&&!Object.hasOwn(BASS_PRESETS,value.presetName))throw Error('Invalid bass preset name.');return{...(value.presetName?{presetName:value.presetName}:{}),wave:value.wave,cutoff:value.cutoff,resonance:value.resonance,decay:value.decay,steps:value.steps.map(s=>{if(s===null)return null;if(!s||!Number.isInteger(s.midi)||s.midi<24||s.midi>60||typeof s.accent!=='boolean'||typeof s.slide!=='boolean')throw Error('Invalid bass step.');return{midi:s.midi,accent:s.accent,slide:s.slide};})};}
export function bassEvent(pattern,index){const step=pattern.steps[index];if(!step)return null;const previous=pattern.steps[(index+15)%16];let gap=1;while(gap<16&&!pattern.steps[(index+gap)%16])gap++;return{type:'bass',instrumentId:'bass',midi:step.midi,velocity:step.accent?.9:.62,duration:.22,source:'bass-machine',step:index,bass:{wave:pattern.wave,cutoff:pattern.cutoff,resonance:pattern.resonance,decay:pattern.decay,slide:step.slide,fromMidi:previous?.midi??step.midi,gateSteps:gap}};}
// The SoundFont bass keeps the sequencer's note gates, accents and glide.
export function bassShape(event,beatSeconds){
 const p=event.bass,f=440*2**((event.midi-69)/12),step=beatSeconds/4;
 return {f,gate:Math.max(.035,Math.min(p.decay+.08,step*(p.gateSteps||1)*.92)),release:Math.min(.065,step*.38),subLevel:.13*Math.max(0,Math.min(1,(f/2-25)/30)),colorLevel:(p.wave==='triangle'?.27:.19)/Math.sqrt(Math.max(1,p.resonance))};
}
export class BassVoice{
 constructor(audio){this.audio=audio;this.voices=new Set();}
 play(event,when,beatSeconds,output){
  const c=this.audio.ctx;if(!c||!this.audio.master||!this.audio.soundfont)return;
  const p=event.bass,shape=bassShape(event,beatSeconds),at=Math.max(c.currentTime,when),f=shape.f;
  for(const voice of this.voices)if(voice.at<=at&&voice.end>at+.018)this.releaseVoice(voice,at,.018);
  const filter=c.createBiquadFilter(),gain=c.createGain();
  filter.type='lowpass';filter.Q.value=p.resonance;filter.frequency.setValueAtTime(Math.min(c.sampleRate*.42,Math.max(f*2.5,p.cutoff)*(event.velocity>.8?1.45:1.2)),at);filter.frequency.exponentialRampToValueAtTime(Math.max(f*2,p.cutoff),at+Math.min(.12,shape.gate));
  const peak=.5*event.velocity,settle=Math.min(.045,shape.gate*.45),end=at+shape.gate+shape.release;
  gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(peak,at+.006);gain.gain.linearRampToValueAtTime(peak*.78,at+settle);gain.gain.setValueAtTime(peak*.78,at+shape.gate);gain.gain.linearRampToValueAtTime(0,end);
  filter.connect(gain);gain.connect(output||this.audio.master);
  let voice;
  const font=this.audio.soundfont.createVoice(c,{program:BASS_PROGRAMS[p.wave],midi:event.midi,velocity:event.velocity,when:at,output:filter,envelope:false,onended:()=>{this.voices.delete(voice);filter.disconnect();gain.disconnect();}});
  const glide=p.slide?Math.min(.065,beatSeconds/4*.55):.003;
  for(const source of font.sources){const target=source.playbackRate.value;source.playbackRate.setValueAtTime(target*2**(((p.slide?p.fromMidi:event.midi)-event.midi)/12),at);source.playbackRate.exponentialRampToValueAtTime(target,at+glide);source.stop(end+.01);}
  voice={osc:font.sources,gain,at,end,peak,settle,gate:shape.gate,release:shape.release};this.voices.add(voice);
 }
 releaseVoice(voice,at,fade=.018){
  if(voice.end<=at)return;const param=voice.gain.gain;
  if(param.cancelAndHoldAtTime)param.cancelAndHoldAtTime(at);
  else{const elapsed=at-voice.at;let level=elapsed<=0?0:elapsed<.006?voice.peak*elapsed/.006:elapsed<voice.settle?voice.peak*(1-.22*(elapsed-.006)/(voice.settle-.006)):elapsed<voice.gate?voice.peak*.78:voice.peak*.78*Math.max(0,1-(elapsed-voice.gate)/voice.release);param.cancelScheduledValues(at);param.setValueAtTime(level,at);}
  param.linearRampToValueAtTime(0,at+fade);voice.end=at+fade;for(const osc of voice.osc)try{osc.stop(at+fade+.01);}catch{}
 }
 allOff(){const c=this.audio.ctx;if(!c)return;for(const voice of this.voices)this.releaseVoice(voice,c.currentTime,.012);}
}
