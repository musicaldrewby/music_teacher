import test from 'node:test';
import assert from 'node:assert/strict';
import {newProject,newTrack,validateProject,scoreProject} from '../dist/catalog.js';
import {addScoreChordTone,writeScoreEntry,entryPitches,scoreChordTiming,tieScoreNotes} from '../dist/score-entry.js';
import {notationVoices} from '../dist/notation.js';
import {musicXML} from '../dist/musicxml.js';
import {ensureSong,syncSection,compileSong} from '../dist/song.js';
const setup=(instrument='alto-xylophone')=>{const p=newProject();p.bars=2;p.tracks=[newTrack(instrument)];ensureSong(p);const t=p.tracks[0],pitch=note=>entryPitches(p,t).find(n=>n.note===note);return {p,t,pitch};};
test('a bordun preserves the original and later music and survives project, notation, song and XML output',()=>{
 const {p,t,pitch}=setup(),first=writeScoreEntry(p,t,{beat:0,duration:2,pitch:pitch(60)});
 writeScoreEntry(p,t,{beat:2,duration:1,pitch:pitch(62)});const before=structuredClone(t.events);
 const {event,added}=addScoreChordTone(p,t,{anchorId:first.id,pitch:pitch(67)});
 assert.equal(added,true);assert.deepEqual([event.beat,event.duration,event.writtenDuration],[0,2,2]);
 assert.deepEqual(t.events.filter(e=>e.id!==event.id),before);
 syncSection(p);const restored=validateProject(JSON.parse(JSON.stringify(p)));
 assert.equal(restored.tracks[0].events.length,3);assert.equal(compileSong(restored).tracks[0].events.filter(e=>e.beat===0).length,2);
 const lanes=notationVoices(scoreProject(p),t,.25,{chords:true});assert.equal(lanes.length,1);
 assert.deepEqual(lanes[0][0][0].source.chord.map(e=>e.note),[60,67]);assert.match(musicXML(p),/<chord\/>/);
});
test('starting a chord consumes only its explicit rest span and a duplicate pitch is a no-op',()=>{
 const {p,t,pitch}=setup();writeScoreEntry(p,t,{beat:0,duration:4,rest:true});
 const first=addScoreChordTone(p,t,{beat:1,duration:1.5,pitch:pitch(60)}).event;
 addScoreChordTone(p,t,{anchorId:first.id,pitch:pitch(64)});addScoreChordTone(p,t,{anchorId:first.id,pitch:pitch(67)});
 assert.deepEqual(t.rests.map(r=>[r.beat,r.duration]),[[0,1],[2.5,1.5]]);
 const before=JSON.stringify(t),duplicate=addScoreChordTone(p,t,{anchorId:first.id,pitch:pitch(64)});
 assert.equal(duplicate.added,false);assert.equal(JSON.stringify(t),before);assert.equal(t.events.length,3);
});
test('recorded short articulation inherits both the displayed quarter and original sounding gate',()=>{
 const {p,t,pitch}=setup();t.events=[{id:'short',beat:0,note:60,duration:.5,velocity:.4,articulations:['accent']}];
 const before=structuredClone(t.events[0]);assert.equal(scoreChordTiming(p,t,t.events[0]).duration,1);
 const upper=addScoreChordTone(p,t,{anchorId:'short',pitch:pitch(67)}).event;
 assert.equal(upper.duration,.5);assert.equal(upper.writtenDuration,1);assert.equal(upper.velocity,.4);assert.deepEqual(upper.articulations,['accent']);assert.deepEqual(t.events[0],before);
 assert.equal(notationVoices(scoreProject(p),t,.25,{chords:true}).length,1);
});
test('manual and cross-bar ties stay aligned for every chord tone',()=>{
 const {p,t,pitch}=setup(),first=writeScoreEntry(p,t,{beat:3,duration:1,pitch:pitch(60)});
 writeScoreEntry(p,t,{beat:4,duration:1,pitch:pitch(60)});tieScoreNotes(t,first.id);
 const upper=addScoreChordTone(p,t,{anchorId:first.id,pitch:pitch(67)}).event;
 assert.deepEqual(upper.tieBreaks,[1]);assert.equal(upper.duration,2);assert.equal(notationVoices(scoreProject(p),t,.25,{chords:true}).length,1);
 assert.equal((musicXML(p).match(/<tie type="start"/g)||[]).length,2);
});
test('an independent overlapping voice is preserved, while unavailable pitches and overflow are rejected',()=>{
 const {p,t,pitch}=setup();t.events=[{id:'held',beat:0,duration:4,note:60,velocity:.8}];const before=structuredClone(t.events[0]);
 addScoreChordTone(p,t,{beat:1,duration:1,pitch:pitch(67)});assert.deepEqual(t.events[0],before);
 const saved=JSON.stringify(t);assert.throws(()=>addScoreChordTone(p,t,{beat:7,duration:2,pitch:pitch(64)}),/another measure/);assert.equal(JSON.stringify(t),saved);
 assert.throws(()=>addScoreChordTone(p,t,{anchorId:'missing',pitch:pitch(64)}),/Select a note/);
 const removed=pitch(64);t.removed=[removed.index];assert.throws(()=>addScoreChordTone(p,t,{anchorId:'held',pitch:removed}),/available/);assert.equal(t.events.length,2);
});
test('bass instruments keep their sounding register and compound-meter chords fill complete measures',()=>{
 const {p,t,pitch}=setup('bass-xylophone');p.meter='6/8';
 const first=addScoreChordTone(p,t,{beat:0,duration:1.5,pitch:pitch(48)}).event;
 const upper=addScoreChordTone(p,t,{anchorId:first.id,pitch:pitch(55)}).event;
 assert.equal(upper.note,55);assert.equal(upper.writtenDuration,1.5);
 for(const measure of notationVoices(scoreProject(p),t,.25,{chords:true})[0])assert.equal(measure.reduce((sum,n)=>sum+n.duration,0),3);
});
