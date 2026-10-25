import {barBeats} from './model.js';
export const MAX_WAV_BYTES=512*1024*1024;
export const sceneMeasures=scene=>Math.max(1,...scene.tracks.filter(t=>t.notes.length||t.controls.length).map(t=>t.bars));
export function suggestedTail(project){
 const {delay:d,reverb:r}=project.fx;
 const longestDelay=d.sync?60/project.tempo*Math.max(d.left,d.link?d.left:d.right):Math.max(d.timeL,d.link?d.timeL:d.timeR)/1000;
 const echoes=d.enabled?Math.min(120,Math.max(.01,longestDelay)*(d.feedback>0?Math.log(.001)/Math.log(d.feedback):1)):0;
 const space=r.enabled?r.predelay/1000+r.attack/1000+r.decay*Math.max(1,r.bass):0;
 return Math.min(180,Math.ceil(3+echoes+space));
}
export function createExportPlan(project,options={}){
 const rate=Number(options.sampleRate??48000),bits=Number(options.bitDepth??24),repeats=Number(options.repeats??1),tail=Number(options.tailSeconds??suggestedTail(project));
 if(![44100,48000].includes(rate)||![16,24].includes(bits))throw Error('Choose 44.1 or 48 kHz, and 16- or 24-bit WAV.');
 if(!Number.isInteger(repeats)||repeats<1||repeats>256)throw Error('Repeats must be a whole number from 1 to 256.');
 if(!Number.isFinite(tail)||tail<0||tail>180)throw Error('Tail length must be between 0 and 180 seconds.');
 if(!Number.isFinite(project.tempo)||project.tempo<20||project.tempo>300)throw Error('The project tempo is invalid.');
 const all=options.scope==='all',indices=all?project.scenes.flatMap((s,i)=>s.tracks.some(t=>t.notes.length)?[i]:[]):[project.scene];
 if(!indices.length||!indices.some(i=>project.scenes[i]?.tracks.some(t=>t.notes.length)))throw Error('Record a part in the selected scene before exporting audio.');
 const segments=[];let beats=0;
 for(const scene of indices){
  const measures=all?sceneMeasures(project.scenes[scene]):Number(options.measures??sceneMeasures(project.scenes[scene]));
  if(!Number.isInteger(measures)||measures<1||measures>65536)throw Error('Length must be a whole number from 1 to 65,536 measures.');
  const startFrame=Math.round(beats*60/project.tempo*rate);beats+=measures*repeats*barBeats(project);
  segments.push({scene,measures:measures*repeats,startFrame,endFrame:Math.round(beats*60/project.tempo*rate)});
 }
 const musicFrames=segments.at(-1).endFrame,tailFrames=Math.round(tail*rate),frames=musicFrames+tailFrames,bytes=44+frames*2*(bits/8);
 if(!Number.isSafeInteger(bytes)||bytes>MAX_WAV_BYTES)throw Error('This WAV exceeds 512 MiB. Export fewer measures or repeats, or choose 16-bit.');
 const solo=project.tracks.some(t=>t.solo);
 const audible=project.master>0&&indices.some(i=>project.scenes[i].tracks.some((c,t)=>c.notes.length&&!project.tracks[t].mute&&(!solo||project.tracks[t].solo)&&project.tracks[t].volume>0));
 return{rate,bits,segments,musicFrames,tailFrames,frames,bytes,seconds:frames/rate,audible,fadeFrames:tailFrames?Math.min(tailFrames,Math.round(rate*1.5)):Math.min(musicFrames,Math.round(rate*.005))};
}
export function wavHeader(plan){
 const buffer=new ArrayBuffer(44),view=new DataView(buffer),write=(at,s)=>{for(let i=0;i<s.length;i++)view.setUint8(at+i,s.charCodeAt(i))};
 write(0,'RIFF');view.setUint32(4,plan.bytes-8,true);write(8,'WAVE');write(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,plan.rate,true);view.setUint32(28,plan.rate*2*plan.bits/8,true);view.setUint16(32,2*plan.bits/8,true);view.setUint16(34,plan.bits,true);write(36,'data');view.setUint32(40,plan.bytes-44,true);return buffer;
}
export function encodePCM(left,right,bits,frame,plan,random=Math.random){
 const bytes=bits/8,buffer=new ArrayBuffer(left.length*2*bytes),view=new DataView(buffer),scale=2**(bits-1),fadeStart=plan.frames-plan.fadeFrames;let offset=0;
 for(let i=0;i<left.length;i++){
  const pos=frame+i,gain=pos<fadeStart?1:(plan.frames-1-pos)/Math.max(1,plan.fadeFrames-1);
  for(const value of[left[i],right[i]]){
   if(!Number.isFinite(value))throw Error('The audio engine produced an invalid sample.');
   // TPDF dither at conversion, but retain digital silence and a silent final sample.
   const dither=value!==0&&gain>0?random()-random():0;
   const sample=Math.max(-scale,Math.min(scale-1,Math.round(value*gain*scale+dither)));
   if(bits===16)view.setInt16(offset,sample,true);else{view.setUint8(offset,sample&255);view.setUint8(offset+1,(sample>>8)&255);view.setUint8(offset+2,(sample>>16)&255)}offset+=bytes;
  }
 }
 return buffer;
}
