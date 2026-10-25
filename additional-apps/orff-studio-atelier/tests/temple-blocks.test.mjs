import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {OfflineAudioContext} from 'node-web-audio-api';
import {AudioEngine,wavBytes} from '../dist/engine.js';
import {newProject,newTrack,getInstrument,notesFor,validateProject} from '../dist/catalog.js';
import {musicXML} from '../dist/musicxml.js';

globalThis.OfflineAudioContext=OfflineAudioContext;
globalThis.fetch=async path=>{try{return new Response(await fs.readFile(new URL('../dist/'+path,import.meta.url)))}catch{return new Response('',{status:404})}};
class TestEngine extends AudioEngine {
 async init(){if(!this.ctx){this.ctx=new OfflineAudioContext(2,44100,44100);this.mix=this.createMix(this.ctx);}this.manifest=await this.manifestPromise;return this;}
}
const inst=getInstrument('temple-blocks'),pads=notesFor(inst);
const piece=()=>{
 const p=newProject();p.bars=3;p.bpm=120;p.reverb=0;p.delay=0;
 const t=newTrack(inst.id);t.volume=1;
 t.events=pads.map((n,i)=>({id:'block-'+i,note:n.note,shift:n.shift,velocity:.8,duration:.25,beat:[0,2,4,6,11.5][i]}));
 p.tracks=[t];return p;
};
function dominant(data,sr){
 const windowed=Float64Array.from(data,(v,n)=>v*(.5-.5*Math.cos(2*Math.PI*n/(data.length-1))));
 let best=0,hz=0;
 // Goertzel scan measures the rendered audio, not manifest metadata.
 for(let f=400;f<=3000;f+=4){
  const coefficient=2*Math.cos(2*Math.PI*f/sr);let s1=0,s2=0;
  for(const x of windowed){const s=x+coefficient*s1-s2;s2=s1;s1=s;}
  const power=s1*s1+s2*s2-coefficient*s1*s2;
  if(power>best){best=power;hz=f;}
 }
 return hz;
}

test('five playable blocks preload independently and retain native pitches and saved staff identities',async()=>{
 const engine=new TestEngine();await engine.prepareInstrument(inst);
 assert.equal(engine.buffers.size,5,'all five samples loaded despite shared MIDI notes');
 const voices=pads.map(n=>engine.play(inst,n,{id:'audition',volume:1,pan:0},0));
 assert.ok(voices.every(Boolean));assert.equal(new Set(voices.map(v=>v.src.buffer)).size,5);
 assert.ok(voices.every(v=>v.src.playbackRate.value===1));
 engine.stop();
 const p=piece();assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))),p);
 const positions=[...musicXML(p).matchAll(/<unpitched><display-step>(\w)<\/display-step><display-octave>(\d)<\/display-octave>/g)].map(m=>m[1]+m[2]);
 assert.deepEqual(positions,['E4','G4','B4','D5','F5']);
 const wood=getInstrument('woodblock');
 for(const n of notesFor(wood))assert.notEqual(engine.descriptor(wood,n.note,n.shift).url,engine.descriptor(inst,n.note,n.shift).url,'woodblock and temple blocks retain separate recordings');
});

test('fresh project export renders five ascending, distinct temple blocks with the final natural tail',async()=>{
 const engine=new TestEngine(),p=piece(),out=await engine.render(p),sr=out.sampleRate;
 assert.equal(engine.buffers.size,5,'project preload must include every note+shift voice');
 assert.ok(out.duration>=6.45&&out.duration<6.5,'last high block has its complete tail');
 const left=out.getChannelData(0),right=out.getChannelData(1);
 const channel=Float32Array.from(left,(v,i)=>(v+right[i])*.5),peaks=[];
 for(const e of p.tracks[0].events){
  const first=Math.round((e.beat*.5+.02)*sr),hit=channel.slice(first,first+Math.round(.3*sr));
  assert.ok(hit.some(n=>Math.abs(n)>.01),'each block is audible in exported audio');
  assert.ok(hit.every(Number.isFinite));peaks.push(dominant(hit,sr));
 }
 assert.ok(channel.every(n=>Number.isFinite(n)&&Math.abs(n)<1));
 for(let i=1;i<peaks.length;i++)assert.ok(12*Math.log2(peaks[i]/peaks[i-1])>1,`blocks ${i} and ${i+1} must be over a semitone apart: ${peaks}`);
 const expected=[818,1121,1223,1653,2278];
 peaks.forEach((hz,i)=>assert.ok(Math.abs(hz-expected[i])<16,`block ${i+1} played at its recorded pitch: ${hz}`));
 const bytes=wavBytes(out),view=new DataView(bytes);
 assert.equal(view.getUint32(40,true),out.length*4);
 assert.equal(view.getUint32(24,true),44100);
});
