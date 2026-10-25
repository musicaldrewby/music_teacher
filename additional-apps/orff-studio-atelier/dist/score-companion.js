import {getInstrument,notesFor,writtenOctave,noteName,isBarred} from './catalog.js';
import {recorderFingering,fingeringDiagram} from './recorder-fingering.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function scoreCompanionNotes(project,track,state,selectedId){
 const ids=new Set((state.selection?.items||[]).filter(i=>!i.rest).map(i=>i.id));
 if(ids.size)return track.events.filter(e=>ids.has(e.id));
 if(state.selection?.span||state.restId)return [];
 const anchor=track.events.find(e=>e.id===(state.tool==='chord'?state.chordId:selectedId));
 if(anchor)return state.tool==='chord'?track.events.filter(e=>Math.abs(e.beat-anchor.beat)<1e-7):[anchor];
 const n=notesFor(getInstrument(track.instrument),project.key,track.pentatonic).find(n=>n.index===state.pitchIndex&&n.enabled&&!track.removed?.includes(n.index));return n?[n]:[];
}
export function mountScoreCompanion(root,project,track,{artwork,notes=[],audition}){
 const inst=getInstrument(track.instrument),wind=inst.shape==='recorder',choices=notesFor(inst,project.key,track.pentatonic).map(n=>({...n,enabled:n.enabled&&!track.removed?.includes(n.index)}));
 root.innerHTML=`<section class="score-companion ${wind?'score-companion-recorder':''}" aria-label="Instrument beside the score"><div class="companion-heading"><div><span class="eyebrow">SEE YOUR PART</span><strong>${esc(track.name)}</strong></div><span class="companion-pitches"></span></div><div class="companion-body"><div class="companion-art">${artwork(inst,{playing:!wind})}</div>${wind?'<div class="companion-fingering"></div>':''}<div class="companion-copy"><span class="companion-message">Select notes to see where to play.</span>${wind?'<p>Baroque / English fingering<br>● Closed · ○ Open<br>Holes 6 and 7 are double holes.<br>One dot: cover one hole.<br>Small thumb opening: vent.</p>':`<p>${isBarred(inst)?'Highlighted bars match the selected notes.':'Highlighted strokes match this part.'}<br>Tap a sound to hear it.</p>`}</div></div>${wind?`<div class="companion-pitch-choices" role="group" aria-label="Recorder notes">${choices.map(n=>`<button class="companion-pitch" data-companion-note="${n.index}" ${n.enabled?'':'disabled'} aria-label="Hear and show ${esc(noteName(n.note+writtenOctave(inst)))} fingering">${esc(noteName(n.note+writtenOctave(inst)))}</button>`).join('')}</div>`:''}</section>`;
 let signature='';
 function update(events=[],playing=false){
  const ns=[...new Map(events.map(e=>[e.note+':'+(e.shift||0),e])).values()],key=JSON.stringify([ns.map(n=>[n.note,n.shift||0]),playing]);if(signature===key)return;signature=key;
  const indexes=ns.map(e=>choices.find(n=>n.note===e.note&&(n.shift||0)===(e.shift||0))?.index);
  root.querySelectorAll('[data-hit],[data-companion-note]').forEach(el=>{const on=indexes.includes(+(el.dataset.hit??el.dataset.companionNote));el.classList.toggle('companion-active',on);el.setAttribute('aria-pressed',String(on));});
  root.querySelector('.companion-pitches').textContent=ns.map(n=>inst.pads?choices.find(c=>c.note===n.note&&(c.shift||0)===(n.shift||0))?.label:noteName(n.note+writtenOctave(inst))).filter(Boolean).join(' + ')||'—';
  root.querySelector('.companion-message').textContent=playing?'Playing this part':ns.length>1?(wind?'Several notes selected · fingering shown for the first pitch':'These notes belong to this part'):ns.length?'Selected pitch':'Select a note or hear a phrase.';
  if(wind)root.querySelector('.companion-fingering').innerHTML=fingeringDiagram(ns.length?recorderFingering(inst,ns[0].note):null);
 }
 root.querySelectorAll('[data-hit],[data-companion-note]').forEach(el=>{
  const n=choices[+(el.dataset.hit??el.dataset.companionNote)];if(!n?.enabled){el.setAttribute('aria-disabled','true');el.setAttribute('tabindex','-1');return;}
  el.setAttribute('aria-label',`Hear ${wind?noteName(n.note+writtenOctave(inst)):n.label}`);
  const play=()=>{update([n]);audition(n);};el.onclick=play;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();play();}};
 });
 update(notes);return {update};
}
