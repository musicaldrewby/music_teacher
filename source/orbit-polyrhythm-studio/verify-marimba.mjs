import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ALL_PRESETS,getFactoryPreset} from './dist/factory-presets.js';
import {sanitize,notesFor,preset} from './dist/rhythm.js';
import {noteVelocity} from './dist/dynamics.js';
import {paletteFor} from './dist/visuals.js';
const old=JSON.parse(fs.readFileSync('marimba-original-hashes.json','utf8'));
assert.equal(old.length,46);
for(const p of old)assert.equal(createHash('sha256').update(JSON.stringify(getFactoryPreset(p.id))).digest('hex'),p.hash,p.name+' unchanged');
assert.equal(ALL_PRESETS.length,92);assert.equal(new Set(ALL_PRESETS.map(p=>p.id)).size,92);
assert.equal(new Set(ALL_PRESETS.map(p=>paletteFor(p.state.name).hues.join(','))).size,92);
const family=ALL_PRESETS.filter(p=>p.category==='Marimba');assert.equal(family.length,10);
const legacy=sanitize(preset());assert.equal(noteVelocity(legacy.tracks[0],1,100),87);assert.equal(noteVelocity(legacy.tracks[0],2,100),115);
const t={...legacy.tracks[0],swell:100,swellBars:4};
assert(noteVelocity(t,1,0)<noteVelocity(t,1,4));assert(noteVelocity(t,1,4)<noteVelocity(t,1,8));assert(noteVelocity(t,1,8)>noteVelocity(t,1,12));assert.equal(noteVelocity(t,1,0),noteVelocity(t,1,16));
for(let b=0;b<32;b+=.125){assert(noteVelocity(t,2,b)>noteVelocity(t,1,b));assert(noteVelocity({...t,swell:0},1,b)===87);}
for(const [voice,semitones] of [['fourth',5],['fifth',7]]){const ns=notesFor({...t,voice,notes:[0],octave:3},legacy,0);assert.equal(ns[1]-ns[0],semitones);}
const bad=structuredClone(legacy);Object.assign(bad.tracks[0],{swell:200,swellBars:-2});assert.equal(sanitize(bad).tracks[0].swell,100);assert.equal(sanitize(bad).tracks[0].swellBars,2);
globalThis.sampleRate=44100;globalThis.AudioWorkletProcessor=class{constructor(){this.port={postMessage:m=>{if(m.type==='error')throw Error(m.message)}}}};globalThis.registerProcessor=()=>{};
const {OrbitProcessor}=await import('./dist/processor.js');
const bytes=Buffer.concat([0,1,2,3].map(i=>fs.readFileSync(`dist/assets/generaluser-${i}.bin`))),fx=new OrbitProcessor();
await fx.message({type:'init',font:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),state:family[0].state});assert(fx.ready);
const sounds=JSON.parse(fs.readFileSync('dist/assets/presets.json','utf8')),report=[],l=new Float32Array(128),r=new Float32Array(128);
for(const p of family){
 const s=p.state;assert.deepEqual(sanitize(JSON.parse(JSON.stringify(s))),s);
 const marimbas=s.tracks.map((t,i)=>({t,i})).filter(({t})=>!t.mute&&t.bank===0&&t.program===12);assert(marimbas.length>=3);
 for(const t of s.tracks.filter(t=>!t.mute)){assert(sounds.some(p=>p.program===t.program&&p.bank===t.bank));}
 await fx.message({type:'stop'});fx.synth.reset();fx.ambient.clear();await fx.message({type:'state',state:s});await fx.message({type:'play'});
 const velocities=Array.from({length:8},()=>[]),events=Array(8).fill(0),play=fx.playNotes.bind(fx);
 fx.playNotes=(ch,ns,vel,secs)=>{events[ch]++;velocities[ch].push(vel);play(ch,ns,vel,secs)};
 const seconds=Math.max(32,...marimbas.map(({t})=>t.swellBars*4*60/s.bpm));let peak=0,sum=0,count=0,maxVoices=0;
 for(let b=0;b<Math.ceil(seconds*44100/128);b++){
  l.fill(0);r.fill(0);fx.process([],[[l,r]]);maxVoices=Math.max(maxVoices,fx.synth.voiceCount);
  for(let j=0;j<128;j++){assert(Number.isFinite(l[j])&&Number.isFinite(r[j]));const a=l[j]*s.master/100*.75,z=r[j]*s.master/100*.75;peak=Math.max(peak,Math.abs(a),Math.abs(z));sum+=a*a+z*z;count+=2;}
 }
 fx.playNotes=play;
 for(const {i} of marimbas){assert(events[i]>4);assert(new Set(velocities[i]).size>=3&&Math.max(...velocities[i])-Math.min(...velocities[i])>=10,s.name+' dynamic variation on track '+i);}
 s.tracks.forEach((t,i)=>{if(!t.mute)assert(events[i]>0)});
 assert(maxVoices<150,s.name+' bounded voices');assert(peak<.85,s.name+' headroom '+peak);assert(sum/count>1e-6,s.name+' audible');
 const row={name:s.name,seconds,marimbaParts:marimbas.length,pureMarimba:s.tracks.filter(t=>!t.mute).every(t=>t.program===12&&t.bank===0),leadVelocityRange:[Math.min(...velocities[0]),Math.max(...velocities[0])],maxVoices,peakDb:+(20*Math.log10(peak)).toFixed(1),rmsDb:+(10*Math.log10(sum/count)).toFixed(1)};
 report.push(row);console.log(JSON.stringify(row));
}
fs.writeFileSync('marimba-audio-report.json',JSON.stringify({existing46Unchanged:true,swellsAndIntervalsVerified:true,browserQA:false,presets:report},null,2));
console.log('PASS: ten presets, existing 46 preserved, exact fourths/fifths, velocity swells, state round trips, 92 lighting palettes, real SoundFont audio and headroom.');
