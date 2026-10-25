import assert from 'node:assert/strict';
import {PerformanceRecorder,recordingExtension,formatRecordingTime} from '../dist/recorder.js';
import fs from 'node:fs';
let clock=1000,latest,completed=[],errors=[],states=[];
class Recorder{
  static isTypeSupported(type){return type==='audio/mp4';}
  constructor(stream,options){latest=this;this.stream=stream;this.mimeType=options.mimeType||'audio/webm';this.state='inactive';}
  start(){this.state='recording';}
  stop(){this.state='inactive';this.stops=(this.stops||0)+1;}
  data(text){this.ondataavailable({data:new Blob([text],{type:this.mimeType})});}
  finish(){this.onstop();}
}
const destinations=[],connected=[],disconnected=[];
const audio={ready:true,master:{connect:node=>connected.push(node),disconnect:node=>{assert.ok(node,'Never disconnect the speaker output');disconnected.push(node);}},ctx:{createMediaStreamDestination(){const track={stopped:false,stop(){this.stopped=true;}};const node={stream:{getTracks:()=>[track]},track};destinations.push(node);return node;}}};
const options={Recorder,now:()=>clock,onComplete:r=>completed.push(r),onError:e=>errors.push(e),onState:s=>states.push(s)};
const recorder=new PerformanceRecorder(audio,options);
assert.equal(recorder.start(),true);assert.equal(recorder.start(),false);assert.equal(recorder.state,'recording');assert.equal(latest.mimeType,'audio/mp4');assert.equal(latest.stream,destinations[0].stream);assert.deepEqual(connected,[destinations[0]]);
latest.data('first');clock+=65500;assert.equal(formatRecordingTime(recorder.elapsed),'01:05');
recorder.stop();recorder.stop();assert.equal(latest.stops,1);assert.equal(recorder.state,'stopping');assert.equal(recorder.start(),false);
assert.equal(destinations[0].track.stopped,false,'Keep the stream until final data arrives');
latest.data('last');latest.finish();assert.equal(recorder.state,'idle');assert.equal(completed.length,1);assert.equal(await completed[0].blob.text(),'firstlast');assert.equal(completed[0].extension,'m4a');assert.equal(completed[0].duration,65.5);assert.equal(destinations[0].track.stopped,true);assert.deepEqual(disconnected,[destinations[0]]);
latest.finish();assert.equal(completed.length,1,'A take must not be delivered twice');
assert.deepEqual(states,['recording','stopping','idle']);
// A failed new take leaves the caller's previous result intact.
recorder.start();recorder.stop();latest.finish();assert.equal(errors.length,1);assert.equal(completed.length,1);
// If the platform ends the stream, deliver the audio already captured.
recorder.start();latest.data('partial');latest.onerror({error:new Error('interrupted')});latest.finish();assert.equal(completed.at(-1).interrupted,true);assert.equal(recorder.state,'idle');
// Chromium/WebM, default-format fallback, and browsers that reject a format.
class WebM extends Recorder{static isTypeSupported(type){return type==='audio/webm;codecs=opus';}}
const webm=new PerformanceRecorder(audio,{...options,Recorder:WebM});webm.start();assert.equal(latest.mimeType,'audio/webm;codecs=opus');latest.data('opus');webm.stop();latest.finish();assert.equal(completed.at(-1).extension,'webm');
class DefaultOnly extends Recorder{static isTypeSupported(){return false;}}
const fallback=new PerformanceRecorder(audio,{...options,Recorder:DefaultOnly});fallback.start();assert.equal(latest.mimeType,'audio/webm');latest.data('default');fallback.stop();latest.finish();
class Fails extends Recorder{start(){throw new Error('start failed');}}
const failing=new PerformanceRecorder(audio,{...options,Recorder:Fails});assert.throws(()=>failing.start(),/start failed/);assert.equal(failing.state,'idle');assert.equal(destinations.at(-1).track.stopped,true);
assert.throws(()=>new PerformanceRecorder(audio,{Recorder:null}).start(),/unavailable/);
assert.equal(recordingExtension('audio/ogg;codecs=opus'),'ogg');assert.equal(formatRecordingTime(0),'00:00');assert.equal(formatRecordingTime(3600),'60:00');
const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');const ui=fs.readFileSync(new URL('../dist/recording-ui.js',import.meta.url),'utf8');
const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);for(const m of ui.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.includes(m[1]),`Missing ${m[1]}`);
assert.ok(!/getUserMedia/.test(ui+fs.readFileSync(new URL('../dist/recorder.js',import.meta.url),'utf8')));
console.log('PASS: final-mix stream routing, final chunk delivery, duplicate start/stop prevention, MP4/WebM formats and fallback, interruption recovery, failed-take preservation, time formatting, stream cleanup, and no microphone request.');
