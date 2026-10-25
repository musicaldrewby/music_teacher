import test from 'node:test';
import assert from 'node:assert/strict';
import {SoundDesk} from '../dist/audio.js';
import {newProject,normalizeProject,countdownSource} from '../dist/core.js';
import {prepareStandalone} from '../dist/export.js';

const tick=()=>new Promise(resolve=>setImmediate(resolve));
function audioHarness(t){
 const original=globalThis.Audio,instances=[];
 class FakeAudio{
  constructor(){this.readyState=0;this.duration=10;this.currentTime=0;this.played=[];this.paused=true;instances.push(this);}
  load(){}
  metadata(){this.readyState=1;this.onloadedmetadata?.();}
  play(){this.played.push(this.currentTime);this.paused=false;return Promise.resolve();}
  pause(){this.paused=true;}
  remove(){this.removed=true;}
 }
 globalThis.Audio=FakeAudio;t.after(()=>{globalThis.Audio=original;});
 const sound=new SoundDesk();sound.unlock=async()=>null;t.after(()=>sound.stopAll());
 return {sound,instances};
}
function engine(state='choose',remaining=10000){return {state,remaining,epoch:1,settings:{seconds:10},starts:0,start(){this.starts++;this.state='counting';this.epoch++;}};}
test('A resumed countdown seeks before audio plays and keeps the timer stopped while loading',async t=>{
 const {sound,instances}=audioHarness(t),round=engine('paused',6500);
 const pending=sound.startCountdown(round,'data:audio/mpeg;base64,TRACK');await tick();
 assert.equal(round.starts,0);assert.deepEqual(instances[0].played,[]);
 instances[0].metadata();await pending;
 assert.deepEqual(instances[0].played,[3.5]);assert.equal(round.starts,1);
});
test('Changing rounds during audio loading cancels both old playback and the old timer start',async t=>{
 const {sound,instances}=audioHarness(t),round=engine();
 const pending=sound.startCountdown(round,'data:audio/mpeg;base64,TRACK');await tick();
 const late=instances[0].onloadedmetadata;sound.stopAll();round.epoch++;late();await pending;
 assert.equal(round.starts,0);assert.deepEqual(instances[0].played,[]);assert.equal(sound.players.size,0);
});
test('Repeated Start clicks leave only the latest countdown request active',async t=>{
 const {sound,instances}=audioHarness(t),round=engine();
 const first=sound.startCountdown(round,'data:audio/mpeg;base64,TRACK');await tick();
 const second=sound.startCountdown(round,'data:audio/mpeg;base64,TRACK');await tick();
 instances[1].metadata();await Promise.all([first,second]);
 assert.equal(round.starts,1);assert.equal(instances[0].paused,true);assert.equal(sound.players.size,1);
});
test('Audio unlock canceled by an early reveal cannot start a stale timer',async t=>{
 const {sound,instances}=audioHarness(t),round=engine();let unlock;
 sound.unlock=()=>new Promise(resolve=>unlock=resolve);
 const pending=sound.startCountdown(round,'data:audio/mpeg;base64,TRACK');sound.stopAll();round.state='revealing';round.epoch++;unlock();await pending;
 assert.equal(round.starts,0);assert.equal(instances.length,0);
});
test('An audio load error still permits the full countdown and reports the failure',async t=>{
 const {sound,instances}=audioHarness(t),round=engine(),errors=[];sound.onError=m=>errors.push(m);
 const pending=sound.startCountdown(round,'data:audio/mpeg;base64,TRACK');await tick();instances[0].onerror();await pending;
 assert.equal(round.starts,1);assert.equal(round.remaining,10000);assert.equal(errors.length,1);assert.equal(sound.players.size,0);
});
test('A muted countdown starts normally without loading an audio player',async t=>{
 const {sound,instances}=audioHarness(t),round=engine();sound.configure({effectsVolume:0,musicVolume:0});
 await sound.startCountdown(round,'data:audio/mpeg;base64,TRACK');assert.equal(round.starts,1);assert.equal(instances.length,0);
});
test('Rotation survives editable round trips and standalone embedding, including remote clips',async()=>{
 const p=newProject();p.slides[0].corners.forEach((c,i)=>Object.assign(c,{text:'Choice '+i,isCorrect:i===0}));
 p.audio.countdown='data:audio/mpeg;base64,FALLBACK';
 p.audio.countdownVariations=['data:audio/mpeg;base64,A','https://example.com/b.mp3','data:audio/mpeg;base64,C','javascript:bad'];
 const q=normalizeProject(p);assert.equal(q.audio.countdownVariations.length,3);
 assert.deepEqual([0,1,2,3,4,5].map(i=>countdownSource(q,i)),[...q.audio.countdownVariations,...q.audio.countdownVariations]);
 const game=await prepareStandalone(q,async()=> 'data:audio/mpeg;base64,B');
 assert.equal(game.audio.countdownVariations[1],'data:audio/mpeg;base64,B');
 assert.deepEqual(normalizeProject(game).audio,game.audio);
 delete q.audio.countdownVariations;assert.equal(countdownSource(q,5),p.audio.countdown);
});
