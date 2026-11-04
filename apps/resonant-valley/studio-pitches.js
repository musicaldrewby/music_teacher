import {NAMES,SCALES,noteName} from './data.js';

export const PIANO_CODES=['KeyA','KeyW','KeyS','KeyE','KeyD','KeyF','KeyT','KeyG','KeyY','KeyH','KeyU','KeyJ','KeyK'];
const scaleCodes=['KeyA','KeyS','KeyD','KeyF','KeyG','KeyH','KeyJ','KeyK'];
const blackKeys={1:1,3:2,6:4,8:5,10:6};
const letters='CDEFGAB',naturals=[0,2,4,5,7,9,11],pentatonicDegrees=[0,1,2,4,5];

export function pitchName(p,key,scale){
 const interval=((p-key)%12+12)%12;
 const index=SCALES[scale].indexOf(interval);
 if(scale==='chromatic'||index<0)return noteName(p);
 const degree=scale==='pentatonic'?pentatonicDegrees[index]:index;
 const letter=letters.indexOf(NAMES[key][0])+degree;
 const octave=Math.floor((p-interval)/12)-1+Math.floor(letter/7);
 const accidental=p-((octave+1)*12+naturals[letter%7]);
 return letters[letter%7]+(accidental<0?'♭':accidental>0?'♯':'')+octave;
}

export function keyboardRange(key,scale,octave){
 const chromatic=scale==='chromatic',root=chromatic?0:key;
 // Stored melodic notes span MIDI 24–96. Always offer a complete octave.
 const maxOctave=Math.floor((96-root-12)/12)-1;
 octave=Math.max(1,Math.min(maxOctave,octave));
 const low=(octave+1)*12+root;
 const keys=[...SCALES[scale],12].map((step,i)=>({
  pitch:low+step,code:chromatic?PIANO_CODES[step]:scaleCodes[i],blackAt:chromatic?blackKeys[step]:undefined
 }));
 return {octave,maxOctave,low,high:low+12,keys};
}
