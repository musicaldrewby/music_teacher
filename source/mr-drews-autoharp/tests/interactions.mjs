// Run the real app and scene event handlers with a small DOM/audio test host.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {STRINGS,chordAllows} from '../dist/music.js';
import {sceneGeometry} from '../dist/scene-math.js';
const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
let document,audio;const imageLoads=[],frames=new Map();let frameId=0;
class Element{
  constructor(tag='div',attrs={}){
    this.tagName=tag.toUpperCase();this.attrs=attrs;this.id=attrs.id;this.hidden='hidden' in attrs;this.value=attrs.value||'';
    this.dataset={};this.children=[];this.listeners={};this.style={setProperty(){}};this.classes=new Set();
    this.classList={add:name=>this.classes.add(name),remove:name=>this.classes.delete(name),toggle:(name,active)=>active?this.classes.add(name):this.classes.delete(name)};
    for(const [key,value] of Object.entries(attrs))if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=value;
  }
  setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k];}
  addEventListener(name,fn,capture=false){(this.listeners[name]??=[]).push({fn,capture});}
  append(el){this.children.push(el);el.parent=this;}replaceChildren(...els){this.children=[];els.forEach(el=>this.append(el));}
  contains(el){return el===this||this.children.some(child=>child.contains?.(el));}
  closest(selector){if(selector==='button'&&this.tagName==='BUTTON'||selector==='#'+this.id)return this;return this.parent?.closest(selector)||null;}
  focus(){document.activeElement=this;}
  showModal(){this.open=true;}close(){this.open=false;fire(this,'close');}
  setPointerCapture(){}getBoundingClientRect(){return {width:1024,height:768};}
  getScreenCTM(){return {inverse(){return {};}};}
  pause(){this.paused=true;}load(){}
  decode(){return new Promise((resolve,reject)=>imageLoads.push({resolve,reject}));}
}
const elements={},all=[];
for(const match of html.matchAll(/<([a-z][\w-]*)\b([^>]*)>/g)){
  const attrs=Object.fromEntries([...match[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(m=>[m[1],m[2]??'']));
  const element=new Element(match[1],attrs);all.push(element);if(element.id)elements[element.id]=element;
}
const $=id=>elements[id];
for(const id of ['closeOptions','soundTab','playingTab','sceneTab','presetSelect','volume','tone','reverb','strength','chordSelect','sceneSelect'])$('optionsPanel').append($(id));
document=new Element('document');document.activeElement=new Element('body');document.documentElement=new Element('html');
document.getElementById=$;document.createElement=tag=>new Element(tag);document.createElementNS=(_,tag)=>new Element(tag);document.createTextNode=text=>({textContent:text});
document.querySelectorAll=selector=>selector==='#chordBoard button'?$('chordBoard').children:all.filter(el=>selector==='[data-mode]'?'mode' in el.dataset:selector==='[data-options-tab]'?'optionsTab' in el.dataset:false);
function fire(target,type,values={}){
  const event={target,key:'',button:0,pointerType:'mouse',pointerId:1,timeStamp:1,clientX:0,clientY:0,detail:1,preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.stopped=true;},...values};
  if(target!==document)for(const {fn,capture} of document.listeners[type]||[])if(capture)fn(event);
  for(const {fn} of target.listeners[type]||[])fn(event);
  if(target!==document&&!event.stopped)for(const {fn,capture} of document.listeners[type]||[])if(!capture)fn(event);
  return event;
}
const window=new Element('window');window.matchMedia=()=>({matches:false});
let mediaRecorder;
class FakeMediaRecorder{
  static isTypeSupported(type){return type==='audio/mp4';}
  constructor(stream,options){mediaRecorder=this;this.stream=stream;this.mimeType=options.mimeType;this.state='inactive';}
  start(){this.state='recording';}
  stop(){this.state='inactive';queueMicrotask(()=>{this.ondataavailable({data:new Blob(['recorded sound'],{type:this.mimeType})});this.onstop();});}
}
class FakeAudio{
  constructor(){audio=this;this.ready=true;this.presetId='dulcimer';this.settings={volume:.7,tone:.55,reverb:.2};this.plucks=[];this.master={connect(){},disconnect(){}};this.ctx={state:'running',currentTime:0,resume:async()=>{this.ctx.state='running';},createMediaStreamDestination:()=>({stream:{getTracks:()=>[{stop(){}}]}})};}
  setChord(chord){this.chord=chord;}setSettings(values){Object.assign(this.settings,values);}setMuted(value){this.muted=value;}dampAll(){}
  pluck(i){if(!chordAllows(this.chord,STRINGS[i]))return false;this.plucks.push(i);return true;}
}
const context=vm.createContext({console,document,window,performance,Blob,URL,MediaRecorder:FakeMediaRecorder,localStorage:{getItem:()=>null,setItem(){}},
  ResizeObserver:class{observe(){}},DOMPoint:class{constructor(x,y){this.x=x;this.y=y;}matrixTransform(){return this;}},
  setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId;},cancelAnimationFrame:id=>frames.delete(id)});
const cache=new Map();
function moduleFor(url){
  const path=new URL(url);path.search='';const key=path.href;if(cache.has(key))return cache.get(key);
  const module=path.pathname.endsWith('/engine.js')?new vm.SyntheticModule(['AutoharpAudio'],function(){this.setExport('AutoharpAudio',FakeAudio);},{context,identifier:key}):new vm.SourceTextModule(fs.readFileSync(path,'utf8'),{context,identifier:key});
  cache.set(key,module);return module;
}
const app=moduleFor(new URL('../dist/app.js',import.meta.url));await app.link((specifier,parent)=>moduleFor(new URL(specifier,parent.identifier)));await app.evaluate();
const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
const frame=(advance=1000)=>{const batch=[...frames.values()];frames.clear();for(const fn of batch)fn(performance.now()+advance);};
const key=value=>fire(document.activeElement,'keydown',{key:value});
const change=(control,value)=>{control.focus();control.value=value;fire(control,'change');};
async function playsFromKeyboard(){key('5');assert.equal(audio.chord.name,'G');const before=audio.plucks.length;key(' ');await settle();assert.ok(audio.plucks.length>before,'Space must strum after returning from a menu');key('ArrowUp');await settle();assert.ok(audio.plucks.length>before+1);fire(document,'keyup',{key:'5'});}

fire($('welcomePlay'),'click');await settle();assert.equal(document.activeElement,$('scene'));
assert.equal(audio.chord.name,'C','Latch starts with C selected');
assert.equal(audio.presetId,'dulcimer');
const mode=value=>all.find(el=>el.dataset.mode===value);
assert.equal(mode('latch').attrs['aria-pressed'],'true');
fire(mode('hold'),'click');
for(const id of ['scenePhoto','scenePhotoClassroom','scenePhotoManor','scenePhotoStorm']){
  const faces=$(id+'Layer').children.at(-1).children;
  assert.equal(faces.length,21);assert.deepEqual(faces.map(face=>face.textContent),['E♭','B♭','F','C','G','D','A','F7','C7','G7','D7','A7','E7','B7','A♭','B♭7','Cm','Gm','Dm','Am','Em']);
}
const beforeBars=audio.plucks.length;
key('4');assert.equal(audio.chord.name,'C');assert.equal(audio.plucks.length,beforeBars,'A bar damps; pressing it does not strum');
key('h');assert.equal(audio.chord.name,'C + Am');assert.equal($('chordSelect').value,'held');
assert.equal($('chordBoard').children[3].attrs['aria-pressed'],'true');assert.equal($('chordBoard').children[19].attrs['aria-pressed'],'true');
assert.deepEqual(STRINGS.filter(midi=>chordAllows(audio.chord,midi)),[60,64,72,76,84]);
fire(document,'keyup',{key:'h'});assert.equal(audio.chord.name,'C');
// Two different fingers/keys may hold the same physical bar.
fire($('chordBoard').children[3],'pointerdown',{pointerId:42,pointerType:'touch'});
fire(document,'keyup',{key:'4'});assert.equal(audio.chord.name,'C');
fire($('chordBoard').children[3],'pointercancel',{pointerId:42});assert.equal(audio.chord,null);
fire($('chordBoard').children[3],'pointerdown',{pointerId:31,pointerType:'touch'});
fire($('chordBoard').children[5],'pointerdown',{pointerId:32,pointerType:'touch'});
assert.equal(STRINGS.filter(midi=>chordAllows(audio.chord,midi)).length,0,'C and D bars together damp every string');
fire($('chordBoard').children[3],'lostpointercapture',{pointerId:31});assert.equal(audio.chord.name,'D');
fire(window,'blur');assert.equal(audio.chord,null);
fire(mode('latch'),'click');key('4');fire(document,'keyup',{key:'4'});assert.equal(audio.chord.name,'C','Latch remains available');
fire(mode('hold'),'click');assert.equal(audio.chord,null);

// The user's exact path: choose a room, then immediately use chord/strum keys.
change($('sceneQuickSelect'),'manor');assert.equal(document.activeElement,$('scene'));await playsFromKeyboard();
imageLoads.shift().resolve();await settle();
assert.equal(imageLoads.length,1,'The first layered room waits for its shared wood texture');
imageLoads.shift().resolve();await settle();frame();await playsFromKeyboard();
assert.equal($('sceneQuickSelect').value,'manor');
// Same room, failed image, and a picker restoring focus cannot strand the keys.
change($('sceneQuickSelect'),'manor');assert.equal(document.activeElement,$('scene'));
change($('sceneQuickSelect'),'storm');$('sceneQuickSelect').focus();frame();assert.equal(document.activeElement,$('scene'));
imageLoads.shift().reject(new Error('offline'));await settle();assert.equal($('sceneQuickSelect').value,'manor');await playsFromKeyboard();
// Choosing a room in Options dismisses the panel before loading completes.
fire($('optionsBtn'),'click');assert.equal($('optionsPanel').hidden,false);
change($('sceneSelect'),'classroom');assert.equal($('optionsPanel').hidden,true);assert.equal(document.activeElement,$('scene'));
imageLoads.shift().resolve();await settle();frame();await playsFromKeyboard();
// Fields keep their normal typing behavior until explicitly dismissed.
fire($('optionsBtn'),'click');$('presetSelect').focus();const before=audio.chord;key('1');assert.equal(audio.chord,before);
key('Escape');assert.equal($('optionsPanel').hidden,true);assert.equal(document.activeElement,$('scene'));await playsFromKeyboard();
fire($('optionsBtn'),'click');fire($('closeOptions'),'click');await playsFromKeyboard();
// One tap both dismisses Options and plays; preventDefault must not retain select focus.
fire($('optionsBtn'),'click');$('sceneSelect').focus();const plucks=audio.plucks.length;
fire($('stringSurface'),'pointerdown',{clientX:804.3549343028325,clientY:530});
fire($('stringSurface'),'pointermove',{clientX:1160,clientY:530,timeStamp:20});
fire($('stringSurface'),'pointerup');assert.equal($('optionsPanel').hidden,true);assert.equal(document.activeElement,$('scene'));assert.ok(audio.plucks.length>plucks);
$('sceneQuickSelect').focus();fire($('chordBoard').children[3],'pointerdown');assert.equal(document.activeElement,$('scene'));assert.equal(audio.chord.name,'C');
fire($('chordBoard').children[3],'pointerup');await playsFromKeyboard();
// Buttons and guide dismissal also hand the keyboard back to the instrument.
$('downBtn').focus();fire($('downBtn'),'click');await settle();await playsFromKeyboard();
fire($('helpBtn'),'click');$('startPlaying').focus();fire($('startPlaying'),'click');await playsFromKeyboard();
// Record keeps the keyboard playable and delivers a usable download link.
fire($('recordBtn'),'click');fire($('recordBtn'),'click');await settle();assert.equal($('recordLabel').textContent,'Stop');assert.equal(mediaRecorder.state,'recording');assert.equal($('recordTimer').hidden,false);await playsFromKeyboard();
change($('sceneQuickSelect'),'sunlit');imageLoads.shift().resolve();await settle();frame();assert.equal(mediaRecorder.state,'recording');await playsFromKeyboard();
fire($('recordBtn'),'click');await settle();assert.equal($('recordLabel').textContent,'Record');assert.equal($('recordResult').hidden,false);assert.ok($('recordDownload').href.startsWith('blob:'));assert.ok($('recordDownload').download.endsWith('.m4a'));assert.equal($('recordPlayback').src,$('recordDownload').href);await playsFromKeyboard();
const firstURL=$('recordDownload').href;fire($('closeRecording'),'click');assert.equal($('recordResult').hidden,true);fire($('lastRecordingBtn'),'click');assert.equal($('recordResult').hidden,false);
$('recordPlayback').focus();const playbackPlucks=audio.plucks.length;key(' ');await settle();assert.equal(audio.plucks.length,playbackPlucks,'Native playback keys must not strum the live instrument');
fire($('recordBtn'),'click');await settle();assert.equal($('recordPlayback').paused,true);assert.equal($('recordDownload').href,firstURL,'Keep the previous take until the new one finishes');
document.hidden=true;fire(document,'visibilitychange');await settle();assert.equal($('recordLabel').textContent,'Record');assert.equal($('recordResult').hidden,false);assert.notEqual($('recordDownload').href,firstURL);document.hidden=false;
audio.muted=true;fire($('recordBtn'),'click');await settle();assert.equal($('recordLabel').textContent,'Record');assert.match($('toast').textContent,/Turn the sound on/);audio.muted=false;
// Auto accompaniment follows manual chord changes and shares the recording bus.
fire(mode('latch'),'click');
fire($('autoQuickBtn'),'click');assert.equal($('optionsPanel').hidden,false);assert.equal($('strumTab').attrs['aria-selected'],'true');
for(const id of ['steady','down-up','folk','boom-chick','waltz','swing','six-eight','arpeggio']){
  change($('autoPattern'),id);fire($('autoStart'),'click');await settle();assert.equal($('autoStart').attrs['aria-pressed'],'true');
  fire($('chordBoard').children[4],'pointerdown');fire($('chordBoard').children[4],'pointerup');assert.equal(audio.chord.name,'G');assert.equal($('autoNow').hidden,false,'Chord changes must not stop auto strum');
  fire($('dampBtn'),'click');assert.equal($('autoStart').attrs['aria-pressed'],'false');assert.equal($('autoNow').hidden,true);
}
change($('autoTempoNumber'),'999');assert.equal($('autoTempoNumber').value,'180');
change($('autoTempoNumber'),'100');fire($('autoStart'),'click');await settle();
fire($('recordBtn'),'click');await settle();assert.equal(mediaRecorder.state,'recording');assert.equal($('autoNow').hidden,false,'Starting recording must preserve the accompaniment');
fire($('recordBtn'),'click');await settle();
fire($('autoQuickBtn'),'click');assert.equal($('autoNow').hidden,true);
fire($('autoStart'),'click');await settle();$('autoTempoNumber').focus();key('Escape');assert.equal($('autoNow').hidden,true);
fire($('autoStart'),'click');await settle();document.hidden=true;fire(document,'visibilitychange');assert.equal($('autoNow').hidden,true);document.hidden=false;
// Stop or Damp must cancel a start while audio is still resuming.
let resume;audio.ctx.state='suspended';audio.ctx.resume=()=>new Promise(resolve=>{resume=()=>{audio.ctx.state='running';resolve();};});
fire($('autoStart'),'click');fire($('dampBtn'),'click');resume();await settle();assert.equal($('autoNow').hidden,true);
console.log('PASS: eight selectable patterns, live chord changes, recording during auto strum, tempo limits, quick Stop, Escape, background stop, and cancel during audio resume.');
// Every room gets its own paths and exact hit targets, including simultaneous
// neighboring strands. A scene change must clear the old glow before repainting.
for(const id of ['classroom','manor','storm','sunlit']){
  change($('sceneQuickSelect'),id);imageLoads.shift().resolve();await settle();
  assert.ok($('stringGlows').children.every(path=>Number(path.style.opacity)===0),'Clear old glow immediately');
  assert.equal(Number($('harp').style.opacity),0,'New overlay starts with its incoming photo');assert.equal(Number($('chordBoard').style.opacity),0);
  frame();assert.equal(Number($('harp').style.opacity),1);
  fire($('openBtn'),'click');
  const g=sceneGeometry(id),paths=$('stringGlows').children;assert.equal(paths.length,g.segments.length);
  // Upper strands 9 and 10 share a sampled pitch; both must keep their own glow.
  for(const index of [9,10,54]){
    const s=g.segments[index],x=(s.x0+s.x1)/2,y=(s.y0+s.y1)/2;
    fire($('stringSurface'),'pointerdown',{pointerType:'touch',pointerId:index,clientX:x,clientY:y});
    fire($('stringSurface'),'pointerup',{pointerId:index});
    frame(10);assert.ok(Number(paths[index].style.opacity)>0);
    assert.ok(paths[index].attrs.d.startsWith(`M${s.x0},${s.y0}Q`));
    assert.ok(paths[index].attrs.d.endsWith(` ${s.x1},${s.y1}`));
  }
  assert.deepEqual(paths.flatMap((path,i)=>Number(path.style.opacity)>0?[i]:[]),[9,10,54],'Only the touched strands glow');
}
console.log('PASS: 21 correct visible labels in every room, Latch default, seventh chords, intersecting keyboard/touch bars, duplicate holds, cancellation, no automatic chord strum, optional Latch, and Dulcimer default.');
URL.revokeObjectURL($('recordDownload').href);
console.log('PASS: all four scene overlays follow their own incoming image, touch selects each measured strand, adjacent strands glow independently, and scene changes immediately clear old highlights.');
console.log('PASS: scene dropdown focus recovery, immediate keyboard playing during loads, same-scene choice, image failure, native picker focus restoration, Options dismissal, Escape from fields, single-tap touch playing, and help/play-button focus recovery.');
console.log('PASS: record/play/stop/download UI, keyboard playing while recording, scene changes during a take, retained previous download, review reopening, background auto-stop, playback controls, and muted-start recovery.');
