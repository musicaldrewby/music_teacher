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
await import('../dist/app.js');
const $=s=>w.document.querySelector(s),$$=s=>[...w.document.querySelectorAll(s)],change=(s,value)=>{const e=$(s);e.value=value;e.dispatchEvent(new w.Event('change',{bubbles:true}));};
const cell=(n,c)=>$(`[data-cell="${n},${c}"]`),tool=name=>$(`[data-sequence-tool="${name}"]`).click();
const project=async()=>{$('#project-menu-button').click();$('#download-project').click();return JSON.parse(await downloads.at(-1).text());};
$('#welcome-enter').click();


test('sequencer drag previews, commits once, preserves scroll and supports Undo, cancellation and keyboard',async()=>{
 $('[data-view="sequence"]').click();$('[data-view="choose-part"]').click();$('[data-open="soprano-recorder"]').click();
 change('#duration','1');cell(0,0).click();
 const roll=$('.piano-roll'),scroll=$('.sequence-scroll');roll.getBoundingClientRect=()=>({left:0,top:0,width:880,height:780});scroll.scrollLeft=80;scroll.scrollTop=400;
 const pointer=(target,type,x)=>{const e=new w.MouseEvent(type,{bubbles:true,clientX:x,button:0});Object.defineProperty(e,'pointerId',{value:7});target.dispatchEvent(e);};
 pointer($('.sequence-duration-handle'),'pointerdown',200);pointer(w.document,'pointermove',250);
 assert.equal($('.sequence-duration-handle').getAttribute('aria-valuenow'),'2');
 assert.equal((await project()).tracks[0].events[0].duration,1);
 pointer(w.document,'pointerup',250);let saved=await project();assert.equal(saved.tracks[0].events[0].duration,2);assert.equal(saved.tracks[0].events[0].writtenDuration,2);
 assert.equal($('.sequence-scroll'),scroll);assert.equal(scroll.scrollLeft,80);assert.equal(scroll.scrollTop,400);
 $('#undo-button').click();assert.equal((await project()).tracks[0].events[0].duration,1);$('#redo-button').click();assert.equal((await project()).tracks[0].events[0].duration,2);cell(0,0).click();
 pointer($('.sequence-duration-handle'),'pointerdown',200);pointer(w.document,'pointermove',225);pointer(w.document,'pointercancel',225);assert.equal((await project()).tracks[0].events[0].duration,2);
 pointer($('.sequence-duration-handle'),'pointerdown',200);pointer(w.document,'pointermove',225);w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal((await project()).tracks[0].events[0].duration,2);
 $('.sequence-duration-handle').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));assert.equal((await project()).tracks[0].events[0].duration,1.5);
 tool('erase');assert.equal($('.sequence-duration-handle'),null);tool('select');cell(0,0).click();assert.ok($('.sequence-duration-handle'));
});
test('score value selection replaces a dotted value, adjusts rests and rejects overlap without losing selection',async()=>{
 $('#clear-part').click();$('#confirm-action').click();tool('write');change('#duration','0.75');cell(0,4).click();change('#duration','1');cell(2,8).click();
 $('[data-view="score"]').click();$('[data-score-tool="select"]').click();$('#score-body [data-event-id]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
 assert.equal($('#score-dot').getAttribute('aria-pressed'),'true');$('[data-score-value="1"]').click();let saved=await project();
 assert.equal(saved.tracks[0].events[0].duration,1);assert.equal(saved.tracks[0].events[0].writtenDuration,1);assert.equal(saved.tracks[0].events[1].beat,4);assert.equal($('#score-dot').getAttribute('aria-pressed'),'false');
 $('#score-dot').click();assert.equal((await project()).tracks[0].events[0].duration,1.5);
 $('[data-score-value="4"]').click();assert.match($('#score-entry-status').textContent,/next note/);assert.equal((await project()).tracks[0].events[0].duration,1.5);
 $('[data-score-value="0.5"]').click();assert.equal((await project()).tracks[0].events[0].duration,.5);
 $('#score-entry-undo').click();assert.equal((await project()).tracks[0].events[0].duration,1.5);
 $('#score-body [data-event-id]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));change('#edit-written-duration','0.5');saved=await project();assert.equal(saved.tracks[0].events[0].duration,1.5);assert.equal(saved.tracks[0].events[0].writtenDuration,.5);
});
test.after(()=>{dom.window.close();timers.forEach(clearTimeout);globalThis.setTimeout=nativeTimeout;});

test('sequencer phrase actions, named versions and score expression work through the composing interface',async()=>{
 $('[data-view="sequence"]').click();tool('select');$('#phrase-all').click();const before=await project();const count=before.tracks[0].events.length;
 $('[data-phrase="duplicate"]').click();assert.equal((await project()).tracks[0].events.length,count*2);$('#undo-button').click();assert.equal((await project()).tracks[0].events.length,count);
 $('#project-menu-button').click();$('#project-versions').click();change('#version-name','Original phrase');$('#version-save').click();assert.match($('.version-list').textContent,/Original phrase/);$('[data-close]').click();
 const title=before.title;change('#project-title','Changed draft');$('#project-menu-button').click();$('#project-versions').click();$('[data-version-restore]').click();$('#confirm-action').click();assert.equal((await project()).title,title);
 $('#project-menu-button').click();$('#project-versions').click();assert.match($('.version-list').textContent,/Before restore/);$('[data-close]').click();
 $('[data-view="score"]').click();$('[data-score-tool="select"]').click();$('#score-body [data-event-id]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));$('.expression-panel').open=true;change('#expression-dynamic','p');assert.equal((await project()).tracks[0].events[0].dynamic,'p');assert.ok($('#score-body .musical-expression text'));
 $('[data-articulation="accent"]').click();assert.deepEqual((await project()).tracks[0].events[0].articulations,['accent']);$('#undo-button').click();assert.equal((await project()).tracks[0].events[0].articulations,undefined);
 $('#print-score').click();await new Promise(resolve=>nativeTimeout(resolve,30));assert.ok($('.print-page svg'));assert.match($('#print-status').textContent,/page/);change('#print-names','on');$('#print-names').checked=true;$('#print-names').dispatchEvent(new w.Event('change'));assert.ok($('.print-page .musical-expression text'));
 $('[data-close]').click();
});
