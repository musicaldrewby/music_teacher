const assetPath=require('./asset-path.cjs');
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const {createCanvas,Image,Path2D}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'../public');const elements=new Map();
function element(tag='div'){
 const e={tagName:tag.toUpperCase(),value:'',checked:false,hidden:false,disabled:false,dataset:{},style:{setProperty(k,v){this[k]=v}},children:[],clientWidth:1200,clientHeight:700,scrollWidth:1200,scrollHeight:700,
 classList:{add(){},remove(){},toggle(){},contains(){return false}},listeners:[],addEventListener(type,fn){this.listeners.push({type,fn})},removeEventListener(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},append(...x){this.children.push(...x)},appendChild(x){this.children.push(x);return x},replaceChildren(...x){this.children=x},remove(){},click(){for(const l of this.listeners.filter(l=>l.type==='click'))l.fn({target:this})},focus(){document.activeElement=this},blur(){},scrollIntoView(){},querySelector(sel){this.queries??=new Map();if(!this.queries.has(sel))this.queries.set(sel,element());return this.queries.get(sel)},querySelectorAll(){return []},closest(){return null},getBoundingClientRect(){return{left:0,top:0,width:1200,height:675}},setPointerCapture(){},releasePointerCapture(){}};
 Object.defineProperty(e,'options',{get(){return this.children}});e.showModal=function(){this.open=true};e.close=function(){this.open=false};if(tag==='canvas'){const c=createCanvas(1600,900);Object.assign(c,e);return c}return e;
}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const m of html.matchAll(/<([a-z]+)[^>]*\bid="([^"]+)"[^>]*>/g)){assert(!elements.has(m[2]),'Duplicate ID '+m[2]);const e=element(m[1]);e.value=m[0].match(/\bvalue="([^"]*)"/)?.[1]||'';e.disabled=/\sdisabled(?:\s|>)/.test(m[0]);elements.set(m[2],e)}
const document={getElementById(id){assert(elements.has(id),'Missing ID '+id);return elements.get(id)},createElement:element,querySelectorAll(){return []},querySelector(){return element()},body:element(),documentElement:element(),addEventListener(){}};
const errors=[];let dynamicLoads=0;document.head={appendChild(el){dynamicLoads++;setImmediate(()=>{try{vm.runInContext(fs.readFileSync(assetPath(root,el.src),'utf8'),context);el.onload()}catch(e){el.onerror(e)}})}};
const context={document,Image,Path2D,console:{log:console.log,error:(...e)=>errors.push(e.join(' ')),warn:console.warn},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},requestAnimationFrame:()=>0,cancelAnimationFrame(){},performance,URL,Blob,TextEncoder,Uint8Array,Uint8ClampedArray,Float32Array,ArrayBuffer,AbortController,DOMException,localStorage:{getItem(){return null},setItem(){}},navigator:{},ResizeObserver:class{observe(){}},alert(){},confirm(){return true},prompt(){return null},innerWidth:1440,innerHeight:1000,addEventListener(){},devicePixelRatio:1};context.window=context;context.globalThis=context;context.getComputedStyle=()=>({getPropertyValue(){return '0'},display:'block',paddingLeft:'0',paddingRight:'0',paddingTop:'0',paddingBottom:'0'});vm.createContext(context);
for(const m of html.matchAll(/<script src="([^"]+)"/g)){let code=fs.readFileSync(path.join(root,m[1]),'utf8');new vm.Script(code);if(m[1]==='js/start.js')code=code.replace('boot();','globalThis.startup=boot();');vm.runInContext(code,context,{filename:m[1]})}
(async()=>{await context.feltStartup;
 assert(elements.get('welcomeScreen').open,'Welcome did not open at launch');
 assert(!elements.get('welcomeStart').disabled,'Start did not become available');
 assert(elements.get('welcomeStatus').textContent==='Your studio is ready.','Missing ready status');
 const unchanged=vm.runInContext('snapshot()',context);
 elements.get('welcomeStart').click();assert(!elements.get('welcomeScreen').open,'Start did not dismiss welcome');
 elements.get('openWelcome').click();assert(elements.get('welcomeScreen').open,'Menu did not reopen welcome');
 assert(elements.get('welcomeStart').querySelector('span').textContent==='Return to studio','Returning label missing');
 assert(vm.runInContext('snapshot()',context)===unchanged,'Welcome changed the project');
 context.FeltWelcome.failed();assert(elements.get('welcomeStart').disabled&&!elements.get('welcomeReload').hidden,'Missing startup failure recovery');context.FeltWelcome.ready();elements.get('welcomeStart').click();
assert.deepStrictEqual(errors,[]);
 const result=vm.runInContext(`(()=>{if(!ready||imageMap.size!==7)throw Error('Startup failed');if(ART.pieces.length!==280||ART.backgrounds.length!==96||MOTION_PRESETS.length!==70)throw Error('Missing collections');const saved=validateProject(JSON.parse(snapshot()));const c=makeCanvas(1920,1080);drawScene(c.getContext('2d'),scene(),1920,1080,0);const p=copy(state);p.exportCaptions=false;const movie=makeCanvas(1920,1080);for(const fps of [30,60]){paintVideoFrame(movie.getContext('2d'),p,storyTimeline(p,fps),0,fps);if(movie.toDataURL()!==c.toDataURL())throw Error('Export frame mismatch')}const before=snapshot();setOffstage(true);fitOffstageAll();if(snapshot()!==before)throw Error('Workspace changed project');setOffstage(false);return {ready,pieces:ART.pieces.length,backgrounds:ART.backgrounds.length,presets:MOTION_PRESETS.length,assets:[...ART.pieces,...ART.backgrounds].map(a=>a.prepared),scenes:saved.scenes.length}})()`,context);
 for(const file of result.assets)assert(fs.existsSync(assetPath(root,file)),'Missing artwork '+file);
 console.log(JSON.stringify({...result,assets:result.assets.length,dynamicLoads,checks:'startup, all catalog asset paths, project roundtrip, offstage isolation, 30/60 fps frame rendering, startup splash, start/reopen buttons, failure recovery'},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
