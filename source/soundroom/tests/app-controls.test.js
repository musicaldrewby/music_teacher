import {projectTempoMap} from '../src/tempo-map.js';
import {trackColor,createSoundShortcuts} from '../src/usability-model.js';
import {createValueEditor} from '../src/value-editor.js';
// Node smoke test of the real page handlers. This is not a browser/layout test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as music from '../src/performance-engine.js';
import * as fx from '../src/synth-effects.js';
import * as model from '../src/sequencer-model.js';
import * as arranging from '../src/arrangement.js';
import * as recovery from '../src/recovery.js';
import * as formats from '../src/export-formats.js';
import * as composition from '../src/composition-model.js';
import {inputAudioTime} from '../src/audio-clock.js';
import {METRONOME_SOUNDS} from '../src/metronome.js';
import {createWebXR} from '../src/webxr.js';
import {createXRControls,XR_FILE_CONTROLS,XR_GROUPS} from '../src/xr-controls.js';
const parseProject=text=>model.bindProject(JSON.parse(text));
const INCLUDED_FONTS=JSON.parse(await readFile(new URL('../src/soundfonts.json',import.meta.url),'utf8'));

test('Overdub adds notes; Record over replaces only the armed track and Undo restores the prior take',async()=>{
 const p=await page();await p.click('enable');
 const arm=track=>p.ids.get('track-list').onclick({target:{closest:s=>s==='[data-track]'?{dataset:{track:String(track)}}:{dataset:{action:'arm'}}}});
 async function take(key){await p.click('seq-record');const start=p.events.filter(e=>e.type==='soundroom-start').at(-1);p.audio.currentTime=start.origin+.3;await p.fire('keydown',key);p.audio.currentTime+=.3;await p.fire('keyup',key);await p.click('seq-stop')}
 await take('KeyA');arm(1);await take('KeyD');arm(0);await take('KeyF');
 assert.deepEqual(Array.from(p.context.soundroom.sequencer.noteCounts).slice(0,2),[2,1]);
 await p.change('seq-record-mode','replace');assert.match(p.ids.get('record-mode-help').textContent,/replaces the armed track/);await take('KeyG');
 assert.deepEqual(Array.from(p.context.soundroom.sequencer.noteCounts).slice(0,2),[1,1]);
 await p.click('seq-save');const saved=parseProject(await p.downloads.at(-1).text());assert.equal(saved.recordMode,'replace');assert.equal(saved.tracks[0].notes[0].pitch,55);assert.equal(saved.tracks[1].notes[0].pitch,52);
 await p.click('seq-undo');assert.deepEqual(Array.from(p.context.soundroom.sequencer.noteCounts).slice(0,2),[2,1]);
 await p.change('seq-record-mode','overdub');assert.match(p.ids.get('record-mode-help').textContent,/keeps existing notes/);await take('KeyH');assert.deepEqual(Array.from(p.context.soundroom.sequencer.noteCounts).slice(0,2),[3,1]);
});

async function page(storage=new Map(),requestMIDIAccess=null) {
  const faults={download:false,install:false,deferStart:false,deferInput:false,deferStop:false,inputDelay:0};const downloads=[];let audioInstance,workletPort,pendingStart,pendingStop,xrHost;const pendingReceipts=[];
  const html = await readFile(new URL('../src/index.html', import.meta.url), 'utf8');
  const source = (await readFile(new URL('../src/app.js', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, '');
  const elements = [], ids = new Map(), events = [], timers = new Map(), listeners = new Map(); let serial = 0, now = 0;
  class Element {
    constructor(tag='div', attrs={}) {
      this.tagName=tag.toUpperCase(); this.attrs=attrs; this.dataset={}; this.style={setProperty(k,v){this[k]=v}}; this.children=[]; this.listeners={};
      this.value=attrs.value||'';this.textContent='';this.open=false;this.hidden=false;
      for(const [k,v] of Object.entries(attrs))if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,x)=>x.toUpperCase())]=v;
      const classes=new Set((attrs.class||'').split(' '));
      this.classList={add:(...s)=>s.forEach(x=>classes.add(x)),remove:(...s)=>s.forEach(x=>classes.delete(x)),toggle:(s,on)=>{if(on===undefined)on=!classes.has(s);on?classes.add(s):classes.delete(s);return on},contains:s=>classes.has(s)};
      elements.push(this);if(attrs.id)ids.set(attrs.id,this);
    }
    append(...nodes){for(const n of nodes){if(n.parentNode)n.parentNode.children=n.parentNode.children.filter(x=>x!==n);n.parentNode=this;this.children.push(n)}}
    insertBefore(node,ref){if(node.parentNode)node.parentNode.children=node.parentNode.children.filter(x=>x!==node);const i=this.children.indexOf(ref);this.children.splice(i<0?this.children.length:i,0,node);node.parentNode=this}
    replaceChildren(...nodes){this.children.forEach(n=>n.parentNode=null);this.children=[];this.append(...nodes)}
    insertAdjacentHTML(where,html){this.innerHTML=(this.innerHTML||'')+html}
    setAttribute(k,v){this.attrs[k]=String(v)}
    getAttribute(k){return this.attrs[k]??null}
    addEventListener(k,fn){this.listeners[k]=fn}
    querySelector(selector){const nodes=this.children.flatMap(n=>[n,...n.descendants()]);return nodes.find(n=>selector==='button'?n.tagName==='BUTTON':selector==='.selected'?(n.className||'').split(' ').includes('selected'):false)||null}
    descendants(){return this.children.flatMap(n=>[n,...n.descendants()])}
    focus(){context.document.activeElement=this}
    getContext(){return {}}
    getBoundingClientRect(){return {left:0,top:0,right:1600,bottom:3200}}
    showModal(){this.open=true} close(){this.open=false} select(){}
    blur(){} scrollIntoView(){} setPointerCapture(){} click(){return this.onclick?.()} remove(){}
  }
  for(const match of html.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*)>/gi)){
    const attrs=Object.fromEntries([...match[2].matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
    if(attrs.id||Object.keys(attrs).some(k=>k.startsWith('data-')))new Element(match[1],attrs);
  }
  for(const match of html.matchAll(/<select\b[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)){
    const options=[...match[2].matchAll(/<option\b([^>]*)>/g)];
    const chosen=options.find(x=>x[1].includes('selected'))||options[0];
    ids.get(match[1]).value=chosen?.[1].match(/value="([^"]*)"/)?.[1]||'';
    ids.get(match[1]).replaceChildren(...[...match[2].matchAll(/<option\b([^>]*)>([^<]*)<\/option>/g)].map(m=>{const e=new Element('option',{value:m[1].match(/value="([^"]*)"/)?.[1]??m[2]});e.textContent=m[2];return e}));
  }
  const query=selector=>{
    if(selector.startsWith('[data-')){
      const [,key,value]=selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]/)||[];
      return elements.filter(e=>e.attrs[key]!==undefined&&(value===undefined||e.attrs[key]===value));
    }
    return [];
  };
  class Audio {
    constructor(){audioInstance=this;this.state='running';this.currentTime=0;this.destination={};this.audioWorklet={addModule:async()=>{}}}
    async resume(){this.state='running'} async close(){}
    createGain(){return {gain:{value:1,setTargetAtTime(){}},connect(){}}}
    createAnalyser(){return {fftSize:2048,connect(){},getFloatTimeDomainData(a){a.fill(0)}}}
  }
  class Synth {
    constructor(context,config){config?.audioNodeCreators?.worklet(context,'stub',{});this.isReady=Promise.resolve();this.midiChannels=Array.from({length:16},()=>({setDrums(){},setSystemParameter(){},patch:{}}));this.bankIDs=[];this.soundBankManager={addSoundBank:async(data,id)=>{if(faults.install)throw new Error('Installation failed');structuredClone(data,{transfer:[data]});this.bankIDs.push(id);events.push({type:'bank-add',id})},deleteSoundBank:async id=>{this.bankIDs=this.bankIDs.filter(x=>x!==id);events.push({type:'bank-delete',id})}}}
    setLogLevel(){}connect(){}setSystemParameter(){}controllerChange(ch,cc,value){events.push({type:'cc',ch,cc,value})}programChange(){}pitchWheelRange(){}pitchWheel(ch,value){events.push({type:'bend',ch,value})}channelPressure(ch,value){events.push({type:'pressure',ch,value})}sendMessage(){}
    noteOn(ch,n,v){events.push({type:'on',ch,n,v})}noteOff(ch,n){events.push({type:'off',ch,n})}stopAll(){events.push({type:'stop'})}destroy(){}
  }
  const context={createComposer:()=>({setVisible(){},stop(){},receive(){}}),trackColor,createSoundShortcuts,createValueEditor,...music,...fx,...model,...arranging,...recovery,...formats,...composition,createXRControls,XR_FILE_CONTROLS,XR_GROUPS,createWebXR:(host,env)=>{xrHost=host;return createWebXR(host,env)},TextEncoder,inputAudioTime,METRONOME_SOUNDS,INCLUDED_FONTS,Blob,URL:{createObjectURL:b=>{downloads.push(b);return 'blob:test'},revokeObjectURL(){}},AudioWorkletNode:class{constructor(){this.port=workletPort={postMessage:m=>{
     if(m.type==='soundroom-start'){
      const origin=audioInstance.currentTime+.025+m.score.countIn*m.score.secondsPerBeat;events.push({type:'transport',...m,origin});pendingStart={type:'soundroom-started',runId:m.runId,origin};if(!faults.deferStart)this.port.onmessage({data:pendingStart});
     }else if(m.type==='soundroom-live-input'){
      events.push({type:'transport',...m});
      for(const [status,a,b] of m.messages){const ch=status&15;switch(status&0xf0){case 0x90:events.push({type:'on',ch,n:a,v:b});break;case 0x80:events.push({type:'off',ch,n:a});break;case 0xb0:events.push({type:'cc',ch,cc:a,value:b});break;case 0xe0:events.push({type:'bend',ch,value:a|(b<<7)});break;case 0xd0:events.push({type:'pressure',ch,value:a});break}}
      const receipt={type:'soundroom-input-recorded',runId:m.runId,inputId:m.inputId,method:m.method,args:m.args,time:audioInstance.currentTime+faults.inputDelay+m.adjustment};
      if(faults.deferInput)pendingReceipts.push(receipt);else this.port.onmessage({data:receipt});
     }else if(m.type==='soundroom-stop'){
      events.push({type:'transport',...m});pendingStop={type:'soundroom-stopped',runId:m.runId,time:audioInstance?.currentTime||0,origin:pendingStart?.origin};
      if(!faults.deferStop){while(pendingReceipts.length)this.port.onmessage({data:pendingReceipts.shift()});this.port.onmessage({data:pendingStop})}
     }else events.push({type:'transport',...m});
    },onmessage(){}}}},WorkletSynthesizer:Synth,SoundBankLoader:{fromArrayBuffer:()=>({presets:INCLUDED_FONTS[0].presets,destroySoundBank(){}})},TextDecoder,console,projectTempoMap,
    document:{getElementById:id=>ids.get(id)||null,querySelectorAll:query,createElement:tag=>new Element(tag),createDocumentFragment:()=>new Element(),documentElement:new Element(),body:new Element(),hidden:false,addEventListener(){},activeElement:null},
    navigator:requestMIDIAccess?{requestMIDIAccess}:{},AudioContext:Audio,HTMLInputElement:class{},HTMLSelectElement:class{},HTMLTextAreaElement:class{},HTMLButtonElement:class{},
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,String(value))},Option:class extends Element{constructor(text,value){super('option',{value});this.textContent=text}},
    requestAnimationFrame(){},devicePixelRatio:1,innerWidth:1200,addEventListener:(type,fn)=>listeners.set(type,fn),
    fetch:async url=>{events.push({type:'fetch',url});if(faults.download)throw new Error('Download failed');return {ok:true,arrayBuffer:async()=>new ArrayBuffer(4)}},
    setTimeout:(fn,ms)=>{const id=++serial;timers.set(id,{fn,at:now+ms});return id},clearTimeout:id=>timers.delete(id),performance:{now:()=>now}
  };
  context.window=context;vm.createContext(context);
  const layoutSource=(await readFile(new URL('../src/workspace-layout.js',import.meta.url),'utf8')).replace('export function createWorkspaceLayout','function createWorkspaceLayout');
  vm.runInContext(layoutSource,context,{filename:'workspace-layout.js'});
  const compositionSource=(await readFile(new URL('../src/composition-ui.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replaceAll('export function','function');
  vm.runInContext('Object.assign(globalThis,(()=>{'+compositionSource+';return {createPerformanceLibrary,createSongTimeline}})())',context,{filename:'composition-ui.js'});
  const workstationSource=(await readFile(new URL('../src/workstation.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replace('export function createWorkstation','function createWorkstation');
  vm.runInContext('globalThis.createWorkstation=(()=>{'+workstationSource+';return createWorkstation})()',context,{filename:'workstation.js'});
  const studioSource=(await readFile(new URL('../src/studio.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replace('export function createStudio','function createStudio');
  vm.runInContext('globalThis.createStudio=(()=>{'+studioSource+';return createStudio})()',context,{filename:'studio.js'});vm.runInContext(source,context,{filename:'app.js'});
  function advance(ms){const end=now+ms;while(true){const next=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;timers.delete(next[0]);now=next[1].at;next[1].fn()}now=end}
  return {storage,context,ids,events,timers,advance,faults,downloads,xrHost,receive:data=>workletPort.onmessage({data}),ackStart:()=>workletPort.onmessage({data:pendingStart}),ackInput:()=>{while(pendingReceipts.length)workletPort.onmessage({data:pendingReceipts.shift()})},ackStop:()=>workletPort.onmessage({data:pendingStop}),get audio(){return audioInstance},change:async(id,value)=>{ids.get(id).value=value;await ids.get(id).onchange()},fire:async (type,code,props={})=>{let prevented=false;await listeners.get(type)({code,target:context.document.body,preventDefault(){prevented=true},...props});return prevented},click:async id=>{await ids.get(id).onclick()}};
}

test('VR shares the performance, records at the audible worklet time, queues scenes and returns to the same project',async()=>{
 const p=await page(),h=p.xrHost;await p.click('enable');
 await h.action({type:'track',value:2});assert.equal(h.snapshot().track,2);assert.equal(h.snapshot().armed,2);
 const patchIndex=h.patches().findIndex(x=>x.program===48&&!x.isDrum&&x.bankMSB===0&&x.bankLSB===0);await h.action({type:'patch',value:patchIndex});assert.equal(p.context.soundroom.selected.program,48);
 await h.action({type:'theme'});assert.equal(p.context.document.documentElement.dataset.lcdTheme,'purple');
 await h.action({type:'level',value:'reverb',delta:5});assert.equal(p.context.soundroom.effects.reverbMix,30);
 await p.change('seq-count-in','0');await p.change('seq-record-grid','off');p.faults.inputDelay=.04;
 await h.action({type:'transport',value:'record'});const start=p.events.findLast(e=>e.type==='soundroom-start');
 p.audio.currentTime=start.origin+.25;h.noteOn(60,'xr:test');p.audio.currentTime=start.origin+.65;h.noteOff('xr:test');
 assert.equal(p.events.filter(e=>e.type==='soundroom-live-input'&&e.args[0]==='xr:test').length,2,'VR must use acknowledged audio-frame capture');
 h.ended();assert.equal(p.context.soundroom.sequencer.recording,false);assert.equal(p.ids.get('vr-drawer').hidden,false);await p.click('seq-save');
 const saved=parseProject(await p.downloads.at(-1).text()),note=saved.tracks[2].notes[0];assert.equal(note.pitch,60);assert.ok(Math.abs(note.start-.29*saved.tempo/60)<1e-9);assert.ok(Math.abs(note.duration-.4*saved.tempo/60)<1e-9);assert.equal(saved.tracks[2].patch.program,48);
 await h.action({type:'transport',value:'pattern'});const origin=p.context.soundroom.sequencer.origin;await h.action({type:'scene',value:5});assert.equal(p.context.soundroom.sequencer.queuedScene,5);assert.equal(p.context.soundroom.sequencer.origin,origin);
 await h.action({type:'track',value:4});assert.equal(h.snapshot().track,2,'track and patch changes are locked while playing');
 h.suspend();assert.equal(p.context.soundroom.sequencer.playing,false);assert.equal(p.context.soundroom.activeNotes.length,0);assert.equal(h.snapshot().patchName,saved.tracks[2].patch.name);
});

test('the full VR workstation edits the shared notes, mix, song, presets and named song copies',async()=>{
 const p=await page(),h=p.xrHost;await p.click('enable');
 await h.control('scene-name','Midnight introduction');await h.control('seq-name','Mallet studio');await h.control('seq-record-grid','off');assert.equal(h.snapshot().scenes[0],'Midnight introduction');assert.match(h.snapshot().recordSummary,/FREE TIMING/);
 await h.control('seq-snap',false);h.edit({type:'note-add',pitch:60,start:.133,duration:.43,velocity:117});let data=h.workspaceSnapshot({bar:0,span:1});assert.equal(data.notes[0].start,.133);assert.equal(data.notes[0].velocity,117);
 const note=data.notes[0];h.edit({type:'note-update',id:note.id,start:.25,pitch:64,duration:.75});assert.equal(h.workspaceSnapshot({}).notes[0].pitch,64);await h.control('seq-undo');assert.equal(h.workspaceSnapshot({}).notes[0].pitch,60);
 h.edit({type:'controller-set',lane:'bend',beat:.133,value:12000});data=h.workspaceSnapshot({});assert.equal(data.controllers[0].type,'bend');assert.equal(data.controllers[0].value,12000);
 await h.control('seq-snap',true);h.edit({type:'note-update',id:note.id,velocity:117});h.edit({type:'controller-set',id:data.controllers[0].id,lane:'bend',value:10000});data=h.workspaceSnapshot({});assert.equal(data.notes[0].start,.133,'changing velocity must not quantize a free-time note');assert.equal(data.notes[0].original.start,.133);assert.equal(data.controllers[0].beat,.133,'changing controller value must not move the event');
 h.mix(2,'volume',81);h.mix(2,'pan',12);h.mix(2,'reverb',116);h.mix(2,'delay',69);h.mix(3,'mute',true);h.mix(4,'solo',true);data=h.workspaceSnapshot({});assert.deepEqual([data.mix[2].volume,data.mix[2].pan,data.mix[2].reverb,data.mix[2].delay],[81,12,116,69]);assert.equal(data.mix[3].mute,true);assert.equal(data.mix[4].solo,true);h.mix(4,'solo',false);
 await h.control('reverb-decay',104);await h.control('shape-attack',91);assert.equal(p.context.soundroom.effects.reverbDecay,104);assert.equal(p.context.soundroom.shape.attack,91);
 await h.control('song-add-scene','0');await h.control('song-add');let song=h.workspaceSnapshot({}).song;assert.equal(song.length,1);await h.control('song-entry-repeats',3);assert.equal(h.workspaceSnapshot({}).song[0].bars,12);
 await h.control('preset-name','Night mallets');await h.control('preset-save');assert.ok(JSON.parse(p.storage.get('soundroom-performances-v1')).some(x=>x.name==='Night mallets'));
 await h.slots('save');data=h.workspaceSnapshot({});assert.equal(data.slots.length,1);const slot=data.slots[0];await h.control('seq-new');assert.equal(h.workspaceSnapshot({}).notes.length,0);await h.slots('load',slot.id);assert.equal(h.workspaceSnapshot({}).name,'Mallet studio');assert.equal(h.workspaceSnapshot({}).notes[0].velocity,117);assert.equal(h.workspaceSnapshot({}).mix[2].pan,12);assert.equal(h.workspaceSnapshot({}).song[0].repeats,3);
 await h.control('step-toggle');assert.equal(p.context.soundroom.sequencer.stepEnabled,true);h.noteOn(67,'xr-mallet:test',111);h.noteOff('xr-mallet:test');assert.ok(h.workspaceSnapshot({}).notes.some(n=>n.pitch===67&&n.velocity===111));await h.control('step-toggle');
 await h.action({type:'transport',value:'pattern'});const before=h.workspaceSnapshot({}).notes.length;h.edit({type:'note-add',pitch:72,start:0,duration:1});assert.equal(h.workspaceSnapshot({}).notes.length,before,'edits are locked during playback');h.mix(2,'volume',45);assert.equal(h.workspaceSnapshot({}).mix[2].volume,45,'the mixer stays live');await h.action({type:'transport',value:'stop'});
 await h.control('export-midi');assert.equal(p.ids.get('export-download').hidden,false);assert.match(p.ids.get('export-status').textContent,/MIDI ready/);
});

test('VR grip pedal shares sustain with keyboard sources and records CC64 on the monitored audio clock',async()=>{
 const p=await page(),h=p.xrHost;await p.click('enable');await h.action({type:'track',value:3});
 h.sustain(true);assert.equal(h.snapshot().sustain,true);await p.fire('keydown','Space');h.sustain(false);assert.equal(h.snapshot().sustain,true,'releasing a VR grip must not lift a held keyboard pedal');await p.fire('keyup','Space');assert.equal(h.snapshot().sustain,false);
 await p.click('sustain');h.sustain(true);h.sustain(false);assert.equal(h.snapshot().sustain,true,'the sustain toggle is independent');await p.click('sustain');
 await p.change('seq-count-in','0');await p.change('seq-record-grid','off');p.faults.inputDelay=.04;await h.action({type:'transport',value:'record'});const start=p.events.findLast(e=>e.type==='soundroom-start');
 p.audio.currentTime=start.origin+.2;h.sustain(true);h.sustain(true);p.audio.currentTime=start.origin+.3;h.noteOn(60,'xr-mallet:held',83);p.audio.currentTime=start.origin+1.3;h.noteOff('xr-mallet:held');p.audio.currentTime=start.origin+1.7;h.sustain(false);
 const packets=p.events.filter(e=>e.type==='soundroom-live-input'&&e.method==='controller'&&e.args[0].controller===64);assert.equal(packets.length,2);assert.deepEqual(packets.map(e=>e.args[0].value),[127,0]);assert.deepEqual(packets.map(e=>Array.from(e.messages[0])),[[0xb3,64,127],[0xb3,64,0]]);
 await h.action({type:'transport',value:'stop'});await p.click('seq-save');const project=parseProject(await p.downloads.at(-1).text()),track=project.tracks[3],pedal=track.controllers.filter(e=>e.controller===64);assert.equal(pedal.length,2);assert.ok(Math.abs(pedal[0].beat-.24*project.tempo/60)<1e-9);assert.ok(Math.abs(pedal[1].beat-1.74*project.tempo/60)<1e-9);assert.ok(Math.abs(track.notes[0].duration-1*project.tempo/60)<1e-9);assert.equal(track.notes[0].velocity,83);
 h.sustain(true);const generation=h.snapshot().inputGeneration;h.suspend();assert.equal(h.snapshot().sustain,false);assert.ok(h.snapshot().inputGeneration>generation);
});

test('LCD settings pages retain the performance, effects and running audio across workspace changes',async()=>{
 const p=await page(),workspace=name=>p.context.document.querySelectorAll('[data-workspace-choice]').find(b=>b.dataset.workspaceChoice===name).onclick();
 await p.click('enable');await p.change('nav-track','2');await p.click('seq-play');const origin=p.context.soundroom.sequencer.origin;await p.fire('keydown','KeyA');
 for(const name of ['performance','shape','effects','sounds']){
  await p.click('lcd-tab-'+name);for(const page of ['sounds','performance','shape','effects'])assert.equal(p.ids.get('lcd-'+page+'-page').hidden,page!==name);
  assert.equal(p.ids.get('lcd-tab-'+name).getAttribute('aria-pressed'),'true');assert.equal(p.context.soundroom.sequencer.origin,origin);assert.equal(p.context.soundroom.sequencer.playing,true);assert.equal(p.context.soundroom.activeNotes.length,1,'navigation must not interrupt held notes');
 }
 await p.click('lcd-tab-shape');assert.match(p.ids.get('lcd-shape-part').textContent,/Part 3/);p.ids.get('shape-attack').value='81';p.ids.get('shape-attack').oninput();assert.deepEqual(p.events.filter(e=>e.type==='cc'&&e.cc===73).slice(-2).map(e=>[e.ch,e.value]),[[2,81],[10,81]]);
 await p.click('lcd-tab-reverb');p.ids.get('reverb-decay').value='99';p.ids.get('reverb-decay').oninput();await p.click('lcd-tab-delay');await p.click('delay-toggle');p.ids.get('delay-time').value='110';p.ids.get('delay-time').oninput();assert.equal(p.ids.get('delay-time-value').textContent,'750 ms');
 p.ids.get('volume').value='49';p.ids.get('volume').oninput();const settings=p.ids.get('master-volume-control');workspace('mixer');assert.equal(settings.parentNode,p.ids.get('mixer-master-controls'));assert.equal(p.ids.get('play-station').hidden,true);assert.equal(p.context.soundroom.sequencer.playing,true);assert.equal(p.ids.get('volume').value,'49');
 p.context.document.querySelectorAll('[data-open-lcd]').find(b=>b.dataset.openLcd==='reverb').onclick();assert.equal(p.context.document.body.dataset.workspace,'perform');assert.equal(settings.parentNode,p.ids.get('performance-settings'));assert.equal(p.ids.get('play-station').hidden,false);assert.equal(p.ids.get('lcd-reverb-page').hidden,false);
 workspace('sequence');assert.equal(p.ids.get('sequence-panel').hidden,false);assert.equal(p.ids.get('song-panel').hidden,true);assert.equal(p.ids.get('play-station').hidden,true);await p.click('pattern-keyboard-toggle');assert.equal(p.ids.get('play-station').hidden,false);workspace('song');assert.equal(p.ids.get('song-panel').hidden,false);assert.equal(p.ids.get('play-station').hidden,true);workspace('perform');assert.equal(p.ids.get('sequence-panel').hidden,true);assert.equal(p.ids.get('song-panel').hidden,true);
 await p.fire('keyup','KeyA');await p.click('seq-stop');await p.click('seq-save');const saved=parseProject(await p.downloads.at(-1).text());assert.equal(saved.tracks[2].shape.attack,81);assert.equal(saved.tracks[0].shape.attack,64);assert.equal(saved.effects.reverbDecay,99);assert.equal(saved.effects.delayTime,110);assert.equal(saved.effects.delayEnabled,true);assert.equal(saved.master,49);
});

test('Project menu protects musical shortcuts and opens a working export without replacing the song',async()=>{
 const p=await page();await p.click('enable');await p.change('seq-name','Keep this song');await p.change('nav-track','3');
 const menu=p.ids.get('project-menu');
 assert.equal(await p.fire('keydown','Space',{target:{closest:selector=>selector==='summary'?p.ids.get('project-menu-toggle'):null}}),false,'Space must reach the native Project disclosure');menu.open=true;
 await p.fire('keydown','Digit8',{key:'8'});await p.fire('keydown','KeyA');
 assert.equal(p.context.soundroom.sequencer.selectedScene,0);assert.equal(p.context.soundroom.activeNotes.length,0);
 await p.fire('keydown','Escape');assert.equal(menu.open,false);assert.equal(p.context.document.activeElement,p.ids.get('project-menu-toggle'));
 menu.open=true;await p.click('seq-export');assert.equal(menu.open,false);assert.equal(p.context.document.body.dataset.workspace,'perform');assert.equal(p.ids.get('export-drawer').hidden,false);assert.equal(p.ids.get('export-panel').open,true);assert.equal(p.context.document.activeElement,p.ids.get('export-heading'));
 await p.click('export-midi');assert.equal(new TextDecoder().decode((await p.downloads.at(-1).arrayBuffer()).slice(0,4)),'MThd');
 await p.click('seq-save');const saved=parseProject(await p.downloads.at(-1).text());assert.equal(saved.name,'Keep this song');assert.equal(saved.selectedTrack,3);
 for(const button of p.context.document.querySelectorAll('[data-workspace-choice]')){
  menu.open=true;button.onclick();assert.equal(menu.open,false);assert.equal(p.ids.get('open-lcd-controls').hidden,false);assert.equal(p.ids.get('nav-track').value,'3');
 }
});

test('Compact layout persists on this device without stopping music or changing workspaces',async()=>{
 const p=await page();await p.click('enable');await p.click('seq-play');await p.fire('keydown','KeyA');const origin=p.context.soundroom.sequencer.origin;
 await p.click('compact-layout');assert.equal(p.context.document.documentElement.dataset.layout,'compact');assert.equal(p.ids.get('compact-layout').getAttribute('aria-pressed'),'true');assert.equal(p.context.soundroom.sequencer.origin,origin);assert.equal(p.context.soundroom.activeNotes.length,1);
 for(const button of p.context.document.querySelectorAll('[data-workspace-choice]')){button.onclick();assert.equal(p.context.document.documentElement.dataset.layout,'compact')}
 await p.click('seq-stop');const reopened=await page(p.storage);assert.equal(reopened.context.document.documentElement.dataset.layout,'compact');await reopened.click('compact-layout');assert.equal(reopened.context.document.documentElement.dataset.layout,'standard');assert.equal(p.storage.get('soundroom-compact-layout'),'false');
});

test('Metronome preview, live sound changes and save/load preserve the song and transport',async()=>{
 const p=await page();assert.equal(+p.ids.get('seq-click-volume').value,65);assert.equal(p.ids.get('seq-click-accent').checked,true);
 await p.change('seq-click-tone','wood');await p.change('seq-click-volume','82');p.ids.get('seq-click-accent').checked=false;p.ids.get('seq-click-accent').onchange();
 await p.click('seq-click-preview');const preview=p.events.findLast(e=>e.type==='soundroom-click-preview'&&!e.cancel);assert.equal(preview.settings.clickTone,'wood');assert.equal(preview.settings.clickVolume,.82);assert.equal(preview.settings.clickAccent,false);assert.equal(p.context.soundroom.sequencer.playing,false);assert.equal(p.context.soundroom.sequencer.noteCounts.reduce((a,b)=>a+b),0);
 await p.click('seq-click-preview');assert.equal(p.events.at(-1).cancel,true);assert.equal(p.ids.get('seq-click-preview').getAttribute('aria-pressed'),'false');
 await p.change('seq-click','on');await p.click('seq-click-preview');await p.click('seq-play');const origin=p.context.soundroom.sequencer.origin;assert.equal(p.ids.get('seq-click-preview').disabled,true);assert.equal(p.ids.get('seq-click-preview').getAttribute('aria-pressed'),'false');
 await p.change('seq-click-tone','beep');await p.change('seq-click-volume','90');assert.equal(p.events.findLast(e=>e.type==='soundroom-metronome').settings.clickVolume,.9);assert.equal(p.context.soundroom.sequencer.origin,origin);assert.equal(p.context.soundroom.sequencer.playing,true);
 await p.click('seq-stop');await p.click('seq-save');const file=p.downloads.at(-1),saved=parseProject(await file.text());assert.equal(saved.clickTone,'beep');assert.equal(saved.clickVolume,90);assert.equal(saved.clickAccent,false);
 await p.change('seq-click-tone','rim');p.ids.get('seq-file').files=[file];await p.ids.get('seq-file').onchange();assert.equal(p.ids.get('seq-click-tone').value,'beep');assert.equal(+p.ids.get('seq-click-volume').value,90);assert.equal(p.ids.get('seq-click-accent').checked,false);
});

test('MIDI input connects from its LCD page and keeps receiving on the chosen part after leaving that page',async()=>{
 const calls=[],port={id:'controller',name:'Test controller',state:'connected'},access={inputs:new Map([['controller',port]])};
 const p=await page(new Map(),async options=>{calls.push(options);return access});await p.click('open-settings');await p.click('midi-connect');assert.equal(calls.length,1);assert.equal(calls[0].sysex,false);assert.equal(p.ids.get('midi-input').disabled,false);assert.match(p.ids.get('midi-status').textContent,/1 MIDI input connected/);
 await p.change('nav-track','1');await p.change('midi-input','controller');await p.change('midi-channel','1');port.onmidimessage({data:[0x90,60,90]});assert.equal(p.context.soundroom.activeNotes.length,0);port.onmidimessage({data:[0x91,67,93]});assert.deepEqual(p.events.filter(e=>e.type==='on').at(-1),{type:'on',ch:1,n:67,v:93});
 await p.click('lcd-tab-sounds');assert.equal(p.context.soundroom.activeNotes.length,1);port.onmidimessage({data:[0x81,67,0]});assert.equal(p.context.soundroom.activeNotes.length,0);assert.equal(p.ids.get('midi-input').value,'controller');assert.equal(p.ids.get('midi-channel').value,'1');
});

test('LCD pages browse categories and load only the selected shared part while remaining open for audition',async()=>{
 const p=await page(),buttons=()=>p.ids.get('patchlist').descendants().filter(b=>b.dataset.patch),category=name=>p.context.document.querySelectorAll('[data-filter]').find(b=>b.dataset.filter===name).onclick();
 assert.equal(p.ids.get('lcd-browser').hidden,true);assert.equal(p.ids.get('lcd-home').hidden,false);
 await p.change('nav-track','3');await p.change('track-name','Ambient lead');assert.equal(p.ids.get('lcd-mode').textContent,'Part 4 / Ambient lead');
 await p.click('patchname');assert.equal(p.ids.get('lcd-browser').hidden,false);assert.equal(p.ids.get('lcd-home').hidden,true);assert.equal(buttons().length,6);assert.match(p.ids.get('browser-part').textContent,/Part 4/);
 category('gm');assert.equal(p.ids.get('resultcount').textContent,'128 sounds');assert.equal(p.ids.get('lcd-page-number').textContent,'Page 1 / 22');assert.equal(p.ids.get('lcd-page-prev').disabled,true);
 await p.click('lcd-page-next');assert.equal(p.ids.get('lcd-page-number').textContent,'Page 2 / 22');const choice=buttons()[0],name=choice.title;choice.onclick();assert.equal(p.context.soundroom.selected.name,name);assert.equal(p.ids.get('lcd-browser').hidden,false);assert.equal(buttons().find(b=>b.title===name).getAttribute('aria-pressed'),'true');assert.match(p.ids.get('lcd-current').textContent,new RegExp(name));
 await p.click('enable');await p.fire('keydown','KeyA');assert.equal(p.events.filter(e=>e.type==='on').at(-1).ch,3);await p.fire('keyup','KeyA');
 await p.click('seq-save');const saved=parseProject(await p.downloads.at(-1).text());assert.equal(saved.tracks[3].patch.name,name);assert.notEqual(saved.tracks[0].patch.name,name);await p.fire('keydown','Digit8',{key:'8'});assert.equal(p.context.soundroom.selected.name,name,'all scenes retain the shared part');
 category('gs');assert.ok(buttons().every(b=>{const preset=INCLUDED_FONTS[0].presets.find(x=>model.patchKey(x)===b.dataset.patch);return !preset.isDrum&&(preset.bankMSB!==0||preset.bankLSB!==0)}));
 category('drums');assert.ok(buttons().every(b=>INCLUDED_FONTS[0].presets.find(x=>model.patchKey(x)===b.dataset.patch).isDrum));buttons()[0].onclick();assert.equal(p.ids.get('drumpads').hidden,false);assert.equal(p.ids.get('typetag').textContent,'Percussion');
 await p.click('lcd-done');assert.equal(p.ids.get('lcd-home').hidden,false);assert.equal(p.ids.get('lcd-browser').hidden,true);assert.equal(p.context.document.activeElement,p.ids.get('patchname'));
 await p.click('patchname');assert.equal(p.ids.get('lcd-browser').hidden,false);assert.ok(buttons().some(b=>b.getAttribute('aria-pressed')==='true'));
});

test('LCD search resets and clamps pages, handles empty results, and adapts paging to a narrow screen',async()=>{
 const p=await page(),buttons=()=>p.ids.get('patchlist').descendants().filter(b=>b.dataset.patch);
 await p.click('patchname');await p.click('lcd-page-next');await p.click('lcd-search-toggle');assert.equal(p.ids.get('lcd-search-panel').hidden,false);
 p.ids.get('search').value='no such instrument xyz';p.ids.get('search').oninput();assert.equal(buttons().length,0);assert.equal(p.ids.get('resultcount').textContent,'0 sounds · filtered');assert.equal(p.ids.get('lcd-page-number').textContent,'Page 1 / 1');assert.equal(p.ids.get('lcd-page-prev').disabled,true);assert.equal(p.ids.get('lcd-page-next').disabled,true);
 await p.click('lcd-clear-search');assert.equal(p.ids.get('resultcount').textContent,'269 sounds');p.ids.get('search').value='piano';p.ids.get('search').oninput();assert.ok(buttons().length>0);assert.match(p.ids.get('resultcount').textContent,/filtered/);assert.equal(p.ids.get('lcd-page-prev').disabled,true);
 await p.click('lcd-clear-search');await p.change('family','Strings');assert.ok(buttons().every(b=>{const patch=INCLUDED_FONTS[0].presets.find(x=>model.patchKey(x)===b.dataset.patch);return patch.program>=40&&patch.program<48&&!patch.isDrum}));
 await p.click('lcd-clear-search');p.context.innerWidth=390;await p.fire('resize');assert.equal(buttons().length,3);assert.equal(p.ids.get('lcd-page-number').textContent,'Page 1 / 90');await p.click('lcd-page-next');assert.equal(p.ids.get('lcd-page-number').textContent,'Page 2 / 90');p.context.innerWidth=1200;await p.fire('resize');assert.equal(buttons().length,6);assert.equal(p.ids.get('lcd-page-number').textContent,'Page 1 / 45');
 for(let i=0;i<50;i++)await p.click('lcd-page-next');assert.equal(p.ids.get('lcd-page-number').textContent,'Page 45 / 45');assert.equal(buttons().length,5);assert.equal(p.ids.get('lcd-page-next').disabled,true);
 p.context.document.querySelectorAll('[data-filter]').find(b=>b.dataset.filter==='gm').onclick();assert.equal(p.ids.get('lcd-page-number').textContent,'Page 1 / 22');assert.equal(buttons().length,6);
});

test('LCD subpages and Help retain held notes, playback and control values',async()=>{
 const p=await page();await p.click('enable');await p.click('seq-play');await p.fire('keydown','KeyA');const origin=p.context.soundroom.sequencer.origin;
 await p.click('lcd-tab-shape');await p.click('shape-tab-pitch');assert.equal(p.ids.get('shape-pitch-controls').hidden,false);assert.equal(p.ids.get('shape-tone-controls').hidden,true);assert.equal(p.ids.get('shape-tab-pitch').getAttribute('aria-pressed'),'true');await p.click('shape-tab-tone');
 await p.click('lcd-tab-effects');await p.click('effect-tab-tone');assert.equal(p.ids.get('reverb-tone-controls').hidden,false);assert.equal(p.ids.get('reverb-main-controls').hidden,true);p.ids.get('reverb-damping').value='5';p.ids.get('reverb-damping').oninput();await p.click('lcd-tab-delay');assert.equal(p.ids.get('delay-main-controls').hidden,false);await p.click('effect-tab-tone');assert.equal(p.ids.get('delay-tone-controls').hidden,false);assert.equal(p.context.soundroom.effects.reverbDamping,5);
 await p.click('lcd-tab-performance');for(const name of ['save','manage','recall']){await p.click('preset-tab-'+name);for(const other of ['save','manage','recall'])assert.equal(p.ids.get('preset-'+other+'-page').hidden,other!==name)}
 await p.click('lcd-help');assert.equal(p.ids.get('lcd-help-dialog').open,true);await p.fire('keydown','KeyS');assert.equal(p.context.soundroom.activeNotes.length,1,'typing over Help must not play extra notes');await p.fire('keydown','Escape');assert.equal(p.ids.get('lcd-help-dialog').open,false);assert.equal(p.context.document.activeElement,p.ids.get('lcd-help'));
 assert.equal(p.context.soundroom.sequencer.origin,origin);assert.equal(p.context.soundroom.sequencer.playing,true);assert.equal(p.context.soundroom.activeNotes.length,1,'LCD navigation must not release held notes');await p.fire('keyup','KeyA');await p.click('seq-stop');
});

test('sound pages fit the actual LCD width and Compact preference; search uses its own page',async()=>{
 const p=await page(),buttons=()=>p.ids.get('patchlist').descendants().filter(b=>b.dataset.patch);await p.click('patchname');await p.click('lcd-page-next');const anchor=buttons()[0].dataset.patch;
 p.context.innerWidth=3440;p.ids.get('patch-screen').getBoundingClientRect=()=>({width:500});await p.fire('resize');assert.equal(buttons().length,3);assert.equal(buttons()[0].dataset.patch,anchor,'resizing keeps the first visible sound');assert.equal(p.ids.get('patch-screen').dataset.categoryPicker,'true');
 await p.click('compact-layout');assert.equal(buttons().length,2);assert.equal(buttons()[0].dataset.patch,anchor);p.ids.get('patch-screen').getBoundingClientRect=()=>({width:1100});await p.fire('resize');assert.equal(buttons().length,4);assert.ok(buttons().some(b=>b.dataset.patch===anchor));
 await p.change('lcd-category','gm');assert.equal(p.ids.get('resultcount').textContent,'128 sounds');await p.click('lcd-search-toggle');assert.equal(p.ids.get('patchlist').hidden,true);assert.equal(p.ids.get('lcd-pagination').hidden,true);assert.equal(p.ids.get('lcd-search-panel').hidden,false);
 p.ids.get('search').value='piano';p.ids.get('search').oninput();assert.match(p.ids.get('lcd-search-result').textContent,/matching sounds/);await p.click('lcd-show-results');assert.equal(p.ids.get('patchlist').hidden,false);assert.equal(p.ids.get('lcd-search-panel').hidden,true);assert.ok(buttons().some(b=>b===p.context.document.activeElement));
 await p.click('lcd-done');await p.change('key-count','25');assert.equal(p.ids.get('keyboard').style['--keyboard-max-width'],'720px');assert.equal(p.ids.get('keyboard').children.length,25);await p.change('key-count','49');assert.equal(p.ids.get('keyboard').style['--keyboard-max-width'],'1392px');assert.equal(p.ids.get('keyboard').children.at(-1).getAttribute('aria-label'),'C7');
});

test('favorite and recent sounds persist without changing a sound or interrupting playback when starred',async()=>{
 const p=await page(),category=name=>p.context.document.querySelectorAll('[data-filter]').find(b=>b.dataset.filter===name).onclick(),patches=()=>p.ids.get('patchlist').descendants().filter(b=>b.dataset.patch);
 category('favorites');assert.equal(patches().length,0);const initial=p.context.soundroom.selected.name;
 await p.click('patch-favorite-current');assert.equal(patches().length,1);assert.equal(p.context.soundroom.selected.name,initial);
 category('gm');patches()[2].onclick();const chosen=p.context.soundroom.selected.name;category('recent');assert.equal(patches()[0].title,chosen);
 await p.click('enable');await p.click('seq-play');const origin=p.context.soundroom.sequencer.origin,star=p.ids.get('patchlist').descendants().find(b=>b.dataset.favorite);star.onclick();assert.equal(p.context.soundroom.sequencer.playing,true);assert.equal(p.context.soundroom.sequencer.origin,origin);assert.equal(p.context.soundroom.selected.name,chosen);await p.click('seq-stop');
 const reopened=await page(p.storage);reopened.context.document.querySelectorAll('[data-filter]').find(b=>b.dataset.filter==='favorites').onclick();assert.equal(reopened.ids.get('patchlist').descendants().filter(b=>b.dataset.patch).length,2);
 reopened.context.document.querySelectorAll('[data-filter]').find(b=>b.dataset.filter==='recent').onclick();assert.equal(reopened.ids.get('patchlist').descendants().find(b=>b.dataset.patch).title,chosen);
 assert.equal(p.xrHost.patches().find(x=>x.name===chosen).favorite,true);assert.equal(p.xrHost.patches().find(x=>x.name===chosen).recentOrder,0);
});

test('record destination stays explicit when selection differs, and the shared Inspector does not interrupt playback',async()=>{
 const p=await page();await p.change('track-name','Piano');await p.change('nav-track','2');await p.change('track-name','Bass');
 assert.match(p.ids.get('record-summary').textContent,/Scene 1.*T1 Piano.*Overdub.*1\/16/);assert.match(p.ids.get('play-target').textContent,/Selected: T3 Bass.*MIDI: T3 Bass/);
 assert.equal(p.ids.get('nav-track').style['--track-color'],trackColor(2));assert.match(p.ids.get('mixer-strips').innerHTML,new RegExp(trackColor(2)));
 await p.click('track-settings-open');assert.equal(p.ids.get('inspector-drawer').hidden,false);assert.equal(p.ids.get('track-drawer').hidden,false);assert.match(p.ids.get('inspector-context').textContent,/T3 Bass/);
 await p.click('enable');await p.click('seq-record');assert.match(p.ids.get('record-summary').textContent,/Recording →.*T1 Piano/);assert.match(p.ids.get('play-target').textContent,/Selected: T3 Bass.*MIDI: T1 Piano/);const origin=p.context.soundroom.sequencer.origin;
 await p.click('inspector-tab-note');assert.equal(p.ids.get('track-drawer').hidden,true);await p.click('inspector-tab-edit');assert.equal(p.ids.get('note-drawer').hidden,true);assert.equal(p.ids.get('edit-drawer').hidden,false);assert.equal(p.context.soundroom.sequencer.origin,origin);
 await p.fire('keydown','Escape');assert.equal(p.ids.get('inspector-drawer').hidden,true);assert.equal(p.context.soundroom.sequencer.recording,true);await p.click('seq-stop');
});

test('typed slider values validate, reset and use live mixer handlers without changing the playback clock',async()=>{
 const p=await page(),open=id=>p.context.document.querySelectorAll('[data-value-id]').find(b=>b.dataset.valueId===id).onclick();
 open('shape-tune');p.ids.get('value-number').value='27';await p.click('value-apply');assert.equal(p.context.soundroom.shape.tune,27);assert.equal(p.ids.get('value-dialog').open,false);
 open('shape-tune');p.ids.get('value-number').value='999';await p.click('value-apply');assert.equal(p.context.soundroom.shape.tune,27);assert.match(p.ids.get('value-error').textContent,/from -100 to 100/);await p.click('value-reset');assert.equal(p.context.soundroom.shape.tune,0);
 open('shape-attack');p.ids.get('value-number').value='12';await p.click('value-apply');assert.equal(p.context.soundroom.shape.attack,76);
 open('delay-time');p.ids.get('value-number').value='455';await p.click('value-apply');assert.equal(Number(p.ids.get('delay-time').value),fx.delayValue(455));
 await p.click('enable');await p.click('seq-play');const origin=p.context.soundroom.sequencer.origin;open('reverb');p.ids.get('value-number').value='62';await p.click('value-apply');assert.equal(Number(p.ids.get('reverb').value),62);assert.equal(p.context.soundroom.sequencer.origin,origin);
 const strip={dataset:{mixTrack:'2'}},button={dataset:{mixValue:'pan'},closest:()=>strip,focus(){}};p.ids.get('mixer-strips').onclick({target:{closest:s=>s==='[data-mix-value]'?button:null}});p.ids.get('value-number').value='-32';await p.click('value-apply');assert.equal(p.xrHost.workspaceSnapshot({}).mix[2].pan,32);assert.equal(p.context.soundroom.sequencer.origin,origin);
 open('volume');await p.fire('keydown','Escape');assert.equal(p.ids.get('value-dialog').open,false);assert.equal(p.context.soundroom.sequencer.playing,true);await p.click('seq-stop');
});

test('number keys select all eight scenes, replace queued choices, and respect typing and recording',async()=>{
 const p=await page();for(let i=1;i<=8;i++){assert.equal(await p.fire('keydown','Digit'+i,{key:String(i)}),true);assert.equal(p.context.soundroom.sequencer.selectedScene,i-1)}
 await p.fire('keydown','Digit1',{key:'1'});
 for(const props of [{repeat:true},{ctrlKey:true},{metaKey:true},{altKey:true},{shiftKey:true},{isComposing:true},{defaultPrevented:true},{target:new p.context.HTMLInputElement()},{target:new p.context.HTMLSelectElement()},{target:new p.context.HTMLTextAreaElement()},{target:{isContentEditable:true}}]){
  assert.equal(await p.fire('keydown','Digit8',{key:'8',...props}),false);assert.equal(p.context.soundroom.sequencer.selectedScene,0);
 }
 p.ids.get('help').open=true;await p.fire('keydown','Digit8',{key:'8'});assert.equal(p.context.soundroom.sequencer.selectedScene,0);p.ids.get('help').open=false;
 await p.fire('keydown','Numpad8',{key:'ArrowUp'});assert.equal(p.context.soundroom.sequencer.selectedScene,0,'Num Lock off retains navigation');
 assert.equal(p.events.some(e=>e.type==='on'),false,'scene shortcuts do not play keyboard notes');
 await p.click('enable');await p.click('seq-play');const start=p.events.filter(e=>e.type==='soundroom-start').at(-1);p.audio.currentTime=start.origin;
 await p.fire('keydown','Digit3',{key:'3'});await p.fire('keydown','Numpad8',{key:'8'});const queued=p.events.filter(e=>e.type==='soundroom-queue').at(-1);assert.equal(queued.scene,7);assert.equal(queued.barBeats,4);assert.equal(p.context.soundroom.sequencer.selectedScene,0);assert.equal(p.context.soundroom.sequencer.queuedScene,7);assert.match(p.ids.get('scene-buttons').innerHTML,/scene-button queued[^>]*data-scene="7"/);
 p.ids.get('scene-buttons').onclick({target:{closest:()=>({dataset:{scene:'4'}})}});assert.equal(p.context.soundroom.sequencer.queuedScene,4,'on-screen selection replaces the same queue');
 await p.click('seq-stop');await p.click('seq-record');const count=p.events.filter(e=>e.type==='soundroom-queue').length;await p.fire('keydown','Digit8',{key:'8'});assert.equal(p.context.soundroom.sequencer.selectedScene,0);assert.equal(p.events.filter(e=>e.type==='soundroom-queue').length,count);await p.click('seq-stop');
});

test('eight named scenes share one performance; pattern edits, repeats and song playback stay independent',async()=>{
 const p=await page();const scene=async index=>p.ids.get('scene-buttons').onclick({target:{closest:()=>({dataset:{scene:String(index)}})}});
 assert.equal(p.context.soundroom.sequencer.sceneCount,8);assert.deepEqual(Array.from(p.context.soundroom.sequencer.sceneBars),Array(8).fill(4));
 await p.click('enable');await p.change('performance-name','My eight sounds');await p.change('scene-name','Nebula & <Dawn>');await p.change('seq-bars','1');
 await p.click('seq-record');const start=p.events.filter(e=>e.type==='soundroom-start').at(-1);p.audio.currentTime=start.origin;await p.fire('keydown','KeyA');p.audio.currentTime+=.2;await p.fire('keyup','KeyA');await p.click('seq-stop');
 await p.click('scene-copy');await scene(1);assert.equal(p.context.soundroom.sequencer.noteCounts[0],1);await p.change('scene-name','The chorus');await p.change('seq-bars','2');
 p.ids.get('mixer-strips').oninput({target:{closest:s=>s==='[data-mix-param]'?{dataset:{mixParam:'pan'},value:'25'}:{dataset:{mixTrack:'0'}}}});
 await p.click('seq-clear-track');await scene(0);assert.equal(p.context.soundroom.sequencer.noteCounts[0],1);assert.match(p.ids.get('scene-buttons').innerHTML,/Nebula &amp; &lt;Dawn&gt;/);
 p.ids.get('song-add-scene').value='0';await p.click('song-add');p.ids.get('song-add-scene').value='1';await p.click('song-add');
 await p.click('seq-save');let saved=parseProject(await p.downloads.at(-1).text());assert.equal(saved.performanceName,'My eight sounds');assert.equal(saved.tracks[0].pan,25);assert.equal(saved.scenes[1].tracks[0].notes.length,0);assert.equal(saved.scenes[0].tracks[0].notes.length,1);
 const first=saved.song[0];await p.change('song-selected-entry',first.id);await p.change('song-entry-repeats','2');
 p.context.document.querySelectorAll('[data-workspace-choice]').find(b=>b.dataset.workspaceChoice==='song').onclick();await p.click('seq-play');const song=p.events.filter(e=>e.type==='soundroom-start').at(-1);assert.equal(song.score.length,16);assert.equal(song.score.loop,false);assert.equal(song.score.events.filter(e=>e.message?.[0]===152).length,2);await p.click('seq-stop');
 p.ids.get('export-source').value='arrangement';await p.click('export-midi');assert.equal(Buffer.from(await p.downloads.at(-1).arrayBuffer()).subarray(0,4).toString(),'MThd');
 await p.click('seq-save');saved=parseProject(await p.downloads.at(-1).text());const reopened=await page(new Map([[recovery.RECOVERY_KEY,JSON.stringify({format:'soundroom-recovery',savedAt:new Date().toISOString(),project:saved})]]));assert.equal(reopened.context.soundroom.sequencer.sceneCount,8);assert.equal(reopened.ids.get('performance-name').value,'My eight sounds');
});

test('autosave recovers a recorded session and Previous session survives New',async()=>{
 const p=await page();await p.change('seq-name','Recovered music');await p.click('enable');await p.click('seq-record');const start=p.events.filter(e=>e.type==='soundroom-start').at(-1);p.audio.currentTime=start.origin+.1;await p.fire('keydown','KeyA');p.audio.currentTime+=.2;await p.fire('keyup','KeyA');await p.click('seq-stop');p.advance(1000);
 assert.equal(model.bindProject(JSON.parse(p.storage.get(recovery.RECOVERY_KEY)).project).tracks[0].notes.length,1);
 const reopened=await page(p.storage);assert.equal(reopened.ids.get('seq-name').value,'Recovered music');assert.equal(reopened.context.soundroom.sequencer.noteCounts[0],1);assert.match(reopened.ids.get('autosave-status').textContent,/Recovered/);
 await reopened.click('seq-new');reopened.advance(1000);assert.equal(model.bindProject(JSON.parse(p.storage.get(recovery.RECOVERY_KEY)).project).tracks[0].notes.length,0);await reopened.click('recovery-previous');assert.equal(reopened.context.soundroom.sequencer.noteCounts[0],1);assert.equal(reopened.ids.get('seq-name').value,'Recovered music');
});

test('scene selection queues during playback, follows the audible boundary, and cannot redirect a recording take',async()=>{
 const p=await page();await p.click('enable');await p.change('seq-bars','1');await p.click('seq-play');
 const scene=index=>p.ids.get('scene-buttons').onclick({target:{closest:()=>({dataset:{scene:String(index)}})}}),start=p.events.filter(e=>e.type==='soundroom-start').at(-1);
 p.audio.currentTime=start.origin+.2;await scene(2);let queued=p.events.filter(e=>e.type==='soundroom-queue').at(-1);assert.equal(queued.scene,2);assert.equal(queued.score.length,16);assert.equal(p.context.soundroom.sequencer.selectedScene,0);assert.equal(p.context.soundroom.sequencer.queuedScene,2);
 const boundary=start.origin+2.4;p.audio.getOutputTimestamp=()=>({contextTime:p.audio.currentTime-.12,performanceTime:p.context.performance.now()});p.advance(1000);
 p.receive({type:'soundroom-scene-switched',runId:start.runId,queueId:queued.queueId,scene:2,origin:boundary});assert.equal(p.context.soundroom.sequencer.selectedScene,0);
 p.audio.currentTime=boundary+.121;p.receive({type:'soundroom-position',runId:start.runId,playing:true});assert.equal(p.context.soundroom.sequencer.selectedScene,2);assert.equal(p.context.soundroom.sequencer.origin,boundary);assert.equal(p.context.soundroom.sequencer.queuedScene,null);
 await scene(5);assert.equal(p.ids.has('scene-cancel'),false);assert.equal(p.context.soundroom.sequencer.queuedScene,5);assert.equal(p.events.filter(e=>e.type==='soundroom-queue').some(e=>e.cancel),false);await p.click('seq-stop');
 await p.click('seq-record');const count=p.events.filter(e=>e.type==='soundroom-queue').length;await scene(4);assert.equal(p.context.soundroom.sequencer.selectedScene,2);assert.equal(p.events.filter(e=>e.type==='soundroom-queue').length,count);assert.match(p.ids.get('studio-status').textContent,/Finish the take/);await p.click('seq-stop');
});

test('drum step entry, velocity changes and drawn expression data save, undo and reach playback',async()=>{
 const p=await page();await p.click('enable');p.ids.get('track-list').onclick({target:{closest:s=>s==='[data-track]'?{dataset:{track:'7'}}:{dataset:{action:'select'}}}});
 const hit={target:{closest:s=>s==='[data-drum-step]'?{dataset:{drumPitch:'36',drumStep:'0'}}:null}};
 await p.ids.get('drum-grid').onclick(hit);await p.click('seq-save');let saved=parseProject(await p.downloads.at(-1).text());assert.equal(saved.tracks[7].notes[0].pitch,36);assert.equal(saved.tracks[7].notes[0].start,0);
 await p.change('drum-velocity','53');await p.click('seq-save');saved=parseProject(await p.downloads.at(-1).text());assert.equal(saved.tracks[7].notes[0].velocity,53);
 const surface=p.ids.get('lane-surface'),pointer=(beat,y)=>({pointerId:2,button:0,clientX:beat*56,clientY:y,preventDefault(){},target:{closest:()=>null}});
 await p.change('expression-lane','bend');surface.listeners.pointerdown(pointer(1.25,4));surface.listeners.pointerup(pointer(1.25,4));await p.click('seq-save');saved=parseProject(await p.downloads.at(-1).text());assert.ok(saved.tracks[7].controllers.some(c=>c.type==='bend'&&c.beat===1.25&&c.value===16383));
 await p.click('seq-play');const score=p.events.filter(e=>e.type==='soundroom-start').at(-1).score;assert.ok(score.events.some(e=>e.beat===1.25&&e.message[0]===239&&e.message[1]===127&&e.message[2]===127));await p.click('seq-stop');
 await p.click('seq-undo');await p.click('seq-save');saved=parseProject(await p.downloads.at(-1).text());assert.equal(saved.tracks[7].controllers.length,0);assert.equal(saved.tracks[7].notes[0].velocity,53);
});

test('keyboard notes, Stop, sustain and effects work after removing the arpeggiator',async()=>{
  const p=await page();
  await p.click('enable'); assert.equal(p.context.soundroom.ready,true);
  await p.fire('keydown','KeyA'); await p.fire('keydown','KeyD');
  assert.deepEqual(p.events.filter(e=>e.type==='on').map(e=>[e.ch,e.n]),[[0,48],[0,52]]);
  await p.fire('keyup','KeyA');
  assert.equal(p.context.soundroom.activeNotes.length,1);
  await p.click('sustain');assert.equal(p.ids.get('sustain').getAttribute('aria-pressed'),'true');
  await p.click('stop');assert.equal(p.context.soundroom.activeNotes.length,0);
  assert.equal(p.ids.get('sustain').getAttribute('aria-pressed'),'false');
  const count=p.events.length;p.advance(2000);assert.equal(p.events.length,count);
  await p.click('delay-toggle');assert.equal(p.context.soundroom.effects.delayEnabled,true);
  p.ids.get('delay-time').value='110';p.ids.get('delay-time').oninput();assert.equal(p.ids.get('delay-time-value').textContent,'750 ms');
  await p.click('effects-reset');assert.equal(p.context.soundroom.effects.delayEnabled,false);
  assert.equal([...p.ids.keys()].some(id=>id.startsWith('arp-')),false);
  assert.equal(p.ids.has('part-0'),false);assert.equal(p.ids.has('split-point'),false);
});

test('externally monitored MIDI overdubs retain physical input timestamps through output latency and delayed delivery',async()=>{
 const p=await page();await p.click('enable');await p.change('seq-record-grid','off');p.advance(10000);
 p.audio.getOutputTimestamp=()=>({contextTime:p.audio.currentTime-.12,performanceTime:p.context.performance.now()});
 const starts=[];
 for(let track=0;track<3;track++){
  p.ids.get('track-list').onclick({target:{closest:s=>s==='[data-track]'?{dataset:{track:String(track)}}:{dataset:{action:'arm'}}}});
  p.ids.get('track-monitor').checked=false;p.ids.get('track-monitor').onchange();
  p.faults.deferStart=track===1;await p.click('seq-record');
  const start=p.events.filter(e=>e.type==='soundroom-start').at(-1);starts.push(start);assert.equal(start.score.countIn,4);
  for(const beat of [.137,1.25,3.5]){
   const jitter=.035+track*.08;
   p.audio.currentTime=start.origin+beat*.6+.12+jitter;p.context.handleMIDI({id:'keyboard'},[0x90,60,91],p.context.performance.now()-jitter*1000);
   p.audio.currentTime+=.3;p.context.handleMIDI({id:'keyboard'},[0x80,60,0],p.context.performance.now()-jitter*1000);
  }
  if(p.faults.deferStart)p.ackStart();await p.click('seq-stop');
  p.audio.currentTime+=2;p.advance(100);
 }
 await p.click('seq-save');const saved=parseProject(await p.downloads.at(-1).text());
 for(const track of saved.tracks.slice(0,3)){
  assert.equal(track.notes.length,3);track.notes.forEach((n,i)=>{assert.ok(Math.abs(n.start-[.137,1.25,3.5][i])<1e-9);assert.ok(Math.abs(n.duration-.5)<1e-9)});
 }
 p.faults.deferStart=false;await p.click('seq-play');assert.equal(p.events.filter(e=>e.type==='soundroom-start').at(-1).score.countIn,0);
 p.receive({type:'soundroom-position',runId:starts[0].runId,beat:32,playing:false});p.advance(10);
 assert.equal(p.context.soundroom.sequencer.playing,true,'old completion messages cannot stop the new playback');
 await p.click('seq-stop');p.ackStart();assert.equal(p.context.soundroom.sequencer.playing,false,'a late acknowledgment cannot restart a stopped take');
});


test('only the bundled GeneralUser bank is offered and failed downloads can be retried',async()=>{
 const p=await page();for(const id of ['soundfont-select','soundfont-panel','loadfont','fontfile'])assert.equal(p.ids.has(id),false);
 p.faults.download=true;await p.click('enable');assert.equal(p.context.soundroom.ready,false);
 p.faults.download=false;await p.click('enable');assert.equal(p.context.soundroom.ready,true);
 assert.equal(p.context.soundroom.soundFont,'generaluser');assert.equal(p.context.soundroom.presetCount,269);
 assert.deepEqual(p.events.filter(e=>e.type==='bank-add').map(e=>e.id),['generaluser']);
 await p.fire('keydown','KeyA');assert.equal(p.context.soundroom.activeNotes.length,1);await p.fire('keyup','KeyA');
 assert.equal(p.context.soundroom.activeNotes.length,0);
});

test('real page records on an armed track, quantizes reversibly, saves and reopens the complete project',async()=>{
 const p=await page();await p.click('enable');await p.change('seq-record-grid','off');
 p.ids.get('track-list').onclick({target:{closest:s=>s==='[data-track]'?{dataset:{track:'2'}}:{dataset:{action:'arm'}}}});
 assert.equal(p.context.soundroom.sequencer.selectedTrack,2);assert.equal(p.context.soundroom.sequencer.armedTrack,2);
 await p.click('seq-record');const start=p.events.find(e=>e.type==='soundroom-start');assert.ok(start);
 p.audio.currentTime=start.origin+.137*.6;await p.fire('keydown','KeyD');
 p.audio.currentTime=start.origin+.737*.6;await p.fire('keyup','KeyD');await p.click('seq-stop');
 assert.equal(p.context.soundroom.sequencer.noteCounts[2],1);assert.equal(p.context.soundroom.activeNotes.length,0);
 await p.click('seq-save');let saved=parseProject(await p.downloads.at(-1).text());
 assert.ok(Math.abs(saved.tracks[2].notes[0].start-.137)<1e-10);assert.equal(saved.tracks[2].notes[0].pitch,52);assert.equal(saved.recordGrid,'off');
 await p.click('seq-quantize');await p.click('seq-save');saved=parseProject(await p.downloads.at(-1).text());assert.equal(saved.tracks[2].notes[0].start,.25);
 await p.click('seq-restore');await p.click('seq-save');saved=parseProject(await p.downloads.at(-1).text());assert.ok(Math.abs(saved.tracks[2].notes[0].start-.137)<1e-10);
 await p.click('seq-new');assert.deepEqual(Array.from(p.context.soundroom.sequencer.noteCounts),Array(8).fill(0));
 p.ids.get('seq-file').files=[{size:2000,text:async()=>JSON.stringify(saved)}];await p.ids.get('seq-file').onchange();
 assert.equal(p.context.soundroom.sequencer.noteCounts[2],1);assert.equal(p.context.soundroom.sequencer.selectedTrack,2);
 assert.equal(p.ids.get('seq-record-grid').value,'off','opening a saved project preserves its chosen recording mode');
 await p.click('seq-play');assert.equal(p.context.soundroom.sequencer.playing,true);await p.click('stop');assert.equal(p.context.soundroom.sequencer.playing,false);
});

test('the real recording controls default to sixteenths and capture an early beat one before start acknowledgment',async()=>{
 const p=await page();await p.click('enable');assert.equal(p.ids.get('seq-record-grid').value,'1/16');
 p.faults.deferStart=true;await p.click('seq-record');const start=p.events.filter(e=>e.type==='soundroom-start').at(-1);
 p.audio.currentTime=start.origin-.04;p.context.handleMIDI({id:'keys'},[0x90,60,92]);
 p.audio.currentTime=start.origin+.26;p.context.handleMIDI({id:'keys'},[0x80,60,0]);p.ackStart();
 p.audio.currentTime=start.origin+.37*.6;await p.fire('keydown','KeyD');p.audio.currentTime+=.24;await p.fire('keyup','KeyD');
 await p.click('seq-stop');await p.click('seq-save');let saved=parseProject(await p.downloads.at(-1).text());
 assert.equal(saved.tracks[0].notes.length,2);assert.equal(saved.tracks[0].notes[0].start,0);assert.equal(saved.tracks[0].notes[0].velocity,92);assert.ok(Math.abs(saved.tracks[0].notes[0].duration-.5)<1e-10);
 assert.equal(saved.tracks[0].notes[1].start,.25);
 p.faults.deferStart=false;await p.change('seq-record-grid','off');await p.click('seq-record');const next=p.events.filter(e=>e.type==='soundroom-start').at(-1);
 p.audio.currentTime=next.origin-.015;await p.fire('keydown','KeyA');p.audio.currentTime+=.24;await p.fire('keyup','KeyA');
 await p.click('seq-stop');await p.click('seq-save');saved=parseProject(await p.downloads.at(-1).text());assert.equal(saved.tracks[0].notes.at(-1).start,0);assert.equal(saved.recordGrid,'off');
 await p.click('seq-new');assert.equal(p.ids.get('seq-record-grid').value,'1/16');
});

test('piano-roll gestures preserve free timing, resize and undo; mixer and MIDI affect the correct track',async()=>{
 const p=await page();await p.click('enable');
 p.ids.get('seq-snap').checked=false;p.ids.get('seq-snap').onchange();
 const roll=p.ids.get('roll-surface');
 const pointer=(beat,pitch,id=null,resize=false)=>({pointerId:1,button:0,clientX:70+beat*56,clientY:28+(127-pitch)*24+10,preventDefault(){},target:{closest:s=>s==='[data-note-id]'&&id?{dataset:{noteId:id}}:s==='.resize-note'&&resize?{}:null}});
 roll.listeners.pointerdown(pointer(.137,60));roll.listeners.pointerup(pointer(.137,60));
 await p.click('seq-save');let saved=parseProject(await p.downloads.at(-1).text()),n=saved.tracks[0].notes[0];
 assert.ok(Math.abs(n.start-.137)<1e-10);assert.equal(n.pitch,60);assert.equal(n.duration,.25);
 roll.listeners.pointerdown(pointer(.137,60,n.id));roll.listeners.pointermove(pointer(.637,62));roll.listeners.pointerup(pointer(.637,62));
 await p.click('seq-save');saved=parseProject(await p.downloads.at(-1).text());n=saved.tracks[0].notes[0];
 assert.ok(Math.abs(n.start-.637)<1e-10);assert.equal(n.pitch,62);
 roll.listeners.pointerdown(pointer(.8,62,n.id,true));roll.listeners.pointermove(pointer(1.3,62));roll.listeners.pointerup(pointer(1.3,62));
 await p.click('seq-save');saved=parseProject(await p.downloads.at(-1).text());assert.ok(Math.abs(saved.tracks[0].notes[0].duration-.75)<1e-10);
 await p.click('seq-undo');await p.click('seq-save');saved=parseProject(await p.downloads.at(-1).text());assert.equal(saved.tracks[0].notes[0].duration,.25);
 p.ids.get('mixer-strips').oninput({target:{closest:s=>s==='[data-mix-param]'?{dataset:{mixParam:'pan'},value:'12'}:{dataset:{mixTrack:'3'}}}});
 assert.deepEqual(p.events.filter(e=>e.type==='cc'&&e.cc===10&&[3,11].includes(e.ch)).slice(-2).map(e=>[e.ch,e.value]),[[3,12],[11,12]]);
 await p.click('seq-save');saved=parseProject(await p.downloads.at(-1).text());assert.equal(saved.tracks[3].pan,12);
 p.ids.get('track-list').onclick({target:{closest:s=>s==='[data-track]'?{dataset:{track:'3'}}:{dataset:{action:'arm'}}}});
 await p.click('seq-record');const start=p.events.filter(e=>e.type==='soundroom-start').at(-1);p.audio.currentTime=start.origin+.123*.6;
 p.context.handleMIDI({id:'keyboard'},[0x90,67,93]);p.audio.currentTime+=.3;p.context.handleMIDI({id:'keyboard'},[0x80,67,0]);
 const before=p.events.length;p.context.handleMIDI({id:'keyboard'},[0xb0,121,0]);
 assert.ok(p.events.slice(before).filter(e=>['cc','bend','pressure'].includes(e.type)).every(e=>e.ch===3));
 await p.click('seq-stop');await p.click('seq-save');saved=parseProject(await p.downloads.at(-1).text());
 assert.equal(saved.tracks[3].notes[0].velocity,93);assert.equal(saved.tracks[3].notes[0].pitch,67);
 assert.ok(saved.tracks[3].controllers.some(c=>c.type==='bend'&&c.value===8192));
});


test('MIDI capture sends live releases first, appends only new events and paints notes outside the input callback',async()=>{
 const p=await page();await p.click('enable');p.context.document.querySelectorAll('[data-workspace-choice]').find(b=>b.dataset.workspaceChoice==='sequence').onclick();
 await p.change('seq-count-in','0');await p.click('seq-record');const origin=p.context.soundroom.sequencer.origin,roll=p.ids.get('roll-notes'),before=roll.innerHTML,tracks=p.ids.get('track-list').innerHTML;
 p.audio.currentTime=origin+.2*.6;p.context.handleMIDI({id:'keyboard'},[0x90,60,96]);
 p.audio.currentTime+=.01;p.context.handleMIDI({id:'keyboard'},[0x80,60,0]);
 const appendIndex=p.events.findIndex(e=>e.type==='soundroom-append');assert.ok(appendIndex>0);assert.equal(p.events[appendIndex-1].type,'off','live release must not wait for recording work');
 assert.equal(p.events[appendIndex].events.length,2);assert.equal(p.events[appendIndex].events[0].firstCycle,1);
 assert.equal(roll.innerHTML,before);assert.equal(p.ids.get('track-list').innerHTML,tracks,'no synchronous track rebuild');
 p.advance(50);assert.match(roll.innerHTML,/C4/,'recorded note is painted later');assert.equal(p.ids.get('track-list').innerHTML,tracks);
 for(let i=0;i<100;i++)p.context.handleMIDI({id:'keyboard'},[0xb0,1,i%128]);
 assert.equal(p.events.filter(e=>e.type==='soundroom-score').length,0,'expression must never resend the full pattern');
 assert.ok(p.events.filter(e=>e.type==='soundroom-append').every(e=>e.events.length<=2));
 const savedBefore=p.storage.get(recovery.RECOVERY_KEY);p.advance(1000);assert.equal(p.storage.get(recovery.RECOVERY_KEY),savedBefore,'large autosaves wait until the take stops');
 const appends=p.events.filter(e=>e.type==='soundroom-append').length;await p.click('seq-stop');assert.equal(recovery.readRecovery({getItem:key=>p.storage.get(key)}).project.scenes[0].tracks[0].notes.length,1,'completed take is autosaved');p.advance(1000);assert.equal(p.events.filter(e=>e.type==='soundroom-append').length,appends,'stopped takes cannot append late events');
});

test('MIDI recording adjustment precedes quantization, preserves durations and controllers, and never moves transport or computer keys',async()=>{
 const storage=new Map(),p=await page(storage);await p.click('enable');await p.change('seq-count-in','0');await p.change('midi-record-adjustment','-40');p.advance(10000);p.ids.get('track-monitor').checked=false;p.ids.get('track-monitor').onchange();
 for(const grid of ['off','1/16']){
  await p.change('seq-record-grid',grid);await p.click('seq-record');const origin=p.context.soundroom.sequencer.origin;
  assert.equal(p.ids.get('midi-record-adjustment').disabled,true);
  // The MIDI device delivers a consistently late input plus variable handler delay.
  p.audio.currentTime=origin+.36*.6+.04+.025;
  p.context.handleMIDI({id:'keyboard'},[0x90,60,96],p.context.performance.now()-25);
  p.audio.currentTime=origin+.36*.6+.04;p.context.handleMIDI({id:'keyboard'},[0xb0,64,127]);
  p.audio.currentTime+=.18;p.context.handleMIDI({id:'keyboard'},[0x80,60,0]);
  assert.equal(p.context.soundroom.sequencer.origin,origin);
  await p.click('seq-stop');assert.equal(p.ids.get('midi-record-adjustment').disabled,false);
 }
 await p.click('seq-save');const saved=parseProject(await p.downloads.at(-1).text());
 assert.ok(Math.abs(saved.tracks[0].notes[0].duration-.3)<1e-9);assert.ok(Math.abs(saved.tracks[0].notes[0].start-.36)<1e-9);
 assert.equal(saved.tracks[0].notes[1].start,.25);assert.ok(Math.abs(saved.tracks[0].notes[1].original.start-.36)<1e-9);
 assert.ok(saved.tracks[0].controllers.filter(c=>c.controller===64&&c.value===127).every(c=>Math.abs(c.beat-.36)<1e-9));
 await p.change('seq-record-grid','off');await p.click('seq-record');const origin=p.context.soundroom.sequencer.origin;p.audio.currentTime=origin+.3;await p.fire('keydown','KeyA');p.audio.currentTime+=.3;await p.fire('keyup','KeyA');await p.click('seq-stop');await p.click('seq-save');
 assert.ok(Math.abs(parseProject(await p.downloads.at(-1).text()).tracks[0].notes.at(-1).start-.5)<1e-9);
 const reopened=await page(storage);assert.equal(+reopened.ids.get('midi-record-adjustment').value,-40);await reopened.click('midi-adjustment-reset');assert.equal(+reopened.ids.get('midi-record-adjustment').value,0);
});

test('monitored MIDI recordings reproduce the heard timing despite output latency, input delay and delayed receipts',async()=>{
 const p=await page();await p.click('enable');await p.change('seq-count-in','0');await p.change('seq-record-grid','off');p.advance(10000);
 const beats=[.137,1.25,3.5];
 for(let track=0;track<3;track++){
  p.ids.get('track-list').onclick({target:{closest:s=>s==='[data-track]'?{dataset:{track:String(track)}}:{dataset:{action:'arm'}}}});
  const latency=[.02,.12,.2][track],delivery=.03+track*.04;p.faults.inputDelay=.004+track*.002;p.faults.deferInput=true;
  p.audio.getOutputTimestamp=()=>({contextTime:p.audio.currentTime-latency,performanceTime:p.context.performance.now()});
  await p.click('seq-record');const origin=p.context.soundroom.sequencer.origin;
  for(const beat of beats){
   // Arrange for the LIVE voice to reach the rendering frame at this beat.
   // Its original keypress happened earlier, before UI and output buffering.
   p.audio.currentTime=origin+beat*.6-p.faults.inputDelay;p.context.handleMIDI({id:'keyboard'},[0x90,60,96],p.context.performance.now()-delivery*1000);
   p.audio.currentTime+=.18;p.context.handleMIDI({id:'keyboard'},[0x80,60,0],p.context.performance.now()-(delivery+0.017)*1000);
  }
  p.audio.currentTime+=.25;p.advance(350);p.ackInput();await p.click('seq-stop');
 }
 await p.click('seq-save');const saved=parseProject(await p.downloads.at(-1).text());
 for(const t of saved.tracks.slice(0,3)){assert.equal(t.notes.length,3);for(const [i,n] of t.notes.entries()){assert.ok(Math.abs(n.start-beats[i])<1e-9,'saved onset must match the live voice, not the earlier keypress');assert.ok(Math.abs(n.duration-.3)<1e-9)}}
 await p.click('seq-play');const score=p.events.findLast(e=>e.type==='soundroom-start').score;
 for(let ch=8;ch<11;ch++){const on=score.events.filter(e=>e.message?.[0]===0x90+ch);assert.deepEqual(Array.from(on,e=>Number(e.beat.toFixed(3))),beats)}
});

test('quantization uses monitored audio time and the optional correction applies once to notes and expression',async()=>{
 const p=await page();await p.click('enable');await p.change('seq-count-in','0');p.advance(10000);
 p.audio.getOutputTimestamp=()=>({contextTime:p.audio.currentTime-.12,performanceTime:p.context.performance.now()});
 await p.click('seq-record');let origin=p.context.soundroom.sequencer.origin;
 // At 100 BPM the physical-key clock would move .14 beat back to zero.
 p.audio.currentTime=origin+.14*.6;p.context.handleMIDI({id:'keyboard'},[0x90,60,96],p.context.performance.now()-30);
 p.audio.currentTime+=.12;p.context.handleMIDI({id:'keyboard'},[0x80,60,0],p.context.performance.now()-40);await p.click('seq-stop');
 await p.change('seq-record-grid','off');await p.change('midi-record-adjustment','-30');await p.click('seq-record');origin=p.context.soundroom.sequencer.origin;
 p.audio.currentTime=origin+.6;p.context.handleMIDI({id:'keyboard'},[0x90,64,96]);p.context.handleMIDI({id:'keyboard'},[0xe0,0,80]);p.context.handleMIDI({id:'keyboard'},[0xb0,64,127]);
 p.audio.currentTime+=.12;p.context.handleMIDI({id:'keyboard'},[0x80,64,0]);await p.click('seq-stop');await p.click('seq-save');
 const saved=parseProject(await p.downloads.at(-1).text()),notes=saved.tracks[0].notes;
 assert.equal(notes[0].start,.25);assert.ok(Math.abs(notes[0].original.start-.14)<1e-9);
 assert.ok(Math.abs(notes[1].start-.95)<1e-9);assert.ok(Math.abs(notes[1].duration-.2)<1e-9);
 assert.ok(saved.tracks[0].controllers.filter(c=>c.type==='bend'||c.controller===64&&c.value===127).every(c=>Math.abs(c.beat-.95)<1e-9));
});

test('Stop drains delayed audio captures, including before the start receipt, and blocks Save or a new take until finished',async()=>{
 const p=await page();await p.click('enable');await p.change('seq-count-in','0');await p.change('seq-record-grid','off');p.faults.deferInput=true;p.faults.deferStop=true;p.faults.deferStart=true;
 await p.click('seq-record');const start=p.events.findLast(e=>e.type==='soundroom-start');p.audio.currentTime=start.origin+.15;p.context.handleMIDI({id:'keyboard'},[0x90,60,96]);p.audio.currentTime+=.18;p.context.handleMIDI({id:'keyboard'},[0x80,60,0]);
 await p.click('seq-stop');assert.equal(p.context.soundroom.sequencer.finishing,true);assert.equal(p.ids.get('seq-save').disabled,true);const downloads=p.downloads.length;await p.click('seq-save');assert.equal(p.downloads.length,downloads);
 await p.click('seq-record');assert.equal(p.events.filter(e=>e.type==='soundroom-start').length,1);
 p.advance(400);p.ackInput();assert.equal(p.context.soundroom.sequencer.finishing,true);p.ackStop();assert.equal(p.context.soundroom.sequencer.finishing,false);assert.equal(p.ids.get('seq-save').disabled,false);
 await p.click('seq-save');const saved=parseProject(await p.downloads.at(-1).text());assert.equal(saved.tracks[0].notes.length,1);assert.ok(Math.abs(saved.tracks[0].notes[0].start-.25)<1e-9);assert.ok(Math.abs(saved.tracks[0].notes[0].duration-.3)<1e-9);
 p.receive({type:'soundroom-input-recorded',runId:start.runId,inputId:999,method:'noteOn',args:['old',72,90],time:start.origin+.3});assert.equal(p.context.soundroom.sequencer.noteCounts[0],1,'late old input cannot reopen a take');
});

test('an unresponsive audio thread cannot permanently lock a recorded take',async()=>{
 const p=await page();await p.click('enable');await p.change('seq-count-in','0');await p.change('seq-record-grid','off');p.faults.deferInput=true;p.faults.deferStop=true;
 await p.click('seq-record');const origin=p.context.soundroom.sequencer.origin;p.audio.currentTime=origin+.3;p.context.handleMIDI({id:'keyboard'},[0x90,60,90]);p.audio.currentTime+=.3;p.context.handleMIDI({id:'keyboard'},[0x80,60,0]);await p.click('seq-stop');p.advance(5000);
 assert.equal(p.context.soundroom.sequencer.finishing,false);assert.equal(p.context.soundroom.sequencer.noteCounts[0],1);assert.match(p.ids.get('studio-status').textContent,/estimated/);assert.equal(p.ids.get('seq-save').disabled,false);
});

test('step recording enters a chord once, supports tie/rest/back and Undo, and cancels on transport or navigation',async()=>{
 const p=await page();p.context.document.querySelectorAll('[data-workspace-choice]').find(b=>b.dataset.workspaceChoice==='sequence').onclick();await p.click('step-toggle');assert.equal(p.context.soundroom.sequencer.stepEnabled,true);
 await p.fire('keydown','KeyA');await p.fire('keydown','KeyD');await p.fire('keyup','KeyA');assert.equal(p.context.soundroom.sequencer.noteCounts[0],0);assert.equal(p.ids.get('step-rest').disabled,true);
 await p.fire('keyup','KeyD');assert.equal(p.context.soundroom.sequencer.noteCounts[0],2);assert.equal(p.context.soundroom.sequencer.stepCursor,.25);
 await p.click('step-tie');assert.equal(p.context.soundroom.sequencer.stepCursor,.5);await p.click('seq-save');let saved=parseProject(await p.downloads.at(-1).text());assert.deepEqual(saved.tracks[0].notes.map(n=>[n.start,n.duration]),[[0,.5],[0,.5]]);
 await p.click('seq-undo');assert.equal(p.context.soundroom.sequencer.stepCursor,.25);await p.click('seq-save');saved=parseProject(await p.downloads.at(-1).text());assert.equal(saved.tracks[0].notes[0].duration,.25);
 await p.click('step-rest');assert.equal(p.context.soundroom.sequencer.stepCursor,.5);await p.click('step-back');assert.equal(p.context.soundroom.sequencer.stepCursor,.25);
 await p.change('step-length','1/8');await p.fire('keydown','KeyF');await p.change('nav-track','1');await p.fire('keyup','KeyF');assert.equal(p.context.soundroom.sequencer.stepEnabled,false);assert.equal(p.context.soundroom.sequencer.noteCounts[0],2);assert.equal(p.context.soundroom.sequencer.noteCounts[1],0);
 await p.click('step-toggle');await p.fire('keydown','KeyG');await p.click('seq-record');assert.equal(p.context.soundroom.sequencer.stepEnabled,false);assert.equal(p.context.soundroom.sequencer.recording,true);await p.click('seq-stop');assert.equal(p.context.soundroom.sequencer.noteCounts[1],0);
});

test('MIDI step recording keeps controller velocity and a precise cursor independent of delivery timing',async()=>{
 const port={id:'step-midi',name:'Step keyboard',type:'input',state:'connected',open:async()=>{}},p=await page(new Map(),async()=>({inputs:new Map([[port.id,port]])}));await p.click('midi-connect');p.context.document.querySelectorAll('[data-workspace-choice]').find(b=>b.dataset.workspaceChoice==='sequence').onclick();await p.click('step-toggle');
 await p.change('step-length','1/8T');port.onmidimessage({data:[0x90,60,43],timeStamp:1});port.onmidimessage({data:[0x90,67,121],timeStamp:50});p.audio.currentTime=100;port.onmidimessage({data:[0x80,60,0],timeStamp:900});assert.equal(p.context.soundroom.sequencer.noteCounts[0],0);port.onmidimessage({data:[0x80,67,0],timeStamp:920});
 await p.click('seq-save');const saved=parseProject(await p.downloads.at(-1).text());assert.deepEqual(saved.tracks[0].notes.map(n=>[n.pitch,n.velocity,n.start,n.duration]),[[60,43,0,1/3],[67,121,0,1/3]]);assert.equal(p.events.filter(e=>e.type==='soundroom-start').length,0);
});

test('performance presets persist, export/import, preserve song data, and Undo restores the prior effects and master',async()=>{
 const p=await page();await p.click('enable');await p.change('track-name','Ensemble');p.ids.get('shape-attack').value='90';p.ids.get('shape-attack').oninput();p.ids.get('volume').value='41';p.ids.get('volume').oninput();p.ids.get('reverb-decay').value='92';p.ids.get('reverb-decay').oninput();
 p.ids.get('preset-name').value='Warm ensemble';await p.click('preset-save');assert.match(p.ids.get('preset-status').textContent,/Saved/);await p.click('preset-export');const file=p.downloads.at(-1),preset=JSON.parse(await file.text());assert.equal(preset.name,'Warm ensemble');assert.equal(preset.tracks[0].shape.attack,90);assert.equal(preset.master,41);
 await p.change('track-name','Other instrument');p.ids.get('volume').value='78';p.ids.get('volume').oninput();p.ids.get('reverb-decay').value='38';p.ids.get('reverb-decay').oninput();await p.click('song-add');await p.click('seq-record');p.audio.currentTime=p.context.soundroom.sequencer.origin+.1;await p.fire('keydown','KeyA');p.audio.currentTime+=.2;await p.fire('keyup','KeyA');await p.click('seq-stop');await p.click('seq-save');const before=parseProject(await p.downloads.at(-1).text());
 await p.click('preset-load');await p.click('seq-save');let after=parseProject(await p.downloads.at(-1).text());assert.equal(after.tracks[0].name,'Ensemble');assert.equal(after.effects.reverbDecay,92);assert.equal(after.master,41);assert.deepEqual(after.scenes,before.scenes);assert.deepEqual(after.song,before.song);
 await p.click('seq-undo');await p.click('seq-save');after=parseProject(await p.downloads.at(-1).text());assert.equal(after.tracks[0].name,'Other instrument');assert.equal(after.effects.reverbDecay,38);assert.equal(after.master,78);assert.deepEqual(after.scenes,before.scenes);
 const reopened=await page(p.storage);assert.equal(reopened.ids.get('preset-select').children[0].textContent,'Warm ensemble');reopened.ids.get('preset-file').files=[file];await reopened.ids.get('preset-file').onchange();assert.equal(JSON.parse(p.storage.get('soundroom-performances-v1')).length,2);await reopened.click('preset-delete');assert.equal(JSON.parse(p.storage.get('soundroom-performances-v1')).length,1);await reopened.click('preset-undo-delete');assert.equal(JSON.parse(p.storage.get('soundroom-performances-v1')).length,2);
 const stored=p.storage.get('soundroom-performances-v1');reopened.ids.get('preset-file').files=[new Blob(['{"format":"wrong"}'])];await reopened.ids.get('preset-file').onchange();assert.equal(p.storage.get('soundroom-performances-v1'),stored);assert.match(reopened.ids.get('preset-status').textContent,/Could not import/);
});

test('Play track strip selects, arms and mutes the same shared tracks without resetting transport',async()=>{
 const p=await page();await p.click('enable');const action=(track,action)=>p.ids.get('play-track-strip').onclick({target:{closest:s=>s==='[data-track]'?{dataset:{track:String(track)}}:{dataset:{action}}}});
 action(2,'select');assert.equal(p.context.soundroom.sequencer.selectedTrack,2);action(2,'arm');assert.equal(p.context.soundroom.sequencer.armedTrack,2);await p.click('seq-play');const origin=p.context.soundroom.sequencer.origin;action(3,'arm');assert.equal(p.context.soundroom.sequencer.armedTrack,2);action(1,'mute');assert.equal(p.context.soundroom.sequencer.origin,origin);assert.equal(p.events.findLast(e=>e.type==='soundroom-start').origin,origin);await p.click('seq-stop');await p.click('seq-save');const saved=parseProject(await p.downloads.at(-1).text());assert.equal(saved.tracks[1].mute,true);assert.match(p.ids.get('play-track-strip').innerHTML,/play-meter-7/);
});

test('visual song timeline edits and drag reorder survive Undo and follow song playback positions',async()=>{
 const p=await page();await p.change('scene-name','Verse');await p.click('song-add');p.ids.get('song-add-scene').value='1';await p.click('song-add');await p.click('song-entry-duplicate');await p.change('song-entry-repeats','2');await p.click('song-entry-earlier');await p.click('seq-save');let saved=parseProject(await p.downloads.at(-1).text());assert.deepEqual(saved.song.map(x=>[x.scene,x.repeats]),[[0,2],[0,1],[1,1]]);assert.match(p.ids.get('song-timeline-blocks').innerHTML,/Verse/);
 const surface=p.ids.get('song-timeline-blocks'),id=saved.song[0].id;surface.listeners.pointerdown({button:0,pointerId:4,preventDefault(){},target:{closest:()=>({dataset:{songDrag:id}})}});surface.listeners.pointermove({pointerId:4,clientX:1599,preventDefault(){}});surface.listeners.pointerup({pointerId:4});await p.click('seq-save');saved=parseProject(await p.downloads.at(-1).text());assert.deepEqual(saved.song.map(x=>x.repeats),[1,1,2]);await p.click('seq-undo');await p.click('seq-save');saved=parseProject(await p.downloads.at(-1).text());assert.deepEqual(saved.song.map(x=>x.repeats),[2,1,1]);
 p.context.document.querySelectorAll('[data-workspace-choice]').find(b=>b.dataset.workspaceChoice==='song').onclick();await p.click('seq-play');const seq=p.context.soundroom.sequencer;assert.equal(seq.songPlaying,true);assert.equal(p.ids.get('song-entry-duplicate').disabled,true);p.audio.currentTime=seq.origin+16*60/100;p.receive({type:'soundroom-position',runId:p.events.findLast(e=>e.type==='soundroom-start').runId,playing:true});assert.equal(p.ids.get('song-timeline-playhead').hidden,false);assert.equal(p.ids.get('song-timeline-playhead').style.left,'25%');await p.click('seq-stop');assert.equal(p.ids.get('song-timeline-playhead').hidden,true);
});

test('workspace drawers consolidate settings without interrupting held notes, transport or workspace',async()=>{
 const p=await page();await p.click('enable');await p.click('seq-play');await p.fire('keydown','KeyA');const origin=p.context.soundroom.sequencer.origin;
 await p.click('open-settings');assert.equal(p.ids.get('settings-drawer').hidden,false);assert.equal(p.ids.get('lcd-midi-page').hidden,false);await p.click('settings-tab-metronome');assert.equal(p.ids.get('lcd-midi-page').hidden,true);assert.equal(p.ids.get('metronome-options').hidden,false);
 await p.click('record-settings-open');assert.equal(p.ids.get('settings-drawer').hidden,true);assert.equal(p.ids.get('record-drawer').hidden,false);assert.equal(p.context.soundroom.sequencer.origin,origin);assert.equal(p.context.soundroom.activeNotes.length,1);
 await p.fire('keydown','Escape');assert.equal(p.ids.get('record-drawer').hidden,true);assert.equal(p.context.soundroom.sequencer.playing,true);assert.equal(p.context.soundroom.activeNotes.length,1);assert.equal(p.context.document.activeElement,p.ids.get('record-settings-open'));
 await p.click('scene-settings-open');assert.equal(p.ids.get('scene-drawer').hidden,false);p.context.document.querySelectorAll('[data-workspace-choice]').find(b=>b.dataset.workspaceChoice==='mixer').onclick();assert.equal(p.ids.get('scene-drawer').hidden,true);assert.equal(p.ids.get('scene-panel').hidden,true);assert.equal(p.ids.get('sequence-panel').hidden,true);assert.equal(p.context.soundroom.sequencer.origin,origin);
 await p.fire('keyup','KeyA');await p.click('seq-stop');
});

test('Pattern centers on notes when entering, changing parts or scenes, and preserves manual scrolling during edits',async()=>{
 const p=await page(),h=p.xrHost,scroll=p.ids.get('roll-scroll');scroll.clientHeight=330;scroll.scrollTop=0;scroll.scrollLeft=123;
 const view=id=>p.context.document.querySelectorAll('[data-workspace-choice]').find(b=>b.dataset.workspaceChoice===id).onclick(),editor=id=>p.context.document.querySelectorAll('[data-editor-choice]').find(b=>b.dataset.editorChoice===id).onclick();
 const visible=pitch=>{const y=28+(127-pitch)*24;assert.ok(y>=scroll.scrollTop+28&&y+24<=scroll.scrollTop+scroll.clientHeight,'MIDI '+pitch+' should be visible')};
 view('sequence');visible(60);assert.equal(scroll.scrollLeft,123);
 view('perform');h.edit({type:'note-add',pitch:40,start:0,duration:1,velocity:100});h.edit({type:'note-add',pitch:45,start:1,duration:1,velocity:100});view('sequence');visible(40);visible(45);
 scroll.scrollTop=500;h.edit({type:'note-add',pitch:43,start:2,duration:1,velocity:100});assert.equal(scroll.scrollTop,500);p.ids.get('seq-zoom').value='96';p.ids.get('seq-zoom').oninput();assert.equal(scroll.scrollTop,500);view('sequence');assert.equal(scroll.scrollTop,500);await p.click('roll-find-notes');visible(40);visible(45);assert.equal(scroll.scrollLeft,123);
 h.selectTrack(1);visible(60);h.edit({type:'note-add',pitch:95,start:0,duration:1,velocity:100});h.selectTrack(0);visible(40);h.selectTrack(1);visible(95);
 editor('drums');assert.equal(p.ids.get('roll-find-notes').hidden,true);scroll.scrollTop=500;h.selectTrack(0);assert.equal(scroll.scrollTop,500,'a hidden piano roll waits until it is shown');editor('piano');visible(40);assert.equal(p.ids.get('roll-find-notes').hidden,false);
 h.selectTrack(7);visible(42);h.selectTrack(0);await h.action({type:'scene',value:1});visible(60);await h.action({type:'scene',value:0});visible(40);
 h.edit({type:'note-add',pitch:120,start:3,duration:1,velocity:100});await p.click('roll-find-notes');visible(43);view('perform');scroll.scrollTop=0;view('sequence');visible(43);
});

test('Pattern shows one editor with contextual tools, optional step controls and an optional keyboard',async()=>{
 const p=await page(),view=id=>p.context.document.querySelectorAll('[data-workspace-choice]').find(b=>b.dataset.workspaceChoice===id).onclick(),editor=id=>p.context.document.querySelectorAll('[data-editor-choice]').find(b=>b.dataset.editorChoice===id).onclick();
 view('sequence');assert.equal(p.ids.get('track-overview').hidden,true);assert.equal(p.ids.get('piano-editor').hidden,false);assert.equal(p.ids.get('drum-editor').hidden,true);assert.equal(p.ids.get('step-controls').hidden,true);assert.equal(p.ids.get('play-station').hidden,true);
 editor('overview');assert.equal(p.ids.get('track-overview').hidden,false);assert.equal(p.ids.get('piano-editor').hidden,true);assert.equal(p.ids.get('roll-toolbar').hidden,true);editor('drums');assert.equal(p.ids.get('drum-editor').hidden,false);assert.equal(p.ids.get('piano-tools').hidden,true);editor('piano');await p.click('step-toggle');assert.equal(p.ids.get('step-controls').hidden,false);
 await p.fire('keydown','KeyA');await p.fire('keyup','KeyA');await p.click('track-settings-open');await p.click('inspector-tab-note');assert.equal(p.ids.get('inspector-drawer').hidden,false);assert.equal(p.ids.get('note-drawer').hidden,false);assert.match(p.ids.get('note-selection-summary').textContent,/1 selected/);await p.click('inspector-tab-edit');assert.equal(p.ids.get('note-drawer').hidden,true);await p.click('edit-tab-measures');assert.equal(p.ids.get('measure-tools').hidden,false);assert.equal(p.ids.get('quantize-tools').hidden,true);
 await p.click('pattern-keyboard-toggle');assert.equal(p.ids.get('play-station').hidden,false);editor('overview');assert.equal(p.context.soundroom.sequencer.stepEnabled,false);view('song');assert.equal(p.ids.get('sequence-panel').hidden,true);assert.equal(p.ids.get('inspector-drawer').hidden,true);assert.equal(p.ids.get('play-station').hidden,true);
});

test('Record settings summarize the armed track and Project Save/Export work without changing pages',async()=>{
 const p=await page();await p.change('seq-name','Night drive');await p.change('seq-record-mode','replace');await p.change('seq-record-grid','off');await p.change('seq-count-in','2');assert.equal(p.ids.get('project-title').textContent,'Night drive');assert.match(p.ids.get('record-summary').textContent,/Record over · Free timing · 2 bar/);
 await p.click('project-save');assert.equal(JSON.parse(await p.downloads.at(-1).text()).name,'Night drive');await p.click('seq-export');assert.equal(p.ids.get('export-drawer').hidden,false);assert.equal(p.context.document.body.dataset.workspace,'perform');assert.equal(p.ids.get('export-source').value,'tracks');await p.click('export-close');assert.equal(p.ids.get('export-drawer').hidden,true);
 await p.click('song-add');await p.change('song-entry-scene','2');await p.click('seq-save');assert.equal(JSON.parse(await p.downloads.at(-1).text()).song[0].scene,2);
 p.context.document.querySelectorAll('[data-workspace-choice]').find(b=>b.dataset.workspaceChoice==='song').onclick();await p.click('seq-export');assert.equal(p.ids.get('export-source').value,'arrangement');assert.equal(p.context.document.body.dataset.workspace,'song');
});

test('persistent BPM controls edit only the selected pattern, support Undo and follow the playing song',async()=>{
 const p=await page();await p.click('enable');const scene=index=>p.fire('keydown','Digit'+(index+1),{key:String(index+1)});
 await p.change('seq-bars','1');await p.change('seq-tempo','120');await p.click('tempo-up');assert.equal(+p.ids.get('seq-tempo').value,121);await p.click('seq-undo');assert.equal(+p.ids.get('seq-tempo').value,120);
 await scene(1);await p.change('seq-bars','1');await p.change('seq-tempo','60');await scene(0);assert.equal(+p.ids.get('seq-tempo').value,120);assert.match(p.ids.get('tempo-context').textContent,/Scene 1/);
 p.ids.get('song-add-scene').value='0';await p.click('song-add');p.ids.get('song-add-scene').value='1';await p.click('song-add');
 p.context.document.querySelectorAll('[data-workspace-choice]').find(b=>b.dataset.workspaceChoice==='song').onclick();await p.click('seq-play');const start=p.events.findLast(e=>e.type==='soundroom-start');assert.equal(p.ids.get('seq-tempo').disabled,true);assert.equal(p.ids.get('tempo-up').disabled,true);
 p.audio.currentTime=start.origin+2.5;p.receive({type:'soundroom-position',runId:start.runId,playing:true});assert.equal(+p.ids.get('seq-tempo').value,60);assert.match(p.ids.get('tempo-context').textContent,/Scene 2.*Song/);assert.equal(p.xrHost.snapshot().tempo,60);assert.ok(Math.abs(p.context.soundroom.sequencer.beat-4.5)<1e-9);
 await p.click('seq-stop');assert.equal(+p.ids.get('seq-tempo').value,120);assert.equal(p.ids.get('seq-tempo').disabled,false);
 await p.change('seq-tempo','');assert.equal(+p.ids.get('seq-tempo').value,120);await p.change('seq-tempo','999');assert.equal(+p.ids.get('seq-tempo').value,300);await p.click('seq-undo');
 await p.click('seq-save');const saved=parseProject(await p.downloads.at(-1).text());assert.equal(saved.scenes[0].tempo,120);assert.equal(saved.scenes[1].tempo,60);
});
