import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createProject,clone} from '../src/model.js';
import {FluidEngine} from '../src/engine.js';
import {createExportPlan,wavHeader,encodePCM,sceneMeasures,suggestedTail} from '../src/export-plan.js';
import {renderWave} from '../src/export-render.js';
const catalog=JSON.parse(await readFile(new URL('../dist/assets/font.json',import.meta.url),'utf8'));
const project=createProject(catalog.presets);project.tempo=300;project.metronome='always';project.countIn=2;
project.scenes[0].tracks[0]={bars:1,notes:[{note:60,velocity:100,start:0,duration:.3}],controls:[]};
project.scenes[0].tracks[1]={bars:2,notes:[{note:67,velocity:90,start:1,duration:.3}],controls:[]};
project.scenes[1].tracks[0]={bars:1,notes:[{note:75,velocity:100,start:0,duration:.3}],controls:[]};
test('export plans preserve long lengths, non-4/4 meters, scene ordering, repeats and tail estimates',()=>{
 assert.equal(sceneMeasures(project.scenes[0]),2,'empty tracks must not extend the export');
 const plan=createExportPlan(project,{scope:'all',sampleRate:44100,bitDepth:16,repeats:2,tailSeconds:1.5});
 assert.deepEqual(plan.segments.map(s=>s.scene),[0,1]);assert.deepEqual(plan.segments.map(s=>s.measures),[4,2]);assert.equal(plan.frames,Math.round((4.8+1.5)*44100));
 const long=clone(project);long.meter=[6,8];long.tempo=120;long.scenes[0].tracks[0].bars=512;
 const longPlan=createExportPlan(long,{tailSeconds:0});assert.equal(longPlan.musicFrames,512*3*.5*48000);
 assert.ok(suggestedTail(project)>project.fx.reverb.decay);assert.ok(suggestedTail(project)<=180);
 assert.throws(()=>createExportPlan(project,{measures:1.5}),/whole number/);assert.throws(()=>createExportPlan(project,{measures:65536,repeats:256}),/512 MiB/);
 assert.throws(()=>createExportPlan(createProject(catalog.presets)),/Record a part/);
 const silent=clone(project);silent.tracks[7].solo=true;assert.equal(createExportPlan(silent).audible,false);
});
test('PCM headers, stereo interleaving, signed 24-bit conversion and final fade are correct',()=>{
 for(const bits of[16,24]){
  const plan={bits,rate:48000,frames:6,bytes:44+6*2*bits/8,fadeFrames:3},header=Buffer.from(wavHeader(plan));
  assert.equal(header.toString('ascii',0,4),'RIFF');assert.equal(header.toString('ascii',8,12),'WAVE');assert.equal(header.readUInt32LE(4),plan.bytes-8);assert.equal(header.readUInt16LE(22),2);assert.equal(header.readUInt32LE(24),48000);assert.equal(header.readUInt16LE(34),bits);
  const pcm=Buffer.from(encodePCM(new Float32Array([1,-1,.5,1,1,1]),new Float32Array([0,0,-.5,0,0,0]),bits,0,plan,()=>.5)),width=bits/8,scale=2**(bits-1);
  assert.equal(pcm.readIntLE(0,width),scale-1);assert.equal(pcm.readIntLE(width,width),0);assert.equal(pcm.readIntLE(2*width,width),-scale);assert.equal(pcm.readIntLE(4*width,width),scale/2);assert.equal(pcm.readIntLE(5*width,width),-scale/2);assert.equal(pcm.readIntLE(8*width,width),scale/2);assert.equal(pcm.readIntLE(10*width,width),0);
 }
});
test('WAV uses the real SoundFont and shared engine: sample-exact scenes, loops, effects, mute/solo and clean ending',async()=>{
 const data=Buffer.concat(await Promise.all(catalog.chunks.map(c=>readFile(new URL('../dist/'+c.url,import.meta.url))))),font=data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength);
 const trace=[],apply=FluidEngine.prototype.apply;FluidEngine.prototype.apply=function(event,channel){trace.push({...event,channel,time:this.synth.currentTime});return apply.call(this,event,channel)};
 const render=async(p,options)=>{const chunks=[],progress=[];const plan=await renderWave(p,font,options,b=>chunks.push(Buffer.from(b)),v=>progress.push(v));const file=Buffer.concat(chunks);assert.equal(file.length,plan.bytes);assert.equal(file.readUInt32LE(40),file.length-44);assert.equal(progress.at(-1),1);return{file,plan}};
 const energy=(file,bits,from=0,to=(file.length-44)/(2*bits/8),channel=null)=>{let sum=0;for(let n=Math.floor(from);n<Math.floor(to);n++)for(let ch=0;ch<2;ch++)if(channel===null||ch===channel){const v=file.readIntLE(44+(n*2+ch)*bits/8,bits/8)/2**(bits-1);sum+=v*v}return sum};
 try{
  const dry=clone(project);dry.fx.delay.enabled=false;dry.fx.reverb.enabled=false;dry.tracks[0].pan=-1;dry.tracks[0].solo=true;
  const a=await render(dry,{scope:'all',sampleRate:44100,bitDepth:24,repeats:1,tailSeconds:1});
  assert.equal(a.plan.musicFrames,105840);assert.ok(energy(a.file,24)>1);assert.equal(energy(a.file,24,0,undefined,1),0,'hard-left mix must remain hard-left');
  const first=trace.filter(e=>e.kind==='on'&&e.note===60);assert.equal(first.length,2);assert.ok(Math.abs(first[0].time)<1/44100);assert.ok(Math.abs(first[1].time-.8)<1/44100);
  const scene=trace.find(e=>e.kind==='on'&&e.note===75);assert.ok(Math.abs(scene.time-1.6)<1/44100,'scene transition must land at exact measure boundary');
  assert.equal(a.file.readIntLE(a.file.length-6,3),0);assert.equal(a.file.readIntLE(a.file.length-3,3),0);
  const silent=clone(dry);silent.tracks[0].mute=true;const b=await render(silent,{measures:1,bitDepth:16,tailSeconds:0});assert.equal(energy(b.file,16),0,'muted mix must have no notes or metronome');
  const wet=clone(project);wet.tracks[0].reverb=1;wet.tracks[0].delay=1;wet.tracks[0].solo=true;wet.fx.reverb.decay=10;wet.fx.reverb.level=1;
  const c=await render(wet,{scope:'scene',measures:1,bitDepth:16,tailSeconds:3});assert.ok(energy(c.file,16,48000,2*48000)>.001,'ambient tail must survive beyond the music end');
  assert.ok(energy(c.file,16,c.plan.frames-1000)<energy(c.file,16,c.plan.frames-72000,c.plan.frames-71000),'tail must fade toward silence');
  assert.equal(c.file.readInt16LE(c.file.length-4),0);assert.equal(c.file.readInt16LE(c.file.length-2),0);
  const notesBefore=JSON.stringify(wet);await render(wet,{measures:1,tailSeconds:0,bitDepth:16});assert.equal(JSON.stringify(wet),notesBefore,'export must leave the project untouched');
 }finally{FluidEngine.prototype.apply=apply}
});
