// Positions are in reserved cabin cells. During an upgrade, skip occupied or
// edited spots so a player can supply their own poster or station bin instead.
export function venuePlaces(g){
 const h=g.home;
 return g.legacy?[{id:'home-gigPoster',type:'gigPoster',x:7,y:5,z:-13,r:0},{id:'home-exchangeCrate',type:'exchangeCrate',x:13,y:4,z:1,r:0}]:
  [{id:'home-gigPoster',type:'gigPoster',x:h.x-2,y:h.h+2,z:h.z-7,r:0},{id:'home-exchangeCrate',type:'exchangeCrate',x:h.x+7,y:h.h+1,z:h.z+6,r:0}];
}
export function upgradeVenues(world){
 const existing=world.entities,edits=world.edits;
 for(const spot of venuePlaces(world.generator)){
  if(existing.length>=300||existing.some(e=>e.type===spot.type||e.x===spot.x&&e.z===spot.z&&Math.abs(e.y-spot.y)<=1))continue;
  let touched=false;for(let y=spot.y-1;y<=spot.y+2;y++)for(let z=spot.z-1;z<=spot.z;z++)if(edits.has([spot.x,y,z].join(',')))touched=true;
  if(!touched)world.addEntity(spot);
 }
}
