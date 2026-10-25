import fs from 'node:fs';
import {SoundBankLoader} from './dist/assets/synth.js';
const d=Buffer.concat([0,1,2,3].map(i=>fs.readFileSync(`dist/assets/generaluser-${i}.bin`))),bank=SoundBankLoader.fromArrayBuffer(d.buffer.slice(d.byteOffset,d.byteOffset+d.byteLength));
let catalog=JSON.parse(fs.readFileSync('dist/assets/presets.json'));
for(const p of catalog.filter(p=>p.bank===128)){
 const actual=bank.presets.find(x=>x.isGMGSDrum&&x.program===p.program);
 p.keys=[];p.keyNames={};
 for(let k=0;k<128;k++){const voices=actual.getVoiceParameters(k,100);if(voices.length){p.keys.push(k);p.keyNames[k]=voices[0].sample.name;}}
 console.log(p.name,p.keys[0],p.keys.at(-1),'has36',p.keys.includes(36),'has38',p.keys.includes(38));
}
fs.writeFileSync('dist/assets/presets.json',JSON.stringify(catalog));
