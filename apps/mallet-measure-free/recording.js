import {quantizedBeat,uid} from './catalog.js';

// A fixed time window, independent of tempo and quantization resolution.
// Only the first downbeat gets this allowance; it is not a pickup measure.
export const EARLY_RECORD_SECONDS=.25;
export function recordingPosition(tr,at,total,grid,loop){
 if(!Number.isFinite(at)||!Number.isFinite(tr.start)||!(tr.sec>0))return null;
 const elapsed=at-tr.start,raw=elapsed/tr.sec;
 if(elapsed < -EARLY_RECORD_SECONDS-1e-9||!loop&&raw>=total)return null;
 if(!loop)return {cycle:0,beat:quantizedBeat(Math.max(0,raw),grid,total)};
 // Snap on the continuous timeline before choosing the loop. A strike nearest
 // the next downbeat belongs to that pass, not the previous pass's final cell.
 // This also absorbs floating-point error at an exactly timed loop boundary.
 const snapped=Math.round(Math.max(0,raw)/grid)*grid;
 return {cycle:Math.floor(snapped/total),beat:snapped%total};
}
export function finishRecordedHold(held,at){
 held.releasedAt=at;
 if(!held.event||!held.pitched||!Number.isFinite(at))return false;
 const played=Math.max(.01,(at-held.startedAt)/held.transport.sec);
 const written=Math.max(held.grid,Math.round(played/held.grid)*held.grid);
 const remaining=held.total-held.event.beat;
 held.event.duration=Math.min(remaining,held.quantizeLengths?written:played);
 // Keep the score's rhythm independent of the performed release.
 held.event.writtenDuration=Math.min(remaining,written);
 held.event.writtenDurationAuto=true;
 return true;
}
export function captureRecordedNote(tr,held,options){
 if(held.event)return false;
 if(!Number.isFinite(tr.start)){
  // Recording is armed while audio resumes/loads. Preserve the input time,
  // not the later promise-completion time. Expire old setup/count-in taps.
  tr.pending=tr.pending.filter(item=>item.options.at>=options.at-EARLY_RECORD_SECONDS);
  tr.pending.push({held,options});return false;
 }
 const {at,track,total,grid,duration,loop}=options,pos=recordingPosition(tr,at,total,grid,loop);
 if(!pos)return false;
 const {beat,cycle}=pos,event={...held.eventData,id:uid(),beat,duration:Math.min(held.pitched?grid:duration,total-beat)};
 track.events.push(event);tr.recorded.set(event.id,cycle);
 Object.assign(held,{event,track,transport:tr,absoluteBeat:cycle*total+beat,startedAt:at,quantizeLengths:options.quantizeLengths===true,grid,total});
 if(Number.isFinite(held.releasedAt))finishRecordedHold(held,held.releasedAt);
 return true;
}
export function flushRecording(tr){
 const pending=tr.pending;tr.pending=[];let count=0;
 for(const item of pending)if(captureRecordedNote(tr,item.held,item.options))count++;
 return count;
}
