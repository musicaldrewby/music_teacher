import assert from 'node:assert/strict';
import * as E from '../dist/engine.mjs';
import {MOVIES} from '../dist/data.mjs';

function invariant(s){assert.ok(E.validate(s),'valid state and copy conservation');assert.ok(s.stock.every(st=>st.ready>=0&&st.dirty>=0&&st.shelve>=0));}
let s=E.fresh(42);invariant(s);assert.equal(E.copies(s),24);
assert.equal(E.rewind(s,0),true);assert.equal(E.rewind(s,3),false);E.openDay(s);E.tick(s,14);assert.equal(s.stock[0].shelve,1);assert.equal(E.shelve(s,0),true);invariant(s);
let loan=E.overdue(s)[0];assert.ok(E.callRenter(s,loan.id,'firm'));assert.equal(E.callRenter(s,loan.id),false);E.tick(s,13);assert.ok(!s.loans.includes(loan));invariant(s);
const before=s.cash;assert.equal(E.buyMovie(s,29),false);assert.equal(s.cash,before);assert.equal(E.hire(s,0,2),false);assert.ok(E.hire(s,0,6));assert.equal(E.hire(s,0,6),false);assert.equal(E.setWage(s,0,NaN),false);assert.equal(E.setWage(s,0,0),false);E.tick(s,60);assert.ok(s.daily.payroll>=6);invariant(s);
let snapshot=JSON.parse(JSON.stringify(s));assert.ok(E.validate(snapshot));snapshot.stock[0].ready++;assert.equal(E.validate(snapshot),false);
const bad=JSON.parse(JSON.stringify(s));bad.customers.push({regular:500,stage:'checkout',movie:900});assert.equal(E.validate(bad),false);
s=E.fresh(7);s.phase='open';s.seconds=479;E.tick(s,10);assert.equal(s.phase,'closed');assert.equal(s.seconds,480);const cash=s.cash;E.prepareDay(s);assert.equal(s.day,2);assert.equal(s.phase,'planning');assert.equal(s.cash,cash);E.buyMovie(s,12);const spent=s.daily.expenses;E.openDay(s);assert.equal(s.day,2);assert.equal(s.daily.expenses,spent);invariant(s);

// Seven full shifts: the active player helps, checks out, rewinds, stocks and calls.
s=E.fresh(2026);const summaries=[];
for(let day=1;day<=7;day++){
 if(s.phase==='closed')E.prepareDay(s);
 if(day===2){assert.ok(E.hire(s,0,6));assert.ok(E.upgrade(s,'rewinders'));}
 if(day>=2)for(const genre of ['Action','Comedy','Family','Horror','Romance','Sci-Fi']){const m=MOVIES.filter(v=>v.genre===genre&&v.unlock<=day).find(v=>s.stock[v.id].owned<3);if(m&&s.cash>100)E.buyMovie(s,m.id);}
 E.openDay(s);
 for(let sec=0;sec<480;sec++){
  if(sec%3===0){
   for(const c of [...s.customers]){if(c.stage==='help'){const m=MOVIES.find(m=>m.genre===c.genre&&s.stock[m.id].ready>0&&E.price(s,m)<=c.budget);if(m)E.recommend(s,c.id,m.id);}else E.checkout(s,c.id);}
   const sh=s.stock.findIndex(st=>st.shelve>0);if(sh>=0)E.shelve(s,sh);const dirty=s.stock.findIndex(st=>st.dirty>0);if(dirty>=0)E.rewind(s,dirty);
   const l=E.overdue(s).find(l=>!l.called);if(l)E.callRenter(s,l.id);
   for(const id of ['popcorn','soda','candy'])if(s.snacks[id].stock<3&&s.cash>20)E.buySnacks(s,id);
  }
  E.tick(s,1);invariant(s);
 }
 summaries.push({day,cash:+s.cash.toFixed(2),rentals:s.daily.rentals,goal:E.goal(s),lost:s.daily.lost,wages:+s.daily.payroll.toFixed(2),rescue:!!s.report.rescue});
}
assert.ok(s.totalRentals>75);assert.ok(summaries[0].rentals>=summaries[0].goal);assert.ok(summaries[0].lost<=1);assert.ok(s.cash>100);assert.ok(summaries.every(d=>!d.rescue));
// Wages stop when employees are taken off the schedule midshift.
E.openDay(s);s.staff[0].active=false;const accrued=s.daily.payroll;E.tick(s,30);assert.equal(s.daily.payroll,accrued);
// Expansion requirement and spending cannot be bypassed by repeat clicks.
assert.equal(E.upgrade(s,'branch'),false);s.cash=2000;assert.ok(E.upgrade(s,'store'));assert.equal(E.upgrade(s,'store'),false);s.cash=2000;assert.ok(E.upgrade(s,'branch'));invariant(s);
console.log('PASS: copy conservation, returns, reminders, budget gates, hiring, wages, saves, seven-day campaign and expansion.');
console.table(summaries);
