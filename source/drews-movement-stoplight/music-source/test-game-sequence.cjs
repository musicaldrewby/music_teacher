const assert=require('assert/strict'),S=require('../dist/game-sequence.js'),P=require('../dist/video-plan.js');
const game=S.fromActions('Classroom sequence',['walk','jog','hop'],12,[{id:'walk',time:100},{id:'jog',time:102.4},{id:'stop',time:104.8},{id:'hop',time:109.6}],114.4);
assert.equal(game.blocks.length,4);assert(Math.abs(S.total(game)-14.4)<1e-8);assert.equal(game.blocks[0].id,'walk');assert.equal(S.validate(JSON.parse(JSON.stringify(game))).name,'Classroom sequence');
const edited=S.clone(game);edited.blocks.reverse();edited.blocks[0].duration=9.6;assert.equal(S.validate(edited).blocks[0].id,'hop');assert.equal(game.blocks[0].id,'walk');
for(const opening of ['bus','smoke','fade','none'])for(const ending of ['bus','smoke','fade','none']){
 const p=P.fromSequence(game,{opening,ending,repeats:3});assert.equal(p.opening,opening);assert.equal(p.ending,ending);assert.equal(p.segments.length,12);assert(Math.abs(p.gameDuration-43.2)<1e-8);assert(Math.abs(p.total-p.intro-p.gameDuration-p.outro)<1e-8);
 let cursor=0;for(const s of p.segments){assert.equal(s.start,cursor);cursor+=s.duration;}assert(p.segments[4].restart);assert.equal(P.at(p,p.intro+2.5).id,'jog');
}
assert.equal(P.transitions({opening:'none',ending:'bus'}).intro,10.6);assert.equal(P.transitions({opening:'fade',ending:'none'}).outro,4.1);assert.equal(P.transitions({smoke:false}).opening,'fade');
for(const bad of [null,{}, {...game,bpm:120},{...game,version:2},{...game,blocks:[]},{...game,blocks:[{id:'run',duration:2.4}]},{...game,blocks:[{id:'walk',duration:-1}]},{...game,blocks:[{id:'walk',duration:NaN}]},{...game,blocks:[{id:'walk',duration:4000}]}])assert.throws(()=>S.validate(bad));
assert.throws(()=>S.fromActions('x',[],1,[],20));
console.log('PASS: exact recorded timing, JSON round trip, editing isolation, repeat boundaries, all 16 transition combinations and invalid-file rejection.');
for(const repeat of ['1','2','3','5','10','forever']){const g=S.create('Repeat lesson',['walk'],3,[{id:'walk',duration:9.6}]);g.repeats=repeat;assert.equal(S.validate(JSON.parse(JSON.stringify(g))).repeats,repeat);}
