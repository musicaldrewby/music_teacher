const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const script=fs.readFileSync('dist/app.js','utf8'),markup=fs.readFileSync('dist/index.html','utf8');
async function boot({query='',pending=null,failModes=[],badImage=false,timeoutImage=false,drawFailure=false}={}){
 const nodes=new Map([...markup.matchAll(/\bid="([^"]+)"/g)].map(m=>[m[1],node(m[1])]));
 function node(id=''){return {id,value:'',checked:false,hidden:false,disabled:false,style:{},children:[],textContent:'',setAttribute(k,v){this[k]=String(v)},appendChild(n){this.children.push(n)},replaceChildren(...n){this.children=n},focus(){},querySelector(){return node()},tagName:'BUTTON'};}
 const document={getElementById:id=>nodes.get(id)||null,createElement:()=>node(),activeElement:{tagName:'BODY'},addEventListener(){},body:{classList:{contains(){return false},remove(){},toggle(){}}}};
 for(const [id,value] of Object.entries({fps:'60',resolution:'1080',length:'1200'}))nodes.get(id).value=value;
 const session=new Map(pending?[['train-window-starting',JSON.stringify({mode:pending,time:Date.now()})]]:[]),calls=[];
 const window={location:{search:query,href:'https://example.test/'+query,assign(){},reload(){}},addEventListener(){}};
 let destroyed=0;
 class Image{async decode(){if(this.src.includes('landscape.webp')){if(badImage)throw Error('Network failure');if(timeoutImage)await new Promise(()=>{});}}}
 const context=vm.createContext({document,window,Image,performance,URL,URLSearchParams,Date,console:{log(){},warn(){},error(){}},
  setTimeout:(fn,ms)=>setTimeout(fn,ms===45000?5:0),clearTimeout,requestAnimationFrame(){},
  localStorage:{getItem(){return null},setItem(){}},sessionStorage:{getItem:k=>session.get(k),setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)},
  Blob,TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,
  makeTestRenderer:async(canvas,mode)=>{calls.push(mode);if(failModes.includes(mode))throw Error('Simulated graphics failure');return {draw(){if(drawFailure&&mode==='full')throw Error('First-frame failure')},destroy(){destroyed++}};}});
 const source=script.replace(/init\(\);\s*$/,`makeRenderer=makeTestRenderer;globalThis.api={prepareGraphicsProgram};globalThis.initialized=init();`);
 vm.runInContext(source,context);await context.initialized;await new Promise(resolve=>setTimeout(resolve,10));
 return {nodes,window,calls,session,context,get destroyed(){return destroyed}};
}
function mockGL({pending=2,linked=true,lost=false}={}){
 const order=[],deleted=[];let polls=0;
 return {order,deleted,VERTEX_SHADER:1,FRAGMENT_SHADER:2,LINK_STATUS:3,
  createProgram(){return 'program'},createShader(type){return 'shader'+type},getExtension(){return {COMPLETION_STATUS_KHR:4}},
  shaderSource(){},compileShader(){order.push('compile')},attachShader(){},linkProgram(){order.push('link')},
  getProgramParameter(p,key){if(key===4){order.push('poll');return ++polls>pending;}assert.ok(polls>pending,'LINK_STATUS must not block unfinished compilation');order.push('status');return linked;},
  isContextLost(){return lost},getProgramInfoLog(){return 'test link failure'},getShaderInfoLog(){return 'test shader failure'},
  deleteProgram(p){deleted.push(p)},deleteShader(s){deleted.push(s)}};
}
(async()=>{
 let r=await boot();assert.deepEqual(r.calls,['full']);assert.equal(r.window.demo.ready,true);assert.equal(r.nodes.get('view').height,720);assert.equal(r.session.size,0);assert.equal(r.nodes.get('loading').style.display,'none');
 r=await boot({query:'?graphics=compatible'});assert.deepEqual(r.calls,['compatible']);assert.equal(r.nodes.get('view').height,540);assert.equal(r.nodes.get('fps').value,'60');assert.equal(r.nodes.get('resolution').value,'1080');
 r=await boot({failModes:['full']});assert.deepEqual(r.calls,['full','compatible']);assert.equal(r.window.demo.graphics,'compatible');assert.equal(r.session.size,0);
 r=await boot({drawFailure:true});assert.deepEqual(r.calls,['full','compatible']);assert.equal(r.destroyed,1);assert.equal(r.window.demo.ready,true);
 r=await boot({pending:'full'});assert.deepEqual(r.calls,['compatible']);
 r=await boot({pending:'full',query:'?graphics=full'});assert.deepEqual(r.calls,['full']);assert.equal(r.nodes.get('view').height,1080);
 r=await boot({failModes:['full','compatible']});assert.equal(r.window.demo,undefined);assert.equal(r.nodes.get('loading').style.display,'grid');assert.equal(r.nodes.get('loadDiagnostics').hidden,false);assert.match(r.nodes.get('loadStatus').textContent,/Simulated graphics failure/);
 for(const failure of [{badImage:true},{timeoutImage:true}]){r=await boot(failure);assert.equal(r.calls.length,0);assert.match(r.nodes.get('loadDetails').textContent,/Image: landscape/);assert.match(r.nodes.get('loadStatus').textContent,/could not load/);}
 const prepare=r.context.api.prepareGraphicsProgram;
 let gl=mockGL(),yields=0;await prepare(gl,'shader',{pause:async()=>{yields++}});assert.equal(yields,2);assert.equal(gl.deleted.length,2);
 gl=mockGL({pending:100});let now=0;await assert.rejects(prepare(gl,'shader',{timeout:3,now:()=>now,pause:async()=>{now+=2}}),/taking too long/);assert.ok(gl.deleted.includes('program'));assert.ok(!gl.order.includes('status'));
 gl=mockGL({pending:0,linked:false});await assert.rejects(prepare(gl,'shader'),/could not prepare/);assert.ok(gl.deleted.includes('program'));
 gl=mockGL({lost:true});await assert.rejects(prepare(gl,'shader'),/connection was lost/);
 console.log('PASS: normal and compatibility startup, automatic recovery, first-frame cleanup, image failure/timeout, visible errors, nonblocking compile polling, timeout and context-loss cleanup. Simulated browser APIs; not a laptop/browser GPU test.');
})().catch(error=>{console.error(error);process.exitCode=1});
