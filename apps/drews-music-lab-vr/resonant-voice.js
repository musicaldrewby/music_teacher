// CC0 acoustic recordings; see samples/resonant/CREDITS.txt.
let downloads;
export function preloadResonant(){
 if(!downloads)downloads=Promise.all(['gong','chime'].map(async name=>{
  const response=await fetch(new URL(`./samples/resonant/${name}.mp3`,import.meta.url),{signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('Gong and chime recordings could not load.');
  return {name,data:await response.arrayBuffer()};
 })).catch(error=>{downloads=null;throw error;});
 return downloads;
}
export class ResonantVoice{
 constructor(ctx,master,reverb){this.ctx=ctx;this.master=master;this.reverb=reverb;this.buffers=new Map();this.voices=new Set();this.ready=null;}
 load(){
  if(!this.ready)this.ready=preloadResonant().then(async entries=>{
   const decoded=await Promise.all(entries.map(async e=>[e.name,await this.ctx.decodeAudioData(e.data.slice(0))]));
   this.buffers=new Map(decoded);
  }).catch(error=>{this.ready=null;this.buffers.clear();throw error;});
  return this.ready;
 }
 fade(voice,at=this.ctx.currentTime){
  if(voice.fading)return;voice.fading=true;
  voice.gain.gain.cancelScheduledValues(at);voice.gain.gain.setTargetAtTime(0,at,.012);
  voice.source.stop(at+.07);this.voices.delete(voice);
 }
 stopPlayback(){for(const voice of this.voices)if(voice.recorded)this.fade(voice);}
 play(type,midi=72,velocity=.75,when=this.ctx.currentTime,route){
  const buffer=this.buffers.get(type==='gong'?'gong':'chime');if(!buffer)return false;
  const at=Math.max(this.ctx.currentTime,when),v=Math.max(0,Math.min(1,velocity));if(v===0)return true;
  // Limit ringing voices; fading old tails keeps fast brushes inexpensive on Quest.
  while(this.voices.size>=20)this.fade(this.voices.values().next().value);
  const source=this.ctx.createBufferSource(),gain=this.ctx.createGain(),filter=this.ctx.createBiquadFilter(),send=this.ctx.createGain();source.buffer=buffer;
  source.playbackRate.value=type==='gong'?1:(440*2**((Math.max(48,Math.min(96,midi))-69)/12))/587.3;
  filter.type='lowpass';filter.frequency.value=type==='gong'?2400+v*6500:4000+v*7500;filter.Q.value=.5;
  gain.gain.setValueAtTime((type==='gong'?.85:.66)*v,at);send.gain.value=type==='gong'?.10:.18;
  source.connect(filter);filter.connect(gain);gain.connect(route?.master||this.master);gain.connect(send);send.connect(route?.reverb||this.reverb);
  const voice={source,gain,recorded:!!route};this.voices.add(voice);
  source.onended=()=>{this.voices.delete(voice);source.disconnect();filter.disconnect();gain.disconnect();send.disconnect();};source.start(at);return true;
 }
}
