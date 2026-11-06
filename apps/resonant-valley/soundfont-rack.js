import {SoundBankLoader,SpessaSynthProcessor,SpessaLog} from './vendor/spessasynth-core.js';
import {sound,DEFAULT_PADS} from './catalog.js';
SpessaLog.setLogLevel(false,false,false);

// Shared by the audio worklet, WAV renderer, and audio regression checks.
export class SoundFontRack {
 constructor(bytes,rate){
  this.rate=rate;this.bank=SoundBankLoader.fromArrayBuffer(bytes);
  this.synth=new SpessaSynthProcessor(rate,{effectsEnabled:false,eventsEnabled:false});
  this.synth.soundBankManager.addSoundBank(this.bank,'generaluser');
  this.synth.setSystemParameter('voiceCap',256);
  this.routes=new Map();this.events=[];this.active=new Map();this.tracks=[];this.serial=0;
  this.metering=false;this.meterEpoch=0;
 }
 configure(tracks){this.stop();this.routes.clear();this.tracks=tracks;}
 stop(){this.events.length=0;this.active.clear();this.synth.stopAll(true);this.meterPeaks?.fill(0);}
 setMetering(enabled,epoch=0){
  this.metering=enabled;this.meterEpoch=epoch;this.meterFrame=null;
  if(enabled&&!this.meterPeaks){this.meterPeaks=new Float32Array(16);this.meterLeft=new Float32Array(16*128);this.meterRight=new Float32Array(16*128);}
  this.meterPeaks?.fill(0);
 }
 measure(length){
  // The synth's dry channel buffers already include volume, pan, mute and solo.
  // Multiple internal drum routes (and live notes) sum into one visible track.
  this.meterLeft.fill(0);this.meterRight.fill(0);let touched=0;
  for(const route of this.routes.values()){
   const track=route.track==='audition'?route.meterTrack:route.track,ch=this.synth.midiChannels[route.channel];
   if(!Number.isInteger(track)||track<0||track>=16||!ch.outputDirty)continue;
   touched|=1<<track;const base=track*128;
   for(let i=0;i<length;i++){this.meterLeft[base+i]+=ch.outputLeft[i];this.meterRight[base+i]+=ch.outputRight[i];}
  }
  for(let track=0;track<16;track++)if(touched&(1<<track)){
   const base=track*128;let peak=this.meterPeaks[track];
   for(let i=0;i<length;i++)peak=Math.max(peak,Math.abs(this.meterLeft[base+i]),Math.abs(this.meterRight[base+i]));
   this.meterPeaks[track]=peak;
  }
 }
 meterSnapshot(frame){
  if(!this.metering)return null;
  this.meterFrame??=frame;
  if(frame-this.meterFrame<this.rate/30)return null;
  this.meterFrame=frame;const levels=Array.from(this.meterPeaks);this.meterPeaks.fill(0);
  return {type:'levels',epoch:this.meterEpoch,frame,levels};
 }
 sync(tracks){this.tracks=tracks;for(const route of this.routes.values())this.mix(route);}
 mix(route){const tr=this.tracks[route.track]||{volume:.7,pan:0};const solo=this.tracks.some(t=>t.solo);const ch=this.synth.midiChannels[route.channel];ch.setSystemParameter('gain',route.track==='audition'?route.volume:(tr.mute||(solo&&!tr.solo)?0:tr.volume));ch.setSystemParameter('pan',route.track==='audition'?0:tr.pan);}
 route(track,patch,volume=.7,meterTrack=null){
  const key=track+'|'+patch.bank+'|'+patch.program+(track==='audition'?'|'+meterTrack:'');
  if(this.routes.has(key)){const route=this.routes.get(key);route.volume=volume;if(patch.hat==='open')route.openHats.add(patch.note);this.mix(route);return route;}
  const channel=this.routes.size;while(this.synth.midiChannels.length<=channel)this.synth.createMIDIChannel();
  const ch=this.synth.midiChannels[channel];ch.stopAllNotes(true);ch.setDrums(patch.kind==='drum');
  ch.preset=this.bank.getPreset({program:patch.program,bankMSB:patch.bank===128?0:patch.bank,bankLSB:0,isGMGSDrum:patch.kind==='drum'},'gs');
  const route={channel,track,volume,meterTrack,openHats:new Set(patch.hat==='open'?[patch.note]:[])};this.routes.set(key,route);this.mix(route);return route;
 }
 note(event){
  const tr=event.instrument?event:(this.tracks[event.track]||{});
  const patch=sound(tr.instrument==='drums'?(tr.pads||DEFAULT_PADS)[event.pitch]:tr.instrument);
  if(!patch)return;
  const id=event.id||'n'+this.serial++,pitch=patch.kind==='drum'?patch.note:event.pitch;
  this.events.push({...event,id,patch,pitch,type:'on'});
  if(patch.kind!=='drum'&&Number.isFinite(event.duration))this.events.push({type:'off',id,frame:event.frame+Math.round(event.duration*this.rate)});
  this.events.sort((a,b)=>a.frame-b.frame);return id;
 }
 release(id,frame){this.events.push({type:'off',id,frame});this.events.sort((a,b)=>a.frame-b.frame);}
 dispatch(e){
  if(e.type==='off'){
   const n=this.active.get(e.id);if(!n)return;this.active.delete(e.id);
   this.synth.noteOff(n.channel,n.pitch);
   return;
  }
  const route=this.route(e.track,e.patch,e.volume,e.meterTrack);
  // A closed or pedal hat silences open hats across the kit's internal routes.
  if(['closed','pedal'].includes(e.patch.hat))for(const r of this.routes.values())if(r.track===e.track)for(const note of r.openHats)this.synth.midiChannels[r.channel].killNote(note,-8000);
  this.synth.noteOn(route.channel,e.pitch,Math.max(1,Math.min(127,Math.round(e.velocity*127))));
  if(e.patch.kind!=='drum')this.active.set(e.id,{channel:route.channel,pitch:e.pitch});
 }
 render(left,right,frame,count=left.length){
  let offset=0;while(offset<count){
   while(this.events.length&&this.events[0].frame<=frame+offset)this.dispatch(this.events.shift());
   const next=this.events.length?this.events[0].frame-frame:count;
   const length=Math.min(128,count-offset,Math.max(1,next-offset));
   this.synth.process(left,right,offset,length);if(this.metering)this.measure(length);offset+=length;
  }
 }
}
