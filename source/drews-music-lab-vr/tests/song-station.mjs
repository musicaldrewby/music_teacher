import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {LoopRecorder} from '../dist/recorder.js';
import {PianoRoll,ROLL} from '../dist/piano-roll.js';
import {emptyBass} from '../dist/bass.js';
import {InstrumentPlacement} from '../dist/room-tools.js';
import {Constellation,FirstSongGuide} from '../dist/creative-tools.js';
import {optimizeRoom} from '../dist/performance.js';
const source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
function fn(name){const re=new RegExp('^(?:async )?function '+name+'\\(', 'm');const start=source.search(re);assert.ok(start>=0,name);const rest=source.slice(start),end=rest.slice(1).search(/^(?:async )?function /m);return end<0?rest:rest.slice(0,end+1);}
const noop=()=>{},elements=new Map();
function el(id){if(!elements.has(id))elements.set(id,{textContent:'',style:{},userData:{},disabled:false,close(){this.open=false;ctx.studio.pendingNew=false;},showModal(){this.open=true;},replaceChildren:noop,append:noop});return elements.get(id);}
const draw=new Proxy({measureText:t=>({width:t.length*8})},{get:(o,k)=>o[k]||noop});
const document={createElement:()=>({width:512,height:64,getContext:()=>draw}),querySelectorAll:()=>[]};
const recorder=new LoopRecorder({play:noop});
const ctx={THREE,document,instrumentPlacement:new InstrumentPlacement(),openInstrumentPicker:noop,goSongStation:noop,enterGallery:noop,openRoomTools:noop,openPerformance:noop,openMIDI:noop,console,recorder,PianoRoll,ROLL,noteWall:{},openNoteWall:noop,togglePartMute:noop,emptyBass,scene:new THREE.Scene(),rig:new THREE.Group(),camera:new THREE.PerspectiveCamera(),clickable:[],c:{teal:0x205356,wood:0xb88758,darkWood:0x79523b},studio:{songSurfaces:[],shelf:[],selected:0,title:'My groove',mutedParts:new Set(),partRoutes:new Map(),menu:new THREE.Group(),more:{visible:false},nameKeyboard:new THREE.Group()},comfort:{menu:new THREE.Group()},$:el,pattern:Array.from({length:4},()=>Array(16).fill(true)),bassPattern:emptyBass(),bpm:100,performance:{now:()=>1000},studioNow:()=>10,
 toast:noop,studioNotice:noop,refreshRecorder:noop,refreshBass:noop,refreshSongShelf:noop,refreshPresetLabels:noop,updateSequence:noop,flushRecovery:noop,scheduleRecovery:noop,releaseSynthHolds:noop,armMalletGrace:noop,stopMedia:noop,silenceRecordedSynths:noop,stopLiveDrums:noop,stopPreview:noop,stopRecording:()=>recorder.stop(10),closeSongPanels:noop,setMetronome:noop,stepMetronomeVolume:noop,toggleComfortMenu:noop,configureLoop:noop,cycleMalletSensitivity:noop,undoLastOverdub:noop,undoLoop:noop,toggleLightShow:noop,
 renderer:{xr:{isPresenting:true,updateCamera:noop,getCamera:()=>ctx.camera}},songStore:{save:async song=>({...song,id:'saved'})},songPreview:new LoopRecorder({play:noop})};
Object.assign(ctx,{Constellation,experience:{guide:new FirstSongGuide()},exitPerformance:noop,enterPerformance:noop,openPerformanceOptions:noop,openMixer:noop,openSongFinished:noop,activeSongSource:()=>recorder});
ctx.camera.position.set(0,1.7,0);ctx.camera.updateMatrixWorld();ctx.panel=()=>el('panel-content');vm.createContext(ctx);
for(const name of ['mat','box','textPlane','label','button3','updateWorldLabel','makeSongStation','stationGroup','makeNoteWall','makeSongKeyboard','faceSongPanel','closeSongPanels','metronomeControl','makeRecorderMenu','freshSong','requestNewSong','showSongDialog','openSongNamer','refreshSongName','setSongNameStatus','saveCurrentSong','commitSongName'])vm.runInContext(fn(name),ctx);
const front={x:0,z:-8.5,type:'notewall'};ctx.makeNoteWall(front);
assert.equal(ctx.studio.nameKeyboard.parent,front.group,'front station initializes the VR naming keyboard');
assert.equal(ctx.studio.nameKeyboard.visible,false,'naming keyboard starts hidden');
ctx.setSongNameStatus=noop;ctx.refreshSongName=noop;
ctx.makeRecorderMenu();
const [wallSurface,menuSurface]=ctx.studio.songSurfaces;
assert.deepEqual(Object.keys(wallSurface.buttons),Object.keys(menuSurface.buttons));
assert.deepEqual(Object.keys(menuSurface.buttons).slice(0,5),['new','record','overdub','play','stop']);
for(const name of ['new','record','overdub','play','stop'])assert.equal(wallSurface.buttons[name].color,menuSurface.buttons[name].color);
globalThis.document=document;
optimizeRoom(ctx.scene,ctx.rig);
assert.equal(menuSurface.markers.filter(m=>m.parent).length,4,'measure markers survive room batching');
const event={type:'xylophone',instrumentId:'sx',beat:0,midi:60,velocity:.8,duration:.5};
recorder.events=[event];recorder.drumPattern=ctx.pattern;ctx.studio.title='My groove';
ctx.requestNewSong();assert.equal(recorder.events.length,1,'opening New Song preserves content');assert.equal(ctx.studio.auxPanel.visible,true);
ctx.closeSongPanels();assert.equal(recorder.events.length,1,'Cancel preserves content');
ctx.openSongNamer(false,true);assert.equal(ctx.studio.pendingNew,true);const rigBefore=ctx.rig.position.clone();assert.equal(ctx.studio.nameKeyboard.parent,ctx.scene,'keyboard is placed at current location');assert.deepEqual(ctx.rig.position,rigBefore,'naming does not teleport');
ctx.studio.nameBuffer='Saved groove';ctx.songStore.save=async()=>{throw Error('Storage unavailable');};await ctx.commitSongName();assert.equal(recorder.events.length,1,'failed save preserves notes');assert.equal(ctx.studio.nameKeyboard.visible,true,'failed save keeps naming open');assert.equal(ctx.studio.pendingNew,true,'save can be retried');
let savedCount=0;ctx.songStore.save=async song=>({...song,id:'saved-'+(++savedCount)});await ctx.commitSongName();assert.equal(ctx.studio.shelf.length,1);assert.equal(ctx.studio.shelf[0].events.length,1);assert.equal(recorder.events.length,0,'successful Save & New resets notes');assert.equal(recorder.drumPattern,null);assert.equal(recorder.bassPattern,null);assert.equal(ctx.studio.title,'');assert.ok(ctx.pattern.every(r=>r.every(v=>!v)));assert.ok(ctx.bassPattern.steps.every(v=>v===null));
recorder.events=[event];ctx.studio.title='Discarded';ctx.freshSong();assert.equal(recorder.events.length,0);assert.equal(ctx.studio.title,'');
// Desktop Save & New follows the same transaction.
ctx.renderer.xr.isPresenting=false;recorder.events=[event];ctx.studio.title='Desktop';ctx.openSongNamer(false,true);ctx.studio.nameBuffer='Desktop saved';await ctx.commitSongName();assert.equal(ctx.studio.shelf.length,2);assert.equal(recorder.events.length,0);
console.log('PASS: front wall initializes VR naming; matching wall/menu controls; dynamic markers; save/cancel/failure/retry/new-song flows; in-place VR naming; desktop save-and-new.');
