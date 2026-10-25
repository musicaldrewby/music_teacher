import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayback,scheduledNotes,scheduledClicks,playbackPosition} from '../dist/practice.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const makeProject=(meter='4/4',bpm=120)=>({bars:2,bpm,meter,tracks:[{id:'part',events:Array.from({length:meter==='6/8'?12:8},(_,n)=>({id:'n'+n,beat:n*(meter==='6/8'?.5:1),duration:.1,note:48}))}]});

test('stopping halfway between beats and resuming keeps clicks aligned with the next notes',()=>{
 const p=makeProject(),first=createPlayback(p,{},0,0,false);
 const cursor=playbackPosition(first,first.passes[0].start+1.25).beat;assert.equal(cursor,2.5);
 const resumed=createPlayback(p,{},cursor,10,false),notes=scheduledNotes(resumed,10,12),clicks=scheduledClicks(resumed,10,12);
 assert.deepEqual(clicks.map(c=>c.beat),[3,4,5,6]);close(clicks[0].at,10.37);
 assert.deepEqual(clicks.map(c=>c.at),notes.map(n=>n.at));assert.deepEqual(clicks.map(c=>c.accent),[false,true,false,false]);
 assert.equal(scheduledClicks(resumed,10,resumed.passes[0].start+.001).length,0);
});

test('quarter and eighth pulse grids stay aligned across tempos and arbitrary resume positions',()=>{
 for(const meter of ['2/4','3/4','4/4','6/8'])for(const bpm of [30,72,100,120,240])for(const cursor of [0,.13,.5,.75,1,1.9999999999999,2.5]){
  const p=makeProject(meter,bpm),tr=createPlayback(p,{},cursor,100,false),pass=tr.passes[0],clicks=scheduledClicks(tr,100,pass.end);
  const step=meter==='6/8'?.5:1,group=meter==='6/8'?1.5:Number(meter[0]);
  for(const c of clicks){close(c.beat/step,Math.round(c.beat/step));close(c.at,pass.start+(c.beat-pass.first)*60/bpm);assert.equal(c.accent,Math.abs(c.beat%group)<1e-9);}
  const notes=scheduledNotes(tr,100,pass.end);
  for(const n of notes.filter(n=>n.event.beat>=Math.ceil(cursor/step)*step)){const c=clicks.find(c=>c.beat===n.event.beat);assert.ok(c);close(c.at,n.at);}
 }
});

test('6/8 resumes on eighth-note pulses with dotted-quarter accents',()=>{
 const tr=createPlayback(makeProject('6/8'),{},.75,0,false),clicks=scheduledClicks(tr,0,2.6);
 assert.deepEqual(clicks.map(c=>c.beat),[1,1.5,2,2.5,3,3.5,4,4.5,5,5.5]);
 assert.deepEqual(clicks.filter(c=>c.accent).map(c=>c.beat),[1.5,3,4.5]);close(clicks[0].at,.245);
});

test('count-in follows the same beat phase and still sounds when playback click is off',()=>{
 for(const meter of ['4/4','6/8'])for(const cursor of [0,.25,1,1.75]){
  const tr=createPlayback(makeProject(meter),{enabled:true,first:1,last:1,countIn:true},cursor,0,false),pass=tr.passes[0];
  const all=scheduledClicks(tr,0,pass.end),lead=all.filter(c=>c.counting),step=meter==='6/8'?.5:1;
  assert.equal(lead.length,meter==='6/8'?6:4);assert.deepEqual(scheduledClicks(tr,0,pass.end,false),lead);
  for(let n=1;n<all.length;n++)close(all[n].at-all[n-1].at,step*pass.sec);
 }
});

test('loop boundaries and tempo ramps keep accents on the song grid without duplicate clicks',()=>{
 const p=makeProject(),tr=createPlayback(p,{enabled:true,first:2,last:2,countIn:false,speed:.5,ramp:true,step:20,target:100},5.25,0,true);
 const clicks=scheduledClicks(tr,0,15),notes=scheduledNotes(tr,0,15);
 assert.ok(new Set(clicks.map(c=>c.pass)).size>=4);assert.equal(new Set(clicks.map(c=>c.at)).size,clicks.length);
 for(const n of notes.filter(n=>Number.isInteger(n.event.beat))){const c=clicks.find(c=>c.pass===n.pass&&c.beat===n.event.beat);assert.ok(c);close(c.at,n.at);}
 for(const pass of tr.passes.slice(1)){const start=clicks.find(c=>c.pass===pass.index);if(start){assert.equal(start.beat,4);assert.equal(start.accent,true);close(start.at,pass.start);}}
 const chunked=createPlayback(p,{},2.5,0,true),collected=[];let from=0;
 for(let n=1;n<=100;n++){const to=n*.1;collected.push(...scheduledClicks(chunked,from,to));from=to;}
 assert.deepEqual(collected,scheduledClicks(createPlayback(p,{},2.5,0,true),0,10));
});
