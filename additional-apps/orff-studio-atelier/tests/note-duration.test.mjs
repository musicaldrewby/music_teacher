import test from 'node:test';import assert from 'node:assert/strict';
import {newProject,newTrack,scoreProject,validateProject} from '../dist/catalog.js';
import {resizeNote,availableNoteLength} from '../dist/note-duration.js';
import {notationVoices} from '../dist/notation.js';
import {musicXML} from '../dist/musicxml.js';
const fixture=()=>{const p=newProject();p.bars=2;const t=newTrack('soprano-recorder');p.tracks=[t];t.events=[{id:'a',beat:0,duration:1,note:72,velocity:.7},{id:'b',beat:1,duration:1,note:74,velocity:.7},{id:'c',beat:2,duration:.75,writtenDuration:.75,note:76,velocity:.6},{id:'d',beat:4,duration:1,note:77,velocity:.8}];t.rests=[{id:'r',beat:2.75,duration:1.25}];return {p,t};};
test('quarter replaces a dotted eighth, consumes explicit rest, leaves later onsets and measure totals intact',()=>{
 const {p,t}=fixture(),later=structuredClone(t.events[3]);resizeNote(p,t,'c',1);
 assert.deepEqual(t.rests,[{id:'r',beat:3,duration:1}]);assert.equal(t.events[2].writtenDuration,1);assert.deepEqual(t.events[3],later);
 const bars=notationVoices(scoreProject(p),t,.25)[0];assert.deepEqual(bars.map(b=>b.reduce((n,e)=>n+e.duration,0)),[4,4]);assert.deepEqual(bars[0].map(n=>[n.beat,n.duration,n.rest]),[[0,1,false],[1,1,false],[2,1,false],[3,1,true]]);
 assert.match(musicXML(p),/<type>quarter<\/type>/);assert.equal(validateProject(JSON.parse(JSON.stringify(p))).tracks[0].events[2].duration,1);
});
test('shortening gives silence back and explicit rhythm prevents recorder gap simplification',()=>{
 const {p,t}=fixture();resizeNote(p,t,'c',.5);const bar=notationVoices(scoreProject(p),t,.25)[0][0];
 assert.equal(bar.find(n=>n.source?.id==='c').duration,.5);assert.equal(bar.filter(n=>n.rest).reduce((n,e)=>n+e.duration,0),1.5);
});
test('occupied time and section end are protected without changing the project',()=>{
 const {p,t}=fixture(),before=JSON.stringify(p);assert.equal(availableNoteLength(p,t,t.events[2]),2);
 assert.throws(()=>resizeNote(p,t,'c',3),/next note/);assert.equal(JSON.stringify(p),before);
 assert.throws(()=>resizeNote(p,t,'d',5),/another measure/);assert.equal(JSON.stringify(p),before);
});
test('chord voices, held articulation and ties stay valid when editing one note',()=>{
 const {p,t}=fixture();t.events=[{id:'a',beat:0,duration:2.8,writtenDuration:3,writtenDurationAuto:true,tieBreaks:[1,2],note:72,velocity:.62,dynamicTone:.3},{id:'b',beat:0,duration:2,note:76,velocity:.7}];t.rests=[];
 const other=structuredClone(t.events[1]);resizeNote(p,t,'a',1.5);assert.deepEqual(t.events[0].tieBreaks,[1]);assert.equal(t.events[0].writtenDurationAuto,undefined);assert.equal(t.events[0].dynamicTone,.3);assert.deepEqual(t.events[1],other);
 resizeNote(p,t,'a',.5);assert.equal(t.events[0].tieBreaks,undefined);
});
test('extension across a barline is tied and 6/8 still contains three quarter-note beats per measure',()=>{
 const {p,t}=fixture();p.meter='6/8';t.events=[{id:'a',beat:2,duration:.4,note:72,velocity:.8}];t.rests=[];resizeNote(p,t,'a',2);
 const bars=notationVoices(scoreProject(p),t,.25)[0];assert.deepEqual(bars.map(b=>b.reduce((n,e)=>n+e.duration,0)),[3,3]);assert.equal(bars.flat().filter(n=>!n.rest).reduce((n,e)=>n+e.duration,0),2);
});
