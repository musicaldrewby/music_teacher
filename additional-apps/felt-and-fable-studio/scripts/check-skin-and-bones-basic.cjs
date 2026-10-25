const fs=require('fs'),path=require('path'),assert=require('assert'),h=require('./app-harness.cjs');
const out=path.resolve(process.argv[2]||'.sites-runtime/skin-basic-review');fs.mkdirSync(out,{recursive:true});
(async()=>{
 await h.ready;h.click('welcomeStart');h.context.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.resolve(__dirname,'../public',url)))});
 await h.el('skinAndBonesBasicExample').onclick();assert.equal(h.run('phraseRun.mode'),'manual');assert.equal(h.el('phraseNext').textContent,'Start story · Space');
 const p=h.run('state'),old=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../public/examples/skin-and-bones.felt.json')));
 assert.equal(p.scenes.length,15);assert.deepEqual(p.scenes.map(s=>s.caption),old.scenes.map(s=>s.caption));assert.equal(p.phraseShow.defaultMode,'manual');assert.equal(p.scenes.filter(s=>s.caption==='Ooh-ooh-ooh-ooh!').length,6);
 h.run('validateProject(state)');
 for(let i=0;i<14;i++)assert(!p.scenes[i].items.some(o=>o.name==='Closet ghost'||o.text==='BOO!'));
 for(let i=2;i<13;i+=2){h.context.i=i;const letters=h.run('state.scenes[i].items.filter(o=>o.skinRefrain).map(o=>({text:o.text,x:poseAt(o,2.2).x}))');letters.sort((a,b)=>a.x-b.x);assert.equal(letters.map(o=>o.text).join(''),'OOH');}
 // Walking is articulated, rather than one unmoving silhouette sliding across the board.
 for(const i of [5,7,10]){const w=p.scenes[i].items.find(o=>o.name.startsWith('Old woman'));assert(w.keyframes.length>3);for(const part of ['Left stepping foot','Right stepping foot'])assert(w.children.find(o=>o.name===part).keyframes.length>8);}
 // The door is flush to the wall/floor and stays there while its leaf swings open.
 const door=p.scenes[13].items.find(o=>o.name==='Wall-mounted closet door');for(const k of door.keyframes){assert.equal(k.pose.y+k.pose.h/2,730);assert.equal(k.pose.h,494);}
 for(const [i,t,name]of [[0,0,'title'],[1,2,'fireside'],[3,2,'cottage'],[5,1.5,'departure'],[7,1.7,'graveyard'],[8,2.2,'ooh'],[9,2.5,'bones'],[11,4.4,'closet'],[13,4.2,'open-door'],[14,1,'boo']]){h.context.i=i;h.context.t=t;h.run('phraseGo(i,0);phrasePaint(t*1000)');fs.writeFileSync(path.join(out,name+'.png'),h.run('$("phraseCanvas").toBuffer("image/png")'));}
 h.run('phraseClose();state.audioAssets.check={name:"check",data:"data:audio/wav;base64,AAAA",duration:90};state.music.assetId="check";state.phraseShow.timing={version:1,assetId:"check",sceneIds:state.scenes.map(s=>s.id),starts:state.scenes.map((s,i)=>i*5),end:75};');await h.run('phraseOpen()');assert.equal(h.run('phraseRun.mode'),'manual');
 assert.deepEqual(h.errors,[]);console.log('PASS: Basic example opens in Manual; exact original lyrics; six independent ordered OOH flights; jointed footsteps; wall-mounted door; no early BOO; existing song timing retains Manual default. Rendered 10 representative frames.');
})().catch(e=>{console.error(e);process.exit(1)});
