import type {Scene} from './scene';
import type {SoundCue} from './directing';
import {decodeData} from './models';
export const soundCatalog=[{id:'music-box',name:'Christmas music box',seconds:16},{id:'train',name:'Steam train rhythm',seconds:4},{id:'bell',name:'Station bell',seconds:2},{id:'whistle',name:'Steam whistle',seconds:3},{id:'whoosh',name:'Air whoosh',seconds:1.2},{id:'chime',name:'Magic chime',seconds:2.5},{id:'impact',name:'Soft impact',seconds:.8}] as const;
export function soundSample(kind:string,t:number,duration:number){
 const tau=Math.PI*2,noise=Math.sin(t*12771.31+Math.sin(t*421.7)*113.3),env=Math.min(1,t*30)*Math.min(1,Math.max(0,(duration-t)*8));
 if(kind==='music-box'){const melody=[72,76,79,76,81,79,76,74,77,81,84,81,79,76,74,72,76,79,84,83,81,79,77,76,74,77,79,71,72,76,79,72],step=Math.floor(t/.5),local=t%.5,note=melody[step%melody.length],f=440*2**((note-69)/12),attack=Math.min(1,local*150),tone=(Math.sin(local*tau*f)+.24*Math.sin(local*tau*f*2)+.08*Math.sin(local*tau*f*4.01))*Math.exp(-local*7)*attack,bassNote=[48,53,55,48][Math.floor(step/8)%4],bt=t%1,bf=440*2**((bassNote-69)/12);return (.32*tone+.12*Math.sin(bt*tau*bf)*Math.exp(-bt*5)*Math.min(1,bt*80))*env;}
 if(kind==='train'){const pulse=(t%.32)/.32;return (.22*Math.exp(-pulse*10)*noise+.12*Math.sin(t*tau*52)+.24*Math.exp(-((t%.8)/.8)*70)*Math.sin(t*tau*190))*env;}
 if(kind==='bell'||kind==='chime'){const f=kind==='bell'?660:880;return (.45*Math.sin(t*tau*f)*Math.exp(-t*2)+.2*Math.sin(t*tau*f*2.71)*Math.exp(-t*4)+.1*Math.sin(t*tau*f*4.1)*Math.exp(-t*6))*env;}
 if(kind==='whistle')return (Math.sin(t*tau*440+Math.sin(t*7)*.5)*.22+Math.sin(t*tau*554)*.14+Math.sin(t*tau*660)*.1)*Math.sin(Math.PI*t/duration)**.5*env;
 if(kind==='whoosh')return noise*.5*Math.sin(Math.PI*t/duration)**2;
 return (.6*Math.sin(t*tau*(65-20*t))+.2*noise)*Math.exp(-t*12)*env;
}
export function cueWindow(cue:SoundCue,total:number){return {start:Math.max(0,cue.time),duration:Math.max(0,Math.min(cue.duration,total-cue.time)),offset:Math.max(0,cue.offset)};}
export async function mixSceneAudio(scene:Scene,fps:number=scene.fps):Promise<AudioBuffer|null>{
 if(!scene.audio.enabled||!scene.audio.cues.length)return null;
 const rate=48000,duration=Math.round(scene.duration*fps)/fps,context=new OfflineAudioContext(2,Math.round(duration*rate),rate),master=context.createGain();master.gain.value=scene.audio.volume;master.connect(context.destination);
 const buffers=new Map<string,AudioBuffer>();
 for(const cue of scene.audio.cues){const key=cue.kind==='audio'?cue.assetId:cue.kind;let buffer=buffers.get(key);
  if(!buffer){if(cue.kind==='audio'){const asset=scene.audio.assets[cue.assetId];if(!asset)throw Error('A sound cue is missing its audio file.');buffer=await context.decodeAudioData(decodeData(asset.data));if(buffer.duration>600)throw Error('Imported audio must be 10 minutes or shorter.');}else{const seconds=soundCatalog.find(s=>s.id===cue.kind)?.seconds||1;buffer=context.createBuffer(1,Math.round(seconds*rate),rate);const data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=soundSample(cue.kind,i/rate,seconds);}buffers.set(key,buffer);}
  const w=cueWindow(cue,duration);if(w.duration<=0)continue;const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;source.loop=cue.loop;const offset=cue.loop?w.offset%buffer.duration:w.offset;if(offset>=buffer.duration)continue;
  const length=cue.loop?w.duration:Math.min(w.duration,buffer.duration-offset),fadeIn=Math.min(cue.fadeIn,length/2),fadeOut=Math.min(cue.fadeOut,length/2);gain.gain.setValueAtTime(fadeIn?0:cue.volume,w.start);gain.gain.linearRampToValueAtTime(cue.volume,w.start+fadeIn);gain.gain.setValueAtTime(cue.volume,w.start+length-fadeOut);gain.gain.linearRampToValueAtTime(0,w.start+length);source.connect(gain);gain.connect(master);source.start(w.start,offset);source.stop(w.start+length);
 }
 const mixed=await context.startRendering();for(let c=0;c<mixed.numberOfChannels;c++){const samples=mixed.getChannelData(c);for(let i=0;i<samples.length;i++){const value=samples[i],magnitude=Math.abs(value);if(magnitude>.85)samples[i]=Math.sign(value)*(.85+.15*Math.tanh((magnitude-.85)/.15));}}return mixed;
}
export class SoundPreview{
 private context?:AudioContext;private source?:AudioBufferSourceNode;private generation=0;private key='';private buffer?:AudioBuffer|null;private pending?:Promise<void>;private startTime=0;private offset=0;
 async prepare(scene:Scene){const key=JSON.stringify([scene.audio.enabled,scene.audio.volume,scene.audio.cues,Object.entries(scene.audio.assets).map(([id,a])=>[id,a.data]),scene.duration,scene.fps]);if(this.key===key){await this.pending;return;}this.stop();this.key=key;this.buffer=undefined;const generation=++this.generation;this.pending=mixSceneAudio(scene).then(buffer=>{if(generation===this.generation)this.buffer=buffer;});await this.pending;}
 unlock(){this.context??=new AudioContext();return this.context.resume();}
 async play(scene:Scene,time:()=>number,isPlaying:()=>boolean){await this.unlock();await this.prepare(scene);if(!isPlaying()||!this.buffer||this.source)return;this.source=this.context!.createBufferSource();this.source.buffer=this.buffer;this.source.loop=true;this.source.connect(this.context!.destination);this.offset=time()%this.buffer.duration;this.startTime=this.context!.currentTime;this.source.start(0,this.offset);}
 clock(){return this.source&&this.context&&this.buffer?(this.offset+this.context.currentTime-this.startTime)%this.buffer.duration:null;}
 stop(){this.source?.stop();this.source?.disconnect();this.source=undefined;}
 dispose(){this.stop();this.generation++;void this.context?.close();}
}
