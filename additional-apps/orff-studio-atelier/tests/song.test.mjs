import test from 'node:test';
import assert from 'node:assert/strict';
import {newProject,newTrack,validateProject} from '../dist/catalog.js';
import {ensureSong,syncSection,activateSection,createSection,appendSection,deleteSection,moveEntry,songBars,compileSong,trimSections,mapSectionNotes,validateSong} from '../dist/song.js';
import {musicXML} from '../dist/musicxml.js';
const note=(id='n',beat=0)=>({id,beat,duration:1,note:60,velocity:.8,shift:0});
function piece(){const p=newProject();p.bars=2;p.tracks=[newTrack('alto-xylophone'),newTrack('claves')];p.tracks[0].events=[note()];p.tracks[1].events=[{...note('c',1),note:75}];return p}

test('legacy projects migrate to section A without changing their music',()=>{
 const p=piece(),old=structuredClone(p);assert.deepEqual(validateProject(old),old);
 ensureSong(p);assert.deepEqual(p.tracks,old.tracks);assert.equal(p.sections.length,1);assert.equal(p.sections[0].name,'A');assert.equal(p.arrangement.length,1);
 const output=compileSong(p);assert.equal(output.bars,old.bars);assert.equal(output.tracks[0].events[0].note,60);
 assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))),p);
});
test('section switching captures edits and restores independent variations',()=>{
 const p=ensureSong(piece()),a=p.activeSection,b=createSection(p,{source:a});
 activateSection(p,b.id);p.tracks[0].events[0].note=64;p.bars=3;syncSection(p);
 activateSection(p,a);assert.equal(p.bars,2);assert.equal(p.tracks[0].events[0].note,60);
 p.tracks[0].events[0].duration=2;activateSection(p,b.id);
 assert.equal(p.bars,3);assert.equal(p.tracks[0].events[0].note,64);assert.equal(p.tracks[0].events[0].duration,1);
 assert.notEqual(p.tracks[0].events[0].id,p.sections[0].events[p.tracks[0].id][0].id);
});
test('song expansion follows order, repeats and entrances in compound meter',()=>{
 const p=ensureSong(piece());p.meter='6/8';const a=p.activeSection,b=createSection(p,{source:a});
 activateSection(p,b.id);p.bars=1;p.tracks[0].events[0].note=67;syncSection(p);
 const bEntry=appendSection(p,b.id),aAgain=appendSection(p,a);p.arrangement[0].repeats=2;
 bEntry.mutedTracks=[p.tracks[1].id];aAgain.mutedTracks=[p.tracks[0].id];moveEntry(p,bEntry.id,0);
 const output=compileSong(p);assert.equal(output.bars,7);assert.deepEqual(output.sectionMarkers.map(m=>m.bar),[0,1,3,5]);
 assert.deepEqual(output.tracks[0].events.map(e=>[e.beat,e.note]),[[0,67],[3,60],[9,60]]);
 assert.deepEqual(output.tracks[1].events.map(e=>e.beat),[4,10,16]);
 assert.equal(output.tracks[0].events[1].sourceSection,a);assert.equal(new Set(output.tracks[0].events.map(e=>e.id)).size,3);
 assert.equal(output.sectionMarkers[2].name,'A · 2/2');
});
test('linked appearances update together while source notes stay local',()=>{
 const p=ensureSong(piece());appendSection(p,p.activeSection);p.tracks[0].events[0].beat=2;
 const output=compileSong(p);assert.deepEqual(output.tracks[0].events.map(e=>e.beat),[2,10]);
 assert.equal(p.tracks[0].events[0].beat,2);assert.equal(p.sections[0].events[p.tracks[0].id][0].beat,2);
});
test('section ends release sustained notes without leaking their written duration into the next section',()=>{
 const p=ensureSong(piece());p.tracks[0].events=[{...note('long',7),duration:8}];p.arrangement[0].repeats=2;
 assert.deepEqual(compileSong(p).tracks[0].events.map(e=>[e.beat,e.duration]),[[7,1],[15,1]]);
 assert.equal(p.tracks[0].events[0].duration,8);
});
test('global meter and pitch changes reach inactive sections, and track deletion prunes references',()=>{
 const p=ensureSong(piece()),b=createSection(p,{source:p.activeSection});
 activateSection(p,b.id);p.tracks[0].events.push(note('late',7));syncSection(p);activateSection(p,p.sections[0].id);
 p.meter='2/4';trimSections(p);assert.equal(p.sections[1].events[p.tracks[0].id].length,1);
 mapSectionNotes(p,(e,t)=>{if(t.instrument==='alto-xylophone')e.note+=2});assert.equal(p.sections[1].events[p.tracks[0].id][0].note,62);
 const removed=p.tracks[1].id;p.arrangement[0].mutedTracks=[removed];p.tracks.pop();syncSection(p);
 assert.ok(p.sections.every(s=>!(removed in s.events)));assert.deepEqual(p.arrangement[0].mutedTracks,[]);assert.doesNotThrow(()=>validateProject(p));
});
test('deleting a section removes its appearances and chooses a surviving editor section',()=>{
 const p=ensureSong(piece()),a=p.activeSection,b=createSection(p);appendSection(p,b.id);appendSection(p,a);
 deleteSection(p,a);assert.equal(p.activeSection,b.id);assert.equal(p.arrangement.length,1);assert.equal(p.tracks[0].events.length,0);
 assert.throws(()=>deleteSection(p,b.id),/at least one/);
 p.arrangement=[];assert.equal(songBars(p),0);assert.doesNotThrow(()=>validateSong(p));assert.throws(()=>compileSong(p),/Add a section/);
});
test('import rejects broken references, duplicate identifiers, invalid notes and oversized forms',()=>{
 const p=ensureSong(piece()),track=p.tracks[0].id;
 const attempts=[q=>q.arrangement[0].section='missing',q=>q.arrangement.push(structuredClone(q.arrangement[0])),q=>q.arrangement[0].repeats=17,q=>q.arrangement[0].mutedTracks=['missing'],q=>q.sections[0].events[track][0].note=128,q=>q.sections[0].events[track][0].beat=8,q=>q.sections[0].events[track].push(note()),q=>q.activeSection='missing',q=>q.sections[0].id='__proto__',q=>{q.bars=64;q.sections[0].bars=64;q.arrangement[0].repeats=9},q=>q.sections[0].events.unknown=[]];
 for(const corrupt of attempts){const q=structuredClone(p);corrupt(q);assert.throws(()=>validateProject(q));}
 const q=piece();q.arrangement=[];assert.throws(()=>validateProject(q),/incomplete/);
});
test('MusicXML writes section cues and silent entrances using the same expanded measures',()=>{
 const p=ensureSong(piece());p.sections[0].name='A & B';p.arrangement[0].repeats=2;const last=appendSection(p,p.activeSection);last.mutedTracks=[p.tracks[0].id];
 const xml=musicXML(compileSong(p)),firstPart=xml.split('<part id="P1">')[1].split('</part>')[0];
 assert.equal((firstPart.match(/<measure /g)||[]).length,6);assert.ok(firstPart.includes('<rehearsal>A &amp; B · 2/2</rehearsal>'));
 const lastMeasures=firstPart.split('<measure number="5">')[1];assert.ok(lastMeasures.includes('<rest/>'));assert.ok(!lastMeasures.includes('<pitch>'));
});
