import {FluidEngine} from './engine.js';
import {clone} from './model.js';
import {createExportPlan,wavHeader,encodePCM} from './export-plan.js';
// Both the worklet and this renderer use FluidEngine, including its mixer and FX.
export async function renderWave(project,font,options,onChunk,onProgress=()=>{}){
 const plan=createExportPlan(project,options),snapshot=clone(project);snapshot.scene=plan.segments[0].scene;snapshot.metronome='off';snapshot.fx.reverb.freeze=false;
 let engineError;const engine=new FluidEngine(plan.rate,{postMessage:m=>{if(m.type==='error')engineError=m.message}});
 try{
  await engine.message({type:'init',font,project:snapshot});
  if(!engine.ready)throw Error(engineError||'The export engine could not initialize.');
  engine.start(false);engine.origin=0;engine.fx.master=snapshot.master;
  onChunk(wavHeader(plan));
  const chunkFrames=65536,left=new Float32Array(chunkFrames),right=new Float32Array(chunkFrames);
  let frame=0,segment=0,musicEnded=false;
  while(frame<plan.frames){
   const length=Math.min(chunkFrames,plan.frames-frame);let written=0;
   while(written<length){
    const absolute=frame+written;engine.currentTime=absolute/plan.rate;
    if(!musicEnded&&absolute===plan.segments[segment].endFrame){
     if(segment+1<plan.segments.length){segment++;engine.releasePlayback();engine.scene=plan.segments[segment].scene;engine.origin=engine.currentTime;engine.compile()}
     else{engine.stop();musicEnded=true}
    }
    const boundary=musicEnded?plan.frames:plan.segments[segment].endFrame,count=Math.min(128,length-written,boundary-absolute);
    engine.process([],[[left.subarray(written,written+count),right.subarray(written,written+count)]]);written+=count;
   }
   onChunk(encodePCM(left.subarray(0,length),right.subarray(0,length),plan.bits,frame,plan));frame+=length;onProgress(frame/plan.frames);
  }
  return plan;
 }finally{engine.synth?.destroySynthProcessor()}
}
