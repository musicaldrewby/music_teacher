import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {SoundBankLoader,SpessaLog} from 'spessasynth_core';
SpessaLog.setLogLevel(false,false,false);
const bytes=await readFile('/workspace/scratch/22d71d65eefc/upload/FluidR3_GM2-2(1).SF2');
const bank=SoundBankLoader.fromArrayBuffer(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
const presets=bank.presets.map(p=>{const keys=Array.from({length:128},(_,n)=>n).filter(n=>p.getVoiceParameters(n,100).length);return{name:p.name.replace(/\0/g,'').trim(),program:p.program,bankMSB:p.bankMSB,bankLSB:p.bankLSB,isDrum:p.isDrum,minKey:Math.min(...keys),maxKey:Math.max(...keys)}}).sort((a,b)=>Number(a.isDrum)-Number(b.isDrum)||a.bankMSB-b.bankMSB||a.bankLSB-b.bankLSB||a.program-b.program);
await mkdir('dist/assets',{recursive:true});
const chunks=[];for(let pos=0,i=0;pos<bytes.length;pos+=20*1024*1024,i++){const name=`fluid-r3-${String(i+1).padStart(2,'0')}.bin`;await writeFile('dist/assets/'+name,bytes.subarray(pos,pos+20*1024*1024));chunks.push({url:'assets/'+name,bytes:Math.min(20*1024*1024,bytes.length-pos)})}
await writeFile('dist/assets/font.json',JSON.stringify({name:'Fluid R3 GM',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),chunks,presets}));
await writeFile('dist/assets/SPESSASYNTH-LICENSE.txt',await readFile('node_modules/spessasynth_core/LICENSE'));
console.log(JSON.stringify({presets:presets.length,chunks:chunks.length,bytes:bytes.length}));
