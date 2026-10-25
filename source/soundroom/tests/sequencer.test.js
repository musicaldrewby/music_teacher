import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createProject,Recorder,quantizeNotes,restoreTiming,noteSegments,compileScore,compileRecordedChange,AudioTimeline,validateProject,clone,songBeats} from '../src/sequencer-model.js';
const presets=JSON.parse(await readFile(new URL('../src/soundfonts.json',import.meta.url),'utf8'))[0].presets;

test('slightly early downbeats are captured with their duration and velocity at every tempo, including with quantization off',()=>{
 for(const tempo of [30,100,300])for(const recordGrid of ['1/16','1/8','1/4','off']){
  const p=createProject(presets);p.tempo=tempo;p.recordGrid=recordGrid;const r=new Recorder(p);r.start(0);
  for(const [i,seconds] of [-.000001,-.035,-.149].entries()){
   const beat=seconds*tempo/60;r.noteOn('key'+i,60+i,70+i,beat);r.noteOff('key'+i,beat+.5);
  }
  r.noteOn('too-early',72,100,-.151*tempo/60);r.noteOff('too-early',1);
  r.controller({type:'cc',controller:64,value:127},-.02*tempo/60);r.controller({type:'cc',controller:1,value:50},-.5*tempo/60);r.stop(2);
  assert.equal(p.tracks[0].notes.length,3);
  for(const [i,n] of p.tracks[0].notes.entries()){assert.equal(n.start,0);assert.ok(Math.abs(n.duration-.5)<1e-12);assert.equal(n.velocity,70+i)}
  assert.equal(p.tracks[0].controllers.length,1);assert.equal(p.tracks[0].controllers[0].beat,0);validateProject(p,presets);
 }
});

test('new sessions record to sixteenths by default, other grids work, and saved Off remains Off',()=>{
 assert.equal(createProject(presets).recordGrid,'1/16');
 for(const [recordGrid,expected] of [['1/16',.25],['1/8',.5],['1/4',0],['off',.37]]){
  const p=createProject(presets);p.recordGrid=recordGrid;const r=new Recorder(p);r.start(0);r.noteOn('key',60,90,.37);r.noteOff('key',.8);r.stop(1);
  assert.equal(p.tracks[0].notes[0].start,expected);assert.ok(Math.abs(p.tracks[0].notes[0].duration-.43)<1e-12);
  assert.equal(validateProject(p,presets).recordGrid,recordGrid);
 }
 const legacy=createProject(presets);delete legacy.recordGrid;assert.equal(validateProject(legacy,presets).recordGrid,'1/16');
});

test('free recording retains sub-grid note timing, velocities, sustain and loop-spanning notes',()=>{
 const p=createProject(presets);p.bars=1;p.grid='1/2';p.snap=true;p.recordGrid='off';const r=new Recorder(p);
 r.start(2);r.noteOn('a',60,73,.137);r.controller({type:'cc',controller:64,value:127},.191);r.noteOff('a',.812);
 assert.equal(p.tracks[2].notes[0].start,.137);assert.ok(Math.abs(p.tracks[2].notes[0].duration-.675)<1e-12);assert.equal(p.tracks[2].notes[0].velocity,73);
 r.noteOn('b',64,90,3.85);r.noteOff('b',4.35);assert.equal(p.tracks[2].notes.length,2);assert.equal(p.tracks[2].notes[1].start,3.85);assert.ok(Math.abs(p.tracks[2].notes[1].duration-.5)<1e-10);
 const parts=noteSegments(p.tracks[2].notes[1],4);assert.equal(parts.length,2);assert.equal(parts[1].start,0);assert.ok(Math.abs(parts[1].duration-.35)<1e-10);
 assert.equal(p.tracks[2].controllers[0].beat,.191);r.stop(4.4);
});

test('quantized notes crossing the loop produce one full downbeat, and original timing survives save and restore',()=>{
 const p=createProject(presets);p.bars=1;const r=new Recorder(p);r.start(0);r.noteOn('key',60,100,3.98);r.noteOff('key',4.38);r.stop(4.4);
 assert.equal(p.tracks[0].notes.length,1);const n=p.tracks[0].notes[0];assert.equal(n.start,0);assert.ok(Math.abs(n.duration-.4)<1e-10);
 let score=compileScore(p);assert.equal(score.events.filter(e=>e.message?.[0]===0x98).length,1);assert.ok(Math.abs(score.events.find(e=>e.message?.[0]===0x88).beat-.4)<1e-10);
 const saved=validateProject(JSON.parse(JSON.stringify(p)),presets);restoreTiming(saved.tracks[0].notes,4,true);
 assert.equal(saved.tracks[0].notes[0].start,3.98);assert.ok(Math.abs(saved.tracks[0].notes[0].duration-.4)<1e-10);assert.equal(noteSegments(saved.tracks[0].notes[0],4).length,2);
 validateProject(saved,presets);quantizeNotes(saved.tracks[0].notes,{grid:'1/16',total:4,wrap:true});score=compileScore(saved);assert.equal(score.events.filter(e=>e.message?.[0]===0x98).length,1);
 const oneShot=clone(saved);oneShot.loop=false;oneShot.tracks[0].notes[0].start=3.98;oneShot.tracks[0].notes[0].original={start:3.98,duration:.02};quantizeNotes(oneShot.tracks[0].notes,{grid:'1/16',total:4});assert.equal(oneShot.tracks[0].notes[0].start,3.75,'the end of a non-looping song must not quantize back to its beginning');
});

test('score updates cannot repeat queued notes and preserve note-offs on exact loop boundaries',()=>{
 const p=createProject(presets);p.bars=1;p.tempo=120;p.metronome='off';p.tracks[0].notes=[{pitch:60,start:0,duration:4,velocity:90}];
 const clock=new AudioTimeline(),events=[];clock.start(compileScore(p),0);
 clock.tick(0,.01,e=>events.push(e));clock.replace(compileScore(p),0);clock.tick(.01,2,e=>events.push(e));
 assert.equal(events.filter(e=>e.message?.[0]===0x98).length,1,'an update cannot reschedule the note already in the synth queue');
 clock.replace(compileScore(p),2);clock.tick(2,2.01,e=>events.push(e));
 assert.equal(events.filter(e=>e.message?.[0]===0x88).length,1,'the old cycle must release its last note at the boundary');
 assert.equal(events.filter(e=>e.message?.[0]===0x98).length,2);
});

test('quantization is optional, non-cumulative and reversible, with independent lengths and swing',()=>{
 const notes=[{start:.14,duration:.38},{start:.51,duration:.73}];
 quantizeNotes(notes,{grid:'1/4',strength:50,total:8});assert.equal(notes[0].start,.07);assert.equal(notes[0].duration,.38);
 quantizeNotes(notes,{grid:'1/4',strength:100,total:8});assert.equal(notes[0].start,0);assert.equal(notes[1].start,1);
 restoreTiming(notes,8);assert.equal(notes[0].start,.14);assert.equal(notes[1].duration,.73);
 quantizeNotes(notes,{grid:'1/8',strength:100,length:true,swing:100,total:8});assert.equal(notes[1].start,.75);assert.equal(notes[1].duration,.5);
 const p=createProject(presets);p.recordGrid='1/16';const r=new Recorder(p);r.start(0);r.noteOn('q',67,99,.137);r.noteOff('q',.637);assert.equal(p.tracks[0].notes[0].start,.25);assert.equal(p.tracks[0].notes[0].original.start,.137);
});

test('audio timeline schedules count-in, all eight channels, repeated loops and a complete cancellation',()=>{
 const p=createProject(presets);p.bars=1;p.tempo=120;p.countIn=1;p.metronome='record';
 p.tracks.forEach((t,i)=>t.notes.push({id:String(i),pitch:60+i,start:.137,duration:.31,velocity:80}));
 const score=compileScore(p,true),clock=new AudioTimeline(),events=[];clock.start(score,2);
 for(let time=0;time<6;time+=.005)clock.tick(time,time+.005,(e,at)=>events.push({e,at}));
 assert.equal(events.filter(x=>x.e.click&&x.at<2).length,4);
 const ons=events.filter(x=>x.e.message?.[0]>=0x90&&x.e.message?.[0]<=0x9f);
 assert.equal(ons.length,16);assert.deepEqual(ons.slice(0,8).map(x=>x.e.message[0]&15),[8,9,10,11,12,13,14,15]);
 assert.ok(Math.abs(ons[0].at-2.0685)<1e-10);assert.ok(Math.abs(ons[8].at-ons[0].at-2)<1e-10);
 clock.stop();const count=events.length;clock.tick(6,20,(e,at)=>events.push({e,at}));assert.equal(events.length,count);
});

test('one-shot playback reaches the end and replacement scores do not replay past notes',()=>{
 const p=createProject(presets);p.loop=false;p.bars=1;p.metronome='off';p.tracks[0].notes=[{pitch:60,start:0,duration:1,velocity:90}];
 const clock=new AudioTimeline();clock.start(compileScore(p),0);const events=[];clock.tick(0,.1,e=>events.push(e));
 clock.replace(compileScore(p),.5);clock.tick(.5,.6,e=>events.push(e));assert.equal(events.filter(e=>e.message?.[0]===0x98).length,1);
 for(let t=.6;t<3;t+=.01)clock.tick(t,t+.01,()=>{});assert.equal(clock.playing,false);
});

test('one-shot recording clips held notes at the end and ignores later input',()=>{
 const p=createProject(presets);p.bars=1;p.loop=false;const r=new Recorder(p);r.start(0);
 r.noteOn('last',60,100,3.8);r.noteOff('last',4.3);r.noteOn('late',64,80,4.1);r.noteOff('late',4.5);r.controller({type:'cc',controller:64,value:127},4.2);r.stop(4.6);
 assert.equal(p.tracks[0].notes.length,1);assert.ok(Math.abs(p.tracks[0].notes[0].duration-.2)<1e-10);assert.equal(p.tracks[0].controllers.length,0);
 validateProject(p,presets);
});

test('project files preserve eight patches, mixing, controllers, raw timing and reject malformed data',()=>{
 const p=createProject(presets);p.name='My recording';p.tracks[0].notes=[{id:'one',pitch:60,start:.137,duration:.6,velocity:90,original:{start:.137,duration:.6}}];p.tracks[2].pan=19;p.tracks[2].delay=85;
 const copy=validateProject(JSON.parse(JSON.stringify(p)),presets);assert.equal(copy.tracks.length,8);assert.equal(copy.tracks[0].notes[0].start,.137);assert.equal(copy.tracks[2].pan,19);assert.equal(copy.tracks[7].patch.isDrum,true);
 const bad=clone(p);bad.tracks[0].notes[0].duration=Infinity;assert.throws(()=>validateProject(bad,presets));
 p.bars=8;p.meter=[6,8];assert.equal(songBeats(p),24);
});


test('incremental captured events leave the playback cursor intact and start on the next pass without an immediate quantized echo',()=>{
 const p=createProject(presets);p.bars=1;p.countIn=0;p.metronome='off';p.tempo=120;
 p.tracks[1].notes=[{pitch:67,velocity:90,start:0,duration:4},{pitch:69,velocity:90,start:2,duration:.2}];
 const timeline=new AudioTimeline(),events=[];timeline.start(compileScore(p,true),0);
 const emit=(e,time)=>events.push({...e,time});timeline.tick(0,.1,emit);
 const recorder=new Recorder(p,change=>timeline.append(compileRecordedChange(p,change)));recorder.start(0);
 recorder.noteOn('tap',60,100,.2);recorder.noteOff('tap',.22);recorder.controller({type:'cc',controller:1,value:99},.22);
 for(let time=.1;time<6.4;time+=.01)timeline.tick(time,time+.01,emit);
 const added=events.filter(e=>e.message[0]===0x98&&e.message[1]===60);
 assert.deepEqual(added.map(e=>e.time),[2.125,4.125,6.125]);
 assert.deepEqual(events.filter(e=>e.message[0]===0x99&&e.message[1]===69).map(e=>e.time),[1,3,5]);
 assert.deepEqual(events.filter(e=>e.message[0]===0x89&&e.message[1]===67).map(e=>e.time),[2,4,6]);
 assert.equal(events.some(e=>e.message[0]===0xb8&&e.message[1]===1&&e.message[2]===99&&e.time<2),false);
 assert.equal(p.tracks[0].notes[0].start,.25);assert.ok(Math.abs(p.tracks[0].notes[0].original.start-.2)<1e-9);
 p.loop=false;assert.deepEqual(compileRecordedChange(p,{track:0,note:p.tracks[0].notes[0],firstCycle:1}),[]);
});

test('incremental wrapped notes delay their tail until after the first full playback onset',()=>{
 const p=createProject(presets);p.bars=1;p.recordGrid='off';const changes=[];
 const recorder=new Recorder(p,c=>changes.push(c));recorder.start(0);recorder.noteOn('hold',60,100,3.8);recorder.noteOff('hold',4.2);
 const events=compileRecordedChange(p,changes[0]);assert.equal(changes[0].firstCycle,2);
 assert.equal(events.find(e=>e.beat===3.8).firstCycle,2);assert.equal(events.find(e=>e.beat===0).firstCycle,3);
});
