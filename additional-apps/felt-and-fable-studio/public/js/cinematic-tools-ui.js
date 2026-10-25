'use strict';
let cinePreviewToken=0,cineGalleryToken=0,cineKind='close';
function cineCurrentScene(){return state.scenes.find(s=>s.id===deskRow().sceneId);}
function cineShotChoice(){filmOptions('cineShotChoice',deskShotRows().map((r,i)=>[String(i),r.sceneName+' · '+r.name]),String(deskSelection));}
function cineError(e){deskMessage(e.message||String(e),true);}
function cineFieldsShot(){
 const r=deskRow(),s=cineCurrentScene(),shot=r.shot,path=shot.path||{},duration=r.end-r.start;
 cineShotChoice();$('cineShotLabel').textContent=r.sceneName+' · '+r.name+' · '+duration.toFixed(2)+' s';
 const pieces=s.items.filter(o=>!o.hidden).map(o=>[o.id,o.name]);filmOptions('cineSubject',pieces,$('cineSubject').value);filmOptions('cinePartner',[['','Choose a second piece'],...pieces],$('cinePartner').value);
 $('cineMove').checked=!!shot.move;$('cineBend').value=path.bend||0;$('cineHoldStart').value=((path.holdStart||0)*duration).toFixed(2);$('cineHoldEnd').value=((path.holdEnd||0)*duration).toFixed(2);$('cineEase').value=shot.easing||'cinematic';$('cineRollFrom').value=shot.from?.roll||0;$('cineRollTo').value=shot.to?.roll||0;
 $('cineSegmentHint').textContent=shot.cameraSegment?'This shot keeps the exact motion of a split camera path. Saving new path controls replaces that segment.':'Pauses fit inside the shot. Its ending and the song stay fixed.';
 filmOptions('cineDepthPiece',[['','Choose a scenery piece'],...pieces],$('cineDepthPiece').value);cineDepthLoad();
 for(const k of ['back','middle','foreground'])$('cineLayer'+k).value=s.cinema?.depthLayers?.[k]??CINEMA_DEPTH[k];
 $('cineBackgroundDepth').value=s.cinema?.backgroundDepth??1;$('cineDepthMode').value=cineDepthMode(s);cineDepthModeFields();
 const reveal=s.cinema?.foregroundReveal;$('cineRevealKind').value=reveal?.kind||'none';$('cineRevealDuration').value=reveal?.duration||1.2;$('cineRevealDirection').value=reveal?.direction||'left';
 $('cineSeek').min=r.start;$('cineSeek').max=Math.max(r.start,r.end-1/(state.exportFps||60));$('cineSeek').step=1/(state.exportFps||60);$('cineSeek').value=r.start;
 cineGallery().catch(cineError);cinePathPreview().catch(cineError);cineCueOptions();
}
function cineDepthModeFields(){
 const grounded=$('cineDepthMode').value==='grounded';$('cineBackgroundDepth').disabled=grounded;$('cineLayermiddle').disabled=grounded;
 $('cineDepthModeHint').textContent=grounded?'The painted floor, actors, and main-stage pieces share the same camera movement. Back and foreground scenery can still add depth. Save to apply.':'The backdrop and pieces can drift independently for floating, dreamlike scenes. A painted floor can slide beneath the cast. Save to apply.';
}
function cineDepthPieceFields(){
 const s=cineCurrentScene(),o=s.items.find(o=>o.id===$('cineDepthPiece').value),attached=!!(o?.attachment||o?.propActions?.length),grounded=!!o&&cineGroundContact({...o,depthContact:$('cineDepthContact').value},s);
 $('cineDepthContact').disabled=!o||attached;$('cineDepthValue').disabled=!o||attached||grounded;$('cineSaveDepth').disabled=!o||attached;$('cineResetDepth').disabled=!o||attached;
 $('cineDepthInherited').textContent=attached?'This prop inherits its character’s depth.':!o?'Choose a piece to change its behavior.':grounded?'This piece stays on the stage at depth 1. Free depth is useful for clouds, flying pieces, and decorative scenery.':o.depthFactor===undefined?'Using the layer’s depth.':'This piece has its own depth.';
}
function cineDepthLoad(){const s=cineCurrentScene(),o=s.items.find(o=>o.id===$('cineDepthPiece').value);$('cineDepthValue').value=o?.depthFactor??s.cinema?.depthLayers?.[o?.depth||'middle']??CINEMA_DEPTH[o?.depth||'middle'];$('cineDepthContact').value=o?.depthContact||'auto';cineDepthPieceFields();}
function cinePathInput(){const duration=deskRow().end-deskRow().start;return{path:{bend:filmNum('cineBend'),holdStart:filmNum('cineHoldStart')/duration,holdEnd:filmNum('cineHoldEnd')/duration},fromRoll:filmNum('cineRollFrom'),toRoll:filmNum('cineRollTo'),move:$('cineMove').checked,easing:$('cineEase').value};}
function cineShotOp(op,extra={}){const r=deskRow();return{op,sceneId:r.sceneId,shotId:r.shotId,...extra};}
async function cineCommit(operations,message){const time=Number($('cineSeek').value)||deskRow().start;const ok=await deskCommit(operations,message);if(ok){cineFieldsShot();if(!$('deskFinishPanel').hidden)cineFinishLoad();if(time>=deskRow().start&&time<deskRow().end)$('cineSeek').value=time;}return ok;}
async function cineGallery(){
 const token=++cineGalleryToken,p=state,r=deskRow(),s=cineCurrentScene(),host=$('cineGallery'),subject=$('cineSubject').value,partner=$('cinePartner').value;host.replaceChildren();await ensureSceneArtwork(s);if(token!==cineGalleryToken||state!==p)return;
 for(const [kind,name,help]of CINE_COMPOSITIONS){
  const button=filmEl('button',undefined,'cine-composition'),c=makeCanvas(320,180);button.setAttribute('aria-pressed',String(kind===cineKind));button.title=help;
  let pose;try{pose=cineComposition(s,kind,subject,partner,r.localStart,p);}catch(e){button.disabled=true;button.title=e.message;}
  if(pose){const prior=studioCameraOverride;try{studioCameraOverride={sceneId:s.id,pose};drawScene(c.getContext('2d'),s,320,180,r.localStart,false,true,p);}finally{studioCameraOverride=prior;}}
  else{const g=c.getContext('2d');g.fillStyle='#263f38';g.fillRect(0,0,320,180);g.fillStyle='#d5dfcc';g.textAlign='center';g.font='15px sans-serif';g.fillText('Choose two pieces',160,95);}
  button.append(c,filmEl('strong',name),filmEl('small',help));button.onclick=()=>{cineKind=kind;for(const b of host.children)b.setAttribute('aria-pressed',String(b===button));$('cineCompositionName').textContent=name+' selected · apply when ready.';};host.append(button);
 }
 $('cineCompositionName').textContent=(CINE_COMPOSITIONS.find(c=>c[0]===cineKind)?.[1]||'Composition')+' selected · apply when ready.';
}
async function cinePathPreview(){
 const token=++cinePreviewToken,r=deskRow(),p=copy(state),s=p.scenes.find(s=>s.id===r.sceneId);
 cineOperation(p,cineShotOp('setShotPath',cinePathInput()));cineValidate(p);await ensureSceneArtwork(s);if(token!==cinePreviewToken||!$('studioDesk').open)return;
 const rows=cinemaRows(s),row=rows.find(q=>q.shot.id===r.shotId)||rows[0];
 for(const [name,time]of [['cinePathStart',row.start],['cinePathEnd',row.end-1/6000]]){const c=$(name);drawScene(c.getContext('2d'),s,c.width,c.height,time,false,true,p);}
 const map=$('cinePathMap'),g=map.getContext('2d');drawScene(g,s,map.width,map.height,row.start,true,false,p);g.save();g.scale(map.width/W,map.height/H);g.strokeStyle='#ffe2a0';g.lineWidth=5;g.beginPath();for(let i=0;i<=60;i++){const q=studioCameraForRow(s,row,row.start+row.shot.duration*i/60,rows,p);i?g.lineTo(q.x,q.y):g.moveTo(q.x,q.y);}g.stroke();for(const [u,label]of [[0,'START'],[1,'END']]){const q=studioCameraForRow(s,row,row.start+row.shot.duration*u,rows,p);g.fillStyle=u?'#ffe2a0':'#a1e1cd';g.beginPath();g.arc(q.x,q.y,12,0,Math.PI*2);g.fill();g.font='bold 22px sans-serif';g.fillText(label,q.x+20,q.y-18);}g.restore();
 const time=cinemaClamp(Number($('cineSeek').value),r.start,r.end-1/(state.exportFps||60)),c=$('cinePathLive');drawScene(c.getContext('2d'),s,c.width,c.height,time-r.start+r.localStart,false,true,p);$('cinePathClock').textContent=avTime(time)+' · unsaved preview';
}
function cineCueList(p=state){
 const timing=phrasePlaybackTiming(p),list=[];
 if(timing)timing.starts.forEach((time,i)=>list.push({time,label:'Recorded · '+p.scenes[i].name,recorded:true}));
 for(const m of p.production?.markers||[])list.push({time:m.time,label:'Marker · '+m.label});
 for(const m of p.director?.musicCues||[])list.push({time:m.time,label:'Music · '+m.label});
 return list.sort((a,b)=>a.time-b.time);
}
function cineCueOptions(){const cues=cineCueList();filmOptions('cineMusicCue',cues.length?cues.map((q,i)=>[String(i),avTime(q.time)+' · '+q.label]):[['','Add a song cue or music marker first']]);$('cineCutCue').disabled=!cues.length;$('cineCueTiming').textContent=phrasePlaybackTiming(state)?'Recorded song timing is locked. White lines mark its scene cues; gold lines mark music markers.':'Shots keep the scene boundaries and music track in place. Gold lines mark music markers.';}
function cineCuePaint(g,total){const timing=phrasePlaybackTiming(state);if(!timing)return;g.save();for(const time of timing.starts){const x=time/total*g.canvas.width;g.strokeStyle='#fff9df';g.lineWidth=2;g.beginPath();g.moveTo(x,0);g.lineTo(x,g.canvas.height);g.stroke();g.fillStyle='#fff9df';g.beginPath();g.moveTo(x-5,0);g.lineTo(x+5,0);g.lineTo(x,8);g.closePath();g.fill();}g.restore();}
async function cineCut(time){
 if(!await cineCommit([{op:'cutAtMusic',time}],'Cut placed on the cue. The song and recorded scene timings are unchanged.'))return;
 const fps=state.exportFps||60,t=Math.round(time*fps)/fps,rows=deskShotRows();deskSelection=Math.max(0,rows.findIndex(r=>t>=r.start-1e-6&&t<r.end-1e-6));deskPage=Math.floor(deskSelection/12);deskRefresh();deskTab('Cinema');cineFieldsShot();
}
function cineFinishValue(){return{look:$('cineLook').value,strength:filmNum('cineLookStrength'),glow:filmNum('cineGlow'),grain:filmNum('cineGrain'),vignette:filmNum('cineVignette'),aspect:$('cineAspect').value};}
function cineBrowserLooks(){try{const list=JSON.parse(localStorage.getItem('felt-cinematic-looks')||'[]');if(!Array.isArray(list))return[];return list.filter(q=>{try{cineValidate({scenes:[],filmFinish:q.finish});return typeof q.name==='string'&&q.name.length<=60;}catch{return false;}}).slice(0,30);}catch{return[];}}
function cineSavedLooks(){const list=new Map(cineBrowserLooks().map(q=>[q.name,q]));for(const q of state.savedFilmLooks||[])list.set(q.name,q);return [...list.values()];}
function cineFinishFields(f){for(const [name,key]of [['cineLook','look'],['cineLookStrength','strength'],['cineGlow','glow'],['cineGrain','grain'],['cineVignette','vignette'],['cineAspect','aspect']])$(name).value=f[key];}
function cineFinishLoad(){cineFinishFields(state.filmFinish||CINE_FINISH_DEFAULT);filmOptions('cineSavedLook',cineSavedLooks().length?cineSavedLooks().map((q,i)=>[String(i),q.name]):[['','No custom looks saved yet']]);cineFinishPreview().catch(cineError);}
async function cineFinishPreview(){
 const token=++cinePreviewToken,p=copy(state),r=deskRow();p.filmFinish=cineFinishValue();cineValidate(p);const tl=storyTimeline(p),time=(r.start+r.end)/2;await directorRangeArtwork(p,tl,{start:time,end:time+1/60});if(token!==cinePreviewToken||!$('studioDesk').open)return;
 const before=$('cineFinishBefore'),after=$('cineFinishAfter'),fps=state.exportFps||60;paintVideoFrame(after.getContext('2d'),p,storyTimeline(p,fps),Math.floor(time*fps),fps);delete p.filmFinish;paintVideoFrame(before.getContext('2d'),p,storyTimeline(p,fps),Math.floor(time*fps),fps);
 $('cineFinishScope').textContent='Previewing '+r.sceneName+' · Apply updates all '+state.scenes.length+' scenes. Lyrics stay clear above the finishing effects.';
}
function cineInit(){
 $('deskOpenCinema').onclick=()=>deskTab('Cinema');$('deskOpenFinish').onclick=()=>deskTab('Finish');
 $('cineShotChoice').onchange=()=>{deskSelection=Number($('cineShotChoice').value);deskPage=Math.floor(deskSelection/12);deskLoadShot();cineFieldsShot();};
 for(const key of ['cineSubject','cinePartner'])$(key).onchange=()=>cineGallery().catch(cineError);
 $('cineApplyComposition').onclick=()=>cineCommit([cineShotOp('composeShot',{kind:cineKind,subjectId:$('cineSubject').value,partnerId:$('cinePartner').value,end:$('cineCompositionEnd').value})],'Composition applied to this shot.');
 for(const key of ['cineBend','cineHoldStart','cineHoldEnd','cineRollFrom','cineRollTo','cineEase','cineMove','cineSeek'])$(key).oninput=()=>cinePathPreview().catch(cineError);
 $('cineSavePath').onclick=()=>cineCommit([cineShotOp('setShotPath',cinePathInput())],'Camera path saved. Song timing is unchanged.');
 $('cineHoldShot').onclick=()=>cineCommit([cineShotOp('holdShot',{time:Number($('deskSeek').value)-deskRow().start+deskRow().localStart})],'Camera held for this shot. Character animation and music continue.');
 $('cineHoldPath').onclick=()=>cineCommit([cineShotOp('holdShot',{time:Number($('cineSeek').value)-deskRow().start+deskRow().localStart})],'Camera held for this shot. Character animation and music continue.');
 $('cinePreviewShot').onclick=()=>{$('deskPlayShot').click();};
 $('cineDepthPiece').onchange=cineDepthLoad;
 $('cineDepthMode').onchange=cineDepthModeFields;
 $('cineSaveDepthMode').onclick=()=>cineCommit([{op:'setDepth',sceneId:deskRow().sceneId,mode:$('cineDepthMode').value}],'Scene depth behavior saved.');
 $('cineDepthContact').onchange=cineDepthPieceFields;
 $('cineSaveDepth').onclick=()=>cineCommit([{op:'setDepth',sceneId:deskRow().sceneId,pieceId:$('cineDepthPiece').value,contact:$('cineDepthContact').value,...($('cineDepthValue').disabled?{}:{value:filmNum('cineDepthValue')})}],'Piece depth behavior saved.');
 $('cineResetDepth').onclick=()=>cineCommit([{op:'setDepth',sceneId:deskRow().sceneId,pieceId:$('cineDepthPiece').value,value:null}],'Piece follows its layer’s depth.');
 $('cineSaveLayers').onclick=()=>cineCommit([{op:'setDepth',sceneId:deskRow().sceneId,layers:Object.fromEntries(['back','middle','foreground'].map(k=>[k,filmNum('cineLayer'+k)])),background:filmNum('cineBackgroundDepth')}],'Scenery depth saved for this scene.');
 $('cineAddForeground').onclick=()=>cineCommit([{op:'addForeground',sceneId:deskRow().sceneId,kind:$('cineForegroundArt').value}],'Foreground scenery added. Move or resize it on the board.');
 $('cineSaveReveal').onclick=()=>cineCommit([{op:'setForegroundReveal',sceneId:deskRow().sceneId,reveal:$('cineRevealKind').value==='none'?null:{kind:$('cineRevealKind').value,duration:filmNum('cineRevealDuration'),direction:$('cineRevealDirection').value}}],'Foreground transition saved across the scene boundary.');
 $('cinePreviewReveal').onclick=()=>{const r=storyTimeline().find(r=>r.scene.id===deskRow().sceneId),duration=cineCurrentScene().cinema?.foregroundReveal?.duration||1.2,fps=state.exportFps||60;const start=Math.max(0,r.start-duration),end=Math.min(storyTimeline().at(-1).end,r.start+duration);$('studioDesk').close();$('directorPreviewLoop').checked=true;directorOpenPreview({firstFrame:Math.floor(start*fps),endFrame:Math.ceil(end*fps),start,end,duration:end-start,mode:'marked'});};
 $('cineCutCue').onclick=()=>{const cue=cineCueList()[Number($('cineMusicCue').value)];if(cue)cineCut(cue.time);};
 $('cineCutPlayhead').onclick=()=>cineCut(Number($('deskSeek').value));
 for(const key of ['cineLook','cineLookStrength','cineGlow','cineGrain','cineVignette','cineAspect'])$(key).oninput=()=>cineFinishPreview().catch(cineError);
 $('cineFinishPreset').onchange=()=>{const f=CINE_FINISH_PRESETS[$('cineFinishPreset').value];if(f){cineFinishFields(f);cineFinishPreview().catch(cineError);}};
 $('cineApplyFinish').onclick=()=>cineCommit([{op:'setFilmFinish',finish:cineFinishValue()}],'Finishing applied across the whole film.');
 $('cineClearFinish').onclick=()=>cineCommit([{op:'setFilmFinish',finish:copy(CINE_FINISH_DEFAULT)}],'Whole-film finishing reset. Scene-specific looks are kept.');
 $('cineUseSavedLook').onclick=()=>{const q=cineSavedLooks()[Number($('cineSavedLook').value)];if(q){cineFinishFields(q.finish);cineFinishPreview().catch(cineError);}};
 $('cineSaveLook').onclick=async()=>{const name=$('cineLookName').value.trim(),finish=cineFinishValue();if(await cineCommit([{op:'saveFilmLook',name,finish}],'Look saved in this story.')){try{localStorage.setItem('felt-cinematic-looks',JSON.stringify(cineSavedLooks()));deskMessage('Look saved in this story and available for other films in this browser.');}catch{deskMessage('Look saved in this story. Browser storage could not keep a separate reusable copy.');}cineFinishLoad();}};
}
