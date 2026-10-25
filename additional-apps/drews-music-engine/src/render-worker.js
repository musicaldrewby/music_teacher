import { getBankInfo,compileSong,compileMIDI,renderPCM,encodeWAV,waveform } from './engine.js';
import { encodeMP3 } from './mp3.js';
let bank;
self.onmessage=async({data:m})=>{
  const progress=(percent,stage)=>self.postMessage({id:m.id,type:'progress',percent,stage});
  try{
    if(m.action==='init'){
      const result=getBankInfo(m.buffer);bank=result.bank;self.postMessage({id:m.id,type:'ready',presets:result.presets});return;
    }
    if(m.action==='inspect'){
      const compiled=m.midi?compileMIDI(m.midi,m.name):compileSong(m.song);self.postMessage({id:m.id,type:'inspected',compiled});return;
    }
    if(m.action==='render'){
      if(!bank)throw new Error('The SoundFont is not ready yet.');
      const compiled=m.midi?compileMIDI(m.midi,m.name):compileSong(m.song);
      const pcm=await renderPCM(compiled,bank,m.options,progress),wave=waveform(pcm),wav=encodeWAV(pcm),mp3=encodeMP3(pcm,progress);
      self.postMessage({id:m.id,type:'rendered',wav,mp3,wave,info:{title:compiled.title,duration:pcm.duration,musicDuration:compiled.duration,sampleRate:pcm.sampleRate,peak:pcm.peak,noteCount:compiled.noteCount,parts:compiled.parts}},[wav,mp3]);
    }
  }catch(e){self.postMessage({id:m.id,type:'error',message:e?.message||String(e)});}
};
