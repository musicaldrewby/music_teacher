class Recorder extends AudioWorkletProcessor{
 constructor(){super();this.enabled=false;this.l=new Float32Array(8192);this.r=new Float32Array(8192);this.index=0;this.port.onmessage=({data})=>{if(data==='start'){this.enabled=true;this.index=0;}if(data==='stop'){this.flush();this.enabled=false;this.port.postMessage({type:'done'});}};}
 flush(){if(this.index){const l=this.l.slice(0,this.index),r=this.r.slice(0,this.index);this.port.postMessage({type:'chunk',l,r},[l.buffer,r.buffer]);this.index=0;}}
 process(inputs,outputs){const input=inputs[0],output=outputs[0];if(!input?.length)return true;for(let ch=0;ch<output.length;ch++)output[ch].set(input[ch]||input[0]);if(this.enabled)for(let i=0;i<input[0].length;i++){this.l[this.index]=input[0][i];this.r[this.index]=input[1]?.[i]??input[0][i];this.index++;if(this.index===8192)this.flush();}return true;}
}registerProcessor('circuit-recorder',Recorder);
