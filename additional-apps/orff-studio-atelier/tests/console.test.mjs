import test from 'node:test';
import assert from 'node:assert/strict';
import {OfflineAudioContext} from 'node-web-audio-api';
import {partActivity} from '../dist/console-view.js';
import {newProject,newTrack,validateProject} from '../dist/catalog.js';
import {AudioEngine} from '../dist/engine.js';
test('ensemble note windows and lights are owned by an individual track',()=>{
 const a=newTrack('soprano-xylophone'),b=newTrack('soprano-xylophone');a.events=[{note:72,beat:0,duration:1}];b.events=[{note:72,beat:2,duration:1}];
 assert.equal(partActivity(a,.5,true).active.length,1);assert.equal(partActivity(b,.5,true).active.length,0);assert.equal(partActivity(b,.5,true).upcoming.length,1);assert.equal(partActivity(a,.5,false).active.length,0);
});
test('legacy mix defaults remain valid and new settings reject invalid imports',()=>{
 const p=newProject();p.tracks=[newTrack('alto-xylophone')];assert.doesNotThrow(()=>validateProject(p));p.reverbDecay=7;p.tracks[0].reverbSend=.4;assert.equal(validateProject(p).reverbDecay,7);p.reverbDecay=Infinity;assert.throws(()=>validateProject(p));p.reverbDecay=2.4;p.tracks[0].reverbSend=-1;assert.throws(()=>validateProject(p));
});
test('reverb sends and channel pan are distinct in the actual audio graph',()=>{
 const engine=Object.create(AudioEngine.prototype),ctx=new OfflineAudioContext(2,44100,44100),mix=engine.createMix(ctx),p=newProject();p.reverbDecay=4.5;p.tracks=[newTrack('alto-xylophone'),newTrack('alto-xylophone')];p.tracks[0].reverbSend=0;p.tracks[0].pan=-.6;p.tracks[1].reverbSend=.8;engine.applyMix(p,mix);
 assert.equal(mix.verb.buffer.duration,4.5);assert.equal(mix.tracks.get(p.tracks[0].id).send.gain.value,0);assert.ok(Math.abs(mix.tracks.get(p.tracks[1].id).send.gain.value-.8)<.0001);assert.ok(mix.tracks.get(p.tracks[0].id).pan.pan.value<-.59);
 p.tracks[1].solo=true;engine.applyMix(p,mix);assert.equal(mix.tracks.get(p.tracks[0].id).g.gain.value,0);
});
