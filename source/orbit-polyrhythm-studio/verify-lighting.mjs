import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ALL_PRESETS} from './dist/factory-presets.js';
import {paletteFor,blendPalette,OrbitLights} from './dist/visuals.js';
import {preset} from './dist/rhythm.js';
const looks=ALL_PRESETS.map(p=>paletteFor(p.state.name));assert.equal(looks.length,127);assert.equal(new Set(looks.map(p=>p.hues.join(','))).size,127,'Every factory world has its own palette');
for(const p of looks){assert.equal(p.colors.length,8);assert(p.hues.every(Number.isFinite));}
const from=paletteFor('Velvet Nebula'),to=paletteFor('Copper Coil');let mid=blendPalette(from,to,.5);assert.notDeepEqual(mid.hues,from.hues);assert.notDeepEqual(mid.hues,to.hues);
const lights=new OrbitLights();lights.hit([{track:0,step:1,accent:true}],1000);const t=preset().tracks[0];assert(lights.energy(0,1000,t)>lights.energy(0,2000,t));lights.clear();assert.equal(lights.energy(0,3000,t),0);
// Run the real sequencer: a probability-zero or muted hit must never light up.
globalThis.sampleRate=44100;globalThis.AudioWorkletProcessor=class{constructor(){this.messages=[];this.port={postMessage:m=>this.messages.push(m)}}};globalThis.registerProcessor=()=>{};
const {OrbitProcessor}=await import('./dist/processor.js');const p=new OrbitProcessor();
const bytes=Buffer.concat([0,1,2,3].map(i=>fs.readFileSync(`dist/assets/generaluser-${i}.bin`)));let s=preset();s.tracks.forEach((t,i)=>{t.mute=i>1;t.steps=4;t.pattern=[2,1,1,1];t.probability=i===1?0:100});
await p.message({type:'init',font:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),state:s});
await p.message({type:'play'});const l=new Float32Array(128),r=new Float32Array(128);for(let n=0;n<1000;n++)p.process([],[[l,r]]);
const hits=p.messages.flatMap(m=>m.hits||[]);assert(hits.length>=3);assert(hits.every(h=>h.track===0));assert.equal(hits[0].accent,true);assert.deepEqual(hits.slice(0,3).map(h=>h.step),[0,1,2]);assert(p.visualHits.length<=1);
await p.message({type:'stop'});assert.equal(p.visualHits.length,0);
// Check the delivered document and module references without launching a browser.
const html=fs.readFileSync('dist/index.html','utf8'),js=fs.readFileSync('dist/app.js','utf8');const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
const dynamic=['out-','ambient-out-'];for(const m of js.matchAll(/\$\('([^']+)'\)/g)){assert(ids.includes(m[1])||dynamic.includes(m[1]),`Missing element: ${m[1]}`)}
console.log(JSON.stringify({passed:true,presetPalettes:ALL_PRESETS.length,actualTriggerLights:true,probabilityAndMuteRespected:true,accentAndStepTelemetry:true,documentReferences:true,browserQA:false},null,2));
