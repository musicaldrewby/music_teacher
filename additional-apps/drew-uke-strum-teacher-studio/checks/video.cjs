// Deterministic integration checks plus native Canvas rendering, without a browser.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createCanvas,Image,GlobalFonts}=require('@napi-rs/canvas');
GlobalFonts.registerFromPath('/usr/share/fonts/opentype/urw-base35/NimbusSans-Regular.otf','Arial');
GlobalFonts.registerFromPath('/usr/share/fonts/opentype/urw-base35/NimbusSans-Bold.otf','Arial');
const {c,run,el,makeNode,advance,doc,store}=require('./classroom.cjs');
const root=path.resolve(__dirname,'..'),M=require('../dist/video-model.js'),checks=[];
function check(name,fn){fn();checks.push(name);}
const header=makeNode('testHeader'),oldQuery=doc.querySelector.bind(doc),oldAll=doc.querySelectorAll.bind(doc);
const scenes=['title','song','ending'].map(scene=>{const b=makeNode('','button');b.dataset.videoScene=scene;return b;});
doc.querySelector=s=>s==='.beach-header'?header:oldQuery(s);doc.querySelectorAll=s=>s==='[data-video-scene]'?scenes:oldAll(s);
class LocalImage extends Image{set src(value){super.src=value.startsWith('data:')?value:path.join(root,'dist',value);}}
c.Image=LocalImage;c.MediaStream=class{constructor(tracks){this.tracks=tracks;}getTracks(){return this.tracks;}getVideoTracks(){return this.tracks.filter(x=>x.kind==='video');}getAudioTracks(){return this.tracks.filter(x=>x.kind==='audio');}};
const track=kind=>({kind,stopped:false,stop(){this.stopped=true;}});
c.AudioContext.prototype.createMediaStreamDestination=function(){return{stream:new c.MediaStream([track('audio')])};};
let recorderFailure=false;
c.MediaRecorder=class{static isTypeSupported(mime){return mime.startsWith('video/mp4')||mime.startsWith('video/webm');}constructor(stream,options){this.stream=stream;this.mimeType=options.mimeType;this.options=options;this.state='inactive';if(recorderFailure)throw Error('Encoder failed to initialize');}start(){this.state='recording';this.onstart?.();}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob([new Uint8Array(3000)],{type:this.mimeType})});this.onstop?.();}};
for(const name of ['video-model.js','video-island.js','video-renderer.js','practice-sheet.js','video-studio.js'])run(fs.readFileSync(path.join(root,'dist',name),'utf8'));
c.UkeIsland.createCanvas=(w,h)=>createCanvas(w,h);GlobalFonts.registerFromPath(path.join(root,'dist/assets/fonts/Skranji-Bold.ttf'),'UkeIsland');GlobalFonts.registerFromPath(path.join(root,'dist/assets/fonts/DejaVuSans.ttf'),'UkePrint');
run('initVideoStudio()');
const canvas=createCanvas(1920,1080),node=el('videoCanvas');for(const dim of ['width','height'])Object.defineProperty(node,dim,{get:()=>canvas[dim],set:v=>canvas[dim]=v});node.getContext=(...args)=>canvas.getContext(...args);node.captureStream=fps=>{node.requestedFPS=fps;return new c.MediaStream([track('video')]);};
el('videoResult').pause=()=>{};
(async()=>{
 for(const starter of c.UkeStrum.starters){for(const count of [1,2,3,4]){const p=M.plan(starter,{passes:count});assert.equal(p.finish,p.bodyEnd*count+p.scoreEnd-p.bodyEnd);assert.equal(p.countSteps,(starter.meter==='2/4'||starter.meter==='6/8'?4:M.meters[starter.meter].beats)*M.meters[starter.meter].beat);assert.equal(M.position(p.musicStart+p.length*p.stepSeconds-.001,p).pass,1);if(count>1){assert.equal(M.position(p.musicStart+p.length*p.stepSeconds+.001,p).pass,2);assert(M.position(p.musicStart+p.length*p.stepSeconds+.001,p).tick<.01);}assert.equal(M.scene(p.musicEnd+.01,p).name,'outro-wave');assert.equal(M.scene(p.total,p).name,'done');}}
 check('All fourteen songs repeat 1/2/3/4 times, with one count-in and one final ending',()=>assert.equal(c.UkeStrum.starters.length,14));
 check('Custom songs gain a single final chord, including one-play-through exports',()=>{const s={...c.UkeStrum.starters[0],measures:[{chords:[{step:0,chord:'C'}]}]};const p=M.plan(s,{passes:4,countIn:false});assert(p.virtualEnding);assert.equal(p.countSteps,0);assert.equal(p.finish,40);assert.equal(p.scoreEnd,16);});
 check('MP4 negotiation falls back honestly to WebM and rejects unavailable requested formats',()=>{assert.equal(M.format('auto',t=>t.startsWith('video/webm')).extension,'webm');assert.equal(M.format('mp4',()=>false),null);assert.equal(M.options({passes:0}).passes,1);assert.equal(M.options({passes:999}).passes,99);assert.equal(M.options({}).fps,60);assert.equal(M.options({fps:30}).fps,30);});
 run("song=normalizeSong(STARTERS[2]);song.video={composer:'Drew Wichman',performer:'Fifth-grade ukulele club',passes:3};renderAll();");
 await run('openVideoStudio()');
 check('Premium dialogs mount and the composer settings survive JSON normalization',()=>{assert(el('videoModal').open);assert(el('openPracticeSheet'));assert.equal(run('normalizeSong(JSON.parse(JSON.stringify(song))).video.composer'),'Drew Wichman');assert.equal(el('videoPasses').value,3);});
 const images=path.join(require('node:os').tmpdir(),'uke-video-qa');fs.mkdirSync(images,{recursive:true});
 const p=run('UkeVideoModel.plan(song,videoFormRead())');
 for(const[name,t]of [['title',2.5],['wave',p.options.intro+p.wave*.5],['song',p.musicStart+2.1],['ending',p.musicEnd+p.wave+2]]){c.renderTime=t;run('renderVideoAt(renderTime,UkeVideoModel.plan(song,videoFormRead()))');fs.writeFileSync(path.join(images,name+'.png'),canvas.toBuffer('image/png'));}
 const drawnText=[],baseFill=canvas.getContext('2d').fillText.bind(canvas.getContext('2d'));
 canvas.getContext('2d').fillText=(value,...args)=>{drawnText.push(String(value));baseFill(value,...args);};
 const transitionContact=createCanvas(1280,2880),review=transitionContact.getContext('2d');let transitionIndex=0;
 for(const transition of ['wave','fade','page','iris','collage','surf','palms','sand']){
  assert.equal(M.options({transition}).transition,transition);el('videoTransition').value=transition;run('videoSaveOptions()');
  assert.equal(run('normalizeSong(JSON.parse(JSON.stringify(song))).video.transition'),transition);
  const plan=run('UkeVideoModel.plan(song,videoFormRead())');
  for(const phase of ['intro','outro'])for(const q of [0,.25,.5,.75,.999]){
   c.renderTime=(phase==='intro'?plan.options.intro:plan.musicEnd)+q*plan.wave;run('renderVideoAt(renderTime,UkeVideoModel.plan(song,videoFormRead()))');
   assert.equal(canvas.getContext('2d').getImageData(0,0,1,1).data[3],255);
   if(['collage','surf','palms','sand'].includes(transition)&&phase==='intro'&&(q===.25||q===.75))fs.writeFileSync(path.join(images,transition+'-'+q+'.png'),canvas.toBuffer('image/png'));
   if(q===.5){review.drawImage(canvas,phase==='intro'?0:640,transitionIndex*360,640,360);fs.writeFileSync(path.join(images,transition+'-'+phase+'.png'),canvas.toBuffer('image/png'));}
  }
  for(const t of [2.5,plan.musicStart+.3,plan.musicEnd+plan.wave+1.5]){c.renderTime=t;run('renderVideoAt(renderTime,UkeVideoModel.plan(song,videoFormRead()))');}
  transitionIndex++;
 }
 canvas.getContext('2d').fillText=baseFill;
 check('Eight saved transitions render both boundaries without a transparent frame',()=>assert.equal(transitionIndex,8));
 check('Video titles, music, and endings contain no app watermark or promotional slogans',()=>{assert(!drawnText.some(t=>/Mr\. Drew|Made with|STRUM  ·  SING  ·  SHARE|A LITTLE MUSIC\./i.test(t)));assert(drawnText.includes('Composed by Drew Wichman'));});
 fs.writeFileSync(path.join(images,'transitions-review.png'),transitionContact.toBuffer('image/png'));
 const originalFrame=c.UkeVideoRenderer.frame;c.UkeVideoRenderer.frame=()=>{};
 // Record a short 2/4 composition through the production scheduler. Encoding itself is a double.
 run("song=normalizeSong({title:'Video test',meter:'2/4',tempo:200,pattern:'march-2',measures:[{chords:[{step:0,chord:'C'}],lyric:'Hello, ocean!',lyricSpan:1}],band:{enabled:true,ukulele:61,bass:29,drums:23,shaker:17,melody:11}});song.loop=true;activeRange={start:0,end:1,loop:true};renderAll();");
 await run('openVideoStudio()');el('videoPasses').value=4;el('videoIntro').value=3;el('videoOutro').value=3;el('videoComposer').value='Student Composer';el('videoTitle').value='Our class song';
 const before=run('JSON.stringify(song.band)'),events=[];c.events=events;run('const checkStep=scheduleSongStep;scheduleSongStep=function(tick,time,phase){events.push({tick,time,phase});return checkStep(tick,time,phase);};');
 await run('beginVideo(true)');
 check('Recording starts with both canvas video and the shared band audio track',()=>{assert(c.UkeVideo.active,el('videoStatus').textContent);const s=run('videoSession');assert.equal(s.stream.getVideoTracks().length,1);assert.equal(s.stream.getAudioTracks().length,1);assert.equal(s.recorder.state,'recording');assert.equal(node.requestedFPS,60);assert.equal(s.recorder.options.videoBitsPerSecond,12000000);assert.equal(run('midiOut'),null);assert.equal(run('song.loop'),false);assert.equal(run('activeRange'),null);});
 const session=run('videoSession');await advance(Math.ceil((session.plan.total+.1)*1000));
 check('Four play-throughs schedule all band steps and exactly one ending, then restore the original song',()=>{assert.equal(events.length,20);assert.equal(events.filter(e=>e.tick===0).length,4);assert.equal(events.filter(e=>e.tick===4).length,1);assert(!c.UkeVideo.active);assert.equal(run('song.loop'),true);assert.equal(run('JSON.stringify(song.band)'),before);assert.equal(run('activeRange.loop'),true);assert.equal(el('videoDownload').hidden,false);assert(el('videoDownload').download.endsWith('.mp4'));assert(session.stream.getTracks().every(t=>t.stopped));assert.equal(run('song.video.composer'),'Student Composer');});
 check('Autosave retains user settings rather than the temporary recording mix',()=>{const raw=JSON.parse(store.get('uke-strum-draft-v2'));assert.equal(raw.loop,true);assert.equal(raw.video.passes,4);});
 await run('beginVideo(true)');const cancelled=run('videoSession');await advance(600);run("cancelVideo('Cancelled for test')");
 check('Cancellation releases the tracks, discards partial output, and restores editability',()=>{assert(!c.UkeVideo.active);assert(cancelled.stream.getTracks().every(t=>t.stopped));assert.equal(el('videoSettings').disabled,false);assert.equal(el('videoDownload').hidden,true);assert.equal(run('song.loop'),true);});
 recorderFailure=true;await run('beginVideo(true)');recorderFailure=false;
 check('Encoder initialization errors leave the song and UI recoverable',()=>{assert(!c.UkeVideo.active);assert.equal(el('videoSettings').disabled,false);assert(el('videoStatus').textContent.includes('Encoder failed'));});
 await run('beginVideo(true)');doc.hidden=true;await advance(20);doc.hidden=false;
 check('Backgrounding the recorder cancels rather than delivering a frozen video',()=>{assert(!c.UkeVideo.active);assert(el('videoStatus').textContent.includes('hidden'));});
 run("song=normalizeSong(STARTERS[5]);song.video={composer:'<script>unsafe</script>'};");c.sheetOpts={lyrics:true,diagrams:true,pattern:true,checklist:true,note:'Sing and strum!',goal:'Keep a steady beat.'};const sheet=run('practiceSheetHTML(song,sheetOpts)');
 check('Take-home sheets include every chord change, lyrics, beat labels, diagrams, and escaped credits',()=>{assert.equal((sheet.match(/class="phrase-bar"/g)||[]).length,c.UkeStrum.song.measures.length);assert(sheet.includes('Twinkle, twinkle, little star,'));assert(sheet.includes('Beat 3'));assert(sheet.includes('My practice week'));assert(sheet.includes('&lt;script&gt;unsafe'));assert(!sheet.includes('<script>unsafe'));assert(sheet.includes('G C E A frets'));});
 c.sheetOpts.lyrics=false;assert(!run('practiceSheetHTML(song,sheetOpts)').includes('class="practice-lyric"'));
 // Capture overflow stress cases using the actual renderer, not browser screenshots.
 c.UkeVideoRenderer.frame=originalFrame;run("song.title='Our Wonderful Ukulele Song with a Very Long Title for the Whole Fifth Grade to Sing Together';song.video={composer:'A Classroom Full of Student Composers',performer:'Our school ukulele club'};");await run('openVideoStudio()');run('renderVideoAt(2.5,UkeVideoModel.plan(song,videoFormRead()))');fs.writeFileSync(path.join(images,'long-title.png'),canvas.toBuffer('image/png'));
 fs.writeFileSync(path.join(root,'checks/video-results.json'),JSON.stringify({method:'Native Canvas layout rendering plus deterministic DOM, audio-clock, and MediaRecorder doubles. Real browser encoding and sound-device output not tested.',passed:checks.length,checks},null,2)+'\n');console.log(JSON.stringify({passed:checks.length,images,checks},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
