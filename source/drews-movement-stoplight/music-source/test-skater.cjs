const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const c={window:{}};vm.runInNewContext(fs.readFileSync('dist/scene-renderer.js','utf8'),c);
const {skaterAt,skatingPose,walkerAt,walkingPose}=c.window.MovementScene;
assert(fs.existsSync('dist/assets/vehicles-v2/tony-hawk-torso.png'));
for(let seed=0;seed<30;seed++){
 let previous=null,seen=false;
 for(let time=0;time<180;time+=.1){
  const s=skaterAt(time,{time,seed});
  assert.equal(skaterAt(time,{time,seed,hideTraffic:true}),null,'absent during instructions and opening');
  if(s){seen=true;assert(s.y>=505&&s.y<=512,'on far sidewalk, above curb');assert(s.x<=910||s.x>=1400,'never drawn on side-street roadway');
   if(previous&&s.age>previous.age)assert(s.x>previous.x,'moves right, opposite leftbound far-lane traffic');
   assert.equal(JSON.stringify(s),JSON.stringify(skaterAt(time,{time,seed})),'same saved-game animation');}
  previous=s;
 }
 assert(seen,'appears during a three-minute game');
}
assert.notEqual(JSON.stringify(skatingPose(1).backFoot),JSON.stringify(skatingPose(3).backFoot),'push differs from glide');
for(const boundary of [.55,1.6,2.3,4.6]){
 const a=skatingPose(boundary-1e-6).backFoot,b=skatingPose(boundary+1e-6).backFoot;
 assert(Math.hypot(a[0]-b[0],a[1]-b[1])<.001,'continuous foot motion at push/glide boundaries');
}
console.log('PASS: Tony stays on far sidewalk, moves against adjacent traffic, hides during openings, and pushes/glides continuously.');

for(let seed=0;seed<30;seed++){
 let firstTony=null,firstWalker=null;
 for(let t=0;t<240;t+=.25){const a=skaterAt(t,{time:t,seed}),b=walkerAt(t,{time:t,seed});
  assert(!(a&&b),'sidewalk visitors never overlap');
  assert.equal(walkerAt(t,{time:t,seed,hideTraffic:true}),null);
  if(a&&firstTony===null)firstTony=t;if(b&&firstWalker===null)firstWalker=t;
  if(b){assert(b.y>=505&&b.y<=512);assert(b.x<=810||b.x>=1430);}
 }
 assert(firstTony!==null&&firstWalker!==null);
 assert.equal(skaterAt(firstTony+120,{time:firstTony+120,seed}).age,skaterAt(firstTony,{time:firstTony,seed}).age,'Tony repeats every two minutes');
 assert.equal(skaterAt(firstTony+76,{time:firstTony+76,seed}),null,'Tony no longer repeats after 76 seconds');
}
const a=walkingPose(0),b=walkingPose(.3);
assert.notEqual(JSON.stringify(a.feet),JSON.stringify(b.feet));
assert.notEqual(JSON.stringify(a.dogFeet),JSON.stringify(b.dogFeet));assert.notEqual(a.tail,b.tail);assert.notEqual(a.arm,b.arm);
console.log('PASS: animated owner and dog, moving legs/arm/tail, slower sidewalk walk, no overlap with Tony, two-minute cadence.');

for(let t=0;t<5;t+=.01){
 const a=walkingPose(t),b=walkingPose(t+.001);
 for(const key of ['feet','dogFeet'])for(let n=0;n<a[key].length;n++){
  const foot=a[key][n],next=b[key][n];
  if(foot.y===0&&next.y===0)assert(next.x<foot.x,'planted feet sweep backward during forward walking');
  if(foot.y<-.1&&next.y<-.1)assert(next.x>foot.x,'lifted feet recover forward');
 }
}
console.log('PASS: owner and dog both use forward walking cycles.');
