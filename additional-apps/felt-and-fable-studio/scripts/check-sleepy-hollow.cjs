const fs=require('fs'),assert=require('assert'),{createCanvas,Image}=require('@napi-rs/canvas');
const h=require('./app-harness.cjs');
(async()=>{
 await h.ready;const p=JSON.parse(fs.readFileSync('public/examples/sleepy-hollow.felt.json'));h.context.sleepy=p;
 h.run('validateProject(sleepy)');h.click('welcomeStart');const before=h.run('snapshot()');h.context.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync('public/'+url))});await h.run("exampleOpen('sleepy')");
 assert.equal(h.run('state.scenes.length'),49);assert.equal(h.run('state.title'),p.title);assert.equal(h.el('exampleDialog').open,false);
 const saved=JSON.parse(h.run('snapshot()'));assert.equal(Object.keys(saved.audioAssets).length,1);assert.equal(saved.phraseShow.timing.starts.length,49);assert(h.run('phraseTimingStatus(state).complete'));const tl=h.run('storyTimeline(state,30)');for(let i=0;i<49;i++)assert(Math.abs(tl[i].start-saved.phraseShow.timing.starts[i])<=1/60+.00001);assert(Math.abs(tl.at(-1).end-saved.phraseShow.timing.end)<1/30);assert.equal(saved.music.volume,1);assert.equal(saved.music.loop,false);assert(!saved.scenes.some(s=>s.script||s.cues.some(c=>c.productionNarration)));
 const source=JSON.parse(fs.readFileSync('story-source/sleepy-hollow/narration.json')),beats=JSON.parse(fs.readFileSync('story-source/sleepy-hollow/beats.json'));
 const normalize=s=>s.replace(/\s+/g,' ').trim();
 for(const s of source){const original=s.paragraphs.map(p=>typeof p==='string'?p:'['+p.cue+']').join(' '),b=beats.filter(b=>b.id.startsWith(s.id));assert.equal(normalize(b.map(b=>b.text).join(' ')),normalize(original),'Missing narration '+s.id);}
 for(const [i,s]of saved.scenes.entries()){
  assert(s.director.notes.includes(beats[i].text));assert.equal(s.cinema.depthMode,'grounded');assert(s.phrase.holdAt<=h.run('sceneAnimationSeconds(sleepy.scenes['+i+'],sleepy)'));
  for(const o of s.items){assert.equal(o.depth,'middle');assert.equal(o.depthContact,'ground');assert((o.keyframes||[]).every(k=>Object.values(k.pose).every(Number.isFinite)));if(o.illustration){const sizes=o.illustration.poses.map(p=>JSON.parse(fs.readFileSync('story-source/sleepy-hollow/asset-metadata.json'))[p.asset.replace('import-sleepy-','')]);assert(sizes.every(a=>a.join()===sizes[0].join()),'Pose size drift');for(let j=1;j<o.illustration.changes.length;j++)assert(o.illustration.changes[j].time>o.illustration.changes[j-1].time);}}
  if(i<33)assert(!s.items.some(o=>o.illustration?.poses.some(p=>p.asset.includes('horseman'))),'Premature headless reveal');
 }
 // Check actual contact intervals, not just depth labels: each landing pose
 // stays at one position until the following airborne gather pose begins.
 for(const s of saved.scenes.filter(s=>['sleepy-18A','sleepy-20A'].includes(s.id)))for(const o of s.items.filter(o=>o.illustration)){
  const changes=[{time:0,poseId:o.illustration.defaultPose},...o.illustration.changes];
  for(let i=0;i<changes.length;i++)if(changes[i].poseId==='extend'){
   const a=changes[i].time,b=changes[i+1]?.time??s.phrase.holdAt;if(b-a<.02)continue;
   h.context.contactPiece=o;h.context.contactA=a+.005;h.context.contactB=b-.005;
   const pair=h.run('[poseAt(contactPiece,contactA,30),poseAt(contactPiece,contactB,30)]');
   assert(Math.abs(pair[0].x-pair[1].x)<1,'Planted hoof slides in '+s.name);assert(Math.abs(pair[0].y-pair[1].y)<1,'Planted hoof lifts in '+s.name);
  }
 }
 const bridge=saved.scenes.find(s=>s.id==='sleepy-21A').items.find(o=>o.illustration);assert(Math.abs(bridge.y+bridge.h*(570/600-.5)-706)<.01,'Bridge contact mismatch');
 assert.equal(saved.scenes.at(-1).cinema.titles[0].kind,'title','Closing title must hold in manual mode');
 const review=h.run('productionReview(state)');console.log('REVIEW: '+review.length+' production notes; '+review.filter(x=>x.severity==='error').length+' errors.');assert(!review.some(x=>/Invalid|missing artwork|cut off/i.test(x.message)));
 const output='.sites-runtime/sleepy-review';fs.mkdirSync(output,{recursive:true});h.run('globalThis.reviewCanvas=makeCanvas(960,540)');
 async function render(i,t){h.context.reviewIndex=i;h.context.reviewTime=t;const b=h.run("(()=>{const c=reviewCanvas;drawScene(c.getContext('2d'),state.scenes[reviewIndex],960,540,reviewTime,false,false,state);return c.toBuffer('image/png')})()");const im=new Image();im.src='data:image/png;base64,'+b.toString('base64');await im.decode();return{im,b};}
 if(!process.argv.includes('--no-render')&&!process.argv.includes('--targeted'))for(let page=0;page<5;page++){const c=createCanvas(1440,2200),g=c.getContext('2d');g.fillStyle='#efe8d9';g.fillRect(0,0,c.width,c.height);for(let n=0;n<10;n++){const i=page*10+n;if(i>=saved.scenes.length)break;const x=n%2*720,y=Math.floor(n/2)*440,{im}=await render(i,2.4);g.drawImage(im,x,y,720,405);g.fillStyle='#183b36';g.font='17px sans-serif';g.fillText(saved.scenes[i].name,x+10,y+430,700);global.gc?.();}fs.writeFileSync(output+'/storyboard-'+(page+1)+'.png',c.toBuffer('image/png'));}
 for(const i of process.argv.includes('--no-render')?[]:process.argv.includes('--targeted')?[35,39,41,48]:[18,29,32,33,35,37,39,41,42,44])for(const t of [0,1.2,3.2,7]){const {b}=await render(i,t);fs.writeFileSync(output+'/beat-'+saved.scenes[i].id+'-'+t+'.png',b);global.gc?.();}
 h.run('validateProject(JSON.parse(snapshot()))');await h.el('present').onclick();assert(h.el('phraseDialog').open);assert.equal(h.run('phraseRun.mode'),'follow');h.run("phraseSetMode('manual')");h.click('phraseNext');assert.equal(h.run('phraseRun.index'),1);h.run('FeltPhrases.close()');h.run('undo()');assert.equal(h.run('snapshot()'),before);assert.deepEqual(h.errors,[]);
 console.log('PASS: 49-shot import; complete narration coverage; embedded narration; shared timing; manual advance; reveal isolation; embedded artwork; normalized pose dimensions; save round-trip; Undo.');
})().catch(e=>{console.error(e);process.exitCode=1});
