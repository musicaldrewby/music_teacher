import test from 'node:test';import assert from 'node:assert/strict';
import {newProject,newTrack,validateProject,scoreProject} from '../dist/catalog.js';
import {writeScoreEntry,tieScoreNotes,untieScoreNote,entryPitches,pitchForLetter,pitchAtStaff,scoreBeatX,scoreXBeat} from '../dist/score-entry.js';
import {notationEvents,notationVoices} from '../dist/notation.js';import {musicXML} from '../dist/musicxml.js';
import {ensureSong,syncSection,createSection,activateSection,compileSong,appendSection,trimSections} from '../dist/song.js';
function piece(id='alto-xylophone',bars=2){const p=newProject();p.bars=bars;p.tracks=[newTrack(id)];ensureSong(p);return [p,p.tracks[0]];}
const write=(p,t,beat,duration,rest=false,n=0)=>writeScoreEntry(p,t,{beat,duration,rest,pitch:entryPitches(p,t)[n]});
test('explicit eighth notes and rests survive readable notation, save and MusicXML',()=>{
 const [p,t]=piece();write(p,t,0,.5);write(p,t,.5,.5,true);write(p,t,1,.5,false,1);syncSection(p);
 const restored=validateProject(JSON.parse(JSON.stringify(p)));assert.deepEqual(restored.tracks[0].rests,t.rests);
 assert.deepEqual(notationEvents(scoreProject(p),t,.25).map(e=>e.duration),[.5,.5]);
 const tokens=notationVoices(scoreProject(p),t,.25)[0][0];assert.deepEqual(tokens.slice(0,3).map(e=>[e.glyph,e.rest]),[['8',false],['8',true],['8',false]]);assert.equal(tokens[1].restId,t.rests[0].id);
 assert.match(musicXML(p),/<rest\/><duration>2<\/duration><voice>1<\/voice><type>eighth/);
 // Removing a note's written override still cannot fill a deliberate rest.
 delete t.events[0].writtenDuration;assert.equal(notationEvents(scoreProject(p),t,.25)[0].duration,.5);
});
test('inserting into the middle of a sustained note preserves both outside fragments',()=>{
 const [p,t]=piece();write(p,t,0,4);write(p,t,1,1,true);
 assert.deepEqual(t.events.map(e=>[e.beat,e.duration,e.writtenDuration]),[[0,1,1],[2,2,2]]);assert.deepEqual(t.rests.map(e=>[e.beat,e.duration]),[[1,1]]);
 write(p,t,1,.5,false,1);assert.deepEqual(t.rests.map(e=>[e.beat,e.duration]),[[1.5,.5]]);assert.equal(t.events.length,3);
});
test('manual ties retain visible rhythmic boundaries and one sounding attack',()=>{
 const [p,t]=piece();const first=write(p,t,0,1);write(p,t,1,1);tieScoreNotes(t,first.id);
 assert.equal(t.events.length,1);assert.equal(t.events[0].duration,2);assert.deepEqual(t.events[0].tieBreaks,[1]);
 assert.deepEqual(notationVoices(scoreProject(p),t,.25)[0][0].filter(e=>!e.rest).map(e=>e.glyph),['q','q']);
 const xml=musicXML(p);assert.match(xml,/<tie type="start"/);assert.match(xml,/<tie type="stop"/);
 syncSection(p);assert.doesNotThrow(()=>validateProject(JSON.parse(JSON.stringify(p))));
 untieScoreNote(t,first.id);assert.deepEqual(t.events.map(e=>[e.beat,e.duration]),[[0,1],[1,1]]);
 t.events[1].note=62;assert.throws(()=>tieScoreNotes(t,first.id),/same pitch/);
});
test('cross-bar notes are tied in engraving and output while compound beats remain complete',()=>{
 for(const meter of ['4/4','6/8']){const [p,t]=piece();p.meter=meter;const per=meter==='6/8'?3:4;write(p,t,per-.5,1.5);const voices=notationVoices(scoreProject(p),t,.25)[0];for(const bar of voices)assert.equal(bar.reduce((n,e)=>n+e.duration,0),per);assert.match(musicXML(p),/<tie type="start"/);}
});
test('rest patterns survive section copies, switching, repeats, trimming and playback entrances',()=>{
 const [p,t]=piece();write(p,t,0,.5,true);write(p,t,.5,1);const a=p.activeSection,b=createSection(p,{source:a});activateSection(p,b.id);assert.equal(t.rests.length,1);assert.notEqual(t.rests[0].id,p.sections.find(s=>s.id===a).rests[t.id][0].id);
 write(p,t,7,.5,true);appendSection(p,b.id);syncSection(p);let song=compileSong(p);assert.equal(song.tracks[0].rests.length,3);assert.ok(song.tracks[0].rests[1].sourceRest);assert.equal(song.tracks[0].events.length,2);
 p.bars=1;trimSections(p);assert.equal(t.rests.length,1);assert.doesNotThrow(()=>validateProject(p));
 p.arrangement[1].mutedTracks=[t.id];song=compileSong(p);assert.equal(song.tracks[0].rests.length,1);
});
test('recorded and sequenced notes reclaim silence without removing unrelated rests',()=>{
 const [p,t]=piece();write(p,t,0,4,true);t.events.push({id:'recorded',beat:1,duration:.2,note:60,velocity:.8});syncSection(p);
 assert.deepEqual(t.rests.map(r=>[r.beat,r.duration]),[[0,1],[1.25,2.75]]);
});
test('written register and keyboard pitch spelling match the chosen instrument',()=>{
 for(const [id,sounding]of [['soprano-glockenspiel',84],['alto-xylophone',60],['bass-xylophone',48],['bass-bars',36]]){const [p,t]=piece(id);const n=pitchForLetter(p,t,'c',60);assert.equal(n.written,60);assert.equal(n.note,sounding);}
 const [p,t]=piece('soprano-recorder');assert.equal(pitchForLetter(p,t,'c',64).written,60);assert.equal(pitchAtStaff(p,t,160,160).written,64);
 const [g,gt]=piece();g.key='G';assert.equal(pitchForLetter(g,gt,'f',65).note,66);
 const [d,dt]=piece('temple-blocks');assert.equal(pitchAtStaff(d,dt,120,160).label,'5 · high');assert.equal(pitchAtStaff(d,dt,160,160).label,'1 · low');
});
test('invalid entry and unsupported pitches do not change music',()=>{
 const [p,t]=piece();const before=JSON.stringify(t);assert.throws(()=>write(p,t,7,2),/another measure/);assert.equal(JSON.stringify(t),before);
 t.removed=[0];assert.throws(()=>writeScoreEntry(p,t,{beat:0,duration:1,pitch:{note:60,shift:0}}),/available/);
 t.rests=[{id:'bad',beat:0,duration:-1}];assert.throws(()=>validateProject(p),/rest/);
});
test('staff hit positions use engraved spacing, including subdivisions between noteheads',()=>{
 const geometry={start:0,end:4,points:[{beat:0,x:100},{beat:1,x:200},{beat:3,x:320},{beat:4,x:400}]};
 assert.equal(scoreBeatX(geometry,2),260);assert.equal(scoreXBeat(geometry,260),2);assert.equal(scoreXBeat(geometry,-100),0);assert.equal(scoreXBeat(geometry,900),3.75);
});

test('a tied voice does not change an independent chord tone into tied quarters',()=>{
 const [p,t]=piece();const first=write(p,t,0,1);write(p,t,1,1);tieScoreNotes(t,first.id);t.events.push({id:'upper',beat:0,duration:2,writtenDuration:2,note:64,velocity:.8});
 const lanes=notationVoices(scoreProject(p),t,.25,{chords:true});assert.equal(lanes.length,2);assert.deepEqual(lanes.map(l=>l[0].filter(n=>!n.rest).map(n=>n.glyph)).sort(),[['h'],['q','q']].sort());
});
