import test from 'node:test';
import assert from 'node:assert/strict';
import {newProject,newTrack,scoreProject} from '../dist/catalog.js';
import {notationEvents,notationVoices} from '../dist/notation.js';
import {musicXML} from '../dist/musicxml.js';
const make=(beats)=>{const p=newProject(),t=newTrack('soprano-recorder');p.tracks=[t];t.events=beats.map((beat,n)=>({id:'n'+n,note:72+n%5,beat,duration:.12,velocity:.8,shift:0,writtenDuration:.5,writtenDurationAuto:true}));return [p,t];};
test('screenshot phrase prints quarters and real eighth pairs without articulation rests',()=>{
 const [p,t]=make([0,1,2,3,4,4.5,5,5.5,6,7,8,9,10,11,12,12.5,13,13.5,14]),before=JSON.stringify(t.events);
 const score=scoreProject(p),lanes=notationVoices(score,score.tracks[0],.25)[0];
 assert.deepEqual(lanes[0].map(n=>[n.glyph,n.rest]),[['q',false],['q',false],['q',false],['q',false]]);
 assert.deepEqual(lanes[1].map(n=>n.glyph),['8','8','8','8','q','q']);
 assert.equal(lanes.flat().filter(n=>n.rest).length,1);assert.equal(lanes[3].at(-1).glyph,'q');assert.equal(lanes[3].at(-1).rest,true);
 const xml=musicXML(p);assert.equal((xml.match(/<type>eighth<\/type>/g)||[]).length,8);assert.equal((xml.match(/<rest\/>/g)||[]).length,1);assert.equal(JSON.stringify(t.events),before);
});
test('explicit written values, exact mode, offbeats, and compound meter are preserved',()=>{
 const [p,t]=make([0,1]);delete t.events[0].writtenDurationAuto;assert.equal(notationEvents(p,t,.25)[0].duration,.5);
 t.events[0].writtenDuration='played';assert.equal(notationEvents(p,t,.25)[0].duration,.25);
 t.events[0].writtenDuration=.5;t.events[0].writtenDurationAuto=true;p.notation={simplifyMalletGaps:false};assert.equal(notationEvents(p,t,.25)[0].duration,.5);
 delete p.notation;p.meter='6/8';assert.equal(notationEvents(p,t,.25)[0].duration,.5);
 p.meter='4/4';t.events[0].beat=.5;assert.equal(notationEvents(p,t,.25)[0].duration,.5);
});
test('automatic existing short notes do not fill long rests or consume real sixteenths',()=>{
 const [p,t]=make([0,.25,2]);t.events.forEach(e=>{delete e.writtenDuration;delete e.writtenDurationAuto;});
 const events=notationEvents(p,t,.25);assert.equal(events[0].duration,.25);assert.equal(events[2].duration,1);assert.ok(notationVoices(p,t,.25)[0][0].some(n=>n.rest));
});

test('sixteenth recording grid preserves continuous mixed eighths and sixteenths despite tiny releases',async()=>{
 const {captureRecordedNote,finishRecordedHold}=await import('../dist/recording.js');
 const p=newProject();p.bars=1;const t=newTrack('soprano-recorder');p.tracks=[t];
 const tr={start:10,sec:.6,recorded:new Map(),pending:[]};
 for(const beat of [0,.5,1,1.25,1.5,1.75,2,2.5,3,3.5]){const h={pitched:true,eventData:{note:72,velocity:.8,shift:0}},at=10+beat*.6;captureRecordedNote(tr,h,{at,track:t,grid:.25,duration:.25,total:4,loop:false});finishRecordedHold(h,at+.04);}
 const before=JSON.stringify(t.events),score=scoreProject(p),tokens=notationVoices(score,score.tracks[0],.25)[0][0];
 assert.deepEqual(tokens.map(n=>n.glyph),['8','8','16','16','16','16','8','8','8','8']);assert.ok(tokens.every(n=>!n.rest));
 assert.ok(!musicXML(p).includes('<rest/>'));assert.equal(JSON.stringify(t.events),before);assert.ok(t.events.every(e=>e.duration<.1));
 // The same inference fixes older takes after Automatic lengths removes overrides.
 t.events.forEach(e=>{delete e.writtenDuration;delete e.writtenDurationAuto;});assert.ok(notationVoices(scoreProject(p),t,.25)[0][0].every(n=>!n.rest));
});
