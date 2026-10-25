export const SYMBOLS = [
  {id:'mario',name:'Mario',series:'Super Mario Bros.',pay:[8,30,125],color:'#f45d67',pos:[0,0]},
  {id:'link',name:'Link',series:'The Legend of Zelda',pay:[6,24,100],color:'#86d876',pos:[1,0]},
  {id:'samus',name:'Samus',series:'Metroid',pay:[5,20,75],color:'#ffb453',pos:[2,0]},
  {id:'mega',name:'Mega Man',series:'Mega Man',pay:[4,15,60],color:'#58c9ff',pos:[0,1]},
  {id:'simon',name:'Simon',series:'Castlevania',pay:[3,12,50],color:'#dcb0ff',pos:[1,1]},
  {id:'bionic',name:'Bionic Commando',series:'Bionic Commando',pay:[2,10,40],color:'#79ddae',pos:[2,1]},
  {id:'wild',name:'Wild',pay:[10,50,200],color:'#ffe28b',pos:[0,2]},
  {id:'free',name:'Free spins',color:'#b69aff',pos:[1,2]},
  {id:'bonus',name:'Pick bonus',color:'#ffce7b',pos:[2,2]}
];
export const LINES = [
 [1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],
 [0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1],[0,1,1,1,0],
 [2,1,1,1,2],[1,0,1,2,1],[1,2,1,0,1],[0,1,0,1,0],[2,1,2,1,2],
 [1,1,0,1,1],[1,1,2,1,1],[0,2,0,2,0],[2,0,2,0,2],[0,2,1,2,0]
];
export const LINE_COLORS=['#ffdc77','#70e4ff','#ff87c9','#7bf0b3','#c7a0ff','#ffac71','#aaff73','#72b7ff','#ffa4b6','#e8dd82'];
export function seeded(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
export function random(){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]/4294967296;}
export function shuffle(a,rng=random){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export const REELS=Array.from({length:5},(_,r)=>{
 const bag=shuffle([...Array.from({length:42},(_,i)=>i%6),6,6],seeded(48231+r*91));
 const strip=[];for(let i=0;i<48;i++)strip.push(i===7||i===31?7:i===19||i===43?8:bag.pop());return strip;
});
export function createGrid(rng=random){return REELS.map(reel=>{const stop=Math.floor(rng()*reel.length);return [0,1,2].map(i=>reel[(stop+i)%reel.length]);});}
export function evaluate(grid,lines=20,coins=1){
 const wins=[];
 for(let line=0;line<lines;line++){
  const rows=LINES[line],ids=rows.map((r,c)=>grid[c][r]);let best=null;
  for(let symbol=0;symbol<=6;symbol++){
   let count=0;while(count<5&&(ids[count]===symbol||(symbol<6&&ids[count]===6)))count++;
   if(count>=3){const amount=SYMBOLS[symbol].pay[count-3]*coins;if(!best||amount>best.amount)best={line,rows,symbol,count,amount};}
  }
  if(best)wins.push(best);
 }
 const scatterReels=grid.filter(col=>col.includes(7)).length;
 const bonusReels=grid.filter(col=>col.includes(8)).length;
 return {wins,payout:wins.reduce((n,w)=>n+w.amount,0),scatterReels,bonusReels,freeAward:scatterReels>=3?[12,18,24][scatterReels-3]:0,bonus:bonusReels>=3};
}
export function outcome({lines=20,coins=1,free=false,locked=[],multiplier=1,modernFree=false}={},rng=random){
 const grid=createGrid(rng);for(const [c,r]of locked)grid[c][r]=6;
 const before=grid.map(c=>[...c]);let wildCells=[],wildKind=null;
 if(rng()<(free?(modernFree?.07:.025):.045)){
  const mode=rng();wildKind=mode<.08?'MEGA TAKEOVER':mode<.3?'WILD REEL':'WILD THROWOUT';
  const eligible=[];for(let c=0;c<5;c++)for(let r=0;r<3;r++)if(grid[c][r]<6)eligible.push([c,r]);
  if(wildKind==='WILD REEL') {const col=Math.floor(rng()*5);wildCells=eligible.filter(([c])=>c===col);}
  else wildCells=shuffle(eligible,rng).slice(0,wildKind==='MEGA TAKEOVER'?7:2+Math.floor(rng()*4));
  for(const[c,r]of wildCells)grid[c][r]=6;
 }
 const evaluated=evaluate(grid,lines,coins);
 evaluated.wins=evaluated.wins.map(w=>({...w,baseAmount:w.amount,amount:w.amount*multiplier,multiplier}));
 evaluated.payout*=multiplier;
 const scatterPay=evaluated.scatterReels>=3?[2,5,10][evaluated.scatterReels-3]*lines*coins:0;
 return {grid,before,wildCells,wildKind,...evaluated,scatterPay,linePay:evaluated.payout,payout:evaluated.payout+scatterPay,multiplier};
}
export const PRIZE_TIERS=[{id:'mini',name:'MINI',times:5,color:'#72e7a3',weight:.70},{id:'minor',name:'MINOR',times:10,color:'#76cafa',weight:.23},{id:'major',name:'MAJOR',times:50,color:'#e8a1ff',weight:.065},{id:'grand',name:'GRAND',times:250,color:'#ffdb8a',weight:.005}];
export const FREE_MODES=[{id:'classic',name:'CLASSIC',multiplier:1,description:'More spins to enjoy'},{id:'super',name:'SUPER',multiplier:2,description:'Double every line win'},{id:'ultra',name:'ULTRA',multiplier:3,description:'Triple every line win'}];
export function makeMatchBonus(bet,rng=random){let draw=rng(),winner=3;for(let i=0;i<PRIZE_TIERS.length;i++){draw-=PRIZE_TIERS[i].weight;if(draw<0){winner=i;break;}}const tiles=PRIZE_TIERS.flatMap((_,i)=>Array(i===winner?3:2).fill(i));return{kind:'match3',tiles:shuffle(tiles,rng),chosen:[],matches:[0,0,0,0],winner,total:0,won:false,bet};}
export function chooseFreeMode(state,id){const mode=FREE_MODES.find(m=>m.id===id);if(!state.free?.choice||!mode)return false;state.free.mode=id;state.free.multiplier=mode.multiplier;state.free.remaining=state.free.budget/mode.multiplier;state.free.choice=false;state.notice=null;return true;}
export const PRIZE_POOL=[1,1,2,2,3,3,5,5,8];
export function makeBonus(bet,rng=random){return{values:shuffle(PRIZE_POOL,rng).map(x=>x*bet),chosen:[],total:0,bet};}
export function pickBonus(bonus,index){if(!Number.isInteger(index)||index<0||index>8||bonus.chosen.includes(index)||bonus.chosen.length>=3)return 0;bonus.chosen.push(index);const amount=bonus.values[index];bonus.total+=amount;return amount;}
export function playSpin(state,rng=random){
 if(state.bonus)throw new Error('Finish the treasure bonus first.');
 if(state.free?.choice)throw new Error('Choose your free-games feature first.');
 if(state.free&&state.free.remaining<=0)throw new Error('Collect the free-spin result first.');
 const free=!!state.free,lines=free?state.free.lines:state.lines,coins=free?state.free.coins:state.coins,bet=lines*coins;
 if(![1,5,10,15,20].includes(lines)||!Number.isInteger(coins)||coins<1||coins>5)throw new Error('Invalid bet.');
 if(!free&&state.balance<bet)throw new Error('Add complimentary credits in Settings to keep playing.');
 if(free){state.free.remaining--;state.free.played++;}else state.balance-=bet;
 const modernFree=free&&!!state.free.mode;
 const result=outcome({lines,coins,free,locked:state.free?.locked||[],multiplier:state.free?.multiplier||1,modernFree},rng);
 state.balance+=result.payout;state.lastWin=result.payout;state.grid=result.grid;state.lastWins=result.wins;
 if(free){state.free.total+=result.payout;if(!modernFree)state.free.locked=[...new Map([...state.free.locked,...result.wildCells].map(p=>[p.join(','),p])).values()];}
 if(result.freeAward){if(free){result.freeAward=(modernFree?6:result.freeAward)/(state.free.multiplier||1);state.free.remaining+=result.freeAward;}else state.free={remaining:0,budget:result.freeAward,choice:true,lines,coins,total:0,played:0,locked:[]};state.notice={type:free?'retrigger':'free',count:result.freeAward};}
 if(result.bonus)state.bonus=makeMatchBonus(bet,rng);
 state.spins=(state.spins||0)+1;
 return {...result,wasFree:free,bet,lines,coins};
}
export function collectPick(state,index){
 const b=state.bonus;if(!b)return 0;let amount=0;
 if(b.kind==='match3'){
  if(!Number.isInteger(index)||index<0||index>=b.tiles.length||b.chosen.includes(index)||b.won)return 0;
  b.chosen.push(index);const tier=b.tiles[index];b.matches[tier]++;
  if(b.matches[tier]===3){b.won=true;amount=PRIZE_TIERS[tier].times*b.bet;b.total=amount;}
 }else amount=pickBonus(b,index);
 state.balance+=amount;state.lastWin+=amount;if(state.free)state.free.total+=amount;return amount;
}
