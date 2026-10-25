const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(require('path').join(__dirname,'../public/studio.html'),'utf8');
const section=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
const sandbox={console,assert,Math,Float32Array,Uint8ClampedArray,WeakMap,state:{imageWidth:1920,imageHeight:1080,duration:10},uid:()=>'',texture:c=>({}),gl:{bindTexture(){},texImage2D(...args){this.pixels=args.at(-1)}}};vm.createContext(sandbox);
vm.runInContext(section('function ensureFlow(','function selectedFlow('),sandbox);vm.runInContext(source.split('\n').find(l=>l.startsWith('function flowTiming(')),sandbox);
vm.runInContext(`
const l={type:'flow',arrows:[{ax:.1,ay:.5,bx:.9,by:.5,speed:1}],paths:[],anchors:[],scale:.3,flowAcceleration:0};ensureFlow(l);const r={};updateFlowField(l,r);let pixels=gl.pixels;
assert.equal(pixels[(0*256+128)*4],128);assert.equal(pixels[(0*256+128)*4+3],255,'still field should not be damped');assert(pixels[(128*256+128)*4]>128);
const prior=pixels.slice();l.anchors.push({x:.5,y:.5,radius:.08});updateFlowField(l,r);pixels=gl.pixels;
assert.equal(flowAt(l,.5,.5,1920/1080)[2],0,'anchor center fixed');assert(pixels[(128*256+128)*4+2]<=3,'nearest texel nearly fixed');let affected=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]<prior[i+3])affected++;assert(affected>100,'detail guard responds to velocity gradients around anchors');
for(const duration of [10,20,30,60]){state.duration=duration;for(const rate of [0,.001,.01,.1,1,3,12]){const f=flowTiming({flowRate:rate,cycles:1});assert(Number.isInteger(f.count));assert(Number.isFinite(f.travelScale));assert(Math.abs(f.count*f.travelScale-Math.max(1,Math.round(duration/4))*rate)<1e-9);if(rate===0)assert.equal(f.travelScale,0);}}
console.log('PASS raw flow field upload, zero-flow encoding, anchor attenuation, deformation budget and speed range for all loop durations');
`,sandbox);
