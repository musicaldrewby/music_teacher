import {sampleHorizonTile,horizonFeatures} from './horizon-samples.js';
import * as THREE from './vendor/three.module.min.js';
import {BLOCKS} from './data.js';
import {skylineSites,skylineBoxes} from './skyline.js';
import {HorizonGround,horizonMaterial} from './horizon-ground.js';
import {DistantWoods} from './distant-woods.js';
import {blendSlot,blendMaterial,markChunk} from './terrain-blend.js';
import {SceneryMesh} from './scenery-mesh.js';
const RANGE=9,SIDE=RANGE*2+1,TILES=SIDE*SIDE;
export class Horizon {
 constructor(world){
  this.w=world;this.root=new THREE.Group();world.scene.add(this.root);
  this.landMat=horizonMaterial(world.atlas);
  this.siteMat=new THREE.MeshLambertMaterial({vertexColors:true});
  if(world.detailBlend){
   blendMaterial(this.landMat,world.detailBlend,true);blendMaterial(this.siteMat,world.detailBlend,true);
   this.woods=new DistantWoods(world,TILES);this.root.add(this.woods.mesh);
  }
  this.woodEdits=new Set();
  this.surface=new HorizonGround(TILES);this.ground=this.surface.geometry;
  if(world.detailBlend){
   // Two-block terraces and individual banks can project onto different
   // neighboring tiles. Fill uncovered pixels behind the depth-writing layers.
   const backing=horizonMaterial(world.atlas,{backing:true});
   backing.color=this.landMat.color;
   const underlay=new THREE.Mesh(this.ground,backing);underlay.frustumCulled=false;underlay.renderOrder=-1;this.root.add(underlay);
  }
  const m=new THREE.Mesh(this.ground,this.landMat);m.frustumCulled=false;this.root.add(m);
  this.features=new Map();this.dirty=new Set();this.tiles=new Map();this.pending=[];this.pendingParts=[];this.center='';this.revision=-1;this.jobs=new Map();this.results=[];this.epoch=0;this.nextJob=0;this.planSerial=0;
 }
 reset(){
  this.worker?.terminate();this.worker=null;this.workerTried=false;this.sentConfig=false;this.jobs.clear();this.results.length=0;this.localSample=null;this.nextPlan=null;this.epoch++;
  this.woods?.clear();this.woodEdits.clear();this.dirty.clear();this.tiles.clear();this.center='';this.pending=[];this.pendingParts=[];this.revision=-1;this.ground.setDrawRange(0,0);
  for(const {parts} of this.features.values())for(const m of parts.values()){this.root.remove(m);m.geometry.dispose();}
  this.features.clear();
 }
 invalidate(x,z){
  this.dirty.add(Math.floor(x/16)+','+Math.floor(z/16));
  for(let i=Math.floor((x-4)/16);i<=Math.floor((x+4)/16);i++)for(let j=Math.floor((z-4)/16);j<=Math.floor((z+4)/16);j++){
   const key=i+','+j;if(this.tiles.get(key)?.ready)this.woodEdits.add(key);
  }
 }
 partGeometry(key,boxes){
  const b=new SceneryMesh(),journal=this.w.stream.editChunks?.get(key);
  const [cx,cz]=key.split(',').map(Number);
  if(!journal?.size){
   for(const p of boxes)b.box(p.x+p.w/2,p.y+p.h/2,p.z+p.d/2,p.w,p.h,p.d,BLOCKS[p.id].color);
   const geo=b.geometry();markChunk(geo,cx,cz);return geo;
  }
  // Reconstruct the small part of a landmark in this edited chunk. An absent
  // tree or a tunnel through the mesa must also disappear from the distant view.
  const ox=cx*16,oz=cz*16;
  const bottom=Math.max(-32,Math.min(...boxes.map(p=>p.y))),top=Math.min(96,Math.max(...boxes.map(p=>p.y+p.h)));
  const layer=256,cells=new Uint8Array((top-bottom)*layer),at=(x,y,z)=>(y-bottom)*layer+(z-oz)*16+x-ox;
  for(const p of boxes)for(let y=Math.max(bottom,p.y);y<Math.min(p.y+p.h,top);y++)for(let z=p.z;z<p.z+p.d;z++)cells.fill(p.id,at(p.x,y,z),at(p.x+p.w,y,z));
  for(const [pos,id] of journal){
   const [x,y,z]=pos.split(',').map(Number);if(y<bottom||y>=top)continue;
   const i=at(x,y,z);if(cells[i])cells[i]=BLOCKS[id]?id:0;
  }
  // Join like-colored surface cells into strips; sealed interior cells have no silhouette.
  const visible=(i,x,y,z)=>x===0||x===15||z===0||z===15||y===bottom||y===top-1||!cells[i-1]||!cells[i+1]||!cells[i-16]||!cells[i+16]||!cells[i-layer]||!cells[i+layer];
  for(let y=bottom;y<top;y++)for(let z=0;z<16;z++){
   let run=0,start=0;
   for(let x=0;x<=16;x++){
    const i=at(x+ox,y,z+oz),id=x<16&&visible(i,x,y,z)?cells[i]:0;if(id===run)continue;
    if(run)b.box(ox+(start+x)/2,y+.5,oz+z+.5,x-start,1,1,BLOCKS[run].color);
    start=x;run=id;
   }
  }
  const geo=b.geometry();markChunk(geo,cx,cz);return geo;
 }
 feature(s,boxes=skylineBoxes(this.w.generator,s)){
  const byChunk=new Map();
  for(const b of boxes){
   for(let cx=Math.floor(b.x/16);cx<=Math.floor((b.x+b.w-1)/16);cx++)for(let cz=Math.floor(b.z/16);cz<=Math.floor((b.z+b.d-1)/16);cz++){
    const key=cx+','+cz,x=Math.max(b.x,cx*16),z=Math.max(b.z,cz*16),w=Math.min(b.x+b.w,cx*16+16)-x,d=Math.min(b.z+b.d,cz*16+16)-z;
    if(!byChunk.has(key))byChunk.set(key,[]);
    byChunk.get(key).push({...b,x,z,w,d});
   }
  }
  return {site:s,parts:new Map(),byChunk};
 }
 applyFeatures(targets,cx,cz){
  const ids=new Set(targets.map(s=>s.site.id));
  for(const [id,{parts}] of this.features)if(!ids.has(id)){for(const m of parts.values()){this.root.remove(m);m.geometry.dispose();}this.features.delete(id);}
  for(const {site,boxes} of targets)if(!this.features.has(site.id))this.features.set(site.id,this.feature(site,boxes));
  this.pendingParts=[];
  for(const f of this.features.values())for(const k of f.byChunk.keys())if(!f.parts.has(k)){
   const [x,z]=k.split(',').map(Number);this.pendingParts.push({f,k,d:(x-cx)**2+(z-cz)**2});
  }
  this.pendingParts.sort((a,b)=>b.d-a.d);this.featuresDirty=true;
 }
 ensureWorker(){
  if(this.workerTried)return;this.workerTried=true;
  try{
   this.worker=new Worker(new URL('./horizon-worker.js',import.meta.url),{type:'module'});
   this.worker.onmessage=({data})=>this.results.push(data);
   this.worker.onerror=e=>{e.preventDefault?.();this.fallback();};
  }catch{this.worker=null;}
 }
 fallback(){
  this.worker?.terminate();this.worker=null;this.sentConfig=false;this.nextPlan=null;this.results.length=0;
  for(const job of this.jobs.values())if(job.tile&&this.tiles.get(job.tile.key)===job.tile){job.tile.sampling=false;this.pending.push(job.tile);}
  this.jobs.clear();const {cx,cz}=this.w.stream.center;this.applyFeatures(horizonFeatures(this.w.generator,cx,cz),cx,cz);
 }
 post(job){
  const id=++this.nextJob;this.jobs.set(id,job);
  try{this.worker.postMessage({...job,tile:undefined,id,epoch:this.epoch,config:this.sentConfig?undefined:this.w.generator.config()});this.sentConfig=true;}
  catch{this.fallback();}
 }
 plan(cx,cz){
  this.ensureWorker();this.planSerial++;
  if(this.worker)this.nextPlan={kind:'plan',cx,cz,serial:this.planSerial};
  else this.applyFeatures(horizonFeatures(this.w.generator,cx,cz),cx,cz);
  const next=new Map(),free=new Set(Array.from({length:TILES},(_,i)=>i)),missing=[];
  for(let x=cx-RANGE;x<=cx+RANGE;x++)for(let z=cz-RANGE;z<=cz+RANGE;z++){
   const key=x+','+z,tile=this.tiles.get(key);
   if(tile){next.set(key,tile);free.delete(tile.slot);}else missing.push({x,z,key,ready:false});
  }
  const slots=free.values();for(const tile of missing){tile.slot=slots.next().value;next.set(tile.key,tile);}
  for(const [k,t] of this.tiles)if(!next.has(k)){this.woods?.remove(t);this.woodEdits.delete(k);}
  this.tiles=next;this.pending=[...next.values()].filter(v=>!v.ready&&!v.sampling).sort((a,b)=>((b.x-cx)**2+(b.z-cz)**2)-((a.x-cx)**2+(a.z-cz)**2));
 }
 fill(tile,samples){
  this.surface.fill(tile,this.w.generator,!!this.w.atlas,samples?.columns);
  tile.treeSamples=samples?.trees;this.woods?.fill(tile,tile.treeSamples);tile.ready=true;
 }
 sample(deadline){
  let changed=false;
  if(this.results.length){
   const result=this.results.shift(),job=this.jobs.get(result.id);this.jobs.delete(result.id);
   if(job&&result.epoch===this.epoch){
    if(result.error){if(job.tile&&this.tiles.get(job.tile.key)===job.tile){job.tile.sampling=false;this.pending.push(job.tile);}this.fallback();}
    else if(job.kind==='plan'){if(job.serial===this.planSerial)this.applyFeatures(result.data,job.cx,job.cz);}
    else if(this.tiles.get(job.tile.key)===job.tile){this.fill(job.tile,result.data);changed=true;}
   }
  }
  if(this.worker){
   if(this.nextPlan&&![...this.jobs.values()].some(j=>j.kind==='plan')){const plan=this.nextPlan;this.nextPlan=null;this.post(plan);}
   while(this.worker&&this.jobs.size<3&&this.pending.length){const tile=this.pending.pop();tile.sampling=true;this.post({kind:'tile',x:tile.x,z:tile.z,tile});}
  }else{
   if(!this.localSample&&this.pending.length){const tile=this.pending.pop();tile.sampling=true;this.localSample={tile,steps:sampleHorizonTile(this.w.generator,tile.x,tile.z)};}
   if(this.localSample){
    const {tile,steps}=this.localSample;let part;
    do{part=steps.next();}while(!part.done&&performance.now()<deadline);
    if(part.done){if(this.tiles.get(tile.key)===tile){this.fill(tile,part.value);changed=true;}this.localSample=null;}
   }
  }
  return changed;
 }
 get pendingWork(){return this.jobs.size+this.results.length+(this.localSample?1:0)+(this.nextPlan?1:0);}

 update(s,visible,dt=1/60){
  const w=this.w,c=w.stream.center,cx=c.cx,cz=c.cz,key=cx+','+cz;
  const returning=!this.root.visible;this.root.visible=visible;
  if(!visible){w.detailBlend?.step(w.camera.position,w.viewDistance,dt,null);return;}
  const deadline=performance.now()+2;
  let changed=returning||this.revision!==w.detailRevision||this.distance!==w.viewDistance;
  if(key!==this.center){this.plan(cx,cz);this.center=key;changed=true;}
  // A whole mesa can span several chunks. Introduce its distant pieces while
  // they are still in haze, without allocating every mesh on a boundary frame.
  for(let i=0;i<2&&this.pendingParts.length&&performance.now()<deadline;i++){
   const {f,k}=this.pendingParts.pop(),m=new THREE.Mesh(this.partGeometry(k,f.byChunk.get(k)),this.siteMat);
   this.root.add(m);f.parts.set(k,m);changed=true;if(performance.now()>=deadline)break;
  }
  if(this.sample(deadline)||this.featuresDirty){changed=true;this.featuresDirty=false;}
  for(const k of this.woodEdits){
   if(performance.now()>=deadline)break;
   const t=this.tiles.get(k);if(t?.ready)this.woods?.fill(t,t.treeSamples);
   this.woodEdits.delete(k);if(performance.now()>=deadline)break;
  }
  this.woods?.flush();
  if(w.detailBlend?.step(w.camera.position,w.viewDistance,dt,this.tiles))changed=true;
  this.landMat.color.setScalar(1-(s.wet||0)*.13);
  if(!changed&&!this.dirty.size)return;this.revision=w.detailRevision;this.distance=w.viewDistance;
  const detailed=(k,x,z)=>w.detailBlend?w.detailBlend.level(k)===255:Math.max(Math.abs(x-cx),Math.abs(z-cz))<=w.viewDistance&&w.chunks.has(k);
  // Slopes can span the edge of a tile already at full detail. Its eight
  // neighbors also need to be full before retiring the ground backing there.
  const needsBacking=t=>{
   if(!detailed(t.key,t.x,t.z))return true;
   if(w.detailBlend)for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
    if(w.detailBlend.bytes[blendSlot(t.x+dx,t.z+dz)]<255)return true;
   }
   return false;
  };
  this.surface.show(this.tiles.values(),needsBacking);
  for(const {parts,byChunk} of this.features.values())for(const [k,m] of parts){
   const [x,z]=k.split(',').map(Number);m.visible=!detailed(k,x,z);
   if(this.dirty.has(k))m.userData.edited=true;
   if(m.visible&&m.userData.edited){m.geometry.dispose();m.geometry=this.partGeometry(k,byChunk.get(k));m.userData.edited=false;}
  }
  this.dirty.clear();
 }
}
