import fs from 'node:fs/promises';
import {assembleStandalone} from './assemble-standalone.mjs';
import {pathToFileURL} from 'node:url';
const standalone=await assembleStandalone();
const {createNeuralEngine,splitSpeechText}=await import(pathToFileURL(standalone+'/js/neural-engine.mjs'));
await fs.mkdir('.sites-runtime/voice-check',{recursive:true});
import assert from 'node:assert/strict';
const root=new URL('../asset-packs/assets/neural-v1/',import.meta.url),beg=Date.now();
const engine=await createNeuralEngine({readBytes:async name=>new Uint8Array(await fs.readFile(new URL(name,root))),progress:(s,p)=>console.log(s,Math.round(p*100)+'%')});
for(const [speaker,text,delivery]of [['af_heart','We found it! The lantern is glowing again!','excited'],['am_puck','Take your time. The story is only beginning.','normal']]){
 const r=await engine.synthesize(text,{speaker,speed:1,delivery});assert.equal(r.sampleRate,24000);assert(r.samples.length>24000&&r.samples.length<24000*30);assert(r.samples.every(Number.isFinite));const rms=Math.sqrt(r.samples.reduce((n,x)=>n+x*x,0)/r.samples.length);assert(rms>.01);await fs.writeFile('.sites-runtime/voice-check/'+speaker+'.f32',Buffer.from(r.samples.buffer));console.log('SPEECH',speaker,r.samples.length/24000,'seconds',rms,'rms',((Date.now()-beg)/1000).toFixed(1),'wall seconds');
}
assert(splitSpeechText('This is a test. '+('A very long sentence with several words ').repeat(12)).every(x=>x.length<=220));await engine.dispose();console.log('PASS: actual shipped neural WASM, two distinct voices, 24 kHz finite PCM and long-text splitting.');
