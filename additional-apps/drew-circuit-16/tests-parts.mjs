import assert from 'node:assert/strict';
import {makeProject,clone,validateProject} from './dist/model.js';
import {copyPart,pastePart,canPastePart,canPasteSound} from './dist/parts.js';

const p=makeProject(),a=p.patterns[0],b=p.patterns[1];
a.tracks[0].notes[0]=73;a.tracks[0].tie[2]=true;a.tracks[0].chance[5]=.3;
const before=clone(p),seq=copyPart(a,'track:0'),destinationSound=b.tracks[2].program;
assert(pastePart(b,'track:2',seq));
assert.deepEqual(b.tracks[2].notes,a.tracks[0].notes);
assert.deepEqual(b.tracks[2].tie,a.tracks[0].tie);
assert.deepEqual(b.tracks[2].chance,a.tracks[0].chance);
assert.equal(b.tracks[2].length,a.tracks[0].length);
assert.equal(b.tracks[2].rate,a.tracks[0].rate);
assert.equal(b.tracks[2].program,destinationSound);
assert.deepEqual(b.tracks[0],before.patterns[1].tracks[0]);
assert.deepEqual(b.bass,before.patterns[1].bass);
assert.deepEqual(b.drums,before.patterns[1].drums);
assert.deepEqual(p.mix,before.mix);assert.deepEqual(p.fx,before.fx);
assert.deepEqual(p.patterns[2],before.patterns[2]);
// Copy is a frozen snapshot; pastes are independent from the source and one another.
a.tracks[0].notes[0]=20;
pastePart(b,'track:1',seq,true);b.tracks[2].notes[0]=88;
assert.equal(b.tracks[1].notes[0],73);assert.equal(seq.data.notes[0],73);
assert.equal(b.tracks[1].program,seq.data.program);
// Cross-engine sequence copies retain the destination voice and analog controls.
const bassSound=clone(b.bass);
assert(canPastePart(seq,'bass'));assert(!canPasteSound(seq,'bass'));
pastePart(b,'bass',seq,true);
assert.deepEqual(b.bass.notes,seq.data.notes);
for(const key of ['source','program','cutoff','decay','slide','accent','wave'])assert.equal(b.bass[key],bassSound[key]);
a.bass.cutoff=420;a.bass.wave='saw';const bass=copyPart(a,'bass');
pastePart(b,'bass',bass,true);assert.equal(b.bass.cutoff,420);assert.equal(b.bass.wave,'saw');
const trackSound=b.tracks[3].program;pastePart(b,'track:3',bass,true);
assert.equal(b.tracks[3].source,'soundfont');assert.equal(b.tracks[3].program,trackSound);
// Row paste preserves the destination kit, other rows, and the shared drum clock.
a.drums.kit=48;a.drums.lanes[0].note=43;a.drums.lanes[0].volume=.71;
const row=copyPart(a,'row:0'),oldDrums=clone(b.drums);
pastePart(b,'row:3',row);
assert.deepEqual(b.drums.lanes[3].on,a.drums.lanes[0].on);
assert.equal(b.drums.lanes[3].note,oldDrums.lanes[3].note);
pastePart(b,'row:4',row,true);
assert.equal(b.drums.lanes[4].note,43);assert.equal(b.drums.lanes[4].volume,.71);
assert.equal(b.drums.lanes[4].name,'High floor tom');
assert.equal(b.drums.kit,oldDrums.kit);assert.equal(b.drums.length,oldDrums.length);
assert.equal(b.drums.rate,oldDrums.rate);assert.deepEqual(b.drums.lanes[1],oldDrums.lanes[1]);
// All-drums paste can retain assignments or include the kit and all row sounds.
a.drums.length=11;a.drums.rate=.5;const drums=copyPart(a,'drums');
const oldKeys=b.drums.lanes.map(l=>l.note);pastePart(b,'drums',drums);
assert.deepEqual(b.drums.lanes.map(l=>l.note),oldKeys);
assert.equal(b.drums.length,11);assert.equal(b.drums.rate,.5);
pastePart(b,'drums',drums,true);assert.deepEqual(b.drums,a.drums);
const safe=clone(b);assert(!pastePart(b,'bass',drums));assert(!pastePart(b,'drums',row));
assert(!pastePart(b,'track:9',seq));assert(!canPastePart(null,'bass'));
assert.equal(copyPart(a,'row:8'),null);assert.deepEqual(b,safe);
assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))),p);
console.log('PASS: part copies across patterns, independent snapshots, destination sounds, melody/bass compatibility, drum rows and kits, invalid destinations and save/reload.');
