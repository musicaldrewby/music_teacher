'use strict';
let phraseCodecToken=0,phraseExportPreparing=false;
async function phraseExportOpen(){
 if(exportJob||phraseExportPreparing)return;phrasePause();stopAnimationPreview();stopStoryPlayback();cinemaStopCuePreview();
 const status=phraseTimingStatus(state);
 if(!status.complete){await phraseOpen();if(phraseRun){$('phraseSetup').open=true;phraseMessage(status.message);}return;}
 if(document.fullscreenElement===$('phraseDialog'))try{await document.exitFullscreen()}catch{}
 $('phraseExportSummary').textContent=state.scenes.length+' scenes · '+avTime(status.timing.end)+' · 1920 × 1080 · '+mediaInfo(state.music.assetId).name;
 syncExportAudioUI();$('phraseExportResult').textContent='';$('phraseExportDialog').showModal();await phraseCheckCodec();
}
async function phraseCheckCodec(){
 const token=++phraseCodecToken,fps=Number($('phraseExportFps').value)===30?30:60,method=$('phraseExportMethod').value;
 $('phraseExportStart').disabled=true;$('phraseExportCapability').textContent='Checking '+fps+' fps MP4 support…';
 try{const support=await mp4Support(true,method,fps,1080);if(token!==phraseCodecToken||!$('phraseExportDialog').open)return;
  $('phraseExportCapability').textContent=support?(method==='realtime'?'MP4 capture is available. Keep this tab visible during export.':support.audioCodec==='opus'?'H.264 MP4 with Opus audio is available. For editors that require AAC, try Compatibility.':'H.264 MP4 with AAC audio is available at '+fps+' fps.'):'This method is unavailable in this browser. Try 30 fps or Compatibility.';
  $('phraseExportStart').disabled=!support||!phraseTimingStatus(state).complete;
 }catch(e){if(token===phraseCodecToken)$('phraseExportCapability').textContent='Could not check MP4 support: '+e.message;}
}
async function phraseBeginExport(){
 if(exportJob||phraseExportPreparing)return;phraseExportPreparing=true;$('phraseExportStart').disabled=true;phrasePause();stopAnimationPreview();stopStoryPlayback();cinemaStopCuePreview();
 let job=null;
 try{
  const fps=Number($('phraseExportFps').value)===30?30:60,method=$('phraseExportMethod').value,p=phraseVideoProject(state,$('phraseExportLyrics').checked),tl=storyTimeline(p,fps),range=directorRange(p,fps,{mode:'whole'});
  if(range.duration>3600)throw Error('Choose a song ending under one hour for MP4 export.');
  const wakeAudio=audioEngine().resume(),support=await mp4Support(true,method,fps,1080);await wakeAudio;
  if(!support)throw Error('This MP4 method is unavailable. Try 30 fps or Compatibility.');
  job={fps,range,normalizeAudio:p.exportNormalizeAudio===true,width:1920,height:1080,cancelled:false,error:null,encoders:[],recorder:null,abortRealtime:null};exportJob=job;
  $('phraseExportDialog').close();$('videoProgressDialog').showModal();$('cancelVideo').disabled=false;exportProgress(0,'Preparing the song and scene artwork…');
  await Promise.all([prepareAudio(p),directorRangeArtwork(p,tl,range,(n,total)=>{checkExport(job);exportProgress(0,'Preparing artwork '+n+' / '+total+'…');})]);checkExport(job);
  await prepareExportNormalization(job,p,tl);checkExport(job);
  productionExportJournal(job,p,'rendering',0,range.endFrame);
  const blob=method==='realtime'?await encodeRealtimeMP4(job,p,tl,support):await encodeReusableMP4(job,p,tl,support);checkExport(job);await productionValidateExport(blob);
  const name=filename(p.title)+'_song_'+(p.phraseVideo.lyrics?'lyrics_':'')+'1080p'+fps+'.mp4';window.feltLastVideo={blob,name};
  productionExportJournal(job,p,'finished',range.endFrame,range.endFrame);download(blob,name);
  $('phraseExportResult').textContent='MP4 downloaded · 1920 × 1080 · '+fps+' fps'+(method==='realtime'?' capture target':'')+' · '+avTime(range.duration)+'.'+exportNormalizationSummary(job);
 }catch(e){if(job)productionExportJournal(job,state,e.name==='AbortError'?'paused':'failed');$('phraseExportResult').textContent=e.name==='AbortError'?'Export cancelled. Completed Precise sections can be reused.':'Export could not finish: '+e.message;}
 finally{
  if(job){job.cancelled=true;for(const encoder of job.encoders)try{if(encoder.state!=='closed')encoder.close()}catch{}exportJob=null;$('videoProgressDialog').close();}
  phraseExportPreparing=false;if(!$('phraseExportDialog').open)$('phraseExportDialog').showModal();phraseSyncUI();phrasePaint();await phraseCheckCodec();
 }
}
function phraseExportInit(){
 $('phraseExportClose').onclick=()=>{$('phraseExportDialog').close();phraseCodecToken++;};
 $('phraseExportFps').onchange=phraseCheckCodec;$('phraseExportMethod').onchange=phraseCheckCodec;$('phraseExportStart').onclick=phraseBeginExport;
}
