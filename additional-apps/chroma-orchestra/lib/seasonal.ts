import {demoProject,projectSchema,type Project,type Note} from './project';
import {cameraTour} from './camera-sequence';
import {defaultCamera} from './camera';
export function seasonalProject(theme:'halloween'|'christmas'):Project{
 const p=demoProject();p.scenery={theme,snow:theme==='christmas',amount:.55,snowSpeed:.8,wind:.35};p.palette=theme==='christmas'?'emerald':'ruby';p.camera={...defaultCamera,pitch:14,pan:[0,1.2,0],zoom:1.06};p.labels=false;p.reverb=.34;
 const melody:Note[]=[],harmony:Note[]=[],rhythm:Note[]=[];
 if(theme==='christmas'){
  p.name='Jingle Bells · Snowglobe Village';p.bpm=108;const beat=60/p.bpm;
  // Public-domain refrain by James Lord Pierpont, in G. Original Chroma accompaniment.
  // Melody checked against the PD LilyPond edition credited in /music-credits.txt.
  const bars:[number,number][][]=[[[71,.5],[71,.5],[71,1],[71,.5],[71,.5],[71,1]],[[71,.5],[74,.5],[67,.75],[69,.25],[71,1],[-1,1]],[[72,.5],[72,.5],[72,.75],[72,.25],[72,.5],[71,.5],[71,.5],[71,.25],[71,.25]],[[71,.5],[69,.5],[69,.5],[71,.5],[69,1],[74,1]],[[71,.5],[71,.5],[71,1],[71,.5],[71,.5],[71,1]],[[71,.5],[74,.5],[67,.75],[69,.25],[71,1],[-1,1]],[[72,.5],[72,.5],[72,.75],[72,.25],[72,.5],[71,.5],[71,.5],[71,.25],[71,.25]],[[74,.5],[74,.5],[72,.5],[69,.5],[67,1.5],[-1,.5]]];
  for(let pass=0;pass<2;pass++)bars.forEach((bar,i)=>{let offset=0;bar.forEach(([m,len])=>{if(m>=0)melody.push({midi:m+(pass?12:0),time:((pass*8+i)*4+offset)*beat,duration:len*beat*.91,velocity:.78+(offset===0?.12:0)});offset+=len;});});
  const chords=[[43,55,59,62],[43,55,59,62],[48,55,60,64],[50,57,60,66],[43,55,59,62],[43,55,59,62],[48,55,60,64],[43,55,59,62]];
  for(let bar=0;bar<16;bar++){const chord=chords[bar%8];for(let b=0;b<4;b++){const time=(bar*4+b)*beat;harmony.push({midi:chord[b%2?2:0],time,duration:beat*.7,velocity:.64});if(b%2)harmony.push({midi:chord[3],time,duration:beat*.5,velocity:.45});for(let half=0;half<2;half++)rhythm.push({midi:54,time:time+half*beat/2,duration:.09,velocity:half?.32:.55});if(b===0||b===2)rhythm.push({midi:36,time,duration:.15,velocity:.42});}}
  p.tracks=projectSchema.parse({...p,tracks:[{...p.tracks[0],id:'winter-melody',name:'Crystal celesta',machine:'bells',program:8,color:'#00bfff',notes:melody},{...p.tracks[1],id:'winter-harmony',name:'Toyshop marimba',machine:'marimba',program:12,color:'#ff284b',notes:harmony},{...p.tracks[2],id:'winter-rhythm',name:'Sleigh rhythm',machine:'drums',program:0,percussion:true,color:'#ffd21c',notes:rhythm}]}).tracks;
 }else{
  p.name='The Clock Strikes Thirteen · Hollow Moon';p.bpm=108;const beat=60/p.bpm;
  const phrases=[[69,72,76,75,76,72],[68,71,74,77,76,71],[69,72,77,76,74,72],[68,71,74,72,71,68],[69,76,81,80,81,76],[77,76,74,72,71,68],[69,72,76,74,72,71],[68,71,74,76,71,68]];
  for(let bar=0;bar<24;bar++){const notes=phrases[bar%8],time=bar*3*beat;notes.forEach((m,i)=>melody.push({midi:m,time:time+i*.5*beat,duration:.43*beat,velocity:i===0?.88:.66}));const root=[45,40,41,40,45,41,43,40][bar%8];harmony.push({midi:root,time,duration:beat*.8,velocity:.72});for(const b of [1,2])for(const n of [root+12,root+19])harmony.push({midi:n,time:time+b*beat,duration:beat*.46,velocity:.46});rhythm.push({midi:root+12,time,duration:beat*1.3,velocity:.45});if(bar%4===3)for(const b of [2,2.5])rhythm.push({midi:root+19,time:time+b*beat,duration:beat*.4,velocity:.38});}
  p.tracks=projectSchema.parse({...p,tracks:[{...p.tracks[0],id:'hollow-melody',name:'Haunted music box',machine:'bells',program:10,color:'#ff7518',notes:melody},{...p.tracks[1],id:'hollow-harmony',name:'Midnight pizzicato',machine:'marimba',program:45,color:'#a52cff',notes:harmony},{...p.tracks[2],id:'hollow-rhythm',name:'Thunder kettles',machine:'drums',program:47,percussion:false,color:'#65f522',notes:rhythm}]}).tracks;
 }
 p.sequence=cameraTour(p);p.shots=p.sequence.cues.map(c=>({id:c.id,name:c.name,camera:c.camera}));return projectSchema.parse(p);
}
