import {SpessaSynthProcessor,SoundBankLoader,SpessaLog} from 'spessasynth_core';
// One complete SF2 synthesizer per AudioContext. Channels isolate simultaneous
// notes so an old note-off cannot cut off a newer strike of the same pitch.
export const FONT_CHANNELS=64;
export class PatchCore{
 constructor(rate,data,initialTime=0,ended=()=>{}){
  SpessaLog.setLogLevel(false,false,false);
  this.synth=new SpessaSynthProcessor(rate,{maxBufferSize:128,effectsEnabled:false,initialTime});
  this.synth.soundBankManager.addSoundBank(SoundBankLoader.fromArrayBuffer(data),'generaluser');
  while(this.synth.midiChannels.length<FONT_CHANNELS)this.synth.createMIDIChannel();
  this.synth.setSystemParameter('voiceCap',256);
  this.ready=this.synth.processorInitialized;this.events=[];this.active=new Map();this.rate=rate;this.ended=ended;
  this.effects=[new Float32Array(128),new Float32Array(128)];
 }
 enqueue(event){this.events.push(event);this.events.sort((a,b)=>a.at-b.at||a.order-b.order);}
 apply(e){
  const s=this.synth,ch=s.midiChannels[e.channel];if(!ch)return;
  if(e.type==='on'){
   ch.stopAllNotes(true);ch.setDrums(e.bank===128);s.controllerChange(e.channel,0,e.bank===128?0:e.bank);s.controllerChange(e.channel,32,0);s.programChange(e.channel,e.program);
   s.controllerChange(e.channel,7,100);s.controllerChange(e.channel,11,127);s.controllerChange(e.channel,10,64);
   ch.setSystemParameter('fineTune',e.tune||0);s.noteOn(e.channel,e.midi,e.velocity);this.active.set(e.channel,e);
  }else if(this.active.get(e.channel)?.id!==e.id&&['off','kill'].includes(e.type)){
   const pending=this.events.some(x=>x.type==='on'&&x.id===e.id&&x.channel===e.channel);
   if(pending){this.events=this.events.filter(x=>x.id!==e.id||x.channel!==e.channel);this.ended({channel:e.channel,id:e.id});}
  }else if(this.active.get(e.channel)?.id===e.id){
   if(e.type==='off')s.noteOff(e.channel,this.active.get(e.channel).midi);
   else if(e.type==='kill')ch.stopAllNotes(true);
   else if(e.type==='tune')ch.setSystemParameter('fineTune',e.value);
  }
 }
 process(outputs,at){
  const frames=outputs[0][0].length;let offset=0;
  while(offset<frames){
   while(this.events.length&&this.events[0].at<=at+offset/this.rate+1e-9)this.apply(this.events.shift());
   const next=this.events.length?Math.max(offset+1,Math.ceil((this.events[0].at-at)*this.rate)):frames;
   const count=Math.min(frames,next)-offset;
   this.synth.processSplit(outputs,this.effects[0],this.effects[1],offset,count);offset+=count;
  }
  for(const [channel,e]of this.active)if(this.synth.midiChannels[channel].voiceCount===0){this.active.delete(channel);this.ended({channel,id:e.id});}
 }
 dispose(){this.synth.destroySynthProcessor();}
}
