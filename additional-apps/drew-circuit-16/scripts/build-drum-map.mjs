import fs from 'node:fs';
import {SoundBankLoader,SpessaLog} from '../dist/vendor/spessasynth-core.js';
SpessaLog.info=()=>{};SpessaLog.group=()=>{};SpessaLog.groupEnd=()=>{};
const b=Buffer.concat([1,2].map(i=>fs.readFileSync(new URL(`../dist/assets/generaluser-${i}.bin`,import.meta.url))));
const bank=SoundBankLoader.fromArrayBuffer(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
const names=['High Q','Slap','Scratch push','Scratch pull','Sticks','Square click','Metronome click','Metronome bell','Acoustic kick','Kick','Side stick','Snare','Clap','Electric snare','Low floor tom','Closed hat','High floor tom','Pedal hat','Low tom','Open hat','Low-mid tom','High-mid tom','Crash cymbal 1','High tom','Ride cymbal 1','Chinese cymbal','Ride bell','Tambourine','Splash cymbal','Cowbell','Crash cymbal 2','Vibraslap','Ride cymbal 2','High bongo','Low bongo','Muted high conga','Open high conga','Low conga','High timbale','Low timbale','High agogo','Low agogo','Cabasa','Maracas','Short whistle','Long whistle','Short guiro','Long guiro','Claves','High woodblock','Low woodblock','Muted cuica','Open cuica','Muted triangle','Open triangle','Shaker','Jingle bells','Bell chimes','Castanets','Muted surdo','Open surdo'];
const standard=Object.fromEntries(names.map((name,i)=>[i+27,name]));
const catalog={};
for(const kit of bank.presets.filter(p=>p.isGMGSDrum)){
 const notes={};
 for(let note=0;note<128;note++){
  const samples=[...new Set([32,80,127].flatMap(v=>kit.getVoiceParameters(note,v).map(p=>p.sample.name)))];
  if(!samples.length)continue;
  let name=standard[note]||samples[0];
  if(kit.program===56)name=samples[0].replace(/^GUTest-/,'SoundFont test: ').replace(/([a-z])([A-Z])/g,'$1 $2');
  if(kit.program===40&&[38,39,40].includes(note))name={38:'Brush tap',39:'Brush slap',40:'Brush swirl'}[note];
  if(kit.program===48){if(note>=41&&note<=53)name='Timpani';else name=({27:'Closed hat',28:'Pedal hat',29:'Open hat',30:'Ride cymbal',36:'Concert bass drum',39:'Castanets',59:'Orchestral cymbal',88:'Applause'})[note]||name;}
  if(kit.program===25&&[35,36,37,38,39,40,42,44,46,49,51,56,57].includes(note))name=samples[0];
  notes[note]={name,samples};
 }
 catalog[kit.program]={name:kit.name,notes};
}
fs.writeFileSync(new URL('../dist/drum-map.js',import.meta.url),'// Generated from the shipped GeneralUser GS 1.471 SoundFont.\nexport const DRUM_MAP='+JSON.stringify(catalog)+';\n');
console.log('Mapped',Object.keys(catalog).length,'kits directly from the SoundFont.');
