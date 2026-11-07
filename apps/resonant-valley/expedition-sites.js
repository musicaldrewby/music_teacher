import {nearbyLandmarks} from './landmarks.js';
import {skylineSites} from './skyline.js';
export const EXPEDITION_NAMES={studio:'Echo House studio',vault:'The Listening Vault',observatory:'Starfall Observatory'};
const caches=new WeakMap(),shapeCache=new WeakMap(),GRID=288;
function choose(g,gx,gz){
 const n=g.noise,type=['studio','vault','observatory'][Math.floor(n.random(gx,gz,1801)*3)];
 let best=null,score=-Infinity;
 for(let i=0;i<12;i++){
  const x=gx*GRID+40+Math.floor(n.random(gx*13+i,gz,1807)*208),z=gz*GRID+40+Math.floor(n.random(gx,gz*13+i,1811)*208);
  if(Math.hypot(x-g.home.x,z-g.home.z)<132||g.legacy&&Math.max(Math.abs(x),Math.abs(z))<100)continue;
  let excluded=false;
  for(let a=Math.floor((x-24)/32);a<=Math.floor((x+24)/32);a++)for(let b=Math.floor((z-24)/32);b<=Math.floor((z+24)/32);b++)if(g.expeditionProtected?.has(a+','+b))excluded=true;
  if(excluded)continue;
  const c=g.column(x,z),slope=Math.max(...[[-8,0],[8,0],[0,-8],[0,13]].map(([dx,dz])=>Math.abs(g.column(x+dx,z+dz).h-c.h)));
  if(c.h<7||c.h>58||slope>6||type==='observatory'&&c.h<26)continue;
  if(nearbyLandmarks(g,x,z,42).length||skylineSites(g,x,z,45).length)continue;
  const value=type==='observatory'?c.h-slope:c.h*.05-slope;
  if(value>score){score=value;best={id:`expedition:1:${gx}:${gz}`,type,name:EXPEDITION_NAMES[type],x,z,y:c.h+1,biome:c.biome};}
 }
 return best;
}
export function expeditionAt(g,gx,gz){
 if(!g.expeditionsVersion)return null;
 let cache=caches.get(g);if(!cache){cache=new Map();caches.set(g,cache);}
 const key=gx+','+gz;if(cache.has(key))return cache.get(key);
 const site=choose(g,gx,gz);if(cache.size>=512)cache.delete(cache.keys().next().value);cache.set(key,site);return site;
}
export function expeditionSites(g,x,z,radius=32){
 if(!g.expeditionsVersion)return [];
 const out=[];for(let a=Math.floor((x-radius)/GRID);a<=Math.floor((x+radius)/GRID);a++)for(let b=Math.floor((z-radius)/GRID);b<=Math.floor((z+radius)/GRID);b++){
  const s=expeditionAt(g,a,b);if(s&&Math.abs(s.x-x)<=radius&&Math.abs(s.z-z)<=radius)out.push(s);
 }
 return out;
}
export function expeditionCase(s){return {id:s.id+':case',type:'cache',x:s.x+3,y:s.y+(s.type==='vault'?-5:s.type==='observatory'?1:0),z:s.z-2,buried:false,destination:s.type};}
export function expeditionBoxes(s){
 if(shapeCache.has(s))return shapeCache.get(s);
 const boxes=[],box=(dx,dy,dz,w,h,d,id)=>boxes.push({x:s.x+dx,y:s.y+dy,z:s.z+dz,w,h,d,id});
 if(s.type==='studio'){
  box(-7,-7,-6,15,7,13,19);box(-7,0,-6,15,8,13,0);box(-7,-1,-6,15,1,13,6);
  box(-7,0,-6,15,5,1,7);box(-7,0,6,15,5,1,7);box(-7,0,-5,1,5,11,7);box(7,0,-5,1,5,11,7);
  box(-1,0,6,3,3,1,0);box(-5,1,6,3,2,1,8);box(3,1,6,3,2,1,8);box(-7,1,-3,1,2,6,8);
  box(-8,5,-7,17,1,15,13);box(-6,6,-6,13,1,13,25);box(-3,7,-5,7,1,11,25);
  // Recording booth and an original block-built sound-wave sign.
  box(-2,0,-5,1,3,6,8);box(-2,0,0,1,3,1,0);box(0,0,-5,6,1,1,20);box(0,1,-5,6,1,1,13);
  for(let i=0;i<5;i++)box(-4+i*2,5+(i%3),7,1,1+(i%3),1,11);
  box(-2,-1,7,5,1,3,19);
 }else if(s.type==='vault'){
  box(-6,-7,-6,13,8,13,19);box(-5,-5,-5,11,4,11,0);box(-5,-6,-5,11,1,11,13);
  for(const dx of [-4,4]){box(dx,-5,-4,1,4,1,25);box(dx,-5,4,1,4,1,25);}
  // Wide, one-block stair treads descend from the surface into the chamber.
  for(let z=6;z<=13;z++){const floor=Math.min(-1,z-12);box(-1,floor,z,3,1,1,11);box(-1,floor+1,z,3,14-floor,1,0);}
  box(-3,-1,12,1,5,2,13);box(3,-1,12,1,5,2,13);box(-3,4,12,7,1,2,25);
  box(-2,5,12,5,1,1,11);box(-1,6,12,3,1,1,13);
  box(-2,-5,-4,5,1,1,20);
 }else{
  for(let z=-8;z<=8;z++)for(let x=-8;x<=8;x++)if(x*x+z*z<=64){box(x,-7,z,1,8,1,13);box(x,1,z,1,9,1,0);if(x*x+z*z>43&&!(z>0&&Math.abs(x)<2))box(x,1,z,1,2,1,11);}
  // Open dome ribs preserve the sky view from the observing platform.
  for(let i=-5;i<=5;i++){const h=3+Math.round(Math.sqrt(25-i*i));box(i,h,-5,1,1,1,25);box(i,h,5,1,1,1,25);box(-5,h,i,1,1,1,25);box(5,h,i,1,1,1,25);}
  for(const x of [-5,5])for(const z of [-5,5])box(x,1,z,1,3,1,25);
  box(-1,1,-1,2,2,2,11);box(0,3,-3,2,2,5,25);box(0,4,-5,2,2,3,13);box(0,5,-6,2,1,1,8);
  box(-1,0,8,3,1,2,11);box(-1,-1,10,3,1,2,11);
 }
 // A violet-and-white three-note trail mark beside every entrance.
 const entrance=s.type==='vault'?15:s.type==='studio'?10:13;
 for(const [x,h] of [[-4,2],[-2,3],[0,1]]){box(x,-1,entrance,1,h+1,1,13);box(x,h,entrance,1,1,1,11);}
 shapeCache.set(s,boxes);return boxes;
}
export function populateExpeditions(g,cx,cz,put){
 const left=cx*16-1,back=cz*16-1;
 for(const s of expeditionSites(g,left+9,back+9,30))for(const b of expeditionBoxes(s)){
  for(let x=Math.max(left,b.x);x<Math.min(left+18,b.x+b.w);x++)for(let z=Math.max(back,b.z);z<Math.min(back+18,b.z+b.d);z++)for(let y=b.y;y<b.y+b.h;y++)put(x,y,z,b.id);
 }
}
