const assert=require('node:assert/strict'),P=require('../dist/video-plan.js');
const config={seconds:120,freezeSeconds:4.8,endOnStop:true,smoke:true,seed:123,moves:[{id:'walk',weight:1,seconds:14.4},{id:'jog',weight:3,seconds:9.6},{id:'hop',weight:0,seconds:12}]};
for(const seconds of [10,60,77,120,180,300,600])for(const endOnStop of [true,false])for(const smoke of [true,false]){
 const p=P.build({...config,seconds,endOnStop,smoke});assert.equal(p.intro,.6+8+2+(smoke?2.4:1));assert.equal(p.closing,smoke?2.4:1.4);assert.equal(p.outro,p.closing+3.5+.6);assert.equal(p.segments[0].id==='stop',false);assert(!p.segments.some(s=>s.id==='hop'));assert.equal(p.segments.at(-1).id==='stop',endOnStop);
 let at=0;for(const s of p.segments){assert(Math.abs(s.start-at)<1e-8);assert(Math.abs(s.duration/P.BAR-Math.round(s.duration/P.BAR))<1e-8);assert(s.duration>0);assert.equal(P.at(p,p.intro+s.start+.01).id,s.id);at+=s.duration;}assert(Math.abs(at-p.gameDuration)<1e-8);assert(Math.abs(p.total-p.gameDuration-p.intro-p.outro)<1e-8);
}
assert.deepEqual(P.build(config),P.build(config));assert.throws(()=>P.build({...config,moves:config.moves.map(m=>({...m,weight:0}))}),/Choose at least one movement/);
let walks=0,total=0;for(let seed=1;seed<=1000;seed++){const p=P.build({...config,seconds:600,seed});for(const s of p.segments)if(s.id!=='stop'){walks+=s.id==='walk';total++;}}assert(Math.abs(walks/total-.25)<.04);
console.log('PASS: deterministic weighted selection, excluded moves, durations, contiguous measure boundaries, both endings, transition lengths, and timeline/audio lookup.');

for(const stopMode of ['never','sometimes','always'])for(const endOnStop of [true,false])for(const seconds of [10,60,600]){
 const cfg={...config,stopMode,endOnStop,seconds},p=P.build(cfg);assert.deepEqual(p,P.build(cfg));
 let cursor=0;for(const seg of p.segments){assert(Math.abs(seg.start-cursor)<1e-8);assert(Math.abs(seg.duration/P.BAR-Math.round(seg.duration/P.BAR))<1e-8);cursor+=seg.duration;}assert(Math.abs(cursor-p.gameDuration)<1e-8);assert.equal(p.segments.at(-1).id==='stop',endOnStop);
 if(stopMode==='never')assert.equal(p.segments.filter(s=>s.id==='stop').length,endOnStop?1:0);
}
const mixed=P.build({...config,seconds:600,stopMode:'sometimes'});assert(mixed.segments.some((s,i)=>i&&s.id!=='stop'&&mixed.segments[i-1].id!=='stop'));assert(mixed.segments.slice(0,-1).some(s=>s.id==='stop'));
const one=P.build({...config,stopMode:'never',endOnStop:false,moves:[{id:'walk',weight:1,seconds:4.8}]});assert.equal(one.segments.length,1);assert(Math.abs(one.segments[0].duration-one.gameDuration)<1e-8);
console.log('PASS: never/occasional/always stops, separate final Stop, direct changes, single-movement loops, and stable measure-aligned timing.');

for(const opening of ["bus","smoke","fade","none"])for(const ending of ["bus","smoke","fade","none"]){const p=P.build({...config,opening,ending});assert.equal(p.readyDuration,2);assert.equal(p.fadeIn,.6);assert.equal(p.fadeOut,.6);assert(Math.abs(p.gameDuration-120)<1e-8);assert(Math.abs(p.total-(130+({bus:5.2,smoke:2.4,fade:1,none:0}[opening])+p.closing+3.5+1.2))<1e-8);}
console.log("PASS: all transition choices add 0.6-second fades at both ends without shortening gameplay or the thank-you hold.");
