import {nearbyLandmarks} from './landmarks.js';
// Integer boxes describe both the walkable voxels and their distant silhouettes.
export const SKYLINE_NAMES={mesa:'Bluecap Mesa',lookout:'Bentwood Lookout',grove:'Cottonwood Grove'};
const radii={mesa:19,lookout:6,grove:13};
const homes=new WeakMap(),shapes=new WeakMap(),regions=new WeakMap();
function excluded(g,x,z,r){
 if(g.legacy&&Math.max(Math.abs(x),Math.abs(z))<62+r)return true;
 for(let a=Math.floor((x-r)/32);a<=Math.floor((x+r)/32);a++)for(let b=Math.floor((z-r)/32);b<=Math.floor((z+r)/32);b++)
  if(g.skylineProtected.has(a+','+b))return true;
 return false;
}
function site(g,type,x,z,key){
 const c=g.column(x,z);
 if(c.h<4||c.h>63||excluded(g,x,z,radii[type]+2)||nearbyLandmarks(g,x,z,radii[type]+15).length)return null;
 return {id:'landmark:1:sky:'+key,type,name:SKYLINE_NAMES[type],x,z,y:c.h+1,biome:c.biome};
}
function homeSites(g){
 if(homes.has(g))return homes.get(g);
 const result=[],{x,z}=g.home,n=g.noise;
 for(const [i,type] of ['mesa','lookout','grove'].entries()){
  const base=[-.58,.53,-1.66][i],radius=[77,50,46][i];let best=null,score=-Infinity;
  for(let k=0;k<48;k++){
   const angle=base+(n.random(i,k,1421)-.5)*(k<28?1.0:5.9);
   const d=radius+(n.random(i,k,1433)-.47)*30+(g.legacy?42:0);
   const wx=x+Math.round(Math.sin(angle)*d),wz=z-Math.round(Math.cos(angle)*d);
   const s=site(g,type,wx,wz,'home:'+type);if(!s||result.some(o=>Math.hypot(o.x-wx,o.z-wz)<radii[type]+radii[o.type]+7))continue;
   const slope=Math.abs(g.column(wx-4,wz).h-g.column(wx+4,wz).h)+Math.abs(g.column(wx,wz-4).h-g.column(wx,wz+4).h);
   let water=0;for(const fraction of [.3,.55,.76])if(g.column(x+(wx-x)*fraction,z+(wz-z)*fraction).h<2)water++;
   const value=(k<28?24:0)-water*7+Math.min(s.y-g.home.h,16)*.45-slope*.7-Math.abs(d-radius)*.1;
   if(value>score){best=s;score=value;}
  }
  if(best)result.push(best);
 }
 homes.set(g,result);return result;
}
function regional(g,cx,cz){
 let cache=regions.get(g);if(!cache){cache=new Map();regions.set(g,cache);}
 const k=cx+','+cz;if(cache.has(k))return cache.get(k);
 const n=g.noise,x=cx*184+38+Math.floor(n.random(cx,cz,1451)*108),z=cz*184+38+Math.floor(n.random(cx,cz,1459)*108);
 let found=null;
 if(Math.hypot(x-g.home.x,z-g.home.z)>138&&n.random(cx,cz,1463)>.18){
  const type=['mesa','lookout','grove'][Math.floor(n.random(cx,cz,1471)*3)];found=site(g,type,x,z,k);
 }
 if(cache.size>512)cache.clear();cache.set(k,found);return found;
}
export function skylineSites(g,x,z,r){
 if(!g.skylineVersion)return [];
 const candidates=[...homeSites(g)];
 for(let a=Math.floor((x-r)/184);a<=Math.floor((x+r)/184);a++)for(let b=Math.floor((z-r)/184);b<=Math.floor((z+r)/184);b++){
  const s=regional(g,a,b);if(s)candidates.push(s);
 }
 return candidates.filter(s=>Math.abs(s.x-x)<=r&&Math.abs(s.z-z)<=r);
}
export function skylineBoxes(g,s){
 if(shapes.has(s))return shapes.get(s);
 const boxes=[],{x,y,z}=s;
 const box=(dx,dy,dz,w,h,d,id)=>boxes.push({x:x+dx,y:y+dy,z:z+dz,w,h,d,id});
 if(s.type==='mesa'){
  // Strata taper into two flat-topped buttes with a stepped eastern approach.
  const bands=[[-9,10,1,3],[1,3,.95,25],[4,2,.91,13],[6,3,.83,25],[9,1,.78,11],[10,4,.75,25],[14,1,.70,13],[15,1,.66,25]];
  for(const [ox,oz,r,short] of [[-4,0,1,false],[9,-5,.59,true]]){
   for(const [bottom,height,width,id] of bands){
    if(short&&bottom>=10)continue;
    const rz=10*r*width,rx=12*r*width;
    for(let j=-Math.floor(rz);j<=rz;j++){
     const half=Math.floor(rx*Math.pow(Math.max(0,1-Math.pow(Math.abs(j)/(rz+.45),3)),1/3));
     if(half<1)continue;
     const shift=Math.round(Math.sin((j+z)*.42)*.8);
     box(ox-half+shift,bottom,oz+j,2*half+1,height,1,id);
    }
   }
  }
  for(let i=0;i<16;i++)box(12-i,0,3+Math.floor(i/6),2,i+1,2,i%4===2?13:25);
 }
 if(s.type==='lookout'){
  for(const dx of [-2,2])for(const dz of [-2,2]){
   const foundation=g.column(x+dx,z+dz).h-y;
   box(dx,Math.min(foundation,0),dz,1,9-Math.min(foundation,0),1,4);
   box(dx+1,9,dz,1,6,1,4);
  }
  for(let h=3;h<=9;h+=3){box(-2,h,-2,5,1,1,20);box(-2,h,2,5,1,1,20);}
  // A spiral of one-block rises joins the hatch in the upper deck.
  const spiral=[[-1,1],[0,1],[1,1],[1,0],[1,-1],[0,-1],[-1,-1],[-1,0]];
  for(let j=0;j<10;j++){const [dx,dz]=spiral[j%8];box(dx,j,dz,1,1,1,6);}
  box(-2,10,-3,7,1,4,6);box(2,10,1,3,1,3,6);box(-2,10,2,4,1,2,6);
  box(-2,11,-3,7,1,1,20);box(-2,11,-2,1,1,5,20);box(4,11,-2,1,1,6,20);
  box(-3,15,-4,9,1,9,13);box(-2,16,-3,7,1,7,13);box(0,17,-3,3,1,7,25);
  box(3,16,2,1,5,1,4);box(4,19,2,2,1,1,9);
 }
 if(s.type==='grove'){
  for(const [dx,dz,h] of [[-5,-1,9],[4,-3,12],[2,5,8]]){
   const base=g.column(x+dx,z+dz).h+1-y;
   box(dx,base,dz,2,h,1,26);
   for(const [side,lean] of [[-1,0],[1,-2],[0,2]]){
    for(let k=1;k<=3;k++)box(dx+side*k,base+h-4+k,dz+Math.round(lean*k/3),2,2,2,26);
    const bx=dx+side*3,bz=dz+lean;
    box(bx-3,base+h-1,bz-2,7,3,5,27);box(bx-2,base+h+2,bz-2,5,1,4,27);
    box(bx-2,base+h,bz-3,5,2,7,27);
   }
  }
 }
 shapes.set(s,boxes);return boxes;
}
export function plantSkyline(g,cx,cz,put){
 const x=cx*16-1,z=cz*16-1;
 for(const s of skylineSites(g,x+9,z+9,29))for(const b of skylineBoxes(g,s)){
  const right=Math.min(x+18,b.x+b.w),end=Math.min(z+18,b.z+b.d);
  for(let wx=Math.max(x,b.x);wx<right;wx++)for(let wz=Math.max(z,b.z);wz<end;wz++)
   for(let wy=b.y;wy<b.y+b.h;wy++)put(wx,wy,wz,b.id);
 }
}
export function skylineGround(g,x,z,base){
 let top=base;
 for(const s of skylineSites(g,x,z,20))if(s.type==='mesa')for(const b of skylineBoxes(g,s)){
  if(x>=b.x&&x<b.x+b.w&&z>=b.z&&z<b.z+b.d)top=Math.max(top,b.y+b.h-1);
 }
 return top;
}
