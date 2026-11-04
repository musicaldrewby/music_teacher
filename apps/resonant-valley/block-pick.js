// Visit only the cells crossed by a short look ray. Terrain meshes include tall
// caves and whole tree crowns, so testing their triangles is wasteful here.
export function traceBlocks(origin,direction,reach,read) {
  const axes=['x','y','z'],cell={},step={},next={},stride={};
  for(const axis of axes){
    const velocity=direction[axis];
    cell[axis]=Math.floor(origin[axis]+velocity*1e-8);
    step[axis]=Math.sign(velocity);
    stride[axis]=velocity ? 1/Math.abs(velocity) : Infinity;
    const boundary=cell[axis]+(velocity>0?1:0);
    next[axis]=velocity ? Math.max(0,(boundary-origin[axis])/velocity) : Infinity;
  }
  let distance=0,entry=null;
  while(distance<=reach){
    const exit=axes.reduce((a,b)=>next[a]<=next[b]?a:b);
    const id=read(cell.x,cell.y,cell.z);
    if(id&&id!==255){
      const axis=entry??exit,place={...cell};
      place[axis]+=(entry?-1:1)*step[axis];
      const hitDistance=entry?distance:next[exit];
      return hitDistance<=reach?{id,cell,place,distance:hitDistance}:null;
    }
    distance=next[exit];
    if(distance>reach)break;
    entry=exit;
    for(const axis of axes)if(Math.abs(next[axis]-distance)<1e-9){
      cell[axis]+=step[axis];next[axis]+=stride[axis];
    }
  }
  return null;
}
