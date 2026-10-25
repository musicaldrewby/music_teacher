import {validateProject,audibleTracks,getInstrument,totalBeats} from './catalog.js';

const SAMPLE_RATE=44100;
export function wavTracks(project){
 return project.master>0?audibleTracks(project).filter(t=>t.volume>0&&t.events.some(e=>e.velocity>0)):[];
}

// Standard interleaved 16-bit PCM for ordinary audio players and editors.
export function encodeWav(buffer){
 const channels=buffer.numberOfChannels,frames=buffer.length,bytes=frames*channels*2;
 const data=new ArrayBuffer(44+bytes),view=new DataView(data);
 const text=(at,s)=>{for(let i=0;i<s.length;i++)view.setUint8(at+i,s.charCodeAt(i));};
 text(0,'RIFF');view.setUint32(4,36+bytes,true);text(8,'WAVE');text(12,'fmt ');
 view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,channels,true);
 view.setUint32(24,buffer.sampleRate,true);view.setUint32(28,buffer.sampleRate*channels*2,true);
 view.setUint16(32,channels*2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,bytes,true);
 const samples=Array.from({length:channels},(_,ch)=>buffer.getChannelData(ch));
 for(let frame=0,at=44;frame<frames;frame++)for(let ch=0;ch<channels;ch++,at+=2){
  const value=samples[ch][frame],sample=Number.isFinite(value)?Math.max(-1,Math.min(1,value)):0;
  view.setInt16(at,Math.round(sample*(sample<0?32768:32767)),true);
 }
 return new Blob([data],{type:'audio/wav'});
}

export async function exportLoopWav(engine,rawProject){
 const project=validateProject(rawProject),tracks=wavTracks(project);
 if(!tracks.length)throw Error('Add notes to an audible part and turn up its level and Output before exporting.');
 const OfflineContext=globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext;
 if(!OfflineContext)throw Error('WAV export is unavailable in this browser. Try a current version of Chrome, Edge, Firefox, or Safari.');
 // Prepare only audible parts, leaving the live playback mix untouched.
 await engine.init();
 await Promise.all(tracks.flatMap(t=>[...new Map(t.events.filter(e=>e.velocity>0).map(e=>[`${e.note}:${e.shift||0}`,e])).values()].map(e=>engine.load(getInstrument(t.instrument),e.note,e.shift||0))));
 const secondsPerBeat=60/project.bpm;
 let end=totalBeats(project)*secondsPerBeat;
 for(const t of tracks)for(const e of t.events.filter(e=>e.velocity>0)){
  const inst=getInstrument(t.instrument),d=engine.descriptor(inst,e.note,e.shift||0),sound=engine.buffers.get(d.url);
  if(!sound)throw Error(`${inst.name} sound could not load. Please try again.`);
  const release=inst.family==='recorder'?e.duration*secondsPerBeat+.1:sound.duration/2**(((e.shift||0)+d.tuningSemitones)/12);
  const room=project.reverb>0&&(t.reverbSend??1)>0?(project.reverbDecay??2.4):0;
  const echo=project.delay>0?secondsPerBeat*.75*6:0;
  end=Math.max(end,e.beat*secondsPerBeat+release+Math.max(room,echo));
 }
 const frames=Math.ceil((end+.05)*SAMPLE_RATE),ctx=new OfflineContext(2,frames,SAMPLE_RATE);
 const mix=engine.createMix(ctx);engine.applyMix(project,mix);mix.out.connect(ctx.destination);
 // One pass from beat one, without the count-in or metronome.
 for(const t of tracks)for(const e of t.events)if(e.velocity>0)engine.play(getInstrument(t.instrument),e,t,e.beat*secondsPerBeat,mix);
 mix.out.gain.setValueAtTime(1,frames/SAMPLE_RATE-.02);
 mix.out.gain.linearRampToValueAtTime(0,frames/SAMPLE_RATE);
 return encodeWav(await ctx.startRendering());
}
