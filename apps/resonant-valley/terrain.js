import {venuePlaces} from './venue-places.js';
import {plantSkyline,skylineSites} from './skyline.js';
import {populateLandmarks} from './landmarks.js';
import {discoverySites,FIRST_CASE_VERSION,CASE_LAYOUT_VERSION} from './discovery-sites.js';
import {Noise} from './noise.js';
import {makeLegacyValley} from './legacy-terrain.js';
import {SHORELINE_VERSION,naturalBankSurface,groundCover} from './shoreline.js';

export const CHUNK_SIZE=16, MIN_Y=-32, MAX_Y=95, HEIGHT=MAX_Y-MIN_Y+1;
export const SEA_LEVEL=2, WATER=255, WORLD_LIMIT=131071, GENERATOR_VERSION=1;
export const PAD=1, STRIDE=CHUNK_SIZE+PAD*2;
export const chunkKey=(cx,cz)=>`${cx},${cz}`;
export const blockKey=(x,y,z)=>`${x},${y},${z}`;
export const chunkAt=(x,z)=>chunkKey(Math.floor(x/CHUNK_SIZE),Math.floor(z/CHUNK_SIZE));
export const voxelIndex=(lx,y,lz)=>((lx*STRIDE+lz)*HEIGHT+y-MIN_Y);
export const solid=id=>id!==0&&id!==WATER;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
const coverDensity={forest:.78,taiga:.7,meadow:.13,wetland:.2,alpine:.07,desert:.12};
export const BIOMES={ocean:'Ocean',beach:'Beach',river:'River',meadow:'Meadow',forest:'Woodland',taiga:'Pine forest',alpine:'Snowy highlands',desert:'Desert',wetland:'Wetland'};

export class TerrainGenerator {
  constructor({seed='Resonant Valley',version=GENERATOR_VERSION,legacy=false,landmarksVersion=1,landmarkExclusions=[],skylineExclusions=[],skylineVersion=1,shorelineVersion=SHORELINE_VERSION,firstCaseVersion=FIRST_CASE_VERSION,caseLayoutVersion=CASE_LAYOUT_VERSION}={}) {
    if(version!==GENERATOR_VERSION)throw Error('This world uses a newer terrain generator.');
    if(shorelineVersion!==0&&shorelineVersion!==SHORELINE_VERSION)throw Error('This world uses a newer shoreline generator.');
    this.shorelineVersion=shorelineVersion;
    if(![0,1].includes(skylineVersion))throw Error('This world uses a newer skyline generator.');
    this.skylineVersion=skylineVersion;this.skylineExclusions=Array.isArray(skylineExclusions)?skylineExclusions.filter(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isInteger)).slice(0,180000):[];
    this.skylineProtected=new Set(this.skylineExclusions.map(p=>p.join(',')));
    if(firstCaseVersion!==1&&firstCaseVersion!==FIRST_CASE_VERSION)throw Error('This world uses a newer discovery layout.');
    this.firstCaseVersion=firstCaseVersion;
    if(caseLayoutVersion!==1&&caseLayoutVersion!==CASE_LAYOUT_VERSION)throw Error('This world uses a newer treasure layout.');
    this.caseLayoutVersion=caseLayoutVersion;
    this.seed=String(seed).slice(0,80)||'Resonant Valley';this.version=version;this.legacy=!!legacy;
    this.landmarksVersion=landmarksVersion===0?0:1;this.landmarkExclusions=Array.isArray(landmarkExclusions)?landmarkExclusions.filter(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isInteger)).slice(0,180000):[];
    this.protectedRegions=new Set(this.landmarkExclusions.map(p=>p.join(',')));this.noise=new Noise(this.seed);this.cache=new Map();this.old=this.legacy?makeLegacyValley():null;
    this.home=this.legacy?{x:0,z:0,h:3}:this.findHome();
    this.spawn=this.legacy?{x:18.2,y:5.66,z:13.8,yaw:.49}:{x:this.home.x+8.2,y:this.home.h+2.66,z:this.home.z+12.8,yaw:.49};
  }
  config(){return {seed:this.seed,version:this.version,legacy:this.legacy,landmarksVersion:this.landmarksVersion,landmarkExclusions:this.landmarkExclusions,skylineVersion:this.skylineVersion,skylineExclusions:this.skylineExclusions,shorelineVersion:this.shorelineVersion,firstCaseVersion:this.firstCaseVersion,caseLayoutVersion:this.caseLayoutVersion};}
  rawColumn(x,z) {
    const n=this.noise;
    const wx=x+n.value2(x/290,z/290,7)*34,wz=z+n.value2(x/290,z/290,11)*34;
    const continent=n.fbm(wx/510,wz/510,4,31),land=smooth(-.2,.16,continent);
    const erosion=(n.fbm(wx/180,wz/180,3,111)+1)/2;
    const ridge=1-Math.abs(n.fbm(wx/155,wz/155,3,151));
    const hills=n.fbm(wx/58,wz/58,3,181);
    const mountains=Math.pow(ridge,3)*smooth(.43,.74,erosion)*39;
    let h=SEA_LEVEL-14+land*(21+hills*9+mountains);
    const river=Math.abs(n.fbm(wx/210,wz/210,2,211));
    const riverCut=(1-smooth(.018,.067,river))*smooth(.72,.97,land);
    h=mix(h,Math.min(h,SEA_LEVEL-1.6),riverCut*.96);
    h=Math.floor(clamp(h,MIN_Y+7,MAX_Y-16));
    const temperature=clamp(.53+n.fbm(x/570,z/570,3,271)*.65-Math.max(0,h-19)*.013);
    const moisture=clamp(.5+n.fbm(x/390,z/390,3,301)*.75);
    let biome='meadow';
    if(h<SEA_LEVEL)biome=riverCut>.5&&land>.85?'river':'ocean';
    else if(h<=SEA_LEVEL+1)biome=moisture>.69?'wetland':'beach';
    else if(h>37||temperature<.22)biome='alpine';
    else if(temperature>.59&&moisture<.43)biome='desert';
    else if(temperature<.37)biome='taiga';
    else if(moisture>.55)biome='forest';
    return {h,biome,temperature,moisture,land,riverCut};
  }
  findHome() {
    // A deterministic search chooses dry land, including for mostly-ocean seeds.
    let best=null;
    for(let radius=0;radius<=768;radius+=24){
      const count=Math.max(1,Math.ceil(radius/12));
      for(let i=0;i<count;i++){
        const a=i/count*Math.PI*2,x=Math.round(Math.cos(a)*radius),z=Math.round(Math.sin(a)*radius),c=this.rawColumn(x,z);
        if(c.h>=SEA_LEVEL+4&&c.h<27&&c.biome!=='desert')return {x,z,h:c.h};
        if(c.h>=SEA_LEVEL+2&&!best)best={x,z,h:c.h};
      }
    }
    return best||{x:0,z:0,h:SEA_LEVEL+5};
  }
  inLegacy(x,z){return this.legacy&&x>=-48&&x<48&&z>=-48&&z<48;}
  column(x,z) {
    x=Math.floor(x);z=Math.floor(z);const k=`${x},${z}`;
    if(this.cache.has(k))return this.cache.get(k);
    let c=this.rawColumn(x,z);
    if(this.inLegacy(x,z)){
      c={...c,h:this.old.height(x,z),biome:this.old.height(x,z)<SEA_LEVEL?'ocean':'meadow',preserved:true};
    }else if(this.legacy){
      const bx=clamp(x,-48,47),bz=clamp(z,-48,47),distance=Math.max(Math.abs(x-bx),Math.abs(z-bz));
      if(distance<32)c={...c,h:Math.round(mix(this.old.height(bx,bz),c.h,smooth(0,32,distance)))};
    }else{
      const d=Math.max(Math.abs(x-this.home.x),Math.abs(z-this.home.z));
      if(d<30)c={...c,h:Math.round(mix(this.home.h,c.h,smooth(15,30,d))),biome:d<17?'meadow':c.biome};
    }
    if(this.shorelineVersion&&!c.preserved)c.bankSurface=naturalBankSurface(this.noise,c,x,z,SEA_LEVEL);
    if(this.cache.size>6000)this.cache.clear();this.cache.set(k,c);return c;
  }
  material(c,depth,x,z) {
    if(depth>3)return 3;
    if(c.bankSurface===1)return depth===0?1:2;
    if(c.bankSurface!==undefined)return depth<2?c.bankSurface:3;
    if(c.biome==='desert')return depth<3?10:23;
    if(['ocean','beach','river'].includes(c.biome)||c.h<SEA_LEVEL)return depth<2?(this.noise.random(x,z,401)>.82?24:10):3;
    if(c.biome==='alpine')return depth===0?21:depth<2?2:3;
    if(c.h>30&&this.noise.value2(x/16,z/16,403)>.2)return 3;
    if(c.biome==='wetland')return depth===0?14:2;
    return depth===0?1:2;
  }
  cave(x,y,z,c) {
    if(y<=MIN_Y+2||y>=c.h-1)return false;
    const a=this.noise.value3(x*.046,y*.061,z*.046,451);
    const b=this.noise.value3(x*.068+17,y*.075,z*.068-31,457);
    const tunnel=Math.abs(a)<.095&&Math.abs(b)<.21;
    const chamber=y<c.h-6&&this.noise.value3(x*.036,y*.046,z*.036,463)>.63;
    return tunnel||chamber;
  }
  starterEntities() {
    if(this.legacy)return this.old.entities.filter(e=>!['home-piano','home-marimba'].includes(e.id)).map(e=>({...e}));
    const {x,z,h}=this.home;
    return [
      ['bed',1,-3],['record',-4,2],['bench',-1,3],['desk',-3,-6],['workbench',6,2],['lantern',-5,3],['planter',4,3]
    ].map(([type,dx,dz])=>({id:'home-'+type,type,x:x+dx,y:h+1,z:z+dz,r:0})).concat(venuePlaces(this));
  }
  naturalFeature(gx,gz,towers){
    const n=this.noise,x=gx*6+Math.floor(n.random(gx,gz,501)*5),z=gz*6+Math.floor(n.random(gx,gz,503)*5);
    if(towers.some(t=>Math.max(Math.abs(t.x-x),Math.abs(t.z-z))<7))return null;
    if(this.legacy?Math.max(Math.abs(x),Math.abs(z))<52:Math.max(Math.abs(x-this.home.x),Math.abs(z-this.home.z))<18)return null;
    const c=this.column(x,z),chance=n.random(gx,gz,509),density=coverDensity[c.biome]||0;
    if(c.h<=SEA_LEVEL+1||chance>=density&&chance<=.965)return null;
    if(Math.max(Math.abs(c.h-this.column(x+2,z).h),Math.abs(c.h-this.column(x,z+2).h))>3)return null;
    const y=c.h+1;
    if(chance>=density)return {kind:'boulder',x,y,z};
    if(c.biome==='desert')return {kind:'cactus',x,y,z,height:2+Math.floor(n.random(x,z,521)*3)};
    const pine=c.biome==='taiga'||c.biome==='alpine',height=4+Math.floor(n.random(x,z,523)*(pine?4:3));
    const autumn=!pine&&n.random(x,z,527)>.72;
    return {kind:'tree',x,y,z,pine,height,leaf:pine?22:autumn?12:5,trunk:autumn?15:4};
  }
  generateChunk(cx,cz) {
    const x0=cx*CHUNK_SIZE-PAD,z0=cz*CHUNK_SIZE-PAD,cells=new Uint8Array(STRIDE*STRIDE*HEIGHT),decor=[];
    const get=(x,y,z)=>x<x0||x>=x0+STRIDE||z<z0||z>=z0+STRIDE||y<MIN_Y||y>MAX_Y?0:cells[voxelIndex(x-x0,y,z-z0)];
    const put=(x,y,z,id,onlyAir=false)=>{
      if(x<x0||x>=x0+STRIDE||z<z0||z>=z0+STRIDE||y<MIN_Y||y>MAX_Y)return;
      const i=voxelIndex(x-x0,y,z-z0);if(!onlyAir||!cells[i])cells[i]=id;
    };
    for(let lx=0;lx<STRIDE;lx++)for(let lz=0;lz<STRIDE;lz++){
      const x=x0+lx,z=z0+lz,c=this.column(x,z);
      for(let y=MIN_Y;y<=Math.max(c.h,SEA_LEVEL);y++){
        let id=0;
        if(y<=c.h){id=this.material(c,c.h-y,x,z);if(this.cave(x,y,z,c))id=c.h<SEA_LEVEL||y<MIN_Y+8?WATER:0;}
        else if(y<=SEA_LEVEL)id=WATER;
        if(y===MIN_Y)id=3;
        put(x,y,z,id);
      }
    }
    // Feature anchors are evaluated outside the chunk too, so canopies and
    // boulders crossing its boundary do not depend on which chunk arrived first.
    const towers=skylineSites(this,x0+9,z0+9,24).filter(s=>s.type==='lookout');
    for(let gx=Math.floor((x0-4)/6);gx<=Math.floor((x0+STRIDE+4)/6);gx++)for(let gz=Math.floor((z0-4)/6);gz<=Math.floor((z0+STRIDE+4)/6);gz++){
      const feature=this.naturalFeature(gx,gz,towers);if(!feature)continue;
      const {x,y,z,height,pine,leaf,trunk}=feature;
      if(feature.kind==='cactus'){for(let dy=0;dy<height;dy++)put(x,y+dy,z,28);}
      else if(feature.kind==='tree'){
        for(let dy=0;dy<height;dy++)put(x,y+dy,z,trunk);
        for(let dy=pine?1:height-3;dy<=height+1;dy++){
          const r=pine?Math.max(0,Math.floor((height+1-dy)/2)):dy===height+1?1:2;
          for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++)if(Math.abs(dx)+Math.abs(dz)<=r+1)put(x+dx,y+dy,z+dz,leaf,true);
        }
      }else{
        for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
          const ground=this.column(x+dx,z+dz).h;put(x+dx,ground+1,z+dz,19);if(dx===0||dz===0)put(x+dx,ground+2,z+dz,3);
        }
      }
    }
    if(this.legacy){
      // Preserve the complete old area, including its exact tree/cabin blocks.
      for(let lx=0;lx<STRIDE;lx++)for(let lz=0;lz<STRIDE;lz++){
        const x=x0+lx,z=z0+lz;if(!this.inLegacy(x,z))continue;
        for(let y=MIN_Y;y<=MAX_Y;y++){
          let id=y< -3?3:this.old.get(x,y,z);
          if(!id&&y<=SEA_LEVEL)id=WATER;put(x,y,z,id);
        }
      }
    }else this.cabin(put);
    for(let lx=PAD;lx<CHUNK_SIZE+PAD;lx++)for(let lz=PAD;lz<CHUNK_SIZE+PAD;lz++){
      const x=x0+lx,z=z0+lz,c=this.column(x,z),base=get(x,c.h,z);
      if(this.shorelineVersion){
        const plant=groundCover(this,x,z,c,base,get(x,c.h+1,z),SEA_LEVEL,WATER);
        if(plant)decor.push(plant);
        continue;
      }
      if(base!==1||get(x,c.h+1,z)||this.noise.random(x,z,601)>.22)continue;
      decor.push({x:x+.2+this.noise.random(x,z,607)*.6,y:c.h+1,z:z+.2+this.noise.random(x,z,613)*.6,flower:this.noise.random(x,z,617)>.5,color:Math.floor(this.noise.random(x,z,619)*4)});
    }
    populateLandmarks(this,cx,cz,put,decor);
    plantSkyline(this,cx,cz,put);
    for(const site of discoverySites(this,cx,cz))if(site.buried)put(site.x,site.y,site.z,29);
    return {cx,cz,cells,decor};
  }
  cabin(put) {
    const {x:ox,z:oz,h}=this.home;
    const p=(x,y,z,id)=>put(ox+x,h+y,oz+z,id);
    for(let x=-6;x<=5;x++)for(let z=-8;z<=4;z++)p(x,0,z,6);
    for(let x=-5;x<=3;x++)for(let z=-8;z<=0;z++)for(let y=1;y<=4;y++){
      if(x!==-5&&x!==3&&z!==-8&&z!==0)continue;
      if(z===0&&(x===-2||x===-1)&&y<=3)continue;
      let id=(x===-5||x===3)&&(z===-8||z===0)?4:6;
      if((x===-5||x===3)&&z>=-6&&z<=-3&&(y===2||y===3))id=8;
      if((z===-8||z===0)&&x>=0&&x<=1&&y===2)id=8;p(x,y,z,id);
    }
    for(let x=-6;x<=4;x++){
      const roof=5+Math.floor(Math.min(x+6,4-x)*.6);
      for(let z=-9;z<=1;z++)p(x,roof,z,9);
      if(x>-5&&x<3)for(let y=5;y<roof;y++){p(x,y,-8,6);p(x,y,0,6);}
    }
  }
}

export function applyChunkEdits(chunk,edits) {
  const x0=chunk.cx*CHUNK_SIZE-PAD,z0=chunk.cz*CHUNK_SIZE-PAD;
  const touched=new Set();
  for(const [key,id] of edits){
    const [x,y,z]=key.split(',').map(Number);
    if(x<x0||x>=x0+STRIDE||z<z0||z>=z0+STRIDE||y<MIN_Y||y>MAX_Y)continue;
    const cell=voxelIndex(x-x0,y,z-z0);
    chunk.cells[cell]=id;
    touched.add(cell);
  }
  // A naturally planted patch never grows back through a player's floor or
  // dock, even when they chose the same material as the original bank.
  if(touched.size&&chunk.decor?.length)chunk.decor=chunk.decor.filter(plant=>{
    const cell=voxelIndex(Math.floor(plant.x)-x0,plant.y,Math.floor(plant.z)-z0);
    return !touched.has(cell-1)&&!touched.has(cell)&&!(plant.kind==='reeds'&&touched.has(cell+1));
  });
  return chunk;
}
