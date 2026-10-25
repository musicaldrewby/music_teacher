'use strict';
// Locally bundled note samples rendered from the teacher's GeneralUser GS SF2.
const SOUND_BANK_PATH='assets/audio/classroom-band.json';
let soundState='idle',soundLoad=null,soundBankData=null;
const sampledInstruments=new Map(),sampleVoices=new Set();
let stringVoices=[null,null,null,null],bassVoice=null,malletVoices=[],lastBandChord=null;
let bandBus=null,bandBuses={},roomBuffer=null;
function soundStatusText(){return {idle:'Sampled instruments load when you press Play.',loading:'Loading the ukulele and band…',ready:'Ukulele and band samples ready.',fallback:'Sampled sounds could not load. Basic sound is playing; you can retry below.'}[soundState];}
function updateSoundStatus(){const label=$('soundStatus'),retry=$('retrySounds');if(label)label.textContent=soundStatusText();if(retry)retry.hidden=soundState!=='fallback';}
async function readSoundBank(){if(soundBankData)return soundBankData;if(window.EMBEDDED_SOUNDBANK){soundBankData=window.EMBEDDED_SOUNDBANK;return soundBankData;}const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),15000);try{const response=await fetch(new URL(SOUND_BANK_PATH,location.href),{signal:abort.signal});if(!response.ok)throw Error('Instruments unavailable');const data=JSON.parse(await response.text());if(data.version!==1||!Array.isArray(data.samples)||data.samples.length<100)throw Error('Incomplete instruments');soundBankData=data;return data;}finally{clearTimeout(timer);}}
async function loadSampledSounds(){
 if(soundState==='ready')return;if(soundLoad)return soundLoad;
 soundState='loading';updateSoundStatus();toast('Loading the ukulele and band…');
 soundLoad=(async()=>{try{const bank=await readSoundBank(),decoded=new Map();let cursor=0;
  const worker=async()=>{while(cursor<bank.samples.length){const take=bank.samples[cursor++],binary=atob(take.audio),bytes=new Uint8Array(binary.length);for(let i=0;i<bytes.length;i++)bytes[i]=binary.charCodeAt(i);const buffer=await ctx.decodeAudioData(bytes.buffer);if(!buffer.length||buffer.duration<=take.offset)throw Error('Invalid sample');if(!decoded.has(take.instrument))decoded.set(take.instrument,[]);decoded.get(take.instrument).push({...take,audio:undefined,buffer});}};
  await Promise.all(Array.from({length:6},worker));for(const [id,takes] of decoded)sampledInstruments.set(id,takes);soundState='ready';if($('toast').textContent==='Loading the ukulele and band…')$('toast').textContent='';
 }catch(e){sampledInstruments.clear();soundState='fallback';toast('Sampled sounds could not load. Basic sound is available. Retry in Band.');}finally{soundLoad=null;updateSoundStatus();}})();return soundLoad;
}
const basicInitAudio=initAudio;
initAudio=async function(){await basicInitAudio();if(soundState==='idle'||soundState==='loading')await loadSampledSounds();};
function syncBandMix(){if(!ctx)return;const b=song.band||DEFAULT_BAND;if(bandBus)bandBus.gain.setTargetAtTime(b.enabled?1:0,ctx.currentTime,.015);for(const k of ['bass','drums','shaker','melody'])if(bandBuses[k])bandBuses[k].gain.setTargetAtTime(b[k]/100,ctx.currentTime,.015);}
const basicMakeGate=makeGate;
makeGate=function(){const result=basicMakeGate();stringVoices=[null,null,null,null];bassVoice=null;malletVoices=[];lastBandChord=null;bandBus=ctx.createGain();bandBus.connect(gate);bandBuses={};for(const key of ['bass','drums','shaker','melody']){const g=ctx.createGain();g.connect(bandBus);bandBuses[key]=g;}syncBandMix();
 // A short, quiet room tail stays behind the same stop/pause gate as the dry sound.
 if(ctx.createConvolver){if(!roomBuffer){const frames=Math.round(ctx.sampleRate*.24);roomBuffer=ctx.createBuffer(2,frames,ctx.sampleRate);let seed=4281;for(let ch=0;ch<2;ch++){const d=roomBuffer.getChannelData(ch);for(let i=0;i<frames;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;d[i]=i<ctx.sampleRate*.008?0:((seed>>>0)/2147483648-1)*Math.exp(-i/frames*6);}}}const room=ctx.createConvolver(),wet=ctx.createGain();room.buffer=roomBuffer;wet.gain.value=.075;ukeBus.connect(room);bandBuses.melody.connect(room);room.connect(wet);wet.connect(gate);}
 return result;};
const basicSilence=silence;
silence=function(){if(ctx)for(const voice of [...sampleVoices])voice.release(ctx.currentTime,.025);basicSilence();bandBus=null;bandBuses={};stringVoices=[null,null,null,null];bassVoice=null;malletVoices=[];};
function sampleNote(instrument,note,time,velocity,output,length=2.2,level=.5){
 const takes=sampledInstruments.get(instrument);if(!takes||!output)return null;
 const target=Math.round(clamp(velocity*118,20,118)),take=takes.reduce((best,x)=>!best||Math.abs(x.note-note)*1000+Math.abs(x.velocity-target)<Math.abs(best.note-note)*1000+Math.abs(best.velocity-target)?x:best,null);
 const source=ctx.createBufferSource(),gain=ctx.createGain(),rate=2**((note-take.note)/12),volume=level*Math.min(1.35,target/take.velocity);
 source.buffer=take.buffer;source.playbackRate.value=rate;gain.gain.setValueAtTime(volume,time);source.connect(gain);gain.connect(output);
 let released=Infinity;const naturalEnd=time+Math.min(length,take.duration/rate),voice={instrument,note,start:time,release(at,fade=.035){if(at>=released)return;released=at;gain.gain.cancelScheduledValues(at);gain.gain.setValueAtTime(at<time?0:volume,at);gain.gain.linearRampToValueAtTime(0,at+fade);try{source.stop(at+fade+.005);}catch{}}};
 source.start(time,take.offset);voice.release(naturalEnd,.05);sampleVoices.add(voice);source.onended=()=>{source.disconnect();gain.disconnect();sampleVoices.delete(voice);};return voice;
}
const basicStrum=strum,basicChuck=chuck;
strum=function(chord,time,velocity,up=false,muted=false){
 if(midiOut||soundState!=='ready'){basicStrum(chord,time,velocity,up,muted);return;}
 const f=CHORD_FINGERINGS[chord];if(!f)return;const order=up?[3,2,1,0]:[0,1,2,3],spread=up?.008:.011;
 for(let i=0;i<4;i++){const string=order[i],at=time+i*spread,note=[67,60,64,69][string]+f[string],touch=1+Math.sin(time*13+string*2.1)*.035;
  stringVoices[string]?.release(at,.018);stringVoices[string]=sampleNote('uke',note,at,velocity*touch*(up?(string<2?.7:.86):1),ukeBus,muted?.07:2.15,.36);
 }
};
chuck=function(time,velocity){if(midiOut||soundState!=='ready'){basicChuck(time,velocity);return;}for(const v of stringVoices)v?.release(time,.018);sampleNote('chuck',60,time,velocity*.7,ukeBus,.075,.25);};
function fallbackBandNote(ev,time){const dest=bandBuses[ev.channel];if(!dest)return;const source=ev.channel==='drums'||ev.channel==='shaker'?ctx.createBufferSource():ctx.createOscillator(),g=ctx.createGain();
 if(source.frequency){source.type=ev.channel==='bass'?'triangle':'sine';source.frequency.value=440*2**((ev.note-69)/12);}else{const b=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.09),ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.exp(-i/d.length*5);source.buffer=b;}
 g.gain.setValueAtTime(ev.velocity*.18,time);g.gain.exponentialRampToValueAtTime(.0001,time+ev.length);source.connect(g);g.connect(dest);source.start(time);source.stop(time+ev.length+.01);source.onended=()=>{source.disconnect();g.disconnect();};}
function playBandEvent(ev,time){if(soundState!=='ready'){fallbackBandNote(ev,time);return;}const v=sampleNote(ev.instrument,ev.note,time,ev.velocity,bandBuses[ev.channel],ev.length,ev.channel==='bass'?.62:ev.channel==='shaker'?.45:.5);if(ev.channel==='bass'){bassVoice?.release(time,.025);bassVoice=v;}else if(ev.channel==='melody'&&v){malletVoices=malletVoices.filter(x=>sampleVoices.has(x));malletVoices.push(v);}}
function dampChangedChord(chord,time){if(lastBandChord!==chord){bassVoice?.release(time,.03);for(const v of malletVoices)v.release(time,.045);malletVoices=[];if(chord==='--')for(const v of stringVoices)v?.release(time,.025);lastBandChord=chord;}}
