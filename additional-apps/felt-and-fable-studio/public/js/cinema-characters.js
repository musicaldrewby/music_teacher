'use strict';
// Original felt heads, torsos, hands and legs with articulated textured sleeves.
const puppetFrames=new Map();
// Shared joint geometry keeps the painted sleeves and held accessories connected.
const CINEMA_RIG={shoulderX:57,shoulderY:4,armWidth:43,armHeight:172,pivot:24,elbow:65,hand:128,sleeveWidth:32};
// The photographed mittens are not centered identically in their cutouts.
// Calibrated palm centers keep accessories on the felt hands, including at the elbow bend.
const CINEMA_PALMS={'cinema-maya':[[.6697,.8867],[.3177,.8871]],'cinema-leo':[[.585,.8868],[.4046,.8886]],'cinema-asha':[[.5605,.8878],[.4424,.888]],'cinema-jun':[[.567,.8881],[.4657,.8892]]};
function cinemaPuppetGeometry(o,t=0,baseOnly=false){const a=o.acting?.phase!==undefined?o.acting:cinemaActingAt(o,t),wave=Math.sin((a.phase||0)*5),walk=Math.sin((a.phase||0)*7);let left=3,right=-3,leftBend=-6,rightBend=6,ll=0,rl=0;
 switch(a.pose){case'pointing':right=-50;rightBend=-32;break;case'waving':right=-72;rightBend=-85+wave*10;break;case'carrying':left=18;right=-18;leftBend=-88;rightBend=88;break;case'walking':left=5+walk*12;right=-5-walk*12;leftBend=-6+walk*6;rightBend=6+walk*6;ll=-walk*16;rl=walk*16;break;case'cheering':left=105;right=-105;leftBend=35;rightBend=-35;break;case'sitting':ll=-60;rl=60;leftBend=-62;rightBend=62;break;case'shrugging':left=45;right=-45;leftBend=120;rightBend=-120;break;case'thinking':right=55;rightBend=90;left=5;leftBend=-20;break;case'presenting':right=-42;rightBend=-50;leftBend=-45;break;case'handsOnHips':left=43;right=-43;leftBend=-100;rightBend=100;break;case'startled':left=72;right=-72;leftBend=105;rightBend=-105;break;case'dancing':left=60+walk*20;right=-60+walk*20;leftBend=50;rightBend=-50;ll=-walk*20;rl=walk*20;break}
 const k={left,right,leftBend,rightBend,ll,rl,a,...(a.freeze?.rig||{})};conversationApplyGeometry(o,k,t);if(!baseOnly&&a.performance){performanceSolveArm(k,true,a.performance.leftHandTarget,o.asset);performanceSolveArm(k,false,a.performance.rightHandTarget,o.asset)}return k;
}
function cinemaArmJoint(k,left,palm=null){const r=CINEMA_RIG,angle=(left?k.left:k.right)*Math.PI/180,bend=(left?k.leftBend:k.rightBend)*Math.PI/180,x=(left?-r.shoulderX:r.shoulderX)-Math.sin(angle)*r.elbow,y=r.shoulderY+Math.cos(angle)*r.elbow,hx=palm?(palm[0]-.5)*r.armWidth:0,hy=(palm?palm[1]*r.armHeight-r.pivot:r.hand)-r.elbow;return{x,y,angle:angle+bend,hand:[x+Math.cos(angle+bend)*hx-Math.sin(angle+bend)*hy,y+Math.sin(angle+bend)*hx+Math.cos(angle+bend)*hy]};
}
function cinemaAnchor(o,anchor,t=0,s=performanceScene()){
 if(o.rig){const f=rigFrame(o,t,s),q=anchor==='leftHand'?f.arms[0].end:anchor==='rightHand'?f.arms[1].end:anchor==='head'?f.body({x:6,y:-170}):{x:0,y:0};return[q.x*f.face,q.y];}
 if(o.type!=='puppet'){const points={leftHand:[-.32,.12],rightHand:[.32,.12],head:[0,-.38],back:[0,0],center:[0,0]};const q=points[anchor]||[0,0];return[q[0]*o.bw,q[1]*o.bh]}
 if(anchor==='head')return performanceHeadPoint([0,-135],o.acting?.phase!==undefined?o.acting.performance:performanceAt(o,t,s));if(anchor==='back'||anchor==='center')return[0,0];const left=anchor==='leftHand';return cinemaArmJoint(cinemaPuppetGeometry({...o,acting:o.acting?.phase!==undefined?o.acting:cinemaActingAt(o,t,s)},t),left,CINEMA_PALMS[o.asset]?.[left?0:1]).hand;
}
// The old sleeve silhouettes had curved shoulders and cannot bend cleanly as two
// cropped rectangles. Draw a single textured sleeve around the joint chain and
// retain only the original mitten artwork beyond each cuff.
const CINEMA_CUFFS={
 'cinema-maya':[[.65,.736],[.35,.742]],
 'cinema-leo':[[.581,.72],[.414,.74]],
 'cinema-asha':[[.59,.746],[.42,.763]],
 'cinema-jun':[[.55,.75],[.45,.765]]
};
const cinemaSleeveTextures=new WeakMap();
function cinemaSleeveTexture(im,meta){
 if(cinemaSleeveTextures.has(im))return cinemaSleeveTextures.get(im);
 const [x,y,w,h]=meta.parts.torso,tile=makeCanvas(52,60),g=tile.getContext('2d');
 g.drawImage(im,x+w*.28,y+h*.37,w*.36,h*.38,0,0,52,60);
 cinemaSleeveTextures.set(im,tile);return tile;
}
function cinemaDrawPuppet(g,o){
 const asset=artById.get(o.asset),im=imageMap.get(o.asset),meta=asset?.puppet;if(!im||!meta)return;const k=cinemaPuppetGeometry(o),a=k.a;
 const part=(key,x,y,w,h,angle=0,pivotY=0)=>{const r=meta.parts[key];if(!r)return;g.save();g.translate(x,y);g.rotate(angle*Math.PI/180);g.drawImage(im,...r,-w/2,-pivotY,w,h);g.restore()};
 g.save();g.translate(230,250);
 part('leftLeg',-35,83,66,150,k.ll,10);part('rightLeg',35,83,66,150,k.rl,10);
 const r=CINEMA_RIG;
 // Torso first, then each COMPLETE arm in front; depth never switches at the elbow.
 // A tiny contact shadow makes the felt overlap legible without a floating limb.
 part('torso',0,-33,145,157,0,0);wardrobeBody(g,o);
 const arm=left=>{
  const crop=meta.parts[left?'leftArm':'rightArm'],joint=cinemaArmJoint(k,left),cuff=CINEMA_CUFFS[o.asset][left?0:1],wx=(cuff[0]-.5)*r.armWidth,wy=cuff[1]*r.armHeight-r.pivot-r.elbow,cx=joint.x+Math.cos(joint.angle)*wx-Math.sin(joint.angle)*wy,cy=joint.y+Math.sin(joint.angle)*wx+Math.cos(joint.angle)*wy;
  g.save();g.lineWidth=r.sleeveWidth;g.lineCap='round';g.lineJoin='round';g.strokeStyle=g.createPattern(cinemaSleeveTexture(im,meta),'repeat');g.shadowColor='#251b1429';g.shadowBlur=1.5;g.shadowOffsetY=1;g.beginPath();g.moveTo(left?-r.shoulderX:r.shoulderX,r.shoulderY);g.lineTo(joint.x,joint.y);g.lineTo(cx,cy);g.stroke();g.shadowColor='transparent';
  g.translate(joint.x,joint.y);g.rotate(joint.angle);const shape=a.performance?.[left?'left':'right']||'relaxed',palm=CINEMA_PALMS[o.asset][left?0:1];g.translate((palm[0]-.5)*r.armWidth,palm[1]*r.armHeight-r.pivot-r.elbow);performanceDrawHand(g,o.asset,left,shape,wy-(palm[1]*r.armHeight-r.pivot-r.elbow),joint.angle);g.restore();
 };
 arm(true);arm(false);const perf=a.performance||{};g.save();g.translate(perf.headX||0,-30+(perf.headY||0));g.rotate((perf.headAngle||0)*Math.PI/180);g.translate(0,30);part('head',0,-222,220,205);
 // Small felt eyes and stitched expressions sit on the original textured face.
 const face=meta.face||{x:0,y:-99,eyeGap:37},fx=face.x+(perf.eyeX||0),fy=face.y+(perf.eyeY||0),expression=a.expression||'happy';g.fillStyle='#201c1a';g.strokeStyle='#201c1a';g.lineCap='round';g.lineWidth=5;
 for(const dir of [-1,1]){const x=fx+dir*(face.eyeGap||37);g.beginPath();if(a.blink||expression==='sleepy'){g.moveTo(x-8,fy);g.quadraticCurveTo(x,fy+5,x+8,fy);g.stroke()}else{g.ellipse(x,fy,7,expression==='surprised'?10:8,0,0,Math.PI*2);g.fill();g.fillStyle='#ffffffb0';g.beginPath();g.arc(x-2,fy-3,1.5,0,Math.PI*2);g.fill();g.fillStyle='#201c1a'}
  if(['angry','worried','sad'].includes(expression)){g.beginPath();const slope=expression==='angry'?-dir*7:dir*7;g.moveTo(x-10,fy-20-slope);g.lineTo(x+10,fy-20+slope);g.stroke()}}
 const my=fy+35;g.beginPath();if(a.mouth||expression==='surprised'){g.ellipse(fx,my,expression==='surprised'?9:12,a.mouth===2?13:8,0,0,Math.PI*2);g.fill();if(a.mouth===2){g.fillStyle='#db8583';g.beginPath();g.ellipse(fx,my+7,7,3,0,0,Math.PI*2);g.fill()}}
 else if(['worried','sad','angry'].includes(expression)){g.moveTo(fx-15,my+5);g.quadraticCurveTo(fx,my-10,fx+15,my+5);g.stroke()}else if(expression==='neutral'||expression==='sleepy'){g.moveTo(fx-10,my);g.lineTo(fx+10,my);g.stroke()}else{g.moveTo(fx-19,my-4);g.bezierCurveTo(fx-12,my+15,fx+12,my+15,fx+19,my-4);g.stroke()}
 wardrobeHead(g,o,face);g.restore();g.restore();
}
function cinemaPuppetRaster(o){const key=JSON.stringify([o.asset,o.acting,o.wardrobe,o.bw,o.bh]);if(puppetFrames.has(key))return puppetFrames.get(key);const c=makeCanvas(o.bw*2,o.bh*2),g=c.getContext('2d');g.scale(c.width/460,c.height/500);cinemaDrawPuppet(g,o);if(puppetFrames.size>120)puppetFrames.clear();puppetFrames.set(key,c);return c}
function addCinemaPuppet(a){add({id:id(),type:'puppet',asset:a.id,name:a.name.replace(' · actor',''),x:cameraAt(scene(),animTime).x,y:cameraAt(scene(),animTime).y,w:338.56,h:368,bw:460,bh:500,rotation:0,opacity:1,acting:{expression:'happy',pose:'standing',talk:false,blink:true,cues:[]}});revealStudioInspector();toast('Choose an expression or pose in Acting. Add a cue to change it later in the scene.')}
