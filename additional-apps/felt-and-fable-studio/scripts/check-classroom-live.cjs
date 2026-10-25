const fs=require('fs'),path=require('path'),assert=require('assert'),vm=require('vm');
const {createCanvas,Image,Path2D}=require('@napi-rs/canvas'),h=require('./app-harness.cjs');
const out=path.resolve(__dirname,'../.sites-runtime/classroom-live-review');fs.mkdirSync(out,{recursive:true});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const getData=html=>JSON.parse(html.match(/id="storyData">([\s\S]*?)<\/script>/)[1]);
async function open(html){
 const markup=path.join(out,'markup.html');fs.writeFileSync(markup,html.replace(/<script(?: [^>]*)?>[\s\S]*?<\/script>/g,''));
 const {document,elements}=require('./dom-fixture.cjs')(markup);const data=document.createElement('script');data.setAttribute('id','storyData');data.textContent=JSON.stringify(getData(html));
 const song=elements.get('song');Object.assign(song,{paused:true,currentTime:0,duration:90,load(){},pause(){this.paused=true;this.onpause?.();},async play(){this.paused=false;}});
 let time=0,serial=0;const rafs=new Map(),downloads=[],blobs=new Map(),events={};const create=document.createElement;
 document.createElement=tag=>{const e=create(tag);if(tag==='a')e.click=()=>downloads.push(blobs.get(e.href));return e;};
 const context={document,Image,Path2D,console,Blob,Uint8Array,performance:{now:()=>time},devicePixelRatio:1,setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:fn=>{rafs.set(++serial,fn);return serial;},cancelAnimationFrame:id=>rafs.delete(id),addEventListener:(name,fn)=>events[name]=fn,ResizeObserver:class{observe(){}disconnect(){}},URL:{createObjectURL:b=>{const id='blob:'+ ++serial;blobs.set(id,b);return id},revokeObjectURL:id=>blobs.delete(id)}};context.window=context;context.FileReader=class{async readAsDataURL(file){this.result="data:audio/mpeg;base64,"+Buffer.from(await file.arrayBuffer()).toString("base64");this.onload();}};context.Audio=class{constructor(){this.duration=90;}load(){if(this.src)queueMicrotask(()=>this.onloadedmetadata?.());}removeAttribute(k){delete this[k];}};
 vm.createContext(context);const runtime=[...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)][1][1];vm.runInContext(runtime,context);
 for(let i=0;i<30;i++)await settle();
 const advance=async ms=>{time+=ms;const queue=[...rafs.values()];rafs.clear();for(const fn of queue)fn(time);await settle();};
 return{context,el:id=>elements.get(id),downloads,events,advance,rafs};
}
(async()=>{
 await h.ready;h.click('welcomeStart');h.context.downloads=[];h.run('download=(blob,name)=>downloads.push({blob,name});mp4Support=()=>{throw Error("Live export must not use a video encoder")};');
 const fixtures=['skin-and-bones-basic','skin-and-bones','dark-dark-wood','acting-wardrobe','rope-workshop','wolf-door'];let basicHTML,frames=0;
 for(const name of fixtures){
  h.context.fixture=JSON.parse(fs.readFileSync(path.join(h.root,'examples',name+'.felt.json'),'utf8'));
  await h.run('state=audioDefaults(copy(fixture));validateProject(state);loadImports()');
  h.el('classroomFormat').value='live';h.run('classroomOpen()');await h.run('classroomBeginExport()');
  assert(h.el('classroomStatus').textContent.startsWith('Live artwork story downloaded'),h.el('classroomStatus').textContent);
  const html=await h.context.downloads.at(-1).blob.text(),data=getData(html);if(name===fixtures[0])basicHTML=html;
  assert.equal(data.renderer,'canvas');assert.equal(data.scenes.length,h.context.fixture.scenes.length);assert(!html.split('<script')[0].includes('<video'));assert(!/<script[^>]+src=|<link|https?:\/\//.test(html));assert(data.scenes.every(s=>!s.video&&!s.poster));
  const im=new Map();for(const [key,src]of Object.entries(data.artwork)){const image=new Image();image.src=src;await image.decode();im.set(key,image);}
  const renderer=h.context.classroomNativeRenderer(data.project,im,data.catalog),a=createCanvas(800,450),b=createCanvas(800,450);
  h.context.reference=h.run('classroomClipProject(state,60)');h.context.a=a;
  const indexes=[...new Set([0,Math.floor(data.scenes.length/2),data.scenes.length-1])];
  for(const i of indexes)for(const t of [0,Math.min(1.7,data.scenes[i].hold)]){
   h.context.i=i;h.context.t=t;h.run('a.getContext("2d").clearRect(0,0,800,450);drawScene(a.getContext("2d"),reference.scenes[i],800,450,t,false,false,reference)');renderer.draw(b,i,t);
   const aa=a.getContext('2d').getImageData(0,0,800,450).data,bb=b.getContext('2d').getImageData(0,0,800,450).data;
   assert.deepEqual(bb,aa,name+' cue '+i+' at '+t+' matches the actual app renderer');frames++;
  }
  fs.writeFileSync(path.join(out,name+'.png'),b.toBuffer('image/png'));
  console.log(name+': original artwork embedded, '+indexes.length*2+' frames match; '+(Buffer.byteLength(html)/1024/1024).toFixed(1)+' MB');
 }
 const player=await open(basicHTML),{el,advance}=player;
 assert.equal(el('stage').tagName,'CANVAS');assert.equal(el('mode').value,'manual');assert.equal(el('next').textContent,'Start story →');
 el('next').click();for(let i=0;i<10;i++)await settle();await advance(1000);const moving=el('stage').toBuffer('image/png');await advance(100000);const held=el('stage').toBuffer('image/png');assert.notDeepEqual(moving,held);assert.equal(el('count').textContent,'1 / 15');await advance(5000);assert.deepEqual(el('stage').toBuffer('image/png'),held,'manual holds indefinitely');
 el('next').click();await settle();assert.equal(el('count').textContent,'2 / 15');el('back').click();await settle();assert.equal(el('count').textContent,'1 / 15');
 el('teacher').click();el('audioFile').files=[Object.assign(new Blob(['test song'],{type:'audio/mpeg'}),{name:'Teacher song.mp3'})];await el('audioFile').onchange();assert(el('songName').textContent.includes('Teacher song.mp3'));
 await el('recordTiming').onclick();await settle();assert.equal(el('mode').value,'record');await advance(800);el('play').click();const stopped=el('stage').toBuffer('image/png');await advance(4000);assert.deepEqual(el('stage').toBuffer('image/png'),stopped,'pause freezes live geometry while recording');await el('play').onclick();
 for(let i=1;i<15;i++){el('song').currentTime=i*4;el('next').click();await settle();}
 el('song').currentTime=60;el('next').click();assert.equal(el('mode').value,'music');assert(!el('musicOption').disabled);
 el('mode').value='music';el('mode').onchange();await settle();await el('play').onclick();el('song').currentTime=32.5;await advance(100);assert.equal(el('count').textContent,'9 / 15');el('play').click();
 el('saveCopy').click();assert.equal(player.downloads.length,1);const saved=await player.downloads[0].text(),reopened=await open(saved);assert.equal(reopened.el('stage').tagName,'CANVAS');assert.equal(getData(saved).music.name,'Teacher song.mp3');assert.equal(getData(saved).music.starts.length,15);assert.equal(reopened.el('mode').value,'manual');assert(!reopened.el('musicOption').disabled);reopened.el('saveCopy').click();assert.equal(reopened.downloads.length,1);assert.equal(getData(await reopened.downloads[0].text()).renderer,'canvas');
 player.events.pagehide();assert.equal(player.rafs.size,0);assert.deepEqual(h.errors,[]);
 console.log('PASS: '+frames+' pixel-identical frames across native shapes, artwork, puppet acting, ropes, camera/reveals and rigged walking; live HTML export never invokes a codec; exact downloaded runtime moves/holds/advances, imports a song, records/pauses/follows cue timing, and saves/reopens twice offline. Browser QA is separate.');
})().catch(e=>{console.error(e);process.exit(1)});
