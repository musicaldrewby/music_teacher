// Real H.264/AAC codec packets with Native Canvas exercise the shipped render
// loop, B-frame composition times and AAC priming. This is not browser QA.
import fs from 'node:fs';
import {spawn,execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {renderVideo} from '../dist/offline-video.mjs';
import {newProject,validateProject,addCue,showTiming} from '../dist/project.mjs';
import {setSceneAssets} from '../dist/scene.mjs';
const {createCanvas,loadImage,GlobalFonts}=createRequire(import.meta.url)('@napi-rs/canvas');
const out='/workspace/scratch/d11c79fdfaca/creator-qa';fs.mkdirSync(out,{recursive:true});
for(const name of ['studio-sans','studio-sans-bold'])GlobalFonts.registerFromPath(new URL('../dist/assets/fonts/'+name+'.ttf',import.meta.url).pathname,'Studio Sans');
setSceneAssets({woodland:await loadImage(new URL('../dist/assets/art/woodland.png',import.meta.url).pathname),felt:await loadImage(new URL('../dist/assets/art/movements-felt.png',import.meta.url).pathname)});
const data=new Float32Array(48000*3);data[33600]=.8;
const backing={duration:3,sampleRate:48000,numberOfChannels:1,getChannelData:()=>data};
globalThis.document={createElement:()=>createCanvas(1920,1080)};
globalThis.VideoFrame=class{constructor(canvas,opts){Object.assign(this,opts);this.bytes=Buffer.from(canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data);}close(){}};
globalThis.AudioData=class{constructor(opts){Object.assign(this,opts);}close(){}};
class Chunk{constructor(bytes,opts){this.bytes=bytes;this.byteLength=bytes.length;Object.assign(this,opts);}copyTo(target){target.set(this.bytes);}}
globalThis.EncodedVideoChunk=Chunk;globalThis.EncodedAudioChunk=Chunk;
const unhex=text=>Buffer.from(text.trim().split('\n').map(line=>line.split(':')[1]?.split('  ')[0].replace(/\s/g,'')||'').join(''),'hex');
class FFEncoder{
 constructor(opts){this.opts=opts;this.encodeQueueSize=0;this.state='unconfigured';this.stamps=[];}
 static async isConfigSupported(config){return {supported:true,config};}
 configure(config){this.config=config;this.video=!!config.width;this.path=out+(this.video?'/codec-video.mp4':'/codec-audio.m4a');const args=this.video?['-f','rawvideo','-pixel_format','rgba','-video_size',config.width+'x'+config.height,'-framerate','60','-i','pipe:0','-an','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-bf','2','-g','120']:['-f','f32le','-ar','48000','-ac','2','-i','pipe:0','-c:a','aac','-b:a','192k'];this.proc=spawn('ffmpeg',['-y','-v','error',...args,this.path],{stdio:['pipe','ignore','pipe']});this.finished=new Promise((resolve,reject)=>{let stderr='';this.proc.stderr.on('data',s=>stderr+=s);this.proc.on('error',reject);this.proc.on('close',c=>c===0?resolve():reject(new Error(stderr)));});this.state='configured';}
 encode(frame){this.stamps.push(frame.timestamp);let bytes;if(this.video)bytes=frame.bytes;else{const interleaved=new Float32Array(frame.numberOfFrames*2);for(let i=0;i<frame.numberOfFrames;i++){interleaved[2*i]=frame.data[i];interleaved[2*i+1]=frame.data[frame.numberOfFrames+i];}bytes=Buffer.from(interleaved.buffer);}this.encodeQueueSize++;this.proc.stdin.write(bytes,()=>this.encodeQueueSize--);}
 async flush(){this.proc.stdin.end();await this.finished;const data=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_packets','-show_data','-of','json',this.path],{maxBuffer:50000000}));const desc=unhex(data.streams[0].extradata);for(const [i,p]of data.packets.entries()){const bytes=unhex(p.data),meta=i===0?{decoderConfig:{...this.config,description:desc.buffer.slice(desc.byteOffset,desc.byteOffset+desc.length)}}:{};this.opts.output(new Chunk(bytes,{timestamp:Math.round(Number(p.pts_time)*1e6),duration:Math.round(Number(p.duration_time)*1e6),type:p.flags.includes('K')?'key':'delta'}),meta);}for(let i=1;i<this.stamps.length;i++)assert.ok(this.stamps[i]>this.stamps[i-1],'monotonic input times');}
 close(){this.state='closed';if(this.proc?.exitCode===null)this.proc.kill();}
}
globalThis.VideoEncoder=FFEncoder;globalThis.AudioEncoder=FFEncoder;
let p=validateProject({...newProject(),title:'Your song. Your show.',audio:{id:'fixture',name:'Timing pulse.wav',duration:3},trimIn:.25,trimOut:1.25,volume:1,show:{...newProject().show,titleSeconds:1,instructionSeconds:1,endSeconds:1,fadeIn:0,fadeOut:0}});p=validateProject({...p,rhythm:{...p.rhythm,enabled:true,bpm:120,meter:'6/8'}});p=addCue(p,.3,'pat','',3,{rhythm:'compound',slots:[0,1,2]});p=addCue(p,.7,'clap','',2,{rhythm:'swing'});p=addCue(p,1.2,'pat');
const result=await renderVideo(p,backing);const file=out+'/creator-1080p60-integration.mp4';fs.writeFileSync(file,Buffer.from(await result.blob.arrayBuffer()));
const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',file]));const video=probe.streams.find(s=>s.codec_type==='video'),audio=probe.streams.find(s=>s.codec_type==='audio');
assert.equal(video.codec_name,'h264');assert.equal(audio.codec_name,'aac');assert.equal(Number(video.nb_read_frames),result.frames);assert.equal(video.r_frame_rate,'60/1');assert.equal(video.width,1920);assert.equal(video.height,1080);assert.ok(Math.abs(Number(video.duration)-result.videoSeconds)<.002);assert.ok(Math.abs(Number(audio.duration)-result.videoSeconds)<.002);
execFileSync('ffmpeg',['-v','error','-i',file,'-f','null','-'],{stdio:'pipe'});
const pcm=execFileSync('ffmpeg',['-v','error','-i',file,'-vn','-f','f32le','-ar','48000','-ac','1','pipe:1'],{maxBuffer:3000000});const samples=new Float32Array(pcm.buffer,pcm.byteOffset,pcm.length/4);let peak=0;for(let i=0;i<samples.length;i++)if(Math.abs(samples[i])>Math.abs(samples[peak]))peak=i;
const expected=Math.round((showTiming(p).lead+.7-p.trimIn)*48000);assert.ok(Math.abs(peak-expected)<48,'AAC timing drift: '+(peak-expected)+' samples');
const secondStart=Math.round((showTiming(p).lead+.7+1/3-p.trimIn)*48000),secondPeak=samples.subarray(secondStart,secondStart+6000).reduce((a,v)=>Math.max(a,Math.abs(v)),0);assert.ok(secondPeak>.025,'Swung second clap must be audible in the encoded MP4');
for(const at of [.3,.3+1/6,.3+1/3]){const start=Math.round((showTiming(p).lead+at-p.trimIn)*48000);assert.ok(samples.subarray(start,start+1800).some(v=>Math.abs(v)>.015),'Compound hit audible at '+at);}
console.log(JSON.stringify({file,frames:result.frames,fps:video.r_frame_rate,videoSeconds:video.duration,audioSeconds:audio.duration,audioSyncErrorSamples:peak-expected,secondClapPeak:secondPeak,elapsed:result.elapsed,decode:'H.264 B-frames + AAC valid',note:'Native codec surrogate; interactive browser QA unavailable'}));
