// Headless vector-export check using the same page generator and PDF writer as the app.
import fs from 'node:fs/promises';import {JSDOM} from 'jsdom';import {createCanvas} from '@napi-rs/canvas';
import {createScorePages,scorePDF} from '../dist/score-pages.js';
const dom=new JSDOM('<html><body></body></html>',{pretendToBeVisual:true,runScripts:'outside-only'}),w=dom.window;
const ctx=createCanvas(1,1).getContext('2d');w.HTMLCanvasElement.prototype.getContext=()=>ctx;
w.SVGElement.prototype.getBBox=function(){const style=w.getComputedStyle(this);const fontSize=this.getAttribute('font-size')||style.fontSize||'16px';const size=parseFloat(fontSize)*(fontSize.endsWith('pt')?4/3:1);ctx.font=(this.getAttribute('font-style')||style.fontStyle||'normal')+' '+(this.getAttribute('font-weight')||style.fontWeight||'normal')+' '+size+'px '+(this.getAttribute('font-family')||style.fontFamily||'Arial');return {x:0,y:-size*.8,width:ctx.measureText(this.textContent||'').width,height:size};};
Object.assign(globalThis,{window:w,document:w.document,XMLSerializer:w.XMLSerializer,DOMParser:w.DOMParser,SVGElement:w.SVGElement});w.eval(await fs.readFile('dist/vendor/vexflow.js','utf8'));globalThis.Vex=w.Vex;
const p=JSON.parse(await fs.readFile(process.argv[2],'utf8')),layout=createScorePages(p),blob=await scorePDF(layout);await fs.writeFile(process.argv[3],Buffer.from(await blob.arrayBuffer()));console.log(JSON.stringify({pages:layout.pages.length,bytes:blob.size,warnings:layout.warnings}));
if(process.argv[4]){
 const {OfflineAudioContext}=await import('node-web-audio-api');globalThis.OfflineAudioContext=OfflineAudioContext;
 globalThis.fetch=async name=>new Response(await fs.readFile(new URL('../dist/'+name,import.meta.url)));
 const {AudioEngine}=await import('../dist/engine.js');
 class TestAudio extends AudioEngine {async init(){if(!this.ctx){this.ctx=new OfflineAudioContext(2,44100,44100);this.mix=this.createMix(this.ctx);}this.manifest=await this.manifestPromise;return this;}}
 const {showClassroomDialog}=await import('../dist/classroom-export.js');
 const zip=await new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(Error('Classroom export did not finish: '+w.document.querySelector('#pack-status')?.textContent)),120000);
  showClassroomDialog({project:p,audio:new TestAudio(),download:blob=>{clearTimeout(timeout);resolve(blob);},modal:(title,body)=>{w.document.body.innerHTML='<dialog id="modal" open>'+body+'</dialog>';}});
  w.document.querySelectorAll('[data-pack-part]').forEach((e,i)=>e.checked=i===0);w.document.querySelector('#pack-accompaniment').checked=true;w.document.querySelector('#pack-create').click();
 });
 const bytes=new Uint8Array(await zip.arrayBuffer());await fs.writeFile(process.argv[4],bytes);
 const {unzipSync}=await import('fflate');const files=unzipSync(bytes);if(Object.keys(files).length!==5)throw Error('Incorrect classroom package file count.');
 for(const [name,bytes]of Object.entries(files)){if(name.endsWith('.pdf')&&new TextDecoder().decode(bytes.slice(0,4))!=='%PDF')throw Error('Invalid PDF');if(name.endsWith('.wav')&&new TextDecoder().decode(bytes.slice(0,4))!=='RIFF')throw Error('Invalid WAV');}
 const waves=Object.entries(files).filter(([name])=>name.endsWith('.wav'));if(Buffer.from(waves[0][1]).equals(Buffer.from(waves[1][1])))throw Error('Omitting recorder did not change the audio');
 console.log(JSON.stringify({classroomFiles:Object.keys(files),bytes:zip.size}));
}

dom.window.close();
