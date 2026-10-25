import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PHOTO,SCENES,CHORD_CENTERS,STRING_TOP_Y,xAtY,nearestString,nearestSegment,photoPath,canPickString,sweepStrings,fitPhoto,sceneGeometry,compositeOpacities} from '../dist/scene-math.js';
import {CHORDS,chordAllows} from '../dist/music.js';
for(let i=0;i<36;i++){
  for(const y of [530,760]){assert.equal(nearestString(xAtY(i,y),y),i);assert.equal(canPickString(i,y),true);}
  assert.equal(canPickString(i,620),false);assert.equal(canPickString(i,STRING_TOP_Y[i]),false);assert.equal(canPickString(i,850),false);
}
const expected=Array.from({length:36},(_,i)=>i);
assert.deepEqual([...new Set(sweepStrings({x:450,y:530},{x:1240,y:530}).map(h=>h.i))],expected);
assert.deepEqual(sweepStrings({x:1240,y:760},{x:450,y:760}).map(h=>h.i),expected.toReversed());
assert.deepEqual(sweepStrings({x:450,y:600},{x:1240,y:600}),[]);
// Beginning between strings must still trigger the next string crossed.
const x=(xAtY(7,530)+xAtY(8,530))/2;
assert.deepEqual(sweepStrings({x,y:530},{x:xAtY(9,530)+2,y:530}).map(h=>h.i),[8,9]);
assert.deepEqual(sweepStrings({x:800,y:530},{x:800,y:530}),[]);
for(const [w,h] of [[1672,941],[1366,1024],[1024,1366],[1180,820],[820,1180],[1024,768],[768,1024],[390,844],[844,390]]){
  const f=fitPhoto(w,h);
  for(const [x,y] of [[466,78],[1220,895]]){
    const px=f.x+(x-PHOTO.width/2)*f.scale,py=f.y+(y-PHOTO.height/2)*f.scale;
    assert.ok(px>=0&&px<=w&&py>=0&&py<=h,`Instrument clipped at ${w} × ${h}`);
  }
  for(const p of CHORD_CENTERS)assert.ok(p.y>PHOTO.barTop&&p.y<PHOTO.barBottom);
}
const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'),scene=fs.readFileSync(new URL('../dist/scene.js',import.meta.url),'utf8');
const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
for(const m of scene.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.includes(m[1]),`Missing ${m[1]}`);
for(const old of ['zoomSlider','zoomIn','zoomOut','resetView','viewBtn','moveSurface','parallaxToggle','viewNotice'])assert.ok(!ids.includes(old));
assert.ok(!/addEventListener\(['"](?:wheel|pointermove)/.test(scene),'Scene controller must not move the picture');
assert.deepEqual(SCENES.map(scene=>scene.id),['sunlit','classroom','manor','storm']);
assert.ok(!/70s|seventies/.test(html));
assert.deepEqual(sceneGeometry('manor'),sceneGeometry('sunlit'),'Manor reuses the original instrument and all its anchors');
assert.deepEqual(sceneGeometry('storm'),sceneGeometry('sunlit'),'Storm room reuses the original instrument and all its anchors');
assert.equal(SCENES.length,4);for(const s of SCENES)assert.ok(fs.statSync(new URL('../dist/'+s.image,import.meta.url)).size>100000);
class Element{dataset={};attrs={};listeners={};style={};value='';textContent='';classes={};classList={toggle:(name,active)=>{this.classes[name]=active;}};decode(){return new Promise((resolve,reject)=>images.push({resolve,reject}));}setAttribute(k,v){this.attrs[k]=v;}addEventListener(n,f){(this.listeners[n]??=[]).push(f);}getBoundingClientRect(){return{width:1024,height:768};}}
const elements=Object.fromEntries(ids.map(id=>[id,new Element()])),buttons=SCENES.map(s=>Object.assign(new Element(),{dataset:{scene:s.id}}));
globalThis.document={getElementById:id=>elements[id],querySelectorAll:()=>buttons};globalThis.window={};globalThis.localStorage={getItem:()=>null,setItem(){}};globalThis.ResizeObserver=class{observe(){}};
const images=[],frames=new Map();let frameId=0;globalThis.requestAnimationFrame=fn=>{frames.set(++frameId,fn);return frameId;};globalThis.cancelAnimationFrame=id=>frames.delete(id);const finishFade=()=>{const batch=[...frames.values()];frames.clear();for(const fn of batch)fn(performance.now()+1000);};
let changes=0,errors=0,blend;const {createScene}=await import('../dist/scene.js');const controller=createScene({onChange:()=>changes++,onBlend:(id,weight)=>{blend={id,weight};},onError:()=>errors++});
const loading=controller.selectScene('classroom');await controller.selectScene('sunlit');images.shift().resolve();await loading;assert.equal(changes,0);
const good=controller.selectScene('classroom');images.shift().resolve();await good;assert.deepEqual(blend,{id:'classroom',weight:0});finishFade();assert.deepEqual(blend,{id:'classroom',weight:1});assert.equal(changes,1);assert.equal(Number(elements.scenePhotoClassroomLayer.style.opacity),1);assert.equal(elements.sceneSelect.value,'classroom');
const fail=controller.selectScene('sunlit');images.shift().reject(new Error('offline'));await fail;assert.equal(errors,1);assert.equal(Number(elements.scenePhotoClassroomLayer.style.opacity),1);assert.equal(elements.sceneSelect.value,'classroom');
for(const scene of SCENES){
  const g=sceneGeometry(scene.id);
  for(const p of g.chords){assert.ok(p.y>g.barTop&&p.y<g.barBottom);assert.ok(p.width>=30&&p.height>=24);}
  for(const y of [g.barTop-15,g.bottom-15]){
    const hits=sweepStrings({x:450,y},{x:1250,y},g);
    assert.equal(hits.length,y<g.barTop?38:36);
    assert.deepEqual([...new Set(hits.map(hit=>hit.i))],expected);
    for(let i=0;i<36;i++)assert.equal(nearestString(xAtY(i,y,g),y,g),i);
  }
  assert.deepEqual(sweepStrings({x:450,y:g.barTop+20},{x:1250,y:g.barTop+20},g),[]);
}
// Fixed photographed anchors catch accidental reuse/scaling of another room.
const anchors={sunlit:[600.93,551,790],classroom:[600.88,551,790],manor:[600.93,551,790],storm:[600.93,551,790]};
for(const scene of SCENES){
  const g=sceneGeometry(scene.id),[x,y,bottom]=anchors[scene.id];
  assert.ok(Math.abs(g.segments[0].x1-x)<2,scene.id+' first string calibration');
  assert.equal(g.segments[0].y1,y);assert.equal(g.bottom,bottom);
  assert.equal(g.segments.length,74);
  for(const segment of g.segments){
    for(const fraction of [.1,.5,.9]){
      const x=segment.x0+(segment.x1-segment.x0)*fraction,y=segment.y0+(segment.y1-segment.y0)*fraction;
      assert.equal(nearestSegment(x,y,g)?.index,segment.index,scene.id+' exact touched strand');
    }
    assert.ok(segment.zone==='upper'?segment.y1<g.barTop:segment.y0>g.barBottom);
    const path=photoPath(segment.note,0,undefined,g,segment.index);
    assert.equal((path.match(/M/g)||[]).length,1,'Touch lights only the actual strand');
    assert.ok(path.startsWith(`M${segment.x0},${segment.y0}Q`));assert.ok(path.endsWith(` ${segment.x1},${segment.y1}`));
  }
  assert.equal(nearestSegment(850,(g.barTop+g.barBottom)/2,g),null);
  for(let i=0;i<36;i++)assert.ok((photoPath(i,0,undefined,g).match(/M/g)||[]).length>=2,'Keyboard glow splits around housing');
}
assert.notDeepEqual(sceneGeometry('sunlit').segments,sceneGeometry('classroom').segments);
for(const weights of [[1,0,0,0],[0,.5,.5,0],[.1,.2,.3,.4],[0,0,0,1]]){
  const alphas=compositeOpacities(weights);
  for(let i=0;i<4;i++){const actual=alphas[i]*alphas.slice(i+1).reduce((remaining,a)=>remaining*(1-a),1);assert.ok(Math.abs(actual-weights[i])<1e-8);}
}
const manor=controller.selectScene('manor');images.shift().resolve();await manor;finishFade();assert.equal(elements.sceneSelect.value,'manor');assert.equal(Number(elements.scenePhotoManorLayer.style.opacity),1);
const storm=controller.selectScene('storm');images.shift().resolve();await storm;finishFade();assert.equal(elements.sceneQuickSelect.value,'storm');assert.equal(Number(elements.scenePhotoStormLayer.style.opacity),1);assert.equal(Number(elements.scenePhotoManorLayer.style.opacity),0);
// A failed shared tabletop asset must be retryable before a scene fades in.
const {prepareSceneLayers}=await import('../dist/scene-layers.js');
document.createElement=()=>new Element();
const failedTexture=prepareSceneLayers({layered:true});const rejection=assert.rejects(failedTexture,/texture offline/);images.shift().reject(new Error('texture offline'));await rejection;
const textureRetry=prepareSceneLayers({layered:true});assert.equal(images.length,1);images.shift().resolve();await textureRetry;
await prepareSceneLayers({layered:true});assert.equal(images.length,0,'Both new scenes reuse the decoded tabletop');
for(const scene of SCENES)assert.equal(html.split(`<option value="${scene.id}">${scene.name}</option>`).length-1,2,'Both scene menus use the correct names');
assert.ok(html.includes('https://buymeacoffee.com/musicaldrewby'));assert.ok(html.includes('Created by Drew Wunschman'));
assert.ok(!/<h1/.test(html.slice(html.indexOf('<header'),html.indexOf('</header>'))));
console.log('PASS: standard chord labels, calibrated upper/lower strands and fixed original-instrument layers, exact touch glow selection, 36 sampled notes, bidirectional sweeps, between-string starts, masked chord housing, complete tablet/phone framing, no camera controls, four scene assets, per-scene string/button alignment, normalized crossfades, scene-load cancellation, texture failure/retry and recovery, splash credit and donation link.');
