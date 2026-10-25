import {EVOLUTION_DEFAULT,GROOVE_DEFAULT} from './creative-settings.js';
import {evolutionPeriod,evolutionStage} from './generative.js';
const $=id=>document.getElementById(id),esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function installCreativeControls(bridge){
 let snapshot;
 function apply(change){const next=bridge.state();change(next);bridge.update(next);render();}
 function render(){snapshot=bridge.state();const e={...EVOLUTION_DEFAULT,...snapshot.evolution},g={...GROOVE_DEFAULT,...snapshot.groove};
  $('evolveEnabled').textContent=e.enabled?'● Evolving':'○ Enable';$('evolveEnabled').setAttribute('aria-pressed',e.enabled);$('evolveAmount').value=e.amount;$('evolveAmountValue').textContent=!e.amount?'Original':e.amount<=40?'Subtle':e.amount<=70?'Balanced':'Adventurous';$('evolvePath').disabled=!e.enabled;
  $('evolveLocks').innerHTML=snapshot.tracks.map((t,i)=>`<button type="button" data-evolve-lock="${i}" aria-pressed="${!!t.evolveLock}" title="${t.evolveLock?'Unlock':'Protect'} track ${i+1} from pattern evolution"><b>${String(i+1).padStart(2,'0')}</b><span>${esc(bridge.name(t))}</span><i aria-hidden="true">${t.evolveLock?'◆':'◇'}</i></button>`).join('');
  const locked=snapshot.tracks.filter(t=>t.evolveLock).length;$('evolveLockCount').textContent=locked+' / 8 protected';$('grooveFeel').value=g.feel;$('grooveAmount').value=g.amount;$('grooveAmount').disabled=g.feel==='straight';$('grooveAmountValue').textContent=g.amount+'%';$('grooveHumanize').value=g.humanize;$('grooveHumanizeValue').textContent=g.humanize+'%';
  $('creativeSummary').textContent=[e.enabled&&e.amount?'Evolving':'Original patterns',({straight:'Straight',swing:'Swing',shuffle:'Shuffle',laidback:'Laid-back'})[g.feel],g.humanize?'Human touch':''].filter(Boolean).join(' · ');
  tick(bridge.beat(),bridge.running());
 }
 function tick(beat,running){if(!snapshot)return;const e={...EVOLUTION_DEFAULT,...snapshot.evolution};let text='Written patterns stay unchanged.';if(e.enabled&&e.amount){const stage=evolutionStage(snapshot,beat),seconds=Math.max(1,Math.ceil((evolutionPeriod(snapshot)-(beat%evolutionPeriod(snapshot)))*60/snapshot.bpm));text=running?(stage?`Variation ${stage} · next in ${seconds}s`:`First variation in ${seconds}s`):'Press Play. The first variation arrives after about 20 seconds.';if(snapshot.tracks.filter(t=>!t.mute&&(!snapshot.tracks.some(x=>x.solo)||t.solo)).every(t=>t.evolveLock))text='All audible tracks are protected. Unlock a track to hear variations.';}if($('evolveStatus').textContent!==text)$('evolveStatus').textContent=text;}
 $('evolveEnabled').onclick=()=>apply(s=>{s.evolution={...EVOLUTION_DEFAULT,...s.evolution,enabled:!s.evolution?.enabled};});
 $('evolveAmount').oninput=()=>apply(s=>{s.evolution={...EVOLUTION_DEFAULT,...s.evolution,amount:+$('evolveAmount').value};});
 $('evolvePath').onclick=()=>apply(s=>{s.evolution={...EVOLUTION_DEFAULT,...s.evolution,seed:((s.evolution?.seed||1)%2147483645)+1};});
 $('evolveLocks').onclick=event=>{const b=event.target.closest('[data-evolve-lock]');if(b)apply(s=>{const t=s.tracks[+b.dataset.evolveLock];t.evolveLock=!t.evolveLock;});};
 for(const [id,key] of [['grooveFeel','feel'],['grooveAmount','amount'],['grooveHumanize','humanize']])$(id)[key==='feel'?'onchange':'oninput']=()=>apply(s=>{s.groove={...GROOVE_DEFAULT,...s.groove,[key]:key==='feel'?$(id).value:+$(id).value};});
 $('grooveReset').onclick=()=>apply(s=>{delete s.groove;});render();return {render,tick};
}
