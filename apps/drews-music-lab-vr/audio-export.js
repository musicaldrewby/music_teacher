import {SoundFontVoice,FONT_INSTRUMENTS} from './soundfont.js?v=43';
import {BoomwhackerVoice,BOOM_SAMPLES} from './boomwhacker-voice.js?v=42';
import {MusicAudio} from './audio.js?v=43';
import {WallSynth} from './synth.js?v=43';
import {BassVoice,bassEvent} from './bass.js?v=43';
import {SteelpanVoice} from './steelpan-voice.js?v=22';
import {ResonantVoice} from './resonant-voice.js?v=30';
import {validateSong} from './recorder.js?v=43';
import {instrument} from './piano-roll.js?v=30';
import {mixLevel} from './creative-tools.js?v=36';
export function songTimeline(input){const song=validateSong(input),beatSeconds=60/song.bpm,events=song.events.map(e=>({event:e,at:e.beat*beatSeconds}));
 for(let step=0;step<song.bars*16;step++){
  if(song.drumPattern)for(let row=0;row<4;row++)if(song.drumPattern[row][step%16])events.push({at:step*beatSeconds/4,event:{type:['kick','snare','hat','clap'][row],instrumentId:'drums',midi:60,velocity:.75,duration:.25}});
  if(song.bassPattern){const event=bassEvent(song.bassPattern,step%16);if(event)events.push({event,at:step*beatSeconds/4});}
 }
 return{song,beatSeconds,length:song.bars*4*beatSeconds,events:events.filter(x=>mixLevel(song,instrument(x.event))>0).sort((a,b)=>a.at-b.at)};
}
export function encodeWav(buffer){const channels=buffer.numberOfChannels,frames=buffer.length,bytes=frames*channels*2,out=new ArrayBuffer(44+bytes),v=new DataView(out);const word=(at,s)=>{for(let i=0;i<s.length;i++)v.setUint8(at+i,s.charCodeAt(i));};word(0,'RIFF');v.setUint32(4,36+bytes,true);word(8,'WAVE');word(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,channels,true);v.setUint32(24,buffer.sampleRate,true);v.setUint32(28,buffer.sampleRate*channels*2,true);v.setUint16(32,channels*2,true);v.setUint16(34,16,true);word(36,'data');v.setUint32(40,bytes,true);
 const data=Array.from({length:channels},(_,i)=>buffer.getChannelData(i));let peak=0;for(const d of data)for(const x of d)peak=Math.max(peak,Math.abs(x));const gain=peak>.98?.98/peak:1,fade=Math.min(frames,Math.ceil(buffer.sampleRate*.08));
 for(let i=0;i<frames;i++)for(let ch=0;ch<channels;ch++){const x=Math.max(-1,Math.min(1,data[ch][i]*gain*Math.min(1,(frames-1-i)/fade)));v.setInt16(44+(i*channels+ch)*2,Math.round(x*(x<0?32768:32767)),true);}return out;
}
export async function renderSongWav(input,liveAudio,progress=()=>{}){
 const Offline=globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext;if(!Offline)throw Error('Audio download is not supported in this browser. Your saved song is still available.');
 const {song,events,beatSeconds,length}=songTimeline(input);if(!events.length)throw Error('Turn on at least one recorded part before downloading.');
 let ending=length+.15;
 for(const {event:e,at}of events){let tail=2.5;
  if(e.type==='synth'){const p=e.patch,echo=p.delayMix>0?Math.min(14,p.delayTime*Math.log(.001)/Math.log(Math.max(.01,p.feedback))):0;tail=e.duration*beatSeconds+p.release+Math.max(p.reverbMix>0?1.8:0,echo);}
  else if(e.type==='gong'||e.type==='windchimes'){const buffer=liveAudio.resonant?.buffers.get(e.type==='gong'?'gong':'chime'),rate=e.type==='gong'?1:(440*2**((e.midi-69)/12))/587.3;tail=(buffer?.duration||8)/rate+1.8;}
  else if(e.type==='steelpan'){const note=Math.max(60,Math.min(83,Math.round(e.midi))),buffer=liveAudio.steelpan?.buffers.get(note+'-soft')?.buffer;tail=(buffer?.duration||4)/2**((e.midi-note)/12)+1.8;}
  else if(e.type==='boomwhacker'){const root=BOOM_SAMPLES.reduce((a,b)=>Math.abs(e.midi-a.midi)<=Math.abs(e.midi-b.midi)?a:b).midi;tail=(liveAudio.boomwhackers?.buffers.get(root)?.buffer.duration||3)/2**((e.midi-root)/12)+1.8;}else if(FONT_INSTRUMENTS[e.type])tail=FONT_INSTRUMENTS[e.type].gate+6+1.8;
  ending=Math.max(ending,at+tail);
 }
 const seconds=Math.min(120,ending+.15),ctx=new Offline(2,Math.ceil(seconds*44100),44100),audio=new MusicAudio();audio.offline=true;audio.init(ctx);
 audio.soundfont=liveAudio.soundfont;if(audio.soundfont)await audio.soundfont.prepare(ctx);audio.fontVoice=new SoundFontVoice(ctx,audio.master,audio.reverb,audio.soundfont);audio.boomwhackers=new BoomwhackerVoice(ctx,audio.master,audio.reverb);audio.boomwhackers.buffers=liveAudio.boomwhackers?.buffers||new Map();
 if(events.some(x=>FONT_INSTRUMENTS[x.event.type]||['synth','bass'].includes(x.event.type))&&!audio.soundfont)throw Error('SoundFont is not ready. Enable sound and try again.');
 if(events.some(x=>x.event.type==='boomwhacker')&&audio.boomwhackers.buffers.size!==22)throw Error('Boomwhacker recordings are not ready. Enable sound and try again.');
 audio.steelpan=new SteelpanVoice(ctx,audio.master,audio.reverb);audio.steelpan.buffers=liveAudio.steelpan?.buffers||new Map();audio.resonant=new ResonantVoice(ctx,audio.master,audio.reverb);audio.resonant.buffers=liveAudio.resonant?.buffers||new Map();
 if(events.some(x=>x.event.type==='steelpan')&&audio.steelpan.buffers.size!==48)throw Error('Steelpan samples are not ready. Enable sound and try again.');
 if(events.some(x=>['gong','windchimes'].includes(x.event.type))&&audio.resonant.buffers.size!==2)throw Error('Gong and chime samples are not ready. Enable sound and try again.');
 const routes=new Map(),synths=new Map(),bass=new BassVoice(audio);let cursor=0;
 const schedule=end=>{while(cursor<events.length&&events[cursor].at<end){const {event:e,at}=events[cursor++],id=instrument(e);let route=routes.get(id);if(!route){route={master:ctx.createGain(),reverb:ctx.createGain()};route.master.gain.value=route.reverb.gain.value=mixLevel(song,id);route.master.connect(audio.master);route.reverb.connect(audio.reverb);routes.set(id,route);}
  if(e.type==='bass')bass.play(e,at,beatSeconds,route.master);
  else if(e.type==='synth'){const key=id+JSON.stringify(e.patch);let engine=synths.get(key);if(!engine){engine=new WallSynth({soundfont:audio.soundfont,ctx,master:route.master,reverb:audio.reverb,offline:true});engine.patch={...e.patch};synths.set(key,engine);}engine.noteOn(e.midi,e.velocity,{when:at,durationSec:e.duration*beatSeconds});}
  else audio.play(e.type,e.midi,e.velocity,at,route);
 }};
 // Render in small scheduling windows so Quest does not create an entire
 // dense song's sample voices at once. No metronome or live microphone enters.
 schedule(1);await audio.soundfont?.flush(ctx);const pauses=[];for(let at=.8;at<seconds-.1;at+=.8)pauses.push(ctx.suspend(at));
 const rendered=ctx.startRendering();rendered.catch(()=>{});
 try{for(const pause of pauses){await pause;progress(Math.min(.96,ctx.currentTime/seconds));schedule(ctx.currentTime+1);await audio.soundfont?.flush(ctx);await ctx.resume();}const buffer=await rendered;progress(1);return new Blob([encodeWav(buffer)],{type:'audio/wav'});}finally{for(const engine of synths.values())engine.dispose();audio.soundfont?.dispose(ctx);}
}
