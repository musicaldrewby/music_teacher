const fs=require('fs'),assert=require('assert'),{createCanvas,Image}=require('@napi-rs/canvas');
const h=require('./app-harness.cjs');
(async()=>{
 await h.ready;h.context.pigs=JSON.parse(fs.readFileSync('public/examples/three-little-pigs.felt.json'));
 h.click('welcomeStart');const before=h.run('snapshot()');h.context.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync('public/'+url))});await h.run("exampleOpen('pigs')");
 assert.equal(h.run('state.scenes.length'),76);assert.equal(h.run('state.title'),'The Three Little Pigs');
 if(!process.argv.includes('--draft'))assert.equal(h.run('Object.keys(state.audioAssets).filter(k=>k.startsWith("pigs-voice-")).length'),75);
 if(!process.argv.includes('--draft'))assert.equal(h.run('state.scenes.filter(s=>s.items.some(o=>o.keyframes?.length||o.illustration?.changes.length)||s.cues.length).length'),76);
 const issues=h.run('productionReview(state)');console.log('REVIEW',JSON.stringify(issues));
 assert(!issues.some(x=>/Overlapping voices|cut off|exceeds its allotted|Invalid/.test(x.message)));
 const p=h.run('state'),tl=h.run('storyTimeline(state,30)');
 for(let i=0;i<p.scenes.length;i++){
  const s=p.scenes[i],r=tl[i];assert(s.cues.every(c=>c.start+c.duration<=r.duration+.04),s.name+' cue overrun');
  assert(s.items.every(o=>(o.keyframes||[]).every(k=>Object.values(k.pose).every(Number.isFinite))),s.name+' invalid pose');
  for(const o of s.items)if(o.illustration)for(let k=1;k<o.illustration.changes.length;k++)assert(o.illustration.changes[k].time>o.illustration.changes[k-1].time,s.name+' pose collision');
 }
 const output='.sites-runtime/pigs-review';fs.mkdirSync(output,{recursive:true});h.run('globalThis.reviewCanvas=makeCanvas(960,540)');
 for(let page=0;page<(process.argv.includes('--targeted')?0:4);page++){
  const c=createCanvas(1600,1280),g=c.getContext('2d');g.fillStyle='#f6f1e6';g.fillRect(0,0,c.width,c.height);
  for(let n=0;n<20;n++){
   const i=page*20+n;if(i>=p.scenes.length)break;h.context.frame=tl[i].firstFrame+Math.floor(tl[i].frames*.6);
   const buffer=h.run("(()=>{const c=reviewCanvas;paintVideoFrame(c.getContext('2d'),state,storyTimeline(state,30),frame,30);return c.toBuffer('image/png')})()");
   const im=new Image();im.src=buffer;await im.decode();const x=n%4*400,y=Math.floor(n/4)*256;g.drawImage(im,x,y,400,225);g.fillStyle='#163f37';g.font='15px sans-serif';g.fillText(p.scenes[i].name,x+8,y+246,385);if(n%4===0)global.gc?.();
  }
  fs.writeFileSync(output+'/storyboard-'+(page+1)+'.png',c.toBuffer('image/png'));
 }
 const special=process.argv.includes('--targeted')?[58,59,60,63]:[28,37,46,55,56,57,58,59,60,61,62,63,70];
 for(const i of special)for(const part of [.1,.5,.9]){h.context.frame=tl[i].firstFrame+Math.floor(tl[i].frames*part);const data=h.run("(()=>{const c=reviewCanvas;paintVideoFrame(c.getContext('2d'),state,storyTimeline(state,30),frame,30);return c.toBuffer('image/png')})()");fs.writeFileSync(output+'/beat-'+(i+1)+'-'+Math.round(part*10)+'.png',data);global.gc?.();}
 h.run('validateProject(JSON.parse(snapshot()))');await h.el('present').onclick();assert(h.el('phraseDialog').open);h.click('phraseNext');assert.equal(h.run('phraseRun.index'),1);h.run('FeltPhrases.close()');h.run('undo()');assert.equal(h.run('snapshot()'),before);
 assert.deepEqual(h.errors,[]);console.log('PASS: saved story import, all 76 scenes, voice bounds, finite poses, actual-renderer frames, editable round-trip and Undo.');
 console.log(JSON.stringify({duration:tl.at(-1).end,frames:tl.at(-1).firstFrame+tl.at(-1).frames,scenes:p.scenes.length}));
})().catch(e=>{console.error(e);process.exitCode=1});
