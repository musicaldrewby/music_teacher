import test from 'node:test';
import assert from 'node:assert/strict';
import {malletBars,defaultPanels,panelMatrix,panelCoordinates,pickWorkspace,sliderValue} from '../src/xr-geometry.js';
import {createMalletInput} from '../src/xr-mallets.js';
import {createSpatialWorkspace} from '../src/xr-spatial-workspace.js';
import {createWorkspacePanel} from '../src/xr-workspace-panel.js';
import {createXRRenderer} from '../src/xr-renderer.js';
import {boxMatrix,roomAnchor} from '../src/xr-geometry.js';
import {VoiceLedger} from '../src/performance-engine.js';

const fixture=()=>({theme:'purple',track:0,playing:false,locked:false,recording:false,busy:false,song:false,workspace:{name:'Studio song',mix:Array.from({length:8},(_,i)=>({name:'Part '+(i+1),patch:'Grand Piano',volume:100,pan:64,reverb:80,delay:64,mute:false,solo:false})),notes:[{id:'note',start:0,pitch:60,duration:1,velocity:96}],controllers:[],selected:[],grid:'1/16',snap:true,barBeats:4,bars:4,totalBeats:16,noteCount:1,beat:0,step:false,stepCursor:0,song:[],songSelection:null,groups:{record:{label:'Record',fields:[]}},status:'Ready',slots:[]}});
function context(){return new Proxy({},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)})}
function spatial(){const events=[],saved=new Map(),storage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},host={control:(...x)=>events.push(['control',...x]),mix:(...x)=>events.push(['mix',...x]),edit:a=>events.push(['edit',a]),selectTrack:i=>events.push(['track',i]),action:a=>events.push(['action',a])},ws=createSpatialWorkspace(host,{invalidate(){},release:s=>events.push(['release',s]),recenter:()=>events.push(['recenter']),handoff:id=>events.push(['file',id])},storage);ws.snapshot(fixture());return {ws,events,saved,host,storage}}

test('mallets use swept downward strikes, velocity, independent hands, note gates and safe tracking recovery',()=>{
 const events=[],pending=new Map();let serial=0;
 const input=createMalletInput({noteOn:(...v)=>events.push(['on',...v]),noteOff:o=>events.push(['off',o])},{setTimeout:(fn,ms)=>{const id=++serial;pending.set(id,{fn,ms});return id},clearTimeout:id=>pending.delete(id)});
 const bars=malletBars(48),bar=bars[0],left={},right={},high=[bar.x,-.25,bar.z],low=[bar.x,-.58,bar.z];assert.equal(bars.length,13);assert.equal(bars.at(-1).note,69);assert.equal(malletBars(48,true).length,25);
 input.update(left,high,0,bars);const strike=input.update(left,low,60,bars,{gate:240});assert.equal(strike.note,48);assert.ok(strike.velocity>100);assert.equal(events[0][0],'on');assert.equal([...pending.values()][0].ms,240);
 input.update(left,low,76,bars);assert.equal(events.length,1,'remaining below the surface must not retrigger');input.update(right,high,0,bars);input.update(right,low,110,bars);assert.equal(events.filter(e=>e[0]==='on').length,2);assert.notEqual(events[0][2],events[1][2]);
 input.remove(left);assert.equal(input.notes.size,1);input.update(right,high,150,bars);input.update(right,low,230,bars);assert.equal(events.filter(e=>e[0]==='on').length,3,'lifting rearms the same bar');
 input.reset();assert.equal(pending.size,0);assert.equal(input.notes.size,0);assert.equal(events.filter(e=>e[0]==='on').length,events.filter(e=>e[0]==='off').length);
 input.update(left,high,1000,bars);assert.equal(input.update(left,low,1400,bars),null,'a tracking discontinuity must not produce a strike');input.remove(left);input.update(left,low,1500,bars);assert.equal(input.update(left,low,1520,bars),null,'tracking recovered below the bars must remain silent');
});

test('rotated panels pick their front faces, nearer panels occlude, and faders map continuously in either orientation',()=>{
 const panels=defaultPanels(),p=panels.find(p=>p.id==='mixer'),m=panelMatrix(p),origin=[p.x+m[8],p.y,p.z+m[10]],direction=[-m[8],0,-m[10]],point=panelCoordinates(origin,direction,p);assert.ok(Math.abs(point.x-720)<.001);assert.ok(Math.abs(point.y-480)<.001);
 const controls=new Map([['mixer',{buttons:[{id:'gain',x:680,y:420,w:80,h:120,kind:'slider',action:{type:'mix'}}]}]]);const hit=pickWorkspace(origin,direction,[],[p],controls);assert.equal(hit.id,'gain');assert.equal(hit.panel,'mixer');
 assert.equal(panelCoordinates([p.x-m[8],p.y,p.z-m[10]],[m[8],0,m[10]],p),null);
 const behind={...p,id:'behind',x:p.x-m[8],z:p.z-m[10]};assert.equal(pickWorkspace(origin,direction,[],[behind,p],controls).panel,'mixer');
 const slider={x:100,y:100,w:200,h:300,min:0,max:127,step:1};assert.equal(sliderValue(slider,{x:200,y:0}),64);assert.equal(sliderValue({...slider,vertical:true},{x:0,y:100}),127);assert.equal(sliderValue({...slider,vertical:true},{x:0,y:400}),0);
});

test('alternating mallets retrigger the same bar before its gate expires, without changing other held notes',()=>{
 const events=[],ledger=new VoiceLedger((...x)=>events.push(['on',...x]),(...x)=>events.push(['off',...x])),timers={setTimeout:()=>1,clearTimeout(){}};
 const mallets=createMalletInput({noteOn:(note,owner,v)=>ledger.press(owner,0,note,v),noteOff:owner=>ledger.release(owner)},timers),bars=malletBars(),bar=bars[0],left={},right={},high=[bar.x,-.25,bar.z],low=[bar.x,-.55,bar.z];
 ledger.press('midi-held',0,67,100);mallets.update(left,high,0,bars);mallets.update(left,low,50,bars,{gate:500});mallets.update(right,high,60,bars);mallets.update(right,low,105,bars,{gate:500});
 assert.equal(events.filter(e=>e[0]==='on'&&e[2]===48).length,2);assert.equal(events.filter(e=>e[0]==='off'&&e[2]===48).length,1);assert.ok(ledger.owners.has('midi-held'));mallets.reset();assert.deepEqual([...ledger.notes.keys()],['0:67']);
});

test('Hold contact supports gentle touches, long notes and small tremors, and releases on lift or leaving the bar',()=>{
 const events=[],input=createMalletInput({noteOn:(...v)=>events.push(['on',...v]),noteOff:o=>events.push(['off',o])},{setTimeout(){throw Error('Hold must not schedule a gate')},clearTimeout(){}}),bars=malletBars(),bar=bars[0],source={},surface=bar.y+bar.h/2+.022,opts={playingMode:'hold',velocity:83};
 const at=(y,x=bar.x,z=bar.z)=>[x,y,z];input.update(source,at(surface+.04),0,bars,opts);input.update(source,at(surface+.001),100,bars,opts);input.update(source,at(surface-.001),120,bars,opts);
 assert.equal(events[0][1],bar.note);assert.equal(events[0][3],83,'slow contact uses the keyboard velocity');
 for(let t=140;t<4000;t+=20)input.update(source,at(surface+(t%40?.009:-.01),bar.x+.006),t,bars,opts);
 assert.equal(events.length,1,'resting and tremor must not cut off or retrigger the held note');assert.deepEqual([...input.notes],[bar.note]);
 input.update(source,at(surface+.04),4000,bars,opts);assert.equal(events.at(-1)[0],'off');assert.equal(input.notes.size,0);
 input.update(source,at(surface-.01),4080,bars,opts);assert.equal(events.filter(e=>e[0]==='on').length,2);input.update(source,at(surface-.01,bar.x+bar.w),4100,bars,opts);assert.equal(input.notes.size,0,'moving sideways off a bar releases it');
 input.update(source,at(surface+.04),4180,bars,opts);input.update(source,at(surface-.01),4260,bars,opts);input.update(source,at(bar.y-.2),4280,bars,opts);assert.equal(input.notes.size,0,'pushing completely through the instrument releases the note');
});

test('Hold ownership survives a second mallet on the same pitch and clears safely on tracking gaps and mode changes',()=>{
 const events=[],ledger=new VoiceLedger((...x)=>events.push(['on',...x]),(...x)=>events.push(['off',...x])),input=createMalletInput({noteOn:(n,o,v)=>ledger.press(o,0,n,v),noteOff:o=>ledger.release(o)}),bars=malletBars(),bar=bars[0],left={},right={},high=[bar.x,-.25,bar.z],low=[bar.x,-.48,bar.z],opts={playingMode:'hold'};
 for(const hand of [left,right]){input.update(hand,high,0,bars,opts);input.update(hand,low,60,bars,opts)}assert.equal(ledger.owners.size,2);
 input.remove(left);assert.equal(ledger.owners.size,1);assert.equal(events.filter(e=>e[0]==='off').length,0,'one mallet lifting must not silence the other');
 input.update(right,low,400,bars,opts);assert.equal(ledger.owners.size,0,'a tracking discontinuity releases held notes');input.update(right,low,420,bars,opts);assert.equal(ledger.owners.size,0,'recovered contact requires a fresh lift');
 input.update(right,high,440,bars,opts);input.update(right,low,500,bars,opts);assert.equal(ledger.owners.size,1);input.update(right,low,520,bars,{playingMode:'strike'});assert.equal(ledger.owners.size,0);
 input.update(left,high,600,bars,opts);input.update(left,low,660,bars,opts);input.update(left,low,680,bars,{...opts,enabled:false});assert.equal(ledger.owners.size,0);input.reset();
});

test('VR playing preferences persist and mode switches expose only the applicable strike controls',()=>{
 const {ws,storage,host,events}=spatial();assert.equal(ws.options.playingMode,'strike');assert.equal(ws.options.gripPedal,false);
 ws.action({type:'control',id:'room-playingMode',value:'hold'});ws.action({type:'control',id:'room-gripPedal',value:true});assert.equal(events.filter(e=>e[0]==='release').length,2);
 const next=createSpatialWorkspace(host,{release(){},invalidate(){}},storage);assert.equal(next.options.playingMode,'hold');assert.equal(next.options.gripPedal,true);
 let room=next.snapshot(fixture());assert.equal(room.roomFields.find(f=>f.id==='room-gate').disabled,true);next.action({type:'control',id:'room-playingMode',value:'strike'});room=next.snapshot(fixture());assert.equal(room.roomFields.find(f=>f.id==='room-gate').disabled,false);
 next.action({type:'tools',value:'room'});const panel=createWorkspacePanel({getContext:()=>context()},'tools');panel.paint(fixture(),next.snapshot(fixture()));assert.ok(panel.buttons.some(b=>b.action?.id==='room-gripPedal'));
 for(const b of panel.buttons)assert.ok(b.x>=0&&b.y>=0&&b.x+b.w<=1440&&b.y+b.h<=960,b.id);
});

test('grabbing a panel preserves its offset, persists position, and B/Y-style reset restores the workstation',()=>{
 const {ws,events,storage,host}=spatial(),source={},p=ws.panels[0],start={origin:[0,0,0],direction:[0,0,-1]},hit={panel:'play',kind:'grab',distance:1.55};
 assert.equal(ws.begin(source,hit,start),true);assert.equal(events[0][1],source,'only the grabbing controller releases its note');ws.move(source,{origin:[.4,.2,0],direction:[0,0,-1]},.016);assert.ok(Math.abs(p.x-.4)<1e-9);assert.ok(Math.abs(p.y-.24)<1e-9);ws.finish(source);
 const next=createSpatialWorkspace(host,{release(){},invalidate(){},recenter(){},handoff(){}},storage);assert.equal(next.panels[0].x,.4);next.action({type:'tools',value:'reverb'});assert.equal(next.panels.find(p=>p.id==='tools').visible,true);assert.equal(next.ui.group,'reverb');
 ws.reset();assert.equal(ws.panels[0].x,0);assert.equal(ws.panels.filter(p=>p.visible).length,3);assert.equal(events.at(-1)[0],'recenter');
});

test('VR faders, piano-roll gestures, text entry and select menus send changes to the shared host',()=>{
 const {ws,events}=spatial(),source={},p=ws.panels.find(p=>p.id==='pattern');Object.assign(p,{x:0,y:0,z:-1,width:1.5,height:1,yaw:0});
 const rayAt=(x,y)=>({origin:[(x/1440-.5)*1.5,(.5-y/960),0],direction:[0,0,-1]}),slider={panel:'pattern',kind:'slider',x:100,y:100,w:300,h:40,min:0,max:127,step:1,point:{x:250,y:120},action:{type:'mix',track:3,key:'pan'}};
 ws.begin(source,slider,rayAt(250,120));ws.move(source,rayAt(400,120),.016);ws.finish(source);assert.ok(events.some(e=>e[0]==='mix'&&e[1]===3&&e[2]==='pan'&&e[3]===127));
 const grid={x:132,y:270,w:1266,h:456,start:0,length:4,low:60,rows:12,step:.25,mode:'piano'};ws.begin(source,{panel:'pattern',kind:'grid',grid,point:{x:132,y:700}},rayAt(132,700));ws.move(source,rayAt(450,700));ws.finish(source);const note=events.findLast(e=>e[0]==='edit')[1];assert.equal(note.type,'note-add');assert.equal(note.pitch,60);assert.equal(note.start,0);assert.equal(note.duration,1.25);
 ws.action({type:'field',field:{id:'scene-name',label:'Scene name',kind:'text',value:'Verse',maxLength:48}});ws.action({type:'type',value:' 2'});const room=ws.snapshot(fixture());assert.equal(room.edit.value,'Verse 2');ws.action({type:'apply-edit',value:'Verse 2'});assert.ok(events.some(e=>e[0]==='control'&&e[1]==='scene-name'&&e[2]==='Verse 2'));
 ws.action({type:'field',field:{id:'seq-record-grid',label:'Grid',kind:'select',value:'1/16',options:[{value:'off',label:'Off'}]}});ws.action({type:'apply-edit',value:'off'});assert.ok(events.some(e=>e[0]==='control'&&e[1]==='seq-record-grid'&&e[2]==='off'));ws.action({type:'file',id:'seq-load'});assert.deepEqual(events.at(-1),['file','seq-load']);
});

test('all workspace panels have reachable controls and eight independent physical mixer strips',()=>{
 const {ws}=spatial(),state=fixture();state.workspace.notes=[{id:'n1',start:.5,pitch:52,duration:.75,velocity:102}];const room={...ws.snapshot(state),base:48};
 for(const id of ['mixer','pattern','song','tools']){
  const panel=createWorkspacePanel({getContext:()=>context()},id);assert.equal(panel.paint(state,room),true);assert.equal(panel.paint(state,room),false);
  for(const c of panel.buttons){assert.ok(c.x>=0&&c.y>=0&&c.x+c.w<=1440.001&&c.y+c.h<=960,c.id)}
  assert.ok(panel.buttons.some(c=>c.kind==='grab'));if(id==='mixer'){assert.equal(panel.sliders.length,32);assert.equal(panel.sliders.filter(s=>s.vertical).length,8)}
 }
});

test('VR numeric fields edit and reset mixer values, reject out-of-range input, and keep all setting controls reachable',()=>{
 const {ws,events}=spatial(),state=fixture();ws.snapshot(state);
 ws.action({type:'mix-field',track:2,key:'pan'});let room=ws.snapshot(state);assert.equal(room.edit.value,'0');assert.equal(room.edit.defaultValue,0);
 ws.action({type:'apply-edit',value:'100'});room=ws.snapshot(state);assert.ok(room.edit);assert.match(room.notice,/from -64 to 63/);
 ws.action({type:'apply-edit',value:'-20'});assert.deepEqual(events.findLast(e=>e[0]==='mix'),['mix',2,'pan',44]);assert.equal(ws.snapshot(state).edit,null);
 ws.action({type:'mix-field',track:2,key:'volume'});ws.action({type:'apply-edit',value:'50'});assert.deepEqual(events.findLast(e=>e[0]==='mix'),['mix',2,'volume',64]);
 state.workspace.groups.record.fields=Array.from({length:8},(_,i)=>({id:'setting-'+i,label:'Setting '+i,kind:'range',value:64,display:'64',min:0,max:127,step:1,defaultValue:64}));
 ws.action({type:'tools',value:'record'});room=ws.snapshot(state);const panel=createWorkspacePanel({getContext:()=>context()},'tools');panel.paint(state,room);
 assert.equal(panel.buttons.filter(b=>b.id.endsWith('-reset')).length,8);assert.equal(panel.buttons.filter(b=>b.id.endsWith('-value')).length,8);
 for(const b of panel.buttons)assert.ok(b.x>=0&&b.y>=0&&b.x+b.w<=1440&&b.y+b.h<=960,b.id);
});

test('one controller leaving a slider or losing tracking cannot cancel the other controller’s note edit',()=>{
 const {ws,events}=spatial(),left={},right={},ray={origin:[0,0,0],direction:[0,0,-1]},grid={x:132,y:270,w:1266,h:456,start:0,length:4,low:60,rows:12,step:.25,mode:'piano'};
 ws.begin(left,{panel:'pattern',kind:'grid',grid,point:{x:200,y:700}},ray);ws.cancel(right);assert.ok(ws.snapshot(fixture()).ghost);
 ws.begin(right,{panel:'mixer',kind:'slider',x:100,y:100,w:200,h:40,min:0,max:127,step:1,point:{x:200,y:120},action:{type:'mix',track:0,key:'volume'}},ray);ws.finish(right);assert.ok(ws.snapshot(fixture()).ghost);ws.finish(left);assert.equal(events.filter(e=>e[0]==='edit'&&e[1].type==='note-add').length,1);
});

test('the room renderer submits both eyes, five panel textures and finite transforms, then frees its resources',()=>{
 let serial=0,draws=0,viewports=0,disposed=0,textureUploads=0;const constants=new Map(),noop=()=>{};
 const gl=new Proxy({createBuffer:()=>({id:++serial}),createTexture:()=>({id:++serial}),createShader:()=>({}),createProgram:()=>({}),getShaderParameter:()=>true,getProgramParameter:()=>true,getAttribLocation:(p,n)=>['aPosition','aUV','aLight'].indexOf(n),getUniformLocation:(p,n)=>n,getExtension:()=>({loseContext(){}}),uniformMatrix4fv:(l,t,m)=>assert.ok([...m].every(Number.isFinite)),drawArrays:()=>draws++,viewport:()=>viewports++,texImage2D:()=>textureUploads++,deleteTexture:()=>disposed++},{get:(o,k)=>{if(k in o)return o[k];if(/^[A-Z_0-9]+$/.test(k)){if(!constants.has(k))constants.set(k,constants.size+1);return constants.get(k)}return noop}});
 const document={createElement:()=>({getContext:type=>type==='webgl'?gl:context(),addEventListener(){},removeEventListener(){}})},renderer=createXRRenderer({document,onLost(){throw Error('Unexpected context loss')}}),{ws}=spatial(),state=fixture();ws.panels.forEach(p=>p.visible=true);const room={...ws.snapshot(state),base:48,patches:[],pageCount:1,patchPage:0,filter:'all',page:'play',mallets:[{origin:[0,0,0],tip:[0,-.3,-.6],hand:'left'}]};
 Object.assign(state,{trackName:'Piano',patchName:'Grand',program:1,bank:'0:0',tracks:state.workspace.mix,scenes:Array.from({length:8},(_,i)=>'Scene '+i),scene:0,armed:0,position:'01 : 01',transport:'Stopped',tempo:100,volume:65,reverb:25,delay:0,recordSummary:'Overdub',monitor:true});
 renderer.update(state,room,new Set());const identity=boxMatrix(0,0,0,1,1,1),pose={views:[{},{}].map(()=>({projectionMatrix:identity,transform:{inverse:{matrix:identity}}}))},anchor=roomAnchor({matrix:identity,position:{x:0,y:0,z:0}}),session={renderState:{baseLayer:{framebuffer:{},getViewport:()=>({x:0,y:0,width:1000,height:1000})}}};
 renderer.render(session,pose,anchor,malletBars(),{notes:new Set(),hovered:new Set()},[],state,1.25,room);assert.equal(viewports,2);assert.ok(draws>200);assert.equal(renderer.surfaces.size,5);assert.equal(textureUploads,6);renderer.dispose();renderer.dispose();assert.equal(disposed,6);
});
