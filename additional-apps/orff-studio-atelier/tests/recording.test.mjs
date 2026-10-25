import test from 'node:test';
import assert from 'node:assert/strict';
import {recordingPosition,captureRecordedNote,finishRecordedHold,flushRecording} from '../dist/recording.js';
const take=(sec=.5)=>({start:10,sec,recorded:new Map(),pending:[]});
const options=(at,track={events:[]})=>({at,track,grid:.5,duration:1,total:16,loop:false});
const note=(pitched=false)=>({pitched,eventData:{note:60,shift:0,velocity:.8}});
test('first-beat allowance is 250ms for every tempo and grid',()=>{
 for(const bpm of [30,60,120,240])for(const grid of [1,.5,.25]){
  const tr=take(60/bpm);
  for(const at of [9.75,9.8,9.95,10])assert.deepEqual(recordingPosition(tr,at,16,grid,false),{beat:0,cycle:0});
  assert.equal(recordingPosition(tr,9.749,16,grid,false),null);
 }
});
test('early strike records once at beat zero, preserving performed strength',()=>{
 const tr=take(),h=note(),o=options(9.8);
 assert.equal(captureRecordedNote(tr,h,o),true);assert.equal(captureRecordedNote(tr,h,o),false);
 assert.equal(o.track.events.length,1);assert.equal(h.event.beat,0);assert.equal(h.event.velocity,.8);
 assert.equal(tr.recorded.get(h.event.id),0); // prevents scheduler echo on first beat
});
test('input and release while preparing survive readiness without moving the onset',()=>{
 const tr=take();tr.start=null;const h=note(true),o=options(9.9);
 captureRecordedNote(tr,h,o);finishRecordedHold(h,10.75);
 tr.start=10;assert.equal(flushRecording(tr),1);assert.equal(h.event.beat,0);assert.ok(Math.abs(h.event.duration-1.7)<1e-8);assert.equal(h.event.writtenDuration,1.5);
 assert.equal(flushRecording(tr),0);
});
test('old count-in taps, canceled pending input and non-loop end do not leak into take',()=>{
 const tr=take();tr.start=null;const old=note();captureRecordedNote(tr,old,options(8));
 tr.start=10;assert.equal(flushRecording(tr),0);
 tr.start=null;captureRecordedNote(tr,note(),options(9.9));tr.pending=[];tr.start=10;assert.equal(flushRecording(tr),0);
 assert.equal(recordingPosition(tr,18,16,.5,false),null);
 assert.deepEqual(recordingPosition(tr,18,16,.5,true),{beat:0,cycle:1});
});
test('normal notes and held durations retain grid timing across tempo and loop boundaries',()=>{
 const tr=take(),h=note(true),o={...options(18.1),loop:true};captureRecordedNote(tr,h,o);
 assert.equal(h.event.beat,0);assert.equal(tr.recorded.get(h.event.id),1);
 finishRecordedHold(h,18.75);assert.ok(Math.abs(h.event.duration-1.3)<1e-8);assert.equal(h.event.writtenDuration,1.5);
 assert.deepEqual(recordingPosition(tr,10.51,16,.5,false),{beat:1,cycle:0});
});

test('loop downbeats snap across the boundary on either side and resist clock rounding',()=>{
 for(const bpm of [30,60,72,90,100,120,144,240])for(const grid of [1,.5,.25])for(const total of [3,4,16])for(const cycle of [1,2,7,1000]){
  const tr=take(60/bpm),downbeat=tr.start+cycle*total*tr.sec;
  for(const fraction of [-.49,-.01,0,.01,.49]){
   const pos=recordingPosition(tr,downbeat+fraction*grid*tr.sec,total,grid,true);
   assert.deepEqual(pos,{beat:0,cycle},`${bpm} BPM, grid ${grid}, ${total} beats, loop ${cycle}, offset ${fraction}`);
  }
 }
});

test('intentional final-grid notes stay before the loop and later notes keep their grid',()=>{
 for(const grid of [1,.5,.25]){
  const tr=take(),total=16,cycle=2,downbeat=tr.start+cycle*total*tr.sec;
  for(const fraction of [-1,-.51])assert.deepEqual(recordingPosition(tr,downbeat+fraction*grid*tr.sec,total,grid,true),{beat:total-grid,cycle:cycle-1});
  for(const fraction of [.51,1])assert.deepEqual(recordingPosition(tr,downbeat+fraction*grid*tr.sec,total,grid,true),{beat:grid,cycle});
 }
 // A one-shot recording still ends at its section boundary; it never wraps.
 const tr=take();
 assert.deepEqual(recordingPosition(tr,17.99,16,.5,false),{beat:15.5,cycle:0});
 assert.equal(recordingPosition(tr,18,16,.5,false),null);
});

test('switching from bass to alto during recording keeps both phrases aligned without a loop echo',async()=>{
 const {newTrack}=await import('../dist/catalog.js');
 const tr=take(.6),bass=newTrack('bass-xylophone'),alto=newTrack('alto-xylophone');
 for(const [cycle,track] of [[0,bass],[1,alto]])for(const beat of [0,1,2,3]){
  const h=note(),at=tr.start+(cycle*16+beat)*tr.sec-.05;
  h.eventData.note=track===bass?48:60;
  assert.equal(captureRecordedNote(tr,h,{...options(at,track),loop:true}),true);
  assert.equal(h.event.beat,beat);assert.equal(h.absoluteBeat,cycle*16+beat);
  // The scheduler suppresses this event on its recorded pass, then plays it on the next.
  assert.equal(tr.recorded.get(h.event.id),cycle);assert.notEqual(tr.recorded.get(h.event.id),cycle+1);
  assert.equal(captureRecordedNote(tr,h,{...options(at,track),loop:true}),false);
 }
 assert.deepEqual(bass.events.map(e=>e.beat),[0,1,2,3]);
 assert.deepEqual(alto.events.map(e=>e.beat),[0,1,2,3]);
});

test('held notes snapped into the next loop retain their actual releases and written lengths',()=>{
 for(const quantizeLengths of [false,true]){
  const tr=take(),h=note(true),at=17.95;
  captureRecordedNote(tr,h,{...options(at),loop:true,quantizeLengths});
  finishRecordedHold(h,at+.35);
  assert.equal(h.event.beat,0);assert.equal(h.absoluteBeat,16);assert.equal(tr.recorded.get(h.event.id),1);
  assert.ok(Math.abs(h.event.duration-(quantizeLengths?.5:.7))<1e-8);
  assert.equal(h.event.writtenDuration,.5);
 }
});


test('short held notes keep real release lengths while printing clean eighths',async()=>{
 const {newProject,newTrack,validateProject}=await import('../dist/catalog.js');
 const {ensureSong,syncSection,compileSong}=await import('../dist/song.js');
 const {notationVoices}=await import('../dist/notation.js');
 const {musicXML}=await import('../dist/musicxml.js');
 const p=newProject();p.bars=1;p.tracks=[newTrack('soprano-recorder')];const t=p.tracks[0];
 for(const at of [10.04,10.29]){const h=note(true);captureRecordedNote(take(),h,{...options(at,t),total:4});finishRecordedHold(h,at+.05);assert.ok(Math.abs(h.event.duration-.1)<1e-8);assert.equal(h.event.writtenDuration,.5);}
 assert.deepEqual(t.events.map(e=>e.beat),[0,.5]);
 ensureSong(p);syncSection(p);const reopened=validateProject(JSON.parse(JSON.stringify(p)));assert.equal(reopened.tracks[0].events[0].duration,t.events[0].duration);
 const song=compileSong(reopened);assert.equal(song.tracks[0].events[0].duration,t.events[0].duration);
 const tokens=notationVoices(reopened,reopened.tracks[0],.25)[0][0];assert.deepEqual(tokens.slice(0,2).map(t=>[t.glyph,t.rest]),[['8',false],['8',false]]);
 const xml=musicXML(reopened);assert.equal((xml.match(/<type>eighth<\/type>/g)||[]).length,2);assert.ok(!xml.includes('<type>16th</type>'));
});
test('length quantization is opt-in and captures the setting at note-on',()=>{
 const h=note(true),o={...options(10.04),quantizeLengths:true};captureRecordedNote(take(),h,o);o.quantizeLengths=false;finishRecordedHold(h,10.09);assert.equal(h.event.duration,.5);assert.equal(h.event.writtenDuration,.5);
});
test('very short early and final notes remain positive and inside the section',()=>{
 const h=note(true);captureRecordedNote(take(),h,options(9.9));finishRecordedHold(h,9.91);assert.ok(Math.abs(h.event.duration-.02)<1e-8);
 const last=note(true);captureRecordedNote(take(),last,options(17.95));finishRecordedHold(last,19);assert.ok(last.event.duration>0);assert.equal(last.event.beat+last.event.duration,16);
});
