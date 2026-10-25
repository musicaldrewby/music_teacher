import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {JSDOM} from 'jsdom';import {build} from 'esbuild';
import {RECORDING_STORAGE} from '../dist/recording-preferences.js';
const code=(await build({entryPoints:['dist/app.js'],bundle:true,format:'iife',write:false,logLevel:'silent'})).outputFiles[0].text;
const html=await fs.readFile('dist/index.html','utf8'),key='orff-atelier-project-v1';
function boot(seed={}){
 const dom=new JSDOM(html,{url:'https://studio.example/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 w.structuredClone=structuredClone;w.fetch=async url=>new Response(await fs.readFile('dist/'+url));w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 for(const [k,v]of Object.entries(seed))w.localStorage.setItem(k,v);
 w.eval(code);w.document.querySelector('#welcome-enter').click();
 const $=s=>w.document.querySelector(s),change=(s,value)=>{const el=$(s);if(el.type==='checkbox')el.checked=value;else el.value=value;el.dispatchEvent(new w.Event('change',{bubbles:true}))};
 return {dom,w,$,change};
}
test('recording settings restore on a fresh app launch and remain shared with the sequencer',()=>{
 let x=boot();try{
  x.$('#transport-record-settings').click();x.change('#record-grid','.25');x.change('#record-length','1.5');x.change('#count-in',false);
  x.$('#metro-volume').value='.2';x.$('#metro-volume').dispatchEvent(new x.w.Event('input'));
  const saved=x.w.localStorage.getItem(RECORDING_STORAGE);x.dom.window.close();x=boot({[RECORDING_STORAGE]:saved});
  assert.match(x.$('#transport-record-settings').textContent,/1\/16/);x.$('#transport-record-settings').click();assert.equal(x.$('#record-grid').value,'.25');assert.equal(x.$('#record-length').value,'1.5');assert.equal(x.$('#count-in').checked,false);assert.equal(x.$('#metro-volume').value,'0.2');
 }finally{x.dom.window.close()}
});
test('pagehide flushes a pending composition and blocked storage warns on leaving',()=>{
 const x=boot();try{
  x.change('#project-title','Student composition');x.w.dispatchEvent(new x.w.Event('pagehide'));assert.equal(JSON.parse(x.w.localStorage.getItem(key)).title,'Student composition');assert.equal(x.$('#save-state').textContent,'Saved on this device');
  const native=x.w.Storage.prototype.setItem;x.w.Storage.prototype.setItem=function(k,v){if(k===key)throw new x.w.DOMException('Blocked','SecurityError');return native.call(this,k,v)};
  x.change('#project-title','Unsaved revision');const event=new x.w.Event('beforeunload',{cancelable:true});x.w.dispatchEvent(event);assert.equal(event.defaultPrevented,true);assert.match(x.$('#save-state').title,/blocking storage/);assert.equal(JSON.parse(x.w.localStorage.getItem(key)).title,'Student composition');
 }finally{x.dom.window.close()}
});
test('backup storage failure still reports the composition as saved in the app',()=>{
 const x=boot();try{
  x.change('#project-title','Before');x.w.dispatchEvent(new x.w.Event('pagehide'));
  const native=x.w.Storage.prototype.setItem;x.w.Storage.prototype.setItem=function(k,v){if(k===key+'-backup')throw new x.w.DOMException('Quota','QuotaExceededError');return native.call(this,k,v)};
  x.change('#project-title','After');x.w.dispatchEvent(new x.w.Event('pagehide'));assert.equal(JSON.parse(x.w.localStorage.getItem(key)).title,'After');assert.equal(x.$('#save-state').textContent,'Saved on this device');
 }finally{x.dom.window.close()}
});
