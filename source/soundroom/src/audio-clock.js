// Map the playhead, or externally monitored input, to audible output.
// Do NOT use this for notes monitored through Soundroom: those are recorded
// at their actual rendering frame by the worklet, alongside the metronome.
// https://www.w3.org/TR/webaudio/#dom-audiocontext-getoutputtimestamp
export function inputAudioTime(audio,eventTimestamp,now=performance.now()){
 if(!audio)return 0;
 const at=Number.isFinite(eventTimestamp)&&eventTimestamp>=0&&eventTimestamp<=now+100?Math.min(eventTimestamp,now):now;
 try{
  const stamp=audio.getOutputTimestamp?.();
  if(stamp&&Number.isFinite(stamp.contextTime)&&stamp.contextTime>=0&&Number.isFinite(stamp.performanceTime)&&stamp.performanceTime>0&&Math.abs(now-stamp.performanceTime)<1000){
   return Math.max(0,Math.min(audio.currentTime,stamp.contextTime+(at-stamp.performanceTime)/1000));
  }
 }catch{}
 const latency=[audio.baseLatency,audio.outputLatency].reduce((sum,value)=>sum+(Number.isFinite(value)&&value>0?value:0),0);
 return Math.max(0,audio.currentTime-latency+(at-now)/1000);
}
