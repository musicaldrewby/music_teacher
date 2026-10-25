// Use the real file-open handler, with no story-specific runtime registration.
const fs=require('fs'),path=require('path'),assert=require('assert'),h=require('./app-harness.cjs');
const {run,context,click,el}=h;
const [file,countArg,outputDir='.sites-runtime/phrase-check']=process.argv.slice(2),count=Number(countArg);
if(!file||!count)throw Error('Usage: node scripts/check-phrase-story.cjs FILE EXPECTED_COUNT [OUTPUT_DIR]');
(async()=>{
 await h.ready;click('welcomeStart');assert.equal(run('ready'),true);
 assert(!el('donGatoExample'));assert(!el('welcomeDonGato'));
 assert.equal(run('ART.backgrounds.length'),96);
 const original=run('snapshot()'),text=fs.readFileSync(file,'utf8'),p=JSON.parse(text);
 context.fileEvent={target:{files:[{size:Buffer.byteLength(text),text:async()=>text}],value:file}};
 await run('$("projectFile").onchange(fileEvent)');
 assert.equal(run('state.title'),p.title);assert.equal(run('state.scenes.length'),count);assert.equal(run('state.phraseShow.enabled'),true);
 run('validateProject(JSON.parse(snapshot()))');
 assert(run('state.scenes.every(s=>s.bg===-1)'));
 assert(run('state.scenes.every(s=>[...sceneAssetIds(s)].every(key=>!!state.imports[key]&&imageMap.has(key)))'));
 assert.equal(run('state.scenes.flatMap(s=>s.items).filter(o=>o.type==="shape"&&!shapes.includes(o.shape)).length'),0);
 await el('present').onclick();assert(el('phraseDialog').open);assert.equal(run('phraseRun.index'),0);
 assert.equal(el('phraseLyric').textContent,p.scenes[0].caption);
 context.event={key:' ',code:'Space',target:el('phraseNext'),repeat:false,preventDefault(){},stopImmediatePropagation(){}};
 run('phraseKey(event)');assert.equal(run('phraseRun.index'),1);
 context.event.repeat=true;run('phraseKey(event)');assert.equal(run('phraseRun.index'),1);
 context.event.repeat=false;run('phraseKey(event)');assert.equal(run('phraseRun.index'),1);
 run('phraseLastPress=-Infinity');context.event.key='ArrowLeft';context.event.code='ArrowLeft';run('phraseKey(event)');assert.equal(run('phraseRun.index'),0);
 run('phraseLastPress=-Infinity');click('phraseNext');assert.equal(run('phraseRun.index'),1);
 run('phraseLastPress=-Infinity');context.event.key=' ';context.event.code='Space';context.event.target=el('phraseCaptions');run('phraseKey(event)');assert.equal(run('phraseRun.index'),1);
 fs.mkdirSync(outputDir,{recursive:true});
 for(let i=0;i<count;i++){
  context.i=i;run('phraseGo(i,1000);phrasePaint(1000000)');assert.equal(run('phraseRun.index'),i);
  assert.equal(el('phraseLyric').textContent,p.scenes[i].caption);
  assert.equal(run('phraseFrame'),0);
  fs.writeFileSync(path.join(outputDir,'scene-'+String(i+1).padStart(2,'0')+'.png'),run('$("phraseCanvas").toBuffer("image/png")'));
 }
 run('phraseLastPress=-Infinity;phraseAdvance(1,2000000)');assert(run('phraseRun.finished'));assert(el('phraseNext').disabled);assert.equal(run('phraseRun.index'),count-1);assert.equal(el('phraseNext').textContent,'The end');
 run('phraseLastPress=-Infinity;phraseAdvance(-1,2001000)');assert.equal(run('phraseRun.index'),count-2);assert(!run('phraseRun.finished'));
 click('phraseRestart');assert.equal(run('phraseRun.index'),0);assert(!el('phraseNext').disabled);
 el('phraseCaptions').checked=false;el('phraseCaptions').onchange();assert(el('phraseLyric').hidden);
 const saved=run('snapshot()');click('phraseExit');assert(!el('phraseDialog').open);assert.equal(run('phraseRun'),null);assert.equal(run('snapshot()'),saved);
 context.fileEvent={target:{files:[{size:Buffer.byteLength(saved),text:async()=>saved}],value:file}};
 await run('$("projectFile").onchange(fileEvent)');assert.equal(run('snapshot()'),saved);
 await el('present').onclick();assert(el('phraseDialog').open);run('FeltPhrases.close()');
 context.original=JSON.parse(original);run('state=original;refresh()');click('present');assert.equal(run('presenting'),true);run('present(false)');
 assert.deepEqual(h.errors,[]);
 console.log('PASS '+p.title+': '+count+' scenes; embedded artwork; actual file import and saved-file reload; click/Space; repeated-key guard; indefinite holds; back/restart/end; captions; exit; ordinary stories still present.');
})().catch(e=>{console.error(e);process.exit(1)});
