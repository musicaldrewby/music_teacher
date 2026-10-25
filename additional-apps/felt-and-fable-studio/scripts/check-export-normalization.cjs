const assert=require('assert'),h=require('./app-harness.cjs'),{run,context,el}=h;
context.crypto=require('crypto').webcrypto;
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const target=Math.pow(10,-1/20),mixCalls=[],audioSamples=[];
let fixture='signal',cancelJob=null;
function buffer(channels){return{numberOfChannels:channels.length,length:channels[0].length,getChannelData:c=>channels[c]};}
context.mixFixture=async(p,tl,from,length,raw)=>{
 mixCalls.push({from,length,raw});const n=Math.round(length*48000),a=new Float32Array(n),b=new Float32Array(n);
 for(let i=0;i<n;i++){const t=from+i/48000;a[i]=fixture==='silence'?0:fixture==='invalid'?NaN:fixture==='hot'?-2:t>=3?-.8:.1;b[i]=fixture==='silence'?0:.2;}
 if(cancelJob)cancelJob.cancelled=true;
 return buffer([a,b]);
};
let videoFrames=0;
class VideoFrame{constructor(c,options){Object.assign(this,options)}close(){}}
class VideoEncoder{constructor(cb){this.cb=cb;this.encodeQueueSize=0;this.first=true;this.state='configured'}configure(){}encode(f,o){videoFrames++;const bytes=new Uint8Array([0,0,0,2,o.keyFrame?0x65:0x41,0x80]);this.cb.output({byteLength:bytes.length,type:o.keyFrame?'key':'delta',timestamp:f.timestamp,duration:f.duration,copyTo:out=>out.set(bytes)},this.first?{decoderConfig:{codec:'avc1.42002a',codedWidth:160,codedHeight:90,description:new Uint8Array([1,66,0,42,255,225,0,4,103,66,0,42,1,0,2,104,0])}}:undefined);this.first=false}async flush(){}close(){this.state='closed'}}
class AudioData{constructor(d){Object.assign(this,d)}close(){}}
class AudioEncoder{constructor(cb){this.cb=cb;this.encodeQueueSize=0;this.first=true;this.state='configured'}configure(){}encode(d){audioSamples.push(d);this.cb.output({byteLength:3,type:'key',timestamp:d.timestamp,duration:Math.round(d.numberOfFrames/48000*1e6),copyTo:out=>out.set([1,2,3])},this.first?{decoderConfig:{codec:'mp4a.40.2',sampleRate:48000,numberOfChannels:2,description:new Uint8Array([17,144])}}:undefined);this.first=false}async flush(){}close(){this.state='closed'}}
Object.assign(context,{VideoFrame,VideoEncoder,AudioData,AudioEncoder,EncodedVideoChunk:class{static [Symbol.hasInstance](o){return typeof o?.copyTo==='function'}}});
(async()=>{
 await h.ready;h.click('welcomeStart');assert.deepEqual(h.errors,[]);
 run(`state=audioDefaults({format:'felt-and-fable',version:1,title:'Normalization check',active:0,imports:{},custom:[],audioAssets:{song:{name:'song.mp3',duration:6,data:'data:audio/mpeg;base64,AAAA'}},music:{assetId:'song',volume:1,loop:false,duck:false,fade:0},scenes:[{id:'one',name:'One',bg:-1,bgColor:'#427462',caption:'',items:[],duration:6}]});refresh();globalThis.nativeMixedAudioSegment=mixedAudioSegment;mixedAudioSegment=mixFixture;globalThis.tl=storyTimeline(state,60);globalThis.range={start:1.25,end:5.5,duration:4.25,firstFrame:75,endFrame:330,mode:'marked'};globalThis.makeJob=()=>({fps:60,width:160,height:90,range,normalizeAudio:true,cancelled:false,encoders:[]});globalThis.job=makeJob();`);
 assert.equal(run('state.exportNormalizeAudio'),false);assert(!el('exportNormalizeAudio').checked);assert(!el('phraseExportNormalizeAudio').checked);
 el('exportNormalizeAudio').checked=true;run("$('exportNormalizeAudio').onchange({target:$('exportNormalizeAudio')})");assert(run('state.exportNormalizeAudio'));assert(el('phraseExportNormalizeAudio').checked);assert(run('validateProject(JSON.parse(snapshot())).exportNormalizeAudio'));
 const before=run('snapshot()');await run('prepareExportNormalization(job,state,tl)');near(run('job.normalizationGain'),target/Math.fround(.8));assert.deepEqual(mixCalls.map(c=>[c.from,c.length,c.raw]),[[1.25,2,true],[3.25,2,true],[5.25,.25,true]]);
 const first=await run('exportMixedAudioSegment(job,state,tl,1.25,1)'),last=await run('exportMixedAudioSegment(job,state,tl,5.25,.25)');near(first.getChannelData(0)[0],.1*target/.8);near(last.getChannelData(0)[0],-target);near(last.getChannelData(1)[0],target/4);assert.equal(run('snapshot()'),before);
 // Whole-range analysis and stereo linking; a quieter selected range gets its own gain.
 context.stereo=buffer([new Float32Array([.1]),new Float32Array([-.9])]);near(run('exportAudioPeak(stereo)'),Math.fround(.9));
 run('globalThis.quietJob={...makeJob(),range:{...range,start:0,duration:1}}');await run('prepareExportNormalization(quietJob,state,tl)');near(run('quietJob.normalizationGain'),target/Math.fround(.2));
 run('globalThis.off={...makeJob(),normalizeAudio:false}');const oldCount=mixCalls.length;await run('prepareExportNormalization(off,state,tl)');assert.equal(mixCalls.length,oldCount);const unchanged=await run('exportMixedAudioSegment(off,state,tl,0,1)');near(unchanged.getChannelData(0)[0],.1);assert.equal(mixCalls.at(-1).raw,false);
 fixture='silence';run('globalThis.silent=makeJob()');await run('prepareExportNormalization(silent,state,tl)');assert.equal(run('silent.normalizationGain'),1);assert(run('exportNormalizationSummary(silent)').includes('Silent'));
 fixture='hot';run('globalThis.hot=makeJob()');await run('prepareExportNormalization(hot,state,tl)');near(run('hot.normalizationGain'),target/2);const attenuated=await run('exportMixedAudioSegment(hot,state,tl,0,1)');near(attenuated.getChannelData(0)[0],-target);
 fixture='invalid';await assert.rejects(run('prepareExportNormalization(makeJob(),state,tl)'),/invalid samples/);fixture='signal';
 const cancelled=run('makeJob()');context.cancelled=cancelled;cancelJob=cancelled;await assert.rejects(run('prepareExportNormalization(cancelled,state,tl)'),e=>e.name==='AbortError');assert(!cancelled.normalizationReady);cancelJob=null;
 await assert.rejects(run('exportMixedAudioSegment(makeJob(),state,tl,0,1)'),/has not finished/);
 run('globalThis.noAudio=copy(state);noAudio.music.assetId=null;globalThis.emptyJob=makeJob()');await run('prepareExportNormalization(emptyJob,noAudio,tl)');assert.equal(run('emptyJob.normalizationGain'),1);
 // The actual shared mixer bypasses only the compressor when normalization is requested.
 let compressors=0,schedules=0;const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){}});const node=()=>({gain:param(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),connect(){},disconnect(){}});
 context.OfflineAudioContext=class{constructor(){this.destination={}}createDynamicsCompressor(){compressors++;return node()}createGain(){return node()}createBufferSource(){return{...node(),start(){schedules++}}}async startRendering(){return buffer([new Float32Array(48000),new Float32Array(48000)])}};
 run("decodedAudio.set('song',{data:state.audioAssets.song.data,buffer:{duration:6}})");await run('nativeMixedAudioSegment(state,tl,1.25,1,true)');assert.equal(compressors,0);await run('nativeMixedAudioSegment(state,tl,1.25,1,false)');assert.equal(compressors,1);assert.equal(schedules,2);
 // Real muxer with codec fixtures: normalized PCM reaches cached and uncached encoders unchanged in time.
 run("globalThis.support={video:{codec:'avc1.42002a',width:160,height:90,framerate:60,bitrate:1000000,avc:{format:'avc'}},audio:{codec:'mp4a.40.2',sampleRate:48000,numberOfChannels:2,bitrate:192000},audioCodec:'aac'}");
 for(const encoder of ['encodePreciseMP4','encodeReusableMP4']){
  audioSamples.length=0;videoFrames=0;run('job=makeJob()');await run('prepareExportNormalization(job,state,tl)');const blob=await run(`${encoder}(job,state,tl,support)`);assert.equal(Buffer.from(await blob.slice(4,8).arrayBuffer()).toString(),'ftyp');assert.equal(videoFrames,255);assert.equal(audioSamples.reduce((n,d)=>n+d.numberOfFrames,0),204000);assert.equal(audioSamples[0].timestamp,0);assert(audioSamples.every((d,i)=>!i||d.timestamp>audioSamples[i-1].timestamp));near(audioSamples[0].data[0],target/8);near(audioSamples.at(-1).data[0],-target);assert(audioSamples.every(d=>d.data.every(v=>Math.abs(v)<=target+1e-6)));
 }
 // Compatibility actually schedules the original song through the same linked gain.
 const sourceStarts=[],masters=[];context.document.removeEventListener=()=>{};
 context.liveClock={currentTime:20,state:'running',resume:async()=>{},createGain(){const n=node();masters.push(n);return n},createDynamicsCompressor(){throw Error('Normalized Compatibility must not compress again')},createMediaStreamDestination(){return{stream:{getAudioTracks:()=>[{stop(){}}]}}},createBufferSource(){return{...node(),start(...args){sourceStarts.push(args)}}}};
 context.MediaRecorder=class{constructor(){this.state='inactive';this.mimeType='video/mp4'}start(){this.state='recording'}stop(){this.state='inactive';this.ondataavailable({data:new Blob([new Uint8Array([0,0,0,8,102,116,121,112])])});this.onstop()}};
 context.setInterval=fn=>{setImmediate(()=>{context.liveClock.currentTime+=4.25;fn()});return 1};
 run("avContext=liveClock;globalThis.originalCanvas=makeCanvas;makeCanvas=(w,h)=>{const c=originalCanvas(w,h);c.captureStream=()=>({addTrack(){},getTracks:()=>[]});return c};job=makeJob()");await run('prepareExportNormalization(job,state,tl)');await run("encodeRealtimeMP4(job,state,tl,{mime:'video/mp4'})");near(masters[0].gain.value,target/Math.fround(.8));assert.deepEqual(sourceStarts,[[20,1.25,4.25]]);
 // Shared setting persists and can be switched off from the song export dialog.
 el('phraseExportNormalizeAudio').checked=false;run("$('phraseExportNormalizeAudio').onchange({target:$('phraseExportNormalizeAudio')})");assert(!run('state.exportNormalizeAudio'));assert(!el('exportNormalizeAudio').checked);assert.deepEqual(h.errors,[]);
 console.log('PASS: linked stereo peak normalization; one gain for entire selected range; quiet/loud balance; silence; invalid PCM; cancellation; opt-out; story setting roundtrip; actual mixer routing; normalized PCM in Precise/cached MP4; Compatibility gain and song offset. Native browser audio rendering/codecs require browser QA.');
})().catch(e=>{console.error(e);process.exitCode=1});
