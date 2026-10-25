import test from 'node:test';
import assert from 'node:assert/strict';
import {newProject,newTrack,uid,validateProject} from '../dist/catalog.js';
import {ensureSong,syncSection,createSection,activateSection,compileSong} from '../dist/song.js';
import {planPatternRepeat,repeatPattern,extendSection} from '../dist/pattern-repeat.js';
const event=(beat,extra={})=>({id:uid(),beat,duration:1,note:60,shift:0,velocity:.6,...extra});
const setup=(bars=4,meter='4/4')=>{const p=newProject();p.bars=bars;p.meter=meter;p.tracks=[newTrack('alto-xylophone'),newTrack('soprano-recorder')];return p;};

test('repeats a two-measure ostinato as independent notes, preserving articulation and silence',()=>{
 const p=setup(),t=p.tracks[0];
 t.events=[event(1,{duration:.1,writtenDuration:.5,writtenDurationAuto:true,dynamicTone:.75}),event(4,{duration:2,writtenDuration:2,tieBreaks:[1]})];
 t.rests=[{id:uid(),beat:0,duration:1},{id:uid(),beat:6,duration:2}];
 const before=structuredClone(t);repeatPattern(p,t,0,1);
 assert.deepEqual(t.events.slice(0,2),before.events);assert.deepEqual(t.events.map(e=>e.beat),[1,4,9,12]);
 for(let i=0;i<2;i++){const original=before.events[i],copy=t.events[i+2];assert.notEqual(copy.id,original.id);assert.deepEqual({...copy,id:original.id,beat:original.beat},original);}
 assert.deepEqual(t.rests.map(r=>[r.beat,r.duration]),[[0,1],[6,2],[8,1],[14,2]]);
 t.events[3].tieBreaks.push(1.5);assert.deepEqual(t.events[1].tieBreaks,[1]);t.events[3].tieBreaks.pop();
 assert.equal(p.tracks[1].events.length,0);validateProject(p);
});

test('measure ranges can start later and partial final copies clip notes, written values and ties',()=>{
 const p=setup(4,'6/8'),t=p.tracks[0];
 t.events=[event(0),event(3,{duration:5,writtenDuration:5,tieBreaks:[1,2,3,4]})];
 repeatPattern(p,t,1,2);
 assert.deepEqual(t.events.map(e=>e.beat),[0,3,9]);
 assert.equal(t.events[2].duration,3);assert.equal(t.events[2].writtenDuration,3);assert.deepEqual(t.events[2].tieBreaks,[1,2]);validateProject(p);
 const percussion=setup(5),block=newTrack('guiro');percussion.tracks=[block];
 block.events=[event(0,{note:74,shift:12,velocity:.35}),event(5,{note:73,shift:0})];
 repeatPattern(percussion,block,0,1);
 assert.deepEqual(block.events.map(e=>[e.beat,e.note,e.shift]),[[0,74,12],[5,73,0],[8,74,12],[13,73,0],[16,74,12]]);
 assert.equal(new Set(block.events.map(e=>e.id)).size,5);
});

test('existing later music and explicit rests require replacement; source and other parts survive',()=>{
 const p=setup(),t=p.tracks[0];t.events=[event(0),event(4),event(10)];t.rests=[{id:uid(),beat:12,duration:1}];p.tracks[1].events=[event(10,{note:72})];
 const before=structuredClone(p);assert.equal(planPatternRepeat(p,t,0,1).conflicts,true);
 assert.throws(()=>repeatPattern(p,t,0,1),/Replace/);assert.deepEqual(p,before);
 repeatPattern(p,t,0,1,{replace:true});assert.deepEqual(t.events.map(e=>e.beat),[0,4,8,12]);assert.deepEqual(t.events.slice(0,2),before.tracks[0].events.slice(0,2));assert.deepEqual(t.rests,[]);assert.deepEqual(p.tracks[1],before.tracks[1]);
});

test('a tied note crossing the source boundary is clipped into editable repetitions',()=>{
 const p=setup(),t=p.tracks[0];t.events=[event(2,{duration:8,writtenDuration:8,tieBreaks:[2,4,6]})];
 repeatPattern(p,t,0,1,{replace:true});assert.deepEqual(t.events.map(e=>[e.beat,e.duration,e.writtenDuration,e.tieBreaks]),[[2,6,6,[2,4]],[10,6,6,[2,4]]]);validateProject(p);
});

test('extension repeats selected parts, keeps other sections intact and survives project reopen and song compilation',()=>{
 const p=setup(2),t=p.tracks[0],recorder=p.tracks[1];t.events=[event(0),event(4)];recorder.events=[event(0,{note:72})];ensureSong(p);const a=p.activeSection,b=createSection(p,{source:a});const other=structuredClone(b),recBefore=structuredClone(recorder);
 extendSection(p,5,[t.id]);syncSection(p);assert.equal(p.bars,5);assert.deepEqual(t.events.map(e=>e.beat),[0,4,8,12,16]);assert.deepEqual(recorder,recBefore);assert.deepEqual(p.sections.find(s=>s.id===b.id),other);
 const reopened=validateProject(JSON.parse(JSON.stringify(p)));assert.deepEqual(compileSong(reopened).tracks[0].events.map(e=>e.beat),[0,4,8,12,16]);activateSection(reopened,b.id);assert.equal(reopened.bars,2);assert.equal(reopened.tracks[0].events.length,2);activateSection(reopened,a);assert.equal(reopened.bars,5);assert.equal(reopened.tracks[0].events.length,5);
});

test('empty extension is explicit, invalid ranges and oversized repeats leave all music untouched',()=>{
 const p=setup(2);p.tracks[0].events=[event(0)];const before=structuredClone(p.tracks);extendSection(p,4);assert.deepEqual(p.tracks,before);
 for(const range of [[-1,1],[2,1],[0,4],[.5,1],[0,3]])assert.throws(()=>repeatPattern(p,p.tracks[0],...range));assert.deepEqual(p.tracks,before);
 assert.throws(()=>repeatPattern(p,p.tracks[1],0,1),/empty/);
 assert.throws(()=>extendSection(p,65,[p.tracks[0].id]));assert.equal(p.bars,4);
 assert.throws(()=>extendSection(p,8,['missing']));assert.equal(p.bars,4);
 const large=setup(64);large.tracks[0].events=Array.from({length:400},()=>event(0));const ids=large.tracks[0].events.map(e=>e.id);assert.throws(()=>repeatPattern(large,large.tracks[0],0,0),/too many/);assert.deepEqual(large.tracks[0].events.map(e=>e.id),ids);
});
