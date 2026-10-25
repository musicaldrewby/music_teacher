import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),esbuild=require('../node_modules/.pnpm/esbuild@0.27.3/node_modules/esbuild/lib/main.js');
const {createCanvas,loadImage}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'@napi-rs/canvas'):'@napi-rs/canvas');
const out=process.env.LBE_QA_DIR||path.join(os.tmpdir(),'living-water-qa');await fs.mkdir(out,{recursive:true});
await esbuild.build({stdin:{contents:"export * from './lib/engine';export * from './lib/model';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',outfile:out+'/water-engine.mjs'});
const {LivingEngine,recipes,layer,rect,seeded}=await import(out+'/water-engine.mjs');
globalThis.document={createElement:()=>createCanvas(1,1)};
const image=createCanvas(640,360),cx=image.getContext('2d'),r=seeded(93);cx.fillStyle='#233c42';cx.fillRect(0,0,640,360);for(let i=0;i<18000;i++){const v=Math.floor(r()*180+50);cx.fillStyle=`rgb(${v},${v},${v})`;cx.fillRect(r()*640,r()*360,2+r()*4,1+r()*3);}
const renderer=new LivingEngine(image,640,360),c=createCanvas(640,360);
function displacement(a,b){let best={error:Infinity,dx:0,dy:0};for(let dy=-5;dy<=5;dy++)for(let dx=-5;dx<=5;dx++){let error=0;for(let y=145;y<215;y+=2)for(let x=240;x<400;x+=2){const diff=a[(y*640+x)*4]-b[((y+dy)*640+x+dx)*4];error+=diff*diff;}if(error<best.error)best={error,dx,dy};}return best;}
const shifts=[];
for(const [name,flowPath,expected] of [['down',[[.5,.1],[.5,.9]],[0,1]],['up',[[.5,.9],[.5,.1]],[0,-1]],['right',[[.1,.5],[.9,.5]],[1,0]]]){
 const scene={...recipes.stream,layers:[layer('flow','Test current',rect(.1,.1,.8,.8),{path:flowPath,flowDistance:120,turbulence:0,opacity:1,speed:1})]};
 renderer.draw(c,scene,1.3);const a=c.getContext('2d').getImageData(0,0,640,360).data;
 renderer.draw(c,scene,1.55);const b=c.getContext('2d').getImageData(0,0,640,360).data,result=displacement(a,b);assert.ok(result.dx*expected[0]+result.dy*expected[1]>=1,name+' flow failed to carry image features in requested direction');shifts.push({name,...result});
}
const results=[];
for(const name of ['stream','rain']){const scene=recipes[name],img=await loadImage('public'+scene.background),eng=new LivingEngine(img,1280,720),can=createCanvas(1280,720);eng.draw(can,scene,0);const first=can.getContext('2d').getImageData(0,0,1280,720).data;const timings=[];for(let i=0;i<12;i++){const start=performance.now();eng.draw(can,scene,.3+i/30);timings.push(performance.now()-start);}let delta=0,changed=0;const second=can.getContext('2d').getImageData(0,0,1280,720).data;for(let k=0;k<first.length;k+=4){const d=Math.abs(first[k]-second[k])+Math.abs(first[k+1]-second[k+1])+Math.abs(first[k+2]-second[k+2]);delta+=d;if(d>12)changed++;}const result={name,meanFrameMs:timings.reduce((a,b)=>a+b)/timings.length,changedPixels:changed,meanChannelDifference:delta/(1280*720*3)};results.push(result);if(name==='stream')assert.ok(changed>35000,'Default current is still too subtle');await fs.writeFile(out+'/'+name+'-updated.png',can.toBuffer('image/png'));}
console.log(JSON.stringify({directionalFeatureTracking:shifts,visibilityAndTiming:results}));
