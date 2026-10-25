import assert from 'node:assert/strict';
import {cameraFit,screenPoint,worldPoint,ROOM} from '../dist/camera.mjs';
const actions=[{x:450,y:370},{x:470,y:258},{x:545,y:340},{x:865,y:350},{x:580,y:500},{x:278,y:270},{x:610,y:220},{x:1050,y:450}];
for(const [width,height] of [[1280,800],[1024,600],[1920,1080],[800,1280]]){
 const fit=cameraFit(width,height);
 if(width>=height){assert.ok(ROOM.width*fit.scale>=width-.01);assert.ok(ROOM.height*fit.scale>=height-.01);for(const p of actions){const q=screenPoint(p,fit);assert.ok(q.x>22&&q.x<width-22&&q.y>65&&q.y<height-22,'Every station is reachable on landscape tablets');}}
 for(const camera of [{},{zoom:1.8,panX:9000,panY:-9000},{overview:true}]){const f=cameraFit(width,height,camera);assert.ok(Math.abs(f.panX)<9000&&Math.abs(f.panY)<9000);for(const p of actions){const q=worldPoint(screenPoint(p,f),f);assert.ok(Math.abs(q.x-p.x)<.00001&&Math.abs(q.y-p.y)<.00001);}}
}
// Use the real input handlers: gestures must not accidentally serve a customer.
globalThis.Image=class{};globalThis.matchMedia=()=>({matches:false});
const {StoreScene}=await import('../dist/scene.mjs');
const handlers={},calls=[];const canvas={clientWidth:1280,clientHeight:800,style:{},getContext:()=>({}),getBoundingClientRect:()=>({left:10,top:20}),addEventListener:(key,fn)=>handlers[key]=fn,setPointerCapture(){}};
const scene=new StoreScene(canvas,(...args)=>calls.push(args));scene.hotspots=[{id:'counter',x:450,y:370,r:40}];
const q=screenPoint(scene.hotspots[0],scene.fit()),event={pointerId:1,clientX:q.x+10,clientY:q.y+20};handlers.pointerdown(event);handlers.pointerup(event);handlers.click(event);assert.deepEqual(calls,[['counter',undefined]]);
handlers.pointerdown(event);handlers.pointermove({...event,clientX:event.clientX+60});handlers.pointerup(event);handlers.click(event);assert.equal(calls.length,1);assert.ok(scene.camera.panX>0);
scene.resetCamera();handlers.pointerdown({pointerId:1,clientX:100,clientY:100});handlers.pointerdown({pointerId:2,clientX:200,clientY:100});handlers.pointermove({pointerId:2,clientX:250,clientY:100});assert.equal(scene.camera.zoom,1.5);handlers.pointercancel({pointerId:1});handlers.pointercancel({pointerId:2});assert.equal(scene.pointers.size,0);
console.log('PASS: landscape fill, all eight room controls visible, inverse tap mapping, bounded panning, pinch zoom and drag/tap isolation.');
