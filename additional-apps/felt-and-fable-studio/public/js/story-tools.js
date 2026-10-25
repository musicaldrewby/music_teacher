'use strict';
// Story authoring uses the existing timeline, speech, camera and export engines.
function storyLines(s){return s.items.flatMap(actor=>(actor.dialogueLines||[]).map(line=>({actor,line,cue:s.cues?.find(c=>c.id===line.cueId)}))).filter(r=>r.cue).sort((a,b)=>a.cue.start-b.cue.start||a.line.id.localeCompare(b.line.id));}
function storyPause(line){return line?.storyPause??.25}
function storyNextLineTime(s){return frameTime(Math.max(0,...storyLines(s).map(r=>r.cue.start+r.cue.duration+storyPause(r.line))))}
function storyShiftLine(s,row,start){if(row.actor.locked)throw Error('Unlock '+row.actor.name+' before moving its dialogue.');if(!Number.isFinite(start)||start<0||start+row.cue.duration>7200)throw Error('The dialogue would exceed the scene limit.');row.cue.start=frameTime(start);const bubble=s.items.find(o=>o.id===row.line.bubbleId);if(bubble?.dialogue)bubble.dialogue.start=row.cue.start;}
async function storySaveLine(p,s,input){
 const pause=Number(input.pause??.25);if(!Number.isFinite(pause)||pause<0||pause>30)throw Error('Choose a pause of 0–30 seconds.');
 const prior=storyLines(s).find(r=>r.line.id===input.lineId),actor=talkFind(s,input.actorId);if(prior&&prior.actor.id!==actor.id)throw Error('Keep the original speaker when editing a line. Add a new line to change speakers.');
 const oldEnd=prior?prior.cue.start+prior.cue.duration:0,oldPause=storyPause(prior?.line),later=prior&&input.ripple?storyLines(s).filter(r=>r!==prior&&r.line.id!==prior.line.id&&r.cue.start>=oldEnd-.001):[];
 if(later.some(r=>r.actor.locked))throw Error('Unlock later speakers or turn off “Shift later dialogue”.');
 const result=await talkAddToProject(p,s,actor.id,{...input,start:input.start??(prior?prior.cue.start:storyNextLineTime(s)),ripple:!!input.ripple});const line=actor.dialogueLines.find(l=>l.id===result.lineId);line.storyPause=pause;
 if(prior&&input.ripple)for(const row of later)storyShiftLine(s,row,row.cue.start+pause-oldPause);
 if(input.reaction!==undefined){actor.performance??={};actor.performance.clips=(actor.performance.clips||[]).filter(c=>c.storyLineId!==line.id);if(input.reaction){if(!Object.hasOwn(PERFORMANCE_REACTIONS,input.reaction))throw Error('Choose a valid reaction.');actor.performance.clips.push({id:id(),kind:'react',reaction:input.reaction,amount:.65,start:result.start,duration:Math.max(.2,Math.min(2,result.duration)),storyLineId:line.id});}line.storyReaction=input.reaction;}
 // Linked reactions follow moved speech; manually authored acting/camera timing stays intact.
 for(const row of storyLines(s))for(const clip of row.actor.performance?.clips||[])if(clip.storyLineId===row.line.id)clip.start=row.cue.start;
 talkFitScene(s,Math.max(result.start+result.duration+pause,cinemaLastTime(s)));talkPruneProject(p);return result;
}
function storyMoveLine(p,s,lineId,delta){const rows=storyLines(s),i=rows.findIndex(r=>r.line.id===lineId),j=i+delta;if(![-1,1].includes(delta))throw Error('Move one line earlier or later.');if(i<0||j<0||j>=rows.length)return;const a=rows[Math.min(i,j)],b=rows[Math.max(i,j)];if(a.cue.start+a.cue.duration>b.cue.start+.001)throw Error('These lines overlap. Adjust their start times before reordering.');const start=a.cue.start,gap=b.cue.start-a.cue.start-a.cue.duration;storyShiftLine(s,b,start);storyShiftLine(s,a,start+b.cue.duration+gap);for(const r of [a,b])for(const c of r.actor.performance?.clips||[])if(c.storyLineId===r.line.id)c.start=r.cue.start;talkFitScene(s,cinemaLastTime(s));}
function storyRemoveLine(p,s,actorId,lineId){const actor=talkFind(s,actorId);if(actor.performance?.clips)actor.performance.clips=actor.performance.clips.filter(c=>c.storyLineId!==lineId);talkRemoveFromProject(p,s,actorId,lineId);}

function storySpeechWindows(p,tl){const windows=[];for(const row of tl){const n=directorNarrationWindow(row,p,tl);if(n&&n.volume>0&&n.end>n.start)windows.push(n);const speechIds=new Set(storyLines(row.scene).map(r=>r.cue.id));for(const c of row.scene.cues||[])if((c.generatedSpeech||c.duckMusic||speechIds.has(c.id))&&c.volume>0){const w=directorCueWindow(c,row,p,tl);if(w.end>w.start)windows.push(w)}}return windows.sort((a,b)=>a.start-b.start);}
function storyDuckGain(t,windows,m={}){if(m.duck===false)return 1;const level=m.duckLevel??.3,attack=.18,release=.5;let gain=1;for(const w of windows){if(w.start>t+attack)break;if(t<w.start-attack||t>w.end+release)continue;const amount=Math.max(0,Math.min(1,(t-w.start+attack)/attack,(w.end+release-t)/release));gain=Math.min(gain,1-(1-level)*amount)}return gain;}

function storyContinueScene(p,sourceId,time){
 if(p.scenes.length>=100)throw Error('A story can contain up to 100 scenes.');const index=p.scenes.findIndex(s=>s.id===sourceId),s=p.scenes[index];if(!s)throw Error('The source scene is missing.');
 const duration=sceneSeconds(s,p),t=time==='end'?Math.max(0,duration-1/60):Number(time);if(!Number.isFinite(t)||t<0||t>duration)throw Error('Choose a time within the source scene.');
 const previous=[directorRenderScene,directorRenderProject];directorRenderScene=s;directorRenderProject=p;
 try{
  const next=copy(s);next.id=id();next.name=(s.name+' · continued').slice(0,50);next.caption='';next.duration=6;next.narration={assetId:null,delay:0,volume:1};next.cues=[];delete next.reusablePerformances;delete next.director;next.camera=cameraAt(s,t);
  if(next.cinema){delete next.cinema.shots;delete next.cinema.clips;delete next.cinema.titles;next.cinema.transition={kind:'cut',duration:.5};}
  const speechBubbles=new Set(storyLines(s).map(r=>r.line.bubbleId));
  function frozen(raw,top=true){
   if(speechBubbles.has(raw.id)||raw.dialogue&&(t<raw.dialogue.start||t>=raw.dialogue.start+raw.dialogue.duration))return null;
   const tree=animationTree(raw,t,false,duration),o={...copy(raw),...copy(top?cinemaVisualPose(raw,t,s):basePose(tree))};
   if(top){const d=cinemaDepthOffset(o,next,0);o.x-=d.x;o.y-=d.y;}
   if(['bubble','text'].includes(raw.type))o.text=tree.text;
   if(raw.illustration){o.asset=tree.asset;o.flipX=tree.flipX;delete o.illustration;}delete o.feltRoute;delete o.storyActions;delete o.keyframes;delete o.animationBlocks;delete o.choreography;delete o.propActions;delete o.dialogue;delete o.dialogueLines;delete o.speech;delete o.attachment;delete o.bubbleAim;delete o.tailTip;
   if(raw.children)o.children=raw.children.map(c=>frozen(c,false)).filter(Boolean);
   if(raw.type==='puppet'){const a=cinemaActingAt(raw,t,s),k=cinemaPuppetGeometry({...raw,acting:a},t);o.acting={expression:a.expression,pose:a.pose||'standing',talk:false,blink:raw.acting?.blink!==false,cues:[],freeze:{rig:Object.fromEntries(['left','right','leftBend','rightBend','ll','rl'].map(key=>[key,k[key]])),performance:copy(a.performance)}};o.performance={hands:{left:a.performance.left,right:a.performance.right},clips:[]};delete o.turns;delete o.conversation;}
   if(raw.storyProp){o.storyProp={pack:raw.storyProp.pack,state:storyPropStateAt(raw,t),changes:[]};}
   return o;
  }
  const preserveOrder=s.items.some(o=>o.choreography?.length)||!!s.reusablePerformances?.length;next.items=(preserveOrder?cinemaOrderedItems(s,t):s.items).map(o=>frozen(o)).filter(Boolean);
  // Retain attachment ownership, with an offset measured at the sampled frame.
  for(const raw of s.items){const o=next.items.find(x=>x.id===raw.id);if(!o)continue;const frame=raw.propActions?.length?performancePropFrame(raw,t,s):null,owner=frame?.owner;
   const reused=reuseSample(raw,t,s),a=reused?(reused.owner?{parentId:reused.owner.actorId,anchor:reused.owner.hand}:reused.attachment):(owner?{parentId:owner.actorId,anchor:owner.hand}:raw.attachment&&(raw.attachment.release==null||t<raw.attachment.release)?raw.attachment:null);if(!a)continue;
   const parent=next.items.find(x=>x.id===a.parentId);if(!parent)continue;
   const pp=cinemaVisualPose(parent,0,next),anchor=cinemaAnchor(parent,a.anchor,0,next),actual=cinemaVisualPose(raw,t,s),local=localPoint({...parent,...pp},[actual.x,actual.y]);
   Object.assign(o,actual);o.attachment={parentId:parent.id,anchor:a.anchor,dx:local[0]-anchor[0],dy:local[1]-anchor[1],rotation:actual.rotation-pp.rotation,parentScaleX:pp.w/parent.bw,parentScaleY:pp.h/parent.bh,release:null,...(preserveOrder?{order:'scene'}:{})};
  }
  cinemaRemapScene(next);p.scenes.splice(index+1,0,next);p.active=index+1;return next;
 }finally{[directorRenderScene,directorRenderProject]=previous;}
}

function storyActorFraming(s,actor,t,other=null,wide=false){
 const p=cinemaVisualPose(actor,t,s),q=other?cinemaVisualPose(other,t,s):null;
 if(wide&&q){const box=bounds([{...actor,...p},{...other,...q}]);return cameraClamp({x:box.cx,y:box.cy,zoom:Math.min(W*.78/box.w,H*.8/box.h,2.4)})}
 const head=talkHeadPoint(actor,p,0,t,s),zoom=Math.min(4,Math.max(1,H*.62/Math.max(80,p.h*.72))),lead=q?Math.sign(q.x-p.x)*W/(zoom*10):0;return cameraClamp({x:head[0]+lead,y:head[1]+H/(zoom*8),zoom});
}
function storyCameraRecipe(s,options,p=state){if(options.kind==='dialogue')return dialogueCameraPlan(s,options,p);
 const a=s.items.find(o=>o.id===options.actorA&&o.type==='puppet'&&!o.hidden),b=s.items.find(o=>o.id===options.actorB&&o.type==='puppet'&&!o.hidden);if(!a||!b||a===b)throw Error('Choose two different visible cast members.');
 const total=sceneSeconds(s,p),kind=options.kind||'conversation';if(!['conversation','script','reaction'].includes(kind))throw Error('Choose a camera recipe.');let segments=[];
 if(kind==='script'){const lines=storyLines(s).filter(r=>r.actor===a||r.actor===b);if(!lines.length)throw Error('Add dialogue for these characters first.');segments=[{start:0,actor:null,name:'Establish the space'}];for(const row of lines){const start=Math.max(Math.min(1,total*.15),row.cue.start);if(start<total-.2)segments.push({start,actor:row.actor,name:row.actor.name+' speaks'})}segments.sort((x,y)=>x.start-y.start);segments=segments.filter((x,i)=>i===segments.length-1||segments[i+1].start-x.start>=.2);}
 else{const cuts=kind==='reaction'&&total>=1.2?[0,.18,.58,.8]:[0,.2,.5,.8];segments=cuts.map((u,i)=>({start:total*u,actor:i===1?a:i===2?b:null,name:i===0?'Establish the space':i===3?'Together again':i===1?a.name+' speaks':b.name+(kind==='reaction'?' reacts':' speaks')}));}
 if(segments.length>100)throw Error('Use up to 100 dialogue shots per scene.');
 return segments.map((row,i)=>{const duration=(segments[i+1]?.start??total)-row.start,actor=row.actor,from=storyActorFraming(s,actor||a,row.start,actor===b?a:b,!actor);return{id:id(),name:row.name,duration,from,to:copy(from),move:false,easing:'cinematic',actionNote:actor?'Keep '+actor.name+' on the same side of the scene.':'Keep both characters in view.',recipe:kind}});
}
function storyApplyCamera(p,s,options){const shots=storyCameraRecipe(s,options,p);s.camera=cameraClamp();s.cinema??={};s.cinema.shots=shots;s.cinema.clips=(s.cinema.clips||[]).filter(c=>c.kind!=='camera');s.duration=shots.reduce((n,c)=>n+c.duration,0);return shots;}

function storyPropStateAt(o,t){const p=o.storyProp;if(!p)return null;let state=p.state;for(const c of [...(p.changes||[])].sort((a,b)=>a.time-b.time))if(t>=c.time)state=c.state;return state;}
function storyPropAsset(o,t){const pack=window.STORY_PROP_PACKS?.[o.storyProp?.pack];return pack?.states[storyPropStateAt(o,t)]||o.asset;}
function storySetProp(o,input){const pack=window.STORY_PROP_PACKS?.[input.pack||o.storyProp?.pack];if(!pack||o.type!=='asset'||o.locked)throw Error('Select an unlocked interactive prop.');const state=input.state;if(!Object.hasOwn(pack.states,state))throw Error('Choose an available prop state.');o.storyProp??={pack:input.pack,state,changes:[]};if(input.time===undefined)o.storyProp.state=state;else{const t=frameTime(Number(input.time));if(!Number.isFinite(t)||t<0||t>7199)throw Error('Choose a state time from 0 to 7199 seconds.');o.storyProp.changes=(o.storyProp.changes||[]).filter(c=>Math.abs(c.time-t)>.001);o.storyProp.changes.push({time:t,state});o.storyProp.changes.sort((a,b)=>a.time-b.time);}}
function validateStoryTools(p){
 if(p.music?.duckLevel!==undefined&&(!Number.isFinite(p.music.duckLevel)||p.music.duckLevel<0||p.music.duckLevel>1))throw Error('Invalid speech music level.');
 for(const s of p.scenes){function walk(o){if(o.storyProp){const q=o.storyProp,pack=window.STORY_PROP_PACKS?.[q.pack];if(o.type!=='asset'||!pack||!Object.hasOwn(pack.states,q.state)||!Array.isArray(q.changes)||q.changes.length>200)throw Error('Invalid interactive prop.');let last=-1;for(const c of q.changes){if(!Number.isFinite(c.time)||c.time<0||c.time>7199||c.time<=last||!Object.hasOwn(pack.states,c.state))throw Error('Invalid prop state timing.');last=c.time;}}
  for(const l of o.dialogueLines||[])if(l.storyPause!==undefined&&(!Number.isFinite(l.storyPause)||l.storyPause<0||l.storyPause>30))throw Error('Invalid dialogue pause.');
  const f=o.acting?.freeze;if(f){if(o.type!=='puppet'||!f.rig||!f.performance)throw Error('Invalid continued character pose.');for(const key of ['left','right','leftBend','rightBend','ll','rl'])if(!Number.isFinite(f.rig[key])||Math.abs(f.rig[key])>360)throw Error('Invalid continued arm pose.');for(const key of ['headX','headY','headAngle','eyeX','eyeY'])if(!Number.isFinite(f.performance[key])||Math.abs(f.performance[key])>360)throw Error('Invalid continued expression.');for(const key of ['leftHandTarget','rightHandTarget'])if(f.performance[key]&&(!Array.isArray(f.performance[key])||f.performance[key].length!==2||f.performance[key].some(v=>!Number.isFinite(v)||Math.abs(v)>12000)))throw Error('Invalid continued hand target.');}
  o.children?.forEach(walk);
 }s.items.forEach(walk);}return p;
}
