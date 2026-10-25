'use strict';
// Presets remain parametric data. The common pose evaluator is used by playback,
// PNG export and both MP4 encoders, independently of the editor's controls.
const BLOCK_LANES=['enter','idle','emphasis','path','exit'];
const BLOCK_LABELS={enter:'Entrance',idle:'Idle',emphasis:'Emphasis',path:'Path',exit:'Exit'};
MOTION_PRESETS.push(
 ['idle-breathe','idle','Gentle breathing','A tiny rise and expansion of the whole cutout.'],
 ['idle-sway','idle','Gentle sway','Slowly rock from side to side.'],
 ['idle-bob','idle','Tiny bob','Float up and settle softly.'],
 ['idle-wiggle','idle','Occasional wiggle','A short wiggle followed by a quiet pause.'],
 ['idle-sleep','idle','Sleepy rocking','A slow tilt with a subtle breathing motion.'],
 ['idle-hover','idle','Hover','Drift in a small, smooth loop.'],
 ['idle-listen','idle','Listening tilt','Tilt gently, pause, then straighten.'],
 ['idle-tiptoe','idle','Restless feet','Small alternating whole-body bobs.'],
 ['enter-hop','enter','Hop onto board','Arrive in three playful hops.'],
 ['enter-peek','enter','Peek, then enter','Peek from an edge, pause, then slide into place.'],
 ['enter-paper','enter','Paper flutter','Flutter down like a light felt cutout.'],
 ['enter-spring','enter','Spring up','Pop upward from below and settle.'],
 ['enter-swoop','enter','Swoop in','Follow a sweeping curve into place.'],
 ['enter-skid','enter','Slide & settle','Slide in with a little tilt and overshoot.'],
 ['exit-hop','exit','Hop away','Leave in three cheerful hops.'],
 ['exit-tumble','exit','Tumble out','Roll and fall off the board.'],
 ['exit-flutter','exit','Flutter down','Float downward with side-to-side turns.'],
 ['exit-swish','exit','Swish away','Sweep along a curved exit.'],
 ['exit-sink','exit','Sink down','Squash slightly, then sink below the board.'],
 ['exit-zip','exit','Zip away','Lean back, then zip off to the side.'],
 ['emphasis-surprise','emphasis','Surprised pop','A quick stretch, hop and settle.'],
 ['emphasis-shiver','emphasis','Shiver','Tiny rapid shakes with a gentle finish.'],
 ['emphasis-celebrate','emphasis','Celebration','Two happy hops with a wiggle.'],
 ['emphasis-bow','emphasis','Little bow','Tilt forward and return to standing.'],
 ['path-hops','path','Hopping trail','Travel forward with three rounded hops.'],
 ['path-leaf','path','Falling leaf','Drift down in a slow, winding trail.'],
 ['path-heart','path','Heart loop','Trace a heart and return to the start.'],
 ['path-loop','path','Loop the loop','Travel forward through a complete loop.'],
 ['path-drift','path','Floating drift','Travel along a gentle wandering curve.'],
 ['path-custom','path','Custom curve','Drag the start, bend and end on the board.']
);
let selectedBlockId=null,blockClipboard=null,blockReplaceId=null,blockGesture=null,pathGesture=null;
let blockPathEditing=false,blockRestEditing=false,blockSoloRAF=0,blockSoloRunning=false,blockSoloTime=0;
function isBlockRestMode(){return blockRestEditing&&animOpen&&!presenting&&!animRun&&!storyPlayback}
function blockDefinition(b){return MOTION_PRESETS.find(d=>d[0]===b.preset)}
function blockName(b){return b.points?'Drawn path':blockDefinition(b)[2]}
function blockCategory(b){return blockDefinition(b)?.[1]}
function selectedBlockPiece(){return selected.length===1?items().find(o=>o.id===selected[0]):null}
function currentBlock(){return selectedBlockPiece()?.animationBlocks?.find(b=>b.id===selectedBlockId)}
function blockEditable(o=selectedBlockPiece()){return !!o&&!o.rig&&!o.attachment&&!o.propActions?.length&&!o.locked&&!animRun&&!storyPlayback&&!blockSoloRunning}
function blockEnd(o,b,duration=sceneSeconds(scene())){
 if(b.loop==='until-exit'){const exit=(o.animationBlocks||[]).filter(c=>blockCategory(c)==='exit'&&c.start>=b.start).sort((a,b)=>a.start-b.start)[0];return Math.max(b.start,exit?exit.start:duration)}
 return b.start+b.duration;
}
function blockOptions(b,u){return {...b,repeats:b.loop==='repeat'?b.repeats:1}}
function blockCurvePoint(b,u){if(b.points)return drawnPathPoint(b.points,u);const [cx,cy,ex,ey]=b.path||[b.distance*.5,-b.distance*.5,b.distance,0],v=1-u;return [2*v*u*cx+u*u*ex,2*v*u*cy+u*u*ey]}
function presetPose(kind,p,u,options={}){
 u=motionClamp(u,0,1);
 if(kind.startsWith('path-')&&(options.repeats||1)>1){const cycles=u*options.repeats,whole=Math.floor(cycles),part=cycles-whole,once={...options,repeats:1},zero={...p,x:0,y:0},end=presetPose(kind,zero,1,once),point=presetPose(kind,zero,part,once);return {...p,x:p.x+whole*end.x+point.x,y:p.y+whole*end.y+point.y}}
 const q={...p},a=options.strength??1,d=options.distance??250,r=(options.direction||0)*Math.PI/180;
 const z=u*(options.repeats??1),s=u*u*(3-2*u),sin=Math.sin(2*Math.PI*z),bell=Math.sin(Math.PI*u),cycle=z%1;
 const move=(x,y)=>{q.x+=x*Math.cos(r)-y*Math.sin(r);q.y+=x*Math.sin(r)+y*Math.cos(r)};
 const scale=(w,h=w)=>{q.w=Math.max(.1,p.w*w);q.h=Math.max(.1,p.h*h)};
 const side=Math.cos(r)>=0?1:-1,edge=side>0?-Math.hypot(p.w,p.h)/2-30:W+Math.hypot(p.w,p.h)/2+30;
 if(kind==='idle-breathe'){scale(1+.025*a*(1-Math.cos(2*Math.PI*z)),1+.035*a*(1-Math.cos(2*Math.PI*z)));q.y-=4*a*(1-Math.cos(2*Math.PI*z))}
 else if(kind==='idle-sway')q.rotation+=5*a*sin;
 else if(kind==='idle-bob')q.y-=12*a*(1-Math.cos(2*Math.PI*z));
 else if(kind==='idle-wiggle')q.rotation+=cycle<.32?7*a*Math.sin(cycle/.32*Math.PI*4)*Math.sin(cycle/.32*Math.PI):0;
 else if(kind==='idle-sleep'){q.rotation+=7*a*sin;q.y+=4*a*(1-Math.cos(2*Math.PI*z))}
 else if(kind==='idle-hover')move(10*a*sin,-8*a*(1-Math.cos(2*Math.PI*z)));
 else if(kind==='idle-listen')q.rotation+=9*a*Math.pow(Math.sin(Math.PI*cycle),2);
 else if(kind==='idle-tiptoe'){q.y-=7*a*Math.sin(2*Math.PI*z)**2;q.rotation+=3*a*sin}
 else if(kind==='enter-hop'){q.x=edge+(p.x-edge)*s;q.y-=65*a*Math.abs(Math.sin(Math.PI*u*3));q.opacity*=Math.min(1,u*10)}
 else if(kind==='enter-peek'){const peek=side>0?p.w*.16:W-p.w*.16;const f=u<.3?u/.3:u<.55?1:1+(u-.55)/.45;q.x=f<=1?edge+(peek-edge)*f:peek+(p.x-peek)*(f-1);q.rotation-=side*8*a*bell;q.opacity*=Math.min(1,u*10)}
 else if(kind==='enter-paper'){q.y=-p.h+(p.y+p.h)*s;q.x+=100*a*Math.sin(4*Math.PI*u)*(1-u);q.rotation+=25*a*Math.sin(4*Math.PI*u)*(1-u);q.opacity*=Math.min(1,u*8)}
 else if(kind==='enter-spring'){const f=1-Math.exp(-7*u)*Math.cos(3*Math.PI*u);q.y=p.y+(H+p.h-p.y)*(1-f)*(1-u);scale(1+.12*a*bell,1-.1*a*bell);q.opacity*=Math.min(1,u*8)}
 else if(kind==='enter-swoop'){q.x=edge+(p.x-edge)*s;q.y-=180*a*bell;q.rotation-=20*side*a*bell;q.opacity*=Math.min(1,u*8)}
 else if(kind==='enter-skid'){const f=1+2.3*(u-1)**3+1.3*(u-1)**2;q.x=edge+(p.x-edge)*f;q.rotation+=side*15*a*bell*(1-u);q.opacity*=Math.min(1,u*8)}
 else if(kind.startsWith('exit-')&&['exit-hop','exit-tumble','exit-flutter','exit-swish','exit-sink','exit-zip'].includes(kind)){
  const off=side>0?W+p.w:-p.w;
  if(kind==='exit-hop'){q.x=p.x+(off-p.x)*s;q.y-=65*a*Math.abs(Math.sin(Math.PI*u*3))}
  if(kind==='exit-tumble'){q.x=p.x+(off-p.x)*u*u;q.y+=450*u*u;q.rotation+=side*360*a*u}
  if(kind==='exit-flutter'){q.y=p.y+(H+p.h-p.y)*s;q.x+=90*a*Math.sin(4*Math.PI*u);q.rotation+=30*a*Math.sin(4*Math.PI*u)}
  if(kind==='exit-swish'){q.x=p.x+(off-p.x)*s;q.y-=170*a*bell;q.rotation+=25*side*a*bell}
  if(kind==='exit-sink'){q.y=p.y+(H+p.h-p.y)*s;scale(1+.12*a*bell,1-.2*a*bell)}
  if(kind==='exit-zip'){const f=u<.25?-.08*Math.sin(u/.25*Math.PI/2):-.08+1.08*((u-.25)/.75)**2;q.x=p.x+(off-p.x)*f;q.rotation-=side*15*a*bell}
  q.opacity*=Math.min(1,(1-u)*8);
 }
 else if(kind==='emphasis-surprise'){q.y-=45*a*Math.sin(Math.PI*cycle);scale(1-.1*a*Math.sin(Math.PI*cycle),1+.13*a*Math.sin(Math.PI*cycle))}
 else if(kind==='emphasis-shiver'){q.x+=7*a*Math.sin(24*Math.PI*z)*Math.sin(Math.PI*cycle);q.rotation+=3*a*Math.sin(20*Math.PI*z)*Math.sin(Math.PI*cycle)}
 else if(kind==='emphasis-celebrate'){q.y-=55*a*Math.abs(Math.sin(2*Math.PI*z));q.rotation+=12*a*Math.sin(4*Math.PI*z)*Math.sin(Math.PI*cycle)}
 else if(kind==='emphasis-bow'){q.rotation+=18*a*Math.sin(Math.PI*cycle)**2;scale(1,1-.08*a*Math.sin(Math.PI*cycle)**2)}
 else if(kind==='path-hops')move(d*u,-d*.22*Math.abs(Math.sin(3*Math.PI*z)));
 else if(kind==='path-leaf')move(d*.3*Math.sin(4*Math.PI*z),d*u);
 else if(kind==='path-heart'){const t=2*Math.PI*z;move(d*.5*Math.sin(t)**3,-d/32*(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t)-5))}
 else if(kind==='path-loop')move(d*u+d*.32*Math.sin(2*Math.PI*z),-d*.32*(1-Math.cos(2*Math.PI*z)));
 else if(kind==='path-drift')move(d*u,d*.13*Math.sin(2*Math.PI*z)+d*.06*Math.sin(4*Math.PI*z));
 else if(kind==='path-custom'){const pt=blockCurvePoint(options,u);q.x+=pt[0];q.y+=pt[1]}
 else return motionPresetPose(kind,p,u,options);
 return q;
}
function blockPoseAt(o,time,duration){
 let p=keyframePoseAt(o,time);const blocks=o.animationBlocks||[];if(!blocks.length)return p;duration=duration??sceneSeconds(scene());const ordered=[...blocks].sort((a,b)=>a.start-b.start);
 // Path endpoints persist so the next motion starts from the same place.
 for(const b of ordered.filter(b=>blockCategory(b)==='path')){if(time<b.start)continue;let u=motionClamp((time-b.start)/b.duration,0,1);u=easeAnimation(u,b.ease);p=presetPose(b.preset,p,u,blockOptions(b,u))}
 const entrance=ordered.find(b=>blockCategory(b)==='enter');
 if(entrance){if(time<entrance.start)p.opacity=0;else if(time<entrance.start+entrance.duration)p=presetPose(entrance.preset,p,easeAnimation((time-entrance.start)/entrance.duration,entrance.ease),entrance)}
 for(const b of ordered.filter(b=>['idle','emphasis'].includes(blockCategory(b)))){
  const end=blockEnd(o,b,duration);if(time<b.start||time>=end)continue;
  const until=b.loop==='until-exit',u=until?((time-b.start)/b.duration)%1:(time-b.start)/b.duration;
  const q=presetPose(b.preset,p,easeAnimation(u,b.ease),blockOptions(b,u));
  // Blend at idle boundaries so a loop stopping at the exit never snaps.
  const f=blockCategory(b)==='idle'?Math.min(1,(time-b.start)/.18,(end-time)/.18):1;
  for(const k of ANIM_PROPS)p[k]+=(q[k]-p[k])*Math.max(0,f);
 }
 const exit=ordered.find(b=>blockCategory(b)==='exit');if(exit&&time>=exit.start){if(time>=exit.start+exit.duration)p.opacity=0;else p=presetPose(exit.preset,p,easeAnimation((time-exit.start)/exit.duration,exit.ease),exit)}
 p.w=Math.max(.1,p.w);p.h=Math.max(.1,p.h);p.opacity=motionClamp(p.opacity,0,1);return p;
}
function poseAt(o,time,duration){return studioPoseAt(o,time,duration)}
function editBlockHome(o,k,v){const shown=isBlockRestMode()?basePose(o):poseAt(o,animTime),delta=v-shown[k];if(k==='w'||k==='h'){const factor=v/Math.max(.1,shown[k]);o[k]=Math.max(.1,o[k]*factor);for(const f of o.keyframes||[])f.pose[k]*=factor}else{o[k]=(o[k]??(k==='opacity'?1:0))+delta;for(const f of o.keyframes||[])f.pose[k]+=delta;if(k==='opacity'){o[k]=motionClamp(o[k],0,1);for(const f of o.keyframes||[])f.pose.opacity=motionClamp(f.pose.opacity,0,1)}}dirty=true;return true}
function validateBlocks(o){
 if(o.animationBlocks===undefined)return;if(!Array.isArray(o.animationBlocks)||o.animationBlocks.length>100)throw Error('Invalid animation blocks.');
 const ids=new Set();for(const b of o.animationBlocks){if(!b||typeof b.id!=='string'||ids.has(b.id)||!blockDefinition(b))throw Error('Invalid animation block.');ids.add(b.id);
 for(const [k,min,max] of [['start',0,7199],['duration',.2,7199],['strength',.25,2],['distance',0,2000],['direction',-360,360],['repeats',1,20]])if(!Number.isFinite(b[k])||b[k]<min||b[k]>max)throw Error('Invalid animation block '+k+'.');
 if(b.start+b.duration>7199||!Number.isInteger(b.repeats)||!['linear','smooth'].includes(b.ease)||!['none','repeat','until-exit'].includes(b.loop))throw Error('Invalid block timing.');
 if(b.loop==='until-exit'&&blockCategory(b)!=='idle')throw Error('Only idle blocks can loop until exit.');
 if(b.points&&(!Array.isArray(b.points)||b.points.length<2||b.points.length>256||b.points.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v)||Math.abs(v)>12000))||b.points[0][0]!==0||b.points[0][1]!==0))throw Error('Invalid drawn motion path.');
 if(b.path&&(!Array.isArray(b.path)||b.path.length!==4||b.path.some(v=>!Number.isFinite(v)||Math.abs(v)>12000)))throw Error('Invalid motion path.');
 }
 for(const lane of BLOCK_LANES){const list=o.animationBlocks.filter(b=>blockCategory(b)===lane).sort((a,b)=>a.start-b.start);if(['enter','idle','exit'].includes(lane)&&list.length>1)throw Error('Use one '+BLOCK_LABELS[lane].toLowerCase()+' block per piece.');for(let i=1;i<list.length;i++)if(list[i].start<list[i-1].start+list[i-1].duration-1e-7)throw Error('Blocks in the same lane cannot overlap. Move the block or shorten it.');}
}
function commitBlocks(o,blocks,message){try{validateBlocks({...o,animationBlocks:blocks});checkpoint();o.animationBlocks=blocks;scene().duration=Math.max(scene().duration||6,...blocks.map(b=>b.start+b.duration));refresh();if(message)toast(message);return true}catch(e){toast(e.message);renderBlockUI();return false}}
function addAnimationBlockPreset(){
 const o=selectedBlockPiece();if(!blockEditable(o))return;
 const kind=$('animPreset').value,category=MOTION_PRESETS.find(d=>d[0]===kind)?.[1],settings=motionPresetSettings(),old=o.animationBlocks?.find(b=>b.id===blockReplaceId);
 const start=old?old.start:frameTime(animTime),duration=Math.min(settings.seconds,7199-start);if(duration<.2)return toast('Move the playhead earlier to leave room for this animation.');
 const b={id:old?.id||id(),preset:kind,start,duration:old?old.duration:duration,strength:settings.strength,distance:settings.distance,direction:settings.direction,repeats:settings.repeats,ease:old?.ease||'linear',loop:category==='idle'?'until-exit':settings.repeats>1&&['emphasis','path'].includes(category)?'repeat':'none'};
 if(old){b.loop=old.loop==='until-exit'&&category!=='idle'?'none':old.loop;b.repeats=old.repeats}if(kind==='path-custom')b.path=[b.distance/2,-b.distance*.5,b.distance,0];
 const blocks=(o.animationBlocks||[]).filter(c=>c.id!==b.id&&(!['enter','idle','exit'].includes(category)||blockCategory(c)!==category));blocks.push(b);
 selectedBlockId=b.id;if(!commitBlocks(o,blocks,'Animation block added. Click it to edit; drag its ends to change the length.'))return;
 animTime=frameTime(Math.min(sceneSeconds(scene()),b.start+b.duration));blockReplaceId=null;stopMotionPresetPreview();$('motionPresetDialog').close();refresh();if(kind==='path-custom')beginBlockPathEditing('curve');else setAnimationTab('settings');
}
function mutateCurrentBlock(fn){const o=selectedBlockPiece(),b=currentBlock();if(!b||!blockEditable(o))return;const blocks=copy(o.animationBlocks),next=blocks.find(c=>c.id===b.id);fn(next);commitBlocks(o,blocks)}
function clearPieceAnimation(o){delete o.feltRoute;delete o.choreography;delete o.keyframes;delete o.animationBlocks;o.children?.forEach(clearPieceAnimation)}
function clearAllPieceAnimation(){const list=selected.map(id=>items().find(o=>o.id===id)).filter(o=>o&&!o.locked);if(!list.length)return;checkpoint();for(const o of list){if(!o.animationBlocks?.length){const frozen=animationTree(copy(o),animTime);clearPieceAnimation(frozen);Object.assign(o,frozen)}clearPieceAnimation(o)}reuseDetach(scene(),list.map(o=>o.id));selectedBlockId=null;refresh();toast('All animation removed from the selected pieces. Undo restores it.')}
function copyBlockAnimation(){const o=selectedBlockPiece();if(!o)return;blockClipboard={blocks:copy(o.animationBlocks||[]),keys:copy(o.keyframes||[]),home:basePose(o)};renderBlockUI();toast('Animation copied. Select another piece and choose Paste animation.')}
function pasteBlockAnimation(){const o=selectedBlockPiece();if(!blockClipboard||!blockEditable(o))return;const c=blockClipboard,blocks=copy(c.blocks).map(b=>({...b,id:id()})),home=basePose(o),keys=c.keys.map(k=>({...k,pose:{x:home.x+k.pose.x-c.home.x,y:home.y+k.pose.y-c.home.y,w:home.w*k.pose.w/c.home.w,h:home.h*k.pose.h/c.home.h,rotation:home.rotation+k.pose.rotation-c.home.rotation,opacity:home.opacity*k.pose.opacity/Math.max(.001,c.home.opacity)}}));try{validateAnimation({...o,animationBlocks:blocks,keyframes:keys});checkpoint();o.animationBlocks=blocks;o.keyframes=keys;scene().duration=Math.max(scene().duration||6,animationLastTime(scene()));refresh();toast('Animation pasted, using this piece’s resting position.')}catch(e){toast(e.message)}}
function bakeAnimationBlocks(){const o=selectedBlockPiece();if(!blockEditable(o)||!o.animationBlocks?.length)return;const end=Math.min(7199,Math.max(sceneSeconds(scene()),...o.animationBlocks.map(b=>blockEnd(o,b)))),times=new Set([0,frameTime(end)]);for(const b of o.animationBlocks)for(const t of [b.start,blockEnd(o,b)])times.add(frameTime(t));for(const k of o.keyframes||[])times.add(k.t);const budget=1500-times.size;if(budget<2)return toast('Too many existing keys to convert safely.');const steps=Math.min(Math.floor(end*60),budget-1);for(let i=0;i<=steps;i++)times.add(frameTime(end*i/steps));const keys=[...times].sort((a,b)=>a-b).map(t=>({t,pose:poseAt(o,t),ease:'linear'}));try{validateAnimation({...o,keyframes:keys,animationBlocks:[]});checkpoint();o.keyframes=keys;delete o.animationBlocks;selectedBlockId=null;$('advancedAnimation').open=true;refresh();toast('Converted to '+keys.length+' editable keys. Undo returns to blocks.')}catch(e){toast(e.message)}}
function renderBlockUI(){
 if(!$('blockLanes'))return;const o=selectedBlockPiece();if(o?.animationBlocks?.length&&!currentBlock())selectedBlockId=o.animationBlocks[0].id;const b=currentBlock(),editable=blockEditable(o);if(blockPathEditing&&(!b||(b.preset!=='path-custom'&&!pathDrawMode)||b.id!==pathEditingBlockId||!editable))endBlockPathEditing(false);syncPathWorkspace();
 $('blockSelectionHelp').textContent=o?((o.animationBlocks?.length||0)+' blocks · '+(o.keyframes?.length||0)+' manual keys'):'Select one piece to add or edit animation.';
 $('blockSettings').hidden=!b;$('blockEmpty').hidden=!!o?.animationBlocks?.length;if(studioUIReady)updateStudioHints();
 for(const name of ['blockDelete','blockReplace','blockPreview','blockEditPath'])$(name).disabled=!editable||!b;
 $('blockCopy').disabled=!o||!(o.animationBlocks?.length||o.keyframes?.length);$('blockPaste').disabled=!editable||!blockClipboard;$('blockClearAll').disabled=!items().some(o=>selected.includes(o.id)&&!o.locked&&hasAnimation(o));$('blockBake').disabled=!editable||!o?.animationBlocks?.length;
 for(const lane of BLOCK_LANES)$('blockClear-'+lane).disabled=!editable||!o?.animationBlocks?.some(c=>blockCategory(c)===lane);
 $('drawObjectPath').disabled=!editable;$('timelineEmptyHint').hidden=!!o?.animationBlocks?.length||!!o?.keyframes?.length;$('blockRest').checked=blockRestEditing;$('blockRest').disabled=!o?.animationBlocks?.length;
 if(!blockGesture){const host=$('blockLanes');host.replaceChildren();const total=sceneSeconds(scene());const lanes=BLOCK_LANES.filter(lane=>o?.animationBlocks?.some(b=>blockCategory(b)===lane));host.style.setProperty('--lane-count',Math.max(1,lanes.length));$('timelineSurface').style.setProperty('--lane-count',Math.max(1,lanes.length));for(const lane of lanes){const row=document.createElement('div');row.className='block-lane';row.dataset.lane=lane;const label=document.createElement('span');label.className='block-lane-label';label.textContent=BLOCK_LABELS[lane];row.append(label);for(const c of (o?.animationBlocks||[]).filter(c=>blockCategory(c)===lane)){const el=document.createElement('button');el.className='motion-block'+(c.id===selectedBlockId?' selected':'');el.dataset.block=c.id;el.style.left=(c.start/total*100)+'%';el.style.width=(Math.max(.05,blockEnd(o,c)-c.start)/total*100)+'%';el.title=blockName(c)+' · '+c.start.toFixed(2)+'–'+blockEnd(o,c).toFixed(2)+' s';el.setAttribute('aria-label',el.title+'; arrow keys move, Shift plus arrows resize');for(const edge of ['start','end']){const handle=document.createElement('span');handle.className='block-handle '+edge;handle.dataset.edge=edge;el.append(handle)}const text=document.createElement('span');text.className='block-label';text.textContent=blockName(c)+(c.loop==='until-exit'?' ↻':'');el.append(text);el.onclick=e=>{e.stopPropagation();if(blockGesture)return;selectedBlockId=c.id;renderBlockUI();setAnimationTab('settings');draw()};el.onkeydown=e=>blockKeyDown(e,o,c);row.append(el)}host.append(row)}}
 $('timelineSurface').classList.toggle('has-manual-keys',!!o?.keyframes?.length);$('animKeys').hidden=!o?.keyframes?.length;
 if(b){$('blockTitle').textContent=blockName(b);for(const [el,key,mult] of [['blockStart','start',1],['blockDuration','duration',1],['blockStrength','strength',100],['blockDistance','distance',1],['blockCycles','repeats',1],['blockDirection','direction',1]]){$(el).value=Number((b[key]*mult).toFixed(3));$(el).disabled=!editable}$('blockEase').value=b.ease;$('blockLoop').value=b.loop;$('blockEase').disabled=!editable;$('blockLoop').disabled=!editable;
 $('blockUntilExit').disabled=blockCategory(b)!=='idle';$('blockCyclesRow').hidden=b.loop!=='repeat';$('blockPathOptions').hidden=blockCategory(b)!=='path'||b.preset==='path-custom';$('blockEditPath').hidden=blockCategory(b)!=='path';$('blockEditPath').textContent=blockPathEditing?'Done editing path':'Edit path on board';$('blockDurationLabel').textContent=b.loop==='until-exit'?'Each cycle (s)':'Lasts for (s)';$('blockLoopRow').hidden=!['idle','emphasis','path'].includes(blockCategory(b));}
 if(o?.animationBlocks?.length){$('addKey').disabled=true;for(const id of ['animX','animY','animW','animH','animRotate','animOpacity'])$(id).disabled=true;$('animHint').textContent='Drag blocks to move them. Drag either end to resize. Moving the cutout moves its resting position; no new keys are created.'}else if(o?.keyframes?.length)$('animHint').textContent='This piece uses manual keys. Advanced opens them; Clear all animation removes them in one action.';
}
function focusBlock(id){Array.from($('blockLanes').querySelectorAll('.motion-block')).find(el=>el.dataset.block===id)?.focus()}
function blockKeyDown(e,o,b){if(!blockEditable(o))return;if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();e.stopPropagation();selectedBlockId=b.id;deleteSelectedBlock();return}if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();e.stopPropagation();selectedBlockId=b.id;const delta=(e.key==='ArrowLeft'?-1:1)*(e.altKey?1/60:.1);mutateCurrentBlock(c=>{if(e.shiftKey){c.duration=frameTime(Math.max(.2,c.duration+delta));if(c.loop==='until-exit')c.loop='none'}else c.start=frameTime(Math.max(0,c.start+delta))});focusBlock(b.id)}
function deleteSelectedBlock(){const o=selectedBlockPiece(),b=currentBlock();if(!b||!blockEditable(o))return;selectedBlockId=null;commitBlocks(o,o.animationBlocks.filter(c=>c.id!==b.id),'Animation block removed. Undo restores it.')}
function blockPointerDown(e){const button=e.target.closest?.('.motion-block'),o=selectedBlockPiece(),b=o?.animationBlocks?.find(b=>b.id===button?.dataset.block);if(!b||!blockEditable(o)||e.button!==0)return false;e.preventDefault();e.stopPropagation();stopAnimationPreview();selectedBlockId=b.id;const edge=e.target.dataset.edge||'move';blockGesture={pointerId:e.pointerId,o,b,edge,button,startX:e.clientX,total:sceneSeconds(scene()),width:$('timelineSurface').getBoundingClientRect().width,original:copy(o.animationBlocks),before:copy(b),changed:false};$('timelineSurface').setPointerCapture(e.pointerId);renderBlockUI();return true}
function blockPointerMove(e){const g=blockGesture;if(!g||g.pointerId!==e.pointerId)return;e.preventDefault();const delta=(e.clientX-g.startX)/g.width*g.total,b={...g.before};if(g.edge==='move')b.start=frameTime(motionClamp(g.before.start+delta,0,Math.max(0,g.total-(g.before.loop==='until-exit'?g.before.duration:g.before.duration))));else{const end=g.before.loop==='until-exit'?blockEnd(g.o,g.before,g.total):g.before.start+g.before.duration;if(g.edge==='start'){b.start=frameTime(motionClamp(g.before.start+delta,0,end-.2));b.duration=frameTime(end-b.start)}else b.duration=frameTime(motionClamp(end+delta-b.start,.2,g.total-b.start));if(b.loop==='until-exit')b.loop='none'}if(state.director?.snap){if(g.edge==='move')b.start=directorSnap(b.start);else if(g.edge==='start'){const end=b.start+b.duration;b.start=directorSnap(b.start);b.duration=frameTime(end-b.start)}else b.duration=frameTime(directorSnap(b.start+b.duration)-b.start)}const blocks=g.original.map(c=>c.id===b.id?b:c);try{validateBlocks({...g.o,animationBlocks:blocks})}catch{return}g.o.animationBlocks=blocks;g.changed=true;g.button.style.left=b.start/g.total*100+'%';g.button.style.width=Math.max(.05,blockEnd(g.o,b,g.total)-b.start)/g.total*100+'%';$('blockStart').value=b.start;$('blockDuration').value=b.duration;draw()}
function blockPointerEnd(e){const g=blockGesture;if(!g||g.pointerId!==e.pointerId)return;const after=copy(g.o.animationBlocks);g.o.animationBlocks=g.original;blockGesture=null;if($('timelineSurface').hasPointerCapture?.(e.pointerId))$('timelineSurface').releasePointerCapture(e.pointerId);if(g.changed&&e.type!=='pointercancel')commitBlocks(g.o,after);else{renderBlockUI();draw()}}
function stopBlockPreview(){cancelAnimationFrame(blockSoloRAF);blockSoloRAF=0;blockSoloRunning=false}
function previewAnimationBlock(){const o=selectedBlockPiece(),b=currentBlock();if(!o||!b)return;stopAnimationPreview();stopStoryPlayback();stopBlockPreview();const source=copy(o);delete source.keyframes;delete source.animationBlocks;const scale=Math.min(1,240/source.w,260/source.h);source.x=W/2;source.y=H/2;source.w*=scale;source.h*=scale;source.opacity=1;const length=b.duration,started=performance.now();$('blockPreviewTitle').textContent=blockName(b);$('blockPreviewDialog').showModal();blockSoloRunning=true;function tick(now){if(!blockSoloRunning||!$('blockPreviewDialog').open)return;const t=Math.min(length,((now-started)/1000)%(length+.7)),g=$('blockPreviewCanvas').getContext('2d');g.clearRect(0,0,640,360);g.fillStyle='#eef2e7';g.fillRect(0,0,640,360);g.save();g.scale(.4,.4);drawItem(g,{...source,...presetPose(b.preset,basePose(source),easeAnimation(t/length,b.ease),blockOptions(b))});g.restore();$('blockPreviewClock').textContent=t.toFixed(2)+' / '+length.toFixed(2)+' s';blockSoloRAF=requestAnimationFrame(tick)}tick(started)}
function pathAnchor(o,b){let p=keyframePoseAt(o,b.start);for(const c of (o.animationBlocks||[]).filter(c=>blockCategory(c)==='path'&&c.id!==b.id&&c.start+c.duration<=b.start).sort((a,b)=>a.start-b.start))p=presetPose(c.preset,p,1,blockOptions(c));return p}
function initAnimationBlocks(){
 for(const def of MOTION_PRESETS){if([...$('animPreset').options].some(o=>o.value===def[0]))continue;const option=document.createElement('option');option.value=def[0];option.textContent=def[2];$('animPreset').append(option)}
 $('motionCategory').replaceChildren();for(const lane of BLOCK_LANES){const option=document.createElement('option');option.value=lane;option.textContent=BLOCK_LABELS[lane]+' · '+MOTION_PRESETS.filter(d=>d[1]===lane).length;$('motionCategory').append(option)}$('motionCategory').value='enter';$('motionCategory').onchange=()=>{if(!blockReplaceId){$('animPresetSeconds').value=['idle','path'].includes($('motionCategory').value)?3:1;$('motionRepeats').value=1}renderMotionPresetList();restartMotionPresetPreview()};
 $('openMotionPresets').onclick=()=>{blockReplaceId=null;openMotionPresets()};
 $('blockReplace').onclick=()=>{const b=currentBlock();if(!b)return;blockReplaceId=b.id;$('animPreset').value=b.preset;$('animPresetSeconds').value=b.duration;$('motionStrength').value=b.strength*100;$('motionDistance').value=b.distance;$('motionDirection').value=b.direction;$('motionRepeats').value=b.repeats;openMotionPresets()};
 $('blockDelete').onclick=deleteSelectedBlock;$('blockClearAll').onclick=clearAllPieceAnimation;$('blockCopy').onclick=copyBlockAnimation;$('blockPaste').onclick=pasteBlockAnimation;$('blockBake').onclick=bakeAnimationBlocks;$('blockPreview').onclick=previewAnimationBlock;$('blockPreviewClose').onclick=()=>{$('blockPreviewDialog').close();stopBlockPreview()};$('blockPreviewDialog').addEventListener('close',()=>{stopBlockPreview();renderBlockUI()});$('blockEditPath').onclick=toggleBlockPath;
 $('blockRest').onchange=e=>{blockRestEditing=e.target.checked;draw();refreshSelection()};
 for(const [name,key,mul] of [['blockStart','start',1],['blockDuration','duration',1],['blockStrength','strength',.01],['blockDistance','distance',1],['blockDirection','direction',1],['blockCycles','repeats',1]])$(name).onchange=e=>mutateCurrentBlock(b=>{b[key]=Number(e.target.value)*mul;if(['start','duration'].includes(key))b[key]=frameTime(b[key])});
 $('blockEase').onchange=e=>mutateCurrentBlock(b=>b.ease=e.target.value);$('blockLoop').onchange=e=>mutateCurrentBlock(b=>b.loop=e.target.value);
 for(const lane of BLOCK_LANES)$('blockClear-'+lane).onclick=()=>{const o=selectedBlockPiece();if(blockEditable(o))commitBlocks(o,(o.animationBlocks||[]).filter(b=>blockCategory(b)!==lane),BLOCK_LABELS[lane]+' cleared.')};
 const surface=$('timelineSurface');surface.onpointerdown=e=>{if(!blockPointerDown(e))timelinePointerDown(e)};surface.onpointermove=e=>blockGesture?blockPointerMove(e):timelinePointerMove(e);surface.onpointerup=e=>blockGesture?blockPointerEnd(e):timelinePointerEnd(e);surface.onpointercancel=surface.onpointerup;surface.onlostpointercapture=surface.onpointerup;
 initAnimationWorkspace();
}
