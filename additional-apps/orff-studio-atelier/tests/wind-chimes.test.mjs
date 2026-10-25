import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {OfflineAudioContext} from 'node-web-audio-api';
import {AudioEngine} from '../dist/engine.js';
import {newProject,newTrack,getInstrument,notesFor,validateProject} from '../dist/catalog.js';
import {musicXML} from '../dist/musicxml.js';
import {ensureSong,appendSection,compileSong} from '../dist/song.js';

globalThis.OfflineAudioContext=OfflineAudioContext;
globalThis.fetch=async path=>{try{return new Response(await fs.readFile(new URL('../dist/'+path,import.meta.url)))}catch{return new Response('',{status:404})}};
class TestEngine extends AudioEngine {
 async init(){if(!this.ctx){this.ctx=new OfflineAudioContext(2,44100,44100);this.mix=this.createMix(this.ctx);}this.manifest=await this.manifestPromise;return this;}
}
const inst=getInstrument('wind-chimes'),pads=notesFor(inst);
const piece=()=>{
 const p=newProject();p.bars=1;p.bpm=120;p.reverb=0;p.delay=0;
 const t=newTrack(inst.id);
 t.events=pads.map((n,i)=>({id:'sweep-'+i,note:n.note,shift:0,velocity:.8,duration:.25,beat:[0,.5,1,1.5,3][i]}));
 p.tracks=[t];return p;
};

test('sweep direction and speed survive saved projects, repeated sections and printed parts',()=>{
 assert.deepEqual(pads.map(n=>n.label),['Down · brisk','Down · slow','Up · brisk','Up · medium','Up · slow']);
 assert.equal(pads[0].note,84,'previous sweep events remain valid');
 const p=piece();ensureSong(p);appendSection(p,p.activeSection);
 const restored=validateProject(JSON.parse(JSON.stringify(p))),song=compileSong(restored);
 assert.deepEqual(song.tracks[0].events.map(e=>e.note),[84,85,86,87,88,84,85,86,87,88]);
 const xml=musicXML(restored);
 assert.match(xml,/Down · brisk = bottom line/);assert.match(xml,/Up · slow = top line/);
 const positions=[...xml.matchAll(/<unpitched><display-step>(\w)<\/display-step><display-octave>(\d)<\/display-octave>/g)].map(m=>m[1]+m[2]);
 assert.deepEqual(positions,['E4','G4','B4','D5','F5']);
});

test('five original chime performances preload and export with their full ringing tails',async()=>{
 const engine=new TestEngine();await engine.prepareInstrument(inst);
 assert.equal(engine.buffers.size,5);
 const loaded=pads.map(n=>engine.buffers.get(engine.descriptor(inst,n.note).url));
 assert.equal(new Set(loaded).size,5);
 for(const b of loaded){assert.equal(b.duration,16);assert.equal(b.numberOfChannels,2);assert.ok(b.getChannelData(0).some(n=>Math.abs(n)>.05));}
 const voices=pads.map(n=>engine.play(inst,n,{id:'audition',volume:.8,pan:0}));
 assert.deepEqual(voices.map(v=>v.src.buffer),loaded);
 assert.ok(voices.every(v=>v.src.playbackRate.value===1));engine.stop();
 const out=await engine.render(piece());
 assert.ok(out.duration>=17.56&&out.duration<17.57,'final sweep rings beyond the written measure');
 for(let channel=0;channel<2;channel++){
  const data=out.getChannelData(channel);
  assert.ok(data.every(v=>Number.isFinite(v)&&Math.abs(v)<1));
  assert.ok(data.slice(16*44100,17*44100).some(v=>Math.abs(v)>.0001),'audible late ringing is retained');
 }
 // A saved or exported gesture always resolves to the chosen take.
 assert.deepEqual(pads.map(n=>engine.buffers.get(engine.descriptor(inst,n.note).url)),loaded);
 const bells=getInstrument('sleigh-bells');
 assert.ok(!engine.descriptor(bells,84).url.includes('wind-chimes'),'shared MIDI note does not replace another instrument');
});
