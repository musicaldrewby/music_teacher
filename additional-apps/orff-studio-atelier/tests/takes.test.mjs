import test from 'node:test';
import assert from 'node:assert/strict';
import {rememberTake,latestTake,removeTake} from '../dist/takes.js';
const fixture=()=>({activeSection:'a',tracks:[{id:'x',volume:.4,events:[{id:'before'},{id:'one'},{id:'two'},{id:'manual'}]}],sections:[{id:'a',events:{x:[{id:'before'},{id:'one'},{id:'two'},{id:'manual'}]}},{id:'b',events:{x:[{id:'one'}]}}]});
test('undo latest take keeps old notes, other takes, later edits and copied sections',()=>{
 const p=fixture();rememberTake(p,{sectionId:'a',recorded:new Map([['one',0]])});rememberTake(p,{sectionId:'a',recorded:new Map([['two',0]])});
 assert.equal(removeTake(p,latestTake(p)),1);assert.deepEqual(p.tracks[0].events.map(e=>e.id),['before','one','manual']);assert.equal(p.tracks[0].volume,.4);assert.equal(p.sections[1].events.x.length,1);
 const saved=JSON.parse(JSON.stringify(p));removeTake(saved,latestTake(saved));assert.deepEqual(saved.tracks[0].events.map(e=>e.id),['before','manual']);assert.equal(latestTake(saved),null);
});
test('inactive-section take removal works without deleting current notes',()=>{const p=fixture();rememberTake(p,{sectionId:'b',recorded:new Map([['one',0]])});removeTake(p,latestTake(p));assert.equal(p.sections[1].events.x.length,0);assert.equal(p.tracks[0].events.length,4);});
test('empty/canceled takes and already deleted notes are ignored',()=>{const p=fixture();rememberTake(p,{sectionId:'a',recorded:new Map()});assert.equal(latestTake(p),null);rememberTake(p,{sectionId:'a',recorded:new Map([['gone',0]])});assert.equal(latestTake(p),null);});
