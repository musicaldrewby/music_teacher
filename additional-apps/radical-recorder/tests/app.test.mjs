// DOM/event simulation only: this does not replace a real browser, layout, or speaker check.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
class MiniElement {
 constructor(tag='div',attrs={}) {this.tagName=tag.toUpperCase();this.attrs={...attrs};this.children=[];this.style={};this.dataset={};this.events={};this.value=attrs.value||'';this.checked='checked' in attrs;this.disabled='disabled' in attrs;this.hidden='hidden' in attrs;this._text='';this.parentNode=null;this.pointer=null;}
 get id(){return this.attrs.id;} get className(){return this.attrs.class||'';} set className(v){this.attrs.class=v;}
 get classList(){return {contains:c=>this.className.split(' ').includes(c),add:(...cs)=>this.className=[...new Set([...this.className.split(' ').filter(Boolean),...cs])].join(' '),remove:(...cs)=>this.className=this.className.split(' ').filter(c=>!cs.includes(c)).join(' '),toggle:(c,force)=>{const has=this.classList.contains(c),add=force??!has;if(add)this.classList.add(c);else this.classList.remove(c);return add;}};}
 set textContent(value){this._text=String(value);this.children=[];}get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}
 append(...nodes){for(const n of nodes){this.children.push(n);n.parentNode=this;}}replaceChildren(...nodes){this.children=[];this._text='';this.append(...nodes);}
 remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(x=>x!==this);}
 setAttribute(k,v){this.attrs[k]=String(v);if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(v);}getAttribute(k){return this.attrs[k]??null;}
 addEventListener(type,fn){(this.events[type]??=[]).push(fn);}
 emit(type,extra={}){const event={type,target:this,currentTarget:this,button:0,pointerId:1,detail:1,preventDefault(){this.defaultPrevented=true;},stopPropagation(){},...extra};let result=this['on'+type]?.(event);for(const fn of this.events[type]||[])fn(event);return result;}
 click(){if(!this.disabled)return this.emit('click');}
 focus(){const old=document.activeElement;if(old!==this){document.activeElement=this;old?.emit('blur');}}
 setPointerCapture(id){this.pointer=id;}hasPointerCapture(id){return this.pointer===id;}releasePointerCapture(id){if(this.pointer===id){this.pointer=null;this.emit('lostpointercapture',{pointerId:id});}}
 querySelectorAll(selector){const result=[];const selectors=selector.split(',').map(x=>x.trim());const matches=(el,s)=>{if(s.startsWith('.'))return el.classList.contains(s.slice(1));if(s.startsWith('#'))return el.id===s.slice(1);if(s==='input:not([type="file"])')return el.tagName==='INPUT'&&el.getAttribute('type')!=='file';return el.tagName===s.toUpperCase();};const walk=el=>{for(const c of el.children){if(selectors.some(s=>matches(c,s)))result.push(c);walk(c);}};walk(this);return result;}
 querySelector(s){return this.querySelectorAll(s)[0]||null;}
 get clientWidth(){return this.id==='staff-canvas'?260:400;}get clientHeight(){return 600;}get offsetWidth(){return this.classList.contains('stack-note')?80:400;}get offsetHeight(){return this.id==='stack-toolbar'?85:this.classList.contains('stack-note')?80:600;}
 getBoundingClientRect(){return {left:0,top:0,width:this.clientWidth,height:this.clientHeight};}
 getClientRects(){return [{}];}
 getContext(){return new Proxy({}, {get:()=>()=>{},set:()=>true});}
}
function parseHTML(html){
 const root=new MiniElement('document'),stack=[root];html=html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/g,'');
 const voidTags=new Set(['META','LINK','INPUT','BR','HR','IMG']);
 for(const match of html.matchAll(/<!--[^]*?-->|<![^>]*>|<\/?[^>]+>|[^<]+/g)){
  const token=match[0];if(token.startsWith('<!'))continue;
  if(token.startsWith('</')){const name=token.slice(2,-1).trim().toUpperCase();while(stack.length>1){const el=stack.pop();if(el.tagName===name)break;}continue;}
  if(token.startsWith('<')){const tag=token.match(/^<([\w-]+)/)?.[1];if(!tag)continue;const attrs={};for(const a of token.slice(tag.length+1).matchAll(/([\w-]+)(?:\s*=\s*"([^"]*)")?/g))attrs[a[1]]=a[2]??'';const el=new MiniElement(tag,attrs);stack.at(-1).append(el);if(!voidTags.has(el.tagName)&&!token.endsWith('/>'))stack.push(el);}
  else stack.at(-1)._text+=token;
 }
 root.getElementById=id=>root.querySelector('#'+id);root.createElement=tag=>new MiniElement(tag);root.createElementNS=(ns,tag)=>new MiniElement(tag);root.body=root.querySelector('body');root.activeElement=root.body;return root;
}
class Param {value=0;setValueAtTime(v){this.value=v;}linearRampToValueAtTime(v){this.value=v;}cancelAndHoldAtTime(){}}
let now=0,contexts=[];
class Context {
 constructor(){contexts.push(this);this.state='running';this.destination={};this.nodes=[];}get currentTime(){return now/1000;}async resume(){this.state='running';}
 createOscillator(){const node={frequency:new Param(),setPeriodicWave(wave){this.wave=wave;},started:false,connect(){},disconnect(){},start(t){this.started=true;this.startAt=t;},stop(t){assert.ok(this.started);this.stopAt=t;}};this.nodes.push(node);return node;}
 sampleRate=44100;
 createPeriodicWave(real,imag){return {real,imag};}
 createBuffer(channels,length){const data=new Float32Array(length);return {getChannelData:()=>data};}
 createBufferSource(){return this.createOscillator();}
 createBiquadFilter(){return {frequency:new Param(),Q:new Param(),connect(){},disconnect(){this.disconnected=true;}};}
 createGain(){return{gain:new Param(),connect(){},disconnect(){}};}
}
test('app boots with blocked storage, records, pauses/resumes, imports, and handles pointer cancellation',async()=>{
 const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(ids.length,new Set(ids).size,'unique element IDs');
 const source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');for(const match of source.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.includes(match[1]),'missing ID '+match[1]);
 const doc=parseHTML(html),win=new MiniElement('window');win.devicePixelRatio=2;Object.defineProperty(win,'localStorage',{get(){throw Error('blocked');}});
 const old={document:globalThis.document,window:globalThis.window,AudioContext:globalThis.AudioContext,confirm:globalThis.confirm,performance:globalThis.performance,requestAnimationFrame:globalThis.requestAnimationFrame,Path2D:globalThis.Path2D,setTimeout,clearTimeout,setInterval,clearInterval};
 const timers=new Map();let timerId=0;
 globalThis.document=doc;globalThis.window=win;globalThis.AudioContext=Context;globalThis.confirm=()=>true;globalThis.performance={now:()=>now};globalThis.requestAnimationFrame=fn=>fn();globalThis.Path2D=class {};globalThis.setTimeout=(fn)=>{timers.set(++timerId,{fn,type:'timeout'});return timerId;};globalThis.clearTimeout=id=>timers.delete(id);globalThis.setInterval=fn=>{timers.set(++timerId,{fn,type:'interval'});return timerId;};globalThis.clearInterval=id=>timers.delete(id);
 const $=id=>doc.getElementById(id);const flush=async()=>{await Promise.resolve();await Promise.resolve();};const advance=async ms=>{now+=ms;for(const t of [...timers.values()])if(t.type==='interval')t.fn();await flush();};
 try {
  await import('../dist/app.js?dom-test');
  assert.equal(doc.querySelectorAll('.song-item').length,15);assert.equal(doc.querySelectorAll('.note-btn').length,3);assert.equal($('note-name').textContent,'B');assert.match($('app-notice').textContent,/cannot save/);
  assert.equal(doc.body.dataset.theme,'oak');
  $('theme-btn').focus();$('theme-btn').click();assert.equal($('themes-modal').style.display,'flex');assert.equal(doc.activeElement.id,'theme-oak');
  $('theme-walnut').click();assert.equal(doc.body.dataset.theme,'walnut');assert.equal($('theme-walnut').getAttribute('aria-pressed'),'true');assert.equal($('theme-oak').getAttribute('aria-pressed'),'false');
  $('theme-ivory').click();assert.equal(doc.body.dataset.theme,'ivory');$('close-themes-btn').click();assert.equal(doc.activeElement.id,'theme-btn');assert.equal(doc.querySelectorAll('.stack-note').length,3);
  assert.equal($('recorder-card').hidden,true);assert.equal($('staff-card').hidden,true);assert.equal($('stack-card').hidden,false);
  $('fingering-view-btn').click();assert.equal($('recorder-card').hidden,false);assert.equal($('staff-card').hidden,false);assert.equal($('stack-card').hidden,true);
  $('view-stack').click();$('hide-staff-btn').click();$('stack-view-btn').click();assert.equal($('recorder-card').hidden,true);
  $('fingering-view-btn').click();assert.equal($('staff-card').hidden,true);assert.equal($('stack-card').hidden,false,'per-view choices are remembered');
  $('stack-view-btn').click();$('hide-stack-btn').click();assert.equal($('empty-board').hidden,false);$('restore-panels-btn').click();assert.equal($('stack-card').hidden,false);
  $('all-notes-preset').click();
  const many=doc.querySelectorAll('.stack-note');assert.ok(many.length>10);assert.equal(new Set(many.map(n=>n.style.left)).size,1);
  for(let i=1;i<many.length;i++)assert.ok(parseFloat(many[i].style.top)-parseFloat(many[i-1].style.top)>=parseFloat(many[i].style.height)+13);
  assert.ok(parseFloat($('pitch-stack-container').style.height)>$('pitch-stack-viewport').clientHeight);
  many.at(-1).emit('pointerdown');await flush();many.at(-1).emit('pointerup');assert.ok($('pitch-stack-viewport').scrollTop>0,'active notes scroll into view');
  $('bag-preset').click();assert.equal($('pitch-stack-viewport').scrollTop,0);
  $('sound-toggle').checked=true;$('sound-toggle').emit('change');
  const buttons=doc.querySelectorAll('.note-btn');buttons[2].emit('pointerdown');await flush();assert.equal($('note-name').textContent,'G');assert.ok($('recorder-svg').classList.contains('playing'));buttons[2].emit('pointercancel');assert.ok(!$('recorder-svg').classList.contains('playing'));
  assert.ok(contexts[0].nodes.at(-1).stopAt!==undefined);
  $('settings-btn').click();$('soprano-list').value='NOPE';$('save-settings').click();assert.match($('settings-error').textContent,/Unsupported/);assert.equal($('settings-modal').style.display,'flex');
  $('soprano-list').value='B5, A5, G5';$('show-hz-toggle').checked=true;$('save-settings').click();assert.equal(doc.querySelectorAll('.note-btn').length,3);assert.equal($('settings-modal').style.display,'none');
  $('settings-btn').click();assert.equal($('soprano-list').value,'B5, A5, G5');assert.equal($('show-hz-toggle').checked,true);$('cancel-settings-btn').click();

  // Connected song lesson, score choices, phrase practice, and saved classroom setup.
  doc.querySelectorAll('.song-trigger')[0].click();assert.equal($('lesson-title').textContent,'Hot Cross Buns');assert.equal($('score-panel').hidden,false);assert.ok(doc.querySelectorAll('.score-note').length>0);assert.equal(doc.querySelectorAll('.stack-note').length,3);
  $('collapse-score-btn').click();assert.equal($('score-panel').classList.contains('music-collapsed'),true);assert.equal($('board-area').hidden,false);
  $('expand-score-btn').click();assert.equal($('board-area').hidden,true);$('expand-score-btn').click();assert.equal($('board-area').hidden,false);
  $('hide-score-btn').click();assert.equal($('score-panel').hidden,true);assert.equal($('quick-transport').hidden,false);$('view-score').click();assert.equal($('score-panel').hidden,false);
  $('notation-select').value='staff-letters';$('notation-select').emit('change');$('song-speed').value='80';$('song-speed').emit('change');
  await $('start-song-btn').click();await flush();assert.match($('song-status').textContent,/Count in/);await advance(800);assert.match($('song-status').textContent,/Count in · 2/);$('stack-view-btn').click();assert.equal($('quick-transport').hidden,false);assert.equal($('stop-song-btn').disabled,false,'view changes keep playback running');$('song-view-btn').click();$('pause-song-btn').click();assert.match($('song-status').textContent,/Paused/);$('stop-song-btn').click();
  $('count-in-toggle').checked=false;$('count-in-toggle').emit('change');$('phrase-select').value='1';$('phrase-select').emit('change');$('loop-toggle').checked=true;$('loop-toggle').emit('change');
  await $('start-song-btn').click();await flush();assert.match($('song-status').textContent,/Playing/);await advance(14000);await flush();assert.equal($('stop-song-btn').disabled,false,'phrase repeat restarts playback');$('stop-song-btn').click();
  $('loop-toggle').checked=false;$('loop-toggle').emit('change');
  $('stack-edit-mode').click();doc.querySelectorAll('.stack-note')[0].emit('keydown',{key:'ArrowRight'});$('stack-play-mode').click();
  const savedLeft=doc.querySelectorAll('.stack-note')[0].style.left;
  $('save-lesson-btn').click();$('lesson-name-input').value='BAG warm-up';$('confirm-save-lesson').click();
  $('baged-preset').click();assert.equal(doc.querySelectorAll('.stack-note').length,5);$('lessons-btn').click();assert.equal(doc.querySelectorAll('.lesson-open').length,1);doc.querySelectorAll('.lesson-open')[0].click();
  assert.equal($('lesson-title').textContent,'Hot Cross Buns');assert.equal($('song-speed').value,80);assert.equal($('notation-select').value,'staff-letters');assert.equal(doc.querySelectorAll('.stack-note')[0].style.left,savedLeft);assert.equal($('phrase-select').value,'1');
  const scoreNote=doc.querySelectorAll('.score-note')[0];scoreNote.emit('pointerdown');await flush();assert.match($('song-status').textContent,/Paused/);scoreNote.emit('pointerup');$('stop-song-btn').click();
  $('present-btn').click();assert.equal($('teacher-tools').hidden,false);$('present-btn').click();assert.equal($('teacher-tools').hidden,true);
  $('bag-preset').click();
  $('starter-stack-btn').click();assert.equal(doc.querySelectorAll('.stack-note').length,3);
  $('record-btn').click();assert.match($('record-status').textContent,/Ready/);
  const stack=doc.querySelectorAll('.stack-note');stack[0].emit('pointerdown');await flush();await advance(300);stack[0].emit('pointerup');await advance(150);stack[2].emit('pointerdown');await flush();await advance(300);stack[2].emit('pointerup');await advance(500);$('record-btn').click();
  assert.equal($('save-song-modal').style.display,'flex');$('song-title-input').value='<img src=x onerror=alert(1)>';$('confirm-save-song-btn').click();
  assert.equal(doc.querySelectorAll('.song-item').length,16);assert.equal(doc.querySelectorAll('img').length,0);assert.equal($('save-song-modal').style.display,'none');
  const custom=doc.querySelectorAll('.song-trigger').at(-1);custom.click();$('count-in-toggle').checked=false;$('count-in-toggle').emit('change');await $('start-song-btn').click();await flush();assert.match($('song-status').textContent,/Playing/);await advance(200);$('pause-song-btn').click();assert.match($('song-status').textContent,/Paused/);await advance(1500);assert.match($('song-status').textContent,/Paused/);await $('pause-song-btn').click();await flush();await advance(200);assert.equal($('note-name').textContent,'REST');await advance(200);assert.equal($('note-name').textContent,'G');await advance(500);assert.equal($('stop-song-btn').disabled,true);
  custom.click();await $('start-song-btn').click();await flush();win.emit('blur');assert.match($('song-status').textContent,/Paused/);$('stop-song-btn').click();
  $('settings-btn').click();const before=doc.querySelectorAll('.song-item').length;
  const malformed={size:100,text:async()=>JSON.stringify({meta:{appName:'RadicalRecorder'},library:[{title:'bad',notes:[{k:'B5',d:-5}]}]})};$('backup-file-input').files=[malformed];$('backup-file-input').emit('change');await flush();assert.match($('settings-error').textContent,/Import failed/);assert.equal(doc.querySelectorAll('.song-item').length,before);
  const legacy={size:100,text:async()=>JSON.stringify({meta:{appName:'RadicalRecorder',version:'1.0'},settings:{hidePresets:true,sopranoOrder:'A5, G5'},library:[{title:'Imported song',notes:[{k:'A5',d:300}]}]})};$('backup-file-input').files=[legacy];$('backup-file-input').emit('change');await flush();assert.equal(doc.querySelectorAll('.song-item').length,1);assert.equal($('note-name').textContent,'A');assert.equal($('settings-modal').style.display,'none');assert.equal(doc.body.dataset.theme,'oak');
  $('instrument-select').value='alto';$('instrument-select').emit('change');assert.equal($('note-name').textContent,'E');assert.equal($('song-view-btn').disabled,true);assert.equal($('song-list-el').inert,true);
 } finally {Object.assign(globalThis,old);}
});
