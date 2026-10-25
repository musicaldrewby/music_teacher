import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeWav,wavTracks,exportLoopWav} from '../dist/wav-export.js';
import {newProject,newTrack} from '../dist/catalog.js';

test('WAV has a valid PCM header and interleaved, clipped stereo samples',async()=>{
 const channels=[new Float32Array([-1,-.5,0,.5,1,2,NaN]),new Float32Array([1,.5,0,-.5,-1,-2,0])];
 const blob=encodeWav({numberOfChannels:2,length:7,sampleRate:44100,getChannelData:i=>channels[i]});
 const data=await blob.arrayBuffer(),view=new DataView(data),tag=at=>new TextDecoder().decode(data.slice(at,at+4));
 assert.equal(blob.type,'audio/wav');assert.equal(data.byteLength,72);
 assert.equal(tag(0),'RIFF');assert.equal(tag(8),'WAVE');assert.equal(tag(12),'fmt ');assert.equal(tag(36),'data');
 assert.equal(view.getUint32(4,true),64);assert.equal(view.getUint32(40,true),28);
 assert.equal(view.getUint16(20,true),1);assert.equal(view.getUint16(22,true),2);
 assert.equal(view.getUint32(24,true),44100);assert.equal(view.getUint32(28,true),176400);
 assert.equal(view.getUint16(32,true),4);assert.equal(view.getUint16(34,true),16);
 assert.deepEqual(Array.from({length:14},(_,i)=>view.getInt16(44+i*2,true)),[-32768,32767,-16384,16384,0,0,16384,-16384,32767,-32768,32767,-32768,0,0]);
});

test('export follows mute, solo, track level and master level without changing the session',()=>{
 const p=newProject();p.tracks=['bass-xylophone','alto-xylophone','soprano-recorder','hand-drums','triangle'].map(newTrack);
 for(const t of p.tracks)t.events=[{id:'note',note:45,beat:0,duration:1,velocity:.8}];
 p.tracks[1].muted=true;p.tracks[2].volume=0;p.tracks[3].solo=true;
 assert.deepEqual(wavTracks(p).map(t=>t.id),[p.tracks[3].id]);
 p.tracks[3].solo=false;const before=JSON.stringify(p);
 assert.deepEqual(wavTracks(p).map(t=>t.id),[p.tracks[0].id,p.tracks[3].id,p.tracks[4].id]);
 assert.equal(JSON.stringify(p),before);p.master=0;assert.deepEqual(wavTracks(p),[]);
});

test('silent and oversized exports fail before opening an audio context',async()=>{
 const p=newProject();await assert.rejects(exportLoopWav({},p),/Add notes to an audible part/);
 p.tracks=Array.from({length:6},()=>newTrack('triangle'));
 await assert.rejects(exportLoopWav({},p),/more than five tracks/);
 p.tracks=[];p.bars=5;await assert.rejects(exportLoopWav({},p),/more than four measures/);
});
