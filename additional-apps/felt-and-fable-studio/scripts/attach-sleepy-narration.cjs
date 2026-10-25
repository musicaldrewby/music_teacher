// Attach Drew's edited performance and the reviewed, shared playback/export cues.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../story-source/sleepy-hollow');
function attach(target){
 const p=JSON.parse(fs.readFileSync(target)),m=JSON.parse(fs.readFileSync(root+'/narration-timing.json'));
 const id='sleepy-drew-narration';
 p.audioAssets={[id]:{name:'Drew Wichman · Sleepy Hollow narration',data:'data:audio/mpeg;base64,'+fs.readFileSync(root+'/narration.mp3').toString('base64'),duration:m.duration}};
 p.music={assetId:id,volume:1,loop:false,duck:false,fade:0,startSceneId:null,endSceneId:null};
 p.phraseShow={version:1,enabled:true,mode:'follow',timing:{version:1,assetId:id,sceneIds:p.scenes.map(s=>s.id),starts:m.cues.map(c=>c.start),end:m.duration}};
 const scene=id=>p.scenes.find(s=>s.id==='sleepy-'+id);
 if(!p.sleepyNarrationEdition){
  const shift=(o,delta)=>{if(!o.keyframes?.length)return;const initial=JSON.parse(JSON.stringify(o.keyframes[0]));o.keyframes.forEach(k=>k.t+=delta);initial.t=0;o.keyframes.unshift(initial);if(o.illustration)o.illustration.changes.forEach(c=>c.time+=delta);};
  // A close shot waits until the spoken mishap before the saddle drops.
  const saddle=scene('19A').items.find(o=>o.asset?.endsWith('-saddle'));shift(saddle,4.1);scene('19A').phrase.holdAt=6.5;
  scene('21A').items.find(o=>o.illustration).illustration.changes[0].time=2.7;
  // The object travels on “hurtled” and lands on “crash”.
  const impact=scene('21B');for(const o of impact.items){if(o.name==='A dark round shape'){
    const first=JSON.parse(JSON.stringify(o.keyframes[0]));o.keyframes.forEach(k=>k.t=k.t<=.72?1.65+k.t*(2.3/.72):k.t+1.65);first.t=0;first.pose.opacity=0;o.keyframes.unshift({...JSON.parse(JSON.stringify(first)),t:1.64});o.keyframes.unshift(first);
   }else if(o.keyframes?.length)shift(o,3.25);}
  impact.phrase.holdAt=8;
  scene('24A').items.find(o=>o.illustration?.poses.some(q=>q.asset.endsWith('brom-laugh'))).illustration.changes[0].time=12.5;
  scene('24A').phrase.holdAt=13.5;
 }
 p.sleepyNarrationEdition=1;
 for(const [i,s]of p.scenes.entries()){
  s.director.notes=s.director.notes.replace('Advance after the last words above. Scene durations are provisional until your voice is imported and timing recorded.','Drew’s narration and scene timing are embedded. Playback, timeline and exports use the same saved cues. Manual advance remains available.');
  s.phrase.direction='Follow Drew’s narration, or choose Manual and advance after this passage.';
 }
 const end=scene('24B'),duration=m.duration-m.cues.at(-1).start;
 end.cinema.titles[0].start=Math.max(0,duration-6);end.cinema.titles[0].duration=6;end.cinema.titles[0].subtitle='Based on the story by Washington Irving · Narrated by Drew Wichman';end.phrase.holdAt=duration;
 p.filmBrief.notes='49 editable shots / 24 narration sections. Narrated by Drew Wichman. Last complete takes selected, abandoned takes removed, long setup pauses shortened. Narration and scene timing are embedded: Present → Play, whole-story playback, timeline and export all use the same cues. Manual mode remains available for students. Original felt artwork; grounded sets and restrained camera moves. Based on the story by Washington Irving: https://www.gutenberg.org/ebooks/41';
 const beats=JSON.parse(fs.readFileSync(root+'/beats.json')),stamp=t=>Math.floor(t/60).toString().padStart(2,'0')+':'+(t%60).toFixed(2).padStart(5,'0');
 const lines=['THE LEGEND OF SLEEPY HOLLOW','Narrated by Drew Wichman · Playback and manual presentation cues','','OPEN: Felt & Fable → File → Sleepy Hollow story → Present → Play.','Your narration and all 49 scene cues are saved in the story. No timing recording or Apply step is required. Presentation, timeline, whole-story playback and export use these same cues.','For students: choose Manual. Read aloud and press Space to advance each shot.','Original recording remains unchanged. This edit uses the last complete takes.','Runtime: 11 minutes 40 seconds.','',...beats.flatMap((b,i)=>[(i+1).toString().padStart(2,'0')+' / 49 — '+b.id+' · '+b.name+' · '+stamp(m.cues[i].start),b.text,'','[MANUAL: SPACE → next shot]',''])].join('\n');
 fs.writeFileSync(root+'/Sleepy-Hollow-Recording-Cues.txt',lines);fs.writeFileSync(path.join(path.dirname(target),'Sleepy-Hollow-Recording-Cues.txt'),lines);
 fs.writeFileSync(target,JSON.stringify(p));console.log('Attached narration: '+m.duration.toFixed(3)+' seconds; '+m.cues.length+' scene cues.');
}
module.exports=attach;if(require.main===module)attach(process.argv[2]||'public/examples/sleepy-hollow.felt.json');
