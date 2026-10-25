import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ALL_PRESETS,FACTORY_PRESETS,getFactoryPreset} from './dist/factory-presets.js';
import {sanitize} from './dist/rhythm.js';
const before=JSON.parse(fs.readFileSync('horizon-original-hashes.json','utf8'));
for(const old of before)assert.equal(createHash('sha256').update(JSON.stringify(getFactoryPreset(old.id))).digest('hex'),old.hash,old.name+' must remain unchanged');
const referenceHash=createHash('sha256').update(JSON.stringify(getFactoryPreset('Event Horizon'))).digest('hex');
const family=FACTORY_PRESETS.filter(p=>p.category==='Horizon'&&p.state.name!=='Event Horizon');assert.equal(family.length,12);assert.equal(ALL_PRESETS.length,92);
const sounds=JSON.parse(fs.readFileSync('dist/assets/presets.json','utf8'));
globalThis.sampleRate=44100;globalThis.AudioWorkletProcessor=class{constructor(){this.port={postMessage:m=>{if(m.type==='error')throw Error(m.message)}}}};globalThis.registerProcessor=()=>{};
const {OrbitProcessor}=await import('./dist/processor.js');const bytes=Buffer.concat([0,1,2,3].map(i=>fs.readFileSync(`dist/assets/generaluser-${i}.bin`)));const fx=new OrbitProcessor();await fx.message({type:'init',font:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),state:family[0].state});assert(fx.ready);
const l=new Float32Array(128),r=new Float32Array(128),report=[];
for(const p of family){const s=structuredClone(p.state);assert.deepEqual(sanitize(s),s);assert(s.tracks.filter(t=>!t.mute).every(t=>t.bank===0));for(const t of s.tracks.filter(t=>!t.mute))assert(sounds.some(p=>p.program===t.program&&p.bank===t.bank));await fx.message({type:'stop'});fx.synth.reset();fx.ambient.clear();await fx.message({type:'state',state:s});await fx.message({type:'play'});const start=fx.frame,changes=[],last=new Map(),cc=new Set(),events=Array(8).fill(0);let peak=0,energy=0,voiceMax=0,count=0;
 const play=fx.playNotes.bind(fx);fx.playNotes=(ch,notes,...a)=>{events[ch]++;if(ch>0&&ch<5&&last.has(ch)&&JSON.stringify(last.get(ch))!==JSON.stringify(notes))changes.push({ch,seconds:(fx.frame-start)/44100});last.set(ch,notes);play(ch,notes,...a)};
 const seconds=60;for(let b=0;b<Math.ceil(seconds*44100/128);b++){l.fill(0);r.fill(0);fx.process([],[[l,r]]);if(b*128/44100<4)cc.add(fx.synth.midiChannels[2].midiControllers[74]>>7);voiceMax=Math.max(voiceMax,fx.synth.voiceCount);for(let j=0;j<128;j++){assert(Number.isFinite(l[j])&&Number.isFinite(r[j]));peak=Math.max(peak,Math.abs(l[j]*.6375),Math.abs(r[j]*.6375));energy+=(l[j]**2+r[j]**2)*.6375**2;count+=2}}
 fx.playNotes=play;const early=new Set(changes.filter(c=>c.seconds<4).map(c=>c.ch)),rms=Math.sqrt(energy/count);assert(early.size>=2,s.name+' early moving voices');assert(changes[0].seconds<2.3,s.name+' early pitch evolution');assert(cc.size>=8,s.name+' moving filter');assert(voiceMax<150,s.name+' bounded voices');assert(peak<.65,s.name+' output headroom');assert(rms>.001,s.name+' audible output');s.tracks.forEach((t,i)=>{if(!t.mute)assert(events[i]>0,s.name+' sounding layer '+i)});const row={name:s.name,direction:p.description.split(' · ')[0],seconds,firstPitchChangeSeconds:+changes[0].seconds.toFixed(2),movingVoicesBefore4Seconds:early.size,filterValuesIn4Seconds:cc.size,maxVoices:voiceMax,peakDb:+(20*Math.log10(peak)).toFixed(1),rmsDb:+(20*Math.log10(rms)).toFixed(1)};report.push(row);console.log(JSON.stringify(row));
}
fs.writeFileSync('horizon-audio-report.json',JSON.stringify({original34StatesUnchanged:true,eventHorizonSHA256:referenceHash,presets:report},null,2));console.log('PASS: twelve new arrangements, original 34 preserved, early evolution, soundfont mapping, finite audio, voice and output headroom.');
