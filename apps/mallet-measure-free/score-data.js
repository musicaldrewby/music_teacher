// Optional score annotations are backward compatible with existing .orff projects.
export const writtenLength=e=>Number.isFinite(e.writtenDuration)&&!e.writtenDurationAuto?e.writtenDuration:Math.max(.25,Math.round((e.writtenDurationAuto?e.writtenDuration:e.duration)*4)/4);
export function validRestList(rests,total){
 if(rests===undefined)return true;
 if(!Array.isArray(rests)||rests.length>20000)return false;
 const ids=new Set();return rests.every(r=>{
  if(!r||typeof r.id!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(r.id)||ids.has(r.id)||!Number.isFinite(r.beat)||r.beat<0||r.beat>=total||Math.abs(r.beat*4-Math.round(r.beat*4))>1e-7||!Number.isFinite(r.duration)||r.duration<.25||r.beat+r.duration>total+1e-7||Math.abs(r.duration*4-Math.round(r.duration*4))>1e-7)return false;
  ids.add(r.id);return true;
 });
}
export const validTieBreaks=e=>e.tieBreaks===undefined||Array.isArray(e.tieBreaks)&&e.tieBreaks.length<=1024&&e.tieBreaks.every((b,i)=>Number.isFinite(b)&&b>0&&b<writtenLength(e)&&Math.abs(b*4-Math.round(b*4))<1e-7&&(i===0||b>e.tieBreaks[i-1]));

// A newly recorded or sequenced note wins over a prior explicit rest in that span.
export function reconcileScoreRests(track){
 if(!track.rests?.length)return;
 let rests=track.rests;
 for(const e of track.events){
  const start=Math.floor((e.beat+1e-7)*4)/4,end=Math.ceil((e.beat+e.duration-1e-7)*4)/4;
  rests=rests.flatMap(r=>{const finish=r.beat+r.duration;if(r.beat>=end-1e-7||finish<=start+1e-7)return [r];const parts=[];
   if(r.beat<start-1e-7)parts.push({...r,duration:start-r.beat});
   if(finish>end+1e-7)parts.push({...r,id:parts.length?(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2)):r.id,beat:end,duration:finish-end});
   return parts;});
 }
 track.rests=rests;
}
