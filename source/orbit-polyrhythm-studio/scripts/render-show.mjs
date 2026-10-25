#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {ShowEngine} from '../dist/show-engine.js';
import {ShowVisuals} from '../dist/show-visuals.js';
import {normalizeShow,showDuration,summarizeShow} from '../dist/show-score.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2),get=(key,fallback)=>{const i=args.indexOf('--'+key);return i<0?fallback:args[i+1]};
let activeChild,lockPath,lockOwned=false,cancelled=false;
process.on('SIGINT',()=>{cancelled=true});process.on('SIGTERM',()=>{cancelled=true});
const digest=data=>createHash('sha256').update(data).digest('hex');
const hashFile=file=>digest(fs.readFileSync(file));
function atomic(file,value){fs.writeFileSync(file+'.tmp',JSON.stringify(value,null,2));fs.renameSync(file+'.tmp',file)}
function launch(cmd,args,stdin='ignore'){
 const p=spawn(cmd,args,{stdio:[stdin,'ignore','pipe']});let log='';p.stderr.on('data',d=>{log=(log+d).slice(-16000)});
 const done=new Promise((resolve,reject)=>{p.on('error',reject);p.on('close',code=>code===0?resolve():reject(Error(`${cmd} exited ${code}: ${log}`)))});done.catch(()=>{});return {p,done};
}
async function run(cmd,args){const child=launch(cmd,args);activeChild=child.p;await child.done;activeChild=null}
function wavHeader(frames,rate=48000){const n=frames*4;if(n>0xffffffff-36)throw Error('WAV exceeds the 4 GB RIFF limit.');const b=Buffer.alloc(44);b.write('RIFF');b.writeUInt32LE(n+36,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(2,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*4,28);b.writeUInt16LE(4,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n,40);return b}
async function canvasModule(){
 const attempts=[get('canvas-module',process.env.ORBIT_CANVAS_MODULE), 'skia-canvas'];
 if(process.env.CODEX_PRIMARY_RUNTIME_ROOT)attempts.push(path.join(process.env.CODEX_PRIMARY_RUNTIME_ROOT,'dependencies/python/lib/python3.12/site-packages/artifact_tool_v2/bin/node_modules/skia-canvas/lib/index.mjs'));
 for(const p of attempts.filter(Boolean)){try{return await import(p.startsWith('/')?pathToFileURL(p).href:p)}catch{}}
 throw Error('Install skia-canvas or set ORBIT_CANVAS_MODULE to its module path.');
}
async function main(){
 const input=args[0];if(!input||input.startsWith('--'))throw Error('Usage: node scripts/render-show.mjs show.json --out directory [--width 2560 --height 1440 --fps 60 --crf 16 --segment 30 --from 0 --to 60 --audio-only]');
 const score=normalizeShow(JSON.parse(fs.readFileSync(input,'utf8'))),fps=Number(get('fps',60)),width=Number(get('width',2560)),height=Number(get('height',1440)),segment=Number(get('segment',30)),audioOnly=args.includes('--audio-only'),crf=Number(get('crf',16));
 if(!Number.isInteger(crf)||crf<12||crf>28)throw Error('Use an integer CRF from 12 (largest) to 28 (smallest).');
 if(![24,30,60].includes(fps)||![width,height].every(v=>Number.isInteger(v)&&v>=240&&v<=3840&&v%2===0)||!Number.isInteger(segment)||segment<1||segment>120)throw Error('Use 24/30/60 fps, even dimensions 240–3840, and 1–120 second sections.');
 const duration=showDuration(score),from=Number(get('from',0)),to=Number(get('to',duration));if(!Number.isFinite(from)||!Number.isFinite(to)||from<0||to>duration+1e-7||to<=from)throw Error('Invalid preview interval.');
 const firstFrame=Math.floor(from*fps),lastFrame=Math.ceil(to*fps),startSample=Math.round(firstFrame*48000/fps),endSample=Math.min(Math.round(to*48000),Math.round(duration*48000)),renderSeconds=(endSample-startSample)/48000;
 const out=path.resolve(get('out',path.join(root,'renders',path.basename(input).replace(/\.json$/,'')))),cache=path.join(out,'sections');fs.mkdirSync(cache,{recursive:true});
 lockPath=path.join(out,'.render.lock');try{const fd=fs.openSync(lockPath,'wx');fs.writeSync(fd,String(process.pid));fs.closeSync(fd);lockOwned=true}catch{const pid=Number(fs.readFileSync(lockPath,'utf8'));let alive=true;try{process.kill(pid,0)}catch(e){if(e.code==='ESRCH')alive=false}if(alive)throw Error('Another render is using this output folder.');fs.unlinkSync(lockPath);fs.writeFileSync(lockPath,String(process.pid),{flag:'wx'});lockOwned=true}
 const font=Buffer.concat([0,1,2,3].map(i=>fs.readFileSync(path.join(root,`dist/assets/generaluser-${i}.bin`))));
 const files=['dist/show-score.js','dist/show-engine.js','dist/orbit-core.js','dist/show-visuals.js','dist/show-worlds.js','dist/visuals.js','dist/rhythm.js','dist/creative-settings.js','dist/generative.js','dist/phrases.js','dist/ambient.js','dist/dynamics.js','dist/factory-presets.js','dist/marimba-presets.js','dist/expanded-collections.js','dist/background-presets.js','dist/berlin-presets.js','dist/groove-trio-presets.js','dist/assets/synth.js','dist/assets/vorbis.js','scripts/render-show.mjs'];
 const config={fps,width,height,crf,segment,audioOnly,firstFrame,lastFrame,startSample,endSample},fingerprint=digest(JSON.stringify({score,config,code:files.map(f=>hashFile(path.join(root,f))),font:digest(font)})),manifestFile=path.join(out,'render-state.json');
 let manifest={fingerprint,config,sections:[]};if(fs.existsSync(manifestFile)){manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));if(manifest.fingerprint!==fingerprint)throw Error('The score, renderer, or output settings changed. Choose a new output folder to keep the earlier recording.');}
 // Trust only complete sections with matching contents; corrupt or partial output is re-rendered.
 manifest.sections=manifest.sections.filter(s=>{try{return hashFile(path.join(cache,s.audio))===s.audioHash&&(audioOnly||hashFile(path.join(cache,s.video))===s.videoHash)}catch{return false}});atomic(manifestFile,manifest);
 fs.writeFileSync(path.join(out,'show.orbit-show.json'),JSON.stringify(score,null,2));
 const reportFile=path.join(out,'quality-report.json');
 const engine=await new ShowEngine(48000).init(font.buffer.slice(font.byteOffset,font.byteOffset+font.length),score),samplePerFrame=48000/fps,l=new Float32Array(samplePerFrame),r=new Float32Array(samplePerFrame);
 let canvas,visuals,ctx;if(!audioOnly){const {Canvas}=await canvasModule();canvas=new Canvas(width,height);canvas.gpu=false;ctx=canvas.getContext('2d');visuals=new ShowVisuals((w,h)=>new Canvas(w,h));}
 let rendered=0,peak=0,energy=0,samples=0,silentSeconds=0,longestSilence=0,currentSilence=0,maxVoices=0;const sectionFrames=segment*fps;
 const sectionCount=Math.ceil((lastFrame-firstFrame)/sectionFrames),stopAfter=Number(get('stop-after-sections',Infinity));
 const begun=Date.now();
 // Replaying saved sections reconstructs voices, seeded decisions and reverb exactly.
 for(let f=0;f<firstFrame;f++){if(cancelled)throw Error('Render interrupted; completed sections are saved.');engine.process(l,r)}
 for(let index=0;index<sectionCount;index++){
  if(cancelled)throw Error('Render interrupted; completed sections are saved.');
  const start=firstFrame+index*sectionFrames,end=Math.min(lastFrame,start+sectionFrames),saved=manifest.sections.find(s=>s.index===index),base=String(index).padStart(5,'0'),audio=base+'.pcm',video=base+'.mp4';let fd,encoder;
  if(!saved){fd=fs.openSync(path.join(cache,audio+'.partial'),'w');if(!audioOnly){encoder=launch('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','rawvideo','-pixel_format','rgba','-video_size',`${width}x${height}`,'-framerate',String(fps),'-i','pipe:0','-an','-c:v','libx264','-preset','medium','-crf',String(crf),'-pix_fmt','yuv420p','-threads','2','-f','mp4',path.join(cache,video+'.partial')],'pipe');activeChild=encoder.p;}}
  try{
   for(let frame=start;frame<end;frame++){
    if(cancelled)throw Error('Render interrupted; completed sections are saved.');const n=Math.min(samplePerFrame,endSample-engine.frame);if(n<=0)break;engine.process(l.subarray(0,n),r.subarray(0,n));const pcm=saved?null:Buffer.allocUnsafe(n*4);let frameEnergy=0;
    for(let j=0;j<n;j++){if(!Number.isFinite(l[j])||!Number.isFinite(r[j]))throw Error('Non-finite audio detected.');peak=Math.max(peak,Math.abs(l[j]),Math.abs(r[j]));frameEnergy+=l[j]*l[j]+r[j]*r[j];if(pcm){pcm.writeInt16LE(Math.round(l[j]*32767),j*4);pcm.writeInt16LE(Math.round(r[j]*32767),j*4+2)}}
    energy+=frameEnergy;samples+=n*2;maxVoices=Math.max(maxVoices,...engine.decks.map(d=>d.core.synth.voiceCount));
    if(Math.sqrt(frameEnergy/(n*2))<.0001){currentSilence+=n/48000;silentSeconds+=n/48000;longestSilence=Math.max(longestSilence,currentSilence)}else currentSilence=0;
    if(!saved){fs.writeSync(fd,pcm);if(!audioOnly){visuals.draw(ctx,width,height,engine.snapshot());const bytes=await canvas.toBuffer('raw');await new Promise((resolve,reject)=>encoder.p.stdin.write(bytes,e=>e?reject(e):resolve()));if(!fs.existsSync(path.join(out,'poster.png'))&&engine.frame/48000>=Math.min(from+10,to-.1))await canvas.toFile(path.join(out,'poster.png'));}}
   }
   if(!saved){fs.closeSync(fd);fd=null;if(encoder){encoder.p.stdin.end();await encoder.done;activeChild=null;fs.renameSync(path.join(cache,video+'.partial'),path.join(cache,video))}fs.renameSync(path.join(cache,audio+'.partial'),path.join(cache,audio));manifest.sections.push({index,audio,audioHash:hashFile(path.join(cache,audio)),...(audioOnly?{}:{video,videoHash:hashFile(path.join(cache,video))})});atomic(manifestFile,manifest);rendered++;}
  }finally{if(fd!==null&&fd!==undefined)fs.closeSync(fd);if(encoder&&activeChild){encoder.p.kill();activeChild=null}}
  console.log(JSON.stringify({section:index+1,sections:sectionCount,status:saved?'restored':'saved',audioSeconds:+((engine.frame-startSample)/48000).toFixed(2),elapsedSeconds:Math.round((Date.now()-begun)/1000)}));
  if(rendered>=stopAfter){console.log('Checkpoint saved. Run the same command without --stop-after-sections to finish.');return}
 }
 const ordered=[...manifest.sections].sort((a,b)=>a.index-b.index);if(ordered.length!==sectionCount)throw Error('Incomplete sections.');
 const wav=path.join(out,'master.wav'),wfd=fs.openSync(wav+'.partial','w');fs.writeSync(wfd,wavHeader(endSample-startSample));const readBuffer=Buffer.alloc(1024*1024);try{for(const s of ordered){const fd=fs.openSync(path.join(cache,s.audio),'r');try{let n;while((n=fs.readSync(fd,readBuffer,0,readBuffer.length,null)))fs.writeSync(wfd,readBuffer,0,n)}finally{fs.closeSync(fd)}}}finally{fs.closeSync(wfd)}fs.renameSync(wav+'.partial',wav);
 if(!audioOnly){const list=path.join(cache,'concat.txt');fs.writeFileSync(list,ordered.map(s=>`file '${s.video}'`).join('\n'));await run('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','concat','-safe','1','-i',list,'-i',wav,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','256k','-t',String(renderSeconds),'-movflags','+faststart','-metadata',`title=${score.title}`,'-metadata',`artist=${score.artist}`,path.join(out,'performance.mp4')]);}
 const report={complete:true,fingerprint,title:score.title,durationSeconds:renderSeconds,sourceRange:{from:startSample/48000,to:endSample/48000},audio:{sampleRate:48000,channels:2,bitDepth:16,frames:endSample-startSample,peakDb:20*Math.log10(Math.max(peak,1e-12)),rmsDb:20*Math.log10(Math.max(Math.sqrt(energy/samples),1e-12)),limitedSamples:engine.limitedSamples,silentSeconds,longestSilence,maxVoices},video:audioOnly?null:{width,height,fps,crf,frames:lastFrame-firstFrame},sections:sectionCount,elapsedSeconds:(Date.now()-begun)/1000,warnings:longestSilence>10?['Review a quiet passage longer than ten seconds.']:[],show:summarizeShow(score)};
 atomic(reportFile,report);console.log(JSON.stringify({complete:true,output:out,report},null,2));
}
try{await main()}catch(e){activeChild?.kill();console.error(e.message);process.exitCode=1}finally{if(lockOwned)fs.unlinkSync(lockPath)}
