'use strict';
let movieFXReady=false,movieFXSceneId=null,movieFXTab=null,movieFXClipId=null,movieFXKind='camera',movieFXLoaded='',movieFXListSignature='',movieFXPicking=null,movieFXBusy=false,movieFXDirty=false;
const MOVIE_FX_PAGES={shots:['camera','focus'],lighting:['light'],look:['look'],effects:['particle','shadow']};
const MOVIE_FX_HOSTS={shots:'movieCameraHost',lighting:'movieLightingHost',look:'movieLookHost',effects:'movieEffectsHost'};
const MOVIE_FX_FIELDS={start:'Start',duration:'Duration',strength:'Strength',fadeIn:'FadeIn',fadeOut:'FadeOut',x:'X',y:'Y',endX:'EndX',endY:'EndY',offsetX:'OffsetX',offsetY:'OffsetY',radius:'Radius',softness:'Softness',angle:'Angle',endAngle:'EndAngle',spread:'Spread'};
function movieFXSelected(){return movieClips(scene()).find(c=>c.id===movieFXClipId)}
function movieFXEdit(fn){
 if(cameraBusy()||directorAgentBusy)return false;const before=snapshot();try{fn();validateMovieFX(state);const after=snapshot();state=JSON.parse(before);checkpoint();state=JSON.parse(after);movieFXLoaded='';movieFXListSignature='';refresh();return true}
 catch(e){state=JSON.parse(before);$('movieFXStatus').textContent=e.message;toast(e.message);return false}
}
function movieFXDefaults(kind,preset){
 const c=movieNewClip(kind,preset,Math.min(animTime,7199));c.duration=Math.min(3,7200-c.start);c.from=cameraAt(scene(),c.start);
 const available=scene().items.filter(o=>!o.hidden&&o.type!=='text'&&o.type!=='bubble'),selectedPiece=available.find(o=>selected.includes(o.id));
 if(kind==='focus'){c.fromTargetId=(selectedPiece||available[0])?.id||null;c.targetId=available.find(o=>o.id!==c.fromTargetId)?.id||null;c.strength=.5}
 if(['shadow','particle'].includes(kind)&&selectedPiece)c.targetId=selectedPiece.id;
 if(kind==='shadow'){c.targetId??=available[0]?.id||null;c.anchor='feet';c.radius=180;c.strength=.4}
 if(kind==='camera'){
  if(selectedPiece&&!selectedPiece.attachment&&!selectedPiece.propActions?.length)c.targetId=selectedPiece.id;
  if(c.preset==='follow'){c.targetId??=available.find(o=>!o.attachment&&!o.propActions?.length)?.id||null;if(c.from.zoom===1)c.from={...c.from,zoom:1.7}}
  if(c.preset==='pull'&&c.from.zoom<1.2)c.from={x:800,y:450,zoom:2.2};
  if(c.preset==='pan'){c.from=cameraClamp({x:470,y:450,zoom:1.7});c.endX=1130;c.targetId=null}
  if(c.preset==='rise'){c.from=cameraClamp({x:800,y:620,zoom:1.8});c.endY=280;c.targetId=null}
  if(c.preset==='impact'){c.duration=.7;c.hold=false;c.fadeIn=0;c.fadeOut=.25}
  if(c.preset==='drift'){c.hold=false;c.strength=.35}
 }
 if(kind==='light'&&['beam','window'].includes(c.preset)){c.x=c.endX=450;c.y=c.endY=150;c.angle=c.endAngle=35;c.radius=700;c.color=c.preset==='window'?'#d6e6ff':'#fff1cf'}
 if(kind==='particle'){c.color=c.preset==='embers'?'#efb86c':c.preset==='steam'?'#eae5da':c.preset==='footsteps'||c.preset==='puff'?'#d8b991':'#ffeab6';if(c.preset==='puff'){c.duration=1.2;c.fadeIn=0}if(c.preset==='footsteps')c.anchor='feet'}
 return c;
}
function movieFXPopulate(c){
 movieFXKind=c.kind;directorSelectOptions('movieFXKind',MOVIE_FX_PAGES[cinemaTab].map(k=>[k,MOVIE_FX_LABELS[k]]),c.kind);directorSelectOptions('movieFXPreset',MOVIE_FX_PRESETS[c.kind],c.preset);
 for(const [key,suffix]of Object.entries(MOVIE_FX_FIELDS))$('movieFX'+suffix).value=c[key];
 for(const [key,suffix]of [['name','Name'],['ease','Ease'],['anchor','Anchor'],['color','Color']])$('movieFX'+suffix).value=c[key]||'';
 $('movieFXEnabled').checked=c.enabled;$('movieFXHold').checked=c.hold;
 movieFXTargets(c.targetId,c.fromTargetId);for(const k of ['x','y','zoom'])$('movieFXCamera'+k[0].toUpperCase()+k.slice(1)).value=c.from[k];
 movieFXDirty=false;movieFXVisibility();
}
function movieFXTargets(target=$('movieFXTarget').value,from=$('movieFXFromTarget').value){
 const list=items().filter(o=>!o.hidden&&o.type!=='text'&&o.type!=='bubble'&&(movieFXKind!=='camera'||(!o.attachment&&!o.propActions?.length))).map(o=>[o.id,o.name]);
 directorSelectOptions('movieFXTarget',[['',movieFXKind==='focus'||movieFXKind==='shadow'?'Choose a piece':'Use board position'],...list],target||'');directorSelectOptions('movieFXFromTarget',[['','Choose a piece'],...list],from||'');
}
function movieFXVisibility(){
 const kind=movieFXKind,preset=$('movieFXPreset').value,local=kind==='light'&&['spot','beam','window','lamp','flicker'].includes(preset),position=['camera','particle','shadow'].includes(kind)||local;
 $('movieFXKindLabel').hidden=MOVIE_FX_PAGES[cinemaTab]?.length===1;$('movieFXFromTargetLabel').hidden=kind!=='focus';
 $('movieFXTargetLabel').hidden=kind==='look'||kind==='light'&&!local||kind==='camera'&&!['push','follow'].includes(preset);
 $('movieFXPlacement').hidden=!position;$('movieFXPositionActions').hidden=!position||kind==='shadow'||kind==='camera'&&!['push','pull','pan','rise'].includes(preset)||!!$('movieFXTarget').value;
 $('movieFXAnchorLabel').hidden=!['light','particle'].includes(kind);$('movieFXOffsets').hidden=!['light','particle','shadow'].includes(kind);
 $('movieFXAppearance').hidden=!['light','particle','shadow'].includes(kind)||kind==='light'&&!local;
 $('movieFXAngles').hidden=kind==='particle';$('movieFXSpreadLabel').hidden=!['beam','window'].includes(preset);
 $('movieFXHoldLabel').hidden=!['camera','focus'].includes(kind)||['impact','drift'].includes(preset);
 $('movieFXFades').hidden=kind==='focus'||kind==='camera'&&!['impact','drift'].includes(preset);$('movieFXCameraStart').hidden=kind!=='camera';$('movieFXWholeLook').hidden=kind!=='look';
 $('movieFXStrengthValue').textContent=Math.round(Number($('movieFXStrength').value)*100)+'%';
 const descriptions={camera:'A single editable move. Ending framing can stay until the next shot cut.',focus:'Shift sharpness between two pieces, even on the same depth layer. Text stays readable.',light:'Lights can overlap. Place them on the board or attach them to a moving piece.',look:'Gentle color treatments preserve the felt texture. Use a timed clip or a scene-wide look.',particle:'Small local effects follow a piece or move between two board positions.',shadow:'A soft stylized ground shadow follows the chosen piece. Fine controls set its offset and angle.'};
 $('movieFXDescription').textContent=descriptions[kind];if(preset==='impact'||preset==='drift')$('movieFXDescription').textContent='Adds restrained motion to your current camera, then returns smoothly.';
 if(preset==='follow')$('movieFXDescription').textContent='Follows movement from the saved starting framing. Frame the character first.';
 $('movieFXFraming').textContent='Saved start: '+Math.round(Number($('movieFXCameraZoom').value)*100)+'% zoom. Change framing here without adding keys.';
}
function movieFXRead(){
 const c=movieNewClip(movieFXKind,$('movieFXPreset').value,0);c.id=movieFXClipId||id();
 for(const [key,suffix]of Object.entries(MOVIE_FX_FIELDS))c[key]=Number($('movieFX'+suffix).value);
 for(const [key,suffix]of [['name','Name'],['ease','Ease'],['anchor','Anchor'],['color','Color']])c[key]=$('movieFX'+suffix).value;
 c.start=frameTime(c.start);c.duration=frameTime(c.duration);c.enabled=$('movieFXEnabled').checked;c.hold=$('movieFXHold').checked;c.targetId=$('movieFXTarget').value||null;c.fromTargetId=movieFXKind==='focus'?$('movieFXFromTarget').value||null:null;
 if(movieFXKind==='camera'&&!['push','follow'].includes(c.preset))c.targetId=null;
 c.from={x:Number($('movieFXCameraX').value),y:Number($('movieFXCameraY').value),zoom:Number($('movieFXCameraZoom').value)};
 return c;
}
function movieFXNew(kind=movieFXKind){movieFXCancelPick();const old=movieFXSelected(),c=movieFXDefaults(kind);if(old){c.start=Math.min(7199,old.start+old.duration);c.duration=Math.min(c.duration,7200-c.start);c.from=cameraAt(scene(),c.start)}movieFXClipId=null;movieFXLoaded='';movieFXPopulate(c);$('movieFXStatus').textContent='Choose settings, then Add clip.';movieFXListSignature='';movieFXSync()}
function movieFXSelect(c){movieFXCancelPick();movieFXClipId=c.id;movieFXLoaded=JSON.stringify(c);movieFXPopulate(c);seekAnimation(c.start);movieFXListSignature='';movieFXSync();$('movieFXStatus').textContent='Editing this clip. Use Update clip to keep your changes.'}
function movieFXSave(){const c=movieFXRead();if(movieFXEdit(()=>{const clips=cinemaConfig().clips??=[];const i=clips.findIndex(x=>x.id===c.id);if(i<0)clips.push(c);else clips[i]=c;})){movieFXClipId=c.id;movieFXLoaded='';movieFXDirty=false;movieFXSync();$('movieFXStatus').textContent='Saved. One clip; every setting remains editable.';return true}return false}
function movieFXSync(){
 if(!movieFXReady)return;const kinds=MOVIE_FX_PAGES[cinemaTab];if(!cinemaOpen||!kinds){$('movieFXEditor').hidden=true;movieFXCancelPick();return}
 const pageChanged=movieFXTab!==cinemaTab,sceneChanged=movieFXSceneId!==scene().id;
 if(pageChanged||sceneChanged){movieFXCancelPick();movieFXTab=cinemaTab;movieFXSceneId=scene().id;movieFXClipId=null;movieFXKind=kinds[0];movieFXLoaded='';movieFXListSignature='';movieFXPopulate(movieFXDefaults(movieFXKind));$('movieFXStatus').textContent=''}
 const host=$(MOVIE_FX_HOSTS[cinemaTab]);if($('movieFXEditor').parentElement!==host)host.append($('movieFXEditor'));$('movieFXEditor').hidden=false;
 const current=movieFXSelected();if(movieFXClipId&&!current){movieFXClipId=null;movieFXLoaded='';movieFXPopulate(movieFXDefaults(movieFXKind))}
 if(current&&JSON.stringify(current)!==movieFXLoaded){movieFXLoaded=JSON.stringify(current);movieFXPopulate(current)}
 movieFXTargets();movieFXVisibility();$('movieFXHeading').textContent=({shots:'Camera & focus',lighting:'Lighting cues',look:'Color looks',effects:'Local effects'})[cinemaTab];
 $('movieFXIntro').textContent='Select a clip to edit it, or choose + New. No generated keyframes.';
 const clips=movieClips(scene()).filter(c=>kinds.includes(c.kind)).slice().sort((a,b)=>a.start-b.start),total=sceneSeconds(scene()),sig=JSON.stringify([clips,movieFXClipId,total]);
 if(sig!==movieFXListSignature){movieFXListSignature=sig;$('movieFXList').replaceChildren();for(const c of clips){const b=cinemaButton('',()=>movieFXSelect(c),c.id===movieFXClipId);b.classList.add('movie-fx-clip');const text=document.createElement('span');text.textContent=(c.enabled?'':'Off · ')+(c.name||MOVIE_FX_PRESETS[c.kind].find(x=>x[0]===c.preset)[1]);const time=document.createElement('small');time.textContent=c.start.toFixed(1)+'–'+(c.start+c.duration).toFixed(1)+' s';const rail=document.createElement('span');rail.className='movie-fx-rail';const bar=document.createElement('i');bar.style.left=c.start/total*100+'%';bar.style.width=c.duration/total*100+'%';rail.append(bar);b.append(text,time,rail);b.title=text.textContent+' · '+time.textContent+' · click to edit';$('movieFXList').append(b)}if(!clips.length)$('movieFXList').textContent='No clips here yet.'}
 const busy=cameraBusy()||directorAgentBusy;for(const el of $('movieFXEditor').querySelectorAll('input,select,button'))el.disabled=busy;
 $('movieFXPreview').disabled=!!(exportJob||storyPlayback||presenting||directorAgentBusy);$('movieFXPreview').textContent=animRun?'Stop preview':'Preview';$('movieFXSave').textContent=current?'Update clip':'Add clip';$('movieFXDelete').disabled=busy||!current;
 const grade=scene().cinema?.grade;$('movieFXGradeStatus').textContent=grade?'Scene look: '+MOVIE_FX_PRESETS.look.find(x=>x[0]===grade.preset)[1]+' · '+Math.round(grade.strength*100)+'%':'No scene-wide color look.';$('movieFXClearGrade').disabled=busy||!grade;
 movieFXBusy=busy;if(busy)movieFXCancelPick();
}
function movieFXTick(){const busy=cameraBusy()||directorAgentBusy;if(busy!==movieFXBusy)movieFXSync()}
function movieFXCancelPick(){if(!movieFXPicking)return;movieFXPicking=null;canvas.style.cursor=tool==='select'?'default':'crosshair';$('movieFXPickStart').textContent='Place on board';$('movieFXPickEnd').textContent='Choose end point';$('status').textContent='Ready'}
function movieFXPick(end=false){if(cameraBusy())return;if(movieFXPicking)return movieFXCancelPick();performanceCancelPick();if(blockPathEditing)endBlockPathEditing();setTool('select');setCameraDragMode(false);movieFXPicking=end?'end':'start';canvas.style.cursor='crosshair';$('movieFXPick'+(end?'End':'Start')).textContent='Cancel placement';$('status').textContent='Click the '+(end?'ending':'starting')+' position on the board · Escape cancels';$('movieFXStatus').textContent='Click on the board, then save the clip. Escape cancels.'}
function movieFXPlace(point){if(!movieFXPicking)return false;const end=movieFXPicking==='end';$('movieFX'+(end?'EndX':'X')).value=Math.round(point[0]);$('movieFX'+(end?'EndY':'Y')).value=Math.round(point[1]);if(!end){$('movieFXEndX').value=Math.round(point[0]);$('movieFXEndY').value=Math.round(point[1])}$('movieFXTarget').value='';movieFXDirty=true;movieFXCancelPick();$('movieFXStatus').textContent='Position chosen. Save the clip to apply it.';return true}
function movieFXInit(){
 movieFXReady=true;$('movieFXExample').onclick=movieFXOpenExample;$('movieFXNew').onclick=()=>movieFXNew();$('movieFXKind').onchange=e=>movieFXNew(e.target.value);
 $('movieFXPreset').onchange=()=>{const c=movieFXRead(),defaults=movieFXDefaults(c.kind,c.preset);for(const k of ['color','anchor','angle','endAngle','radius','hold','fadeIn','fadeOut'])c[k]=defaults[k];if(c.kind==='camera'&&['pan','rise','pull','follow'].includes(c.preset)){c.from=defaults.from;c.endX=defaults.endX;c.endY=defaults.endY}if(c.preset==='impact'||c.preset==='puff')c.duration=defaults.duration;movieFXPopulate(c);movieFXDirty=true};
 $('movieFXTarget').onchange=()=>{movieFXDirty=true;movieFXVisibility()};$('movieFXSave').onclick=movieFXSave;
 $('movieFXDelete').onclick=()=>{const c=movieFXSelected();if(c&&movieFXEdit(()=>cinemaConfig().clips=movieClips(scene()).filter(x=>x.id!==c.id))){movieFXClipId=null;movieFXNew();$('movieFXStatus').textContent='Clip removed. Undo restores it.'}};
 $('movieFXAtPlayhead').onclick=()=>{$('movieFXStart').value=Number(animTime.toFixed(3));movieFXDirty=true};
 $('movieFXPreview').onclick=()=>{if(animRun){stopAnimationPreview();movieFXSync();return}if(!movieFXSelected()||movieFXDirty){if(!movieFXSave())return}const c=movieFXSelected();if(c){movieFXCancelPick();seekAnimation(c.start);playAnimationSlide()}};
 $('movieFXCapture').onclick=()=>{const p=cameraAt(scene(),animTime);for(const k of ['x','y','zoom'])$('movieFXCamera'+k[0].toUpperCase()+k.slice(1)).value=p[k];movieFXDirty=true;movieFXVisibility()};
 $('movieFXPickStart').onclick=()=>movieFXPick(false);$('movieFXPickEnd').onclick=()=>movieFXPick(true);
 const setGrade=all=>{const grade={preset:$('movieFXPreset').value,strength:Number($('movieFXStrength').value)};if(movieFXEdit(()=>{for(const s of all?state.scenes:[scene()]){s.cinema??={};s.cinema.grade=copy(grade)}})){$('movieFXStatus').textContent=all?'Color look applied to all scenes. Timed look clips are kept.':'Color look applied for this entire scene.'}};
 $('movieFXApplySceneLook').onclick=()=>setGrade(false);$('movieFXCopyLook').onclick=()=>setGrade(true);$('movieFXClearGrade').onclick=()=>movieFXEdit(()=>delete cinemaConfig().grade);
 for(const el of $('movieFXEditor').querySelectorAll('input,select')){el.addEventListener('input',()=>{movieFXDirty=true;movieFXVisibility()});el.addEventListener('change',()=>{movieFXDirty=true})}
 canvas.addEventListener('pointerdown',e=>{if(!movieFXPicking||e.button!==0)return;e.preventDefault();e.stopImmediatePropagation();movieFXPlace(pos(e))},true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&movieFXPicking){e.preventDefault();movieFXCancelPick()}},true);
 movieFXSync();
}

async function movieFXOpenExample(){
 if(cameraBusy()||directorAgentBusy)return;
 if(dirty&&!confirm('Open the cinematic techniques example? A recovery copy of your current story is kept in this browser. Download it first if you want a separate backup.'))return;
 try{await FeltRecovery.flush();if(!window.FELT_MOVIE_FX_EXAMPLE)await loadArtScript('examples/cinematic-techniques.js');const p=directorImportPlan(copy(window.FELT_MOVIE_FX_EXAMPLE));await ensureStoryArtwork(p);checkpoint();state=p;FeltRecovery.newDocument();FeltRecovery.changed();selected=[];resetAnimationTime();rasterCache.clear();setStudioWorkspace('build');refresh();cinemaOpenPanel('shots');toast('Cinematic techniques: three editable scenes. Play a scene or preview the whole story in Export.')}catch(e){toast('Could not open the example: '+e.message)}
}
