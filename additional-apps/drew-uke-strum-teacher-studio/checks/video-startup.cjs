// Recorder lifecycle tests model a browser that will not start until a NEW canvas frame arrives.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {c,run,el,makeNode,advance,doc}=require('./classroom.cjs');
const root=path.resolve(__dirname,'..'),checks=[];
const oldQuery=doc.querySelector.bind(doc);doc.querySelector=s=>s==='.beach-header'?makeNode('header'):oldQuery(s);
c.Image=class{set src(v){this.onload?.();}};
const track=kind=>({kind,stopped:false,requests:0,stop(){this.stopped=true;},requestFrame(){this.requests++;}});
c.MediaStream=class{constructor(tracks){this.tracks=tracks;}getTracks(){return this.tracks;}getVideoTracks(){return this.tracks.filter(t=>t.kind==='video');}getAudioTracks(){return this.tracks.filter(t=>t.kind==='audio');}};
c.AudioContext.prototype.createMediaStreamDestination=function(){return {stream:new c.MediaStream([track('audio')])};};
let paint=0,mode='frames',active=null,attempts=[];
c.MediaRecorder=class{
 static isTypeSupported(t){return t==='video/mp4'||t==='video/webm;codecs=vp8,opus';}
 constructor(stream,o){this.stream=stream;this.mimeType=o.mimeType;this.state='inactive';this.mode=mode;attempts.push(this);if(mode==='constructor'&&this.mimeType.startsWith('video/mp4'))throw Error('MP4 encoder unavailable');}
 start(){this.state='recording';this.paintAtStart=paint;active=this;if(this.mode==='async-error'&&this.mimeType.startsWith('video/mp4'))c.setTimeout(()=>this.onerror?.({error:{message:'MP4 failed'}}),20);}
 maybeStart(){if(this.fired||this.queued||this.state!=='recording'||paint<=this.paintAtStart||this.mode==='never'||this.mode==='mp4-stall'&&this.mimeType.startsWith('video/mp4')||this.mode==='async-error'&&this.mimeType.startsWith('video/mp4'))return;this.queued=true;c.setTimeout(()=>{if(this.state==='recording'){this.fired=true;this.onstart?.();}},10);}
 stop(){this.state='inactive';this.ondataavailable?.({data:new Blob([new Uint8Array(3000)],{type:this.mimeType})});this.onstop?.();}
};
for(const f of ['video-model','video-renderer','video-studio'])run(fs.readFileSync(path.join(root,'dist',f+'.js'),'utf8'));
run('initVideoStudio()');el('videoCanvas').getContext=()=>({});el('videoCanvas').captureStream=fps=>new c.MediaStream([track('video')]);el('videoResult').pause=()=>{};
c.UkeVideoRenderer.frame=()=>{paint++;active?.maybeStart();};
const check=(name,f)=>{f();checks.push(name);};
async function begin(nextMode='frames',format='auto'){mode=nextMode;attempts=[];el('videoFormat').value=format;await run('beginVideo(true)');return run('videoSession');}
(async()=>{
 run("song=normalizeSong({title:'Startup check',meter:'2/4',tempo:200,pattern:'march-2',measures:[{chords:[{step:0,chord:'C'}],lyric:'Sing'}]});renderAll();");
 await run('openVideoStudio()');el('videoIntro').value=3;el('videoOutro').value=3;
 const s=await begin();await advance(100);
 check('Fresh canvas frames unlock a recorder that waits for frame data',()=>{assert(s.started,'Recorder stalled: no frame was painted after capture started');assert(s.capture.getVideoTracks()[0].requests>0);assert(el('videoStatus').textContent.includes('Recording'));});
 await advance((s.plan.total+1)*1000);
 check('A completed recording reveals the result and download',()=>{assert.equal(run('videoSession'),null);assert.equal(el('videoCanvas').hidden,true);assert.equal(el('videoResult').hidden,false);assert.equal(el('videoDownload').hidden,false);assert(s.stream.getTracks().every(t=>t.stopped));});
 for(const fail of ['constructor','async-error','mp4-stall']){const s=await begin(fail);await advance(fail==='mp4-stall'?8500:150);check('Auto recovers from '+fail+' by trying WebM before the timeline starts',()=>{assert(s.started,el('videoStatus').textContent);assert.equal(s.format.extension,'webm');assert(attempts.length===2);assert(s.clock>=0);});run('cancelVideo()');}
 const never=await begin('never','mp4');await advance(8500);check('A recorder that never starts times out and restores the controls',()=>{assert.equal(run('videoSession'),null);assert.equal(el('videoSettings').disabled,false);assert(el('videoStatus').classList.contains('is-error'));assert(never.stream.getTracks().every(t=>t.stopped));});
 const cancelled=await begin('never');const late=cancelled.recorder.onstart;run('cancelVideo()');late?.();await advance(100);check('Cancellation during startup ignores late recorder events',()=>{assert.equal(run('videoSession'),null);assert.equal(run('transport.state'),'stopped');assert(cancelled.stream.getTracks().every(t=>t.stopped));});
 const frame=c.UkeVideoRenderer.frame;const renderFail=await begin();await advance(100);c.UkeVideoRenderer.frame=()=>{throw Error('Test drawing failure');};await advance(20);c.UkeVideoRenderer.frame=frame;check('A rendering error exits recording instead of leaving it stuck',()=>{assert.equal(run('videoSession'),null);assert.equal(el('videoSettings').disabled,false);assert(renderFail.stream.getTracks().every(t=>t.stopped));});
 const oldInit=run('initAudio');c.stuckAudio=()=>new Promise(()=>{});run('initAudio=stuckAudio');const waiting=begin();await advance(31000);await waiting;c.restoredInit=oldInit;run('initAudio=restoredInit');check('Audio preparation has a bounded wait with a useful error',()=>{assert.equal(run('videoSession'),null);assert.equal(el('videoSettings').disabled,false);assert.match(el('videoStatus').textContent,/audio|sound|instrument/i);});
 console.log(JSON.stringify({passed:checks.length,checks},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
