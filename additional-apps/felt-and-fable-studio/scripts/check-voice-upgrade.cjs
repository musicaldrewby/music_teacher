const assert=require('assert'),{run,context,ready,click,el}=require('./app-harness.cjs');
(async()=>{await ready;click('welcomeStart');await run("ensureIds(['cinema-maya','cinema-leo','cinema-asha','cinema-jun'])");
// Inspect actual painted thumb pixels in a neutral wrist and a raised wrist.
run("globalThis.hand=makeCanvas(90,90);globalThis.ink=hand.getContext('2d')");
for(const asset of ['maya','leo','asha','jun'])for(const left of [false,true])for(const angle of [0,Math.PI]){
 context.handArgs={asset:'cinema-'+asset,left,angle};run("ink.clearRect(0,0,90,90);ink.save();ink.translate(45,45);performanceDrawHand(ink,handArgs.asset,handArgs.left,'relaxed',-23,handArgs.angle);ink.restore()");
 const inward=(left?1:-1)*(angle? -1:1);context.hit=45+inward*18;context.miss=45-inward*18;
 assert(run("ink.getImageData(hit,43,1,1).data[3]")>180,'thumb should be on the inward side at rest / opposite side when raised');assert(run("ink.getImageData(miss,43,1,1).data[3]")<40,'outer hand must have no duplicate thumb');
}
// Hand-attached props must cover hands even when their saved layer order precedes the actor.
assert.equal(run("performanceOrder({items:[{id:'cup',attachment:{parentId:'actor',anchor:'rightHand'}},{id:'actor'}]}).at(-1).id"),'cup');
// Voice UI, saved classic settings, and natural defaults remain distinct.
assert.equal(run("talkVoice({asset:'cinema-maya'}).engine"),'neural');assert.equal(run("talkValidateVoice({style:'bright',pitch:1,speed:1,delivery:'normal'}).engine"),'classic');
assert.throws(()=>run("talkValidateVoice({engine:'neural',speaker:'af_heart',style:'bright',pitch:1.1,speed:1,delivery:'normal'})"),/own pitch/);
assert.throws(()=>run("talkValidateVoice({engine:'neural',speaker:'missing',style:'bright',pitch:1,speed:1,delivery:'normal'})"),/speaker/);
context.calls=[];context.fakeSpeech=async(text,v)=>{context.calls.push({text,v});return{samples:new Float32Array(text.length>10?48000:24000).fill(.09),sampleRate:24000}};run('talkSynthesize=fakeSpeech');
context.plan={format:'felt-director-plan',version:1,scenes:[{id:'one',duration:8,bg:0,pieces:[{id:'maya',asset:'cinema-maya'},{id:'leo',asset:'cinema-leo'}],script:[{actorId:'maya',text:'Hello!',start:0,voice:{engine:'classic'}},{actorId:'leo',text:'Then we go.',start:2,voice:{engine:'classic'}},{actorId:'maya',text:'Yes!',start:4,voice:{engine:'classic'}}]}]};
await run('FeltDirector.applyPlan({expectedRevision:FeltDirector.revision(),plan})');const before=run('snapshot()');
run("selected=['maya'];refresh();talkEditLine(scene().items[0].dialogueLines[0].id)");assert.equal(el('talkEngine').value,'classic');el('talkEngine').value='neural';el('talkEngine').onchange();assert.equal(el('talkPitchLabel').hidden,true);assert.equal(el('talkSpeakerLabel').hidden,false);
await el('talkUpgrade').onclick();assert(run("scene().items[0].dialogueLines.every(l=>l.voice.engine==='neural')"));assert.equal(run("scene().items[1].dialogueLines[0].voice.engine"),'classic');run('validateProject(state)');run('undo()');await new Promise(setImmediate);assert.equal(run('snapshot()'),before);
// A failure in the second regenerated line rolls the entire operation back.
let n=0;context.failSpeech=async()=>{if(++n===2)throw Error('test download failure');return{samples:new Float32Array(24000).fill(.1),sampleRate:24000}};run('talkSynthesize=failSpeech');await assert.rejects(()=>run("FeltDirector.applyActions({expectedRevision:FeltDirector.revision(),operations:[{op:'regenerateDialogue',sceneId:'one',actorId:'maya',voice:{engine:'neural',speaker:'af_bella',style:'bright',pitch:1,speed:1,delivery:'normal'}}]})"),/download failure/);assert.equal(run('snapshot()'),before);
console.log('PASS: painted thumb direction for all four actors, prop occlusion order, voice defaults and validation, contextual natural UI, atomic character upgrade, Undo, failure rollback.');
})().catch(e=>{console.error(e);process.exitCode=1});
