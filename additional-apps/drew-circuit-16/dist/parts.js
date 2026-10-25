import {clone,drumName} from './model.js';

const STEP_KEYS=['notes','on','velocity','gates','chance','ratchet','tie'];
const SEQUENCE_KEYS=['length','rate','direction','octave','chord',...STEP_KEYS];
const SOUND_KEYS=['program','bank','source'];
const BASS_SOUND_KEYS=['wave','cutoff','decay','slide','accent'];

export function partKind(id){
 if(/^track:[0-3]$/.test(id)||id==='bass')return 'sequence';
 if(/^row:[0-7]$/.test(id))return 'row';
 return id==='drums'?'drums':null;
}
export function getPart(pattern,id){
 if(/^track:[0-3]$/.test(id))return pattern.tracks[Number(id.slice(6))];
 if(/^row:[0-7]$/.test(id))return pattern.drums.lanes[Number(id.slice(4))];
 return id==='bass'?pattern.bass:id==='drums'?pattern.drums:null;
}
export function copyPart(pattern,id){
 const data=getPart(pattern,id);
 return data?{kind:partKind(id),source:id,data:clone(data)}:null;
}
export function canPastePart(clip,id){return !!clip&&clip.kind===partKind(id);}
export function canPasteSound(clip,id){
 return canPastePart(clip,id)&&(clip.kind!=='sequence'||(clip.source==='bass')===(id==='bass'));
}
// Only the destination part changes. Mixer, effects, other rows and other patterns stay intact.
export function pastePart(pattern,id,clip,includeSound=false){
 if(!canPastePart(clip,id))return false;
 const dest=getPart(pattern,id),source=clip.data,withSound=includeSound&&canPasteSound(clip,id);
 if(clip.kind==='sequence'){
  for(const key of SEQUENCE_KEYS)dest[key]=clone(source[key]);
  if(withSound){for(const key of SOUND_KEYS)dest[key]=clone(source[key]);
   if(id==='bass')for(const key of BASS_SOUND_KEYS)dest[key]=clone(source[key]);}
 }else if(clip.kind==='row'){
  dest.on=clone(source.on);
  if(withSound){dest.note=source.note;dest.volume=source.volume;dest.name=drumName(pattern.drums.kit,dest.note);}
 }else{
  dest.length=source.length;dest.rate=source.rate;
  if(withSound){dest.kit=source.kit;dest.lanes=clone(source.lanes);}
  else dest.lanes.forEach((lane,i)=>{lane.on=clone(source.lanes[i].on);});
 }
 return true;
}
