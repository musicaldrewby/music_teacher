import {prepareComposition,stopComposition} from './score-engine.js';
import {AudioTimeline} from './sequencer-model.js';
import {MetronomeRenderer} from './metronome.js';
// SoundroomBase is captured when the pinned SpessaSynth processor registers.
class SoundroomProcessor extends SoundroomBase {
 constructor(options){super(options);this.timeline=new AudioTimeline();this.metronome=new MetronomeRenderer(sampleRate);this.lastSync=-1;this.runId=null;this.liveInputs=[];const handle=this.core.handleMessage.bind(this.core);
  this.core.handleMessage=m=>{
   this.syncClock();
   if(m.type==='composition-start'){
    this.clearSequence();prepareComposition(this.core.synthesizer,m.project);this.runId=m.runId;this.composition=true;this.lastSync=-1;const origin=currentTime+.025;this.metronome.clear();this.timeline.start(m.score,origin);this.port.postMessage({type:'composition-started',runId:this.runId,origin});return;
   }
   if(m.type==='composition-stop'){if(this.composition){this.clearSequence();this.runId=null}return}
   if(m.type==='soundroom-start'){
    this.clearSequence();this.runId=m.runId;this.lastSync=-1;
    // Establish the start after the command reaches the audio thread. Patch
    // setup or a busy UI must never turn the first downbeat into a past event.
    const origin=currentTime+.025+m.score.countIn*m.score.secondsPerBeat;
    this.metronome.configure(m.score);this.timeline.start(m.score,origin);
    this.port.postMessage({type:'soundroom-started',runId:this.runId,origin});return;
   }
   if(m.type==='soundroom-live-input'){if(m.runId===this.runId)this.liveInputs.push(m);return}
   if(m.type==='soundroom-stop'){
    // Drain the final releases before acknowledging Stop. Main-thread delivery
    // may be late; it must not discard the last notes of a take.
    this.flushLiveInputs();const origin=this.timeline.origin;this.clearSequence();this.runId=null;
    this.port.postMessage({type:'soundroom-stopped',runId:m.runId,time:currentTime,origin});return;
   }
   if(m.type==='soundroom-metronome'){this.metronome.configure(m.settings);return}
   if(m.type==='soundroom-click-preview'){
    this.metronome.clear(true);if(m.cancel||this.timeline.playing)return;
    this.metronome.configure(m.settings);
    const tempo=Math.max(30,Math.min(300,Number(m.tempo)||100)),beats=Math.max(1,Math.min(12,Math.round(m.meter?.[0])||4)),unit=m.meter?.[1]===8?.5:1;
    for(let i=0;i<beats;i++)this.metronome.schedule(currentTime+.025+i*60/tempo*unit,i===0,true);
    return;
   }
   if(m.type==='soundroom-queue'){
    if(m.runId!==this.runId||!this.timeline.playing)return;
    if(m.cancel){this.pendingScene=null;return}
    const unit=m.barBeats;if(!Number.isFinite(unit)||unit<=0)return;
    // Always finish the current measure, even when requested on its downbeat.
    // Use the rendering frontier without a lookahead that could skip a late request.
    const beat=this.timeline.position(Math.max(currentTime,this.timeline.scheduledThrough)),boundary=Math.max(0,(Math.floor(beat/unit+1e-9)+1)*unit);
    this.pendingScene={score:m.score,scene:m.scene,queueId:m.queueId,time:this.timeline.timeAt(boundary)};
    this.port.postMessage({type:'soundroom-scene-queued',runId:this.runId,scene:m.scene,queueId:m.queueId,at:this.pendingScene.time});return;
   }
   if(m.type==='soundroom-score'){if(m.runId===this.runId&&this.timeline.playing)this.timeline.replace(m.score,currentTime);return}
   if(m.type==='soundroom-append'){if(m.runId===this.runId&&this.timeline.playing)this.timeline.append(m.events);return}
   handle(m);
  };
 }
 // The pinned engine advances its own clock by rendered sample counts. A
 // missed quantum must not leave that clock permanently behind the device.
 syncClock(time=currentTime){if(this.core.synthesizer)this.core.synthesizer.synthCore.currentTime=time}
 flushLiveInputs(){
  const inputs=this.liveInputs;this.liveInputs=[];
  for(const m of inputs){if(m.runId!==this.runId)continue;
   for(const message of m.messages)this.core.synthesizer.processMessage(message);
   // The live voice and the metronome share this rendering clock. Recording
   // this frame reproduces what was heard, without subtracting output latency.
   this.port.postMessage({type:'soundroom-input-recorded',runId:m.runId,inputId:m.inputId,method:m.method,args:m.args,time:currentTime+(m.adjustment||0)});
  }
 }
 clearSequence(){stopComposition(this.core.synthesizer);this.composition=false;this.pendingScene=null;this.liveInputs=[];this.timeline.stop();this.metronome.clear();this.core.synthesizer.synthCore.eventQueue.length=0;for(let ch=8;ch<16;ch++){this.core.synthesizer.midiChannels[ch].stopAllNotes(true);this.core.synthesizer.controllerChange(ch,64,0)}}
 process(inputs,outputs){if(!this.core.alive)return false;this.syncClock();this.flushLiveInputs();const frames=outputs[0]?.[0]?.length||128,end=currentTime+frames/sampleRate,wasPlaying=this.timeline.playing,scheduled=[];
  const collect=(e,time)=>{if(e.click)this.metronome.schedule(time,e.accent);else scheduled.push({message:e.message,offset:e.offset||0,time})};
  if(this.pendingScene&&this.pendingScene.time<end){
   const next=this.pendingScene;this.pendingScene=null;const boundary=Math.max(currentTime,next.time);
   this.timeline.tick(currentTime,boundary,collect);
   // Release the outgoing pattern at the exact boundary, preserving release
   // envelopes and shared reverb/delay buffers. Instrument programs stay put.
   for(let ch=8;ch<16;ch++){scheduled.push({message:[0xb0+ch,64,0],time:boundary},{message:[0xb0+ch,123,0],time:boundary})}
   this.timeline.start(next.score,boundary);this.timeline.tick(boundary,end,collect);
   this.port.postMessage({type:'soundroom-scene-switched',runId:this.runId,scene:next.scene,queueId:next.queueId,origin:boundary});
  }else this.timeline.tick(currentTime,end,collect);
  // The engine normally drains scheduled messages at block boundaries. Render
  // up to each note/controller first, then apply it at its exact sample frame.
  let cursor=0,alive=true;
  const renderUntil=frame=>{if(frame<=cursor)return;this.syncClock(currentTime+cursor/sampleRate);const block=cursor===0&&frame===frames?outputs:outputs.map(channels=>channels.map(samples=>samples.subarray(cursor,frame)));alive=super.process(inputs,block)&&alive;cursor=frame};
  for(const e of scheduled){const frame=Math.max(cursor,Math.min(frames,Math.round((e.time-currentTime)*sampleRate)));renderUntil(frame);this.syncClock(currentTime+frame/sampleRate);this.core.synthesizer.processMessage(e.message,e.offset||0)}
  renderUntil(frames);this.metronome.mix(outputs[0],currentTime);
  if(wasPlaying&&(currentTime-this.lastSync>.04||!this.timeline.playing)){this.lastSync=currentTime;this.port.postMessage({type:this.composition?'composition-position':'soundroom-position',runId:this.runId,beat:this.timeline.position(currentTime),playing:this.timeline.playing})}
  return alive;
 }
}
globalThis.registerProcessor('soundroom-worklet',SoundroomProcessor);
