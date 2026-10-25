const fs=require('fs'),assert=require('assert'),h=require('./app-harness.cjs');
const {createCanvas,Image}=require('@napi-rs/canvas');
(async()=>{
 await h.ready;assert.deepEqual(h.errors,[]);h.click('welcomeStart');const before=h.run('snapshot()');
 h.context.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync('public/'+url))});
 await h.run("exampleOpen('spooky')");
 assert(h.el('ambientDialog').open);assert(h.run('ambientRun.playing'));assert.equal(h.run('ambientRun.total'),140);assert.equal(h.run('activeAudio(state)'),false);
 h.run('validateProject(JSON.parse(snapshot()))');
 const p=JSON.parse(h.run('snapshot()'));assert.equal(p.scenes.length,1);assert.equal(p.filmFinish.aspect,'native');assert.equal(Object.keys(p.imports).length,4);
 // Real native canvas renders check the endpoints, optical layers and travel.
 fs.mkdirSync('.sites-runtime/spooky-review',{recursive:true});h.run('globalThis.spookyCanvas=makeCanvas(1280,720)');
 const renders=[];
 for(const t of [0,10,40,70,80,110,140-1/60,140]){
  h.context.reviewTime=t;
  const bytes=h.run("(()=>{drawScene(spookyCanvas.getContext('2d'),state.scenes[0],1280,720,reviewTime,false,false,state);return spookyCanvas.toBuffer('image/png')})()");
  fs.writeFileSync('.sites-runtime/spooky-review/frame-'+t.toFixed(2)+'.png',bytes);renders.push(bytes);
 }
 assert(renders[0].equals(renders.at(-1)),'Loop end must exactly match its first image');assert(renders[0].equals(renders.at(-2)),'Last exported frame must meet the opening frame');assert(!renders[0].equals(renders[3]),'The camera must reach the other town');
 const pano=p.scenes[0].items[0];for(const k of pano.keyframes){assert(k.pose.x-k.pose.w/2<=0,'Left canvas edge exposed');assert(k.pose.x+k.pose.w/2>=1600,'Right canvas edge exposed');assert(k.pose.y-k.pose.h/2<0&&k.pose.y+k.pose.h/2>900);}
 // Motion is measured by time, including exact wrap, pause, pace and restart.
 h.context.fakeNow=1000;h.run('performance={now:()=>fakeNow};ambientRun.started=1000;ambientRun.offset=139.8');h.context.fakeNow=1500;assert(Math.abs(h.run('ambientPosition()')-.3)<1e-6);
 h.click('ambientPlay');const stopped=h.run('ambientPosition()');h.context.fakeNow=5000;assert.equal(h.run('ambientPosition()'),stopped);h.click('ambientPlay');h.el('ambientSpeed').value='.5';h.el('ambientSpeed').onchange({target:h.el('ambientSpeed')});h.context.fakeNow=7000;assert(Math.abs(h.run('ambientPosition()')-stopped-1)<1e-6);
 h.click('ambientRestart');assert.equal(h.run('ambientPosition()'),0);h.click('ambientClose');assert.equal(h.run('ambientRun'),null);assert(!h.el('ambientDialog').open);
 h.click('present');await new Promise(resolve=>setImmediate(resolve));assert(h.el('ambientDialog').open);h.click('ambientClose');
 h.run('undo()');assert.equal(h.run('snapshot()'),before);h.click('present');assert(h.run('presenting'),'Regular stories must retain their usual Present behavior');h.run('present(false)');assert.deepEqual(h.errors,[]);
 console.log('PASS: native story import, exact 140-second duration, silent playback, embedded artwork, all panorama edges covered, identical opening/ending/last-exported frames, different destinations, continuous loop clock, pause/resume, pace, restart, close, saved-story presentation, Undo, ordinary Present behavior.');
})().catch(e=>{console.error(e);process.exitCode=1});
