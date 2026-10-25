export const STRINGS = [41, 43, 48, 50, 52, 53, 54, 55, ...Array.from({length:28},(_,i)=>57+i)];
// Standard Oscar Schmidt 21-button layout (rows viewed from the tuning pins).
// Factory felt voicing also damps some bass chord tones; it is not just a
// pitch-class filter. See docs/autoharp-model.md for the tuning/bar references.
const BASS_DAMPING = {
  'E♭':[43,55], 'B♭':[41,50], F:[], C:[43,52], G:[], D:[54], A:[52],
  F7:[], C7:[43,52], G7:[41,53], D7:[48], A7:[43,52,55], E7:[50], B7:[54,57],
  'A♭':[48], 'B♭7':[41,50], Cm:[43], Gm:[], Dm:[41,53], Am:[48,52], Em:[43]
};
export const CHORDS = [
  ['E♭',3,'major'],['B♭',10,'major'],['F',5,'major'],['C',0,'major'],['G',7,'major'],['D',2,'major'],['A',9,'major'],
  ['F7',5,'seventh'],['C7',0,'seventh'],['G7',7,'seventh'],['D7',2,'seventh'],['A7',9,'seventh'],['E7',4,'seventh'],['B7',11,'seventh'],
  ['A♭',8,'major'],['B♭7',10,'seventh'],['Cm',0,'minor'],['Gm',7,'minor'],['Dm',2,'minor'],['Am',9,'minor'],['Em',4,'minor']
].map(([name,root,quality],i)=>({name,root,quality,index:i,mutedBass:BASS_DAMPING[name],pcs:(quality==='minor'?[0,3,7]:quality==='seventh'?[0,4,7,10]:[0,4,7]).map(n=>(n+root)%12)}));
export const NAMES=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
export const noteName=midi=>NAMES[midi%12]+(Math.floor(midi/12)-1);
export const chordAllows=(chord,midi)=>chord==null||(chord.bars
  ?chord.bars.every(bar=>chordAllows(bar,midi))
  :chord.pcs.includes(midi%12)&&!chord.mutedBass.includes(midi));
// Every pressed felt bar touches the strings. Only their shared openings ring.
export function combineChords(chords){
  const bars=[...new Map(chords.map(chord=>[chord.index,chord])).values()];
  if(bars.length<2)return bars[0]||null;
  return {name:bars.map(bar=>bar.name).join(' + '),quality:'shared strings',bars,
    pcs:bars[0].pcs.filter(pc=>bars.every(bar=>bar.pcs.includes(pc)))};
}
export const allowedIndices=chord=>STRINGS.map((m,i)=>chordAllows(chord,m)?i:-1).filter(i=>i>=0);
export function crossedStrings(a,b,xs){
  if(a===b)return [];
  const list=xs.map((x,i)=>({x,i})).filter(({x})=>b>a?(x>a&&x<=b):(x<a&&x>=b));
  return (b>a?list:list.reverse()).map(o=>o.i);
}
