const fs=require('fs'),assert=require('assert');
const h=require('./app-harness.cjs'),{context,run,el,click}=h;
const response=file=>({ok:true,json:async()=>JSON.parse(fs.readFileSync('public/examples/'+file))});
const tick=()=>new Promise(setImmediate);
(async()=>{await h.ready;click('welcomeStart');let workers=0;context.Worker=class{constructor(){workers++;throw Error('Prepared examples must not generate speech')}};
 context.fetch=async url=>response(url.split('/').pop());const original=run('snapshot()');
 const loading=run("FeltExamples.open('speaking')");assert(el('talkExample').disabled);assert(el('exampleDialog').open);await loading;
 assert(!el('talkExample').disabled);assert(!el('exampleDialog').open);assert.equal(workers,0);assert.equal(run('Object.keys(state.audioAssets).length'),4);assert.equal(run('items().filter(o=>o.type==="puppet").length'),4);run('validateProject(JSON.parse(snapshot()))');
 run('undo()');await tick();assert.equal(run('snapshot()'),original);
 // Network failure can retry, and no half-loaded project replaces current work.
 context.fetch=async()=>{throw Error('Offline test')};await run("FeltExamples.open('speaking')");assert.equal(run('snapshot()'),original);assert(!el('exampleRetry').hidden);assert(el('exampleStatus').textContent.includes('Offline'));context.fetch=async url=>response(url.split('/').pop());await el('exampleRetry').onclick();assert(!el('exampleDialog').open);
 const saved=run('snapshot()');let fetchResolve;context.fetch=()=>new Promise(resolve=>{fetchResolve=resolve});const cancelling=run("FeltExamples.open('wardrobe')");click('exampleCancel');await cancelling;assert.equal(run('snapshot()'),saved);assert(!el('talkExample').disabled);assert(!run('directorAgentBusy'));fetchResolve(response('acting-wardrobe.felt.json'));await tick();assert.equal(run('snapshot()'),saved);
 // Cancellation during artwork waits is immediate and cannot commit later.
 context.fetch=async url=>response(url.split('/').pop());run('globalThis.originalArtwork=directorPrepareArtwork;directorPrepareArtwork=()=>new Promise(resolve=>globalThis.finishArtwork=resolve)');const late=run("FeltExamples.open('wardrobe')");await tick();assert(el('exampleStatus').textContent.includes('artwork'));el('exampleDialog').dispatchEvent({type:'cancel'});await late;run('finishArtwork(new Map());directorPrepareArtwork=originalArtwork');await tick();assert.equal(run('snapshot()'),saved);
 // A project edited while preparing remains authoritative.
 context.fetch=()=>new Promise(resolve=>{fetchResolve=resolve});const conflict=run("FeltExamples.open('speaking')");run('state.title="Newer user edit"');fetchResolve(response('speaking-cast.felt.json'));await conflict;assert.equal(run('state.title'),'Newer user edit');assert(el('exampleStatus').textContent.includes('newer edits'));click('exampleCancel');
 context.fetch=async url=>response(url.split('/').pop());await run("FeltExamples.open('wardrobe')");assert.equal(workers,0);run('validateProject(JSON.parse(snapshot()))');
 const actorId=run('cinemaActor().id');el('wardrobePreset').value='musician';el('wardrobePreset').dispatchEvent({type:'change'});assert.equal(run('cinemaActor().wardrobe.neck'),'bowtie');const costumed=run('snapshot()');click('wardrobeReset');assert.equal(run('cinemaActor().wardrobe'),undefined);run('undo()');await tick();assert.equal(run('snapshot()'),costumed);
 // Public director operations preserve/validate the same wardrobe data atomically.
 context.actorId=actorId;await run("FeltDirector.applyActions({expectedRevision:FeltDirector.revision(),operations:[{op:'setWardrobe',sceneId:scene().id,actorId,wardrobe:{hat:'crown',color:'#83609b',accent:'#e3b849'}}]})");const good=run('snapshot()');await assert.rejects(run("FeltDirector.applyActions({expectedRevision:FeltDirector.revision(),operations:[{op:'setWardrobe',sceneId:scene().id,actorId,wardrobe:{hat:'made-up'}}]})"));assert.equal(run('snapshot()'),good);
 run('validateProject(directorImportPlan(directorExportPlan(state)))');run('selected=[actorId]');await run('duplicate()');run('validateProject(JSON.parse(snapshot()))');assert.equal(run('chosen()[0].wardrobe.hat'),'crown');
 // Exercise each new pose, wardrobe slot, head motion and direct frame sampling.
 context.sample=JSON.parse(fs.readFileSync('public/examples/acting-wardrobe.felt.json'));
 run('state=sample;globalThis.sheet=makeCanvas(1840,1500);globalThis.sg=sheet.getContext("2d");sg.fillStyle="#eee8dc";sg.fillRect(0,0,1840,1500)');
 const poses=['standing','shrugging','thinking','presenting','handsOnHips','startled','dancing'];
 for(let row=0;row<3;row++)for(let col=0;col<4;col++){context.col=col;context.row=row;context.pose=poses[(row*4+col)%poses.length];run('(()=>{const o=copy(state.scenes[0].items.filter(o=>o.type==="puppet")[col]);o.acting={pose,expression:"happy",phase:.6,performance:{headAngle:row===2?12:0,headX:0,headY:0},blink:false};sg.save();sg.translate(col*460,row*500);cinemaDrawPuppet(sg,o);sg.restore()})()')}
 fs.mkdirSync('.sites-runtime/checks',{recursive:true});fs.writeFileSync('.sites-runtime/checks/wardrobe-poses.png',run('sheet.toBuffer("image/png")'));
 run('globalThis.c30=makeCanvas(960,540);globalThis.c60=makeCanvas(960,540)');for(const time of [1.2,7.2,13.5,16]){context.time=time;run('paintVideoFrame(c30.getContext("2d"),state,storyTimeline(state,30),Math.round(time*30),30);paintVideoFrame(c60.getContext("2d"),state,storyTimeline(state,60),Math.round(time*60),60)');assert.equal(run('c30.toDataURL()'),run('c60.toDataURL()'))}
 fs.writeFileSync('.sites-runtime/checks/wardrobe-scene.png',run('c60.toBuffer("image/png")'));
 // Continuing a scene keeps the wardrobe and freezes the dancing joints.
 run('state.active=0;state.scenes[0].items[0].acting.pose="dancing";globalThis.beforeFreeze=cinemaPuppetGeometry({...state.scenes[0].items[0],acting:cinemaActingAt(state.scenes[0].items[0],16,state.scenes[0])},16);storyContinueScene(state,state.scenes[0].id,16);validateProject(state)');
 assert.equal(run('scene().items[0].wardrobe.hat'),'cap');for(const k of ['left','right','leftBend','rightBend','ll','rl'])assert.equal(run('cinemaPuppetGeometry(scene().items[0],0).'+k),run('beforeFreeze.'+k));
 // A stalled artwork request is bounded, releases its script, and permits retry.
 const oldAppend=context.document.head.appendChild,oldTimer=context.setTimeout;let expire,script;context.document.head.appendChild=s=>{script=s};context.setTimeout=fn=>{expire=fn;return 999999};
 const timeoutRequest=run('loadArtScript("timeout-test.js")');const timedOut=assert.rejects(timeoutRequest,/timed out/);expire();await timedOut;assert.equal(script.onload,null);context.document.head.appendChild=oldAppend;context.setTimeout=oldTimer;
 assert.deepStrictEqual(h.errors,[]);console.log('PASS: prepared speech without synthesis, cancel/network retry/artwork cancellation, revision conflict, UI presets/remove/Undo, wardrobe API validation/copy/save, rendered poses, identical 30/60fps sampling.');process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
