import test from 'node:test';
import assert from 'node:assert/strict';
import {inputAudioTime} from '../src/audio-clock.js';

test('record timestamps follow audible audio and retain event timing through delayed delivery',()=>{
 const audio={currentTime:25.35,baseLatency:.02,outputLatency:.1,getOutputTimestamp:()=>({contextTime:25.21,performanceTime:49980})};
 assert.ok(Math.abs(inputAudioTime(audio,50000,50000)-25.23)<1e-10);
 assert.ok(Math.abs(inputAudioTime(audio,49650,50000)-24.88)<1e-10,'350 ms of input callback delay must not be capped at 200 ms');
 assert.ok(Math.abs(inputAudioTime(audio,undefined,50000)-25.23)<1e-10);
});

test('latency fallback works without output timestamps and handles an unstarted clock',()=>{
 const audio={currentTime:10,baseLatency:.02,outputLatency:.08};
 assert.ok(Math.abs(inputAudioTime(audio,19950,20000)-9.85)<1e-10);
 audio.getOutputTimestamp=()=>({contextTime:0,performanceTime:0});assert.ok(Math.abs(inputAudioTime(audio,undefined,20000)-9.9)<1e-10);
 audio.getOutputTimestamp=()=>{throw new Error('Unavailable')};assert.ok(Math.abs(inputAudioTime(audio,undefined,20000)-9.9)<1e-10);
 assert.equal(inputAudioTime({currentTime:0,baseLatency:.1},0,0),0);
 assert.equal(inputAudioTime({currentTime:10},undefined,20000),10);
});
