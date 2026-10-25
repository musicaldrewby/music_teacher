import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ALL_PRESETS,getFactoryPreset,PRESET_CATEGORIES} from './dist/factory-presets.js';
import {COLLECTION_CATEGORIES,COLLECTION_DEFS} from './dist/expanded-collections.js';
import {sanitize,interval} from './dist/rhythm.js';
import {paletteFor} from './dist/visuals.js';
const old=JSON.parse(fs.readFileSync('collections-original-hashes.json','utf8'));
assert.equal(old.length,56);
for(const p of old)assert.equal(createHash('sha256').update(JSON.stringify(getFactoryPreset(p.id))).digest('hex'),p.hash,p.name+' unchanged');
const fresh=ALL_PRESETS.filter(p=>COLLECTION_CATEGORIES.includes(p.category));assert.equal(fresh.length,36);assert.equal(ALL_PRESETS.length,127);
assert.equal(new Set(ALL_PRESETS.map(p=>p.id)).size,127);assert.equal(new Set(ALL_PRESETS.map(p=>p.state.name)).size,127);
assert.equal(new Set(ALL_PRESETS.map(p=>paletteFor(p.state.name).hues.join(','))).size,127);
for(const c of COLLECTION_CATEGORIES){assert(PRESET_CATEGORIES.includes(c));assert.equal(fresh.filter(p=>p.category===c).length,6);}
for(const d of COLLECTION_DEFS){assert(d[8].length<=8);for(const t of d[8]){assert(/^[Xx.]{1,32}$/.test(t.pattern));assert(t.notes.length<=32);assert(t.volume>0&&Number.isFinite(t.volume));}}
const sounds=JSON.parse(fs.readFileSync('dist/assets/presets.json','utf8'));
globalThis.sampleRate=44100;globalThis.AudioWorkletProcessor=class{constructor(){this.port={postMessage:m=>{if(m.type==='error')throw Error(m.message)}}}};globalThis.registerProcessor=()=>{};
const {OrbitProcessor}=await import('./dist/processor.js');const bytes=Buffer.concat([0,1,2,3].map(i=>fs.readFileSync(`dist/assets/generaluser-${i}.bin`))),fx=new OrbitProcessor();
await fx.message({type:'init',font:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),state:fresh[0].state});assert(fx.ready);
const l=new Float32Array(128),r=new Float32Array(128),report=[];
// Optional name filter is only for focused rerenders after an arrangement adjustment.
const filter=process.argv.slice(2);const existing=filter.length&&fs.existsSync('collections-audio-report.json')?JSON.parse(fs.readFileSync('collections-audio-report.json','utf8')).presets:[];
for(const p of fresh.filter(p=>!filter.length||filter.includes(p.state.name))){
 const s=p.state;assert.deepEqual(sanitize(JSON.parse(JSON.stringify(s))),s);const active=s.tracks.filter(t=>!t.mute);
 for(const t of active){const sound=sounds.find(p=>p.program===t.program&&p.bank===t.bank);assert(sound,s.name+' sound mapping');if(t.bank===128)assert(sound.keys.includes(t.drum),s.name+' kit mapping');}
 if(p.category==='Gravity Drums')assert(active.every(t=>t.bank===128));
 if(p.category==='Slow Supernovas')assert(active.filter(t=>t.program>=88&&t.program<=95).length>=3);
 const flute=s.tracks.map((t,i)=>({t,i})).filter(({t})=>!t.mute&&[73,75,77].includes(t.program)&&t.bank===0);
 for(const {t} of flute){assert(t.delay===0&&t.reverb===0);assert(interval(t,s)*60/s.bpm*t.gate/100<=.34,'brief flute notes');assert(t.pattern.filter(Boolean).length/t.steps*t.gate/100<=.28,'flute breathing space');}
 await fx.message({type:'stop'});fx.synth.reset();fx.ambient.clear();await fx.message({type:'state',state:s});await fx.message({type:'play'});
 const start=fx.frame,events=Array.from({length:8},()=>[]),velocities=Array.from({length:8},()=>new Set()),changed=[],last=new Map(),play=fx.playNotes.bind(fx);
 fx.playNotes=(ch,ns,vel,duration)=>{const at=(fx.frame-start)/44100;events[ch].push({at,duration});velocities[ch].add(vel);if(last.has(ch)&&last.get(ch)!==ns.join(','))changed.push({ch,at});last.set(ch,ns.join(','));play(ch,ns,vel,duration)};
 const seconds=Math.max(40,...active.filter(t=>t.swell).map(t=>(t.swellBars||4)*4*60/s.bpm));let peak=0,sum=0,count=0,maxVoices=0,earlyEnergy=0;
 const blocks=Math.ceil(seconds*44100/128);
 for(let b=0;b<blocks;b++){l.fill(0);r.fill(0);fx.process([],[[l,r]]);maxVoices=Math.max(maxVoices,fx.synth.voiceCount);
  for(let j=0;j<128;j++){const a=l[j]*s.master/100*.75,z=r[j]*s.master/100*.75;assert(Number.isFinite(a)&&Number.isFinite(z));peak=Math.max(peak,Math.abs(a),Math.abs(z));const energy=a*a+z*z;sum+=energy;if(b<345)earlyEnergy+=energy;count+=2;}}
 fx.playNotes=play;
 for(let i=0;i<8;i++)if(!s.tracks[i].mute){assert(events[i].length>0,s.name+' track '+i);if(s.tracks[i].swell>=35)assert(velocities[i].size>=2,s.name+' dynamic strikes on '+i);}
 for(const {i} of flute){const es=events[i];assert(es.every(e=>e.duration<=.34));assert(es.some((e,j)=>j&&e.at-es[j-1].at-es[j-1].duration>1),'breathing rest longer than a second');}
 if(p.category==='Slow Supernovas'){assert(changed.some(c=>c.ch<4&&c.at<2),'early pad movement');assert(new Set(changed.filter(c=>c.ch<4&&c.at<4).map(c=>c.ch)).size>=2,'two moving pad voices');}
 assert(earlyEnergy>.001,s.name+' opening audible');assert(sum/count>1e-6,s.name+' output audible');
 const issues=[];if(10*Math.log10(sum/count)<-43)issues.push('too quiet');if(maxVoices>=160)issues.push('voice density '+maxVoices);if(peak>=.8)issues.push('peak '+peak);
 const row={name:s.name,category:p.category,seconds:+seconds.toFixed(2),maxVoices,peakDb:+(20*Math.log10(peak)).toFixed(1),rmsDb:+(10*Math.log10(sum/count)).toFixed(1),maxFluteNoteSeconds:flute.length?+Math.max(...flute.flatMap(({i})=>events[i].map(e=>e.duration))).toFixed(3):null,firstPitchChangeSeconds:changed.length?+changed[0].at.toFixed(2):null,issues};report.push(row);console.log(JSON.stringify(row));
 const checkpoint=fresh.map(p=>report.find(r=>r.name===p.state.name)||existing.find(r=>r.name===p.state.name)).filter(Boolean);fs.writeFileSync('collections-audio-report.json',JSON.stringify({existing56Unchanged:true,collectionCount:6,rendered:checkpoint.length,browserQA:false,presets:checkpoint},null,2));
}
const merged=fresh.map(p=>report.find(r=>r.name===p.state.name)||existing.find(r=>r.name===p.state.name)).filter(Boolean);
fs.writeFileSync('collections-audio-report.json',JSON.stringify({existing56Unchanged:true,collectionCount:6,rendered:merged.length,browserQA:false,presets:merged},null,2));
assert.equal(merged.length,36,'All new arrangements rendered');assert(merged.every(p=>p.issues.length===0),'Resolve flagged headroom or voice-density issues');
console.log('PASS: 36 real-SoundFont renders, original 56 unchanged, brief flute notes and breathing rests, early pad evolution, state round trips and distinct lighting.');
