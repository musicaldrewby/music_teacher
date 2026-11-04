import {isLeaf} from './visuals.js';
import {CHUNK_SIZE,MIN_Y,MAX_Y,HEIGHT,PAD,STRIDE,WATER,voxelIndex,chunkKey} from './terrain.js';
export const LIGHT_MAX=15;
export const lightPassable=id=>id===0||id===8||id===WATER||isLeaf(id);
const loss=id=>id===WATER||isLeaf(id)?2:1;
// Skylight and warm block light travel through connected, transparent voxels.
// Neighbor edges let the same field converge across streamed chunk boundaries.
export function solveLight(chunk,edges=null,sources=[]){
 const {cells,cx,cz}=chunk,sky=new Uint8Array(cells.length),glow=new Uint8Array(cells.length);
 for(let x=0;x<STRIDE;x++)for(let z=0;z<STRIDE;z++){
  let level=LIGHT_MAX;
  for(let y=MAX_Y;y>=MIN_Y;y--){const i=voxelIndex(x,y,z),id=cells[i];if(!lightPassable(id)){level=0;continue;}if(id!==0&&id!==8)level=Math.max(0,level-loss(id));sky[i]=level;}
 }
 if(edges)for(let i=0;i<cells.length;i++)if(lightPassable(cells[i])){sky[i]=Math.max(sky[i],edges.sky[i]);glow[i]=edges.glow[i];}
 for(const s of sources){const x=Math.floor(s.x)-cx*CHUNK_SIZE+PAD,z=Math.floor(s.z)-cz*CHUNK_SIZE+PAD,y=Math.floor(s.y);if(x<0||x>=STRIDE||z<0||z>=STRIDE||y<MIN_Y||y>MAX_Y)continue;const i=voxelIndex(x,y,z);if(lightPassable(cells[i]))glow[i]=Math.max(glow[i],s.level||14);}
 const flood=field=>{
  const buckets=Array.from({length:16},()=>[]);for(let i=0;i<field.length;i++)if(field[i]>1)buckets[field[i]].push(i);
  const visit=(j,level)=>{if(!lightPassable(cells[j]))return;const v=level-loss(cells[j]);if(v>field[j]){field[j]=v;if(v>1)buckets[v].push(j);}};
  for(let level=15;level>1;level--)for(const i of buckets[level]){if(field[i]!==level)continue;const y=i%HEIGHT,column=(i-y)/HEIGHT,z=column%STRIDE,x=(column-z)/STRIDE;
   if(y>0)visit(i-1,level);if(y<HEIGHT-1)visit(i+1,level);if(x>0)visit(i-STRIDE*HEIGHT,level);if(x<STRIDE-1)visit(i+STRIDE*HEIGHT,level);if(z>0)visit(i-HEIGHT,level);if(z<STRIDE-1)visit(i+HEIGHT,level);
  }
 };
 flood(sky);flood(glow);chunk.sky=sky;chunk.glow=glow;return chunk;
}
export function lightEdges(loaded,cx,cz){
 const sky=new Uint8Array(STRIDE*STRIDE*HEIGHT),glow=new Uint8Array(sky.length);
 for(const [dx,dz] of LIGHT_NEIGHBORS){
  const from=loaded.get(chunkKey(cx+dx,cz+dz));
  if(!from?.sky)continue;
  for(const [source,target] of edgeColumns(-dx,-dz)){
   sky.set(from.sky.subarray(source,source+HEIGHT),target);
   if(from.glow)glow.set(from.glow.subarray(source,source+HEIGHT),target);
  }
 }
 return {sky,glow};
}
export const LIGHT_NEIGHBORS=[[1,0],[-1,0],[0,1],[0,-1]];
// Index pairs join a chunk's interior edge to the identical column in its neighbor's halo.
const borderColumns=new Map(LIGHT_NEIGHBORS.map(([dx,dz])=>{
 const columns=[];
 for(let n=PAD;n<CHUNK_SIZE+PAD;n++){
  const sx=dx>0?CHUNK_SIZE:dx<0?PAD:n,sz=dz>0?CHUNK_SIZE:dz<0?PAD:n;
  const tx=dx>0?0:dx<0?STRIDE-1:n,tz=dz>0?0:dz<0?STRIDE-1:n;
  columns.push([voxelIndex(sx,MIN_Y,sz),voxelIndex(tx,MIN_Y,tz)]);
 }
 return [dx+3*dz,columns];
}));
const edgeColumns=(dx,dz)=>borderColumns.get(dx+3*dz);
export function needsNeighborLight(before,source,neighbor,dx,dz){
 if(!source?.sky||!neighbor?.sky)return false;
 for(const [start,target] of edgeColumns(dx,dz)){
  for(let y=0;y<HEIGHT;y++){
   const a=start+y,b=target+y,sky=source.sky[a],glow=source.glow[a];
   if(sky>neighbor.sky[b]||glow>neighbor.glow[b])return true;
   if(before?.sky&&(sky<before.sky[a]||glow<before.glow[a]))return true;
  }
 }
 return false;
}
export function sampleLight(chunk,x,y,z){
 if(!chunk?.sky)return [0,0];if(y>MAX_Y)return [1,0];if(y<MIN_Y)return [0,0];
 const i=voxelIndex(Math.floor(x)-chunk.cx*CHUNK_SIZE+PAD,Math.floor(y),Math.floor(z)-chunk.cz*CHUNK_SIZE+PAD);
 return [(chunk.sky[i]||0)/15,(chunk.glow?.[i]||0)/15];
}
