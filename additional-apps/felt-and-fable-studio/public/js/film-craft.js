'use strict';
// Deterministic, seekable staging. No integration history is needed for export or scrubbing.
const CRAFT_ROPE_VALUES=['length','slack','tension','loopRadius'];
function craftPoint(o,p,u,v,t){
 const art=o.illustration?productionIllustrationAt(o,t):null,flip=art?.flipX??o.flipX;
 // Illustration pose coordinates refer to the actual contained artwork, not letterboxing.
 let w=p.w,h=p.h,cy=0;const im=imageMap.get(art?.asset||o.asset)||thumbMap.get(art?.asset||o.asset);
 if(art&&im){const scale=Math.min(o.bw/im.width,o.bh/im.height);w=im.width*scale*p.w/o.bw;h=im.height*scale*p.h/o.bh;cy=(p.h-h)/2;}
 const x=(u-.5)*w*(flip?-1:1),y=((v-.5)*h+cy)*(o.flipY?-1:1),a=p.rotation*Math.PI/180;
 return{x:p.x+x*Math.cos(a)-y*Math.sin(a),y:p.y+x*Math.sin(a)+y*Math.cos(a)};
}
function craftEndpoint(e,s,t,seen=new Set()){
 if(!e.pieceId)return{x:e.x,y:e.y};const o=s.items.find(q=>q.id===e.pieceId);if(!o||seen.has(o.id))throw Error('A contact or rope has a missing or circular attachment.');
 const p=cinemaVisualPose(o,t,s,poseAt(o,t,sceneSeconds(s)),false,new Set(seen));const pose=o.illustration?productionIllustrationAt(o,t)?.poseId:null,q=e.posePoints?.[pose]||e;return craftPoint(o,p,q.u,q.v,t);
}
function craftContactPose(o,p,s,t,seen=new Set()){
 const c=o.contact;if(!c||t<c.start||(c.end!==null&&t>=c.end))return p;
 seen=new Set(seen);seen.add(o.id);const target=craftEndpoint(c.target,s,t,seen),pose=o.illustration?productionIllustrationAt(o,t)?.poseId:null,uv=c.posePoints?.[pose]||c.self,point=craftPoint(o,p,uv.u,uv.v,t);
 return{...p,x:p.x+target.x-point.x,y:p.y+target.y-point.y};
}
function craftRopeAt(o,t){const r=o.rope;let q={length:r.length,slack:r.slack,tension:r.tension,loopRadius:r.loopRadius,endMode:r.endMode};
 for(const a of r.actions||[]){if(t<a.start)break;const u=directorEase(cinemaClamp((t-a.start)/a.duration,0,1),'smooth'),next={...q};for(const k of CRAFT_ROPE_VALUES)if(a.values[k]!==undefined)next[k]=q[k]+(a.values[k]-q[k])*u;if(a.values.endMode)next.endMode=a.values.endMode;q=next;if(u<1)break;}return q;}
function craftRopeGeometry(o,s,t){
 const r=o.rope,q=craftRopeAt(o,t),a=craftEndpoint(r.from,s,t,new Set([o.id])),b=q.endMode==='free'?{x:a.x,y:a.y+q.length}:craftEndpoint(r.to,s,t,new Set([o.id]));
 const end=q.endMode==='pinned'&&q.loopRadius>0?{x:b.x,y:b.y-q.loopRadius*.6}:b;let sag=0;const extra=q.slack*(1-q.tension);
 if(q.endMode==='pinned'&&extra>.001){const wanted=Math.hypot(end.x-a.x,end.y-a.y)+extra;let lo=0,hi=wanted;
  for(let n=0;n<18;n++){const mid=(lo+hi)/2;let length=0,prev=a;for(let i=1;i<=48;i++){const u=i/48,p={x:a.x+(end.x-a.x)*u,y:a.y+(end.y-a.y)*u+4*mid*u*(1-u)};length+=Math.hypot(p.x-prev.x,p.y-prev.y);prev=p;}if(length<wanted)lo=mid;else hi=mid;}sag=(lo+hi)/2;
 }
 const points=Array.from({length:65},(_,i)=>{const u=i/64;return{x:a.x+(end.x-a.x)*u,y:a.y+(end.y-a.y)*u+4*sag*u*(1-u)}});
 // A hanging bight is a narrow teardrop. A caught loop closes around its target.
 const radius=q.loopRadius,loop=[];if(radius>0)for(let i=0;i<=64;i++){const z=i/64*Math.PI*2,free=q.endMode==='free';loop.push({x:b.x+Math.sin(z)*radius*(free?.58*(.28+.72*Math.sin(z/2)):1),y:b.y+(free?radius*(1-Math.cos(z)):Math.cos(z)*radius*.6)});}
 return{a,b,points,loop,sag,settings:q};
}
function craftStroke(g,points,width,color){if(points.length<2)return;g.beginPath();g.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))g.lineTo(p.x,p.y);g.lineWidth=width;g.strokeStyle=color;g.stroke();}
function craftDrawRope(g,o,s,t){if(o.hidden||(o.opacity??1)<=0)return;const q=craftRopeGeometry(o,s,t);g.save();g.globalAlpha*=o.opacity??1;g.lineJoin='round';g.lineCap='round';for(const points of [q.points,q.loop]){craftStroke(g,points,o.rope.width+2,'#61472e');craftStroke(g,points,o.rope.width,o.color||'#bb9360');g.setLineDash([1,4]);craftStroke(g,points,Math.max(1,o.rope.width*.32),'#f0d5a2');g.setLineDash([]);}g.restore();}
let craftMaskCanvas=null,craftOccluderCanvas=null;
function craftDrawPiece(c,o,tree,s,t,scale=1){
 if(!o.rope&&!o.occlusion?.length)return false;if(o.hidden||(tree.opacity??1)<=0)return true;
 const paint=(g)=>o.rope?craftDrawRope(g,{...o,opacity:tree.opacity},s,t):drawItem(g,tree);
 if(!o.occlusion?.length){paint(c);return true;}
 scale=Math.max(1,Math.min(2,scale));const w=Math.round(W*scale),h=Math.round(H*scale);if(!craftMaskCanvas||craftMaskCanvas.width!==w||craftMaskCanvas.height!==h)craftMaskCanvas=makeCanvas(w,h);
 const g=craftMaskCanvas.getContext('2d');g.clearRect(0,0,w,h);g.save();g.scale(scale,scale);paint(g);g.restore();
 if(!craftOccluderCanvas||craftOccluderCanvas.width!==w||craftOccluderCanvas.height!==h)craftOccluderCanvas=makeCanvas(w,h);const mask=craftOccluderCanvas.getContext('2d');mask.clearRect(0,0,w,h);mask.save();mask.scale(scale,scale);
 for(const m of o.occlusion){const target=s.items.find(q=>q.id===m.pieceId);if(!target||target.hidden)continue;const q=animationTree(target,t,false,sceneSeconds(s));Object.assign(q,cinemaVisualPose(target,t,s,basePose(q)));const [u,v,rw,rh]=m.rect,pts=[[u,v],[u+rw,v],[u+rw,v+rh],[u,v+rh]].map(([x,y])=>craftPoint(target,q,x,y,t));
  mask.save();mask.beginPath();mask.moveTo(pts[0].x,pts[0].y);pts.slice(1).forEach(p=>mask.lineTo(p.x,p.y));mask.closePath();mask.clip();drawItem(mask,q,false);mask.restore();
 }mask.restore();g.globalCompositeOperation='destination-out';g.drawImage(craftOccluderCanvas,0,0);g.globalCompositeOperation='source-over';c.drawImage(craftMaskCanvas,0,0,W,H);return true;
}
function craftTargets(p){const list=productionTargets(p);for(const s of p.scenes)for(const o of s.items){for(const a of o.rope?.actions||[])list.push({sceneId:s.id,pieceId:o.id,id:a.id,kind:'rope',label:o.name+' · rope',target:a});for(const a of o.reactions||[])list.push({sceneId:s.id,pieceId:o.id,id:a.id,kind:'reaction',label:o.name+' · '+a.poseId,target:a});}return list;}
function craftRefKey(r){return JSON.stringify([r.sceneId,r.pieceId||null,r.kind,r.id||r.targetId]);}
function craftSyncLinks(p,strict=false,apply=true){
 const links=p.production?.actionLinks||[];if(!links.length)return[];const targets=craftTargets(p),index=new Map(targets.map(r=>[craftRefKey(r),r])),rows=new Map(storyTimeline(p).map(r=>[r.scene.id,r])),incoming=new Map(),computed=new Map(),visiting=new Set(),issues=[];
 const fail=message=>{throw Error(message)};
 try{for(const l of links){const key=craftRefKey(l.target);if(incoming.has(key))fail('An event can have only one action link.');if(p.production.bindings?.some(b=>craftRefKey(b)===key))fail('Unlink the music marker before linking this event to an action.');incoming.set(key,l);}
  const solve=key=>{if(computed.has(key))return computed.get(key);if(visiting.has(key))fail('Action links cannot form a cycle.');const r=index.get(key),row=r&&rows.get(r.sceneId);if(!r||!row)fail('An action link has a missing event. Unlink it before deleting the event.');visiting.add(key);const l=incoming.get(key);let time=row.start+(r.kind==='pose'?r.target.time:r.target.start);
   if(l){const src=index.get(craftRefKey(l.source));if(!src)fail('An action link has a missing source.');time=solve(craftRefKey(l.source))+(l.edge==='end'?(src.target.duration||0):0)+l.offset;const local=time-row.start,end=local+(r.target.duration||0);if(local<0||end>row.duration+.001)fail('Linked '+r.label+' no longer fits in '+row.scene.name+'.');}
   visiting.delete(key);computed.set(key,time);return time;};for(const key of incoming.keys())solve(key);
  if(apply)for(const key of incoming.keys()){const r=index.get(key);r.target[r.kind==='pose'?'time':'start']=Math.round((computed.get(key)-rows.get(r.sceneId).start)*1e6)/1e6;}
 }catch(e){if(strict)throw e;issues.push({severity:'warning',sceneId:links[0]?.target?.sceneId,time:0,message:e.message});}return issues;
}
function craftValidate(p){
 const num=(v,a,b,n)=>productionNumber(v,a,b,n),point=q=>{if(!q)throw Error('Choose a contact point.');num(q.u,0,1,'point across');num(q.v,0,1,'point down');};
 const endpoint=(e,s,self)=>{if(!e||typeof e!=='object')throw Error('Choose a rope endpoint or contact target.');if(e.pieceId){if(e.pieceId===self||!s.items.some(o=>o.id===e.pieceId&&!o.rope))throw Error('Choose another existing piece as the attachment.');point(e);for(const q of Object.values(e.posePoints||{}))point(q);}else{num(e.x,-12000,12000,'board X');num(e.y,-12000,12000,'board Y');}};
 const values=q=>{for(const k of Object.keys(q)){if(k==='endMode'){if(!['free','pinned'].includes(q[k]))throw Error('Choose a hanging or attached rope.');}else if(CRAFT_ROPE_VALUES.includes(k))num(q[k],0,k==='tension'?1:k==='loopRadius'?300:4000,k);else throw Error('Unknown rope setting.');}};
 for(const s of p.scenes){for(const o of s.items){if(o.children?.some(x=>x.contact||x.rope||x.occlusion||x.reactions))throw Error('Put staging on top-level pieces.');
  if(o.contact){if(o.rope||o.attachment||o.propActions?.length||o.choreography?.length)throw Error('Use a contact pin on an independently posed piece.');const a=o.contact;point(a.self);endpoint(a.target,s,o.id);num(a.start,0,7199,'contact start');if(a.end!==null)num(a.end,a.start+.001,7200,'contact release');for(const q of Object.values(a.posePoints||{}))point(q);}
  if(o.rope){const r=o.rope;if(o.type!=='pen')throw Error('Ropes use a line piece.');endpoint(r.from,s,o.id);endpoint(r.to,s,o.id);values({length:r.length,slack:r.slack,tension:r.tension,loopRadius:r.loopRadius,endMode:r.endMode});num(r.width,1,30,'rope width');if(!Array.isArray(r.actions)||r.actions.length>200)throw Error('Use up to 200 rope changes.');let end=-1,ids=new Set();for(const a of [...r.actions].sort((a,b)=>a.start-b.start)){if(typeof a.id!=='string'||ids.has(a.id))throw Error('Rope change IDs must be unique.');ids.add(a.id);num(a.start,0,7199,'rope change start');num(a.duration,1/60,7200-a.start,'rope change duration');values(a.values);if(a.start<end)throw Error('Rope changes cannot overlap.');end=a.start+a.duration;}r.actions.sort((a,b)=>a.start-b.start);}
  if(o.occlusion){if(!Array.isArray(o.occlusion)||o.occlusion.length>8)throw Error('Use up to eight foreground masks.');for(const m of o.occlusion){if(m.pieceId===o.id||!s.items.some(q=>q.id===m.pieceId&&!q.rope))throw Error('Choose another illustration as the foreground mask.');if(!Array.isArray(m.rect)||m.rect.length!==4)throw Error('Choose a mask rectangle.');m.rect.forEach((v,i)=>num(v,i>1?.001:0,1,'mask region'));if(m.rect[0]+m.rect[2]>1.00001||m.rect[1]+m.rect[3]>1.00001)throw Error('Keep the mask region inside the illustration.');}}
  if(o.reactions){if(!Array.isArray(o.reactions)||o.reactions.length>200||(o.reactions.length&&!o.illustration))throw Error('Add complete illustrated poses before reactions.');let end=-1,ids=new Set();for(const a of [...o.reactions].sort((a,b)=>a.start-b.start)){if(typeof a.id!=='string'||ids.has(a.id)||!o.illustration.poses.some(q=>q.id===a.poseId))throw Error('Choose a saved illustrated reaction pose.');ids.add(a.id);num(a.start,0,7199,'reaction start');num(a.duration,1/60,7200-a.start,'reaction duration');if(a.start<end)throw Error('Reaction holds cannot overlap.');end=a.start+a.duration;}}
 }
 const done=new Set(),visiting=new Set();const visit=o=>{if(visiting.has(o.id))throw Error('Contact attachments cannot form a cycle.');if(done.has(o.id))return;visiting.add(o.id);const refs=[o.contact?.target?.pieceId,o.attachment?.parentId,...(o.choreography||[]).flatMap(c=>c.targetIds)];for(const key of refs.filter(Boolean)){const parent=s.items.find(q=>q.id===key);if(parent)visit(parent);}visiting.delete(o.id);done.add(o.id)};s.items.forEach(visit);
 }
 const links=p.production?.actionLinks;if(links){if(!Array.isArray(links)||links.length>1000)throw Error('Use up to 1,000 linked events.');for(const l of links){if(!['start','end'].includes(l.edge))throw Error('Choose the start or end of an action.');num(l.offset,-7200,7200,'linked offset');for(const r of [l.source,l.target])if(!r||typeof r.sceneId!=='string'||typeof r.id!=='string'||!['cue','action','pose','rope','reaction'].includes(r.kind))throw Error('Choose valid linked events.');}craftSyncLinks(p,true,false);}
 return p;
}
function craftNewRope(){return{id:id(),name:'Hanging rope',type:'pen',points:[[50,0],[50,100]],bw:100,bh:100,x:800,y:450,w:12,h:300,rotation:0,opacity:1,color:'#bd955f',penWidth:5,fiber:0,stitch:false,rope:{from:{pieceId:null,x:800,y:260},to:{pieceId:null,x:800,y:620},endMode:'free',length:300,slack:100,tension:0,loopRadius:32,width:6,actions:[]}};}
function craftOperation(p,op){const s=p.scenes.find(s=>s.id===op.sceneId),o=s?.items.find(o=>o.id===op.pieceId);const requirePiece=()=>{if(!o||o.locked)throw Error('Choose an unlocked piece.');return o};
 switch(op.op){case'rope':if(!s)throw Error('Choose a scene.');if(o){requirePiece();if(op.rope===null){delete o.rope;break;}o.rope=copy(op.rope);}else{s.items.push({...craftNewRope(),...(op.id?{id:op.id}:{}),...(op.name?{name:op.name}:{}),...(op.rope?{rope:copy(op.rope)}:{})});}break;
 case'contact':requirePiece();if(op.contact===null)delete o.contact;else o.contact=copy(op.contact);break;
 case'occlusion':requirePiece();o.occlusion=copy(op.masks||[]);break;
 case'reaction':requirePiece();o.reactions=(o.reactions||[]).filter(a=>a.id!==op.id);if(!op.remove)o.reactions.push({id:op.id||id(),poseId:op.poseId,start:Number(op.start),duration:Number(op.duration)});break;
 case'actionLink':{const q=productionConfig(p),key=craftRefKey(op.target);q.actionLinks=(q.actionLinks||[]).filter(l=>craftRefKey(l.target)!==key);if(op.source)q.actionLinks.push({source:copy(op.source),target:copy(op.target),edge:op.edge||'start',offset:Number(op.offset||0)});break;}
 case'foley':if(!s)throw Error('Choose a scene.');s.cues??=[];if(op.remove){s.cues=s.cues.filter(c=>c.id!==op.id);break;}if(!CINEMA_SOUNDS.some(c=>c[0]===op.preset))throw Error('Choose a sound effect.');{const prior=s.cues.find(c=>c.id===op.id),cue=cinemaNewCue({...prior,id:op.id||id(),preset:op.preset,assetId:null,name:CINEMA_SOUNDS.find(c=>c[0]===op.preset)[1],start:Number(op.start),duration:Number(op.duration??CINEMA_SOUNDS.find(c=>c[0]===op.preset)[2]),volume:Number(op.volume??.5),fadeIn:.01,fadeOut:.06,loop:false});s.cues=s.cues.filter(c=>c.id!==cue.id);s.cues.push(cue);}break;
 default:return false;
 }return true;
}
function craftRemap(s,map,oldSceneId){for(const o of s.items){if(o.contact?.target.pieceId)o.contact.target.pieceId=map.get(o.contact.target.pieceId)||o.contact.target.pieceId;for(const e of [o.rope?.from,o.rope?.to])if(e?.pieceId)e.pieceId=map.get(e.pieceId)||e.pieceId;for(const m of o.occlusion||[])m.pieceId=map.get(m.pieceId)||m.pieceId;}return s;}
function craftDetachReferences(ids){for(const o of items()){if(o.contact&&ids.includes(o.contact.target.pieceId)){const p=cinemaVisualPose(o,animTime,scene());Object.assign(o,p);delete o.contact;}for(const key of ['from','to'])if(o.rope?.[key]?.pieceId&&ids.includes(o.rope[key].pieceId)){const q=craftEndpoint(o.rope[key],scene(),animTime);o.rope[key]={pieceId:null,...q};}if(o.occlusion)o.occlusion=o.occlusion.filter(m=>!ids.includes(m.pieceId));}
 if(state.production?.actionLinks)state.production.actionLinks=state.production.actionLinks.filter(l=>![l.source,l.target].some(r=>r.sceneId===scene().id&&ids.includes(r.pieceId)));}
window.FeltCraft={version:1,apply:input=>productionApply(input),ropeGeometry:(sceneId,pieceId,time)=>{const s=state.scenes.find(s=>s.id===sceneId),o=s?.items.find(o=>o.id===pieceId);if(!o?.rope)throw Error('Choose a rope.');return craftRopeGeometry(o,s,time);},targets:()=>craftTargets(state).map(({target,...r})=>({...r,start:target.time??target.start,duration:target.duration||0})),summary:()=>({features:['gravity-rope','contact-pin','partial-occlusion','action-links','illustrated-reactions','foley','shot-loop-and-step'],actionLinks:copy(state.production?.actionLinks||[]),scenes:state.scenes.map(s=>({id:s.id,pieces:s.items.filter(o=>o.rope||o.contact||o.occlusion?.length||o.reactions?.length).map(o=>({id:o.id,name:o.name,rope:copy(o.rope||null),contact:copy(o.contact||null),occlusion:copy(o.occlusion||[]),reactions:copy(o.reactions||[])}))}))})};
