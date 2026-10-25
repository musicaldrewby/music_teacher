import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {OfflineAudioContext} from 'node-web-audio-api';
import {ART} from '../dist/instrument-art.js';
import {AudioEngine} from '../dist/engine.js';
import {midiTouchVelocity,MIDI_TOUCH_DEFAULTS} from '../dist/midi.js';
const originalSetTimeout=globalThis.setTimeout,pendingTimers=new Set();
globalThis.setTimeout=(fn,ms,...args)=>{const timer=originalSetTimeout(fn,ms,...args);pendingTimers.add(timer);return timer};
const dom=new JSDOM(await fs.readFile(new URL('../dist/index.html',import.meta.url),'utf8'),{url:'https://studio.example/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;
const midiRequests=[],midiPlayed=[],nativePlay=AudioEngine.prototype.play;
AudioEngine.prototype.play=function(...args){const voice=nativePlay.apply(this,args);midiPlayed.push({instrument:args[0].id,event:args[1],options:args[5],voice});return voice;};
const midiPort=new w.EventTarget();Object.assign(midiPort,{id:'test-controller',name:'Studio keys <live>',state:'connected',connection:'closed',open:async()=>{midiPort.connection='open';return midiPort},close:async()=>{midiPort.connection='closed';return midiPort}});
const midiAccess=new w.EventTarget();midiAccess.inputs=new Map([[midiPort.id,midiPort]]);
Object.defineProperty(w.navigator,'requestMIDIAccess',{value:async options=>{midiRequests.push(options);return midiAccess}});
const midiSend=data=>{const e=new w.Event('midimessage');Object.defineProperties(e,{data:{value:Uint8Array.from(data)},timeStamp:{value:performance.now()}});midiPort.dispatchEvent(e)};
w.HTMLCanvasElement.prototype.getContext=function(){return {measureText:t=>({width:String(t).length*7}),save(){},restore(){}}};
w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};w.print=()=>{};
w.HTMLAnchorElement.prototype.click=function(){};
let clock=0;
class TestAudioContext{constructor(){const ctx=new OfflineAudioContext(2,44100,44100);return new Proxy(ctx,{get(o,k){if(k==='state')return 'running';if(k==='currentTime')return clock;if(k==='resume')return async()=>{};const v=o[k];return typeof v==='function'?v.bind(o):v}})}}
w.AudioContext=TestAudioContext;
globalThis.window=w;globalThis.document=w.document;globalThis.localStorage=w.localStorage;globalThis.requestAnimationFrame=w.requestAnimationFrame.bind(w);globalThis.cancelAnimationFrame=w.cancelAnimationFrame.bind(w);
globalThis.fetch=async path=>{try{const b=await fs.readFile(new URL('../dist/'+path,import.meta.url));return new Response(b)}catch{return new Response('',{status:404})}};
w.eval(await fs.readFile(new URL('../dist/vendor/vexflow.js',import.meta.url),'utf8'));globalThis.Vex=w.Vex;
let downloads=[];URL.createObjectURL=blob=>{downloads.push(blob);return 'blob:qa'};URL.revokeObjectURL=()=>{};
await import('../dist/app.js');
w.document.querySelector('#welcome-enter').click();
const $=s=>w.document.querySelector(s),$$=s=>[...w.document.querySelectorAll(s)];
const change=(selector,value)=>{const e=$(selector);e.value=value;e.dispatchEvent(new w.Event('change',{bubbles:true}))};
test('gallery opens the same instrument art with thirteen interactive bars',async()=>{assert.equal($$('.instrument-card').length,38);const thumb=$('[data-open="alto-xylophone"] image').getAttribute('href');$('[data-open="alto-xylophone"]').click();assert.equal($('#stage-art image').getAttribute('href'),thumb);assert.equal($$('#stage-art [data-hit]').length,13);assert.match($('#content h1').textContent,/Alto xylophone/);});
test('add, edit, score, save and undo share the same composition',async()=>{
 $('#add-track').click();assert.equal($$('.track-tab[data-select-track]').length,1);
 $('[data-cell="0,0"]').click();assert.ok($('#edit-duration'));change('#edit-duration','2');
 $('[data-view="score"]').click();assert.equal($$('#score-body svg').length,2);assert.equal($$('#score-body .blank').length,0);assert.ok($$('#score-body .vf-stavenote').length>0);
 change('#score-mode','student');assert.equal($$('.print-setup b').length,13);
 $('#project-menu-button').click();$('#download-project').click();const saved=JSON.parse(await downloads.at(-1).text());assert.equal(saved.tracks.length,1);assert.equal(saved.tracks[0].events.length,1);assert.equal(saved.tracks[0].events[0].duration,2);
 $('#undo-button').click();$('#project-menu-button').click();$('#download-project').click();const undone=JSON.parse(await downloads.at(-1).text());assert.equal(undone.tracks[0].events[0].duration,.5);
});
test('every catalog instrument has its final artwork',async()=>{const {CATALOG}=await import('../dist/catalog.js');assert.equal(Object.keys(ART).length,CATALOG.length);for(const i of CATALOG){assert.ok(ART[i.id],i.id);const info=await fs.stat(new URL('../dist/'+ART[i.id].src,import.meta.url));assert.ok(info.size>1000,i.id)}});
test('generated bar hit regions are inside their picture and ordered left to right',()=>{for(const [id,a]of Object.entries(ART)){if(!/xylophone|metallophone|glockenspiel/.test(id))continue;assert.equal(a.hits.length,13);let last=-1;for(const h of a.hits){const pts=h.points;for(const [x,y]of pts){assert.ok(x>=0&&x<=1&&y>=0&&y<=1,id)}const cx=pts.reduce((n,p)=>n+p[0],0)/pts.length;assert.ok(cx>last,id);last=cx}}});
test('recorder keyboard holds notes, records their length, and releases on focus loss',async()=>{
 $('[data-view="library"]').click();$('[data-open="soprano-recorder"]').click();
 assert.equal($$('[data-recorder-note]').length,25);assert.equal($$('#stage-art [data-hit]').length,0);assert.ok($('#stage-art image').getAttribute('href').endsWith('soprano-recorder.png'));
 await new Promise((resolve,reject)=>{let tries=0;const check=()=>{if($('#sound-status')?.textContent==='READY TO PLAY')return resolve();if(++tries>300)return reject(Error('recorder samples did not load'));originalSetTimeout(check,50)};check()});
 $('#add-track').click();$('#record-settings').click();$('#count-in').checked=false;$('#count-in').dispatchEvent(new w.Event('change'));$('[data-close]').click();$('#play-instrument').click();
 await new Promise(resolve=>originalSetTimeout(resolve,100));$('#record').click();await new Promise(resolve=>originalSetTimeout(resolve,100));
 clock=.12;w.document.body.dispatchEvent(new w.KeyboardEvent('keydown',{key:'a',code:'KeyA',bubbles:true}));await new Promise(resolve=>originalSetTimeout(resolve,20));assert.equal($('#recorder-note').textContent,'C5');
 clock=1.32;w.document.body.dispatchEvent(new w.KeyboardEvent('keyup',{key:'a',code:'KeyA',bubbles:true}));assert.equal($('#recorder-note').textContent,'—');$('#stop').click();
 $('#project-menu-button').click();$('#download-project').click();const project=JSON.parse(await downloads.at(-1).text()),track=project.tracks.find(t=>t.instrument==='soprano-recorder');assert.equal(track.events.length,1);assert.ok(Math.abs(track.events[0].duration-2)<.01);assert.equal(track.events[0].note,72);
 $('[data-recorder-octave="1"]').click();w.document.body.dispatchEvent(new w.KeyboardEvent('keydown',{key:'k',code:'KeyK',bubbles:true}));await new Promise(resolve=>originalSetTimeout(resolve,20));assert.equal($('#recorder-note').textContent,'C7');w.dispatchEvent(new w.Event('blur'));assert.equal($('#recorder-note').textContent,'—');
 $('[data-view="score"]').click();assert.equal($$('#score-body .blank').length,0);assert.ok($('#score-body').textContent.includes('sounds one octave higher'));
});
test('contrabass modules share bar setup, sequencer pitches and the printed student part',async()=>{
 $('[data-view="library"]').click();$('[data-family="bassbars"]').click();assert.equal($$('.instrument-card').length,1);
 const thumb=$('[data-open="bass-bars"] image').getAttribute('href');$('[data-open="bass-bars"]').click();
 assert.equal($('#stage-art image').getAttribute('href'),thumb);assert.equal($$('#stage-art [data-hit]').length,8);assert.equal($$('[data-toggle-bar]').length,8);assert.equal($('#key').disabled,false);
 change('#key','G');assert.ok($('#stage-art').textContent.includes('F♯2'));
 $('#pentatonic').click();assert.equal($$('#stage-art .hit.removed').length,3);$('#restore-bars').click();assert.equal($$('#stage-art .hit.removed').length,0);
 $('#add-track').click();$('[data-cell="3,0"]').click();assert.equal($('#edit-pitch option:checked').textContent,'F♯2');
 $('[data-view="score"]').click();change('#score-mode','student');assert.equal($$('.print-setup b').length,8);assert.equal($$('#score-body .blank').length,0);assert.ok($('#score-body').textContent.includes('Contrabass bars'));
 $('#project-menu-button').click();$('#download-project').click();const project=JSON.parse(await downloads.at(-1).text());assert.equal(project.tracks.find(t=>t.instrument==='bass-bars').events[0].note,42);
});
test('new percussion strokes appear in the instrument, sequencer and printed legend',async()=>{
 for(const [id,names] of [['tambourine',['Hit','Shake']],['shakers',['Short shake','Long shake']],['maracas',['Short shake','Long shake']],['sleigh-bells',['Hit','Shake']],['cabasa',['Soft rub','Strong rub']]]){
  $('[data-view="library"]').click();$('[data-family="all"]').click();const thumb=$(`[data-open="${id}"] image`).getAttribute('href');$(`[data-open="${id}"]`).click();
  assert.equal($('#stage-art image').getAttribute('href'),thumb);assert.equal($$('[data-play-note]').length,2);assert.ok($$('[data-play-note]')[1].textContent.includes(names[1]));
  $('#add-track').click();$('[data-cell="1,0"]').click();assert.equal($('#edit-pitch option:checked').textContent,names[1]);
  $('[data-view="score"]').click();change('#score-mode','student');assert.equal($$('#score-body .blank').length,0);assert.ok($('.score-legend').textContent.includes(names[1]+' = second line'));
 }
});

test('wind-chime directions and speeds are selectable in the player, sequencer and printed legend',async()=>{
 $('[data-view="library"]').click();$('[data-family="all"]').click();$('[data-open="wind-chimes"]').click();
 const names=['Down · brisk','Down · slow','Up · brisk','Up · medium','Up · slow'];
 assert.equal($$('[data-play-note]').length,5);
 names.forEach((name,i)=>assert.ok($$('[data-play-note]')[i].textContent.includes(name)));
 assert.match($('.stage-caption').textContent,/direction and speed/);
 await new Promise((resolve,reject)=>{let tries=0;const check=()=>{if($('#sound-status')?.textContent==='READY TO PLAY')return resolve();if(++tries>600)return reject(Error('chime samples did not load'));originalSetTimeout(check,50)};check()});
 $('#add-track').click();
 for(let i=0;i<5;i++){$(`[data-cell="${i},${i*2}"]`).click();assert.equal($('#edit-pitch option:checked').textContent,names[i]);}
 $('[data-view="score"]').click();change('#score-mode','student');
 assert.equal($$('#score-body .blank').length,0);assert.match($('.score-legend').textContent,/Up · slow = top line/);
 $('#project-menu-button').click();$('#download-project').click();const saved=JSON.parse(await downloads.at(-1).text());
 assert.deepEqual(saved.tracks.find(t=>t.instrument==='wind-chimes').events.map(e=>e.note),[84,85,86,87,88]);
});

test('agogo, cowbell and slapstick connect gallery art, playable strokes, sequencing and student parts',async()=>{
 for(const [id,names,hits] of [['agogo-bells',['Low','High'],2],['cowbell',['Open','Muted'],1],['slapstick',['Clap'],1]]){
  $('[data-view="library"]').click();$('[data-family="all"]').click();
  const thumb=$(`[data-open="${id}"] image`).getAttribute('href');$(`[data-open="${id}"]`).click();
  assert.equal($('#stage-art image').getAttribute('href'),thumb);
  assert.equal($$('#stage-art [data-hit]').length,hits);
  assert.equal($$('[data-play-note]').length,names.length);
  names.forEach((name,i)=>assert.ok($$('[data-play-note]')[i].textContent.includes(name)));
  $('#add-track').click();
  for(let i=0;i<names.length;i++){$(`[data-cell="${i},${i*2}"]`).click();assert.equal($('#edit-pitch option:checked').textContent,names[i]);}
  $('[data-view="score"]').click();change('#score-mode','student');
  assert.equal($$('#score-body .blank').length,0);
  names.forEach(name=>assert.ok($('.score-legend').textContent.includes(name+(names.length>1?' =':''))));
 }
 $('#project-menu-button').click();$('#download-project').click();
 const saved=JSON.parse(await downloads.at(-1).text());
 for(const [id,notes] of [['agogo-bells',[68,67]],['cowbell',[56,57]],['slapstick',[28]]])
  assert.deepEqual(saved.tracks.find(t=>t.instrument===id).events.map(e=>e.note),notes);
});

test('Song Builder creates variations, reuses sections and retains per-appearance entrances through reorder and save',async()=>{
 $('#project-menu-button').click();$('#new-project').click();$('#confirm-action').click();
 $('[data-open="alto-xylophone"]').click();$('#add-track').click();change('#bars',1);$('[data-cell="0,0"]').click();
 $('[data-view="song"]').click();assert.match($('#content h1').textContent,/Song Builder/);
 const a=$('[data-section-name]').dataset.sectionName;change('[data-section-name]','Intro');
 $('[data-copy-section]').click();assert.equal($$('.section-card').length,2);assert.equal($$('[data-entry]').length,2);
 const b=$$('.section-card')[1].querySelector('[data-edit-section]').dataset.editSection;
 $(`[data-edit-section="${b}"]`).click();assert.equal($('#active-section').value,b);$('[data-cell="2,2"]').click();
 $('[data-view="song"]').click();$(`[data-add-section="${a}"]`).click();
 change('[data-repeat-entry]',2);const first=$('[data-entry]').dataset.entry;
 const entrance=$(`[data-entrance-entry="${first}"]`);entrance.click();assert.equal($(`[data-entrance-entry="${first}"]`).checked,false);
 const second=$$('[data-entry]')[1].dataset.entry;$(`[data-move-entry="${second}"][data-delta="-1"]`).click();
 assert.equal($$('[data-entry]')[0].dataset.entry,second);assert.equal($(`[data-entrance-entry="${first}"]`).checked,false);
 // Exercise the native drag/drop handlers with the same payload they receive in the browser.
 const last=$$('[data-entry]')[2].dataset.entry;let payload='';
 $(`[data-drag-entry="${last}"]`).ondragstart({dataTransfer:{setData(type,value){payload=value}}});
 assert.equal(payload,last);$('[data-entry]').ondrop({preventDefault(){}});assert.equal($$('[data-entry]')[0].dataset.entry,last);
 $('#project-menu-button').click();$('#download-project').click();const saved=JSON.parse(await downloads.at(-1).text());
 assert.equal(saved.sections.length,2);assert.equal(saved.arrangement.length,3);assert.deepEqual(saved.arrangement.map(e=>e.section),[a,b,a]);
 assert.equal(saved.arrangement[2].repeats,2);assert.deepEqual(saved.arrangement[2].mutedTracks,[saved.tracks[0].id]);
 assert.equal(saved.sections.find(s=>s.id===a).events[saved.tracks[0].id].length,1);assert.equal(saved.sections.find(s=>s.id===b).events[saved.tracks[0].id].length,2);
 const {validateProject}=await import('../dist/catalog.js');assert.doesNotThrow(()=>validateProject(saved));
 await new Promise(resolve=>originalSetTimeout(resolve,300));assert.equal(JSON.parse(localStorage.getItem('orff-atelier-project-v1')).arrangement.length,3);
});

test('full-song notation edits reusable source notes and shares form cues with MusicXML',async()=>{
 $('[data-view="score"]').click();change('#score-scope','song');change('#score-mode','student');
 assert.equal($$('#score-body .blank').length,0);assert.equal($$('#score-body svg').length,2);assert.ok($('#score-body').textContent.includes('Intro · 2/2'));
 // The first displayed note belongs to Intro, even while the independent variation is active.
 $('#score-body .vf-stavenote[role="button"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
 assert.equal($('#active-section option:checked').textContent,'Intro · 1 bars');change('#edit-duration','1');
 assert.equal($$('#score-body .blank').length,0);
 assert.equal($('#score-scope').value,'section');change('#score-scope','song');$('#export-button').click();assert.equal($('#export-scope').value,'song');$('[data-export="xml"]').click();
 const xml=await downloads.at(-1).text();assert.equal((xml.match(/<measure /g)||[]).length,4);assert.ok(xml.includes('<rehearsal>Intro · 2/2</rehearsal>'));
 const lastMeasures=xml.split('<measure number="3">')[1];assert.ok(lastMeasures.includes('<rest/>'));assert.ok(!lastMeasures.includes('<pitch>'));
 $('[data-close]').click();$('#project-menu-button').click();$('#download-project').click();const saved=JSON.parse(await downloads.at(-1).text());
 const a=saved.sections.find(s=>s.name==='Intro'),b=saved.sections.find(s=>s.id!==a.id);
 assert.equal(a.events[saved.tracks[0].id][0].duration,1);assert.equal(b.events[saved.tracks[0].id][0].duration,.5);
});

test('section deletion and undo restore the complete form, while invalid length changes roll back',async()=>{
 $('[data-view="song"]').click();$('#new-section').click();assert.equal($$('.section-card').length,3);assert.equal($$('[data-entry]').length,4);
 const blank=$$('.section-card')[2].querySelector('[data-delete-section]').dataset.deleteSection;
 $(`[data-delete-section="${blank}"]`).click();$('#confirm-action').click();assert.equal($$('.section-card').length,2);assert.equal($$('[data-entry]').length,3);
 $('#undo-button').click();assert.equal($$('.section-card').length,3);assert.equal($$('[data-entry]').length,4);
 const edit=$$('.section-card')[0].querySelector('[data-edit-section]');edit.click();change('#bars',64);
 assert.ok($('#extend-empty'));$('#extend-empty').click();
 $('[data-view="song"]').click();const repeats=$$('[data-repeat-entry]').at(-2);const old=repeats.value;change(`[data-repeat-entry="${repeats.dataset.repeatEntry}"]`,16);
 assert.equal($(`[data-repeat-entry="${repeats.dataset.repeatEntry}"]`).value,old);assert.match($('#toast').textContent,/512 measures/);
 $('#undo-button').click(); // restore 1-bar Intro
});

test('song playback visits arranged sections; Record switches to the active section',async()=>{
 $('[data-view="song"]').click();$('#play-song').click();
 await new Promise(resolve=>originalSetTimeout(resolve,150));assert.equal($('#play-scope').value,'song');assert.ok($('#play').classList.contains('playing'));
 clock=1.6;await new Promise(resolve=>originalSetTimeout(resolve,60));assert.match($('#transport-state').textContent,/SONG · Intro/);assert.equal($$('.song-entry.is-playing').length,1);
 clock=4;await new Promise(resolve=>originalSetTimeout(resolve,60));assert.ok(!$('#transport-state').textContent.includes('Intro'));assert.equal($$('.song-entry.is-playing').length,1);
 $('#stop').click();assert.equal($$('.song-entry.is-playing').length,0);
 $('#record').click();await new Promise(resolve=>originalSetTimeout(resolve,150));assert.equal($('#play-scope').value,'section');assert.ok($('#record').classList.contains('recording'));$('#stop').click();
});

const midiWait=async predicate=>{for(let n=0;n<600;n++){if(predicate())return;await new Promise(resolve=>originalSetTimeout(resolve,25));}throw Error('MIDI UI did not reach expected state');};
const midiOpen=async id=>{$('[data-view="library"]').click();$('[data-family="all"]').click();$(`[data-open="${id}"]`).click();await midiWait(()=>$('#sound-status')?.textContent==='READY TO PLAY');};
test('MIDI connection follows instrument register and learns one home C without changing the controller',async()=>{
 assert.equal(midiRequests.length,0,'MIDI access requires an explicit Connect action');
 $('#project-menu-button').click();$('#new-project').click();$('#confirm-action').click();
 w.dispatchEvent(new w.Event('focus'));$('#midi-button').click();$('#midi-connect').click();
 await midiWait(()=>$('#midi-status').textContent==='Connected');assert.deepEqual(midiRequests,[{sysex:false}]);
 assert.ok($('#midi-input').textContent.includes('Studio keys <live>'));assert.equal($('#midi-input live'),null);
 $('[data-close]').click();
 for(const [id,note] of [['soprano-xylophone',72],['alto-xylophone',60],['bass-xylophone',48]]){
  await midiOpen(id);const before=midiPlayed.length;midiSend([0x90,60,100]);await midiWait(()=>midiPlayed.length>before);
  assert.equal(midiPlayed.at(-1).event.note,note);assert.equal(midiPlayed.at(-1).event.velocity,100/127);
  midiSend([0x80,60,0]);
 }
 $('#midi-button').click();$('#midi-learn').click();midiSend([0x90,48,100]);
 assert.match($('#midi-home').textContent,/MIDI 48/);assert.equal(JSON.parse(localStorage.getItem('orff-atelier-midi-v1')).home,48);
 $('[data-close]').click();const before=midiPlayed.length;midiSend([0x90,48,90]);await midiWait(()=>midiPlayed.length>before);
 assert.equal(midiPlayed.at(-1).event.note,48);midiSend([0x80,48,0]);
 $('#midi-button').click();$('#midi-home-reset').click();$('[data-close]').click();
});

test('MIDI records early first notes, velocity and held lengths; sustain, switching and unplug release recorders',async()=>{
 await midiOpen('tenor-recorder');$('#add-track').click();
 $('#record-settings').click();$('#count-in').checked=false;$('#count-in').dispatchEvent(new w.Event('change'));$('[data-close]').click();
 // Record directly from the sequencer, without needing the on-screen instrument view.
 clock=20;$('#record').click();await midiWait(()=>$('#record').classList.contains('recording'));
 clock=20.02;let before=midiPlayed.length;midiSend([0x90,60,64]);await midiWait(()=>midiPlayed.length>before);
 const first=midiPlayed.at(-1);assert.equal(first.options.hold,true);assert.equal(first.event.note,60);
 clock=21.32;midiSend([0x90,60,0]);assert.equal(first.voice.released,true,'velocity-zero note-on releases');
 $('#stop').click();$('#project-menu-button').click();$('#download-project').click();
 let saved=JSON.parse(await downloads.at(-1).text()),event=saved.tracks.find(t=>t.instrument==='tenor-recorder').events[0];
 assert.equal(event.beat,0,'slightly early first strike is retained at the downbeat');assert.ok(Math.abs(event.duration-1.3/(60/saved.bpm))<.01);assert.equal(event.writtenDuration,2);assert.equal(event.velocity,64/127);
 assert.ok($$('.seq-note').length||$('[data-event]'),'recorded MIDI notes appear in the sequencer');
 await midiOpen('soprano-recorder');before=midiPlayed.length;midiSend([0x90,60,100]);await midiWait(()=>midiPlayed.length>before);
 const held=midiPlayed.at(-1);assert.equal(held.event.note,72);midiSend([0xb0,64,127]);midiSend([0x80,60,0]);assert.equal(held.voice.released,false);
 midiSend([0xb0,64,0]);assert.equal(held.voice.released,true,'sustain-up releases the held recorder');
 before=midiPlayed.length;midiSend([0x90,62,100]);await midiWait(()=>midiPlayed.length>before);const switching=midiPlayed.at(-1);
 await midiOpen('alto-recorder');assert.equal(switching.voice.released,true,'instrument changes release the old register');
 before=midiPlayed.length;midiSend([0x90,65,100]);await midiWait(()=>midiPlayed.length>before);const alto=midiPlayed.at(-1);assert.equal(alto.event.note,65,'F recorder keeps pitch classes');
 midiSend([0x80,62,0]);assert.equal(alto.voice.released,false,'old key-up cannot release a new instrument note');
 midiPort.state='disconnected';midiAccess.dispatchEvent(new w.Event('statechange'));await midiWait(()=>$('#midi-status').textContent==='Waiting for device');assert.equal(alto.voice.released,true);
 midiPort.state='connected';midiAccess.dispatchEvent(new w.Event('statechange'));await midiWait(()=>$('#midi-status').textContent==='Connected');
 before=midiPlayed.length;midiSend([0x90,65,110]);await midiWait(()=>midiPlayed.length>before);const focused=midiPlayed.at(-1);w.dispatchEvent(new w.Event('blur'));assert.equal(focused.voice.released,true);
 w.dispatchEvent(new w.Event('focus'));$('#midi-button').click();$('#midi-connect').click();assert.equal($('#midi-status').textContent,'Connect');$('[data-close]').click();
});

test('MIDI touch controls meter and remember the played strength; recordings retain tone and screen playing is unchanged',async()=>{
 const slide=(id,value)=>{const e=$('#midi-'+id);e.value=value;e.dispatchEvent(new w.Event('input',{bubbles:true}))};
 await midiOpen('alto-xylophone');$('#add-track').click();$('#midi-button').click();$('#midi-connect').click();
 await midiWait(()=>$('#midi-status').textContent==='Connected');
 assert.equal($('#midi-curve').value,'normal');assert.equal($('#midi-fixed-row').hidden,true);
 change('#midi-curve','light');slide('min',20);slide('max',110);slide('tone',80);
 const touch=JSON.parse(localStorage.getItem('orff-atelier-midi-v1')).touch;
 assert.deepEqual(touch,{curve:'light',min:20,max:110,fixed:96,tone:.8});
 let before=midiPlayed.length;midiSend([0x90,60,40]);await midiWait(()=>midiPlayed.length>before);
 assert.equal(midiPlayed.at(-1).event.velocity,midiTouchVelocity(40/127,touch));assert.equal(midiPlayed.at(-1).event.dynamicTone,.8);
 assert.equal($('#midi-meter-input').value,40);assert.equal($('#midi-meter-output').value,Math.round(midiTouchVelocity(40/127,touch)*127));midiSend([0x80,60,0]);
 change('#midi-curve','fixed');slide('fixed',75);assert.equal($('#midi-fixed-row').hidden,false);
 for(const velocity of [10,120]){before=midiPlayed.length;midiSend([0x90,62,velocity]);await midiWait(()=>midiPlayed.length>before);assert.equal(midiPlayed.at(-1).event.velocity,75/127);midiSend([0x80,62,0]);}
 slide('min',120);assert.equal($('#midi-max').value,'120');assert.equal($('#midi-fixed').value,'120');
 slide('max',40);assert.equal($('#midi-min').value,'40');assert.equal($('#midi-fixed').value,'40');
 $('#midi-touch-reset').click();assert.deepEqual(JSON.parse(localStorage.getItem('orff-atelier-midi-v1')).touch,MIDI_TOUCH_DEFAULTS);
 change('#midi-curve','firm');slide('tone',90);$('[data-close]').click();$('#midi-button').click();
 assert.equal($('#midi-curve').value,'firm');assert.equal($('#midi-tone').value,'90');$('[data-close]').click();
 clock=30;$('#record').click();await midiWait(()=>$('#record').classList.contains('recording'));
 clock=30.02;before=midiPlayed.length;midiSend([0x90,60,60]);await midiWait(()=>midiPlayed.slice(before).some(v=>v.instrument==='alto-xylophone'&&v.event.dynamicTone===.9));
 const played={...midiPlayed.slice(before).find(v=>v.instrument==='alto-xylophone'&&v.event.dynamicTone===.9).event};clock=30.7;midiSend([0x80,60,0]);$('#stop').click();
 $('#midi-button').click();$('#midi-touch-reset').click();$('[data-close]').click();
 $('#project-menu-button').click();$('#download-project').click();const saved=JSON.parse(await downloads.at(-1).text());
 const event=saved.tracks.find(t=>t.instrument==='alto-xylophone').events[0];
 assert.equal(event.velocity,played.velocity);assert.equal(event.dynamicTone,.9);
 before=midiPlayed.length;clock=32;$('#play').click();await midiWait(()=>$('#play').classList.contains('playing'));clock=32.05;
 await midiWait(()=>midiPlayed.slice(before).some(v=>v.instrument==='alto-xylophone'));
 const replay=midiPlayed.slice(before).find(v=>v.instrument==='alto-xylophone');assert.equal(replay.event.dynamicTone,.9);assert.equal(replay.event.velocity,played.velocity);$('#stop').click();
 await midiOpen('alto-xylophone');before=midiPlayed.length;
 w.document.body.dispatchEvent(new w.KeyboardEvent('keydown',{key:'a',code:'KeyA',bubbles:true}));await midiWait(()=>midiPlayed.length>before);
 assert.equal(midiPlayed.at(-1).event.dynamicTone,undefined);assert.equal(midiPlayed.at(-1).event.velocity,.8);
 w.document.body.dispatchEvent(new w.KeyboardEvent('keyup',{key:'a',code:'KeyA',bubbles:true}));
 $('#midi-button').click();$('#midi-connect').click();$('[data-close]').click();
});


test('playback lights only the selected part, and console controls survive saving',async()=>{
 const {newProject,newTrack}=await import('../dist/catalog.js');
 const p=newProject();p.bars=1;p.bpm=120;p.loop=false;
 p.tracks=[newTrack('soprano-xylophone'),newTrack('soprano-xylophone'),newTrack('alto-xylophone')];
 p.tracks.forEach((t,i)=>{t.id='isolation-'+i;t.name=['Soprano I','Soprano II','Alto'][i];t.events=[{id:'isolation-note-'+i,note:72,beat:i===0?1:0,duration:.5,velocity:.7,shift:0}]});
 await $('#open-file').onchange({target:{files:[{size:1000,text:async()=>JSON.stringify(p)}],value:''}});
 $('[data-view="library"]').click();$('[data-track="isolation-0"]').click();
 await midiWait(()=>$('#sound-status')?.textContent==='READY TO PLAY');
 clock=40;$('#play').click();await midiWait(()=>$('#play').classList.contains('playing'));
 await new Promise(resolve=>originalSetTimeout(resolve,145));
 assert.equal($$('#stage-art .struck').length,0,'other tracks with the same pitch do not light this part');
 clock=40.6;await new Promise(resolve=>originalSetTimeout(resolve,70));
 assert.equal($$('#stage-art .struck').length,1,'the selected part lights its own note');
 $('[data-view="mixer"]').click();assert.equal($$('.mix-channel').length,3);
 const fader=$('[data-mix-id="isolation-1"][data-mix-prop="volume"]');fader.focus();fader.value='.37';fader.dispatchEvent(new w.Event('input',{bubbles:true}));
 change('#mix-room','4.5');assert.equal($('#play').classList.contains('playing'),true,'live mix adjustments keep playback running');
 const send=$('[data-mix-id="isolation-1"][data-mix-prop="reverbSend"]');send.value='.23';send.dispatchEvent(new w.Event('input',{bubbles:true}));
 $('#stop').click();$('#project-menu-button').click();$('#download-project').click();
 const saved=JSON.parse(await downloads.at(-1).text());assert.equal(saved.tracks[1].volume,.37);assert.equal(saved.tracks[1].reverbSend,.23);assert.equal(saved.reverbDecay,4.5);
 $('[data-close]').click();$('[data-view="ensemble"]').click();assert.equal($$('.ensemble-tile').length,3);
 $('[data-console-open="isolation-1"]').click();assert.equal($('.ensemble-item.selected').dataset.track,'isolation-1');assert.equal($('#content h1').textContent,'Soprano II');
});

test.after(()=>{$('#stop').click();dom.window.close();for(const timer of pendingTimers)clearTimeout(timer);globalThis.setTimeout=originalSetTimeout;AudioEngine.prototype.play=nativePlay;});

test('practice controls seek, persist loop settings, and My Part isolates listening',async()=>{
 const {newProject,newTrack}=await import('../dist/catalog.js');const p=newProject();p.bars=4;p.bpm=120;p.loop=false;
 p.tracks=[newTrack('alto-xylophone'),newTrack('soprano-xylophone')];p.tracks.forEach((t,i)=>{t.id='practice-'+i;t.events=[{id:'practice-event-'+i,note:72,beat:8,duration:1,velocity:.7,shift:0}]});
 await $('#open-file').onchange({target:{files:[{size:1000,text:async()=>JSON.stringify(p)}],value:''}});
 change('#practice-measure',3);$('#practice-go').click();assert.equal($('#practice-seek').value,'8');
 $('[data-view="my-part"]').click();await midiWait(()=>$('#my-part-score svg'));
 assert.equal($('#my-part-select').value,'practice-0');assert.match($('#my-measure-buttons').textContent,/Measure 3/);assert.equal($$('#my-part-score .vf-stavenote').length>0,true);
 $('[data-listen="part"]').click();let before=midiPlayed.length;clock=60;$('#play').click();await midiWait(()=>$('#play').classList.contains('playing'));clock=60.04;await midiWait(()=>midiPlayed.length>before);assert.deepEqual([...new Set(midiPlayed.slice(before).map(v=>v.instrument))],['alto-xylophone']);$('#stop').click();
 change('#practice-measure',3);$('#practice-go').click();$('[data-listen="accompaniment"]').click();before=midiPlayed.length;clock=61;$('#play').click();await midiWait(()=>$('#play').classList.contains('playing'));clock=61.04;await midiWait(()=>midiPlayed.length>before);assert.deepEqual([...new Set(midiPlayed.slice(before).map(v=>v.instrument))],['soprano-xylophone']);$('#stop').click();
 $('#rehearsal-dock details').open=true;change('#practice-first',2);change('#practice-last',3);$('#practice-enabled').click();change('#practice-speed',.75);assert.equal($('#rehearsal-dock details').open,true);
 $('#project-menu-button').click();$('#download-project').click();const saved=JSON.parse(await downloads.at(-1).text());assert.equal(saved.rehearsal.enabled,true);assert.equal(saved.rehearsal.first,2);assert.equal(saved.rehearsal.last,3);assert.equal(saved.rehearsal.speed,.75);assert.equal(saved.tracks[0].events[0].beat,8);$('[data-close]').click();
});

test('notation rhythm controls save separately from performed note lengths',async()=>{
 $('[data-view="score"]').click();change('#score-scope','section');change('#score-rhythm','mallets');
 assert.equal($('#score-rhythm').value,'mallets');const note=$('#score-body [aria-label^="Edit"]');assert.ok(note);note.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
 const performed=+$('#edit-duration').value;change('#edit-written-duration',2);assert.equal(+$('#edit-duration').value,performed);
 $('#project-menu-button').click();$('#download-project').click();const saved=JSON.parse(await downloads.at(-1).text());assert.equal(saved.notation.simplifyMalletGaps,true);const edited=saved.tracks.flatMap(t=>t.events).find(e=>e.writtenDuration===2);assert.ok(edited);assert.equal(edited.duration,performed);$('[data-close]').click();
 change('#edit-written-duration','played');assert.equal($('#edit-written-duration').value,'played');
});

test('score order controls move parts, save custom layout, and restore Orff order',async()=>{
 $('[data-view="score"]').click();change('#score-mode','teacher');
 const order=()=>[...$('#score-body .score-system').querySelectorAll('.score-staff')].map(e=>e.dataset.trackId);
 assert.deepEqual(order(),['practice-1','practice-0']);
 $('#score-order').click();assert.equal($('[data-score-move="practice-1"][data-direction="-1"]').disabled,true);
 $('[data-score-move="practice-1"][data-direction="1"]').click();assert.match($('#score-order-status').textContent,/position 2/);assert.equal(w.document.activeElement.dataset.scoreMove,'practice-1');
 $('#score-order-apply').click();assert.deepEqual(order(),['practice-0','practice-1']);assert.equal(w.document.activeElement.id,'score-order');
 $('#project-menu-button').click();$('#download-project').click();const saved=JSON.parse(await downloads.at(-1).text());assert.deepEqual(saved.notation.partOrder,['practice-0','practice-1']);assert.deepEqual(saved.tracks.map(t=>t.id),['practice-0','practice-1']);$('[data-close]').click();
 $('#score-order').click();$('#score-order-reset').click();$('#score-order-apply').click();assert.deepEqual(order(),['practice-1','practice-0']);
 $('#undo-button').click();assert.deepEqual(order(),['practice-0','practice-1']);
});

test('demo library opens a fresh playable copy, preserves the current project in Undo, and links downloads',async()=>{
 $('#project-menu-button').click();$('#demo-projects').click();assert.match($('#modal-content').textContent,/My Orf Assignment/);assert.equal($('.demo-actions a').getAttribute('href'),'demos/assignment-4.orff');assert.equal($('.demo-card img').getAttribute('src'),'demos/assignment-4-original.png');
 $('[data-demo-open="assignment-4"]').click();await midiWait(()=>$('#project-title').value==='My Orf Assignment');assert.equal($('#play-scope').value,'song');assert.equal($('[data-view="song"]').getAttribute('aria-current'),'page');
 $('#project-menu-button').click();$('#download-project').click();let saved=JSON.parse(await downloads.at(-1).text());assert.equal(saved.tracks.length,5);assert.equal(saved.arrangement.length,3);assert.equal(saved.loop,false);assert.equal(saved.tracks[0].events[0].note,79);
 $('#undo-button').click();assert.notEqual($('#project-title').value,'My Orf Assignment');$('#redo-button').click();assert.equal($('#project-title').value,'My Orf Assignment');
 change('#project-title','My changed demo');$('#project-menu-button').click();$('#demo-projects').click();$('[data-demo-open="assignment-4"]').click();await midiWait(()=>$('#project-title').value==='My Orf Assignment');
 $('[data-view="score"]').click();assert.equal($('#score-scope').value,'song');assert.equal($$('#score-body .blank').length,0);assert.equal($('#score-track').options.length,5);
});

test('teacher and student spacing settings are independent and persist',async()=>{
 assert.equal($('#score-spacing').value,'4');assert.equal($$('#score-body .score-system').length,6);
 change('#score-mode','student');assert.equal($('#score-spacing').value,'auto');assert.ok($$('#score-body .score-system').length>=12);
 change('#score-spacing','1');change('#score-mode','teacher');assert.equal($('#score-spacing').value,'4');
 change('#score-spacing','2');assert.equal($$('#score-body .score-system').length,12);change('#score-mode','student');assert.equal($('#score-spacing').value,'1');
 $('#project-menu-button').click();$('#download-project').click();const saved=JSON.parse(await downloads.at(-1).text());assert.equal(saved.notation.teacherMeasures,2);assert.equal(saved.notation.partMeasures,1);
});

test('welcome screen reopens from Project, blocks playback shortcuts, and preserves the session',()=>{
 const title=$('#project-title').value;$('#project-menu-button').click();$('#show-welcome').click();
 assert.equal($('#welcome').open,true);assert.equal($('#modal').open,false);assert.equal(w.document.activeElement.id,'welcome-enter');
 w.document.body.dispatchEvent(new w.KeyboardEvent('keydown',{key:' ',bubbles:true}));assert.equal($('#play').classList.contains('playing'),false);
 $('#welcome-skip').checked=true;$('#welcome-enter').click();assert.equal($('#welcome').open,false);assert.equal($('#project-title').value,title);assert.equal(localStorage.getItem('mallet-measure-skip-welcome-v1'),'true');assert.equal(w.document.activeElement.id,'main');
});

test('video export offers classroom modes and safely disables unsupported encoders',async()=>{
 $('#project-menu-button').click();$('#demo-projects').click();$('[data-demo-open="assignment-4"]').click();await midiWait(()=>$('#project-title').value==='My Orf Assignment');
 $('#export-button').click();$('[data-export="video"]').click();await midiWait(()=>$('#video-support')?.textContent.includes('unavailable'));
 assert.equal($('#video-start').disabled,true);assert.equal($('#video-part').options.length,5);assert.equal($('#video-count').checked,true);change('#video-mode','ensemble');assert.equal($('#video-visible').hidden,false);assert.equal($('#video-part-field').hidden,true);change('#video-mode','student');assert.equal($('#video-visible').hidden,true);assert.match($('#modal-content').textContent,/Include software credit/);$('[data-close]').click();
});

test('task navigation remembers destinations and context separates editing from playback',async()=>{
 change('#project-title','Navigation test setup');
 $('#project-menu-button').click();$('#demo-projects').click();$('[data-demo-open="assignment-4"]').click();await midiWait(()=>$('#project-title').value==='My Orf Assignment');
 assert.equal($('[data-workspace="compose"]').getAttribute('aria-pressed'),'true');assert.equal($('.workspace-tools [data-view="song"]').hidden,false);assert.match($('#context-scope').textContent,/Full song/);assert.match($('#context-edit').textContent,/Editing:/);
 $('[data-workspace="rehearse"]').click();assert.equal($('.workspace-tools [data-view="my-part"]').hidden,false);assert.equal($('.workspace-tools [data-view="song"]').hidden,true);
 $('[data-workspace="compose"]').click();assert.equal($('.workspace-tools [data-view="song"]').getAttribute('aria-current'),'page');
 $('[data-view="mixer"]').click();assert.equal($('.main-nav [data-view="mixer"]').getAttribute('aria-current'),'page');
 change('#play-scope','section');assert.equal($('#context-scope').textContent,'Playback: Current section');assert.match($('#context-tempo').textContent,/108 BPM · 6\/8/);
 $('#export-button').click();$('[data-export="video"]').click();await midiWait(()=>$('#video-support')?.textContent.includes('unavailable'));assert.equal($('#video-layout').value,'notation');assert.equal($('#video-preview-start').disabled,true);assert.ok($('#video-player').controls);change('#video-mode','ensemble');assert.equal($('#video-layout-field').hidden,true);$('[data-close]').click();
});

test('touch recording keeps a 200ms-early first note and excludes earlier count-in taps',async()=>{
 $('#stop').click();$('#project-menu-button').click();$('#new-project').click();$('#confirm-action').click();
 $('[data-open="alto-xylophone"]').click();await midiWait(()=>$('#sound-status')?.textContent==='READY TO PLAY');
 $('#add-track').click();$('#record-settings').click();$('#count-in').checked=true;$('#count-in').dispatchEvent(new w.Event('change'));change('#record-grid','.25');$('[data-close]').click();$('#play-instrument').click();
 change('#bpm','120');clock=10;$('#record').click();await midiWait(()=>$('#transport-state').textContent.startsWith('COUNT IN'));
 const tap=index=>{const e=new w.Event('pointerdown',{bubbles:true,cancelable:true});Object.defineProperties(e,{pointerId:{value:9},button:{value:0},timeStamp:{value:performance.now()}});$(`[data-hit="${index}"]`).dispatchEvent(e)};
 clock=11.5;tap(2); // too early: 620 ms before the first beat
 clock=11.92;tap(0); // 200 ms early: must be beat zero even on a sixteenth-note grid
 clock=12.62;tap(1);await new Promise(resolve=>originalSetTimeout(resolve,30));$('#stop').click();
 $('#project-menu-button').click();$('#download-project').click();let project=JSON.parse(await downloads.at(-1).text());
 assert.deepEqual(project.tracks[0].events.map(e=>[e.note,e.beat]),[[60,0],[62,1]]);
});

test('touch input while recording arms is retained, and Stop cancels the queued take',async()=>{
 $('#record-settings')?.click();if(!$('#count-in')){$('[data-view="sequence"]').click();$('#record-settings').click();}
 $('#count-in').checked=false;$('#count-in').dispatchEvent(new w.Event('change'));$('[data-close]').click();$('#play-instrument').click();
 const nativePrepare=AudioEngine.prototype.prepareProject;let ready;
 AudioEngine.prototype.prepareProject=async function(project){await new Promise(resolve=>ready=resolve);return nativePrepare.call(this,project)};
 const tap=()=>{const e=new w.Event('pointerdown',{bubbles:true,cancelable:true});Object.defineProperties(e,{pointerId:{value:10},button:{value:0}});$('[data-hit="4"]').dispatchEvent(e)};
 try{
  clock=20;$('#record').click();assert.equal($('#transport-state').textContent,'PREPARING RECORDING');tap();clock=20.1;ready();
  await midiWait(()=>$('#transport-state').textContent!=='PREPARING RECORDING');$('#stop').click();
  $('#project-menu-button').click();$('#download-project').click();let project=JSON.parse(await downloads.at(-1).text());assert.equal(project.tracks[0].events.length,3);assert.equal(project.tracks[0].events.at(-1).beat,0);
  clock=30;$('#record').click();tap();$('#stop').click();ready();await new Promise(resolve=>originalSetTimeout(resolve,50));
  assert.equal($('#transport-state').textContent,'READY TO PLAY');$('#project-menu-button').click();$('#download-project').click();project=JSON.parse(await downloads.at(-1).text());assert.equal(project.tracks[0].events.length,3);
 }finally{AudioEngine.prototype.prepareProject=nativePrepare;$('#stop').click();}
});

test('record length quantization defaults off and persists independently of the start grid',async()=>{
 $('[data-view="sequence"]').click();$('#record-settings').click();assert.equal($('#quantize-lengths').checked,false);
 change('#record-grid','.5');$('#quantize-lengths').checked=true;$('#quantize-lengths').dispatchEvent(new w.Event('change'));$('[data-close]').click();
 $('#record-settings').click();assert.equal($('#quantize-lengths').checked,true);assert.equal($('#record-grid').value,'.5');
 $('[data-close]').click();$('#project-menu-button').click();$('#download-project').click();const saved=JSON.parse(await downloads.at(-1).text());assert.equal(saved.recording.quantizeLengths,true);
});

test('automatic part lengths clears saved notation overrides and supports Undo',async()=>{
 $('[data-view="library"]').click();$('[data-open="soprano-recorder"]').click();$('#add-track').click();
 $('[data-cell="0,0"]').click();$('[data-cell="0,0"]').click();change('#edit-written-duration','0.5');
 $('[data-view="score"]').click();assert.ok($('#auto-part-lengths'));$('#auto-part-lengths').click();
 $('#project-menu-button').click();$('#download-project').click();let saved=JSON.parse(await downloads.at(-1).text());assert.equal(saved.tracks.find(t=>t.instrument==='soprano-recorder').events[0].writtenDuration,undefined);assert.equal(saved.tracks.find(t=>t.instrument==='soprano-recorder').events[0].duration,.5);
 $('[data-close]').click();$('#undo-button').click();$('#project-menu-button').click();$('#download-project').click();saved=JSON.parse(await downloads.at(-1).text());assert.equal(saved.tracks.find(t=>t.instrument==='soprano-recorder').events[0].writtenDuration,.5);
});

test('undo take removes only the last pass and normal Undo restores it',async()=>{
 assert.equal($('#undo-take').disabled,false);$('#master').value='.42';$('#master').dispatchEvent(new w.Event('input'));
 $('#undo-take').click();$('#project-menu-button').click();$('#download-project').click();let saved=JSON.parse(await downloads.at(-1).text());
 assert.equal(saved.tracks[0].events.length,2);assert.equal(saved.master,.42);
 $('#undo-button').click();$('#project-menu-button').click();$('#download-project').click();saved=JSON.parse(await downloads.at(-1).text());assert.equal(saved.tracks[0].events.length,3);assert.equal(saved.master,.42);
 $('#undo-take').click();$('#undo-take').click();assert.equal($('#undo-take').disabled,true);
});

test('instrument recording options and sequencer share one visible quantization grid',()=>{
 $('[data-view="library"]').click();$('[data-open="alto-xylophone"]').click();
 $('#transport-record-settings').click();assert.equal($('#modal').open,true);assert.ok($('#quantize-lengths'));assert.ok($('#count-in'));assert.ok($('#metro-volume'));
 change('#record-grid','.25');assert.match($('#transport-record-settings').textContent,/1\/16/);$('[data-close]').click();assert.ok($('#stage-art'));
 $('#add-track').click();assert.equal($('#grid').value,'.25');change('#grid','1');assert.match($('#transport-record-settings').textContent,/¼/);
 $('#transport-record-settings').click();assert.equal($('#record-grid').value,'1');change('#record-grid','.5');assert.equal($('#grid').value,'.5');$('[data-close]').click();
 $('#play-instrument').click();assert.match($('#transport-record-settings').textContent,/⅛/);$('#transport-record-settings').click();assert.equal($('#record-grid').value,'.5');
});
