const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync('dist/video-fast.js','utf8').replace(/^import .*;$/m,'').replaceAll('export ','');
const settle=()=>new Promise(r=>setImmediate(r));
async function harness({cancelAt=Infinity,fail=false,fps=30}={}){
 const calls=[],frames=[];let output,video,audio,inflight=0;
 class Output{constructor(opts){this.opts=opts;output=this;}addVideoTrack(v,meta){video=v;this.frameRate=meta.frameRate}addAudioTrack(a){audio=a}async start(){}async finalize(){if(fail)throw Error('Encoder failed');this.finalized=true;const writer=this.opts.target.stream.getWriter();await writer.write({position:0,data:new Uint8Array([1,2,3])});await writer.close()}async cancel(){this.cancelled=true}}
 class CanvasSource{async add(t,d){assert.equal(inflight,0);inflight++;await settle();calls.push([t,d]);inflight--;}close(){this.closed=true}}
 class AudioBufferSource{async add(buffer){assert.equal(buffer.duration,2.4);assert.equal(calls.length,0)}close(){this.closed=true}}
 const ctx={Media:{Output,CanvasSource,AudioBufferSource,Mp4OutputFormat:class{},WebMOutputFormat:class{},StreamTarget:class{constructor(stream){this.stream=stream}}},Blob,WritableStream,DOMException,performance,setTimeout,Uint8Array};vm.createContext(ctx);vm.runInContext(source,ctx);
 const run=()=>ctx.render({canvas:{},plan:{total:2.4},fps,format:{ext:'mp4',video:{codec:'avc',bitrate:1e7},audio:{codec:'aac',bitrate:192000}},renderFrame:t=>frames.push(t),renderAudio:async()=>({duration:2.4}),onProgress(){},isCancelled:()=>calls.length>=cancelAt,onOutput(){}});
 return{ctx,calls,frames,run,get output(){return output},get video(){return video},get audio(){return audio}};
}
(async()=>{
 const h=await harness(),blob=await h.run();assert.equal(blob.type,'video/mp4');assert.equal(blob.size,3);assert.equal(h.calls.length,72);assert(h.output.finalized);assert(h.audio.closed&&h.video.closed);assert.equal(h.frames[0],0);assert.equal(h.frames.at(-1),2.4);assert(Math.abs(h.calls.reduce((s,[t,d])=>s+d,0)-2.4)<1e-8);h.calls.forEach(([t,d],i)=>{assert.equal(t,i/30);assert(d>0&&d<=1/30)});
 const sixty=await harness({fps:60});await sixty.run();assert.equal(sixty.calls.length,144);assert.equal(sixty.output.frameRate,60);assert(Math.abs(sixty.calls.reduce((sum,[t,d])=>sum+d,0)-2.4)<1e-8);sixty.calls.forEach(([t,d],i)=>{assert.equal(t,i/60);assert(d>0&&d<=1/60)});assert.equal(sixty.frames.at(-1),2.4);
 const cancelled=await harness({cancelAt:7});await assert.rejects(cancelled.run(),{name:'AbortError'});assert(cancelled.output.cancelled);assert(!cancelled.output.finalized);assert.equal(cancelled.calls.length,7);
 const failed=await harness({fail:true});await assert.rejects(failed.run(),/Encoder failed/);assert(failed.output.cancelled);
 const w=h.ctx.blobWriter('video/mp4');w.write({position:0,data:new Uint8Array([1,2,3,4])});w.write({position:1,data:new Uint8Array([8,9])});w.write({position:6,data:new Uint8Array([7])});assert.deepEqual([...new Uint8Array(await w.blob.arrayBuffer())],[1,8,9,4,0,0,7]);w.clear();assert.equal(w.blob.size,0);
 assert.equal(await h.ctx.chooseFormat(1920,1080),null);
 console.log('PASS: exact 30/60-fps timelines, unchanged video duration, encoder backpressure, audio-first ordering, cancellation, error cleanup, unsupported-browser detection, and seekable file assembly.');
})().catch(e=>{console.error(e);process.exitCode=1});
