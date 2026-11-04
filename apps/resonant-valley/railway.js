// Ports are ordered clockwise, north through west. Their height is measured at the tile edge.
export const RAIL_ITEMS={
 rail:{name:'Straight track',color:'#aebdc6',category:'Railway'},
 railBend:{name:'Curved track',color:'#aebdc6',category:'Railway'},
 railGrade:{name:'Uphill track',color:'#aebdc6',category:'Railway'},
 railSwitch:{name:'Track switch',color:'#e5a65c',category:'Railway'}
};
export const TRACK_LIMIT=12000;
export const bearings=[[0,-1],[1,0],[0,1],[-1,0]];
export const isTrack=type=>Object.hasOwn(RAIL_ITEMS,type);
const key=(x,y,z)=>x+','+y+','+z;
const chunk=(x,z)=>Math.floor(x/16)+','+Math.floor(z/16);
export function railEnds(tile,all=false){
 const r=tile.r,trunk=(r+2)%4,branch=(r+1)%4;
 if(tile.type==='railSwitch'&&all)return [trunk,r,branch];
 return [trunk,tile.type==='railBend'||tile.type==='railSwitch'&&tile.switched?branch:r];
}
const raised=(tile,side)=>tile.type==='railGrade'&&side===tile.r?1:0;
export function railPoint(tile,from,t){
 const ends=railEnds(tile),to=ends[0]===from?ends[1]:ends[0];
 const [ax,az]=bearings[from],[bx,bz]=bearings[to],bend=(from+2)%4!==to;
 const a=bend?(1-t)*(1-t):1-t,b=bend?t*t:t;
 const tx=bend?-(1-t)*ax+t*bx:bx-ax,tz=bend?-(1-t)*az+t*bz:bz-az,length=Math.hypot(tx,tz);
 return {x:tile.x+.5+(ax*a+bx*b)*.5,y:tile.y+.115+raised(tile,from)*(1-t)+raised(tile,to)*t,z:tile.z+.5+(az*a+bz*b)*.5,dx:tx/length,dz:tz/length};
}
export const pathLength=t=>t.type==='railGrade'?Math.SQRT2:(railEnds(t)[0]+2)%4===railEnds(t)[1]?1:.812;
export function cartPose(net,cart){
 const tile=net.at(cart.x,cart.y,cart.z);if(!tile)return null;
 const ends=railEnds(tile),from=ends.includes(cart.enter)?cart.enter:ends[0];
 return {...railPoint(tile,from,Number.isFinite(cart.travel)?cart.travel:.5),from};
}
export class Railway{
 constructor(rows=[]){
  this.tiles=new Map();this.chunks=new Map();
  for(const row of Array.isArray(rows)?rows.slice(0,TRACK_LIMIT):[]){
   if(Array.isArray(row)&&row.length>=5)this.put({x:row[0],y:row[1],z:row[2],type:row[3],r:row[4],switched:row[5]===1});
  }
 }
 at(x,y,z){return this.tiles.get(key(x,y,z));}
 put({x,y,z,type,r,switched=false}){
  if(![x,y,z,r].every(Number.isInteger)||Math.abs(x)>131071||Math.abs(z)>131071||y<=-32||y>95||r<0||r>3||!isTrack(type)||this.tiles.size>=TRACK_LIMIT)return null;
  const id=key(x,y,z);if(this.tiles.has(id))return null;
  const t={id:'rail:'+id,x,y,z,type,r,switched:!!switched},k=chunk(x,z);
  this.tiles.set(id,t);if(!this.chunks.has(k))this.chunks.set(k,new Set());this.chunks.get(k).add(t);return t;
 }
 remove(t){const k=chunk(t.x,t.z);this.tiles.delete(key(t.x,t.y,t.z));const set=this.chunks.get(k);set?.delete(t);if(!set?.size)this.chunks.delete(k);}
 serialize(){return [...this.tiles.values()].map(t=>[t.x,t.y,t.z,t.type,t.r,t.switched?1:0]);}
 neighbor(tile,side){
  const [dx,dz]=bearings[side],y=tile.y+raised(tile,side),opposite=(side+2)%4;
  for(const base of [y,y-1]){
   const peer=this.at(tile.x+dx,base,tile.z+dz);
   if(peer&&railEnds(peer).includes(opposite)&&base+raised(peer,opposite)===y)return peer;
  }
  return null;
 }
 extension(tile,point,type,rotation){
  const ends=railEnds(tile,true);
  const distance=side=>{const [dx,dz]=bearings[side];return Math.hypot(tile.x+.5+dx*.5-point.x,tile.z+.5+dz*.5-point.z);};
  const side=[...ends].sort((a,b)=>distance(a)-distance(b))[0],[dx,dz]=bearings[side],entry=(side+2)%4;
  const draft={x:tile.x+dx,y:tile.y+raised(tile,side),z:tile.z+dz,type,r:rotation};
  if(!railEnds(draft,true).includes(entry))draft.r=(entry+2)%4;
  draft.y-=raised(draft,entry);return draft;
 }
 advance(cart,meters,clear=()=>true){
  let tile=this.at(cart.x,cart.y,cart.z);
  if(!tile)return 'Track removed';
  let from=railEnds(tile).includes(cart.enter)?cart.enter:railEnds(tile)[0],t=cart.travel??.5;
  const sign=Math.sign(meters);
  // Traverse in small increments so a slope or bend cannot carry a rider through a wall.
  while(Math.abs(meters)>.00001){
   const ends=railEnds(tile),length=pathLength(tile),available=(sign>0?1-t:t)*length;
   if(available<.00001){
    const edge=sign>0?ends.find(p=>p!==from):from,peer=this.neighbor(tile,edge);
    if(!peer)return 'End of track';
    const seam=(edge+2)%4;from=sign>0?seam:railEnds(peer).find(p=>p!==seam);t=sign>0?0:1;tile=peer;
   }
   const amount=sign*Math.min(Math.abs(meters),.2,(sign>0?1-t:t)*pathLength(tile)),next=Math.min(1,Math.max(0,t+amount/pathLength(tile)));
   const status=clear(railPoint(tile,from,next),tile);if(status!==true)return status||'Track blocked';
   t=next;meters-=amount;Object.assign(cart,{x:tile.x,y:tile.y,z:tile.z,enter:from,travel:t});
  }
  return '';
 }
}
export function stationGain(distance){return Math.max(0,1-distance/36)**1.45;}
