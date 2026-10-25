import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {OfflineAudioContext} from 'node-web-audio-api';
import {AudioEngine} from '../dist/engine.js';
import {newProject,newTrack,getInstrument,notesFor,validateProject} from '../dist/catalog.js';
import {musicXML} from '../dist/musicxml.js';

globalThis.OfflineAudioContext=OfflineAudioContext;
globalThis.fetch=async path=>{try{return new Response(await fs.readFile(new URL('../dist/'+path,import.meta.url)))}catch{return new Response('',{status:404})}};
class TestEngine extends AudioEngine {
 async init(){if(!this.ctx){this.ctx=new OfflineAudioContext(2,44100,44100);this.mix=this.createMix(this.ctx);}this.manifest=await this.manifestPromise;return this;}
}
test('acoustic woodblocks preserve old parts, play native recordings and export both voices',async()=>{
 const inst=getInstrument('woodblock'),pads=notesFor(inst);
 assert.deepEqual(pads.map(n=>[n.label,n.note,n.shift]),[['Low',77,0],['High',76,0]]);
 const p=newProject();p.bars=1;p.bpm=120;p.reverb=0;p.delay=0;
 const t=newTrack(inst.id);t.events=pads.map((n,i)=>({id:'wood-'+i,note:n.note,shift:0,velocity:.8,duration:.5,beat:i*2}));p.tracks=[t];
 assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))),p);
 const xml=musicXML(p);
 assert.match(xml,/Low = bottom line/);assert.match(xml,/High = second line/);
 const engine=new TestEngine();await engine.prepareInstrument(inst);
 const voices=pads.map(n=>engine.play(inst,n,{id:'audition',volume:.8,pan:0}));
 assert.equal(new Set(voices.map(v=>v.src.buffer)).size,2);
 assert.ok(voices.every(v=>v.src.playbackRate.value===1));engine.stop();
 for(const n of pads){
  assert.ok(engine.descriptor(inst,n.note).url.startsWith('assets/audio/recorded/woodblock/'));
  assert.ok(engine.descriptor(getInstrument('temple-blocks'),n.note).url.startsWith('assets/audio/recorded/temple-blocks/'));
 }
 const out=await engine.render(p);
 for(let channel=0;channel<2;channel++){
  const data=out.getChannelData(channel);
  assert.ok(data.every(v=>Number.isFinite(v)&&Math.abs(v)<1));
  for(const second of [0,1])assert.ok(data.slice(Math.round((second+.02)*44100),Math.round((second+.15)*44100)).some(v=>Math.abs(v)>.02),'each recorded block is audible in the export');
 }
});
