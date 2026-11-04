import {SoundFontRack} from './soundfont-rack.js';
class ValleySampler extends AudioWorkletProcessor {
 constructor(){super();this.port.onmessage=({data})=>{try{
  if(data.type==='init'){this.rack=new SoundFontRack(data.bytes,sampleRate);this.port.postMessage({type:'ready'});}
  else if(data.type==='configure')this.rack.configure(data.tracks);
  else if(data.type==='sync')this.rack.sync(data.tracks);
  else if(data.type==='note')this.rack.note(data);
  else if(data.type==='release')this.rack.release(data.id,data.frame);
  else if(data.type==='stop')this.rack?.stop();
 }catch(error){this.port.postMessage({type:'error',message:error.message});}};}
 process(inputs,outputs){if(this.rack)this.rack.render(outputs[0][0],outputs[0][1],currentFrame);return true;}
}
registerProcessor('valley-sampler',ValleySampler);
