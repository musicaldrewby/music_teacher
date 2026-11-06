import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {keyboardRoutes} from '../src/performance-engine.js';
import {createProject,KeyboardRecorder,validateProject,clone,compileScore} from '../src/sequencer-model.js';
import {factoryPerformances,validatePerformance,applyPerformance,capturePerformance} from '../src/composition-model.js';
const bank=JSON.parse(await readFile(new URL('../src/soundfonts.json',import.meta.url),'utf8'))[0];
const library=factoryPerformances(bank.presets,bank);
test('all eight factory performances validate, survive save/open and preserve existing scene notes',()=>{
 assert.equal(library.length,8);
 for(const preset of library){
  const valid=validatePerformance(preset,bank.presets,bank),project=createProject(bank.presets);
  project.tracks[4].notes.push({id:'keep',pitch:60,velocity:80,start:1,duration:1,original:{start:1,duration:1}});
  const before=JSON.stringify(project.scenes);applyPerformance(project,valid);assert.equal(JSON.stringify(project.scenes),before);
  const opened=validateProject(JSON.parse(JSON.stringify(project)),bank.presets);assert.equal(opened.keyboardMode,'layers');assert.deepEqual(opened.tracks.map(t=>t.zone),valid.tracks.map(t=>t.zone));
  assert.ok(keyboardRoutes(opened,7,60,100).length>=1);
  const copy=validatePerformance(capturePerformance(opened,'Custom',bank,valid.effects,valid.master),bank.presets,bank);assert.equal(copy.keyboardMode,'layers');assert.deepEqual(copy.tracks.map(t=>t.zone),valid.tracks.map(t=>t.zone));
 }
});
test('split uses the played pitch, velocity gates are inclusive, transposition never creates invalid MIDI',()=>{
 const p=createProject(bank.presets);applyPerformance(p,library.find(x=>x.name==='After Hours Split'));
 assert.deepEqual(keyboardRoutes(p,6,59,80).map(x=>x.channel),[0]);assert.deepEqual(keyboardRoutes(p,6,60,80).map(x=>x.channel),[1,2]);
 p.tracks[1].shape.octave=1;assert.equal(keyboardRoutes(p,0,60,80)[0].note,72);assert.equal(keyboardRoutes(p,0,127,80).some(x=>x.channel===1),false);
 applyPerformance(p,library.find(x=>x.name==='Velvet Keys'));assert.equal(keyboardRoutes(p,0,60,95).length,2);assert.equal(keyboardRoutes(p,0,60,96).length,3);
 p.keyboardMode='single';assert.deepEqual(keyboardRoutes(p,6,60,40).map(x=>x.channel),[6]);
 p.keyboardMode='layers';assert.deepEqual(keyboardRoutes(p,6,60,40,false).map(x=>x.channel),[6]);
 p.tracks[1].mute=true;assert.equal(keyboardRoutes(p,0,60,100)[1].monitored,false);
});
test('layer recording preserves track identity, expression, original timing and existing non-layer parts',()=>{
 const p=createProject(bank.presets);applyPerformance(p,library[0]);p.recordGrid='off';p.recordMode='replace';
 for(let i=0;i<8;i++)p.tracks[i].notes.push({id:'old'+i,pitch:70,velocity:90,start:0,duration:1});
 const changes=[],r=new KeyboardRecorder(p,c=>changes.push(c));r.start(6);
 assert.deepEqual(p.tracks.map(t=>t.notes.length),[0,0,0,1,1,1,1,1]);
 for(let i=0;i<3;i++){r.noteOn('layer:'+i+':key',60+i*12,84,1.05);r.controller({type:'cc',controller:64,value:127,targetTrack:i},1.1)}
 r.noteOff('layer:1:key',1.8);r.stop(2.2);
 assert.deepEqual(p.tracks.slice(0,3).map(t=>t.notes[0].pitch),[60,72,84]);assert.equal(p.tracks[1].notes[0].start,1.05);assert.ok(Math.abs(p.tracks[1].notes[0].duration-.75)<1e-9);
 assert.ok(p.tracks.slice(0,3).every(t=>t.controllers.length===1&&!('targetTrack' in t.controllers[0])));
 assert.equal(changes.filter(x=>x.note).length,3);
 const score=compileScore(p);assert.ok([8,9,10].every(ch=>score.events.some(e=>e.message?.[0]===0x90+ch)));
});
test('legacy projects default to single part and malformed zone imports fail before replacement',()=>{
 const legacy=JSON.parse(JSON.stringify(createProject(bank.presets)));delete legacy.keyboardMode;legacy.tracks.forEach(t=>delete t.zone);
 const restored=validateProject(legacy,bank.presets);assert.equal(restored.keyboardMode,'single');assert.equal(keyboardRoutes(restored,4,60,80).length,1);
 for(const change of [z=>z.low=90,z=>z.velocityHigh=0,z=>z.low=3.4,z=>z.enabled='yes']){const invalid=clone(library[4]);change(invalid.tracks[0].zone);assert.throws(()=>validatePerformance(invalid,bank.presets,bank));}
});
