import {PatchCore} from './soundfont-core.js';
class MusicLabSoundFont extends AudioWorkletProcessor{
 constructor(){super();this.core=null;this.ready=false;this.disposed=false;this.pending=[];this.port.onmessage=({data})=>{
  if(data.type==='init'){
   try{this.core=new PatchCore(sampleRate,data.bank,currentTime,event=>this.port.postMessage({type:'ended',...event}));this.core.ready.then(()=>{for(const e of this.pending)this.core.enqueue(e);this.pending=[];this.ready=true;this.port.postMessage({type:'ready'});}).catch(error=>this.port.postMessage({type:'error',message:error.message}));}
   catch(error){this.port.postMessage({type:'error',message:error.message});}
  }else if(data.type==='dispose'){this.core?.dispose();this.disposed=true;}
  else if(data.type==='sync'){this.port.postMessage({type:'synced',id:data.id});}
  else if(this.ready)this.core.enqueue(data);else this.pending.push(data);
 };}
 process(_inputs,outputs){if(this.disposed)return false;if(this.ready)this.core.process(outputs,currentTime);return true;}
}
registerProcessor('music-lab-soundfont',MusicLabSoundFont);
