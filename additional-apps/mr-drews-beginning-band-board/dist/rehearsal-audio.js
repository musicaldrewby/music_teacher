import {beatInfo,tickDuration,clickSamples} from './rehearsal-model.js';
export class RehearsalAudio{
 constructor(settings,{onPulse=()=>{},onState=()=>{},onError=()=>{}}={}){this.settings=settings;this.onPulse=onPulse;this.onState=onState;this.onError=onError;this.ctx=null;this.running=false;this.starting=false;this.intent=0;this.nodes=new Set();this.alertNodes=new Set();this.buffers=new Map();this.queue=[];this.timer=null;this.worker=null;this.frame=null;this.next=0;this.tick=0;}
 async unlock(){
  if(!this.ctx){const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)throw new Error('Audio is unavailable in this browser.');this.ctx=new Audio({latencyHint:'interactive'});const c=this.ctx;this.output=c.createDynamicsCompressor();this.output.threshold.value=-3;this.output.knee.value=3;this.output.ratio.value=12;this.output.attack.value=.001;this.output.release.value=.06;this.output.connect(c.destination);this.metroGain=c.createGain();this.metroGain.gain.value=this.settings.volume/100;this.metroGain.connect(this.output);this.alertGain=c.createGain();this.alertGain.gain.value=this.settings.alertVolume/100;this.alertGain.connect(this.output);c.addEventListener('statechange',()=>{if(c.state!=='running'&&this.running){this.stop();this.onError('Audio paused. Press Start to resume the metronome.');}this.onState();});}
  if(this.ctx.state!=='running')await this.ctx.resume();if(this.ctx.state!=='running')throw new Error('Tap again to enable sound.');this.onState();return this.ctx;
 }
 get active(){return this.running||this.starting}
 get ready(){return this.ctx?.state==='running'}
 update(settings,reset=false){this.settings=settings;if(this.ctx){this.metroGain.gain.setTargetAtTime(settings.volume/100,this.ctx.currentTime,.01);this.alertGain.gain.setTargetAtTime(settings.alertVolume/100,this.ctx.currentTime,.01);}if(reset&&this.running){this.clearNotes(this.nodes);this.queue=[];this.tick=0;this.next=this.ctx.currentTime+.045;this.schedule();}}
 async start(){if(this.active)return;const intent=++this.intent;this.starting=true;this.onState();try{await this.unlock();if(intent!==this.intent)return;this.starting=false;this.running=true;this.next=this.ctx.currentTime+.06;this.tick=0;this.queue=[];this.schedule();this.startTimer();this.animate();this.onState();}catch(e){if(intent===this.intent){this.starting=false;this.onState();this.onError(e.message);}}}
 stop(){++this.intent;this.starting=false;this.running=false;this.worker?.postMessage('stop');clearInterval(this.timer);this.timer=null;cancelAnimationFrame(this.frame);this.frame=null;this.clearNotes(this.nodes);this.queue=[];this.onState();}
 clearNotes(set){for(const source of set){try{source.stop()}catch{}source.disconnect()}set.clear();}
 startTimer(){if(!this.worker&&globalThis.Worker){try{this.worker=new Worker(new URL('./metronome-worker.js',import.meta.url));this.worker.onmessage=()=>this.schedule();this.worker.onerror=()=>{this.worker?.terminate();this.worker=null;if(this.running&&!this.timer)this.timer=setInterval(()=>this.schedule(),25)};}catch{}}
  if(this.worker)this.worker.postMessage('start');else this.timer=setInterval(()=>this.schedule(),25);
 }
 buffer(kind,accent){const key=kind+accent;if(!this.buffers.has(key)){const data=clickSamples(kind,accent,this.ctx.sampleRate),b=this.ctx.createBuffer(1,data.length,this.ctx.sampleRate);b.copyToChannel(data,0);this.buffers.set(key,b)}return this.buffers.get(key)}
 click(time,info){const c=this.ctx,source=c.createBufferSource(),gain=c.createGain();source.buffer=this.buffer(this.settings.sound,info.accent);gain.gain.value=info.sub===0?1:.32;source.connect(gain);gain.connect(this.metroGain);this.nodes.add(source);source.onended=()=>{this.nodes.delete(source);source.disconnect();gain.disconnect()};source.start(time);}
 schedule(){if(!this.running||!this.ready)return;const now=this.ctx.currentTime;
  // A suspended/background tab must never dump a backlog of missed clicks.
  if(this.next<now-.03){this.next=now+.045;this.tick=0;this.queue=[];}
  while(this.next<now+.16){const info=beatInfo(this.tick,this.settings);this.click(this.next,info);this.queue.push({time:this.next,...info});this.next+=tickDuration(this.settings);this.tick++;}
 }
 animate(){if(!this.running)return;const stamp=this.ctx.getOutputTimestamp?.();const audible=stamp?.performanceTime>0?stamp.contextTime+(performance.now()-stamp.performanceTime)/1000:this.ctx.currentTime-(this.ctx.baseLatency||0);let pulse;while(this.queue.length&&this.queue[0].time<=audible)pulse=this.queue.shift();if(pulse)this.onPulse(pulse);this.frame=requestAnimationFrame(()=>this.animate());}
 async chime(){await this.unlock();this.clearNotes(this.alertNodes);const c=this.ctx,start=c.currentTime+.035;for(let repeat=0;repeat<2;repeat++)for(const [n,hz]of [880,1108.73,1318.51].entries()){const o=c.createOscillator(),g=c.createGain(),t=start+repeat*1.05+n*.22;o.type='triangle';o.frequency.value=hz;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.55,t+.008);g.gain.exponentialRampToValueAtTime(.001,t+.26);o.connect(g);g.connect(this.alertGain);this.alertNodes.add(o);o.onended=()=>{this.alertNodes.delete(o);o.disconnect();g.disconnect()};o.start(t);o.stop(t+.28);}}
 silenceAlert(){this.clearNotes(this.alertNodes)}
}
