'use strict';
// Cinematic clips are evaluated from absolute scene time. No generated keys or timers.
const MOVIE_FX_PRESETS={
 camera:[['push','Slow push in'],['pull','Pullback reveal'],['pan','Glide across'],['rise','Rise to reveal'],['follow','Follow a character'],['drift','Gentle handheld'],['impact','Impact shake']],
 focus:[['rack','Focus pull']],
 light:[['spot','Soft spotlight'],['beam','Flashlight beam'],['window','Window light'],['lamp','Warm lamp'],['flicker','Flickering lamp'],['night','Moonlight wash'],['sunset','Golden hour'],['dim','Dim the room']],
 look:[['warm','Warm Storybook'],['moon','Moonlit Adventure'],['noir','Old Movie'],['memory','Faded Memory'],['dream','Dream'],['suspense','Suspense']],
 particle:[['sparkle','Magic sparkles'],['dust','Drifting dust'],['embers','Floating embers'],['steam','Steam / smoke'],['footsteps','Footstep dust'],['puff','Impact puff']],
 shadow:[['ground','Soft ground shadow'],['stretch','Lengthening shadow'],['float','Floating shadow']]
};
const MOVIE_FX_LABELS={camera:'Camera',focus:'Focus',light:'Lighting',look:'Look',particle:'Effects',shadow:'Shadow'};
const movieClips=s=>s.cinema?.clips||[];
const movieUnit=n=>Math.max(0,Math.min(1,n));
const movieMix=(a,b,u)=>a+(b-a)*u;
function movieProgress(c,t){return directorEase(movieUnit((t-c.start)/c.duration),c.ease||'cinematic')}
function movieEnvelope(c,t){const d=t-c.start;if(d<0||d>=c.duration)return 0;return Math.min(1,c.fadeIn?d/Math.min(c.fadeIn,c.duration/2):1,c.fadeOut?(c.duration-d)/Math.min(c.fadeOut,c.duration/2):1)}
function movieClipAt(s,kind,t,hold=false){return movieClips(s).filter(c=>c.enabled!==false&&c.kind===kind&&c.start<=t&&(t<c.start+c.duration||(hold&&c.hold))).sort((a,b)=>b.start-a.start)[0]}
function movieNewClip(kind,preset,start=0,s=scene()){
 const color=kind==='light'?'#ffdea3':kind==='shadow'?'#1c2534':'#ffeab6';
 return{id:id(),kind,preset:preset||MOVIE_FX_PRESETS[kind][0][0],start:frameTime(start),duration:3,strength:.55,ease:'cinematic',fadeIn:.35,fadeOut:.45,hold:['camera','focus'].includes(kind),enabled:true,targetId:null,fromTargetId:null,anchor:'center',x:800,y:450,endX:800,endY:450,offsetX:0,offsetY:0,radius:kind==='particle'?100:300,softness:.7,color,angle:0,endAngle:0,spread:35,from:cameraBaseAt(s,start)};
}
function movieCameraAt(s,t,base){
 const c=movieClipAt(s,'camera',t,true);if(!c)return base;
 // A shot cut always wins over a previously held move.
 const rows=cinemaRows(s),row=rows.find(r=>t<r.end)||rows.at(-1);if(row?.shot.lockCamera||row&&c.start<row.start-1e-7)return base;
 const a=c.from||cameraBaseAt(s,c.start),u=movieProgress(c,t),k=c.strength,target=s.items.find(o=>o.id===c.targetId);
 // Raw motion avoids a circular dependency through the depth/parallax camera.
 const actorEnd=phrasePlaybackTiming(studioProject())?phraseHold(s,studioProject()):Infinity;
 const q=target?poseAt(target,Math.min(t,c.start+c.duration,actorEnd),sceneSeconds(s)):{x:c.endX,y:c.endY};
 let out={...a};
 if(c.preset==='push'){out.zoom=movieMix(a.zoom,Math.min(4,a.zoom*(1+k*1.5)),u);out.x=movieMix(a.x,q.x,u*k);out.y=movieMix(a.y,q.y,u*k)}
 if(c.preset==='pull'){out.zoom=movieMix(a.zoom,Math.max(1,a.zoom/(1+k*1.8)),u);out.x=movieMix(a.x,c.endX,u*k);out.y=movieMix(a.y,c.endY,u*k)}
 if(c.preset==='pan'||c.preset==='rise'){out.zoom=Math.max(a.zoom,1+k*.65);out.x=movieMix(a.x,c.endX,u*k);out.y=movieMix(a.y,c.endY,u*k)}
 if(c.preset==='follow'&&target){const p=poseAt(target,Math.min(c.start,actorEnd),sceneSeconds(s));out.zoom=a.zoom;out.x=a.x+(q.x-p.x)*k;out.y=a.y+(q.y-p.y)*k}
 if(c.preset==='drift'||c.preset==='impact'){
  if(t>=c.start+c.duration)return base;
  out={...base};const dt=t-c.start,envelope=movieEnvelope(c,t),impact=c.preset==='impact',weight=k*envelope*(impact?Math.exp(-dt*5/Math.max(.2,c.duration)):1),speed=impact?37:1.1;
  out.zoom=Math.min(4,out.zoom+weight*(impact?.055:.025));out.x+=Math.sin(dt*speed)*weight*(impact?32:12);out.y+=Math.sin(dt*speed*.73)*weight*(impact?20:7);
 }
 return cameraClamp(out);
}
function movieFocusBlur(s,o,scale,t,original){
 const c=movieClipAt(s,'focus',t,true);if(!c||o?.type==='bubble'||o?.type==='text')return original*scale;
 const amount=14*c.strength,blurFor=target=>{if(!target)return original;return o?.id===target?0:amount*(o?1:.65)};
 return movieMix(blurFor(c.fromTargetId),blurFor(c.targetId),movieProgress(c,t))*scale;
}
function moviePoint(c,s,t,fullBoard=false){
 const u=movieProgress(c,t),o=s.items.find(o=>o.id===c.targetId);let p={x:movieMix(c.x,c.endX,u),y:movieMix(c.y,c.endY,u),rotation:0,visible:true};
 if(o){const v=cinemaVisualPose(o,t,s);p={...v,visible:!o.hidden&&(v.opacity??1)>0};let a=[0,0];
  if(c.anchor==='feet')a=[0,o.bh/2];else if(c.anchor!=='center')a=cinemaAnchor(o,c.anchor,t,s);
  const dx=(a[0]+c.offsetX)*(o.flipX?-1:1)*v.w/o.bw,dy=(a[1]+c.offsetY)*(o.flipY?-1:1)*v.h/o.bh,r=v.rotation*Math.PI/180;
  p.x+=dx*Math.cos(r)-dy*Math.sin(r);p.y+=dx*Math.sin(r)+dy*Math.cos(r);
 }
 const camera=fullBoard?{x:W/2,y:H/2,zoom:1}:cameraAt(s,t),q=cameraWorldToScreen([p.x,p.y],camera);
 return{...p,x:q[0],y:q[1],zoom:camera.zoom,angle:(p.rotation+movieMix(c.angle,c.endAngle,u))*Math.PI/180};
}
function movieColor(hex,alpha){return hex+Math.round(movieUnit(alpha)*255).toString(16).padStart(2,'0')}
let movieLightMask=null;
function movieLightShape(g,c,p,alpha=1,erase=false){
 const r=c.radius*p.zoom;g.save();g.translate(p.x,p.y);g.rotate(p.angle);g.globalAlpha=alpha;
 const white=erase?'#ffffff':c.color;
 if(c.preset==='beam'||c.preset==='window'){
  const half=Math.tan(c.spread*Math.PI/360)*r,grad=g.createLinearGradient(0,0,r,0);grad.addColorStop(0,movieColor(white,.9));grad.addColorStop(.65,movieColor(white,.4));grad.addColorStop(1,movieColor(white,0));g.fillStyle=grad;
  g.beginPath();g.moveTo(0,-4);g.lineTo(r,-half);g.quadraticCurveTo(r*1.1,0,r,half);g.lineTo(0,4);g.closePath();g.fill();
  if(c.preset==='window'&&!erase){g.globalCompositeOperation='source-over';g.strokeStyle=movieColor('#283c57',.22);g.lineWidth=6*p.zoom;for(const at of [.35,.65]){g.beginPath();g.moveTo(r*at,-half*at);g.lineTo(r*at,half*at);g.stroke()}g.beginPath();g.moveTo(0,0);g.lineTo(r,0);g.stroke()}
 }else{
  const grad=g.createRadialGradient(0,0,0,0,0,r);grad.addColorStop(0,movieColor(white,1));grad.addColorStop(Math.max(.02,1-c.softness),movieColor(white,.75));grad.addColorStop(1,movieColor(white,0));g.fillStyle=grad;g.fillRect(-r,-r,2*r,2*r);
 }g.restore();
}
function movieDrawLights(g,s,t,fullBoard){
 const lights=movieClips(s).filter(c=>c.enabled!==false&&c.kind==='light'&&c.strength>0&&movieEnvelope(c,t)>0);if(!lights.length)return;
 const local=lights.filter(c=>['spot','beam','window','lamp','flicker'].includes(c.preset));
 g.save();
 for(const c of lights.filter(c=>!local.includes(c))){const a=c.strength*movieEnvelope(c,t);g.fillStyle=movieColor(c.preset==='night'?'#182b64':c.preset==='sunset'?'#f0a351':'#09101c',a*(c.preset==='sunset'?.36:.78));g.fillRect(0,0,W,H)}
 if(local.length){
  movieLightMask??=makeCanvas(800,450);const m=movieLightMask.getContext('2d');m.save();m.clearRect(0,0,800,450);m.scale(.5,.5);
  const dark=Math.max(...local.map(c=>c.strength*movieEnvelope(c,t)*(['spot','beam'].includes(c.preset)?.68:.12)));
  m.fillStyle=movieColor('#080f20',dark);m.fillRect(0,0,W,H);m.globalCompositeOperation='destination-out';
  for(const c of local){const p=moviePoint(c,s,t,fullBoard);if(!p.visible)continue;m.save();if(c.preset==='beam'||c.preset==='window')m.filter='blur('+c.softness*12+'px)';movieLightShape(m,c,p,c.strength*movieEnvelope(c,t)/Math.max(...local.map(l=>l.strength)),true);m.restore()}m.restore();g.drawImage(movieLightMask,0,0,W,H);
  g.globalCompositeOperation='screen';for(const c of local){const p=moviePoint(c,s,t,fullBoard);if(!p.visible)continue;const flicker=c.preset==='flicker'?.68+.16*Math.sin(t*17.3)+.12*Math.sin(t*31.7):1;g.save();if(c.preset==='beam'||c.preset==='window')g.filter='blur('+c.softness*8+'px)';movieLightShape(g,c,p,c.strength*movieEnvelope(c,t)*flicker*.36);g.restore()}
 }g.restore();
}
function movieNoise(seed){const q=Math.sin(seed*127.1+32.7)*43758.5453;return q-Math.floor(q)}
function movieSeed(c){let n=0;for(const ch of c.id)n=(Math.imul(n,31)+ch.charCodeAt(0))|0;return n%10000}
function movieDrawParticles(g,s,t,fullBoard){
 for(const c of movieClips(s)){const envelope=movieEnvelope(c,t);if(c.enabled===false||c.kind!=='particle'||!envelope)continue;const p=moviePoint(c,s,t,fullBoard);if(!p.visible)continue;
  const dt=t-c.start,seed=movieSeed(c),count=Math.round(12+38*c.strength),r=c.radius*p.zoom;g.save();g.translate(p.x,p.y);g.globalAlpha=envelope;g.lineCap='round';
  for(let i=0;i<count;i++){const a=movieNoise(seed+i*3),b=movieNoise(seed+i*3+1),speed=.3+movieNoise(seed+i*3+2)*.65,age=(dt*speed+a)%1;
   let x=(a-.5)*r*2,y=(b-.5)*r,alpha=Math.sin(age*Math.PI)*c.strength,size=(1.5+b*3)*p.zoom;
   if(c.preset==='puff'){const u=movieUnit(dt/Math.min(1.3,c.duration)),angle=a*Math.PI*2;x=Math.cos(angle)*r*u;y=Math.sin(angle)*r*.35*u;size=(8+b*15)*p.zoom*(.3+u);alpha=(1-u)*c.strength}
   else if(c.preset==='steam'){x=Math.sin(age*5+a*6)*r*.22;y=-age*r*1.6;size=(9+age*24)*p.zoom;alpha*=.18}
   else if(c.preset==='footsteps'){y=-(age*r*.25);x=(a-.5)*r*age;size=(3+age*10)*p.zoom;alpha*=.3}
   else if(c.preset==='embers'){y=-age*r*1.8;x+=Math.sin(age*6+a*6)*r*.12;size*=.7}
   else{y+=Math.sin(dt*.65+i)*r*.16;x+=Math.sin(dt*.45+i)*r*.12}
   g.fillStyle=movieColor(c.color,alpha);g.strokeStyle=movieColor(c.color,alpha);g.lineWidth=1.5*p.zoom;
   if(c.preset==='sparkle'){size*=1.4;g.beginPath();g.moveTo(x-size,y);g.lineTo(x+size,y);g.moveTo(x,y-size);g.lineTo(x,y+size);g.stroke()}
   else{g.beginPath();g.arc(x,y,Math.max(.1,size),0,Math.PI*2);g.fill()}
  }g.restore();
 }
}
function movieDrawShadows(g,s,t){
 for(const c of movieClips(s)){const envelope=movieEnvelope(c,t);if(c.enabled===false||c.kind!=='shadow'||!envelope)continue;
  const o=s.items.find(o=>o.id===c.targetId);if(!o||o.hidden)continue;const p=cinemaVisualPose(o,t,s);if((p.opacity??1)<=0)continue;
  const u=movieProgress(c,t),stretch=c.preset==='stretch'?1+u*3:1,float=c.preset==='float'?(.65+.2*Math.sin((t-c.start)*2)):1;
  g.save();g.translate(p.x+c.offsetX,p.y+p.h*.46+c.offsetY);g.rotate(movieMix(c.angle,c.endAngle,u)*Math.PI/180);g.scale(stretch*float,1);
  g.filter='blur('+(3+c.softness*12)+'px)';g.globalAlpha=c.strength*envelope*(p.opacity??1)*(c.preset==='float'?.4:.6);g.fillStyle=c.color;g.beginPath();g.ellipse(0,0,Math.min(p.w*.43,c.radius),Math.max(5,p.h*.035),0,0,Math.PI*2);g.fill();g.restore();
 }
}
const MOVIE_LOOK_FILTERS={warm:k=>'sepia('+k*.23+') saturate('+(1+k*.12)+')',moon:k=>'saturate('+(1-k*.28)+') brightness('+(1-k*.13)+')',noir:k=>'grayscale('+k+') contrast('+(1+k*.2)+')',memory:k=>'sepia('+k*.55+') saturate('+(1-k*.32)+') contrast('+(1-k*.12)+')',dream:k=>'saturate('+(1-k*.16)+') brightness('+(1+k*.12)+')',suspense:k=>'saturate('+(1-k*.4)+') contrast('+(1+k*.22)+') brightness('+(1-k*.1)+')'};
function movieLookAt(s,t){const c=movieClipAt(s,'look',t);if(c)return{preset:c.preset,strength:c.strength,mix:movieEnvelope(c,t),baseline:s.cinema?.grade};return s.cinema?.grade||null}
function movieGradeFilter(look){if(!look)return'none';return MOVIE_LOOK_FILTERS[look.preset](look.strength)}
function movieDrawLookTint(g,s,t){const look=movieLookAt(s,t);if(!look)return;g.save();const tintFor=l=>({warm:'#ebac59',moon:'#587ed4',memory:'#ceb48e',dream:'#eab7cc',suspense:'#597c83'})[l?.preset];for(const [l,weight]of [[look.baseline,1-(look.mix??1)],[look,look.mix??1]]){const tint=tintFor(l);if(tint&&weight){g.globalAlpha=l.strength*.1*weight;g.fillStyle=tint;g.fillRect(0,0,W,H)}}g.restore()}
function movieRemap(s,map){for(const c of movieClips(s)){c.id=id();for(const key of ['targetId','fromTargetId'])if(c[key])c[key]=map.get(c[key])||null}}
function movieDetachReferences(ids){const s=scene();if(!s.cinema?.clips)return;s.cinema.clips=s.cinema.clips.filter(c=>{if(c.kind==='focus'||c.kind==='shadow')return !ids.includes(c.targetId)&&!ids.includes(c.fromTargetId);if(ids.includes(c.targetId)){const o=s.items.find(o=>o.id===c.targetId);if(o){const p=cinemaVisualPose(o,animTime,s);c.x=c.endX=p.x;c.y=c.endY=p.y}c.targetId=null;if(c.preset==='follow')return false}return true})}
function validateMovieFX(p){
 const num=(v,a,b,name)=>{if(!Number.isFinite(v)||v<a||v>b)throw Error('Invalid '+name+'.')};
 for(const s of p.scenes){const clips=s.cinema?.clips;if(clips!==undefined&&(!Array.isArray(clips)||clips.length>200))throw Error('Use up to 200 cinematic clips per scene.');const seen=new Set();
  if(s.cinema?.grade){const g=s.cinema.grade;if(!Object.hasOwn(MOVIE_LOOK_FILTERS,g.preset))throw Error('Choose a color look.');num(g.strength,0,1,'look strength')}
  for(const c of clips||[]){if(!c||typeof c.id!=='string'||c.id.length>100||seen.has(c.id)||!Object.hasOwn(MOVIE_FX_PRESETS,c.kind)||!MOVIE_FX_PRESETS[c.kind]?.some(x=>x[0]===c.preset))throw Error('Invalid cinematic clip.');seen.add(c.id);if(c.name!==undefined&&(typeof c.name!=='string'||c.name.length>80))throw Error('Use a clip name up to 80 characters.');
   num(c.start,0,7199,'clip start');num(c.duration,.2,7200-c.start,'clip duration');num(c.strength,0,1,'clip strength');for(const k of ['fadeIn','fadeOut'])num(c[k],0,30,'clip fade');if(!DIRECTOR_EASES.includes(c.ease)||typeof c.hold!=='boolean'||typeof c.enabled!=='boolean')throw Error('Invalid cinematic timing.');
   for(const key of ['targetId','fromTargetId'])if(c[key]!==null&&!s.items.some(o=>o.id===c[key]))throw Error('Choose an existing piece for this clip.');
   if(c.kind==='focus'&&(!c.targetId||!c.fromTargetId||c.targetId===c.fromTargetId))throw Error('Choose two different pieces for a focus pull.');
   if(c.kind==='shadow'&&!c.targetId)throw Error('Choose a piece to cast this shadow.');
   if(c.kind==='camera'&&c.preset==='follow'&&!c.targetId)throw Error('Choose a character for the camera to follow.');
   if(c.kind==='camera'&&c.targetId){const o=s.items.find(o=>o.id===c.targetId);if(o.attachment||o.propActions?.length)throw Error('Camera moves can follow an independent character or piece.');}
   for(const k of ['x','y','endX','endY','offsetX','offsetY'])num(c[k],-12000,12000,'effect position');for(const k of ['angle','endAngle'])num(c[k],-360,360,'light / shadow angle');num(c.radius,10,2400,'effect size');num(c.softness,0,1,'softness');num(c.spread,5,150,'beam width');
   if(!/^#[0-9a-f]{6}$/i.test(c.color)||!['center','head','leftHand','rightHand','feet'].includes(c.anchor))throw Error('Invalid effect color or anchor.');
   if(!c.from)throw Error('Missing camera start.');for(const k of ['x','y','zoom'])num(c.from[k],k==='zoom'?1:0,k==='zoom'?4:k==='x'?W:H,'camera start');
   if(['camera','focus','look'].includes(c.kind)&&(clips||[]).some(b=>b!==c&&b.enabled&&c.enabled&&b.kind===c.kind&&b.start<c.start+c.duration-1e-7&&b.start+b.duration>c.start+1e-7))throw Error(MOVIE_FX_LABELS[c.kind]+' clips cannot overlap. Adjust their start or duration.');
  }
 }
 return p;
}
