// Classic worker keeps the unmodified LGPL encoder in its own runtime file.
importScripts('assets/lame.min.js');
let cancelled=false,ack;
self.onmessage=async({data:m})=>{
 if(m.type==='cancel'){cancelled=true;ack?.();return;}
 if(m.type==='ack'){ack?.();return;}
 if(m.type!=='render')return;
 try{
  cancelled=false;
  const {ShowEngine}=await import('./show-engine.js');
  const engine=await new ShowEngine(48000).init(m.font,m.score);
  const encoder=new lamejs.Mp3Encoder(2,48000,320);
  self.postMessage({type:'ready',frames:engine.totalFrames});
  const l=new Float32Array(128),r=new Float32Array(128);
  const left=new Int16Array(48000),right=new Int16Array(48000);let used=0;
  async function send(bytes,progress){
   if(!bytes.length||cancelled)return;
   const data=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
   await new Promise(resolve=>{ack=resolve;self.postMessage({type:'chunk',data,progress},[data]);});ack=null;
  }
  while(!engine.done&&!cancelled){
   const count=Math.min(128,engine.totalFrames-engine.frame,left.length-used);
   engine.process(l.subarray(0,count),r.subarray(0,count));
   for(let i=0;i<count;i++){left[used]=Math.round(l[i]*32767);right[used++]=Math.round(r[i]*32767);}
   if(used===left.length||engine.done){
    await send(encoder.encodeBuffer(left.subarray(0,used),right.subarray(0,used)),engine.frame/engine.totalFrames*.995);used=0;
   }
  }
  if(!cancelled)await send(encoder.flush(),1);
  self.postMessage({type:cancelled?'cancelled':'done',peak:engine.peak});
 }catch(e){self.postMessage({type:'error',message:e.message});}
};
