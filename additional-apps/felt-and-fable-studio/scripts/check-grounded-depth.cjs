const assert=require('assert'),fs=require('fs'),h=require('./app-harness.cjs');
const {run,context,el}=h;
(async()=>{
 await h.ready;h.click('welcomeStart');assert.deepEqual(h.errors,[]);
 run(`state=audioDefaults({format:'felt-and-fable',version:1,title:'Ground contact',active:0,imports:{},custom:[],audioAssets:{song:{name:'Timing check',data:'data:audio/mpeg;base64,AAAA',duration:8}},music:{assetId:'song',volume:.7,loop:false,duck:false,fade:0},phraseShow:{version:1,enabled:true,timing:{version:1,assetId:'song',sceneIds:['stage'],starts:[0],end:8}},scenes:[{id:'stage',name:'Standing still',bg:-1,bgColor:'#517465',caption:'Feet stay on the floor.',duration:3,phrase:{id:'p',section:'Verse',direction:'Hold',holdAt:1},items:[{id:'actor',name:'Standing subject',type:'shape',shape:'rect',x:650,y:470,w:240,h:330,bw:240,bh:330,rotation:0,color:'#e6bd80',depthFactor:.65},{id:'leaves',name:'Near scenery',type:'shape',shape:'ellipse',x:1300,y:200,w:220,h:220,bw:220,bh:220,rotation:0,color:'#255333',depth:'foreground',depthFactor:1.6}],cinema:{liveCamera:true,backgroundDepth:.35,depthLayers:{back:.4,middle:.7,foreground:1.6},shots:[{id:'push',name:'Push and tilt',duration:8,from:{x:800,y:450,zoom:1},to:{x:900,y:470,zoom:2,roll:8},move:true,easing:'cinematic',path:{bend:70,holdStart:.1,holdEnd:.1}}]}}]});validateProject(state);refresh();`);
 const timing=run('JSON.stringify(state.phraseShow.timing)'),shots=run('JSON.stringify(scene().cinema.shots)');
 const apply=async operations=>{context.ops=operations;return run('FeltCinematography.apply({expectedRevision:directorRevision(),operations:ops})');};
 // Compare both soles with the exact points painted under them, through the
 // renderer's actual canvas matrices. Include pan, zoom, a curve and camera roll.
 // Sample the same live camera clock used by the frame renderer while the
 // authored character pose is held at one second.
 const stableDrift=()=>run(`(()=>{const s=scene(),o=s.items[0],canvas=makeCanvas(W,H),g=canvas.getContext('2d');let largest=0;for(let i=0;i<=80;i++){const t=i/10;cineClock={sceneId:s.id,time:t};const c=cameraAt(s,t),p=cinemaVisualPose(o,Math.min(t,1),s,o);g.resetTransform();applyCameraTransform(g,c);cineBackgroundTransform(g,s,t);const m=g.getTransform();for(const side of [-.35,.35]){const x=o.x+o.w*side,y=o.y+o.h/2,foot=cameraWorldToScreen([p.x+p.w*side,p.y+p.h/2],c);largest=Math.max(largest,Math.hypot(foot[0]-(m.a*x+m.c*y+m.e),foot[1]-(m.b*x+m.d*y+m.f)));}}cineClock=null;return largest;})()`);
 const groundedError=stableDrift();console.log('Ground contact error in board pixels:',groundedError);assert(groundedError<.01,'Default grounded scene must keep both soles fixed to their floor points');
 assert(run(`cineGroundContact({type:'puppet',depth:'back',depthFactor:.2},scene())`),'Acting characters stay grounded even in the back layer');
 assert(run(`cineDepthValue(scene().items[1],scene())===1.6`),'Foreground parallax is retained');
 await apply([{op:'setDepth',sceneId:'stage',mode:'floating'}]);assert(stableDrift()>20,'Floating mode must preserve the intentional independent floor movement');
 assert.equal(run('scene().cinema.backgroundDepth'),.35);assert.equal(run('scene().items[0].depthFactor'),.65);
 await apply([{op:'setDepth',sceneId:'stage',mode:'grounded'}]);assert(stableDrift()<.01);
 await apply([{op:'setDepth',sceneId:'stage',pieceId:'actor',contact:'free',value:.45}]);assert(stableDrift()>20,'Flying pieces can opt into independent depth');
 await apply([{op:'setDepth',sceneId:'stage',pieceId:'actor',contact:'ground'}]);assert(stableDrift()<.01);assert.equal(run('scene().items[0].depthFactor'),.45,'Contact changes retain the saved floating depth');
 assert.equal(run('JSON.stringify(state.phraseShow.timing)'),timing);assert.equal(run('JSON.stringify(scene().cinema.shots)'),shots);
 assert.equal(run('storyTimeline(state,60).at(-1).end'),8);assert.equal(run('classroomHold(scene(),state)'),8);
 const before=run('snapshot()');await assert.rejects(()=>apply([{op:'setDepth',sceneId:'stage',mode:'bad'}]),/Grounded set/);assert.equal(run('snapshot()'),before);
 await assert.rejects(()=>apply([{op:'setDepth',sceneId:'stage',pieceId:'actor',contact:'bad'}]),/piece/);assert.equal(run('snapshot()'),before);
 run('validateProject(JSON.parse(snapshot()));validateProject(directorImportPlan(deskCompactPlan()));');
 const key=run('JSON.stringify(renderDependencies(state,storyTimeline(),storyTimeline()[0]))');await apply([{op:'setDepth',sceneId:'stage',mode:'floating'}]);assert.notEqual(run('JSON.stringify(renderDependencies(state,storyTimeline(),storyTimeline()[0]))'),key);
 await apply([{op:'setDepth',sceneId:'stage',mode:'grounded'}]);
 await el('openStudioDesk').onclick();h.click('deskTabCinema');assert.equal(el('cineDepthMode').value,'grounded');assert(el('cineBackgroundDepth').disabled);
 el('cineDepthPiece').value='actor';el('cineDepthPiece').onchange();assert(el('cineDepthValue').disabled);
 el('cineDepthContact').value='free';el('cineDepthContact').onchange();assert(!el('cineDepthValue').disabled);await el('cineSaveDepth').onclick();assert.equal(run('scene().items[0].depthContact'),'free');
 el('cineDepthMode').value='floating';el('cineDepthMode').onchange();assert(!el('cineBackgroundDepth').disabled);await el('cineSaveDepthMode').onclick();assert.equal(run('scene().cinema.depthMode'),'floating');
 el('cineDepthMode').value='grounded';await el('cineSaveDepthMode').onclick();el('cineDepthContact').value='auto';await el('cineSaveDepth').onclick();assert.equal(run('scene().items[0].depthContact'),undefined);assert(el('cineDepthValue').disabled);
 h.click('deskClose');assert.deepEqual(h.errors,[]);
 console.log('PASS: both soles match their floor points through pan/zoom/curve/roll; floating and foreground depth retained; per-piece override and UI save; cue/camera invariance; story/plan roundtrip; classroom duration; export cache; invalid changes roll back.');
})().catch(e=>{console.error(e);process.exitCode=1});
