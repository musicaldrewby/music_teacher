import {clamp} from './data.js';
import {effectsGraph as graph,echoSeconds} from './audio-effects.js';

let bankPromise;
export function loadSoundFont(){
 if(!bankPromise)bankPromise=Promise.all(['01','02','03','04'].map(async i=>{const r=await fetch(new URL(`./assets/generaluser-1.471-f45b6b4a68b6.part${i}.bin`,import.meta.url));if(!r.ok)throw Error('Sound library could not load. Please try again.');return new Uint8Array(await r.arrayBuffer());})).then(parts=>{const bytes=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let at=0;for(const part of parts){bytes.set(part,at);at+=part.length;}return bytes.buffer;}).catch(error=>{bankPromise=null;throw error;});
 return bankPromise;
}
export class AudioEngine {
 constructor(){this.ctx=null;this.volume=.65;this.playing=false;this.source='studio';this.loop=true;this.metronome=false;this.serial=0;this.ready=false;}
 async unlockWorld(){
  if(!this.ctx)this.ctx=new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});
  if(this.ctx.state==='suspended')await this.ctx.resume();
  return this.ctx;
 }
 async init(){
  await this.unlockWorld();
  if(!this.graph){this.graph=graph(this.ctx,this.volume,0);this.output=this.ctx.createGain();this.output.connect(this.graph.input);}
  if(!this.loading)this.loading=this.load().catch(error=>{this.node?.disconnect();this.node?.port.close();this.node=null;this.ready=false;this.loading=null;this.onStatus?.(error.message);throw error;});
  await this.loading;return this.ctx;
 }
 async load(){
  this.onStatus?.('Loading GeneralUser instruments…');
  // Older browsers and non-secure local previews can still play the same sampled bank.
  if(!this.ctx.audioWorklet){
   const [bytes,{SoundFontRack}]=await Promise.all([loadSoundFont(),import('./soundfont-rack.js')]);
   const rack=new SoundFontRack(bytes,this.ctx.sampleRate),node=this.ctx.createScriptProcessor(2048,0,2);
   node.port={postMessage:data=>{if(data.type==='configure')rack.configure(data.tracks);else if(data.type==='sync')rack.sync(data.tracks);else if(data.type==='note')rack.note(data);else if(data.type==='release')rack.release(data.id,data.frame);else if(data.type==='stop')rack.stop();},close:()=>{node.onaudioprocess=null;rack.stop();}};
   node.onaudioprocess=e=>rack.render(e.outputBuffer.getChannelData(0),e.outputBuffer.getChannelData(1),Math.round(e.playbackTime*this.ctx.sampleRate));
   this.node=node;node.connect(this.output);this.ready=true;this.onStatus?.('GeneralUser GS · Compatibility audio');return;
  }
  const [bytes]=await Promise.all([loadSoundFont(),this.ctx.audioWorklet.addModule(new URL('./soundfont-worklet.js',import.meta.url))]);
  this.node=new AudioWorkletNode(this.ctx,'valley-sampler',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});
  this.node.connect(this.output);
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Sound library timed out. Please try again.')),45000);this.node.port.onmessage=({data})=>{if(data.type==='ready'){clearTimeout(timer);resolve();}else if(data.type==='error'){clearTimeout(timer);reject(Error(data.message));this.onStatus?.('Audio: '+data.message);}};const copy=bytes.slice(0);this.node.port.postMessage({type:'init',bytes:copy},[copy]);});
  this.ready=true;this.onStatus?.('GeneralUser GS · Ready');
 }
 send(data){if(this.ready)this.node.port.postMessage(data);}
 setVolume(v){this.volume=clamp(v,0,1);if(this.graph)this.graph.master.gain.setTargetAtTime(this.volume*1.1,this.ctx.currentTime,.03);}
 setRoom(v){if(this.graph)this.graph.wet.gain.setTargetAtTime(v,this.ctx.currentTime,.08);}
 setEcho(v,bpm=96){if(this.graph){this.graph.echoWet.gain.setTargetAtTime(clamp(v,0,.5),this.ctx.currentTime,.03);this.graph.delay.delayTime.setTargetAtTime(echoSeconds(bpm),this.ctx.currentTime,.03);}}
 setDistanceGain(v){if(this.output)this.output.gain.setTargetAtTime(v,this.ctx.currentTime,.1);}
 audition(instrument,pitch,duration=2,velocity=.7,volume=.7,pads=null){
  if(!this.ready)return null;const id='live-'+this.serial++;
  const frame=Math.round((this.ctx.currentTime+.005)*this.ctx.sampleRate);
  this.send({type:'note',id,track:'audition',instrument,pads,pitch,velocity,volume,frame,duration});
  const release=()=>this.send({type:'release',id,frame:Math.max(frame+1,Math.round(this.ctx.currentTime*this.ctx.sampleRate))});
  return {release,cancel:release};
 }
 start(song,{source='studio',countIn=false,loop=true,onEnd=null,initialGain=1,prepareSong=s=>s}={}){
  if(!this.ready)return;this.stop(false);this.originalSong=song;this.prepareSong=prepareSong;this.song=prepareSong(song);this.source=source;this.loop=loop;this.onEnd=onEnd;this.playing=true;this.step=countIn?-16:0;this.startStep=this.step;this.sec=60/song.bpm/4;this.startTime=this.ctx.currentTime+.08;this.nextTime=this.startTime;this.setRoom(this.song.reverb);this.setEcho(this.song.delay,song.bpm);if(this.output){this.output.gain.cancelScheduledValues(this.ctx.currentTime);this.output.gain.setValueAtTime(initialGain,this.ctx.currentTime);}this.send({type:'configure',tracks:this.song.tracks});this.tick();this.timer=setInterval(()=>this.tick(),25);
 }
 tick(){
  if(!this.playing)return;this.song=this.prepareSong(this.originalSong);const len=this.song.bars*16;this.setRoom(this.song.reverb);this.setEcho(this.song.delay,this.song.bpm);this.send({type:'sync',tracks:this.song.tracks.map(t=>({...t,notes:[]}))});
  if(this.nextTime<this.ctx.currentTime-.2){const missed=Math.floor((this.ctx.currentTime-this.nextTime)/this.sec);this.nextTime+=missed*this.sec;this.step+=missed;if(this.loop&&this.step>=len)this.step%=len;}
  while(this.nextTime<this.ctx.currentTime+.15){
   if(this.step>=len){if(!this.loop){clearInterval(this.timer);this.endTimer=setTimeout(()=>{this.stop();this.onEnd?.();},Math.max(0,(this.nextTime-this.ctx.currentTime+(this.song.delay>0?9:3))*1000));return;}this.step=0;}
   if(this.step>=0)this.song.tracks.forEach((t,i)=>{for(const n of t.notes)if(n.s>=this.step&&n.s<this.step+1)this.send({type:'note',track:i,pitch:n.p,velocity:n.v,frame:Math.round((this.nextTime+(n.s-this.step)*this.sec)*this.ctx.sampleRate),duration:Math.min(n.d,len-n.s)*this.sec});});
   if((this.metronome&&this.source==='studio'||this.step<0)&&((this.step%4+4)%4===0)){const osc=this.ctx.createOscillator(),g=this.ctx.createGain();osc.frequency.value=this.step%16===0?1400:1050;g.gain.setValueAtTime(.035,this.nextTime);g.gain.exponentialRampToValueAtTime(.00001,this.nextTime+.03);osc.connect(g);g.connect(this.graph.input);osc.start(this.nextTime);osc.stop(this.nextTime+.04);setTimeout(()=>g.disconnect(),500);}
   this.nextTime+=this.sec;this.step++;
  }
 }
 position(at=this.ctx?.currentTime){if(!this.playing||!this.ctx)return 0;const raw=(at-this.startTime)/this.sec+this.startStep;return raw<0?raw:raw%(this.song.bars*16);}
 stop(notify=true){clearInterval(this.timer);clearTimeout(this.endTimer);this.playing=false;this.send({type:'stop'});if(notify)this.onStop?.();}
 async exportWav(song){
  const bytes=await loadSoundFont(),rate=44100,worker=new Worker(new URL('./audio-render-worker.js',import.meta.url),{type:'module'});
  const result=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{worker.terminate();reject(Error('Audio export timed out.'));},120000);worker.onmessage=({data})=>{clearTimeout(timer);worker.terminate();data.error?reject(Error(data.error)):resolve(data);};worker.onerror=e=>{clearTimeout(timer);worker.terminate();reject(Error(e.message));};const copy=bytes.slice(0);worker.postMessage({bytes:copy,song,rate},[copy]);});
  const ctx=new OfflineAudioContext(2,result.left.length,rate),g=graph(ctx,.75,song.reverb,song.delay,song.bpm),b=ctx.createBuffer(2,result.left.length,rate);b.copyToChannel(result.left,0);b.copyToChannel(result.right,1);const source=ctx.createBufferSource();source.buffer=b;source.connect(g.input);source.start();return encodeWav(await ctx.startRendering());
 }
}
export function encodeWav(buffer){const length=buffer.length,channels=buffer.numberOfChannels,bytes=length*channels*2;const data=new ArrayBuffer(44+bytes),view=new DataView(data),str=(o,s)=>{for(let i=0;i<s.length;i++)view.setUint8(o+i,s.charCodeAt(i));};str(0,'RIFF');view.setUint32(4,36+bytes,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,channels,true);view.setUint32(24,buffer.sampleRate,true);view.setUint32(28,buffer.sampleRate*channels*2,true);view.setUint16(32,channels*2,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,bytes,true);const arrays=Array.from({length:channels},(_,c)=>buffer.getChannelData(c));let peak=0;for(const a of arrays)for(let i=0;i<a.length;i++)peak=Math.max(peak,Math.abs(a[i]));const gain=peak>.0001?Math.min(6,.891/peak):1;let off=44;for(let i=0;i<length;i++)for(let c=0;c<channels;c++){const v=Math.max(-1,Math.min(1,arrays[c][i]*gain));view.setInt16(off,v<0?v*32768:v*32767,true);off+=2;}return new Blob([data],{type:'audio/wav'});}
