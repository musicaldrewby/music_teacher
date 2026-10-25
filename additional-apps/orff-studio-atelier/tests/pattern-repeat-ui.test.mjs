import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const dom=new JSDOM(await fs.readFile(new URL('../dist/index.html',import.meta.url),'utf8'),{url:'https://studio.example/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
w.HTMLCanvasElement.prototype.getContext=()=>({measureText:t=>({width:String(t).length*7}),save(){},restore(){}});
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};w.HTMLAnchorElement.prototype.click=function(){};
globalThis.window=w;globalThis.document=w.document;globalThis.localStorage=w.localStorage;globalThis.requestAnimationFrame=w.requestAnimationFrame.bind(w);globalThis.cancelAnimationFrame=w.cancelAnimationFrame.bind(w);
w.eval(await fs.readFile(new URL('../dist/vendor/vexflow.js',import.meta.url),'utf8'));globalThis.Vex=w.Vex;
const downloads=[];URL.createObjectURL=blob=>{downloads.push(blob);return 'blob:sequencer-test';};URL.revokeObjectURL=()=>{};
const nativeTimeout=globalThis.setTimeout,timers=[];globalThis.setTimeout=(fn,time,...args)=>{const timer=nativeTimeout(fn,time,...args);timers.push(timer);return timer;};
globalThis.fetch=async path=>new Response(await fs.readFile(new URL('../dist/'+path,import.meta.url)));
const {newProject,newTrack,uid}=await import('../dist/catalog.js');
const {ensureSong}=await import('../dist/song.js');
const initial=newProject();initial.bars=2;initial.tracks=[newTrack('bass-xylophone'),newTrack('soprano-recorder')];
for(const [ix,t] of initial.tracks.entries())t.events=[0,4].map(beat=>({id:uid(),beat,duration:1,writtenDuration:1,note:ix?72:48,shift:0,velocity:.65}));
ensureSong(initial);localStorage.setItem('orff-atelier-project-v1',JSON.stringify(initial));
await import('../dist/app.js');
const $=s=>w.document.querySelector(s),$$=s=>[...w.document.querySelectorAll(s)],change=(s,value)=>{const e=$(s);e.value=value;e.dispatchEvent(new w.Event('change',{bubbles:true}));};
const snapshot=()=>{w.dispatchEvent(new w.Event('pagehide'));return JSON.parse(localStorage.getItem('orff-atelier-project-v1'));};
const measure=(n,shiftKey=false)=>$(`[data-select-measure="${n}"]`).dispatchEvent(new w.MouseEvent('click',{bubbles:true,shiftKey}));
$('#welcome-enter').click();$('[data-view="sequence"]').click();

test('extending asks first, cancellation keeps the old length, and empty extension is undoable',()=>{
 const before=snapshot();change('#bars','4');assert.ok($('#extend-repeat'));assert.equal($('#bars').value,'2');assert.equal(snapshot().bars,2);
 $('#extend-cancel').click();assert.deepEqual(snapshot(),before);
 change('#bars','4');$('#extend-empty').click();assert.equal(snapshot().bars,4);assert.deepEqual(snapshot().tracks,before.tracks);assert.equal($('#bars').value,'4');
 $('#undo-button').click();assert.deepEqual(snapshot().tracks,before.tracks);assert.equal(snapshot().bars,2);
 $('#redo-button').click();assert.equal(snapshot().bars,4);$('#undo-button').click();
});

test('extending repeats only checked parts and a single Undo restores length and notes',()=>{
 const before=snapshot();change('#bars','4');const recorder=$(`[data-repeat-part="${initial.tracks[1].id}"]`);recorder.checked=false;recorder.dispatchEvent(new w.Event('change'));
 $('#extend-repeat').click();const saved=snapshot();assert.equal(saved.bars,4);assert.deepEqual(saved.tracks[0].events.map(e=>e.beat),[0,4,8,12]);assert.deepEqual(saved.tracks[1],before.tracks[1]);
 $('#undo-button').click();assert.equal(snapshot().bars,2);assert.deepEqual(snapshot().tracks,before.tracks);
 change('#bars','4');$('#extend-empty').click();
});

test('sequencer repeat creates editable copies and protects occupied later measures',()=>{
 const before=snapshot();$('#repeat-pattern').click();assert.equal($('#repeat-first').value,'1');assert.equal($('#repeat-last').value,'2');assert.equal($('#repeat-apply').disabled,false);
 $('#repeat-apply').click();let saved=snapshot();assert.deepEqual(saved.tracks[0].events.map(e=>e.beat),[0,4,8,12]);assert.deepEqual(saved.tracks[1],before.tracks[1]);
 $('[data-cell="0,16"]').click();change('#edit-velocity','30');saved=snapshot();assert.equal(saved.tracks[0].events.find(e=>e.beat===8).velocity,.3);assert.equal(saved.tracks[0].events.find(e=>e.beat===0).velocity,.65);
 $('#repeat-pattern').click();assert.equal($('#repeat-replace-row').hidden,false);assert.equal($('#repeat-apply').disabled,true);assert.match($('#pattern-preview').textContent,/already contain music/);
 $('#repeat-cancel').click();assert.deepEqual(snapshot().tracks,saved.tracks);
 $('#repeat-pattern').click();$('#repeat-replace').checked=true;$('#repeat-replace').dispatchEvent(new w.Event('change'));assert.equal($('#repeat-apply').disabled,false);$('#repeat-apply').click();assert.equal(snapshot().tracks[0].events.find(e=>e.beat===8).velocity,.65);
 $('#undo-button').click();assert.equal(snapshot().tracks[0].events.find(e=>e.beat===8).velocity,.3);
 $('#undo-button').click();$('#undo-button').click();assert.deepEqual(snapshot().tracks[0].events,before.tracks[0].events);
});

test('score measure selection pre-fills the repeat range and copies appear on the staff',()=>{
 $('[data-view="score"]').click();$('#score-auto-audition').checked=false;$('#score-auto-audition').dispatchEvent(new w.Event('change'));
 measure(1);measure(2,true);assert.ok($('#score-repeat-selection'));$('#score-repeat-selection').click();assert.equal($('#repeat-first').value,'1');assert.equal($('#repeat-last').value,'2');$('#repeat-apply').click();
 const saved=snapshot(),copied=saved.tracks[0].events.filter(e=>e.beat>=8);assert.equal(copied.length,2);for(const e of copied)assert.ok($(`#score-body [data-event-id="${e.id}"]`));assert.ok($('#score-repeat-part'));
 $('#score-entry-undo').click();assert.equal(snapshot().tracks[0].events.length,2);
 $('#score-repeat-part').click();change('#repeat-last','4');assert.equal($('#repeat-apply').disabled,true);assert.match($('#pattern-preview').textContent,/lengthen the section/);$('#repeat-cancel').click();
});

test('Double section repeats all parts with independent note IDs and can be undone',()=>{
 $('[data-view="sequence"]').click();const before=snapshot();$('#double-pattern').click();const saved=snapshot();assert.equal(saved.bars,8);
 for(let i=0;i<2;i++){assert.deepEqual(saved.tracks[i].events.map(e=>e.beat),[0,4,16,20]);assert.notEqual(saved.tracks[i].events[0].id,saved.tracks[i].events[2].id);}
 $('#undo-button').click();assert.equal(snapshot().bars,4);assert.deepEqual(snapshot().tracks,before.tracks);
});

test('the score Add Measure control offers the same repeat-or-empty choice',()=>{
 $('[data-view="score"]').click();const before=snapshot();$('#score-add-measure').click();assert.ok($('#extend-repeat'));assert.equal(snapshot().bars,4);$('#extend-cancel').click();assert.deepEqual(snapshot().tracks,before.tracks);
 $('#score-add-measure').click();$('#extend-empty').click();assert.equal(snapshot().bars,5);assert.deepEqual(snapshot().tracks,before.tracks);$('#score-entry-undo').click();assert.equal(snapshot().bars,4);
});

test.after(()=>{dom.window.close();timers.forEach(clearTimeout);globalThis.setTimeout=nativeTimeout;});

