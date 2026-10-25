import {ShowEngine} from './show-engine.js';
class ShowProcessor extends AudioWorkletProcessor {
 constructor(){super();this.running=false;this.tick=0;this.generation=0;this.port.onmessage=async({data:m})=>{try{
  if(m.type==='init'){this.running=false;const generation=++this.generation;const engine=await new ShowEngine(sampleRate).init(m.font,m.score);if(generation!==this.generation)return;this.engine=engine;this.port.postMessage({type:'ready',snapshot:engine.snapshot(),audioTime:typeof currentTime==='number'?currentTime:0})}
  else if(m.type==='play'&&this.engine){this.running=true}
  else if(m.type==='pause'){this.running=false;this.port.postMessage({type:'paused',snapshot:this.engine?.snapshot(),audioTime:typeof currentTime==='number'?currentTime:0})}
  else if(m.type==='stop'){this.running=false;this.generation++;this.port.postMessage({type:'stopped'})}
 }catch(e){this.running=false;this.port.postMessage({type:'error',message:e.message})}}}
 process(_,outputs){const [l,r]=outputs[0]||[];if(!l||!this.engine||!this.running)return true;try{this.engine.process(l,r||l);if(++this.tick%16===0||this.engine.done)this.port.postMessage({type:'position',snapshot:this.engine.snapshot(),audioTime:(typeof currentTime==='number'?currentTime:0)+l.length/sampleRate});if(this.engine.done){this.running=false;this.port.postMessage({type:'ended',peak:this.engine.peak})}}catch(e){this.running=false;this.port.postMessage({type:'error',message:e.message})}return true}
}
registerProcessor('orbit-show',ShowProcessor);
