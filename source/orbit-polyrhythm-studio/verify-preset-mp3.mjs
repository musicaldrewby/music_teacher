import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {execFileSync} from 'node:child_process';
import {presetAudioScore,presetAudioBytes} from './dist/preset-audio-score.js';
import {getFactoryPreset} from './dist/factory-presets.js';
const state=getFactoryPreset('Window Seat');
assert.equal(presetAudioBytes(10,'mp3'),24000000);assert.equal(presetAudioBytes(60,'mp3'),144000000);
const font=Buffer.concat([0,1,2,3].map(i=>fs.readFileSync(`dist/assets/generaluser-${i}.bin`)));
const workerURL=new URL('./dist/show-mp3-worker.js',import.meta.url).href;
async function render(minutes,{cancel=false}={}){
 return new Promise((resolve,reject)=>{
  const code=`const {parentPort}=require('node:worker_threads'),fs=require('node:fs'),vm=require('node:vm');globalThis.self={postMessage:(m,t)=>parentPort.postMessage(m,t)};globalThis.importScripts=(file)=>vm.runInThisContext(fs.readFileSync(new URL(file,${JSON.stringify(workerURL)}),'utf8'));const ready=import(${JSON.stringify(workerURL)});parentPort.on('message',async m=>{await ready;self.onmessage({data:m})});`;
  const worker=new Worker(code,{eval:true}),begun=performance.now(),buffers=[];let frames=0,maxChunk=0,progress=-1;
  const timer=setTimeout(()=>fail(Error('MP3 render timed out')),300000);
  function fail(e){clearTimeout(timer);worker.terminate();reject(e);}
  worker.on('error',fail);worker.on('message',m=>{try{
   if(m.type==='error')throw Error(m.message);
   if(m.type==='ready'){frames=m.frames;assert.equal(frames,minutes*60*48000);}
   if(m.type==='chunk'){assert(m.progress>progress);progress=m.progress;assert(m.data.byteLength<64000);maxChunk=Math.max(maxChunk,m.data.byteLength);buffers.push(Buffer.from(m.data));worker.postMessage({type:cancel?'cancel':'ack'});}
   if(m.type==='done'||m.type==='cancelled'){clearTimeout(timer);worker.terminate();resolve({buffer:Buffer.concat(buffers),type:m.type,frames,chunks:buffers.length,maxChunk,progress,elapsedSeconds:+((performance.now()-begun)/1000).toFixed(2)});}
  }catch(e){fail(e);}});
  const bytes=font.buffer.slice(font.byteOffset,font.byteOffset+font.byteLength);worker.postMessage({type:'render',font:bytes,score:presetAudioScore(state,minutes)},[bytes]);
 });
}
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'orbit-mp3-'));
try{
 const full=await render(10);assert.equal(full.type,'done');assert.equal(full.chunks,601,'600 bounded audio chunks plus final encoder flush');assert.equal(full.progress,1);
 const file=path.join(temp,'ten-minute.mp3');fs.writeFileSync(file,full.buffer);
 const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_format','-show_streams','-of','json',file],{encoding:'utf8'}));
 const audio=probe.streams[0];assert.equal(audio.codec_name,'mp3');assert.equal(audio.channels,2);assert.equal(audio.sample_rate,'48000');assert.equal(audio.bit_rate,'320000');assert(Math.abs(+probe.format.duration-600)<.1);assert(Math.abs(full.buffer.length-24000000)<4000);
 execFileSync('ffmpeg',['-v','error','-i',file,'-f','null','-'],{stdio:['ignore','ignore','pipe']});
 function level(start,duration){const pcm=execFileSync('ffmpeg',['-v','error','-ss',String(start),'-i',file,'-t',String(duration),'-f','f32le','-'],{maxBuffer:4000000});let peak=0,sum=0;for(let i=0;i<pcm.length;i+=4){const x=pcm.readFloatLE(i);assert(Number.isFinite(x));peak=Math.max(peak,Math.abs(x));sum+=x*x;}return {peak,rms:Math.sqrt(sum/(pcm.length/4))};}
 const middle=level(30,2),tail=level(599.95,.05);assert(middle.peak>.01);assert(middle.peak<1);assert(tail.peak<.001);
 const cancellation=await render(60,{cancel:true});assert.equal(cancellation.type,'cancelled');assert.equal(cancellation.chunks,1);
 const {buffer,...summary}=full,{buffer:partial,...cancelSummary}=cancellation;
 const report={tenMinuteMp3:{...summary,bytes:buffer.length,durationSeconds:+probe.format.duration,codec:audio.codec_name,sampleRate:+audio.sample_rate,channels:audio.channels,bitRate:+audio.bit_rate,middle,tail},hourCancellation:cancelSummary,fullDecodePassed:true,browserQA:false};
 fs.writeFileSync('preset-mp3-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true});}
