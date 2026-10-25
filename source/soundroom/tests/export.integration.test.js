import {arrangeProject} from '../src/arrangement.js';
// Run the shipped export worker with the real SoundFont sample engine.
import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';
import {createProject} from '../src/sequencer-model.js';
const fonts=JSON.parse(await readFile(new URL('../src/soundfonts.json',import.meta.url),'utf8'));
const bytes=Buffer.concat(await Promise.all(fonts[0].chunks.map(path=>readFile(new URL('../dist/'+path.slice(2),import.meta.url)))));
const bank=()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
async function worker(data){const messages=[],context={console,performance,TextDecoder,TextEncoder,WebAssembly,atob,btoa,setTimeout,clearTimeout,fetch,URL,postMessage:m=>messages.push(m)};context.self=context;vm.createContext(context);vm.runInContext(await readFile(new URL('../dist/assets/export-worker.js',import.meta.url),'utf8'),context);await context.onmessage({data:{bank:bank(),master:60,tail:.2,...data}});const result=messages.at(-1);assert.equal(result.type,'done',result.message);assert.ok(messages.some(m=>m.type==='progress'&&m.percent===100));return result}
function energy(buffer,from=0,to=Infinity){const v=new DataView(buffer),frames=(buffer.byteLength-44)/4,end=Math.min(frames,Math.floor(to*44100));let left=0,right=0;for(let i=Math.floor(from*44100);i<end;i++){const l=v.getInt16(44+i*4,true),r=v.getInt16(46+i*4,true);left+=l*l;right+=r*r}return {left,right,total:left+right}}
test('WAV worker renders sample-accurate note onset, actual patches, pan, effects, master and mute without a click',async()=>{
 const p=createProject(fonts[0].presets);p.bars=1;p.tempo=300;p.metronome='on';p.tracks[0].pan=0;p.tracks[0].notes=[{start:1.137,duration:.5,pitch:60,velocity:110}];
 const dry=await worker({project:p}),view=new DataView(dry.buffer);assert.equal(view.getUint32(24,true),44100);assert.equal(view.getUint16(34,true),16);assert.equal(dry.buffer.byteLength,44+44100*4);assert.equal(energy(dry.buffer,0,.226).total,0,'no sound before the scheduled note and no metronome');assert.ok(energy(dry.buffer,.229,.35).left>1000);assert.ok(energy(dry.buffer).left>energy(dry.buffer).right*20);
 const muted=structuredClone(p);muted.tracks[0].mute=true;assert.equal(energy((await worker({project:muted})).buffer).total,0);
 assert.equal(energy((await worker({project:p,master:0})).buffer).total,0);
 const effects={reverbEnabled:true,delayEnabled:true,reverbMix:60,reverbType:4,reverbDecay:90,reverbDamping:2,reverbPredelay:12,delayMix:60,delayTime:100,delayFeedback:35,delayDamping:2,delayStereo:true};
 const wet=await worker({project:p,effects,tail:2});assert.ok(energy(wet.buffer,.8,2.8).total>energy(dry.buffer,.8,1).total,'the exported WAV contains the real effect tails');
});
test('eight stems share length and start time and package as valid WAV entries',async()=>{
 const p=createProject(fonts[0].presets);p.bars=1;p.tempo=300;p.tracks[0].notes=[{start:0,duration:.5,pitch:60,velocity:96}];p.tracks[1].notes=[{start:1,duration:.5,pitch:48,velocity:96}];
 const result=await worker({project:p,stems:true,tail:0}),v=new DataView(result.buffer),files=[];let at=0;
 while(v.getUint32(at,true)===0x04034b50){const length=v.getUint32(at+18,true),name=v.getUint16(at+26,true),extra=v.getUint16(at+28,true),start=at+30+name+extra;files.push(result.buffer.slice(start,start+length));at=start+length}
 assert.equal(files.length,8);assert.ok(files.every(f=>f.byteLength===files[0].byteLength));assert.ok(energy(files[0],0,.1).total>0);assert.equal(energy(files[1],0,.19).total,0);assert.ok(energy(files[1],.21,.4).total>0);assert.ok(files.slice(2).every(f=>energy(f).total===0));
});

test('song WAV export uses each pattern tempo for its note frames and total duration',async()=>{
 const p=createProject(fonts[0].presets);p.scenes[0].bars=p.scenes[1].bars=1;p.scenes[0].tempo=120;p.scenes[1].tempo=60;p.scenes[1].tracks[0].notes=[{start:1,duration:.25,pitch:60,velocity:100}];p.song=[{scene:0,repeats:1},{scene:1,repeats:1}];
 const result=await worker({project:arrangeProject(p),tail:0});assert.equal(result.buffer.byteLength,44+6*44100*4);assert.equal(energy(result.buffer,0,3).total,0);assert.ok(energy(result.buffer,3.01,3.2).total>1000);
});
