// Acoustic jSteelDrum recordings by Jeff Learman (public domain / Unlicense).
// Exact source files and adaptation details: samples/steelpan/CREDITS.txt.
const pitches=Array.from({length:24},(_,i)=>60+i);
let downloads;
export function preloadSteelpan(){
 if(!downloads)downloads=(async()=>{
  const entries=pitches.flatMap(midi=>['soft','bright'].map(layer=>({midi,layer})));
  let cursor=0;
  await Promise.all(Array.from({length:4},async()=>{while(cursor<entries.length){const entry=entries[cursor++];const response=await fetch(new URL(`./samples/steelpan/${entry.midi}-${entry.layer}.mp3`,import.meta.url),{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Steelpan samples could not load.');entry.data=await response.arrayBuffer();}}));
  return entries;
 })().catch(error=>{downloads=null;throw error;});
 return downloads;
}
export class SteelpanVoice{
 constructor(context,master,reverb){this.ctx=context;this.master=master;this.reverb=reverb;this.buffers=new Map();this.voices=new Set();this.ready=null;}
 load(){
  if(!this.ready)this.ready=preloadSteelpan().then(async entries=>{
   for(const entry of entries){const buffer=await this.ctx.decodeAudioData(entry.data.slice(0));let peak=0;
    for(let ch=0;ch<buffer.numberOfChannels;ch++){const samples=buffer.getChannelData(ch);for(let i=0;i<samples.length;i++)peak=Math.max(peak,Math.abs(samples[i]));}
    this.buffers.set(entry.midi+'-'+entry.layer,{buffer,level:Math.min(8,.72/Math.max(.01,peak))});
   }
  }).catch(error=>{this.ready=null;this.buffers.clear();throw error;});
  return this.ready;
 }
 play(midi,velocity=.75,at=this.ctx.currentTime){
  if(this.buffers.size!==48)return false;
  const note=Math.max(60,Math.min(83,Math.round(midi))),v=Math.max(0,Math.min(1,velocity));
  // Crossfade acoustic layers and preserve each recording's natural decay.
  const blend=Math.max(0,Math.min(1,(v-.35)/.55));
  while(this.voices.size>30){const oldest=this.voices.values().next().value;oldest.gain.gain.cancelScheduledValues(at);oldest.gain.gain.setTargetAtTime(0,at,.008);oldest.source.stop(at+.04);this.voices.delete(oldest);}
  for(const [layer,weight]of [['soft',Math.cos(blend*Math.PI/2)],['bright',Math.sin(blend*Math.PI/2)]]){
   if(weight<.001)continue;const sample=this.buffers.get(note+'-'+layer),source=this.ctx.createBufferSource(),gain=this.ctx.createGain(),send=this.ctx.createGain();
   source.buffer=sample.buffer;source.playbackRate.value=2**((midi-note)/12);gain.gain.setValueAtTime(sample.level*v*.56*weight,at);send.gain.value=.2;
   source.connect(gain);gain.connect(this.master);gain.connect(send);send.connect(this.reverb);
   const voice={source,gain};this.voices.add(voice);source.onended=()=>{this.voices.delete(voice);source.disconnect();gain.disconnect();send.disconnect();};source.start(at);
  }
  return true;
 }
}
