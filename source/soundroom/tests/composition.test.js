import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {StepRecorder,capturePerformance,validatePerformance,applyPerformance,songTimeline,moveSongEntry} from '../src/composition-model.js';
import {createProject,clone} from '../src/sequencer-model.js';
const bank=JSON.parse(await readFile(new URL('../src/soundfonts.json',import.meta.url),'utf8'))[0];
const effects={reverbEnabled:true,reverbMix:25,reverbType:4,reverbDecay:64,reverbDamping:2,reverbPredelay:12,delayEnabled:false,delayMix:25,delayTime:100,delayFeedback:35,delayDamping:2,delayStereo:true};

test('step chords keep velocities, wait for every owner, and support rests, ties and triplets without a clock',()=>{
 const notes=[],step=new StepRecorder(chord=>{notes.push(...chord);return true});step.enabled=true;step.length=1/3;
 step.on('left',60,48,16);step.on('right',64,113,16);step.on('double',60,76,16);
 assert.equal(step.off('left',16),false);assert.equal(step.off('double',16),false);assert.equal(notes.length,0);
 assert.equal(step.off('right',16),true);assert.deepEqual(notes.map(n=>[n.pitch,n.velocity,n.start,n.duration]),[[60,76,0,1/3],[64,113,0,1/3]]);assert.equal(step.cursor,1/3);
 assert.equal(step.tie(notes,16,fn=>{fn();return true}),true);assert.equal(step.cursor,2/3);assert.equal(notes[0].duration,2/3);assert.deepEqual(notes[0].original,{start:0,duration:2/3});
 step.rest(16);assert.equal(step.cursor,1);assert.equal(step.canTie(notes,16),false);step.back(16);assert.ok(Math.abs(step.cursor-2/3)<1e-10);assert.equal(notes.length,2);
});

test('step entry cancels held chords, respects failed edits and clips at the pattern end without wrapping',()=>{
 let commit=false;const notes=[],step=new StepRecorder(chord=>{if(commit)notes.push(...chord);return commit});step.enabled=true;step.length=1;
 step.on('a',60,88,4);step.cancel();step.off('a',4);assert.equal(notes.length,0);
 step.on('a',60,88,4);step.off('a',4);assert.equal(step.cursor,0);commit=true;step.seek(3.75,4);step.on('b',64,99,4);step.off('b',4);assert.equal(notes[0].duration,.25);assert.equal(step.cursor,4);assert.equal(step.on('c',67,99,4),false);assert.equal(step.canTie(notes,4),false);step.back(4);assert.equal(step.cursor,3);
});

test('performance recall changes all eight parts but never scene events, names, tempo or song arrangement',()=>{
 const p=createProject(bank.presets);p.tracks[3].volume=71;p.tracks[7].shape.release=102;
 const saved=validatePerformance(capturePerformance(p,'My ensemble',bank,effects,57),bank.presets,bank);
 assert.equal(saved.tracks.length,8);assert.equal(saved.tracks[3].volume,71);assert.equal(saved.master,57);assert.equal('notes' in saved.tracks[0],false);assert.equal('scenes' in saved,false);
 const target=createProject(bank.presets);target.tempo=123;target.selectedScene=5;target.scenes[5].name='Bridge';target.scenes[5].tracks[2].notes.push({id:'note',pitch:64,velocity:93,start:1,duration:.5});target.scenes[2].tracks[0].controllers.push({id:'pedal',type:'cc',controller:64,value:127,beat:2});target.song=[{id:'a',scene:5,repeats:3}];
 const untouched=clone({scenes:target.scenes,song:target.song,tempo:target.tempo,selectedScene:target.selectedScene});applyPerformance(target,saved);
 assert.deepEqual({scenes:target.scenes,song:target.song,tempo:target.tempo,selectedScene:target.selectedScene},untouched);assert.equal(target.tracks[2].notes,target.scenes[5].tracks[2].notes);assert.equal(target.tracks[7].shape.release,102);assert.equal(target.performanceName,'My ensemble');
 target.tracks[2].notes=[];assert.equal(target.scenes[5].tracks[2].notes.length,0);
});

test('performance imports reject wrong banks, missing parts, unknown patches and invalid effects',()=>{
 const valid=capturePerformance(createProject(bank.presets),'Keys',bank,effects,65);
 for(const mutate of [x=>x.soundfont.id='other',x=>x.tracks.pop(),x=>x.tracks[0].patch.program=999,x=>x.effects.delayFeedback=100,x=>x.tracks[0].volume='99',x=>x.master=-1]){const invalid=clone(valid);mutate(invalid);assert.throws(()=>validatePerformance(invalid,bank.presets,bank))}
});

test('song blocks use exact scene lengths and repeats; moving entries keeps scene patterns shared',()=>{
 const p=createProject(bank.presets);p.scenes[0].bars=1;p.scenes[1].bars=8;p.scenes[2].bars=256;p.song=[{id:'a',scene:0,repeats:2},{id:'b',scene:1,repeats:3},{id:'c',scene:2,repeats:1}];
 assert.deepEqual(songTimeline(p).map(e=>[e.id,e.start,e.bars]),[['a',0,2],['b',2,24],['c',26,256]]);const scenes=JSON.stringify(p.scenes);
 moveSongEntry(p.song,'a',3);assert.deepEqual(p.song.map(e=>e.id),['b','c','a']);moveSongEntry(p.song,'a',0);assert.deepEqual(p.song.map(e=>e.id),['a','b','c']);moveSongEntry(p.song,'b',2);assert.deepEqual(p.song.map(e=>e.id),['a','b','c']);assert.equal(JSON.stringify(p.scenes),scenes);
});
