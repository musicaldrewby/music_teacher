import{seeded,playSpin,collectPick,chooseFreeMode}from'../dist/engine.js';
const rng=seeded(71921),s={balance:1e9,lines:20,coins:1,free:null,bonus:null,lastWin:0,spins:0};
let paid=0,total=0,free=0,bonus=0,wild=0,paidWins=0;
for(let i=0;i<100000;i++){
 let inFeature=true,guard=0;
 while(inFeature){const r=playSpin(s,rng);total+=r.payout;if(r.wasFree)free++;else {paid++;paidWins+=r.payout>0;}wild+=r.wildCells.length>0;if(s.bonus){bonus++;for(let p=0;p<9;p++)total+=collectPick(s,p);s.bonus=null;}if(s.free?.choice)chooseFreeMode(s,['classic','super','ultra'][i%3]);s.notice=null;if(s.free?.remaining===0)s.free=null;inFeature=!!s.free;if(++guard>1000)throw Error('Unbounded feature');}
}
console.log(JSON.stringify({paid,free,bonus,wild,paidHitRate:paidWins/paid,simulatedReturn:total/(paid*20)},null,2));
