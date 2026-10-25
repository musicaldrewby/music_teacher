import test from 'node:test';
import assert from 'node:assert/strict';
import { FINGERINGS, DEFAULTS, SONG_LIBRARY } from '../dist/data.js';
import { SOPRANO_KEYS, frequency, parseNoteOrder, validateProject, defaultProject, createSafeStorage, eventsToNotes, makeTimeline, stackBounds } from '../dist/core.js';
import { AudioEngine } from '../dist/audio.js';
test('all 15 original songs have playable, finite notes and durations',()=>{
 assert.equal(SONG_LIBRARY.length,15);
 for(const song of SONG_LIBRARY) for(const n of song.notes){assert.ok(n.d>0 && Number.isFinite(n.d),song.title);if(n.k){assert.ok(SOPRANO_KEYS.includes(n.k),song.title+': '+n.k);assert.ok(frequency(n.k)>0);}}
 for(const list of Object.values(DEFAULTS))for(const k of list){assert.equal(FINGERINGS[k].length,10);assert.ok(frequency(k)>0);}
});
test('note lists reject unknown/empty/wrong instrument input and normalize flats/alto',()=>{
 assert.deepEqual(parseNoteOrder('B5, A5, G5, Bb5, B-5','soprano'),['B5','A5','G5','B-5']);
 assert.deepEqual(parseNoteOrder('E5, D5, C5, Bb4','alto'),['E5_A','D5_A','C5_A','B-4']);
 assert.throws(()=>parseNoteOrder('X5','soprano'));assert.throws(()=>parseNoteOrder(' , ','soprano'));assert.throws(()=>parseNoteOrder('C4','soprano'));assert.throws(()=>parseNoteOrder('C6','alto'));
});
test('legacy backups import and new backups round-trip the stack and preferences',()=>{
 const legacy={meta:{appName:'RadicalRecorder',version:'1.0'},settings:{sopranoOrder:'B5, A5, G5',showHz:true,hidePresets:true},library:[{title:'My song',notes:[{k:'B5',d:300},{k:null,d:0},{k:null,d:150},{k:'A5',d:300}]}]};
 const p=validateProject(legacy);assert.equal(p.settings.showHz,true);assert.equal(p.library[0].notes.length,3);
 p.stack=[{id:'arbitrary',key:'G5',x:55,y:66}];p.settings.speed=80;
 const round=validateProject(JSON.parse(JSON.stringify(p)));assert.equal(round.stack[0].x,55);assert.equal(round.settings.speed,80);assert.equal(round.library[0].title,'My song');
});
test('malformed imports fail before replacement',()=>{
 for(const notes of [[{k:'<img>',d:500}],[{k:'B5',d:-50}],[{k:'B5',d:NaN}],[{k:'B5',d:'500'}],[{k:null,d:300}],[]]) {const p=defaultProject();p.library=[{title:'x',notes}];assert.throws(()=>validateProject(p));}
 assert.throws(()=>validateProject({meta:{appName:'Other'},library:[]}));
 const invalidBool=defaultProject();invalidBool.settings.showHz='false';assert.throws(()=>validateProject(invalidBool));
 const invalidStack=defaultProject();invalidStack.stack=[{key:'<script>',x:0,y:0}];assert.throws(()=>validateProject(invalidStack));
 const title=defaultProject();title.library=[{title:'<img src=x onerror=alert(1)>',notes:[{k:'B5',d:200}]}];assert.equal(validateProject(title).library[0].title,title.library[0].title); // Titles remain plain text at render time.
});
test('blocked storage keeps session edits even when stale persisted values exist',()=>{
 let warnings=0;const store=createSafeStorage(()=>({getItem:()=> 'old',setItem:()=>{throw Error('quota')}}),()=>warnings++);
 assert.equal(store.get('x'),'old');assert.equal(store.set('x','new'),false);assert.equal(store.get('x'),'new');store.set('x','newer');assert.equal(warnings,1);
 const blocked=createSafeStorage(()=>{throw Error('blocked')},()=>warnings++);assert.equal(blocked.get('a'),null);blocked.set('a','saved for session');assert.equal(blocked.get('a'),'saved for session');
});
test('recordings preserve note durations and interior rests and trim trailing silence',()=>{
 assert.deepEqual(eventsToNotes([{k:'B5',t:0},{k:null,t:300},{k:null,t:300},{k:'A5',t:450},{k:null,t:600},{k:null,t:1000}]),[{k:'B5',d:300},{k:null,d:150},{k:'A5',d:150}]);
 assert.deepEqual(eventsToNotes([]),[]);
});
test('tempo transforms notes and rests uniformly; drag bounds keep full notes visible',()=>{
 assert.deepEqual(makeTimeline([{k:'B5',d:600},{k:null,d:300}],50),[{key:'B5',start:0,end:1.2},{key:null,start:1.2,end:1.7999999999999998}]);
 const bounds=stackBounds(360,550,80,90);assert.equal(bounds.minX,48);assert.equal(bounds.maxX,312);assert.equal(bounds.minY,150);assert.equal(bounds.maxY,502);
});
class FakeParam { constructor(){this.value=0;this.events=[];} setValueAtTime(v,t){assert.ok(t>=0);this.value=v;this.events.push([v,t]);} linearRampToValueAtTime(v,t){this.setValueAtTime(v,t);} cancelAndHoldAtTime(){} }
class FakeContext {
 state='running';currentTime=0;destination={};nodes=[];
 createOscillator(){const n={frequency:new FakeParam(),setPeriodicWave(wave){this.wave=wave;},started:false,connect(){},disconnect(){this.disconnected=true;},start(t){this.started=true;this.startTime=t;},stop(t){assert.ok(this.started,'must start an oscillator before stopping it');this.stopTime=t;}};this.nodes.push(n);return n;}
 sampleRate=44100;
 createPeriodicWave(real,imag){return {real,imag};}
 createBuffer(channels,length){const data=new Float32Array(length);return {getChannelData:()=>data};}
 createBufferSource(){return this.createOscillator();}
 createBiquadFilter(){return {frequency:new FakeParam(),Q:new FakeParam(),connect(){},disconnect(){this.disconnected=true;}};}
 createGain(){return {gain:new FakeParam(),connect(){},disconnect(){this.disconnected=true;}};}
 async resume(){this.state='running';}
}
test('audio handles very short notes, silent rests, stops, and node cleanup',async()=>{
 globalThis.AudioContext=FakeContext;const engine=new AudioEngine();assert.equal(await engine.ready(),true);
 const voice=engine.play(880,0,.005);assert.equal(engine.voices.size,1);assert.ok(voice.osc.stopTime>voice.osc.startTime);engine.play(0,0,.1);assert.equal(engine.voices.size,1);
 engine.stop();for(const source of voice.sources)source.onended();assert.equal(engine.voices.size,0);assert.equal(voice.osc.disconnected,true);assert.equal(voice.gain.disconnected,true);
 delete globalThis.AudioContext;
});
test('themes survive backups, default old files to oak, and reject unknown values',()=>{
 for(const theme of ['oak','walnut','ivory']){const project=defaultProject();project.settings.theme=theme;const restored=validateProject(JSON.parse(JSON.stringify(project)));assert.equal(restored.settings.theme,theme);}
 const legacy=defaultProject();delete legacy.settings.theme;assert.equal(validateProject(legacy).settings.theme,'oak');
 legacy.settings.theme='unexpected';assert.throws(()=>validateProject(legacy),/theme/);
});
test('recorder voice releases tone and breath, while count-in stays distinct',async()=>{
 const previous=globalThis.AudioContext;globalThis.AudioContext=FakeContext;
 try {
  const engine=new AudioEngine();await engine.ready();
  const voice=engine.play(880,0,.3);assert.equal(voice.sources.length,2);assert.equal(voice.osc.wave.imag[1],1);
  assert.ok(voice.osc.wave.imag[2]<.2);assert.ok(voice.points.every((p,i,a)=>i===0||p[0]>=a[i-1][0]));
  const click=engine.click(true,.1);assert.equal(click.sources.length,1);assert.equal(click.osc.type,'sine');
  engine.context.currentTime=.012;
  voice.gain.gain.cancelAndHoldAtTime=undefined;
  voice.gain.gain.cancelScheduledValues=()=>{};
  assert.ok(engine.levelAt(voice,.012)>0);engine.stop();
  assert.equal(voice.gain.gain.events.at(-2)[0],engine.levelAt(voice,.012));
  for(const source of [...voice.sources,...click.sources]){assert.ok(Math.abs(source.stopTime-.042)<1e-9);source.onended();}
  assert.equal(engine.voices.size,0);assert.ok(voice.nodes.every(n=>n.disconnected));
  const future=engine.play(1000,1,.2);assert.equal(engine.levelAt(future,.012),0);engine.stop();
  assert.ok(future.sources.every(n=>n.stopTime<n.startTime));
  for(const source of future.sources)source.onended();assert.equal(engine.voices.size,0);
 }finally{globalThis.AudioContext=previous;}
});
