// Regression: fractional export timestamps must never leave a background-only frame.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
let foregroundDraws=0;
function context(){return new Proxy({measureText:text=>({width:text.length*20}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),drawImage(image){if(image?.foreground)foregroundDraws++;}},{get:(o,k)=>k in o?o[k]:()=>{}});}
class Surface{constructor(width,height){this.width=width;this.height=height;this.foreground=true;}getContext(){return context();}}
const box={window:{},OffscreenCanvas:Surface,Path2D:class{}};vm.createContext(box);
vm.runInContext(fs.readFileSync('dist/scene-renderer.js','utf8'),box);
vm.runInContext(fs.readFileSync('dist/video-plan.js','utf8'),box);
const app=fs.readFileSync('dist/app.js','utf8');vm.runInContext(app.slice(0,app.indexOf('const BASICS'))+';window.data={MOVES,STOP};',box);
const scene=box.window.MovementScene,plans=box.window.MovementVideoPlan,data=box.window.data;
for(const t of [-5e-16,4.999999999999998,9.999999999999998])assert.doesNotThrow(()=>scene.trafficAt(t,{time:t,seed:8679}));
Object.assign(scene.images,{city:{width:1920,height:500},road:{},cloud:{},bus:{},tony:{},owner:{},dog:{},carsLeft:scene.fleet.map(()=>({width:1800,height:1100})),cars:scene.fleet.map(()=>({width:1800,height:1100}))});
const c=context();let checked=0;
for(const fps of [30,60])for(const opening of ['smoke','bus','fade','none']){
 const cfg={opening,ending:'smoke',seconds:180,endOnStop:true,seed:100+fps+opening.length,moves:data.MOVES.map(m=>({id:m.id,weight:1,seconds:9.6}))},plan=plans.build(cfg);
 for(let f=Math.ceil(plan.intro*fps);f<(plan.intro+plan.gameDuration)*fps;f++){
  foregroundDraws=0;scene.frame(c,1920,1080,f/fps,plan,cfg,data);
  assert.equal(foregroundDraws,1,`${fps} fps, ${opening}, frame ${f}: movement sign must render`);checked++;
 }
}
console.log(`PASS: ${checked} game frames at 30/60 fps across all openings keep their movement signs; fractional traffic boundaries no longer throw.`);
