'use strict';
// Four half-size cached overlays; never run blur filters on animation frames.
window.SneakyCatDepth=(()=>{
 const cache=new Map(),W=836,H=471,PAD=18;
 function prepare(image,scene,overlay){
  if(cache.has(image)){const value=cache.get(image);cache.delete(image);cache.set(image,value);return value}
  if(!image.complete||!image.naturalWidth)return null;
  const source=document.createElement('canvas');source.width=W+PAD*2;source.height=H+PAD*2;
  const s=source.getContext('2d');
  // Extend border pixels so blur does not introduce dark/transparent image edges.
  s.drawImage(image,PAD,PAD,W,H);
  if(overlay)s.drawImage(overlay,PAD,PAD,W,H);
  s.drawImage(source,PAD,PAD,1,H,0,PAD,PAD,H);
  s.drawImage(source,PAD+W-1,PAD,1,H,PAD+W,PAD,PAD,H);
  s.drawImage(source,0,PAD,W+PAD*2,1,0,0,W+PAD*2,PAD);
  s.drawImage(source,0,PAD+H-1,W+PAD*2,1,0,PAD+H,W+PAD*2,PAD);
  const result=document.createElement('canvas');result.width=W;result.height=H;
  const q=result.getContext('2d');q.filter='blur(3px)';q.drawImage(source,-PAD,-PAD);q.filter='none';
  // Feather to zero ABOVE the wall cap. The foreground is never blurred.
  const edge=Math.max(0,Math.min(H,(scene.depthEdge??((scene.rail||.689)-.035))*H));
  const mask=q.createLinearGradient(0,Math.max(0,edge-16),0,edge);
  mask.addColorStop(0,'rgba(0,0,0,1)');mask.addColorStop(1,'rgba(0,0,0,0)');
  q.globalCompositeOperation='destination-in';q.fillStyle=mask;q.fillRect(0,0,W,H);q.globalCompositeOperation='source-over';
  cache.set(image,result);
  while(cache.size>4){const oldest=cache.keys().next().value;const canvas=cache.get(oldest);cache.delete(oldest);canvas.width=canvas.height=1}
  return result;
 }
 return {prepare,get size(){return cache.size}};
})();
