import {TerrainGenerator} from './terrain.js';
import {sampleHorizonTile,horizonFeatures} from './horizon-samples.js';
import {finishSteps} from './work-steps.js';
let generator,epoch;
self.onmessage=({data:job})=>{
 try{
  if(epoch!==job.epoch){generator=new TerrainGenerator(job.config);epoch=job.epoch;}
  const data=job.kind==='plan'?horizonFeatures(generator,job.cx,job.cz):finishSteps(sampleHorizonTile(generator,job.x,job.z));
  self.postMessage({id:job.id,epoch,kind:job.kind,data});
 }catch(error){self.postMessage({id:job.id,epoch:job.epoch,error:String(error?.message||error)});}
};
