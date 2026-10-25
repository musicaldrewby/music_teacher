import {performedEvent} from './expression.js';
import {getInstrument,notesFor,audibleTracks,totalBeats} from './catalog.js';
import {voiceToneProfile} from './dynamics.js';
export class AudioEngine {
 constructor(){this.ctx=null;this.buffers=new Map();this.pending=new Map();this.voices=new Set();this.clicks=new Set();this.mix=null;this.project=null;this.manifestPromise=fetch('assets/audio/manifest.json').then(r=>{if(!r.ok)throw Error('Sound collection could not load. Reload the studio.');return r.json()});}
 async init(){if(!this.ctx){this.ctx=new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});this.mix=this.createMix(this.ctx);this.mix.out.connect(this.ctx.destination);}if(this.ctx.state==='suspended')await this.ctx.resume();this.manifest=await this.manifestPromise;return this;}
 createMix(ctx){const out=ctx.createGain(),master=ctx.createGain(),limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-5;limiter.knee.value=4;limiter.ratio.value=14;limiter.attack.value=.002;limiter.release.value=.15;master.connect(limiter);limiter.connect(out);
  const verb=ctx.createConvolver(),send=ctx.createGain(),echo=ctx.createDelay(2),feedback=ctx.createGain(),delaySend=ctx.createGain(),filter=ctx.createBiquadFilter();
  verb.buffer=this.reverbImpulse(ctx,2.4);send.connect(verb);verb.connect(master);delaySend.connect(echo);echo.connect(filter);filter.type='lowpass';filter.frequency.value=3800;filter.connect(master);filter.connect(feedback);feedback.gain.value=.28;feedback.connect(echo);
  const meter=ctx.createAnalyser();meter.fftSize=256;out.connect(meter);return {ctx,out,master,send,delaySend,echo,verb,reverbSeconds:2.4,meter,tracks:new Map()};
 }
 reverbImpulse(ctx,seconds){const length=Math.floor(ctx.sampleRate*seconds),ir=ctx.createBuffer(2,length,ctx.sampleRate);let seed=437;for(let ch=0;ch<2;ch++)for(let n=0;n<length;n++){seed=(seed*16807)%2147483647;ir.getChannelData(ch)[n]=(seed/2147483647*2-1)*Math.pow(1-n/length,3)*.35;}return ir;}
 meterLevel(id){const node=id==='master'?this.mix?.meter:this.mix?.tracks.get(id)?.meter;if(!node)return 0;const data=new Float32Array(node.fftSize);node.getFloatTimeDomainData(data);return Math.max(...data.map(Math.abs));}
 applyMix(p,mix=this.mix){if(!mix)return;const seconds=p.reverbDecay??2.4;if(mix.reverbSeconds!==seconds){mix.verb.buffer=this.reverbImpulse(mix.ctx,seconds);mix.reverbSeconds=seconds;}mix.bpm=p.bpm;mix.audible=new Set(audibleTracks(p).map(t=>t.id));mix.master.gain.value=p.master;mix.send.gain.value=p.reverb*.65;mix.delaySend.gain.value=p.delay*.45;mix.echo.delayTime.value=60/p.bpm*.75;for(const t of p.tracks)this.trackNodes(t,mix);}
 trackNodes(track,mix){let n=mix.tracks.get(track.id);if(!n){const g=mix.ctx.createGain(),pan=mix.ctx.createStereoPanner();g.connect(pan);const send=mix.ctx.createGain(),meter=mix.ctx.createAnalyser();meter.fftSize=256;pan.connect(mix.master);pan.connect(send);send.connect(mix.send);pan.connect(mix.delaySend);pan.connect(meter);n={g,pan,send,meter};mix.tracks.set(track.id,n);}n.g.gain.value=(!mix.audible||track.id==='audition'||mix.audible.has(track.id))?track.volume:0;n.pan.pan.value=track.pan;n.send.gain.value=track.reverbSend??1;return n;}
 // Some percussion pads share MIDI notes; note + shift preserves their saved identities.
 descriptor(inst,note,shift=0){const set=this.manifest?.instrumentSamples?.[inst.id],specific=set?.articulations?.[`${note}:${shift}`]||set?.notes?.[note]||(!set?.notes&&!set?.articulations?set:null);return {url:specific?.url||`assets/audio/${inst.family}/${note}.mp3`,gain:specific?.gain??1,tuningSemitones:specific?.tuningSemitones??0,loopStart:specific?.loopStart,loopEnd:specific?.loopEnd};}
 async load(inst,note,shift=0){await this.init();const d=this.descriptor(inst,note,shift);if(this.buffers.has(d.url))return this.buffers.get(d.url);if(this.pending.has(d.url))return this.pending.get(d.url);const job=(async()=>{const r=await fetch(d.url);if(!r.ok)throw Error(`${inst.name} sound could not load. Please try again.`);const b=await this.ctx.decodeAudioData(await r.arrayBuffer());this.buffers.set(d.url,b);return b})();this.pending.set(d.url,job);try{return await job}finally{this.pending.delete(d.url)}}
 // Per-note MIDI dynamics plus the established metallophone yarn-mallet voicing.
 voiceTone(inst,e,src,gain,ctx){
  const tone=voiceToneProfile(inst,e,ctx.sampleRate);
  if(!tone){src.connect(gain);return [];}
  const warmth=ctx.createBiquadFilter(),softness=ctx.createBiquadFilter();
  warmth.type='highshelf';warmth.frequency.value=tone.shelfHz;warmth.gain.value=tone.shelfDb;
  softness.type='lowpass';softness.frequency.value=tone.cutoffHz;softness.Q.value=tone.q;
  src.connect(warmth);warmth.connect(softness);softness.connect(gain);
  return [warmth,softness];
 }
 async prepareInstrument(inst,key='C'){await Promise.all(notesFor(inst,key).map(n=>this.load(inst,n.note,n.shift||0)));}
 async prepareProject(p){await this.init();await Promise.all(p.tracks.flatMap(t=>[...new Map(t.events.map(e=>[`${e.note}:${e.shift||0}`,e])).values()].map(e=>this.load(getInstrument(t.instrument),e.note,e.shift||0))));this.applyMix(p);}
 play(inst,e,track,when=this.ctx.currentTime,mix=this.mix,{hold=false}={}){
  e=performedEvent(track,e,{wind:inst.family==='recorder'});
  const d=this.descriptor(inst,e.note,e.shift||0),buffer=this.buffers.get(d.url);if(!buffer)return;
  const c=mix.ctx,src=c.createBufferSource(),gain=c.createGain(),wind=inst.family==='recorder';
  src.buffer=buffer;src.playbackRate.value=2**(((e.shift||0)+d.tuningSemitones)/12);
  const at=Math.max(c.currentTime,when),level=Math.max(.01,e.velocity??.8)*d.gain*.75;
  const toneNodes=this.voiceTone(inst,e,src,gain,c);gain.connect(this.trackNodes(track,mix).g);
  let end=at+buffer.duration/src.playbackRate.value;
  if(wind){
   if(Number.isFinite(d.loopStart)&&d.loopEnd>d.loopStart&&d.loopEnd<=buffer.duration){src.loop=true;src.loopStart=d.loopStart;src.loopEnd=d.loopEnd;}
   gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(level,at+.008);
   if(hold){end=Infinity;}else{
    const off=at+Math.max(.03,(e.duration??.5)*60/(mix.bpm||100));
    if(e.expressionEndRatio)gain.gain.linearRampToValueAtTime(level*e.expressionEndRatio,off);else gain.gain.setValueAtTime(level,off);gain.gain.linearRampToValueAtTime(0,off+.09);end=off+.10;
   }
  }else{gain.gain.value=level;if(e.dampAfter){const off=at+e.dampAfter*60/(mix.bpm||100);gain.gain.setValueAtTime(level,off);gain.gain.linearRampToValueAtTime(0,off+.05);end=Math.min(end,off+.06);}}
  src.start(at);if(wind&&!hold)src.stop(end);const v={src,gain,trackId:track.id,at,end,level,wind,released:false};
  if(mix===this.mix)this.voices.add(v);
  src.onended=()=>{src.disconnect();for(const node of toneNodes)node.disconnect();gain.disconnect();this.voices.delete(v)};
  return v;
 }
 release(v,when=this.ctx?.currentTime,seconds=.09){
  if(!v||v.released||!Number.isFinite(when))return;v.released=true;
  const at=Math.max(v.at,when);
  try{
   const param=v.gain.gain,held=v.wind?v.level*Math.min(1,(at-v.at)/.008):v.level;
   param.cancelScheduledValues(at);
   // Anchor the release explicitly, so a later ramp cannot start at the attack.
   if(v.wind&&at>v.at&&at<v.at+.008)param.linearRampToValueAtTime(held,at);else param.setValueAtTime(held,at);
   param.linearRampToValueAtTime(0,at+seconds);v.src.stop(at+seconds+.01);v.end=at+seconds+.01;
  }catch{}
 }
 stopClicks(){if(!this.ctx)return;const at=this.ctx.currentTime;for(const {src,gain} of this.clicks){try{gain.gain.cancelScheduledValues(at);gain.gain.setValueAtTime(0,at);src.stop(at);}catch{}}this.clicks.clear();}
 stop(trackId=null){if(!this.ctx)return;if(!trackId)this.stopClicks();const at=this.ctx.currentTime;for(const v of this.voices){if(trackId&&v.trackId!==trackId)continue;try{v.gain.gain.cancelScheduledValues(at);v.gain.gain.setValueAtTime(v.gain.gain.value,at);v.gain.gain.linearRampToValueAtTime(0,at+.03);v.src.stop(at+.04)}catch{}this.voices.delete(v);}}
 damp(trackId){this.stop(trackId);}
 click(when,accent=false,volume=.5){if(!this.ctx)return;const c=this.ctx;const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(accent?1800:1250,when);o.frequency.exponentialRampToValueAtTime(accent?1100:850,when+.04);g.gain.setValueAtTime(volume*.55,when);g.gain.exponentialRampToValueAtTime(.0001,when+.055);o.connect(g);g.connect(this.mix.master);const voice={src:o,gain:g};this.clicks.add(voice);o.start(when);o.stop(when+.06);o.onended=()=>{o.disconnect();g.disconnect();this.clicks.delete(voice)};}
 async render(p,{sampleRate=44100,tail=true,onProgress=()=>{}}={}){await this.prepareProject(p);onProgress(.1);const tracks=audibleTracks(p),sec=60/p.bpm;let end=totalBeats(p)*sec;for(const t of tracks)for(const e of t.events){const d=this.descriptor(getInstrument(t.instrument),e.note,e.shift||0),b=this.buffers.get(d.url);if(tail)end=Math.max(end,e.beat*sec+(getInstrument(t.instrument).family==='recorder'?performedEvent(t,e,{wind:true}).duration*sec+.1:b.duration/2**(((e.shift||0)+d.tuningSemitones)/12)));}if(tail)end+=p.reverb||p.delay?Math.max(p.reverb?(p.reverbDecay??2.4)+.6:0,p.delay?3:0):0;if(end>1800)throw Error('Please shorten this export to less than 30 minutes.');
  const offline=new OfflineAudioContext(2,Math.ceil((end+.06)*sampleRate),sampleRate),mix=this.createMix(offline);mix.out.connect(offline.destination);this.applyMix(p,mix);for(const t of tracks)for(const e of t.events)this.play(getInstrument(t.instrument),e,t,e.beat*sec+.02,mix);onProgress(.25);const buffer=await offline.startRendering();onProgress(.6);return buffer;
 }
}
export function wavBytes(buffer){const channels=buffer.numberOfChannels,n=buffer.length,bytes=new ArrayBuffer(44+n*channels*2),v=new DataView(bytes);const text=(at,s)=>{for(let i=0;i<s.length;i++)v.setUint8(at+i,s.charCodeAt(i))};text(0,'RIFF');v.setUint32(4,bytes.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,channels,true);v.setUint32(24,buffer.sampleRate,true);v.setUint32(28,buffer.sampleRate*channels*2,true);v.setUint16(32,channels*2,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,n*channels*2,true);const data=Array.from({length:channels},(_,c)=>buffer.getChannelData(c));for(let i=0;i<n;i++)for(let c=0;c<channels;c++){const s=Math.max(-1,Math.min(1,data[c][i]));v.setInt16(44+(i*channels+c)*2,s<0?s*32768:s*32767,true)}return bytes;}
export function encodeMp3(buffer,onProgress=()=>{}){return new Promise((resolve,reject)=>{const worker=new Worker('mp3-worker.js');worker.onerror=e=>{worker.terminate();reject(Error('MP3 encoder could not start. WAV export is available.'))};worker.onmessage=({data})=>{if(data.progress!==undefined)onProgress(data.progress);if(data.error){worker.terminate();reject(Error(data.error))}if(data.done){worker.terminate();resolve(new Blob(data.chunks,{type:'audio/mpeg'}))}};const l=buffer.getChannelData(0).slice(),r=buffer.getChannelData(1).slice();worker.postMessage({left:l,right:r,sampleRate:buffer.sampleRate},[l.buffer,r.buffer]);});}
