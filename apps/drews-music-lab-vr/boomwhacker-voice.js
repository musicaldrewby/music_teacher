// Reuses the 22 recordings and original pitch/gain mapping from Drew's Boomwhacker app.
export const BOOM_SAMPLES=[{"midi":48,"gain":1.2118929},{"midi":50,"gain":1.2318088},{"midi":52,"gain":1.0054887},{"midi":53,"gain":0.9102595},{"midi":55,"gain":0.8632655},{"midi":57,"gain":0.8901874},{"midi":59,"gain":0.8463958},{"midi":60,"gain":0.8714524},{"midi":62,"gain":1.1297047},{"midi":64,"gain":0.8615669},{"midi":65,"gain":0.877561},{"midi":67,"gain":0.9038914},{"midi":69,"gain":0.84917},{"midi":71,"gain":0.8479837},{"midi":72,"gain":0.8356806},{"midi":74,"gain":0.8614367},{"midi":76,"gain":0.8331175},{"midi":77,"gain":0.85715},{"midi":79,"gain":0.8951029},{"midi":81,"gain":0.8536485},{"midi":83,"gain":1.2416009},{"midi":84,"gain":0.826221}];
let downloads;
export function preloadBoomwhackers(){
 if(!downloads)downloads=(async()=>{const entries=[];let cursor=0;await Promise.all(Array.from({length:4},async()=>{while(cursor<BOOM_SAMPLES.length){const sample=BOOM_SAMPLES[cursor++],response=await fetch(new URL(`./samples/boomwhacker/${sample.midi}.wav`,import.meta.url),{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Boomwhacker recordings could not load.');entries.push({...sample,data:await response.arrayBuffer()});}}));return entries;})().catch(error=>{downloads=null;throw error;});return downloads;
}
export class BoomwhackerVoice{
 constructor(ctx,master,reverb){this.ctx=ctx;this.master=master;this.reverb=reverb;this.buffers=new Map();this.voices=new Set();this.ready=null;}
 load(){if(!this.ready)this.ready=preloadBoomwhackers().then(async entries=>{for(const entry of entries)this.buffers.set(entry.midi,{buffer:await this.ctx.decodeAudioData(entry.data.slice(0)),gain:entry.gain});}).catch(error=>{this.ready=null;this.buffers.clear();throw error;});return this.ready;}
 play(midi,velocity=.75,at=this.ctx.currentTime,route){
  if(this.buffers.size!==22||velocity<=0)return false;
  const root=BOOM_SAMPLES.reduce((best,s)=>Math.abs(midi-s.midi)<Math.abs(midi-best.midi)?s:best).midi,sample=this.buffers.get(root),source=this.ctx.createBufferSource(),gain=this.ctx.createGain(),send=this.ctx.createGain();
  source.buffer=sample.buffer;source.playbackRate.value=2**((midi-root)/12);gain.gain.setValueAtTime(sample.gain*Math.max(0,Math.min(1,velocity))*.85,at);send.gain.value=.1;source.connect(gain);gain.connect(route?.master||this.master);gain.connect(send);send.connect(route?.reverb||this.reverb);
  if(this.ctx.state!=='suspended'&&this.voices.size>=32){const old=this.voices.values().next().value;old.gain.gain.setTargetAtTime(0,this.ctx.currentTime,.008);old.source.stop(this.ctx.currentTime+.04);this.voices.delete(old);}
  const voice={source,gain};this.voices.add(voice);source.onended=()=>{this.voices.delete(voice);source.disconnect();gain.disconnect();send.disconnect();};source.start(at);return true;
 }
}
