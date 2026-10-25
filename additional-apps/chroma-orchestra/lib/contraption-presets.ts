import {demoProject,projectSchema,stationLayout,type Project,type Note} from './project';
import {seasonalProject} from './seasonal';
import {defaultCamera} from './camera';
import {duration} from './project';
export function contraptionProject(kind:'waterfall'|'pipeworks'):Project{
 const p=demoProject('gold');p.name=kind==='waterfall'?'The Brasswater Waltz · Marimba Waterfall':'The Clock Strikes Thirteen · Midnight Pipeworks';p.scenery={...p.scenery,theme:kind==='waterfall'?'theater':'halloween'};p.labels=false;p.reverb=kind==='waterfall'?.31:.4;p.bpm=108;p.palette=kind==='waterfall'?'gold':'ruby';
 const notes:Note[]=[],drums:Note[]=[];const beat=60/p.bpm;
 if(kind==='pipeworks'){const source=seasonalProject('halloween');notes.push(...source.tracks[0].notes,...source.tracks[1].notes.map(n=>({...n,duration:Math.min(beat*1.6,n.duration*2.2),velocity:n.velocity*.75})));drums.push(...source.tracks[2].notes);}
 else{const phrases=[[72,76,79,76,74,71],[69,72,76,74,72,69],[65,69,72,76,74,72],[67,71,74,79,76,74],[72,79,84,83,81,79],[69,76,81,79,76,72],[65,72,77,76,74,72],[67,71,74,72,71,67]];
  for(let bar=0;bar<16;bar++){const root=[48,45,41,43,48,45,41,43][bar%8],time=bar*3*beat;phrases[bar%8].forEach((m,i)=>notes.push({midi:m,time:time+i*beat/2,duration:beat*.43,velocity:i===0?.88:.7}));for(const b of [0,1,2]){notes.push({midi:b?root+12:root,time:time+b*beat,duration:beat*.65,velocity:.56});if(b)notes.push({midi:root+19,time:time+b*beat,duration:beat*.55,velocity:.46});drums.push({midi:b===0?36:b===1?38:42,time:time+b*beat,duration:.12,velocity:b===0?.65:.38});}}
 }
 p.tracks=[{...p.tracks[0],id:kind+'-manual',name:kind==='waterfall'?'Rosewood cascade':'Midnight grand organ',machine:kind,program:kind==='waterfall'?12:19,pan:-.12,color:kind==='waterfall'?'#13b8f4':'#72df18',notes:notes.sort((a,b)=>a.time-b.time)}, {...p.tracks[2],id:kind+'-percussion',name:kind==='waterfall'?'Clockwork percussion':'Copper thunder',machine:'drums',program:kind==='waterfall'?0:47,percussion:kind==='waterfall',scale:.9,color:'#b65c27',pan:.35,notes:drums}];
 const layout=stationLayout(p);p.tracks[0].offset=[-layout[0].position[0],0,0];p.tracks[1].offset=[layout[0].width/2+2.5-layout[1].position[0],0,2];
 p.camera={...defaultCamera,mode:'orbit',yaw:-15,pitch:17,zoom:1.5,focus:p.tracks[0].id,orbitAmount:5,pan:[1,.25,0]};const total=duration(p),cue=(id:string,name:string,at:number,transition:'cut'|'glide'|'dissolve',camera:Project['camera'])=>({id,name,at:Math.round(at*60)/60,transition,seconds:1.4,camera});
 p.sequence={enabled:true,cues:[cue('opening','The complete machine',0,'cut',p.camera),cue('playing','The playing mechanism',total*.27,'glide',{...p.camera,mode:'front',yaw:15,pitch:24,focus:p.tracks[0].id,zoom:1.8,pan:[0,-.5,1]}),cue('return','The return lift',total*.52,'cut',{...p.camera,mode:'orbit',yaw:35,pitch:18,focus:p.tracks[0].id,zoom:1.32,pan:[1,0,0]}),cue('finale','The grand finale',total*.76,'dissolve',{...p.camera,yaw:-20,zoom:1.5})]};p.shots=p.sequence.cues.map(c=>({id:c.id,name:c.name,camera:c.camera}));return projectSchema.parse(p);
}
