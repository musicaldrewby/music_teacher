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

test('the blank sequencer adds a pictured instrument directly and Undo restores the empty session',async()=>{
 $('[data-workspace="compose"]').click();assert.equal((await project()).tracks.length,0);
 $('.empty-state [data-view="choose-part"]').click();
 assert.equal($('[data-workspace="compose"]').getAttribute('aria-pressed'),'true');
 assert.match($('#content h1').textContent,/Choose an instrument/);
 $('[data-family="recorders"]').click();
 assert.ok($('#cancel-add-part'));assert.equal($('[data-workspace="compose"]').getAttribute('aria-pressed'),'true');
 $('#search').value='soprano';$('#search').dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.equal($$('.instrument-card').length,1);
 $('[data-open="soprano-recorder"]').click();
 assert.ok($('#sequence-workspace'));assert.equal($('#stage-art'),null);
 let saved=await project();assert.equal(saved.tracks.length,1);assert.equal(saved.tracks[0].instrument,'soprano-recorder');assert.equal(saved.tracks[0].events.length,0);
 assert.deepEqual(saved.sections.find(s=>s.id===saved.activeSection).events[saved.tracks[0].id],[]);
 $('#undo-button').click();assert.equal((await project()).tracks.length,0);assert.ok($('.empty-state'));
 $('#redo-button').click();assert.equal((await project()).tracks.length,1);assert.ok($('#sequence-workspace'));
});

test('the part chooser supports cancel, additional parts and existing parts without duplicating them',async()=>{
 const before=await project();$('#sequence-add-part').click();assert.equal($$('.instrument-card').length,38);
 $('#cancel-add-part').click();assert.deepEqual((await project()).tracks,before.tracks);assert.ok($('#sequence-workspace'));
 $('#sequence-add-part').click();$('[data-open="soprano-recorder"]').click();assert.deepEqual((await project()).tracks,before.tracks);
 $('.track-tabs [data-view="choose-part"]').click();$('[data-open="alto-xylophone"]').click();let saved=await project();
 assert.equal(saved.tracks.length,2);assert.equal(saved.tracks[1].instrument,'alto-xylophone');assert.equal($$('.track-tab[data-select-track]').length,2);
 $('#undo-button').click();assert.deepEqual((await project()).tracks,before.tracks);
});

test('leaving the chooser for Play clears the add intention and ordinary pictures still audition',async()=>{
 const before=await project();$('#sequence-add-part').click();$('[data-workspace="play"]').click();
 assert.equal($('#cancel-add-part'),null);$('[data-open="claves"]').click();assert.ok($('#stage-art'));assert.equal($('#add-track').textContent,'+ Add to ensemble');
 assert.deepEqual((await project()).tracks,before.tracks);
 $('[data-workspace="compose"]').click();assert.ok($('#sequence-workspace'));
});

test('writing and selecting keep the live scroller, cells, focus and viewport in place',async()=>{
 change('#bars','8');change('#duration','1');
 const scroll=$('.sequence-scroll'),main=$('#main'),note=cell(0,10),tabs=$('.track-tabs');
 assert.equal(scroll.contains($('.track-mixer')),false);assert.equal($('.sequence-shell').contains($('.track-mixer')),true);
 scroll.scrollLeft=238;scroll.scrollTop=145;main.scrollTop=180;tabs.scrollLeft=35;note.focus();
 note.click();
 assert.equal($('.sequence-scroll'),scroll);assert.equal(cell(0,10),note);assert.equal(w.document.activeElement,note);
 assert.deepEqual([scroll.scrollLeft,scroll.scrollTop,main.scrollTop,tabs.scrollLeft],[238,145,180,35]);
 const details=$('#sequence-note-details');assert.ok(details.compareDocumentPosition(scroll)&w.Node.DOCUMENT_POSITION_PRECEDING);
 const original=await project();assert.equal(original.tracks[0].events.length,1);assert.equal(original.tracks[0].events[0].duration,1);
 note.click();assert.equal((await project()).tracks[0].events.length,1);assert.equal($('.sequence-scroll'),scroll);
 $('#close-note').click();assert.ok($('.sequence-note-placeholder'));assert.equal($('.sequence-scroll'),scroll);assert.equal(main.scrollTop,180);
});

test('Select chooses held notes and never writes into empty cells',async()=>{
 const before=(await project()).tracks[0].events;
 tool('select');assert.equal($('[data-sequence-tool="select"]').getAttribute('aria-pressed'),'true');
 cell(0,11).click();assert.equal($('#edit-beat').value,'6');assert.equal(cell(0,11).getAttribute('aria-pressed'),'true');
 assert.deepEqual((await project()).tracks[0].events,before);
 cell(2,12).click();assert.equal($('#edit-beat'),null);assert.deepEqual((await project()).tracks[0].events,before);
});

test('Erase removes the whole held note from its tail; empty clicks are harmless and Undo restores it',async()=>{
 const before=(await project()).tracks[0].events,scroll=$('.sequence-scroll');
 tool('erase');cell(2,12).click();assert.deepEqual((await project()).tracks[0].events,before);
 cell(0,11).click();assert.equal((await project()).tracks[0].events.length,0);assert.equal($('.sequence-scroll'),scroll);
 $('#undo-button').click();assert.deepEqual((await project()).tracks[0].events,before);assert.equal($('.sequence-scroll'),scroll);
 assert.equal($('#sequence-workspace').dataset.tool,'erase');
 $('#redo-button').click();assert.equal((await project()).tracks[0].events.length,0);$('#undo-button').click();
});

test('editing after Undo binds to the restored composition and keeps the chosen tool and scroll',async()=>{
 tool('select');cell(0,10).click();const scroll=$('.sequence-scroll');scroll.scrollLeft=260;scroll.scrollTop=174;
 change('#edit-duration','2');assert.equal((await project()).tracks[0].events[0].duration,2);
 assert.equal($('.sequence-scroll'),scroll);assert.equal(scroll.scrollLeft,260);assert.equal(scroll.scrollTop,174);
 $('#mute-track').click();assert.equal((await project()).tracks[0].muted,true);$('#undo-button').click();
 assert.equal($('#mute-track').getAttribute('aria-pressed'),'false');$('#mute-track').click();assert.equal((await project()).tracks[0].muted,true);$('#undo-button').click();
});

test('Write retains explicit note length, supports adjacent starts and Shift-click erases without adding',async()=>{
 tool('write');change('#duration','1');cell(2,12).click();cell(2,14).click();
 const before=await project();assert.deepEqual(before.tracks[0].events.slice(-2).map(e=>[e.beat,e.duration]),[[6,1],[7,1]]);
 cell(2,15).dispatchEvent(new w.MouseEvent('click',{bubbles:true,shiftKey:true}));
 const after=await project();assert.equal(after.tracks[0].events.length,before.tracks[0].events.length-1);assert.ok(after.tracks[0].events.some(e=>e.beat===6));
 cell(5,15).dispatchEvent(new w.MouseEvent('click',{bubbles:true,shiftKey:true}));assert.deepEqual((await project()).tracks[0].events,after.tracks[0].events);
});

test('tool changes and grid changes retain viewport; erase affects only the chosen part',async()=>{
 const recorder=(await project()).tracks[0];$('[data-view="library"]').click();$('[data-open="alto-xylophone"]').click();$('#add-track').click();
 tool('write');cell(0,0).click();const scroll=$('.sequence-scroll');scroll.scrollLeft=162;scroll.scrollTop=58;
 tool('erase');assert.equal($('.sequence-scroll'),scroll);assert.equal(scroll.scrollLeft,162);
 change('#grid','.25');assert.equal($('.sequence-scroll').scrollLeft,162);assert.equal($('.sequence-scroll').scrollTop,58);assert.equal($('#sequence-workspace').dataset.tool,'erase');
 cell(0,0).click();const after=await project();assert.equal(after.tracks[1].events.length,0);assert.deepEqual(after.tracks[0].events,recorder.events);
});
test('each part keeps its own viewport across switches, grid edits and mode visits',async()=>{
 const tracks=(await project()).tracks,choose=id=>$(`.track-tabs [data-select-track="${id}"]`).click();
 choose(tracks[0].id);$('.sequence-scroll').scrollTop=312;$('.sequence-scroll').scrollLeft=211;
 choose(tracks[1].id);$('.sequence-scroll').scrollTop=54;$('.sequence-scroll').scrollLeft=89;
 choose(tracks[0].id);assert.deepEqual([$('.sequence-scroll').scrollLeft,$('.sequence-scroll').scrollTop],[211,312]);
 choose(tracks[1].id);assert.deepEqual([$('.sequence-scroll').scrollLeft,$('.sequence-scroll').scrollTop],[89,54]);
 $('[data-view="score"]').click();$('[data-view="sequence"]').click();assert.deepEqual([$('.sequence-scroll').scrollLeft,$('.sequence-scroll').scrollTop],[89,54]);
 $('#main').scrollTop=73;$('[data-view="sequence"]').click();assert.equal($('#main').scrollTop,73,'reselecting the current view does not reset it');
 for(const mode of ['write','select','erase']){tool(mode);assert.equal($('#phrase-tools').hidden,false);assert.ok($('#phrase-all'));assert.deepEqual([$('.sequence-scroll').scrollLeft,$('.sequence-scroll').scrollTop],[89,54]);}
});
test('sequence detail and playback tools open without replacing the grid or changing project data',async()=>{
 const before=await project(),roll=$('.piano-roll');$('#sequence-note-toggle').click();assert.equal(document.body.classList.contains('sequence-details-open'),true);assert.equal($('#sequence-note-toggle').getAttribute('aria-expanded'),'true');
 $('#sequence-note-details').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(document.body.classList.contains('sequence-details-open'),false);
 $('#sequence-playback-tools').click();assert.equal(document.body.classList.contains('sequence-playback-open'),true);$('#sequence-playback-tools').click();assert.equal(document.body.classList.contains('sequence-playback-open'),false);
 assert.equal($('.piano-roll'),roll);assert.deepEqual((await project()).tracks,before.tracks);
});
test.after(()=>{dom.window.close();timers.forEach(clearTimeout);globalThis.setTimeout=nativeTimeout;});
