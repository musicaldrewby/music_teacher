import {notesFor,getInstrument,totalBeats,uid} from './catalog.js';
import {shiftExpression} from './expression.js';
export function editPhrase(project,track,ids,{move=0,transpose=0,duplicate=false,grid=.25}={}){
 const selected=track.events.filter(e=>ids.includes(e.id));if(!selected.length)throw Error('Select notes first.');
 const notes=notesFor(getInstrument(track.instrument),project.key,track.pentatonic).filter(n=>n.enabled&&!track.removed?.includes(n.index));
 const first=Math.min(...selected.map(e=>e.beat)),end=Math.max(...selected.map(e=>e.beat+Math.max(e.duration,Number.isFinite(e.writtenDuration)?e.writtenDuration:0)));
 const shift=duplicate?Math.ceil((end-first-1e-7)/grid)*grid:move;
 const changed=selected.map(source=>{const e=structuredClone(source);if(duplicate)e.id=uid();e.beat+=shift;shiftExpression(e,shift);delete e.score;
  if(e.beat<0||e.beat+Math.max(e.duration,Number.isFinite(e.writtenDuration)?e.writtenDuration:0)>totalBeats(project)+1e-7)throw Error('The phrase would leave this section. Add measures or choose a smaller move.');
  if(transpose){if(getInstrument(track.instrument).family==='drum')throw Error('Percussion strokes cannot be transposed.');const ix=notes.findIndex(n=>n.note===e.note&&(n.shift||0)===(e.shift||0)),n=notes[ix+transpose];if(ix<0||!n)throw Error('The phrase would leave this instrument’s available notes.');e.note=n.note;e.shift=n.shift||0;}
  return e;
 });
 const untouched=track.events.filter(e=>duplicate||!ids.includes(e.id));
 if(changed.some(e=>untouched.some(n=>n.note===e.note&&(n.shift||0)===(e.shift||0)&&Math.abs(n.beat-e.beat)<1e-7)))throw Error('A note already starts at that pitch and beat. Choose another position.');
 track.events=[...untouched,...changed].sort((a,b)=>a.beat-b.beat);return changed.map(e=>e.id);
}
