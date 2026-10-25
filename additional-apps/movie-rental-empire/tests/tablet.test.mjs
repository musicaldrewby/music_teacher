import assert from 'node:assert/strict';
import {fitScene,scenePoint,TabletUI} from '../dist/touch.mjs';
import * as E from '../dist/engine.mjs';

// Rotation and letterboxing must leave the original canvas geometry and tap targets aligned.
for(const [width,height] of [[740,275],[565,350],[1000,460],[360,190],[1300,850]]){
 const rect={width,height,left:17,top:111},f=fitScene(width,height);
 assert.ok(f.scale>0&&f.x>=0&&f.y>=0);
 assert.ok(1300*f.scale<=width+.0001&&850*f.scale<=height+.0001);
 for(const p of [{x:0,y:0},{x:410,y:360},{x:800,y:550},{x:1300,y:850}]){
  const got=scenePoint(rect.left+f.x+p.x*f.scale,rect.top+f.y+p.y*f.scale,rect);
  assert.ok(Math.abs(got.x-p.x)<.0001&&Math.abs(got.y-p.y)<.0001);
 }
}

const handlers={},windowHandlers={},elements=new Map(),media=new Map(),views=[],actions=[],messages=[];
let coarse=true,narrow=false,landscape=true;
function element(){return {hidden:false,disabled:false,firstChild:{textContent:''},dataset:{},attrs:{},children:[],style:{setProperty(){}},classList:{toggle(){},add(){},remove(){}},getBoundingClientRect(){return {height:100,top:400};},setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k]||null;},querySelector(){return {textContent:'Hourly wage'};},append(...nodes){this.children.push(...nodes);},closest(){return null;}};}
for(const id of ['touchDock','touchStore','touchManage','touchPause','touchSpeed','touchFull','touchWaiting','touchSpeedValue','touchClock','scene'])elements.set(id,element());
const root=element();globalThis.document={documentElement:root,fullscreenElement:null,getElementById:id=>elements.get(id),querySelector:()=>element(),createElement:()=>element(),addEventListener:(k,fn)=>{(handlers[k]??=[]).push(fn);}};
globalThis.window={scrollY:0,addEventListener:(k,fn)=>windowHandlers[k]=fn,scrollTo:()=>{}};
globalThis.matchMedia=q=>{const obj={get matches(){return q.includes('any-pointer')?coarse:q.includes('max-width')?narrow:q.includes('landscape')?landscape:false;},addEventListener:(k,fn)=>media.set(q,fn)};return obj;};
globalThis.requestAnimationFrame=fn=>fn();
const ui=new TabletUI({onAction:a=>actions.push(a),onView:v=>views.push(v),message:m=>messages.push(m)});await new Promise(r=>queueMicrotask(r));
assert.equal(ui.active,true);assert.equal(elements.get('touchDock').hidden,false);assert.equal(ui.managing,false);
const state=E.fresh(33);E.openDay(state);
ui.setView('manage');assert.equal(ui.managing,true);assert.equal(root.dataset.touchView,'manage');const time=state.seconds;if(!ui.managing)E.tick(state,10);assert.equal(state.seconds,time);
ui.sync({phase:'open',paused:false,waiting:3,day:1,clock:'4:15 PM',speed:2});assert.equal(elements.get('touchPause').disabled,true);assert.equal(elements.get('touchPause').firstChild.textContent,'Paused');assert.equal(elements.get('touchWaiting').textContent,'3 need you');
ui.setView('play');if(!ui.managing)E.tick(state,10);assert.equal(state.seconds,10);
ui.sync({phase:'open',paused:true,waiting:0,day:1,clock:'4:15 PM',speed:1});assert.equal(elements.get('touchPause').disabled,false);assert.equal(elements.get('touchPause').firstChild.textContent,'Resume');
elements.get('touchPause').onclick();elements.get('touchSpeed').onclick();assert.deepEqual(actions,['pause','speed']);
handlers.pointerdown[0]({pointerId:1});assert.equal(ui.pointerHeld,true);handlers.pointercancel[0]({pointerId:1});await new Promise(r=>setTimeout(r,100));assert.equal(ui.pointerHeld,false);
let value=6,changes=0,wrapper;const input=element();input.parentElement=element();input.before=w=>wrapper=w;input.stepUp=()=>value=Math.min(20,value+.5);input.stepDown=()=>value=Math.max(3,value-.5);input.dispatchEvent=()=>changes++;
ui.enhanceNumbers({querySelectorAll:()=>[input]});assert.equal(input.inputMode,'decimal');assert.equal(wrapper.children.length,3);wrapper.children[2].onclick();assert.equal(value,6.5);wrapper.children[0].onclick();assert.equal(value,6);assert.equal(changes,2);
await ui.fullscreen();assert.ok(messages[0].includes('unavailable'));root.requestFullscreen=async()=>{document.fullscreenElement=root;};document.exitFullscreen=async()=>{document.fullscreenElement=null;};await ui.fullscreen();assert.equal(document.fullscreenElement,root);await ui.fullscreen();assert.equal(document.fullscreenElement,null);
ui.setView('manage');coarse=false;narrow=false;media.get('(any-pointer: coarse)')();assert.equal(ui.active,false);assert.equal(ui.managing,true);assert.equal(elements.get('touchDock').hidden,false);
console.log('PASS: tablet controls, management pause, wage steppers, pointer cancellation, fullscreen fallback and tap alignment across five scene sizes.');
