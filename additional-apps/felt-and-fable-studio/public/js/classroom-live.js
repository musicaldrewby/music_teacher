'use strict';
// A Canvas clock with the small media interface used by the classroom controls.
// The renderer below is the app's own drawing code, generated at build time.
function classroomLiveTransport(data,canvas){
 const images=new Map();let renderer,sceneIndex=0,position=0,anchor=0,paused=true,raf=0,generation=0,disposed=false;
 const now=()=>performance.now()/1000;
 const ready=Promise.all(Object.entries(data.artwork).map(async([key,src])=>{
  if(!/^data:image\//.test(src))throw Error('Missing embedded artwork.');
  const im=new Image();im.src=src;await im.decode();images.set(key,im);
 })).then(()=>{renderer=classroomNativeRenderer(data.project,images,data.catalog);});
 const hold=()=>data.scenes[sceneIndex].hold;
 const time=()=>Math.min(hold(),Math.max(0,position+(paused?0:now()-anchor)));
 function draw(){if(renderer&&!disposed)renderer.draw(canvas,sceneIndex,time());}
 function resize(){const width=Math.min(3840,Math.max(640,Math.round((canvas.clientWidth||1600)*Math.min(2,window.devicePixelRatio||1))));const height=Math.round(width*9/16);if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;draw();}}
 function tick(){raf=0;if(paused||disposed)return;const seq=generation;draw();transport.ontimeupdate?.();if(seq!==generation)return;if(time()>=hold()){transport.pause();transport.onended?.();}else if(!paused)raf=requestAnimationFrame(tick);}
 const transport={src:'0',poster:'',readyState:0,
  get currentTime(){return time();},set currentTime(v){position=Math.min(hold(),Math.max(0,Number(v)||0));anchor=now();draw();},
  get paused(){return paused;},
  pause(){position=time();paused=true;cancelAnimationFrame(raf);raf=0;draw();},
  play(){if(disposed)return Promise.resolve();if(this.readyState<2)return ready.then(()=>this.play());position=time();anchor=now();paused=false;if(!raf)raf=requestAnimationFrame(tick);return Promise.resolve();},
  load(){this.pause();const seq=++generation;sceneIndex=Number(this.src);position=0;this.readyState=0;ready.then(()=>{if(seq!==generation||disposed)return;resize();draw();this.readyState=2;this.onloadeddata?.();}).catch(()=>{if(seq===generation)this.onerror?.();});},
  dispose(){disposed=true;paused=true;cancelAnimationFrame(raf);observer?.disconnect();images.clear();}
 };
 const observer=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;observer?.observe(canvas);
 return transport;
}
