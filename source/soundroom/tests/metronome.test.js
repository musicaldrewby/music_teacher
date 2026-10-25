import test from 'node:test';
import assert from 'node:assert/strict';
import {MetronomeRenderer,METRONOME_SOUNDS} from '../src/metronome.js';
import {createProject,validateProject,compileScore} from '../src/sequencer-model.js';
import {readFile} from 'node:fs/promises';
const presets=JSON.parse(await readFile(new URL('../src/soundfonts.json',import.meta.url),'utf8'))[0].presets;

for(const rate of [44100,48000])test('Four audible, distinct clicks respect onset, level, accents and cancellation at '+rate+' Hz',()=>{
 const renderer=new MetronomeRenderer(rate),render=(tone,volume,accent,beatAccent=true)=>{
  renderer.clear();renderer.configure({clickTone:tone,clickVolume:volume,clickAccent:accent});renderer.schedule(.02,beatAccent);
  const out=[new Float32Array(Math.ceil(rate*.2)),new Float32Array(Math.ceil(rate*.2))];renderer.mix(out,0);assert.deepEqual(out[0],out[1]);return out[0];
 };
 const signatures=[];
 for(const [tone] of METRONOME_SOUNDS){
  const samples=render(tone,.65,true),onset=samples.findIndex(x=>Math.abs(x)>1e-7),peak=Math.max(...samples.map(Math.abs));
  assert.ok(Math.abs(onset/rate-.02)<=2/rate);assert.ok(peak>.30&&peak<.32,'clearer default peak without clipping');assert.ok(samples.every(Number.isFinite));assert.ok(samples.slice(Math.ceil(.12*rate)).every(x=>x===0));assert.equal(renderer.voices.length,0);
  signatures.push(samples.slice(0,Math.ceil(rate*.12)).reduce((sum,x,i)=>sum+x*(i%97),0));
  const half=render(tone,.325,true);samples.forEach((value,i)=>assert.ok(Math.abs(half[i]*2-value)<1e-7));
  assert.ok(render(tone,0,true).every(x=>x===0));
  assert.deepEqual(render(tone,1,false,true),render(tone,1,false,false),'accent off gives every beat the same sound');
  const regular=render(tone,1,true,false);assert.ok(Math.max(...render(tone,1,true).map(Math.abs))>Math.max(...regular.map(Math.abs))*1.3);
 }
 assert.equal(new Set(signatures.map(x=>x.toFixed(4))).size,4);
 renderer.schedule(1,true,true);renderer.clear(true);const silence=[new Float32Array(rate*2)];renderer.mix(silence,0);assert.ok(silence[0].every(x=>x===0));
});

test('Metronome choices persist and older songs gain defaults without changing saved volume or click timing',()=>{
 const project=createProject(presets);project.clickTone='rim';project.clickAccent=false;project.clickVolume=73;
 const restored=validateProject(JSON.parse(JSON.stringify(project)),presets);assert.equal(restored.clickTone,'rim');assert.equal(restored.clickAccent,false);assert.equal(restored.clickVolume,73);
 const score=compileScore(restored,true);assert.equal(score.clickTone,'rim');assert.equal(score.clickAccent,false);assert.equal(score.clickVolume,.73);assert.equal(score.events.filter(e=>e.click&&e.beat<0).length,4);
 const old=JSON.parse(JSON.stringify(project));delete old.clickTone;delete old.clickAccent;old.clickVolume=35;
 const migrated=validateProject(old,presets);assert.equal(migrated.clickTone,'click');assert.equal(migrated.clickAccent,true);assert.equal(migrated.clickVolume,35);
});
