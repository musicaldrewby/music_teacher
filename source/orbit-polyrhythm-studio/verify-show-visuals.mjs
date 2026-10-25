import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {ShowVisuals} from './dist/show-visuals.js';
import {musicalLight,worldFor,WORLDS,cameraPose} from './dist/show-worlds.js';
import {createJourney,normalizeShow,makeCue,sampleCue,compileCue,createVisualTour,showDuration} from './dist/show-score.js';
import {getFactoryPreset} from './dist/factory-presets.js';
const modulePath=process.env.ORBIT_CANVAS_MODULE||path.join(process.env.CODEX_PRIMARY_RUNTIME_ROOT,'dependencies/python/lib/python3.12/site-packages/artifact_tool_v2/bin/node_modules/skia-canvas/lib/index.mjs');
const {Canvas}=await import(modulePath),make=(w,h)=>{const c=new Canvas(w,h);c.gpu=false;return c},canvas=make(1280,720),g=canvas.getContext('2d'),visuals=new ShowVisuals(make),hash=b=>createHash('sha256').update(b).digest('hex');
const horizon=createJourney(),marimba=createJourney({style:'marimba'});assert(horizon.cinema);assert(horizon.cues.some(c=>c.visual.world==='Aurora Veils'));assert(marimba.cues.some(c=>c.visual.world==='Prism Garden'));
const old=structuredClone(horizon);delete old.cinema;for(const c of old.cues){delete c.visual.world;delete c.visual.camera}const legacy=normalizeShow(old);assert.equal(legacy.cinema,false);assert.equal(legacy.cues[0].visual.world,'Orbit Rings');
for(const key of ['world','camera']){const bad=structuredClone(horizon);bad.cues[0].visual[key]='unknown';assert.throws(()=>normalizeShow(bad),/Unknown/)}
assert.deepEqual(normalizeShow(JSON.parse(JSON.stringify(horizon))),horizon);
const cue=makeCue(getFactoryPreset('Wood & Stars'));cue.automation=[{at:0,duration:10,path:'visual.zoom',value:1.2,curve:'linear'}];assert.equal(sampleCue(compileCue(cue),5).visual.zoom,1.1);
const tour=createVisualTour();assert.equal(showDuration(tour),120);assert.equal(new Set(tour.cues.map(c=>c.visual.world)).size,6);assert.deepEqual(normalizeShow(JSON.parse(JSON.stringify(tour))),tour);
const active=getFactoryPreset('Wood & Stars');active.tracks[0].mute=false;active.tracks.forEach(t=>t.solo=false);const hits=Array.from({length:8},(_,i)=>({time:19800-i*61,step:i+1,accent:i%3===0})),energy=musicalLight(active,hits,20);assert(energy[0].strike>0);const muted=structuredClone(active);muted.tracks[0].mute=true;assert.equal(musicalLight(muted,hits,20)[0].strike,0);assert.equal(musicalLight(active,hits,20,true)[0].strike,0);assert(energy[0].trail>=energy[0].strike);
const snap={seconds:20,total:60,index:0,title:'New worlds',showTitle:'First Light',artist:'Drew Wichman',state:active,visual:{world:'Prism Garden',camera:'Drift',look:'Auto',glow:90,speed:.5,zoom:1,titles:true},hits,beat:20,level:.16,blend:1,cinema:true,done:false};
const quietHits=hits.map(h=>({...h,velocity:28})),loudHits=hits.map(h=>({...h,velocity:115}));assert(musicalLight(active,quietHits,20)[0].strike<musicalLight(active,loudHits,20)[0].strike);
let texts=0;const oldText=g.fillText.bind(g);g.fillText=(...args)=>{texts++;oldText(...args)};
const output=process.argv[2],hashes={},start=Date.now();if(output)fs.mkdirSync(output,{recursive:true});
for(const world of WORLDS.filter(x=>x!=='Auto')){
 const s={...snap,visual:{...snap.visual,world},state:getFactoryPreset(world==='Prism Garden'||world==='Liquid Echoes'?'Wood & Stars':world==='Aurora Veils'?'Solar Veil':world==='Resonance Field'?'Photon Rail':'Event Horizon')};
 visuals.draw(g,1280,720,s);const bytes=await canvas.toBuffer('raw'),first=hash(bytes);assert.equal(texts,0);assert(bytes.some((v,i)=>i%4!==3&&v>80),world+' needs visible light');hashes[world]=first;
 if(output)await canvas.toFile(path.join(output,world.replaceAll(' ','-')+'.png'));
 visuals.draw(g,1280,720,{...s,seconds:40});assert.notEqual(hash(await canvas.toBuffer('raw')),first);
 visuals.draw(g,1280,720,s);assert.equal(hash(await canvas.toBuffer('raw')),first,'Same sample-time frame must reproduce exactly');
 if(['Liquid Echoes','Resonance Field','Wave Cathedral'].includes(world)){
  visuals.draw(g,1280,720,{...s,hits:Array(8).fill(null)});assert.notEqual(hash(await canvas.toBuffer('raw')),first,world+' must respond to actual notes');
  for(const [w,h] of [[720,1280],[2560,1080]]){const c=make(w,h);visuals.draw(c.getContext('2d'),w,h,s);assert.equal((await c.toBuffer('raw')).length,w*h*4)}
  const frames=new Set();for(let i=0;i<6;i++){visuals.draw(g,1280,720,{...s,seconds:20+i/60});frames.add(hash(await canvas.toBuffer('raw')))}assert.equal(frames.size,6,'Native 60 fps frames must evolve independently');
 }
 const still={...s,visual:{...s.visual,speed:0}};visuals.draw(g,1280,720,still);const frozen=hash(await canvas.toBuffer('raw'));visuals.draw(g,1280,720,{...still,seconds:75,beat:75,level:.8});assert.equal(hash(await canvas.toBuffer('raw')),frozen,'Zero motion must freeze all animation');
}
assert.equal(new Set(Object.values(hashes)).size,7);
visuals.draw(g,1280,720,{...snap,cinema:false});assert(texts>0);texts=0;visuals.draw(g,1280,720,{...snap,cinema:false,visual:{...snap.visual,titles:false}});assert.equal(texts,0);
const prev={state:getFactoryPreset('Event Horizon'),visual:{...snap.visual,world:'Event Horizon'},hits,beat:20,gain:1};
visuals.draw(g,1280,720,{...snap,...prev});const before=hash(await canvas.toBuffer('raw'));visuals.draw(g,1280,720,{...snap,previous:prev,blend:0});assert.equal(hash(await canvas.toBuffer('raw')),before,'Crossfade starts at outgoing scene');
visuals.draw(g,1280,720,snap);const after=hash(await canvas.toBuffer('raw'));visuals.draw(g,1280,720,{...snap,previous:prev,blend:1});assert.equal(hash(await canvas.toBuffer('raw')),after,'Crossfade ends at incoming scene');
visuals.draw(g,1280,720,{...snap,previous:prev,blend:Math.SQRT1_2});if(output)await canvas.toFile(path.join(output,'Dissolve.png'));
for(const [w,h] of [[720,1280],[2560,1080],[640,360]]){const c=make(w,h);visuals.draw(c.getContext('2d'),w,h,snap);assert.equal((await c.toBuffer('raw')).length,w*h*4)}
assert.deepEqual(cameraPose(20,{speed:1,zoom:1,camera:'Still'}),{x:0,y:0,rotation:0,zoom:1});
const report={worlds:7,deterministicFrames:true,distinctScenes:true,legacyScores:true,mutedTracksDark:true,zeroMotionFrozen:true,cinemaNoOverlays:true,dissolveEndpointsExact:true,portraitAndUltrawide:true,elapsedSeconds:(Date.now()-start)/1000,browserQA:false};console.log(JSON.stringify(report,null,2));
