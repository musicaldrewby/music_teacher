const assert=require('assert'),fs=require('fs'),h=require('./app-harness.cjs');
const {run,context,el}=h;
(async()=>{
 await h.ready;h.click('welcomeStart');assert.deepEqual(h.errors,[]);
 run(`state=audioDefaults({format:'felt-and-fable',version:1,title:'Cinematic checks',active:0,imports:{},custom:[],audioAssets:{song:{name:'song.mp3',data:'data:audio/mpeg;base64,AAAA',duration:14}},music:{assetId:'song',volume:.7,loop:false,duck:false,fade:0},phraseShow:{version:1,enabled:true,timing:{version:1,assetId:'song',sceneIds:['a','b'],starts:[0,6],end:12}},scenes:['a','b'].map((id,i)=>({id,name:'Scene '+id,caption:'The cat sees the fish.',duration:3,bg:-1,bgColor:i?'#88552e':'#326559',camera:{x:800,y:450,zoom:1},items:[{id:'box',type:'shape',shape:'rect',name:'Blue subject',x:500,y:450,w:240,h:330,bw:240,bh:330,rotation:0,color:'#a8d5e5',fiber:0,stitch:false},{id:'detail',type:'shape',shape:'ellipse',name:'Gold detail',x:1100,y:500,w:150,h:150,bw:150,bh:150,rotation:0,color:'#e8b777',fiber:0,stitch:false}],phrase:{id:'phrase-'+id,section:'Verse',direction:'Sing',holdAt:1}}))});validateProject(state);refresh();`);
 const apply=async operations=>{context.ops=operations;return run('FeltCinematography.apply({expectedRevision:directorRevision(),operations:ops})');};
 const timing=run('JSON.stringify(state.phraseShow.timing)'),timeline=run('JSON.stringify(storyTimeline().map(r=>[r.start,r.end]))');
 await apply([{op:'editShot',sceneId:'a',from:{x:500,y:450,zoom:2},to:{x:1100,y:450,zoom:2},move:true}]);
 const shot=run('scene().cinema.shots[0].id');
 await apply([{op:'setShotPath',sceneId:'a',shotId:shot,path:{bend:90,holdStart:.1,holdEnd:.2},fromRoll:-6,toRoll:6,move:true,easing:'cinematic'}]);
 assert.equal(run('JSON.stringify(state.phraseShow.timing)'),timing);assert.equal(run('JSON.stringify(storyTimeline().map(r=>[r.start,r.end]))'),timeline);
 assert.equal(run('scene().phrase.holdAt'),1);assert.equal(run('scene().cinema.shots[0].duration'),6);
 run(`globalThis.row=cinemaRows(scene())[0];globalThis.mid=studioCameraForRow(scene(),row,2.7);`);assert(Math.abs(run('mid.y')-540)<.001);
 assert.equal(run('JSON.stringify(studioCameraForRow(scene(),row,0))'),run('JSON.stringify(studioCameraForRow(scene(),row,.5))'));
 assert.equal(run('JSON.stringify(studioCameraForRow(scene(),row,5))'),run('JSON.stringify(studioCameraForRow(scene(),row,6))'));
 for(const roll of [-20,-6,0,17,20]){context.roll=roll;assert(run(`(()=>{const c=cameraClamp({x:0,y:900,zoom:1,roll}),point=[623.4,399.1],q=cameraScreenToWorld(cameraWorldToScreen(point,c),c);return Math.hypot(q[0]-point[0],q[1]-point[1])<1e-8&&[[0,0],[1600,0],[1600,900],[0,900]].every(p=>{const q=cameraScreenToWorld(p,c);return q[0]>=-1e-6&&q[0]<=1600+1e-6&&q[1]>=-1e-6&&q[1]<=900+1e-6})})()`));}
 const samples=run('JSON.stringify(Array.from({length:61},(_,i)=>studioCameraForRow(scene(),cinemaRows(scene())[0],i/10)))');
 await apply([{op:'splitShot',sceneId:'a',shotId:shot,time:2.7}]);context.samples=JSON.parse(samples);
 assert(run(`Array.from({length:61},(_,i)=>{const t=i/10,rows=cinemaRows(scene()),r=rows.find(r=>t<r.end)||rows.at(-1),q=studioCameraForRow(scene(),r,t,rows);return ['x','y','zoom','roll'].every(k=>Math.abs(q[k]-samples[i][k])<1e-6)}).every(Boolean)`));
 // Camera continues across a held animation; export and direct playback share the frame.
 const frame=(t,finish)=>{context.t=t;return run(`(()=>{const c=makeCanvas(640,360);paintVideoFrame(c.getContext('2d'),state,storyTimeline(state,60),Math.round(t*60),60);return c.toDataURL()})()`)};
 assert.notEqual(frame(1.5),frame(4));const order=frame(4);frame(.2);frame(7);assert.equal(frame(4),order);
 const original=run('drawSceneBase');context.originalDraw=original;run(`globalThis.sampledTime=-1;drawSceneBase=(...a)=>{sampledTime=a[4];return originalDraw(...a)};`);frame(4);assert.equal(run('sampledTime'),1);run('drawSceneBase=originalDraw');
 assert.equal(run('classroomHold(scene(),state)'),6);assert.equal(run('storyTimeline(classroomClipProject(state,60),60)[0].frames'),361);
 await apply([{op:'setDepth',sceneId:'a',pieceId:'box',value:.4},{op:'setDepth',sceneId:'a',mode:'floating',background:0,layers:{back:.2,middle:1,foreground:1.6}}]);
 assert(run(`(()=>{const prior=studioCameraOverride;studioCameraOverride={sceneId:'a',pose:cameraClamp({x:1000,y:450,zoom:2})};try{const q=cineDepthPose(scene().items[0],scene(),0,scene().items[0]);return Math.abs(q.w-168)<1e-8&&Math.abs(q.x-710)<1e-8}finally{studioCameraOverride=prior}})()`));
 await apply([{op:'composeShot',sceneId:'a',shotId:shot,kind:'two',subjectId:'box',partnerId:'detail',end:'whole'}]);assert.equal(run('scene().cinema.shots[0].move'),false);
 const before=run('snapshot()');await assert.rejects(()=>apply([{op:'setShotPath',sceneId:'a',shotId:shot,path:{bend:0,holdStart:.7,holdEnd:.7},fromRoll:0,toRoll:0,move:true,easing:'smooth'}]),/Leave at least/);assert.equal(run('snapshot()'),before);
 await apply([{op:'setFilmFinish',finish:{look:'warm',strength:.4,glow:.2,grain:.3,vignette:.3,aspect:'2.39'}}]);
 const finished=frame(2);frame(4);assert.equal(frame(2),finished);
 const p=JSON.parse(run('snapshot()'));context.saved=p;run('validateProject(saved);validateProject(directorImportPlan(deskCompactPlan()));');
 assert.equal(run('JSON.stringify(state.phraseShow.timing)'),timing);assert.equal(run('JSON.stringify(storyTimeline().map(r=>[r.start,r.end]))'),timeline);
 const key=run('JSON.stringify(renderDependencies(state,storyTimeline(),storyTimeline()[0]))');
 await apply([{op:'setForegroundReveal',sceneId:'b',reveal:{kind:'branches',duration:1.2,direction:'left'}}]);assert.notEqual(run('JSON.stringify(renderDependencies(state,storyTimeline(),storyTimeline()[0]))'),key);
 assert.equal(run('cineRevealAt(state.scenes[1],0,state).cover'),1);assert.equal(run('cineRevealAt(state.scenes[0],6,state).cover'),1);
 assert(run(`(()=>{const c=makeCanvas(320,180),g=c.getContext('2d');g.fillStyle='#ff0000';g.fillRect(0,0,320,180);cineDrawReveal(g,320,180,{kind:'branches',cover:1,direction:'left'});const d=g.getImageData(0,0,320,180).data;for(let i=0;i<d.length;i+=4)if(d[i]===255&&d[i+1]===0)return false;return true})()`));
 await apply([{op:'holdShot',sceneId:'a',shotId:shot,time:1}]);assert(run('scene().cinema.shots[0].lockCamera'));
 assert(run(`(()=>{const s=scene(),c=movieNewClip('camera','pan',0,s);c.strength=1;c.endX=1200;s.cinema.clips=[c];try{const base=cameraBaseAt(s,1);return JSON.stringify(movieCameraAt(s,1,base))===JSON.stringify(base)}finally{delete s.cinema.clips}})()`));
 // Split moving-subject tracking and a continued camera without changing the sampled path.
 assert(run(`(()=>{const p=copy(state);delete p.phraseShow.timing;const s=p.scenes[0];s.duration=6;s.cinema.shots=[{id:'track',name:'Track',duration:6,from:{x:600,y:450,zoom:2},to:{x:950,y:450,zoom:2},move:true,easing:'smooth',path:{bend:60,holdStart:.1,holdEnd:.1},follow:{targetId:'box',strength:.4,smoothing:.2,lookAhead:.3}}];const oldProject=directorRenderProject,oldPose=studioPoseAt;directorRenderProject=p;studioPoseAt=(o,t,...args)=>({...oldPose(o,t,...args),...(o.id==='box'?{x:600+t*35}:{})});try{const before=Array.from({length:61},(_,i)=>cameraBaseAt(s,i/10));deskOperation(p,{op:'splitShot',sceneId:s.id,shotId:'track',time:2.4});return before.every((a,i)=>{const b=cameraBaseAt(s,i/10);return Math.hypot(a.x-b.x,a.y-b.y)<1e-7})}finally{directorRenderProject=oldProject;studioPoseAt=oldPose}})()`));
 assert(run(`(()=>{const p=copy(state);delete p.phraseShow.timing;const s=p.scenes[0];s.duration=6;s.cinema.shots=[{id:'one',name:'One',duration:2,from:{x:500,y:450,zoom:2},to:{x:650,y:450,zoom:2},move:true,easing:'linear'},{id:'two',name:'Two',duration:4,from:{x:900,y:450,zoom:2},to:{x:1000,y:450,zoom:2},move:true,easing:'cinematic',connection:'continue',path:{bend:50,holdStart:0,holdEnd:.1}}];const before=Array.from({length:61},(_,i)=>cameraBaseAt(s,i/10));deskOperation(p,{op:'splitShot',sceneId:s.id,shotId:'two',time:3.5});return before.every((a,i)=>{const b=cameraBaseAt(s,i/10);return Math.hypot(a.x-b.x,a.y-b.y)<1e-7})})()`));
 await el('openStudioDesk').onclick();h.click('deskTabCinema');await new Promise(setImmediate);assert(!el('deskCinemaPanel').hidden);assert.equal(el('cineGallery').children.length,6);
 el('cineSubject').value='box';el('cinePartner').value='detail';await run('cineGallery()');assert(el('cineGallery').children.every(b=>!b.disabled));
 h.click('deskTabFinish');el('cineFinishPreset').value='storybook';el('cineFinishPreset').onchange();await run('cineFinishPreview()');assert(!el('deskFinishPanel').hidden);
 el('cineLookName').value='Music room';await el('cineSaveLook').onclick();assert.equal(run('cineSavedLooks()[0].name'),'Music room');assert.equal(run('state.savedFilmLooks.length'),1);
 // Explicit clean finish matches the ungraded native frame, without leaking canvas state.
 run(`state.filmFinish=copy(CINE_FINISH_DEFAULT);`);const clean=frame(2);run('delete state.filmFinish');assert.equal(frame(2),clean);
 fs.mkdirSync('.sites-runtime/checks',{recursive:true});const png=el('cineFinishAfter').toBuffer('image/png');fs.writeFileSync('.sites-runtime/checks/cinematic-finish.png',png);
 h.click('deskClose');assert.deepEqual(h.errors,[]);
 console.log('PASS: recorded-cue invariance, held animation with live camera, exact curved-path splits, pause/easing/roll and inverse transforms, depth/parallax, composition, invalid-edit rollback, deterministic finish and seek parity, foreground concealment, render-cache dependencies, story/plan roundtrip, classroom camera duration, preview and saved-look controls.');
})().catch(e=>{console.error(e);process.exitCode=1});
