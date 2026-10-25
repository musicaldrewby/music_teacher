import test from 'node:test';
import assert from 'node:assert/strict';
import {getInstrument,newProject,newTrack,writtenOctave,octaveDescription} from '../dist/catalog.js';
import {staffSpec,writtenKey} from '../dist/notation.js';
import {musicXML} from '../dist/musicxml.js';
const cases=[['soprano-glockenspiel',-24],['alto-glockenspiel',-12],['soprano-xylophone',-12],['soprano-metallophone',-12],['alto-xylophone',0],['alto-metallophone',0],['bass-xylophone',12],['bass-metallophone',12],['bass-bars',24]];
for(const [id,offset] of cases)test(`${id}: classroom treble part and round-trip sounding octave`,()=>{
 const i=getInstrument(id),p=newProject(),t=newTrack(id);p.bars=1;p.tracks=[t];t.events=[{id:'note',beat:0,duration:4,note:i.base,velocity:.8,shift:0}];
 const original=JSON.stringify(p),spec=staffSpec(id),xml=musicXML(p);
 assert.equal(spec.clef,'treble');assert.equal(writtenOctave(i),offset);assert.equal(writtenKey(i.base+offset),'c/4');
 assert.match(xml,/<clef><sign>G<\/sign><line>2<\/line><\/clef>/);assert.match(xml,/<pitch><step>C<\/step><octave>4<\/octave><\/pitch>/);
 if(offset)assert.ok(xml.includes(`<octave-change>${-offset/12}</octave-change>`));else assert.ok(!xml.includes('<transpose>'));
 assert.equal(i.base+offset-offset,i.base);assert.equal(JSON.stringify(p),original);
});
test('octave labels distinguish one/two and above/below; conventional exceptions remain',()=>{
 assert.equal(octaveDescription(getInstrument('soprano-glockenspiel')),'sounds two octaves higher');
 assert.equal(octaveDescription(getInstrument('bass-xylophone')),'sounds one octave lower');
 assert.equal(octaveDescription(getInstrument('bass-bars')),'sounds two octaves lower');
 assert.equal(staffSpec('timpani').clef,'bass');assert.equal(staffSpec('bass-recorder').clef,'bass');assert.equal(staffSpec('triangle').clef,'percussion');
});
