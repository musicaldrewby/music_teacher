// Actual offline audio and MP4 mux/metadata validation; codec lifecycle uses doubles.
// This does not start a browser or assert Facebook upload acceptance.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const {OfflineAudioContext}=require('node-web-audio-api');
const {createCanvas,Image,GlobalFonts}=require('@napi-rs/canvas');
const {c,run,el,makeNode,doc,advance,store}=require('./classroom.cjs');
const root=path.resolve(__dirname,'..'),out='/tmp/uke-fast-video';fs.mkdirSync(out,{recursive:true});
GlobalFonts.registerFromPath(path.join(root,'dist/assets/fonts/DejaVuSans.ttf'),'UkePrint');GlobalFonts.registerFromPath('/usr/share/fonts/opentype/urw-base35/NimbusSans-Regular.otf','Arial');
const oldQuery=doc.querySelector.bind(doc);doc.querySelector=s=>s==='.beach-header'?makeNode('header'):oldQuery(s);
const oldCreate=doc.createElement;doc.createElement=t=>t==='canvas'?createCanvas(1,1):oldCreate(t);
class LocalImage extends Image{set src(v){super.src=v.startsWith('data:')?v:path.join(root,'dist',v);}}c.Image=LocalImage;c.Vex=require('../dist/vendor/vexflow.js');
c.OfflineAudioContext=OfflineAudioContext;c.VideoEncoder=class{};c.AudioEncoder=class{};
for(const f of ['video-model','video-island','video-renderer','video-studio','melody-model','harmony-model','melody-renderer','melody-pdf','melody-studio','score-playback-model','score-playback-renderer','score-playback','video-fast','harmony-sync'])run(fs.readFileSync(path.join(root,'dist',f+'.js'),'utf8'));
c.UkeIsland.createCanvas=(w,h)=>createCanvas(w,h);GlobalFonts.registerFromPath(path.join(root,'dist/assets/fonts/Skranji-Bold.ttf'),'UkeIsland');GlobalFonts.registerFromPath(path.join(root,'dist/assets/fonts/DejaVuSans.ttf'),'UkePrint');
run('initVideoStudio();initMelodyStudio();initScorePlayback()');
function attach(id,w=1200,h=280){const n=el(id),canvas=createCanvas(w,h);for(const d of ['width','height'])Object.defineProperty(n,d,{get:()=>canvas[d],set:v=>canvas[d]=v});n.getContext=(...args)=>canvas.getContext(...args);return canvas;}
attach('scorePlayerCanvas');const canvas=attach('videoCanvas',1920,1080);attach('melodyCanvas');el('melodyCanvas').parentElement={parentElement:{clientWidth:1000}};el('scorePlayer').clientWidth=1224;el('videoResult').pause=()=>{};
const checks=[],check=(name,f)=>{f();checks.push(name);},near=(a,b,t=1e-6)=>assert(Math.abs(a-b)<t,a+' != '+b);
(async()=>{
 const M=await import(path.join(root,'dist/vendor/mediabunny.min.mjs'));c.realM=M;
 await run('initAudio()');const live=run('ctx');c.decoderContext=new OfflineAudioContext(2,48000,48000);run("ctx=decoderContext;soundState='idle';sampledInstruments.clear();");await run('loadSampledSounds()');assert.equal(run('soundState'),'ready');await c.decoderContext.startRendering();c.live=live;run('ctx=live');
 run("song=normalizeSong({title:'Fast score test',meter:'4/4',tempo:120,pattern:'basic-4',measures:[{chords:[{step:0,chord:'C'}],lyric:'Sing and strum'},{chords:[{step:0,chord:'G7'}],lyric:'Play along'}],band:{enabled:true,ukulele:65,bass:40,drums:20,shaker:20,melody:20},notation:{meter:'4/4',tempo:120,swing:67,guideMelody:true,measures:[{notes:[{pitch:'c/4',duration:'8',lyric:'Sing'},{pitch:'d/4',duration:'8',lyric:'and'},{pitch:'e/4',duration:'h',lyric:'strum'}],chords:[{at:0,name:'C'}]},{notes:[{pitch:'g/4',duration:'h',lyric:'Play'},{pitch:'c/4',duration:'h',lyric:'along'}],chords:[{at:0,name:'G7'}]}]}});renderAll();");
 await run('openVideoStudio()');el('videoPasses').value=2;el('videoIntro').value=3;el('videoOutro').value=3;el('videoRenderMode').value='fast';el('videoTransition').value='collage';run('videoSaveOptions()');
 const p=run('UkeVideoModel.plan(song,videoOptions())');c.p=p;run("videoSession={fast:true,options:videoOptions(),plan:p};song.loop=false;activeRange=null;$('metronomeToggle').checked=false;window.attacks=[];window.savedSampleNote=sampleNote;sampleNote=function(instrument,note,time,velocity,output,length,level){attacks.push({instrument,note,time,guide:output===gate});return savedSampleNote(...arguments);};");
 const before=run('ctx'),origin=run('transport.origin');const offline=run('prepareOfflineVideoAudio(videoSession)');
 check('Scheduling the offline band restores the live audio graph immediately',()=>{assert.equal(run('ctx'),before);assert.equal(run('transport.origin'),origin);assert.equal(run('transport.state'),'stopped');});
 const audio=await offline.startRendering();let peak=0,energy=0;for(const v of audio.getChannelData(0)){assert(Number.isFinite(v));peak=Math.max(peak,Math.abs(v));energy+=v*v;}const rms=Math.sqrt(energy/audio.length);
 check('Actual sampled band audio renders with melody, repeats, and a silent tail',()=>{assert(peak>.05&&peak<=1);assert(rms>.003);const notes=c.attacks.filter(x=>x.instrument==='marimba'&&x.guide);assert.equal(notes.length,10);near(notes[1].time-notes[0].time,.33375);near(notes[5].time-notes[0].time,p.length*p.stepSeconds);const d=audio.getChannelData(0);assert(d.subarray(Math.ceil((p.musicEnd+.1)*48000)).every(x=>Math.abs(x)<1e-6));});
 const pcm=new Float32Array(audio.length*2);for(let ch=0;ch<2;ch++){const samples=audio.getChannelData(ch);for(let i=0;i<audio.length;i++)pcm[i*2+ch]=samples[i];}fs.writeFileSync(path.join(out,'band.f32'),Buffer.from(pcm.buffer));
 const fixtures={};
 for(const [width,height]of [[1920,1080],[1280,720]]){
  canvas.width=width;canvas.height=height;run('renderVideoAt(p.musicStart+.2,p)');const png=path.join(out,'score-'+height+'.png');fs.writeFileSync(png,canvas.toBuffer('image/png'));
  const original=path.join(out,'encoded-'+height+'.mp4');execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-loop','1','-framerate','60','-i',png,'-f','f32le','-ar','48000','-ac','2','-i',path.join(out,'band.f32'),'-t',String(p.total),'-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-bf','0','-g','120','-c:a','aac','-b:a','192k',original],{timeout:90000});
  const input=new M.Input({source:new M.BufferSource(fs.readFileSync(original)),formats:[M.MP4]}),v=await input.getPrimaryVideoTrack(),a=await input.getPrimaryAudioTrack();
  const target=new M.BufferTarget(),output=new M.Output({target,format:new M.Mp4OutputFormat({fastStart:'reserve'})}),vs=new M.EncodedVideoPacketSource('avc'),as=new M.EncodedAudioPacketSource('aac');
  output.addVideoTrack(vs,{frameRate:60,maximumPacketCount:Math.ceil(p.total*60)+10});output.addAudioTrack(as,{maximumPacketCount:Math.ceil(p.total*48000/1024)+20});await output.start();
  for(const [track,source]of [[a,as],[v,vs]]){const cfg=await track.getDecoderConfig();for await(const packet of new M.EncodedPacketSink(track).packets())await source.add(packet,{decoderConfig:cfg});source.close();}
  await output.finalize();input.dispose();const verified=await c.validateFastVideo(M,target.buffer,width,height,p.total,60);fixtures[height]=target.buffer;const file=path.join(out,'verified-'+height+'.mp4');fs.writeFileSync(file,Buffer.from(target.buffer));
  const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','stream=codec_name,width,height,avg_frame_rate,sample_rate,channels:format=duration','-of','json',file]));
  check('Real '+height+'p MP4 has H.264/AAC, correct dimensions, 60 fps, and duration',()=>{const v=probe.streams.find(t=>t.codec_name==='h264'),a=probe.streams.find(t=>t.codec_name==='aac');assert.equal(v.width,width);assert.equal(v.height,height);assert.equal(v.avg_frame_rate,'60/1');assert.equal(a.channels,2);assert.equal(a.sample_rate,'48000');near(+probe.format.duration,p.total,.12);assert.equal(verified.height,height);const b=Buffer.from(target.buffer);assert(b.indexOf(Buffer.from('moov'))<b.indexOf(Buffer.from('mdat')));});
 }
 await assert.rejects(c.validateFastVideo(M,fixtures[720],1920,1080,p.total,60),/dimensions/);checks.push('A mismatched-height file is rejected before download');
 run('sampleNote=savedSampleNote;videoSession=null;');
 // Model WebCodecs lifecycle while using real audio and the real container validator.
 let encoded=[],mode='success',lastOutput,rendered=0;
 const nativeFrame=c.UkeVideoRenderer.frame;c.UkeVideoRenderer.frame=()=>{rendered++;};
 class Output{constructor(o){this.target=o.target;this.state='pending';lastOutput=this;}addVideoTrack(s,m){this.video=s;assert.equal(m.frameRate,60);}addAudioTrack(s){this.audio=s;}setMetadataTags(){}async start(){this.state='started';}async finalize(){this.state='finalized';this.target.buffer=fixtures[mode==='bad-height'?720:1080];}async cancel(){this.state='canceled';}}
 class CanvasSource{constructor(canvas,o){assert.equal(canvas.width,1920);assert.equal(canvas.height,1080);assert.equal(o.codec,'avc');this.options=o;}async add(time,duration){if(mode==='fail')throw Error('Test encoder failure');if(mode==='oversize')this.options.onEncodedPacket({data:{byteLength:450*1048576+1}});if(mode==='cancel'&&encoded.length===4)run('cancelVideo()');encoded.push({time,duration});}close(){}}
 class AudioBufferSource{constructor(o){assert.equal(o.codec,'aac');}async add(a){assert.equal(a.numberOfChannels,2);assert.equal(a.sampleRate,48000);}close(){}}
 c.fakeM={...M,Output,CanvasSource,AudioBufferSource,canEncodeVideo:async()=>mode!=='unsupported',canEncodeAudio:async()=>true};run('loadFastVideoLibrary=async()=>fakeM;');
 async function settle(p){let done=false,error;p.then(()=>done=true,e=>{error=e;done=true;});while(!done){await advance(10);await new Promise(r=>setTimeout(r,1));}if(error)throw error;}
 run("song.loop=true;activeRange={start:1,end:2,loop:true};");const beforeSong=run('JSON.stringify(song)'),beforeRange=run('JSON.stringify(activeRange)');
 await settle(run('beginVideo(true)'));
 check('Fast export adds every 60 fps frame using file timestamps, then exposes the verified MP4',()=>{assert.equal(encoded.length,Math.ceil(p.total*60),el('videoStatus').textContent);encoded.forEach((f,i)=>{near(f.time,i/60);near(f.duration,1/60);});assert.equal(el('videoDownload').hidden,false,el('videoStatus').textContent);assert.match(el('videoStatus').textContent,/1920 × 1080/);assert.equal(run('videoSession'),null);assert.equal(run('JSON.stringify(song)'),beforeSong);assert.equal(run('JSON.stringify(activeRange)'),beforeRange);assert.equal(lastOutput.state,'finalized');});
 for(const m of ['fail','cancel','bad-height','unsupported','oversize']){mode=m;encoded=[];await settle(run('beginVideo(true)'));check('Fast export recovers from '+m+' without a partial download',()=>{assert.equal(run('videoSession'),null);assert.equal(el('videoSettings').disabled,false);assert.equal(el('videoDownload').hidden,true);assert.equal(run('JSON.stringify(activeRange)'),beforeRange);assert.equal(run('ctx'),live);});}
 c.UkeVideoRenderer.frame=nativeFrame;
 check('Fast rendering is the default and JSON preserves an explicit live-recording choice',()=>{assert.equal(c.UkeVideoModel.options({}).renderMode,'fast');assert.equal(c.UkeVideoModel.options({renderMode:'realtime'}).renderMode,'realtime');assert.equal(JSON.parse(store.get('uke-strum-draft-v2')).video.renderMode,'fast');});
 console.log(JSON.stringify({passed:checks.length,checks,files:out,realAudio:{peak,rms},verification:'Native OfflineAudioContext and ffmpeg encoding plus real Mediabunny MP4 mux/inspection; browser WebCodecs lifecycle uses doubles.'},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
