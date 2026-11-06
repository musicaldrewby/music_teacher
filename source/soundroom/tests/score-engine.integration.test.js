import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SpessaSynthProcessor,SoundBankLoader,SpessaLog} from 'spessasynth_core';
import {prepareComposition} from '../src/score-engine.js';

test('fresh Compose channels have neutral tone and match initialized live instrument audio',async()=>{
 SpessaLog.setLogLevel(false,false,false);
 const synth=new SpessaSynthProcessor(44100,{maxBufferSize:128,effectsEnabled:false});
 await synth.processorInitialized;
 const bytes=Buffer.concat(await Promise.all([1,2,3,4].map(n=>readFile(new URL(`../dist/assets/generaluser-1.471-f45b6b4a68b6.part0${n}.bin`,import.meta.url)))));
 synth.soundBankManager.addSoundBank(SoundBankLoader.fromArrayBuffer(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),'test');
 try{
  const track={patch:{program:40,bankMSB:0,bankLSB:0,isGMGSDrum:false},volume:108,pan:64,reverb:0,mute:false,solo:false};
  synth.controllerChange(0,74,85);
  prepareComposition(synth,{tracks:[track]});
  assert.equal(synth.midiChannels[0].midiControllers[74]>>7,85,'Compose must preserve live channel settings');
  for(const cc of [8,71,72,73,74,75,76,77,78])assert.equal(synth.midiChannels[16].midiControllers[cc]>>7,64,`neutral CC ${cc}`);
  synth.midiChannels[0].reset(false);
  synth.programChange(0,40);synth.midiChannels[0].setSystemParameter('gain',.8);
  for(const [cc,v] of [[7,108],[10,64],[11,127],[64,0],[91,0],[94,0]])synth.controllerChange(0,cc,v);
  synth.noteOn(0,64,101);synth.noteOn(16,64,101);
  let referenceEnergy=0,composeEnergy=0;
  for(let block=0;block<200;block++){
   const outputs=Array.from({length:17},()=>[new Float32Array(128),new Float32Array(128)]);
   synth.processSplit(outputs,new Float32Array(128),new Float32Array(128));
   for(const sample of outputs[0][0])referenceEnergy+=sample*sample;
   for(const sample of outputs[16][0])composeEnergy+=sample*sample;
  }
  assert.ok(referenceEnergy>1,'reference violin must render real samples');
  assert.ok(composeEnergy/referenceEnergy>.95&&composeEnergy/referenceEnergy<1.05,`Compose/live energy ratio ${composeEnergy/referenceEnergy}`);
  synth.midiChannels[16].stopAllNotes(true);synth.controllerChange(16,74,0);
  prepareComposition(synth,{tracks:[track]});
  assert.equal(synth.midiChannels[16].midiControllers[74]>>7,64,'subsequent playback clears prior expression tone state');
 }finally{synth.destroySynthProcessor()}
});
