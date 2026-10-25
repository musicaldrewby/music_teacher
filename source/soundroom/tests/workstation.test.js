import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {createProject,createTimelineProject,patternProject,copyScene,clone,validateProject,Recorder,compileScore,extractRange,eraseRange} from '../src/sequencer-model.js';
import {editBars,arrangeProject,arrangementBars} from '../src/arrangement.js';
import {writeRecovery,readRecovery,retainRecovery,PREVIOUS_KEY} from '../src/recovery.js';
import {exportMIDI,zipFiles} from '../src/export-formats.js';
const require=createRequire(import.meta.url),core=await import(pathToFileURL(require.resolve('spessasynth_core')).href);
const fonts=JSON.parse(await readFile(new URL('../src/soundfonts.json',import.meta.url),'utf8'));
const project=()=>createProject(fonts[0].presets);
const note=(start,duration=1,pitch=60)=>({id:'n'+start+pitch,start,duration,pitch,velocity:96,original:{start,duration}});

test('measure copy includes crossing notes and controller state on all tracks, and move/erase preserve outside passages',()=>{
 const p=project();p.loop=false;
 p.tracks.forEach((t,i)=>{t.notes=[note(3,3,60+i),note(7,2,64+i),note(12,1,67+i)];t.controllers=[{id:'m',beat:2,type:'cc',controller:1,value:42},{id:'s',beat:5,type:'cc',controller:64,value:127}]});
 editBars(p,{from:2,to:2,target:4,scope:'all',action:'copy'});
 for(const t of p.tracks){assert.ok(t.notes.some(n=>n.start===12&&n.duration===2));assert.ok(t.notes.some(n=>n.start===15&&n.duration===1));assert.ok(t.controllers.some(c=>c.beat===12&&c.controller===1&&c.value===42));assert.ok(t.controllers.some(c=>c.beat===16&&c.controller===64&&c.value===0))}
 const before=clone(p.tracks[1]);editBars(p,{from:2,to:2,target:6,scope:'track',action:'move'});assert.deepEqual(p.tracks[1],before);
 assert.ok(p.tracks[0].notes.some(n=>n.start===3&&n.duration===1));assert.ok(p.tracks[0].notes.some(n=>n.start===8&&n.duration===1));assert.ok(p.tracks[0].notes.some(n=>n.start===20&&n.duration===2));
 editBars(p,{from:6,to:6,scope:'track',action:'erase'});assert.ok(!p.tracks[0].notes.some(n=>n.start>=20&&n.start<24));validateProject(p,fonts[0].presets);
 const prior=JSON.stringify(p);assert.throws(()=>editBars(p,{from:1,to:4,target:256,action:'copy'}),/256/);assert.equal(JSON.stringify(p),prior);
});

test('eight patterns hold independent notes and lengths, while song repeats use one shared performance',()=>{
 const p=project();assert.equal(p.scenes.length,8);assert.ok(p.scenes.every(s=>s.bars===4));p.scenes[0].name='Moonlight & <starlight>';p.tracks[0].notes=[note(0)];p.bars=256;
 p.selectedScene=1;p.bars=1;p.scenes[1].name='A completely different name';p.tracks[0].notes=[note(1)];p.tracks[0].pan=19;
 assert.equal(p.scenes[0].tracks[0].notes[0].start,0);assert.equal(p.scenes[0].bars,256);assert.equal(patternProject(p,0).tracks[0].pan,19);assert.equal(patternProject(p,1).tracks[0].pan,19);
 p.scenes[0].tracks[0].notes.push(note(1023.75,.25,72));p.tracks[0].patch=clone(p.tracks[1].patch);const longScore=compileScore(patternProject(p,0));assert.equal(longScore.length,1024);assert.ok(longScore.events.some(e=>e.beat===1023.75&&e.message?.[0]===0x98&&e.message[1]===72));assert.deepEqual(patternProject(p,0).tracks[0].patch,patternProject(p,1).tracks[0].patch);
 p.song=[{id:'a',scene:1,repeats:2},{id:'b',scene:0,repeats:1}];const before=JSON.stringify(p),out=arrangeProject(p);assert.equal(arrangementBars(p),258);assert.equal(out.bars,258);assert.deepEqual(out.tracks[0].notes.map(n=>n.start),[1,5,8,1031.75]);assert.equal(out.loop,false);assert.equal(JSON.stringify(p),before);
 const loaded=validateProject(JSON.parse(before),fonts[0].presets);assert.equal(loaded.scenes.length,8);assert.equal(loaded.scenes[0].name,p.scenes[0].name);assert.equal(arrangementBars(loaded),258);copyScene(loaded,1,2);loaded.selectedScene=2;loaded.tracks[0].notes[0].pitch=72;assert.equal(loaded.scenes[1].tracks[0].notes[0].pitch,60);assert.equal(loaded.tracks[0].pan,19);
 const encoded=JSON.parse(JSON.stringify(loaded));assert.equal('notes' in encoded.tracks[0],false,'shared performance stores no duplicate event arrays');assert.equal(encoded.scenes.length,8);encoded.sceneSwitch='pattern';assert.equal(validateProject(encoded,fonts[0].presets).sceneSwitch,'bar','older preferences use next-measure switching');encoded.scenes[0].bars=257;assert.throws(()=>validateProject(encoded,fonts[0].presets),/length/);
});

test('old projects retain all source notes and their arranged song during migration',()=>{
 const old=createTimelineProject(fonts[0].presets);old.bars=8;old.name='Legacy song';old.tracks[0].notes=[note(0),note(8)];old.sections=[{id:'a',name:'Opening',from:1,bars:1},{id:'b',name:'Finale',from:3,bars:1}];old.arrangement=[{id:'entry',sectionId:'b',repeats:2},{id:'last',sectionId:'a',repeats:1}];
 const p=validateProject(JSON.parse(JSON.stringify(old)),fonts[0].presets);assert.equal(p.version,2);assert.deepEqual(p.scenes[0].tracks[0].notes.map(n=>n.start),[0,8]);assert.deepEqual(p.scenes[1].tracks[0].notes.map(n=>n.start),[0,4,8]);assert.equal(p.scenes[1].bars,3);assert.equal(p.song[0].scene,1);assert.equal(p.legacyProject.sections.length,2);assert.equal(p.legacyProject.name,'Legacy song');assert.equal(validateProject(JSON.parse(JSON.stringify(p)),fonts[0].presets).scenes.length,8);
});

test('punch recording replaces only its range, ignores outside input, captures early entry and clips held notes at punch out',()=>{
 for(const mode of ['overdub','replace']){
  const p=project();p.recordMode=mode;p.loop=false;p.punch={enabled:true,from:2,to:2};p.tracks[0].notes=[note(0),note(5),note(9)];p.tracks[1].notes=[note(5)];
  const r=new Recorder(p);r.start(0);r.noteOn('a',72,90,1);r.noteOff('a',2);r.noteOn('b',74,97,3.95);r.noteOff('b',4.5);r.noteOn('c',76,99,7.75);r.noteOff('c',9);r.noteOn('d',77,80,9);r.noteOff('d',10);r.controller({type:'cc',controller:64,value:127},3.95);r.controller({type:'cc',controller:64,value:127},7);r.controller({type:'cc',controller:1,value:90},9);r.stop(12);
  const t=p.tracks[0];assert.ok(t.notes.some(n=>n.start===0));assert.ok(t.notes.some(n=>n.start===9));assert.equal(t.notes.some(n=>n.start===5),mode==='overdub');assert.equal(p.tracks[1].notes.length,1);
  const early=t.notes.find(n=>n.pitch===74);assert.equal(early.start,4);assert.ok(Math.abs(early.duration-.55)<1e-9);assert.equal(t.notes.find(n=>n.pitch===76).duration,.25);assert.ok(!t.notes.some(n=>[72,77].includes(n.pitch)));assert.ok(!t.controllers.some(c=>c.controller===1&&c.beat===9));
  assert.ok(t.controllers.some(c=>c.beat===4&&c.controller===64&&c.value===127));assert.ok(t.controllers.some(c=>c.beat===8&&c.controller===64&&c.value===0));validateProject(p,fonts[0].presets);
 }
});

test('range edits preserve wrapped notes outside an erased range and resolve them before extending a loop',()=>{
 const p=project();p.bars=2;p.tracks[0].notes=[note(7.5,1)];eraseRange(p.tracks[0],3,4,8,true);assert.equal(p.tracks[0].notes.length,1);assert.equal(p.tracks[0].notes[0].duration,1);
 editBars(p,{from:1,to:1,target:3,action:'copy'});assert.equal(p.bars,3);assert.ok(p.tracks[0].notes.some(n=>n.start===0&&n.duration===.5));assert.ok(p.tracks[0].notes.some(n=>n.start===7.5&&n.duration===.5));assert.ok(p.tracks[0].notes.some(n=>n.start===8&&n.duration===.5));
});

test('recovery is local, retains a previous session, preserves settings, and reports storage failures',()=>{
 const values=new Map(),storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};const p=project();p.name='My saved piece';p.effects={delayEnabled:true};
 assert.equal(writeRecovery(storage,p),true);assert.equal(writeRecovery(storage,p),false);retainRecovery(storage);p.name='New session';writeRecovery(storage,p);assert.equal(readRecovery(storage).project.name,'New session');assert.equal(readRecovery(storage,PREVIOUS_KEY).project.name,'My saved piece');assert.equal(readRecovery(storage,PREVIOUS_KEY).project.effects.delayEnabled,true);
 assert.throws(()=>writeRecovery({getItem:()=>null,setItem:()=>{throw new Error('quota')}},p),/quota/);
});

test('MIDI export parses with the real engine and contains tempo, eight tracks, named markers, note lengths and expression',()=>{
 const p=createTimelineProject(fonts[0].presets);p.tempo=117;p.meter=[6,8];p.sections=[{id:'s',name:'My own section',from:2,bars:2}];p.tracks[0].notes=[note(.137,.456)];p.tracks[0].controllers=[{beat:1.25,type:'bend',value:10000}];p.tracks[7].notes=[note(0,.1,36)];
 const bytes=exportMIDI(p);assert.equal(Buffer.from(bytes).subarray(0,4).toString(),'MThd');assert.ok(Buffer.from(bytes).includes(Buffer.from('My own section')));
 const midi=core.BasicMIDI.fromArrayBuffer(bytes.buffer,'test.mid');assert.equal(midi.tracks.length,9);assert.equal(midi.timeDivision,960);assert.ok(midi.duration>0);
 const track=midi.tracks[1].events,on=track.find(e=>(e.statusByte&240)===144),off=track.find(e=>(e.statusByte&240)===128);assert.equal(on.ticks,Math.round(.137*960));assert.equal(off.ticks,Math.round((.137+.456)*960));
 assert.ok(track.some(e=>(e.statusByte&240)===224));
});

test('ZIP export has valid file offsets, names, sizes and CRC checksums',()=>{
 const data=new TextEncoder().encode('123456789');const zip=new Uint8Array(zipFiles([{name:'01_Piano.wav',data:data.buffer}])),view=new DataView(zip.buffer);assert.equal(view.getUint32(0,true),0x04034b50);assert.equal(view.getUint32(14,true),0xcbf43926);assert.equal(view.getUint32(18,true),9);assert.equal(view.getUint16(zip.length-12,true),1);const offset=view.getUint32(zip.length-6,true);assert.equal(view.getUint32(offset,true),0x02014b50);assert.equal(view.getUint32(offset+42,true),0);
});
