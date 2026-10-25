import {ease} from './show-score.js';

// Audio telemetry is deliberately modest; the display samples its clock at the
// monitor's refresh rate. Retaining snapshots also respects output-device latency.
export class ShowClock {
 constructor(){this.frames=[];}
 push(snapshot,audioTime){
  if(!this.frames.length||snapshot.seconds<this.frames.at(-1).snapshot.seconds)this.frames=[];
  this.frames.push({snapshot,audioTime});if(this.frames.length>24)this.frames.shift();
 }
 resume(audioTime){const last=this.frames.at(-1);this.frames=last?[{snapshot:last.snapshot,audioTime}]:[];}
 sample(audioTime,layout){
  if(!this.frames.length)return null;
  let frame=this.frames[0];for(const f of this.frames){if(f.audioTime>audioTime)break;frame=f;}
  const s=frame.snapshot,cue=layout[s.index],next=layout[s.index+1];
  // Freeze on stalled telemetry; never invent seconds of unheard performance.
  const dt=Math.max(0,Math.min(.12,audioTime-frame.audioTime,s.total-s.seconds,next?Math.max(0,next.start-s.seconds):Infinity));
  const advance=deck=>({...deck,beat:deck.beat+dt*deck.state.bpm/60,motionTime:(deck.motionTime??s.seconds*deck.visual.speed)+dt*deck.visual.speed});
  const result={...advance(s),seconds:s.seconds+dt};
  if(s.previous){result.previous=advance(s.previous);result.blend=cue?.transition?Math.sin(ease((result.seconds-cue.start)/cue.transition)*Math.PI/2):1;}
  return result;
 }
}

export function displaySize(width,height,dpr=1,recording=false){
 if(recording)return [1920,1080];
 const cssWidth=Math.min(width,height*16/9),pixels=Math.max(640,Math.min(3840,cssWidth*Math.max(1,dpr)));
 const w=Math.round(pixels/32)*32;return [w,w*9/16];
}
