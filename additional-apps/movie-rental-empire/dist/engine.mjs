import * as X from './expansion.mjs';
import {MOVIES,REGULARS,CANDIDATES,SNACKS,UPGRADES,EVENTS} from './data.mjs';
export const VERSION=1;
export function fresh(seed=Date.now()>>>0){
 const stock=MOVIES.map(m=>({ready:m.id<12?2:0,dirty:0,shelve:0,owned:m.id<12?2:0,rentals:0}));
 const s={version:VERSION,seed,day:1,seconds:0,phase:'planning',cash:245,decor:{name:'Rewind & Dandy',sign:'rose',plants:false,rug:false,arcade:false},rep:60,prices:{classic:3,new:4},stock,loans:[],rewinding:[],customers:[],staff:[],upgrades:{},snacks:Object.fromEntries(SNACKS.map(m=>[m.id,{stock:12,price:m.price}])),streak:0,bestStreak:0,totalRentals:0,totalProfit:0,nextSpawn:2,uid:10,log:[],notices:[],achievements:[],history:[],report:null,daily:{rentals:0,revenue:0,snackSales:0,lost:0,payroll:0,expenses:0,bonus:0,goalClaimed:false},lifetime:{calls:0,rewinds:0,hires:0},seenIntro:false,branchRevenue:0};
 [0,3].forEach(id=>{s.stock[id].ready--;s.stock[id].dirty++;});
 [2,5,8].forEach((movie,i)=>{s.stock[movie].ready--;s.loans.push({id:i,movie,name:REGULARS[i+1].name,dueDay:0,dueAt:100,late:true,returnDay:3,returnAt:120,called:false,fee:0});});
 X.ensure(s);return s;
}
export function rand(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
export function eventFor(s){return EVENTS[(s.day-1)%7];}
export function capacity(s){return 40+(s.upgrades.shelves||0)*25+(s.upgrades.store||0)*35+X.capacityBonus(s);}
export function copies(s){return s.stock.reduce((a,v)=>a+v.owned,0);}
export function goal(s){return 5+Math.min(19,Math.floor((s.day-1)*1.5));}
export function say(s,text,type='info'){s.notices.push({id:++s.uid,text,type});s.log.unshift({text,day:s.day,time:s.seconds});s.log=s.log.slice(0,45);}
function spend(s,amount){if(!Number.isFinite(amount)||amount<0||s.cash<amount)return false;s.cash-=amount;s.daily.expenses+=amount;return true;}
function reward(s,id,text,amount){if(s.achievements.includes(id))return;s.achievements.push(id);s.cash+=amount;s.daily.bonus+=amount;say(s,`${text} +$${amount}`,'reward');}
export function prepareDay(s){if(s.phase!=='closed')return false;s.day++;X.newDay(s);s.seconds=0;s.phase='planning';s.daily={rentals:0,revenue:0,snackSales:0,lost:0,payroll:0,expenses:0,bonus:0,goalClaimed:false};s.staff.forEach(e=>{e.active=false;e.timer=0;});return true;}
export function openDay(s){if(s.phase!=='planning'&&s.phase!=='closed')return false;if(s.phase==='closed')prepareDay(s);s.staff.forEach(e=>e.active=e.scheduled);s.phase='open';s.nextSpawn=2;s.streak=0;say(s,`Day ${s.day}: ${eventFor(s).title}. The doors are open.`);return true;}
export function isNew(m){return m.id>=12;}
export function price(s,m){return s.prices[isNew(m)?'new':'classic'];}
export function spawnCustomer(s){
 if(s.customers.length>=(s.day<=2?3:7)){if(s.day>2)s.daily.lost++;return;}
 const r=Math.floor(rand(s)*REGULARS.length),reg=REGULARS[r];const genre=rand(s)<.45?(X.activeNight(s)?.genre||eventFor(s).genre):reg.genre;
 const choices=MOVIES.filter(m=>m.unlock<=s.day&&m.genre===genre);const wanted=choices[Math.floor(rand(s)*choices.length)];
 const budget=3.5+Math.floor(rand(s)*5)*.75;const direct=rand(s)>.5&&s.stock[wanted.id].ready>0&&price(s,wanted)<=budget;
 const c={id:++s.uid,regular:r,name:reg.name,genre,wanted:wanted.id,movie:direct?wanted.id:null,stage:direct?'checkout':'help',wait:0,patience:(110+Math.max(0,4-s.day)*35+rand(s)*55)*(s.upgrades.cozy?1.25:1),budget,snack:rand(s)<.7?SNACKS[Math.floor(rand(s)*3)].id:null,snackBudget:(1.5+rand(s)*1.5)*(X.ensure(s).milestones.includes('snackcounter')?1.2:1),entered:s.seconds};
 s.customers.push(c);if(s.customers.length===1)s.notices.push({id:++s.uid,text:`${c.name} ${direct?'is ready to check out.':'needs a recommendation.'}`,type:'customer'});
}
export function recommend(s,id,movie){
 const c=s.customers.find(v=>v.id===id),m=MOVIES[movie];if(!c||c.stage!=='help'||!m||!s.stock[movie].ready)return {ok:false,text:'That tape is not on the shelf.'};
 if(price(s,m)>c.budget)return {ok:false,text:`“A little steep. My budget is $${c.budget.toFixed(2)}.”`};
 if(m.genre!==c.genre)return {ok:false,text:`“I was hoping for ${c.genre.toLowerCase()} tonight.”`};
 c.movie=movie;c.stage='checkout';c.wait=Math.max(0,c.wait-30);s.rep=Math.min(100,s.rep+.35);return {ok:true,text:`“${movie===c.wanted?'That’s the one!':'That sounds perfect!'} I’ll meet you at the counter.”`};
}
export function checkout(s,id,byStaff=false){
 const c=s.customers.find(v=>v.id===id);if(!c||c.stage!=='checkout')return {ok:false,text:'Help this customer choose a movie first.'};
 const m=MOVIES[c.movie],st=s.stock[c.movie];if(!st.ready){c.stage='help';return {ok:false,text:'The last copy was just rented. Offer another movie.'};}
 const rental=price(s,m);if(rental>c.budget){c.stage='help';return {ok:false,text:'The price is above their budget. Try a cheaper rental.'};}
 st.ready--;st.rentals++;s.daily.rentals++;s.totalRentals++;let snack=0;
 if(c.snack){const n=s.snacks[c.snack];if(n.stock>0&&n.price<=c.snackBudget){n.stock--;snack=n.price;s.daily.snackSales++;}}
 const amount=rental+snack;s.cash+=amount;s.daily.revenue+=amount;
 const late=rand(s)<(s.upgrades.dropbox?.12:.28),dueDay=s.day+1;
 s.loans.push({id:++s.uid,movie:c.movie,name:c.name,dueDay,dueAt:50+rand(s)*240,late,returnDay:dueDay+(late?1+Math.floor(rand(s)*2):0),returnAt:30+rand(s)*370,called:false,fee:0});
 s.streak=c.wait<65?s.streak+1:0;s.bestStreak=Math.max(s.bestStreak,s.streak);s.rep=Math.min(100,s.rep+(c.wait<65?.35:.1));
 s.customers=s.customers.filter(v=>v.id!==id);say(s,`${c.name} rented ${m.title}${snack?' + a snack':''}. +$${amount.toFixed(2)}`,'sale');
 if(s.streak>0&&s.streak%5===0){s.cash+=8;s.daily.bonus+=8;say(s,'Five happy checkouts in a row! Neighborhood buzz bonus +$8.','reward');}
 if(s.daily.rentals>=goal(s)&&!s.daily.goalClaimed){s.daily.goalClaimed=true;const bonus=30+s.day*3;s.cash+=bonus;s.daily.bonus+=bonus;say(s,`Daily rental goal reached! +$${bonus}`,'reward');}
 if(s.totalRentals>=10)reward(s,'ten','Ten rentals! The neighborhood knows your name.',20);
 if(s.totalRentals>=50)reward(s,'fifty','Fifty rentals! A local favorite.',50);
 X.sold(s,c);return {ok:true,amount,text:`Checked out! +$${amount.toFixed(2)}`,movie:m.id};
}
export function rewind(s,movie){if(s.rewinding.length>=1+(s.upgrades.rewinders||0))return false;const st=s.stock[movie];if(!st||st.dirty<=0)return false;st.dirty--;const duration=s.upgrades.turbo?7:14;s.rewinding.push({movie,left:duration,duration});return true;}
export function shelve(s,movie){const st=s.stock[movie];if(!st||st.shelve<=0)return false;st.shelve--;st.ready++;return true;}
export function overdue(s){return s.loans.filter(l=>l.dueDay<s.day||(l.dueDay===s.day&&l.dueAt<s.seconds));}
export function callRenter(s,id,tone='friendly'){
 const l=s.loans.find(v=>v.id===id);if(!l||l.called||!overdue(s).some(v=>v.id===id))return false;l.called=true;l.returnDay=s.day;l.returnAt=s.seconds+(tone==='firm'?12:24);l.fee=tone==='firm'?1.5:0;s.lifetime.calls++;
 if(tone==='waive')s.rep=Math.min(100,s.rep+1.5);if(tone==='firm')s.rep=Math.max(0,s.rep-.6);
 say(s,`${l.name}: “Oh! It was under the passenger seat. I’ll bring it right over.”`);return true;
}
export function buyMovie(s,id){const m=MOVIES[id];if(!m||m.unlock>s.day||copies(s)>=capacity(s)||!spend(s,m.cost))return false;s.stock[id].owned++;s.stock[id].ready++;say(s,`Delivery: a fresh copy of ${m.title}.`);return true;}
export function buySnacks(s,id){const n=SNACKS.find(v=>v.id===id);if(!n||!spend(s,n.cost))return false;s.snacks[id].stock+=10;return true;}
export function upgrade(s,id){const u=UPGRADES.find(v=>v.id===id);if(!u||(s.upgrades[id]||0)>=u.max||(id==='branch'&&!s.upgrades.store)||!spend(s,u.cost))return false;s.upgrades[id]=(s.upgrades[id]||0)+1;say(s,`${u.title} installed!`,'reward');return true;}
export function hire(s,id,wage){const c=CANDIDATES.find(v=>v.id===id);wage=Number(wage);if(!c||s.staff.some(e=>e.id===id)||s.staff.length>=X.staffCap(s)||!Number.isFinite(wage)||wage<c.expected-2||wage>20||!spend(s,35))return false;s.staff.push({id,wage,assignment:c.best,morale:Math.min(100,65+(wage-c.expected)*10),scheduled:true,active:s.phase==='open',timer:0});s.lifetime.hires++;say(s,`${c.name} joined the crew at $${wage.toFixed(2)}/hour.`,'reward');return true;}
export function setWage(s,id,wage){const e=s.staff.find(v=>v.id===id);wage=Number(wage);if(!e||!Number.isFinite(wage)||wage<3||wage>20)return false;const diff=wage-e.wage;e.wage=wage;e.morale=Math.max(0,Math.min(100,e.morale+diff*4));return true;}
export function bonus(s,id){const e=s.staff.find(v=>v.id===id);if(!e||!spend(s,15))return false;e.morale=Math.min(100,e.morale+15);return true;}
export function closeDay(s){
 if(s.phase!=='open')return false;X.close(s);s.phase='closed';s.customers=[];
 const rent=24+(s.upgrades.store?12:0)+(s.upgrades.shelves||0)*3,branches=s.upgrades.branch||0,branchRevenue=branches*95,branchCost=branches*45;
 s.cash+=branchRevenue-rent-s.daily.payroll-branchCost;s.daily.revenue+=branchRevenue;const profit=s.daily.revenue+s.daily.bonus-s.daily.expenses-rent-s.daily.payroll-branchCost;s.totalProfit+=profit;
 s.report={day:s.day,rentals:s.daily.rentals,snackSales:s.daily.snackSales,revenue:s.daily.revenue,bonus:s.daily.bonus,supplies:s.daily.expenses,payroll:s.daily.payroll,rent:rent+branchCost,profit,lost:s.daily.lost,goal:goal(s),cash:s.cash};s.history.push(s.report);s.history=s.history.slice(-28);
 s.staff.forEach(e=>{const c=CANDIDATES[e.id];if(e.active)e.morale=Math.max(0,Math.min(100,e.morale+(e.wage-c.expected)*5+3));e.active=false;});
 for(const e of [...s.staff])if(e.morale<15){say(s,`${CANDIDATES[e.id].name} left for a better-paying job.`);s.staff=s.staff.filter(v=>v.id!==e.id);}
 if(s.cash<0){const relief=100-s.cash;s.cash=100;s.rep=Math.max(10,s.rep-8);say(s,`A one-time-per-day community rescue of $${relief.toFixed(2)} keeps the lights on. Reputation −8. Review wages and prices.`);s.report.rescue=relief;}
 return true;
}
export function tick(s,dt){
 if(s.phase!=='open'||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,480-s.seconds);s.seconds+=dt;X.tick(s);
 for(const j of [...s.rewinding]){j.left-=dt;if(j.left<=0){s.stock[j.movie].shelve++;s.rewinding=s.rewinding.filter(v=>v!==j);s.lifetime.rewinds++;s.notices.push({id:++s.uid,text:`${MOVIES[j.movie].title} is rewound. Put it back on the shelf.`,type:'rewind'});}}
 for(const l of [...s.loans])if(l.returnDay<s.day||(l.returnDay===s.day&&l.returnAt<=s.seconds)){
  const ready=s.upgrades.dropbox&&rand(s)<.5;s.stock[l.movie][ready?'shelve':'dirty']++;s.loans=s.loans.filter(v=>v.id!==l.id);if(l.fee){s.cash+=l.fee;s.daily.revenue+=l.fee;}s.notices.push({id:++s.uid,text:`${l.name} returned ${MOVIES[l.movie].title}.`,type:'return'});
 }
 s.nextSpawn-=dt;if(s.nextSpawn<=0&&s.seconds<445){spawnCustomer(s);const rush=[5,6].includes((s.day-1)%7+1)?1.28:1;const base=s.day<=3?42-(s.day-1)*7:24-Math.min(10,(s.day-3)*1.2);s.nextSpawn=(base+rand(s)*10)/X.rush(s)/(rush*(s.upgrades.sign?1.15:1)*(1+(s.upgrades.shelves||0)*.04))*(s.rep<30?1.3:1);}
 for(const c of [...s.customers]){c.wait+=dt;if(c.wait>c.patience){s.customers=s.customers.filter(v=>v.id!==c.id);s.daily.lost++;s.streak=0;s.rep=Math.max(0,s.rep-1);say(s,`${c.name} couldn’t wait any longer. “I’ll try again another night.”`);}}
 for(const e of s.staff){if(!e.active)continue;s.daily.payroll+=e.wage*dt/60;const c=CANDIDATES[e.id];e.timer-=dt;if(e.timer>0)continue;e.timer=(e.assignment===c.best?10:14)/c.speed/X.staffSpeed(e)*(e.morale<40?1.3:1);let done=false;
  if(['checkout','all'].includes(e.assignment)){const q=s.customers.find(v=>v.stage==='checkout');if(q){done=checkout(s,q.id,true).ok;}}
  if(!done&&['floor','all'].includes(e.assignment)){const q=s.customers.find(v=>v.stage==='help');if(q){const m=MOVIES.filter(v=>v.genre===q.genre&&s.stock[v.id].ready>0&&price(s,v)<=q.budget).sort((a,b)=>b.demand-a.demand)[0];if(m){recommend(s,q.id,m.id);done=true;}}}
  if(!done&&['returns','floor','all'].includes(e.assignment)){const n=s.stock.findIndex(v=>v.shelve>0);if(n>=0){shelve(s,n);done=true;}}
  if(!done&&['returns','all'].includes(e.assignment)){const n=s.stock.findIndex(v=>v.dirty>0);if(n>=0)done=rewind(s,n);if(!done){const l=overdue(s).find(v=>!v.called);if(l)done=callRenter(s,l.id);}}
  if(done)X.worked(s,e);
 }
 s.rep=Math.max(0,Math.min(100,s.rep));if(s.seconds>=480)closeDay(s);
}
export function validate(s){
 if(!s||s.version!==VERSION||!Array.isArray(s.stock)||s.stock.length!==30||!Array.isArray(s.staff)||!Array.isArray(s.loans)||!Array.isArray(s.rewinding))return false;
 if(!X.valid(s))return false;
 if(!Number.isFinite(s.cash)||!Number.isFinite(s.seconds)||s.seconds<0||s.seconds>480||!Number.isInteger(s.day)||s.day<1||!['planning','open','closed'].includes(s.phase))return false;
 if(!s.daily||!s.prices||!s.snacks||!s.lifetime||!s.upgrades||!Array.isArray(s.log)||!Array.isArray(s.customers)||!Array.isArray(s.achievements)||!Array.isArray(s.history))return false;
 if(!Number.isFinite(s.rep)||s.rep<0||s.rep>100||!Number.isFinite(s.uid)||!Number.isFinite(s.seed)||!Number.isFinite(s.nextSpawn)||!Number.isFinite(s.totalRentals)||!Number.isFinite(s.streak))return false;
 if(!['classic','new'].every(k=>Number.isFinite(s.prices[k])&&s.prices[k]>=1&&s.prices[k]<=9)||!SNACKS.every(n=>s.snacks[n.id]&&Number.isInteger(s.snacks[n.id].stock)&&s.snacks[n.id].stock>=0&&Number.isFinite(s.snacks[n.id].price)&&s.snacks[n.id].price>=.5&&s.snacks[n.id].price<=5))return false;
 if(!s.customers.every(c=>REGULARS[c.regular]&&MOVIES[c.wanted]&&MOVIES.some(m=>m.genre===c.genre)&&['help','checkout'].includes(c.stage)&&(c.stage!=='checkout'||MOVIES[c.movie])&&Number.isFinite(c.wait)&&Number.isFinite(c.patience)&&c.patience>0&&Number.isFinite(c.budget)))return false;
 const validReport=r=>r&&['day','rentals','snackSales','revenue','bonus','supplies','payroll','rent','profit','lost','goal','cash'].every(k=>Number.isFinite(r[k]));
 if((s.report&&!validReport(s.report))||!s.history.every(validReport)||!s.log.every(l=>Number.isFinite(l.day)&&typeof l.text==='string'))return false;
 if(!s.loans.every(l=>MOVIES[l.movie]&&Number.isFinite(l.returnDay)&&Number.isFinite(l.returnAt)&&Number.isFinite(l.dueDay)&&Number.isFinite(l.dueAt))||!s.rewinding.every(j=>MOVIES[j.movie]&&Number.isFinite(j.left)&&Number.isFinite(j.duration)))return false;
 return s.stock.every((st,i)=>['ready','dirty','shelve','owned','rentals'].every(k=>Number.isInteger(st[k])&&st[k]>=0)&&st.owned===st.ready+st.dirty+st.shelve+s.rewinding.filter(j=>j.movie===i).length+s.loans.filter(l=>l.movie===i).length)&&s.staff.every(e=>CANDIDATES[e.id]&&Number.isFinite(e.wage)&&e.wage>=3&&e.wage<=20);
}
