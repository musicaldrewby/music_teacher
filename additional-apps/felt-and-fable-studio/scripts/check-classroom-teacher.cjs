// Run the exact downloaded script in an isolated DOM/media fixture, including save-and-reopen.
const assert=require('assert/strict'),fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('public/js/classroom-player.js','utf8'),builder={};vm.createContext(builder);vm.runInContext(source,builder);
const settle=()=>new Promise(setImmediate);
const scene=i=>({name:'Scene '+i,caption:'Cue '+i,hold:1,manualHold:1,poster:'data:image/png;base64,AA==',video:'AAAA'});
function open(html){
 const nodes=new Map(),events={},downloads=[],blobs=new Map();let serial=0;
 const element=(id,tag='BUTTON')=>{
  if(nodes.has(id))return nodes.get(id);
  const n={id,tagName:tag,hidden:false,disabled:false,checked:true,value:id==='mode'?'manual':'0',currentTime:0,duration:12,paused:true,readyState:2,textContent:'',open:false,children:[],files:[],
   focus(){},load(){this.currentTime=0;queueMicrotask(()=>this.onloadeddata?.());},pause(){this.paused=true;this.onpause?.();},async play(){this.paused=false;},click(){if(this.tagName==='A')downloads.push({name:this.download,blob:blobs.get(this.href)});else if(!this.disabled)return this.onclick?.();},showModal(){this.open=true;},close(){this.open=false;},remove(){},removeAttribute(k){delete this[k];},setAttribute(k,v){this[k]=v;},append(...children){this.children.push(...children);for(const child of children)if(child.id)nodes.set(child.id,child);},replaceChildren(){this.children=[];}};
  nodes.set(id,n);return n;
 };
 const data=html.match(/<script type="application\/json" id="storyData">([\s\S]*?)<\/script>/)[1];element('storyData').textContent=data;
 const document={title:'',hidden:false,getElementById:element,createElement:tag=>element('generated-'+(++serial),tag.toUpperCase()),body:element('body','BODY'),addEventListener:(type,fn)=>events[type]=fn,documentElement:{requestFullscreen:async()=>{}},fullscreenElement:null};
 for(const id of ['stage','song'])element(id,id==='stage'?'VIDEO':'AUDIO');
 const player={document,window:{addEventListener:(type,fn)=>events[type]=fn},Blob,Uint8Array,console,atob:s=>Buffer.from(s,'base64').toString('binary'),setTimeout:()=>++serial,clearTimeout(){},requestAnimationFrame:fn=>{player.tick=fn;return ++serial;},cancelAnimationFrame(){},URL:{createObjectURL:blob=>{const url='blob:local-'+(++serial);blobs.set(url,blob);return url;},revokeObjectURL:url=>blobs.delete(url)},FileReader:class{async readAsDataURL(file){this.result='data:audio/mpeg;base64,'+Buffer.from(await file.arrayBuffer()).toString('base64');this.onload();}},Audio:class{constructor(){this.duration=12;}load(){if(this.src)queueMicrotask(()=>this.onloadedmetadata?.());}removeAttribute(k){delete this[k];}}};
 vm.createContext(player);const scripts=[...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)];assert.equal(scripts.length,2,'Safe, self-contained two-script document');vm.runInContext(scripts[1][1],player);
 return {el:element,player,events,downloads,html:()=>vm.runInContext('classroomHTML(JSON.parse(document.getElementById("storyData").textContent))',player)};
}
(async()=>{
 const original={version:2,title:'Test </script><script>bad()</script>',scenes:[scene(0),scene(1),scene(2)],music:null};
 const html=builder.classroomHTML(original);assert(!html.includes('<script>bad()'));assert(!/<script[^>]+src=|<link|https?:\/\//.test(html));assert(html.includes("default-src 'none'"));
 const {el,player,events,downloads}=open(html);await settle();
 assert(el('musicOption').disabled);assert.equal(el('mode').value,'manual');assert.equal(el('next').textContent,'Start story →');
 el('next').click();await settle();el('stage').currentTime=10;el('stage').ontimeupdate();assert.equal(el('stage').currentTime,1);assert(el('stage').paused);assert.equal(el('count').textContent,'1 / 3');
 el('teacher').click();el('audioFile').files=[Object.assign(new Blob(['song bytes'],{type:'audio/mpeg'}),{name:'My song.mp3'})];await el('audioFile').onchange();assert(el('songName').textContent.includes('My song.mp3'));assert(el('musicOption').disabled);assert(!el('recordTiming').disabled);
 await el('recordTiming').click();await settle();assert.equal(el('mode').value,'record');assert(!el('song').paused);assert(el('teacher').disabled);assert.equal(el('count').textContent,'1 / 3');
 el('song').currentTime=.02;el('next').click();assert.equal(el('count').textContent,'1 / 3');
 el('song').currentTime=3.25;el('next').click();await settle();assert.equal(el('count').textContent,'2 / 3');
 el('play').click();el('next').click();assert.equal(el('count').textContent,'2 / 3');assert(el('notice').textContent.includes('Resume'));
 await el('play').click();el('song').currentTime=6;el('next').click();await settle();assert.equal(el('next').textContent,'Finish timing ✓');assert(!el('next').disabled);
 el('back').click();await settle();assert.equal(el('count').textContent,'2 / 3');assert.equal(el('song').currentTime,3.25);
 el('song').currentTime=7;el('next').click();await settle();el('song').currentTime=10.5;el('next').click();assert.equal(el('mode').value,'music');assert(!el('musicOption').disabled);assert(el('song').paused);
 // Save the live changed data, then execute that new file (including its own packager).
 el('saveCopy').click();assert.equal(downloads.length,1);const saved=await downloads[0].blob.text();const savedData=JSON.parse(saved.match(/id="storyData">([\s\S]*?)<\/script>/)[1]);assert.deepEqual(savedData.music.starts,[0,3.25,7]);assert.equal(savedData.music.end,10.5);assert(savedData.music.src.startsWith('data:audio/mpeg;'));
 const reopened=open(saved);await settle();assert.equal(reopened.el('mode').value,'manual');assert(!reopened.el('musicOption').disabled);reopened.el('saveCopy').click();assert.equal(reopened.downloads.length,1);open(await reopened.downloads[0].blob.text());
 el('mode').value='music';el('mode').onchange();await el('play').click();el('song').currentTime=7.1;player.tick();await settle();assert.equal(el('count').textContent,'3 / 3');el('song').currentTime=10.5;player.tick();assert(el('song').paused);
 el('teacher').click();el('reviewTiming').click();el('cueTime1').value='8';el('cueApply').click();assert(el('cueDialog').open);assert(el('cueError').textContent.includes('0.1'));el('cueTime1').value='4';el('endTime').value='11';el('cueApply').click();assert(!el('cueDialog').open);
 await el('recordTiming').click();el('song').currentTime=2;el('next').click();el('cancelTake').click();assert.equal(el('mode').value,'manual');el('saveCopy').click();const cancelled=JSON.parse((await downloads.at(-1).blob.text()).match(/id="storyData">([\s\S]*?)<\/script>/)[1]);assert.deepEqual(cancelled.music.starts,[0,4,7]);assert.equal(cancelled.music.end,11);
 // A short/incomplete take also preserves the previous complete timing.
 await el('recordTiming').click();el('song').currentTime=12;el('song').onended();assert.equal(el('mode').value,'manual');assert(el('notice').textContent.includes('before every cue'));assert(!el('musicOption').disabled);
 // Natural audio end finishes a take once all cues have been marked.
 await el('recordTiming').click();el('song').currentTime=4;el('next').click();el('song').currentTime=8;el('next').click();el('song').currentTime=12;el('song').onended();assert.equal(el('mode').value,'music');
 // Bad replacement audio leaves the existing song and timing in place.
 el('teacher').click();const prior=el('songName').textContent;player.Audio=class{load(){if(this.src)queueMicrotask(()=>this.onerror?.());}removeAttribute(k){delete this[k];}};el('audioFile').files=[Object.assign(new Blob(['bad']),{name:'bad.mp3'})];await el('audioFile').onchange();assert.equal(el('songName').textContent,prior);assert(!el('musicOption').disabled);assert(el('setupStatus').textContent.includes('could not play'));
 player.Audio=class{constructor(){this.duration=20;}load(){if(this.src)queueMicrotask(()=>this.onloadedmetadata?.());}removeAttribute(k){delete this[k];}};el('audioFile').files=[Object.assign(new Blob(['replacement'],{type:'audio/mpeg'}),{name:'Replacement.mp3'})];await el('audioFile').onchange();assert(el('musicOption').disabled);assert.equal(el('mode').value,'manual');assert(el('songName').textContent.includes('Replacement'));
 let prevented=false;events.beforeunload({preventDefault(){prevented=true;}});assert(prevented);el('saveCopy').click();prevented=false;events.beforeunload({preventDefault(){prevented=true;}});assert(!prevented);
 el('removeSong').click();assert(el('musicOption').disabled);assert(el('recordTiming').disabled);assert(el('songName').textContent.includes('No song'));el('teacherClose').click();
 const key={key:' ',code:'Space',target:el('next'),repeat:false,preventDefault(){}};events.keydown(key);await settle();key.repeat=true;events.keydown(key);assert.equal(el('count').textContent,'1 / 3');key.repeat=false;events.keydown(key);assert.equal(el('count').textContent,'2 / 3');
 // Version 1 exports with existing timing still work through the current player.
 const legacy=open(builder.classroomHTML({...original,version:1,music:{src:'data:audio/mpeg;base64,AA==',starts:[0,3,6],end:9,volume:.5}}));await settle();assert(!legacy.el('musicOption').disabled);
 console.log('PASS: standalone audio import, invalid-file preservation, manual holds, recording/pause/back/cancel/end, cue edits, auto follow, safe save-and-reopen twice, dirty state, audio replacement, keyboard repeat, legacy timing. Real browser decoding is not simulated.');
})().catch(e=>{console.error(e);process.exit(1)});
