import {skylineGround} from './skyline.js';
// Versioned placement is independent of load order and player inventory.
export const DISCOVERY_VERSION=1;
export const discoveryKey=(generator,site)=>`${DISCOVERY_VERSION}|${generator.seed}|${site.id}`;
export const FIRST_CASE_VERSION=2;
export const CASE_LAYOUT_VERSION=2;
// The inner clearing is dry, level and reserved before trees and boulders are
// populated. These sites are on its rim, beyond the player's interaction reach.
const clearingEdge=[[-14,-7],[-14,4],[-9,-14],[2,-14],[12,-14],[-14,11],[14,-8],[-10,14]];
export function firstCasePosition(generator){
 const {x,z}=generator.home;
 if(generator.legacy)return {x:Math.floor(generator.spawn.x)-3,z:Math.floor(generator.spawn.z)-3};
 if(generator.firstCaseVersion===1)return {x:x+6,z:z+7};
 const [dx,dz]=clearingEdge[Math.floor(generator.noise.random(x,z,1283)*clearingEdge.length)];
 return {x:x+dx,z:z+dz};
}
export function firstCaseHint(generator){
 if(!generator||generator.legacy||generator.firstCaseVersion===1)return 'Look for the brass case near your cabin.';
 const spot=firstCasePosition(generator),angle=Math.atan2(spot.x-generator.home.x,generator.home.z-spot.z);
 const side=['north','northeast','east','southeast','south','southwest','west','northwest'][(Math.round(angle/(Math.PI/4))+8)%8];
 return 'Look for a brass case at the '+side+' edge of the cabin clearing.';
}
// Keep the original candidates and claim IDs. A survivor is the best local roll,
// even when its neighbor lives in a chunk that has never been loaded.
const candidateCaches=new WeakMap();
const surfaceGap=30,buriedGap=22,mixedGap=16;
function candidateAt(generator,cx,cz){
 let cache=candidateCaches.get(generator);
 if(!cache){cache=new Map();candidateCaches.set(generator,cache);}
 const key=cx+','+cz;
 if(cache.has(key))return cache.get(key);
 const n=generator.noise,surface=n.random(cx,cz,709),buried=n.random(cx,cz,719);
 let spot=null;
 if(surface<.24||buried<.55){
  const x=cx*16+2+Math.floor(n.random(cx,cz,701)*12),z=cz*16+2+Math.floor(n.random(cx,cz,703)*12);
  const nearCabin=Math.max(Math.abs(x-generator.home.x),Math.abs(z-generator.home.z))<25;
  if(!nearCabin&&!(generator.legacy&&Math.abs(x)<52&&Math.abs(z)<52)){
   const h=generator.column(x,z).h;
   if(h>=4){
    const first=firstCasePosition(generator),distance=(x-first.x)**2+(z-first.z)**2;
    const spaced=generator.caseLayoutVersion>=2;
    spot={cx,cz,x,z,h,surface:surface<.24&&(!spaced||distance>=surfaceGap**2)?surface:null,
     buried:buried<.55&&(!spaced||distance>=mixedGap**2)?buried:null};
   }
  }
 }
 if(cache.size>=4096)cache.clear();
 cache.set(key,spot);return spot;
}
function anyNear(generator,spot,radius,qualifies){
 const {x,z}=spot;
 for(let cx=Math.floor((x-radius)/16);cx<=Math.floor((x+radius)/16);cx++){
  for(let cz=Math.floor((z-radius)/16);cz<=Math.floor((z+radius)/16);cz++){
   const other=candidateAt(generator,cx,cz);
   if(other&&(x-other.x)**2+(z-other.z)**2<radius**2&&qualifies(other))return true;
  }
 }
 return false;
}
function kept(generator,spot,kind,gap){
 if(spot[kind]===null)return false;
 const flag=kind==='surface'?'keptSurface':'keptBuried';
 if(spot[flag]===undefined){
  spot[flag]=!anyNear(generator,spot,gap,other=>other[kind]!==null&&(other[kind]<spot[kind]||
   other[kind]===spot[kind]&&(other.cx<spot.cx||other.cx===spot.cx&&other.cz<spot.cz)));
 }
 return spot[flag];
}
export function discoverySites(generator,cx,cz){
 const out=[],first=firstCasePosition(generator);
 if(Math.floor(first.x/16)===cx&&Math.floor(first.z/16)===cz)out.push({id:'starter',type:'cache',...first,y:generator.column(first.x,first.z).h+1,starter:true,buried:false});
 const spot=candidateAt(generator,cx,cz);
 if(!spot)return out;
 const {x,z,h}=spot,spaced=generator.caseLayoutVersion>=2;
 if(spot.surface!==null&&(!spaced||kept(generator,spot,'surface',surfaceGap))){
  out.push({id:`case:${cx}:${cz}`,type:'cache',x,y:skylineGround(generator,x,z,h)+1,z,buried:false});
 }
 if(spot.buried!==null&&(!spaced||kept(generator,spot,'buried',buriedGap)&&
  !anyNear(generator,spot,mixedGap,other=>kept(generator,other,'surface',surfaceGap)))){
  const y=Math.max(-27,h-5-Math.floor(generator.noise.random(cx,cz,727)*23));
  out.push({id:`buried:${cx}:${cz}`,type:'cache',x,y,z,buried:true});
 }
 return out;
}
