'use strict';
let classroomPreparing=false;
function classroomHold(s,p){s=p.scenes.find(q=>q.id===s.id)||s;const next=p.scenes[p.scenes.findIndex(q=>q.id===s.id)+1];if(s.cinema?.foregroundReveal||next?.cinema?.foregroundReveal)return Math.max(phraseHold(s,p),sceneSeconds(s,p));return s.cinema?.liveCamera?Math.max(phraseHold(s,p),Math.min(sceneSeconds(s,p),cinemaRows(s).at(-1)?.end||0)):phraseHold(s,p);}
function classroomClipProject(source,fps){
 const p=copy(source);p.classroomHolds=p.scenes.map(s=>classroomHold(s,source));let at=0;const starts=p.scenes.map((s,i)=>{const start=at;at+=Math.max(1,Math.ceil(p.classroomHolds[i]*fps)+1)/fps;return start;});
 p.phraseVideo={version:1,starts,end:at,lyrics:false};p.music={...p.music,assetId:null};return p;
}
function classroomFormatUI(){const live=$('classroomFormat').value!=='video';for(const el of document.querySelectorAll('[data-classroom-video]'))el.hidden=live;}
function classroomOpen(){
 if(exportJob||classroomPreparing)return;phrasePause();stopAnimationPreview();stopStoryPlayback();const status=phraseTimingStatus(),audio=mediaInfo(state.music?.assetId,state);$('classroomSong').checked=!!audio;$('classroomSong').disabled=!audio;$('classroomSongHint').textContent=status.complete?'Includes your song and saved cues. Teachers can replace the audio or record new timing in their copy.':audio?'Includes your song. Teachers can record cue timing directly in the standalone player.':'No song is required. Teachers can add their own audio and record timing in the downloaded player.';classroomFormatUI();$('classroomStatus').textContent='One HTML file with embedded artwork and motion. No editor, account, or internet connection is needed.';$('classroomDialog').showModal();
}
async function classroomBlobData(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Could not package the scene.'));reader.readAsDataURL(blob);});}
async function classroomBeginExport(){
 if(exportJob||classroomPreparing)return;classroomPreparing=true;$('classroomStart').disabled=true;const source=copy(state),live=$('classroomFormat').value!=='video',fps=live?60:Number($('classroomFps').value)===60?60:30,height=Number($('classroomResolution').value)===1080?1080:720;let job=null;
 try{
  const support=live?null:await mp4Support(false,'precise',fps,height);if(!live&&!support)throw Error('This browser cannot encode the scene animations. Try Chrome or Edge, or choose 30 fps.');if(support&&height===720)support.video.bitrate=fps===60?6000000:4000000;
  const p=classroomClipProject(source,fps),tl=storyTimeline(p,fps),status=phraseTimingStatus(source),audio=mediaInfo(source.music?.assetId,source),song=$('classroomSong').checked&&!!audio;
  if(tl.at(-1).end>3600)throw Error('Keep the classroom animations under one hour in total. Export a shorter story.');
  const data={version:2,title:source.title,scenes:[],music:song?{src:audio.data,name:audio.name||'Included song',duration:audio.duration,starts:status.complete?[...status.timing.starts]:null,end:status.complete?status.timing.end:audio.duration,volume:source.music.volume??1}:null};
  job={fps,width:height*16/9,height,cancelled:false,error:null,encoders:[],classroomIndex:0,classroomTotal:live?0:tl.length};exportJob=job;$('classroomDialog').close();$('videoProgressDialog').showModal();$('cancelVideo').disabled=false;
  exportProgress(0,live?'Packing original artwork and motion…':'Preparing scene videos…');
  await ensureStoryArtwork(p);checkExport(job);
  if(live)await classroomPackLive(p,data,job);
  else for(const row of tl){
   job.classroomIndex=row.index;job.range={mode:'marked',firstFrame:row.firstFrame,endFrame:row.firstFrame+row.frames,start:row.start,end:row.end,duration:row.duration};
   const poster=makeCanvas(Math.min(job.width,960),Math.min(job.width,960)*9/16);phraseDraw(poster.getContext('2d'),p,row.scene,0,false);
   const blob=await encodeReusableMP4(job,p,tl,support);checkExport(job);await productionValidateExport(blob);
   const src=await classroomBlobData(blob),hold=p.classroomHolds[row.index],next=p.scenes[row.index+1],reveal=next?.cinema?.foregroundReveal,manualHold=reveal?hold-Math.min(reveal.duration/2,hold/2,p.classroomHolds[row.index+1]/2):hold;data.scenes.push({name:row.scene.name,caption:row.scene.caption||row.scene.name,hold,manualHold,duration:row.duration,poster:poster.toDataURL('image/jpeg',.86),video:src.slice(src.indexOf(',')+1)});
   for(const enc of job.encoders)try{if(enc.state!=='closed')enc.close()}catch{}job.encoders=[];
  }
  checkExport(job);const html=new Blob([classroomHTML(data)],{type:'text/html;charset=utf-8'});download(html,filename(source.title)+'_classroom.html');$('classroomStatus').textContent=(live?'Live artwork story downloaded · ':'Video classroom story downloaded · ')+data.scenes.length+' scenes · '+(html.size/1024/1024).toFixed(1)+' MB. Open the HTML file and use Space or Next to advance. Audio & timing lets each teacher add a song, record cues, and save their own copy.';
 }catch(e){$('classroomStatus').textContent=e.name==='AbortError'?'Export cancelled. Completed scenes can be reused when you try again.':'Could not export: '+e.message;}
 finally{if(job){job.cancelled=true;for(const enc of job.encoders)try{if(enc.state!=='closed')enc.close()}catch{}exportJob=null;$('videoProgressDialog').close();}classroomPreparing=false;$('classroomStart').disabled=false;if(!$('classroomDialog').open)$('classroomDialog').showModal();}
}
function classroomInit(){for(const id of ['phraseClassroom','exportClassroom'])$(id).onclick=classroomOpen;$('classroomClose').onclick=()=>$('classroomDialog').close();$('classroomStart').onclick=classroomBeginExport;$('classroomFormat').onchange=classroomFormatUI;classroomFormatUI();}

async function classroomPackLive(p,data,job){
 const ids=new Set(p.scenes.flatMap(s=>[...sceneAssetIds(s)])),artwork={},pieces=[];
 let completed=0;
 for(const key of ids){
  checkExport(job);const im=imageMap.get(key);if(!im)throw Error('Missing artwork: '+key);
  let src=p.imports?.[key]||im.feltImportData||im.src;
  if(typeof src!=='string'||!src.startsWith('data:image/')){const c=makeCanvas(im.naturalWidth||im.width,im.naturalHeight||im.height);c.getContext('2d').drawImage(im,0,0);src=c.toDataURL('image/png');}
  artwork[key]=src;const meta=artById.get(key);if(meta)pieces.push({id:key,music:meta.music,puppet:meta.puppet});
  exportProgress(++completed/Math.max(1,ids.size),'Embedding artwork '+completed+' / '+ids.size+'…');await new Promise(resolve=>setTimeout(resolve,0));
 }
 data.scenes=p.scenes.map((s,i)=>{const hold=p.classroomHolds[i],reveal=p.scenes[i+1]?.cinema?.foregroundReveal;return{name:s.name,caption:s.caption||s.name,hold,manualHold:reveal?hold-Math.min(reveal.duration/2,hold/2,p.classroomHolds[i+1]/2):hold};});
 // Keep speech envelopes and duration metadata used by the renderer, without bundling unused audio.
 for(const audio of Object.values(p.audioAssets||{}))delete audio.data;
 p.custom=[];p.imports={};p.active=0;
 const packs={};function collect(items){for(const o of items){if(o.storyProp?.pack){const key=o.storyProp.pack,p=window.STORY_PROP_PACKS?.[key];if(p)packs[key]=copy(p);}if(o.children)collect(o.children);}}p.scenes.forEach(s=>collect(s.items));
 Object.assign(data,{version:3,renderer:'canvas',project:p,artwork,catalog:{art:{pieces},propPacks:packs}});
 checkExport(job);
}
