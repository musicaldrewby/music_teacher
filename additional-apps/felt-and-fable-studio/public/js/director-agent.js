'use strict';
let directorAgentBusy=false;
function directorRevision(p=state){const s=JSON.stringify(p);let a=2166136261,b=5381;for(let i=0;i<s.length;i++){a=Math.imul(a^s.charCodeAt(i),16777619);b=Math.imul(b,33)^s.charCodeAt(i)}return(a>>>0).toString(16)+(b>>>0).toString(16)}
function directorSummary(){return{title:state.title,revision:directorRevision(),storyTools:copy(FeltDirector.storyTools||null),performanceLibrary:reuseLibrary().map(reuseSummary),cinematicTools:copy(FeltDirector.cinematicTools||null),lighting:copy(state.director?.lighting||[]),musicCues:copy(state.director?.musicCues||[]),duration:storyTimeline().at(-1).end,activeSceneId:scene().id,voices:copy(TALK_VOICES),naturalVoices:copy(TALK_NATURAL_VOICES),scenes:storyTimeline().map(r=>({id:r.scene.id,name:r.scene.name,backdrop:'bg'+r.scene.bg,start:r.start,duration:r.duration,shots:copy(r.scene.cinema?.shots||[]),reusablePerformances:(r.scene.reusablePerformances||[]).map(c=>({id:c.id,name:c.template.name,templateId:c.template.id,start:c.start,duration:c.duration,hold:c.hold,bindings:copy(c.bindings)})),cinematicClips:copy(movieClips(r.scene)),colorLook:copy(r.scene.cinema?.grade||null),pieces:r.scene.items.map(o=>({id:o.id,name:o.name,type:o.type,asset:o.asset,x:o.x,y:o.y,w:o.w,h:o.h,voice:o.type==='puppet'?talkVoice(o):undefined,acting:copy(o.acting||null),wardrobe:copy(o.wardrobe||null),conversation:copy(o.conversation||null),performance:copy(o.performance||null),propActions:copy(o.propActions||[]),choreography:copy(o.choreography||[]),attachment:copy(o.attachment||null),storyProp:copy(o.storyProp||null),lines:(o.dialogueLines||[]).map(l=>({...copy(l),start:r.scene.cues.find(c=>c.id===l.cueId)?.start,duration:r.scene.cues.find(c=>c.id===l.cueId)?.duration}))}))})),characterMotion:FeltRig.summary(),staging:FeltCraft.summary(),production:FeltProduction.summary(),checks:directorQuality(state)}}
function directorAssertEditable(expectedRevision){if(directorAgentBusy||exportJob||animRun||storyPlayback||presenting)throw Error('Stop playback or wait for the current operation first.');if(expectedRevision!==directorRevision())throw Error('The story changed. Read its current revision and try again.');}
function directorAbort(signal){if(signal?.aborted)throw signal.reason||new DOMException('Cancelled','AbortError')}
function directorAwait(promise,signal){if(!signal)return promise;directorAbort(signal);return new Promise((resolve,reject)=>{const abort=()=>reject(signal.reason||new DOMException('Cancelled','AbortError'));signal.addEventListener('abort',abort,{once:true});Promise.resolve(promise).then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort))})}
async function directorPrepareArtwork(p,options={}){
 const imported=new Map();await Promise.all(Object.entries(p.imports||{}).map(async([key,src])=>{if(artById.has(key))throw Error('Use a unique ID for imported artwork: '+key);let im=imageMap.get(key);if(im?.feltImportData!==src){im=new Image();im.src=src;await im.decode();im.feltImportData=src}imported.set(key,im)}));
 const ids=new Set();for(const s of p.scenes)for(const key of sceneAssetIds(s))if(!imported.has(key))ids.add(key);await ensureIds(ids,(done,total)=>{if(!options.signal?.aborted)options.onProgress?.({stage:"artwork",done,total})});return imported;
}
async function directorTransaction(expectedRevision,prepare,options={}){
 directorAssertEditable(expectedRevision);const original=state,before=snapshot();directorAgentBusy=true;window.FeltTalkUI?.sync();
 try{directorAbort(options.signal);const p=await directorAwait(prepare(copy(state)),options.signal);directorAbort(options.signal);productionSyncBindings(p);validateProject(p);options.onProgress?.({stage:"artwork",done:0,total:0});const imported=await directorAwait(directorPrepareArtwork(p,options),options.signal);if(options.newDocument)await directorAwait(FeltRecovery.flush(),options.signal);directorAbort(options.signal);if(state!==original||snapshot()!==before)throw Error('The story changed while this operation was preparing. Your newer edits were kept.');
  checkpoint();for(const [key,im]of imported)imageMap.set(key,im);state=p;talkStopPreview();if(options.newDocument)FeltRecovery.newDocument();FeltRecovery.changed();selected=selected.filter(id=>items().some(o=>o.id===id));animTime=Math.min(animTime,sceneSeconds(scene()));rasterCache.clear();cinemaUISignature='';refresh();if($('directorStoryboard').open)directorRenderStoryboard();return directorSummary();
 }finally{directorAgentBusy=false;window.FeltTalkUI?.sync();window.FeltStoryTools?.sync()}
}
async function directorPreparePlan(plan){const p=directorImportPlan(plan);let count=0;
 for(const s of p.scenes){if(s.script===undefined)continue;if(!Array.isArray(s.script)||s.script.length>100)throw Error('Use up to 100 script lines per scene.');for(const line of s.script){if(++count>150)throw Error('Generate up to 150 script lines in one plan.');await talkAddToProject(p,s,line.actorId,{...line,bubble:line.bubble??false})}delete s.script;}
 return validateProject(p);
}
async function directorApplyPlan(input){if(!input?.plan)throw Error('Provide a Director Plan.');return directorTransaction(input.expectedRevision,()=>directorPreparePlan(input.plan),{newDocument:true})}
async function directorApplyActions(input){if(!Array.isArray(input?.operations)||!input.operations.length||input.operations.length>100)throw Error('Provide 1–100 operations.');
 return directorTransaction(input.expectedRevision,async p=>{
  for(const op of input.operations){if(!op||typeof op.op!=='string')throw Error('Invalid operation.');const s=p.scenes.find(s=>s.id===op.sceneId);
   if(op.op==='upsertScene'){if(!op.scene?.id)throw Error('A scene ID is required.');const partial=await directorPreparePlan({format:'felt-director-plan',version:1,scenes:[op.scene],audioAssets:p.audioAssets,imports:p.imports});p.audioAssets=partial.audioAssets;const next=partial.scenes[0],index=p.scenes.findIndex(s=>s.id===next.id);if(index<0)p.scenes.push(next);else p.scenes[index]=next;continue;}
   if(op.op==='setLightingTrack'){directorConfig(p).lighting=copy(op.clips);continue;}
   if(op.op==='setMusicCues'){directorConfig(p).musicCues=copy(op.cues);continue;}
   if(op.op==='setProject'){if(op.title!==undefined)p.title=String(op.title).slice(0,200);if(op.director!==undefined)p.director=copy(op.director);continue;}
   if(op.op==='setFilmBrief'){deskOperation(p,op);continue;}
   if(cineOperation(p,op))continue;
   if(!s)throw Error('Unknown scene: '+op.sceneId);
   if(op.op==='upsertPiece'){if(!op.piece?.id)throw Error('A piece ID is required.');const o=directorPlanPiece(op.piece),index=s.items.findIndex(x=>x.id===o.id);if(index<0)s.items.push(o);else s.items[index]=o;}
   else if(op.op==='setChoreography'){const o=s.items.find(o=>o.id===op.pieceId);if(!o||o.locked)throw Error('Choose an unlocked piece.');o.choreography=op.clips.map(c=>({...studioNewMotion(c.preset,c.start,c.targetIds),...copy(c)}));}
   else if(op.op==='frameShot'){const rows=cinemaRows(s),r=rows.find(r=>r.shot.id===op.shotId);if(!r)throw Error('Unknown shot.');delete r.shot.cameraSegment;delete r.shot.lockCamera;const frame=studioFrame(s,op.pieceIds,op.size||'full',r.start,r.end,op.includeProps!==false);r.shot[op.end?'to':'from']=frame;if(!r.shot.move)r.shot.to=copy(frame);if(!op.end&&r.shot.connection==='continue')r.shot.connection='cut';}
   else if(op.op==='shotTrick'){studioShotTrick(s,cinemaRows(s).find(r=>r.shot.id===op.shotId),op.kind,op.pieceIds);}
   else if(op.op==='setShots'){s.cinema??={};s.cinema.shots=copy(op.shots);}
   else if(op.op==='setCinematicClips'){s.cinema??={};s.cinema.clips=copy(op.clips);}
   else if(op.op==='setColorLook'){s.cinema??={};if(op.look===null)delete s.cinema.grade;else s.cinema.grade=copy(op.look);}
   else if(op.op==='savePerformance'){reuseCapture(p,s,op);}
   else if(op.op==='applyPerformance'){reuseApply(p,s,op);}
   else if(op.op==='removePerformance'){reuseRemove(s,op.clipId);}
   else if(op.op==='setWardrobe'){const o=talkFind(s,op.actorId);if(op.wardrobe===null)delete o.wardrobe;else o.wardrobe=copy(op.wardrobe);}
   else if(op.op==='setConversation'){const o=talkFind(s,op.actorId);if(op.conversation===null)delete o.conversation;else o.conversation=copy(op.conversation);}
   else if(op.op==='setActing'){talkFind(s,op.actorId).acting=copy(op.acting);}
   else if(op.op==='setPerformance'){talkFind(s,op.actorId).performance=copy(op.performance);}
   else if(op.op==='setPropActions'){const prop=s.items.find(o=>o.id===op.propId);if(!prop||prop.locked||prop.type==='puppet')throw Error('Choose an unlocked prop.');prop.propActions=copy(op.actions);}
   else if(op.op==='setVoice'){talkFind(s,op.actorId).voice=talkValidateVoice(copy(op.voice));}
   else if(op.op==='saveScriptLine'){await storySaveLine(p,s,op);}
   else if(op.op==='moveScriptLine'){storyMoveLine(p,s,op.lineId,op.delta);}
   else if(op.op==='continueScene'){storyContinueScene(p,s.id,op.time??'end');}
   else if(op.op==='cameraRecipe'){storyApplyCamera(p,s,op);}
   else if(op.op==='setPropState'){const o=s.items.find(o=>o.id===op.propId);if(!o)throw Error('Choose a prop.');storySetProp(o,op);}
   else if(op.op==='addDialogue'){await talkAddToProject(p,s,op.actorId,op);}
   else if(op.op==='regenerateDialogue'){await talkRegenerateCharacter(p,s,op.actorId,op.voice);}
   else if(op.op==='removeDialogue'){storyRemoveLine(p,s,op.actorId,op.lineId);}
   else if(!deskOperation(p,op))throw Error('Unknown operation: '+op.op);
  }talkPruneProject(p);return p;
 });
}
async function directorRenderFrame(input={}){const time=Number(input.time??0),width=Number(input.width??640),total=storyTimeline().at(-1).end;if(!Number.isFinite(time)||time<0||time>=total||!Number.isInteger(width)||width<160||width>1920)throw Error('Choose a movie time within the story and a width of 160–1920 pixels.');const p=copy(state),imported=await directorPrepareArtwork(p),previous=new Map([...imported.keys()].map(k=>[k,imageMap.get(k)])),c=makeCanvas(width,Math.round(width*9/16));try{for(const [k,im]of imported)imageMap.set(k,im);rasterCache.clear();paintVideoFrame(c.getContext('2d'),p,storyTimeline(p,60),Math.floor(time*60),60);return{time,width,height:c.height,dataUrl:c.toDataURL('image/png')};}finally{for(const [k,im]of previous)if(im)imageMap.set(k,im);else imageMap.delete(k);rasterCache.clear()}}
function directorAgentInit(){
 Object.assign(FeltDirector,{summary:directorSummary,revision:directorRevision,applyPlan:directorApplyPlan,applyActions:directorApplyActions,preparePlan:directorPreparePlan,renderFrame:directorRenderFrame});
 const registry=document.modelContext;if(typeof registry?.registerTool!=='function')return;const lifecycle=new AbortController();
 const defs=[
  ['felt_read_production_desk','Read private film brief, shot notes, staging rectangles, planned routes and character pose rates. See docs/private-production.md for editable operations.',{type:'object',properties:{},additionalProperties:false},()=>FeltStudioDesk.summary(),true],
  ['felt_read_staging','Read ropes, contact pins, partial masks, illustrated reactions, event links and linkable events.',{type:'object',properties:{},additionalProperties:false},()=>({revision:directorRevision(),...FeltCraft.summary(),events:FeltCraft.targets()}),true],
  ['felt_read_film','Read the full-film timeline, music markers, story actions, narrator clips and review notes.',{type:'object',properties:{},additionalProperties:false},()=>FeltProduction.summary(),true],
  ['felt_edit_film','Atomically edit film markers, cue bindings, scene duration, illustrated poses, story actions, gravity ropes, contact pins, partial masks, linked events, reactions, Foley, narrator profile or individual narrator clips. See docs/film-production.md and docs/staging-effects.md for operation fields.',{type:'object',properties:{expectedRevision:{type:'string'},operations:{type:'array',minItems:1,maxItems:100,items:{type:'object'}}},required:['expectedRevision','operations'],additionalProperties:false},input=>FeltProduction.apply(input),false],
  ['felt_read_story','Read scene IDs, characters, dialogue timing, quality checks and the revision required for edits.',{type:'object',properties:{},additionalProperties:false},()=>directorSummary(),true],
  ['felt_find_artwork','Find existing backdrops, props and acting characters by name or theme.',{type:'object',properties:{query:{type:'string',maxLength:100}},required:['query'],additionalProperties:false},input=>{if(typeof input?.query!=='string'||input.query.length>100)throw Error('Enter a short search.');const q=input.query.toLowerCase();return FeltDirector.assets().filter(a=>(a.name+' '+(a.themes||[]).join(' ')).toLowerCase().includes(q)).slice(0,80)},true],
  ['felt_apply_story_plan','Replace the board with a validated Director Plan. Script lines generate saved speech. One Undo restores the prior story.',{type:'object',properties:{expectedRevision:{type:'string'},plan:{type:'object'}},required:['expectedRevision','plan'],additionalProperties:false},directorApplyPlan,false],
  ['felt_edit_story','Apply a batch of scene, piece, acting, voice or dialogue edits atomically. Requires the revision from felt_read_story.',{type:'object',properties:{expectedRevision:{type:'string'},operations:{type:'array',minItems:1,maxItems:100,items:{type:'object'}}},required:['expectedRevision','operations'],additionalProperties:false},directorApplyActions,false],
  ['felt_render_story_frame','Render a frame using the same engine as movie export. Returns a PNG data URL.',{type:'object',properties:{time:{type:'number',minimum:0},width:{type:'integer',minimum:160,maximum:1920}},required:['time'],additionalProperties:false},directorRenderFrame,true]
 ];
 for(const [name,description,inputSchema,execute,readOnlyHint]of defs)try{Promise.resolve(registry.registerTool({name,description,inputSchema,annotations:{readOnlyHint},execute:async input=>({content:[{type:'text',text:JSON.stringify(await execute(input))}]})},{signal:lifecycle.signal})).catch(()=>{})}catch{}
 window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
