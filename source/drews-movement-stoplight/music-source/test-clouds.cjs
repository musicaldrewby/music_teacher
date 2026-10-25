const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync('dist/scene-renderer.js','utf8'),box={window:{}};
vm.runInNewContext(source,box);
const {cloudAt}=box.window.MovementScene;
for(let i=0;i<5;i++)for(const fps of [30,60]){
 let previous=cloudAt(0,i),wraps=0;
 for(let frame=1;frame<=1200*fps;frame++){
  const next=cloudAt(frame/fps,i);
  if(next.x<previous.x){
   assert(previous.x>1920,'cloud completely exits before wrapping');
   assert(next.x+next.width<0,'whole cloud reappears outside the left edge');wraps++;
  }else assert(Math.abs(next.x-previous.x-(7+i*1.4)/fps)<1e-8,'continuous drift between wraps');
  previous=next;
 }
 assert(wraps>=3,'multiple complete loops tested');
}
// Simulate slow cloud decoding: scene readiness must wait before any render starts.
(async()=>{
 let releaseCloud,decoded=false;
 class Image{
  set src(value){this.srcValue=value;queueMicrotask(()=>this.onload());}
  decode(){if(this.srcValue.startsWith('data:image/svg'))return new Promise(resolve=>{releaseCloud=()=>{decoded=true;resolve();};});return Promise.resolve();}
 }
 const test={window:{},Image};vm.runInNewContext(source,test);
 let ready=false;const pending=test.window.MovementScene.ready().then(()=>{ready=true;});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(typeof releaseCloud,'function');assert.equal(ready,false,'not ready while cloud pixels are decoding');
 releaseCloud();await pending;assert(decoded&&ready,'ready only after cloud decoding finishes');
 console.log('PASS: five cloud sizes drift continuously and wrap fully offscreen at 30/60 fps for 20 minutes; readiness waits for cloud decoding.');
})().catch(error=>{console.error(error);process.exitCode=1;});
