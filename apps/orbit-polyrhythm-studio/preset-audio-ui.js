import {presetAudioScore,presetAudioBytes} from './preset-audio-score.js';
import {showFilename,wavHeader,download} from './show-files.js';
const $=id=>document.getElementById(id);
export function installPresetAudio(bridge){
 const dialog=$('audioRenderDialog');let snapshot,job=null,fontPromise;
 const direct=()=>typeof window.showSaveFilePicker==='function';
 const format=()=>$('audioFormat').value==='mp3'?'mp3':'wav';
 const minutes=()=>+$($('audioMinutes').value==='custom'?'audioCustomMinutes':'audioMinutes').value;
 const status=text=>{$('audioRenderStatus').textContent=text};
 function controls(){const busy=!!job;$('audioFormat').disabled=busy;$('audioMinutes').disabled=busy;$('audioCustomMinutes').disabled=busy;$('audioRenderStart').disabled=busy||(!direct()&&minutes()>10);$('audioRenderCancel').hidden=!busy;$('audioRenderClose').disabled=busy;$('audioRenderOpen').disabled=busy;}
 function details(){const m=minutes(),f=format();$('audioRenderStart').textContent='Render '+f.toUpperCase();$('audioCustomLabel').hidden=$('audioMinutes').value!=='custom';$('audioCustomMinutes').max=direct()?60:10;$('audioRenderDetails').textContent=Number.isFinite(m)&&m>=1?`${m} minutes · stereo ${f.toUpperCase()} · ${f==='mp3'?'320 kbps':'48 kHz'} · ${f==='mp3'?'about ':''}${(presetAudioBytes(m,f)/1e6).toFixed(1)} MB`: 'Choose a duration from 1 to 60 minutes.';$('audioSaveHint').textContent=direct()?'Choose where to save; long renders write directly to your file.':'This browser can download renders up to 10 minutes. Longer renders need a browser with direct file saving.';for(const option of $('audioMinutes').options)if(option.value!=='custom')option.disabled=!direct()&&+option.value>10;controls();}
 async function font(){if(!fontPromise)fontPromise=Promise.all([0,1,2,3].map(async i=>{const r=await fetch(`assets/generaluser-${i}.bin`);if(!r.ok)throw Error('Could not load the SoundFont. Please try again.');return new Uint8Array(await r.arrayBuffer());})).then(parts=>{const bytes=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}return bytes.buffer;}).catch(e=>{fontPromise=null;throw e;});return (await fontPromise).slice(0);}
 async function writerFor(title,m,f){const filename=showFilename(title)+'.'+f,mime=f==='mp3'?'audio/mpeg':'audio/wav';if(direct()){
  try{const handle=await window.showSaveFilePicker({suggestedName:filename,types:[{description:'Stereo '+f.toUpperCase()+' audio',accept:{[mime]:['.'+f]}}]});const stream=await handle.createWritable();return {write:data=>stream.write(data),close:()=>stream.close(),abort:()=>stream.abort()};}
  catch(e){if(e.name==='AbortError')throw e;if(m>10)throw Error('Direct file saving is unavailable here. Open Orbit in its own browser tab, or choose 10 minutes or less.');}
 }
 if(m>10)throw Error('This browser supports downloads up to 10 minutes. Longer renders need direct file saving.');
 const chunks=[];return {write:async data=>{chunks.push(data)},close:async()=>{download(new Blob(chunks,{type:mime}),filename);chunks.length=0;},abort:async()=>{chunks.length=0;}};
 }
 async function finish(task,text,abort=false){if(task.finished)return;task.finished=true;task.worker?.terminate();try{if(task.writer)await(abort?task.writer.abort():task.writer.close());status(text);}catch(e){try{await task.writer?.abort();}catch{}status('Could not save the audio: '+e.message);}finally{if(job===task)job=null;controls();}}
 async function cancel(){const task=job;if(!task||task.finished)return;task.cancelled=true;task.worker?.terminate();status('Cancelling the render…');await task.queue.catch(()=>{});await finish(task,'Audio render cancelled.',true);}
 async function start(){if(job)return;let score;try{const other=bridge.otherStatus?.();if(other&&(other.running||other.paused||other.loading||other.exporting))throw Error('Stop the show or finish its export before rendering this preset.');score=presetAudioScore(snapshot,minutes());}catch(e){status(e.message);return;}
 const task={format:format(),cancelled:false,finished:false,writer:null,worker:null,queue:Promise.resolve(),begun:performance.now()};job=task;controls();$('audioRenderProgress').value=0;status('Choose a file for your audio…');
 try{task.writer=await writerFor(score.title,minutes(),task.format);if(task.cancelled){await task.writer.abort();return;}bridge.stop();status('Loading the SoundFont for an offline render…');const data=await font();if(task.cancelled||job!==task)return;
  task.worker=new Worker(task.format==='mp3'?'show-mp3-worker.js':'show-wav-worker.js',task.format==='mp3'?{}:{type:'module'});task.begun=performance.now();status('Rendering audio…');
  task.worker.onerror=e=>{task.queue=task.queue.then(()=>finish(task,'Audio render failed: '+e.message,true));};
  task.worker.onmessage=({data:m})=>{task.queue=task.queue.then(async()=>{if(task.finished||task.cancelled)return;
   if(m.type==='ready'&&task.format==='wav')await task.writer.write(wavHeader(m.frames));
   if(m.type==='chunk'){await task.writer.write(m.data);const p=m.progress,elapsed=(performance.now()-task.begun)/1000,remaining=p>.01?Math.max(0,Math.ceil(elapsed*(1-p)/p)):null;$('audioRenderProgress').value=p;status(`Rendering · ${Math.floor(p*100)}%${remaining===null?'':` · about ${remaining<60?remaining+' sec':Math.ceil(remaining/60)+' min'} remaining`}`);task.worker?.postMessage({type:'ack'});}
   if(m.type==='done'){$('audioRenderProgress').value=1;await finish(task,task.format.toUpperCase()+' saved. Your audio is ready to use.');}
   if(m.type==='cancelled')await finish(task,'Audio render cancelled.',true);
   if(m.type==='error')await finish(task,'Audio render failed: '+m.message,true);
  }).catch(e=>finish(task,'Audio render failed: '+e.message,true));};
  task.worker.postMessage({type:'render',font:data,score},[data]);
 }catch(e){await finish(task,e.name==='AbortError'?'Audio render cancelled.':e.message,true);}
 }
 function open(){if(job){if(!dialog.open)dialog.showModal();return;}snapshot=bridge.state();$('audioPresetName').textContent=snapshot.name;$('audioRenderProgress').value=0;status('Render the current preset with your sound, mix, reverb and dynamics.');details();dialog.showModal();}
 $('audioRenderOpen').onclick=open;$('audioMinutes').onchange=details;$('audioFormat').onchange=details;$('audioCustomMinutes').oninput=details;$('audioRenderStart').onclick=start;$('audioRenderCancel').onclick=cancel;$('audioRenderClose').onclick=()=>dialog.close();dialog.addEventListener('cancel',e=>{if(job){e.preventDefault();cancel();}});
 window.addEventListener('beforeunload',e=>{if(job){e.preventDefault();e.returnValue='';}});
 return {busy:()=>!!job,open,cancel};
}
