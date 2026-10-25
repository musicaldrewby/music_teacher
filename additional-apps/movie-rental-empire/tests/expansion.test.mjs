import assert from 'node:assert/strict';
import * as E from '../dist/engine.mjs';
import * as X from '../dist/expansion.mjs';
import {renderNeighborhood,trainingCard} from '../dist/expansion-ui.mjs';
const valid=s=>assert.ok(E.validate(JSON.parse(JSON.stringify(s))),'round-trip save and copy conservation');
let s=E.fresh(17);delete s.expansion;assert.ok(E.validate(s));X.ensure(s);valid(s);assert.equal(s.expansion.stories.length,8);
// Actual checkout advances a regular once, and a chapter can only be claimed once.
E.openDay(s);E.spawnCustomer(s);let c=s.customers[0];c.stage='checkout';c.movie=0;c.budget=9;assert.ok(E.checkout(s,c.id).ok);assert.ok(X.readyStory(s,c.regular));let cash=s.cash;assert.ok(X.claimStory(s,c.regular));assert.equal(s.cash,cash+10);assert.equal(X.claimStory(s,c.regular),false);s.expansion.stories[c.regular].visits=6;assert.ok(X.claimStory(s,c.regular));assert.ok(X.claimStory(s,c.regular));assert.equal(s.expansion.keepsakes.length,1);assert.equal(X.claimStory(s,c.regular),false);valid(s);
// All story UI states render with actual content and escaped cover callback.
for(const section of ['stories','nights','collections','visitor','milestones'])assert.ok(renderNeighborhood(s,section,()=>'<div>cover</div>').length>300);
// Hosted event gates, progress, one-time payout, and next-day reset.
s=E.fresh(20);assert.equal(X.bookNight(s,'family'),false);s.day=3;assert.ok(X.bookNight(s,'family'));cash=s.cash;assert.equal(X.bookNight(s,'family'),false);assert.equal(s.cash,cash);E.openDay(s);assert.equal(X.bookNight(s,'action'),false);for(let i=0;i<4;i++)X.sold(s,{regular:0,movie:2});cash=s.cash;E.closeDay(s);assert.equal(s.expansion.hosted,1);assert.equal(s.expansion.nightHistory[0].won,true);assert.equal(s.daily.bonus,40);assert.equal(E.closeDay(s),false);assert.equal(s.cash,cash+40-24);E.prepareDay(s);assert.equal(s.expansion.night,null);assert.equal(s.expansion.guest,null);valid(s);
// Missing a target never incurs an extra fine.
assert.ok(X.bookNight(s,'action'));E.openDay(s);cash=s.cash;E.closeDay(s);assert.equal(s.cash,cash-24);assert.equal(s.expansion.nightHistory[0].won,false);
// Nine named offers create real copies, three set rewards, and no duplicate charges.
s=E.fresh(3);s.cash=1000;for(let i=0;i<9;i++){s.day=4+i*2;s.phase='open';s.seconds=101;X.tick(s);assert.equal(s.expansion.guest.type,'collector');assert.ok(X.guestAction(s,'buy'));cash=s.cash;assert.equal(X.guestAction(s,'buy'),false);assert.equal(s.cash,cash);valid(s);}assert.equal(s.expansion.rares.length,9);assert.equal(s.expansion.sets.length,3);assert.equal(E.copies(s),33);
// Full shelves do not consume an offer or cash.
s=E.fresh(2);s.day=4;s.cash=1000;s.phase='open';s.seconds=101;X.tick(s);s.stock[0].owned+=16;s.stock[0].ready+=16;cash=s.cash;assert.equal(X.guestAction(s,'buy'),false);assert.equal(s.cash,cash);assert.equal(s.expansion.guest.resolved,false);valid(s);
// Actor and critic are optional, idempotent and accounted as receipt bonuses.
s=E.fresh(10);s.day=3;E.openDay(s);E.tick(s,101);cash=s.cash;assert.ok(X.guestAction(s,'welcome'));assert.equal(s.cash,cash+8);assert.equal(X.guestAction(s,'welcome'),false);valid(s);
s=E.fresh(11);s.day=5;E.openDay(s);E.tick(s,101);assert.ok(X.guestAction(s,'accept'));for(let i=0;i<3;i++)X.sold(s,{regular:0,movie:0});E.closeDay(s);assert.equal(s.daily.bonus,25);assert.ok(s.expansion.keepsakes.includes('Penny’s five-star review'));valid(s);
// Staff earn XP from real jobs; promotions cost cash, raise pay, speed work and cap at level 3.
s=E.fresh(10);assert.ok(E.hire(s,0,6));s.staff[0].assignment='returns';E.openDay(s);E.tick(s,1);assert.ok(s.staff[0].xp>0);assert.equal(X.train(s,0,'returns'),false);s.staff[0].xp=24;s.cash=1000;for(let i=1;i<=3;i++){assert.ok(X.train(s,0,'returns'));assert.equal(s.staff[0].training.level,i);}assert.equal(X.train(s,0,'returns'),false);assert.equal(X.train(s,0,'floor'),false);assert.equal(s.staff[0].wage,7.5);assert.equal(X.staffSpeed(s.staff[0]),1.75);assert.ok(trainingCard(s.staff[0]).includes('Fully trained'));valid(s);
// Earned room improvements change capacity, staff cap and hosted-event goals.
s=E.fresh(13);s.cash=2000;assert.equal(X.milestone(s,'annex'),false);s.totalRentals=100;for(const m of X.MILESTONES){assert.ok(X.milestone(s,m.id));cash=s.cash;assert.equal(X.milestone(s,m.id),false);assert.equal(s.cash,cash);}assert.equal(E.capacity(s),70);assert.equal(X.staffCap(s),5);s.day=3;assert.ok(X.bookNight(s,'family'));assert.equal(s.expansion.night.target,3);valid(s);
// Reject malformed expansion saves, while retaining valid older saves.
for(const mutate of [x=>x.stories=null,x=>x.rares.push('bogus'),x=>x.nightHistory.push(null),x=>x.guest={type:'bogus'},x=>x.stories[0].chapter=9]){const bad=JSON.parse(JSON.stringify(s));mutate(bad.expansion);assert.equal(E.validate(bad),false);}
console.log('PASS: six expansion systems, legacy migration, payouts, duplicate protection, real tape conservation, staff progression, event failures and malformed saves.');
