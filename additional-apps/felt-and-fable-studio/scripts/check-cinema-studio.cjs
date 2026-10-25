const assert=require('assert'),fs=require('fs');
const h=require('./app-harness.cjs'),{run,context,el,click}=h;
context.crypto=require('crypto').webcrypto;
(async()=>{await h.ready;assert.deepStrictEqual(h.errors,[]);click('welcomeStart');
run(`globalThis.testPiece=(id,x,y,w=100,h=150)=>({id,type:'shape',shape:'Rectangle',name:id,x,y,w,h,bw:w,bh:h,rotation:0,opacity:1,color:'#ed6242',fiber:true});
state=audioDefaults({format:'felt-and-fable',version:1,title:'Cinematic controls',active:0,custom:[],imports:{},scenes:[{id:'scene-a',name:'First',bg:-1,bgColor:'#426967',caption:'',duration:6,items:[testPiece('leader',800,550),testPiece('dancer',1000,550),testPiece('partner',1150,560)],cinema:{shots:[{id:'a',name:'Push',duration:3,move:true,from:{x:800,y:450,zoom:1},to:{x:750,y:450,zoom:2},easing:'linear'},{id:'b',name:'Connected',duration:3,move:true,from:{x:800,y:450,zoom:1},to:{x:1000,y:450,zoom:2},connection:'continue',easing:'linear'}]}},{id:'scene-b',name:'Second',bg:-1,bgColor:'#9f6955',caption:'',duration:4,items:[],cinema:{shots:[{id:'c',name:'Continued',duration:4,move:false,from:{x:800,y:450,zoom:1},to:{x:800,y:450,zoom:1},connection:'continue'}]}}]});selected=['dancer'];animTime=3;refresh();`);
assert.deepStrictEqual(JSON.parse(run('JSON.stringify(cameraAt(scene(),3))')),{x:750,y:450,zoom:2});
run("scene().cinema.shots[0].to.x=690");assert.equal(run('cameraAt(scene(),3).x'),690);assert.equal(run('studioCameraAt(state.scenes[1],0).x'),1000);
const time=run('storyTimeline().at(-1).end');
run("studioShotTrick(scene(),cinemaRows()[1],'reaction',['leader'])");assert.equal(run('storyTimeline().at(-1).end'),time);assert.equal(run('cinemaRows().length'),4);
run("scene().cinema.shots=[];scene().duration=6;animTime=0;refresh();cinemaAddShot();selected=['dancer'];refresh();");click('studioFrameApply');assert(run('cameraAt(scene(),0).zoom>1'));
// One action clip remains editable, Undo restores it, and it follows moved partners.
click('studioMotionAdd');assert.equal(run("items()[1].choreography.length"),1);assert.equal(run('items()[1].keyframes?.length||0'),0);
run("studioMotion().targetIds=['leader'];studioMotion().start=0;studioMotion().duration=4;studioMotion().turns=1;studioMotion().radiusX=180;studioMotion().radiusY=65;studioUISignature='';studioSync()");
assert.equal(run('poseAt(items()[1],1,6).x'),980);run('items()[0].x+=50');assert.equal(run('poseAt(items()[1],1,6).x'),1030);
const front=Array.from(run("studioOrder(scene(),2).map(o=>o.id)")),back=Array.from(run("studioOrder(scene(),0).map(o=>o.id)"));assert(front.indexOf('dancer')>front.indexOf('leader'));assert(back.indexOf('dancer')<back.indexOf('leader'));
el('studioMotionDuration').value='5';el('studioMotionDuration').dispatchEvent({type:'change'});assert.equal(run('studioMotion().duration'),5);run('undo()');await new Promise(setImmediate);run("selected=['dancer'];refresh()");assert.equal(run('studioMotion().duration'),4);
click('studioMotionDelete');assert.equal(run('items()[1].choreography.length'),0);run('undo()');await new Promise(setImmediate);run("selected=['dancer'];refresh()");assert.equal(run('studioMotion().duration'),4);
run("items()[1].choreography=[studioNewMotion('visit',0,['leader','partner'])];items()[1].choreography[0].duration=8;items()[1].choreography[0].turns=1;");assert(run('poseAt(items()[1],5,8).x>1000'));
// An attached scarf holds the pinched corner while its tip orbits the head.
run(`globalThis.scarf=testPiece('scarf',0,0,140,120);scarf.attachment={parentId:'dancer',anchor:'rightHand',dx:0,dy:0,rotation:0,parentScaleX:1,parentScaleY:1,release:null};scarf.choreography=[studioNewMotion('scarf',0,['leader','partner'])];scarf.choreography[0].duration=8;scene().items.push(scarf);validateProject(state);globalThis.gripError=0;`);
run(`globalThis.point=(p,c)=>{const x=(c.gripX-.5)*p.w,y=(c.gripY-.5)*p.h,r=p.rotation*Math.PI/180;return[p.x+x*Math.cos(r)-y*Math.sin(r),p.y+x*Math.sin(r)+y*Math.cos(r)]};for(const t of [0,.5,1,2,3,4,5,7.5]){const pose=cinemaAttachmentPose(scarf,t,scene()),a=[pose.x,pose.y],b=point(cinemaVisualPose(scarf,t,scene()),scarf.choreography[0]);gripError=Math.max(gripError,Math.hypot(a[0]-b[0],a[1]-b[1]))}`);assert(run('gripError')<1e-7);
// Locked movie cues and global lighting keep absolute time after shot edits.
run("directorConfig().lighting=[{id:'dawn',start:0,duration:14,from:'moonlight',to:'daylight',strength:1}];directorConfig().musicCues=[{id:'triangle',label:'Triangle',time:5,duration:1,effect:'sparkle',strength:.5}];globalThis.light1=studioLightingAt(scene(),sceneSeconds(scene()));globalThis.light2=studioLightingAt(state.scenes[1],0);directorResizeShot(scene(),cinemaRows()[0].shot.id,10,true)");assert.equal(run('state.director.musicCues[0].time'),5);assert.equal(run('JSON.stringify(light1)'),run('JSON.stringify(light2)'));assert(run("directorMarkers().some(m=>m.global&&m.label==='Triangle')"));
// Copies remap partners; continuation bakes the visible state and clears motion.
run("selected=['leader','dancer'];duplicate();validateProject(state)");assert(run("items().find(o=>o.id===selected[1]).choreography[0].targetIds[0]===selected[0]"));
run("globalThis.cont=storyContinueScene(state,scene().id,2);validateProject(state)");assert(run('cont.items.every(o=>!o.choreography)'));
// Reject dependency cycles and malformed imported clips.
assert.throws(()=>run("const bad=copy(state);const s=bad.scenes[0];s.items[0].choreography=[studioNewMotion('follow',0,[s.items[1].id])];validateProject(bad)"));
assert.throws(()=>run("const bad=copy(state);bad.scenes[0].items[1].choreography[0].radiusX=NaN;validateProject(bad)"));
// Deterministic seek and shared 30/60 fps rendering, including shot dissolves.
run("state.active=0;selected=[];scene().cinema.shots=[{id:'one',name:'One',duration:2,move:false,from:{x:650,y:450,zoom:2},to:{x:650,y:450,zoom:2}},{id:'two',name:'Two',duration:8,move:false,from:{x:1050,y:450,zoom:2},to:{x:1050,y:450,zoom:2},connection:'dissolve',dissolve:1}];globalThis.a=makeCanvas(960,540);globalThis.b=makeCanvas(960,540);globalThis.before=snapshot();paintVideoFrame(a.getContext('2d'),state,storyTimeline(state,30),75,30);paintVideoFrame(b.getContext('2d'),state,storyTimeline(state,60),150,60)");assert.equal(run('a.toDataURL()'),run('b.toDataURL()'));assert.equal(run('snapshot()'),run('before'));
fs.mkdirSync('/workspace/scratch/ce7361a185e7/cinematic-feature-checks',{recursive:true});fs.writeFileSync('/workspace/scratch/ce7361a185e7/cinematic-feature-checks/render.png',run("a.toBuffer('image/png')"));
assert.deepStrictEqual(h.errors,[]);console.log('PASS: connected shots, framing UI, reaction timing, editable choreography and Undo, moving targets and depth, scarf grip, global lighting/cues, copy/continuation remapping, invalid data, deterministic 30/60 fps rendering.');
})().catch(e=>{console.error(e);process.exitCode=1});
