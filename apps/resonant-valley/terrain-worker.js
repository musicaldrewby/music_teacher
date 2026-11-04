import {solveLight} from './lighting.js';
import {TerrainGenerator,applyChunkEdits} from './terrain.js';
import {meshChunk,meshTransfers} from './chunk-mesh.js';
let generator=null,epoch=-1;
self.onmessage=({data:job})=>{
  try{
    if(!generator||epoch!==job.epoch){generator=new TerrainGenerator(job.config);epoch=job.epoch;}
    const chunk=job.kind==='generate'?generator.generateChunk(job.cx,job.cz):job.chunk;
    applyChunkEdits(chunk,job.edits);
    solveLight(chunk,job.lightEdges,job.lightSources);
    const meshes=meshChunk(chunk);
    self.postMessage({id:job.id,epoch:job.epoch,revision:job.revision,chunk,meshes},[chunk.cells.buffer,chunk.sky.buffer,chunk.glow.buffer,...meshTransfers(meshes)]);
  }catch(error){self.postMessage({id:job.id,epoch:job.epoch,error:String(error?.message||error)});}
};
