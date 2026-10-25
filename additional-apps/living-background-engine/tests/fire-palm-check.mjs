import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),esbuild=require('../node_modules/.pnpm/esbuild@0.27.3/node_modules/esbuild/lib/main.js');
const {createCanvas,loadImage}=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'@napi-rs/canvas'));
const out=await fs.mkdtemp(path.join(os.tmpdir(),'fire-palm-'));
await esbuild.build({stdin:{contents:"export * from './lib/engine';export * from './lib/model';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',outfile:out+'/engine.mjs'});
const {LivingEngine,recipes}=await import(out+'/engine.mjs');
globalThis.document={createElement:()=>createCanvas(1,1)};
const results={};
for(const [name,type,protectedPoints] of [['fire','fire',[[.52,.64],[.56,.615],[.445,.667],[.64,.665],[.55,.693]]],['beach','sway',[[.954,.17],[.977,.265],[.998,.36],[.5,.8],[.3,.289]]]]){
 const scene={...recipes[name],layers:recipes[name].layers.filter(l=>l.type===type)},c=createCanvas(1280,720),e=new LivingEngine(await loadImage('public'+scene.background));
 const data=()=>c.getContext('2d').getImageData(0,0,1280,720).data.slice();
 e.draw(c,{...scene,layers:[]},0);const base=data();e.draw(c,scene,0);const first=data();
 e.draw(c,scene,scene.duration);assert.deepEqual(data(),first,name+' loop must close');
 let changed=0;const start=performance.now();
 for(const t of [.7,1.9,3.1,5.3]){e.draw(c,scene,t);const frame=data();for(const [x,y]of protectedPoints){const k=(Math.floor(y*720)*1280+Math.floor(x*1280))*4;assert.deepEqual(frame.slice(k,k+4),base.slice(k,k+4),name+' protected point moved');}
  changed=0;for(let k=0;k<frame.length;k+=4)if(Math.abs(frame[k]-first[k])+Math.abs(frame[k+1]-first[k+1])+Math.abs(frame[k+2]-first[k+2])>15)changed++;
  assert.ok(changed>150,name+' motion must be visible');
 }
 results[name]={visibleMovingPixels:changed,protectedPoints:'unchanged',loop:'exact',averageFrameMs:Math.round((performance.now()-start)/4)};
}
console.log(JSON.stringify(results));
await fs.rm(out,{recursive:true});
