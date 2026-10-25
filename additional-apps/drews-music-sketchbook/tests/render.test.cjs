const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{parseHTML}=require('linkedom');
test('app engraves blank, example, keys, meter and dense music without runtime errors',()=>{
 const {window}=parseHTML(fs.readFileSync('dist/index.html','utf8'));
 const canvas={font:'12px Arial',measureText:s=>({width:s.length*7,actualBoundingBoxLeft:0,actualBoundingBoxRight:s.length*7,actualBoundingBoxAscent:10,actualBoundingBoxDescent:3})};
 window.HTMLCanvasElement.prototype.getContext=()=>canvas;
 window.HTMLElement.prototype.getBoundingClientRect=function(){return {x:0,y:0,left:0,top:0,right:800,bottom:200,width:800,height:200}};
 Object.defineProperty(window.HTMLElement.prototype,'clientWidth',{get(){return 800}});
 Object.defineProperty(window.HTMLSelectElement.prototype,'value',{get(){return this.getAttribute('data-value')||this.querySelector('option[selected]')?.getAttribute('value')||this.querySelector('option')?.getAttribute('value')||this.querySelector('option')?.textContent||''},set(x){this.setAttribute('data-value',x)}});
 window.HTMLElement.prototype.focus=function(){};window.HTMLElement.prototype.select=function(){};window.HTMLElement.prototype.scrollIntoView=function(){};
 window.document.getElementById('dialog').showModal=function(){this.open=true};window.document.getElementById('dialog').close=function(){this.open=false};
 let errors=[];const preferences=new Map();const context=vm.createContext({window,document:window.document,console:{log(){},warn(){},error:(...x)=>errors.push(x.join(' '))},localStorage:{getItem(k){return preferences.get(k)??null},setItem(k,v){preferences.set(k,v)}},setTimeout:()=>1,clearTimeout(){},requestAnimationFrame:()=>1,cancelAnimationFrame(){},ResizeObserver:class{observe(){}},Blob,URL});
 context.self=context.window;context.window.setTimeout=()=>1;context.window.clearTimeout=()=>{};
 vm.runInContext(fs.readFileSync('dist/vendor/vexflow.js','utf8'),context);context.Vex=context.window.Vex||context.Vex;
 vm.runInContext(fs.readFileSync('dist/model.js','utf8'),context);context.SketchModel=context.window.SketchModel;
 vm.runInContext(fs.readFileSync('dist/app.js','utf8'),context);
 assert.equal(errors.length,0,errors.join('\n'));assert.ok(window.document.querySelectorAll('#score svg').length>=2);
 window.document.getElementById('exampleBtn').onclick();window.document.getElementById('dialogConfirm').onclick();assert.equal(errors.length,0,errors.join('\n'));
 assert.match(window.document.getElementById('score').innerHTML,/Here/);assert.match(window.document.getElementById('score').innerHTML,/G7/);
 fs.writeFileSync('/tmp/music-sketchbook-score-example.svg',window.document.querySelector('#score svg').outerHTML);
 vm.runInContext("song=M.fresh(); song.key='Gb'; song.staff='grand'; song.meter='6/8'; for(let i=0;i<12;i++) M.append(song,0,0,{id:M.uid(),duration:16,dot:false,rest:i%3===0,pitches:i%3===0?[]:[{step:28+i%8,acc:i%2?'#':null}],lyric:'',chord:'',tie:false}); render();",context);
 assert.equal(errors.length,0,errors.join('\n'));assert.ok(!window.document.querySelector('.render-error'));
 assert.equal(vm.runInContext('Array.from(noteViews.values()).every(v=>v.x<v.area.right-8)',context),true,'Every note stays inside its measure');
 fs.writeFileSync('/tmp/music-sketchbook-score-dense.svg',window.document.querySelector('#score svg').outerHTML);
 assert.equal(vm.runInContext('scoreZoom',context),175,'The score starts at a readable size');
 const originalSong=vm.runInContext('JSON.stringify(song)',context);
 for(const zoom of [75,175,300]){
  vm.runInContext(`setScoreZoom(${zoom})`,context);
  assert.equal(errors.length,0,errors.join('\n'));
  const svg=window.document.querySelector('#score svg'),box=svg.getAttribute('viewBox').split(' ').map(Number),scale=zoom/100;
  assert.ok(Math.abs(parseFloat(svg.style.width)/box[2]-scale)<.0001,'Notation scales by the requested amount');
  assert.equal(vm.runInContext('Array.from(noteViews.values()).every(v=>v.x<v.area.right-8)',context),true,'Zoom keeps notes within their barlines');
  assert.equal(vm.runInContext(`(()=>{const a=layouts[0],svg=a.svg,scale=${scale};const [,,width,height]=svg.getAttribute('viewBox').split(' ').map(Number);svg.viewBox={baseVal:{width,height}};svg.getBoundingClientRect=()=>({left:20,top:70,width:width*scale,height:height*scale});const p=point({currentTarget:svg,clientX:20+a.appendX*scale,clientY:70+(a.staffBottom+10)*scale});return stepAt(a,p.y)})()`,context),28,'Clicking middle C stays accurate at every zoom');
  assert.equal(preferences.get('drew-music-sketchbook-zoom'),String(zoom));
 }
 window.dispatchEvent(new window.Event('beforeprint'));
 assert.equal(vm.runInContext('printing',context),true);
 {const svg=window.document.querySelector('#score svg');assert.equal(parseFloat(svg.style.width),+svg.getAttribute('viewBox').split(' ')[2],'Print uses page scale');}
 window.dispatchEvent(new window.Event('afterprint'));
 assert.equal(vm.runInContext('scoreZoom',context),300,'Printing preserves zoom preference');
 assert.equal(vm.runInContext('JSON.stringify(song)',context),originalSong,'Changing the view does not alter the song');
});
