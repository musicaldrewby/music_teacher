// Written rhythm can differ from articulation without changing playback.
export const validWrittenDuration=v=>v===undefined||v==='played'||(Number.isFinite(v)&&v>=.25&&v<=256&&Math.abs(v*4-Math.round(v*4))<1e-8);
export function writtenDuration(pattern,inst,event,beat,next,duration){
 if(Number.isFinite(event.writtenDuration)&&event.writtenDurationAuto!==true)return event.writtenDuration;
 if(event.writtenDuration!=='played'&&Number.isFinite(event.writtenDuration))duration=event.writtenDuration;
 if(event.writtenDuration==='played'||pattern.notation?.simplifyMalletGaps===false)return duration;
 const struck=['marimba','vibraphone','glockenspiel','timpani'].includes(inst.family)||['hand-drums','tubanos','bongos','temple-blocks','woodblock','castanets','claves','slapstick','agogo-bells','cowbell','side-drum'].includes(inst.id);
 // For struck instruments, isolated on-beat eighth releases occupy one written beat.
 // Keep subdivisions, offbeats, compound meter and explicit exact-length overrides.
 // Detached recorder phrases follow onset spacing, not key-release length.
 // Fill only short gaps (at most a quarter); longer silences remain rests.
 // At a phrase end, complete the current beat/subdivision, not the whole bar.
 if(inst.family==='recorder'&&pattern.meter!=='6/8'&&duration<=1+1e-8){
  const gap=next-beat;
  if(gap>0&&gap<=1+1e-8&&Math.abs(gap*4-Math.round(gap*4))<1e-8)return gap;
  const remainder=beat-Math.floor(beat);
  const boundary=remainder<1e-8?1:Math.abs(remainder-.5)<1e-8?.5:.25;
  return Math.max(duration,boundary);
 }
 if(struck&&pattern.meter!=='6/8'&&Math.abs(beat-Math.round(beat))<1e-8&&Math.abs(duration-.5)<1e-8&&next>=beat+1-1e-8)return 1;
 return duration;
}
