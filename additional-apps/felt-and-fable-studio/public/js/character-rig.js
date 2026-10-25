'use strict';
// Absolute-time, two-link felt rig. Preview, saved stories and exports use this
// same evaluator; no simulated state or frame-history-dependent foot contacts.
const RIG_SIZE={w:400,h:600,sole:270,ankle:248};
const RIG_COMMANDS={walk:'Walk to',knock:'Knock',reach:'Reach and hold',listen:'Listen',look:'Look at',react:'React',hold:'Hold'};
const rigClamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const rigSmooth=x=>{x=rigClamp(x,0,1);return x*x*x*(x*(x*6-15)+10)};
const rigLerp=(a,b,u)=>({x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u});
const rigDistance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const rigEnvelope=(c,t)=>rigSmooth((t-c.start)/Math.min(.45,c.duration*.2))*rigSmooth((c.start+c.duration-t)/Math.min(.45,c.duration*.2));
const rigCommands=o=>[...(o.rig?.commands||[])].sort((a,b)=>a.start-b.start);
function rigSolve(a,target,l1,l2,bend=1,maxFlex=145,upperRange=[-150,150]){
 const dx=target.x-a.x,dy=target.y-a.y,raw=Math.hypot(dx,dy),min=Math.sqrt(l1*l1+l2*l2+2*l1*l2*Math.cos(maxFlex*Math.PI/180)),max=Math.sqrt(l1*l1+l2*l2+2*l1*l2*Math.cos(5*Math.PI/180)),d=rigClamp(raw,min,max),ux=raw>1e-8?dx/raw:0,uy=raw>1e-8?dy/raw:1;
 const along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along));
 let joint={x:a.x+ux*along-uy*height*bend,y:a.y+uy*along+ux*height*bend},end={x:a.x+ux*d,y:a.y+uy*d};
 const angle=Math.atan2(joint.x-a.x,joint.y-a.y)*180/Math.PI,limited=rigClamp(angle,...upperRange),delta=(angle-limited)*Math.PI/180;
 if(Math.abs(delta)>1e-9){const rotate=p=>{const x=p.x-a.x,y=p.y-a.y;return{x:a.x+x*Math.cos(delta)-y*Math.sin(delta),y:a.y+x*Math.sin(delta)+y*Math.cos(delta)}};joint=rotate(joint);end=rotate(end);}
 const flex=Math.acos(rigClamp(((joint.x-a.x)*(end.x-joint.x)+(joint.y-a.y)*(end.y-joint.y))/(l1*l2),-1,1))*180/Math.PI;
 return{a:{...a},joint,end,target:{...target},error:rigDistance(end,target),upper:limited,flex};
}
function rigTarget(target,s,t){
 if(!target)return null;if(!target.pieceId)return{x:target.x,y:target.y};
 const o=s.items.find(q=>q.id===target.pieceId);if(!o)return null;
 const p=poseAt(o,t,sceneSeconds(s)),q=performanceWorld(o,p,[(target.u-.5)*o.bw,(target.v-.5)*o.bh]);return{x:q[0],y:q[1]};
}
function rigPathPoint(points,u){
 const lengths=points.slice(1).map((q,i)=>rigDistance(q,points[i])),total=lengths.reduce((a,b)=>a+b,0);let left=rigClamp(u,0,1)*total,i=0;
 while(i<lengths.length-1&&left>lengths[i])left-=lengths[i++];return rigLerp(points[i],points[i+1]||points[i],lengths[i]?left/lengths[i]:0);
}
function rigTravel(o,t,s,p=basePose(o)){
 const scale=p.h/RIG_SIZE.h,home={x:o.x,y:o.y+RIG_SIZE.sole*scale};let ground={...home},walk=null,from=null,points=null;
 for(const c of rigCommands(o).filter(c=>c.kind==='walk')){if(t<c.start)break;from={...ground};const to=rigTarget(c.target,s,c.start);points=c.path&&rigDistance(c.path[0],from)<.001&&rigDistance(c.path.at(-1),to)<.001?c.path:[from,to];const u=rigSmooth((t-c.start)/c.duration);ground=rigPathPoint(points,u);walk=t<c.start+c.duration?{...c,u}:null;}
 return{ground,walk,from,points,scale};
}
function rigRootPose(o,t,s,p){if(!o.rig)return p;const q=rigTravel(o,t,s,p);return{...p,x:q.ground.x,y:q.ground.y-RIG_SIZE.sole*q.scale};}
function rigFrame(o,t,s=directorRenderScene||scene()){
 const p=rigRootPose(o,t,s,basePose(o)),travel=rigTravel(o,t,s,p),scale=travel.scale,face=o.rig.facing==='left'?-1:1;
 const local=q=>({x:(q.x-p.x)/scale*face,y:(q.y-p.y)/scale}),world=q=>({x:p.x+q.x*scale*face,y:p.y+q.y*scale});
 let feet=[{x:-19,y:RIG_SIZE.sole},{x:23,y:RIG_SIZE.sole}],planted=[true,true],phase=0,bob=0;
 if(travel.walk){
  const {walk,points}=travel,total=points.slice(1).reduce((d,q,i)=>d+rigDistance(q,points[i]),0)/scale;
  let steps=Math.max(2,Math.ceil(total/48)+1);if(steps%2)steps++;const q=walk.u*steps,k=Math.min(steps-1,Math.floor(q)),u=q-k;phase=q*Math.PI;bob=-2.2*Math.sin(Math.PI*u)**2;
  const anchor=(step,side)=>{const pt=rigPathPoint(points,step<0?0:Math.min(1,(step+1)/(steps-1)));return{x:pt.x+[-19,23][side]*scale*face,y:pt.y};};
  feet=feet.map((_,side)=>{let last=k-1;if(last%2!==side)last--;const a=anchor(last,side);if(k%2!==side)return local(a);const b=anchor(k,side),pt=rigLerp(a,b,rigSmooth(u));pt.y-=Math.sin(Math.PI*u)**2*29*scale;planted[side]=u<1e-6||u>1-1e-6;return local(pt);});
 }
 const active=rigCommands(o).filter(c=>t>=c.start&&t<=c.start+c.duration&&c.kind!=='walk'),get=kind=>active.find(c=>c.kind===kind);
 const contact=get('knock')||get('reach'),listen=get('listen'),react=get('react'),look=get('look');let lean=0,hipX=0,headAngle=0,headLift=0,expression='head',expressionMix=0;
 if(contact)lean=3.2*rigEnvelope(contact,t);if(listen){headAngle=-8*rigEnvelope(listen,t);lean+=2*rigEnvelope(listen,t);expression='headListen';expressionMix=rigEnvelope(listen,t);}
 if(react){const e=rigEnvelope(react,t);hipX=-5*e;lean-=4*e;headAngle+=8*e;headLift-=5*e;expression='headReact';expressionMix=e;}
 if(look){const q=local(rigTarget(look.target,s,t));headAngle+=rigClamp((q.y+150)/25,-7,7)*rigEnvelope(look,t);}
 const leanRadians=lean*Math.PI/180;bob=Math.max(0,...feet.map((q,i)=>{const x=hipX+[-24,23][i]*Math.cos(leanRadians)+23*Math.sin(leanRadians),y=100+[-24,23][i]*Math.sin(leanRadians)-23*Math.cos(leanRadians);return q.y-24.93-Math.sqrt(Math.max(1,(travel.walk?168.7:169.5)**2-(q.x-20.44-x)**2))-y;}));
 const angle=lean*Math.PI/180,body=q=>({x:hipX+q.x*Math.cos(angle)-(q.y-100)*Math.sin(angle),y:100+bob+q.x*Math.sin(angle)+(q.y-100)*Math.cos(angle)});
 const hips=[body({x:-24,y:77}),body({x:23,y:77})],shoulders=[body({x:75,y:-43}),body({x:-63,y:-38})];
 const legs=feet.map((f,i)=>rigSolve(hips[i],{x:f.x-20.44,y:f.y-24.93},82,88,-1,135,[-55,85]));
 const swing=travel.walk?Math.sin(phase)*18:Math.sin(t*1.8)*.7;
 const rest=[{x:shoulders[0].x+12-swing,y:shoulders[0].y+125},{x:shoulders[1].x+14+swing,y:shoulders[1].y+125}];
 const handTargets=rest.map(q=>({...q}));let contactPoint=null,contactActive=false,handAngle=0;
 if(contact){
  const goal=local(rigTarget(contact.target,s,t)),u=(t-contact.start)/contact.duration,enter=rigSmooth(u/.22),leave=1-rigSmooth((u-.80)/.20),weight=enter*leave;let gap=0;
  if(contact.kind==='knock'){let pulse=0;for(const center of [.35,.50,.65]){const d=Math.abs(u-center);pulse=Math.max(pulse,1-rigSmooth((d-.012)/.065));}gap=14*(1-pulse);contactActive=weight>.999&&gap<.05;}
  else contactActive=weight>.999;
  contactPoint={x:goal.x-gap,y:goal.y};handAngle=-Math.PI/2*weight;const desired={x:contactPoint.x-42,y:contactPoint.y};handTargets[1]=rigLerp(rest[1],desired,weight);
 }
 const arms=handTargets.map((q,i)=>rigSolve(shoulders[i],q,69,66,1,145,[-45,150]));
 const handTip={x:arms[1].end.x-Math.sin(handAngle)*42,y:arms[1].end.y+Math.cos(handAngle)*42};
 return{t,p,face,scale,world,feet,planted,legs,arms,body,lean,hipX,bob,headAngle,headLift,expression,expressionMix,handAngle,contactPoint,contactActive,handTip,walking:!!travel.walk,phase};
}
function rigDraw(g,o){
 const im=imageMap.get(o.asset);if(!im)return;const f=o.rigFrame||rigFrame(o,0),parts=o.rig.parts;
 const part=(key,at,height,angle=0,alpha=1)=>{const r=parts[key];if(!r)return;const [x,y,w,h]=r.rect,pivot=r.pivot||[.5,.5];g.save();g.globalAlpha*=alpha;g.translate(at.x,at.y);g.rotate(angle);g.scale(height/h,height/h);g.drawImage(im,x,y,w,h,-pivot[0]*w,-pivot[1]*h,w,h);g.restore();};
 const segment=(key,a,b)=>{const r=parts[key];if(!r)return;const [x,y,w,h]=r.rect,aa={x:r.a[0]*w,y:r.a[1]*h},bb={x:r.b[0]*w,y:r.b[1]*h},scale=rigDistance(a,b)/rigDistance(aa,bb);g.save();g.translate(a.x,a.y);g.rotate(Math.atan2(b.y-a.y,b.x-a.x)-Math.atan2(bb.y-aa.y,bb.x-aa.x));g.scale(scale,scale);g.drawImage(im,x,y,w,h,-aa.x,-aa.y,w,h);g.restore();};
 g.save();g.translate(RIG_SIZE.w/2,RIG_SIZE.h/2);g.scale(f.face,1);
 // Foot shadows are evaluated at the planted world contacts, never at the hip.
 for(let i=0;i<2;i++){const q=f.feet[i];g.save();g.globalAlpha*=f.planted[i]?.20:.10;g.fillStyle='#251f20';g.beginPath();g.ellipse(q.x+8,RIG_SIZE.sole+2,28,5,0,0,Math.PI*2);g.fill();g.restore();}
 part('tail',f.body({x:-53,y:75}),150,.06*Math.sin(f.t*2.1));
 const leg=i=>{segment('thigh',f.legs[i].a,f.legs[i].joint);segment('shin',f.legs[i].joint,f.legs[i].end);part('foot',f.legs[i].end,42,0);};
 const arm=i=>{segment('upperArm',f.arms[i].a,f.arms[i].joint);segment('forearm',f.arms[i].joint,f.arms[i].end);if(i===1&&f.contactPoint)segment('fist',f.arms[i].end,f.handTip);else part('hand',f.arms[i].end,55,0);};
 g.save();g.globalAlpha*=.88;leg(0);arm(0);g.restore();leg(1);part('torso',f.body({x:0,y:8}),198,f.lean*Math.PI/180);arm(1);
 const neck=f.body({x:6,y:-70}),head={x:neck.x,y:neck.y+f.headLift};
 const a=(f.lean+f.headAngle)*Math.PI/180,mix=parts[f.expression]?f.expressionMix:0;
 part('head',head,214,a,1-mix);if(mix)part(f.expression,head,214,a,mix);
 g.restore();
}
const rigRasterFrames=new Map();
function rigRaster(o){const key=JSON.stringify([o.asset,o.rig,o.bw,o.bh,o.rigFrame?.t||0,o.rigFrame?.p]),im=imageMap.get(o.asset),cached=rigRasterFrames.get(key);if(cached?.im===im)return cached.canvas;const c=makeCanvas(o.bw*1.5,o.bh*1.5),g=c.getContext('2d');g.scale(c.width/RIG_SIZE.w,c.height/RIG_SIZE.h);rigDraw(g,o);if(rigRasterFrames.size>=8)rigRasterFrames.clear();rigRasterFrames.set(key,{im,canvas:c});return c;}
function rigDecorate(o,t,tree,s){if(o.rig)tree.rigFrame=rigFrame(o,t,s);}
function rigValidate(p){
 const checkTarget=(target,s)=>{if(!target)throw Error('Choose a motion target.');if(target.pieceId){if(!s.items.some(o=>o.id===target.pieceId&&!o.rig))throw Error('Choose a scenery target.');productionNumber(target.u,0,1,'target point');productionNumber(target.v,0,1,'target point');}else{productionNumber(target.x,0,1600,'target X');productionNumber(target.y,0,900,'target Y');}};
 const check=(o,s,nested=false)=>{if(o.rig){const r=o.rig;if(nested||o.type!=='asset'||r.version!==1||r.model!=='wolf'||!['left','right'].includes(r.facing)||o.flipX||o.flipY||o.rotation!==0||o.bw!==400||o.bh!==600||Math.abs(o.w/o.h-2/3)>.0001)throw Error('Keep the wolf rig upright, proportional and outside groups. Use its Facing control to turn it.');
   if(o.feltRoute||o.contact||o.attachment||o.propActions?.length||o.choreography?.length||o.storyActions?.length||o.animationBlocks?.length||o.keyframes?.length||o.illustration||reuseHas(o,s))throw Error('Use Character motion commands for this rig’s movement.');
   if(!(p.imports?.[o.asset]||artById.has(o.asset)))throw Error('Missing character atlas.');
   const required=['head','torso','tail','thigh','shin','foot','upperArm','forearm','hand','fist'];if(!r.parts||required.some(k=>!r.parts[k])||Object.keys(r.parts).some(k=>![...required,'headListen','headReact'].includes(k)))throw Error('Incomplete rig artwork.');for(const key of Object.keys(r.parts)){const q=r.parts[key];if(!q||!Array.isArray(q.rect)||q.rect.length!==4)throw Error('Missing rig part: '+key);q.rect.forEach((n,i)=>productionNumber(n,i>1?1:0,8192,'rig crop'));for(const anchor of [q.pivot||[.5,.5],...(['thigh','shin','upperArm','forearm','fist'].includes(key)?[q.a,q.b]:[])]){if(!Array.isArray(anchor)||anchor.length!==2)throw Error('Missing joint anchor.');anchor.forEach(v=>productionNumber(v,0,1,'joint anchor'));}if(q.a&&q.b&&Math.hypot(q.a[0]-q.b[0],q.a[1]-q.b[1])<.1)throw Error('Joint anchors must be separated.');}
   if(!Array.isArray(r.commands)||r.commands.length>100)throw Error('Use up to 100 character commands.');let end=-1;const ids=new Set();
   for(const c of rigCommands(o)){if(!c.id||ids.has(c.id)||!Object.hasOwn(RIG_COMMANDS,c.kind))throw Error('Invalid character command.');ids.add(c.id);productionNumber(c.start,0,7199,'command start');productionNumber(c.duration,.25,120,'command duration');if(c.start<end-1e-8)throw Error('Character commands cannot overlap.');end=c.start+c.duration;if(end>7200)throw Error('Character command ends after the story limit.');if(['walk','knock','reach','look'].includes(c.kind))checkTarget(c.target,s);if(c.kind==='walk'){if(c.target.pieceId)throw Error('Choose a floor point for walking.');if(c.path){if(!Array.isArray(c.path)||c.path.length<2||c.path.length>100)throw Error('Invalid foot route.');c.path.forEach(q=>{productionNumber(q.x,0,1600,'route X');productionNumber(q.y,0,900,'route Y');});}}}
  }o.children?.forEach(q=>check(q,s,true));};
 for(const s of p.scenes)s.items.forEach(o=>check(o,s));for(const o of p.custom||[])if(o.rig)check(o,{items:[o]});return p;
}
function rigReview(p=state){
 const issues=[];for(const row of storyTimeline(p))for(const o of row.scene.items.filter(o=>o.rig)){
  const seen=new Set(),add=(t,key,message)=>{if(!seen.has(key)){seen.add(key);issues.push({sceneId:row.scene.id,pieceId:o.id,time:row.start+t,severity:'warning',message:o.name+' · '+message});}};
  const times=new Set([0]);for(const c of rigCommands(o)){for(let n=0;n<=Math.min(180,Math.ceil(c.duration*12));n++)times.add(c.start+c.duration*n/Math.min(180,Math.ceil(c.duration*12)));if(c.kind==='knock')for(const v of [.35,.5,.65])times.add(c.start+c.duration*v);}
  for(const t of times){const f=rigFrame(o,t,row.scene);if([...f.legs,...f.arms].some(j=>j.error>2))add(t,'reach','A target exceeds comfortable joint reach. Adjust the stop or contact point.');if(f.contactActive&&rigDistance(f.handTip,f.contactPoint)*f.scale>2)add(t,'contact','The hand does not quite reach its contact point.');if(f.walking){const next=rigFrame(o,t+.002,row.scene);for(let i=0;i<2;i++)if(f.planted[i]&&next.planted[i]&&rigDistance(f.world(f.legs[i].end),next.world(next.legs[i].end))>.05)add(t,'slide','A planted foot moved during contact.');}}
  for(const c of rigCommands(o))if(c.kind==='walk'){const before=rigTravel(o,c.start-.001,row.scene),to=rigTarget(c.target,row.scene,c.start);if(Math.sign(to.x-before.ground.x)!==(o.rig.facing==='left'?-1:1)&&Math.abs(to.x-before.ground.x)>5)add(c.start,'facing','Travel goes against the chosen facing.');if(Math.abs(to.y-before.ground.y)>90)add(c.start,'slope','Use a shallower floor route for this upright walk.');}
 }return issues;
}
function rigRemap(s,map){for(const cue of s.cues||[])if(cue.rigActor)cue.rigActor=map.get(cue.rigActor)||cue.rigActor;for(const o of s.items)for(const c of o.rig?.commands||[])if(c.target?.pieceId)c.target.pieceId=map.get(c.target.pieceId)||c.target.pieceId;}
function rigDetachReferences(ids){for(const o of items())for(const c of o.rig?.commands||[])if(ids.includes(c.target?.pieceId))c.target=rigTarget(c.target,scene(),c.start);}
function rigSyncSounds(s,o){s.cues=(s.cues||[]).filter(c=>c.rigActor!==o.id);for(const c of rigCommands(o))if(c.kind==='knock')for(const [i,u]of [.35,.5,.65].entries())s.cues.push({...cinemaNewCue(),id:'rig-'+o.id+'-'+c.id+'-'+i,name:'Knock',preset:'knock',start:c.start+c.duration*u-.05,duration:.2,volume:.55,fadeIn:0,fadeOut:.04,rigActor:o.id});}
async function rigApply(input){
 if(!Array.isArray(input?.operations)||!input.operations.length||input.operations.length>100)throw Error('Provide character edits.');
 return directorTransaction(input.expectedRevision,p=>{for(const op of input.operations){const s=p.scenes.find(q=>q.id===op.sceneId),o=s?.items.find(q=>q.id===op.pieceId);if(!o?.rig||o.locked)throw Error('Choose an unlocked rigged character.');if(op.op==='home'){productionNumber(op.x,0,1600,'start X');productionNumber(op.floor,0,900,'floor');productionNumber(op.height,150,900,'character height');o.x=op.x;o.h=op.height;o.w=op.height*2/3;o.y=op.floor-op.height/600*270;o.rig.facing=op.facing;}else if(op.op==='command'){const c=copy(op.command),i=o.rig.commands.findIndex(q=>q.id===c.id);if(i<0)o.rig.commands.push(c);else o.rig.commands[i]=c;}else if(op.op==='deleteCommand')o.rig.commands=o.rig.commands.filter(c=>c.id!==op.id);else if(op.op==='facing')o.rig.facing=op.facing;else throw Error('Unknown character edit.');
   // Replan routes from the edited resting position; do not retain stale paths.
   for(const c of rigCommands(o).filter(c=>c.kind==='walk')){delete c.path;const from=rigTravel(o,c.start-.001,s).ground;c.path=deskPlanRoute(s.feltStage,from,rigTarget(c.target,s,c.start),o.h/600*28);}
   rigSyncSounds(s,o);s.duration=Math.max(s.duration||6,...rigCommands(o).map(c=>c.start+c.duration+.1));
  }rigValidate(p);return p;});
}
window.FeltRig={version:1,apply:rigApply,review:rigReview,summary:()=>({revision:directorRevision(),commands:copy(RIG_COMMANDS),actors:state.scenes.flatMap(s=>s.items.filter(o=>o.rig).map(o=>({sceneId:s.id,pieceId:o.id,name:o.name,facing:o.rig.facing,commands:copy(o.rig.commands)}))),checks:rigReview()})};
