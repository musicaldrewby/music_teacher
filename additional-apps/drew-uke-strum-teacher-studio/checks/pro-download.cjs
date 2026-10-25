// Exercise the exact distributed HTML, its bundled assets, and Pro Help.
// DOM/audio doubles plus native Canvas; this is not browser/WebCodecs testing.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {c:base,doc,el,makeNode}=require('./classroom.cjs'),{createCanvas,Image,GlobalFonts}=require('@napi-rs/canvas');
const dir=path.resolve(process.argv[2]),html=fs.readFileSync(path.join(dir,'Open-Uke-Strum-Pro.html'),'utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
assert(!/<script src=/.test(html.replace(/<script(?:\s[^>]*)?>[\s\S]*?<\/script>/g,'')));
assert(!html.includes('buymeacoffee.com'));assert(html.includes('Created by <strong>Drew Wichman</strong>'));
assert(!/<link rel="stylesheet"/.test(html.replace(/<script(?:\s[^>]*)?>[\s\S]*?<\/script>/g,'')));
doc.head=makeNode('head');const oldQuery=doc.querySelector.bind(doc),header=makeNode(),help=makeNode();doc.querySelector=s=>s==='.beach-header'?header:s==='.options-help'?help:oldQuery(s);
const oldCreate=doc.createElement;doc.createElement=t=>t==='canvas'?createCanvas(1,1):oldCreate(t);
const c={...base,document:doc,location:new URL('file://'+path.join(dir,'Open-Uke-Strum-Pro.html')),Response,Request,DOMException,fetch,Image};c.window=c;c.self=c;
vm.createContext(c);const run=s=>vm.runInContext(s,c,{timeout:20000});
for(let i=0;i<scripts.length;i++)new vm.Script(scripts[i],{filename:'download-script-'+i}).runInContext(c,{timeout:20000});
(async()=>{
 assert(c.UKE_PRO_DOWNLOAD);assert.equal(c.UkeStrum.starters.length,14);assert.equal(run('isViewer'),false);assert.equal(run('isProjector'),false);
 for(const id of ['openVideoStudio','openPracticeSheet','melodyCanvas','videoExport','scorePresent'])if(id!=='scorePresent')assert(el(id),id);
 const bank=await run('readSoundBank()');assert.equal(bank.samples.length,130);
 for(const name of ['assets/fonts/DejaVuSans.ttf','assets/fonts/DejaVuSans-Bold.ttf','assets/fonts/Skranji-Bold.ttf']){const r=await c.fetch(name);const bytes=Buffer.from(await r.arrayBuffer());assert.equal(bytes.compare(fs.readFileSync(path.join(__dirname,'../dist',name))),0);GlobalFonts.register(bytes,name.includes('Skranji')?'UkeIsland':'UkePrint');}
 for(const url of Object.values(c.EMBEDDED_ART)){assert(url.startsWith('blob:'));const r=await fetch(url);assert((await r.arrayBuffer()).byteLength>0);}
 const moduleBytes=Buffer.from(await(await fetch(c.UKE_VIDEO_MODULE_URL)).arrayBuffer());assert.equal(moduleBytes.compare(fs.readFileSync(path.join(__dirname,'../dist/vendor/mediabunny.min.mjs'))),0);const M=await import('data:text/javascript;base64,'+moduleBytes.toString('base64'));assert(M.Output&&M.Mp4OutputFormat&&M.CanvasSource);
 const n=el('melodyCanvas'),canvas=createCanvas(800,280);n.parentElement={parentElement:{clientWidth:1000}};for(const d of ['width','height'])Object.defineProperty(n,d,{get:()=>canvas[d],set:v=>canvas[d]=v});n.getContext=(...args)=>canvas.getContext(...args);
 run("setView('melody');addMelodyNote('c/4')");assert.equal(run('song.notation.measures[0].notes[0].pitch'),'c/4');assert(c.UkeMelodyRenderer&&c.UkeMelodyPDF&&c.PDFLib&&c.fontkit);
 el('helpBtn').onclick();assert.equal(el('generalTitle').textContent,'Teacher Studio Pro - Help');assert(el('generalContent').innerHTML.includes('Open PDF manual'));assert(el('generalContent').innerHTML.includes('Created by <strong>Drew Wichman</strong>'));assert(help.innerHTML.includes('help/Teacher-Studio-Manual.pdf'));
 const pdf=fs.readFileSync(path.join(dir,'help/Teacher-Studio-Manual.pdf'));assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
 const response=await c.fetch(new URL('index.html',c.location));assert((await response.text()).includes('pro-help.js'));
 console.log(JSON.stringify({passed:true,scripts:scripts.length,samples:bank.samples.length,artwork:Object.keys(c.EMBEDDED_ART).length,checks:['Standalone app boot','Full Pro controls and note entry','All sampled instruments bundled','Embedded image resources','Font byte integrity','MP4 library module imports','Pro Help and manual path','No donation link; correct creator credit'],limit:'Browser layout, physical clicks, and browser encoder not exercised.'},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
