// Expression is stored with notes. Sounding and written lengths remain independent.
export const DYNAMICS={pp:.3,p:.45,mp:.6,mf:.75,f:.9,ff:1};
export const ARTICULATIONS=['accent','staccato','tenuto','breath'];
export function validExpression(e){
 if(e.dynamic!==undefined&&!Object.hasOwn(DYNAMICS,e.dynamic))return false;
 if(e.articulations!==undefined&&(!Array.isArray(e.articulations)||e.articulations.length>4||e.articulations.some(a=>!ARTICULATIONS.includes(a))))return false;
 for(const key of ['hairpin','slur'])if(e[key]!==undefined){const s=e[key];if(!s||!Number.isFinite(s.endBeat)||s.endBeat<=e.beat||s.endBeat>2048)return false;if(key==='hairpin'&&(!['crescendo','diminuendo'].includes(s.type)||!Object.hasOwn(DYNAMICS,s.target)))return false;}
 return true;
}
export function expressionAt(track,beat){
 const events=(track.events||[]).filter(e=>e.beat<=beat).slice().sort((a,b)=>a.beat-b.beat);let level=null,ramp=null;
 for(const e of events){if(e.dynamic){level=DYNAMICS[e.dynamic];ramp=null;}if(e.hairpin){if(ramp)level=ramp.from+(ramp.to-ramp.from)*Math.min(1,(e.beat-ramp.start)/(ramp.end-ramp.start));ramp={start:e.beat,end:e.hairpin.endBeat,from:level??.75,to:DYNAMICS[e.hairpin.target]};}}
 if(ramp)level=ramp.from+(ramp.to-ramp.from)*Math.min(1,(beat-ramp.start)/(ramp.end-ramp.start));
 return level;
}
export function performedEvent(track,event,{wind=false}={}){
 const e={...event},level=expressionAt(track,e.beat),arts=e.articulations||[];
 e.velocity=Math.max(.01,Math.min(1,(e.velocity??.8)*(level===null?1:level/.8)*(arts.includes('accent')?1.25:1)));
 const slurred=(track.events||[]).some(n=>n.slur&&n.beat<=e.beat&&n.slur.endBeat>e.beat);
 if(wind){
  const next=(track.events||[]).filter(n=>n.beat>e.beat+1e-7).reduce((v,n)=>Math.min(v,n.beat),Infinity);
  if(slurred)e.duration=Math.max(e.duration,Math.min(next-e.beat,Number.isFinite(e.writtenDuration)?e.writtenDuration:e.duration)+.035);
  if(arts.includes('tenuto'))e.duration=Math.min(next-e.beat,Number.isFinite(e.writtenDuration)?e.writtenDuration:e.duration);
  if(arts.includes('staccato'))e.duration=Math.max(.03,e.duration*.5);
  if(arts.includes('breath'))e.duration=Math.max(.03,e.duration-Math.min(.25,e.duration*.2));
 }
 if(!wind&&arts.includes('staccato'))e.dampAfter=Math.max(.03,e.duration*.5);
 const endLevel=expressionAt(track,e.beat+e.duration);if(level!==null&&endLevel!==null&&level>0)e.expressionEndRatio=endLevel/level;
 return e;
}
export function applyExpression(track,ids,action,value){
 const selected=(track.events||[]).filter(e=>ids.includes(e.id)).sort((a,b)=>a.beat-b.beat);
 if(!selected.length)throw Error('Select one or more notes first.');
 if(action==='dynamic'){if(value&&!Object.hasOwn(DYNAMICS,value))throw Error('Choose a dynamic.');if(value)selected[0].dynamic=value;else delete selected[0].dynamic;}
 else if(action==='articulation'){if(!ARTICULATIONS.includes(value))throw Error('Choose an articulation.');const remove=selected.every(e=>e.articulations?.includes(value));for(const e of selected)e.articulations=remove?(e.articulations||[]).filter(a=>a!==value):[...new Set([...(e.articulations||[]),value])];}
 else if(action==='clear'){for(const e of selected){delete e.dynamic;delete e.articulations;delete e.hairpin;delete e.slur;}}
 else if(action==='slur'||action==='hairpin'){
  if(selected.at(-1).beat<=selected[0].beat)throw Error('Select notes at two or more different beats to mark a phrase.');
  const first=selected[0],endBeat=selected.at(-1).beat;
  if(action==='slur')first.slur={endBeat};else {const level=expressionAt(track,first.beat)??.75,target=DYNAMICS[value.target];if(!['crescendo','diminuendo'].includes(value.type)||!Number.isFinite(target))throw Error('Choose an end dynamic.');if(value.type==='crescendo'?target<=level:target>=level)throw Error('Choose an end dynamic '+(value.type==='crescendo'?'louder':'softer')+' than the starting dynamic.');first.hairpin={type:value.type,target:value.target,endBeat};}
 }
}
export function shiftExpression(e,delta,end=Infinity){for(const key of ['slur','hairpin'])if(e[key]){e[key]={...e[key],endBeat:Math.min(end,e[key].endBeat+delta)};if(e[key].endBeat<=e.beat)delete e[key];}return e;}
