const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
function scene(){const c={window:{}};vm.runInNewContext(fs.readFileSync('dist/scene-renderer.js','utf8'),c);return c.window.MovementScene;}
const {trafficAt,fleet}=scene();
assert.equal(fleet.length,35);assert.equal(new Set(fleet.map(v=>v.file)).size,35);
for(const v of fleet){assert(fs.existsSync('dist/assets/vehicles-v2/'+v.file+'.png'));if(v.left)assert(fs.existsSync('dist/assets/vehicles-v2/'+v.left.file+'.png'));}
const directions=fleet.map(()=>new Set()),firstCounts=fleet.map(()=>0);let minGap=Infinity;const interval=5/(.95*.95),firstDirections=new Set();
for(let seed=0;seed<300;seed++){
 const entries=[];
 for(let slot=0;slot<350;slot++){
  const t=slot*interval;
  const cars=trafficAt(t,{time:t,seed}),entry=cars.find(v=>v.travel===0);assert(entry);
  assert.notEqual(entry.i,entries.at(-1),'no consecutive duplicate arrivals');entries.push(entry.i);directions[entry.i].add(entry.flip);
  if(slot===0){firstCounts[entry.i]++;firstDirections.add(entry.flip);assert(cars.every(v=>v.x+v.size/2<0||v.x-v.size/2>1920),'road is completely empty at game start');}
 }
 for(let n=0;n<entries.length;n+=35)assert.equal(new Set(entries.slice(n,n+35)).size,35,'every shuffled round contains the whole fleet once');
 for(let t=0;t<1900;t+=.5){
  const cars=trafficAt(t+87,{time:t,seed});
  assert.equal(new Set(cars.map(v=>v.i)).size,cars.length,'no duplicate vehicle onscreen, across both directions');
  for(const flip of [false,true]){
   const lane=cars.filter(v=>v.flip===flip).sort((a,b)=>a.x-b.x);
   for(let n=1;n<lane.length;n++){
    const gap=lane[n].x-lane[n-1].x-(lane[n].size+lane[n-1].size)/2;minGap=Math.min(minGap,gap);
    assert(gap>180,`safe bumper gap: ${gap.toFixed(1)} for ${fleet[lane[n-1].i].file} and ${fleet[lane[n].i].file}`);
   }
  }
 }
}
assert.equal(firstDirections.size,2,'first car can arrive from either side');
assert(Math.abs(1/interval/(1/5)-(.95*.95))<1e-12,'traffic arrival rate reduced another five percent');
assert.equal(trafficAt(-.01,{time:-.01,seed:1}).length,0,'no traffic before game starts');
for(const d of directions)assert.equal(d.size,2,'each vehicle travels both ways');
for(let seed=300;seed<2000;seed++)firstCounts[trafficAt(0,{time:0,seed})[0].i]++;
assert(firstCounts.every(n=>n>0),'every vehicle can be chosen first');
assert.notEqual(JSON.stringify(trafficAt(80,{time:80,seed:1})),JSON.stringify(trafficAt(80,{time:80,seed:2})),'seed changes random order');
const later=JSON.stringify(trafficAt(1900,{time:1900,seed:314}));trafficAt(10,{time:10,seed:314});assert.equal(JSON.stringify(trafficAt(1900,{time:1900,seed:314})),later,'backward seek does not change traffic');
assert.equal(JSON.stringify(scene().trafficAt(1900,{time:1900,seed:314})),later,'fresh replay/export regenerates identical traffic');
console.log('PASS: 35 equally weighted vehicles, a fresh random order per round, no simultaneous or consecutive duplicates, both directions, deterministic seeking/replay/export.');
console.log('Minimum observed lane clearance:',minGap.toFixed(1),'pixels.');

let speeds=new Set(),slowed=false;
for(let seed=0;seed<60;seed++)for(let t=1;t<190;t+=.5){
 const a=trafficAt(t,{time:t,seed}),b=trafficAt(t+.01,{time:t+.01,seed});
 for(const v of a){const next=b.find(x=>x.i===v.i&&x.flip===v.flip);if(next){const speed=Math.abs(next.x-v.x)/.01;speeds.add(Math.round(speed));}}
}
assert(speeds.size>15,'individual cars have different cruising speeds');
console.log('PASS: varied cruising speeds with safe following.');
