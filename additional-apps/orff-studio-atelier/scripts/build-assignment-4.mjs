// Faithful transcription of Drew Wichman's uploaded My Orf Assignment (16 bars, 6/8).
// Melody pitches below are WRITTEN MIDI; recorder clef has an 8 above it.
// Alto is ordinary treble; bass xylophone is treble with an 8 below it.
import fs from 'node:fs/promises';
import {newProject,newTrack,validateProject} from '../dist/catalog.js';
const project={...newProject(),title:'My Orf Assignment',composer:'Drew Wichman',meter:'6/8',bars:8,bpm:108,loop:false,playbackScope:'song',reverb:.12,delay:0};
const specs=[['recorder','soprano-recorder','Recorder',.85,0],['claves','claves','Claves',.52,-.25],['tambourine','tambourine','Tambourine',.44,.25],['alto','alto-xylophone','Orff Alto Xylophone',.62,-.12],['bass','bass-xylophone','Orff Bass Xylophone',.7,.12]];
project.tracks=specs.map(([id,instrument,name,volume,pan])=>({...newTrack(instrument),id:'assignment-4-'+id,name,volume,pan}));
project.notation={simplifyMalletGaps:false,partOrder:project.tracks.map(t=>t.id)};
project.demo={id:'assignment-4',revision:1,source:'demos/assignment-4-original.png',form:'A–B–A; D.C. al Fine returns to the beginning and stops after measure 8.',tempoNote:'The source has no tempo marking. Playback starts at dotted-quarter = 72 (quarter = 108).',transcription:'Original pitches, rhythms, ties and five parts; no added orchestration. Full-song notation writes out the return.'};
function section(id,name){return {id,name,bars:8,events:Object.fromEntries(project.tracks.map(t=>[t.id,[]]))}}
const A=section('assignment-4-a','A'),B=section('assignment-4-b','B');
function add(s,part,bar,beat,duration,notes){const key='assignment-4-'+part;for(const note of [].concat(notes)){const events=s.events[key];events.push({id:s.id+'-'+part+'-'+events.length,beat:bar*3+beat,duration,writtenDuration:duration,note,velocity:.75,shift:0});}}
// [local bar, beat in quarter-note units, written duration, written recorder pitch]
const melodyA=[
 [0,0,3,67],
 [1,.5,.5,69],[1,1,.5,72],[1,1.5,.5,71],[1,2,.5,69],[1,2.5,.5,71],
 [2,0,3,67],
 [3,.5,.5,69],[3,1,.5,72],[3,1.5,.5,71],[3,2,.5,69],[3,2.5,.5,71],
 [4,0,.5,67],[4,.5,.5,64],[4,1,.5,65],[4,1.5,3,67], // tie across bars 5–6, no reattack
 [5,1.5,.5,62],[5,2,.5,65],[5,2.5,.5,64],
 [6,0,4.5,60] // dotted half tied to dotted quarter in bar 8
];
const melodyB=[
 [0,0,.5,62],[0,.5,.5,62],[0,1,.5,62],[0,1.5,.5,62],[0,2,.5,64],[0,2.5,.5,65],
 [1,0,.5,67],[1,.5,.5,64],[1,1,2,60], // eighth tied to dotted quarter
 [2,0,.5,62],[2,.5,.5,62],[2,1,.5,62],[2,1.5,.5,62],[2,2,.5,64],[2,2.5,.5,65],
 [3,0,3,67],
 [4,0,.5,62],[4,.5,.5,62],[4,1,.5,62],[4,1.5,.5,62],[4,2,.5,64],[4,2.5,.5,65],
 [5,0,.5,67],[5,.5,.5,64],[5,1,.5,67],[5,1.5,.5,69],[5,2,.5,67],[5,2.5,.5,65],
 [6,0,1,64],[6,1,.5,67],[6,1.5,.5,65],[6,2,.5,64],[6,2.5,.5,62],
 [7,0,3,60]
];
for(const [s,melody] of [[A,melodyA],[B,melodyB]])for(const [bar,beat,duration,note] of melody)add(s,'recorder',bar,beat,duration,note+12);
for(let bar=0;bar<8;bar++){
 for(const [beat,duration]of bar%2?[[2,.5],[2.5,.5]]:[[.5,.5],[1,.5],[1.5,1.5]])add(A,'claves',bar,beat,duration,75);
 for(const [beat,duration]of bar%2?[[0,1],[1,.5]]:[[.5,.5],[1,.5],[2,.5],[2.5,.5]])add(B,'tambourine',bar,beat,duration,54);
}
const harmonies={C:{alto:[60,64,67],bass:[48,55]},D:{alto:[62,65,69],bass:[50,57]}};
const harmonyA=Array.from({length:8},()=>['C','D']);
const harmonyB=[['D','D'],['C','C'],['D','D'],['C','C'],['D','D'],['C','D'],['C','D'],['C','C']];
for(const [s,bars]of [[A,harmonyA],[B,harmonyB]])bars.forEach((chords,bar)=>chords.forEach((chord,beat)=>{for(const part of ['alto','bass'])add(s,part,bar,beat*1.5,1.5,harmonies[chord][part])}));
project.sections=[A,B];project.activeSection=A.id;
project.arrangement=[A,B,A].map((s,n)=>({id:'assignment-4-entry-'+n,section:s.id,repeats:1,mutedTracks:[]}));
for(const t of project.tracks)t.events=structuredClone(A.events[t.id]);
validateProject(project);
await fs.writeFile(new URL('../dist/demos/assignment-4.orff',import.meta.url),JSON.stringify(project,null,2)+'\n');
