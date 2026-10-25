import {audioPlan,audioGain,showTiming,clamp} from './project.mjs';
import {cueAudioPlan,songHeadroom,mixCueAudio,CUE_RATE} from './cue-audio.mjs';
export class TrackPlayer{
 constructor(){this.buffer=null;this.playing=false;this.position=0;}
 async context(resume=false){if(!this.ctx){const AC=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AC)throw new Error('Audio playback is unavailable in this browser.');this.ctx=new AC({sampleRate:48000});}if(resume&&this.ctx.state==='suspended')await this.ctx.resume();return this.ctx;}
 async decode(bytes){await this.context();let buffer=await this.ctx.decodeAudioData(bytes.slice(0));if(buffer.numberOfChannels>2||buffer.sampleRate!==48000){const ctx=new OfflineAudioContext(2,Math.ceil(buffer.duration*48000),48000),s=ctx.createBufferSource();s.buffer=buffer;s.connect(ctx.destination);s.start();buffer=await ctx.startRendering();}return buffer;}
 start(p,offset=0,{pairedSounds=true}={}){if(!this.buffer)throw new Error('Load your audio first.');this.stop();this.project=p;this.position=offset;this.epoch=this.ctx.currentTime;this.playing=true;const plan=audioPlan(p,offset),headroom=pairedSounds?songHeadroom(p):1;
  if(plan.duration>0){const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=this.buffer;source.connect(gain);gain.connect(this.ctx.destination);const at=this.epoch+plan.delay;gain.gain.setValueAtTime(audioGain(p,plan.offset)*headroom,at);
   const length=p.trimOut-p.trimIn,fi=Math.min(p.show.fadeIn,length/2),fo=Math.min(p.show.fadeOut,length/2);
   for(const t of [p.trimIn+fi,p.trimOut-fo,p.trimOut])if(t>plan.offset)gain.gain.linearRampToValueAtTime(t===p.trimOut?0:audioGain(p,t)*headroom,at+t-plan.offset);
   source.start(at,plan.offset,plan.duration);this.source=source;this.gain=gain;
  }
  if(pairedSounds){this.cueSources=[];this.cueBuffers||=new WeakMap();for(const hit of cueAudioPlan(p)){const start=hit.start/CUE_RATE,duration=hit.data.length/CUE_RATE,skip=Math.max(0,offset-start);if(skip>=duration)continue;let buffer=this.cueBuffers.get(hit.data);if(!buffer){buffer=this.ctx.createBuffer(1,hit.data.length,CUE_RATE);buffer.getChannelData(0).set(hit.data);this.cueBuffers.set(hit.data,buffer);}const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;gain.gain.setValueAtTime(p.pairVolume,this.epoch);source.connect(gain);gain.connect(this.ctx.destination);source.start(this.epoch+Math.max(0,start-offset),skip,duration-skip);this.cueSources.push({source,gain});}}
 }
 audibleTime(){const stamp=this.ctx.getOutputTimestamp?.();if(stamp?.performanceTime>0){const elapsed=(performance.now()-stamp.performanceTime)/1000;if(elapsed>=0&&elapsed<1)return Math.min(this.ctx.currentTime,stamp.contextTime+elapsed);}return this.ctx.currentTime;}
 current(){return this.playing?clamp(this.position+this.audibleTime()-this.epoch,this.position,showTiming(this.project).total):this.position;}
 stop(){const position=this.current();for(const {source,gain}of this.cueSources||[]){try{source.stop();}catch{}source.disconnect();gain.disconnect();}this.cueSources=[];if(this.source){try{this.source.stop();}catch{}this.source.disconnect();this.gain?.disconnect();this.source=null;}this.position=position;this.playing=false;return position;}
}
// The source was decoded/downmixed to 48 kHz once. Copy exact source samples
// with the same trim, introduction offset, level and fades used in playback.
export function audioPiece(p,buffer,from,frames,rate=48000){
 const channels=[new Float32Array(frames),new Float32Array(frames)],left=buffer.getChannelData(0),right=buffer.getChannelData(Math.min(1,buffer.numberOfChannels-1)),lead=showTiming(p).lead,headroom=songHeadroom(p);
 const sourceOffset=(p.trimIn-lead)*buffer.sampleRate,outputFrame=Math.round(from*rate),step=buffer.sampleRate/rate;
 for(let i=0;i<frames;i++){let sample=sourceOffset+(outputFrame+i)*step;if(Math.abs(sample-Math.round(sample))<1e-6)sample=Math.round(sample);const song=sample/buffer.sampleRate,gain=audioGain(p,song)*headroom;if(!gain)continue;const j=Math.floor(sample),mix=sample-j;if(j<0||j>=left.length)continue;const k=Math.min(j+1,left.length-1);channels[0][i]=(left[j]+(left[k]-left[j])*mix)*gain;channels[1][i]=(right[j]+(right[k]-right[j])*mix)*gain;}
 return mixCueAudio(p,channels,from,rate);
}
export function waveformPeaks(buffer,bins=3000){const out=new Float32Array(bins),channels=Array.from({length:Math.min(2,buffer.numberOfChannels)},(_,i)=>buffer.getChannelData(i)),step=Math.max(1,Math.floor(buffer.length/bins));for(let i=0;i<bins;i++){let peak=0;const begin=i*step,end=Math.min(buffer.length,begin+step);for(let j=begin;j<end;j+=Math.max(1,Math.floor(step/80)))for(const channel of channels)peak=Math.max(peak,Math.abs(channel[j]));out[i]=peak;}return out;}
