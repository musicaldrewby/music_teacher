import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {Canvas} from 'skia-canvas';
import {OrbitLights,paletteFor} from './dist/visuals.js';
import {getFactoryPreset} from './dist/factory-presets.js';
const state=getFactoryPreset('Event Horizon'),lights=new OrbitLights();
const common={beat:5.3,running:true,tracks:state.tracks,bars:state.bars,selected:0,palette:paletteFor(state.name),level:.3,dim:.7,calm:false,now:10000};
const hash=c=>createHash('sha256').update(c.getContext('2d').getImageData(0,0,c.width,c.height).data).digest('hex');
function frame(w,h,opts={}){const c=new Canvas(w,h);lights.draw(c.getContext('2d'),w,h,{...common,...opts});return c;}
for(const [w,h] of [[1,1],[345,310],[900,490],[1600,720]]){const c=frame(w,h);assert.equal(c.width,w);assert.equal(c.height,h);}
assert.equal(hash(frame(900,490,{calm:true,now:1000})),hash(frame(900,490,{calm:true,now:2000})),'Gentle motion freezes traveling lights and atmosphere');
assert.notEqual(hash(frame(900,490)),hash(frame(900,490,{palette:paletteFor('Weightless Dawn')})),'Preset colors change the real render');
const w=900,h=490,c=new Canvas(w,h),g=c.getContext('2d'),frames=new Set(),start=performance.now();
for(let i=0;i<60;i++){lights.draw(g,w,h,{...common,beat:5.3+i/60*state.bpm/60,now:10000+i*1000/60});frames.add(hash(c));}
assert.equal(frames.size,60,'All 60 adjacent display frames advance');
const renderAndReadbackMs=+(performance.now()-start).toFixed(1);
const muted=state.tracks.map(t=>({...t,mute:true}));lights.clear();const before=hash(frame(w,h,{tracks:muted}));lights.hit([{track:0,step:0,accent:true}],10000);assert.equal(before,hash(frame(w,h,{tracks:muted})),'Muted tracks do not light up');
const html=fs.readFileSync('dist/index.html','utf8'),css=fs.readFileSync('dist/horizon.css','utf8'),js=fs.readFileSync('dist/app.js','utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);assert(html.includes('horizon.css?v=20261014'));assert(ids.includes('studioMeta'));
for(const id of ['audioRenderDialog','audioFormat','showStudio','stepGrid','ambientControls','save','load','listen','fullScreen'])assert(ids.includes(id));
assert(js.includes('lighting.calm?48:14'),'Live animation allows 60 Hz updates');assert(css.includes('@media(max-width:430px)'));assert(css.includes('@media(prefers-reduced-motion:reduce)'));
let depth=0;for(const char of css){if(char==='{')depth++;if(char==='}')depth--;assert(depth>=0);}assert.equal(depth,0);
const manifest=JSON.parse(fs.readFileSync('dist/agent/manifest.json'));for(const f of manifest.files){const bytes=fs.readFileSync('dist/'+f.url);assert.equal(bytes.length,f.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256);}
const report={canvasSizes:[[1,1],[345,310],[900,490],[1600,720]],uniqueFramesAt60Hz:frames.size,sixtyFrameRenderAndPixelReadbackMs:renderAndReadbackMs,gentleMotionFrozen:true,presetColorsDistinct:true,mutedHitsIgnored:true,documentControlsRetained:true,agentManifestVerified:true,browserQA:false};
fs.writeFileSync('overhaul-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
