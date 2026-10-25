import test from 'node:test';
import assert from 'node:assert/strict';
import {voiceToneProfile} from '../dist/dynamics.js';
import {CATALOG,getInstrument,notesFor,newProject,newTrack,validateProject} from '../dist/catalog.js';
import {ensureSong,createSection,appendSection,compileSong} from '../dist/song.js';

test('legacy notes, tone-off notes and full-strength strikes keep their original voicing',()=>{
 for(const inst of CATALOG)for(const n of notesFor(inst)){
  const event={note:n.note,shift:n.shift||0,velocity:.2},old=voiceToneProfile(inst,event);
  assert.deepEqual(voiceToneProfile(inst,{...event,dynamicTone:0}),old);
  assert.deepEqual(voiceToneProfile(inst,{...event,velocity:1,dynamicTone:1}),old);
  if(inst.zone==='metallophones'){
   const f=440*2**((event.note+event.shift-69)/12);
   assert.deepEqual(old,{shelfHz:Math.max(1600,f*2.2),shelfDb:-7,cutoffHz:Math.min(9000,Math.max(3000,f*5)),q:.5});
  }else assert.equal(old,null);
 }
});
test('all instrument notes get finite, bounded, progressively darker soft dynamics',()=>{
 for(const sampleRate of [22050,44100,48000])for(const inst of CATALOG)for(const n of notesFor(inst)){
  let previous=null;
  for(const velocity of [.01,.25,.5,.75,.99]){
   const p=voiceToneProfile(inst,{note:n.note,shift:n.shift||0,velocity,dynamicTone:1},sampleRate);
   assert.ok(Object.values(p).every(Number.isFinite),inst.id);
   assert.ok(p.shelfDb<0&&p.q<=.5&&p.q>=-6.1);
   assert.ok(p.cutoffHz>0&&p.cutoffHz<=sampleRate/2);
   assert.ok(p.shelfHz>0&&p.shelfHz<=sampleRate*.45);
   if(previous){assert.ok(p.shelfDb>=previous.shelfDb);assert.ok(p.cutoffHz>=previous.cutoffHz-1e-10);}
   previous=p;
  }
 }
 const i=getInstrument('soprano-xylophone'),base={note:72,velocity:.2,dynamicTone:1};
 assert.ok(voiceToneProfile(i,{...base,note:84}).cutoffHz>voiceToneProfile(i,base).cutoffHz);
 assert.deepEqual(voiceToneProfile(i,{...base,shift:12}),voiceToneProfile(i,{...base,note:84}));
 assert.ok(voiceToneProfile(getInstrument('shakers'),base).shelfDb>voiceToneProfile(getInstrument('hand-drums'),base).shelfDb);
});
test('recorded tone survives project round-trip, variations and full-song repeats',()=>{
 const p=newProject(),t=newTrack('alto-xylophone');
 t.events=[{id:'midi-note',beat:0,note:60,duration:.5,velocity:.41,shift:0,dynamicTone:.83}];p.tracks=[t];ensureSong(p);
 const variant=createSection(p,{source:p.activeSection});appendSection(p,variant.id).repeats=2;
 const saved=validateProject(JSON.parse(JSON.stringify(p))),expanded=compileSong(saved);
 assert.equal(expanded.tracks[0].events.length,3);
 for(const e of expanded.tracks[0].events){assert.equal(e.dynamicTone,.83);assert.equal(e.velocity,.41);}
 for(const invalid of [-1,1.01,NaN,Infinity,null,'warm']){
  const active=structuredClone(p);active.tracks[0].events[0].dynamicTone=invalid;assert.throws(()=>validateProject(active),/invalid note/);
  const inactive=structuredClone(p);inactive.sections[1].events[t.id][0].dynamicTone=invalid;assert.throws(()=>validateProject(inactive),/invalid note/);
 }
 delete p.tracks[0].events[0].dynamicTone;assert.doesNotThrow(()=>validateProject(p));
});
