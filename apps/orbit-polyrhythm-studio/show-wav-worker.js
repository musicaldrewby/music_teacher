import {ShowEngine} from './show-engine.js';
let engine,cancelled=false,ack;
self.onmessage=async({data:m})=>{
 if(m.type==='cancel'){cancelled=true;ack?.();return}
 if(m.type==='ack'){ack?.();return}
 if(m.type!=='render')return;
 try{cancelled=false;engine=await new ShowEngine(48000).init(m.font,m.score);self.postMessage({type:'ready',frames:engine.totalFrames});
  const l=new Float32Array(128),r=new Float32Array(128);let chunk=new Int16Array(48000*2),used=0;
  while(!engine.done&&!cancelled){const left=Math.min(128,engine.totalFrames-engine.frame);engine.process(l.subarray(0,left),r.subarray(0,left));for(let j=0;j<left;j++){chunk[used++]=Math.round(l[j]*32767);chunk[used++]=Math.round(r[j]*32767)}
   if(used===chunk.length||engine.done){const data=chunk.slice(0,used).buffer;await new Promise(resolve=>{ack=resolve;self.postMessage({type:'chunk',data,progress:engine.frame/engine.totalFrames},[data])});ack=null;chunk=new Int16Array(48000*2);used=0}
  }
  self.postMessage({type:cancelled?'cancelled':'done',peak:engine.peak});
 }catch(e){self.postMessage({type:'error',message:e.message})}
};
