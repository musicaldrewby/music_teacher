'use strict';
// The recorder and canvas read the same AudioContext clock as the existing band.
let videoSession=null,videoAssets={},videoAssetKey='',videoIdleFrame=0,videoIdleStart=0,videoScene='title',videoDownloadURL='',videoOpenGeneration=0;
const videoBaseNormalize=normalizeSong;
normalizeSong=function(raw){const s=videoBaseNormalize(raw);s.video=UkeVideoModel.options(raw.video,{...s,notation:raw.notation});return s;};
const videoBasePlan=playbackPlan;
playbackPlan=function(){return videoSession?.plan||videoBasePlan();};
const videoBaseWrite=writeStore;
writeStore=function(key,value){return videoBaseWrite(key,key==='uke-strum-draft-v2'&&videoSession?.originalSong?videoSession.originalSong:value);};
const videoBaseDraft=()=>videoSession?.originalSong||null;
window.UkeVideo={get originalSong(){return videoBaseDraft();},get active(){return !!videoSession;}};
function videoOptions(){return UkeVideoModel.options(song.video,song);}
function videoAPI(){return {score:typeof videoScoreData==='function'?videoScoreData():null,fingerings:CHORD_FINGERINGS,fingers:FINGERS,pattern:STRUM_PATTERNS[song.pattern].pattern,chord:chordAt,next:nextChange,pose:strumHandPose,countWord:n=>song.meter==='6/8'?compoundCountWords()[n-1]||String(n):String(n),lyrics(phase,counting){const all=playbackCues(phase,counting),current=all.find(c=>phase>=c.start&&phase<c.end)||null;return {current,next:current?all[all.indexOf(current)+1]:all.find(c=>c.start>phase)};}};}
function videoFormat(options=videoOptions()){return typeof MediaRecorder!=='undefined'&&typeof MediaRecorder.isTypeSupported==='function'?UkeVideoModel.format(options.format,type=>MediaRecorder.isTypeSupported(type)):null;}
function videoSupported(){return !!($('videoCanvas')?.captureStream&&ctx?.createMediaStreamDestination&&typeof MediaStream!=='undefined');}
function videoStatus(message,error=false){$('videoStatus').textContent=message;$('videoStatus').classList.toggle('is-error',error);}
function videoWait(promise,ms,message){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(message)),ms);})]).finally(()=>clearTimeout(timer));}
async function loadVideoAssets(){
 if(document.fonts)await videoWait(Promise.all([document.fonts.load('26px UkePrint'),document.fonts.load('700 100px UkeIsland')]),10000,'The video fonts took too long to load. Please try again.');
 const paths={background:collageArtSource({sunny:CUSTOM_ART_INDEX,sunset:CUSTOM_ART_INDEX+1,moonlight:5}[song.theme]??CUSTOM_ART_INDEX),hand:window.EMBEDDED_ART?.[STRUM_HAND_ASSET]||STRUM_HAND_ASSET,ukulele:window.EMBEDDED_ART?.[STRUM_UKULELE_ASSET]||STRUM_UKULELE_ASSET};
 const key=JSON.stringify(paths);if(key===videoAssetKey)return;
 const entries=await Promise.all(Object.entries(paths).map(([name,path])=>new Promise((resolve,reject)=>{const img=new Image();let timer=setTimeout(()=>reject(Error('The stage artwork took too long to load. Please try again.')),15000);img.onload=()=>{clearTimeout(timer);resolve([name,img]);};img.onerror=()=>{clearTimeout(timer);reject(Error('The stage artwork could not load. Please try again.'));};img.src=path;})));
 videoAssets=Object.fromEntries(entries);videoAssetKey=key;
}
function videoFormRead(){return UkeVideoModel.options({renderMode:$('videoRenderMode').value,sheetMusic:$('videoSheetMusic').checked,guideMelody:$('videoGuideMelody').checked,title:$('videoTitle').value.trim()===song.title?'':$('videoTitle').value.trim(),composer:$('videoComposer').value.trim(),performer:$('videoPerformer').value.trim(),ending:$('videoEnding').value.trim(),passes:$('videoPasses').value,intro:$('videoIntro').value,outro:$('videoOutro').value,transition:$('videoTransition').value,countIn:$('videoCountIn').checked,band:$('videoBand').checked,resolution:$('videoResolution').value,fps:$('videoFps').value,format:$('videoFormat').value},song);}
function videoSaveOptions(){if(videoSession)return;song.video=videoFormRead();changed();updateVideoSummary();}
function updateVideoSummary(){
 const scoreStatus=typeof UkeScorePlayback==='undefined'?{ready:false,message:'Add melody notes in Melody maker to show sheet music.'}:UkeScorePlayback.status(song);$('videoSheetMusic').disabled=!scoreStatus.ready;$('videoGuideMelody').disabled=!scoreStatus.ready;$('videoScoreNote').textContent=scoreStatus.ready?'Sheet music follows the band. Melody guide adds the written tune to the audio.':scoreStatus.message;
 const o=videoFormRead(),p=UkeVideoModel.plan(song,o),fast=o.renderMode==='fast'&&typeof beginFastVideo==='function',format=fast?{label:'MP4'}:videoFormat(o);$('videoPassDescription').textContent=o.passes===1?'Play once · no repeat':`Play the song ${o.passes} times`;
 $('videoEstimate').textContent=UkeVideoModel.duration(p.total);$('videoFormatLabel').textContent=format?format.label+' · '+o.resolution+'p · '+o.fps+' fps':'Video recording unavailable';
 $('videoExport').disabled=!format;$('videoExport').textContent=fast?'Render MP4 video':format?'Export '+format.label+' video':'Video export unavailable';$('videoFormat').disabled=fast;$('videoFormatField').hidden=fast;
 $('videoMixSummary').textContent=o.band?`Ukulele ${song.band.ukulele}% · Bass ${song.band.bass}% · Percussion ${song.band.drums}% · Shaker ${song.band.shaker}% · Mallets ${song.band.melody}%`:`Ukulele ${song.band.ukulele}% · backing band off`;
 $('videoLengthNote').textContent=p.total>900?'Choose fewer play-throughs: a single export can be up to 15 minutes.':fast?'Renders as fast as your device allows, with full-size H.264 video and AAC audio. No need to wait for the song to play.':`Live recording takes about ${UkeVideoModel.duration(p.total)}. Keep this tab visible until it finishes.`;
 if(p.total>900)$('videoExport').disabled=true;
}
function renderVideoAt(time,p){
 // Idle title/song/end previews use the proposed video plan without starting audio.
 const old=videoSession,oldRange=activeRange,oldLoop=song.loop,oldCount=transport.countUntil;
 if(!old){videoSession={plan:p,previewOnly:true};activeRange=null;song.loop=false;transport.countUntil=0;}
 try{UkeVideoRenderer.frame($('videoCanvas').getContext('2d'),time,p,song,videoAssets,videoAPI());}finally{if(!old){videoSession=null;activeRange=oldRange;song.loop=oldLoop;transport.countUntil=oldCount;}}
}
function idleVideoPreview(){
 cancelAnimationFrame(videoIdleFrame);if(!$('videoModal').open||videoSession)return;
 const p=UkeVideoModel.plan(song,videoFormRead()),elapsed=(performance.now()-videoIdleStart)/1000;
 const time=videoScene==='song'?p.musicStart+Math.min(p.length*p.stepSeconds-.01,3):videoScene==='ending'?p.musicEnd+p.wave+Math.min(2,p.options.outro-1.2):1.1+elapsed%Math.max(1,p.options.intro-1.1);
 renderVideoAt(time,p);videoIdleFrame=requestAnimationFrame(idleVideoPreview);
}
async function openVideoStudio(){
 if(videoSession||isViewer||isProjector)return;if(exerciseBackup)leaveExercise();stop();
 for(const id of ['optionsModal','classModal'])if($(id)?.open)$(id).close();
 const o=videoOptions();$('videoRenderMode').value=o.renderMode;$('videoSheetMusic').checked=o.sheetMusic;$('videoGuideMelody').checked=o.guideMelody;$('videoTitle').value=o.title||song.title;$('videoComposer').value=o.composer;$('videoPerformer').value=o.performer;$('videoEnding').value=o.ending;$('videoPasses').value=o.passes;$('videoIntro').value=o.intro;$('videoOutro').value=o.outro;$('videoTransition').value=o.transition;$('videoCountIn').checked=o.countIn;$('videoBand').checked=o.band;$('videoResolution').value=o.resolution;$('videoFps').value=String(o.fps);$('videoFormat').value=o.format;
 $('videoStageName').textContent=THEMES[song.theme];$('videoCanvas').width=1920;$('videoCanvas').height=1080;$('videoCanvas').hidden=false;$('videoResult').hidden=true;$('videoResult').pause();$('videoResult').removeAttribute('src');
 $('videoModal').showModal();videoStatus('Loading your stage artwork…');updateVideoSummary();const gen=++videoOpenGeneration;
 try{await loadVideoAssets();if(gen!==videoOpenGeneration||!$('videoModal').open)return;videoStatus('Preview your opening, song, and ending.');videoIdleStart=performance.now();idleVideoPreview();}catch(e){if(gen===videoOpenGeneration&&!videoSession)videoStatus(e.message,true);}
}
function setVideoBusy(busy){
 $('videoSettings').disabled=busy;$('videoPreview').disabled=busy;$('videoExport').disabled=busy;$('videoClose').disabled=busy;$('videoCancel').hidden=!busy;
 for(const node of document.querySelectorAll('[data-video-scene]'))node.disabled=busy;
 $('videoProgressWrap').hidden=!busy;
}
function cancelVideo(message='Video cancelled. Your song is ready to edit.'){const s=videoSession;if(!s||s.previewOnly)return;s.cancelled=true;s.message=message;s.endRequested=true;if(s.fast){s.output?.cancel().catch(()=>{});finishVideo(s);return;}if(s.recorder&&s.recorder.state!=='inactive'){try{s.recorder.stop();s.stopWatch=setTimeout(()=>finishVideo(s),4000);}catch{finishVideo(s);}}else finishVideo(s);}
function finishVideo(s){
 if(s.cleaned)return;s.cleaned=true;clearTimeout(s.stopWatch);clearTimeout(s.startWatch);cancelAnimationFrame(s.primeFrame);cancelAnimationFrame(s.frame);clearTimers();silence();
 try{s.silentSource?.stop();s.silentSource?.disconnect();}catch{}
 try{audioOutput?.gain.cancelScheduledValues(ctx.currentTime);if(audioOutput)audioOutput.gain.setValueAtTime(s.prior.outputGain,ctx.currentTime);}catch{}
 if(s.audioDestination){try{audioOutput.disconnect(s.audioDestination);}catch{}}
 for(const track of new Set([...(s.stream?.getTracks()||[]),...(s.capture?.getTracks()||[]),...(s.audioDestination?.stream.getTracks()||[])]))track.stop();s.wake?.release().catch(()=>{});
 song.loop=s.prior.loop;song.band=s.prior.band;activeRange=s.prior.range;midiOut=s.prior.midi;$('countIn').checked=s.prior.countIn;$('metronomeToggle').checked=s.prior.metronome;
 transport.state='stopped';transport.generation++;transport.pos=0;transport.tick=0;transport.queue=[];videoSession=null;renderAll();setVideoBusy(false);updateVideoSummary();
 if(s.cancelled){s.chunks=[];videoStatus(s.message||'Video cancelled.',true);}
 else if(s.recording){
  const blob=s.resultBlob||new Blob(s.chunks,{type:s.recorder?.mimeType||s.format.mime});s.chunks=[];
  if(blob.size<1024){videoStatus('The browser did not produce a complete video. Try another format or 720p.',true);}
  else{if(videoDownloadURL)URL.revokeObjectURL(videoDownloadURL);videoDownloadURL=URL.createObjectURL(blob);const link=$('videoDownload');link.href=videoDownloadURL;link.download=(s.options.title||song.title).replace(/[^\p{L}\p{N}_ -]/gu,'').trim().slice(0,90)+'_Uke_Strum.'+s.format.extension;link.textContent='Download '+s.format.label+' video · '+(blob.size/1048576).toFixed(1)+' MB';link.hidden=false;$('videoResult').src=videoDownloadURL;$('videoResult').hidden=false;$('videoCanvas').hidden=true;videoStatus(s.verified?'MP4 ready · '+s.verified.width+' × '+s.verified.height+' · '+s.verified.fps+' fps · H.264 + AAC. Rendered in '+UkeVideoModel.duration(s.renderSeconds)+'. Download to share.':'Your video is ready. Watch it below, then download it to share.');}
 }else videoStatus('Preview complete. Export when you are ready.');
 if(!s.recording||s.cancelled){videoScene='title';videoIdleStart=performance.now();try{idleVideoPreview();}catch{cancelAnimationFrame(videoIdleFrame);}}
}
// Some recorders wait for canvas data before firing start. Feed fresh frames while
// waiting, then begin the shared audio/video timeline only after start arrives.
function startVideoRecorder(s,formats,index=0){
 if(videoSession!==s||s.cancelled||s.cleaned)return;
 const format=formats[index];if(!format){cancelVideo(s.lastRecorderError||'The video recorder could not start. Try WebM, 720p, or another browser.');return;}
 let recorder;
 const retry=message=>{
  if(videoSession!==s||s.cancelled||s.cleaned||s.recorder!==recorder)return;
  if(s.started){cancelVideo(message);return;}
  clearTimeout(s.startWatch);cancelAnimationFrame(s.primeFrame);s.lastRecorderError=message;
  if(recorder){recorder.onstart=recorder.onstop=recorder.onerror=recorder.ondataavailable=null;try{if(recorder.state!=='inactive')recorder.stop();}catch{}}
  s.recorder=null;s.chunks=[];s.bytes=0;startVideoRecorder(s,formats,index+1);
 };
 s.format=format;videoStatus((index?'Trying another recorder · ':'Starting video recorder · ')+format.label+'…');
 $('videoElapsed').textContent='Starting…';$('videoFormatLabel').textContent=format.label+' · '+s.options.resolution+'p · '+s.options.fps+' fps';
 try{
  recorder=new MediaRecorder(s.stream,{mimeType:format.mime,videoBitsPerSecond:(s.options.resolution==='720'?4000000:7500000)*(s.options.fps===60?1.6:1),audioBitsPerSecond:192000});s.recorder=recorder;
  const current=()=>videoSession===s&&!s.cleaned&&!s.cancelled&&s.recorder===recorder;
  recorder.ondataavailable=e=>{if(!current()||!e.data.size)return;s.chunks.push(e.data);s.bytes+=e.data.size;if(s.bytes>450*1048576)cancelVideo('This video is too large for one export. Try 720p or fewer play-throughs.');};
  recorder.onerror=()=>retry('The browser could not start or finish the video. Try WebM, 720p, or another browser.');
  recorder.onstop=()=>{if(videoSession!==s||s.cleaned||s.recorder!==recorder)return;if(!s.started&&!s.cancelled){retry('The video recorder stopped before it started. Try WebM or 720p.');return;}if(!s.endRequested&&!s.cancelled){s.cancelled=true;s.message='Recording stopped early. Please try again.';}finishVideo(s);};
  recorder.onstart=()=>{if(!current()||s.started)return;clearTimeout(s.startWatch);cancelAnimationFrame(s.primeFrame);try{startVideoClock(s);}catch(e){cancelVideo(e.message||'Could not start the video timeline.');}};
  s.startWatch=setTimeout(()=>retry('The video recorder did not start. Try WebM, 720p, or another browser.'),8000);
  recorder.start(1000);
  const prime=()=>{if(!current()||s.started)return;try{renderVideoAt(0,s.plan);for(const track of s.capture.getVideoTracks())track.requestFrame?.();if(current()&&!s.started)s.primeFrame=requestAnimationFrame(prime);}catch(e){cancelVideo(e.message||'The video could not draw its opening frame.');}};
  prime();
 }catch(e){s.lastRecorderError=e.message||'Could not initialize the video recorder.';if(recorder)retry(s.lastRecorderError);else startVideoRecorder(s,formats,index+1);}
}
async function beginVideo(recording){
 if(videoSession)return;if(recording&&$('videoRenderMode').value==='fast'&&typeof beginFastVideo==='function')return beginFastVideo();videoSaveOptions();const options=videoOptions(),plan=UkeVideoModel.plan(song,options),format=videoFormat(options);
 if(plan.total>900){videoStatus('Please reduce play-throughs so the video is under 15 minutes.',true);return;}
 if(recording&&!format){videoStatus('This browser cannot record the selected format. Try Auto format or a different browser.',true);return;}
 stop(false);clearTimeout(autosaveTimer);writeStore('uke-strum-draft-v2',song);videoOpenGeneration++;cancelAnimationFrame(videoIdleFrame);$('videoResult').pause();$('videoResult').hidden=true;$('videoCanvas').hidden=false;$('videoDownload').hidden=true;setVideoBusy(true);$('videoProgress').removeAttribute('value');$('videoElapsed').textContent='Preparing…';videoStatus('Preparing your ukulele and backing band…');
 const s={recording,options,plan,format,originalSong:clone(song),prior:{loop:song.loop,band:clone(song.band),range:activeRange,midi:midiOut,countIn:$('countIn').checked,metronome:$('metronomeToggle').checked,outputGain:1},chunks:[],bytes:0,started:false,cancelled:false};videoSession=s;
 try{
  await videoWait(initAudio(),30000,'The instruments or audio could not get ready. Press Play once to enable sound, then try exporting again.');if(videoSession!==s||s.cancelled)return;
  s.prior.outputGain=audioOutput.gain.value;
  if(soundState!=='ready')throw Error('The sampled instruments must finish loading before video export. Open Band and retry the sounds.');
  videoStatus('Loading the video artwork and sheet music…');await loadVideoAssets();if(videoSession!==s||s.cancelled)return;
  if(recording&&!videoSupported())throw Error('Video recording is unavailable in this browser. The full video preview is still available.');
  song.loop=false;song.band={...song.band,enabled:options.band};activeRange=null;midiOut=null;$('countIn').checked=options.countIn;$('metronomeToggle').checked=false;
  const canvas=$('videoCanvas');canvas.width=options.resolution==='720'?1280:1920;canvas.height=options.resolution==='720'?720:1080;renderVideoAt(0,plan);
  if(recording){
   s.capture=canvas.captureStream(options.fps);s.audioDestination=ctx.createMediaStreamDestination();audioOutput.connect(s.audioDestination);s.stream=new MediaStream([...s.capture.getVideoTracks(),...s.audioDestination.stream.getAudioTracks()]);
   if(!s.stream.getVideoTracks().length||!s.stream.getAudioTracks().length)throw Error('Could not capture both the video and the band. Please try again.');
   // Supply continuous silence during titles and transitions, even before any
   // instrument has played, so the audio track is ready for encoder startup.
   s.silentSource=ctx.createBufferSource();s.silentSource.buffer=ctx.createBuffer(1,128,ctx.sampleRate);s.silentSource.loop=true;s.silentSource.connect(s.audioDestination);s.silentSource.start();
   startVideoRecorder(s,UkeVideoModel.formats(options.format,type=>MediaRecorder.isTypeSupported(type)));
  }else startVideoClock(s);
  if(navigator.wakeLock?.request)navigator.wakeLock.request('screen').then(lock=>{if(videoSession===s)s.wake=lock;else lock.release().catch(()=>{});}).catch(()=>{});
 }catch(e){if(videoSession!==s||s.cleaned)return;cancelVideo(e.message||'Could not start video export.');}
}
function startVideoClock(s){
 if(videoSession!==s||s.cancelled)return;s.started=true;s.clock=ctx.currentTime;s.lastFrame=performance.now();
 clearTimers();silence();makeGate();const p=s.plan;audioOutput.gain.cancelScheduledValues(ctx.currentTime);audioOutput.gain.setValueAtTime(0,s.clock);audioOutput.gain.setValueAtTime(0,s.clock+p.countStart-.12);audioOutput.gain.linearRampToValueAtTime(1,s.clock+p.countStart);
 const fade=Math.min(1.25,(p.scoreEnd-p.bodyEnd)*p.stepSeconds*.7);audioOutput.gain.setValueAtTime(1,s.clock+p.musicEnd-fade);audioOutput.gain.linearRampToValueAtTime(0,s.clock+p.musicEnd);
 transport.state='playing';transport.generation++;transport.countUntil=0;transport.tick=0;transport.origin=s.clock+p.musicStart;transport.pos=-p.countSteps*p.stepSeconds;transport.next=-p.countSteps;transport.endQueued=false;transport.queue=[];lastVisual=-999;schedule();videoTick();
}
function videoTick(){
 const s=videoSession;if(!s||!s.started||s.endRequested)return;
 try{
 if(ctx.state!=='running'){cancelVideo('Audio was interrupted. Keep this tab open and start the export again.');return;}
 if(document.hidden){cancelVideo('Export stopped because the tab was hidden. Keep this tab visible while recording.');return;}
 const now=performance.now();if(s.recording&&now-s.lastFrame>1500){cancelVideo('This device paused the video for too long. Try 720p and keep this tab visible.');return;}s.lastFrame=now;
 const time=ctx.currentTime-s.clock;while(transport.queue.length&&transport.queue[0].time<=ctx.currentTime){const event=transport.queue.shift();if(event.tick!==undefined)transport.tick=event.tick;}
 renderVideoAt(Math.min(time,s.plan.total),s.plan);
 const percentage=Math.min(100,time/s.plan.total*100);$('videoProgress').value=percentage;$('videoElapsed').textContent=UkeVideoModel.duration(time)+' / '+UkeVideoModel.duration(s.plan.total);
 if(!s.statusAt||now-s.statusAt>600){const sc=UkeVideoModel.scene(time,s.plan);videoStatus((s.recording?'Recording':'Previewing')+' · '+({title:'opening title','intro-wave':'ocean transition',song:sc.counting?'count-in':sc.ending?'final chord':`play-through ${sc.pass} of ${s.options.passes}`,'outro-wave':'closing wave',ending:'closing message',done:'finishing'}[sc.name])+' · '+UkeVideoModel.duration(Math.max(0,s.plan.total-time))+' remaining');s.statusAt=now;}
 if(time>=s.plan.total){s.endRequested=true;videoStatus(s.recording?'Finishing your video…':'Preview complete.');if(s.recorder){s.recorder.stop();s.stopWatch=setTimeout(()=>{if(!s.cleaned){s.cancelled=true;s.message='The browser could not finalize this recording. Please try 720p or another format.';finishVideo(s);}},8000);}else finishVideo(s);return;}
 s.frame=requestAnimationFrame(videoTick);
 }catch(e){cancelVideo(e.message||'The video could not draw the next frame. Please try again.');}
}
function initVideoStudio(){
 if(isViewer||isProjector)return;
 document.querySelector('.beach-header').insertAdjacentHTML('afterend','<div class="premium-toolbar"><span class="premium-edition">✦ TEACHER STUDIO</span><span class="premium-toolbar-copy">Make something worth sharing.</span><button id="openVideoStudio" class="premium-video-button">▸ Video studio</button><button id="openPracticeSheet">Practice sheet</button></div>');
 document.body.insertAdjacentHTML('beforeend',`<dialog id="videoModal" class="modal video-modal" aria-labelledby="videoHeading"><div class="modal-header"><div><div class="eyebrow">TEACHER STUDIO</div><h2 id="videoHeading">Your song. Its own little movie.</h2></div><button id="videoClose" aria-label="Close video studio">✕</button></div><div class="video-layout"><fieldset id="videoSettings" class="video-settings"><legend class="visually-hidden">Video settings</legend><label>Video title<input id="videoTitle" maxlength="120"></label><label>Composed by <span class="field-optional">optional</span><input id="videoComposer" maxlength="120" placeholder="Composer name"></label><label>Performed by <span class="field-optional">optional</span><input id="videoPerformer" maxlength="120" placeholder="e.g. Our fifth-grade ukulele club"></label><div class="video-field-row"><label>Play-throughs<span class="video-stepper"><button type="button" id="videoPassDown" aria-label="One fewer play-through">−</button><input id="videoPasses" type="number" min="1" max="99" value="1" aria-describedby="videoPassDescription"><button type="button" id="videoPassUp" aria-label="One more play-through">+</button></span></label><label>Transition<select id="videoTransition"><option value="wave">Ocean wave</option><option value="fade">Gentle fade</option><option value="page">Page turn</option><option value="iris">Soft iris reveal</option><option value="collage">Paper collage</option><option value="surf">Curling surf wave</option><option value="palms">Palm-leaf curtain</option><option value="sand">Sand lettering</option></select></label></div><p id="videoPassDescription" class="hint"></p><div class="video-field-row"><label>Title · seconds<input id="videoIntro" type="number" min="3" max="12" value="5"></label><label>Ending · seconds<input id="videoOutro" type="number" min="3" max="10" value="4"></label></div><label>Closing message<input id="videoEnding" maxlength="100" value="Thanks for playing!"></label><div class="video-field-row"><label>Quality<select id="videoResolution"><option value="1080">1080p · Full HD</option><option value="720">720p · smaller file</option></select></label><label id="videoFormatField">Video file<select id="videoFormat"><option value="auto">Auto · MP4 if available</option><option value="mp4">MP4</option><option value="webm">WebM</option></select></label></div><label>Export method<select id="videoRenderMode"><option value="fast">Fast MP4 render · recommended</option><option value="realtime">Live recording · real time</option></select></label><label>Motion quality<select id="videoFps"><option value="60">60 fps · smooth motion</option><option value="30">30 fps · smaller file</option></select></label><label class="check"><input id="videoCountIn" type="checkbox" checked>Count-in before the first play-through</label><label class="check"><input id="videoBand" type="checkbox" checked>Include backing band</label><p id="videoMixSummary" class="hint"></p><label class="check"><input id="videoSheetMusic" type="checkbox" checked>Show sheet music</label><label class="check"><input id="videoGuideMelody" type="checkbox">Include melody guide sound</label><p id="videoScoreNote" class="video-score-note"></p><button id="videoAdjustBand" type="button" class="small">Adjust the band mix</button><p class="hint">Uses the song’s lyrics, chord diagrams, and strumming-hand settings. Audio comes from the built-in instruments.</p></fieldset><div class="video-preview-column"><div class="video-preview-top"><span id="videoStageName"></span><span id="videoFormatLabel"></span></div><div class="video-screen"><canvas id="videoCanvas" width="1920" height="1080" aria-label="Preview of your song video"></canvas><video id="videoResult" controls playsinline hidden aria-label="Your finished song video"></video></div><div class="video-storyboard" aria-label="Preview a video scene"><button data-video-scene="title" class="active">1 · Opening</button><span aria-hidden="true">≈</span><button data-video-scene="song">2 · Song</button><span aria-hidden="true">≈</span><button data-video-scene="ending">3 · Ending</button></div><div class="video-duration"><span>Estimated length</span><strong id="videoEstimate">0:00</strong></div><p id="videoLengthNote" class="hint"></p><p id="videoStatus" class="video-status" role="status" aria-live="polite"></p><div id="videoProgressWrap" hidden><progress id="videoProgress" max="100" value="0"></progress><span id="videoElapsed"></span></div><div class="video-actions"><button id="videoPreview">▶ Preview full video</button><button id="videoExport" class="primary">Export video</button><button id="videoCancel" class="danger" hidden>Cancel</button></div><a id="videoDownload" class="video-download" hidden download>Download video</a></div></div></dialog>`);
 $('openVideoStudio').onclick=openVideoStudio;
 $('videoClose').onclick=()=>{$('videoModal').close();videoOpenGeneration++;cancelAnimationFrame(videoIdleFrame);$('videoResult').pause();$('openVideoStudio').focus();};
 $('videoModal').addEventListener('cancel',e=>{e.preventDefault();if(videoSession)cancelVideo();else $('videoClose').click();});
 $('videoSettings').addEventListener('input',videoSaveOptions);$('videoSettings').addEventListener('change',videoSaveOptions);
 for(const [id,delta]of [['videoPassDown',-1],['videoPassUp',1]])$(id).onclick=()=>{$('videoPasses').value=Math.max(1,Math.min(99,(+$('videoPasses').value||1)+delta));videoSaveOptions();};
 for(const button of document.querySelectorAll('[data-video-scene]'))button.onclick=()=>{videoScene=button.dataset.videoScene;$('videoResult').pause();$('videoResult').hidden=true;$('videoCanvas').hidden=false;for(const b of document.querySelectorAll('[data-video-scene]'))b.classList.toggle('active',b===button);idleVideoPreview();};
 $('videoPreview').onclick=()=>beginVideo(false);$('videoExport').onclick=()=>beginVideo(true);$('videoCancel').onclick=()=>cancelVideo();$('videoAdjustBand').onclick=()=>{$('videoClose').click();openBand();};
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&videoSession&&!videoSession.previewOnly&&!videoSession.fast)cancelVideo('The preview or export stopped when the tab was hidden. Keep this tab visible while recording.');});
 window.addEventListener('beforeunload',e=>{if(videoSession&&!videoSession.previewOnly){e.preventDefault();e.returnValue='';}});
 if(typeof initPracticeSheet==='function')initPracticeSheet();
}
