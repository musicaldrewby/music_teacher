import {createScore,newPart,validateScore,MAX_EVENTS,MAX_PARTS} from './score-model.js';
export function importMIDI(buffer,presets,name='Imported MIDI'){
 const bytes=buffer instanceof Uint8Array?buffer:new Uint8Array(buffer);if(bytes.length>32*1024*1024)throw Error('MIDI files must be smaller than 32 MB.');let pos=0;
 const take=n=>{if(pos+n>bytes.length)throw Error('The MIDI file is truncated.');const out=bytes.subarray(pos,pos+n);pos+=n;return out};
 const u16=()=>{const b=take(2);return b[0]*256+b[1]},u32=()=>{const b=take(4);return b[0]*16777216+b[1]*65536+b[2]*256+b[3]},str=n=>new TextDecoder().decode(take(n));
 if(str(4)!=='MThd')throw Error('This is not a Standard MIDI file.');const header=u32();if(header<6)throw Error('Invalid MIDI header.');const format=u16(),count=u16(),division=u16();if(format>1)throw Error('MIDI format 2 contains separate songs. Export format 0 or 1 first.');if(!division||(division&32768))throw Error('Use a MIDI file with musical PPQ timing, rather than SMPTE timing.');take(header-6);if(count<1||count>256)throw Error('Unsupported MIDI track count.');
 const p=createScore(presets);p.name=name.replace(/\.mid(i)?$/i,'');p.tracks=[];p.tempo=120;p.tempoChanges=[];p.meters=[{beat:0,numerator:4,denominator:4}];p.markers=[];let endBeat=0,totalEvents=0;const warnings=[];
 for(let ti=0;ti<count;ti++){
  if(str(4)!=='MTrk')throw Error('Invalid MIDI track.');const size=u32(),end=pos+size;if(end>bytes.length)throw Error('The MIDI track is truncated.');let tick=0,running=0,trackName='Track '+(ti+1),port=0;const parts=new Map(),held=new Map();
  const byte=()=>{if(pos>=end)throw Error('A MIDI event extends past its track.');return bytes[pos++]};
  const vlq=()=>{let n=0;for(let i=0;i<4;i++){const b=byte();n=n*128+(b&127);if(!(b&128))return n}throw Error('Invalid MIDI variable-length number.')};
  const part=ch=>{const key=port+':'+ch;if(!parts.has(key)){const t=newPart(presets,0,ch===9,trackName+(count===1?' · Ch '+(ch+1):''));parts.set(key,t)}return parts.get(key)};
  while(pos<end){tick+=vlq();const beat=tick/division;endBeat=Math.max(endBeat,beat);if(++totalEvents>MAX_EVENTS*2)throw Error('This MIDI file has too many events.');let status=byte();if(status<128){if(!running)throw Error('Invalid MIDI running status.');pos--;status=running}else if(status<240)running=status;
   if(status===255){running=0;const type=byte(),len=vlq();if(pos+len>end)throw Error('Invalid MIDI metadata.');const d=take(len),text=new TextDecoder().decode(d).replace(/\0/g,'').trim();
    if(type===3){trackName=text||trackName;for(const t of parts.values())t.name=trackName}
    if(type===33&&len===1)port=d[0];
    if(type===81&&len===3){const micro=d[0]*65536+d[1]*256+d[2];if(!micro)throw Error('Invalid MIDI tempo.');p.tempoChanges.push({beat,tempo:60000000/micro})}
    if(type===88&&len>=2)p.meters.push({beat,numerator:d[0],denominator:2**d[1]});
    if((type===6||type===7)&&text)p.markers.push({beat,name:text});
    if(type===47){pos=end;break}continue;
   }
   if(status===240||status===247){running=0;const len=vlq();if(pos+len>end)throw Error('Invalid MIDI SysEx.');take(len);warnings.push('System-exclusive messages are omitted; General MIDI instruments are used.');continue}
   if(status>=240)throw Error('Unsupported MIDI system event.');
   const ch=status&15,type=status&240,a=byte(),b=(type===192||type===208)?0:byte();if(a>127||b>127)throw Error('Invalid MIDI data byte.');const t=part(ch),key=port+':'+ch+':'+a;
   if(type===144&&b){if(!held.has(key))held.set(key,[]);held.get(key).push({track:t,start:beat,pitch:a,velocity:b})}
   else if(type===128||type===144&&!b){const note=held.get(key)?.shift();if(note&&beat>note.start)note.track.notes.push({...note,track:undefined,duration:Math.max(.001,beat-note.start)})}
   else if(type===192){if(!t.notes.length&&!held.size&&beat===0){t.patch=newPart(presets,a,ch===9).patch}else t.programs.push({beat,program:a})}
   else if(type===176&&a<120)t.controllers.push({beat,type:'cc',controller:a,value:b});
   else if(type===224)t.controllers.push({beat,type:'bend',value:a+b*128});
   else if(type===208)t.controllers.push({beat,type:'pressure',value:a});
   else if(type===160)warnings.push('Polyphonic aftertouch is omitted.');
  }
  for(const queue of held.values())for(const n of queue)if(endBeat>n.start){n.track.notes.push({...n,track:undefined,duration:Math.max(.001,endBeat-n.start)});warnings.push('Unreleased notes were closed at the track end.')}
  for(const t of parts.values())if(t.notes.length){t.notes.sort((a,b)=>a.start-b.start);p.tracks.push(t)}
 }
 if(!p.tracks.length)throw Error('This MIDI file contains no playable notes.');if(p.tracks.length>MAX_PARTS)throw Error('This file has '+p.tracks.length+' parts. Soundroom supports 32; consolidate parts before importing. No music was replaced.');
 const unique=items=>[...new Map(items.sort((a,b)=>a.beat-b.beat).map(x=>[x.beat,x])).values()];p.tempoChanges=unique(p.tempoChanges);p.tempo=p.tempoChanges[0]?.beat===0?p.tempoChanges[0].tempo:120;p.meters=unique(p.meters);p.length=Math.max(.001,endBeat,...p.tracks.flatMap(t=>t.notes.map(n=>n.start+n.duration)));p.source='Imported Standard MIDI file: '+name;
 return {project:validateScore(p,presets),warnings:[...new Set(warnings)]};
}
