const fs=require('fs'),vm=require('vm'),assert=require('assert');
const {createCanvas,loadImage}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');
const path=require('path'),repo=path.resolve(__dirname,'..'),out=process.env.MLS_FROST_OUTPUT||fs.mkdtempSync(require('path').join(require('os').tmpdir(),'mls-frost-'));fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/before.html',require('child_process').execFileSync('git',['show','5fa0e2ba6b1452f96b09d64b105dcbea8915a38f:dist/index.html'],{cwd:repo}));
function section(s,a,b){return s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));}
(async()=>{
const frostMaterialImage=await loadImage(repo+'/assets/frost-crystals.png');
const ctx={frostMaterialImage,pointer:null,exporting:false,renderH:540,console,Math,Float32Array,Uint8Array,Uint8ClampedArray,state:{imageWidth:1920,imageHeight:1080},document:{createElement:()=>createCanvas(1,1)},texture:()=>({}),bind(){},gl:{texImage2D(...a){this.data=a.at(-1);this.args=a;}}};vm.createContext(ctx);
const source=fs.readFileSync(repo+'/dist/index.html','utf8');
vm.runInContext(source.split('\n').find(l=>l.startsWith('function particleRandom(')),ctx);
vm.runInContext(section(source,'function natureFrostTexture(','function natureAsset('),ctx);
const mask=createCanvas(512,288);let c=mask.getContext('2d');c.fillStyle='white';c.fillRect(0,0,512,288);
const l={type:'frost',natureVariant:0,natureAmount:.42,natureSecondary:.7,natureGrowth:.18,natureSize:1.5,natureHeight:.88,x:.5,y:.5,natureSeed:2371,frostScale:170,frostDensity:.7,color:'#e0ebed',natureColorB:'#c4d2d8'};let r={mask,maskRevision:0};ctx.l=l;ctx.r=r;
function capture(label){const start=Date.now();vm.runInContext('natureFrostTexture(l,r)',ctx);const a=ctx.gl.args;fs.writeFileSync(out+'/'+label+'.rgba',ctx.gl.data);fs.writeFileSync(out+'/'+label+'.json',JSON.stringify({width:a[3],height:a[4]}));fs.writeFileSync(out+'/'+label+'.png',r.natureCanvas.toBuffer('image/png'));console.log(label,'generated in',Date.now()-start,'ms');}
capture('frost');assert(Buffer.from(source.match(/const FROST_MATERIAL_DATA='data:image\/png;base64,([^']+)'/)[1],'base64').equals(fs.readFileSync(repo+'/assets/frost-crystals.png')));const first=ctx.gl.data.slice();vm.runInContext('natureFrostTexture(l,r)',ctx);assert.deepEqual(ctx.gl.data,first);c.clearRect(0,0,512,288);c.beginPath();c.ellipse(256,144,175,122,0,0,Math.PI*2);c.fill();r.maskRevision++;capture('masked-frost');assert.notDeepEqual(ctx.gl.data,first);
fs.writeFileSync(out+'/mask.png',mask.toBuffer('image/png'));
// Old material for an honest before/after comparison.
const old=fs.readFileSync(out+'/before.html','utf8');vm.runInContext(section(old,'function natureFrostTexture(','function natureAsset('),ctx);ctx.r={mask};vm.runInContext('natureFrostTexture(l,r)',ctx);fs.writeFileSync(out+'/old-atlas.png',ctx.r.natureCanvas.toBuffer('image/png'));
console.log('PASS seeded atlas, cache, and paint-mask invalidation');

})();
