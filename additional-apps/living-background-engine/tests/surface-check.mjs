import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const esbuild=require('../node_modules/.pnpm/esbuild@0.27.3/node_modules/esbuild/lib/main.js');
const {createCanvas,loadImage}=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'@napi-rs/canvas'));
const out=process.env.LBE_QA_DIR||path.join(os.tmpdir(),'living-surfaces-qa');await fs.mkdir(out,{recursive:true});
await esbuild.build({stdin:{contents:"export * from './lib/engine';export * from './lib/model';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',outfile:out+'/surface-engine.mjs'});
const {LivingEngine,recipes}=await import(out+'/surface-engine.mjs');
globalThis.document={createElement:()=>createCanvas(1,1)};
const w=1280,h=720,canvas=createCanvas(w,h),ctx=canvas.getContext('2d');
const pixels=()=>ctx.getImageData(0,0,w,h).data.slice();
function sharpness(data){let total=0,count=0;for(let y=280;y<460;y++)for(let x=80;x<1100;x++){
 const i=(y*w+x)*4;for(let k=0;k<3;k++){total+=Math.abs(data[i+k]-data[i+4+k])+Math.abs(data[i+k]-data[i+w*4+k]);count+=2;}
}return total/count;}
const beach=recipes.beach,renderer=new LivingEngine(await loadImage('public'+beach.background),w,h),ocean=beach.layers.find(l=>l.type==='ocean');
assert.ok(ocean,'Beach must use the dedicated ocean renderer');
renderer.draw(canvas,{...beach,layers:[]},0);const base=sharpness(pixels());
const old={...ocean,type:'flow',scale:1,flowDistance:44,turbulence:.65,speed:.65,path:[[.48,.296],[.48,.45],[.46,.61],[.44,.82]]};
renderer.draw(canvas,{...beach,layers:[old]},1.7);const blended=sharpness(pixels());await fs.writeFile(out+'/beach-old-blended.png',canvas.toBuffer('image/png'));
const scores=[],times=[];
for(const t of [.3,1.7,3.1]){const start=performance.now();renderer.draw(canvas,{...beach,layers:[ocean]},t);times.push(performance.now()-start);scores.push(sharpness(pixels())/base);}
const retained=Math.min(...scores);assert.ok(retained>.78,'Ocean loses too much source detail');assert.ok(retained>blended/base*1.1,'Ocean should be visibly sharper than dual-image blending');
await fs.writeFile(out+'/beach-sharp.png',canvas.toBuffer('image/png'));
const neon=recipes.neon,streetRenderer=new LivingEngine(await loadImage('public'+neon.background),w,h),impacts=neon.layers.find(l=>l.type==='rain_impacts');
assert.ok(impacts);assert.ok(!neon.layers.some(l=>l.type==='flow'||l.type==='ocean'||l.type==='ripples'),'Pavement must not have a water transport layer');
streetRenderer.draw(canvas,{...neon,layers:[]},0);const road=pixels();
let maxChanged=0;
for(const t of [.1,.7,1.3]){streetRenderer.draw(canvas,{...neon,layers:[impacts]},t);const frame=pixels();let changed=0;for(let i=0;i<road.length;i+=4)if(frame[i]!==road[i]||frame[i+1]!==road[i+1]||frame[i+2]!==road[i+2])changed++;assert.ok(changed>100,'Impacts should be visible');assert.ok(changed/(w*h)<.015,'Impacts should remain localized');maxChanged=Math.max(maxChanged,changed);}
await fs.writeFile(out+'/road-local-impacts.png',canvas.toBuffer('image/png'));
console.log(JSON.stringify({oceanDetailRetained:scores,oldBlendedDetail:blended/base,roadMaximumChangedPixels:maxChanged,roadUnchangedPercent:100*(1-maxChanged/(w*h)),oceanFrameMs:times.slice(1)}));
