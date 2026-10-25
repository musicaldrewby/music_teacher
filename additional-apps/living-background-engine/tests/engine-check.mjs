import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const esbuild=require('../node_modules/.pnpm/esbuild@0.27.3/node_modules/esbuild/lib/main.js');
const {createCanvas,loadImage}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'@napi-rs/canvas'):'@napi-rs/canvas');
const out=process.env.LBE_QA_DIR||path.join(os.tmpdir(),'living-background-qa');await fs.mkdir(out,{recursive:true});
await esbuild.build({stdin:{contents:"export * from './lib/engine'; export * from './lib/model';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',outfile:out+'/engine.mjs'});
const {LivingEngine,recipes,sceneSchema,applyOperations,layer,rect,effects}=await import(out+'/engine.mjs');
globalThis.document={createElement:()=>createCanvas(1,1)};
let checks=0;const digest=c=>createHash('sha256').update(c.toBuffer('image/png')).digest('hex');
for(const [key,scene] of Object.entries(recipes)){
 sceneSchema.parse(scene);checks++;
 const image=await loadImage('public'+scene.background),engine=new LivingEngine(image,1280,720),c=createCanvas(1280,720);
 engine.draw(c,scene,0);const first=digest(c);
 engine.draw(c,scene,scene.duration);assert.equal(digest(c),first,key+' loop endpoints differ');checks++;
 engine.draw(c,scene,1.7);assert.notEqual(digest(c),first,key+' is not moving');checks++;
 await fs.writeFile(out+'/'+key+'.png',c.toBuffer('image/png'));
 const original=structuredClone(scene);assert.throws(()=>applyOperations(scene,[{op:'set_scene',wind:.9},{op:'remove_layer',id:'missing'}]));assert.deepEqual(scene,original);checks++;
 assert.throws(()=>applyOperations(scene,[{op:'add_layer',layer:scene.layers[0]}]));checks++;
 assert.throws(()=>applyOperations(scene,[{op:'reorder_layers',ids:scene.layers.map(()=>scene.layers[0].id)}]));checks++;
}
const img=await loadImage('public'+recipes.stream.background),engine=new LivingEngine(img,640,360),c=createCanvas(640,360);
for(const effect of effects){const l=layer(effect,'Test',rect(.1,.1,.8,.8),{opacity:.8,exclude:[rect(.4,.4,.2,.2)]}),s={...recipes.stream,layers:[l]};
 engine.draw(c,{...s,layers:[]},0);const base=c.getContext('2d').getImageData(320,180,1,1).data.slice();
 engine.draw(c,s,0);const start=digest(c);assert.deepEqual(c.getContext('2d').getImageData(320,180,1,1).data,base,'Foreground protection failed: '+effect);checks++;
 engine.draw(c,s,s.duration);assert.equal(digest(c),start,effect+' loop mismatch');checks++;
 engine.draw(c,s,1.37);assert.notEqual(digest(c),start,effect+' not changing');checks++;
}
// Every light mode must repeat exactly; only steady glow remains time-invariant.
const treeImage=await loadImage('public'+recipes.christmas.background),treeEngine=new LivingEngine(treeImage,1280,720),treeCanvas=createCanvas(1280,720);
const bulbs=recipes.christmas.layers.find(l=>l.type==='lights');
for(const lightMode of ['steady','twinkle','flash','chase']){
 const scene={...recipes.christmas,layers:[{...bulbs,lightMode}]};
 treeEngine.draw(treeCanvas,scene,0);const first=digest(treeCanvas);
 treeEngine.draw(treeCanvas,scene,scene.duration);assert.equal(digest(treeCanvas),first,lightMode+' lights loop mismatch');checks++;
 treeEngine.draw(treeCanvas,scene,1.7);const later=digest(treeCanvas);
 if(lightMode==='steady')assert.equal(later,first,'Steady bulbs should not pulse');else assert.notEqual(later,first,lightMode+' lights must animate');checks++;
 await fs.writeFile(out+'/lights-'+lightMode+'.png',treeCanvas.toBuffer('image/png'));
}
assert.throws(()=>sceneSchema.parse({...recipes.stream,background:'https://malicious.example/image.png'}));checks++;
assert.throws(()=>sceneSchema.parse({...recipes.stream,duration:0}));checks++;
assert.throws(()=>sceneSchema.parse({...recipes.stream,layers:[{...recipes.stream.layers[0],region:[[2,3],[0,0],[1,1]]}]}));checks++;
console.log(JSON.stringify({checks,scenes:Object.keys(recipes).length,effects:effects.length,loopEndpoints:'pixel-identical',foregroundProtection:'verified',atomicEdits:'verified',previewDirectory:out}));
