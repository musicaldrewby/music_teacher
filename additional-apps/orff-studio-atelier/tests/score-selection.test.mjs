import test from 'node:test';import assert from 'node:assert/strict';
import {newProject,newTrack,validateProject} from '../dist/catalog.js';
import {ensureSong,syncSection,createSection,activateSection,compileSong} from '../dist/song.js';
import {entryPitches,writeScoreEntry,tieScoreNotes} from '../dist/score-entry.js';
import {scoreSelectionItem,scoreSelectionSpan,deleteScoreSelection,clearScoreSpan,removeScoreMeasures,copyScoreSelection,pasteScoreSelection,toggleScoreSelection} from '../dist/score-selection.js';
function piece(){const p=newProject();p.tracks=[newTrack('alto-xylophone'),newTrack('bass-xylophone')];ensureSong(p);return p;}
const write=(p,t,beat,duration,n=0,rest=false)=>writeScoreEntry(p,t,{beat,duration,pitch:entryPitches(p,t)[n],rest});
const valid=p=>{syncSection(p);return validateProject(JSON.parse(JSON.stringify(p)));};
test('deleting individual nonadjacent notes preserves time, other voices, rests and parts',()=>{
 const p=piece(),t=p.tracks[0],first=write(p,t,0,1),second=write(p,t,1,1),third=write(p,t,2,1);write(p,t,8,1,0,true);write(p,p.tracks[1],0,4);
 const other=structuredClone(p.tracks[1]),later=structuredClone(t.rests);
 deleteScoreSelection(t,[scoreSelectionItem(first),scoreSelectionItem(third)]);
 assert.deepEqual(t.events,[second]);assert.deepEqual(p.tracks[1],other);assert.deepEqual(t.rests.filter(r=>r.beat>=8),later);assert.deepEqual(t.rests.slice(0,2).map(r=>[r.beat,r.duration]),[[0,1],[2,1]]);valid(p);
});
test('clearing the middle measure preserves both ends of a tie and the following measure exactly',()=>{
 const p=piece(),t=p.tracks[0];write(p,t,2,1);const e=t.events[0];write(p,t,3,1);tieScoreNotes(t,e.id);write(p,t,4,4);tieScoreNotes(t,e.id);write(p,t,8,2);tieScoreNotes(t,e.id);const later=write(p,t,12,1,2);
 clearScoreSpan(t,4,8);assert.deepEqual(t.events.map(e=>[e.beat,e.duration,e.writtenDuration]),[[2,2,2],[8,2,2],[12,1,1]]);assert.deepEqual(t.events.at(-1),later);assert.deepEqual(t.events[0].tieBreaks,[1]);assert.deepEqual(t.rests.map(r=>[r.beat,r.duration]),[[4,4]]);assert.equal(p.bars,4);valid(p);
});
test('removing one measure closes time across the ensemble but leaves other sections untouched',()=>{
 const p=piece();for(const t of p.tracks){write(p,t,0,1);write(p,t,4,1);write(p,t,8,1);write(p,t,12,1,0,true);}const other=createSection(p,{source:p.activeSection}),snapshot=structuredClone(other);
 removeScoreMeasures(p,1);assert.equal(p.bars,3);for(const t of p.tracks){assert.deepEqual(t.events.map(e=>e.beat),[0,4]);assert.equal(t.rests[0].beat,8);}valid(p);assert.deepEqual(p.sections.find(s=>s.id===other.id),snapshot);assert.equal(compileSong(p).bars,3);
 const before=JSON.stringify(p);assert.throws(()=>removeScoreMeasures(p,0,2),/at least one/);assert.equal(JSON.stringify(p),before);activateSection(p,other.id);assert.equal(p.bars,4);
});
test('removing measure space shortens a continuous tie without adding a fresh attack',()=>{
 const p=piece(),t=p.tracks[0],e=write(p,t,2,10);e.tieBreaks=[2,6,8];removeScoreMeasures(p,1);assert.equal(t.events.length,1);assert.deepEqual([t.events[0].beat,t.events[0].duration,t.events[0].writtenDuration],[2,6,6]);assert.deepEqual(t.events[0].tieBreaks,[2,4]);valid(p);
});
test('copy and paste preserve phrase spacing, rests, dynamics and written register across pitched parts',()=>{
 const p=piece(),t=p.tracks[0],a=write(p,t,1,1,0),b=write(p,t,3,.5,2);a.velocity=.31;b.duration=.15;
 const clip=copyScoreSelection(p,t,[scoreSelectionItem(a),scoreSelectionItem(b)],{from:0,to:4}),target=p.tracks[1];pasteScoreSelection(p,target,clip,4);
 assert.deepEqual(target.events.map(e=>[e.beat,e.note,e.duration,e.writtenDuration]),[[5,48,1,1],[7,52,.15,.5]]);assert.equal(target.events[0].velocity,.31);assert.notEqual(target.events[0].id,a.id);assert.ok(target.rests.some(r=>r.beat===4));valid(p);
 const before=JSON.stringify(target);assert.throws(()=>pasteScoreSelection(p,target,clip,15),/enough measures/);assert.equal(JSON.stringify(target),before);
});
test('range selection clips boundaries and modifier toggles remove only the chosen note',()=>{
 const p=piece(),t=p.tracks[0],a=write(p,t,0,4),b=write(p,t,4,1),c=write(p,t,5,1);const items=scoreSelectionSpan(t,2,5);assert.deepEqual(items.map(i=>[i.from,i.to]),[[2,4],[4,5]]);
 deleteScoreSelection(t,items);assert.deepEqual(t.events.map(e=>[e.beat,e.duration]),[[0,2],[5,1]]);assert.deepEqual(toggleScoreSelection([scoreSelectionItem(a),scoreSelectionItem(b)],scoreSelectionItem(a)),[scoreSelectionItem(b)]);valid(p);
});

test('unavailable notes and different percussion strokes reject paste without changing the destination',()=>{
 const p=piece(),t=p.tracks[0],e=write(p,t,0,1),clip=copyScoreSelection(p,t,[scoreSelectionItem(e)]),target=p.tracks[1];target.removed=[0];const before=JSON.stringify(target);assert.throws(()=>pasteScoreSelection(p,target,clip,0),/unavailable/);assert.equal(JSON.stringify(target),before);
 const drums=newTrack('agogo-bells'),gong=newTrack('gong');p.tracks.push(drums,gong);const hit=write(p,drums,0,1);const percussion=copyScoreSelection(p,drums,[scoreSelectionItem(hit)]);assert.throws(()=>pasteScoreSelection(p,gong,percussion,0),/same kind/);assert.equal(gong.events.length,0);
});

test('copying a recorded held note preserves articulation while its next entry stays on a notated beat',()=>{
 const p=piece(),t=p.tracks[0],e=write(p,t,0,1);e.duration=1.13;
 const clip=copyScoreSelection(p,t,[scoreSelectionItem(e)]);assert.equal(clip.length,1);assert.equal(clip.events[0].duration,1.13);pasteScoreSelection(p,p.tracks[1],clip,4);assert.equal(p.tracks[1].events[0].duration,1.13);
 deleteScoreSelection(t,[scoreSelectionItem(e)]);assert.equal(t.events.length,0);assert.deepEqual(t.rests.map(r=>[r.beat,r.duration]),[[0,1]]);valid(p);
});

test('clearing a note with a release beyond the barline does not create a phantom note next measure',()=>{
 const p=piece(),t=p.tracks[0],e=write(p,t,3,1),next=write(p,t,5,1);e.duration=1.13;clearScoreSpan(t,0,4);assert.deepEqual(t.events,[next]);valid(p);
});
