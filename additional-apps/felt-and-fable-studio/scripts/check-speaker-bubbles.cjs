const assert=require('assert'),fs=require('fs');
const {context,run,ready,click,el,errors}=require('./app-harness.cjs');
(async()=>{await ready;click('welcomeStart');await run("ensureIds(['cinema-maya','cinema-leo'])");
 run("scene().items=[];scene().bg=-1;delete scene().cinema;scene().camera={x:800,y:450,zoom:1};scene().duration=6;addCinemaPuppet(artById.get('cinema-leo'));globalThis.speaker=scene().items[0];speaker.y=580;speaker.x=420;selected=[speaker.id];talkEditLine()");
 assert.equal(el('talkBubble').checked,false,'New speech defaults to no bubble');
 for(const x of [420,1180])for(const flip of [false,true])for(const rotation of [-20,0,20]){
  context.fixtureX=x;context.fixtureFlip=flip;context.fixtureRotation=rotation;
  run("speaker.x=fixtureX;speaker.flipX=fixtureFlip;speaker.rotation=fixtureRotation;scene().items=[speaker];globalThis.bubble=talkBubble(scene(),speaker,'Hello there!',1,2);scene().items.push(bubble);globalThis.tree=animationTree(bubble,1.5);Object.assign(tree,cinemaVisualPose(bubble,1.5,scene()))");
  assert.equal(run('bubble.x>speaker.x'),x===420,'Bubble goes on the roomy side');
  assert.equal(run('cinemaVisualPose(bubble,.5,scene()).opacity'),0);assert.equal(run('cinemaVisualPose(bubble,3,scene()).opacity'),0);assert.equal(run('tree.opacity'),1);
  assert(run('tree.tailTip.every(Number.isFinite)'));assert(run('tree.tailTip[0]<0||tree.tailTip[0]>tree.bw'),'Tail extends toward cheek, outside body');
  run("globalThis.bubbleOnly=makeCanvas(1600,900);drawItem(bubbleOnly.getContext('2d'),tree,false);globalThis.targets=[-1,1].map(side=>talkHeadPoint(speaker,cinemaVisualPose(speaker,1.5,scene()),side)).sort((a,b)=>Math.hypot(a[0]-tree.x,a[1]-tree.y)-Math.hypot(b[0]-tree.x,b[1]-tree.y));");
  assert(run("bubbleOnly.getContext('2d').getImageData(Math.round(targets[0][0]),Math.round(targets[0][1]),1,1).data[3]>80"),'Rendered tail reaches nearest cheek and is not clipped');
 }
 // Moving the speaker carries the bubble. Dragging text to the other side reverses the tail.
 run("speaker.x=800;speaker.rotation=0;speaker.flipX=false;scene().items=[speaker];bubble=talkBubble(scene(),speaker,'Come along!',1,2);scene().items.push(bubble);globalThis.oldPose=cinemaVisualPose(bubble,1.5,scene());speaker.x+=75;globalThis.newPose=cinemaVisualPose(bubble,1.5,scene());");assert(Math.abs(run('newPose.x-oldPose.x')-75)<1e-6);
 run("animTime=1.5;selected=[bubble.id];editPiece(bubble).x=1200;tree=animationTree(bubble,animTime);refresh()");assert(run('tree.tailTip[0]<0'));assert.equal(el('bubbleAimRow').hidden,false);assert.equal(el('bubbleTail').disabled,true);
 run("editPiece(bubble).x=450;tree=animationTree(bubble,animTime)");assert(run('tree.tailTip[0]>tree.bw'));
 // Camera magnification, project roundtrip and copied links all preserve the relation.
 run("scene().camera={x:800,y:450,zoom:2};scene().items=[speaker];bubble=talkBubble(scene(),speaker,'A closer shot.',1,2);scene().items.push(bubble);validateProject(JSON.parse(snapshot()))");assert(Math.abs(run('bubble.w*cameraAt(scene(),1).zoom')-420)<1e-6);
 click('copyScene');assert(run('scene().items[1].attachment.parentId===scene().items[0].id'));run('validateProject(state)');
 run("selected=[scene().items[0].id];remove();validateProject(state)");assert.equal(run('scene().items[0].attachment'),undefined);assert.equal(run('scene().items[0].bubbleAim'),undefined);
 // Native canvas visual review using the same scene drawing path as playback and export.
 const {createCanvas}=require('@napi-rs/canvas');const review=createCanvas(1600,530),g=review.getContext('2d');g.fillStyle='#eee6d7';g.fillRect(0,0,1600,530);g.fillStyle='#334b42';g.font='bold 27px sans-serif';g.fillText('Speech bubbles stay close and point toward the speaker',35,42);
 for(let i=0;i<2;i++){context.reviewX=i?1100:500;run("scene().camera={x:800,y:450,zoom:1};scene().items=[speaker];speaker.x=reviewX;speaker.y=620;speaker.flipX=false;speaker.rotation=0;speaker.acting={expression:'happy',pose:'standing',talk:false};scene().bgColor='#c5d5c2';bubble=talkBubble(scene(),speaker,'A little closer feels right.',1,2);scene().items.push(bubble);globalThis.reviewFrame=makeCanvas(800,450);drawScene(reviewFrame.getContext('2d'),scene(),800,450,1.5,false,false,state)");g.drawImage(run('reviewFrame'),i*800,70);}
 fs.writeFileSync('/workspace/scratch/ce7361a185e7/arm-refinement/bubble-review.png',review.toBuffer('image/png'));
 assert.deepStrictEqual(errors,[]);console.log('PASS: voice-only default; close left/right placement; actual tail pixels at the nearest cheek with mirrored/rotated actors; moving, dragging, timed visibility, camera zoom, inspector controls, save/open, scene copy and speaker deletion.');
})().catch(e=>{console.error(e);process.exitCode=1});
