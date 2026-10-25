const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const markup=fs.readFileSync('dist/index.html','utf8'),script=fs.readFileSync('dist/app.js','utf8');
const ids=[...markup.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
const classes=new Set(),events={},nodes=new Map();
function node(id=''){return {id,value:'',checked:false,hidden:false,disabled:false,style:{},children:[],textContent:'',setAttribute(k,v){this[k]=String(v)},appendChild(n){this.children.push(n)},replaceChildren(...n){this.children=n},focus(){document.activeElement=this},querySelector(q){return node(q)},tagName:'BUTTON'};}
for(const id of ids)nodes.set(id,node(id));
const document={getElementById:id=>nodes.get(id)||null,createElement:()=>node(),activeElement:{tagName:'BODY'},addEventListener(){},body:{classList:{contains:k=>classes.has(k),remove:k=>classes.delete(k),toggle(k,force){const enabled=force??!classes.has(k);if(enabled)classes.add(k);else classes.delete(k);return enabled}}}};
for(const [id,value] of Object.entries({fps:'60',resolution:'1080',length:'1200'}))nodes.get(id).value=value;
nodes.get('panel').hidden=true;nodes.get('exportModal').hidden=true;
const window={addEventListener(k,fn){events[k]=fn}},images=[];let concurrent=0,peak=0;
class Image {async decode(){assert.ok(fs.existsSync('dist/'+this.src));images.push(this.src);concurrent++;peak=Math.max(peak,concurrent);await Promise.resolve();concurrent--;}}
const context=vm.createContext({document,window,Image,performance,console,setTimeout,clearTimeout,requestAnimationFrame(){},localStorage:{getItem(){return null},setItem(){}},Blob,URL,TextEncoder,TextDecoder,Uint8Array,ArrayBuffer});
const source=script.replace(/init\(\);\s*$/,`makeRenderer=()=>({draw(){},destroy(){}});globalThis.api={state,setSettingsOpen,SCENES,WINDOWS,journeyFrame,exportPlan};globalThis.initialized=init();`);
vm.runInContext(source,context);
(async()=>{
 await context.initialized;assert.ok(window.demo?.ready,'Initialization reached ready state');assert.equal(images.length,34);assert.ok(peak<=6);
 const a=context.api;a.setSettingsOpen(true);assert.equal(nodes.get('panel').hidden,false);assert.ok(classes.has('settings-open'));assert.equal(nodes.get('settings')['aria-expanded'],'true');
 nodes.get('closeSettings').onclick();assert.equal(nodes.get('panel').hidden,true);assert.ok(!classes.has('settings-open'));
 for(const id of Object.keys(a.SCENES)){nodes.get('tab-'+id).onclick();assert.equal(a.state.scene,id);}
 for(const id of Object.keys(a.WINDOWS)){nodes.get('carriage').onchange({target:{value:id}});assert.equal(a.state.carriage,id);}
 nodes.get('cinema').onclick();assert.ok(classes.has('cinema'));events.keydown({key:'Escape',code:'Escape'});assert.ok(!classes.has('cinema'));
 nodes.get('videoSettings').onclick();assert.ok(classes.has('settings-open'));assert.equal(nodes.get('videoOptions').open,true);
 events.keydown({key:'Escape',code:'Escape'});assert.equal(nodes.get('panel').hidden,true);
 nodes.get('previewTunnel').onclick();assert.equal(a.state.time,46);
 a.state.tunnels=false;a.state.bridges=false;nodes.get('previewBridge').onclick();assert.equal(a.state.time,186);assert.equal(a.state.bridges,true);assert.equal(a.state.tunnels,false);assert.equal(a.journeyFrame(195,a.state).tunnel,1);
 for(const fps of [30,60])for(const length of ['20','loop','600','720','900','1200']){const plan=a.exportPlan(a.state,{fps,height:1080,length});assert.equal(plan.fps,fps);assert.equal(plan.count,Math.round(plan.duration*fps));}
 console.log('PASS: all assets initialize, six scene tabs and eight carriages work, Customize/Cinema/Escape/Video settings work, export durations preserved. DOM simulation; no browser rendering or actual encoding.');
})().catch(e=>{console.error(e);process.exitCode=1});
