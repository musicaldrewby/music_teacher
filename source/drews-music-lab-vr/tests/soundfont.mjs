import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {OfflineAudioContext} from 'node-web-audio-api';
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
const makeAudio=ctx=>{const audio=new MusicAudio();audio.offline=true;audio.init(ctx);audio.soundfont=bank;audio.fontVoice=new SoundFontVoice(ctx,audio.master,audio.reverb,bank);return audio;};
// All physical pitched instruments and percussion keys resolve to nonempty sample zones.
for(const [type,p]of Object.entries(FONT_INSTRUMENTS))for(const midi of p.bank?[p.note]:[36,48,60,72,84])for(const velocity of [.12,.55,1]){
 const zones=bank.zones(p.program,p.bank||0,midi,velocity);assert.ok(zones.length,`${type}: ${midi}/${velocity}`);
 for(const z of zones){assert.ok(z.sample.rate>=8000);assert.ok(z.sample.root<=127);}
}
const levels={};
for(const type of Object.keys(FONT_INSTRUMENTS)){
 const ctx=context(12),audio=makeAudio(ctx);audio.play(type,60,.35,.05);audio.play(type,60,1,6);
 const result=await ctx.startRendering(),soft=stats(result,.05,1),hard=stats(result,6,7);
 assert.ok(hard.peak>.005,`${type} must be audible (${hard.peak})`);assert.ok(hard.rms>soft.rms*1.2,`${type} dynamics`);levels[type]=+hard.peak.toFixed(3);
}
// Every named synth voice is audible, can sustain, and can be released without stuck notes.
for(const [name,patch]of Object.entries(SYNTH_PRESETS)){
 for(let midi=12;midi<=120;midi++)assert.ok(bank.zones(patch.program,patch.bank||0,midi,.75).length,name+' note '+midi);
 const ctx=context(9),audio=makeAudio(ctx),synth=new WallSynth(audio);synth.patch={...patch,delayMix:0,reverbMix:0};
 synth.noteOn(60,.85,{when:.01,durationSec:2});const result=await ctx.startRendering();
 assert.ok(stats(result,0,3).peak>.0001,name+' is silent');assert.ok(stats(result,7,9).peak<.0001,name+' sticks after release');synth.dispose();
}
const ctx=context(4),audio=makeAudio(ctx),bass=new BassVoice(audio),pattern=bassPreset('Deep pulse');
for(let i=0;i<16;i++){const e=bassEvent(pattern,i);if(e)bass.play(e,i*.125,.5);}
const bassStats=stats(await ctx.startRendering(),0,2);assert.ok(bassStats.peak>.001,'SoundFont bass is audible');
// Decode the actual Boomwhacker WAVs; retain nearby-note transposition and per-sample gains.
const live=makeAudio(context(1));live.boomwhackers=new BoomwhackerVoice(live.ctx,live.master,live.reverb);
for(const s of BOOM_SAMPLES){const data=await fs.readFile(new URL(`../dist/samples/boomwhacker/${s.midi}.wav`,import.meta.url));live.boomwhackers.buffers.set(s.midi,{buffer:await live.ctx.decodeAudioData(array(data)),gain:s.gain});}
for(const midi of [48,49,60,61,72,84]){const c=context(3),voice=new BoomwhackerVoice(c,c.destination,c.createGain());voice.buffers=live.boomwhackers.buffers;voice.play(midi,.8,0);const source=[...voice.voices][0].source;assert.ok(source.playbackRate.value>0);assert.ok(stats(await c.startRendering()).peak>.02,'Boomwhacker '+midi);}
// Exercise the real export scheduler, shared bank/buffers, synth patch persistence and part mixing.
globalThis.OfflineAudioContext=OfflineAudioContext;
const song={format:'drews-loop-song',version:1,bpm:120,bars:1,title:'Audio test',events:[{type:'piano',midi:60,velocity:.8,beat:0,duration:.5},{type:'boomwhacker',midi:61,velocity:.9,beat:1,duration:.5},{type:'synth',midi:67,velocity:.8,beat:2,duration:1,patch:SYNTH_PRESETS['Gentle flute']}],bassPattern:pattern};
assert.equal(validateSong(song).events[2].patch.program,73);const wav=await renderSongWav(song,live);assert.equal(wav.type,'audio/wav');assert.ok(wav.size>44100);
const decoded=await context().decodeAudioData(await wav.arrayBuffer());assert.ok(stats(decoded).peak>.02);assert.ok(stats(decoded).peak<=1);
await assert.rejects(()=>renderSongWav(song,{...live,soundfont:null}),/SoundFont is not ready/);
// A failed network request must clear the promise and permit a user retry.
const originalFetch=globalThis.fetch;let failed=true;
globalThis.fetch=async url=>{if(failed)throw Error('offline');return new Response(await fs.readFile(url));};
await assert.rejects(preloadSoundfont,/offline/);failed=false;assert.ok(await preloadSoundfont() instanceof SoundFontBank);globalThis.fetch=originalFetch;
console.log('PASS: actual SoundFont PCM, all instrument notes/velocity layers, 24 synth patches and note-offs, bass, 22 Boomwhacker WAVs, chromatic pitches, exported WAV, missing-bank errors and load retry.',levels);
