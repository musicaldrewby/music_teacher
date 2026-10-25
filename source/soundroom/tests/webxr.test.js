import test from 'node:test';
import assert from 'node:assert/strict';
import {keyboardKeys,malletBars,rayBox,panelPoint,pickRoom,roomAnchor,localRay,boxMatrix,multiply,PANEL} from '../src/xr-geometry.js';
import {createXRInput} from '../src/xr-input.js';
import {createWebXR} from '../src/webxr.js';
import {createXRPanel} from '../src/xr-panel.js';

const identity=()=>boxMatrix(0,0,0,1,1,1);
function transform(x=0,y=0,z=0,matrix=identity()){matrix[12]=x;matrix[13]=y;matrix[14]=z;return {position:{x,y,z},matrix}}
function aim(origin,target){const d=target.map((n,i)=>n-origin[i]),length=Math.hypot(...d),m=identity();m[8]=-d[0]/length;m[9]=-d[1]/length;m[10]=-d[2]/length;return transform(...origin,m)}
const snapshot=()=>({theme:'green',track:0,trackName:'Piano',patch:{program:0,bankMSB:0,bankLSB:0,isDrum:false},patchName:'Grand Piano',program:1,bank:'0:0',tracks:Array.from({length:8},(_,i)=>({name:'Part '+(i+1),patch:'Piano'})),scenes:Array.from({length:8},(_,i)=>'Scene '+(i+1)),scene:0,queued:null,armed:0,playing:false,recording:false,song:false,busy:false,locked:false,sceneLocked:false,position:'01 : 01',transport:'Stopped',tempo:100,recordSummary:'T1 OVERDUB',monitor:true,volume:65,reverb:25,delay:0});

test('both controllers own their notes; glissando, release and removal cannot leave a held voice',()=>{
 const events=[],left={},right={},input=createXRInput({noteOn:(n,o)=>events.push(['on',n,o]),noteOff:o=>events.push(['off',o]),action:a=>events.push(['action',a])});
 input.press(left,{note:60});input.press(right,{note:60});assert.equal(input.notes.size,1);assert.notEqual(events[0][2],events[1][2]);
 input.lift(left);assert.deepEqual([...input.notes],[60]);input.update(right,{note:62});assert.deepEqual([...input.notes],[62]);
 input.update(right,null);assert.equal(input.notes.size,0);input.update(right,{note:64});assert.deepEqual([...input.notes],[64]);
 input.remove(right);assert.equal(input.notes.size,0);assert.equal(events.filter(e=>e[0]==='on').length,events.filter(e=>e[0]==='off').length);
 input.press(left,{action:{type:'exit'}});input.update(left,{note:66});assert.equal(input.notes.size,0,'holding a menu trigger must not accidentally play a key');
 input.reset();assert.equal(events.at(-1)[0],'action');
});

test('picking matches every key, prefers raised black keys and transforms a recentered room correctly',()=>{
 const keys=keyboardKeys();assert.equal(keys.length,25);assert.equal(keys.filter(k=>k.black).length,10);
 for(const key of keys){const origin=[key.x,0,key.black?key.z:key.z+.125],hit=pickRoom(origin,[0,-1,0],keys,[]);assert.equal(hit.note,key.note)}
 assert.equal(rayBox([0,0,0],[0,0,1],keys[0]),null);
 assert.deepEqual(panelPoint([0,PANEL.y,0],[0,0,-1]),{x:720,y:480,distance:1.14});
 const button={id:'play',x:700,y:460,w:40,h:40,action:'play'};assert.equal(pickRoom([0,PANEL.y,0],[0,0,-1],keys,[button]).action,'play');
 assert.equal(pickRoom([0,PANEL.y,0],[0,0,-1],keys,[{...button,disabled:true}]).action,undefined);
 assert.equal(panelPoint([0,0,-2],[0,0,1]),null,'the panel is not interactive from behind');
 const yaw=Math.PI/2,m=new Float32Array([Math.cos(yaw),0,-Math.sin(yaw),0,0,1,0,0,Math.sin(yaw),0,Math.cos(yaw),0,0,0,0,1]);
 const t=transform(3,1.5,4,m),anchor=roomAnchor(t),ray=localRay(t,anchor);
 assert.deepEqual(ray.origin,[0,0,0]);assert.ok(Math.abs(ray.direction[0])<1e-7);assert.ok(Math.abs(ray.direction[2]+1)<1e-7);
 const result=multiply(anchor.matrix,boxMatrix(0,0,-1,1,1,1));assert.ok(Math.abs(result[12]-2)<1e-6);assert.ok(Math.abs(result[14]-4)<1e-6);
 assert.equal(keyboardKeys(96).at(-1).note,120);
});

function harness({supported=true,floor=true,ready=true,graphicsError=false,roomOptions={}}={}){
 const ids=new Map(['vr-enter','vr-exit','vr-check','vr-status'].map(id=>[id,{textContent:'',disabled:false,hidden:false}])),events=[];
 const space=new EventTarget(),session=new EventTarget();let callback=null,serial=0,ended=false,state=snapshot(),referenceResolve;
 Object.assign(session,{visibilityState:'visible',inputSources:[],renderState:{},requestAnimationFrame:fn=>{callback=fn;return ++serial},cancelAnimationFrame:()=>{callback=null},requestReferenceSpace:async type=>{events.push(['space',type]);if(type==='local-floor'&&!floor)throw Error('no floor');return space},updateRenderState:value=>Object.assign(session.renderState,value),end:async()=>{ended=true;session.dispatchEvent(new Event('end'))}});
 const xr=new EventTarget();xr.isSessionSupported=async()=>supported;xr.requestSession=(mode,options)=>{events.push(['request',mode,options]);return Promise.resolve(session)};
 const host={ready:()=>ready,ensureAudio:async()=>{ready=true;events.push(['audio']);return true},snapshot:()=>state,patches:()=>[{name:'Grand',program:0,bankMSB:0,bankLSB:0,isDrum:false},{name:'Kit',program:0,bankMSB:0,bankLSB:0,isDrum:true}],noteOn:(n,o)=>events.push(['on',n,o]),noteOff:o=>events.push(['off',o]),action:a=>events.push(['action',a]),tick:()=>events.push(['tick']),resume:()=>events.push(['resume']),suspend:()=>events.push(['suspend']),started:()=>events.push(['started']),ended:()=>events.push(['ended'])};
 const renderer={gl:{makeXRCompatible:async()=>{if(graphicsError)throw Error('graphics unavailable')}},buttons:[],update:(s,r)=>events.push(['update',s,r]),render:()=>events.push(['render']),dispose:()=>events.push(['dispose'])};
 host.sustain=on=>{events.push(['pedal',on]);state={...state,sustain:on}};
 const env={document:{getElementById:id=>ids.get(id)},navigator:{xr},storage:{getItem:()=>JSON.stringify({options:roomOptions}),setItem(){}},XRWebGLLayer:class{constructor(s,g,o){events.push(['layer',o])}}};
 const api=createWebXR(host,env,()=>renderer);
 const fire=(type,props={})=>{const e=new Event(type);for(const [k,v]of Object.entries(props))Object.defineProperty(e,k,{value:v});session.dispatchEvent(e)};
 const frame={session,getViewerPose:()=>({transform:transform(),views:[]}),getPose:source=>source.pose?{transform:source.pose}:null};
 return {api,events,ids,session,space,renderer,host,env,fire,frame,get ended(){return ended},setState:next=>{state={...state,...next}},step:time=>{const fn=callback;callback=null;fn?.(time,frame)},controller(note=48){const k=keyboardKeys().find(k=>k.note===note);return {targetRayMode:'tracked-pointer',targetRaySpace:{pose:aim([k.x,-.1,-.35],[k.x,k.y,k.black?k.z:k.z+.12])}}}};
}

test('unsupported browsers keep the normal app available without constructing graphics or requesting VR',async()=>{
 const h=harness({supported:false});await h.api.check();await h.api.enter();assert.equal(h.ids.get('vr-enter').disabled,true);assert.match(h.ids.get('vr-status').textContent,/Quest Browser/);assert.equal(h.events.length,0);assert.equal(h.api.active,false);
});

test('browser-bound mallet timers keep VR running on first contact, gate release, repeated hits and controller removal',async t=>{
 // Window timer methods reject a foreign receiver. Node's timers do not,
 // so enforce the browser contract on the production default timer path.
 const pending=new Map();let serial=0;
 t.mock.method(globalThis,'setTimeout',function(fn,ms){if(this!==globalThis&&this!==undefined)throw new TypeError('Illegal invocation');const id=++serial;pending.set(id,{fn,ms});return id});
 t.mock.method(globalThis,'clearTimeout',function(id){if(this!==globalThis&&this!==undefined)throw new TypeError('Illegal invocation');pending.delete(id)});
 const h=harness();await h.api.check();await h.api.enter();
 const source=h.controller(),bar=malletBars()[0];source.gripSpace={pose:transform(bar.x,-.25,bar.z+.30)};h.session.inputSources=[source];
 h.step(0);source.gripSpace.pose=transform(bar.x,-.58,bar.z+.30);h.step(60);
 assert.equal(h.api.presenting,true,'the first mallet contact must not end the XR session');assert.equal(h.ended,false);assert.equal(h.events.filter(e=>e[0]==='on').length,1);assert.equal(pending.size,1);
 const gate=[...pending.values()][0];assert.equal(gate.ms,180);gate.fn();assert.equal(pending.size,0);assert.equal(h.events.filter(e=>e[0]==='off').length,1);assert.equal(h.api.presenting,true);
 source.gripSpace.pose=transform(bar.x,-.25,bar.z+.30);h.step(130);source.gripSpace.pose=transform(bar.x,-.58,bar.z+.30);h.step(190);
 assert.equal(h.events.filter(e=>e[0]==='on').length,2);h.fire('inputsourceschange',{removed:[source]});assert.equal(pending.size,0);assert.equal(h.events.filter(e=>e[0]==='off').length,2);assert.equal(h.api.presenting,true);assert.equal(h.events.at(-1)[0],'off');await h.api.end();
});

test('audio loads before the separate gesture that requests VR; local space fallback and cleanup work',async()=>{
 const h=harness({ready:false,floor:false});await h.api.check();await h.api.enter();assert.deepEqual(h.events,[['audio']]);assert.equal(h.ids.get('vr-enter').textContent,'Enter VR');
 const entering=h.api.enter();assert.equal(h.events.at(-1)[0],'request','requestSession must run synchronously in the click activation');await entering;
 assert.equal(h.api.presenting,true);assert.deepEqual(h.events.filter(e=>e[0]==='space').map(e=>e[1]),['local-floor','local']);h.step(0);assert.equal(h.events.at(-1)[0],'render');
 const source=h.controller();h.session.inputSources=[source];h.fire('selectstart',{inputSource:source,frame:h.frame});assert.equal(h.events.at(-1)[0],'on');
 await h.api.end();assert.equal(h.api.active,false);assert.equal(h.ended,true);assert.equal(h.events.filter(e=>e[0]==='off').length,1);assert.equal(h.events.filter(e=>e[0]==='dispose').length,1);assert.equal(h.events.at(-1)[0],'ended');assert.equal(h.ids.get('vr-enter').disabled,false);
});

test('XR visibility, source removal and tracking loss release notes; restored tracking requires a new press',async()=>{
 const h=harness();await h.api.check();await h.api.enter();h.step(0);const source=h.controller(52);h.session.inputSources=[source];
 const press=()=>h.fire('selectstart',{inputSource:source,frame:h.frame});press();h.session.visibilityState='visible-blurred';h.fire('visibilitychange');assert.equal(h.events.at(-1)[0],'suspend');assert.equal(h.events.filter(e=>e[0]==='off').length,1);
 h.session.visibilityState='visible';h.fire('visibilitychange');h.step(110);assert.equal(h.events.filter(e=>e[0]==='on').length,1);press();h.fire('inputsourceschange',{removed:[source]});assert.equal(h.events.filter(e=>e[0]==='off').length,2);
 press();const pose=source.targetRaySpace.pose;source.targetRaySpace.pose=null;h.step(220);assert.equal(h.events.filter(e=>e[0]==='off').length,3);source.targetRaySpace.pose=pose;h.step(330);assert.equal(h.events.filter(e=>e[0]==='on').length,3);
 press();h.space.dispatchEvent(new Event('reset'));assert.equal(h.events.filter(e=>e[0]==='off').length,4);await h.api.end();
});

test('both grips share one pedal and tracking loss, reset, blur, stop and exit all release their contributions',async()=>{
 const h=harness({roomOptions:{gripPedal:true}});await h.api.check();await h.api.enter();
 const left=h.controller(),right=h.controller(52);for(const source of [left,right]){source.targetRaySpace.pose=aim([0,0,0],[0,1,-1]);source.gripSpace={pose:transform(0,0,0)}}h.session.inputSources=[left,right];h.step(0);
 const down=s=>h.fire('squeezestart',{inputSource:s,frame:h.frame}),up=s=>h.fire('squeezeend',{inputSource:s});
 down(left);down(right);up(left);assert.deepEqual(h.events.filter(e=>e[0]==='pedal'),[['pedal',true]]);up(right);assert.deepEqual(h.events.at(-1),['pedal',false]);
 down(left);const pose=left.gripSpace.pose;left.gripSpace.pose=null;h.step(110);assert.deepEqual(h.events.filter(e=>e[0]==='pedal').at(-1),['pedal',false]);left.gripSpace.pose=pose;h.step(220);assert.equal(h.host.snapshot().sustain,false,'restored tracking must require a new squeeze');
 down(left);h.fire('inputsourceschange',{removed:[left]});assert.equal(h.host.snapshot().sustain,false);
 down(right);h.space.dispatchEvent(new Event('reset'));assert.equal(h.host.snapshot().sustain,false);h.step(330);
 down(right);h.session.visibilityState='visible-blurred';h.fire('visibilitychange');assert.equal(h.host.snapshot().sustain,false);h.session.visibilityState='visible';h.fire('visibilitychange');h.step(440);
 down(right);h.setState({inputGeneration:1});h.step(550);assert.equal(h.host.snapshot().sustain,false,'host panic or track reset clears pedal ownership');
 down(right);await h.api.end();assert.equal(h.host.snapshot().sustain,false);assert.equal(h.api.presenting,false);
});

test('grip sustain is optional and panel grabs or panel buttons never activate it',async()=>{
 const off=harness();await off.api.check();await off.api.enter();const source=off.controller();source.targetRaySpace.pose=aim([0,0,0],[0,1,-1]);off.step(0);off.fire('squeezestart',{inputSource:source,frame:off.frame});assert.equal(off.events.some(e=>e[0]==='pedal'),false);await off.api.end();
 const h=harness({roomOptions:{gripPedal:true}});await h.api.check();await h.api.enter();const hand=h.controller();hand.gripSpace={pose:transform()};hand.targetRaySpace.pose=aim([0,0,0],[0,.50,-1.55]);h.session.inputSources=[hand];
 h.renderer.surfaces=new Map([['play',{buttons:[{id:'play:grab',x:0,y:0,w:790,h:100,kind:'grab',action:{type:'grab',panel:'play'}}]}]]);h.step(0);h.fire('squeezestart',{inputSource:hand,frame:h.frame});
 hand.targetRaySpace.pose=aim([.2,0,0],[.2,.50,-1.55]);h.step(60);h.fire('squeezeend',{inputSource:hand});assert.equal(h.events.some(e=>e[0]==='pedal'),false,'moving a panel has priority over the pedal');
 const moved=h.events.filter(e=>e[0]==='update').at(-1)[2].panels.find(p=>p.id==='play');assert.ok(moved.x>.1,'grip still moves the panel');
 hand.targetRaySpace.pose=aim([0,0,0],[moved.x,moved.y,moved.z]);h.fire('squeezestart',{inputSource:hand,frame:h.frame});assert.equal(h.events.some(e=>e[0]==='pedal'),false,'squeezing over the panel body must not sustain');await h.api.end();
});

test('Hold mode survives beyond the old gate and tracking removal ends the contact note',async()=>{
 const h=harness({roomOptions:{playingMode:'hold'}});await h.api.check();await h.api.enter();const source=h.controller(),bar=malletBars()[0];source.gripSpace={pose:transform(bar.x,-.25,bar.z+.30)};h.session.inputSources=[source];h.step(0);source.gripSpace.pose=transform(bar.x,-.48,bar.z+.30);
 for(let t=60;t<=3060;t+=60)h.step(t);assert.equal(h.events.filter(e=>e[0]==='on').length,1);assert.equal(h.events.filter(e=>e[0]==='off').length,0);assert.equal(h.api.presenting,true);
 source.gripSpace.pose=transform(bar.x,-.25,bar.z+.30);h.step(3120);assert.equal(h.events.filter(e=>e[0]==='off').length,1);
 source.gripSpace.pose=transform(bar.x,-.48,bar.z+.30);h.step(3180);h.fire('inputsourceschange',{removed:[source]});assert.equal(h.events.filter(e=>e[0]==='off').length,2);await h.api.end();
});

test('permission denial and graphics failure are recoverable, and entering mid-take is blocked',async()=>{
 const h=harness();await h.api.check();h.setState({recording:true});await h.api.enter();assert.match(h.ids.get('vr-status').textContent,/Finish/);assert.equal(h.events.length,0);
 h.setState({recording:false});h.env.navigator.xr.requestSession=()=>Promise.reject(Object.assign(Error('denied'),{name:'NotAllowedError'}));await h.api.enter();assert.equal(h.api.active,false);assert.equal(h.ids.get('vr-enter').disabled,false);assert.match(h.ids.get('vr-status').textContent,/declined/);
 const failed=harness({graphicsError:true});await failed.api.check();await failed.api.enter();assert.equal(failed.ended,true);assert.equal(failed.api.active,false);assert.equal(failed.events.filter(e=>e[0]==='dispose').length,1);assert.match(failed.ids.get('vr-status').textContent,/graphics unavailable/);
});

test('all room controls fit on the panel and locked controls are excluded from picking',()=>{
 const calls=[],ctx=new Proxy({},{get:(o,k)=>k in o?o[k]:(...args)=>calls.push([k,...args]),set:(o,k,v)=>(o[k]=v,true)}),panel=createXRPanel({getContext:()=>ctx}),state=snapshot(),room={page:'play',filter:'all',patchPage:0,pageCount:2,base:48,patches:[]};
 assert.equal(panel.paint(state,room),true);assert.equal(panel.paint(state,room),false,'unchanged labels must not re-upload the screen');
 for(const b of panel.buttons){assert.ok(b.x>=0&&b.y>=0&&b.x+b.w<=1440&&b.y+b.h<=960,b.id)}
 assert.equal(panel.buttons.filter(b=>b.id.startsWith('scene-')).length,8);assert.equal(panel.buttons.filter(b=>b.id.startsWith('track-')).length,8);
 panel.paint({...state,locked:true,sceneLocked:true},room);assert.ok(panel.buttons.filter(b=>/^(track|scene)-/.test(b.id)).every(b=>b.disabled));
 panel.paint(state,{...room,page:'sounds',patches:Array.from({length:8},(_,i)=>({name:'Patch '+i,index:i,program:i,bankMSB:0,bankLSB:0}))});assert.equal(panel.buttons.filter(b=>b.id.startsWith('patch-')).length,8);assert.ok(calls.some(c=>c[0]==='fillText'&&c[1]==='Patch 7'));
});
