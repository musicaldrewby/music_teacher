'use strict';
let studioReady=false,studioMotionId=null,studioLightId=null,studioCueId=null,studioUISignature='';
function studioMotion(){return cinemaSelected()?.choreography?.find(c=>c.id===studioMotionId)}
function studioLight(){return state.director?.lighting?.find(c=>c.id===studioLightId)}
function studioCue(){return state.director?.musicCues?.find(c=>c.id===studioCueId)}
function studioEdit(fn){directorChange(fn);studioUISignature='';studioSync()}
function studioSync(){
 if(!studioReady)return;const s=scene(),o=cinemaSelected(),row=cinemaCurrentShot(),busy=!!(exportJob||animRun||storyPlayback||presenting||directorAgentBusy);
 directorValue('studioConnection',row?.shot.connection||'cut');directorValue('studioShotDissolve',row?.shot.dissolve||.6);$('studioShotDissolveLabel').hidden=row?.shot.connection!=='dissolve';directorValue('studioLookAhead',row?.shot.follow?.lookAhead||0);$('studioLookAhead').disabled=!row?.shot.follow||busy;
 $('studioMovingDissolve').checked=!!s.cinema?.transition?.moving;$('studioMovingLabel').hidden=s.cinema?.transition?.kind!=='dissolve';
 $('studioChoreoHint').textContent=o?'Editing '+o.name+' · '+(o.choreography?.length||0)+' action clips':'Select a character or attached scarf on the board.';$('studioMotionAdd').disabled=!o||o.locked||busy;
 for(const id of ['studioFrameApply','studioReveal','studioReaction'])$(id).disabled=!selected.length||!row||busy;
 if(o&&!o.choreography?.some(c=>c.id===studioMotionId))studioMotionId=studioClip(o,animTime)?.id||o.choreography?.[0]?.id||null;
 const c=studioMotion();$('studioMotionFields').hidden=!c;
 if(c){directorValue('studioMotionPreset',c.preset);for(const [id,key]of [['Start','start'],['Duration','duration'],['RadiusX','radiusX'],['RadiusY','radiusY'],['Turns','turns'],['Lag','lag'],['OffsetX','offsetX'],['OffsetY','offsetY'],['GripX','gripX'],['GripY','gripY'],['TipX','tipX'],['TipY','tipY']])directorValue(id==='Start'||id==='Duration'?'studioMotion'+id:'studio'+id,c[key]);for(const [id,key]of [['Clockwise','clockwise'],['AutoDepth','autoDepth'],['Hold','hold']])$('studio'+id).checked=c[key];$('studioTargetNames').textContent=c.targetIds.map((v,i)=>(i+1)+'. '+(s.items.find(q=>q.id===v)?.name||'Missing partner')).join(' → ')||'No partner (Freeze needs none).';$('studioScarfPoints').hidden=c.preset!=='scarf'}
 directorSelectOptions('studioMotionTarget',[['','Choose a partner'],...s.items.filter(q=>q!==o&&!q.hidden&&!q.attachment).map(q=>[q.id,q.name])],$('studioMotionTarget').value);
 for(const el of $('studioMotionFields').querySelectorAll('input,select,button'))el.disabled=busy||!!o?.locked;
 const l=studioLight();$('studioLightFields').hidden=!l;if(l)for(const [id,key]of [['Start','start'],['Duration','duration'],['From','from'],['To','to'],['Strength','strength']])directorValue('studioLight'+id,l[key]);
 const cue=studioCue();$('studioCueFields').hidden=!cue;if(cue)for(const [id,key]of [['Name','label'],['Time','time'],['Duration','duration'],['Effect','effect'],['Strength','strength']])directorValue('studioCue'+id,cue[key]);
 const signature=JSON.stringify([s.id,o?.id,o?.choreography,state.director?.lighting,state.director?.musicCues,studioMotionId,studioLightId,studioCueId]);if(signature===studioUISignature)return;studioUISignature=signature;
 for(const [host,clips,active,label,select]of [
 ['studioMotionList',o?.choreography||[],studioMotionId,c=>STUDIO_MOTIONS[c.preset]+' · '+c.start.toFixed(1)+'s / '+c.duration.toFixed(1)+'s',c=>{studioMotionId=c.id;seekAnimation(c.start)}],
 ['studioLightList',state.director?.lighting||[],studioLightId,c=>c.from+' → '+c.to+' · '+avTime(c.start),c=>studioLightId=c.id],
 ['studioCueList',state.director?.musicCues||[],studioCueId,c=>c.label+' · '+avTime(c.time),c=>studioCueId=c.id]]){const list=$(host);list.replaceChildren();for(const clip of clips)list.append(cinemaButton(label(clip),()=>{select(clip);studioUISignature='';studioSync()},clip.id===active))}
}
function studioInit(){
 studioReady=true;
 $('studioOpenChoreo').onclick=()=>{cinemaOpenPanel('shots');$('studioChoreoPanel').open=true;$('studioChoreoPanel').scrollIntoView({block:'nearest'})};
 $('studioExample').onclick=async()=>{if(exportJob)return;if(dirty&&!confirm('Open the cinematic workshop example? A recovery copy of your story is kept in this browser.'))return;try{await FeltRecovery.flush();if(!window.FELT_STUDIO_EXAMPLE)await loadArtScript('examples/cinematic-workshop.js');const p=validateProject(copy(window.FELT_STUDIO_EXAMPLE)),imported=await directorPrepareArtwork(p);checkpoint();for(const [key,im]of imported)imageMap.set(key,im);state=p;FeltRecovery.newDocument();FeltRecovery.changed();selected=[];resetAnimationTime();rasterCache.clear();setStudioWorkspace('build');refresh();cinemaOpenPanel('shots');toast('Cinematic workshop ready. Play the scene or preview the whole story in Export.')}catch(e){toast('Could not open the example: '+e.message)}};

 $('studioFrameApply').onclick=()=>{const row=cinemaCurrentShot();if(!row)return;studioEdit(()=>{const frame=studioFrame(scene(),selected,$('studioFrameSize').value,row.start,row.end,$('studioIncludeProps').checked);row.shot[cinemaShotEnd?'to':'from']=frame;if(!row.shot.move)row.shot.to=copy(frame);if(!cinemaShotEnd&&row.shot.connection==='continue')row.shot.connection='cut'})};
 $('studioConnection').onchange=e=>studioEdit(()=>{const row=cinemaCurrentShot();if(row)row.shot.connection=e.target.value});
 $('studioShotDissolve').onchange=e=>studioEdit(()=>{const row=cinemaCurrentShot();if(row)row.shot.dissolve=Number(e.target.value)});
 $('studioLookAhead').onchange=e=>studioEdit(()=>{const row=cinemaCurrentShot();if(row?.shot.follow)row.shot.follow.lookAhead=Number(e.target.value)});
 $('studioMovingDissolve').onchange=e=>studioEdit(()=>{if(scene().cinema?.transition)scene().cinema.transition.moving=e.target.checked});
 for(const [id,kind]of [['studioReveal','reveal'],['studioReaction','reaction']])$(id).onclick=()=>studioEdit(()=>studioShotTrick(scene(),cinemaCurrentShot(),kind,selected));
 $('studioMotionAdd').onclick=()=>{const o=cinemaSelected();if(!o||o.locked)return;studioEdit(()=>{const preset=$('studioMotionPreset').value,target=$('studioMotionTarget').value||items().find(q=>q!==o&&!q.attachment&&!q.hidden)?.id;const c=studioNewMotion(preset,animTime,preset==='freeze'?[]:target?[target]:[]);if(preset==='follow'&&target){const q=poseAt(items().find(o=>o.id===target),animTime);c.offsetX=o.x-q.x;c.offsetY=o.y-q.y}o.choreography??=[];o.choreography.push(c);studioMotionId=c.id})};
 $('studioMotionPreset').onchange=e=>{const c=studioMotion();if(c)studioEdit(()=>c.preset=e.target.value)};
 for(const [id,key]of [['studioMotionStart','start'],['studioMotionDuration','duration'],['studioRadiusX','radiusX'],['studioRadiusY','radiusY'],['studioTurns','turns'],['studioLag','lag'],['studioOffsetX','offsetX'],['studioOffsetY','offsetY'],['studioGripX','gripX'],['studioGripY','gripY'],['studioTipX','tipX'],['studioTipY','tipY']])$(id).onchange=e=>{const c=studioMotion();if(c)studioEdit(()=>c[key]=Number(e.target.value))};
 for(const [id,key]of [['studioClockwise','clockwise'],['studioAutoDepth','autoDepth'],['studioHold','hold']])$(id).onchange=e=>{const c=studioMotion();if(c)studioEdit(()=>c[key]=e.target.checked)};
 $('studioTargetAdd').onclick=()=>{const c=studioMotion(),target=$('studioMotionTarget').value;if(c&&target)studioEdit(()=>c.targetIds.push(target))};$('studioTargetClear').onclick=()=>{const c=studioMotion();if(c){if(c.preset!=='freeze'&&c.targetIds.length<2)return toast('Choose a partner, then use Replace partner.');studioEdit(()=>c.targetIds.pop())}};
 // Choosing a new partner replaces the existing first target; Add partner builds a route.
 $('studioTargetReplace').onclick=()=>{const c=studioMotion(),target=$('studioMotionTarget').value;if(c&&target)studioEdit(()=>c.targetIds=[target])};
 $('studioMotionPreview').onclick=()=>{const c=studioMotion();if(c)seekAnimation(c.start)};
 $('studioMotionDelete').onclick=()=>{const o=cinemaSelected();if(o)studioEdit(()=>{o.choreography=(o.choreography||[]).filter(c=>c.id!==studioMotionId);studioMotionId=null})};
 $('studioMotionCopy').onclick=()=>{const o=cinemaSelected(),c=studioMotion();if(o&&c)studioEdit(()=>{const next={...copy(c),id:id(),start:c.start+c.duration};o.choreography.push(next);studioMotionId=next.id})};
 $('studioLightAdd').onclick=()=>studioEdit(()=>{const c={id:id(),start:directorAbsoluteTime(),duration:14,from:'moonlight',to:'sunrise',strength:1};directorConfig().lighting??=[];directorConfig().lighting.push(c);studioLightId=c.id});
 for(const [id,key]of [['Start','start'],['Duration','duration'],['From','from'],['To','to'],['Strength','strength']])$('studioLight'+id).onchange=e=>{const c=studioLight();if(c)studioEdit(()=>c[key]=['from','to'].includes(key)?e.target.value:Number(e.target.value))};
 $('studioLightDelete').onclick=()=>studioEdit(()=>directorConfig().lighting=(state.director.lighting||[]).filter(c=>c.id!==studioLightId));
 $('studioCueAdd').onclick=()=>studioEdit(()=>{const c={id:id(),label:'Music cue',time:directorAbsoluteTime(),duration:1,effect:'none',strength:.6};directorConfig().musicCues??=[];directorConfig().musicCues.push(c);studioCueId=c.id});
 for(const [id,key]of [['Name','label'],['Time','time'],['Duration','duration'],['Effect','effect'],['Strength','strength']])$('studioCue'+id).onchange=e=>{const c=studioCue();if(c)studioEdit(()=>c[key]=['label','effect'].includes(key)?e.target.value:Number(e.target.value))};
 $('studioCueDelete').onclick=()=>studioEdit(()=>directorConfig().musicCues=(state.director.musicCues||[]).filter(c=>c.id!==studioCueId));
 $('studioCueSeek').onclick=()=>{const c=studioCue();if(!c)return;const row=storyTimeline().find(r=>c.time>=r.start&&c.time<r.end);if(row){switchScene(row.index);seekAnimation(c.time-row.start)}else toast('This cue is beyond the current movie length.')};
 try{$('studioCacheEnabled').checked=localStorage.getItem('felt-render-cache')!=='off'}catch{}$('studioCacheEnabled').onchange=e=>{try{localStorage.setItem('felt-render-cache',e.target.checked?'on':'off')}catch{}};$('studioCacheClear').onclick=async()=>{if(exportJob)return;await FeltRenderCache.clear();$('studioCacheStatus').textContent='Render cache cleared.'};
 FeltRenderCache.status().then(message=>$('studioCacheStatus').textContent=message);studioSync();
}
window.FeltStudio={init:studioInit,sync:studioSync};
Object.assign(FeltDirector,{cinematicTools:{version:1,motionPresets:STUDIO_MOTIONS,operations:['frameShot','shotTrick','setChoreography','setLightingTrack','setMusicCues'],timing:'Scene seconds for actions and shots; movie seconds for lighting and locked cues.'}});
