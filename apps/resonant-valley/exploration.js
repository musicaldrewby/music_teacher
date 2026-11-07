import {expeditionSites,EXPEDITION_NAMES} from './expedition-sites.js';
import {SKYLINE_NAMES,skylineSites} from './skyline.js';
import {BLOCKS} from './data.js';
import {MIN_Y,MAX_Y,PAD,WATER,voxelIndex} from './terrain.js';
import {nearbyLandmarks,LANDMARK_NAMES} from './landmarks.js';
const placeNames={...LANDMARK_NAMES,...SKYLINE_NAMES,...EXPEDITION_NAMES};
export const MAP_COLORS={ocean:'#326f9f',river:'#479bc2',beach:'#d6b36e',meadow:'#77aa68',forest:'#39745c',taiga:'#3e776f',alpine:'#cfdae8',desert:'#d1a462',wetland:'#607e8f'};
const key=(x,z)=>`${Math.floor(x/16)},${Math.floor(z/16)}`;
const validPoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&Math.abs(p.x)<=131071&&Math.abs(p.z)<=131071;
// 8×8 visible-surface samples per surveyed chunk. Keep detail bounded even in a very long-running world.
const tileColors=Array.from({length:128},(_,code)=>{const id=code&31,group=code>>5,base=id===31?'#409bc6':id===1?'#77ad63':id===5?'#439258':id===22?'#397c70':(BLOCKS[id]?.color||'#64758d');const rgb=base.slice(1).match(/../g).map(hex=>Math.min(255,Math.round(parseInt(hex,16)*[.76,.91,1,1.12][group])));return `rgb(${rgb.join(',')})`;});
export function surveyChunk(chunk){const out=new Uint8Array(64),heights=new Int16Array(64);for(let z=0;z<8;z++)for(let x=0;x<8;x++){const i=z*8+x;let y=MAX_Y,block=0;for(;y>=MIN_Y;y--){block=chunk.cells[voxelIndex(x*2+1+PAD,y,z*2+1+PAD)];if(block)break;}heights[i]=y;const prev=x?heights[i-1]:z?heights[i-8]:y,shade=y<prev-1?0:y<prev?1:y>prev?3:2;out[i]=(block===WATER?31:block&31)|(shade<<5);}return out;}
export class Exploration {
 constructor(raw={}){
  this.visited=new Set((Array.isArray(raw.visited)?raw.visited:[]).filter(k=>typeof k==='string'&&/^-?\d{1,5},-?\d{1,5}$/.test(k)).slice(-12000));
  this.surveys=new Map();this.sampled=new WeakSet();for(const pair of (Array.isArray(raw.surveys)?raw.surveys:[]).slice(-768)){if(!Array.isArray(pair)||!this.visited.has(pair[0])||typeof pair[1]!=='string'||pair[1].length!==88)continue;try{const rawTile=atob(pair[1]);if(rawTile.length===64)this.surveys.set(pair[0],Uint8Array.from(rawTile,c=>c.charCodeAt(0)&127));}catch{}}
  this.markers=(Array.isArray(raw.markers)?raw.markers:[]).filter(validPoint).slice(0,60).map((p,i)=>({id:typeof p.id==='string'&&/^pin-[a-z0-9]+$/.test(p.id)?p.id:'pin-'+i,x:Math.round(p.x),z:Math.round(p.z),name:String(p.name||'My place').slice(0,36)}));
  this.found=(Array.isArray(raw.found)?raw.found:[]).filter(p=>validPoint(p)&&typeof p.id==='string'&&Object.hasOwn(placeNames,p.type)).slice(-500).map(p=>({...p,name:placeNames[p.type]}));this.tracked=typeof raw.tracked==='string'?raw.tracked.slice(0,80):'home';this.keepsakes=new Set((Array.isArray(raw.keepsakes)?raw.keepsakes:[]).filter(k=>typeof k==='string'&&(k.startsWith('landmark:1:')||k.startsWith('expedition:1:'))).slice(0,2000));
 }
 visit(world){
  const p=world.camera.position,cx=Math.floor(p.x/16),cz=Math.floor(p.z/16);let changed=false;
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const k=`${cx+dx},${cz+dz}`;if(!world.isReady((cx+dx)*16+8,(cz+dz)*16+8))continue;if(!this.visited.has(k)){this.visited.add(k);changed=true;}const chunk=world.stream?.loaded.get(k);if(chunk?.ready&&!this.sampled.has(chunk)){this.sampled.add(chunk);const tile=surveyChunk(chunk),old=this.surveys.get(k);if(!old||tile.some((v,i)=>v!==old[i])){this.surveys.set(k,tile);changed=true;}}}
  while(this.surveys.size>768)this.surveys.delete(this.surveys.keys().next().value);
  while(this.visited.size>12000)this.visited.delete(this.visited.values().next().value);
  const places=[...nearbyLandmarks(world.generator,p.x,p.z,22),...skylineSites(world.generator,p.x,p.z,22),...expeditionSites(world.generator,p.x,p.z,22)];
  const newly=[];for(const s of places)if(Math.hypot(p.x-s.x,p.z-s.z)<=22&&Math.abs(p.y-s.y)<22&&!this.found.some(f=>f.id===s.id)){this.found.push(s);newly.push(s);changed=true;}this.found=this.found.slice(-500);
  return {changed,newly};
 }
 known(x,z){return this.visited.has(key(x,z));}
 add(name,x,z){if(this.markers.length>=60||!validPoint({x,z})||!this.known(x,z))return null;const p={id:'pin-'+Date.now().toString(36),name:String(name).trim().slice(0,36)||'My place',x:Math.round(x),z:Math.round(z)};this.markers.push(p);this.tracked=p.id;return p;}
 remove(id){this.markers=this.markers.filter(p=>p.id!==id);if(this.tracked===id)this.tracked='home';}
 points(home){return [{id:'home',name:'Home cabin',x:home.x,z:home.z},...this.markers,...this.found];}
 serialize(){return {surveys:[...this.surveys].map(([k,t])=>[k,btoa(String.fromCharCode(...t))]),keepsakes:[...this.keepsakes],visited:[...this.visited],markers:this.markers,found:this.found,tracked:this.tracked};}
}
export function compass(yaw){const bearing=((-yaw*180/Math.PI)%360+360)%360;return ['N','NE','E','SE','S','SW','W','NW'][Math.round(bearing/45)%8];}
export class ExplorerMap {
 constructor(canvas,callbacks){this.canvas=canvas;this.c=callbacks;this.range=96;this.center=null;this.selected=null;this.drag=null;this.suppressClick=false;
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;const p=this.center||this.c.world().camera.position;this.drag={x:e.clientX,y:e.clientY,cx:p.x,cz:p.z};this.suppressClick=false;canvas.setPointerCapture?.(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!this.drag)return;const d=this.drag,dx=e.clientX-d.x,dy=e.clientY-d.y;if(!this.suppressClick&&Math.hypot(dx,dy)<4)return;this.suppressClick=true;const r=canvas.getBoundingClientRect();this.center={x:d.cx-dx/r.width*this.range,z:d.cz-dy/r.height*this.range};this.render();});
  canvas.addEventListener('pointerup',()=>{this.drag=null;});canvas.addEventListener('pointercancel',()=>{this.drag=null;this.suppressClick=true;});
  canvas.addEventListener('keydown',e=>{const vec={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!vec)return;e.preventDefault();const p=this.center||this.c.world().camera.position;this.center={x:p.x+vec[0]*this.range/5,z:p.z+vec[1]*this.range/5};this.render();});
  canvas.addEventListener('click',e=>{if(this.suppressClick){this.suppressClick=false;return;}const r=canvas.getBoundingClientRect(),p=this.center||this.c.world().camera.position,x=p.x+((e.clientX-r.left)/r.width-.5)*this.range,z=p.z+((e.clientY-r.top)/r.height-.5)*this.range;if(this.c.state().known(x,z)){this.selected={x:Math.round(x),z:Math.round(z)};this.c.select(this.selected);this.render();}else this.c.notice('Explore this part of the valley before marking it.');});}
 render(){const ctx=this.canvas.getContext('2d'),w=this.canvas.width,h=this.canvas.height,world=this.c.world(),p=world.camera.position,state=this.c.state(),scale=w/this.range,center=this.center||p,ox=center.x-this.range/2,oz=center.z-this.range/2;
  ctx.fillStyle='#101c32';ctx.fillRect(0,0,w,h);ctx.imageSmoothingEnabled=false;ctx.fillStyle='#233451';for(let x=0;x<w;x+=32)for(let y=0;y<h;y+=32)ctx.fillRect(x,y,2,2);
  for(let cx=Math.floor(ox/16);cx<=(ox+this.range)/16;cx++)for(let cz=Math.floor(oz/16);cz<=(oz+this.range)/16;cz++)if(state.visited.has(`${cx},${cz}`)){
   const detail=state.surveys.get(`${cx},${cz}`);if(detail){for(let z=0;z<8;z++)for(let x=0;x<8;x++){ctx.fillStyle=tileColors[detail[z*8+x]];ctx.fillRect(Math.floor((cx*16+x*2-ox)*scale),Math.floor((cz*16+z*2-oz)*scale),Math.ceil(2*scale)+1,Math.ceil(2*scale)+1);}continue;}
   for(let dx=0;dx<16;dx+=4)for(let dz=0;dz<16;dz+=4){const x=cx*16+dx,z=cz*16+dz,col=world.generator.column(x,z);ctx.fillStyle=MAP_COLORS[col.biome]||MAP_COLORS.meadow;ctx.fillRect((x-ox)*scale,(z-oz)*scale,Math.ceil(4*scale),Math.ceil(4*scale));ctx.fillStyle=`rgba(12,22,39,${Math.max(0,Math.min(.3,(world.generator.column(x-4,z).h-col.h)*.035))})`;ctx.fillRect((x-ox)*scale,(z-oz)*scale,Math.ceil(4*scale),Math.ceil(4*scale));}
  }
  const pin=(x,z,color,size=7,kind='pin')=>{const px=(x-ox)*scale,py=(z-oz)*scale;if(px<8||py<8||px>w-8||py>h-8)return;ctx.fillStyle='#101c32';ctx.fillRect(px-size-2,py-size-2,size*2+4,size*2+4);ctx.fillStyle=color;ctx.fillRect(px-size,py-size,size*2,size*2);if(kind==='home'){ctx.fillRect(px-3,py-size-3,6,3);ctx.fillStyle='#263652';ctx.fillRect(px-2,py,4,size);}else if(kind==='landmark'){ctx.fillStyle='#273650';ctx.fillRect(px-1,py-2,2,4);}};
  for(const mark of state.points(world.generator.home))if(mark.id==='home'||state.known(mark.x,mark.z))pin(mark.x,mark.z,mark.id===state.tracked?'#ffcf76':mark.type?'#c2a2ff':'#fa837d',mark.type?5:6,mark.id==='home'?'home':mark.type?'landmark':'pin');
  if(this.selected)pin(this.selected.x,this.selected.z,'#fff',4);
  ctx.save();ctx.translate((p.x-ox)*scale,(p.z-oz)*scale);ctx.rotate(-world.camera.rotation.y);ctx.fillStyle='#16233b';ctx.beginPath();ctx.moveTo(0,-13);ctx.lineTo(10,10);ctx.lineTo(0,5);ctx.lineTo(-10,10);ctx.fill();ctx.fillStyle='#83d5ff';ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(7,7);ctx.lineTo(0,3);ctx.lineTo(-7,7);ctx.fill();ctx.restore();
  ctx.font='14px monospace';ctx.fillStyle='#fff';ctx.fillText('N',w/2-4,20);ctx.fillStyle='#14233bdd';ctx.fillRect(10,h-31,162,22);ctx.fillStyle='#e5edf8';ctx.fillText(`${this.range} blocks across`,18,h-15);
 }
}
