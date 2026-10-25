import test from 'node:test';import assert from 'node:assert/strict';
import {newProject,newTrack,getInstrument} from '../dist/catalog.js';
import {scoreListeningPlan,createScoreListening} from '../dist/score-listening.js';
import {scoreSelectionItem,scoreSelectionSpan} from '../dist/score-selection.js';
import {scheduledNotes,scheduledClicks,playbackPosition} from '../dist/practice.js';
import {loadScoreWorkspace,saveScoreWorkspace,SCORE_WORKSPACE_KEY} from '../dist/score-workspace.js';
import {scoreCompanionNotes} from '../dist/score-companion.js';
import {recorderFingering,BAROQUE_FINGERINGS,fingeringDiagram} from '../dist/recorder-fingering.js';
const fixture=()=>{const p=newProject(),t=newTrack('alto-xylophone');p.bars=4;p.bpm=120;p.tracks=[t,newTrack('alto-xylophone')];t.muted=true;t.events=[{id:'c',beat:0,note:60,duration:1,velocity:.8,writtenDuration:1},{id:'g',beat:0,note:67,duration:1,velocity:.8,writtenDuration:1},{id:'e',beat:2,note:64,duration:.3,velocity:.6},{id:'long',beat:4,note:60,duration:5,velocity:.7}];p.tracks[1].events=[{id:'other-part',beat:0,note:60,duration:1,velocity:.8}];return {p,t};};
test('hearing a chord isolates this part, preserves its mix and repeats precisely on the audio clock',()=>{
 const {p,t}=fixture(),before=JSON.stringify(p),plan=scoreListeningPlan(p,t,{tool:'chord',chordId:'c'}),tr=createScoreListening(plan,10,true);
 assert.deepEqual(plan.project.tracks[0].events.map(e=>e.id),['c','g']);assert.equal(plan.project.tracks[0].muted,false);assert.equal(JSON.stringify(p),before);
 const notes=scheduledNotes(tr,10,11.5);assert.deepEqual(notes.map(n=>n.event.id),['c','g','c','g','c','g']);assert.ok(Math.abs(notes[2].at-notes[0].at-.5)<1e-8);assert.equal(tr.passes[0].count,0);assert.equal(playbackPosition(tr,10.3).pass,1);
 const once=createScoreListening(plan,10,false);assert.equal(scheduledNotes(once,10,100).length,2);assert.equal(once.repeat,false);assert.equal(once.scoreSourceTrack.muted,true);
});
test('nonadjacent note selections keep their rhythmic spaces and original articulation',()=>{
 const {p,t}=fixture(),state={selection:{items:[scoreSelectionItem(t.events[0]),scoreSelectionItem(t.events[2])]}};
 const plan=scoreListeningPlan(p,t,state);assert.deepEqual(plan.project.tracks[0].events.map(e=>[e.id,e.beat,e.duration]),[['c',0,1],['e',2,.3]]);assert.equal(plan.from,0);assert.equal(plan.to,2.3); // raw quarter-grid rhythm is at least the sounding length
});
test('measure selections clip held notes and preserve silence at the start and end of the loop',()=>{
 const {p,t}=fixture(),from=6,to=8,state={selection:{span:{from,to},measures:{first:1,last:1},items:scoreSelectionSpan(t,from,to)}};
 const plan=scoreListeningPlan(p,t,state),tr=createScoreListening(plan,0,true),notes=scheduledNotes(tr,0,.5);
 assert.deepEqual(notes.map(n=>[n.event.id,n.event.beat,n.event.duration]),[['long',6,2]]);assert.equal(plan.from,6);assert.equal(plan.to,8);assert.equal(tr.passes[0].end,1.12);
 assert.equal(scheduledClicks(tr,0,1.2,true)[0].beat,6);
});
test('rest-only and stale selections cannot accidentally audition unrelated music',()=>{
 const {p,t}=fixture();t.rests=[{id:'r',beat:10,duration:1}];assert.throws(()=>scoreListeningPlan(p,t,{selection:{items:[{id:'r',rest:true,from:10,to:11}]}}),/only rests/);
 assert.throws(()=>scoreListeningPlan(p,t,{selection:{items:[{id:'missing',from:0,to:1}]}}),/Select notes/);
 assert.throws(()=>scoreListeningPlan(p,t,{selection:{span:{from:12,to:16},items:[]}}),/only rests/);
});
test('recorded short mallet notes loop over their displayed quarter-note length',()=>{
 const {p,t}=fixture();t.events=[{id:'short',beat:0,note:60,duration:.5,velocity:.8}];
 const plan=scoreListeningPlan(p,t,{selection:{items:[scoreSelectionItem(t.events[0])]}});assert.equal(plan.to,1);assert.equal(plan.project.tracks[0].events[0].duration,.5);
});
test('workspace preferences tolerate restricted or corrupt storage',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};assert.deepEqual(loadScoreWorkspace(storage),{focus:false,instrument:false});
 assert.equal(saveScoreWorkspace(storage,{focus:true,instrument:true}),true);assert.deepEqual(loadScoreWorkspace(storage),{focus:true,instrument:true});map.set(SCORE_WORKSPACE_KEY,'not json');assert.deepEqual(loadScoreWorkspace(storage),{focus:false,instrument:false});assert.equal(saveScoreWorkspace({setItem(){throw Error();}},{}),false);
});
test('companion follows part identity, chord selection and unavailable bars',()=>{
 const {p,t}=fixture();assert.deepEqual(scoreCompanionNotes(p,t,{tool:'chord',chordId:'c'},null).map(e=>e.id),['c','g']);assert.deepEqual(scoreCompanionNotes(p,t,{selection:{items:[{id:'other-part'}]}},null),[]);
 t.removed=[0];assert.deepEqual(scoreCompanionNotes(p,t,{pitchIndex:0},null),[]);assert.deepEqual(scoreCompanionNotes(p,t,{restId:'r'},null),[]);
});
test('Baroque recorder fingerings preserve two double holes, vents and C/F instrument registers',()=>{
 assert.equal(BAROQUE_FINGERINGS.length,25);assert.ok(BAROQUE_FINGERINGS.every(s=>/^[01v][01]{5}[01h]{2}$/.test(s)));
 assert.equal(recorderFingering(getInstrument('soprano-recorder'),72),'11111111');assert.equal(recorderFingering(getInstrument('tenor-recorder'),60),'11111111');assert.equal(recorderFingering(getInstrument('alto-recorder'),65),'11111111');assert.equal(recorderFingering(getInstrument('bass-recorder'),53),'11111111');
 assert.equal(recorderFingering(getInstrument('soprano-recorder'),77),'11111011');assert.equal(recorderFingering(getInstrument('soprano-recorder'),88),'v1111100');assert.equal(recorderFingering(getInstrument('alto-recorder'),68),'111111h0');
 assert.equal((fingeringDiagram('11111111').match(/<circle /g)||[]).length,10);assert.match(fingeringDiagram('v111111h'),/Thumb slightly open/);assert.match(fingeringDiagram('111111h0'),/6 outer hole closed/);
});
