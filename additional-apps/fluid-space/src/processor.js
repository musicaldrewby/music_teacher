import {FluidEngine} from './engine.js';
class FluidProcessor extends AudioWorkletProcessor {
 constructor(){super();this.engine=new FluidEngine(sampleRate,this.port,()=>currentTime)}
 process(inputs,outputs){return this.engine.process(inputs,outputs)}
}
registerProcessor('fluid-space',FluidProcessor);
