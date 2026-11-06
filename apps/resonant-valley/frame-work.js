// Give the loading screen a paint between finite pieces of world preparation.
export const nextFrame=()=>new Promise(resolve=>typeof requestAnimationFrame==='function'?requestAnimationFrame(resolve):setTimeout(resolve,10));

export async function prepareView(world,report=()=>{},yieldFrame=nextFrame){
 const stream=world.stream,start=performance.now();
 const check=()=>{
  if(stream.closed||world.stream!==stream)throw Error('World loading was cancelled.');
  if(stream.failure)throw Error(stream.failure);
  if(performance.now()-start>60000)throw Error('Terrain is taking too long to load. Try a shorter view distance.');
 };
 const compile=async()=>{
  report('Preparing lighting…');await yieldFrame();check();
  try{await Promise.all([
   world.renderer.compileAsync?.(world.scene,world.camera),
   world.hands&&world.renderer.compileAsync?.(world.hands.foreground,world.hands.viewCamera)
  ]);}catch(error){console.warn('Preparing the first view in the renderer:',error.message);}
 };
 await compile();
 // Render as the worker delivers chunks: upload one result per frame, including
 // shadows and foreground equipment, instead of doing it after the first click.
 while(true){
  await yieldFrame();check();world.render(performance.now()/1000,false);
  const h=world.horizon,pending=stream.queue.length+stream.pending.size+stream.completed.length+stream.dirty.size;
  const scenery=h?.root.visible&&(h.pending.length+h.pendingParts.length+h.woodEdits.size);
  if(!pending&&!scenery)break;
  report(pending?'Preparing nearby terrain… '+stream.loaded.size+' chunks ready':'Preparing the horizon… '+[...h.tiles.values()].filter(t=>t.ready).length+' / '+h.tiles.size);
 }
 // Newly installed landmark/furniture materials need the same warmup. A real
 // render also prepares depth/shadow programs, which compileAsync alone skips.
 await compile();
 for(let i=0;i<2;i++){await yieldFrame();check();world.render(performance.now()/1000,false);}
 await yieldFrame();check();
}
