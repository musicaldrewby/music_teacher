const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict');
const html = fs.readFileSync(require('path').join(__dirname, '../dist/index.html'),'utf8');
const source = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
async function setup(options={}) {
  let now=10, timerId=0; const timers=new Map(), nodes=new Map(), windowEvents={}, voices=[];
  const timeout=(fn,ms=0)=>{let id=++timerId;timers.set(id,{fn,at:now+Math.max(0,ms)/1000});return id};
  const clear=id=>timers.delete(id);
  const downloads=[], urls=new Map();
  const makeNode=()=>({style:{setProperty(k,v){this[k]=v}},dataset:{},attributes:{},setAttribute(k,v){this.attributes[k]=v},getAttribute(k){return this.attributes[k]},click(){if(this.download)downloads.push({filename:this.download,blob:urls.get(this.href)});else this.events.click?.()},remove(){},classList:{add(){},remove(){},replace(){}},events:{},addEventListener(t,fn){this.events[t]=fn},querySelector(){return makeNode()},setPointerCapture(){}});
  const param=()=>({value:0,events:[],setValueAtTime(v,t){this.value=v;this.events.push(['set',v,t])},setTargetAtTime(v,t,c){this.value=v;this.events.push(['target',v,t,c])},cancelScheduledValues(t){this.events.push(['cancel',t])},linearRampToValueAtTime(v,t){this.value=v},exponentialRampToValueAtTime(v,t){this.value=v}});
  const audioNode=()=>({connections:[],connect(n){this.connections.push(n)},disconnect(){this.connections=[]}});
  class AudioContext {
    constructor(){this.state='suspended';this.destination={};this.sampleRate=44100;this.resumeCalls=0}
    async resume(){this.resumeCalls++;this.state='running'}
    get currentTime(){return now}
    createDynamicsCompressor(){return {threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),connect(){}}}
    createBufferSource(){
      const voice={...audioNode(),playbackRate:param(),start(t,offset,duration){this.startAt=t;this.offset=offset;this.sampleDuration=duration},stop(t=now){this.stopAt=t;clear(this.end);this.end=timeout(()=>this.onended?.(),(t-now)*1000)}};
      voices.push(voice);return voice;
    }
    createGain(){return {...audioNode(),gain:param()}}
    createConvolver(){return {...audioNode(),normalize:true}}
    createBuffer(channels,length,sampleRate){const data=Array.from({length:channels},()=>new Float32Array(length));return {numberOfChannels:channels,length,sampleRate,duration:length/sampleRate,getChannelData(c){return data[c]}}}
    async decodeAudioData(data){if(options.decode) return options.decode(data);return {numberOfChannels:1,duration:191.96408163265306}}

  }
  const manifest=JSON.parse(fs.readFileSync(require('path').join(__dirname,'../dist/assets/audio/marimba-notes-v1.json'),'utf8'));
  const fetches=[], storage=new Map(options.preferences?Object.entries(options.preferences):[]);
  const fetchAsset=async(url,opts)=>{fetches.push(url);if(options.fetch)return options.fetch(url,opts);return {ok:true,json:async()=>manifest,arrayBuffer:async()=>new ArrayBuffer(8)}};
  const ctx={fetch:fetchAsset,AbortController,Blob,URL:{createObjectURL(blob){const u='blob:test-'+urls.size;urls.set(u,blob);return u},revokeObjectURL(u){urls.delete(u)}},window:{localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},AudioContext,addEventListener(t,fn){windowEvents[t]=fn}},document:{body:{appendChild(){}},createElement(){return makeNode()},getElementById(id){if(!nodes.has(id))nodes.set(id,makeNode());return nodes.get(id)},elementFromPoint(){return ctx.hit}},setTimeout:timeout,clearTimeout:clear};
  vm.createContext(ctx);vm.runInContext(source,ctx);
  const run=s=>vm.runInContext(s,ctx);
  if(options.wait!==false) await run('marimbaLoadPromise');
  const advance=target=>{let count=0;while(true){const e=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!e||e[1].at>target)break;if(++count>100000)throw Error('Timer storm');now=e[1].at;timers.delete(e[0]);e[1].fn()}now=target};
  const track=(loop=false)=>run(`initAudio();seq.duration=1;seq.loop=${loop};seq.track=[{relativeTime:0,barIndex:0,freq:261.63,octave:0},{relativeTime:0.5,barIndex:1,freq:293.66,octave:0}];`);
  const sounded=()=>voices.filter(v=>v.startAt<=now && v.stopAt>v.startAt).map(v=>Number(v.startAt.toFixed(5)));
  const click=id=>nodes.get(id).events.click();
  return {run,advance,track,sounded,click,ctx,nodes,windowEvents,timers,voices,downloads,urls,fetches,storage,manifest};
}
const tests={
 async 'Repeated Play stays single; Stop prevents later notes'(){
   const t=await setup();t.track(true);t.click('btn-play');t.click('btn-play');t.advance(10.7);assert.deepEqual(t.sounded(),[10,10.5]);
   const callback=t.timers.get(t.run('seq.schedulerTimer')).fn;t.click('btn-stop');callback();t.advance(15);
   assert.deepEqual(t.sounded(),[10,10.5]);assert.equal(t.run('seq.playing'),false);assert.equal(t.timers.size,0);
 },
 async 'Loop can be enabled during one-shot playback'(){
   const t=await setup();t.track();t.click('btn-play');t.advance(10.7);t.click('btn-loop');t.advance(12.1);
   assert.deepEqual(t.sounded(),[10,10.5,11,11.5,12]);assert.equal(t.run('seq.playing'),true);
 },
 async 'Loop off cancels next-pass notes even immediately before boundary'(){
   const t=await setup();t.track(true);t.click('btn-play');t.advance(10.97);assert(t.voices.some(v=>v.startAt===11));t.click('btn-loop');t.advance(12);
   assert.deepEqual(t.sounded(),[10,10.5]);assert.equal(t.run('seq.playing'),false);
 },
 async 'Rapid loop off/on keeps exactly one next pass'(){
   const t=await setup();t.track(true);t.click('btn-play');t.advance(10.97);t.click('btn-loop');t.click('btn-loop');t.advance(11.6);
   assert.deepEqual(t.sounded(),[10,10.5,11,11.5]);
 },
 async 'Overdub plays live once, then once per later pass'(){
   const t=await setup();t.track(true);t.click('btn-overdub');t.advance(10.25);t.run('handleNotePlay(2,329.63)');t.advance(12.3);
   assert.deepEqual(t.sounded(),[10,10.25,10.5,11,11.25,11.5,12,12.25]);
 },
 async 'Record and replay preserve relative note timing'(){
   const t=await setup();t.click('btn-rec');t.advance(10.2);t.run('handleNotePlay(0,261.63)');t.advance(10.6);t.run('handleNotePlay(1,293.66)');t.advance(11.2);t.click('btn-stop');
   assert(Math.abs(t.run('seq.duration')-1)<1e-9);t.click('btn-play');t.advance(12.3);
   assert.deepEqual(t.sounded(),[10.2,10.6,11.2,11.6]);assert.equal(t.run('seq.playing'),false);
 },
 async 'Loop bookkeeping remains bounded over many repeats'(){
   const t=await setup();t.track(true);t.click('btn-play');t.advance(110.1);
   assert.equal(t.sounded().length,201);assert(t.run('seq.scheduledNotes.size')<=4);assert(t.run('seq.timeouts.size')<=2);
 },
 async 'Lifting or cancelling one finger preserves the other slide'(){
   const t=await setup();t.run('var hits=[];handleNotePlay=(i)=>hits.push(i)');
   const zone=i=>({closest(s){return s==='.middle-zone'?this:null},getAttribute(){return String(i)}});
   const down=(id,i)=>t.nodes.get('xylo-wrapper').events.pointerdown({pointerId:id,pointerType:'touch',target:zone(i),preventDefault(){}});
   down(1,0);down(2,2);t.windowEvents.pointerup({pointerId:1});t.ctx.hit=zone(3);t.windowEvents.pointermove({pointerId:2,clientX:0,clientY:0});
   t.ctx.hit=zone(4);t.windowEvents.pointermove({pointerId:1,clientX:0,clientY:0});
   assert.equal(t.run('JSON.stringify(hits)'),'[0,2,3]');t.windowEvents.pointercancel({pointerId:2});assert.equal(t.run('activePointers.size'),0);
 },
 async 'Reset All clears Loop, recording, and transport'(){
   const t=await setup();t.track(true);t.click('btn-play');t.click('reset-btn');t.advance(12);
   assert.equal(t.run('seq.loop'),false);assert.equal(t.run('seq.playing'),false);assert.equal(t.run('seq.track.length'),0);assert.equal(t.run('seq.duration'),0);
 },
 async 'HTML has no external scripts, styles, or media dependencies'(){
   assert(!/<script[^>]+src=|<link[^>]+href=|<(?:img|audio|video)[^>]+src=/i.test(html));
   assert(html.includes('id="offline-styles"'));
 }
};
Object.assign(tests, {
 async 'Fullscreen Stop is available and stops the active loop'(){
   const t=await setup();t.track(true);t.click('btn-play');t.click('fs-btn');
   assert.equal(t.nodes.get('fullscreen-stop').hidden,false);assert.equal(t.nodes.get('fullscreen-stop').disabled,false);
   t.click('fullscreen-stop');t.advance(12);assert.equal(t.run('seq.playing'),false);assert.equal(t.run('seq.track.length'),2);
   assert.equal(t.nodes.get('fullscreen-stop').disabled,true);t.click('fs-btn');assert.equal(t.nodes.get('fullscreen-stop').hidden,true);
 },
 async 'Pentatonic setups mark every correct bar and preserve recorded music'(){
   const t=await setup();t.track();t.run('state.bars[0].highlight=2;state.octaveOffset=-1');const before=t.run('JSON.stringify(seq.track)');
   const expected={c:['C','D','E','G','A','C','D','E','G','A'],f:['C','D','F','G','A','C','D','F','G','A'],g:['D','E','G','A','B','D','E','G','A']};
   for(const [preset,notes] of Object.entries(expected)){
     t.click('preset-'+preset);assert.deepEqual(JSON.parse(t.run('JSON.stringify(state.bars.filter(b=>!b.blackout).map(b=>getLabel(b.note)))')),notes);
     assert.equal(t.nodes.get('preset-'+preset).getAttribute('aria-pressed'),'true');
   }
   assert.equal(t.run('state.bars[0].highlight'),2);assert.equal(t.run('state.octaveOffset'),-1);assert.equal(t.run('JSON.stringify(seq.track)'),before);
   t.click('preset-all');assert.equal(t.run('state.bars.filter(b=>b.blackout).length'),0);assert.equal(t.run('state.useBb||state.useFSharp'),false);
 },
 async 'Clear Recording keeps highlights, blackouts, octave, tuning and Loop'(){
   const t=await setup();t.track(true);t.click('preset-f');t.run('state.bars[4].highlight=3;state.octaveOffset=2');
   const before=t.run('JSON.stringify(createProject().setup)');t.click('btn-play');t.click('btn-clear-recording');t.advance(12);
   assert.equal(t.run('JSON.stringify(createProject().setup)'),before);assert.equal(t.run('seq.loop'),true);assert.equal(t.run('seq.track.length'),0);assert.equal(t.run('seq.playing'),false);
 },
 async 'Undo removes one complete overdub session at a time'(){
   const t=await setup();t.track(true);const base=t.run('JSON.stringify(seq.track)');t.click('btn-overdub');t.advance(10.2);t.run('handleNotePlay(2,329.63)');t.advance(11.2);t.run('handleNotePlay(4,392)');t.click('btn-overdub');
   const first=t.run('JSON.stringify(seq.track)');t.click('btn-overdub');t.advance(11.4);t.run('handleNotePlay(5,440)');
   assert.equal(t.run('seq.overdubHistory.length'),2);t.click('btn-undo-overdub');assert.equal(t.run('JSON.stringify(seq.track)'),first);assert.equal(t.run('seq.playing'),false);
   t.click('btn-undo-overdub');assert.equal(t.run('JSON.stringify(seq.track)'),base);assert.equal(t.run('seq.duration'),1);assert.equal(t.nodes.get('btn-undo-overdub').disabled,true);
 },
 async 'An empty overdub does not consume an undo step'(){
   const t=await setup();t.track(true);t.click('btn-overdub');t.advance(10.2);t.run('handleNotePlay(2,329.63)');t.click('btn-overdub');t.click('btn-overdub');t.click('btn-stop');t.click('btn-undo-overdub');assert.equal(t.run('seq.track.length'),2);
 },
 async 'Project JSON round trip preserves setup, sound, Loop and undo'(){
   const t=await setup();t.track(true);t.click('preset-f');t.run('state.bars[3].highlight=3;state.octaveOffset=-2');t.click('btn-overdub');t.advance(10.3);t.run('handleNotePlay(5,110)');t.click('btn-stop');
   const saved=t.run('JSON.stringify(createProject())');t.click('reset-btn');t.ctx.importData=JSON.parse(saved);t.run('loadProject(importData)');
   assert.equal(t.run('JSON.stringify(createProject())'),saved);assert.equal(t.run('seq.playing'),false);assert.equal(t.nodes.get('btn-undo-overdub').disabled,false);t.click('btn-undo-overdub');assert.equal(t.run('seq.track.length'),2);
 },
 async 'Invalid project data never changes current music or playback'(){
   const t=await setup();t.track(true);t.click('preset-c');t.click('btn-play');const before=t.run('JSON.stringify(createProject())');
   const mutations=[p=>p.version=99,p=>p.setup.bars.pop(),p=>p.setup.octaveOffset=5,p=>p.recording.duration=0,p=>p.recording.notes[0].freq=Infinity,p=>p.recording.notes[0].relativeTime=-1,p=>p.recording.notes[0].barIndex=13,p=>p.recording.notes[0].takeId=-2];
   for(const change of mutations){const p=JSON.parse(before);change(p);t.ctx.bad=p;assert.throws(()=>t.run('loadProject(bad)'));assert.equal(t.run('JSON.stringify(createProject())'),before);assert.equal(t.run('seq.playing'),true);}
 },
 async 'Save downloads a valid project, including the latest recording'(){
   const t=await setup();t.click('btn-rec');t.run('handleNotePlay(0,261.63)');t.advance(10.2);t.run('handleNotePlay(1,293.66)');t.click('btn-save-project');
   assert.equal(t.run('seq.recording'),false);assert.equal(t.downloads.length,1);assert.equal(t.downloads[0].filename,'xylophone-project.json');
   const p=JSON.parse(await t.downloads[0].blob.text());assert.equal(p.recording.notes.length,2);assert(p.recording.duration>p.recording.notes[1].relativeTime);t.ctx.saved=p;t.run('validateProject(saved)');
   t.advance(12);assert.equal(t.urls.size,0);
 },
 async 'Open file accepts settings-only projects and rejects malformed JSON atomically'(){
   const t=await setup();t.click('preset-g');const p=t.run('JSON.stringify(createProject())');t.click('reset-btn');
   t.ctx.fileEvent={target:{value:'chosen',files:[{size:p.length,name:'lesson.json',text:async()=>p}]}};await t.run('openProjectFile(fileEvent)');assert.equal(t.run('JSON.stringify(createProject())'),p);
   t.ctx.fileEvent={target:{value:'chosen',files:[{size:4,name:'bad.json',text:async()=>'{bad'}]}};await t.run('openProjectFile(fileEvent)');assert.equal(t.run('JSON.stringify(createProject())'),p);assert.equal(t.nodes.get('project-message').dataset.error,'true');
 },
 async 'Newer Open selection wins when two file reads finish out of order'(){
   const t=await setup();const base=t.run('JSON.stringify(createProject())');t.click('preset-c');const next=t.run('JSON.stringify(createProject())');
   let finishOld;t.ctx.oldEvent={target:{value:'old',files:[{size:base.length,name:'old.json',text:()=>new Promise(r=>finishOld=r)}]}};const pending=t.run('openProjectFile(oldEvent)');
   t.ctx.newEvent={target:{value:'new',files:[{size:next.length,name:'new.json',text:async()=>next}]}};await t.run('openProjectFile(newEvent)');finishOld(base);await pending;assert.equal(t.run('JSON.stringify(createProject())'),next);
 }
});
Object.assign(tests, {
 async 'Disabled bars are silent and cannot start or add to a recording'(){
   const t=await setup();t.run('state.bars[0].blackout=true;updateBarVisuals(0)');t.click('btn-rec');t.run('handleNotePlay(0,261.63)');
   assert.equal(t.run('seq.armed'),true);assert.equal(t.run('seq.track.length'),0);assert.equal(t.voices.length,0);
   t.run('state.bars[0].blackout=false;updateBarVisuals(0);handleNotePlay(0,261.63)');
   assert.equal(t.run('seq.recording'),true);assert.equal(t.run('seq.track.length'),1);assert.equal(t.voices.length,1);
   t.run('state.bars[0].blackout=true;updateBarVisuals(0);handleNotePlay(0,261.63)');
   assert.equal(t.run('seq.track.length'),1);assert.equal(t.run('soundingVoices.size'),0);
 },
 async 'Disabling a bar cancels lookahead playback and restores future loops'(){
   const t=await setup();t.track(true);t.click('btn-play');t.advance(10.47);
   const pending=t.voices.find(v=>v.startAt===10.5);assert(pending);
   t.run('state.bars[1].blackout=true;updateBarVisuals(1)');assert(pending.stopAt<pending.startAt);
   t.advance(11.7);assert.deepEqual(t.sounded(),[10,11]);
   t.run('state.bars[1].blackout=false;updateBarVisuals(1)');t.advance(12.7);assert.deepEqual(t.sounded(),[10,11,12,12.5]);assert.equal(t.run('seq.track.length'),2);
 },
 async 'Sliding skips disabled bars and continues across playable neighbors'(){
   const t=await setup();t.run('state.bars[1].blackout=true');
   const zone=i=>({closest(s){return s==='.middle-zone'?this:null},getAttribute(){return String(i)}});
   t.nodes.get('xylo-wrapper').events.pointerdown({pointerId:1,pointerType:'touch',target:zone(0),preventDefault(){}});
   t.advance(10.1);t.ctx.hit=zone(1);t.windowEvents.pointermove({pointerId:1,clientX:0,clientY:0});
   t.advance(10.2);t.ctx.hit=zone(2);t.windowEvents.pointermove({pointerId:1,clientX:0,clientY:0});
   assert.deepEqual(t.sounded(),[10,10.2]);assert.equal(t.voices[1].offset,t.manifest.notes[64-36].offset);assert(Math.abs(t.voices[1].playbackRate.value-1)<.001);
 },
 async 'Top screw toggles one highlight and old colors load as highlighted'(){
   const t=await setup();const zone={closest(s){return s==='.top-zone'?this:null},getAttribute(){return '0'}};
   const tap=()=>t.nodes.get('xylo-wrapper').events.pointerdown({pointerId:1,pointerType:'touch',target:zone});
   tap();assert.equal(t.run('state.bars[0].highlight'),1);tap();assert.equal(t.run('state.bars[0].highlight'),0);tap();assert.equal(t.run('state.bars[0].highlight'),1);
   t.run('var oldProject=createProject();oldProject.setup.bars[1].highlight=3;oldProject.setup.bars[2].highlight=2;loadProject(oldProject)');
   assert.equal(t.run('state.bars[1].highlight'),1);assert.equal(t.run('state.bars[2].highlight'),1);
 },
 async 'Theme selection persists without altering a playing project'(){
   const t=await setup();const store=new Map();t.ctx.window.localStorage={setItem(k,v){store.set(k,v)},getItem(k){return store.get(k)}};
   t.track(true);t.click('preset-c');t.click('btn-play');const original=t.run('JSON.stringify(createProject())');
   for(const name of ['studio','maple','warm']){t.click('theme-'+name);assert.equal(t.nodes.get('main-wrapper').dataset.theme,name);assert.equal(t.nodes.get('theme-'+name).getAttribute('aria-pressed'),'true');assert.equal(store.get('xylophone-theme'),name);assert.equal(t.run('JSON.stringify(createProject())'),original);assert.equal(t.run('seq.playing'),true);}
   t.run('setTheme("invalid")');assert.equal(t.nodes.get('main-wrapper').dataset.theme,'warm');
 }
});
Object.assign(tests, {
 async 'Reference scenes and fullscreen crops fit the viewport across themes'(){
   const t=await setup();
   for(const [width,height] of [[1440,900],[1920,1080],[1024,768]]) {
     t.ctx.window.innerWidth=width;t.ctx.window.innerHeight=height;
     for(const theme of ['warm','studio','maple']) {
       t.run(`setTheme('${theme}')`);const st=t.nodes.get('main-wrapper').style;
       assert(Math.abs(parseFloat(st.width)/parseFloat(st.height)-1672/941)<1e-10);
       assert(parseFloat(st.left)>=0);assert(parseFloat(st.top)>=0);
       t.click('fs-btn');const crop=JSON.parse(t.run('JSON.stringify(sceneCrops[mainWrapper.dataset.theme])'));const scale=parseFloat(st.width)/1672;
       const x=parseFloat(st.left)+crop[0]*scale,y=parseFloat(st.top)+crop[1]*scale;
       assert(x>=-1e-8 && y>=65);assert(x+crop[2]*scale<=width+1e-8);assert(y+crop[3]*scale<=height+1e-8);
       assert.equal(t.nodes.get('controls-panel').hidden,true);assert.equal(t.nodes.get('fullscreen-exit').hidden,false);
       t.click('fullscreen-exit');assert.equal(t.nodes.get('controls-panel').hidden,false);
     }
   }
 }
});
Object.assign(tests, {
 async 'Every octave and accidental selects its own marimba note at the requested pitch'(){
   const t=await setup();
   assert.equal(t.run('audioCtx.resumeCalls'),0); // Preload must not trigger autoplay.
   assert.equal(t.run('audioCtx.state'),'suspended');
   for(const octave of [-2,-1,0,1,2]) for(const accidentals of [false,true]) for(let bar=0;bar<13;bar++) {
     t.run(`state.octaveOffset=${octave};state.useBb=${accidentals};state.useFSharp=${accidentals}`);
     const freq=t.run(`getFrequency(${bar})`),midi=Math.round(69+12*Math.log2(freq/440));
     t.run(`handleNotePlay(${bar},getFrequency(${bar}))`);
     const voice=t.voices.at(-1),sample=t.manifest.notes[midi-36];
     assert.equal(voice.offset,sample.offset);assert.equal(voice.sampleDuration,sample.duration);
     assert(Math.abs(voice.playbackRate.value*440*Math.pow(2,(midi-69)/12)-freq)<1e-9);
     assert(voice.buffer===t.run('marimbaBuffer'));
   }
   assert.equal(t.run('audioCtx.resumeCalls'),1);
   assert.equal(t.run('audioCtx.state'),'running');
   assert.deepEqual(t.fetches,['assets/audio/marimba-notes-v1.json','assets/audio/marimba-notes-v1.flac']);
 },
 async 'Sound loading blocks silent recording and never queues delayed strikes'(){
   let finish;const t=await setup({wait:false,fetch:()=>new Promise(r=>finish=r)});
   t.click('btn-rec');t.run('handleNotePlay(0,261.63)');
   assert.equal(t.voices.length,0);assert.equal(t.run('seq.armed||seq.recording'),false);
   assert.equal(t.nodes.get('btn-rec').disabled,true);assert.equal(t.nodes.get('audio-status').hidden,false);
   t.ctx.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});
   finish({ok:true,json:async()=>t.manifest});await t.run('marimbaLoadPromise');
   assert.equal(t.nodes.get('audio-status').hidden,true);assert.equal(t.nodes.get('btn-rec').disabled,false);
   assert.equal(t.voices.length,0);t.run('handleNotePlay(0,261.63)');assert.equal(t.voices.length,1);
 },
 async 'A FLAC decode failure falls back to the same lossless WAV notes'(){
   let calls=0;const t=await setup({decode:async()=>{if(++calls===1)throw Error('Unsupported codec');return {numberOfChannels:1,duration:191.96408163265306}}});
   assert.equal(t.run('!!marimbaBuffer'),true);assert.equal(calls,2);
   assert.equal(t.fetches.at(-1),'assets/audio/marimba-notes-v1.wav');
   t.run('handleNotePlay(0,261.63)');assert.equal(t.voices.length,1);
 },
 async 'Failed sound downloads show Retry and a single retry recovers playback'(){
   const t=await setup({fetch:async()=>{throw Error('Offline')}});
   assert.equal(t.run('marimbaBuffer'),null);assert.equal(t.nodes.get('audio-retry').hidden,false);
   t.click('btn-rec');assert.equal(t.run('seq.armed'),false);
   let count=0;t.ctx.fetch=async()=>{count++;return {ok:true,json:async()=>t.manifest,arrayBuffer:async()=>new ArrayBuffer(1)}};
   t.click('audio-retry');const promise=t.run('marimbaLoadPromise');assert(promise===t.run('loadMarimba()'));
   await promise;assert.equal(count,2);assert.equal(t.run('!!marimbaBuffer'),true);assert.equal(t.nodes.get('audio-status').hidden,true);
 },
 async 'Corrupt sample offsets never become playable'(){
   const t=await setup();const manifest=JSON.parse(JSON.stringify(t.manifest));manifest.notes[3].offset=-1;
   t.ctx.badManifest=manifest;assert.throws(()=>t.run('validateMarimbaPack(badManifest,marimbaBuffer)'));
   manifest.notes[3].offset=t.manifest.notes[3].offset;manifest.notes[69].duration=100;
   assert.throws(()=>t.run('validateMarimbaPack(badManifest,marimbaBuffer)'));
 },
 async 'Reverb starts dry, changes only the wet path, and remembers its setting'(){
   const t=await setup();
   assert.equal(t.run('sound.reverbEnabled'),false);assert.equal(t.run('reverbWet.gain.value'),0);
   assert.equal(t.nodes.get('reverb-amount').disabled,true);
   t.nodes.get('reverb-toggle').events.change({target:{checked:true}});
   assert.equal(t.run('reverbWet.gain.value'),.12);assert.equal(t.nodes.get('reverb-amount').disabled,false);
   t.nodes.get('reverb-amount').events.input({target:{value:'23'}});
   assert.equal(t.run('reverbWet.gain.value'),.23);assert.equal(t.nodes.get('reverb-value').textContent,'23%');
   t.run('handleNotePlay(0,261.63)');const gain=t.voices[0].connections[0];assert.equal(gain.gain.value,1);
   assert.equal(gain.connections.length,2);assert(gain.connections.includes(t.run('masterCompressor')));
   assert(t.run('roomConvolver.buffer.duration')<=1.101);
   t.nodes.get('reverb-toggle').events.change({target:{checked:false}});
   assert.equal(t.run('reverbWet.gain.value'),0);assert.equal(gain.gain.value,1);
   const restored=await setup({preferences:{'xylophone-sound':JSON.stringify({reverbEnabled:true,reverbAmount:23})}});
   assert.equal(restored.run('reverbWet.gain.value'),.23);
   assert.equal(JSON.parse(t.storage.get('xylophone-sound')).reverbEnabled,false);
 },
 async 'Reverb is saved in projects; old projects and Reset All start dry'(){
   const t=await setup();t.run('sound.reverbEnabled=true;sound.reverbAmount=21;syncSoundUI(true)');
   t.ctx.saved=JSON.parse(t.run('JSON.stringify(createProject())'));t.click('reset-btn');
   assert.equal(t.run('sound.reverbEnabled'),false);assert.equal(t.run('sound.reverbAmount'),12);
   t.run('loadProject(saved)');assert.equal(t.run('sound.reverbEnabled'),true);assert.equal(t.run('reverbWet.gain.value'),.21);
   const before=t.run('JSON.stringify(createProject())');t.ctx.saved.sound.reverbAmount=200;
   assert.throws(()=>t.run('loadProject(saved)'));assert.equal(t.run('JSON.stringify(createProject())'),before);
   delete t.ctx.saved.sound;t.run('loadProject(saved)');assert.equal(t.run('sound.reverbEnabled'),false);
 },
 async 'Gap starts play on first bar entry and reentry, without repeated notes while dwelling'(){
   const t=await setup(),gap={closest(){return null}},bar={closest(s){return s==='.middle-zone'?this:null},getAttribute(){return '0'}};
   t.click('btn-rec');
   t.nodes.get('xylo-wrapper').events.pointerdown({pointerId:1,pointerType:'touch',target:gap,preventDefault(){}});
   assert.equal(t.voices.length,0);assert.equal(t.run('seq.armed'),true);assert.equal(t.run('activePointers.has(1)'),true);
   assert.equal(t.run('audioCtx.state'),'running');
   const move=hit=>{t.ctx.hit=hit;t.windowEvents.pointermove({pointerId:1,clientX:0,clientY:0})};
   t.advance(10.2);move(bar);move(bar);assert.equal(t.voices.length,1);assert.equal(t.run('seq.track.length'),1);
   t.advance(10.4);move(gap);move(bar);assert.equal(t.voices.length,2);assert.equal(t.run('seq.track.length'),2);
   t.windowEvents.pointerup({pointerId:1});move(gap);move(bar);assert.equal(t.voices.length,2);
 },
 async 'Two gap-start fingers stay independent across disabled bars and capture loss'(){
   const t=await setup(),gap={closest(){return null}};
   const bar=i=>({closest(s){return s==='.middle-zone'?this:null},getAttribute(){return String(i)}});
   const pad=t.nodes.get('xylo-wrapper');
   for(const id of [1,2]) pad.events.pointerdown({pointerId:id,pointerType:'touch',target:gap,preventDefault(){}});
   const move=(id,hit)=>{t.ctx.hit=hit;t.windowEvents.pointermove({pointerId:id,clientX:0,clientY:0})};
   t.run('state.bars[1].blackout=true');move(1,bar(1));assert.equal(t.voices.length,0);
   move(2,bar(2));assert.equal(t.voices.length,1);
   pad.events.lostpointercapture({pointerId:2});move(2,bar(3));assert.equal(t.voices.length,1);
   move(1,bar(0));assert.equal(t.voices.length,2);t.windowEvents.pointercancel({pointerId:1});
   move(1,bar(4));assert.equal(t.voices.length,2);assert.equal(t.run('activePointers.size'),0);
 },
 async 'Screw edits and unpressed mouse movement do not start a musical slide'(){
   const t=await setup(),pad=t.nodes.get('xylo-wrapper');
   for(const type of ['top','bottom']){
     const screw={closest(s){return s===`.${type}-zone`?this:null},getAttribute(){return '0'}};
     pad.events.pointerdown({pointerId:1,pointerType:'touch',target:screw});
     assert.equal(t.run('activePointers.size'),0);
   }
   const gap={closest(){return null}};
   pad.events.pointerdown({pointerId:2,pointerType:'mouse',button:2,target:gap});
   assert.equal(t.run('activePointers.size'),0);
   t.ctx.hit={closest(){return this},getAttribute(){return '1'}};
   t.windowEvents.pointermove({pointerId:3,clientX:0,clientY:0});assert.equal(t.voices.length,0);
 },
 async 'Stopping a live marimba tail fades and disconnects the voice promptly'(){
   const t=await setup();t.run('handleNotePlay(0,261.63)');const voice=t.voices[0];assert(voice.stopAt>12);
   t.advance(10.1);t.click('btn-stop');assert(voice.stopAt<=10.109);
   t.advance(10.11);assert.equal(t.run('soundingVoices.size'),0);assert.equal(voice.connections.length,0);
 }
});
(async()=>{let failed=0;for(const [name,fn] of Object.entries(tests)){try{await fn();console.log('PASS',name)}catch(e){failed++;console.error('FAIL',name,e.stack)}}process.exitCode=failed?1:0})()
