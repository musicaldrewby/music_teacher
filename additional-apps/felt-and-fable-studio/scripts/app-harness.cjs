const assetPath=require('./asset-path.cjs');
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const {Image,Path2D}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'../public'),{document,elements}=require('./dom-fixture.cjs')(path.join(root,'index.html'));
const indexedDB=require('./idb-fixture.cjs')(),preferences=new Map(),errors=[];
let dynamicLoads=0;const timers=new Map();let timerId=0;
const context={document,Image,Path2D,indexedDB,console:{log:console.log,error:(...e)=>errors.push(e.join(' ')),warn:console.warn},setTimeout(fn,ms){if(ms===0){setImmediate(fn);return ++timerId}const id=++timerId;timers.set(id,fn);return id},clearTimeout(id){timers.delete(id)},setInterval:()=>0,clearInterval(){},requestAnimationFrame:()=>0,cancelAnimationFrame(){},performance,URL,Blob,TextEncoder,Uint8Array,Uint8ClampedArray,Float32Array,ArrayBuffer,AbortController,DOMException,localStorage:{getItem:k=>preferences.get(k)||null,setItem:(k,v)=>preferences.set(k,v)},navigator:{},ResizeObserver:class{observe(){}},alert(){},confirm(){return true},prompt(){return null},innerWidth:1440,innerHeight:1000,addEventListener(){},devicePixelRatio:1};
context.btoa=s=>Buffer.from(s,'binary').toString('base64');context.atob=s=>Buffer.from(s,'base64').toString('binary');context.window=context;context.globalThis=context;context.getComputedStyle=()=>({getPropertyValue(){return '0'},display:'block',paddingLeft:'0',paddingRight:'0',paddingTop:'0',paddingBottom:'0'});vm.createContext(context);
document.head.appendChild=el=>{dynamicLoads++;setImmediate(()=>{try{vm.runInContext(fs.readFileSync(assetPath(root,el.src),'utf8'),context);el.onload()}catch(e){el.onerror(e)}})};
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const m of html.matchAll(/<script src="([^"]+)"/g))vm.runInContext(fs.readFileSync(path.join(root,m[1]),'utf8'),context,{filename:m[1]});
const run=s=>vm.runInContext(s,context),el=id=>elements.get(id),click=id=>el(id).click();

module.exports={context,run,el,click,ready:context.feltStartup,errors,root};
