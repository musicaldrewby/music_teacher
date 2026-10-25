import {mountScoreSelection,resetScoreSelection} from './score-selection-view.js';
import {resizeNote} from './note-duration.js';
import {ENTRY_VALUES,entryPitches,pitchAtStaff,pitchForLetter,staffStep,writeScoreEntry,addScoreChordTone,scoreChordTiming,writtenLength,tieScoreNotes,untieScoreNote,scoreBeatX,scoreXBeat} from './score-entry.js';
import {getInstrument,writtenClef,barBeats,totalBeats,noteName} from './catalog.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const NS='http://www.w3.org/2000/svg';
export const newScoreEntryState=()=>({tool:'note',base:1,dotted:false,beat:0,pitchIndex:0,part:null,section:null,restId:null,audition:true,snap:.25,lastNote:null,chordId:null});
function glyph(value,rest=false){
 const head=value===4?'<ellipse cx="17" cy="24" rx="7" ry="4" fill="none" stroke="currentColor" stroke-width="2.5"/>':`<ellipse cx="13" cy="29" rx="6" ry="4" transform="rotate(-20 13 29)" fill="${value===2?'none':'currentColor'}" stroke="currentColor" stroke-width="2"/><path d="M18 28V5" stroke="currentColor" stroke-width="2"/>${value<=.5?'<path d="M18 5c1 6 10 6 5 15" fill="none" stroke="currentColor" stroke-width="2.5"/>':''}${value===.25?'<path d="M18 12c1 6 10 6 5 15" fill="none" stroke="currentColor" stroke-width="2.5"/>':''}`;
 const r=value>=2?`<path d="M5 20h24" stroke="currentColor"/><path d="M11 ${value===4?20:14}h12v6H11z" fill="currentColor"/>`:value===1?'<path d="M14 5l8 8-8 7 7 8q-13-5-8 7-10-8 0-12l-5-7 7-6z" fill="currentColor"/>':`<path d="M22 10l-7 24M22 10q-2 11-12 9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="16" r="3.5" fill="currentColor"/>${value===.25?'<path d="M20 19q-2 11-12 9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="25" r="3.5" fill="currentColor"/>':''}`;
 return `<svg viewBox="0 0 34 40" aria-hidden="true">${rest?r:head}</svg>`;
}
export function mountScoreComposer(root,state,geometries,h){
 const p=h.project(),t=h.track(),inst=getInstrument(t.instrument),choices=entryPitches(p,t),total=totalBeats(p),per=barBeats(p);
 if(state.part!==t.id||state.section!==p.activeSection){state.part=t.id;state.section=p.activeSection;state.beat=0;state.pitchIndex=choices[0]?.index??0;state.restId=null;state.lastNote=null;state.chordId=null;resetScoreSelection(state);}
 state.beat=Math.max(0,Math.min(total,state.beat));
 if(!choices.some(n=>n.index===state.pitchIndex))state.pitchIndex=choices[0]?.index??0;
 if(state.restId&&!t.rests?.some(r=>r.id===state.restId))state.restId=null;
 state.selection??={items:[],span:null,measures:null,anchor:null};
 const selected=t.events.find(e=>e.id===h.selected()),selectedRest=t.rests?.find(r=>r.id===state.restId),selection=selected||selectedRest;
 const chord=state.tool==='chord',anchor=chord?(t.events.find(e=>e.id===state.chordId)||t.events.find(e=>Math.abs(Math.round(e.beat*4)/4-state.beat)<1e-7)):null;
 state.chordId=anchor?.id??null;
 const timing=anchor?scoreChordTiming(p,t,anchor):null;
 if(timing){state.beat=timing.beat;const base=ENTRY_VALUES.find(v=>v.value===timing.duration)||ENTRY_VALUES.find(v=>v.value!==.25&&v.value*1.5===timing.duration);if(base){state.base=base.value;state.dotted=base.value!==timing.duration;}}
 const len=()=>timing?.duration??state.base*(state.dotted?1.5:1),pitch=()=>choices.find(n=>n.index===state.pitchIndex),factor=p.meter==='6/8'?2:1;
 const pos=state.beat===total?{bar:p.bars,beat:per*factor+1}:{bar:Math.floor(state.beat/per)+1,beat:(state.beat%per)*factor+1};
 const selectedName=selected?(inst.pads?choices.find(n=>n.note===selected.note&&(n.shift||0)===(selected.shift||0))?.label:noteName(selected.note+(choices[0]?.written-choices[0]?.note||0))):selectedRest?'Rest':null;
 root.innerHTML=`<section class="score-compose-panel" aria-label="Score composition tools">
  <div class="score-compose-heading"><div><span class="eyebrow">WRITE YOUR PART</span><strong>${esc(t.name)}</strong></div><span class="score-compose-caption">Choose a value. Click a pitch. The cursor moves for you.</span></div>
  <div class="score-entry-tools">
   <div class="score-tool-group" role="group" aria-label="Entry tool">${[['select','Select','V'],['note','Notes','N'],['rest','Rests','0'],['chord','Add to chord','H']].map(([tool,label,key])=>`<button type="button" data-score-tool="${tool}" class="score-tool ${state.tool===tool?'chosen':''}" aria-pressed="${state.tool===tool}" title="${label} (${key})"><span>${label}</span><kbd>${key}</kbd></button>`).join('')}</div>
   <div class="score-values" role="group" aria-label="Note or rest length">${ENTRY_VALUES.map(v=>`<button type="button" data-score-value="${v.value}" class="score-value ${(timing?timing.duration===v.value*(state.dotted?1.5:1):state.base===v.value)?'chosen':''}" aria-label="${v.label} ${state.tool==='rest'?'rest':'note'} (${v.key})" aria-pressed="${timing?timing.duration===v.value*(state.dotted?1.5:1):state.base===v.value}" ${anchor?'disabled':''} title="${anchor?'Matches the chord. Select a note to change its length.':v.label+' ('+v.key+')'}">${glyph(v.value,state.tool==='rest')}<span>${v.label}</span><kbd>${v.key}</kbd></button>`).join('')}</div>
   <div class="score-tool-group" role="group" aria-label="Rhythm modifiers"><button type="button" class="score-tool ${state.dotted?'chosen':''}" id="score-dot" aria-pressed="${state.dotted}" ${state.base===.25||anchor?'disabled':''} title="Dot (.) · shortest supported subdivision is a sixteenth"><b>·</b><span>Dot</span></button><button type="button" class="score-tool" id="score-tie" ${selected?'':'disabled'} title="Tie to the next adjacent note of the same pitch (T)"><b>⌒</b><span>Tie next</span></button><button type="button" class="score-tool" id="score-untie" ${selected?.tieBreaks?.length?'':'disabled'}>Untie</button></div>
   <div class="score-tool-group score-entry-history"><button type="button" class="score-tool" id="score-entry-undo" ${h.canUndo()?'':'disabled'} aria-label="Undo score edit">↶ Undo</button><button type="button" class="score-tool" id="score-entry-redo" ${h.canRedo()?'':'disabled'} aria-label="Redo score edit">↷ Redo</button></div>
  </div>
  <div class="score-entry-position">
   <label>Measure<input id="score-entry-bar" type="number" min="1" max="${p.bars}" value="${pos.bar}"></label>
   <label>Beat<input id="score-entry-beat" type="number" min="1" max="${per*factor+1-factor*.25}" step="${factor*.25}" value="${Math.min(pos.beat,per*factor+1-factor*.25)}"></label>
   <label>${inst.pads?'Stroke':'Written pitch'}<select id="score-entry-pitch">${choices.map(n=>`<option value="${n.index}" ${n.index===state.pitchIndex?'selected':''}>${esc(inst.pads?n.label:noteName(n.written))}</option>`).join('')}</select></label>
   <button type="button" class="outline" id="score-audition" ${!choices.length?'disabled':''}>Hear pitch</button>
   <label class="score-audition-toggle"><input id="score-auto-audition" type="checkbox" ${state.audition?'checked':''}>Hear entered notes</label>
   <button type="button" class="brass" id="score-place" ${state.beat>=total||!choices.length&&state.tool!=='rest'?'disabled':''}>${chord?'Add pitch':state.tool==='rest'?'Place rest':'Place note'} ↵</button>
   <button type="button" class="outline" id="score-next-chord" ${!chord||state.beat>=total?'disabled':''} title="Advance after entering a chord">Next position →</button>
   <button type="button" class="outline" id="score-add-measure" ${p.bars>=64?'disabled':''}>+ Measure</button>
   <button type="button" class="quiet remove" id="score-delete" ${selection?'':'disabled'}>Delete selected</button>
  </div>
  <div class="score-entry-status" role="status" aria-live="polite" id="score-entry-status">${state.beat===total?'End of section · add a measure to keep writing.':chord?`Chord entry · measure ${pos.bar}, beat ${pos.beat} · ${anchor?'Same length: '+len()+' quarter-note beats.':'Choose a length for the first pitch.'} Click a pitch or type A–G; the cursor stays here. Next position moves on.`:`${selectedName?esc(selectedName)+' selected · choose a value to change its length · ':''}Measure ${pos.bar}, beat ${pos.beat} · ${Number((per-state.beat%per).toFixed(2))} quarter-note beats remaining${p.meter==='6/8'?' · beat numbers count eighths':''}.`}</div>
  <details class="score-entry-help"><summary>Mouse & keyboard guide</summary><p><b>Notes / Rests:</b> each click writes at the cursor, then advances by the chosen value. Click higher or lower on the staff to choose pitch; horizontal spacing never changes the note length. <b>Shift-click</b> moves the cursor without writing. You can also use Measure and Beat to choose a starting position. <b>Select:</b> click a note, then choose a note value to change its length. Choosing Quarter means a plain quarter; use Dot for a dotted value. Rests resize automatically, and later notes stay in place. A length that reaches the next note is blocked. Shift-click a range, or drag a box. Ctrl/Command-click or <b>Add to selection</b> toggles individual notes. Click a measure number to select it; Shift-click another number to extend. Delete leaves the surrounding music in place. Copy, Cut and Paste also support Ctrl/Command shortcuts. Notes / Rests replace the chosen time span; Undo restores it.</p><p><b>Add to chord (H):</b> select a note first, or enter its first pitch with Notes, then choose Add to chord. Click another pitch on the staff or type A–G to stack notes on the same beat. Each added pitch keeps the first note’s written length and sounding duration. The original music stays in place. For a C–G bordun, enter C, choose Add to chord, then enter G. <b>Next position</b> moves forward by the chord’s length; choose <b>Notes</b> to continue normal entry after the chord. Shift-click or Measure / Beat moves to another position. Choose Select to change individual notes or their lengths.</p><p><b>A–G</b> enters pitches near the selected register · <b>2–6</b> chooses a length · <b>.</b> adds a dot · <b>0</b> enters a rest · <b>Enter</b> places the chosen pitch · <b>← / →</b> moves one sixteenth · <b>↑ / ↓</b> changes pitch · <b>T</b> ties a selected note · <b>Delete</b> removes a selection · <b>Backspace</b> removes the previous entry.</p><p>Pitch choices follow the instrument’s available notes and bar setup. A toolbar length edit changes sound and notation together; use <b>Written length</b> in Note details to change only the printed rhythm. Dots are available through dotted eighths. Ties across barlines are drawn automatically.</p></details>
 </section>`;
 const $=s=>root.querySelector(s),status=message=>{const el=$('#score-entry-status');if(el)el.textContent=message;const feedback=root.ownerDocument.querySelector('#score-workspace-feedback');if(feedback&&root.ownerDocument.body.classList.contains('score-focus'))feedback.textContent=message;},focus=()=>root.ownerDocument.querySelector('#score-body')?.focus({preventScroll:true});
 function refresh(){h.redraw();focus();}
 function hear(n=pitch()){if(n)h.audition(n,len());}
 function commit(fn){try{h.edit(fn);focus();}catch(e){status(e.message);}}
 function clearSelection(){h.select(null);resetScoreSelection(state);}
 function setCursor(beat){h.stopPreview?.();state.beat=Math.max(0,Math.min(total,Math.round(beat*4)/4));state.chordId=null;state.lastNote=null;clearSelection();refresh();}
 function chooseTool(tool){
  if(tool===state.tool)return;
  h.stopPreview?.();
  if(tool==='chord'){
   const last=state.tool==='note'?t.events.find(e=>e.id===state.lastNote&&Math.abs(e.beat+writtenLength(e)-state.beat)<1e-7):null;
   const first=selected||last||t.events.find(e=>Math.abs(Math.round(e.beat*4)/4-state.beat)<1e-7);
   state.chordId=first?.id??null;if(first)state.beat=scoreChordTiming(p,t,first).beat;
  }else{
   if(chord&&anchor&&(tool==='note'||tool==='rest'))state.beat=Math.min(total,state.beat+len());
   state.chordId=null;
  }
  state.tool=tool;clearSelection();refresh();
 }
 function place(n=pitch(),rest=state.tool==='rest',at=state.beat){
  const draft=structuredClone(h.track());let event;
  if(chord){
   if(rest){status('Choose Rests to leave chord entry and write a rest.');return;}
   let result;try{result=addScoreChordTone(h.project(),draft,{anchorId:state.chordId,beat:at,duration:len(),pitch:n});}catch(e){status(e.message);return;}
   if(!result.added){status('That pitch is already at this beat. Choose another pitch, or Next position.');return;}
   state.chordId=anchor?.id??result.event.id;state.lastNote=result.event.id;clearSelection();
   commit(()=>{const track=h.track();track.events=draft.events;track.rests=draft.rests;});
   if(state.audition)hear(n);return;
  }
  try{event=writeScoreEntry(h.project(),draft,{beat:at,duration:len(),pitch:n,rest,replaceId:selection?.id,velocity:selected?.velocity??.8});}catch(e){status(e.message);return;}
  state.beat=at+len();state.lastNote=rest?null:event.id;clearSelection();
  commit(()=>{const track=h.track();track.events=draft.events;track.rests=draft.rests;});
  if(!rest&&state.audition)hear(n);
 }
 function setValue(value,dotted=selected||selectedRest?false:state.dotted){
  if(chord&&anchor){status('Added pitches use the same length. Choose Select to edit a note’s length.');return;}
  const nextDotted=value===.25?false:dotted,nextLength=value*(nextDotted?1.5:1);
  if(selected){
   const draft=structuredClone(h.track());
   try{resizeNote(h.project(),draft,selected.id,nextLength);}catch(e){status(e.message);return;}
   state.base=value;state.dotted=nextDotted;
   commit(()=>{h.track().events=draft.events;h.track().rests=draft.rests;});
  }
  else {state.base=value;state.dotted=nextDotted;if(selectedRest){state.beat=selectedRest.beat;place(pitch(),true,selectedRest.beat);}else refresh();}
 }
 function changePitch(n){
  if(!n)return;state.pitchIndex=n.index;
  if(selected){commit(()=>{const e=h.track().events.find(e=>e.id===selected.id);e.note=n.note;e.shift=n.shift||0;});if(state.audition)hear(n);}
  else refresh();
 }
 function remove(previous=false){
  const track=h.track();let item=selection,rest=!!selectedRest;
  if(chord&&previous){item=track.events.find(e=>e.id===state.lastNote&&Math.abs(Math.round(e.beat*4)/4-state.beat)<1e-7);if(!item){status('Use Undo, or Select a chord note to remove it.');return;}}
  if(!item&&previous){const candidates=[...track.events.map(e=>({e,rest:false})),...(track.rests||[]).map(e=>({e,rest:true}))].filter(x=>x.e.beat<state.beat-1e-7).sort((a,b)=>b.e.beat-a.e.beat);item=candidates[0]?.e;rest=candidates[0]?.rest;}
  if(!item){status('Select a note or rest first.');return;}
  state.beat=item.beat;clearSelection();commit(()=>{if(rest)track.rests=(track.rests||[]).filter(e=>e.id!==item.id);else track.events=track.events.filter(e=>e.id!==item.id);});
 }
 function tie(){try{const draft=structuredClone(h.track());tieScoreNotes(draft,h.selected());commit(()=>{h.track().events=draft.events;});}catch(e){status(e.message);}}
 root.querySelectorAll('[data-score-tool]').forEach(b=>b.onclick=()=>chooseTool(b.dataset.scoreTool));
 root.querySelectorAll('[data-score-value]').forEach(b=>b.onclick=()=>setValue(+b.dataset.scoreValue));
 $('#score-dot').onclick=()=>setValue(state.base,!state.dotted);
 $('#score-tie').onclick=tie;
 if($('#score-untie'))$('#score-untie').onclick=()=>commit(()=>untieScoreNote(h.track(),h.selected()));
 $('#score-entry-undo').onclick=()=>{h.undo();focus();};$('#score-entry-redo').onclick=()=>{h.undo(true);focus();};
 $('#score-entry-pitch').onchange=e=>changePitch(choices.find(n=>n.index===+e.target.value));
 $('#score-audition').onclick=()=>hear();$('#score-auto-audition').onchange=e=>{state.audition=e.target.checked;};
 $('#score-place').onclick=()=>place();$('#score-delete').onclick=()=>remove();
 if($('#score-next-chord'))$('#score-next-chord').onclick=()=>setCursor(state.beat+len());
 const move=()=>{const bar=+$('#score-entry-bar').value,beat=(+$('#score-entry-beat').value-1)/factor;if(!Number.isInteger(bar)||bar<1||bar>p.bars||!Number.isFinite(beat)||beat<0||beat>=per){status('Choose a position inside a measure.');return;}setCursor((bar-1)*per+beat);};
 $('#score-entry-bar').onchange=move;$('#score-entry-beat').onchange=move;
 $('#score-add-measure').onclick=()=>{if(p.bars>=64)return;if(h.extend)h.extend(p.bars+1);else commit(()=>{h.project().bars++;});};
 const surface=root.ownerDocument.querySelector('#score-body');surface.tabIndex=0;surface.setAttribute('aria-label','Editable score. Notes and Rests enter at the cursor and advance by the chosen length. Add to chord stacks pitches without advancing. Next position continues after a chord. Shift-click or use Measure and Beat to move the cursor. Select edits existing music.');
 const svgEl=(name,attrs)=>{const el=root.ownerDocument.createElementNS(NS,name);for(const [k,v]of Object.entries(attrs))el.setAttribute(k,v);return el;};
 const entries=geometries.filter(g=>g.trackId===t.id).map(geometry=>({geometry,ghost:null}));
 const activeEntry=entries.find(({geometry:g})=>state.beat>=g.start&&state.beat<g.end||state.beat===total&&g.end===total);
 const hideGhosts=()=>entries.forEach(({ghost})=>ghost?.setAttribute('visibility','hidden'));
 const pitchY=(n,g)=>inst.pads?(inst.pads.length===1?g.bottom-20:g.bottom-n.index*g.lineGap):g.bottom-(staffStep(n.written)-(writtenClef(inst)==='bass'?18:30))*g.lineGap/2;
 for(const entry of entries){
  const {geometry}=entry;
  const {svg}=geometry,overlay=svgEl('g',{'class':'score-entry-overlay','aria-hidden':'true'});
  if(state.tool!=='select'){
   const hit=svgEl('rect',{x:geometry.left,y:geometry.top-20,width:geometry.right-geometry.left,height:geometry.bottom-geometry.top+65,fill:'transparent','class':'score-entry-hit','data-score-measure':geometry.bar+1});overlay.append(hit);
   // Beat ticks orient the cursor; ordinary clicks choose pitch, not time.
   for(let beat=geometry.start;beat<geometry.end;beat+=p.meter==='6/8'?.5:1){const x=scoreBeatX(geometry,beat);overlay.append(svgEl('line',{x1:x,x2:x,y1:geometry.bottom+16,y2:geometry.bottom+21,stroke:'#9ca88e','stroke-width':1,'pointer-events':'none'}));}
   const ghost=svgEl('ellipse',{rx:5.5,ry:4,fill:'#8c7137',opacity:.65,visibility:'hidden','class':'score-entry-ghost','pointer-events':'none'});entry.ghost=ghost;overlay.append(ghost);
   const locate=e=>{const rect=svg.getBoundingClientRect(),vb=svg.viewBox?.baseVal,width=vb?.width||+svg.getAttribute('width'),height=vb?.height||+svg.getAttribute('height');if(!rect.width||!rect.height)return null;return {x:(e.clientX-rect.left)*width/rect.width,y:(e.clientY-rect.top)*height/rect.height};};
   hit.onpointermove=e=>{
    hideGhosts();const point=locate(e),target=e.shiftKey?entry:activeEntry;
    if(!point||!target?.ghost||!e.shiftKey&&state.beat>=total)return;
    const g=target.geometry,beat=e.shiftKey?scoreXBeat(geometry,point.x,state.snap):state.beat,n=pitchAtStaff(p,t,point.y,geometry.bottom,geometry.lineGap);
    target.ghost.setAttribute('cx',scoreBeatX(g,beat));target.ghost.setAttribute('cy',state.tool==='rest'?g.bottom-20:n?pitchY(n,g):g.bottom);target.ghost.setAttribute('visibility','visible');
   };
   hit.onpointerleave=hideGhosts;
   hit.onclick=e=>{
    const point=locate(e);if(!point)return;
    if(e.shiftKey){setCursor(scoreXBeat(geometry,point.x,state.snap));return;}
    const n=pitchAtStaff(p,t,point.y,geometry.bottom,geometry.lineGap);if(n)state.pitchIndex=n.index;
    place(n,state.tool==='rest');
   };
  }
  const active=state.beat>=geometry.start&&state.beat<geometry.end||state.beat===total&&geometry.end===total;
  if(active){const x=scoreBeatX(geometry,state.beat);overlay.append(svgEl('rect',{x:x-5,y:geometry.top-8,width:10,height:geometry.bottom-geometry.top+30,fill:'#b99a55',opacity:.10,'pointer-events':'none'}));overlay.append(svgEl('line',{x1:x,x2:x,y1:geometry.top-8,y2:geometry.bottom+22,stroke:'#95753b','stroke-width':2,'class':'score-entry-cursor','pointer-events':'none'}));}
  svg.append(overlay);
 }
 const selectionController=mountScoreSelection(root,state,geometries,{...h,choosePitch:e=>{const n=choices.find(n=>n.note===e.note&&(n.shift||0)===(e.shift||0));if(n)state.pitchIndex=n.index;}});
 return {...selectionController,handleKey(e){
  if(selectionController.handleKey(e))return true;
  if(e.ctrlKey||e.metaKey||e.altKey||e.repeat)return false;
  const key=e.key.toLowerCase();let action;
  if(key==='v')action=()=>chooseTool('select');
  else if(key==='n')action=()=>chooseTool('note');
  else if(key==='h')action=()=>chooseTool('chord');
  else if(ENTRY_VALUES.some(v=>v.key===key))action=()=>setValue(ENTRY_VALUES.find(v=>v.key===key).value);
  else if(key==='.'&&state.base!==.25)action=()=>setValue(state.base,!state.dotted);
  else if(key==='0')action=()=>place(pitch(),true);
  else if(key==='enter')action=()=>place();
  else if(key==='t'&&selected)action=tie;
  else if(key==='delete')action=()=>remove();
  else if(key==='backspace')action=()=>remove(true);
  else if(key==='arrowleft'||key==='arrowright')action=()=>setCursor(state.beat+(key==='arrowleft'?-.25:.25));
  else if(key==='home')action=()=>setCursor(Math.floor(Math.min(state.beat,total-.25)/per)*per);
  else if(key==='arrowup'||key==='arrowdown')action=()=>{const at=choices.findIndex(n=>n.index===state.pitchIndex),n=choices[at+(key==='arrowup'?1:-1)];if(n)changePitch(n);};
  else if(/^[a-g]$/.test(key)&&!inst.pads)action=()=>{const n=pitchForLetter(p,t,key,pitch()?.written??60);if(!n){status('That pitch is not available in this instrument setup.');return;}state.pitchIndex=n.index;if(state.tool==='select'&&selected)changePitch(n);else{if(!chord)state.tool='note';place(n,false);}};
  if(!action)return false;e.preventDefault();action();return true;
 }};
}
