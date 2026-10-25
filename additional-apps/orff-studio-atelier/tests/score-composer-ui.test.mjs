import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {JSDOM} from 'jsdom';
const dom=new JSDOM(await fs.readFile(new URL('../dist/index.html',import.meta.url),'utf8'),{url:'https://studio.example/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
w.HTMLCanvasElement.prototype.getContext=()=>({measureText:t=>({width:String(t).length*7}),save(){},restore(){}});
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};w.HTMLAnchorElement.prototype.click=function(){};
globalThis.window=w;globalThis.document=w.document;globalThis.localStorage=w.localStorage;globalThis.requestAnimationFrame=w.requestAnimationFrame.bind(w);globalThis.cancelAnimationFrame=w.cancelAnimationFrame.bind(w);
w.eval(await fs.readFile(new URL('../dist/vendor/vexflow.js',import.meta.url),'utf8'));globalThis.Vex=w.Vex;
const downloads=[];URL.createObjectURL=blob=>{downloads.push(blob);return 'blob:score-test';};URL.revokeObjectURL=()=>{};
const nativeTimeout=globalThis.setTimeout,timers=[];globalThis.setTimeout=(fn,time,...args)=>{const timer=nativeTimeout(fn,time,...args);timers.push(timer);return timer;};
globalThis.fetch=async path=>new Response(await fs.readFile(new URL('../dist/'+path,import.meta.url)));
await import('../dist/app.js');
const $=s=>w.document.querySelector(s),$$=s=>[...w.document.querySelectorAll(s)],change=(s,value)=>{const e=$(s);e.value=value;e.dispatchEvent(new w.Event('change',{bubbles:true}));};
const key=(value,target=w.document.body,options={})=>target.dispatchEvent(new w.KeyboardEvent('keydown',{key:value,bubbles:true,...options}));
const project=async()=>{$('#project-menu-button').click();$('#download-project').click();return JSON.parse(await downloads.at(-1).text());};
const staffPointer=(measure,{x,y=160,shiftKey=false,type='click'}={})=>{
 const hit=$(`.score-entry-hit[data-score-measure="${measure}"]`),svg=hit.ownerSVGElement;
 svg.getBoundingClientRect=()=>({left:0,top:0,width:+svg.getAttribute('width'),height:+svg.getAttribute('height')});
 hit.dispatchEvent(new w.MouseEvent(type,{bubbles:true,clientX:x??+hit.getAttribute('x'),clientY:y,shiftKey}));
};
$('#welcome-enter').click();
test('a blank score creates its first part directly and accepts keyboard notes and explicit rests',async()=>{
 $('[data-view="score"]').click();assert.ok($('#score-first-part'));$('#score-first-part').click();change('#score-new-instrument','alto-xylophone');$('#score-create-part').click();
 assert.ok($('#score-place'));assert.equal($('#score-mode').value,'student');assert.equal($$('.score-entry-cursor').length,1);
 $('#score-auto-audition').checked=false;$('#score-auto-audition').dispatchEvent(new w.Event('change'));
 key('4');key('c');key('d');key('0');key('e');
 const saved=await project(),t=saved.tracks[0];assert.deepEqual(t.events.map(e=>[e.beat,e.note,e.duration]),[[0,60,1],[1,62,1],[3,64,1]]);assert.deepEqual(t.rests.map(r=>[r.beat,r.duration]),[[2,1]]);assert.equal($('#score-entry-bar').value,'2');assert.equal($('#score-entry-beat').value,'1');
});
test('mouse placement uses a visible staff position and advances by the chosen eighth',async()=>{
 key('3');const cursor=$('.score-entry-cursor'),overlay=cursor.parentNode,hit=overlay.querySelector('.score-entry-hit'),svg=overlay.ownerSVGElement;
 svg.getBoundingClientRect=()=>({left:0,top:0,width:+svg.getAttribute('width'),height:+svg.getAttribute('height')});
 hit.dispatchEvent(new w.MouseEvent('click',{bubbles:true,clientX:+cursor.getAttribute('x1'),clientY:160}));
 const saved=await project();assert.deepEqual(saved.tracks[0].events.at(-1).note,64);assert.equal(saved.tracks[0].events.at(-1).beat,4);assert.equal(saved.tracks[0].events.at(-1).duration,.5);assert.equal($('#score-entry-beat').value,'1.5');
});
test('undo and redo restore an entry and preserve the deliberate rest',async()=>{
 $('#score-entry-undo').click();let saved=await project();assert.equal(saved.tracks[0].events.length,3);assert.equal(saved.tracks[0].rests.length,1);
 $('#score-entry-redo').click();saved=await project();assert.equal(saved.tracks[0].events.length,4);assert.equal(saved.tracks[0].rests.length,1);
});
test('staff selection edits pitch and notation-only duration, while text inputs keep typing',async()=>{
 $('[data-score-tool="select"]').click();const first=$('#score-body [data-event-id]');first.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));assert.ok($('#edit-written-duration'));assert.ok($('#score-delete'));assert.equal($$('.score-entry-hit').length,0);
 key('g');let saved=await project();assert.equal(saved.tracks[0].events[0].note,67);
 change('#edit-written-duration','0.5');saved=await project();assert.equal(saved.tracks[0].events[0].duration,1);assert.equal(saved.tracks[0].events[0].writtenDuration,.5);
 key('c',$('#composer'));saved=await project();assert.equal(saved.tracks[0].events.length,4);
});
test('full score remains available and writing can resume in the chosen part',async()=>{
 change('#score-mode','teacher');assert.equal($('#score-composition-controls').textContent,'');assert.ok($('#score-write-part'));$('#score-write-part').click();assert.ok($('#score-place'));assert.equal($('#score-mode').value,'student');
 $('#score-add-part').click();change('#score-new-instrument','agogo-bells');$('#score-create-part').click();assert.deepEqual($$('#score-entry-pitch option').map(n=>n.textContent),['Low','High']);change('#score-entry-pitch','1');$('[data-score-tool="note"]').click();key('4');key('Enter');const saved=await project();assert.equal(saved.tracks.find(t=>t.instrument==='agogo-bells').events[0].note,67);
});
test('selected chord duration preserves other voices and tie controls create a single attack',async()=>{
 const saved=await project();change('#score-track',saved.tracks[0].id);$('[data-view="sequence"]').click();$('#clear-part').click();$('#confirm-action').click();change('#duration','2');$('[data-cell="0,0"]').click();$('[data-cell="2,0"]').click();$('[data-view="score"]').click();$('[data-score-tool="select"]').click();
 $('[aria-label="Edit chord note C4"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));key('4');let edited=await project();assert.equal(edited.tracks[0].events.length,2);assert.equal(edited.tracks[0].events.find(e=>e.note===60).duration,1);assert.equal(edited.tracks[0].events.find(e=>e.note===64).duration,2);
 $('[data-view="sequence"]').click();$('#clear-part').click();$('#confirm-action').click();change('#duration','1');$('[data-cell="0,0"]').click();$('[data-cell="0,2"]').click();$('[data-view="score"]').click();$('[data-score-tool="select"]').click();$('#score-body [data-event-id]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));$('#score-tie').click();edited=await project();assert.equal(edited.tracks[0].events.length,1);assert.deepEqual(edited.tracks[0].events[0].tieBreaks,[1]);assert.ok($('#score-untie'));
 if(process.env.SCORE_ENTRY_PROOF){const svgs=$$('#score-body .staff-music>svg');await fs.writeFile(process.env.SCORE_ENTRY_PROOF,`<svg xmlns="http://www.w3.org/2000/svg" width="820" height="${svgs.length*230+40}"><rect width="100%" height="100%" fill="#fffdf7"/>${svgs.map((svg,i)=>`<g transform="translate(10 ${20+i*230})">${svg.outerHTML.replace(/\sstyle="[^"]*"/g,'')}</g>`).join('')}</svg>`);}
 $('#score-entry-undo').click();edited=await project();assert.equal(edited.tracks[0].events.length,2);
});
test('nearby mouse clicks keep full quarters and preview the advancing cursor across a barline',async()=>{
 $('[data-view="sequence"]').click();$('#clear-part').click();$('#confirm-action').click();$('[data-view="score"]').click();$('[data-score-tool="note"]').click();key('4');change('#score-entry-bar','1');change('#score-entry-beat','1');
 const initialX=+$('.score-entry-cursor').getAttribute('x1');
 for(let i=0;i<4;i++)staffPointer(1,{x:initialX+(i%2)*2,y:160-i*5});
 assert.equal($('#score-entry-bar').value,'2');assert.equal($('#score-entry-beat').value,'1');
 staffPointer(1,{x:initialX,type:'pointermove'});
 const ghost=$('.score-entry-ghost[visibility="visible"]'),cursor=$('.score-entry-cursor');
 assert.equal(ghost.parentNode,cursor.parentNode);assert.equal(+ghost.getAttribute('cx'),+cursor.getAttribute('x1'));
 staffPointer(1,{x:initialX+1});
 const saved=await project(),notes=saved.tracks[0].events;
 assert.deepEqual(notes.map(e=>[e.beat,e.duration,e.writtenDuration]),[[0,1,1],[1,1,1],[2,1,1],[3,1,1],[4,1,1]]);
 assert.deepEqual(notes.map(e=>e.note),[64,65,67,69,64]);assert.equal($('#score-entry-beat').value,'2');
});
test('mouse entry keeps dotted values and rests; Shift-click only repositions the cursor',async()=>{
 key('.');staffPointer(1);key('.');key('3');staffPointer(1);
 $('[data-score-tool="rest"]').click();key('4');staffPointer(1);
 let saved=await project();
 assert.deepEqual(saved.tracks[0].events.slice(-2).map(e=>[e.beat,e.duration,e.writtenDuration]),[[5,1.5,1.5],[6.5,.5,.5]]);
 assert.deepEqual(saved.tracks[0].rests.map(e=>[e.beat,e.duration]),[[7,1]]);
 const before=saved.tracks[0];staffPointer(4,{shiftKey:true});saved=await project();
 assert.deepEqual(saved.tracks[0].events,before.events);assert.deepEqual(saved.tracks[0].rests,before.rests);
 assert.equal($('#score-entry-bar').value,'4');assert.equal($('#score-entry-beat').value,'1');
 $('[data-score-tool="note"]').click();staffPointer(1,{type:'pointermove'});
 assert.equal($('.score-entry-ghost[visibility="visible"]').ownerSVGElement,$('.score-entry-cursor').ownerSVGElement);
 staffPointer(1);saved=await project();assert.deepEqual(saved.tracks[0].events.at(-1).beat,12);assert.equal(saved.tracks[0].events.at(-1).duration,1);
 assert.deepEqual(saved.tracks[0].events.slice(0,before.events.length),before.events);
});
const noteClick=(index,options={})=>{$$('#score-body [data-event-id]')[index].dispatchEvent(new w.MouseEvent('click',{bubbles:true,...options}));};
const measureClick=n=>$(`[data-select-measure="${n}"]`).dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
test('Ctrl-click and Shift-click select multiple notes; Delete and Undo preserve the next phrase',async()=>{
 $('[data-view="sequence"]').click();$('#clear-part').click();$('#confirm-action').click();$('[data-view="score"]').click();$('[data-score-tool="note"]').click();key('4');change('#score-entry-bar','1');change('#score-entry-beat','1');
 for(const pitch of ['c','d','e','f','g','a','b','c'])key(pitch);
 const original=(await project()).tracks;key('v');noteClick(0);noteClick(2,{ctrlKey:true});assert.match($('.score-selection-summary').textContent,/2 notes/);assert.equal($('#edit-written-duration'),null);
 key('Delete');let saved=await project();assert.deepEqual(saved.tracks[0].events.map(e=>e.beat),[1,3,4,5,6,7]);assert.deepEqual(saved.tracks[1],original[1]);assert.equal(saved.bars,4);
 $('#score-entry-undo').click();noteClick(0);noteClick(2,{shiftKey:true});assert.match($('.score-selection-summary').textContent,/3 notes/);key('Delete');saved=await project();assert.deepEqual(saved.tracks[0].events.map(e=>e.beat),[3,4,5,6,7]);$('#score-entry-undo').click();
});
test('touch additive selection and drag box support more than one note',async()=>{
 $('#score-add-selection').click();noteClick(0);noteClick(2);assert.match($('.score-selection-summary').textContent,/2 notes/);noteClick(0);assert.match($('.score-selection-summary').textContent,/1 note/);$('#score-add-selection').click();$('#score-deselect').click();
 const elements=$$('#score-body [data-event-id]');elements.forEach((el,i)=>{const head=el.querySelector('.vf-notehead')||el;head.getBoundingClientRect=()=>({left:100+i*50,right:110+i*50,top:100,bottom:110,width:10,height:10});});
 const surface=$('#score-body');surface.dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true,clientX:80,clientY:80}));surface.dispatchEvent(new w.MouseEvent('pointermove',{bubbles:true,clientX:175,clientY:130}));assert.ok($('.score-selection-box'));surface.dispatchEvent(new w.MouseEvent('pointerup',{bubbles:true,clientX:175,clientY:130}));assert.match($('.score-selection-summary').textContent,/2 notes/);assert.equal($('.score-selection-box'),null);
 key('Delete');assert.deepEqual((await project()).tracks[0].events.map(e=>e.beat),[2,3,4,5,6,7]);$('#score-entry-undo').click();
});
test('measure clear leaves following measures and other instruments untouched; removal is separate and undoable',async()=>{
 const before=await project();measureClick(1);assert.equal($('#score-clear-scope').value,'part');assert.match($('.score-selection-summary').textContent,/Measure 1/);assert.ok($('.score-range-highlight'));
 if(process.env.SCORE_SELECTION_PROOF){const svg=$('#score-body .staff-music>svg');await fs.writeFile(process.env.SCORE_SELECTION_PROOF,svg.outerHTML.replace(/\sstyle="[^"]*"/g,''));}
 $('#score-clear-measures').click();let saved=await project();assert.deepEqual(saved.tracks[0].events,before.tracks[0].events.slice(4));assert.deepEqual(saved.tracks[1],before.tracks[1]);assert.equal(saved.bars,4);assert.ok(saved.tracks[0].rests.some(r=>r.beat===0));$('#score-entry-undo').click();
 measureClick(1);$('#score-remove-measures').click();assert.ok($('#confirm-action'));$('#confirm-action').click();saved=await project();assert.equal(saved.bars,3);assert.deepEqual(saved.tracks[0].events.map(e=>e.beat),[0,1,2,3]);$('#score-entry-undo').click();saved=await project();assert.equal(saved.bars,4);assert.deepEqual(saved.tracks[0].events,before.tracks[0].events);
 measureClick(1);change('#score-clear-scope','ensemble');key('Delete');saved=await project();assert.equal(saved.tracks[1].events.length,0);assert.equal(saved.bars,4);$('#score-entry-undo').click();
});
test('score clipboard shortcuts paste a phrase at the chosen measure and Cut keeps time',async()=>{
 // Drag suppression has expired; keyboard activation is also available on score notes.
 $$('#score-body [data-event-id]')[0].dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));noteClick(1,{shiftKey:true});key('c',w.document.body,{ctrlKey:true});
 change('#score-entry-bar','3');change('#score-entry-beat','1');key('v',w.document.body,{ctrlKey:true});let saved=await project();assert.deepEqual(saved.tracks[0].events.slice(-2).map(e=>[e.beat,e.duration]),[[8,1],[9,1]]);
 measureClick(3);$('#score-cut').click();saved=await project();assert.equal(saved.bars,4);assert.deepEqual(saved.tracks[0].events.map(e=>e.beat),[0,1,2,3,4,5,6,7]);$('#score-entry-undo').click();assert.equal((await project()).tracks[0].events.length,10);
});
test('measure ranges can contract and a chord selection deletes only the selected voice',async()=>{
 measureClick(2);$('[data-select-measure="4"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true,shiftKey:true}));assert.match($('.score-selection-summary').textContent,/Measures 2–4/);$('[data-select-measure="3"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true,shiftKey:true}));assert.match($('.score-selection-summary').textContent,/Measures 2–3/);
 $('[data-view="sequence"]').click();$('#clear-part').click();$('#confirm-action').click();change('#duration','2');$('[data-cell="0,0"]').click();$('[data-cell="2,0"]').click();$('[data-view="score"]').click();$('[data-score-tool="select"]').click();
 $('[aria-label="Edit chord note C4"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));assert.match($('.score-selection-summary').textContent,/1 note/);assert.equal($('#score-body [data-event-id]').classList.contains('score-note-selected'),false);assert.equal($$('#score-body .vf-notehead.score-note-selected').length,1);$('#delete-note').click();const saved=await project();assert.deepEqual(saved.tracks[0].events.map(e=>[e.note,e.duration]),[[64,2]]);$('#score-entry-undo').click();assert.equal((await project()).tracks[0].events.length,2);
});
test('chord entry stacks keyboard and mouse pitches, ignores duplicates and resumes after the chord',async()=>{
 $('[data-view="sequence"]').click();$('#clear-part').click();$('#confirm-action').click();$('[data-view="score"]').click();key('n');change('#score-entry-bar','1');change('#score-entry-beat','1');key('5');key('c');
 assert.equal($('#score-entry-beat').value,'3');key('h');assert.equal($('#score-entry-beat').value,'1');assert.equal($('[data-score-tool="chord"]').getAttribute('aria-pressed'),'true');
 key('g');staffPointer(1,{y:160});let notes=(await project()).tracks[0].events;
 assert.deepEqual(notes.map(e=>[e.beat,e.note,e.duration,e.writtenDuration]),[[0,60,2,2],[0,67,2,2],[0,64,2,2]]);
 assert.equal($('#score-entry-beat').value,'1');assert.equal($$('#score-body [aria-label^="Edit chord note"]').length,3);assert.equal($('[data-score-value="1"]').disabled,true);
 key('e');assert.match($('#score-entry-status').textContent,/already/);assert.equal((await project()).tracks[0].events.length,3);
 $('#score-entry-undo').click();assert.equal((await project()).tracks[0].events.length,2);$('#score-entry-redo').click();assert.equal((await project()).tracks[0].events.length,3);
 $('#score-next-chord').click();assert.equal($('#score-entry-beat').value,'3');key('d');key('f');
 key('n');assert.equal($('#score-entry-bar').value,'2');assert.equal($('#score-entry-beat').value,'1');key('4');key('a');
 notes=(await project()).tracks[0].events;assert.deepEqual(notes.slice(3).map(e=>[e.beat,e.note,e.duration]),[[2,62,2],[2,65,2],[4,69,1]]);
});
test('selecting an existing note adds harmony without changing it or later notes; navigation releases the anchor',async()=>{
 key('v');$('[aria-label="Edit chord note C4"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));const before=(await project()).tracks[0].events;
 $('[data-score-tool="chord"]').click();change('#score-entry-pitch','1');$('#score-place').click();let notes=(await project()).tracks[0].events;
 const extra=notes.find(e=>!before.some(b=>b.id===e.id));assert.equal(extra.note,62);assert.equal(extra.beat,0);assert.equal(extra.duration,2);assert.deepEqual(notes.filter(e=>e.id!==extra.id),before);
 change('#score-entry-bar','2');change('#score-entry-beat','3');assert.equal($('[data-score-value="1"]').disabled,false);key('3');key('c');key('e');notes=(await project()).tracks[0].events;
 assert.deepEqual(notes.slice(-2).map(e=>[e.beat,e.duration]),[[6,.5],[6,.5]]);key('Backspace');assert.equal((await project()).tracks[0].events.filter(e=>e.beat===6).length,1);
 key('v');assert.equal($$('.score-entry-hit').length,0);key('n');change('#score-entry-bar','4');change('#score-entry-beat','4');key('4');key('c');key('h');key('g');assert.equal($('#score-entry-bar').value,'4');assert.equal($('#score-entry-beat').value,'4');$('#score-next-chord').click();assert.equal($('#score-place').disabled,true);assert.match($('#score-entry-status').textContent,/End of section/);
});
test.after(()=>{dom.window.close();timers.forEach(clearTimeout);globalThis.setTimeout=nativeTimeout;});
