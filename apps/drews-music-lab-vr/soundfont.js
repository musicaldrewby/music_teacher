// GeneralUser GS 1.471, S. Christian Collins. See samples/soundfont/CREDITS.txt.
// Full authored SF2 patches run in SpessaSynth, including modulators, volume
// and filter envelopes, tuning, velocity layers, looping and natural release.
const FONT_CHANNELS=64;
export const FONT_INSTRUMENTS={piano:{program:0,gate:2.8},xylophone:{program:13,gate:1.4},metallophone:{program:11,gate:3.7},glockenspiel:{program:9,gate:3.2},cowbell:{program:0,bank:128,note:56,gate:1},maracas:{program:0,bank:128,note:70,gate:.6},tambourine:{program:0,bank:128,note:54,gate:1.5},kick:{program:0,bank:128,note:36,gate:1},snare:{program:0,bank:128,note:38,gate:1},hat:{program:0,bank:128,note:42,gate:.4},clap:{program:0,bank:128,note:39,gate:1}};
export const WAVE_PROGRAMS={sine:80,triangle:98,sawtooth:81,square:80};
export const BASS_PROGRAMS={triangle:33,sawtooth:38,square:39};
let loading;
export function preloadSoundfont(){
 if(!loading)loading=(async()=>{
  const chunks=await Promise.all([1,2,3,4].map(async n=>{const response=await fetch(new URL(`./samples/soundfont/generaluser-1.471.part0${n}.bin`,import.meta.url),{signal:AbortSignal.timeout(45000)});if(!response.ok)throw Error('SoundFont could not load.');return new Uint8Array(await response.arrayBuffer());}));
  const data=new Uint8Array(chunks.reduce((n,c)=>n+c.length,0));let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}
  if(data.length!==31281186)throw Error('Incomplete SoundFont download.');
  return new SoundFontBank(data.buffer);
 })().catch(error=>{loading=null;throw error;});return loading;
}
export class SoundFontBank{
 constructor(data){this.data=data;this.engines=new WeakMap();}
 async prepare(ctx){
  if(!this.engines.has(ctx))this.engines.set(ctx,(async()=>{
   if(!ctx.audioWorklet)throw Error('This browser does not support the SoundFont audio engine.');
   await ctx.audioWorklet.addModule(new URL('./soundfont-worklet.js?v=43',import.meta.url).href);
   const engine=new PatchOutput(ctx,this.data);try{await engine.ready;return engine;}catch(error){engine.dispose();throw error;}
  })().catch(error=>{this.engines.delete(ctx);throw error;}));
  const engine=await this.engines.get(ctx);this.engines.set(ctx,engine);return engine;
 }
 createVoice(ctx,options){const engine=this.engines.get(ctx);if(!(engine instanceof PatchOutput))throw Error('SoundFont is still loading.');return engine.createVoice(options);}
 async flush(ctx){const engine=await this.engines.get(ctx);if(engine)await engine.flush();}
 dispose(ctx){const engine=this.engines.get(ctx);if(engine instanceof PatchOutput)engine.dispose();this.engines.delete(ctx);}
}
class PatchOutput{
 constructor(ctx,data){
  this.ctx=ctx;this.slots=new Map();this.serial=0;this.order=0;this.syncs=new Map();this.syncId=0;
  this.node=new AudioWorkletNode(ctx,'music-lab-soundfont',{numberOfInputs:0,numberOfOutputs:FONT_CHANNELS,outputChannelCount:Array(FONT_CHANNELS).fill(2)});
  // Keep the single worklet clock running even between notes.
  this.clock=ctx.createGain();this.clock.gain.value=0;this.node.connect(this.clock,0);this.clock.connect(ctx.destination);
  this.ready=new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('SoundFont engine could not start.')),20000);
   this.node.onprocessorerror=()=>{clearTimeout(timeout);reject(Error('SoundFont audio processor failed.'));};
   this.node.port.onmessage=({data})=>{if(data.type==='ready'){clearTimeout(timeout);resolve();}else if(data.type==='error'){clearTimeout(timeout);reject(Error(data.message));}else if(data.type==='ended')this.finish(data.channel,data.id);else if(data.type==='synced'){this.syncs.get(data.id)?.();this.syncs.delete(data.id);}};
  });const copy=data.slice(0);this.node.port.postMessage({type:'init',bank:copy},[copy]);
 }
 send(event){this.node.port.postMessage({...event,order:++this.order});}
 finish(channel,id){const voice=this.slots.get(channel);if(voice?.id!==id)return;this.slots.delete(channel);try{this.node.disconnect(voice.output,channel);}catch{}voice.done();}
 createVoice({program=0,bank=0,midi=60,velocity=.75,when=this.ctx.currentTime,output,detune=0,onended=()=>{}}){
  const at=Math.max(this.ctx.currentTime,when),id=++this.serial;
  let channel=Array.from({length:FONT_CHANNELS},(_,i)=>i).find(i=>!this.slots.has(i));
  if(channel===undefined){const old=[...this.slots.values()].sort((a,b)=>a.at-b.at)[0];channel=old.channel;this.send({type:'kill',channel,id:old.id,at:this.ctx.currentTime});this.finish(channel,old.id);}
  let tune=detune,rate=1,releaseAt=Infinity,stopAt=Infinity;
  const voice={id,channel,at,output,done:onended};this.slots.set(channel,voice);this.node.connect(output,channel);
  const event=(type,time,extra={})=>this.send({type,id,channel,at:Math.max(this.ctx.currentTime,time),...extra});
  const tuning=time=>event('tune',time,{value:tune+1200*Math.log2(rate)});
  const source={
   detune:{get value(){return tune;},set value(v){tune=v;tuning(at);},setTargetAtTime:(v,t)=>{tune=v;tuning(t);}},
   playbackRate:{get value(){return rate;},set value(v){rate=v;tuning(at);},setValueAtTime:(v,t)=>{rate=v;tuning(t);},exponentialRampToValueAtTime:(v,end)=>{const begin=at,from=rate;for(let i=1;i<=12;i++)event('tune',begin+(end-begin)*i/12,{value:tune+1200*Math.log2(from*(v/from)**(i/12))});rate=v;}},
   stop:(time=this.ctx.currentTime)=>{if(time>=stopAt)return;stopAt=time;event('kill',time);},
   disconnect:()=>{},
  };
  const release=(time=this.ctx.currentTime)=>{if(time>=releaseAt)return;releaseAt=time;event('off',time);};
  // Note-off enters the patch's release stage; no hand-written gain ramp or
  // hard sample cutoff substitutes for that envelope.
  event('on',at,{program,bank,midi:Math.max(0,Math.min(127,Math.round(midi))),velocity:Math.max(1,Math.round(Math.min(1,velocity)*127)),tune});
  return{sources:[source],release,stop:time=>source.stop(time)};
 }
 flush(){return new Promise(resolve=>{const id=++this.syncId;this.syncs.set(id,resolve);this.node.port.postMessage({type:'sync',id});});}
 dispose(){this.node.port.postMessage({type:'dispose'});this.node.disconnect();this.clock.disconnect();this.node.port.close();for(const v of this.slots.values())v.done();this.slots.clear();}
}
export class SoundFontVoice{
 constructor(ctx,master,reverb,bank){this.ctx=ctx;this.master=master;this.reverb=reverb;this.bank=bank;this.voices=new Set();}
 play(type,midi,velocity,at,route){const p=FONT_INSTRUMENTS[type];if(!p||!this.bank||velocity<=0)return false;
  const gain=this.ctx.createGain(),send=this.ctx.createGain();gain.gain.value=1;send.gain.value=p.bank?.08:.18;gain.connect(route?.master||this.master);gain.connect(send);send.connect(route?.reverb||this.reverb);
  const voice=this.bank.createVoice(this.ctx,{...p,midi:p.note??midi,velocity,when:at,output:gain,onended:()=>{this.voices.delete(voice);gain.disconnect();send.disconnect();}});this.voices.add(voice);voice.release(at+p.gate);return true;
 }
}
