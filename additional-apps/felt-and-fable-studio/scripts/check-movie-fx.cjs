'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const {context,run,ready,click,el,errors}=require('./app-harness.cjs');
const change=(id,value)=>{el(id).value=String(value);el(id).dispatchEvent({type:'change'})};
const out=process.env.MOVIE_FX_QA_DIR||'/workspace/scratch/ce7361a185e7/movie-fx-v165';fs.mkdirSync(out,{recursive:true});
(async()=>{
 await ready;assert.deepEqual(errors,[]);click('welcomeStart');
 run(`state=directorImportPlan({format:'felt-director-plan',version:1,title:'Cinematic test',scenes:[{id:'s',name:'Scene',bg:68,bgColor:'#68735d',duration:8,items:[{id:'maya',asset:'cinema-maya',x:540,y:570,w:320},{id:'leo',asset:'cinema-leo',x:1040,y:580,w:320}]}]});selected=['maya'];refresh()`);
 await run('ensureStoryArtwork(state)');run('cinemaOpenPanel("shots")');
 assert.equal(el('movieFXEditor').parentElement.id,'movieCameraHost');assert(!el('movieFXEditor').hidden);assert.equal(el('movieFXPreset').value,'push');
 const prior=run('snapshot()');click('movieFXSave');assert.equal(run('movieClips(scene()).length'),1);assert.equal(run('scene().camera?.keys?.length||0'),0);
 const clipId=run('movieFXClipId');change('movieFXDuration',4);change('movieFXStrength',.75);click('movieFXSave');assert.equal(run('movieClips(scene())[0].id'),clipId);assert.equal(run('movieClips(scene())[0].duration'),4);assert.equal(run('movieClips(scene()).length'),1);
 assert(run('cameraAt(scene(),4).zoom>cameraAt(scene(),0).zoom'));assert.equal(run('cameraAt(scene(),4).zoom'),run('cameraAt(scene(),6).zoom'));
 click('movieFXNew');change('movieFXStart',2);const beforeFailed=run('snapshot()');click('movieFXSave');assert.equal(run('snapshot()'),beforeFailed);assert.match(el('movieFXStatus').textContent,/overlap/);
 run('movieFXSelect(movieClips(scene())[0])');click('movieFXDelete');assert.equal(run('movieClips(scene()).length'),0);run('undo()');await new Promise(setImmediate);assert.equal(run('movieClips(scene()).length'),1);
 // Focus pulls work between actors on the same depth layer, including at held end.
 run('cinemaConfig().clips=[];movieFXClipId=null;cinemaOpenPanel("shots")');change('movieFXKind','focus');click('movieFXSave');assert.equal(run('movieClips(scene())[0].kind'),'focus');
 assert.equal(run('directorFocusBlur(scene(),scene().items[0],1,0)'),0);assert(run('directorFocusBlur(scene(),scene().items[1],1,0)>0'));
 assert.equal(run('directorFocusBlur(scene(),scene().items[1],1,5)'),0);assert(run('directorFocusBlur(scene(),scene().items[0],1,5)>0'));
 const mid=run('directorFocusBlur(scene(),scene().items[0],1,1.5)');assert(mid>0&&mid<7);assert.equal(run('directorFocusBlur(scene(),{type:"text"},1,1.5)'),0);
 // Board placement, overlapping lights and source/piece anchoring.
 run('cinemaOpenPanel("lighting")');click('movieFXPickStart');run('movieFXPlace([600,300])');assert.equal(el('movieFXX').value,'600');assert.equal(el('movieFXEndX').value,'600');assert.equal(run('movieFXPicking'),null);click('movieFXSave');
 click('movieFXNew');change('movieFXStart',0);change('movieFXPreset','beam');change('movieFXTarget','maya');change('movieFXAnchor','rightHand');click('movieFXSave');assert.equal(run('movieClips(scene()).filter(c=>c.kind==="light").length'),2);
 const saved=run('snapshot()');run('validateProject(JSON.parse(snapshot()))');assert.equal(run('snapshot()'),saved);
 click('copyScene');assert(run('movieClips(scene()).every(c=>!c.targetId||scene().items.some(o=>o.id===c.targetId))'));assert(run('movieClips(scene()).find(c=>c.kind==="focus").fromTargetId===scene().items[0].id'));run('validateProject(state)');
 // Deleting a target removes focus/shadow references and freezes local effects.
 run('selected=[scene().items[0].id];remove();validateProject(state)');assert.equal(run('movieClips(scene()).filter(c=>c.kind==="focus").length'),0);assert(run('movieClips(scene()).filter(c=>c.kind==="light").every(c=>!c.targetId)'));
 run('state=JSON.parse('+JSON.stringify(saved)+');refresh()');
 // Color look copy and reset preserve all other scene content.
 run('cinemaOpenPanel("look")');change('movieFXPreset','moon');change('movieFXStrength',.6);click('movieFXApplySceneLook');assert.equal(run('scene().cinema.grade.preset'),'moon');click('copyScene');run('cinemaOpenPanel("look")');change('movieFXPreset','warm');click('movieFXCopyLook');assert(run('state.scenes.every(s=>s.cinema.grade.preset==="warm")'));click('movieFXClearGrade');assert.equal(run('scene().cinema.grade'),undefined);
 // Render every preset through the same engine used by MP4 export.
 run('state=JSON.parse('+JSON.stringify(saved)+');state.scenes[0].cinema={};globalThis.qa=makeCanvas(960,540)');
 const all=run('Object.entries(MOVIE_FX_PRESETS).flatMap(([kind,list])=>list.map(([preset,label])=>({kind,preset,label})))');
 for(const [i,{kind,preset}]of Array.from(all).entries()){
  context.testKind=kind;context.testPreset=preset;
  run(`scene().cinema.clips=[movieNewClip(testKind,testPreset,0)];globalThis.c=movieClips(scene())[0];c.duration=4;c.fadeIn=0;c.fadeOut=0;c.from={x:700,y:450,zoom:1.6};c.targetId=['focus','shadow'].includes(c.kind)||c.preset==='follow'?'leo':null;c.fromTargetId=c.kind==='focus'?'maya':null;c.x=700;c.y=450;c.endX=1000;c.endY=400;if(c.kind==='particle'){c.radius=180;c.color=c.preset==='steam'?'#eee6d7':'#edbe6a'}if(c.kind==='light'&&['beam','window'].includes(c.preset)){c.radius=750;c.x=250;c.endX=350;c.y=c.endY=150;c.angle=c.endAngle=30}validateProject(state);globalThis.beforeRender=snapshot();qa.getContext('2d').clearRect(0,0,960,540);paintVideoFrame(qa.getContext('2d'),state,storyTimeline(state,60),90,60)`);
  const png=run('qa.toBuffer("image/png")');assert(png.length>20000,kind+'/'+preset+' empty');fs.writeFileSync(path.join(out,kind+'-'+preset+'.png'),png);
  run('paintVideoFrame(qa.getContext("2d"),state,storyTimeline(state,30),45,30)');assert(png.equals(run('qa.toBuffer("image/png")')),kind+'/'+preset+' frame-rate mismatch');
  run('paintVideoFrame(qa.getContext("2d"),state,storyTimeline(state,60),230,60);paintVideoFrame(qa.getContext("2d"),state,storyTimeline(state,60),90,60)');assert(png.equals(run('qa.toBuffer("image/png")')),kind+'/'+preset+' seek mismatch');assert.equal(run('snapshot()'),run('beforeRender'));
 }
 // Camera clip yields to shot cuts; timing follows shot resize / reorder.
 run(`scene().cinema={shots:[{id:'a',name:'A',duration:4,from:{x:800,y:450,zoom:1},to:{x:800,y:450,zoom:1},move:false},{id:'b',name:'B',duration:4,from:{x:1000,y:450,zoom:2},to:{x:1000,y:450,zoom:2},move:false}],clips:[{...movieNewClip('camera','push',0),duration:3}]};`);
 assert.equal(run('cameraAt(scene(),4).zoom'),2);run(`cinemaConfig().clips=[{...movieNewClip('light','spot',5),duration:1}];directorResizeShot(scene(),'a',6,true)`);assert.equal(run('movieClips(scene())[0].start'),7);run(`directorReorderShot(scene(),'b',-1,true)`);assert.equal(run('movieClips(scene())[0].start'),1);run('validateProject(state)');
 // Agent edit is revision checked, saves full clips and rejects invalid edits atomically.
 const rev=run('directorRevision()'),clips=run('copy(movieClips(scene()))');context.newClips=clips;
 await run(`FeltDirector.applyActions({expectedRevision:${JSON.stringify(rev)},operations:[{op:'setCinematicClips',sceneId:'s',clips:newClips}]})`);
 assert.equal(run('FeltDirector.summary().scenes[0].cinematicClips.length'),1);const atomic=run('snapshot()');
 await assert.rejects(run(`FeltDirector.applyActions({expectedRevision:directorRevision(),operations:[{op:'setCinematicClips',sceneId:'s',clips:[{...newClips[0],targetId:'missing'}]}]})`),/existing piece/);assert.equal(run('snapshot()'),atomic);
 // Busy state, existing offstage rendering, and authoring remain independent.
 run('cinemaOpenPanel("effects");animRun={raf:0,nodes:[]};movieFXTick()');assert(el('movieFXSave').disabled);run('stopAnimationPreview()');assert(!el('movieFXSave').disabled);
 run('offstageEnabled=true;draw()');assert.deepEqual(errors,[]);
 // The shipped example is opened with its real File action, then rendered at 1080p.
 await el('movieFXExample').onclick();assert.equal(run('state.scenes.length'),3);assert.equal(run('storyTimeline().at(-1).end'),18);run('validateProject(state)');
 run('globalThis.fullHD=makeCanvas(1920,1080)');
 for(const second of [3,9,15]){run('paintVideoFrame(fullHD.getContext("2d"),state,storyTimeline(state,60),'+second*60+',60)');fs.writeFileSync(path.join(out,'example-'+second+'.png'),run('fullHD.toBuffer("image/png")'))}
 run('cinemaOpenPanel("lighting");movieFXPick(false);cinemaClosePanel()');assert.equal(run('movieFXPicking'),null);
 assert.deepEqual(errors,[]);
 console.log('Cinematic clips passed: all '+all.length+' presets, real UI edits, placement, focus, lights, save/load, Undo, copy/delete, shot timing, agent transactions, deterministic 30/60 fps export.');
})().catch(e=>{console.error(e);process.exit(1)});
