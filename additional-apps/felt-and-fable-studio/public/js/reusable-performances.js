'use strict';
// Reusable performances are source clips + role bindings, never baked keyframes.
// The existing rig, motion and prop solvers evaluate them at a mapped source time.
const REUSE_CHANNELS=['storyActions','conversation','acting','performance','keyframes','animationBlocks','attachment','propActions','choreography'];
const REUSE_STORAGE='felt-performance-library-v1';
let reuseSampling=false,reuseCache=new WeakMap(),reusePreparedCache=new WeakMap(),reuseLocal=[],reuseTokenId=0;const reuseTokens=new WeakMap();
function reuseToken(o){if(!o||typeof o!=='object')return 0;if(!reuseTokens.has(o))reuseTokens.set(o,++reuseTokenId);return reuseTokens.get(o)}
function reuseInvalidate(){reuseCache=new WeakMap();reusePreparedCache=new WeakMap()}
function reuseSourcePiece(o,s){const q={id:o.id,name:String(o.name||'Piece').slice(0,80),type:o.type==='puppet'?'puppet':'shape',...basePose(o),bw:o.bw,bh:o.bh,flipX:!!o.flipX,flipY:!!o.flipY};if(q.type==='puppet')q.asset=o.asset;else q.shape='Rectangle';for(const k of REUSE_CHANNELS)if(o[k]!==undefined)q[k]=copy(o[k]);if(s&&q.conversation)for(const c of q.conversation.clips){const windows=actorId=>storyLines(s).filter(r=>r.actor.id===actorId).map(r=>({start:r.cue.start,duration:r.cue.duration}));c.speechWindows=windows(o.id);c.partnerWindows=windows(c.partnerId);}if(q.performance?.clips)for(const c of q.performance.clips)delete c.storyLineId;return q}
function reuseProject(def){return{format:'felt-and-fable',version:1,title:def.name,active:0,custom:[],imports:{},audioAssets:{},scenes:[{id:'performance-source',name:def.name,bg:-1,bgColor:'#eeeeee',duration:Math.max(1,def.sourceDuration),items:copy(def.pieces)}]}}
function reuseValidateDefinition(def){
 if(!def||def.version!==1||typeof def.id!=='string'||def.id.length>100||typeof def.name!=='string'||!def.name.trim()||def.name.length>80||!Array.isArray(def.pieces)||def.pieces.length<1||def.pieces.length>12)throw Error('Invalid saved performance. Use 1–12 separate pieces and a short name.');
 if(!Number.isFinite(def.from)||def.from<0||!Number.isFinite(def.duration)||def.duration<.2||def.duration>120||def.from+def.duration>7200||!Number.isFinite(def.sourceDuration)||def.sourceDuration<def.from+def.duration||def.sourceDuration>7200)throw Error('Choose a performance range of 0.2–120 seconds within the scene.');
 if(!def.pieces.some(o=>o.type==='puppet')||def.pieces.some(o=>!['puppet','shape'].includes(o.type)||o.children||o.dialogueLines||o.speech||o.wardrobe||o.reusablePerformances))throw Error('A saved performance needs an acting character and separate prop roles.');
 if(JSON.stringify(def).length>250000)throw Error('This performance is too complex. Save a smaller selection or simplify its animation.');
 const p=reuseProject(def);validateProject(p);return def;
}
function reuseValidate(p){
 reuseInvalidate();
 const library=p.performanceLibrary;if(library!==undefined){if(!Array.isArray(library)||library.length>40||JSON.stringify(library).length>2000000)throw Error('Keep up to 40 saved performances (2 MB).');const ids=new Set();for(const d of library){if(ids.has(d.id))throw Error('Saved performance IDs must be unique.');ids.add(d.id);reuseValidateDefinition(d)}}
 for(const s of p.scenes){const clips=s.reusablePerformances;if(clips===undefined)continue;if(!Array.isArray(clips)||clips.length>60||JSON.stringify(clips).length>4000000)throw Error('Keep up to 60 reusable clips per scene (4 MB).');const ids=new Set();
  for(const c of clips){if(!c||typeof c.id!=='string'||ids.has(c.id)||!Number.isFinite(c.start)||c.start<0||!Number.isFinite(c.duration)||c.duration<.2||c.duration>7200||c.start+c.duration>7200||typeof c.hold!=='boolean')throw Error('Invalid reusable clip timing.');ids.add(c.id);reuseValidateDefinition(c.template);if(!c.bindings||typeof c.bindings!=='object'||Array.isArray(c.bindings))throw Error('Assign every performance role.');const assigned=new Set();for(const role of c.template.pieces){const o=s.items.find(o=>o.id===c.bindings[role.id]);if(!o||o.children||(role.type==='puppet')!==(o.type==='puppet')||['bubble','text'].includes(o.type))throw Error('Assign each actor and prop role to a matching separate piece.');if(assigned.has(o.id))throw Error('Each role needs a different piece.');assigned.add(o.id)}if(Object.keys(c.bindings).length!==c.template.pieces.length)throw Error('Invalid performance role assignments.');
   for(const other of clips){if(other===c||!other?.bindings)continue;if(c.start<other.start+other.duration-1e-7&&other.start<c.start+c.duration-1e-7&&Object.values(other.bindings).some(id=>assigned.has(id)))throw Error('Reusable clips sharing a character or prop cannot overlap. Move or shorten the clip.')}
  }
 }return p;
}
function reuseReferences(o){return[...(o.conversation?.clips||[]).map(c=>c.partnerId),...(o.attachment?[o.attachment.parentId]:[]),...(o.performance?.gaze?.targetId?[o.performance.gaze.targetId]:[]),...(o.performance?.clips||[]).map(c=>c.targetId),...(o.propActions||[]).map(c=>c.actorId),...(o.choreography||[]).flatMap(c=>c.targetIds)].filter(Boolean)}
function reuseCollect(s,selection){const ids=new Set(selection);let changed=true;while(changed){changed=false;for(const o of s.items){if(ids.has(o.id)){for(const ref of reuseReferences(o))if(!ids.has(ref)){ids.add(ref);changed=true}}else if(o.attachment&&ids.has(o.attachment.parentId)||o.propActions?.some(a=>ids.has(a.actorId))){ids.add(o.id);changed=true}}if(ids.size>12)throw Error('This selection involves more than 12 linked pieces. Save a smaller performance.')}const list=s.items.filter(o=>ids.has(o.id));if(!list.some(o=>o.type==='puppet'))throw Error('Select at least one of the four acting characters.');if(list.some(o=>o.children||['text','bubble'].includes(o.type)))throw Error('Use separate characters and props. Leave text and groups out of the selection.');if(list.some(o=>o.locked))throw Error('Unlock the linked characters and props before saving this performance.');return list}
function reuseCapture(p,s,input){const from=Number(input.start),duration=Number(input.duration),list=reuseCollect(s,input.pieceIds||[]);if(from+duration>sceneSeconds(s,p)+1e-7)throw Error('Keep the saved range within this scene.');if((s.reusablePerformances||[]).some(c=>Object.values(c.bindings).some(id=>list.some(o=>o.id===id))&&(c.hold||from<c.start+c.duration)&&from+duration>c.start))throw Error('This range already uses a reusable clip. Reuse its saved performance, or remove that clip before capturing new acting.');
 const def={id:id(),version:1,name:String(input.name||'').trim().slice(0,80),from,duration,sourceDuration:sceneSeconds(s,p),pieces:list.map(o=>reuseSourcePiece(o,s))};reuseValidateDefinition(def);p.performanceLibrary??=[];if(p.performanceLibrary.length>=40)throw Error('Your story already contains 40 saved performances. Remove one first.');p.performanceLibrary.push(def);return def;
}
function reuseWithout(fn){const was=reuseSampling;reuseSampling=true;try{return fn()}finally{reuseSampling=was}}
function reusePrepare(s,c,signature=null){
 const cached=reusePreparedCache.get(c);if(signature&&cached?.signature===signature)return cached.scene;
 const def=c.template,sourceHomes=new Map(def.pieces.map(o=>[o.id,basePose(o)]));
 const targets=new Map(def.pieces.map(r=>[r.id,s.items.find(o=>o.id===c.bindings[r.id])]));
 const homes=new Map([...targets].map(([rid,o])=>[rid,basePose(o)]));
 const actorRole=def.pieces.find(o=>o.type==='puppet'),rootHome=sourceHomes.get(actorRole.id),rootTarget=homes.get(actorRole.id),rootScale=rootTarget.w/rootHome.w;
 const rootPoint=(x,y)=>[rootTarget.x+(x-rootHome.x)*rootScale,rootTarget.y+(y-rootHome.y)*rootScale];
 const prepared={id:'reusable-sample',name:def.name,bg:-1,bgColor:'#eeeeee',duration:def.sourceDuration,items:[]};
 for(const role of def.pieces){const target=targets.get(role.id),src=sourceHomes.get(role.id),home=homes.get(role.id),sx=home.w/src.w,sy=home.h/src.h;
  const q={...target};for(const key of [...REUSE_CHANNELS,'dialogue','dialogueLines','speech','storyProp'])delete q[key];for(const key of REUSE_CHANNELS)if(role[key]!==undefined)q[key]=copy(role[key]);
  const transform=pose=>({...pose,x:home.x+(pose.x-src.x)*sx,y:home.y+(pose.y-src.y)*sy,w:pose.w*sx,h:pose.h*sy,rotation:home.rotation+pose.rotation-src.rotation,opacity:Math.max(0,Math.min(1,home.opacity*(pose.opacity??1)/Math.max(.001,src.opacity??1)))});
  Object.assign(q,transform(basePose(role)));q.depth='middle';q.hidden=false;
  for(const k of q.keyframes||[])k.pose=transform(k.pose);
  for(const b of q.animationBlocks||[]){b.distance*=sx;if(b.path)b.path=b.path.map((v,i)=>v*(i%2?sy:sx));if(b.points)b.points=b.points.map(([x,y])=>[x*sx,y*sy])}
  for(const clip of q.conversation?.clips||[])if(clip.partnerId)clip.partnerId=c.bindings[clip.partnerId];
  if(q.performance?.gaze?.targetId)q.performance.gaze.targetId=c.bindings[q.performance.gaze.targetId];for(const clip of q.performance?.clips||[])if(clip.targetId)clip.targetId=c.bindings[clip.targetId];
  if(q.attachment){const a=q.attachment,parent=targets.get(a.parentId),ph=homes.get(a.parentId),sourceParent=def.pieces.find(o=>o.id===a.parentId);a.dx*=parent.bw/sourceParent.bw;a.dy*=parent.bh/sourceParent.bh;a.parentId=c.bindings[a.parentId];a.parentScaleX=ph.w/parent.bw;a.parentScaleY=ph.h/parent.bh;}
  for(const a of q.propActions||[]){if(a.actorId)a.actorId=c.bindings[a.actorId];if(a.kind==='putdown')[a.x,a.y]=rootPoint(a.x,a.y)}
  for(const a of q.choreography||[]){a.targetIds=a.targetIds.map(v=>c.bindings[v]);a.radiusX*=rootScale;a.radiusY*=rootScale;a.offsetX*=rootScale;a.offsetY*=rootScale;}
  prepared.items.push(q);
 }
 if(signature)reusePreparedCache.set(c,{signature,scene:prepared});return prepared;
}
function reuseFrame(s,t){if(reuseSampling||!s?.reusablePerformances?.length)return null;
 // Small source definitions contain no images or audio. The signature catches
 // direct manipulation as well as editor/API changes, including mirrored actors.
 const signature=JSON.stringify([s.reusablePerformances.map(c=>[c.id,c.start,c.duration,c.hold,c.bindings,reuseToken(c.template)]),s.items.map(o=>[o.id,...ANIM_PROPS.map(k=>o[k]),o.asset,o.bw,o.bh,o.flipX,o.flipY,o.hidden,...REUSE_CHANNELS.map(k=>o[k])])]);
 const cached=reuseCache.get(s);if(cached?.t===t&&cached.signature===signature)return cached;
 const out={t,signature,rows:new Map(),orders:[]},owner=new Map();
 const clips=[...s.reusablePerformances].sort((a,b)=>a.start-b.start);
 for(const c of clips)if(t>=c.start)for(const key of Object.values(c.bindings))owner.set(key,c);
 for(const c of clips){if(t<c.start||t>=c.start+c.duration&&!c.hold||!Object.values(c.bindings).every(key=>owner.get(key)===c))continue;
  const prepared=reusePrepare(s,c,signature),sample=c.template.from+Math.min(1-1e-9,(t-c.start)/c.duration)*c.template.duration,prior=directorRenderScene;
  reuseSampling=true;directorRenderScene=prepared;try{
   const order=studioOrder(prepared,sample).map(o=>o.id);out.orders.push(order);
   for(const o of prepared.items){const pose=cinemaVisualPose(o,sample,prepared),acting=o.type==='puppet'?cinemaActingAt(o,sample,prepared):null;const owner=o.propActions?.length?performancePropFrame(o,sample,prepared).owner:null,attachment=o.attachment&&(o.attachment.release==null||sample<o.attachment.release)?o.attachment:null;out.rows.set(o.id,{pose,acting,clipId:c.id,owner,attachment,controlledPosition:!!(o.attachment||o.propActions?.length)})}
  }finally{reuseSampling=false;directorRenderScene=prior}
 }
 reuseCache.set(s,out);return out;
}
function reuseSample(o,t,s=studioFindScene(o)){return reuseFrame(s,t)?.rows.get(o.id)||null}
function reuseActor(o,t,s){const a=reuseSample(o,t,s)?.acting;if(!a)return null;return{...a,expression:talkEmotion(o,t)||a.expression,mouth:directorSpeechMouth(o,t)??a.mouth,blink:o.acting?.blink!==false&&t%4.7>4.5}}
function reuseOrder(s,t,list){const frame=reuseFrame(s,t);if(!frame)return list;const result=list.slice();for(const order of frame.orders){const ids=new Set(order),slots=result.map((o,i)=>ids.has(o.id)?i:-1).filter(i=>i>=0),sorted=order.map(id=>result.find(o=>o.id===id)).filter(Boolean);slots.forEach((slot,i)=>result[slot]=sorted[i])}return result}
function reuseApply(p,s,input){const source=input.template||[...(p.performanceLibrary||[]),...reuseLocal,...REUSE_BUILTINS].find(d=>d.id===input.templateId)||s.reusablePerformances?.find(c=>c.id===input.id)?.template;if(!source)throw Error('Choose a saved performance.');const template=copy(source);reuseValidateDefinition(template);const c={id:input.id||id(),template,start:Number(input.start),duration:Number(input.duration),hold:input.hold!==false,bindings:copy(input.bindings)};
 for(const key of [...Object.values(c.bindings||{}),...Object.values(s.reusablePerformances?.find(x=>x.id===c.id)?.bindings||{})])if(s.items.find(o=>o.id===key)?.locked)throw Error('Unlock every assigned character and prop first.');
 const assigned=new Set(Object.values(c.bindings||{}));if(new Set(s.items.filter(o=>assigned.has(o.id)).map(o=>o.depth||'middle')).size>1)throw Error('Put the assigned pieces on the same depth layer so hands, props, and paths stay aligned during camera moves.');if(s.items.some(o=>!assigned.has(o.id)&&o.propActions?.some(a=>assigned.has(a.actorId))))throw Error('An assigned character also has separate prop actions. Use a new scene, or remove those prop actions before applying this performance.');
 s.reusablePerformances??=[];const at=s.reusablePerformances.findIndex(x=>x.id===c.id);if(at<0)s.reusablePerformances.push(c);else s.reusablePerformances[at]=c;reuseValidate(p);
 const prepared=reusePrepare(s,c),prior=directorRenderScene;reuseSampling=true;directorRenderScene=prepared;try{const issue=performanceReachIssues(prepared).find(issue=>{const a=prepared.items.find(o=>o.id===issue.propId)?.propActions?.find(a=>a.id===issue.actionId);return a&&a.start<template.from+template.duration&&a.start+a.duration>template.from});if(issue)throw Error('Move the assigned characters and prop closer together, then apply again. '+issue.message)}finally{reuseSampling=false;directorRenderScene=prior}
 s.duration=Math.max(s.duration||6,c.start+c.duration);reuseInvalidate();return c;
}
function reuseRemove(s,clipId){const c=s.reusablePerformances?.find(c=>c.id===clipId);if(!c)return;if(Object.values(c.bindings).some(key=>s.items.find(o=>o.id===key)?.locked))throw Error('Unlock the participants before removing this clip.');s.reusablePerformances=s.reusablePerformances.filter(c=>c.id!==clipId);reuseInvalidate()}
function reuseDetach(s,ids){if(!s.reusablePerformances?.length)return;s.reusablePerformances=(s.reusablePerformances||[]).filter(c=>!Object.values(c.bindings).some(key=>ids.includes(key)));reuseInvalidate()}
function reuseRemap(s,map,duplicate=false){if(!s.reusablePerformances?.length)return;const original=s.reusablePerformances,copies=[];for(const c of original){if(duplicate&&!Object.values(c.bindings).every(key=>map.has(key)))continue;const n=copy(c);n.id=id();n.bindings=Object.fromEntries(Object.entries(n.bindings).map(([k,v])=>[k,map.get(v)||v]));copies.push(n)}s.reusablePerformances=duplicate?[...original,...copies]:copies;reuseInvalidate()}
function reuseHas(o,s=studioFindScene(o)){return !reuseSampling&&!!s?.reusablePerformances?.some(c=>Object.values(c.bindings).includes(o.id))}
function reuseDefaults(){const actor={id:'actor',type:'puppet',asset:'cinema-maya',name:'Actor',x:800,y:580,w:338.56,h:368,bw:460,bh:500,rotation:0,opacity:1,acting:{pose:'standing',expression:'happy',talk:false,blink:true,cues:[]}};
 const make=(key,name,duration,pose,expression,react,hands)=>{const o=copy(actor);o.acting.cues=[{id:key+'-pose',start:0,duration:duration-.6,pose,expression,talk:false}];o.performance={hands:{left:'relaxed',right:'relaxed'},clips:[{id:key+'-reaction',kind:'react',reaction:react,start:.2,duration:duration-1,amount:.7},{id:key+'-hands',kind:'hands',left:hands[0],right:hands[1],start:0,duration:duration-.6}]};return{id:'builtin-'+key,version:1,name,from:0,duration,sourceDuration:duration,pieces:[o]}};
 return[make('hello','Wave hello',3,'waving','happy','nod',['relaxed','open']),make('think','Think it over',4,'thinking','worried','hesitate',['relaxed','relaxed']),make('celebrate','Celebrate',4,'dancing','happy','laugh',['open','open'])];
}
const REUSE_BUILTINS=reuseDefaults();
function reuseLibrary(){const defs=new Map([...REUSE_BUILTINS,...reuseLocal,...(state.performanceLibrary||[])].map(d=>[d.id,d]));return[...defs.values()]}
function reuseRemember(defs){const map=new Map(reuseLocal.map(d=>[d.id,d]));for(const d of defs)map.set(d.id,copy(d));const next=[...map.values()].slice(-40),raw=JSON.stringify(next);if(raw.length>2000000)return false;try{localStorage.setItem(REUSE_STORAGE,raw);reuseLocal=next;return true}catch{return false}}
function reuseReadPack(value){if(value?.format!=='felt-performances'||value.version!==1||!Array.isArray(value.performances)||value.performances.length>40||JSON.stringify(value).length>2000000)throw Error('Choose a Felt performance library JSON file (up to 2 MB).');const ids=new Set();for(const d of value.performances){reuseValidateDefinition(d);if(ids.has(d.id)||d.id.startsWith('builtin-'))throw Error('Invalid or duplicate saved performance ID.');ids.add(d.id)}return value.performances}

function reuseEditHome(o,k,v){const sample=reuseSample(o,animTime,scene());if(!sample)return false;if(sample.controlledPosition&&['x','y','rotation'].includes(k)){toast('This prop follows its reusable performance. Edit the clip or remove it before moving the prop independently.');return true}if(k==='x'||k==='y')v-=cinemaDepthOffset(o,scene(),animTime)[k];const shown=sample.pose[k];if(k==='w'||k==='h'){const factor=v/Math.max(.1,shown);o[k]=Math.max(.1,o[k]*factor);for(const f of o.keyframes||[])f.pose[k]*=factor}else{const delta=v-shown;o[k]=(o[k]??(k==='opacity'?1:0))+delta;for(const f of o.keyframes||[])f.pose[k]+=delta;if(k==='opacity')o[k]=cinemaClamp(o[k],0,1)}dirty=true;reuseInvalidate();return true}

function reuseSummary(def){return{id:def.id,name:def.name,duration:def.duration,roles:def.pieces.map(o=>({id:o.id,name:o.name,kind:o.type==='puppet'?'actor':'prop'}))}}
