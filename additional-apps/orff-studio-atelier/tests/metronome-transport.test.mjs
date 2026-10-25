import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {AudioEngine} from '../dist/engine.js';
import {newProject,newTrack} from '../dist/catalog.js';
import {ensureSong} from '../dist/song.js';
const dom=new JSDOM(await fs.readFile(new URL('../dist/index.html',import.meta.url),'utf8'),{url:'https://studio.example/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
w.HTMLCanvasElement.prototype.getContext=()=>({measureText:t=>({width:String(t).length*7}),save(){},restore(){}});
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
globalThis.window=w;globalThis.document=w.document;globalThis.localStorage=w.localStorage;globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
w.eval(await fs.readFile(new URL('../dist/vendor/vexflow.js',import.meta.url),'utf8'));globalThis.Vex=w.Vex;
const nativeTimeout=globalThis.setTimeout,nativeInterval=globalThis.setInterval,nativeClearInterval=globalThis.clearInterval,timers=[],intervals=new Map();let nextTimer=1,clock=0;
globalThis.setTimeout=(fn,time,...args)=>{const timer=nativeTimeout(fn,time,...args);timers.push(timer);return timer;};
globalThis.setInterval=fn=>{const id=nextTimer++;intervals.set(id,fn);return id;};globalThis.clearInterval=id=>intervals.delete(id);
globalThis.fetch=async path=>new Response(await fs.readFile(new URL('../dist/'+path,import.meta.url)));
const played=[],clicks=[];
AudioEngine.prototype.prepareProject=async function(){this.ctx??={get currentTime(){return clock;}};};
AudioEngine.prototype.applyMix=function(){};
AudioEngine.prototype.play=function(inst,event,track,at){played.push({event,at,track:track.id});};
AudioEngine.prototype.click=function(at,accent,volume){clicks.push({at,accent,volume});};
const project=ensureSong(newProject());project.bpm=120;project.bars=4;project.tracks=[newTrack('bass-xylophone')];
project.tracks[0].events=Array.from({length:16},(_,beat)=>({id:'note'+beat,beat,note:48,duration:.1,velocity:.8,shift:0}));
project.sections[0].events[project.tracks[0].id]=structuredClone(project.tracks[0].events);
localStorage.setItem('orff-atelier-project-v1',JSON.stringify(project));
await import('../dist/app.js');
const $=s=>w.document.querySelector(s),change=(s,value)=>{const e=$(s);e.value=value;e.dispatchEvent(new w.Event('change',{bubbles:true}));};
const advance=time=>{clock=time;for(const callback of intervals.values())callback();};
const play=async()=>{$('#play').click();await new Promise(resolve=>nativeTimeout(resolve,0));assert.equal($('#play').getAttribute('aria-label'),'Pause playback');};
$('#welcome-enter').click();$('[data-workspace="compose"]').click();$('#metronome').click();

test('real transport Stop → edit → Play keeps section and full-song metronome on the notes',async()=>{
 for(const [run,scope] of ['section','song'].entries()){
  $('#stop').click();change('#play-scope',scope);$('#rewind').click();clock=run*30;await play();
  advance(clock+.13);clock=run*30+1.37;$('#stop').click();
  // A different workspace and an edit preserve the fractional resume cursor.
  $('[data-view="score"]').click();$('[data-view="sequence"]').click();change('#grid','.25');
  clock=run*30+10;played.length=0;clicks.length=0;await play();
  const origin=clock;for(let tick=1;tick<=50;tick++)advance(origin+tick*.02);
  assert.ok(clicks.length>=2);assert.ok(Math.abs(clicks[0].at-(origin+.37))<1e-9);
  for(const c of clicks)assert.ok(played.some(n=>Math.abs(n.at-c.at)<1e-9),'each click shares a note timestamp');
  assert.equal(clicks[0].accent,false);assert.equal(clicks[1].accent,true);
  $('#stop').click();assert.equal(intervals.size,0);
 }
});

test.after(()=>{dom.window.close();timers.forEach(clearTimeout);globalThis.setTimeout=nativeTimeout;globalThis.setInterval=nativeInterval;globalThis.clearInterval=nativeClearInterval;});
