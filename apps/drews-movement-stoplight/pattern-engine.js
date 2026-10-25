/* Sample-clock scheduling: requests load first, then launch on a 4-beat boundary. */
(() => {
 'use strict';
 const BEAT=.6,BAR=2.4,LOOP=9.6,$=id=>document.getElementById(id);
 const catalog={"walk": ["Around the Block", "Marimba, guitar and high-low woodblocks · steady walking footsteps", "Walking"], "jog": ["Little Lap", "Steel pan, muted guitar and a 16-beat drum groove · quick, even jogging", "Jogging"], "skip": ["Sunshine Step-Hop", "High flute and pizzicato strings · cheerful long-short skips", "Skipping"], "gallop": ["Pony Trail", "Xylophone, guitar and woodblock · tum-ka, tum-ka", "Galloping"], "tiptoe": ["Moonlit Mouse", "High glockenspiel, pizzicato chords and bass, triangle · tiny quiet steps", "Tiptoeing"], "march": ["Pocket Parade", "Trumpet, tuba and snare · a clear left-right march", "Marching"], "hop": ["One-Foot Bounce", "Marimba chords, steady bass and random boings · springy hops", "Hopping"], "jump": ["Two Feet Together", "Marimba, plucked strings and vibraslap · jump, land, reset", "Jumping"], "slide": ["Silk Ribbon", "High flute, strings and slide whistle · accents in measures 1 and 3", "Sliding"], "stop": ["Freeze & Shimmer", "One warm G6/9 vibraphone chord · let it fade, then freeze", "Stop cue"]};
 let enabled=true,volume=.65,ctx=null,master=null,current=null,motion='stop',epoch=null,queued=null,serial=0,preview=null,failure=false,warming=false;
 let random=Math.random;
 const cache=new Map(),pending=new Map();
 let hopSamples=null,hopLoading=null;
 async function loadHopSamples(){
  if(hopSamples)return hopSamples;
  if(!hopLoading)hopLoading=Promise.all([1,2,3,4].map(async n=>{
   const r=await fetch('music/hop-samples/b'+n+'.wav?v=40');
   if(!r.ok)throw Error('Hop sample unavailable');
   return ctx.decodeAudioData(await r.arrayBuffer());
  })).then(samples=>hopSamples=samples).finally(()=>{hopLoading=null;});
  return hopLoading;
 }
 function stopHop(voice,at){
  const h=voice?.hop;if(!h)return;h.stopped=true;h.until=Math.min(h.until,at);
  for(const s of h.sources){try{s.stop(at);}catch{}}
 }
 function scheduleHop(voice){
  const h=voice?.hop;if(!h||h.stopped||!hopSamples)return;
  const time=now();
  // Skip missed beats after a stalled tab; never replay a burst of old strikes.
  while(h.origin+h.beat*BEAT<time-.02)h.beat++;
  while(h.origin+h.beat*BEAT<time+.10&&h.origin+h.beat*BEAT<h.until){
   const at=h.origin+h.beat*BEAT,source=ctx.createBufferSource(),level=ctx.createGain();
   source.buffer=hopSamples[Math.floor(random()*hopSamples.length)];source.loop=false;
   level.gain.value=.85;source.connect(level);level.connect(voice.gain);h.sources.add(source);
   source.onended=()=>{h.sources.delete(source);source.disconnect();level.disconnect();};
   source.start(at,0);h.beat++;
  }
 }
 try{const p=JSON.parse(localStorage.getItem('movement-music-v1'));if(p){enabled=p.enabled!==false;volume=Number.isFinite(p.volume)?Math.max(0,Math.min(1,p.volume)):.65;}}catch{}
 const now=()=>ctx?ctx.currentTime:performance.now()/1000;
 const emit=(name,detail)=>window.dispatchEvent(new CustomEvent(name,{detail}));
 function save(){try{localStorage.setItem('movement-music-v1',JSON.stringify({enabled,volume}));}catch{}}
 function ui(){
  const track=catalog[preview||motion];$('musicToggle').textContent=enabled?'♫ Music on':'♫ Music off';$('musicToggle').setAttribute('aria-pressed',String(enabled));
  $('musicVolume').value=Math.round(volume*100);$('musicVolumeValue').textContent=Math.round(volume*100)+'%';
  $('musicStatus').textContent=failure?'Audio unavailable — tap Music to retry':preview?'Preview: '+track[0]:!enabled?'Music muted · measure clock continues':motion==='stop'?'STOP · one vibraphone chord, then silence':track?track[0]+' · '+track[1]:'Music ready';
  $('musicStatus').classList.toggle('music-error',failure);
  document.querySelectorAll('[data-preview]').forEach(b=>{const on=preview===b.dataset.preview;b.textContent=on?'■ Stop':'▶ Listen';b.setAttribute('aria-pressed',String(on));});
 }
 async function unlock(){
  if(!ctx){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;ctx=new Audio();master=ctx.createGain();master.gain.value=enabled?volume:0;master.connect(ctx.destination);}
  if(ctx.state==='suspended')await ctx.resume();
 }
 async function buffer(id){
  if(id==='hop')await loadHopSamples();
  if(cache.has(id))return cache.get(id);if(pending.has(id))return pending.get(id);
  const task=(async()=>{let last;for(const ext of ['ogg','mp3']){try{const r=await fetch('music/'+id+'.'+ext+'?v=54');if(!r.ok)throw Error('HTTP '+r.status);const b=await ctx.decodeAudioData(await r.arrayBuffer());if(b.duration<(id==='stop'?4.8:LOOP)-.05)throw Error('Incomplete loop');cache.set(id,b);return b;}catch(e){last=e;}}throw last;})();
  pending.set(id,task);try{return await task;}finally{pending.delete(id);}
 }
 function stopVoice(voice,at=now()){if(!voice)return;stopHop(voice,at);try{voice.source.stop(at);}catch{}}
 function fadeVoice(voice,at,seconds=.008){if(!voice||!ctx)return;if(voice.hop)voice.hop.until=at;const g=voice.gain.gain;g.cancelScheduledValues(at);g.setValueAtTime(1,at);g.linearRampToValueAtTime(0,at+seconds);}
 function makeVoice(b,at,offset,loop=true,onFinish=null,id=null){
  const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=b;source.loop=loop;source.loopStart=0;source.loopEnd=LOOP;source.connect(gain);gain.connect(master);
  const voice={source,gain};
  if(id==='hop'){
   const phase=((offset%BEAT)+BEAT)%BEAT,wait=Math.min(phase,BEAT-phase)<1e-6?0:BEAT-phase;
   voice.hop={origin:at+wait,beat:0,until:Infinity,stopped:false,sources:new Set()};
  }
  gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(1,at+.006);source.onended=()=>{stopHop(voice,now());source.disconnect();gain.disconnect();onFinish?.();};source.start(at,Math.max(0,offset));scheduleHop(voice);return voice;
 }
 function warm(){if(warming||!ctx)return;warming=true;const ids=['stop',...Object.keys(catalog).filter(id=>id!=='stop')].filter(id=>!cache.has(id));const work=async()=>{while(ids.length){try{await buffer(ids.shift());}catch{}}};Promise.all([work(),work()]).finally(()=>{warming=false;});}
 function flush(){
  if(!queued||queued.at===null||now()<queued.at)return;
  const q=queued;queued=null;stopVoice(current,now()+.012);current=q.voice;motion=q.id;failure=Boolean(q.audioFailed);
  // Commit the new musical origin only when the post-Stop cue actually launches.
  if(q.restart)epoch=q.at;
  emit('movementqueued',{id:null});emit('movementcommitted',{id:motion,time:q.at});ui();
 }
 function cancelQueue(){
  flush();serial++;
  if(queued){stopVoice(queued.voice);queued=null;if(current&&ctx){current.gain.gain.cancelScheduledValues(now());current.gain.gain.setValueAtTime(1,now());if(current.hop)current.hop.until=Infinity;}}
  emit('movementqueued',{id:null});
 }
 function immediateStop(silent=true){
  cancelQueue();preview=null;fadeVoice(current,now(),.025);stopVoice(current,now()+.03);current=null;motion='stop';epoch=null;failure=false;
  if(master)master.gain.setTargetAtTime(enabled?volume:0,now(),.015);
  emit('movementcommitted',{id:'stop',time:now(),silent});ui();
  if(!silent&&enabled&&!document.hidden)playStopCue();
 }
 // End a timed session without changing the last displayed motion.
 function hold(){
  cancelQueue();preview=null;fadeVoice(current,now(),.025);stopVoice(current,now()+.03);current=null;epoch=null;emit('movementheld',{time:now()});ui();
 }
 async function playStopCue(){
  const token=serial;
  try{await unlock();if(!ctx||token!==serial||!enabled||document.hidden)return;
   const b=await buffer('stop');if(token!==serial||motion!=='stop'||!enabled||document.hidden)return;
   current=makeVoice(b,now()+.012,0,false);
  }catch{if(token===serial){failure=true;ui();}}
 }
 async function requestMotion(id,{immediate=false,silent=false}={}){
  if(id!=='stop'&&!catalog[id])return;
  if(immediate&&id==='stop'){immediateStop(silent);return;}
  cancelQueue();preview=null;if(id===motion&&epoch!==null){ui();return;}
  const token=++serial;queued={id,at:null,voice:null};emit('movementqueued',{id,loading:true});failure=false;ui();
  let b=null;
  try{
   await unlock();if(token!==serial)return;
   if(enabled&&ctx&&!(id==='stop'&&silent))b=await buffer(id);
   if(token!==serial||document.hidden)return;
  }catch{if(token!==serial)return;failure=true;}
  const t=now();let at;
  if(epoch===null||immediate){at=t+.06;epoch=at;}
  else at=epoch+(Math.floor((t+.06-epoch)/BAR)+1)*BAR;
  const restart=motion==='stop'&&id!=='stop';
  const offset=restart?0:((at-epoch)%LOOP+LOOP)%LOOP;
  let voice=null;
  if(b&&ctx){if(master)master.gain.setTargetAtTime(enabled?volume:0,t,.015);voice=makeVoice(b,at,id==='stop'?0:offset,id!=='stop',null,id);}
  if(current)fadeVoice(current,Math.max(t,at-.006),.006);
  queued={id,at,voice,restart,audioFailed:failure};emit('movementqueued',{id,loading:false,at});ui();if(ctx)warm();
 }
 function tick(){
  flush();const time=now(),phase=epoch===null?0:Math.max(0,time-epoch);
  scheduleHop(current);scheduleHop(queued?.voice);
  emit('movementclock',{running:epoch!==null,beat:Math.floor((phase+1e-6)/BEAT)%4+1,bar:Math.floor((phase+1e-6)/BAR)%4+1,remaining:queued&&queued.at!==null?Math.max(0,queued.at-time):null});
 }
 setInterval(tick,16);
 async function restoreAudio(){
  if(motion==='stop'||!enabled)return;const token=serial,id=motion;
  try{await unlock();const b=await buffer(id);if(token!==serial||id!==motion||!enabled||queued)return;
   if(!current){const at=now()+.04;current=makeVoice(b,at,((at-epoch)%LOOP+LOOP)%LOOP,true,null,id);}failure=false;ui();
  }catch{failure=true;ui();}
 }
 $('musicToggle').onclick=()=>{const retry=failure;failure=false;enabled=retry?true:!enabled;save();if(master)master.gain.setTargetAtTime(enabled?volume:0,now(),.02);if(queued){const id=queued.id;requestMotion(id);}else if(enabled)restoreAudio();ui();};
 $('musicVolume').oninput=e=>{volume=Number(e.target.value)/100;if(master)master.gain.setTargetAtTime(enabled||preview?volume:0,now(),.02);save();ui();};
 $('musicLibraryOpen').onclick=()=>{emit('openmusiclibrary',{});immediateStop();$('musicLibrary').showModal();};
 $('downloadSoundfont').onclick=async()=>{
  const button=$('downloadSoundfont');button.disabled=true;button.textContent='Preparing SoundFont…';
  try{
   const parts=[];
   for(let n=1;n<=3;n++){
    button.textContent=`Downloading SoundFont · ${n} / 3`;
    const response=await fetch(`assets/soundfont/GeneralUser-GS.part${n}.bin`);
    if(!response.ok)throw Error('Download failed');parts.push(await response.arrayBuffer());
   }
   const blob=new Blob(parts,{type:'application/octet-stream'});
   if(blob.size!==31281186)throw Error('Incomplete SoundFont');
   const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='GeneralUser GS v1.471.sf2';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
   button.textContent='Download SoundFont · 30 MB ↓';
  }catch{button.textContent='Download failed — try again';}
  finally{button.disabled=false;}
 };
 $('musicTrackList').innerHTML=Object.entries(catalog).map(([id,t])=>`<div class="music-track"><div><strong>${t[0]}</strong><span class="track-motion">${t[2]}</span><small>${t[1]}</small></div><div class="track-actions"><button type="button" data-preview="${id}" aria-label="Listen to ${t[0]}" aria-pressed="false">▶ Listen</button><a href="music/${id}.mid?v=48" download="${id}-100bpm.mid" aria-label="Download ${t[0]} MIDI">MIDI ↓</a></div></div>`).join('');
 $('musicTrackList').onclick=async e=>{
  const button=e.target.closest('[data-preview]');if(!button)return;const id=button.dataset.preview,was=preview;immediateStop();if(was===id)return;
  preview=id;const token=++serial;ui();try{await unlock();if(!ctx)throw Error('Audio unsupported');const b=await buffer(id);if(token!==serial||document.hidden)return;master.gain.setTargetAtTime(volume,now(),.015);const voice=makeVoice(b,now()+.03,0,id!=='stop',()=>{if(id==='stop'&&current===voice&&preview===id){current=null;preview=null;ui();}},id);current=voice;warm();}catch{if(token===serial){failure=true;ui();}}
 };
 $('musicLibrary').addEventListener('close',()=>immediateStop());
 document.addEventListener('visibilitychange',()=>{if(document.hidden)immediateStop();});
 // Action recording uses the audio clock, with no MediaRecorder or screen capture.
 async function prepare(){await unlock();if(!ctx)throw Error('Audio is unavailable in this browser.');await Promise.all(Object.keys(catalog).map(buffer));return ctx;}
 function setRandomSeed(seed){if(seed==null){random=Math.random;return;}let x=seed>>>0;random=()=>{x=(Math.imul(1664525,x)+1013904223)>>>0;return x/4294967296;};}
 window.MovementMusic={getVolume:()=>volume,prepare,clock:now,setRandomSeed,requestMotion,setMotion:id=>requestMotion(id,{immediate:true}),cancelQueue,hold,stop:immediateStop};ui();
})();
