import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {JSDOM} from 'jsdom';
import {newProject,newTrack} from '../dist/catalog.js';import {ensureSong} from '../dist/song.js';import {AudioEngine} from '../dist/engine.js';
const fixture=newProject();fixture.bars=4;fixture.bpm=120;const ax=newTrack('alto-xylophone'),other=newTrack('alto-xylophone'),sr=newTrack('soprano-recorder');fixture.tracks=[ax,other,sr];ax.muted=true;
ax.events=[{id:'c',beat:0,note:60,duration:1,writtenDuration:1,velocity:.8},{id:'g',beat:0,note:67,duration:1,writtenDuration:1,velocity:.8},{id:'e',beat:2,note:64,duration:1,writtenDuration:1,velocity:.8}];other.events=[{id:'unwanted',beat:0,note:60,duration:1,velocity:.8}];sr.events=[{id:'recorder-c',beat:0,note:72,duration:1,writtenDuration:1,velocity:.8}];ensureSong(fixture);
const dom=new JSDOM(await fs.readFile(new URL('../dist/index.html',import.meta.url),'utf8'),{url:'https://studio.example/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
w.localStorage.setItem('orff-atelier-project-v1',JSON.stringify(fixture));w.HTMLCanvasElement.prototype.getContext=()=>({measureText:t=>({width:String(t).length*7}),save(){},restore(){}});w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};w.HTMLAnchorElement.prototype.click=function(){};
Object.assign(globalThis,{window:w,document:w.document,localStorage:w.localStorage});w.eval(await fs.readFile(new URL('../dist/vendor/vexflow.js',import.meta.url),'utf8'));globalThis.Vex=w.Vex;
let clock=0,next=0,gate=null,stops=0;const intervals=new Map(),frames=new Map(),played=[],mixes=[],timers=[];const nativeTimeout=globalThis.setTimeout;
globalThis.setTimeout=(fn,time,...args)=>{const id=nativeTimeout(fn,time,...args);timers.push(id);return id;};globalThis.setInterval=fn=>{const id=++next;intervals.set(id,fn);return id;};globalThis.clearInterval=id=>intervals.delete(id);globalThis.requestAnimationFrame=fn=>{const id=++next;frames.set(id,fn);return id;};globalThis.cancelAnimationFrame=id=>frames.delete(id);
AudioEngine.prototype.applyMix=function(p){mixes.push(structuredClone(p));};AudioEngine.prototype.prepareProject=async function(p){this.ctx={get currentTime(){return clock}};if(gate)await gate;this.applyMix(p);};AudioEngine.prototype.load=async function(){this.ctx={get currentTime(){return clock}};};AudioEngine.prototype.play=function(inst,e,t,at){played.push({instrument:inst.id,event:e,track:t.id,at});};AudioEngine.prototype.stop=function(){stops++;};AudioEngine.prototype.release=()=>{};
const downloads=[];URL.createObjectURL=b=>{downloads.push(b);return 'blob:test';};URL.revokeObjectURL=()=>{};globalThis.fetch=async path=>new Response(await fs.readFile(new URL('../dist/'+path,import.meta.url)));
await import('../dist/app.js');
const $=s=>w.document.querySelector(s),$$=s=>[...w.document.querySelectorAll(s)],change=(s,value)=>{const el=$(s);el.value=value;el.dispatchEvent(new w.Event('change',{bubbles:true}));};
const settle=()=>new Promise(resolve=>nativeTimeout(resolve,0));const advance=at=>{clock=at;for(const fn of [...intervals.values()])fn();const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn());};
const saved=async()=>{$('#project-menu-button').click();$('#download-project').click();return JSON.parse(await downloads.at(-1).text());};
$('#welcome-enter').click();$('[data-view="score"]').click();
test('focus and instrument options preserve the project and provide sticky working controls',async()=>{
 const before=await saved();$('#score-focus').click();assert.equal(w.document.body.classList.contains('score-focus'),true);assert.equal($('#score-focus').textContent,'Exit focus');assert.equal($('.score-workspace-dock').contains($('[data-score-tool="chord"]')),true);
 $('#score-show-instrument').click();assert.equal($$('.companion-art [data-hit]').length,13);assert.ok($('.companion-art .companion-active'));assert.equal($('#score-workspace-options').getAttribute('aria-expanded'),'false');$('#score-workspace-options').click();assert.equal(w.document.body.classList.contains('score-options-open'),true);
 assert.deepEqual((await saved()).tracks,before.tracks);assert.equal(JSON.parse(localStorage.getItem('orff-score-workspace-v1')).instrument,true);
});
test('hear and loop selection use only the chosen chord, restore the mix, and keep the transport cursor',async()=>{
 change('#practice-seek','8');
 $('[data-score-tool="select"]').click();$('[aria-label="Edit chord note C4"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));$('[data-score-tool="chord"]').click();assert.equal($('#score-hear-selection').disabled,false);assert.ok($('.score-workspace-dock #score-next-chord'));
 $('#score-hear-selection').click();await settle();assert.equal($('#score-stop-selection').disabled,false);advance(.03);assert.deepEqual(played.map(n=>[n.track,n.event.note]),[[ax.id,60],[ax.id,67]]);assert.equal(mixes.at(-1).tracks.length,1);
 advance(.65);assert.equal($('#score-stop-selection').disabled,true);assert.equal(mixes.at(-1).tracks[0].muted,true);assert.match($('#position').textContent,/03.*01/);assert.equal($('#practice-seek').value,'8');
 played.length=0;$('#score-loop-selection').click();await settle();advance(.7);advance(1.2);assert.equal(played.length,4);assert.equal($('#score-loop-selection').getAttribute('aria-pressed'),'true');$('#score-stop-selection').click();assert.equal(intervals.size,0);assert.equal($('#score-loop-selection').getAttribute('aria-pressed'),'false');assert.ok(stops>0);
 const project=await saved();assert.equal(project.tracks[0].muted,true);assert.equal(project.tracks[0].events.length,3);assert.equal(project.tracks[1].events.length,1);
 $('#score-next-chord').click();assert.equal($('#score-entry-beat').value,'2');
});
test('switching parts clears the old highlight and shows recorder double-hole fingering',async()=>{
 change('#score-track',sr.id);assert.equal($$('.companion-art [data-hit]').length,0);assert.equal($$('.recorder-fingering circle').length,10);assert.match($('.recorder-fingering').getAttribute('aria-label'),/Thumb closed/);
 $('.companion-pitch[data-companion-note="3"]').click();await settle();assert.match($('.recorder-fingering').getAttribute('aria-label'),/6 outer hole closed/);assert.match($('.companion-pitches').textContent,/E♭|Eb/);
 assert.equal((await saved()).tracks[2].events.length,1);assert.equal(played.at(-1).track,sr.id);
});
test('stopping a loading selection prevents delayed playback and changing workspace exits focus safely',async()=>{
 change('#score-track',ax.id);$('[data-score-tool="select"]').click();$('[aria-label="Edit chord note C4"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));$('#score-workspace-options').click();$('[data-score-value="4"]').click();assert.match($('#score-workspace-feedback').textContent,/next|overlap|later/i);let release;gate=new Promise(resolve=>release=resolve);const count=played.length;$('#score-hear-selection').click();assert.match($('#score-listening-status').textContent,/Loading/);assert.equal($('#score-stop-selection').disabled,false);$('#score-stop-selection').click();release();await settle();gate=null;advance(2);assert.equal(played.length,count);assert.equal(intervals.size,0);
 gate=new Promise(resolve=>release=resolve);$('#score-hear-selection').click();$('#score-show-instrument').click();assert.equal($('#score-stop-selection').disabled,false);$('[data-score-tool="note"]').click();assert.equal($('#score-stop-selection').disabled,true);release();await settle();gate=null;advance(3);assert.equal(played.length,count);
 $('[data-view="sequence"]').click();assert.equal(w.document.body.classList.contains('score-focus'),false);$('[data-view="score"]').click();assert.equal(w.document.body.classList.contains('score-focus'),true);assert.ok($('#score-focus'));$('#score-focus').click();assert.equal(w.document.body.classList.contains('score-focus'),false);
});
test('console mix changes survive saving and each repeated drag can be undone',async()=>{
 const before=await saved();$('#console-mixer-toggle').click();assert.equal($('#console-mixer-drawer').hidden,false);assert.equal($$('.quick-channel').length,3);assert.deepEqual((await saved()).tracks,before.tracks);
 const selector=`[data-quick-id="${ax.id}"][data-quick-prop="volume"]`,level=$(selector);
 const setLevel=value=>{level.dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true,button:0}));level.value=value;level.dispatchEvent(new w.Event('input',{bubbles:true}));level.dispatchEvent(new w.MouseEvent('pointerup',{bubbles:true}));};
 setLevel('.44');setLevel('.61');assert.equal($(selector),level,'sync keeps the active control intact');assert.equal((await saved()).tracks[0].volume,.61);assert.equal(mixes.at(-1).tracks[0].volume,.61);
 $('#undo-button').click();assert.equal((await saved()).tracks[0].volume,.44);$('#undo-button').click();assert.equal((await saved()).tracks[0].volume,before.tracks[0].volume);
 const knob=$(`[data-quick-id="${ax.id}"][data-quick-prop="pan"]`),original=+knob.value;
 knob.dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true,button:0,clientX:20,clientY:100}));knob.dispatchEvent(new w.MouseEvent('pointermove',{bubbles:true,clientX:65,clientY:100}));assert.ok(+knob.value>original);knob.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(+knob.value,original);assert.equal($('#console-mixer-drawer').hidden,false,'canceling a knob drag keeps the mixer open');
 const solo=$(`[data-quick-toggle="solo"][data-quick-id="${sr.id}"]`);solo.click();assert.equal((await saved()).tracks[2].solo,true);assert.equal(solo.getAttribute('aria-pressed'),'true');$('#undo-button').click();assert.equal((await saved()).tracks[2].solo,false);
 $('#master').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));$('#master').value='.52';$('#master').dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal((await saved()).master,.52);$('#undo-button').click();assert.equal((await saved()).master,before.master);
 $('#console-full-mixer').click();assert.equal($('#console-mixer-drawer').hidden,true);assert.ok($('.console-pan-knob .hardware-knob'));const pan=$(`[data-mix-id="${sr.id}"][data-mix-prop="pan"]`);pan.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));pan.value='.22';pan.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal((await saved()).tracks[2].pan,.22);$('#undo-button').click();assert.equal((await saved()).tracks[2].pan,before.tracks[2].pan);
});
test('quick mix level and pan remain live during isolated score listening',async()=>{
 $('[data-view="score"]').click();change('#score-track',ax.id);$('[data-score-tool="select"]').click();$('[aria-label="Edit chord note C4"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));$('#score-loop-selection').click();await settle();$('#console-mixer-toggle').click();
 for(const [prop,value] of [['volume','.37'],['pan','-.4']]){const input=$(`[data-quick-id="${ax.id}"][data-quick-prop="${prop}"]`);input.dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true,button:0}));input.value=value;input.dispatchEvent(new w.Event('input',{bubbles:true}));}
 const preview=mixes.at(-1);assert.equal(preview.tracks.length,1);assert.equal(preview.tracks[0].volume,.37);assert.equal(preview.tracks[0].pan,-.4);assert.equal(preview.tracks[0].muted,false);$('#score-stop-selection').click();assert.equal(mixes.at(-1).tracks[0].muted,true);$('#console-close-mixer').click();
});
test('drawer, full mixer, instrument controls and master stay in sync',async()=>{
 $('[data-view="mixer"]').click();$('#console-mixer-toggle').click();const input=$(`[data-quick-id="${ax.id}"][data-quick-prop="pan"]`);input.value='.31';input.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal($(`[data-mix-id="${ax.id}"][data-mix-prop="pan"]`).value,'0.31');
 $('#master').value='.63';$('#master').dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal($('[data-mix-prop="master"]').value,'0.63');
 $(`[data-console-open="${ax.id}"]`).click();await settle();assert.equal($('#track-pan').value,'0.31');input.value='-.2';input.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal($('#track-pan').value,'-0.2');
 $('#track-volume').value='.56';$('#track-volume').dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal($(`[data-quick-id="${ax.id}"][data-quick-prop="volume"]`).value,'0.56');$('#console-close-mixer').click();
});
test('score settings and editing panel position survive routine changes',()=>{
 $('[data-view="score"]').click();if(document.body.classList.contains('score-focus'))$('#score-focus').click();
 $('.score-appearance').open=true;change('#score-spacing','2');assert.equal($('.score-appearance').open,true);change('#composer','Layout check');assert.equal($('.score-appearance').open,true);
 $('#score-composition-controls').scrollTop=125;$('[data-score-tool="select"]').click();assert.equal($('#score-composition-controls').scrollTop,125);assert.ok($('#score-next-chord'));assert.equal($('#score-next-chord').disabled,true);
 change('#score-track',ax.id);$('[aria-label="Edit chord note C4"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));assert.ok($('#score-composition-controls .score-note-details'));$('.score-note-details').open=true;change('#edit-velocity','70');assert.equal($('.score-note-details').open,true);assert.equal($('.score-appearance').open,true);
});
test.after(()=>{dom.window.close();timers.forEach(clearTimeout);globalThis.setTimeout=nativeTimeout;intervals.clear();frames.clear();});
