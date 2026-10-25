import {interval,notesFor} from './rhythm.js';
import {stepEvent,phrasePage} from './phrases.js';
// A stateless musical seed: live worklets and both offline exporters make the
// same choices without consuming the existing probability generator.
function unit(seed,a,b,c=0){let x=(seed^Math.imul(a+1,0x45d9f3b)^Math.imul(b+7,0x27d4eb2d)^Math.imul(c+13,0x165667b1))>>>0;x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);return ((x^(x>>>16))>>>0)/4294967296;}
export function evolutionPeriod(state){return Math.max(4,Math.ceil(20*state.bpm/240)*4);}
export function evolutionStage(state,beat){return state.evolution?.enabled?Math.max(0,Math.floor((beat+1e-8)/evolutionPeriod(state))):0;}
export function performanceEvent(t,s,count,index=0,beat=count*interval(t,s)){
 const base=stepEvent(t,count),result={...base,notes:notesFor(t,s,count),velocityScale:1};
 const settings=s.evolution,stage=evolutionStage(s,beat);
 if(!settings?.enabled||!stage||!settings.amount||t.evolveLock)return result;
 const amount=settings.amount/100,seed=settings.seed||1,step=count%t.steps,page=phrasePage(t,count),anchor=step===0||base.hit===2;
 const pad=t.bank!==128&&(t.voice==='chord'||(t.program>=88&&t.program<=95)||result.notes.length>1),bass=t.bank!==128&&t.program>=32&&t.program<=39;
 const choice=unit(seed,stage,index,step+(page?Math.floor(count/t.steps)%t.phrase.length*37:0));
 // Preserve the downbeat and written accents. Quiet fills only use existing notes.
 if(!pad&&!anchor){
  if(!base.hit&&choice<amount*.12){
   if(t.bank===128){result.hit=1;result.gate=Math.min(base.gate,85);}
   else if(page){const source=page.pattern.findIndex((v,j)=>v&&page.notes[j].length);if(source>=0){result.hit=1;result.notes=notesFor(t,s,count-step+source);result.gate=Math.min(stepEvent(t,count-step+source).gate,85);}}
   else{result.hit=1;result.gate=Math.min(base.gate,85);}
  }else if(base.hit===1&&choice>1-amount*.07)result.hit=0;
 }
 if(!result.hit||!result.notes.length)return result;
 if(pad&&choice<.35+amount*.5){
  const notes=[...result.notes].sort((a,b)=>a-b),up=unit(seed,stage,index,99)<.65;
  const which=up?0:notes.length-1,next=notes[which]+(up?12:-12);
  if(next>=36&&next<=96){notes[which]=next;result.notes=[...new Set(notes)].sort((a,b)=>a-b);}
 }else if(t.bank!==128&&!pad&&!anchor&&choice<amount*.6){
  const shift=1+Math.floor(unit(seed,stage,index,71)*3);
  if(page){const candidates=page.pattern.flatMap((v,j)=>v&&page.notes[j].length?[j]:[]);if(candidates.length){const ordinal=Math.max(0,candidates.indexOf(step));const source=candidates[(ordinal+shift)%candidates.length];result.notes=notesFor(t,s,count-step+source);}}
  else result.notes=notesFor(t,s,count+shift);
  // Bass stays in its existing register; other parts also retain written pitches.
  if(bass&&result.notes.some(n=>n<24||n>72))result.notes=notesFor(t,s,count);
 }
 result.velocityScale=1+((unit(seed,stage,index,step+201)-.5)*.2*amount);
 return result;
}
export function grooveBeat(t,s,count,index=0,nominal=count*interval(t,s)){
 const g=s.groove;if(!g)return nominal;
 const d=interval(t,s),step=count%t.steps;if(step===0)return nominal;
 const strength=(g.amount||0)/100;
 const feel=g.feel==='swing'?(step%2?d*.25*strength:0):g.feel==='shuffle'?(step%2?d/3*strength:0):g.feel==='laidback'?Math.min(d*.18,.035*s.bpm/60)*strength:0;
 const human=Math.min(d*.12,.022*s.bpm/60)*(g.humanize||0)/100*unit(g.seed||1,count,index,313);
 return nominal+Math.min(d*.45,feel+human);
}
export function grooveVelocity(velocity,s,count,index=0){const g=s.groove;if(!g?.humanize)return velocity;return Math.max(1,Math.min(127,Math.round(velocity+(unit(g.seed||1,count,index,719)*2-1)*12*g.humanize/100)));}
