import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {OfflineAudioContext,AudioWorkletNode} from 'node-web-audio-api';
import {SpessaSynthProcessor,SoundBankLoader,SpessaLog} from 'spessasynth_core';
import {PatchCore,FONT_CHANNELS} from '../src/soundfont-core.js';
globalThis.AudioWorkletNode=AudioWorkletNode;
SpessaLog.setLogLevel(false,false,false);
import {SoundFontBank,SoundFontVoice,FONT_INSTRUMENTS,preloadSoundfont} from '../dist/soundfont.js';
import {BoomwhackerVoice,BOOM_SAMPLES} from '../dist/boomwhacker-voice.js';
import {MusicAudio} from '../dist/audio.js';
import {WallSynth,SYNTH_PRESETS} from '../dist/synth.js';
import {BassVoice,bassPreset,bassEvent} from '../dist/bass.js';
import {renderSongWav} from '../dist/audio-export.js';
import {validateSong} from '../dist/recorder.js';
const array=b=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
const parts=await Promise.all([1,2,3,4].map(n=>fs.readFile(new URL(`../dist/samples/soundfont/generaluser-1.471.part0${n}.bin`,import.meta.url))));
const bytes=Buffer.concat(parts);assert.equal(createHash('sha256').update(bytes).digest('hex'),'f45b6b4a68b6bf3d792fcbb6d7de24dc701a0f89c5900a21ef3aaece993b839a');
const bank=new SoundFontBank(array(bytes));
const context=(seconds=5)=>new OfflineAudioContext(2,Math.ceil(seconds*44100),44100);
const stats=(buffer,from=0,to=buffer.duration)=>{let peak=0,power=0,n=0;for(let ch=0;ch<buffer.numberOfChannels;ch++){const data=new Float32Array(buffer.length);buffer.copyFromChannel(data,ch);for(let i=Math.floor(from*buffer.sampleRate);i<Math.min(data.length,Math.floor(to*buffer.sampleRate));i++){assert.ok(Number.isFinite(data[i]));peak=Math.max(peak,Math.abs(data[i]));power+=data[i]**2;n++;}}return{peak,rms:Math.sqrt(power/Math.max(1,n))};};
const makeAudio=async ctx=>{await bank.prepare(ctx);const audio=new MusicAudio();audio.offline=true;audio.init(ctx);audio.soundfont=bank;audio.fontVoice=new SoundFontVoice(ctx,audio.master,audio.reverb,bank);return audio;};
// Compare the adapter's PCM directly with the full engine, not a hand-written
// approximation. This covers authored modulators/filters on the reported patches.
for(const type of ['metallophone','glockenspiel','tambourine','maracas']){
 const p=FONT_INSTRUMENTS[type],midi=p.note??60,ref=new SpessaSynthProcessor(44100,{effectsEnabled:false});
 await ref.processorInitialized;ref.soundBankManager.addSoundBank(SoundBankLoader.fromArrayBuffer(array(bytes)),'reference');
 ref.midiChannels[0].setDrums(p.bank===128);ref.controllerChange(0,0,0);ref.programChange(0,p.program);
 ref.controllerChange(0,7,100);ref.controllerChange(0,11,127);ref.controllerChange(0,10,64);ref.noteOn(0,midi,114);
 const core=new PatchCore(44100,array(bytes));await core.ready;
 core.enqueue({type:'on',channel:0,id:1,at:0,order:1,program:p.program,bank:p.bank||0,midi,velocity:114});
 const out=Array.from({length:FONT_CHANNELS},()=>[new Float32Array(128),new Float32Array(128)]),l=new Float32Array(128),r=new Float32Array(128);let error=0,energy=0;
 for(let frame=0;frame<44100;frame+=128){for(const pair of out)pair.forEach(x=>x.fill(0));l.fill(0);r.fill(0);core.process(out,frame/44100);ref.process(l,r);for(let i=0;i<128;i++){error=Math.max(error,Math.abs(out[0][0][i]-l[i]),Math.abs(out[0][1][i]-r[i]));energy+=l[i]*l[i]+r[i]*r[i];}}
 assert.ok(error<1e-6,`${type} differs from full SoundFont renderer (${error})`);assert.ok(energy>.001);core.dispose();ref.destroySynthProcessor();
}
const levels={};
for(const type of Object.keys(FONT_INSTRUMENTS)){
 const ctx=context(14),audio=await makeAudio(ctx);audio.play(type,60,.35,0);audio.play(type,60,1,7);await bank.flush(ctx);
 const result=await ctx.startRendering(),soft=stats(result,0,1),hard=stats(result,7,8);
 assert.ok(hard.peak>.003,`${type} must be audible (${hard.peak})`);assert.ok(hard.rms>soft.rms*1.2,`${type} dynamics`);levels[type]=+hard.peak.toFixed(3);
 if(['metallophone','glockenspiel','piano'].includes(type)){
  const early=stats(result,7.05,7.45).rms,late=stats(result,9,9.4).rms;
  assert.ok(early>late*1.5,`${type}: envelope must decay before note-off, not stay flat`);
 }
 if(['tambourine','maracas'].includes(type))assert.ok(stats(result,10,12).rms<hard.rms*.02,`${type}: natural percussion tail must settle`);
 bank.dispose(ctx);
}
// Releasing an older same-pitch strike must leave the newer strike sounding.
{
 const ctx=context(4);await bank.prepare(ctx);const first=bank.createVoice(ctx,{program:16,midi:60,velocity:.8,when:0,output:ctx.destination});first.release(.2);
 const second=bank.createVoice(ctx,{program:16,midi:60,velocity:.8,when:.1,output:ctx.destination});second.release(2);
 await bank.flush(ctx);const result=await ctx.startRendering();assert.ok(stats(result,.5,1).rms>.005);assert.ok(stats(result,3,4).rms<.0001);bank.dispose(ctx);
}
// Cancellation before a scheduled onset cannot leave a future note hanging.
{
 const ctx=context(2);await bank.prepare(ctx);const v=bank.createVoice(ctx,{program:16,midi:60,when:1,output:ctx.destination});v.stop(0);await bank.flush(ctx);assert.equal(stats(await ctx.startRendering()).peak,0);bank.dispose(ctx);
}
// Every named synth voice is audible, can sustain, and can be released without stuck notes.
for(const [name,patch]of Object.entries(SYNTH_PRESETS)){
 const ctx=context(9),audio=await makeAudio(ctx),synth=new WallSynth(audio);synth.patch={...patch,delayMix:0,reverbMix:0};
 synth.noteOn(60,.85,{when:.01,durationSec:2});await bank.flush(ctx);const result=await ctx.startRendering();
 assert.ok(stats(result,0,3).peak>.0001,name+' is silent');assert.ok(stats(result,7,9).peak<.0001,name+' sticks after release');synth.dispose();bank.dispose(ctx);
}
const ctx=context(4),audio=await makeAudio(ctx),bass=new BassVoice(audio),pattern=bassPreset('Deep pulse');
for(let i=0;i<16;i++){const e=bassEvent(pattern,i);if(e)bass.play(e,i*.125,.5);}
await bank.flush(ctx);const bassStats=stats(await ctx.startRendering(),0,2);assert.ok(bassStats.peak>.001,'SoundFont bass is audible');bank.dispose(ctx);
// Decode the actual Boomwhacker WAVs; retain nearby-note transposition and per-sample gains.
const live=new MusicAudio();live.init(context(1));live.soundfont=bank;live.boomwhackers=new BoomwhackerVoice(live.ctx,live.master,live.reverb);
for(const s of BOOM_SAMPLES){const data=await fs.readFile(new URL(`../dist/samples/boomwhacker/${s.midi}.wav`,import.meta.url));live.boomwhackers.buffers.set(s.midi,{buffer:await live.ctx.decodeAudioData(array(data)),gain:s.gain});}
for(const midi of [48,49,60,61,72,84]){const c=context(3),voice=new BoomwhackerVoice(c,c.destination,c.createGain());voice.buffers=live.boomwhackers.buffers;voice.play(midi,.8,0);const source=[...voice.voices][0].source;assert.ok(source.playbackRate.value>0);assert.ok(stats(await c.startRendering()).peak>.02,'Boomwhacker '+midi);}
// Exercise the real export scheduler, shared bank/buffers, synth patch persistence and part mixing.
globalThis.OfflineAudioContext=OfflineAudioContext;
const song={format:'drews-loop-song',version:1,bpm:120,bars:1,title:'Audio test',events:[{type:'metallophone',midi:60,velocity:.8,beat:0,duration:.5},{type:'glockenspiel',midi:64,velocity:.8,beat:.25,duration:.5},{type:'tambourine',midi:60,velocity:.9,beat:.5,duration:.5},{type:'maracas',midi:60,velocity:.8,beat:.75,duration:.5},{type:'boomwhacker',midi:61,velocity:.9,beat:1,duration:.5},{type:'synth',midi:67,velocity:.8,beat:2,duration:1,patch:SYNTH_PRESETS['Gentle flute']}],bassPattern:pattern};
assert.equal(validateSong(song).events.at(-1).patch.program,73);const wav=await renderSongWav(song,live);assert.equal(wav.type,'audio/wav');assert.ok(wav.size>44100);
const decoded=await context().decodeAudioData(await wav.arrayBuffer());assert.ok(stats(decoded).peak>.02);assert.ok(stats(decoded).peak<=1);
await assert.rejects(()=>renderSongWav(song,{...live,soundfont:null}),/SoundFont is not ready/);
bank.dispose(live.ctx);
// A failed network request must clear the promise and permit a user retry.
const originalFetch=globalThis.fetch;let failed=true;
globalThis.fetch=async url=>{if(failed)throw Error('offline');return new Response(await fs.readFile(url));};
await assert.rejects(preloadSoundfont,/offline/);failed=false;assert.ok(await preloadSoundfont() instanceof SoundFontBank);globalThis.fetch=originalFetch;
console.log('PASS: actual SoundFont PCM, full-engine patch fidelity, decaying envelopes, independent repeated notes, cancelled future notes, instrument velocity response, 24 synth patches and note-offs, bass, 22 Boomwhacker WAVs, chromatic pitches, exported WAV, missing-bank errors and load retry.',levels);
