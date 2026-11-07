import {solveLightSteps,lightEdges,needsNeighborLight,LIGHT_NEIGHBORS,sampleLight} from './lighting.js';
import {TerrainGenerator,applyChunkEdits,CHUNK_SIZE,MIN_Y,MAX_Y,WORLD_LIMIT,PAD,STRIDE,voxelIndex,chunkKey,chunkAt,blockKey} from './terrain.js';
import {meshChunkSteps} from './chunk-mesh.js';
import {nextFrame} from './frame-work.js';

// Only the moving neighborhood is resident. The edit journal survives eviction.
export class TerrainStream {
  constructor(config,{worker=null,onLoad=()=>{},onUnload=()=>{},onError=()=>{}}={}){
    this.generator=new TerrainGenerator(config);this.worker=worker;this.onLoad=onLoad;this.onUnload=onUnload;this.onError=onError;
    this.lightSources=[];this.loaded=new Map();this.edits=new Map();this.editChunks=new Map();this.revisions=new Map();this.geometryRevisions=new Map();this.dirty=new Set();
    this.pending=new Map();this.pendingKeys=new Set();this.queue=[];this.center=null;this.radius=3;this.epoch=1;this.nextId=1;this.closed=false;
    this.completed=[];this.nextLocalJob=0;this.travel=null;this.leadX=0;this.leadZ=0;
    if(worker){worker.onmessage=e=>{if(!this.closed)this.completed.push(e.data);};worker.onerror=e=>{e.preventDefault?.();this.fallback('Background terrain generation is unavailable.');};}
  }
  near(cx,cz,extra=0){return this.center&&Math.max(Math.abs(cx-this.center.cx),Math.abs(cz-this.center.cz))<=this.radius+extra;}
  update(x,z,radius=this.radius){
    const cx=Math.floor(x/CHUNK_SIZE),cz=Math.floor(z/CHUNK_SIZE);radius=Math.max(2,Math.min(5,radius|0));
    let leadX=this.leadX,leadZ=this.leadZ;
    if(!this.travel||Math.max(Math.abs(x-this.travel.x),Math.abs(z-this.travel.z))>CHUNK_SIZE*2){
      this.travel={x,z};leadX=leadZ=0;
    }else{
      const dx=x-this.travel.x,dz=z-this.travel.z,distance=Math.hypot(dx,dz);
      if(distance>=3){leadX=Math.abs(dx)>.4*distance?Math.sign(dx):0;leadZ=Math.abs(dz)>.4*distance?Math.sign(dz):0;this.travel={x,z};}
    }
    if(this.center?.cx===cx&&this.center?.cz===cz&&this.radius===radius&&leadX===this.leadX&&leadZ===this.leadZ)return;
    this.leadX=leadX;this.leadZ=leadZ;
    this.center={cx,cz};this.radius=radius;
    for(const [k,c] of this.loaded)if(!this.near(c.cx,c.cz,1)){this.onUnload(k);this.loaded.delete(k);this.dirty.delete(k);if(!this.editChunks.has(k)){this.revisions.delete(k);this.geometryRevisions.delete(k);}}
    this.refreshQueue();
  }
  refreshQueue(){
    if(!this.center)return;const {cx,cz}=this.center,jobs=[];
    const reach=this.radius+1;
    for(let dx=-reach;dx<=reach;dx++)for(let dz=-reach;dz<=reach;dz++){
      const ring=Math.max(Math.abs(dx),Math.abs(dz)),ahead=dx*this.leadX+dz*this.leadZ;
      // Prefetch a narrow strip within the existing eviction buffer. The
      // player's immediate collision neighborhood is always the first tier.
      if(ring===reach&&(ahead<=0||Math.abs(dx*this.leadZ-dz*this.leadX)>2))continue;
      const x=cx+dx,z=cz+dz,k=chunkKey(x,z);
      if(!this.loaded.has(k)&&!this.pendingKeys.has(k))jobs.push({cx:x,cz:z,k,tier:Math.min(ring,2),d:dx*dx+dz*dz-1.75*ahead});
    }
    jobs.sort((a,b)=>a.tier-b.tier||a.d-b.d||a.cx-b.cx||a.cz-b.cz);this.queue=jobs;
  }
  editsFor(cx,cz){
    const list=[];for(let x=cx-1;x<=cx+1;x++)for(let z=cz-1;z<=cz+1;z++)for(const pair of this.editChunks.get(chunkKey(x,z))||[])list.push(pair);return list;
  }
  lightAt(x,y,z){return sampleLight(this.loaded.get(chunkAt(x,z)),x,y,z);}
  invalidateLight(cx,cz){const k=chunkKey(cx,cz);if(!this.loaded.has(k))return;this.revisions.set(k,(this.revisions.get(k)||0)+1);this.dirty.add(k);}
  setLightSources(sources){const affected=[...this.lightSources,...sources];this.lightSources=sources;for(const c of this.loaded.values())if(affected.some(s=>Math.abs(s.x-(c.cx*16+8))<25&&Math.abs(s.z-(c.cz*16+8))<25))this.invalidateLight(c.cx,c.cz);}
  get(x,y,z){
    if(y<MIN_Y||y>MAX_Y)return 0;const cx=Math.floor(x/CHUNK_SIZE),cz=Math.floor(z/CHUNK_SIZE),c=this.loaded.get(chunkKey(cx,cz));
    return c?c.cells[voxelIndex(x-cx*CHUNK_SIZE+PAD,y,z-cz*CHUNK_SIZE+PAD)]:0;
  }
  has(x,z){return this.loaded.get(chunkAt(x,z))?.ready===true;}
  set(x,y,z,id){
    if(![x,y,z,id].every(Number.isInteger)||y<=MIN_Y||y>MAX_Y||Math.abs(x)>WORLD_LIMIT||Math.abs(z)>WORLD_LIMIT)return false;
    const k=blockKey(x,y,z),ck=chunkAt(x,z);this.edits.set(k,id);
    if(!this.editChunks.has(ck))this.editChunks.set(ck,new Map());this.editChunks.get(ck).set(k,id);
    const cx=Math.floor(x/CHUNK_SIZE),cz=Math.floor(z/CHUNK_SIZE);
    for(let a=cx-1;a<=cx+1;a++)for(let b=cz-1;b<=cz+1;b++){
      const lx=x-a*CHUNK_SIZE+PAD,lz=z-b*CHUNK_SIZE+PAD;if(lx<0||lx>=STRIDE||lz<0||lz>=STRIDE)continue;
      const key=chunkKey(a,b);this.revisions.set(key,(this.revisions.get(key)||0)+1);this.geometryRevisions.set(key,(this.geometryRevisions.get(key)||0)+1);
      const c=this.loaded.get(key);if(c){c.cells[voxelIndex(lx,y,lz)]=id;this.dirty.add(key);}
    }
    return true;
  }
  importEdits(edits,validId){
    for(const item of edits){if(!Array.isArray(item)||item.length!==2)continue;const [k,id]=item;if(typeof k!=='string'||!validId(id))continue;const xyz=k.split(',').map(Number);if(xyz.length!==3)continue;this.set(...xyz,id);}
  }
  async restoreEdits(edits,validId,report=()=>{},yieldFrame=nextFrame){
    for(let i=0;i<edits.length;){
      report('Restoring your builds… '+Math.round(i/edits.length*100)+'%');await yieldFrame();
      if(this.closed)throw Error('World loading was cancelled.');
      const deadline=performance.now()+4,limit=Math.min(edits.length,i+1024);
      do{const end=Math.min(limit,i+128);this.importEdits(edits.slice(i,end),validId);i=end;}while(i<limit&&performance.now()<deadline);
    }
  }
  makeJob(){
    let task,kind='generate';
    // A nearby edit or stale collision chunk gets repaired immediately. New
    // ground then alternates with lighting refreshes instead of waiting behind
    // the entire lighting queue.
    while(this.queue.length&&(this.loaded.has(this.queue[0].k)||this.pendingKeys.has(this.queue[0].k)||!this.near(this.queue[0].cx,this.queue[0].cz,1)))this.queue.shift();
    const urgent=[...this.dirty].find(k=>!this.pendingKeys.has(k)&&this.loaded.get(k)?.ready===false);
    if(!urgent&&this.queue.length&&(this.queue[0].tier<2||this.lastKind!=='generate'))task=this.queue.shift();
    if(!task)for(const k of urgent?[urgent]:this.dirty){if(this.pendingKeys.has(k))continue;this.dirty.delete(k);const c=this.loaded.get(k);if(!c)continue;task={cx:c.cx,cz:c.cz,k};kind='remesh';break;}
    if(!task){while(this.queue.length){const q=this.queue.shift();if(!this.loaded.has(q.k)&&!this.pendingKeys.has(q.k)&&this.near(q.cx,q.cz,1)){task=q;break;}}}
    if(!task)return null;this.lastKind=kind;
    const job={id:this.nextId++,epoch:this.epoch,revision:this.revisions.get(task.k)||0,kind,cx:task.cx,cz:task.cz,config:this.generator.config(),edits:this.editsFor(task.cx,task.cz),lightEdges:lightEdges(this.loaded,task.cx,task.cz),lightSources:this.lightSources};
    if(kind==='remesh'){const c=this.loaded.get(task.k);job.chunk={cx:c.cx,cz:c.cz,cells:c.cells.slice(),decor:c.decor,discoveries:c.discoveries};}
    this.pending.set(job.id,{...task,revision:job.revision,geometryRevision:this.geometryRevisions.get(task.k)||0});this.pendingKeys.add(task.k);return job;
  }
  tick(frameTime){
    if(this.closed)return;
    // Keep GPU uploads off the worker message callback and install at most one result per frame.
    if(this.completed.length)this.receive(this.completed.shift());
    if(this.worker){while(this.pending.size<2){const job=this.makeJob();if(!job)break;try{
      const transfers=[job.lightEdges.sky.buffer,job.lightEdges.glow.buffer];
      if(job.chunk)transfers.push(job.chunk.cells.buffer);
      this.worker.postMessage(this.sentConfig?{...job,config:undefined}:job,transfers);this.sentConfig=true;
    }catch{this.fallback('Terrain worker could not start; using local generation.');break;}}}
    else{
      if(!this.localJob){const job=this.makeJob();if(!job)return;this.localJob={job,steps:this.localSteps(job)};}
      const {job,steps}=this.localJob,deadline=performance.now()+3;
      try{
        let part;do{part=steps.next();}while(!part.done&&performance.now()<deadline);
        if(part.done){this.localJob=null;this.receive(part.value);}
      }catch(error){this.localJob=null;this.receive({id:job.id,epoch:job.epoch,error:String(error)});}
    }
  }
  *localSteps(job){
    const chunk=job.chunk||(yield* this.generator.generateChunkSteps(job.cx,job.cz));
    applyChunkEdits(chunk,job.edits);yield;
    yield* solveLightSteps(chunk,job.lightEdges,job.lightSources);
    const meshes=yield* meshChunkSteps(chunk);
    return {id:job.id,epoch:job.epoch,revision:job.revision,chunk,meshes};
  }

  receive(result){
    if(this.closed||result.epoch!==this.epoch)return;
    const pending=this.pending.get(result.id);if(!pending)return;this.pending.delete(result.id);this.pendingKeys.delete(pending.k);
    if(result.error){if(this.loaded.has(pending.k))this.dirty.add(pending.k);if(this.worker)this.fallback(result.error);else{this.failure=result.error;this.onError(result.error);}return;}
    const {chunk}=result;if(!this.near(chunk.cx,chunk.cz,1))return;
    const changed=(this.revisions.get(pending.k)||0)!==result.revision;
    if(changed){
      // Keep the last installed light field as the comparison point while a newer edit is waiting.
      if(!this.loaded.has(pending.k)){applyChunkEdits(chunk,this.editsFor(chunk.cx,chunk.cz));chunk.ready=false;this.loaded.set(pending.k,chunk);}
      this.dirty.add(pending.k);
    }
    else{
      const previous=this.loaded.get(pending.k),lightingOnly=!!previous?.ready&&previous.geometryRevision===pending.geometryRevision;chunk.ready=true;chunk.geometryRevision=pending.geometryRevision;this.loaded.set(pending.k,chunk);this.onLoad(pending.k,chunk,result.meshes,lightingOnly);
      let missedLight=false;
      for(const [dx,dz] of LIGHT_NEIGHBORS){
        const neighbor=this.loaded.get(chunkKey(chunk.cx+dx,chunk.cz+dz));
        if(needsNeighborLight(previous,chunk,neighbor,dx,dz))this.invalidateLight(chunk.cx+dx,chunk.cz+dz);
        if(!previous?.ready&&needsNeighborLight(null,neighbor,chunk,-dx,-dz))missedLight=true;
      }
      if(missedLight)this.invalidateLight(chunk.cx,chunk.cz);
    }
  }
  fallback(message){
    if(!this.worker)return;this.worker.terminate();this.worker=null;
    for(const p of this.pending.values())if(this.loaded.has(p.k))this.dirty.add(p.k);
    this.completed.length=0;this.pending.clear();this.pendingKeys.clear();this.refreshQueue();this.onError(message);
  }
  async readyAround(x,z,radius=1){
    const cx=Math.floor(x/CHUNK_SIZE),cz=Math.floor(z/CHUNK_SIZE),start=Date.now();
    while(true){
      if(this.closed)throw Error('World loading was cancelled.');if(this.failure)throw Error(this.failure);
      let ready=true;for(let a=cx-radius;a<=cx+radius;a++)for(let b=cz-radius;b<=cz+radius;b++)if(!this.loaded.get(chunkKey(a,b))?.ready)ready=false;
      if(ready)return;if(Date.now()-start>45000)throw Error('Terrain is taking too long to load. Try a shorter view distance.');
      this.tick();await new Promise(resolve=>setTimeout(resolve,10));
    }
  }
  stats(){return {loaded:this.loaded.size,queued:this.queue.length+this.pending.size,edited:this.edits.size,worker:!!this.worker};}
  dispose(){this.closed=true;this.localJob=null;this.worker?.terminate();for(const k of this.loaded.keys())this.onUnload(k);this.loaded.clear();this.pending.clear();this.completed.length=0;this.queue=[];this.edits.clear();this.editChunks.clear();this.revisions.clear();this.geometryRevisions.clear();this.dirty.clear();}
}
