import {OrbitCore} from './orbit-core.js';
// The studio and show renderer share the exact same sequencer and SoundFont engine.
export class OrbitProcessor extends AudioWorkletProcessor {
 constructor(){super();this.initialize(sampleRate,this.port)}
}
for(const key of Object.getOwnPropertyNames(OrbitCore.prototype)) {
 if(key!=='constructor')Object.defineProperty(OrbitProcessor.prototype,key,Object.getOwnPropertyDescriptor(OrbitCore.prototype,key));
}
registerProcessor('orbit-processor',OrbitProcessor);
