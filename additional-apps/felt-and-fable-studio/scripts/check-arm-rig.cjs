const assert=require('assert');
const {context,run,ready,errors}=require('./app-harness.cjs');
(async()=>{await ready;await run("ensureIds(['cinema-maya','cinema-leo','cinema-asha','cinema-jun'])");
 run("globalThis.rigCanvas=makeCanvas(460,500);globalThis.rigCtx=rigCanvas.getContext('2d')");
 // Loading an existing actor ID must resolve to the revised atlas, including for cached visitors.
 for(const actor of ['maya','leo','asha','jun']){
  context.rigId='cinema-'+actor;
  assert(run("artById.get(rigId).prepared.endsWith('-rig2.js')"));
  assert.equal(run('artById.get(rigId).puppet.rigVersion'),2);
  // The upper outer corners of the torso are now empty: the fixed sleeve nubs are gone.
  run("globalThis.torsoCrop=artById.get(rigId).puppet.parts.torso;globalThis.torsoCanvas=makeCanvas(torsoCrop[2],torsoCrop[3]);torsoCanvas.getContext('2d').drawImage(imageMap.get(rigId),...torsoCrop,0,0,torsoCrop[2],torsoCrop[3])");
  for(const side of [.025,.975]){context.sampleSide=side;assert(run("torsoCanvas.getContext('2d').getImageData(Math.floor(torsoCrop[2]*sampleSide),Math.floor(torsoCrop[3]*.3),1,1).data[3]")<20,actor+' retained an old shoulder nub');}
 }

 // Accessory anchors must land on the actual opaque felt hand in every rendered pose.
 for(const actor of ['maya','leo','asha','jun'])for(const pose of run('CINEMA_POSES'))for(const phase of [0,.25,.7,1.2]){
  context.rigActor={type:'puppet',asset:'cinema-'+actor,acting:{phase,pose,expression:'happy',mouth:0}};
  run('rigCtx.clearRect(0,0,460,500);cinemaDrawPuppet(rigCtx,rigActor)');
  const skin=run("artById.get(rigActor.asset).puppet.skin.match(/[a-f0-9]{2}/gi).map(n=>parseInt(n,16))");
  for(const side of ['leftHand','rightHand']){context.rigSide=side;const xy=run('cinemaAnchor(rigActor,rigSide)'),pixels=run('rigCtx.getImageData(Math.round(cinemaAnchor(rigActor,rigSide)[0]+230),Math.round(cinemaAnchor(rigActor,rigSide)[1]+250),1,1).data');assert(pixels[3]>245,`${actor} ${pose} ${side}: detached hand anchor`);assert(Math.hypot(pixels[0]-skin[0],pixels[1]-skin[1],pixels[2]-skin[2])<95,`${actor} ${pose} ${side}: anchor misses skin (${pixels})`);assert(xy[0]>-210&&xy[0]<210&&xy[1]>-210&&xy[1]<220,'Arm exceeds actor raster');}
 }
 // Resting hands must remain in front of and below the shirt hem, rather than disappearing behind it.
 context.rigActor={type:'puppet',asset:'cinema-leo',acting:{phase:0,pose:'standing'}};
 for(const side of ['leftHand','rightHand']){context.rigSide=side;assert(run('cinemaAnchor(rigActor,rigSide)[1]')>124)}
 // A small time advance produces a small hand movement: elbows do not pop during a wave.
 const positions=[];for(let frame=0;frame<120;frame++){context.rigActor={type:'puppet',asset:'cinema-leo',acting:{phase:frame/60,pose:'waving'}};positions.push(run("cinemaAnchor(rigActor,'rightHand')"));}
 for(let i=1;i<positions.length;i++)assert(Math.hypot(positions[i][0]-positions[i-1][0],positions[i][1]-positions[i-1][1])<2);
 assert.deepStrictEqual(errors,[]);console.log('PASS: all four felt actors, seven poses, front-facing visible hands, actual painted hand/prop anchors across 112 rendered poses, raster bounds and smooth waving.');
})().catch(e=>{console.error(e);process.exitCode=1});
