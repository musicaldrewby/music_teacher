import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {CATALOG,newProject,newTrack,validateProject,notesFor,scoreProject,audibleTracks,quantizedBeat,totalBeats} from '../dist/catalog.js';
import {notationVoices} from '../dist/notation.js';
import {musicXML} from '../dist/musicxml.js';
import {wavBytes} from '../dist/engine.js';
const makePiece=()=>{const p=newProject();p.title='A & B';p.meter='6/8';p.bars=3;const t=newTrack('alto-xylophone');t.events=[{id:'note-1',beat:0,duration:1.5,note:60,velocity:.8,shift:0},{id:'note-2',beat:1.5,duration:3,note:64,velocity:.7,shift:0},{id:'note-3',beat:1.5,duration:3,note:67,velocity:.7,shift:0},{id:'note-4',beat:8.5,duration:.5,note:72,velocity:.9,shift:0}];p.tracks=[t];return p;};
test('every requested barred instrument has thirteen correct ascending notes',()=>{const barred=CATALOG.filter(i=>i.shape==='bars');assert.equal(barred.length,8);for(const i of barred){const ns=notesFor(i,'C');assert.equal(ns.length,13);assert.equal(ns[12].note-i.base,21);for(let n=1;n<13;n++)assert.ok(ns[n].note>ns[n-1].note)}});
test('sample mapping resolves every note, including swap bars and recorded percussion',()=>{const m=JSON.parse(fs.readFileSync(new URL('../dist/assets/audio/manifest.json',import.meta.url)));for(const inst of CATALOG)for(const key of ['C','F','G','Bb+F#'])for(const n of notesFor(inst,key)){const set=m.instrumentSamples?.[inst.id],spec=set?.articulations?.[`${n.note}:${n.shift||0}`]||set?.notes?.[n.note]||(!set?.notes&&!set?.articulations?set:null);const url=spec?.url||`assets/audio/${inst.family}/${n.note}.mp3`;assert.ok(fs.existsSync(new URL('../dist/'+url,import.meta.url)),`${inst.id} ${n.note} ${url}`);}});
test('project round-trip retains instruments, musical events and effects',()=>{const p=makePiece();p.reverb=.4;p.delay=.2;p.tracks[0].removed=[3,6];p.tracks[0].pan=-.4;assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))),p)});
test('an ensemble containing the entire collection survives saving and reopening',()=>{
 const p=newProject();p.tracks=CATALOG.map(i=>newTrack(i.id));
 assert.equal(p.tracks.length,38);
 assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))),p);
});
test('reject invalid and injected project identities',()=>{const p=makePiece();p.tracks[0].id='\" onclick=\"alert(1)';assert.throws(()=>validateProject(p));const q=makePiece();q.tracks[0].events[0].note=NaN;assert.throws(()=>validateProject(q));});
test('6/8 polyphony and tied notes keep complete measures in every voice',()=>{const p=makePiece(),voices=notationVoices(scoreProject(p),p.tracks[0],.25);assert.equal(voices.length,2);for(const lane of voices){assert.equal(lane.length,3);for(const bar of lane)assert.equal(bar.reduce((n,t)=>n+t.duration,0),3);}const fragments=voices.flat(2).filter(t=>t.source?.id==='note-2');assert.equal(fragments.reduce((n,t)=>n+t.duration,0),3);assert.ok(fragments.length>1)});
test('MusicXML preserves half and dotted durations, meter, polyphony and escaping',()=>{const p=makePiece(),xml=musicXML(p);assert.match(xml,/<work-title>A &amp; B<\/work-title>/);assert.match(xml,/<beats>6<\/beats><beat-type>8<\/beat-type>/);assert.match(xml,/<type>quarter<\/type><dot\/>/);assert.match(xml,/<tie type="start"\/>/);assert.match(xml,/<chord\/>/);assert.equal((xml.match(/<measure number=/g)||[]).length,3)});
test('mute and solo produce the same audible selection for playback and exports',()=>{const p=makePiece(),a=newTrack('bass-xylophone'),b=newTrack('gong');p.tracks.push(a,b);a.solo=true;assert.deepEqual(audibleTracks(p).map(t=>t.id),[a.id]);a.muted=true;assert.equal(audibleTracks(p).length,0)});
test('quantization retains notes at the first beat and wraps only in the transport',()=>{assert.equal(quantizedBeat(-.04,.5,16),0);assert.equal(quantizedBeat(15.99,.5,16),15.5);assert.equal(totalBeats(makePiece()),9)});
test('WAV output contains correct stereo PCM data and clips safely',()=>{const b={numberOfChannels:2,length:3,sampleRate:44100,getChannelData:c=>new Float32Array(c?[0,.5,-.5]:[0,2,-2])};const bytes=wavBytes(b),v=new DataView(bytes);assert.equal(new TextDecoder().decode(new Uint8Array(bytes,0,4)),'RIFF');assert.equal(v.getUint16(22,true),2);assert.equal(v.getUint32(40,true),12);assert.equal(v.getInt16(48,true),32767);assert.equal(v.getInt16(52,true),-32768)});
test('vendored MP3 encoder creates a valid nonempty stream',()=>{const context={};vm.createContext(context);vm.runInContext(fs.readFileSync(new URL('../dist/vendor/lame.min.js',import.meta.url),'utf8'),context);const encoder=new context.lamejs.Mp3Encoder(2,44100,192),tone=Int16Array.from({length:44100},(_,i)=>Math.sin(i*2*Math.PI*440/44100)*10000);const output=[encoder.encodeBuffer(tone,tone),encoder.flush()];assert.ok(output.reduce((n,b)=>n+b.length,0)>15000);});
test('new parts retain low bass pitches and percussion stroke legends in MusicXML',()=>{
 const p=newProject();p.bars=1;const bass=newTrack('bass-bars'),cabasa=newTrack('cabasa');bass.events=[{id:'bass',beat:0,note:36,duration:2,velocity:.8,shift:0}];cabasa.events=[{id:'rub',beat:1,note:70,duration:.5,velocity:.7,shift:0}];p.tracks=[bass,cabasa];
 const xml=musicXML(p);assert.match(xml,/<sign>G<\/sign><line>2<\/line>/);assert.match(xml,/<pitch><step>C<\/step><octave>4<\/octave><\/pitch>/);assert.match(xml,/<octave-change>-2<\/octave-change>/);assert.match(xml,/Strong rub = second line/);assert.match(xml,/<unpitched><display-step>G<\/display-step>/);assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))),p);
});
