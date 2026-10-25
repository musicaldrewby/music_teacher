// Supported virtual Orff tunings. Natural-note modes share the same seven bars.
export const HARMONIES={
 'c-ionian':{name:'C major · Ionian',tonic:0,intervals:[0,2,4,5,7,9,11],swaps:{},hint:'Natural bars: C D E F G A B'},
 'a-aeolian':{name:'A minor · Aeolian',tonic:9,intervals:[0,2,3,5,7,8,10],swaps:{},hint:'Natural bars: A B C D E F G'},
 'd-dorian':{name:'D Dorian',tonic:2,intervals:[0,2,3,5,7,9,10],swaps:{},hint:'Natural bars: D E F G A B C'},
 'e-phrygian':{name:'E Phrygian',tonic:4,intervals:[0,1,3,5,7,8,10],swaps:{},hint:'Natural bars: E F G A B C D'},
 'f-lydian':{name:'F Lydian',tonic:5,intervals:[0,2,4,6,7,9,11],swaps:{},hint:'Natural bars: F G A B C D E'},
 'g-mixolydian':{name:'G Mixolydian',tonic:7,intervals:[0,2,4,5,7,9,10],swaps:{},hint:'Natural bars: G A B C D E F'},
 'b-locrian':{name:'B Locrian',tonic:11,intervals:[0,1,3,5,6,8,10],swaps:{},hint:'Natural bars: B C D E F G A'},
 'f-ionian':{name:'F major · Ionian',tonic:5,intervals:[0,2,4,5,7,9,11],swaps:{11:10},hint:'B bars become B♭'},
 'g-ionian':{name:'G major · Ionian',tonic:7,intervals:[0,2,4,5,7,9,11],swaps:{5:6},hint:'F bars become F♯'},
 'd-aeolian':{name:'D minor · Aeolian',tonic:2,intervals:[0,2,3,5,7,8,10],swaps:{11:10},hint:'B bars become B♭ · natural minor'},
 'd-mixolydian':{name:'D Mixolydian',tonic:2,intervals:[0,2,4,5,7,9,10],swaps:{5:6},hint:'F bars become F♯ · C stays natural'}
};
export function harmony(id='c-ionian'){return HARMONIES[id]||HARMONIES['c-ionian'];}
export function pitchClasses(id){const h=harmony(id);return h.intervals.map(n=>(n+h.tonic)%12);}
export function bassRoot(id){const t=harmony(id).tonic;return t>5?24+t:36+t;}
export function degreeNote(degree,id='c-ionian'){const h=harmony(id);return bassRoot(id)+12*Math.floor(degree/7)+h.intervals[((degree%7)+7)%7];}
export function nearestDegree(midi,id){let best=0,distance=Infinity;for(let d=-14;d<=21;d++){const gap=Math.abs(degreeNote(d,id)-midi);if(gap<distance){distance=gap;best=d;}}return best;}
function fitBassRange(midi){while(midi>60)midi-=12;while(midi<24)midi+=12;return midi;}
export function retuneBass(pattern,oldKey,newKey){if(!pattern)return null;return{...pattern,steps:pattern.steps.map(s=>s?{...s,midi:fitBassRange(degreeNote(nearestDegree(s.midi,oldKey),newKey))}:null)};}
export function nextScaleNote(midi,delta,id){const pcs=pitchClasses(id);for(let n=midi+Math.sign(delta);n>=24&&n<=60;n+=Math.sign(delta))if(pcs.includes(n%12))return n;return midi;}
export function tunedBar(midi,id){const swap=harmony(id).swaps[midi%12];return swap===undefined?midi:midi-midi%12+swap;}
// All drum patterns are one bar in 4/4; indices are straight sixteenth notes.
const rhythms=[
 ['First beat','Basics',[0,8],[4,12],[0,4,8,12],[]],
 ['Steady rock','Rock',[0,8],[4,12],[0,2,4,6,8,10,12,14],[]],
 ['Driving rock','Rock',[0,6,8,10],[4,12],[0,2,4,6,8,10,12,14],[]],
 ['Big chorus','Rock',[0,3,8,10],[4,12],[0,1,2,3,4,6,8,9,10,11,12,14],[12]],
 ['Half-time','Rock',[0,6,10],[8],[0,2,4,6,8,10,12,14],[]],
 ['Four on floor','Dance',[0,4,8,12],[],[2,6,10,14],[4,12]],
 ['Disco steps','Dance',[0,4,8,12],[4,12],[0,2,4,6,8,10,12,14],[12]],
 ['House party','Dance',[0,4,8,12],[4,12],[2,6,10,14],[3,11]],
 ['Techno motor','Dance',[0,4,8,12],[],[0,2,3,6,8,10,11,14],[4,12,15]],
 ['Electro bounce','Dance',[0,6,10],[4,12],[0,2,6,8,10,14],[7,15]],
 ['Boom bap','Hip-hop',[0,7,10],[4,12],[0,2,4,6,8,10,12,14],[]],
 ['Pocket beat','Hip-hop',[0,3,9],[4,12],[0,2,5,6,8,10,13,14],[]],
 ['Trap hats','Hip-hop',[0,7,11],[8],[0,2,4,6,7,8,10,12,13,14,15],[8]],
 ['Broken beat','Breaks',[0,6,9],[4,10,12],[0,2,3,6,8,11,14],[15]],
 ['Fast break','Breaks',[0,10],[4,7,12,14],[0,2,4,6,8,10,12,14],[]],
 ['Funk pocket','Funk',[0,3,6,10],[4,12],[0,2,3,6,8,10,11,14],[]],
 ['Offbeat skank','Offbeat',[8],[8],[2,6,10,14],[4,12]],
 ['3-3-2 pulse','Patterns',[0,6,12],[],[0,2,4,6,8,10,12,14],[0,6,12]],
 ['Syncopated clave','Patterns',[0,8],[],[0,4,8,12],[0,3,6,10,12]],
 ['Marching groove','Basics',[0,8],[4,6,12,14],[0,4,8,12],[12]]
];
export const DRUM_PRESETS=Object.fromEntries(rhythms.map(([name,category,...hits])=>[name,{category,hits}]));
export function drumPreset(name){const p=DRUM_PRESETS[name]||DRUM_PRESETS['First beat'];return p.hits.map(hits=>Array.from({length:16},(_,i)=>hits.includes(i)));}
// Forty authored degree patterns, eight per family. '-' is a rest.
const bassRows=[
 ['Deep pulse','Deep','0 - - - 0 - 4 - 0 - - - 6 - 4 -'],
 ['Anchor notes','Deep','0 - - - - - - - 0 - - - - - - -'],
 ['Root and fifth','Deep','0 - - - 4 - - - 0 - - - 4 - - -'],
 ['Low tide','Deep','0 - - - - - 2 - 4 - - - - - 1 -'],
 ['Night steps','Deep','0 - - 0 - - 4 - - - 6 - 4 - - -'],
 ['Warm landing','Deep','0 - - - 2 - - - 4 - - 2 - 1 - -'],
 ['Deep answer','Deep','0 - - - - 0 - - 4 - - - 6 - 4 -'],
 ['Open space','Deep','0 - - - - - - 4 - - - - 2 - - -'],
 ['Round groove','Groove','0 - - 4 - - 6 - 7 - 4 - 2 - 6 -'],
 ['Pocket walk','Groove','0 - 2 - 4 - 5 - 4 - 2 - 1 - 6 -'],
 ['Fifth Avenue','Groove','0 - 4 0 - - 4 - 0 - 4 7 - 4 - -'],
 ['Backbeat bass','Groove','- 0 - - 0 - - 4 - 0 - - 6 - - 4'],
 ['Funky staircase','Groove','0 0 - 2 - 3 4 - 5 - 4 2 - 1 0 -'],
 ['Call and reply','Groove','0 - 0 4 - - - - 2 - 2 6 - - 4 -'],
 ['Bouncing roots','Groove','0 - 7 - 0 0 - 4 0 - 7 - 6 4 - -'],
 ['Side street','Groove','0 - - 2 4 - 2 - - 0 4 - 6 - 4 1'],
 ['Acid walk','Acid','0 - 0 7 - 4 2 - 0 7 - 6 4 - 2 6'],
 ['Liquid ladder','Acid','0 1 2 - 3 4 5 - 6 7 6 - 5 4 2 -'],
 ['Neon turn','Acid','0 - 7 0 2 - 7 2 4 - 7 4 6 - 5 4'],
 ['Rubber steps','Acid','0 0 - 4 1 1 - 5 2 2 - 6 4 - 2 1'],
 ['Silver spiral','Acid','0 2 4 6 7 - 6 4 2 4 6 7 4 - 2 0'],
 ['Acid question','Acid','0 - 1 0 - 4 - 6 7 - 6 - 4 2 1 -'],
 ['Zigzag','Acid','0 7 1 6 2 5 3 4 0 - 7 - 4 2 1 -'],
 ['Filter runner','Acid','0 0 2 4 - 7 6 4 0 0 1 3 - 6 4 1'],
 ['Octave bounce','Dance','0 - 7 - 0 - 7 - 6 - 6 - 4 - 4 -'],
 ['Disco lift','Dance','0 7 - 7 0 7 - 7 4 4 - 7 6 6 - 4'],
 ['House foundation','Dance','0 - 0 - - 4 - 0 0 - 0 - - 6 - 4'],
 ['Offbeat engine','Dance','- - 0 - - - 0 - - - 4 - - - 6 -'],
 ['Electro march','Dance','0 - 7 0 - 4 - - 0 - 7 0 - 6 - 4'],
 ['Retro arcade','Dance','0 2 4 7 - 4 2 - 6 4 2 0 - 1 2 -'],
 ['Pulse train','Dance','0 - 0 0 4 - 4 4 6 - 6 6 4 - 2 1'],
 ['Lift and fall','Dance','0 - 2 - 4 - 7 - 6 - 5 - 4 - 1 -'],
 ['Modal pedal','Modal','0 - - 0 - - 0 - 6 - - 0 - 1 - -'],
 ['Mode explorer','Modal','0 - 1 - 2 - 3 - 4 - 5 - 6 - 7 -'],
 ['Gentle ostinato','Modal','0 - 2 - 4 - 2 - 0 - 3 - 5 - 3 -'],
 ['Three plus three','Modal','0 - - 2 - - 4 - 0 - - 3 - - 6 -'],
 ['Falling leaves','Modal','7 - 6 - 5 - 4 - 3 - 2 - 1 - 0 -'],
 ['Wide horizon','Modal','0 - - - 7 - - - 4 - - - 6 - 1 -'],
 ['Mountain path','Modal','0 - 3 - 1 - 4 - 2 - 5 - 4 - 6 -'],
 ['Evening circle','Modal','0 - 2 3 - 4 - - 6 - 4 3 - 1 - 0']
];
const tones={Deep:['triangle',520,.7,.46],Groove:['square',720,1,.34],Acid:['sawtooth',900,2.8,.25],Dance:['sawtooth',680,1.3,.30],Modal:['triangle',580,.8,.50]};
export const BASS_PRESETS=Object.fromEntries(bassRows.map(([name,category,phrase],i)=>{const [wave,cutoff,resonance,decay]=tones[category];return[name,{category,wave,cutoff:cutoff+(i%4)*55,resonance,decay,degrees:phrase.split(' ').map(s=>s==='-'?null:+s),accents:category==='Groove'?[0,6,10]:[0,8],slides:category==='Acid'?[3,7,11,15]:category==='Modal'?[6,14]:[]}];}));
