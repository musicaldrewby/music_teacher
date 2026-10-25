import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileSong,compileMIDI,getBankInfo,renderPCM,encodeWAV} from '../src/engine.js';
import {encodeMP3} from '../src/mp3.js';
const [input,outDir='test-output',reverb='room',amount='0.28']=process.argv.slice(2);
if(!input){console.error('Usage: node scripts/render.mjs <song.json|song.mid> <output-directory> [dry|room|hall] [reverb-amount]');process.exit(1);}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(await fs.readFile(path.join(root,'public/assets/soundfont/manifest.json'),'utf8'));
const bytes=Buffer.concat(await Promise.all(manifest.parts.map(p=>fs.readFile(path.join(root,'public/assets/soundfont',p.file)))));
const data=await fs.readFile(input),midi=/\.midi?$/i.test(input),compiled=midi?compileMIDI(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),path.basename(input)):compileSong(JSON.parse(data.toString('utf8')));
const {bank}=getBankInfo(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
const pcm=await renderPCM(compiled,bank,{reverb,reverbAmount:Number(amount)}),slug=compiled.title.normalize('NFKD').replace(/[^a-zA-Z0-9 -]/g,'').trim().replace(/\s+/g,'-')||'Drews-composition';
await fs.mkdir(outDir,{recursive:true});const wav=path.resolve(outDir,slug+'.wav'),mp3=path.resolve(outDir,slug+'.mp3');await fs.writeFile(wav,Buffer.from(encodeWAV(pcm)));await fs.writeFile(mp3,Buffer.from(encodeMP3(pcm)));console.log(JSON.stringify({wav,mp3,duration:pcm.duration,sampleRate:pcm.sampleRate,parts:compiled.parts.length,notes:compiled.noteCount}));
