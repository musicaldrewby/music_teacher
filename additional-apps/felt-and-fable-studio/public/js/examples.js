'use strict';
// Prepared examples include their artwork and any recorded speech. Opening never starts a voice worker.
const FELT_EXAMPLES={skinbasic:{title:'Skin and Bones · Basic Felt Board',file:'skin-and-bones-basic.felt.json',button:'skinAndBonesBasicExample'},darkwood:{title:'In a Dark, Dark Wood',file:'dark-dark-wood.felt.json',button:'darkWoodExample'},skin:{title:'Skin and Bones',file:'skin-and-bones.felt.json',button:'skinAndBonesExample'},spooky:{title:'Spooky Road looping background',file:'spooky-road.felt.json',button:'spookyRoadExample'},sleepy:{title:'The Legend of Sleepy Hollow',file:'sleepy-hollow.felt.json',button:'sleepyHollowExample'},wolf:{title:'The Wolf at the Door',file:'wolf-door.felt.json',button:'wolfRigExample'},pigs:{title:'The Three Little Pigs',file:'three-little-pigs.felt.json',button:'threePigsExample'},conversation:{title:'Conversation acting',file:'conversation-acting.felt.json',button:'conversationExample'},speaking:{title:'Speaking cast',file:'speaking-cast.felt.json',button:'talkExample'},wardrobe:{title:'Acting & wardrobe',file:'acting-wardrobe.felt.json',button:'wardrobeExample'}};
let exampleJob=null,exampleLast=null;
function exampleClose(){if(exampleJob)exampleJob.controller.abort(new DOMException('Example opening cancelled.','AbortError'));else $('exampleDialog').close()}
async function exampleOpen(key,retry=false){
 const info=FELT_EXAMPLES[key];if(!info||exampleJob||directorAgentBusy||talkUIBusy||exportJob||animRun||storyPlayback||presenting)return;
 if(!retry&&dirty&&!confirm('Open '+info.title+'? You can Undo to restore the current story.'))return;
 const controller=new AbortController(),revision=directorRevision(),job={controller};exampleJob=job;exampleLast=key;
 $('exampleHint').textContent=key==='darkwood'?'Teacher chants, students echo. Seven scenes build from ppp to ff; Space advances when you are ready.':(key==='skin'||key==='skinbasic')?'Sing live. Every lyric, ooh, and the final BOO waits for a student’s press.':key==='spooky'?'A silent background journey with embedded artwork.':'Speech is already saved. No voice model download is needed.';
 $('fileMenu').open=false;$('exampleTitle').textContent='Opening '+info.title;$('exampleStatus').textContent='Loading story and artwork…';$('exampleProgress').hidden=false;$('exampleProgress').removeAttribute('value');$('exampleRetry').hidden=true;$('exampleCancel').textContent='Cancel';
 for(const e of Object.values(FELT_EXAMPLES))$(e.button).disabled=true;
 if(!$('exampleDialog').open)$('exampleDialog').showModal();$('exampleCancel').focus();
 const timeout=setTimeout(()=>controller.abort(new Error('Loading took too long. Check your connection and try again.')),120000);
 try{
  await directorTransaction(revision,async()=>{
   const response=await fetch('examples/'+info.file,{signal:controller.signal});if(!response.ok)throw Error('The example could not load. Check your connection and try again.');return response.json();
  },{newDocument:true,signal:controller.signal,onProgress:p=>{if(exampleJob!==job||controller.signal.aborted)return;$('exampleStatus').textContent=p.total?'Preparing felt artwork · '+p.done+' of '+p.total:'Preparing felt artwork…';if(p.total)$('exampleProgress').value=p.done/p.total*100;}});
  selected=scene().items.filter(o=>o.type==='puppet'||o.rig).slice(0,1).map(o=>o.id);animTime=0;setStudioWorkspace('build');refresh();if(key==='conversation'){$('cinemaActorPanel').open=true;$('conversationControls').open=true;}exampleJob=null;$('exampleDialog').close();if(key==='darkwood'){toast('Your echo chant is ready. Teacher first, students echo, then Next or Space.');await FeltPhrases.open();return;}if(key==='skin'||key==='skinbasic'){toast('Skin and Bones is ready. Every line and ooh waits for Next or Space.');await FeltPhrases.open();return;}if(key==='spooky'){toast('Spooky Road is ready. Present plays the silent loop; Export saves an MP4.');await FeltAmbient.open();return;}toast(info.title+(key==='sleepy'?' is ready with Drew’s narration and saved scene timing. Present → Play follows the narration. Choose Manual for student-controlled advances.':key==='wolf'?' is ready. Open Character motion to preview, edit commands and inspect contacts.':key==='pigs'?' is ready. Open Sound → Play whole story for the voiced film; Present for read-aloud pages.':' is ready. Press Play scene to preview.')+' Your previous story is available with Undo.');
 }catch(e){
  exampleJob=null;if(e.name==='AbortError'){$('exampleDialog').close();toast('Opening cancelled. Your story was kept.')}else{$('exampleStatus').textContent=e.message||'The example could not load. Please try again.';$('exampleProgress').hidden=true;$('exampleRetry').hidden=false;$('exampleCancel').textContent='Close';$('exampleRetry').focus()}
 }finally{clearTimeout(timeout);if(exampleJob===job)exampleJob=null;for(const e of Object.values(FELT_EXAMPLES))$(e.button).disabled=false;if(!$('exampleDialog').open&&!phraseRun)$('fileMenu').querySelector('summary')?.focus()}
}
function examplesInit(){
 $('skinAndBonesBasicExample').onclick=()=>exampleOpen('skinbasic');$('welcomeSkinAndBonesBasic').disabled=false;$('welcomeSkinAndBonesBasic').onclick=()=>{$('welcomeStart').click();exampleOpen('skinbasic')};
 $('darkWoodExample').onclick=()=>exampleOpen('darkwood');$('welcomeDarkWood').disabled=false;$('welcomeDarkWood').onclick=()=>{$('welcomeStart').click();exampleOpen('darkwood')};
 $('skinAndBonesExample').onclick=()=>exampleOpen('skin');$('welcomeSkinAndBones').disabled=false;$('welcomeSkinAndBones').onclick=()=>{$('welcomeStart').click();exampleOpen('skin')};
 $('spookyRoadExample').onclick=()=>exampleOpen('spooky');$('welcomeSpookyRoad').disabled=false;$('welcomeSpookyRoad').onclick=()=>{$('welcomeStart').click();exampleOpen('spooky')};
 $('sleepyHollowExample').onclick=()=>exampleOpen('sleepy');$('welcomeSleepyHollow').disabled=false;$('welcomeSleepyHollow').onclick=()=>{$('welcomeStart').click();exampleOpen('sleepy')};
 $('wolfRigExample').onclick=()=>exampleOpen('wolf');$('welcomeWolfRig').disabled=false;$('welcomeWolfRig').onclick=()=>{$('welcomeStart').click();exampleOpen('wolf')};
 $('threePigsExample').onclick=()=>exampleOpen('pigs');
 $('welcomeThreePigs').disabled=false;$('welcomeThreePigs').onclick=()=>{$('welcomeStart').click();exampleOpen('pigs')};
 $('conversationExample').onclick=()=>exampleOpen('conversation');
 $('wardrobeExample').onclick=()=>exampleOpen('wardrobe');$('exampleCancel').onclick=exampleClose;$('exampleRetry').onclick=()=>exampleOpen(exampleLast,true);
 $('exampleDialog').addEventListener('cancel',e=>{e.preventDefault();exampleClose()});
 $('exampleDialog').addEventListener('close',()=>{if(exampleJob)exampleJob.controller.abort(new DOMException('Example opening cancelled.','AbortError'))});
}
function exampleRequestedStory(){if(typeof URLSearchParams==='undefined')return;const key={'skin-and-bones-basic':'skinbasic','skin-and-bones':'skin','dark-dark-wood':'darkwood'}[new URLSearchParams(window.location?.search||'').get('example')];if(key){$('welcomeStart').click();exampleOpen(key);}}
window.FeltExamples={init:examplesInit,open:exampleOpen,openRequested:exampleRequestedStory};
