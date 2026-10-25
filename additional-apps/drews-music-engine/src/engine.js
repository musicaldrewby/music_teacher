import { SoundBankLoader, SpessaSynthProcessor, BasicMIDI } from 'spessasynth_core';

export const LIMIT_SECONDS = 300;
const number = (v, min, max, label) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) throw new Error(`${label} must be a number from ${min} to ${max}.`);
  return v;
};
const integer = (v, min, max, label) => {
  number(v,min,max,label); if (!Number.isInteger(v)) throw new Error(`${label} must be a whole number.`); return v;
};
export function noteNumber(value) {
  if (typeof value === 'number') return integer(value,0,127,'Note');
  const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(value || '');
  if (!m) throw new Error(`Invalid note ${String(value).slice(0,40)}. Use C4, F#3, Bb4, or MIDI 0–127.`);
  return integer((Number(m[3])+1)*12+({C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1].toUpperCase()])+(m[2]==='#'?1:m[2]==='b'?-1:0),0,127,'Note');
}
function tempoClock(song) {
  const tempo=number(song.tempo??100,20,300,'Tempo');
  const changes=[{beat:0,bpm:tempo},...(song.tempoChanges??[]).map(x=>({beat:number(x.beat,0,1500,'Tempo change beat'),bpm:number(x.bpm,20,300,'Tempo change BPM')}))].sort((a,b)=>a.beat-b.beat);
  const points=[];for(const x of changes){if(points.at(-1)?.beat===x.beat)points[points.length-1]=x;else points.push(x);}
  let sec=0;for(let i=0;i<points.length;i++){if(i)sec+=(points[i].beat-points[i-1].beat)*60/points[i-1].bpm;points[i].seconds=sec;}
  return beat=>{let p=points[0];for(const c of points){if(c.beat>beat)break;p=c;}return p.seconds+(beat-p.beat)*60/p.bpm;};
}
export function compileSong(input) {
  const song=typeof input==='string'?JSON.parse(input):input;
  if(!song||typeof song!=='object'||Array.isArray(song))throw new Error('A composition must be a JSON object.');
  if(!Array.isArray(song.tracks)||!song.tracks.length||song.tracks.length>16)throw new Error('Use 1–16 instrument parts.');
  const seconds=tempoClock(song),events=[],parts=[],channels=new Set();let lastBeat=0,noteCount=0;
  const emit=(beat,bytes,priority=1)=>events.push({time:seconds(beat),bytes,priority});
  for(let i=0;i<song.tracks.length;i++){
    const track=song.tracks[i];if(!track||typeof track!=='object')throw new Error(`Part ${i+1} is invalid.`);
    const channel=track.channel??(track.drums?9:Array.from({length:16},(_,j)=>j).find(j=>j!==9&&!channels.has(j)));
    integer(channel,0,15,'Channel');if(channels.has(channel))throw new Error('Each part needs a unique channel. Channel 9 is reserved for percussion.');channels.add(channel);
    if(track.drums&&channel!==9)throw new Error('Percussion must use channel 9 (MIDI channel 10).');
    const drums=channel===9;const program=integer(track.program??1,1,128,'GM program');
    const volume=number(track.volume??.8,0,1,'Part volume'),pan=number(track.pan??0,-1,1,'Pan');
    emit(0,[0xc0+channel,program-1],-3);emit(0,[0xb0+channel,7,Math.round(volume*127)],-2);emit(0,[0xb0+channel,10,Math.round((pan+1)*63.5)],-2);
    emit(0,[0xb0+channel,91,Math.round(number(track.reverbSend??.55,0,1,'Reverb send')*127)],-2);
    if(!Array.isArray(track.notes))throw new Error(`Part ${i+1} needs a notes array.`);
    for(const n of track.notes){
      if(!n||typeof n!=='object')throw new Error('Each note must be an object.');
      const start=number(n.beat??0,0,1500,'Note beat'),length=number(n.duration??1,.001,1500,'Note duration'),pitch=noteNumber(n.note);
      const velocity=integer(n.velocity??80,1,127,'Velocity');
      emit(start,[0x90+channel,pitch,velocity],1);emit(start+length,[0x80+channel,pitch,0],0);lastBeat=Math.max(lastBeat,start+length);noteCount++;
      if(noteCount>30000)throw new Error('This renderer supports up to 30,000 notes per composition.');
    }
    for(const c of track.controls??[]){const beat=number(c.beat,0,1500,'Controller beat');emit(beat,[0xb0+channel,integer(c.controller,0,119,'Controller'),integer(c.value,0,127,'Controller value')],-1);lastBeat=Math.max(lastBeat,beat);}
    for(const b of track.pitchBends??[]){const value=integer(b.value,0,16383,'Pitch bend'),beat=number(b.beat,0,1500,'Pitch bend beat');emit(beat,[0xe0+channel,value&127,value>>7],-1);lastBeat=Math.max(lastBeat,beat);}
    parts.push({name:String(track.name??(drums?'Percussion':`Part ${i+1}`)).slice(0,80),program,channel,drums,notes:track.notes.length});
  }
  if(!noteCount)throw new Error('Add at least one note before rendering.');
  const duration=Math.max(seconds(lastBeat),song.durationSeconds===undefined?0:number(song.durationSeconds,.01,LIMIT_SECONDS,'Duration'));
  if(duration>LIMIT_SECONDS)throw new Error('Keep the composition at five minutes or less.');
  events.sort((a,b)=>a.time-b.time||a.priority-b.priority);
  return {title:String(song.title||'Untitled composition').slice(0,120),duration,events,parts,noteCount,tempo:song.tempo??100,source:'json'};
}
export function compileMIDI(buffer,name='Imported MIDI') {
  const midi=BasicMIDI.fromArrayBuffer(buffer,name);
  if(midi.format===2||midi.isMultiPort)throw new Error('Please use a standard format 0 or 1 MIDI file with a single MIDI port.');
  if(!Number.isFinite(midi.duration)||midi.duration<=0||midi.duration>LIMIT_SECONDS)throw new Error('The MIDI must contain music lasting no more than five minutes.');
  const events=[],parts=new Map();let noteCount=0;
  for(const loc of midi.timeline){
    const track=midi.tracks[loc.tr],e=track.events[loc.ev],status=e.statusByte;
    if(status<0x80||status>0xef)continue;
    const ch=status&15,kind=status&0xf0;
    if(kind===0x90&&e.data[1]>0){noteCount++;const p=parts.get(ch)||{name:track.name||`Channel ${ch+1}`,channel:ch,drums:ch===9,program:1,notes:0};p.notes++;parts.set(ch,p);}
    if(kind===0xc0){const p=parts.get(ch)||{name:track.name||`Channel ${ch+1}`,channel:ch,drums:ch===9,notes:0};p.program=e.data[0]+1;parts.set(ch,p);}
    events.push({time:midi.midiTicksToSeconds(e.ticks),bytes:[status,...e.data]});
    if(events.length>200000)throw new Error('This MIDI contains too many events.');
  }
  if(!noteCount)throw new Error('The MIDI file contains no playable notes.');
  return {title:midi.getName()||name,duration:midi.duration,events,parts:[...parts.values()].filter(p=>p.notes),noteCount,tempo:null,source:'midi'};
}
export function getBankInfo(buffer){const bank=SoundBankLoader.fromArrayBuffer(buffer);return {bank,presets:bank.presets.map(p=>({name:p.name,program:p.program+1,bankMSB:p.bankMSB,bankLSB:p.bankLSB,drums:p.isGMGSDrum}))};}
export async function renderPCM(compiled,bank,options={},onProgress=()=>{}){
  const sampleRate=options.sampleRate??44100;if(![44100,48000].includes(sampleRate))throw new Error('Use 44100 or 48000 Hz.');
  const reverb=options.reverb??'room';if(!['dry','room','hall'].includes(reverb))throw new Error('Choose dry, room, or hall reverb.');
  const amount=number(options.reverbAmount??.28,0,1,'Reverb amount');
  const tail=number(options.tailSeconds??(reverb==='hall'?4:2),.2,8,'Release tail');
  const frames=Math.ceil((compiled.duration+tail)*sampleRate),left=new Float32Array(frames),right=new Float32Array(frames);
  const synth=new SpessaSynthProcessor(sampleRate,{maxBufferSize:128,effectsEnabled:reverb!=='dry',eventsEnabled:false});
  await synth.processorInitialized;synth.soundBankManager.addSoundBank(bank,'generaluser');synth.reset('gm');
  synth.setSystemParameter('voiceCap',256);synth.setSystemParameter('reverbGain',reverb==='dry'?0:amount*2);synth.setSystemParameter('chorusGain',0);synth.setSystemParameter('delayGain',0);synth.setSystemParameter('reverbLock',true);
  synth.reverbProcessor.character=reverb==='hall'?4:1;synth.reverbProcessor.time=reverb==='hall'?75:40;synth.reverbProcessor.level=80;synth.reverbProcessor.preDelayTime=reverb==='hall'?20:8;
  for(let c=0;c<16;c++){synth.controllerChange(c,91,64);synth.controllerChange(c,93,0);}
  let event=0,pos=0,released=false,lastReport=-1;
  try{
    while(pos<frames){
      while(event<compiled.events.length&&Math.round(compiled.events[event].time*sampleRate)<=pos){synth.processMessage(new Uint8Array(compiled.events[event++].bytes));}
      if(!released&&pos>=Math.ceil(compiled.duration*sampleRate)){for(let c=0;c<16;c++){synth.controllerChange(c,64,0);synth.controllerChange(c,123,0);}released=true;}
      const boundary=event<compiled.events.length?Math.round(compiled.events[event].time*sampleRate):frames;
      const releaseBoundary=released?frames:Math.ceil(compiled.duration*sampleRate);
      const size=Math.min(128,frames-pos,Math.max(1,boundary-pos),Math.max(1,releaseBoundary-pos));
      synth.process(left,right,pos,size);pos+=size;
      const p=Math.floor(pos/frames*100);if(p!==lastReport){lastReport=p;onProgress(p*.78,'Rendering instruments');}
    }
  }finally{
    // The parsed SoundFont is shared across renders. Detach it before destroying
    // this synthesizer so cleanup does not destroy the reusable sound bank.
    synth.stopAllChannels(true);synth.onMissingPreset=()=>undefined;
    synth.soundBankManager.deleteSoundBank('generaluser');synth.destroySynthProcessor();
  }
  let peak=0;for(let i=0;i<frames;i++){if(!Number.isFinite(left[i])||!Number.isFinite(right[i]))throw new Error('The synthesizer returned invalid audio.');peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));}
  if(peak<1e-7)throw new Error('The render is silent. Check note velocities and instrument levels.');
  const gain=options.normalize===false?Math.min(1,.95/peak):Math.min(4,.89/peak);
  const fade=Math.round(sampleRate*.08),intro=Math.round(sampleRate*.005);
  for(let i=0;i<frames;i++){const level=gain*Math.min(1,i/intro,(frames-1-i)/fade);left[i]*=level;right[i]*=level;}
  onProgress(80,'Preparing audio files');return {left,right,sampleRate,duration:frames/sampleRate,peak:peak*gain,gain};
}
export function encodeWAV(pcm){
  const {left,right,sampleRate}=pcm,n=left.length,b=new ArrayBuffer(44+n*4),v=new DataView(b);
  const str=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
  str(0,'RIFF');v.setUint32(4,36+n*4,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,sampleRate,true);v.setUint32(28,sampleRate*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,n*4,true);
  for(let i=0;i<n;i++){v.setInt16(44+i*4,Math.round(Math.max(-1,Math.min(1,left[i]))*32767),true);v.setInt16(46+i*4,Math.round(Math.max(-1,Math.min(1,right[i]))*32767),true);}return b;
}
export function waveform(pcm,count=180){const out=[];const step=Math.max(1,Math.floor(pcm.left.length/count));for(let i=0;i<count;i++){let peak=0;for(let j=i*step;j<Math.min((i+1)*step,pcm.left.length);j+=8)peak=Math.max(peak,Math.abs(pcm.left[j]),Math.abs(pcm.right[j]));out.push(peak);}return out;}
