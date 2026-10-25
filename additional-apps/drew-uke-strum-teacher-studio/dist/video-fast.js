'use strict';
// Offline band rendering + direct WebCodecs encoding: no wall-clock recording.
let fastVideoLibrary=null;
function loadFastVideoLibrary(){return fastVideoLibrary||(fastVideoLibrary=import(window.UKE_VIDEO_MODULE_URL||'./vendor/mediabunny.min.mjs').catch(e=>{fastVideoLibrary=null;throw e;}));}
function fastVideoAvailable(){return typeof VideoEncoder!=='undefined'&&typeof AudioEncoder!=='undefined'&&!!(window.OfflineAudioContext||window.webkitOfflineAudioContext);}
function fastVideoCheck(s){if(videoSession!==s||s.cancelled||s.cleaned)throw Error('Rendering cancelled.');if(s.renderError)throw s.renderError;}
const fastVideoYield=()=>new Promise(resolve=>setTimeout(resolve,0));
function fastVideoProgress(s,label,percent){fastVideoCheck(s);$('videoProgress').value=percent;$('videoElapsed').textContent=Math.floor(percent)+'%';videoStatus(label);}
function prepareOfflineVideoAudio(s){
 const p=s.plan,Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext;
 const offline=new Offline(2,Math.ceil(p.total*48000),48000);
 const saved={ctx,master,audioOutput,gate,ukeBus,midiOut,bandBus,bandBuses,roomBuffer,stringVoices,bassVoice,malletVoices,lastBandChord,origin:transport.origin,countUntil:transport.countUntil,voices:[...sampleVoices]};
 try{
  // The existing band scheduler runs synchronously against an isolated offline
  // graph. Restore every live reference BEFORE awaiting the audio render.
  ctx=offline;master=ctx.createGain();master.gain.value=.8;const comp=ctx.createDynamicsCompressor();comp.threshold.value=-12;comp.ratio.value=4;master.connect(comp);audioOutput=ctx.createGain();comp.connect(audioOutput);audioOutput.connect(ctx.destination);
  gate=null;ukeBus=null;midiOut=null;bandBus=null;bandBuses={};roomBuffer=null;sampleVoices.clear();makeGate();
  transport.origin=p.musicStart;transport.countUntil=0;
  audioOutput.gain.setValueAtTime(0,0);audioOutput.gain.setValueAtTime(0,Math.max(0,p.countStart-.12));audioOutput.gain.linearRampToValueAtTime(1,p.countStart);
  const fade=Math.min(1.25,(p.scoreEnd-p.bodyEnd)*p.stepSeconds*.7);audioOutput.gain.setValueAtTime(1,p.musicEnd-fade);audioOutput.gain.linearRampToValueAtTime(0,p.musicEnd);
  for(let phase=-p.countSteps;phase<p.finish;phase++){
   const tick=phase<0?0:mappedTick(phase,p),swing=phase>=0&&song.meter!=='6/8'&&tick%2?song.swing*p.stepSeconds:0,time=p.musicStart+phase*p.stepSeconds+swing;
   if(phase<0){const elapsed=phase+p.countSteps;if(elapsed%countStepSize()===0)click(time,countInAccent(elapsed));}
   else scheduleSongStep(tick,time,phase);
  }
 }finally{
  ctx=saved.ctx;master=saved.master;audioOutput=saved.audioOutput;gate=saved.gate;ukeBus=saved.ukeBus;midiOut=saved.midiOut;bandBus=saved.bandBus;bandBuses=saved.bandBuses;roomBuffer=saved.roomBuffer;stringVoices=saved.stringVoices;bassVoice=saved.bassVoice;malletVoices=saved.malletVoices;lastBandChord=saved.lastBandChord;transport.origin=saved.origin;transport.countUntil=saved.countUntil;sampleVoices.clear();for(const voice of saved.voices)sampleVoices.add(voice);
 }
 return offline;
}
async function validateFastVideo(M,buffer,width,height,total,fps){
 const input=new M.Input({source:new M.BufferSource(buffer),formats:[M.MP4]});
 try{
  const [video,audio]=await Promise.all([input.getPrimaryVideoTrack(),input.getPrimaryAudioTrack()]);
  if(!video||!audio)throw Error('The export is missing its video or audio track.');
  const [w,h,dw,dh,vc,ac,length]=await Promise.all([video.getCodedWidth(),video.getCodedHeight(),video.getDisplayWidth(),video.getDisplayHeight(),video.getCodec(),audio.getCodec(),input.computeDuration()]);
  if(w!==width||h!==height||dw!==width||dh!==height)throw Error('The exported video dimensions did not match the selected quality. Please try again.');
  if(vc!=='avc'||ac!=='aac')throw Error('The export did not contain H.264 video and AAC audio.');
  if(!Number.isFinite(length)||Math.abs(length-total)>Math.max(.2,2/fps))throw Error('The exported video has an incomplete duration. Please try again.');
  return {width:w,height:h,codec:'H.264 + AAC',duration:length,fps};
 }finally{input.dispose();}
}
async function beginFastVideo(){
 if(videoSession)return;
 videoSaveOptions();const options=videoOptions(),plan=UkeVideoModel.plan(song,options);
 if(!fastVideoAvailable()){videoStatus('Fast MP4 rendering is unavailable here. Try Chrome or Edge, or select Live recording.',true);return;}
 if(plan.total>900){videoStatus('Please reduce play-throughs so the video is under 15 minutes.',true);return;}
 stop(false);if(typeof stopMelody==='function')stopMelody();clearTimeout(autosaveTimer);writeStore('uke-strum-draft-v2',song);videoOpenGeneration++;cancelAnimationFrame(videoIdleFrame);$('videoResult').pause();$('videoResult').hidden=true;$('videoCanvas').hidden=false;$('videoDownload').hidden=true;setVideoBusy(true);$('videoProgress').removeAttribute('value');$('videoElapsed').textContent='Preparing…';
 const s={fast:true,recording:true,options,plan,format:{mime:'video/mp4',extension:'mp4',label:'MP4'},originalSong:clone(song),prior:{loop:song.loop,band:clone(song.band),range:activeRange,midi:midiOut,countIn:$('countIn').checked,metronome:$('metronomeToggle').checked,outputGain:audioOutput?.gain.value??1},chunks:[],bytes:0,cancelled:false,started:false,startedAt:performance.now()};videoSession=s;
 try{
  // Begin audio initialization inside the click gesture before loading the encoder.
  fastVideoProgress(s,'Loading your ukulele and backing band…',1);
  await videoWait(initAudio(),30000,'The sampled instruments could not load. Open Band and retry the sounds.');fastVideoCheck(s);s.prior.outputGain=audioOutput.gain.value;
  if(soundState!=='ready')throw Error('The sampled instruments could not load. Open Band and retry the sounds.');
  videoStatus('Preparing fast MP4 rendering…');const M=await videoWait(loadFastVideoLibrary(),20000,'The MP4 renderer could not load. Please try again.');fastVideoCheck(s);
  const width=options.resolution==='720'?1280:1920,height=options.resolution==='720'?720:1080,bitrate=(options.resolution==='720'?4000000:7500000)*(options.fps===60?1.6:1);
  const [videoOK,audioOK]=await videoWait(Promise.all([M.canEncodeVideo('avc',{width,height,frameRate:options.fps,bitrate}),M.canEncodeAudio('aac',{sampleRate:48000,numberOfChannels:2,bitrate:192000})]),15000,'The browser took too long to check MP4 support.');fastVideoCheck(s);
  if(!videoOK||!audioOK)throw Error('This browser cannot render H.264 + AAC MP4 at these settings. Try Chrome or Edge, 720p, or Live recording.');
  await loadVideoAssets();fastVideoCheck(s);
  song.loop=false;song.band={...song.band,enabled:options.band};activeRange=null;midiOut=null;transport.countUntil=0;transport.tick=0;$('countIn').checked=options.countIn;$('metronomeToggle').checked=false;
  const canvas=$('videoCanvas');canvas.width=width;canvas.height=height;renderVideoAt(0,plan);
  fastVideoProgress(s,'Rendering the full band audio…',3);await fastVideoYield();fastVideoCheck(s);
  const offline=prepareOfflineVideoAudio(s);let audio=await videoWait(offline.startRendering(),120000,'Audio rendering took too long. Try fewer play-throughs.');fastVideoCheck(s);
  const frames=Math.ceil(plan.total*options.fps),target=new M.BufferTarget(),output=new M.Output({target,format:new M.Mp4OutputFormat({fastStart:'reserve'})});s.output=output;
  const sizeCheck=packet=>{s.bytes+=packet.data.byteLength;if(s.bytes>450*1048576)s.renderError=Error('This video is too large for one export. Try 720p or fewer play-throughs.');};
  const videoSource=new M.CanvasSource(canvas,{codec:'avc',bitrate,latencyMode:'quality',sizeChangeBehavior:'deny',keyFrameInterval:2,onEncodedPacket:sizeCheck});
  const audioSource=new M.AudioBufferSource({codec:'aac',bitrate:192000,onEncodedPacket:sizeCheck});
  output.addVideoTrack(videoSource,{frameRate:options.fps,maximumPacketCount:frames+10});output.addAudioTrack(audioSource,{maximumPacketCount:Math.ceil(plan.total*48000/1024)+20});
  output.setMetadataTags({title:options.title||song.title,...(options.composer?{artist:options.composer}:{})});
  await output.start();fastVideoCheck(s);
  fastVideoProgress(s,'Encoding the band audio…',6);await videoWait(audioSource.add(audio),120000,'The audio encoder did not finish. Try fewer play-throughs.');audio=null;audioSource.close();fastVideoCheck(s);
  s.renderStartedAt=performance.now();let yielded=s.renderStartedAt;s.started=true;
  for(let i=0;i<frames;i++){
   fastVideoCheck(s);const time=i/options.fps;renderVideoAt(time,plan);
   await videoWait(videoSource.add(time,1/options.fps),30000,'The video encoder stopped responding. Try 720p or another browser.');
   const now=performance.now();if(now-yielded>=70||i===frames-1){const fraction=(i+1)/frames,elapsed=(now-s.renderStartedAt)/1000,speed=elapsed>0?(i+1)/options.fps/elapsed:0;fastVideoProgress(s,'Rendering MP4 · '+Math.floor(fraction*100)+'%'+(elapsed>1?' · '+speed.toFixed(1)+'× playback speed':''),10+fraction*86);yielded=now;await fastVideoYield();}
  }
  videoSource.close();fastVideoProgress(s,'Finishing your MP4…',97);await videoWait(output.finalize(),30000,'The MP4 file could not finish. Please try again.');fastVideoCheck(s);
  fastVideoProgress(s,'Checking video dimensions and audio…',99);s.verified=await validateFastVideo(M,target.buffer,width,height,plan.total,options.fps);fastVideoCheck(s);
  s.resultBlob=new Blob([target.buffer],{type:'video/mp4'});s.endRequested=true;s.renderSeconds=(performance.now()-s.startedAt)/1000;finishVideo(s);
 }catch(e){if(s.output&&s.output.state!=='finalized')await s.output.cancel().catch(()=>{});if(videoSession===s&&!s.cleaned)cancelVideo(e.message||'The MP4 could not be rendered. Please try again.');}
}
