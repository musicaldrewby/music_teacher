'use strict';
// Optional song cues do not rewrite authored scene lengths.
const PHRASE_CUE_GAP=.1;
function phraseTimingValidate(q){
 if(!q)return;
 if(q.version!==1||typeof q.assetId!=='string'||!Array.isArray(q.sceneIds)||!q.sceneIds.length||q.sceneIds.length>100||q.sceneIds.some(id=>typeof id!=='string')||new Set(q.sceneIds).size!==q.sceneIds.length||!Array.isArray(q.starts)||q.starts.length!==q.sceneIds.length||q.starts[0]!==0||!Number.isFinite(q.end)||q.end<=0||q.end>7200)throw Error('Invalid recorded song timing.');
 let previous=-Infinity,missing=false;
 for(const t of q.starts){if(t===null){missing=true;continue}if(missing||!Number.isFinite(t)||t<0||t<previous+PHRASE_CUE_GAP-1e-6||t>=q.end)throw Error('Song cues must be increasing, with empty cues only at the end.');previous=t;}
 if(q.end-previous<PHRASE_CUE_GAP-1e-6)throw Error('Leave at least a tenth of a second after the final cue.');
}
function phraseTimingStatus(p=state,q=p.phraseShow?.timing){
 const a=mediaInfo(p.music?.assetId,p);
 if(!a)return{valid:false,complete:false,message:'Import a song to record scene timing.'};
 if(!q)return{valid:false,complete:false,message:'Choose Record timing, then start the song.'};
 try{phraseTimingValidate(q)}catch(e){return{valid:false,complete:false,message:e.message}}
 if(q.assetId!==p.music.assetId||q.end>a.duration+.001||q.sceneIds.length!==p.scenes.length||q.sceneIds.some((id,i)=>id!==p.scenes[i].id))return{valid:false,complete:false,message:'The song or scene order has changed. Record new timing.'};
 const count=q.starts.filter(Number.isFinite).length,complete=count===p.scenes.length;
 return{valid:true,complete,count,timing:q,message:complete?'Recorded timing active for all '+count+' scenes · playback and export use these cues.':count+' of '+p.scenes.length+' scene starts recorded.'};
}
function phrasePlaybackTiming(p=state){return p.phraseVideo||(phraseTimingStatus(p).complete?p.phraseShow.timing:null);}
function phraseRecordingStatus(p=state){return phraseTimingStatus(p,p.phraseShow?.draft||null);}
function phraseAdoptCompleteDraft(p=state){const status=phraseRecordingStatus(p);if(!status.complete)return false;const q=copy(status.timing);delete q.position;phraseConfig(p).timing=q;delete p.phraseShow.draft;return true;}
function phrasePlaybackLyrics(p=state){return p.phraseVideo?.lyrics??p.exportCaptions??true;}
function phraseSceneSeconds(s,p=state,fps=60){const q=phrasePlaybackTiming(p),i=p.scenes.indexOf(s);if(!q||i<0)return null;const from=Math.round(q.starts[i]*fps),to=i+1<q.starts.length?Math.round(q.starts[i+1]*fps):Math.ceil(q.end*fps-1e-7);return(to-from)/fps;}
function phraseResizeScene(s,duration,p=state){
 const status=phraseTimingStatus(p);if(!status.complete)return false;const q=copy(status.timing),i=p.scenes.indexOf(s),end=q.starts[i]+duration;
 if(i===p.scenes.length-1)q.end=end;else q.starts[i+1]=end;
 phraseTimingValidate(q);if(q.end>mediaInfo(q.assetId,p).duration+.001)throw Error('The ending cannot be after the song.');p.phraseShow.timing=q;return true;
}
function phraseConfig(p=state){p.phraseShow??={version:1,enabled:true,mode:'manual'};p.phraseShow.enabled=true;return p.phraseShow;}
function phraseDirty(){dirty=true;window.FeltRecovery?.changed();updateSaveState();}
function phraseNewTiming(p=state){const a=mediaInfo(p.music?.assetId,p);if(!a)throw Error('Import a song first.');return{version:1,assetId:p.music.assetId,sceneIds:p.scenes.map(s=>s.id),starts:p.scenes.map((s,i)=>i?null:0),end:a.duration};}
function phraseIndexAt(q,time){let index=0;for(let i=1;i<q.starts.length;i++){if(q.starts[i]===null||q.starts[i]>time)break;index=i;}return index;}
function phraseHold(s,p=state){return s.phrase?.holdAt??sceneAnimationSeconds(s,p);}
function phraseDrawLyrics(g,text,w,h){
 if(!text?.trim())return;g.save();g.scale(w/1920,h/1080);
 const words=text.trim().split(/\s+/),width=1640;let lines=[],size=56;
 const wrap=()=>{const result=[];let line='';for(const word of words){const trial=line?line+' '+word:word;if(line&&g.measureText(trial).width>width){result.push(line);line=word}else line=trial}if(line)result.push(line);return result;};
 do{g.font='600 '+size+'px Georgia, serif';lines=wrap();if(lines.length<=3||size<=32)break;size-=2;}while(true);
 if(lines.length>3){lines=lines.slice(0,3);lines[2]=lines[2].replace(/\s+\S*$/,'')+'…';}
 const step=size*1.22,boxHeight=lines.length*step+30,top=1050-boxHeight;
 g.fillStyle='rgba(12,28,29,.87)';g.beginPath();g.roundRect(90,top,1740,boxHeight,15);g.fill();g.fillStyle='#fff8e9';g.textAlign='center';g.textBaseline='top';
 lines.forEach((line,i)=>g.fillText(line,960,top+12+i*step,width));g.restore();
}
function phraseDraw(g,p,s,localTime,lyrics=true){const w=g.canvas.width,h=g.canvas.height;g.clearRect(0,0,w,h);drawScene(g,s,w,h,Math.max(0,localTime),false,false,p);if(lyrics)phraseDrawLyrics(g,s.caption||s.name,w,h);}
function phraseVideoProject(source=state,lyrics=true){
 const status=phraseTimingStatus(source);if(!status.complete)throw Error(status.message);
 const p=copy(source),q=status.timing;p.phraseVideo={version:1,starts:[...q.starts],end:q.end,lyrics:!!lyrics};
 // Match the soundtrack heard while recording and following the song.
 p.music={...p.music,startSceneId:null,endSceneId:null,loop:false,duck:false,fade:0};
 p.director={...p.director,resolution:1080,range:{mode:'whole'}};return p;
}
function phraseVideoTimeline(p,fps=60){
 const q=phrasePlaybackTiming(p),ends=q.starts.slice(1).map(t=>Math.round(t*fps));ends.push(Math.ceil(q.end*fps-1e-7));
 return p.scenes.map((s,i)=>{const firstFrame=Math.round(q.starts[i]*fps),endFrame=ends[i];if(endFrame<=firstFrame)throw Error('Two scene cues are too close for this frame rate.');return{scene:s,index:i,firstFrame,frames:endFrame-firstFrame,start:firstFrame/fps,end:endFrame/fps,duration:(endFrame-firstFrame)/fps};});
}
function phraseVideoFrame(g,p,tl,frame,fps){const row=tl.find(r=>frame<r.firstFrame+r.frames)||tl.at(-1);phraseDraw(g,p,row.scene,(frame-row.firstFrame)/fps,phrasePlaybackLyrics(p));return row.index;}
