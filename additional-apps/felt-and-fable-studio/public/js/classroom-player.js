'use strict';
// These functions travel inside the downloaded HTML. No editor, account, or server is used.
function classroomPlayer(){
 const $=id=>document.getElementById(id),data=JSON.parse($('storyData').textContent),live=data.renderer==='canvas',video=live?classroomLiveTransport(data,$('stage')):$('stage'),song=$('song');
 let index=0,mode='manual',frame=0,manualFrame=0,token=0,started=false,closing=false,draft=null,dirty=false,busy=false;
 const urls=new Map(),gap=.1;
 const message=text=>$('notice').textContent=text;
 const setupMessage=text=>$('setupStatus').textContent=text;
 const manual=()=>mode!=='music';
 const duration=()=>data.music?.duration||data.music?.end||0;
 function validTiming(starts=data.music?.starts,end=data.music?.end){
  return !!data.music&&Array.isArray(starts)&&starts.length===data.scenes.length&&starts[0]===0&&Number.isFinite(end)&&end>0&&end<=duration()+.001&&starts.every((t,i)=>Number.isFinite(t)&&t>=0&&(!i||t>=starts[i-1]+gap-1e-6)&&t<=end-gap+1e-6);
 }
 const url=i=>{if(live)return String(i);if(!urls.has(i)){const raw=atob(data.scenes[i].video),bytes=new Uint8Array(raw.length);for(let n=0;n<raw.length;n++)bytes[n]=raw.charCodeAt(n);urls.set(i,URL.createObjectURL(new Blob([bytes],{type:'video/mp4'})));}return urls.get(i);};
 function changed(){dirty=true;$('saveState').textContent='Unsaved changes · Save a copy to keep your audio and timing.';}
 function controls(){
  const last=index===data.scenes.length-1,recording=mode==='record';
  $('count').textContent=(index+1)+' / '+data.scenes.length;$('back').disabled=index===0||busy;
  $('next').disabled=busy||closing||(!recording&&last&&started);
  $('next').textContent=closing?'Changing scene…':recording?(last?'Finish timing ✓':'Next cue →'):mode==='manual'&&!started?'Start story →':last?'Last scene':'Next scene →';
  $('lyric').textContent=data.scenes[index].caption;$('lyric').hidden=!$('captions').checked;
  $('play').textContent=song.paused?(recording?'Resume recording':'Play with music'):(recording?'Pause recording':'Pause music');
  $('seek').value=song.currentTime||0;$('seek').max=recording?duration():(data.music?.end||duration());$('seek').disabled=recording;
  $('clock').textContent=(song.currentTime||0).toFixed(1)+' / '+(recording?duration():(data.music?.end||0)).toFixed(1)+'s';
  $('musicControls').hidden=mode==='manual';$('cancelTake').hidden=!recording;
  $('mode').value=mode;$('mode').disabled=recording||busy;$('recordOption').hidden=!recording;$('musicOption').disabled=!validTiming();
  for(const id of ['teacher','saveCopy','restart'])$(id).disabled=recording||busy;
  $('recordTiming').disabled=!data.music||busy;$('removeSong').disabled=!data.music||busy;$('audioFile').disabled=busy;
  $('volume').disabled=!data.music||busy;$('reviewTiming').hidden=!validTiming();
 }
 function localTime(t){return Math.min(Math.max(0,t),data.scenes[index].hold);}
 function show(i,time=0,play=true){
  cancelAnimationFrame(manualFrame);manualFrame=0;closing=false;index=Math.max(0,Math.min(data.scenes.length-1,i));if(play)started=true;
  const seq=++token,scene=data.scenes[index];video.pause();video.poster=scene.poster;video.src=url(index);video.load();
  video.onloadeddata=()=>{if(seq!==token)return;video.currentTime=localTime(time);if(play&&time<scene.hold&&(mode==='manual'||!song.paused))video.play().then(()=>{if(seq===token&&manual())manualTick();}).catch(()=>message('Press Next or Replay scene to start the animation.'));};
  controls();message(mode==='record'?'Recording · press Space or Next cue at each change.':mode==='manual'?'Press Space or Next when everyone is ready.':'Scenes follow the recorded song timing.');
 }
 function follow(){
  cancelAnimationFrame(frame);frame=0;if(mode!=='music'||!validTiming())return;
  const t=Math.min(song.currentTime,data.music.end);let next=0;for(let i=1;i<data.music.starts.length;i++)if(data.music.starts[i]<=t)next=i;
  const local=t-data.music.starts[next];
  if(next!==index)show(next,local,!song.paused);else if(video.readyState>=2){const at=localTime(local);if(Math.abs(video.currentTime-at)>.12)video.currentTime=at;if(local>=data.scenes[index].hold||song.paused)video.pause();else if(video.paused)video.play().catch(()=>{});}
  controls();if(t>=data.music.end){song.pause();video.pause();message('The end. Play again or choose Manual for student-controlled scenes.');return;}if(!song.paused)frame=requestAnimationFrame(follow);
 }
 function recordTick(){cancelAnimationFrame(frame);frame=0;if(mode!=='record')return;controls();if(!song.paused)frame=requestAnimationFrame(recordTick);}
 async function playMusic(){
  if(!data.music||mode==='manual')return;if(!song.paused){song.pause();return;}
  if(mode==='music'&&song.currentTime>=data.music.end-.01)song.currentTime=0;
  try{await song.play();if(mode==='music')follow();else if(mode==='record'){recordTick();if(!manualStop())await video.play().then(manualTick);}else song.pause();}
  catch{message('The song could not play. Try again, or add an MP3 or WAV in Audio & timing.');}
 }
 function manualStop(){
  if(!manual())return false;const scene=data.scenes[index],at=closing?scene.hold:(scene.manualHold??scene.hold);
  if(video.currentTime+1e-5<at)return false;if(closing){show(index+1);return true;}
  video.pause();if(video.currentTime>at+.001)video.currentTime=at;
  message(mode==='record'?'Recording continues · press '+(index===data.scenes.length-1?'Finish timing when the song ends.':'Next cue at the next lyric.'):index===data.scenes.length-1?'The end. Restart to tell the story again.':'Ready for the next scene. Press Space or Next.');return true;
 }
 function manualTick(){cancelAnimationFrame(manualFrame);manualFrame=0;if(manual()&&!manualStop()&&!video.paused)manualFrame=requestAnimationFrame(manualTick);}
 function finishTake(end=song.currentTime){
  if(!draft||!validTiming(draft.starts,end)){message('Leave a moment after the final cue, then press Finish timing.');return;}
  data.music.starts=[...draft.starts];data.music.end=end;draft=null;song.pause();mode='music';changed();controls();updateSetup();
  message('Timing saved for every cue. Play with music to review, then Save a copy to keep it.');
 }
 function cancelTake(text='Take cancelled. Your previous saved timing is unchanged.'){
  draft=null;song.pause();mode='manual';song.currentTime=0;started=false;show(0,0,false);updateSetup();message(text);
 }
 function advance(delta){
  if(busy||closing&&delta>0)return;
  if(mode==='record'){
   if(delta<0){if(index===0)return;draft.starts.length=index;song.currentTime=draft.starts[index-1];show(index-1,0,!song.paused);return;}
   if(song.paused){message('Resume recording before marking the next cue.');return;}
   const t=song.currentTime;if(t<draft.starts.at(-1)+gap){message('Wait a moment between cues.');return;}
   if(index===data.scenes.length-1){finishTake(t);return;}
   draft.starts.push(t);show(index+1);return;
  }
  if(mode==='manual'&&!started&&delta>0){show(0);return;}
  const i=Math.max(0,Math.min(data.scenes.length-1,index+delta));if(i===index)return;
  if(mode==='music'){song.currentTime=data.music.starts[i];show(i,0,!song.paused);follow();}
  else{const scene=data.scenes[index];if(delta>0&&scene.manualHold<scene.hold){closing=true;video.currentTime=Math.max(video.currentTime,scene.manualHold);controls();video.play().then(manualTick).catch(()=>show(i));}else show(i);}
 }
 function updateSetup(){
  const m=data.music,complete=validTiming();
  $('songName').textContent=m?(m.name||'Included song')+' · '+duration().toFixed(1)+' seconds':'No song added. Manual advance is ready.';
  $('timingSummary').textContent=complete?'All '+data.scenes.length+' cues are timed. Auto playback is ready.':m?'Add timing by playing the song and tapping Next cue at each scene change.':'Add an MP3, WAV, M4A, or another audio file your browser can play.';
  $('volume').value=m?.volume??1;controls();
 }
 function loadSong(){song.pause();if(data.music)song.src=data.music.src;else song.removeAttribute('src');song.volume=Math.max(0,Math.min(1,data.music?.volume??1));$('seek').max=data.music?.end||duration();song.load();updateSetup();}
 async function importSong(file){
  if(!file)return;if(file.size>100*1024*1024){setupMessage('Choose an audio file under 100 MB.');return;}
  busy=true;controls();setupMessage('Checking the audio file…');let probe=null,probeURL=null;
  try{
   const result=await new Promise((resolve,reject)=>{
    const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('The audio file could not be read.'));reader.readAsDataURL(file);
   });
   probe=new Audio();probe.preload='metadata';probeURL=URL.createObjectURL(file);
   const length=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{probe.onloadedmetadata=probe.onerror=null;reject(Error('Audio took too long to load. Try an MP3 or WAV.'));},15000);probe.onloadedmetadata=()=>{clearTimeout(timer);resolve(probe.duration);};probe.onerror=()=>{clearTimeout(timer);reject(Error('This audio format could not play. Try an MP3 or WAV.'));};probe.src=probeURL;probe.load();});
   if(!Number.isFinite(length)||length<gap*data.scenes.length||length>7200)throw Error('Choose a song long enough for every cue and under two hours.');
   // Commit only after reading and decoding succeeds. Replacing audio clears its old cue times.
   data.music={src:result,name:file.name,duration:length,starts:null,end:length,volume:1};mode='manual';started=false;loadSong();show(0,0,false);changed();setupMessage('Song added. Record timing next; your original file is unchanged.');
  }catch(e){setupMessage(e.message);}
  finally{if(probe){probe.onloadedmetadata=probe.onerror=null;probe.removeAttribute('src');probe.load();}if(probeURL)URL.revokeObjectURL(probeURL);busy=false;$('audioFile').value='';controls();}
 }
 async function beginTake(){
  if(!data.music||busy)return;song.pause();song.currentTime=0;draft={starts:[0]};mode='record';started=false;$('teacherDialog').close();show(0,0,false);message('Starting the song…');
  try{await song.play();if(mode!=='record'){song.pause();return;}show(0);recordTick();message('Recording · first cue starts now. Press Space or Next cue at each change.');$('next').focus();}
  catch{cancelTake('The song could not start. Try recording again, or choose an MP3 or WAV.');}
 }
 function reviewTiming(){
  if(!validTiming())return;const rows=$('cueRows');rows.replaceChildren();
  data.scenes.forEach((scene,i)=>{const label=document.createElement('label'),name=document.createElement('span'),input=document.createElement('input');name.textContent=(i+1)+'. '+(scene.caption||scene.name);input.id='cueTime'+i;input.type='number';input.min='0';input.max=String(duration());input.step='.01';input.value=String(Number(data.music.starts[i].toFixed(3)));input.disabled=i===0;input.setAttribute('aria-label','Start seconds for cue '+(i+1));label.append(name,input);rows.append(label);});
  $('endTime').value=String(Number(data.music.end.toFixed(3)));$('endTime').max=duration();$('cueError').textContent='';$('cueDialog').showModal();
 }
 function saveTimingEdits(){
  const starts=data.scenes.map((s,i)=>$('cueTime'+i).value.trim()===''?NaN:Number($('cueTime'+i).value));
  const end=$('endTime').value.trim()===''?NaN:Number($('endTime').value);
  if(!validTiming(starts,end)){$('cueError').textContent='Start at 0, leave at least 0.1 seconds between cues, and end after the last cue within the song.';return;}
  data.music.starts=starts;data.music.end=end;changed();$('seek').max=end;$('cueDialog').close();updateSetup();setupMessage('Cue times updated. Save a copy to keep them.');
 }
 function saveCopy(){
  if(busy||mode==='record')return;
  try{data.version=live?3:2;const html=classroomHTML(data),blob=new Blob([html],{type:'text/html;charset=utf-8'}),link=document.createElement('a'),href=URL.createObjectURL(blob);link.href=href;link.download=(data.title||'Story').replace(/[^a-z0-9_-]+/gi,'_').slice(0,100)+'_classroom.html';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(href),30000);dirty=false;$('saveState').textContent='Copy downloaded. Open the new HTML file next time; the original stays unchanged.';message('Copy downloaded with this story, audio, and saved timing.');}
  catch{message('The copy could not be saved. Try again in Chrome or Edge.');}
 }
 $('title').textContent=data.title;document.title=data.title;
 song.onpause=()=>{if(!song.paused)return;cancelAnimationFrame(frame);video.pause();controls();};
 song.onended=()=>{if(mode==='record'){if(draft.starts.length===data.scenes.length)finishTake(duration());else cancelTake('The song ended before every cue was marked. Try recording again; previous timing was kept.');}else if(mode==='music'){follow();message('The end.');}};
 song.onerror=()=>{if(data.music){message('The song could not play. Choose another file in Audio & timing.');setupMessage('The song could not play. Choose another file.');}};
 $('mode').onchange=()=>{const choice=$('mode').value;song.pause();mode=choice==='music'&&validTiming()?'music':'manual';song.currentTime=0;started=false;show(0,0,false);};
 $('next').onclick=()=>advance(1);$('back').onclick=()=>advance(-1);
 $('replay').onclick=()=>{if(mode!=='manual'){song.currentTime=(mode==='record'?draft:data.music).starts[index];show(index,0,!song.paused);if(mode==='music')follow();}else show(index);};
 $('restart').onclick=()=>{if(mode==='record')return;song.pause();song.currentTime=0;started=false;show(0,0,false);};$('play').onclick=playMusic;
 $('seek').oninput=()=>{if(mode!=='music')return;song.currentTime=Number($('seek').value);follow();};$('captions').onchange=controls;
 $('teacher').onclick=()=>{song.pause();video.pause();updateSetup();setupMessage('Audio stays in this file. Save a copy after making changes.');$('teacherDialog').showModal();};
 $('teacherClose').onclick=()=>$('teacherDialog').close();$('audioFile').onchange=()=>importSong($('audioFile').files?.[0]);
 $('recordTiming').onclick=beginTake;$('cancelTake').onclick=()=>cancelTake();$('saveCopy').onclick=saveCopy;$('setupSave').onclick=saveCopy;
 $('removeSong').onclick=()=>{if(!data.music)return;data.music=null;mode='manual';started=false;loadSong();show(0,0,false);changed();setupMessage('Song and timing removed from this copy. Manual playback is ready.');};
 $('volume').oninput=()=>{if(!data.music)return;data.music.volume=Number($('volume').value);song.volume=data.music.volume;changed();};
 $('reviewTiming').onclick=reviewTiming;$('cueClose').onclick=()=>$('cueDialog').close();$('cueApply').onclick=saveTimingEdits;
 $('full').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{message('Use your browser’s full-screen command to enlarge the story.');}};
 video.ontimeupdate=()=>{if(manual())manualStop();else if(video.currentTime>=data.scenes[index].hold)video.pause();};video.onended=()=>{if(manual()&&closing)show(index+1);};
 video.onerror=()=>message(live?'The embedded artwork could not open. Try reopening the file in a desktop browser.':'This browser could not play the scene. Open this HTML file in Chrome or Edge.');
 document.addEventListener('keydown',e=>{if($('teacherDialog').open||$('cueDialog').open||e.ctrlKey||e.metaKey||e.altKey||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;if((e.code==='Space'||e.key===' ')&&e.target.tagName==='BUTTON'&&e.target.id!=='next')return;if(!['ArrowRight','ArrowLeft','Home',' '].includes(e.key)&&e.code!=='Space')return;e.preventDefault();if(e.repeat)return;if(e.key==='Home')$('restart').click();else if(e.key==='ArrowLeft')advance(-1);else if(e.key==='ArrowRight'||manual())advance(1);else playMusic();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode!=='manual'){song.pause();message(mode==='record'?'Recording paused. Resume when you are ready.':'Music paused while the story was hidden.');}});
 window.addEventListener('beforeunload',e=>{if(dirty||draft){e.preventDefault();e.returnValue='';}});
 window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);cancelAnimationFrame(manualFrame);video.dispose?.();for(const u of urls.values())URL.revokeObjectURL(u);urls.clear();});
 loadSong();show(0,0,false);message('Press Space or Start story to begin. Each following press advances one scene.');$('next').focus();
}
function classroomHTML(data){
 const json=JSON.stringify(data).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 // Include the packager as well as the player so recipients can save another self-contained copy.
 const functions=[classroomPlayer,classroomHTML,classroomCSS];if(data.renderer==='canvas')functions.push(classroomLiveTransport,classroomNativeRenderer);
 const runtime=functions.map(fn=>fn.toString()).join('\n').replace(/<\/script/gi,'<\\/script');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data: blob:; media-src data: blob:; base-uri \'none\'; form-action \'none\'"><title>Classroom story</title><style>'+classroomCSS()+'</style></head><body>'+
 '<header><h1 id="title"></h1><div><select id="mode" aria-label="Playback mode"><option value="manual">Manual · students advance</option><option id="musicOption" value="music">Auto · follow song</option><option id="recordOption" value="record" hidden>Recording cue timing</option></select><label><input type="checkbox" id="captions" checked>Lyrics</label><button id="teacher">Audio &amp; timing</button><button id="saveCopy">Save a copy</button><button id="full">Full screen</button></div></header>'+
 '<main>'+(data.renderer==='canvas'?'<canvas id="stage" width="1600" height="900" role="img" aria-label="Live animated felt story"></canvas>':'<video id="stage" muted playsinline preload="auto" aria-label="Story animation"></video>')+'<p id="lyric"></p></main><section id="musicControls" hidden><button id="play">Play with music</button><input id="seek" type="range" min="0" step="0.01" value="0" aria-label="Song position"><span id="clock"></span><button id="cancelTake">Cancel take</button><audio id="song" preload="auto"></audio></section>'+
 '<footer><div><strong id="count"></strong><p id="notice" role="status"></p></div><nav aria-label="Story controls"><button id="restart">Restart</button><button id="replay">Replay scene</button><button id="back">← Back</button><button id="next">Next scene →</button></nav></footer>'+
 '<dialog id="teacherDialog" aria-labelledby="setupTitle"><div class="dialog-head"><div><p class="eyebrow">Teacher setup</p><h2 id="setupTitle">Audio &amp; timing</h2></div><button id="teacherClose" aria-label="Close audio and timing">Done</button></div><p>Keep the story in your hands, or let a favorite recording lead the way.</p><section class="setup-card"><h3>1. Add your song</h3><label class="file-label">Choose an audio file<input id="audioFile" type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.flac"></label><p id="songName"></p><div class="setup-row"><label>Volume <input id="volume" type="range" min="0" max="1" step=".05" value="1"></label><button id="removeSong">Remove song</button></div></section>'+
 '<section class="setup-card"><h3>2. Tap through the timing</h3><p>Start recording to begin the song and first scene together. Press <b>Space</b> or <b>Next cue</b> for every change—even each “ooh.” On the last scene, press <b>Finish timing</b> when you want playback to end. You can pause, go back, or cancel a take.</p><p id="timingSummary"></p><div class="setup-row"><button id="recordTiming" class="primary">Record timing</button><button id="reviewTiming">Review / edit cue times</button></div></section>'+
 '<section class="setup-card"><h3>3. Keep your version</h3><p>Choose <b>Auto · follow song</b> to review. Manual advance stays available. Save a new HTML copy with your audio and timing, then open that copy next time or share it with another teacher.</p><button id="setupSave" class="primary">Save a copy</button><p id="saveState">Changes last for this session until you save a copy.</p></section><p id="setupStatus" role="status"></p><p class="small">Works offline in a desktop browser. No account or Felt &amp; Fable editor needed. Open the downloaded HTML file itself, rather than a file preview.</p></dialog>'+
 '<dialog id="cueDialog" aria-labelledby="cueTitle"><div class="dialog-head"><h2 id="cueTitle">Cue times · seconds</h2><button id="cueClose">Cancel</button></div><p>Each time marks the start of one scene. The first scene begins at zero.</p><div id="cueRows"></div><label class="end-label">End of playback <input id="endTime" type="number" min=".1" step=".01"></label><p id="cueError" role="alert"></p><button id="cueApply" class="primary">Apply cue times</button></dialog>'+
 '<script type="application/json" id="storyData">'+json+'</script><script>'+runtime+'\nclassroomPlayer();</script></body></html>';
}
function classroomCSS(){return `*{box-sizing:border-box}html{height:100%;background:#102426;color:#fff6e7;font:18px system-ui,sans-serif}body{margin:0;min-height:100%;height:100dvh;display:flex;flex-direction:column}header,footer{padding:14px 24px;display:flex;justify-content:space-between;align-items:center;gap:16px;background:#0b1c1e}h1{font:600 clamp(20px,2vw,30px) Georgia,serif;margin:0}header>div,nav,.setup-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}button,select{font:inherit;min-height:48px;border:1px solid #9bb1ac;border-radius:9px;padding:10px 16px;color:inherit;background:#244447;cursor:pointer;touch-action:manipulation;user-select:none}select{max-width:100%}button:focus-visible,select:focus-visible,input:focus-visible{outline:3px solid #f8cc79;outline-offset:3px}button:disabled,input:disabled,select:disabled{opacity:.5;cursor:default}#next,.primary{background:#f1c374;color:#292716;font-weight:750}#next{min-width:190px}main{min-height:0;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px;gap:12px}#stage{display:block;min-height:0;width:100%;flex:1;object-fit:contain;background:#102426}#lyric{margin:0;max-width:1500px;text-align:center;font:600 clamp(24px,3.2vw,52px)/1.25 Georgia,serif;padding:0 24px 6px}#notice{font-size:14px;margin:5px 0;color:#c5d5ce}#musicControls{display:flex;gap:16px;padding:10px 24px;align-items:center}#seek{flex:1;min-width:70px}input{accent-color:#f1c374;font:inherit}label{white-space:nowrap}label input[type=checkbox]{width:19px;height:19px}#count,#clock{font-variant-numeric:tabular-nums}#clock{font-size:14px;white-space:nowrap}[hidden]{display:none!important}dialog{color:#fff6e7;background:#142e30;border:1px solid #829b94;border-radius:18px;width:min(760px,calc(100% - 28px));max-height:90dvh;padding:24px;box-shadow:0 24px 100px #0009}dialog::backdrop{background:#031012cf}dialog p{line-height:1.5}dialog h2{font:600 30px Georgia,serif;margin:0}dialog h3{font-size:19px;margin:0 0 12px}.dialog-head{display:flex;justify-content:space-between;align-items:center;gap:16px}.eyebrow{color:#f1c374;text-transform:uppercase;font-size:12px;letter-spacing:.14em;margin:0 0 6px}.setup-card{margin:16px 0;padding:18px;border:1px solid #476360;border-radius:12px;background:#1b393b}.setup-row{justify-content:space-between}.setup-card p,.small,#setupStatus,#saveState{font-size:14px;color:#d4e0d8}.file-label{display:block;white-space:normal}.file-label input{display:block;margin-top:10px;max-width:100%;font-size:14px}#songName{overflow-wrap:anywhere}#cueRows label,.end-label{display:flex;justify-content:space-between;gap:18px;align-items:center;white-space:normal;border-bottom:1px solid #476360;padding:12px 0}#cueRows span{font-size:15px}input[type=number]{width:110px;flex-shrink:0;background:#0b1c1e;color:#fff6e7;border:1px solid #9bb1ac;border-radius:7px;padding:10px}#cueError{color:#ffd0b1;font-size:14px}@media(max-width:1000px){header{flex-wrap:wrap}header>div{font-size:14px}}@media(max-width:800px){header,footer{padding:10px 12px;flex-wrap:wrap}nav{width:100%;display:grid;grid-template-columns:1fr 1fr}button,select{min-height:44px;padding:8px 12px}#next{min-width:0}#lyric{font-size:clamp(22px,5vw,36px);padding:0 8px}#notice{font-size:12px}#musicControls{gap:8px;padding:8px 12px;flex-wrap:wrap}dialog{padding:18px}.setup-card{padding:14px}}@media(max-height:600px){header,footer{padding:6px 12px}header h1{font-size:18px}button,select{min-height:38px;padding:6px 10px;font-size:14px}#lyric{font-size:24px}main{padding:4px;gap:4px}#notice{margin:2px 0}}`;}
