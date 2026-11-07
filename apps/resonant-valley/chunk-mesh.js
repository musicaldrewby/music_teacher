import {finishSteps} from './work-steps.js';
import {faceUVs} from './atlas-layout.js';
import {isLeaf} from './visuals.js';
import {solveLightSteps} from './lighting.js';
import {CHUNK_SIZE,MIN_Y,MAX_Y,HEIGHT,SEA_LEVEL,WATER,PAD,voxelIndex} from './terrain.js';
import {hash3} from './noise.js';

const FACES=[
 {n:[1,0,0],v:[[1,0,1],[1,0,0],[1,1,1],[1,1,0]],shade:.86},
 {n:[-1,0,0],v:[[0,0,0],[0,0,1],[0,1,0],[0,1,1]],shade:.72},
 {n:[0,1,0],v:[[0,1,1],[1,1,1],[0,1,0],[1,1,0]],shade:1},
 {n:[0,-1,0],v:[[0,0,0],[1,0,0],[0,0,1],[1,0,1]],shade:.55},
 {n:[0,0,1],v:[[0,0,1],[1,0,1],[0,1,1],[1,1,1]],shade:.9},
 {n:[0,0,-1],v:[[1,0,0],[0,0,0],[1,1,0],[0,1,0]],shade:.78}
];
const triangles=[0,1,2,2,1,3],otherDiagonal=[0,1,3,0,3,2];
const RGB=hex=>[1,3,5].map(i=>{
  const value=parseInt(hex.slice(i,i+2),16)/255;
  return value<=.04045?value/12.92:((value+.055)/1.055)**2.4;
});
const petals=['#ffdc5c','#ce94ec','#fa866f','#f5f1db'].map(RGB),green=RGB('#549453');
const grassTips=RGB('#89b452'),reedStem=RGB('#678e4c'),reedTip=RGB('#a4b55e'),cattail=RGB('#845731'),pollen=RGB('#f6c459');
const blank=()=>({p:[],n:[],c:[],u:[],l:[]});
function box(g,x,y,z,w,h,d,color,light){
  for(const f of FACES)for(const i of triangles){
    const v=f.v[i];g.p.push(x+v[0]*w,y+v[1]*h,z+v[2]*d);g.n.push(...f.n);g.c.push(color[0]*f.shade,color[1]*f.shade,color[2]*f.shade);g.u.push(0,0);g.l.push(...light);
  }
}

// For each face corner, sample the two neighboring sides and their diagonal
// in the layer just outside the face. All samples fit the chunk's one-cell halo.
const cornerSamples=FACES.map(face=>{
  const [a,b]=[0,1,2].filter(axis=>face.n[axis]===0);
  return face.v.map(vertex=>{
    const sideA=[...face.n],sideB=[...face.n],diagonal=[...face.n];
    diagonal[a]=sideA[a]=vertex[a]?1:-1;
    diagonal[b]=sideB[b]=vertex[b]?1:-1;
    return [sideA,sideB,diagonal];
  });
});
const occlusion=new Float32Array(256).fill(1);
occlusion[0]=occlusion[8]=occlusion[WATER]=0;
for(const leaves of [5,12,22,27])occlusion[leaves]=.32;

function shadeCorners(output,read,x,y,z,samples) {
  for(let i=0;i<4;i++){
    const [a,b,c]=samples[i];
    const sideA=occlusion[read(x+a[0],y+a[1],z+a[2])];
    const sideB=occlusion[read(x+b[0],y+b[1],z+b[2])];
    const blocked=sideA===1&&sideB===1?3:sideA+sideB+occlusion[read(x+c[0],y+c[1],z+c[2])];
    output[i]=1-.14*blocked;
  }
}

// Consecutive wet cells end at the real solid bed, also in caves or under a
// player-built platform. Compute once while meshing, including the shared halo.
function measureWater(cells) {
  const depths=new Uint8Array(cells.length);
  for(let base=0;base<cells.length;base+=HEIGHT){
    let run=0;
    for(let i=base;i<base+HEIGHT;i++){
      run=cells[i]===WATER?Math.min(run+1,16):0;
      depths[i]=run;
    }
  }
  return depths;
}

function surfaceDepth(depths,cells,x,y,z) {
  let total=0;
  for(let dx=-1;dx<=0;dx++)for(let dz=-1;dz<=0;dz++){
    const i=voxelIndex(x+dx,y,z+dz),run=depths[i];
    if(run)total+=run-(y===SEA_LEVEL&&cells[i+1]!==WATER ? .38 : 0);
  }
  return total*.25;
}

// A tapered blade has twelve vertices and stays visible from either bank.
function reedBlade(group,x,y,z,leanX,height,leanZ,color,light) {
  const half=.036,tip=[x+leanX,y+height,z+leanZ];
  const base=[[x-half,y,z-half],[x-half,y,z+half],[x+half,y,z+half],[x+half,y,z-half]];
  const normals=[[-1,.12,0],[0,.12,1],[1,.12,0],[0,.12,-1]];
  for(let i=0;i<4;i++)for(const point of [base[i],base[(i+1)%4],tip]){
    group.p.push(...point);group.n.push(...normals[i]);group.c.push(...color);group.u.push(0,0);group.l.push(...light);
  }
}

function plantMesh(group,plant,read,light,x,z) {
  const {y,kind}=plant,soil=read(x,y-1,z),above=read(x,y,z);
  const size=plant.variation??.5;
  const part=(dx,dy,dz,w,h,d,color)=>box(group,plant.x+dx,y+dy,plant.z+dz,w,h,d,color,light);
  if(kind==='reeds'){
    if(soil!==plant.soil||above!==(plant.submerged?WATER:0)||read(x,y+1,z)!==0)return;
    const height=(plant.submerged?1.02:.55)+size*.36;
    part(-.14,0,.03,.045,height,.045,reedStem);
    part(.08,0,-.1,.042,height*.83,.042,reedTip);
    const leafBase=plant.submerged ? .30 : .02;
    reedBlade(group,plant.x-.09,y+leafBase,plant.z+.045,-.15,height*.57,.06,reedTip,light);
    reedBlade(group,plant.x+.09,y+leafBase,plant.z-.08,.08,height*.50,-.15,reedStem,light);
    if(size>.72)part(-.153,height-.18,.017,.072,.16,.072,cattail);
    return;
  }
  if(soil!==1||above!==0)return;
  if(kind==='flowers'){
    const blossom=(dx,dz,height)=>{
      part(dx-.014,0,dz-.014,.036,height,.036,green);
      part(dx-.092,height-.02,dz-.072,.184,.055,.144,petals[plant.color]);
      part(dx-.032,height+.034,dz-.028,.063,.025,.055,pollen);
    };
    blossom(-.06,.02,.29+size*.12);
    if(size>.54)blossom(.13,-.10,.23+size*.08);
  }else if(plant.flower){
    // Wildflower hollows and the original decoration format.
    part(-.025,0,-.025,.05,.35,.05,green);
    part(-.11,.3,-.11,.22,.065,.22,petals[plant.color]);
  }else{
    part(-.035,0,-.065,.046,.22+size*.13,.08,green);
    part(.036,0,.048,.07,.12+size*.12,.04,grassTips);
  }
}

export function meshChunk(chunk) {return finishSteps(meshChunkSteps(chunk));}
export function* meshChunkSteps(chunk) {
  if(!chunk.sky)yield* solveLightSteps(chunk);
  const groups=[blank(),blank(),blank(),blank(),blank()],{cells,cx,cz}=chunk;
  const corners=new Float32Array(4),depths=measureWater(cells);
  groups[2].waterDepth=[];
  const lighting=(lx,y,lz)=>{if(y>MAX_Y)return [1,0];if(y<MIN_Y)return [0,0];const i=voxelIndex(lx,y,lz);return [(chunk.sky[i]||0)/15,(chunk.glow[i]||0)/15];};
  const read=(lx,y,lz)=>y<MIN_Y||y>MAX_Y?0:cells[voxelIndex(lx,y,lz)];
  for(let lx=PAD;lx<CHUNK_SIZE+PAD;lx++)for(let lz=PAD;lz<CHUNK_SIZE+PAD;lz++)for(let y=MIN_Y;y<=MAX_Y;y++){
    if(y===MIN_Y)yield;
    const id=read(lx,y,lz);if(!id)continue;
    const x=cx*CHUNK_SIZE+lx-PAD,z=cz*CHUNK_SIZE+lz-PAD,isWater=id===WATER,transparent=id===8,leaf=isLeaf(id);
    const g=groups[isWater?2:transparent?1:leaf?4:0];
    let grain;
    for(let f=0;f<FACES.length;f++){
      const face=FACES[f],neighbor=read(lx+face.n[0],y+face.n[1],lz+face.n[2]);
      if(isWater){if(neighbor&&neighbor!==8&&!isLeaf(neighbor)||f===3)continue;}
      else if(neighbor&&neighbor!==WATER&&(neighbor!==8||transparent)&&(!isLeaf(neighbor)||leaf&&neighbor===id))continue;
      // The closed bedrock underside is never visible.
      if(y===MIN_Y&&f===3)continue;
      let tile=id-1;if(id===1&&f!==2)tile=f===3?1:30;if((id===4||id===15||id===26)&&(f===2||f===3))tile=31;
      grain??=hash3(6789,x,y,z);
      const uv=faceUVs[isWater?0:tile][Math.floor(grain*4)];
      const light=lighting(lx+face.n[0],y+face.n[1],lz+face.n[2]);
      const baseShade=face.shade*(.96+grain*.04);
      if(isWater||transparent)corners.fill(1);
      else shadeCorners(corners,read,lx,y,lz,cornerSamples[f]);
      const indices=corners[0]+corners[3]<corners[1]+corners[2]?otherDiagonal:triangles;
      const partialWater=isWater&&y===SEA_LEVEL&&read(lx,y+1,lz)!==WATER;
      for(const i of indices){
        const vv=face.v[i],vy=partialWater?vv[1]*.62:vv[1],shade=baseShade*corners[i];
        g.p.push(x+vv[0],y+vy,z+vv[2]);g.n.push(...face.n);g.c.push(shade,shade,shade);g.u.push(...uv[i]);g.l.push(...light);
        if(isWater)g.waterDepth.push(f===2?surfaceDepth(depths,cells,lx+vv[0],y,lz+vv[2]):depths[voxelIndex(lx,y,lz)]);
      }
    }
  }
  yield;
  for(const p of chunk.decor||[]){
    const lx=Math.floor(p.x)-cx*CHUNK_SIZE+PAD,lz=Math.floor(p.z)-cz*CHUNK_SIZE+PAD;
    plantMesh(groups[3],p,read,lighting(lx,p.y,lz),lx,lz);
  }
  return groups.map(g=>Object.fromEntries(Object.entries(g).map(([k,v])=>[k,new Float32Array(v)])));
}
export const meshTransfers=groups=>groups.flatMap(g=>Object.values(g).map(v=>v.buffer));
