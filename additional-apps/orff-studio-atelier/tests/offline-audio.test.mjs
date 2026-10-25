import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {OfflineAudioContext} from 'node-web-audio-api';
import {AudioEngine,wavBytes} from '../dist/engine.js';
import {newProject,newTrack,getInstrument,notesFor} from '../dist/catalog.js';
globalThis.OfflineAudioContext=OfflineAudioContext;
globalThis.fetch=async path=>{try{const b=await fs.readFile(new URL('../dist/'+path,import.meta.url));return new Response(b)}catch{return new Response('',{status:404})}};
class OfflineTestEngine extends AudioEngine {async init(){if(!this.ctx){this.ctx=new OfflineAudioContext(2,44100,44100);this.mix=this.createMix(this.ctx);}this.manifest=await this.manifestPromise;return this;}}
test('actual offline render includes all recorded sounds, effects, panning and the gong tail',async()=>{const engine=new OfflineTestEngine(),p=newProject();p.bpm=120;p.bars=1;p.reverb=.2;p.delay=.2;const track=newTrack('alto-xylophone');track.pan=-.5;track.events=[{id:'a',beat:0,note:60,duration:1,velocity:.8,shift:0},{id:'b',beat:1,note:64,duration:1,velocity:.8,shift:0}];const gong=newTrack('gong');gong.events=[{id:'g',beat:2,note:52,duration:1,velocity:.6,shift:0}];p.tracks=[track,gong];const b=await engine.render(p);assert.equal(b.sampleRate,44100);assert.equal(b.numberOfChannels,2);assert.ok(b.duration>=31&&b.duration<35);let peak=0,power=0;for(const ch of [0,1])for(const n of b.getChannelData(ch)){assert.ok(Number.isFinite(n));peak=Math.max(peak,Math.abs(n));power+=n*n}assert.ok(peak>.05&&peak<1);assert.ok(power>10);await fs.writeFile('/workspace/scratch/f510c3edf10b/orff-qa-render.wav',Buffer.from(wavBytes(b)));});

test('mute and solo gate new hits on an existing audio channel',async()=>{for(const solo of [false,true]){const engine=new OfflineTestEngine(),p=newProject(),t=newTrack('alto-xylophone'),other=newTrack('gong');t.muted=!solo;other.solo=solo;t.events=[{id:'a',beat:0,note:60,duration:1,velocity:1,shift:0}];p.tracks=[t,other];await engine.prepareProject(p);engine.mix.out.connect(engine.ctx.destination);engine.play({id:t.instrument,family:'xylophone'},t.events[0],t,0);const out=await engine.ctx.startRendering();assert.ok(out.getChannelData(0).every(n=>n===0));}});

test('all added instrument voices decode and render through the audio export engine',async()=>{
 const engine=new OfflineTestEngine(),p=newProject();p.bpm=120;p.bars=8;p.reverb=.15;p.delay=.05;let beat=0;
 for(const id of ['bass-bars','tambourine','shakers','maracas','sleigh-bells','cabasa']){
  const inst=getInstrument(id),track=newTrack(id),ns=notesFor(inst);track.pan=id==='bass-bars'?-.2:.2;
  for(const n of id==='bass-bars'?[ns[0],ns.at(-1)]:ns){
   const sample=await engine.load(inst,n.note),data=sample.getChannelData(0);assert.ok(sample.duration>.08,id);assert.ok(data.some(v=>Math.abs(v)>.01),id+' sample is audible');
   track.events.push({id:id+'-'+n.note,beat,note:n.note,duration:.5,velocity:.8,shift:0});beat+=2;
  }
  p.tracks.push(track);
 }
 const output=await engine.render(p);let peak=0,power=0;for(const channel of [0,1])for(const v of output.getChannelData(channel)){assert.ok(Number.isFinite(v));peak=Math.max(peak,Math.abs(v));power+=v*v;}
 assert.ok(peak>.05&&peak<1);assert.ok(power>10);assert.ok(output.duration>=16);
});

test('full-song audio keeps silent entrances and renders every repeated appearance at its arranged time',async()=>{
 const {ensureSong,appendSection,compileSong}=await import('../dist/song.js');
 const p=newProject();p.bpm=120;p.bars=1;p.reverb=0;p.delay=0;
 const t=newTrack('claves');t.events=[{id:'hit',beat:0,note:75,duration:.5,velocity:.8,shift:0}];p.tracks=[t];ensureSong(p);
 p.arrangement[0].mutedTracks=[t.id];appendSection(p,p.activeSection).repeats=2;
 const output=await new OfflineTestEngine().render(compileSong(p)),data=output.getChannelData(0);
 assert.ok(output.duration>=6);assert.ok(data.slice(0,1.95*44100).every(n=>n===0));
 for(const seconds of [2,4]){const hit=data.slice((seconds+.02)*44100,(seconds+.3)*44100);assert.ok(hit.some(n=>Math.abs(n)>.01),'audible entrance at '+seconds+' seconds');}
 assert.ok(data.every(Number.isFinite));
});
