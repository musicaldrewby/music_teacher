import {assertPhysicsReady} from './physics-playground';
import {Engine} from './engine';
import {mixSceneAudio} from './audio';
import {Scene,framePlan} from './scene';
import {stereoDimensions,type StereoEye} from './stereo';
import type {PathTraceSession} from './pathtrace';
import {Output,BufferTarget,CanvasSource,Mp4OutputFormat,WebMOutputFormat,canEncodeVideo,canEncodeAudio,AudioBufferSource} from 'mediabunny';
export function download(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
export type ExportOptions={format:'mp4'|'webm'|'png';width:number;height:number;fps:number;transparent:boolean;time:number;range?:{start:number;duration:number};signal:AbortSignal;progress:(value:number)=>void};
export function trimAudio(buffer:AudioBuffer,start:number,duration:number){const first=Math.round(start*buffer.sampleRate),length=Math.min(buffer.length-first,Math.round(duration*buffer.sampleRate));const result=new AudioBuffer({numberOfChannels:buffer.numberOfChannels,length,sampleRate:buffer.sampleRate});for(let c=0;c<buffer.numberOfChannels;c++)result.copyToChannel(buffer.getChannelData(c).subarray(first,first+length),c);return result;}
export async function renderExport(scene:Scene,options:ExportOptions){assertPhysicsReady(scene);
 const {format,height,fps,signal,progress}=options,codec=format==='mp4'?'avc':'vp9',stereo=scene.stereo.mode==='cinema';
 if(['vr180','vr360'].includes(scene.stereo.mode))throw Error('Immersive panoramas render in Blender. Download the Blender package for this scene.');
 const dimensions=stereoDimensions(scene.stereo.mode,scene.stereo.quality,height),width=stereo?dimensions.width:options.width,bitrate=stereo?32000000:16000000,range=options.range||{start:0,duration:scene.duration};
 if(format!=='png'){
  if(typeof VideoEncoder==='undefined')throw Error('Video export needs a browser with WebCodecs. Open this studio in current Chrome or Edge. You can still export PNG images.');
  if(!await canEncodeVideo(codec,{width,height,frameRate:fps,bitrate}))throw Error(`${format==='mp4'?'H.264':'VP9'} encoding at ${width}×${height} / ${fps} FPS is unavailable on this device. Try WebM, 720p per eye, or the Blender package.`);
 }
 const canvas=document.createElement('canvas'),engine=new Engine(canvas,false),packed=stereo?document.createElement('canvas'):null;let output:Output|undefined,trace:PathTraceSession|undefined;
 if(packed){packed.width=width;packed.height=height;}const ctx=packed?.getContext('2d');
 try{
  if(packed&&!ctx)throw Error('Could not create the stereo image canvas.');
  engine.resize(stereo?width/2:width,height);await engine.sync(scene);await engine.readyBackground();if(signal.aborted)throw Error('Export canceled');
  if(scene.renderSettings.engine==='path-traced'){const {PathTraceSession}=await import('./pathtrace');trace=await PathTraceSession.create(engine);}
  const frame=async(time:number,transparent:boolean,report:(v:number)=>void)=>{
   const draw=async(eye?:StereoEye,part=0)=>{if(signal.aborted)throw Error('Export canceled');const image=trace?await trace.frame(time,transparent,signal,p=>report(stereo?(part+p)/2:p),eye):(engine.render(time,transparent,undefined,eye),canvas);if(ctx)ctx.drawImage(image,part*width/2,0,width/2,height);};
   if(stereo){ctx!.clearRect(0,0,width,height);await draw('left',0);await draw('right',1);}else await draw();report(1);return packed||trace?.output||canvas;
  };
  if(format==='png'){const image=await frame(options.time,options.transparent,progress);const blob=await new Promise<Blob>((resolve,reject)=>image.toBlob(b=>b?resolve(b):reject(Error('Image encoding failed')),'image/png'));progress(1);return blob;}
  const target=new BufferTarget();output=new Output({format:format==='mp4'?new Mp4OutputFormat({fastStart:'in-memory'}):new WebMOutputFormat(),target});const source=new CanvasSource(packed||trace?.output||canvas,{codec,bitrate,keyFrameInterval:2});output.addVideoTrack(source,{frameRate:fps});
  const full=await mixSceneAudio(scene,fps),mixed=full&&(range.start!==0||range.duration!==scene.duration)?trimAudio(full,range.start,range.duration):full;let audio:AudioBufferSource|undefined;if(mixed){const audioCodec=format==='mp4'?'aac':'opus';if(!await canEncodeAudio(audioCodec,{numberOfChannels:mixed.numberOfChannels,sampleRate:mixed.sampleRate,bitrate:192000}))throw Error('Audio encoding is unavailable. Try another video format or disable sound in Scene.');audio=new AudioBufferSource({codec:audioCodec,bitrate:192000});output.addAudioTrack(audio);}await output.start();if(audio&&mixed)await audio.add(mixed);const frames=framePlan(range.duration,fps);
  for(let i=0;i<frames.length;i++){if(signal.aborted)throw Error('Export canceled');await frame(range.start+frames[i].time,false,p=>progress((i+p)/frames.length));await source.add(frames[i].time,frames[i].duration);if(i%8===0)await new Promise(r=>setTimeout(r,0));}
  source.close();await output.finalize();progress(1);return new Blob([target.buffer!],{type:format==='mp4'?'video/mp4':'video/webm'});
 }catch(e){if(output)await output.cancel().catch(()=>{});throw e;}finally{trace?.dispose();engine.dispose();}
}
