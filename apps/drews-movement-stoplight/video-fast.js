// Offline, timestamp-driven export. Playback speed and musical timing never change.
import * as Media from './vendor/mediabunny-1.24.0/mediabunny.min.mjs';

export async function chooseFormat(width,height,fps=30){
 if(!globalThis.VideoEncoder||!globalThis.AudioEncoder||!globalThis.OfflineAudioContext)return null;
 const video={width,height,bitrate:(height===720?6000000:10000000)*(fps===60?1.6:1),latencyMode:'realtime'};
 const audio={numberOfChannels:2,sampleRate:48000,bitrate:192000};
 for(const [v,a,ext]of [['avc','aac','mp4'],['vp8','opus','webm']]){
  try{if(await Media.canEncodeVideo(v,video)&&await Media.canEncodeAudio(a,audio))return{video:{...video,codec:v},audio:{...audio,codec:a},ext};}catch{}
 }
 return null;
}

// A seekable Blob target avoids retaining a second, ever-growing ArrayBuffer.
// MP4 can patch its header; WebM can patch duration and seek information.
export function blobWriter(type){
 let blob=new Blob([],{type});
 return{write({position,data}){
  if(position>blob.size)blob=new Blob([blob,new Uint8Array(position-blob.size)],{type});
  blob=new Blob([blob.slice(0,position),data,blob.slice(position+data.byteLength)],{type});
 },get blob(){return blob;},clear(){blob=new Blob([],{type});}};
}

export async function render({canvas,plan,format,fps=30,renderFrame,renderAudio,onProgress,isCancelled,onOutput}){
 fps=fps===60?60:30;
 const type='video/'+format.ext,writer=blobWriter(type);
 const output=new Media.Output({
  format:format.ext==='mp4'?new Media.Mp4OutputFormat({fastStart:false}):new Media.WebMOutputFormat(),
  target:new Media.StreamTarget(new WritableStream({write:chunk=>writer.write(chunk)}),{chunked:true,chunkSize:1024*1024})
 });
 const video=new Media.CanvasSource(canvas,{codec:format.video.codec,bitrate:format.video.bitrate,latencyMode:'realtime',keyFrameInterval:2});
 const audio=new Media.AudioBufferSource({codec:format.audio.codec,bitrate:format.audio.bitrate});
 output.addVideoTrack(video,{frameRate:fps});output.addAudioTrack(audio);onOutput(output);
 const check=()=>{if(isCancelled())throw new DOMException('Export cancelled.','AbortError');};
 try{
  check();await output.start();onProgress(0,'Mixing music…');
  let mixed=await renderAudio();check();onProgress(.03,'Encoding music…');
  await audio.add(mixed);mixed=null;audio.close();check();
  const frames=Math.ceil(plan.total*fps),began=performance.now();let lastUpdate=0;
  for(let i=0;i<frames;i++){
   check();const time=i/fps;
   renderFrame(i===frames-1?plan.total:time);
   await video.add(time,Math.min(1/fps,plan.total-time));
   const now=performance.now();
   if(now-lastUpdate>150||i===frames-1){const speed=(i+1)/fps/Math.max(.001,(now-began)/1000);onProgress(.06+.93*(i+1)/frames,`Fast rendering · ${fps} fps · ${Math.round((i+1)/frames*100)}% · ${speed.toFixed(1)}× playback speed`);lastUpdate=now;}
   // Let Cancel, progress painting, and other page controls run, without waiting for playback.
   if(i%8===0)await new Promise(resolve=>setTimeout(resolve,0));
  }
  check();video.close();onProgress(.99,'Finishing your video…');await output.finalize();check();
  const result=writer.blob;writer.clear();return result;
 }catch(error){await output.cancel().catch(()=>{});writer.clear();throw error;}
}
