const fs=require('fs'),assert=require('assert');
const h=require('./app-harness.cjs');
(async()=>{
 await h.ready;h.click('welcomeStart');const before=h.run('snapshot()');h.context.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync('public/'+url))});
 await h.run("exampleOpen('wolf')");assert.equal(h.run('state.title'),'The Wolf at the Door');
 const original=h.run('snapshot()');
 const stats=h.run(`(()=>{const s=scene(),o=s.items.find(o=>o.rig);let maxReach=0,maxSlide=0,maxContact=0,contactFrames=0,maxJump=0;let prev=null;for(let n=0;n<=1200;n++){const f=rigFrame(o,n/60,s);for(const j of [...f.legs,...f.arms]){maxReach=Math.max(maxReach,j.error);if(![j.a.x,j.a.y,j.joint.x,j.joint.y,j.end.x,j.end.y,j.flex].every(Number.isFinite))throw Error('Non-finite joint');if(j.flex<4.99||j.flex>145.01)throw Error('Joint limit');}if(prev){for(let i=0;i<2;i++)if(f.planted[i]&&prev.planted[i])maxSlide=Math.max(maxSlide,rigDistance(f.world(f.legs[i].end),prev.world(prev.legs[i].end)));maxJump=Math.max(maxJump,rigDistance(f.world(f.arms[1].end),prev.world(prev.arms[1].end)));}if(f.contactActive){contactFrames++;maxContact=Math.max(maxContact,rigDistance(f.handTip,f.contactPoint)*f.scale);}prev=f;}return{maxReach,maxSlide,maxContact,contactFrames,maxJump,review:rigReview()};})()`);
 console.log(JSON.stringify(stats));assert(stats.maxReach<2,'A joint target is out of reach');assert(stats.maxSlide<.05,'Planted feet slide');assert(stats.maxContact<.2,'Knuckles miss target');assert(stats.contactFrames>=3);assert(stats.maxJump<8,'Hand motion jumps');assert.equal(h.run('snapshot()'),original,'Sampling changed saved state');
 assert.equal(h.run('scene().cues.filter(c=>c.rigActor).length'),3);
 // Mirroring turns every part and contact together; no independently flipped hair/head.
 const mirrored=h.run(`(()=>{const s=copy(scene()),o=s.items[1];o.x=1600-o.x;o.rig.facing='left';for(const c of o.rig.commands)if(c.target){if(c.target.pieceId)c.target.u=1-c.target.u;else c.target.x=1600-c.target.x;delete c.path;}const result=[];for(const t of [0,4,8.5,10.53,11.1,14.5,17.2]){const a=rigFrame(scene().items[1],t,scene()),b=rigFrame(o,t,s);result.push(Math.abs(a.world(a.arms[1].end).x+b.world(b.arms[1].end).x-1600));}return result;})()`);assert(mirrored.every(x=>x<1e-7));
 // Shared rendering path: every stage of the performance, including all three contacts.
 fs.mkdirSync('.sites-runtime/wolf-review',{recursive:true});h.run('globalThis.wolfCanvas=makeCanvas(960,540)');
 for(const t of [0,3,5.5,8.8,10.53,11.1,11.67,14.5,17.2,19.5]){h.context.wolfT=t;const b=h.run("(()=>{const c=wolfCanvas;paintVideoFrame(c.getContext('2d'),state,storyTimeline(state,30),Math.round(wolfT*30),30);return c.toBuffer('image/png')})()");fs.writeFileSync('.sites-runtime/wolf-review/frame-'+String(t).replace('.','-')+'.png',b);global.gc?.();}
 // UI target editing and normal atomic commit; both sound and the hand retime.
 await h.run('rigUIOpen()');assert(h.el('rigDialog').open);assert(h.run('!!rigUIActor()'));
 h.run('animTime=11.1');assert(h.run("hitItem(editPiece(scene().items[1]),Object.values(rigFrame(scene().items[1],11.1,scene()).world(rigFrame(scene().items[1],11.1,scene()).arms[1].end)))"),'The moving hand cannot be selected');
 const rev=h.run('directorRevision()');await h.run("rigApply({expectedRevision:directorRevision(),operations:[{op:'command',sceneId:scene().id,pieceId:scene().items[1].id,command:{...copy(scene().items[1].rig.commands.find(c=>c.kind==='knock')),duration:3.7}}]})");
 assert.notEqual(h.run('directorRevision()'),rev);assert(Math.abs(h.run("scene().cues[0].start+0.05-(9.2+3.7*.35)"))<1e-8);
 await assert.rejects(h.run("rigApply({expectedRevision:directorRevision(),operations:[{op:'command',sceneId:scene().id,pieceId:scene().items[1].id,command:{id:'bad',kind:'walk',start:2,duration:1,target:{x:700,y:756}}}]})"),/overlap/);
 h.run('validateProject(JSON.parse(snapshot()))');h.run('rigUIStop();$("rigDialog").close();undo()');assert.equal(h.run('snapshot()'),original);h.run('undo()');assert.equal(h.run('snapshot()'),before);
 assert.deepEqual(h.errors,[]);console.log('PASS: 1201 deterministic frames, constrained joints, planted feet, door contact, sound sync, actual renderer, atomic edits, overlap rejection, saved file and Undo.');
})().catch(e=>{console.error(e);process.exitCode=1});
