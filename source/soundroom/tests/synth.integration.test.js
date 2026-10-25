import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { SynthEffects, delayMilliseconds, delayValue, effectMessage } from '../src/synth-effects.js';
const require = createRequire(import.meta.url);
const core = await import(pathToFileURL(require.resolve('spessasynth_core')).href);

core.SpessaLog.setLogLevel(false, false, false);
let bankPromise;
async function createSynth(effectsEnabled = false) {
 if (!bankPromise) bankPromise = (async () => {
  const chunks = await Promise.all([1, 2, 3, 4].map(n => readFile(new URL(`../dist/assets/generaluser-1.471-f45b6b4a68b6.part0${n}.bin`, import.meta.url))));
  const bytes = Buffer.concat(chunks);
  return bytes;
 })();
 const synth = new core.SpessaSynthProcessor(44100, { maxBufferSize: 128, effectsEnabled });
 await synth.processorInitialized;
 const bytes = await bankPromise;
 // A processor owns and destroys its parsed bank. Only cache the source bytes.
 synth.soundBankManager.addSoundBank(core.SoundBankLoader.fromArrayBuffer(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)), 'test-bank');
 return synth;
}

test('selected patches render real samples; shaping and panic reach the engine', async () => {
  const synth = await createSynth();
  await synth.processorInitialized;
  function render(blocks = 120) {
    let energy = 0;
    for (let i = 0; i < blocks; i++) {
      const left = new Float32Array(128), right = new Float32Array(128);
      synth.process(left, right);
      for (const x of left) { assert.ok(Number.isFinite(x)); energy += x * x; }
    }
    return energy;
  }
  for (const program of [0, 48]) {
    const ch = 0;
    synth.midiChannels[ch].setDrums(false);
    synth.controllerChange(ch, 0, 0); synth.controllerChange(ch, 32, 0);
    synth.programChange(ch, program);
    synth.midiChannels[ch].setSystemParameter('gain', 0.85);
    synth.midiChannels[ch].setSystemParameter('fineTune', -7);
    synth.controllerChange(ch, 73, 64); synth.controllerChange(ch, 72, 64); synth.controllerChange(ch, 74, 64);
    synth.noteOn(ch, 60, 96);
    assert.ok(render() > 0.0001, `channel ${ch} must render audible samples`);
    synth.stopAllChannels(true); render(10);
  }
  synth.noteOn(0, 60, 96); const normal = render(60);
  synth.stopAllChannels(true); render(10);
  synth.controllerChange(0, 73, 127); synth.noteOn(0, 60, 96); const slowAttack = render(60);
  assert.ok(slowAttack < normal * 0.75, `attack shaping changes the actual onset envelope (${slowAttack} < ${normal})`);
  synth.stopAllChannels(true); render(10);
  synth.midiChannels[0].setSystemParameter('gain', 0);
  synth.noteOn(0, 60, 96); assert.equal(render(), 0, 'channel gain can silence direct notes');
  synth.midiChannels[0].setSystemParameter('gain', 0.85);
  synth.controllerChange(0, 73, 64);
  synth.noteOn(0, 60, 96); assert.ok(render() > 0.0001, 'restored channel gain remains audible');
  synth.stopAllChannels(true); render(120);
  assert.equal(synth.voiceCount, 0, 'panic must clear all voices');
  assert.equal(render(), 0, 'no stuck audio after panic');
  synth.destroySynthProcessor();
});

test('reverb and delay settings reach the engine and generate distinct audible tails', async () => {
  const synth = await createSynth(true);
  const adapter = {sendMessage: m => synth.processMessage(m), controllerChange: (...args) => synth.controllerChange(...args), setSystemParameter: (...args) => synth.setSystemParameter(...args)};
  const fx = new SynthEffects(adapter, [0]);
  const settings = {reverbEnabled:true,delayEnabled:true,reverbMix:50,reverbType:4,reverbDecay:90,reverbDamping:2,reverbPredelay:12,delayMix:50,delayTime:100,delayFeedback:35,delayDamping:2,delayStereo:true};
  fx.apply(settings);
  synth.process(new Float32Array(128),new Float32Array(128));
  assert.equal(synth.reverbProcessor.character,4); assert.equal(synth.reverbProcessor.time,90);
  assert.equal(synth.reverbProcessor.preDelayTime,12); assert.equal(synth.delayProcessor.timeCenter,100);
  assert.equal(synth.delayProcessor.feedback,87); assert.equal(synth.systemParameters.delayGain,.5);
  assert.equal(delayMilliseconds(100),400); assert.equal(delayValue(750),110);
  const message=effectMessage(0x34,90);
  assert.equal(message.slice(5,-1).reduce((a,b)=>a+b,0)%128,0,'valid GS checksum');
  function impulse(processor, delay) {
    const energy = [];
    for(let block=0;block<500;block++) {
      const input=new Float32Array(128), l=new Float32Array(128), r=new Float32Array(128);
      if(block===0)input[0]=1;
      if(delay)processor.process(input,l,r,new Float32Array(128),0,128);else processor.process(input,l,r,0,128);
      energy.push(l.reduce((sum,x)=>sum+x*x,0)+r.reduce((sum,x)=>sum+x*x,0));
      assert.ok(l.every(Number.isFinite)&&r.every(Number.isFinite));
    }
    return energy;
  }
  const reverb=impulse(synth.reverbProcessor,false), delay=impulse(synth.delayProcessor,true);
  assert.ok(reverb.slice(60).reduce((a,b)=>a+b,0)>.00001,'reverb has a lasting tail');
  assert.ok(delay.slice(100,150).reduce((a,b)=>a+b,0)>.00001,'delay has an audible echo around 400 ms');
  assert.ok(delay.slice(260,300).reduce((a,b)=>a+b,0)>.000001,'feedback produces a second echo');
  fx.apply({...settings,reverbEnabled:false,delayEnabled:false});
  assert.equal(synth.systemParameters.reverbGain,0); assert.equal(synth.systemParameters.delayGain,0);
  synth.destroySynthProcessor();
});

test('included catalogs match their sample banks', async () => {
 const fonts=JSON.parse(await readFile(new URL('../src/soundfonts.json',import.meta.url),'utf8'));
 const {createHash}=await import('node:crypto');
 const catalogKey=p=>[p.name.split('\0')[0].trim(),p.program,p.bankMSB,p.bankLSB,p.isDrum,p.isGMGSDrum].join('|');
 for(const font of fonts){
  const bytes=Buffer.concat(await Promise.all(font.chunks.map(url=>readFile(new URL('../dist/'+url.slice(2),import.meta.url)))));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),font.sha256);
  const bank=core.SoundBankLoader.fromArrayBuffer(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
  assert.deepEqual(bank.presets.map(catalogKey).sort(),font.presets.map(catalogKey).sort(),font.name+' catalog must match its real bank');
  bank.destroySoundBank();
 }
});
