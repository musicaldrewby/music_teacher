(() => {
 const $=id=>document.getElementById(id),dialog=$('videoExport'),data=window.MovementData,canvas=$('videoCanvas'),c=canvas.getContext('2d');
 const STORE='movement-video-v1';let seed=Math.floor(Math.random()*0xffffffff),job=null,downloadURL=null,plan=null,sourceGame=null,replayView=false;
 const defaults=()=>({fps:60,opening:'smoke',ending:'smoke',fast:true,resolution:1080,music:.65,stop:.65,boing:.65,engine:.65});
 let saved;try{saved=JSON.parse(localStorage.getItem(STORE))}catch{}
 const initial={...defaults(),...saved};
 initial.opening=saved?.opening??(saved?.smoke===false?'fade':'smoke');initial.ending=saved?.ending??(saved?.smoke===false?'fade':'smoke');
 const val=(id,fallback,min,max)=>{const value=Number($(id).value);return Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;};
 function config(){const shared=data.gameConfig(),repeats=sourceGame?.repeats||'1';return{...shared,fps:Number($('videoFps').value)===60?60:30,opening:$('videoOpening').value,ending:$('videoEnding').value,repeats:repeats==='forever'?1:Number(repeats)||1,forever:!!sourceGame&&repeats==='forever',fast:$('videoSpeed').value!=='realtime',resolution:Number($('videoResolution').value),music:val('videoMusic',65,0,100)/100,stop:val('videoStop',65,0,100)/100,boing:val('videoBoing',65,0,100)/100,engine:val('videoEngine',65,0,100)/100,seed:sourceGame?.seed??seed,moves:shared.moves.map(m=>({...m,weight:sourceGame?(sourceGame.selected.includes(m.id)?1:0):m.weight}))};}
 function makePlan(cfg){return sourceGame?MovementVideoPlan.fromSequence(sourceGame,cfg):MovementVideoPlan.build(cfg);}
 function duration(t){const seconds=Math.round(t);return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');}
 function update(){
  if(job)return;const cfg=config();$('videoEngine').disabled=!['smoke','bus'].includes(cfg.opening);$('videoAutomatic').hidden=!!sourceGame;$('videoShuffle').hidden=!!sourceGame;
  $('videoRepeatSummary').textContent=sourceGame?`Repeat: ${cfg.forever?'continuously · playback only':cfg.repeats===1?'once':cfg.repeats+' times'}. Change this in My games.`:'';
  $('videoSetupSummary').textContent=`${cfg.moves.filter(m=>m.weight>0).length} movements · ${duration(cfg.seconds)} · ${cfg.stopMode==='always'?'Stop every time':cfg.stopMode==='never'?'No stops between moves':'Occasional stops'}${data.getPreferences().sessionLength==0?' · 2-minute sequence for unlimited live play':''}`;
  for(const key of ['Music','Stop','Boing','Engine'])$('video'+key+'Value').textContent=$('video'+key).value+'%';
  try{plan=makePlan(cfg);$('videoSummary').textContent=`${duration(plan.gameDuration)} of movement + ${Number((plan.intro+plan.outro).toFixed(1))}s of instructions, transitions and thank-you card = ${duration(plan.total)} video · ${cfg.resolution}p / ${cfg.fps} fps. ${sourceGame?'Saved block timings are preserved.':'Changes land on measure boundaries.'}${cfg.forever?' Continuous replay; choose a finite repeat count to export.':''}`;$('videoStart').disabled=cfg.forever;$('videoPreview').disabled=false;}
  catch(e){plan=null;$('videoSummary').textContent=e.message;$('videoStart').disabled=true;$('videoPreview').disabled=true;}
  try{localStorage.setItem(STORE,JSON.stringify(cfg));}catch{}
 }
 function setBusy(busy){dialog.querySelectorAll('input,select,#videoShuffle,#videoEditSettings,#videoSaveGame').forEach(el=>el.disabled=busy);$('videoStart').disabled=busy||!plan||config().forever;$('videoPreview').disabled=busy||!plan;$('videoCancel').hidden=!busy;$('videoCancel').textContent=busy&&job&&!job.record?'■ End playback':'Cancel export';$('videoClose').disabled=busy&&!!job?.record;if(!busy)update();}
 function status(text){$('videoStatus').textContent=text;}
 async function decode(ctx,id){let error;for(const ext of ['ogg','mp3']){try{const response=await fetch(`music/${id}.${ext}?v=54`);if(!response.ok)throw Error('Audio load failed');return await ctx.decodeAudioData(await response.arrayBuffer());}catch(e){error=e;}}throw Error(`Could not load ${id} music. Please retry.`,{cause:error});}
 async function samples(ctx){return Promise.all([1,2,3,4].map(async n=>{const r=await fetch(`music/hop-samples/b${n}.wav?v=40`);if(!r.ok)throw Error('Could not load Hop sounds.');return ctx.decodeAudioData(await r.arrayBuffer());}));}
 async function engineSound(ctx){const r=await fetch('music/effects/engine-start.mp3?v=46');if(!r.ok)throw Error('Could not load the engine sound. Please retry.');return ctx.decodeAudioData(await r.arrayBuffer());}
 function schedule(j,buffers,boings){
  const {ctx,cfg,plan,start,destination}=j,random=MovementVideoPlan.rng(cfg.seed+37);
  function play(buffer,at,duration,volume,loop=false,offset=0){
   if(!buffer||volume<=0)return;const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;source.loop=loop;source.connect(gain);gain.connect(destination);gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume,at+.008);gain.gain.setValueAtTime(volume,at+Math.max(.008,duration-.025));gain.gain.linearRampToValueAtTime(0,at+duration);source.start(at,offset);source.stop(at+duration+.005);source.onended=()=>{source.finished=true;source.disconnect();gain.disconnect();};j.sources.push(source);
  }
  if(['smoke','bus'].includes(plan.opening??(cfg.smoke===false?'fade':'smoke'))&&buffers.engine)play(buffers.engine,start+(plan.fadeIn||0)+(plan.rulesDuration||0),Math.min(plan.openingDuration??plan.intro,buffers.engine.duration),cfg.engine??.65);
  let musicOrigin=0,restart=true;
  for(const s of plan.segments){const at=start+plan.intro+s.start;
   if(s.id==='stop'){if(!s.silent)play(buffers.stop,at,Math.min(s.duration,buffers.stop.duration),cfg.stop);restart=true;}
   else{if(restart||s.restart)musicOrigin=s.start;restart=false;play(buffers[s.id],at,s.duration,cfg.music,true,(s.start-musicOrigin)%MovementVideoPlan.LOOP);}
   if(s.id==='hop')for(let beat=0;beat<s.duration-.01;beat+=.6){const b=boings[Math.floor(random()*boings.length)];play(b,at+beat,Math.min(b.duration,s.duration-beat),cfg.boing*.85);}
  }
 }
 function chooseMime(){return ['video/mp4;codecs=avc1.424028,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(type=>MediaRecorder.isTypeSupported(type));}
 function compressor(ctx){const node=ctx.createDynamicsCompressor();node.threshold.value=-1;node.knee.value=2;node.ratio.value=20;node.attack.value=.003;node.release.value=.08;return node;}
 function finishDownload(blob,j){const ext=blob.type.includes('mp4')?'mp4':'webm';if(downloadURL)URL.revokeObjectURL(downloadURL);downloadURL=URL.createObjectURL(blob);const link=$('videoDownload');link.href=downloadURL;link.download=`Movement-Stoplight-${Math.round(j.plan.gameDuration)}s-${j.cfg.resolution}p-${j.cfg.fps}fps.${ext}`;link.textContent=`Download video · ${ext.toUpperCase()} · ${(blob.size/1048576).toFixed(1)} MB`;link.hidden=false;$('videoProgress').value=1;status('Your video is ready. Use Download video to save it.');}
 async function offlineAudio(j,buffers,boings){
  const ctx=new OfflineAudioContext(2,Math.ceil(j.plan.total*48000),48000),destination=compressor(ctx);destination.connect(ctx.destination);
  const audioJob={ctx,cfg:j.cfg,plan:j.plan,start:0,destination,sources:[]};schedule(audioJob,buffers,boings);
  const mixed=await ctx.startRendering();audioJob.sources.length=0;return mixed;
 }
 function clearJob(j){cancelAnimationFrame(j.raf);for(const s of j.sources)try{s.stop()}catch{};for(const track of j.stream?.getTracks()||[])track.stop();j.wake?.release().catch(()=>{});j.ctx.close().catch(()=>{});if(job===j)job=null;setBusy(false);}
 function stop(success=false,message){const j=job;if(!j)return;j.success=success;j.cancelled=!success;cancelAnimationFrame(j.raf);for(const s of j.sources)try{s.stop()}catch{}
  if(j.output&&!success)j.output.cancel().catch(()=>{});
  if(j.recorder&&j.recorder.state!=='inactive'){status(success?'Finishing your video…':message||'Export cancelled.');j.message=message;j.recorder.stop();}
  else{clearJob(j);status(message||(success?replayView?'Game complete.':'Preview complete.':'Cancelled.'));}
 }
 async function run(record){
  if(job)return;update();if(!plan)return;if(record&&config().forever){status('Choose a finite repeat count before exporting.');return;}
  const cfg=config(),fresh=makePlan(cfg),Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio){status('Audio export is unavailable in this browser. Please use a desktop browser.');return;}
  const ctx=new Audio(),j={ctx,cfg,plan:fresh,sources:[],chunks:[],cancelled:false,success:false,record,fast:record&&cfg.fast};job=j;setBusy(true);$('videoDownload').hidden=true;$('videoProgress').value=0;status('Preparing the illustrated scene and music…');
  try{
   await ctx.resume();const ids=[...new Set(['stop',...fresh.segments.map(s=>s.id)])];
   const [_,decoded,boings,engine]=await Promise.all([MovementScene.ready(),Promise.all(ids.map(id=>decode(ctx,id))),ids.includes('hop')?samples(ctx):Promise.resolve([]),['smoke','bus'].includes(fresh.opening)&&cfg.engine>0?engineSound(ctx):Promise.resolve(null),document.fonts?.ready]);
   if(j.cancelled||job!==j)return;const buffers=Object.fromEntries(ids.map((id,i)=>[id,decoded[i]]));buffers.engine=engine;
   canvas.width=cfg.resolution===720?1280:1920;canvas.height=cfg.resolution===720?720:1080;
   if(j.fast){let encoder,format;try{encoder=await import('./video-fast.js?v=45');format=await encoder.chooseFormat(canvas.width,canvas.height,cfg.fps);}catch{}
    if(j.cancelled||job!==j)return;
    if(format){
     try{j.wake=await navigator.wakeLock?.request('screen');}catch{}
     if(j.cancelled||job!==j){j.wake?.release();return;}
     const blob=await encoder.render({canvas,plan:fresh,format,fps:cfg.fps,renderFrame:t=>MovementScene.frame(c,canvas.width,canvas.height,t,fresh,cfg,data),renderAudio:()=>offlineAudio(j,buffers,boings),onProgress:(value,message)=>{if(job===j){$('videoProgress').value=value;status(message);}},isCancelled:()=>j.cancelled||job!==j,onOutput:output=>j.output=output});
     if(j.cancelled||job!==j)return;finishDownload(blob,j);clearJob(j);return;
    }
    j.fast=false;j.fallback='Fast rendering is unavailable here. ';
   }
   if(record&&(!window.MediaRecorder||!canvas.captureStream))throw Error('Video export is unavailable in this browser. Please use a current desktop browser.');
   if(document.hidden)throw Error('Keep this tab visible for real-time export or preview.');
   const recordedAudio=ctx.createMediaStreamDestination();j.destination=compressor(ctx);j.destination.connect(recordedAudio);j.destination.connect(ctx.destination);j.audioStream=recordedAudio.stream;
   if(record){const mime=chooseMime();if(!mime)throw Error('No supported video format was found in this browser.');j.stream=canvas.captureStream(cfg.fps);j.stream.addTrack(j.audioStream.getAudioTracks()[0]);
    j.recorder=new MediaRecorder(j.stream,{mimeType:mime,videoBitsPerSecond:(cfg.resolution===720?6000000:10000000)*(cfg.fps===60?1.6:1),audioBitsPerSecond:192000});
    j.recorder.ondataavailable=e=>{if(e.data.size)j.chunks.push(e.data);};
    j.recorder.onerror=()=>stop(false,'The browser could not finish encoding. Try 720p or a shorter video.');
    j.recorder.onstop=()=>{if(j.success&&j.chunks.length)finishDownload(new Blob(j.chunks,{type:j.recorder.mimeType}),j);else status(j.message||'Export cancelled.');clearJob(j);j.chunks=[];};
   }
   try{j.wake=await navigator.wakeLock?.request('screen');}catch{}
   if(j.cancelled||job!==j){j.wake?.release();return;}
   j.start=ctx.currentTime+.02;j.nextCycleAt=j.start+fresh.intro+fresh.gameDuration;schedule(j,buffers,boings);c.fillStyle='#000';c.fillRect(0,0,canvas.width,canvas.height);j.recorder?.start(1000);
   function draw(){if(job!==j||j.cancelled)return;try{
    const elapsed=Math.max(0,ctx.currentTime-j.start),loop=!record&&cfg.forever;
    if(loop&&ctx.currentTime+.2>=j.nextCycleAt){j.sources=j.sources.filter(s=>!s.finished);schedule({...j,start:j.nextCycleAt,plan:{...fresh,intro:0,outro:0,opening:'none',ending:'none',total:fresh.gameDuration}},buffers,boings);j.nextCycleAt+=fresh.gameDuration;}
    const viewTime=loop&&elapsed>=fresh.intro?fresh.intro+(elapsed-fresh.intro)%fresh.gameDuration:elapsed,frameIndex=Math.floor((elapsed+1e-6)*cfg.fps);
    if(j.lastFrame!==frameIndex||elapsed>=fresh.total){MovementScene.frame(c,canvas.width,canvas.height,viewTime,fresh,{...cfg,trafficTime:elapsed},data);j.lastFrame=frameIndex;}
    $('videoProgress').value=loop?(viewTime-fresh.intro)/fresh.gameDuration:Math.min(1,elapsed/fresh.total);
    status(`${j.fallback||''}${record?'Exporting in real time':sourceGame?'Replaying game':'Previewing'} · ${duration(loop?elapsed:Math.min(elapsed,fresh.total))}${loop?' · continuous':` / ${duration(fresh.total)}`}`);
    if(!loop&&elapsed>=fresh.total){stop(true);return;}j.raf=requestAnimationFrame(draw);
   }catch(e){stop(false,'Playback or export stopped: '+(e.message||'Could not draw the next frame. Please retry.'));}
   }

   draw();
  }catch(e){if(job!==j)return;stop(false,j.fast?'Fast render could not finish. Try a shorter game, 720p, or Real time and export again.':e.message||'The export could not start. Please retry.');}
 }
 for(const [id,key]of [['videoResolution','resolution'],['videoFps','fps']])$(id).value=initial[key];
 const transitionDefaults=MovementVideoPlan.transitions(initial);$('videoOpening').value=transitionDefaults.opening;$('videoEnding').value=transitionDefaults.ending;
 $('videoSpeed').value=initial.fast===false?'realtime':'fast';
 for(const [id,key]of [['videoMusic','music'],['videoStop','stop'],['videoBoing','boing'],['videoEngine','engine']])$(id).value=Math.round(Number(initial[key])*100);
 dialog.addEventListener('input',update);
 $('videoShuffle').onclick=()=>{seed=Math.floor(Math.random()*0xffffffff);update();status('A new movement order is ready.');};
 $('videoEditSettings').onclick=()=>{dialog.close();data.openSettings();};
 $('videoSaveGame').onclick=()=>{update();if(!plan)return;dialog.close();window.MovementGames.acceptGenerated(plan);};
 function refreshSources(){const list=window.MovementGames?.list()||[];if(sourceGame&&!list.some(g=>g.id===sourceGame.id))list.push(sourceGame);const select=$('videoSource');select.replaceChildren();const add=(value,text)=>{const o=document.createElement('option');o.value=value;o.textContent=text;select.appendChild(o);};add('auto','Use Game settings');for(const g of list)add(g.id,g.name);select.value=sourceGame?.id||'auto';}
 function open(play=false){replayView=play;dialog.classList.toggle('replay-mode',play);$('videoTitle').textContent=play?(sourceGame?.name||'Play game'):'Export video';$('videoPreview').textContent=play?'▶ Play again':'▶ Preview';$('videoMusic').value=Math.round((window.MovementMusic?.getVolume?.()??.65)*100);window.dispatchEvent(new CustomEvent('openvideoexport'));refreshSources();if(!dialog.open)dialog.showModal();update();status(play?'Preparing your game…':sourceGame?'Saved timings and repeat count are preserved. Choose your opening and ending.':'Uses the movements and timing in Game settings.');if(play){run(false);return;}MovementScene.ready().then(()=>{if(!job&&plan){canvas.width=1280;canvas.height=720;MovementScene.frame(c,1280,720,plan.intro,plan,config(),data);}}).catch(e=>status(e.message));}
 $('videoOpen').onclick=()=>{sourceGame=null;open();};
 $('videoSource').onchange=()=>{sourceGame=$('videoSource').value==='auto'?null:window.MovementGames?.get($('videoSource').value);update();};
 $('videoFullscreen').onclick=()=>{const stage=$('videoStage');if(document.fullscreenElement)document.exitFullscreen?.();else stage.requestFullscreen?.().catch(()=>status('Fullscreen is unavailable in this browser.'));};
 window.MovementVideoStudio={openSequence(game,repeats='1',play=false){sourceGame=window.MovementSequence.validate(game);sourceGame.repeats=String(repeats);open(play);}};
 $('videoPreview').onclick=()=>run(false);$('videoStart').onclick=()=>run(true);$('videoCancel').onclick=()=>stop(false);$('videoClose').onclick=()=>{stop(false,'Playback ended.');dialog.close();};
 dialog.addEventListener('cancel',e=>{if(job){e.preventDefault();stop(false);}});dialog.addEventListener('close',()=>stop(false));
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&job&&!job.fast)stop(false,'Stopped because the tab was hidden. Keep this tab visible while previewing or exporting in real time.');});
 update();
})();
