'use strict';
let phraseRun=null,phraseFrame=0,phraseLastPress=-Infinity,phraseReturnFocus=null,phraseOpening=false;
function phraseValidate(p){
 if(!p.phraseShow)return p;
 if(p.phraseShow.version!==1||typeof p.phraseShow.enabled!=='boolean')throw Error('Invalid phrase-show settings.');
 if(p.phraseShow.defaultMode!==undefined&&!['manual','follow'].includes(p.phraseShow.defaultMode))throw Error('Choose Manual or Follow music as the opening mode.');
 if(p.phraseShow.manualInstruction!==undefined&&(typeof p.phraseShow.manualInstruction!=='string'||p.phraseShow.manualInstruction.length>120))throw Error('Keep the manual instruction under 120 characters.');
 const ids=new Set();for(const s of p.scenes){if(!s.phrase)continue;const q=s.phrase;
  if(typeof q.id!=='string'||ids.has(q.id)||typeof q.section!=='string'||q.section.length>100||typeof q.direction!=='string'||q.direction.length>150||!Number.isFinite(q.holdAt)||q.holdAt<0||q.holdAt>sceneAnimationSeconds(s,p))throw Error('Invalid musical phrase.');ids.add(q.id);
  if(q.nextLabel!==undefined&&(typeof q.nextLabel!=='string'||q.nextLabel.length>60))throw Error('Keep the next-button label under 60 characters.');
 }phraseTimingValidate(p.phraseShow.timing);phraseTimingValidate(p.phraseShow.draft);phraseAdoptCompleteDraft(p);return p;
}
function phraseMessage(text){$('phraseNotice').textContent=text;}
function phraseRunTiming(r=phraseRun){return r?.mode==='record'?phraseRecordingStatus(r.project):phraseTimingStatus(r?.project||state);}
function phraseRecoveryStatus(){const text=window.FeltRecovery?.status()||'Download story to keep your timing.';if($('phraseSaveStatus'))$('phraseSaveStatus').textContent=text;if(phraseRun?.justRecorded&&!phraseRun.clock)$('phraseWaiting').textContent='Timing active · '+text;}
async function phraseSaveTiming(){phraseRecoveryStatus();await window.FeltRecovery?.flush();phraseRecoveryStatus();}
function phraseFinishRecording(r=phraseRun){
 if(!r||r.mode!=='record')return;phraseStopClock(r);const status=phraseRecordingStatus(r.project);
 r.takeActive=false;
 if(status.complete){const q=copy(status.timing);delete q.position;phraseConfig(r.project).timing=q;delete r.project.phraseShow.draft;r.mode='follow';r.finished=true;r.justRecorded=true;r.position=q.end;$('phraseSetup').open=true;phraseMessage('Recording complete. Your timing is now used by the timeline, every playback, and MP4 export.');}
 else phraseMessage('This take is unfinished. Its cues are kept so you can continue; your completed recording is unchanged.');
 phraseDirty();phraseSaveTiming();phraseRenderCues();phraseSyncUI();
}
function phraseSongEnd(r=phraseRun){const a=mediaInfo(r?.project.music?.assetId,r?.project);return r?.mode==='follow'?phraseTimingStatus(r.project).timing?.end||a?.duration||0:a?.duration||0;}
function phraseSongTime(r=phraseRun){if(!r)return 0;const c=r.clock;return Math.min(phraseSongEnd(r),Math.max(0,c?c.offset+Math.max(0,c.ac.currentTime-c.startedAt):r.position));}
function phraseStopClock(r=phraseRun){if(!r)return;r.position=phraseSongTime(r);const c=r.clock;r.clock=null;r.playToken++;if(c){try{c.source.stop()}catch{}try{c.gain.disconnect();c.master.disconnect()}catch{}if(r.mode==='record'&&r.project.phraseShow?.draft){r.project.phraseShow.draft.position=r.position;phraseDirty();phraseSaveTiming();}}cancelAnimationFrame(phraseFrame);phraseFrame=0;}
function phraseSceneUI(){
 const r=phraseRun;if(!r)return;const s=r.project.scenes[r.index],q=s.phrase||{};
 $('phraseTitle').textContent=r.project.title;$('phraseSection').textContent=q.section||s.name;$('phraseDirection').textContent=q.direction||'';
 $('phraseCount').textContent=(r.index+1)+' / '+r.project.scenes.length;$('phraseLyric').textContent=s.caption||s.name;
 $('phraseProgress').value=r.index+1;$('phraseProgress').max=r.project.scenes.length;
 $('phraseBack').textContent=r.mode==='record'?'Undo last cue':'← Back';
 $('phraseNext').textContent=r.finished?'The end':r.index===r.project.scenes.length-1?(r.mode==='record'?'Finish recording · Space':'Finish · Space'):'Next phrase · Space';
 if(!r.finished&&r.mode==='manual'&&q.nextLabel)$('phraseNext').textContent=q.nextLabel;
 $('phraseNext').disabled=r.finished||r.busy||(r.mode==='record'&&!r.clock)||(r.mode==='follow'&&!phraseTimingStatus(r.project).complete);
 $('phraseBack').disabled=r.index===0||r.busy||(r.mode==='record'&&!r.takeActive);
}
function phraseSyncUI(){
 const r=phraseRun;if(!r)return;const a=mediaInfo(r.project.music?.assetId,r.project),status=phraseRunTiming(r),saved=phraseTimingStatus(r.project),draft=phraseRecordingStatus(r.project);
 $('phraseMode').value=r.mode;$('phraseMode').disabled=!!r.busy;$('phraseImport').disabled=!!r.busy;
 $('phraseTrackName').textContent=a?a.name+' · '+avTime(a.duration):'No song imported';
 $('phraseVolume').value=Math.round((r.project.music?.volume??1)*100);$('phraseVolume').disabled=!a||r.busy;
 $('phraseTimingStatus').textContent=r.mode==='record'&&draft.valid?draft.count+' of '+r.project.scenes.length+' cues in this take.'+(saved.complete?' Completed recording kept until this take is finished.':''):saved.message;$('phraseTransport').hidden=r.mode==='manual';phraseRecoveryStatus();
 $('phrasePlay').disabled=!a||r.busy||(r.mode==='follow'&&!status.complete);
 $('phrasePlay').textContent=r.clock?'Pause':r.mode==='record'?(r.takeActive||draft.valid?'Continue recording':saved.valid?'Record new timing':'Start recording'):'Play song';
 $('phraseSeek').disabled=r.mode!=='follow'||!status.complete||r.busy;$('phraseSeek').max=phraseSongEnd(r)||1;
 $('phraseExport').disabled=!saved.complete||r.busy||!!r.clock;$('phraseReview').disabled=!saved.valid||r.busy;
 $('phraseInstruction').textContent=r.mode==='record'?'Press Next when the next line begins.':r.mode==='follow'?'Scenes follow the saved song timing.':(r.project.phraseShow?.manualInstruction||'Sing a phrase. Press Space.');phraseSceneUI();
}
function phrasePaint(now=performance.now()){
 const r=phraseRun;if(!r)return;cancelAnimationFrame(phraseFrame);phraseFrame=0;
 const status=phraseRunTiming(r);let local=Math.max(0,(now-r.started)/1000);
 if(r.mode!=='manual'){
  r.position=phraseSongTime(r);
  if(r.mode==='follow'&&status.complete){const i=phraseIndexAt(status.timing,r.position);if(i!==r.index){r.index=i;phraseSceneUI();}}
  local=status.valid?Math.max(0,r.position-(status.timing.starts[r.index]??r.position)):0;
  if(r.clock&&r.position>=phraseSongEnd(r)-1e-6){if(r.mode==='record')phraseFinishRecording(r);else{phraseStopClock(r);r.finished=true;phraseMessage('Playback finished.');phraseSyncUI();}}
  $('phraseSeek').value=r.position;$('phraseClock').textContent=avTime(r.position)+' / '+avTime(phraseSongEnd(r));
 }
 const s=r.project.scenes[r.index];phraseDraw($('phraseCanvas').getContext('2d'),r.project,s,local,$('phraseCaptions').checked);
 $('phraseWaiting').textContent=r.finished?'The end':r.mode==='record'?(r.clock?'Recording your scene changes':r.takeActive?'Recording paused':'Ready to record'):r.mode==='follow'?(r.clock?'Following the song':'Song paused'):local>=phraseHold(s,r.project)?'Ready for the next phrase':'Playing this phrase';
 if(r.justRecorded&&!r.clock)phraseRecoveryStatus();
 if(r.clock||(r.mode==='manual'&&local<phraseHold(s,r.project)))phraseFrame=requestAnimationFrame(phrasePaint);
}
function phraseGo(index,now=performance.now()){
 if(!phraseRun||index<0||index>=phraseRun.project.scenes.length)return false;
 const r=phraseRun;r.index=index;r.started=now;r.finished=false;phraseSceneUI();phrasePaint(now);return true;
}
function phraseAdvance(delta=1,now=performance.now()){
 const r=phraseRun;if(!r||r.busy||now-phraseLastPress<220)return false;phraseLastPress=now;
 if(r.mode==='follow'){
  const status=phraseTimingStatus(r.project);if(!status.complete)return false;
  const i=r.index+delta;if(i<0)return false;if(i>=r.project.scenes.length){phraseStopClock(r);r.position=status.timing.end;r.finished=true;phraseSyncUI();phrasePaint();return true;}
  phraseSeekSong(status.timing.starts[i]);return true;
 }
 if(r.mode==='record'){
  const status=phraseRecordingStatus(r.project);if(!r.takeActive||!status.valid)return false;
  if(delta<0){if(r.index===0)return false;status.timing.starts[r.index]=null;r.index--;r.finished=false;phraseDirty();phraseRenderCues();phraseSyncUI();phrasePaint();return true;}
  if(!r.clock)return false;const t=phraseSongTime(r),q=status.timing,last=q.starts[r.index];
  if(t-last<PHRASE_CUE_GAP||t>=phraseSongEnd(r)-PHRASE_CUE_GAP)return false;
  if(r.index===r.project.scenes.length-1){q.end=t;phraseFinishRecording(r);}
  else{r.index++;q.starts[r.index]=t;q.position=t;}
  phraseDirty();phraseRenderCues();phraseSyncUI();phrasePaint();return true;
 }
 if(delta>0&&r.index===r.project.scenes.length-1){r.finished=true;phraseSceneUI();phrasePaint(now);return true;}
 return phraseGo(r.index+delta,now);
}
function phrasePause(){phraseStopClock();const r=phraseRun;if(r?.mode==='record'&&phraseRecordingStatus(r.project).complete){const q=copy(r.project.phraseShow.draft);delete q.position;phraseConfig(r.project).timing=q;phraseDirty();phraseSaveTiming();phraseMessage('All scene cues are saved and active. Continue recording if you want to trim the ending.');}phraseSyncUI();phrasePaint();}
async function phrasePlaySong(){
 const r=phraseRun;if(!r||r.mode==='manual'||r.busy)return;if(r.clock){phrasePause();return;}
 const status=phraseTimingStatus(r.project),assetId=r.project.music?.assetId;if(!assetId||(r.mode==='follow'&&!status.complete))return;
 const token=++r.playToken;r.busy=true;phraseSyncUI();
 try{
  const ac=audioEngine();await ac.resume();const buffer=await decodeMedia(assetId,r.project);
  if(phraseRun!==r||r.playToken!==token||state!==r.project)return;
  if(r.mode==='record'&&!r.takeActive){
   const draft=phraseRecordingStatus(r.project);
   if(draft.valid){r.index=draft.count-1;r.position=draft.timing.position>=phraseSongEnd(r)-PHRASE_CUE_GAP?draft.timing.starts[r.index]:Math.max(draft.timing.starts[r.index],draft.timing.position||0);}
   else{if(status.complete&&!confirm('Record a replacement take? Your completed timing will stay active until the new take is finished.'))return;checkpoint();phraseConfig(r.project).draft=phraseNewTiming(r.project);r.index=0;r.position=0;}
   r.takeActive=true;phraseDirty();phraseRenderCues();
  }
  if(r.position>=phraseSongEnd(r)-.001){r.position=0;r.index=0;}
  const source=ac.createBufferSource(),gain=ac.createGain(),master=connectStoryMaster(ac,ac.destination),startedAt=ac.currentTime+.06;
  source.buffer=buffer;gain.gain.value=r.project.music.volume;source.connect(gain);gain.connect(master);source.start(startedAt,r.position,Math.max(.001,phraseSongEnd(r)-r.position));
  r.clock={ac,source,gain,master,startedAt,offset:r.position};r.finished=false;r.justRecorded=false;$('phraseSetup').open=false;
  phraseMessage(r.mode==='record'?'The first scene starts with the song. Press Next for each following line.':'Playing the saved timing.');
 }catch(e){phraseStopClock(r);phraseMessage('Could not play the song: '+e.message);$('phraseSetup').open=true;}
 finally{if(phraseRun===r){r.busy=false;phraseSyncUI();phrasePaint();if(r.clock)$('phraseNext').focus();}}
}
function phraseSeekSong(time){
 const r=phraseRun;if(!r||r.mode!=='follow')return;const status=phraseTimingStatus(r.project);if(!status.complete)return;
 const playing=!!r.clock;phraseStopClock(r);r.position=Math.max(0,Math.min(status.timing.end,Number(time)||0));r.index=phraseIndexAt(status.timing,r.position);r.finished=false;phraseSyncUI();phrasePaint();if(playing&&r.position<status.timing.end)phrasePlaySong();
}
function phraseSetMode(mode){
 const r=phraseRun;if(!r||!['manual','record','follow'].includes(mode))return;if(r.mode==='record'&&phraseRecordingStatus(r.project).complete)phraseFinishRecording(r);else phraseStopClock(r);r.justRecorded=false;r.mode=mode;r.position=0;r.index=0;r.started=performance.now();r.takeActive=false;r.finished=false;phraseLastPress=-Infinity;
 if(mode==='record'){const draft=phraseRecordingStatus(r.project);if(draft.valid){r.index=draft.count-1;r.position=draft.timing.position||draft.timing.starts[r.index];}}
 phraseMessage(mode==='record'?'Start the song, then press Next at each new line. Timing is kept in your story.':mode==='follow'?phraseTimingStatus(r.project).message:'Each scene waits for the next press.');phraseSyncUI();phrasePaint();
}
function phraseRestart(){
 const r=phraseRun;if(!r)return;phraseLastPress=-Infinity;if(r.mode==='manual'){phraseGo(0);return;}
 phraseStopClock(r);if(r.mode==='record'&&phraseRecordingStatus(r.project).valid){if(!confirm('Restart this unfinished take from the beginning? Your completed recording will be kept.')){phraseSyncUI();phrasePaint();return;}delete r.project.phraseShow.draft;phraseDirty();phraseSaveTiming();}r.position=0;r.index=0;r.finished=false;r.takeActive=false;phraseSyncUI();phrasePaint();phraseMessage(r.mode==='record'?'Ready for a new take. Your completed recording is kept until this take is finished.':'Ready to play from the beginning.');
}
async function phraseImportSong(file){
 const r=phraseRun;if(!r||!file||r.busy)return;phraseStopClock(r);r.busy=true;phraseMessage('Importing '+file.name+'…');phraseSyncUI();const prior=r.project.music?.assetId;
 try{await importAudioFile(file,'music',r.project.scenes[0].id);if(phraseRun!==r||state!==r.project)return;
  if(r.project.music?.assetId!==prior){phraseConfig(r.project);Object.assign(r.project.music,{volume:1,loop:false,duck:false,fade:0,startSceneId:null,endSceneId:null});r.mode='record';r.index=0;r.position=0;r.takeActive=false;r.finished=false;phraseDirty();phraseMessage('Song imported. Start recording, then press Next when each new line begins.');}
  else phraseMessage($('avStatus').textContent);
 }finally{if(phraseRun===r){r.busy=false;phraseSyncUI();phraseRenderCues();phrasePaint();}}
}
function phraseEditCue(index,value){
 const r=phraseRun;if(!r||r.clock||r.busy)return;const status=phraseTimingStatus(r.project);if(!status.valid)return;
 const q=copy(status.timing),t=Number(value);if(index==='end')q.end=t;else q.starts[index]=t;
 try{phraseTimingValidate(q);if(q.end>mediaInfo(q.assetId,r.project).duration+.001)throw Error('The ending cannot be after the song.');checkpoint();phraseConfig(r.project).timing=q;r.takeActive=false;r.position=Math.min(r.position,q.end);phraseDirty();phraseSaveTiming();phraseMessage('Timing updated everywhere. Play the song to review.');}
 catch(e){phraseMessage(e.message);}phraseRenderCues();phraseSyncUI();phrasePaint();
}
function phraseRenderCues(){
 const host=$('phraseCues');host.replaceChildren();const r=phraseRun;if(!r)return;const status=phraseTimingStatus(r.project);if(!status.valid){$('phraseCueReview').hidden=true;return;}
 const q=status.timing;for(let i=0;i<r.project.scenes.length;i++){
  const row=document.createElement('div');row.className='phrase-cue-row';const label=document.createElement('label'),input=document.createElement('input');input.id='phrase-cue-'+i;input.type='number';input.min='0';input.max=String(q.end);input.step='0.01';input.value=q.starts[i]===null?'':q.starts[i].toFixed(3);input.disabled=i===0||q.starts[i]===null||!!r.clock;
  label.textContent=(i+1)+'. '+(r.project.scenes[i].caption||r.project.scenes[i].name);label.setAttribute('for',input.id);input.setAttribute('aria-label','Start in seconds: '+label.textContent);input.onchange=()=>phraseEditCue(i,input.value);row.append(label,input);host.append(row);
 }
 $('phraseEndTime').value=q.end.toFixed(3);$('phraseEndTime').max=String(mediaInfo(q.assetId,r.project).duration);$('phraseEndTime').disabled=!!r.clock;
}
function phraseClose(){
 const r=phraseRun;if(!r)return;if(r.mode==='record'&&phraseRecordingStatus(r.project).complete)phraseFinishRecording(r);else phraseStopClock(r);phraseSaveTiming();phraseRun=null;refresh();refreshAudioUI();
 if(document.fullscreenElement===$('phraseDialog'))document.exitFullscreen?.().catch(()=>{});
 if($('phraseDialog').open)$('phraseDialog').close();phraseReturnFocus?.focus?.();phraseReturnFocus=null;
}
async function phraseOpen(){
 if(phraseRun||phraseOpening||directorAgentBusy||exportJob)return;phraseOpening=true;
 stopAnimationPreview();stopStoryPlayback();cinemaStopCuePreview();if(presenting)present(false);
 if(phraseAdoptCompleteDraft())phraseDirty();
 const legacy=phraseTimingStatus();if(legacy.valid&&!legacy.complete&&!state.phraseShow.draft){state.phraseShow.draft=copy(legacy.timing);delete state.phraseShow.timing;phraseDirty();}
 const project=state,revision=directorRevision();
 try{await ensureStoryArtwork(project);if(project!==state||revision!==directorRevision())return;
  phraseReturnFocus=document.activeElement;phraseRun={project,index:0,started:0,finished:false,mode:project.phraseShow?.defaultMode==='manual'?'manual':phraseTimingStatus(project).complete?'follow':'manual',position:0,clock:null,busy:false,playToken:0,takeActive:false};phraseLastPress=-Infinity;
  $('phraseDialog').showModal();$('phraseCaptions').checked=true;$('phraseLyric').hidden=false;$('phraseSetup').open=false;$('phraseCueReview').hidden=true;
  phraseMessage(project.phraseShow?.manualInstruction|| (phraseTimingStatus(project).complete?'Your recorded timing is ready. Play the song, or choose Manual for student-controlled advances.':'Choose Music & timing to import a song or record scene changes.'));phraseSyncUI();phraseRenderCues();phraseGo(0);(phraseRun.mode==='follow'?$('phrasePlay'):$('phraseNext')).focus();
 }catch(e){toast('Could not open the phrase show: '+e.message);}finally{phraseOpening=false;}
}
function phraseKey(e){
 if(!phraseRun||!$('phraseDialog').open||$('phraseExportDialog').open||$('classroomDialog').open||$('videoProgressDialog').open)return;
 if(e.ctrlKey||e.metaKey||e.altKey||['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName)||e.target?.isContentEditable)return;
 if(![' ','Spacebar','ArrowRight','ArrowLeft','Home','Escape'].includes(e.key)&&e.code!=='Space')return;
 if((e.key===' '||e.code==='Space')&&['BUTTON','SUMMARY'].includes(e.target?.tagName)&&e.target?.id!=='phraseNext')return;
 e.preventDefault();e.stopImmediatePropagation();if(e.repeat)return;if(e.key==='Escape')return phraseClose();if(e.key==='Home')return phraseRestart();phraseAdvance(e.key==='ArrowLeft'?-1:1);
}
function phraseInit(){
 $('phraseNext').onclick=()=>phraseAdvance(1);$('phraseBack').onclick=()=>phraseAdvance(-1);$('phraseRestart').onclick=phraseRestart;$('phraseExit').onclick=phraseClose;
 $('phraseCaptions').onchange=()=>{$('phraseLyric').hidden=!$('phraseCaptions').checked;phrasePaint();};
 $('phraseFullscreen').onclick=async()=>{try{if(document.fullscreenElement===$('phraseDialog'))await document.exitFullscreen();else await $('phraseDialog').requestFullscreen()}catch{phraseMessage('Fullscreen is unavailable here. Open the site in a browser tab to try it.')}};
 $('phraseDialog').addEventListener('cancel',e=>{e.preventDefault();phraseClose()});$('phraseDialog').addEventListener('close',phraseClose);document.addEventListener('keydown',phraseKey,true);
 $('present').onclick=()=>state.phraseShow?.enabled?phraseOpen():present(true);$('presentSongTiming').onclick=phraseOpen;
 $('phraseMode').onchange=e=>phraseSetMode(e.target.value);$('phrasePlay').onclick=phrasePlaySong;$('phraseSeek').onchange=e=>phraseSeekSong(e.target.value);
 $('phraseImport').onclick=()=>$('phraseAudioFile').click();$('phraseAudioFile').onchange=e=>{const file=e.target.files[0];e.target.value='';return phraseImportSong(file);};
 $('phraseVolume').oninput=e=>{if(phraseRun?.clock)phraseRun.clock.gain.gain.value=Number(e.target.value)/100;};
 $('phraseVolume').onchange=e=>{if(!phraseRun)return;checkpoint();phraseRun.project.music.volume=Number(e.target.value)/100;phraseDirty();};
 $('phraseReview').onclick=()=>{phrasePause();$('phraseSetup').open=true;$('phraseCueReview').hidden=false;phraseRenderCues();};
 $('phraseEndTime').onchange=e=>phraseEditCue('end',e.target.value);$('phraseSaveStory').onclick=()=>$('saveProject').click();
 $('phraseExport').onclick=phraseExportOpen;$('openPhraseExport').onclick=phraseExportOpen;phraseExportInit();
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&phraseRun?.mode==='record'&&phraseRun.clock){phrasePause();phraseMessage('Recording paused while this tab was hidden. Continue when ready.');}});
}
window.FeltPhrases={open:phraseOpen,close:phraseClose,next:()=>phraseAdvance(1),previous:()=>phraseAdvance(-1),restart:phraseRestart,init:phraseInit,status:()=>phraseRun?{index:phraseRun.index,total:phraseRun.project.scenes.length,finished:phraseRun.finished,mode:phraseRun.mode,time:phraseSongTime()}:null};
