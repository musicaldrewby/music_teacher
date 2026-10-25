import {STORIES} from './performance.js';
import {PRODUCERS,GEAR,MILESTONES,VENUES,ACHIEVEMENTS} from './content.js';
export const SAVE_VERSION=1;
const LIMIT=1e150;
export function newGame(now=Date.now()) {return {version:SAVE_VERSION,cash:0,lifetime:0,runCash:0,fans:0,venue:0,owned:PRODUCERS.map(()=>0),gear:Object.fromEntries(GEAR.map(g=>[g.id,0])),legend:0,encores:0,universes:0,clicks:0,activeSeconds:0,offlineReturns:0,lastSaved:now,created:now,achievements:[],storyUnlocked:[],storyRead:[],fanTips:{wait:75,active:null,serial:0,collected:0,total:0},settings:{volume:.35,sfx:.18,music:false,track:'live',motion:true},journal:[]};}
export function sanitize(raw,now=Date.now()) {
 if(!raw||typeof raw!=='object'||raw.version!==SAVE_VERSION)throw new Error('This is not a compatible From Tips to Tours save.');
 const s=newGame(now);
 const num=(v,max=LIMIT)=>typeof v==='number'&&Number.isFinite(v)?Math.max(0,Math.min(max,v)):0;
 for(const key of ['cash','lifetime','runCash','fans','legend','clicks','activeSeconds'])s[key]=num(raw[key]);
 s.lifetime=Math.max(s.lifetime,s.cash);s.runCash=Math.min(s.runCash,s.lifetime);
 for(const key of ['encores','universes','offlineReturns'])s[key]=Math.floor(num(raw[key],1e6));
 s.venue=Math.floor(num(raw.venue,VENUES.length-1));
 s.owned=PRODUCERS.map((_,i)=>Math.floor(num(raw.owned?.[i],1000)));
 s.gear=Object.fromEntries(GEAR.map(g=>[g.id,Math.floor(num(raw.gear?.[g.id],g.max||500))]));
 s.lastSaved=Math.min(now,num(raw.lastSaved,now)||now);s.created=Math.min(now,num(raw.created,now)||now);
 s.achievements=ACHIEVEMENTS.filter(a=>(Array.isArray(raw.achievements)?raw.achievements:[]).includes(a.id)).map(a=>a.id);
 const storyIds=new Set(STORIES.map(x=>x.id));
 for(const k of ['storyUnlocked','storyRead'])s[k]=[...new Set((Array.isArray(raw[k])?raw[k]:[]).filter(id=>storyIds.has(id)))];
 s.storyRead=s.storyRead.filter(id=>s.storyUnlocked.includes(id));
 if(raw.fanTips&&typeof raw.fanTips==='object'){
  const f=raw.fanTips;
  s.fanTips.wait=typeof f.wait==='number'&&Number.isFinite(f.wait)?num(f.wait,180):75;
  for(const k of ['serial','collected'])s.fanTips[k]=Math.floor(num(f[k],1e9));
  s.fanTips.total=num(f.total);
  const a=f.active;
  if(a&&Number.isInteger(a.id)&&a.id>0&&a.id===s.fanTips.serial&&num(a.remaining,22)>0&&num(a.amount)>0)
   s.fanTips.active={id:a.id,remaining:num(a.remaining,22),amount:Math.min(num(a.amount),fanTipValue(s,1)),side:a.side===1?1:0};
 }
 if(raw.settings){for(const k of ['volume','sfx'])s.settings[k]=num(raw.settings[k],1);for(const k of ['music','motion'])if(typeof raw.settings[k]==='boolean')s.settings[k]=raw.settings[k];if(typeof raw.settings.track==='string'&&raw.settings.track.length<150)s.settings.track=raw.settings.track;}
 s.journal=(Array.isArray(raw.journal)?raw.journal:[]).slice(0,30).filter(x=>x&&typeof x.text==='string').map(x=>({text:x.text.slice(0,200),time:num(x.time,now)}));
 return s;
}
export const milestonePower=level=>2**MILESTONES.filter(n=>level>=n).length;
export const legendMultiplier=s=>1+Math.log2(1+s.legend)*.5+s.universes*.75;
export function multipliers(s){
 const g=s.gear;
 const legacy=legendMultiplier(s);
 const all=legacy*(1+.05*g.guitar+.06*g.amp+.08*g.mixer+.03*Math.floor(g.lessons/10));
 return {all,idle:all*(1+.07*g.kit),fans:(1+.04*g.keys+.05*g.lights)*(1+Math.log2(1+s.legend)*.04),offline:Math.min(96,24+g.crew*4)*3600};
}
export function rates(s){
 const m=multipliers(s);let income=0,fans=0;
 for(let i=0;i<PRODUCERS.length;i++){
  const q=s.owned[i];if(!q)continue;
  income+=PRODUCERS[i].rate*q*milestonePower(q);
  fans+=PRODUCERS[i].fans*Math.pow(q,.72)*Math.sqrt(milestonePower(q));
 }
 income*=m.idle;fans*=m.fans;
 return {income,fans,click:(1+s.gear.lessons)*m.all+income*.12,offline:m.offline,multipliers:m};
}
export function cost(item,level,count=1){if(count<=0)return 0;if(count===1)return item.cost*item.growth**level;return item.cost*item.growth**level*(item.growth**count-1)/(item.growth-1);}
export function affordable(item,level,cash,limit=1000){
 if(cash<cost(item,level,1)*(1-1e-12))return 0;
 let n=Math.min(limit-level,Math.floor(Math.log1p(cash*(item.growth-1)/(item.cost*item.growth**level))/Math.log(item.growth)+1e-10));
 while(n>0&&cost(item,level,n)>cash*(1+1e-12))n--;
 return Math.max(0,n);
}
export function purchase(s,type,id,quantity=1){
 const list=type==='producer'?PRODUCERS:GEAR; const item=list.find(g=>g.id===id);if(!item||s.venue<item.unlock)return {ok:false,reason:'locked'};
 const idx=PRODUCERS.indexOf(item),level=type==='producer'?s.owned[idx]:s.gear[id],max=item.max||(type==='producer'?1000:500);
 const available=affordable(item,level,s.cash,max);
 const n=quantity==='max'?available:Math.min(available,Math.max(1,Math.floor(Number(quantity)||1)));
 if(!n)return {ok:false,reason:level>=max?'max':'cash'};
 const price=cost(item,level,n);s.cash=Math.max(0,s.cash-price);
 if(type==='producer')s.owned[idx]+=n;else s.gear[id]+=n;
 return {ok:true,count:n,price,milestone:type==='producer'&&MILESTONES.some(v=>v>level&&v<=level+n),name:item.name};
}
function addMoney(s,amount){amount=Math.max(0,Math.min(LIMIT,amount));s.cash=Math.min(LIMIT,s.cash+amount);s.lifetime=Math.min(LIMIT,s.lifetime+amount);s.runCash=Math.min(LIMIT,s.runCash+amount);}
export function perform(s){const r=rates(s);addMoney(s,r.click);s.fans=Math.min(LIMIT,s.fans+.008*r.multipliers.fans);s.clicks++;return r.click;}
export function advance(s,seconds,{offline=false}={}){
 const r=rates(s);const elapsed=Math.max(0,Math.min(Number(seconds)||0,offline?r.offline:86400*7));
 const money=r.income*elapsed, fans=r.fans*elapsed;addMoney(s,money);s.fans=Math.min(LIMIT,s.fans+fans);if(!offline)s.activeSeconds+=elapsed;
 return {money,fans,seconds:elapsed,capped:seconds>elapsed};
}
// A small optional thank-you: 8–14 seconds of idle output, or five clicks.
// This clock advances only through the visible stage UI, never offline income.
export function fanTipValue(s,roll=0){const r=rates(s);return Math.min(LIMIT,Math.max(r.click*5,r.income*(8+6*Math.max(0,Math.min(1,roll)))));}
export function stepFanTips(s,seconds,{enabled=true,random=Math.random}={}){
 if(!enabled||!Number.isFinite(seconds)||seconds<=0||seconds>5||(!s.clicks&&!s.owned.some(n=>n>0)))return null;
 const f=s.fanTips,dt=Math.min(seconds,1);
 if(f.active){f.active.remaining=Math.max(0,f.active.remaining-dt);if(f.active.remaining<=0){f.active=null;return 'expired';}return null;}
 f.wait=Math.max(0,f.wait-dt);if(f.wait>1e-6)return null;
 const roll=()=>{const n=random();return Number.isFinite(n)?Math.max(0,Math.min(1,n)):0;};
 f.wait=120+60*roll();f.serial=Math.min(1e9,f.serial+1);
 f.active={id:f.serial,remaining:22,amount:fanTipValue(s,roll()),side:roll()<.5?0:1};
 return 'appeared';
}
export function collectFanTip(s,id){
 const f=s.fanTips,a=f.active;
 if(!a||a.id!==id||a.remaining<=0||!Number.isFinite(a.amount)||a.amount<=0)return 0;
 // Clear before crediting, so double taps can never collect a tip twice.
 f.active=null;const amount=Math.min(a.amount,fanTipValue(s,1));addMoney(s,amount);
 f.collected=Math.min(1e9,f.collected+1);f.total=Math.min(LIMIT,f.total+amount);
 return amount;
}
export function unlock(s){
 const venues=[];while(s.venue<VENUES.length-1){const v=VENUES[s.venue+1];if(s.fans+1e-7<v.fans||s.lifetime+1e-7<v.money)break;s.venue++;venues.push(v);}
 const achievements=[];for(const a of ACHIEVEMENTS)if(!s.achievements.includes(a.id)&&a.test(s)){s.achievements.push(a.id);achievements.push(a);}
 return {venues,achievements};
}
export function progress(s){const next=VENUES[s.venue+1];return next?{next,fans:Math.min(1,s.fans/next.fans),money:Math.min(1,s.lifetime/next.money)}:null;}
export function encoreReward(s){return s.venue>=12?Math.max(0,Math.floor((s.runCash/1e9)**.22)):0;}
export function encore(s,big=false,now=Date.now()){
 const reward=encoreReward(s);if(reward<1||(big&&s.venue<42))return false;
 const next=newGame(now);
 for(const key of ['fans','venue','lifetime','clicks','activeSeconds','offlineReturns','created','settings','achievements','storyUnlocked','storyRead'])next[key]=structuredClone(s[key]);
 next.fanTips={...s.fanTips,active:null,wait:Math.max(120,s.fanTips.wait)};
 next.legend=s.legend+reward*(big?3:1);next.encores=s.encores+1;next.universes=s.universes+(big?1:0);
 if(big){next.venue=0;next.fans=0;}
 next.cash=25;next.journal=[{text:big?'A new universe. The same impossible dream.':'A new tour begins. Your reputation travels with you.',time:now},...s.journal].slice(0,30);
 Object.assign(s,next);return reward*(big?3:1);
}
export function fmt(n,precision=1){if(!Number.isFinite(n))return '—';if(n<1000)return n>=100?Math.floor(n).toLocaleString('en-US'):n.toLocaleString('en-US',{maximumFractionDigits:n<10?precision:0});const units=['','K','M','B','T','Qa','Qi','Sx','Sp','Oc','No','Dc'];const p=Math.floor(Math.log10(n)/3);return p<units.length?(n/1000**p).toFixed(precision).replace(/\.0$/,'')+units[p]:n.toExponential(2).replace('+','');}
export function timeLabel(sec){if(sec<60)return Math.max(1,Math.ceil(sec))+'s';if(sec<3600)return Math.ceil(sec/60)+'m';if(sec<86400)return (sec/3600).toFixed(1)+'h';return (sec/86400).toFixed(1)+'d';}
