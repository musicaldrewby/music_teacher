import test from 'node:test';
import assert from 'node:assert/strict';
import {MidiInput,mapMidiNote,midiKeyMap,decodeMidi,midiAudioTime,MIDI_TOUCH_DEFAULTS,normalizeMidiTouch,midiTouchVelocity} from '../dist/midi.js';
import {getInstrument,notesFor} from '../dist/catalog.js';

test('touch curves are monotonic, keep MIDI endpoints and leave Normal velocity exact',()=>{
 for(let n=1;n<=127;n++){
  const raw=n/127,normal=midiTouchVelocity(raw),light=midiTouchVelocity(raw,{curve:'light'}),firm=midiTouchVelocity(raw,{curve:'firm'});
  assert.equal(normal,raw);assert.ok(light>=normal-1e-15);assert.ok(firm<=normal+1e-15);
  for(const curve of ['light','normal','firm'])assert.ok(midiTouchVelocity(raw,{curve})>=midiTouchVelocity((n-1)/127,{curve}));
 }
 for(const curve of ['light','normal','firm']){
  assert.equal(midiTouchVelocity(1/127,{curve,min:20,max:105}),20/127);
  assert.equal(midiTouchVelocity(1,{curve,min:20,max:105}),105/127);
 }
 assert.equal(midiTouchVelocity(.1,{curve:'fixed',fixed:80}),80/127);
 assert.equal(midiTouchVelocity(.9,{curve:'fixed',fixed:80}),80/127);
 for(const raw of [0,-1,NaN,Infinity])assert.equal(midiTouchVelocity(raw,{curve:'fixed'}),0);
});
test('touch preferences normalize old, malformed and crossed ranges safely',()=>{
 for(const p of [undefined,null,{},'old preferences'])assert.deepEqual(normalizeMidiTouch(p),MIDI_TOUCH_DEFAULTS);
 assert.deepEqual(normalizeMidiTouch({curve:'bad',min:100,max:20,fixed:4,tone:8}),{curve:'normal',min:100,max:100,fixed:100,tone:1});
 assert.equal(normalizeMidiTouch({max:40}).fixed,40);
 assert.equal(normalizeMidiTouch({min:110}).fixed,110);
 assert.deepEqual(normalizeMidiTouch({min:NaN,max:Infinity,fixed:'loud',tone:NaN}),MIDI_TOUCH_DEFAULTS);
});

test('the same controller notes play soprano, alto and bass in their natural registers',()=>{
 for(const family of ['xylophone','metallophone']){
  for(const [register,octave] of [['soprano',72],['alto',60],['bass',48]]){
   const i=getInstrument(register+'-'+family);
   assert.equal(mapMidiNote(i,60).note,octave);
   assert.equal(mapMidiNote(i,64).note,octave+4);
   assert.equal(mapMidiNote(i,72).note,octave+12);
   assert.equal(mapMidiNote(i,48,{home:48}).note,octave,'one-time home C calibration');
  }
 }
 assert.equal(mapMidiNote(getInstrument('soprano-glockenspiel'),60).note,84);
 assert.equal(mapMidiNote(getInstrument('alto-glockenspiel'),60).note,72);
 assert.equal(mapMidiNote(getInstrument('bass-bars'),60).note,36);
 assert.equal(mapMidiNote(getInstrument('bass-xylophone'),60,{auto:false}).note,60);
});
test('octave mapping preserves pitch classes, actual ranges, swapped bars and removed notes',()=>{
 for(const id of ['soprano-recorder','alto-recorder','tenor-recorder','bass-recorder']){
  const i=getInstrument(id),mapping=midiKeyMap(i);
  for(const n of mapping)assert.equal(n.input%12,n.note%12);
  assert.equal(mapping.at(0).note,i.base);assert.equal(mapping.at(-1).note,i.base+24);
 }
 assert.equal(mapMidiNote(getInstrument('alto-recorder'),60),null,'C below the F recorder range is silent');
 assert.equal(mapMidiNote(getInstrument('bass-recorder'),65).note,53);
 const i=getInstrument('alto-xylophone'),notes=notesFor(i,'G');
 assert.equal(mapMidiNote(i,65,{notes}),null);assert.equal(mapMidiNote(i,66,{notes}).note,66);
 notes[0].enabled=false;assert.equal(mapMidiNote(i,60,{notes}),null);
 assert.equal(mapMidiNote(i,100),null);
});
test('percussion white keys retain all five temple-block identities and alternate strokes',()=>{
 const temple=getInstrument('temple-blocks');
 assert.deepEqual([60,62,64,65,67].map(n=>{const x=mapMidiNote(temple,n);return [x.note,x.shift]}),[[77,-4],[77,0],[76,-2],[76,2],[76,5]]);
 assert.equal(mapMidiNote(getInstrument('cowbell'),62).label,'Muted');
 assert.equal(mapMidiNote(getInstrument('cowbell'),61),null);
});
test('MIDI decoding handles release velocity zero, channels, controls and unrelated messages',()=>{
 assert.deepEqual(decodeMidi([0x92,60,64]),{type:'on',channel:2,note:60,velocity:64/127});
 assert.deepEqual(decodeMidi([0x90,60,0]),{type:'off',channel:0,note:60});
 assert.deepEqual(decodeMidi([0x89,42,20]),{type:'off',channel:9,note:42});
 assert.deepEqual(decodeMidi([0xb0,64,127]),{type:'control',channel:0,controller:64,value:127});
 for(const data of [[0xf8],[0xc0,2],[0xf0,1,2],[0xe0,0,64],[0x90,60,200]])assert.equal(decodeMidi(data),null);
 assert.equal(midiAudioTime({currentTime:10},995,1000),9.995);
});

class Port extends EventTarget {
 constructor(id){super();this.id=id;this.name=id;this.state='connected';this.connection='closed';this.opens=0;}
 async open(){this.opens++;this.connection='open';return this;}
 async close(){this.connection='closed';return this;}
 send(data){const e=new Event('midimessage');e.data=Uint8Array.from(data);this.dispatchEvent(e);}
}
test('MIDI connection requests no SysEx, filters input/channel and handles disconnect/reconnect once',async()=>{
 const a=new Port('a'),b=new Port('b'),access=new EventTarget();access.inputs=new Map([['a',a],['b',b]]);
 const messages=[],resets=[],requests=[];
 const input=new MidiInput({navigator:{requestMIDIAccess:async options=>{requests.push(options);return access}},onMessage:m=>messages.push(m),onReset:f=>resets.push(f)});
 assert.equal(requests.length,0,'permission is never requested at startup');
 await input.enable();assert.deepEqual(requests,[{sysex:false}]);assert.equal(input.status,'ready');
 a.send([0x90,60,100]);b.send([0x90,60,100]);assert.equal(messages.length,2);assert.notEqual(messages[0].key,messages[1].key);
 await input.selectInput('a');input.selectChannel(2);a.send([0x90,60,100]);b.send([0x92,60,100]);assert.equal(messages.length,2);
 a.send([0x92,60,100]);assert.equal(messages.length,3);
 a.state='disconnected';access.dispatchEvent(new Event('statechange'));await input.refresh();assert.equal(input.status,'waiting');assert.ok(resets.some(f=>f.inputId==='a'));
 a.state='connected';access.dispatchEvent(new Event('statechange'));await input.refresh();assert.equal(input.status,'ready');
 a.send([0x92,60,100]);assert.equal(messages.length,4,'no duplicate listeners after reconnect');
 input.disable();a.send([0x92,60,100]);assert.equal(messages.length,4);assert.equal(a.connection,'closed');
});
test('unsupported browsers, denied permission and failed ports give actionable connection states',async()=>{
 const absent=new MidiInput({navigator:{}});await absent.enable();assert.equal(absent.status,'unsupported');
 for(const name of ['SecurityError','NotAllowedError']){
  const denied=new MidiInput({navigator:{requestMIDIAccess:async()=>{throw Object.assign(new Error(),{name})}}});await denied.enable();assert.equal(denied.enabled,false);assert.match(denied.error,/own browser tab/);
 }
 const p=new Port('busy');p.open=async()=>{throw Error('busy')};const access=new EventTarget();access.inputs=new Map([['busy',p]]);
 const busy=new MidiInput({navigator:{requestMIDIAccess:async()=>access}});await busy.enable();assert.equal(busy.status,'error');assert.match(busy.error,/Close any app/);busy.disable();
});
