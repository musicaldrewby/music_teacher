const fs=require('fs'),assert=require('assert'),h=require('./app-harness.cjs'),{run,context,el}=h;
context.crypto=require('crypto').webcrypto;
const starts=[],nodes=[];
const param=()=>({value:0,setValueAtTime(v){this.value=v},linearRampToValueAtTime(v){this.value=v}});
const node=()=>({gain:param(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),connect(){},disconnect(){}});
const clock={currentTime:100,state:'running',destination:{},resume:async()=>{},createGain:node,createDynamicsCompressor:node,createBufferSource(){const n={...node(),start(...v){starts.push(v)},stop(){this.stopped=true}};nodes.push(n);return n;},decodeAudioData:async()=>({duration:12})};
context.testClock=clock;
const near=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const tick=t=>{clock.currentTime=run('phraseRun.clock.startedAt')+t-run('phraseRun.clock.offset');run('phrasePaint()');};
const press=()=>run('phraseLastPress=-Infinity;phraseAdvance(1)');
const flush=()=>new Promise(setImmediate);
let encoded=0,audioFrames=0,audioTimes=[];
class VideoFrame{constructor(canvas,options){Object.assign(this,options)}close(){}}
class VideoEncoder{constructor(cb){this.cb=cb;this.encodeQueueSize=0;this.first=true;this.state='configured'}configure(c){this.config=c}encode(f,o){encoded++;const bytes=new Uint8Array([0,0,0,2,o.keyFrame?0x65:0x41,0x80]);this.cb.output({byteLength:bytes.length,type:o.keyFrame?'key':'delta',timestamp:f.timestamp,duration:f.duration,copyTo:out=>out.set(bytes)},this.first?{decoderConfig:{codec:'avc1.42002a',codedWidth:160,codedHeight:90,description:new Uint8Array([1,66,0,42,255,225,0,4,103,66,0,42,1,0,2,104,0])}}:undefined);this.first=false}async flush(){}close(){this.state='closed'}static async isConfigSupported(config){return{supported:true,config}}}
class AudioData{constructor(data){Object.assign(this,data)}close(){}}
class AudioEncoder{constructor(cb){this.cb=cb;this.encodeQueueSize=0;this.first=true;this.state='configured'}configure(){}encode(d){audioFrames+=d.numberOfFrames;audioTimes.push(d.timestamp);this.cb.output({byteLength:3,type:'key',timestamp:d.timestamp,duration:Math.round(d.numberOfFrames/48000*1e6),copyTo:out=>out.set([1,2,3])},this.first?{decoderConfig:{codec:'mp4a.40.2',sampleRate:48000,numberOfChannels:2,description:new Uint8Array([17,144])}}:undefined);this.first=false}async flush(){}close(){this.state='closed'}static async isConfigSupported(config){return{supported:true,config}}}
Object.assign(context,{VideoFrame,VideoEncoder,AudioData,AudioEncoder,EncodedVideoChunk:class{static [Symbol.hasInstance](o){return typeof o?.copyTo==='function'}}});
(async()=>{
 await h.ready;h.click('welcomeStart');assert.deepEqual(h.errors,[]);
 run(`avContext=testClock;state=audioDefaults({format:'felt-and-fable',version:1,title:'Song timing checks',active:0,imports:{},custom:[],audioAssets:{song:{name:'song.mp3',data:'data:audio/mpeg;base64,AAAA',duration:12}},music:{assetId:'song',volume:.8,loop:true,duck:true,fade:1},phraseShow:{version:1,enabled:true,mode:'manual'},scenes:[0,1,2].map(i=>({id:'scene-'+i,name:'Scene '+i,bg:-1,bgColor:['#386f69','#996c48','#395d85'][i],caption:['Oh my!','No more pie','I think I’ll take the train'][i],duration:4,camera:{x:800,y:450,zoom:1},items:[{id:'felt-'+i,name:'Felt circle',type:'shape',shape:'Circle',x:800,y:450,w:180,h:180,bw:180,bh:180,rotation:0,color:'#f4d995',opacity:1,fiber:0,stitch:false,keyframes:[{t:0,ease:'linear',pose:{x:500,y:450,w:180,h:180,rotation:0,opacity:1}},{t:1,ease:'linear',pose:{x:900,y:450,w:180,h:180,rotation:0,opacity:1}}]}],phrase:{id:'phrase-'+i,section:'Verse',direction:'Sing and echo',holdAt:1}}))});decodedAudio.set('song',{data:state.audioAssets.song.data,buffer:{duration:12}});refresh();validateProject(state);`);
 const source=run('snapshot()');await run('phraseOpen()');assert.equal(run('phraseRun.mode'),'manual');
 run('phraseGo(0,0);phrasePaint(999000)');assert.equal(run('phraseRun.index'),0);assert.equal(run('phraseFrame'),0);press();assert.equal(run('phraseRun.index'),1);
 context.event={key:' ',code:'Space',repeat:true,target:el('phraseNext'),preventDefault(){},stopImmediatePropagation(){}};run('phraseKey(event)');assert.equal(run('phraseRun.index'),1);
 run('phraseClose()');assert.equal(run('snapshot()'),source);
 await run('phraseOpen()');run("phraseSetMode('record')");await run('phrasePlaySong()');assert(run('phraseRun.clock'));assert.equal(starts.at(-1)[1],0);assert(!el('phraseSetup').open);
 tick(1.237);press();near(run('state.phraseShow.draft.starts[1]'),1.237);
 tick(2.15);press();near(run('state.phraseShow.draft.starts[2]'),2.15);
 run('phraseLastPress=-Infinity;phraseAdvance(-1)');assert.equal(run('phraseRun.index'),1);assert.equal(run('state.phraseShow.draft.starts[2]'),null);
 tick(3.781);press();tick(4.2);run('phrasePause()');near(run('phraseRun.position'),4.2);assert(el('phraseNext').disabled);
 clock.currentTime=200;await run('phrasePlaySong()');near(starts.at(-1)[1],4.2);tick(7.777);press();assert(!run('phraseRun.clock'));near(run('state.phraseShow.timing.end'),7.777);assert(run('phraseTimingStatus().complete'));assert(nodes.at(-1).stopped);
 const recorded=run('snapshot()');run('validateProject(JSON.parse(snapshot()))');assert.equal(run('JSON.stringify(state.scenes.map(s=>s.duration))'),'[4,4,4]');
 run("phraseSetMode('follow')");await run('phrasePlaySong()');tick(1.236);assert.equal(run('phraseRun.index'),0);tick(1.237);assert.equal(run('phraseRun.index'),1);tick(6.9);assert.equal(run('phraseRun.index'),2);
 run('phraseSeekSong(.5)');await flush();near(starts.at(-1)[1],.5);assert.equal(run('phraseRun.index'),0);run('phrasePause()');const paused=run('phraseRun.position');clock.currentTime+=100;run('phrasePaint()');near(run('phraseRun.position'),paused);
 run('phraseEditCue(1,1.5)');near(run('state.phraseShow.timing.starts[1]'),1.5);run('phraseEditCue(1,5)');near(run('state.phraseShow.timing.starts[1]'),1.5);assert(el('phraseNotice').textContent.includes('increasing'));
 run('phraseEditCue("end",15)');near(run('state.phraseShow.timing.end'),7.777);
 context.recorded=recorded;run('state=JSON.parse(recorded);phraseRun.project=state');
 const q=run('copy(state)');q.scenes.reverse();context.changed=q;assert(!run('phraseTimingStatus(changed).complete'));run('validateProject(changed)');q.scenes.reverse();q.music.assetId=null;assert(!run('phraseTimingStatus(changed).complete'));
 const before=run('snapshot()');run('globalThis.video=phraseVideoProject(state,true)');assert.equal(run('snapshot()'),before);
 assert.equal(run('storyTimeline(state,60).at(-1).end'),467/60);assert.equal(run('phraseRun.mode'),'follow');
 for(const fps of [30,60]){context.fps=fps;const rows=run('storyTimeline(video,fps)');assert.deepEqual(Array.from(rows,r=>r.firstFrame),[0,Math.round(1.237*fps),Math.round(3.781*fps)]);assert.equal(rows.at(-1).end,Math.ceil(7.777*fps)/fps);for(let i=1;i<rows.length;i++)assert.equal(rows[i-1].end,rows[i].start);}
 run('globalThis.board=makeCanvas(1920,1080);phraseDraw(board.getContext("2d"),state,state.scenes[0],1,true)');const held=run('board.toBuffer("image/png")');run('phraseDraw(board.getContext("2d"),state,state.scenes[0],6,true)');assert(held.equals(run('board.toBuffer("image/png")')),'Long phrases freeze their final pose');fs.mkdirSync('.sites-runtime/checks',{recursive:true});fs.writeFileSync('.sites-runtime/checks/song-lyrics.png',held);
 run('globalThis.frame=makeCanvas(1920,1080);paintVideoFrame(frame.getContext("2d"),video,storyTimeline(video,60),60,60)');assert(held.equals(run('frame.toBuffer("image/png")')),'Present and MP4 use the same artwork and lyric overlay');
 run('video.phraseVideo.lyrics=false;paintVideoFrame(frame.getContext("2d"),video,storyTimeline(video,60),60,60)');assert(!held.equals(run('frame.toBuffer("image/png")')));run('video.phraseVideo.lyrics=true');
 const dep=run('renderDependencies(video,storyTimeline(video),storyTimeline(video)[0])');assert(dep.phraseVideo);run('globalThis.ordinary=copy(state);delete ordinary.phraseShow');assert(!run('renderDependencies(ordinary,storyTimeline(ordinary),storyTimeline(ordinary)[0]).phraseVideo'));
 // Audio scheduling preserves the song clock across scene joins and seeking.
 const startCount=starts.length;run('scheduleStoryAudio(testClock,testClock.destination,video,storyTimeline(video),2,3,300)');assert.equal(starts.length,startCount+1);assert.deepEqual(starts.at(-1),[300,2,3]);
 // Real muxer, encoder fixtures: exact 60 fps frames and continuous 48 kHz audio.
 context.mix=async(p,tl,from,length)=>{const n=Math.round(length*48000);return{length:n,getChannelData:()=>new Float32Array(n)}};
 run("mixedAudioSegment=mix;globalThis.small=phraseVideoProject();small.phraseVideo.starts=[0,.7,1.4];small.phraseVideo.end=2.1;globalThis.support={video:{codec:'avc1.42002a',width:160,height:90,framerate:60,bitrate:1000000,avc:{format:'avc'}},audio:{codec:'mp4a.40.2',sampleRate:48000,numberOfChannels:2,bitrate:192000},audioCodec:'aac'};globalThis.job={fps:60,width:160,height:90,range:directorRange(small,60),encoders:[],cancelled:false}");
 const blob=await run('encodeReusableMP4(job,small,storyTimeline(small,60),support)');assert.equal(encoded,126);assert.equal(audioFrames,100800);assert(audioTimes.every((t,i)=>!i||t>audioTimes[i-1]));context.testBlob=blob;await run('productionValidateExport(testBlob)');
 // Export UI routes to the song snapshot, never the original twelve-second timeline.
 context.outputBlob=blob;context.downloads=[];context.exportCapture=null;
 run('encodeReusableMP4=async(job,p,tl,support)=>{globalThis.exportCapture={job,p,tl,support};return outputBlob};download=(blob,name)=>downloads.push({size:blob.size,name})');
 await run('phraseExportOpen()');assert(el('phraseExportDialog').open);assert(!el('phraseExportStart').disabled);await run('phraseBeginExport()');assert.equal(context.exportCapture.job.width,1920);assert.equal(context.exportCapture.job.height,1080);assert.equal(context.exportCapture.job.fps,60);assert.equal(context.exportCapture.tl.at(-1).end,467/60);assert(context.exportCapture.p.phraseVideo.lyrics);assert.equal(context.downloads.length,1);assert(context.downloads[0].name.endsWith('_song_lyrics_1080p60.mp4'));assert.equal(run('snapshot()'),before);assert.equal(run('exportJob'),null);
 // Both export entry points prepare normalization before invoking an encoder.
 context.mix=async(p,tl,from,length)=>{const n=Math.round(length*48000);return{numberOfChannels:2,length:n,getChannelData:()=>new Float32Array(n).fill(.25)}};
 el('phraseExportNormalizeAudio').checked=true;run("$('phraseExportNormalizeAudio').onchange({target:$('phraseExportNormalizeAudio')});mixedAudioSegment=mix");
 await run('phraseBeginExport()');assert(context.exportCapture.job.normalizeAudio);assert(context.exportCapture.job.normalizationReady);near(context.exportCapture.job.normalizationGain,Math.pow(10,-1/20)/.25);assert(el('phraseExportResult').textContent.includes('peak-normalized'));
 run("$('phraseExportDialog').close();phraseClose()");await run('beginVideoExport()');assert(context.exportCapture.job.normalizeAudio);assert(context.exportCapture.job.normalizationReady);assert(!context.exportCapture.p.phraseVideo);assert.equal(context.exportCapture.tl.at(-1).end,467/60);near(run('phrasePlaybackTiming(state).end'),7.777);assert(el('avStatus').textContent.includes('peak-normalized'));
 el('exportNormalizeAudio').checked=false;run("$('exportNormalizeAudio').onchange({target:$('exportNormalizeAudio')})");await run('phraseOpen()');
 // Completed cues survive close/reopen, recovery, an interrupted replacement, and a declined new take.
 assert.equal(run('phraseRun.mode'),'follow');
 const complete=run('JSON.stringify(state.phraseShow.timing)');
 await context.FeltRecovery.flush();const copies=await context.FeltRecovery.list();
 const savedCopy=JSON.parse(context.indexedDB.stores.get('projects').get(copies[0].id).json);assert.equal(JSON.stringify(savedCopy.phraseShow.timing),complete);
 run("phraseSetMode('manual');phraseClose()");await run('phraseOpen()');assert.equal(run('phraseRun.mode'),'follow');
 context.confirm=()=>false;run("phraseSetMode('record')");await run('phrasePlaySong()');assert(!run('phraseRun.clock'));assert.equal(run('JSON.stringify(state.phraseShow.timing)'),complete);
 context.confirm=()=>true;await run('phrasePlaySong()');tick(1.8);press();run('phrasePause()');
 assert.equal(run('JSON.stringify(state.phraseShow.timing)'),complete);assert.equal(run('storyTimeline().at(-1).end'),467/60);near(run('state.phraseShow.draft.starts[1]'),1.8);
 run('phraseClose()');await context.FeltRecovery.flush();await run('phraseOpen()');assert.equal(run('phraseRun.mode'),'follow');run("phraseSetMode('record')");await run('phrasePlaySong()');near(starts.at(-1)[1],1.8);assert.equal(run('phraseRun.index'),1);run('phrasePause()');
 // Failed recovery never claims success and the completed cues remain in memory.
 context.indexedDB.setFailWrites(true);run('phraseDirty()');assert.equal(await context.FeltRecovery.flush(),false);assert(el('phraseSaveStatus').textContent.includes('could not save'));assert.equal(run('JSON.stringify(state.phraseShow.timing)'),complete);context.indexedDB.setFailWrites(false);await context.FeltRecovery.flush();
 // Ordinary playback, scene preview, Film, and exact exports share the same cuts and hold pose.
 run('phraseClose()');await run('startStoryPlayback(1.237)');assert.equal(run('state.active'),1);assert.equal(run('storyPlayback.total'),467/60);run('stopStoryPlayback();present(false)');
 run('filmRefresh()');assert(el('filmSummary').textContent.includes('0:07.8'));near(run('sceneSeconds(state.scenes[0])'),74/60);
 run('globalThis.edited=copy(state);phraseResizeScene(edited.scenes[0],1.8,edited)');near(run('edited.phraseShow.timing.starts[1]'),1.8);near(run('edited.phraseShow.timing.starts[2]'),3.781);assert.equal(run('edited.scenes[0].duration'),4);
 assert.throws(()=>run('phraseResizeScene(edited.scenes[0],5,edited)'),/increasing/);await run('phraseOpen()');
 // Leaving after the last scene cue also commits the full-song ending; no extra Apply step.
 run("phraseSetMode('record')");await run('phrasePlaySong()');tick(5.2);press();run('phraseClose()');assert(run('phraseTimingStatus().complete'));near(run('state.phraseShow.timing.starts[2]'),5.2);near(run('state.phraseShow.timing.end'),12);assert(!run('state.phraseShow.draft'));await run('phraseOpen()');assert.equal(run('phraseRun.mode'),'follow');
 // The Present upload uses the existing bounded audio import and embedded storage.
 context.FileReader=class{readAsDataURL(file){this.result='data:audio/mpeg;base64,BBBB';queueMicrotask(()=>this.onload())}};
 context.upload={name:'replacement.mp3',type:'audio/mpeg',size:4,arrayBuffer:async()=>new ArrayBuffer(4)};
 await run('phraseImportSong(upload)');assert.equal(run('mediaInfo(state.music.assetId).name'),'replacement.mp3');assert.equal(run('phraseRun.mode'),'record');assert.equal(run('state.music.volume'),1);assert(!run('phraseTimingStatus().complete'));assert.equal(run('state.phraseShow.timing.assetId'),'song');
 const imported=run('snapshot()');context.badUpload={...context.upload,size:90*1024*1024};await run('phraseImportSong(badUpload)');assert.equal(run('snapshot()'),imported);assert(el('phraseNotice').textContent.includes('80 MB'));
 run('phraseClose()');assert(!run('phraseRun'));assert.deepEqual(h.errors,[]);
 console.log('PASS: manual holds; MP3 song-clock cues; repeat guard; undo cue; pause/resume; follow and seek; cue edits; stale timing detection; project roundtrip; exact 30/60 fps cuts; held animation and lyric parity; continuous audio; real MP4 muxer with codec fixtures; shared timeline and both export routes; completed-take protection; resume; recovery persistence and failure; final-cue close without Apply. Browser hardware codecs are not simulated.');
})().catch(e=>{console.error(e);process.exitCode=1});
