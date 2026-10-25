import test from 'node:test';import assert from 'node:assert/strict';
import {RECORDING_DEFAULTS,RECORDING_STORAGE,recordingPreferences,loadRecordingPreferences,storeRecordingPreferences} from '../dist/recording-preferences.js';
test('recording preferences survive a fresh read including false count-in and zero click volume',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};
 const wanted={grid:.25,duration:1.5,countIn:false,metroVolume:0};storeRecordingPreferences(storage,wanted);assert.deepEqual(loadRecordingPreferences(storage),wanted);assert.ok(map.has(RECORDING_STORAGE));
});
test('malformed, missing or blocked settings fall back to usable defaults',()=>{
 for(const value of [undefined,'{broken','null','42'])assert.deepEqual(loadRecordingPreferences({getItem:()=>value}),RECORDING_DEFAULTS);
 assert.deepEqual(loadRecordingPreferences({getItem(){throw Error('Blocked')}}),RECORDING_DEFAULTS);
 assert.deepEqual(recordingPreferences({grid:0,duration:Infinity,countIn:'false',metroVolume:-1}),RECORDING_DEFAULTS);
});
test('storage rejection is observable without modifying current session choices',()=>{
 const wanted={grid:1,duration:2,countIn:false,metroVolume:.3};assert.throws(()=>storeRecordingPreferences({setItem(){throw Error('Blocked')}},wanted));assert.deepEqual(wanted,{grid:1,duration:2,countIn:false,metroVolume:.3});
});
