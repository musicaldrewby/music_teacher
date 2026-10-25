import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {OfflineAudioContext} from 'node-web-audio-api';
import {AudioEngine,wavBytes} from '../dist/engine.js';
import {newProject,newTrack,getInstrument,notesFor,validateProject} from '../dist/catalog.js';
import {musicXML} from '../dist/musicxml.js';
import {ensureSong,appendSection,compileSong} from '../dist/song.js';

globalThis.OfflineAudioContext=OfflineAudioContext;
globalThis.fetch=async path=>{try{return new Response(await fs.readFile(new URL('../dist/'+path,import.meta.url)))}catch{return new Response('',{status:404})}};
class TestEngine extends AudioEngine {
 async init(){if(!this.ctx){this.ctx=new OfflineAudioContext(2,44100,44100);this.mix=this.createMix(this.ctx);}this.manifest=await this.manifestPromise;return this;}
}
const ids=['agogo-bells','cowbell','slapstick'];
function piece(){
 const p=newProject();p.bars=2;p.bpm=120;p.reverb=0;p.delay=0;
 let beat=0;
 p.tracks=ids.map(id=>{const t=newTrack(id);t.events=notesFor(getInstrument(id)).map((n,i)=>({id:id+i,note:n.note,shift:0,velocity:.8,duration:.5,beat:beat++*1.5}));return t;});
 return p;
}
test('new percussion strokes retain their identities in sections and MusicXML',()=>{
 const p=piece();ensureSong(p);appendSection(p,p.activeSection);
 const restored=validateProject(JSON.parse(JSON.stringify(p))),song=compileSong(restored);
 assert.deepEqual(song.tracks.map(t=>t.events.map(e=>e.note)),[[68,67,68,67],[56,57,56,57],[28,28]]);
 const xml=musicXML(restored);
 for(const name of ['Agogô bells','Cowbell','Slapstick','Low = bottom line','High = second line','Open = bottom line','Muted = second line','<words>Clap</words>'])assert.ok(xml.includes(name),name);
});
test('five acoustic strokes preload, audition at native pitch and render as audible unclipped WAV',async()=>{
 const engine=new TestEngine();
 for(const id of ids)await engine.prepareInstrument(getInstrument(id));
 assert.equal(engine.buffers.size,5);
 const voices=ids.flatMap(id=>{const inst=getInstrument(id);return notesFor(inst).map(n=>engine.play(inst,n,{id:'audition',volume:.8,pan:0}));});
 assert.equal(new Set(voices.map(v=>v.src.buffer)).size,5);
 assert.ok(voices.every(v=>v.src.playbackRate.value===1));engine.stop();
 const open=engine.buffers.get(engine.descriptor(getInstrument('cowbell'),56).url),muted=engine.buffers.get(engine.descriptor(getInstrument('cowbell'),57).url);
 assert.ok(open.duration>muted.duration);
 const out=await engine.render(piece());
 for(let channel=0;channel<2;channel++){
  const data=out.getChannelData(channel);
  assert.ok(data.every(v=>Number.isFinite(v)&&Math.abs(v)<1));
  for(const seconds of [0,.75,1.5,2.25,3])assert.ok(data.slice(Math.floor((seconds+.02)*44100),Math.floor((seconds+.12)*44100)).some(v=>Math.abs(v)>.02),'each stroke reaches the export');
 }
 const wav=wavBytes(out),header=new DataView(wav);
 assert.equal(header.getUint16(22,true),2);assert.equal(header.getUint32(40,true),out.length*4);
 assert.equal(engine.descriptor(getInstrument('suspended-cymbal'),57).url,'assets/audio/drum/57.mp3','cowbell override does not replace shared MIDI notes');
});
