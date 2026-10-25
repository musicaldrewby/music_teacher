import {newGame,rates,cost,purchase,advance,perform,unlock,fmt,encore,encoreReward,legendMultiplier} from '../dist/engine.js';
import {PRODUCERS,GEAR,CHAPTERS,VENUES} from '../dist/content.js';
import fs from 'node:fs';
const days=Number(process.argv[2]||180);
function run(mode){const s=newGame(0);const milestones=[];let lastChapter=-1,lastVenue=-1,lastEncore=0;const stop=days*86400;let t=0,buys=0;let nextVisit=0;
 while(t<stop&&s.venue<47){const step=t<1200?2:mode==='active'?120:600;
  if(t<600)for(let i=0;i<step*2;i++)perform(s);
  advance(s,step);t+=step;unlock(s);
  // An optimistic, mechanically informed shopper. Actual players can be slower.
  if(mode==='active'||t<1200||t>=nextVisit){nextVisit=t+4*3600;
   if(mode==='encores'&&t-lastEncore>=3*86400&&encoreReward(s)>0){const after={...s,legend:s.legend+encoreReward(s)};if(legendMultiplier(after)/legendMultiplier(s)>1.3){encore(s,false,t*1000);lastEncore=t;}}
   for(let k=0;k<150;k++){
    const r=rates(s),p=VENUES[s.venue+1];let best=null;
    for(const [type,list] of [['producer',PRODUCERS],['gear',GEAR]])for(let j=0;j<list.length;j++){
     const item=list[j];if(item.unlock>s.venue||item.id==='crew')continue;const q=type==='producer'?s.owned[j]:s.gear[item.id];if(q>=(item.max||(type==='producer'?1000:500)))continue;
     const price=cost(item,q);if(price>s.cash)continue;
     const tmp={...s,owned:[...s.owned],gear:{...s.gear}};if(type==='producer')tmp.owned[j]++;else tmp.gear[item.id]++;
     const rr=rates(tmp);let score=(rr.income-r.income)/price;
     // When fans block the next venue, invest some value in their growth too.
     if(p&&s.fans<p.fans)score+=(rr.fans-r.fans)/price*(p.money/p.fans)*.025;
     if(score>0&&(!best||score>best.score))best={type,id:item.id,score};
    }
    if(!best)break;purchase(s,best.type,best.id);buys++;
   }
  }
  const ch=Math.floor(s.venue/6);if(ch!==lastChapter){milestones.push({chapter:CHAPTERS[ch].short,hours:Math.round(t/360)/10,days:Math.round(t/864)/100,venue:s.venue,cash:fmt(s.cash),income:fmt(rates(s).income),fans:fmt(s.fans)});lastChapter=ch;}
  lastVenue=s.venue;
 }
 const result={mode,simulatedDays:Math.round(t/864)/100,venue:s.venue,venueName:VENUES[s.venue].name,buyActions:buys,encores:s.encores,milestones,final:{cash:fmt(s.cash),income:fmt(rates(s).income),fans:fmt(s.fans)}};return result;
}
const results=[run('active'),run('returning'),run('encores')];console.log(JSON.stringify(results,null,2));fs.mkdirSync('notes',{recursive:true});fs.writeFileSync('notes/economy-simulation.json',JSON.stringify({assumptions:'First ten minutes: two clicks/second. Frequent shopper purchases every two minutes after the opening. Returning shopper visits every four hours. Encore strategy also checks every three days for a reset improving the legacy multiplier at least 30%. Uses greedy short-term income/fan ROI; illustrative, not a prediction or guarantee. Saving toward higher-cost opportunities can outperform constant spending. No paid boosts or real-money mechanics.',results},null,2));
