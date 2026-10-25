import {PerformanceRecorder,formatRecordingTime} from './recorder.js?v=record-1';
const $=id=>document.getElementById(id);
export function createRecording({audio,ensureAudio,returnToInstrument,dampAll,toast,prepareRecording=dampAll}){
  let timer=0,preparing=false,take=null,takeNumber=0;
  const player=$('recordPlayback');
  const recorder=new PerformanceRecorder(audio,{onState:render,onComplete:complete,onError:error=>toast(error.message)});
  function render(){
    clearInterval(timer);timer=0;
    const active=recorder.state==='recording',busy=preparing||recorder.state==='stopping';
    $('recordBtn').disabled=busy;$('recordBtn').setAttribute('aria-pressed',String(active));
    $('recordBtn').setAttribute('aria-label',active?'Stop recording':'Start recording');
    $('recordLabel').textContent=preparing?'Wait…':recorder.state==='stopping'?'Saving…':active?'Stop':'Record';
    $('recordTools').classList.toggle('is-recording',active);
    $('recordTimer').hidden=!active;$('lastRecordingBtn').disabled=busy||active;
    if(active){const tick=()=>{$('recordTimer').textContent=formatRecordingTime(recorder.elapsed);};tick();timer=setInterval(tick,250);}
  }
  function showTake(){if(take){$('recordResult').hidden=false;returnToInstrument();}}
  function complete(result){
    player.pause();
    const old=take;take={...result,url:URL.createObjectURL(result.blob)};
    player.src=take.url;player.load();if(old)URL.revokeObjectURL(old.url);
    const stamp=new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
    $('recordDownload').href=take.url;$('recordDownload').download=`Mr-Drews-Auto-Harp-${stamp}.${take.extension}`;
    $('recordTakeLabel').textContent=`Take ${++takeNumber} · ${formatRecordingTime(take.duration)}`;
    $('lastRecordingBtn').hidden=false;showTake();
    $('recordStatus').textContent='Recording ready. Play it back or download your take.';
    if(result.interrupted)toast('The recording ended early. You can still play or download the captured audio.');
  }
  $('recordBtn').addEventListener('click',async()=>{
    returnToInstrument();
    if(recorder.state==='recording'){recorder.stop();return;}
    if(preparing||recorder.state!=='idle')return;
    if(!recorder.supported){toast('Recording is unavailable in this browser. Try opening the app in Safari or Chrome.');return;}
    preparing=true;render();
    try{
      if(!await ensureAudio())return;
      if(document.hidden)return;
      if(audio.muted||audio.settings.volume===0){toast('Turn the sound on and raise the volume before recording.');return;}
      player.pause();prepareRecording();
      recorder.start();$('recordResult').hidden=true;$('recordStatus').textContent='Recording started. Play the autoharp, then press Stop.';
    }catch(error){toast(error.message||'Recording could not start. Please try again.');}
    finally{preparing=false;render();}
  });
  $('closeRecording').addEventListener('click',()=>{player.pause();$('recordResult').hidden=true;returnToInstrument();});
  $('lastRecordingBtn').addEventListener('click',showTake);
  player.addEventListener('play',()=>{if(recorder.state!=='idle'){player.pause();return;}dampAll();});
  // End a take before a mobile browser suspends audio in the background.
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&recorder.state==='recording'){recorder.stop();toast('Recording stopped when you left the page. Your take is ready to save.');}});
  window.addEventListener('beforeunload',e=>{if(recorder.state!=='idle'){e.preventDefault();e.returnValue='';}});
  render();return recorder;
}
