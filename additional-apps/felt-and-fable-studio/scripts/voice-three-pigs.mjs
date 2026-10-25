// Reproducible local narration using Felt & Fable's shipped neural voice engine.
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {assembleStandalone} from './assemble-standalone.mjs';
const root=path.resolve('story-source/three-little-pigs');
await fs.mkdir(root+'/voice',{recursive:true});
const standalone=await assembleStandalone();
const {createNeuralEngine}=await import(pathToFileURL(standalone+'/js/neural-engine.mjs'));
const engine=await createNeuralEngine({readBytes:async name=>new Uint8Array(await fs.readFile('asset-packs/assets/neural-v1/'+name))});
const beats=JSON.parse(await fs.readFile(root+'/beats.json','utf8'));
const profile={speaker:'bm_fable',speed:.97,delivery:'normal'};
try{for(let i=0;i<beats.length;i++){
 const [name,text,action]=beats[i],key=createHash('sha256').update(JSON.stringify([text,profile])).digest('hex').slice(0,16),file=root+'/voice/'+key+'.mp3';
 let duration=0;
 if(text){try{await fs.access(file)}catch{
  const r=await engine.synthesize(text,profile);
  const raw=Buffer.from(r.samples.buffer,r.samples.byteOffset,r.samples.byteLength);
  execFileSync('ffmpeg',['-v','error','-y','-f','f32le','-ar',String(r.sampleRate),'-ac','1','-i','pipe:0','-codec:a','libmp3lame','-b:a','96k',file],{input:raw});
 }
 duration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',file],{encoding:'utf8'}).trim());}
 beats[i]={id:String(i+1).padStart(2,'0'),name,text,action,file:text?'voice/'+key+'.mp3':null,duration};
 await fs.writeFile(root+'/voiced-beats.json',JSON.stringify(beats.slice(0,i+1),null,2));
 console.log((i+1)+'/'+beats.length+' '+name+' '+duration.toFixed(2)+'s');
}}finally{await engine.dispose()}
