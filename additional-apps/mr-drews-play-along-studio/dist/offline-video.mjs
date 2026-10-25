import {Muxer,ArrayBufferTarget} from './vendor/mp4-muxer.mjs';
import {drawScene} from './scene.mjs';
import {showTiming} from './project.mjs';
import {audioPiece} from './track.mjs';
export const FPS=60,RATE=48000;
const yieldUI=()=>new Promise(resolve=>setTimeout(resolve,0));
export const offlineVideoAvailable=()=>!!(globalThis.VideoEncoder&&globalThis.AudioEncoder&&globalThis.VideoFrame&&globalThis.AudioData);
export function exportTiming(p){const seconds=showTiming(p).total,frames=Math.ceil((seconds+.15)*FPS-1e-7);return {seconds,frames,fps:FPS,videoSeconds:frames/FPS};}
export async function exportCodecs(resolution='1080'){
 if(!offlineVideoAvailable())throw new Error('60 FPS MP4 export needs a browser with H.264 and AAC encoding. Try current desktop Chrome or Edge.');
 const width=resolution==='720'?1280:1920,height=resolution==='720'?720:1080;let video;
 for(const hardwareAcceleration of ['prefer-hardware','no-preference']){for(const codec of ['avc1.64002a','avc1.4d002a','avc1.42002a']){
  const config={codec,width,height,framerate:FPS,bitrate:width===1920?14000000:8000000,hardwareAcceleration,latencyMode:'quality',avc:{format:'avc'}};
  try{if((await VideoEncoder.isConfigSupported(config)).supported){video=config;break;}}catch{}
 }if(video)break;}
 const audio={codec:'mp4a.40.2',sampleRate:RATE,numberOfChannels:2,bitrate:192000};
 if(!video||!(await AudioEncoder.isConfigSupported(audio)).supported)throw new Error('This browser cannot encode this 60 FPS MP4. Try the 720p option or current desktop Chrome or Edge.');
 return {video,audio};
}
export async function renderVideo(p,backing,{signal,onProgress=()=>{},codecs,resolution='1080'}={}){
 if(!backing||!p.audio||p.trimOut<=p.trimIn)throw new Error('Load your audio and select a song segment first.');
 if(p.trimOut>backing.duration+.01)throw new Error('The audio attachment is shorter than the selected segment.');
 codecs=codecs||await exportCodecs(resolution);const timing=exportTiming(p),target=new ArrayBufferTarget(),{width,height}=codecs.video;
 const muxer=new Muxer({target,video:{codec:'avc',width,height,frameRate:FPS},audio:{codec:'aac',sampleRate:RATE,numberOfChannels:2},fastStart:'in-memory',firstTimestampBehavior:'offset'});
 let failure,videoChunks=0,audioChunks=0,firstAudio;
 const check=()=>{if(signal?.aborted)throw new DOMException('Export cancelled.','AbortError');if(failure)throw failure;};
 const ve=new VideoEncoder({output:(chunk,meta)=>{try{muxer.addVideoChunk(chunk,meta,undefined,chunk.timestamp-Math.round(videoChunks/FPS*1e6));videoChunks++;}catch(e){failure=e;}},error:e=>failure=e});
 const ae=new AudioEncoder({output:(chunk,meta)=>{try{if(firstAudio===undefined){firstAudio=chunk.timestamp;muxer.setAudioTiming(Math.max(0,Math.round(-firstAudio*RATE/1e6)),timing.videoSeconds);}const bytes=new Uint8Array(chunk.byteLength);chunk.copyTo(bytes);muxer.addAudioChunkRaw(bytes,chunk.type,chunk.timestamp-firstAudio,chunk.duration||1024/RATE*1e6,meta);audioChunks++;}catch(e){failure=e;}},error:e=>failure=e});
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d',{alpha:false});
 const started=performance.now();
 try{
  check();ve.configure(codecs.video);ae.configure(codecs.audio);
  for(let base=0;base<timing.frames;base+=FPS){
   check();const end=Math.min(timing.frames,base+FPS),from=base/FPS,span=(end-base)/FPS,channels=audioPiece(p,backing,from,Math.round(span*RATE));
   for(let n=0;n<channels[0].length;n+=1024){
    check();const count=Math.min(1024,channels[0].length-n),data=new Float32Array(count*2);data.set(channels[0].subarray(n,n+count));data.set(channels[1].subarray(n,n+count),count);
    const audioFrame=new AudioData({format:'f32-planar',sampleRate:RATE,numberOfFrames:count,numberOfChannels:2,timestamp:Math.round((from+n/RATE)*1e6),data});
    try{ae.encode(audioFrame);}finally{audioFrame.close();}while(ae.encodeQueueSize>24){await yieldUI();check();}
   }
   for(let f=base;f<end;f++){
    check();drawScene(ctx,p,Math.min(timing.seconds,f/FPS),{exporting:true});
    const timestamp=Math.round(f/FPS*1e6),frame=new VideoFrame(canvas,{timestamp,duration:Math.round((f+1)/FPS*1e6)-timestamp});
    try{ve.encode(frame,{keyFrame:f%(FPS*2)===0});}finally{frame.close();}
    while(ve.encodeQueueSize>6){await yieldUI();check();}
    if(f%8===0){onProgress({progress:(f+1)/timing.frames*.97,seconds:(f+1)/FPS,total:timing.videoSeconds,elapsed:(performance.now()-started)/1000});await yieldUI();}
   }
  }
  await Promise.all([ve.flush(),ae.flush()]);check();onProgress({progress:.99,seconds:timing.videoSeconds,total:timing.videoSeconds,elapsed:(performance.now()-started)/1000});await yieldUI();check();
  if(videoChunks!==timing.frames||!audioChunks)throw new Error('The browser returned an incomplete video. Please retry at 720p.');
  muxer.finalize();check();return {blob:new Blob([target.buffer],{type:'video/mp4'}),...timing,width,height,elapsed:(performance.now()-started)/1000};
 }finally{if(ve.state!=='closed')ve.close();if(ae.state!=='closed')ae.close();canvas.width=canvas.height=1;}
}
