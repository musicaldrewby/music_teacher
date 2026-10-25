// A take spans one press of Record through Stop, including any loop passes.
const history=p=>Array.isArray(p.recordingTakes)?p.recordingTakes:[];
const tracksFor=(p,section)=>section===p.activeSection?p.tracks:(Object.entries(p.sections?.find(s=>s.id===section)?.events||{}).map(([id,events])=>({id,events})));
export function rememberTake(p,tr){
 const ids=[...tr.recorded.keys()];if(!ids.length)return;
 p.recordingTakes=[...history(p),{section:tr.sectionId,noteIds:ids}].slice(-50);
}
export function latestTake(p){
 return history(p).findLast(t=>t&&typeof t.section==='string'&&Array.isArray(t.noteIds)&&tracksFor(p,t.section).some(track=>track.events.some(e=>t.noteIds.includes(e.id))))||null;
}
export function removeTake(p,take){
 if(!take)return 0;const ids=new Set(take.noteIds);let count=0;
 for(const t of tracksFor(p,take.section)){const kept=t.events.filter(e=>!ids.has(e.id));count+=t.events.length-kept.length;t.events=kept;}
 const section=p.sections?.find(s=>s.id===take.section);
 if(section)for(const id of Object.keys(section.events))section.events[id]=section.events[id].filter(e=>!ids.has(e.id));
 p.recordingTakes=history(p).filter(t=>t!==take);return count;
}
