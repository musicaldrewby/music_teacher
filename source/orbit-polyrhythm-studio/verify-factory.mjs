import fs from 'node:fs';
import assert from 'node:assert/strict';
import {FACTORY_PRESETS,ALL_PRESETS,getFactoryPreset} from './dist/factory-presets.js';
import {sanitize,notesFor} from './dist/rhythm.js';
const sounds=JSON.parse(fs.readFileSync('dist/assets/presets.json'));
assert.equal(FACTORY_PRESETS.length,42);assert.equal(ALL_PRESETS.length,46);assert.equal(new Set(ALL_PRESETS.map(p=>p.state.name)).size,46);
for(const category of ['Percussion','Pads','Grooves','Melodic','Experimental'])assert.equal(FACTORY_PRESETS.filter(p=>p.category===category).length,category==='Pads'?5:6);
assert.equal(FACTORY_PRESETS.filter(p=>p.category==='Horizon').length,13);
for(const p of FACTORY_PRESETS){const s=p.state;assert.deepEqual(sanitize(s),s,p.state.name+' must survive save/load');assert.deepEqual(getFactoryPreset(p.id),s);for(const t of s.tracks.filter(t=>!t.mute)){const patch=sounds.find(p=>p.bank===t.bank&&p.program===t.program);assert(patch,'Preset exists');if(p.category==='Pads'){assert.equal(t.bank,0);if(s.tracks.indexOf(t)<5)assert(t.program>=88&&t.program<=95);}if(p.category==='Percussion')assert.equal(t.bank,128);if(t.bank===128)assert(patch.keys.includes(t.drum),patch.name+' has drum note '+t.drum);for(let i=0;i<128;i++)assert(notesFor(t,s,i).every(n=>n>=0&&n<=127));}}
const original=getFactoryPreset(FACTORY_PRESETS[0].id);original.tracks[0].volume=0;assert.notEqual(FACTORY_PRESETS[0].state.tracks[0].volume,0,'Edits cannot mutate factory bank');
globalThis.sampleRate=44100;globalThis.AudioWorkletProcessor=class{constructor(){this.port={postMessage:m=>{if(m.type==='error')throw Error(m.message)}}}};globalThis.registerProcessor=()=>{};
const {OrbitProcessor}=await import('./dist/processor.js');
const data=Buffer.concat([0,1,2,3].map(i=>fs.readFileSync(`dist/assets/generaluser-${i}.bin`)));
const fx=new OrbitProcessor();await fx.message({type:'init',font:data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),state:FACTORY_PRESETS[0].state});assert(fx.ready);
let seed=33;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
const l=new Float32Array(128),r=new Float32Array(128),report=[];
for(const p of FACTORY_PRESETS){
 await fx.message({type:'stop'});fx.synth.reset();fx.ambient.clear();await fx.message({type:'state',state:p.state});await fx.message({type:'play'});
 const duration=Math.max(32,2*p.state.bars*4*60/p.state.bpm),blocks=Math.ceil(duration*44100/128);let energy=0,peak=0,maxVoices=0,samples=0,partEnergy=Array(8).fill(0);const originalPlay=fx.playNotes.bind(fx);const events=Array(8).fill(0);fx.playNotes=(ch,...rest)=>{if(ch<8)events[ch]++;originalPlay(ch,...rest)};
 for(let b=0;b<blocks;b++){l.fill(0);r.fill(0);fx.process([],[[l,r]]);const gain=p.state.master/100*.75;for(let j=0;j<128;j++){assert(Number.isFinite(l[j])&&Number.isFinite(r[j]),p.state.name+' finite audio');peak=Math.max(peak,Math.abs(l[j]*gain),Math.abs(r[j]*gain));if(b>1000){energy+=(l[j]**2+r[j]**2)*gain**2;samples+=2}}maxVoices=Math.max(maxVoices,fx.synth.voiceCount)}
 fx.playNotes=originalPlay;const rms=Math.sqrt(energy/samples);assert(rms>.0003,p.state.name+' must be audible');assert(peak<1,p.state.name+' should not require hard limiting');assert(maxVoices<180,p.state.name+' voice headroom');p.state.tracks.forEach((t,i)=>{if(!t.mute)assert(events[i]>0,p.state.name+' part '+i+' plays')});
 const row={name:p.state.name,category:p.category,seconds:+duration.toFixed(1),rmsDb:+(20*Math.log10(rms)).toFixed(1),peakDb:+(20*Math.log10(peak)).toFixed(1),maxVoices};report.push(row);console.log(JSON.stringify(row));
}
fs.writeFileSync('factory-audio-report.json',JSON.stringify(report,null,2));console.log('PASS: 42 factory arrangements, valid instruments, category purity, bounded audio, active layers, voice headroom, project round trips.');
