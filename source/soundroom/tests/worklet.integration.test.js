import {arrangeProject} from '../src/arrangement.js';
// Executes the shipped AudioWorklet in a Node harness with the real sample engine.
// This verifies DSP/transport behavior, not browser layout or physical MIDI devices.
import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';
import {createProject,compileScore,compileRecordedChange,patternProject} from '../src/sequencer-model.js';
const fonts=JSON.parse(await readFile(new URL('../src/soundfonts.json',import.meta.url),'utf8'));
async function processor(rate=44100){
 const constructors=new Map(),messages=[];const context={sampleRate:rate,currentTime:0,console,performance,TextDecoder,TextEncoder,WebAssembly,atob,btoa,setTimeout,clearTimeout,fetch,URL,
 AudioWorkletProcessor:class{constructor(){this.port={postMessage:m=>messages.push(m),onmessage:null}}},registerProcessor:(name,ctor)=>constructors.set(name,ctor)};
 context.self=context;vm.createContext(context);vm.runInContext(await readFile(new URL('../dist/assets/soundroom-processor.js',import.meta.url),'utf8'),context);
 const Worklet=constructors.get('soundroom-worklet'),p=new Worklet({processorOptions:{oneOutput:false,eventsEnabled:true}});await p.core.synthesizer.processorInitialized;
 const send=data=>p.port.onmessage({data});send({type:'setLogLevel',channelNumber:-1,data:{enableInfo:false,enableWarning:false,enableGroup:false}});
 const bytes=Buffer.concat(await Promise.all(fonts[0].chunks.map(path=>readFile(new URL('../dist/'+path.slice(2),import.meta.url)))));
 send({type:'soundBankManager',channelNumber:-1,data:{type:'addSoundBank',data:{id:'generaluser',soundBankBuffer:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),bankOffset:0}}});
 assert.ok(messages.some(m=>m.type==='isFullyInitialized'&&m.data.type==='soundBankManager'));
 const synth=p.core.synthesizer;synth.setSystemParameter('reverbGain',0);synth.setSystemParameter('delayGain',0);synth.setSystemParameter('chorusGain',0);
 function render(blocks){const energy=Array(17).fill(0),left=Array(17).fill(0),right=Array(17).fill(0);for(let i=0;i<blocks;i++){const output=Array.from({length:17},()=>[new Float32Array(128),new Float32Array(128)]);p.process([],output);output.forEach((pair,ch)=>pair.forEach((samples,side)=>{for(const x of samples){assert.ok(Number.isFinite(x));energy[ch]+=x*x;(side?right:left)[ch]+=x*x}}));context.currentTime+=128/rate}return {energy,left,right}}
 return {p,send,synth,context,messages,render};
}
test('shipped worklet plays eight independent patches, routes pan/volume, and cancels queued playback on Stop',async()=>{
 const h=await processor(),project=createProject(fonts[0].presets);project.bars=1;project.tempo=120;project.metronome='off';project.loop=true;
 for(const [i,t] of project.tracks.entries()){
  const ch=i+8;h.synth.midiChannels[ch].setDrums(t.patch.isGMGSDrum);h.synth.controllerChange(ch,0,t.patch.bankMSB);h.synth.controllerChange(ch,32,t.patch.bankLSB);h.synth.programChange(ch,t.patch.program);
  h.synth.controllerChange(ch,7,100);h.synth.controllerChange(ch,10,i===0?0:64);h.synth.controllerChange(ch,91,i*10);h.synth.controllerChange(ch,94,i*8);
  t.notes=[{pitch:i===7?36:60,start:0,duration:1,velocity:100},{pitch:i===7?38:67,start:2,duration:1,velocity:100}];
 }
 h.send({type:'soundroom-start',score:compileScore(project),origin:.04});const output=h.render(100);
 for(let i=0;i<8;i++)assert.ok(output.energy[i+9]>.00001,'track '+(i+1)+' renders audible samples');
 assert.ok(output.left[9]>output.right[9]*20,'pan reaches the track audio output');
 assert.equal(h.messages.some(m=>m.type==='soundroom-position'&&m.playing),true);
 h.synth.controllerChange(9,7,0);h.render(20);const muted=h.render(20).energy[10];assert.ok(muted<.0000001,'track volume zero silences it after gain smoothing: '+muted);
 h.send({type:'soundroom-stop'});assert.equal(h.p.timeline.playing,false);assert.equal(h.synth.synthCore.eventQueue.length,0);
 const silent=h.render(900);assert.equal(silent.energy.reduce((a,b)=>a+b,0),0,'future scheduled notes and loop passes remain cancelled');
 h.synth.destroySynthProcessor();
});

for(const rate of [44100,48000])test('eight tracks schedule within one sample across loops and live updates at '+rate+' Hz',async()=>{
 const h=await processor(rate),project=createProject(fonts[0].presets);project.bars=1;project.tempo=240;project.metronome='on';
 const starts=new Map([[60,0],[64,1],[67,2.5]]),notes=[];
 for(let i=0;i<8;i++){h.synth.midiChannels[i+8].setDrums(false);h.synth.programChange(i+8,0);project.tracks[i].notes=[...starts].map(([pitch,start])=>({pitch,start,duration:.15,velocity:95}))}
 const engine=h.synth.synthCore,process=engine.processMessageInternal.bind(engine);
 engine.processMessageInternal=(message,offset)=>{if((message[0]&0xf0)===0x90&&message[2])notes.push({channel:message[0]&15,pitch:message[1],at:engine.currentTime});process(message,offset)};
 h.synth.setSystemParameter('reverbGain',.6);h.synth.setSystemParameter('delayGain',.4);h.synth.controllerChange(8,91,85);h.synth.controllerChange(8,94,75);
 const score=compileScore(project,true);h.send({type:'soundroom-start',runId:10,score});const origin=h.messages.find(m=>m.type==='soundroom-started').origin;
 let clickEnergy=0;for(let i=0;i<110;i++){clickEnergy+=h.render(17).energy[0];h.send({type:'soundroom-score',runId:10,score})}
 assert.ok(clickEnergy>0,'the same audio process produces the metronome');
 const byChannel=Array.from({length:8},(_,i)=>notes.filter(n=>n.channel===i+8));
 assert.ok(byChannel[0].length>=12,'several full loop passes were rendered');
 for(const group of byChannel)assert.equal(group.length,byChannel[0].length,'each track gets every note exactly once');
 for(const n of notes){const phase=starts.get(n.pitch)*.25,cycle=Math.round(n.at-origin-phase),expected=origin+cycle+phase;assert.ok(Math.abs(n.at-expected)<=1/rate,'a note must not drift behind the click: '+(n.at-expected))}
 h.send({type:'soundroom-stop'});h.synth.destroySynthProcessor();
});

test('metronome previews stay outside the MIDI tracks, cancel cleanly and never start or restart a pattern',async()=>{
 const h=await processor(),project=createProject(fonts[0].presets);project.metronome='on';
 for(const tone of ['click','wood','rim','beep']){
  h.send({type:'soundroom-click-preview',settings:{clickTone:tone,clickVolume:.65,clickAccent:true},tempo:120,meter:[4,4]});
  const audio=h.render(40);assert.ok(audio.energy[0]>1,'preview has an audible dry output');assert.ok(audio.energy.slice(1).every(x=>x===0),'no performance instrument is triggered');assert.equal(h.p.timeline.playing,false);
  h.send({type:'soundroom-click-preview',cancel:true});assert.ok(h.render(200).energy.every(x=>x===0),'cancel removes future preview beats and tails');
 }
 h.send({type:'soundroom-start',runId:55,score:compileScore(project)});const origin=h.p.timeline.origin;
 h.send({type:'soundroom-click-preview',settings:{clickTone:'wood',clickVolume:1,clickAccent:false},tempo:200,meter:[3,4]});assert.equal(h.p.timeline.origin,origin);assert.equal(h.p.metronome.voices.some(v=>v.preview),false);
 h.send({type:'soundroom-metronome',settings:{clickTone:'rim',clickVolume:0,clickAccent:false}});assert.equal(h.p.timeline.origin,origin);assert.equal(h.render(200).energy[0],0,'zero click volume is silent while the pattern keeps running');assert.equal(h.p.timeline.playing,true);
 h.send({type:'soundroom-metronome',settings:{clickTone:'beep',clickVolume:1,clickAccent:true}});assert.ok(h.render(200).energy[0]>1,'live level changes take effect without a restart');assert.equal(h.p.timeline.origin,origin);
 h.send({type:'soundroom-stop'});assert.ok(h.render(200).energy.every(x=>x===0));h.synth.destroySynthProcessor();
});

test('playback follows the audio clock after a rendering gap instead of starting late',async()=>{
 const h=await processor(),project=createProject(fonts[0].presets);project.bars=1;project.loop=false;project.metronome='off';
 project.tracks[0].notes=[{pitch:60,start:0,duration:.3,velocity:110}];
 h.render(10);h.context.currentTime+=.25; // Audio device advances during a stalled quantum/bank load.
 h.send({type:'soundroom-start',score:compileScore(project),origin:h.context.currentTime+.04,runId:1});
 const output=h.render(50);
 assert.ok(output.energy[9]>.00001,'the opening note must sound within 145 ms, not wait for a stale synth clock');
 h.synth.destroySynthProcessor();
});

test('a delayed Play command still plays the first downbeat',async()=>{
 const h=await processor(),project=createProject(fonts[0].presets);project.bars=1;project.loop=false;project.metronome='off';
 project.tracks[0].notes=[{pitch:60,start:0,duration:.3,velocity:110}];h.render(100);
 h.send({type:'soundroom-start',score:compileScore(project),origin:h.context.currentTime-.08,runId:2});
 assert.ok(h.render(50).energy[9]>.00001,'a start message arriving after UI setup must not discard beat-one notes');
 h.synth.destroySynthProcessor();
});

for(const rate of [44100,48000])test('scene changes wait for the next measure, use the latest choice and preserve effects at '+rate+' Hz',async()=>{
 const h=await processor(rate),project=createProject(fonts[0].presets);project.bars=4;project.tempo=240;project.metronome='off';project.tracks[0].notes=[{pitch:60,start:0,duration:8,velocity:95}];project.scenes[1].bars=2;project.scenes[1].tempo=90;project.scenes[1].tracks[0].notes=[{pitch:67,start:0,duration:.5,velocity:96},{pitch:68,start:1,duration:.1,velocity:96}];project.scenes[2].tracks[0].notes=[{pitch:72,start:0,duration:.5,velocity:96}];
 h.synth.midiChannels[8].setDrums(false);h.synth.programChange(8,0);h.synth.setSystemParameter('reverbGain',.6);h.synth.setSystemParameter('delayGain',.4);h.synth.controllerChange(8,91,80);h.synth.controllerChange(8,94,80);
 const trace=[],engine=h.synth.synthCore,original=engine.processMessageInternal.bind(engine);engine.processMessageInternal=(m,offset)=>{trace.push({message:[...m],time:engine.currentTime});original(m,offset)};
 const reverb=h.synth.reverbProcessor,delay=h.synth.delayProcessor;
 for(const [meter,phase,nextBeat] of [[[4,4],0,4],[[4,4],.25,4],[[4,4],3.996,4],[[4,4],4,8],[[6,8],.1,3]]){
  project.meter=meter;const unit=meter[0]*4/meter[1];h.send({type:'soundroom-start',runId:17,score:compileScore(project)});const origin=h.messages.filter(m=>m.type==='soundroom-started').at(-1).origin;
  const requestTime=origin+phase*.25;h.render(Math.floor((requestTime-h.context.currentTime)*rate/128));h.context.currentTime=requestTime;
  // Replace an earlier choice before the boundary; even old clients cannot request end-of-pattern timing.
  h.send({type:'soundroom-queue',runId:17,queueId:1,scene:2,quantum:'pattern',barBeats:unit,score:compileScore(patternProject(project,2))});
  h.send({type:'soundroom-queue',runId:17,queueId:2,scene:1,barBeats:unit,score:compileScore(patternProject(project,1))});
  const queued=h.messages.filter(m=>m.type==='soundroom-scene-queued').at(-1),expected=origin+nextBeat*.25;assert.ok(Math.abs(queued.at-expected)<1e-9,'request at beat '+phase+' must use beat '+nextBeat);
  const before=h.messages.filter(m=>m.type==='soundroom-scene-switched').length,traceStart=trace.length;h.render(Math.floor((expected-h.context.currentTime)*rate/128));assert.equal(h.messages.filter(m=>m.type==='soundroom-scene-switched').length,before,'no early scene change');h.render(3);
  const switched=h.messages.filter(m=>m.type==='soundroom-scene-switched').at(-1);assert.equal(switched.scene,1);assert.equal(switched.queueId,2);assert.equal(switched.origin,expected);assert.equal(h.messages.filter(m=>m.type==='soundroom-scene-switched').length,before+1);assert.equal(h.synth.reverbProcessor,reverb);assert.equal(h.synth.delayProcessor,delay);
  const incoming=trace.slice(traceStart).filter(e=>e.message[0]===152&&e.message[1]===67);assert.equal(incoming.length,1);assert.ok(Math.abs(incoming[0].time-expected)<=1/rate);assert.equal(trace.slice(traceStart).some(e=>e.message[0]===152&&e.message[1]===72),false,'superseded choice never sounds');
  assert.ok(trace.slice(traceStart).some(e=>e.message[0]===184&&e.message[1]===123&&Math.abs(e.time-expected)<=1/rate),'outgoing notes release on the boundary');
  h.render(Math.ceil(.7*rate/128));const second=trace.slice(traceStart).find(e=>e.message[0]===152&&e.message[1]===68);assert.ok(second,'the incoming pattern reaches beat two');assert.ok(Math.abs(second.time-(expected+60/90))<=1/rate,'the incoming pattern adopts its own tempo immediately');
 }
 h.send({type:'soundroom-queue',runId:17,queueId:3,scene:0,barBeats:3,score:compileScore(patternProject(project,0))});h.send({type:'soundroom-queue',runId:17,cancel:true});const changes=h.messages.filter(m=>m.type==='soundroom-scene-switched').length;h.render(400);assert.equal(h.messages.filter(m=>m.type==='soundroom-scene-switched').length,changes);
 h.send({type:'soundroom-stop'});h.synth.destroySynthProcessor();
});


for(const rate of [44100,48000])test('incremental recording streams preserve sample timing through controller traffic at '+rate+' Hz',async()=>{
 const h=await processor(rate),project=createProject(fonts[0].presets);project.bars=1;project.countIn=0;project.tempo=240;project.metronome='off';
 project.tracks[1].notes=[{pitch:67,start:0,duration:.2,velocity:95},{pitch:69,start:2,duration:.2,velocity:95}];
 const notes=[],engine=h.synth.synthCore,original=engine.processMessageInternal.bind(engine);
 engine.processMessageInternal=(m,offset)=>{if((m[0]&0xf0)===0x90&&m[2])notes.push({channel:m[0]&15,pitch:m[1],at:engine.currentTime});original(m,offset)};
 h.send({type:'soundroom-start',runId:20,score:compileScore(project,true)});const origin=h.p.timeline.origin;h.render(14);
 h.send({type:'soundroom-append',runId:20,events:compileRecordedChange(project,{track:0,note:{start:.25,duration:.04,pitch:60,velocity:95},firstCycle:1})});
 for(let cycle=0;cycle<4;cycle++){
  for(let i=0;i<50;i++)h.send({type:'soundroom-append',runId:20,events:compileRecordedChange(project,{track:0,controller:{beat:i/16,type:'cc',controller:1,value:i},firstCycle:cycle+1})});
  h.render(Math.round(rate/128));
 }
 const added=notes.filter(n=>n.channel===8);assert.ok(added.length>=3);assert.ok(added.every(n=>n.at>origin+1),'a quantized short note never echoes on the capture pass');
 for(const n of notes){const phase=n.pitch===60?.0625:n.pitch===69?.5:0,cycle=Math.round(n.at-origin-phase);assert.ok(Math.abs(n.at-(origin+cycle+phase))<=1/rate)}
 const length=h.p.timeline.events.length;h.send({type:'soundroom-append',runId:19,events:[{beat:0,order:3,message:[0x98,72,100]}]});assert.equal(h.p.timeline.events.length,length,'stale takes cannot add notes');
 h.send({type:'soundroom-stop'});h.synth.destroySynthProcessor();
});

for(const rate of [44100,48000])test('live monitored note frames are captured and replayed on the same beat at '+rate+' Hz',async()=>{
 const h=await processor(rate),project=createProject(fonts[0].presets);project.bars=2;project.countIn=0;project.tempo=120;project.metronome='on';project.recordGrid='off';
 for(const ch of [0,8]){h.synth.midiChannels[ch].setDrums(false);h.synth.programChange(ch,0)}
 const trace=[],engine=h.synth.synthCore,original=engine.processMessageInternal.bind(engine);
 engine.processMessageInternal=(m,offset)=>{if((m[0]&0xf0)===0x90||(m[0]&0xf0)===0x80)trace.push({message:[...m],time:engine.currentTime});original(m,offset)};
 h.send({type:'soundroom-start',runId:71,score:compileScore(project,true)});const origin=h.p.timeline.origin;
 h.render(Math.ceil((origin+.5-h.context.currentTime)*rate/128));const liveStart=h.context.currentTime;
 h.send({type:'soundroom-live-input',runId:71,inputId:1,method:'noteOn',args:['midi',60,100],messages:[[0x90,60,100]],adjustment:0});
 assert.equal(h.messages.some(m=>m.type==='soundroom-input-recorded'),false,'capture waits for the frame that actually renders');
 assert.ok(h.render(30).energy[1]>0,'the captured command plays the live sample');
 const liveEnd=h.context.currentTime;h.send({type:'soundroom-live-input',runId:71,inputId:2,method:'noteOff',args:['midi'],messages:[[0x80,60,0]],adjustment:0});h.render(1);
 const receipts=h.messages.filter(m=>m.type==='soundroom-input-recorded');assert.equal(receipts.length,2);assert.equal(receipts[0].time,liveStart);assert.equal(receipts[1].time,liveEnd);
 assert.equal(trace.find(e=>e.message[0]===0x90).time,receipts[0].time);assert.equal(trace.find(e=>e.message[0]===0x80).time,receipts[1].time);
 project.tracks[0].notes=[{pitch:60,velocity:100,start:(receipts[0].time-origin)*2,duration:(receipts[1].time-receipts[0].time)*2}];
 h.send({type:'soundroom-stop',runId:71});h.render(200);h.send({type:'soundroom-start',runId:72,score:compileScore(project)});const replayOrigin=h.p.timeline.origin;h.render(Math.ceil(1.2*rate/128));
 const replayOn=trace.find(e=>e.message[0]===0x98),replayOff=trace.find(e=>e.message[0]===0x88);
 assert.ok(Math.abs((replayOn.time-replayOrigin)-(liveStart-origin))<=1/rate,'playback keeps the beat heard during recording');assert.ok(Math.abs((replayOff.time-replayOn.time)-(liveEnd-liveStart))<=2/rate,'played duration is preserved');
 h.send({type:'soundroom-live-input',runId:72,inputId:3,method:'controller',args:[{type:'cc',controller:64,value:0}],messages:[[0xb0,64,0]],adjustment:0});
 h.send({type:'soundroom-stop',runId:72});const tail=h.messages.filter(m=>m.type.startsWith('soundroom-')).slice(-2);assert.equal(tail[0].type,'soundroom-input-recorded');assert.equal(tail[1].type,'soundroom-stopped','the final capture precedes Stop acknowledgment');
 h.send({type:'soundroom-live-input',runId:71,inputId:4,method:'noteOn',args:['stale',72,90],messages:[[0x90,72,90]],adjustment:0});h.render(2);assert.equal(h.messages.some(m=>m.inputId===4),false);
 h.synth.destroySynthProcessor();
});

for(const rate of [44100,48000])test('song audio and metronome follow pattern tempos without onset drift at '+rate+' Hz',async()=>{
 const h=await processor(rate),p=createProject(fonts[0].presets);p.metronome='on';p.scenes[0].bars=p.scenes[1].bars=1;p.scenes[0].tempo=240;p.scenes[1].tempo=120;
 for(let i=0;i<8;i++){p.scenes[0].tracks[i].notes=[{pitch:60,start:0,duration:.1,velocity:90}];p.scenes[1].tracks[i].notes=[{pitch:67,start:1.137,duration:.1,velocity:90}]}
 p.song=[{scene:0,repeats:1},{scene:1,repeats:1},{scene:0,repeats:1}];const project=arrangeProject(p),notes=[],clicks=[],engine=h.synth.synthCore,process=engine.processMessageInternal.bind(engine),click=h.p.metronome.schedule.bind(h.p.metronome);
 engine.processMessageInternal=(m,offset)=>{if((m[0]&240)===144&&m[2])notes.push({ch:m[0]&15,pitch:m[1],at:engine.currentTime});process(m,offset)};
 h.p.metronome.schedule=(at,...args)=>{clicks.push(at);click(at,...args)};
 h.send({type:'soundroom-start',runId:78,score:compileScore(project)});const origin=h.p.timeline.origin;h.render(Math.ceil(4.05*rate/128));
 for(let ch=8;ch<16;ch++){const ons=notes.filter(n=>n.ch===ch);assert.equal(ons.length,3);for(const [i,time]of [0,1+1.137*.5,3].entries())assert.ok(Math.abs(ons[i].at-origin-time)<=1/rate)}
 assert.equal(clicks.length,12);for(const [i,time]of [0,.25,.5,.75,1,1.5,2,2.5,3,3.25,3.5,3.75].entries())assert.ok(Math.abs(clicks[i]-origin-time)<1e-9);
 assert.equal(h.p.timeline.playing,false);h.synth.destroySynthProcessor();
});

test('Compose schedules 32 separate parts, including channels above 16, and stops cleanly',async()=>{
 const {createScore,newPart,compileComposition}=await import('../src/score-model.js');
 const h=await processor(),p=createScore(fonts[0].presets);p.length=2;p.tempo=120;p.tracks=Array.from({length:32},(_,i)=>({...newPart(fonts[0].presets,0,false,'Part '+i),notes:[{start:0,duration:1,pitch:48+i,velocity:100}]}));
 h.send({type:'composition-start',runId:500,project:p,score:compileComposition(p)});assert.equal(h.synth.midiChannels.length,48);assert.ok(h.messages.some(m=>m.type==='composition-started'&&m.runId===500));
 const output=h.render(50);for(let i=1;i<=16;i++)assert.ok(output.energy[i]>.00001,'extended channel group '+i+' must render');assert.ok(h.messages.some(m=>m.type==='composition-position'&&m.playing));
 h.send({type:'composition-stop'});assert.equal(h.p.timeline.playing,false);const silent=h.render(900);assert.equal(silent.energy.reduce((a,b)=>a+b,0),0);h.synth.destroySynthProcessor();
});
