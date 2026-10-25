'use strict';
// Small authored clips; every preview/export evaluates the same absolute scene time.
const PERFORMANCE_HANDS=['relaxed','open','point','grip'];
const PERFORMANCE_REACTIONS={nod:'Nod',listen:'Listen',hesitate:'Hesitate',surprised:'Surprised',laugh:'Quiet laugh',no:'Shake head'};
const performanceSmooth=u=>{u=cinemaClamp(u,0,1);return u*u*(3-2*u)};
const performanceMix=(a,b,u)=>a.map((v,i)=>v+(b[i]-v)*performanceSmooth(u));
const performanceScene=()=>directorRenderScene||scene();
function performanceBase(o,t,s){return cineDepthPose(o,s,t,poseAt(o,t,sceneSeconds(s)))}
function performanceWorld(o,p,q){const r=p.rotation*Math.PI/180,x=q[0]*p.w/o.bw*(o.flipX?-1:1),y=q[1]*p.h/o.bh*(o.flipY?-1:1);return[p.x+x*Math.cos(r)-y*Math.sin(r),p.y+x*Math.sin(r)+y*Math.cos(r)]}
function performanceRestActing(o,t){const reused=reuseActor(o,t,performanceScene());if(reused)return reused;const a=o.acting||{},cue=(a.cues||[]).find(c=>t>=c.start&&t<c.start+c.duration);return{...a,...cue,freeze:cue?undefined:a.freeze,phase:cue?t-cue.start:t,conversation:cue?null:conversationAt(o,t,performanceScene())}}
function performanceBaseHand(o,hand,t,s){const k=cinemaPuppetGeometry({...o,acting:performanceRestActing(o,t)},t,true),q=cinemaArmJoint(k,hand==='leftHand',CINEMA_PALMS[o.asset][hand==='leftHand'?0:1]).hand;return performanceWorld(o,performanceBase(o,t,s),q)}
function performanceLocal(o,world,t,s){return localPoint({...o,...performanceBase(o,t,s)},world)}
function performanceClips(o,kind){return(o.performance?.clips||[]).filter(c=>c.kind===kind)}
function performanceEnvelope(c,t){const edge=Math.min(.3,c.duration*.22);return performanceSmooth((t-c.start)/edge)*performanceSmooth((c.start+c.duration-t)/edge)}
function performanceAt(o,t,s=performanceScene()){
 const reused=reuseSample(o,t,s);if(reused?.acting)return reused.acting.performance;
 const p=o.performance||{},freeze=(o.acting?.cues||[]).some(c=>t>=c.start&&t<c.start+c.duration)?{}:o.acting?.freeze?.performance||{},out={headX:0,headY:0,headAngle:0,eyeX:0,eyeY:0,...((o.acting?.cues||[]).some(c=>t>=c.start&&t<c.start+c.duration)?{}:conversationAt(o,t,s)?.performance||{}),...freeze,left:p.hands?.left||freeze.left||conversationAt(o,t,s)?.performance.left||'relaxed',right:p.hands?.right||freeze.right||conversationAt(o,t,s)?.performance.right||'relaxed'};
 const active=(kind)=>performanceClips(o,kind).find(c=>t>=c.start&&t<c.start+c.duration),look=active('look');
 const direction=gaze=>{const target=s.items.find(x=>x.id===gaze?.targetId);if(!target)return[0,0];const a=performanceBase(o,t,s),b=performancePropPose(target,t,s)||performanceBase(target,t,s),head=target.type==='puppet'?performanceWorld(target,b,[0,-100]):[b.x,b.y],q=localPoint({...o,...a},head),amount=gaze.amount??.7;return[cinemaClamp(q[0]/170,-1,1)*amount,cinemaClamp((q[1]+100)/170,-1,1)*amount]};
 const rest=direction(p.gaze),dest=look?direction(look):rest,u=look?performanceEnvelope(look,t):0,dx=rest[0]+(dest[0]-rest[0])*u,dy=rest[1]+(dest[1]-rest[1])*u;if(p.gaze||look){out.eyeX=dx*5;out.eyeY=dy*3;out.headAngle=dx*3;out.headX=dx*3;}
 const react=active('react');if(react){const dt=t-react.start,e=performanceEnvelope(react,t)*(react.amount??.65),wave=Math.sin(dt*Math.PI*3);if(react.reaction==='nod')out.headY+=Math.sin(dt*Math.PI*4)*5*e;
  if(react.reaction==='listen'){out.headAngle+=5*e;out.headY+=Math.sin(dt*3)*1.3*e}
  if(react.reaction==='hesitate'){out.headAngle-=6*e;out.expression='worried'}
  if(react.reaction==='surprised'){out.headY-=4*e;out.expression='surprised'}
  if(react.reaction==='laugh'){out.headY+=wave*3*e;out.headAngle+=wave*2*e;out.expression='happy';out.mouth=e>.2?1:0}
  if(react.reaction==='no')out.headX+=wave*5*e;
 }
 const hands=active('hands');if(hands){out.left=hands.left;out.right=hands.right}
 // Interactions own only the participating hand, leaving the other available for acting.
 for(const prop of s.items){if(!prop.propActions?.length)continue;const frame=performancePropFrame(prop,t,s);for(const arm of frame.arms||[])if(arm.actorId===o.id){out[arm.hand==='leftHand'?'left':'right']=arm.shape;out[arm.hand+'Target']=performanceLocal(o,arm.point,t,s)}}
 return out;
}
function performanceHeadPoint(q,p={}){const a=(p.headAngle||0)*Math.PI/180,x=q[0],y=q[1]+30;return[(p.headX||0)+x*Math.cos(a)-y*Math.sin(a),-30+(p.headY||0)+x*Math.sin(a)+y*Math.cos(a)]}
function performanceSolveArm(k,left,target,asset){
 if(!target)return;const r=CINEMA_RIG,palm=CINEMA_PALMS[asset][left?0:1],hx=(palm[0]-.5)*r.armWidth,hy=palm[1]*r.armHeight-r.pivot-r.elbow,l2=Math.hypot(hx,hy),dx=target[0]-(left?-r.shoulderX:r.shoulderX),dy=target[1]-r.shoulderY,d=cinemaClamp(Math.hypot(dx,dy),Math.abs(r.elbow-l2)+.01,r.elbow+l2-.01),bend=Math.acos(cinemaClamp((d*d-r.elbow*r.elbow-l2*l2)/(2*r.elbow*l2),-1,1))*(left?-1:1),upper=Math.atan2(-dx,dy)-Math.atan2(l2*Math.sin(bend),r.elbow+l2*Math.cos(bend)),phi=Math.atan2(-hx,hy);
 k[left?'left':'right']=upper*180/Math.PI;k[left?'leftBend':'rightBend']=(bend-phi)*180/Math.PI;
}
const performanceSkinTextures=new Map();
function performanceSkin(asset,left){const key=asset+left;if(performanceSkinTextures.has(key))return performanceSkinTextures.get(key);const im=imageMap.get(asset),meta=artById.get(asset).puppet,palm=CINEMA_PALMS[asset][left?0:1],crop=meta.parts[left?'leftArm':'rightArm'],tile=makeCanvas(32,32),g=tile.getContext('2d');g.fillStyle=meta.skin;g.fillRect(0,0,32,32);g.drawImage(im,crop[0]+crop[2]*palm[0]-7,crop[1]+crop[3]*palm[1]-7,14,14,0,0,32,32);performanceSkinTextures.set(key,tile);return tile}
// Thumbs turn toward the torso with lowered hands and toward the palm in a wave.
// Only the thumb moves across the palm during a wrist turn; the hand never collapses.
function performanceThumbSide(left,angle=0){return(left?-1:1)*-cinemaClamp(Math.cos(angle)/.5,-1,1)}
function performanceDrawHand(g,asset,left,shape,cuffY=-23,angle=0){
 const thumb=performanceThumbSide(left,angle),p=new Path2D();g.save();
 g.fillStyle=g.createPattern(performanceSkin(asset,left),'repeat');g.shadowColor='#36231625';g.shadowBlur=1;g.shadowOffsetY=1;
 // The thumb is behind the palm. It disappears naturally as the wrist turns edge-on.
 g.beginPath();g.ellipse(thumb*14,-2,7,12,-thumb*.42,0,Math.PI*2);g.fill();
 p.moveTo(-10,cuffY-2);p.lineTo(10,cuffY-2);p.quadraticCurveTo(14,-7,14,3);
 if(shape==='open'){
  p.lineTo(14,17);p.bezierCurveTo(14,25,7,25,7,16);p.bezierCurveTo(7,30,0,30,0,17);p.bezierCurveTo(0,28,-7,28,-7,16);p.bezierCurveTo(-7,22,-14,22,-14,14);p.lineTo(-14,3);
 }else if(shape==='point'){
  p.lineTo(9,6);p.lineTo(9,27);p.bezierCurveTo(9,34,1,34,1,27);p.lineTo(1,10);p.bezierCurveTo(-4,17,-14,13,-14,3);
 }else{p.bezierCurveTo(16,21,-16,21,-14,3)}
 p.quadraticCurveTo(-14,-7,-10,cuffY-2);p.closePath();g.fill(p);g.shadowColor='transparent';
 if(shape==='grip'){g.strokeStyle='#40281935';g.lineWidth=1.3;g.lineCap='round';g.beginPath();g.moveTo(-8,3);g.quadraticCurveTo(0,7,8,3);g.stroke()}g.restore();
}
function performanceOrder(s){const index=new Map(s.items.map((o,i)=>[o.id,i]));return s.items.map((o,i)=>{const refs=[...(o.propActions||[]).map(a=>index.get(a.actorId)??-1),...(o.attachment?.order!=='scene'&&['leftHand','rightHand'].includes(o.attachment?.anchor)?[index.get(o.attachment.parentId)??-1]:[])];return{o,i,depth:Math.max(CINEMA_DEPTH[o.depth]??1,...refs.filter(i=>i>=0).map(i=>CINEMA_DEPTH[s.items[i].depth]??1)),order:refs.length?Math.max(i,...refs)+.1:i}}).sort((a,b)=>a.depth-b.depth||a.order-b.order||a.i-b.i).map(x=>x.o)}
function performanceActions(o){return[...(o.propActions||[])].sort((a,b)=>a.start-b.start)}
function performanceOwnerAt(o,t){let owner=o.attachment&&['leftHand','rightHand'].includes(o.attachment.anchor)&&(o.attachment.release==null||t<o.attachment.release)?{actorId:o.attachment.parentId,hand:o.attachment.anchor}:null;for(const a of performanceActions(o)){if(t<a.start+a.duration)break;owner=a.kind==='putdown'?null:{actorId:a.actorId,hand:a.hand}}return owner}
function performanceInitialPoint(o,t,s){if(o.attachment){const a=o.attachment,actor=s.items.find(x=>x.id===a.parentId);if(actor?.type==='puppet'){const at=a.release==null?t:Math.min(t,a.release),q=performanceBaseHand(actor,a.anchor,at,s),p=performanceBase(actor,at,s),offset=performanceWorld(actor,{...p,x:0,y:0},[a.dx,a.dy]);return[q[0]+offset[0],q[1]+offset[1]]}}const p=performanceBase(o,t,s);return[p.x,p.y]}
function performancePropFrame(o,t,s=performanceScene()){
 const actions=performanceActions(o);let owner=o.attachment&&['leftHand','rightHand'].includes(o.attachment.anchor)?{actorId:o.attachment.parentId,hand:o.attachment.anchor}:null,point=performanceInitialPoint(o,t,s),arms=[],active=null;
 const baseHand=(who,at)=>{const actor=s.items.find(x=>x.id===who?.actorId);return actor?performanceBaseHand(actor,who.hand,at,s):point};
 for(const a of actions){if(t<a.start)break;
  if(a.kind==='pickup')owner=null;
  const recipient=a.kind==='putdown'?null:{actorId:a.actorId,hand:a.hand},dt=(t-a.start)/a.duration;
  if(dt>=1){owner=recipient;point=a.kind==='putdown'?[a.x,a.y]:baseHand(owner,t);continue}
  active=a;const source=owner,sourcePoint=source?baseHand(source,t):point;
  if(a.kind==='pickup'){
   // Reach to the stationary object, then bring it into the resting hand.
   const rest=baseHand(recipient,t),pick=point;point=dt<.35?pick:performanceMix(pick,rest,(dt-.35)/.5);
   arms.push({...recipient,point:dt<.35?performanceMix(rest,pick,dt/.35):point,shape:dt<.35?'open':'grip'});owner=dt<.35?null:recipient;
  }else if(a.kind==='give'){
   const startA=baseHand(source,a.start),startB=baseHand(recipient,a.start),meet=[(startA[0]+startB[0])/2,(startA[1]+startB[1])/2-28],end=baseHand(recipient,t);
   point=dt<.4?performanceMix(sourcePoint,meet,dt/.4):dt<.55?meet:performanceMix(meet,end,(dt-.55)/.35);
   if(source)arms.push({...source,point:dt<.55?point:performanceMix(meet,sourcePoint,(dt-.55)/.4),shape:dt<.5?'grip':'open'});
   arms.push({...recipient,point:dt<.4?performanceMix(end,meet,dt/.4):point,shape:dt<.5?'open':'grip'});owner=dt<.5?source:recipient;
  }else{
   const destination=[a.x,a.y];point=dt<.55?performanceMix(sourcePoint,destination,dt/.55):destination;
   if(source)arms.push({...source,point:dt<.55?point:performanceMix(destination,sourcePoint,(dt-.55)/.4),shape:dt<.55?'grip':'open'});owner=dt<.55?source:null;
  }
  return{point,owner,arms,active};
 }
 if(owner){point=baseHand(owner,t);arms.push({...owner,point,shape:'grip'})}
 return{point,owner,arms,active};
}
function performancePropPose(o,t,s){if(!o.propActions?.length||t<performanceActions(o)[0].start)return null;const frame=performancePropFrame(o,t,s),p=performanceBase(o,t,s);return{...p,x:frame.point[0],y:frame.point[1]}}
function performanceReachIssues(s){const issues=[];for(const prop of s.items){for(const a of prop.propActions||[]){let bad=false;for(const u of [0,.2,.35,.45,.55,.75,.95]){const t=a.start+a.duration*u;for(const arm of performancePropFrame(prop,t,s).arms){const actor=s.items.find(x=>x.id===arm.actorId);if(!actor)continue;const q=performanceLocal(actor,arm.point,t,s),left=arm.hand==='leftHand',r=CINEMA_RIG,p=CINEMA_PALMS[actor.asset][left?0:1],reach=r.elbow+Math.hypot((p[0]-.5)*r.armWidth,p[1]*r.armHeight-r.pivot-r.elbow);if(Math.hypot(q[0]-(left?-r.shoulderX:r.shoulderX),q[1]-r.shoulderY)>reach+.5)bad=true;}}
  if(bad)issues.push({propId:prop.id,actionId:a.id,start:a.start,message:a.kind==='give'?'Move the characters closer together, or choose their nearer hands.':a.kind==='pickup'?'Move the prop within reach of the selected hand.':'Choose a destination closer to the character’s hand.'});
 }}return issues}
function performanceRemap(o,map,clearExternal=false){for(const c of o.conversation?.clips||[])if(c.partnerId)c.partnerId=map.get(c.partnerId)||(clearExternal?null:c.partnerId);
 const link=value=>map.get(value)||(clearExternal?null:value);
 if(o.performance?.gaze?.targetId)o.performance.gaze.targetId=link(o.performance.gaze.targetId);
 for(const c of o.performance?.clips||[]){c.id=id();if(c.targetId)c.targetId=link(c.targetId)}
 if(o.propActions){if(clearExternal&&o.propActions.some(a=>a.actorId&&!map.has(a.actorId)))delete o.propActions;else for(const a of o.propActions){a.id=id();if(a.actorId)a.actorId=link(a.actorId)}}
 o.children?.forEach(c=>performanceRemap(c,map,clearExternal));
}
function performanceClear(o){for(const c of o.conversation?.clips||[])c.partnerId=null;delete o.propActions;if(o.performance){delete o.performance.gaze;o.performance.clips=(o.performance.clips||[]).filter(c=>c.kind!=='look')}o.children?.forEach(performanceClear)}
function performanceDetachReferences(ids){for(const o of items()){for(const c of o.conversation?.clips||[])if(ids.includes(c.partnerId))c.partnerId=null;if(o.propActions?.some(a=>ids.includes(a.actorId))||(o.propActions?.length&&ids.includes(o.attachment?.parentId))){const p=cinemaVisualPose(o,animTime,scene());Object.assign(o,p);delete o.propActions;delete o.attachment;o.depth='middle'}if(ids.includes(o.performance?.gaze?.targetId))delete o.performance.gaze;for(const c of o.performance?.clips||[])if(ids.includes(c.targetId))c.targetId=null}}
function validatePerformanceProject(p){
 const num=(n,lo,hi)=>Number.isFinite(n)&&n>=lo&&n<=hi,fail=s=>{throw Error(s)},timing=c=>{if(!c||typeof c.id!=='string'||!num(c.start,0,7199)||!num(c.duration,.2,7200-c.start))fail('Invalid performance clip timing.')};
 for(const s of p.scenes){const byId=new Map(s.items.map(o=>[o.id,o])),usage=[];
  function check(o,nested=false){const perf=o.performance;if(perf){if(o.type!=='puppet')fail('Performance belongs to an acting character.');if(perf.gaze&&(!num(perf.gaze.amount,0,1)||perf.gaze.targetId&&(perf.gaze.targetId===o.id||!byId.has(perf.gaze.targetId))))fail('Choose a look-at target in this scene.');if(perf.hands&&(!PERFORMANCE_HANDS.includes(perf.hands.left)||!PERFORMANCE_HANDS.includes(perf.hands.right)))fail('Invalid hand pose.');if(perf.clips!==undefined&&(!Array.isArray(perf.clips)||perf.clips.length>150))fail('Use up to 150 performance clips per actor.');const ids=new Set();for(const c of perf.clips||[]){timing(c);if(ids.has(c.id))fail('Performance clip IDs must be unique.');ids.add(c.id);if(!['look','react','hands'].includes(c.kind))fail('Invalid performance clip.');if(c.kind==='look'&&(c.targetId&&(c.targetId===o.id||!byId.has(c.targetId))||!num(c.amount,0,1)))fail('Invalid look-at clip.');if(c.kind==='react'&&(!Object.hasOwn(PERFORMANCE_REACTIONS,c.reaction)||!num(c.amount,0,1)))fail('Invalid reaction.');if(c.kind==='hands'&&(!PERFORMANCE_HANDS.includes(c.left)||!PERFORMANCE_HANDS.includes(c.right)))fail('Invalid hand pose.');if((perf.clips||[]).some(d=>d!==c&&d.kind===c.kind&&c.start<d.start+d.duration&&d.start<c.start+c.duration))fail('Clips of the same kind cannot overlap. Move or shorten this clip.')}}
   if(o.propActions!==undefined){if(nested||o.type==='puppet'||!Array.isArray(o.propActions)||o.propActions.length>100)fail('Prop actions require a separate prop on the board.');if(o.propActions.length&&(o.keyframes?.length||o.animationBlocks?.length))fail('Clear this prop’s movement animation before adding prop actions.');if(o.propActions.length&&o.attachment&&(o.attachment.dx!==0||o.attachment.dy!==0||o.attachment.release!=null||!['leftHand','rightHand'].includes(o.attachment.anchor)))fail('For prop actions, attach at the center of a hand without a release time.');let previousEnd=-1,owner=o.attachment?{actorId:o.attachment.parentId,hand:o.attachment.anchor}:null,heldSince=0;if(o.propActions.length&&owner&&(byId.get(owner.actorId)?.type!=='puppet'||byId.get(owner.actorId)?.attachment))fail('Start with a prop attached to an independent acting character.');const ids=new Set();
    const reserve=(who,start,end)=>{if(who)usage.push({...who,start,end,propId:o.id})};
    for(const a of performanceActions(o)){timing(a);if(ids.has(a.id)||a.start<previousEnd)fail('Prop actions cannot overlap.');ids.add(a.id);if(!['pickup','give','putdown'].includes(a.kind))fail('Invalid prop action.');if(a.kind!=='putdown'){const actor=byId.get(a.actorId);if(actor?.type!=='puppet'||actor.attachment||!['leftHand','rightHand'].includes(a.hand))fail('Choose an independent acting character and hand.');}if(a.kind==='pickup'&&owner)fail('This prop is already held. Use Give to or Put down.');if(a.kind!=='pickup'&&!owner)fail('Add a Pick up action or attach the prop to a hand first.');if(a.kind==='give'&&a.actorId===owner?.actorId)fail('Choose another character to receive the prop.');if(a.kind==='putdown'&&(!num(a.x,-12000,12000)||!num(a.y,-12000,12000)))fail('Choose a put-down position on the board.');if(owner)reserve(owner,heldSince,a.start+a.duration);owner=a.kind==='putdown'?null:{actorId:a.actorId,hand:a.hand};heldSince=a.start;previousEnd=a.start+a.duration;
    }reserve(owner,heldSince,7200);
   }else if(o.attachment&&['leftHand','rightHand'].includes(o.attachment.anchor))usage.push({actorId:o.attachment.parentId,hand:o.attachment.anchor,start:0,end:o.attachment.release??7200,propId:o.id});
   o.children?.forEach(c=>check(c,true));
  }s.items.forEach(o=>check(o));for(const a of usage)if(usage.some(b=>a.propId!==b.propId&&(byId.get(a.propId)?.propActions?.length||byId.get(b.propId)?.propActions?.length)&&a.actorId===b.actorId&&a.hand===b.hand&&a.start<b.end&&b.start<a.end))fail('That hand is already holding another prop during this action. Choose the other hand or put the first prop down.');
 }return p;
}
