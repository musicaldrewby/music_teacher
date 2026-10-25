import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {OfflineAudioContext} from 'node-web-audio-api';
import {AudioEngine} from '../dist/engine.js';
const root = new URL('../dist/', import.meta.url);
const fragment = JSON.parse(await fs.readFile(new URL('assets/audio/recorded/street-additions/manifest-fragment.json', root)));
const provenance = JSON.parse(await fs.readFile(new URL('assets/audio/recorded/street-additions/PROVENANCE.json', root)));
const manifest = JSON.parse(await fs.readFile(new URL('assets/audio/manifest.json', root)));
globalThis.fetch = async path => new Response(await fs.readFile(new URL(path, root)));
class Engine extends AudioEngine {
 async init() {
  if (!this.ctx) {this.ctx = new OfflineAudioContext(2, 44100, 44100); this.mix = this.createMix(this.ctx);}
  this.manifest = {...await this.manifestPromise, instrumentSamples: {...manifest.instrumentSamples, ...fragment.instrumentSamples}};
  return this;
 }
}
const rms = (buffer, from, to) => {
 const data = buffer.getChannelData(0).slice(Math.round(from * buffer.sampleRate), Math.round(to * buffer.sampleRate));
 return Math.sqrt(data.reduce((sum, n) => sum + n * n, 0) / data.length);
};

test('Street Song additions have complete mappings, source hashes and unclipped new percussion', async () => {
 for (const entry of [...provenance.assets.map(a => ({...a, url: 'assets/audio/recorded/street-additions/' + a.file})), ...provenance.reusedAssets]) {
  const bytes = await fs.readFile(new URL(entry.url, root));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, entry.url);
 }
 for (const asset of provenance.assets) {
  assert.equal(asset.clippedSamples, 0);
  assert.ok(asset.peak > .2 && asset.peak < .9);
  assert.ok(asset.rmsFirst100ms > .04 && asset.rmsFirst100ms < .1);
 }
 assert.notEqual(provenance.assets[0].sha256, provenance.assets[1].sha256);
 assert.notEqual(provenance.assets[2].sha256, provenance.assets[3].sha256);
 for (let note = 36; note <= 60; note++) assert.ok(fragment.instrumentSamples.timpani.notes[note]);
 for (let note = 77; note <= 101; note++) {
  const d = fragment.instrumentSamples['sopranino-recorder'].notes[note];
  const original = manifest.instrumentSamples['soprano-recorder'].notes[note - 5];
  assert.equal(d.url, original.url);
  assert.ok(Math.abs(d.tuningSemitones - original.tuningSemitones - 5) < 1e-8);
  assert.equal(d.loopStart, original.loopStart);
  assert.equal(d.loopEnd, original.loopEnd);
 }
});

test('all source buffers for the added instruments decode and contain finite audible audio', async () => {
 const engine = new Engine();
 for (const [id, set] of Object.entries(fragment.instrumentSamples)) {
  const inst = {id, family: id.includes('recorder') ? 'recorder' : id === 'timpani' ? 'timpani' : 'drum'};
  for (const [note, desc] of Object.entries(set.notes)) {
   const buffer = await engine.load(inst, Number(note));
   assert.ok(buffer.duration > .08, id + ' ' + note);
   assert.ok(buffer.getChannelData(0).every(Number.isFinite));
   assert.ok(buffer.getChannelData(0).some(n => Math.abs(n) > .01));
   if (inst.family === 'recorder') assert.ok(desc.loopStart > 0 && desc.loopEnd > desc.loopStart && desc.loopEnd < buffer.duration);
  }
 }
});

test('sopranino extreme notes loop for six seconds and release, while native percussion keeps its decay', async () => {
 const engine = new Engine();
 const inst = {id: 'sopranino-recorder', family: 'recorder', zone: 'recorders'};
 for (const note of [77, 101]) {
  await engine.load(inst, note);
  const ctx = new OfflineAudioContext(2, Math.ceil(6.6 * 44100), 44100), mix = engine.createMix(ctx);
  mix.bpm = 120; mix.master.gain.value = .7; mix.send.gain.value = 0; mix.delaySend.gain.value = 0; mix.out.connect(ctx.destination);
  const voice = engine.play(inst, {note, velocity: .8, shift: 0, duration: 1}, {id: 'test', volume: .8, pan: 0}, 0, mix, {hold: true});
  assert.equal(voice.src.loop, true);
  engine.release(voice, 6);
  const output = await ctx.startRendering();
  assert.ok(rms(output, 5.4, 5.9) > .003, 'sustains at MIDI ' + note);
  assert.ok(rms(output, 6.3, 6.5) < .00001, 'releases at MIDI ' + note);
  assert.ok(output.getChannelData(0).every(Number.isFinite));
 }
 for (const [id, note] of [['castanets', 85], ['side-drum', 38], ['timpani', 41]]) {
  const instrument = {id, family: id === 'timpani' ? 'timpani' : 'drum'};
  const buffer = await engine.load(instrument, note);
  const ctx = new OfflineAudioContext(2, Math.ceil(5 * 44100), 44100), mix = engine.createMix(ctx);
  mix.bpm = 120; mix.master.gain.value = .7; mix.send.gain.value = 0; mix.delaySend.gain.value = 0; mix.out.connect(ctx.destination);
  const voice = engine.play(instrument, {note, velocity: .8, shift: 0, duration: .25}, {id: 'test', volume: .8, pan: 0}, 0, mix);
  assert.ok(Math.abs(voice.end - buffer.duration) < .00001, id + ' preserves sample tail');
  const output = await ctx.startRendering();
  assert.ok(rms(output, 0, .15) > .002, id + ' attack');
  assert.ok(output.getChannelData(0).every(Number.isFinite));
 }
});
