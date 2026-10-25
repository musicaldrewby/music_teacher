import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {BasicMIDI} from 'spessasynth_core';
import {createProject,createTimelineProject,patternProject,copyScene,clone,validateProject,compileScore,AudioTimeline,songBeats} from '../src/sequencer-model.js';
import {TempoMap,projectTempoMap} from '../src/tempo-map.js';
import {arrangeProject} from '../src/arrangement.js';
import {exportMIDI} from '../src/export-formats.js';
const presets=JSON.parse(await readFile(new URL('../src/soundfonts.json',import.meta.url),'utf8'))[0].presets;
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} should equal ${b}`);

test('each pattern retains its tempo through switching, copy, clone, save and reload',()=>{
 const p=createProject(presets);p.tempo=126;p.selectedScene=1;p.tempo=83;p.selectedScene=7;p.tempo=300;
 assert.equal(patternProject(p,0).tempo,126);assert.equal(patternProject(p,1).tempo,83);assert.equal(patternProject(p,2).tempo,100);
 copyScene(p,1,3);assert.equal(p.scenes[3].tempo,83);const loaded=validateProject(JSON.parse(JSON.stringify(p)),presets);
 assert.deepEqual(loaded.scenes.map(s=>s.tempo),[126,83,100,83,100,100,100,300]);assert.equal(loaded.tempo,300);
 const undo=clone(loaded);undo.selectedScene=0;undo.tempo=99;assert.equal(loaded.scenes[0].tempo,126);assert.equal(undo.scenes[0].tempo,99);
 for(const bad of [0,29,301,null,'120',Infinity]){const raw=JSON.parse(JSON.stringify(p));raw.scenes[4].tempo=bad;assert.throws(()=>validateProject(raw,presets),/tempo/)}
});

test('older project files inherit their former shared tempo in all eight patterns',()=>{
 const raw=JSON.parse(JSON.stringify(createProject(presets)));raw.tempo=137;raw.selectedScene=5;for(const s of raw.scenes)delete s.tempo;
 const restored=validateProject(raw,presets);assert.deepEqual(restored.scenes.map(s=>s.tempo),Array(8).fill(137));
 const legacy=createTimelineProject(presets);legacy.tempo=73;assert.deepEqual(validateProject(legacy,presets).scenes.map(s=>s.tempo),Array(8).fill(73));
});

function song(){const p=createProject(presets);for(let i=0;i<3;i++){p.scenes[i].tempo=[120,60,240][i];p.scenes[i].bars=1;for(let track=0;track<8;track++)p.scenes[i].tracks[track].notes=[{pitch:60+i,velocity:90,start:0,duration:1},{pitch:72+i,velocity:90,start:1.5,duration:.25}]}
 p.song=[{scene:0,repeats:2},{scene:1,repeats:1},{scene:2,repeats:1},{scene:0,repeats:1}];p.selectedScene=7;return arrangeProject(p)}

test('song beat/time mapping follows pattern order and repeats at exact boundaries',()=>{
 const p=song(),map=projectTempoMap(p);assert.equal(p.tempo,120);assert.deepEqual(p.tempoChanges,[{beat:0,tempo:120},{beat:8,tempo:60},{beat:12,tempo:240},{beat:16,tempo:120}]);
 close(map.secondsAt(songBeats(p)),11);for(const [beat,time] of [[-4,-2],[0,0],[8,4],[9,5],[12,8],[16,9],[20,11]]){close(map.secondsAt(beat),time);close(map.beatAt(time),beat)}
 for(let beat=-4;beat<=24;beat+=.137)close(map.beatAt(map.secondsAt(beat)),beat);
 assert.equal(map.tempoAt(7.999),120);assert.equal(map.tempoAt(8),60);assert.equal(map.tempoAt(12),240);
 const eighths=new TempoMap(90,[{beat:3,tempo:180}]);close(eighths.secondsAt(6),3);
});

test('audio timeline keeps eight parts, click and song position aligned through tempo changes',()=>{
 const p=song();p.metronome='on';const timeline=new AudioTimeline(),trace=[];timeline.start(compileScore(p),.25);
 for(let t=0;t<11.4;t+=.002)timeline.tick(t,t+.002,(e,time)=>trace.push({...e,time}));
 const ons=trace.filter(e=>e.message?.[0]===0x98);assert.equal(ons.length,10);
 const map=projectTempoMap(p);for(const e of trace)close(e.time,.25+map.secondsAt(e.beat));
 for(let track=1;track<8;track++)assert.deepEqual(trace.filter(e=>e.message?.[0]===0x98+track).map(e=>e.time),ons.map(e=>e.time));
 close(timeline.position(8.375),12.5);assert.equal(timeline.playing,false);
 // Loop resets also use the full mapped duration, with no cumulative tempo drift.
 const loop=new AudioTimeline();loop.start({...compileScore(p),loop:true},0);close(loop.timeAt(28),15);close(loop.position(15),28);
});

test('MIDI conductor exports all pattern tempo changes at musical beat positions',()=>{
 const p=song(),midi=BasicMIDI.fromArrayBuffer(exportMIDI(p).buffer,'tempos.mid');
 const tempos=midi.tracks[0].events.filter(e=>e.statusByte===81).map(e=>({beat:e.ticks/960,tempo:Math.round(60000000/((e.data[0]<<16)|(e.data[1]<<8)|e.data[2]))}));
 assert.deepEqual(tempos,p.tempoChanges);assert.equal(midi.tracks.length,9);
});
