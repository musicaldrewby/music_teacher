import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,sanitize,perform,rates,advance,encore,stepFanTips,collectFanTip,fanTipValue} from '../dist/engine.js';
import {FanTipView} from '../dist/fan-tips.js';

const tick=(s,n,options={})=>{let result;for(let i=0;i<n;i++)result=stepFanTips(s,1,{random:()=>.5,...options});return result;};
function offered(){const s=newGame();perform(s);s.fanTips.wait=1;tick(s,1);return s;}

test('Old saves gain a tip clock without losing their progress; active tips round trip',()=>{
 const old=newGame();delete old.fanTips;old.cash=123;old.lifetime=200;old.venue=8;
 const migrated=sanitize(old);assert.equal(migrated.cash,123);assert.equal(migrated.venue,8);assert.equal(migrated.fanTips.wait,75);
 const s=offered();tick(s,9);const restored=sanitize(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(restored.fanTips,s.fanTips);assert.equal(restored.fanTips.active.remaining,13);
 const bad=sanitize({...s,fanTips:{wait:NaN,active:{id:1,remaining:Infinity,amount:Infinity},collected:-2,total:NaN}});
 assert.deepEqual(bad.fanTips,{wait:75,active:null,serial:0,collected:0,total:0});
});

test('The first tip requires playing, and later tips wait at least two minutes',()=>{
 const s=newGame();tick(s,100);assert.equal(s.fanTips.wait,75);perform(s);
 tick(s,74);assert.equal(s.fanTips.active,null);assert.equal(tick(s,1),'appeared');
 assert.equal(s.fanTips.wait,150);collectFanTip(s,s.fanTips.active.id);
 tick(s,149);assert.equal(s.fanTips.active,null);assert.equal(tick(s,1),'appeared');
 for(const roll of [0,.5,1]){const p=newGame();perform(p);p.fanTips.wait=0;stepFanTips(p,1,{random:()=>roll});assert.ok(p.fanTips.wait>=120&&p.fanTips.wait<=180);}
});

test('Hidden, blocked, offline and long-suspended clocks create no extra rewards',()=>{
 const s=offered(),before=structuredClone(s.fanTips);
 tick(s,400,{enabled:false});advance(s,24*3600,{offline:true});stepFanTips(s,3600);stepFanTips(s,NaN);stepFanTips(s,-3);
 assert.deepEqual(s.fanTips,before);assert.equal(s.fanTips.collected,0);
 tick(s,21);assert.equal(s.fanTips.active.remaining,1);assert.equal(tick(s,1),'expired');assert.equal(s.fanTips.active,null);assert.equal(s.fanTips.wait,150);
 assert.equal(collectFanTip(s,before.active.id),0);
});

test('Collecting once credits cash, lifetime and run earnings, never fans or normal clicks',()=>{
 const s=offered(),a=s.fanTips.active,before=structuredClone(s);
 assert.equal(collectFanTip(s,a.id+1),0);assert.equal(collectFanTip(s,a.id),5);
 for(const key of ['cash','lifetime','runCash'])assert.equal(s[key],before[key]+5);
 for(const key of ['fans','clicks','legend','activeSeconds'])assert.equal(s[key],before[key]);
 assert.equal(collectFanTip(s,a.id),0);assert.equal(s.fanTips.collected,1);assert.equal(s.fanTips.total,5);
 assert.equal(sanitize(JSON.parse(JSON.stringify(s))).fanTips.active,null);
});

test('Tips remain bounded across a career, with no multiplying buff',()=>{
 for(const source of [0,6,15,23]){
  const s=newGame();s.owned[source]=50;const r=rates(s);
  assert.equal(fanTipValue(s,0),Math.max(r.click*5,r.income*8));
  assert.equal(fanTipValue(s,1),Math.max(r.click*5,r.income*14));
  const before=rates(s);s.fanTips.active={id:1,amount:1e149,remaining:22,side:0};
  const reward=collectFanTip(s,1);assert.ok(Number.isFinite(reward));assert.ok(reward<=fanTipValue(s,1));assert.deepEqual(rates(s),before);
 }
});

test('Encores discard an old tip and retain collected records and cooldown',()=>{
 const s=offered();collectFanTip(s,s.fanTips.active.id);s.venue=14;s.runCash=1e12;s.lifetime=1e13;
 s.fanTips.wait=0;tick(s,1);assert.ok(s.fanTips.active);assert.ok(encore(s));
 assert.equal(s.fanTips.active,null);assert.ok(s.fanTips.wait>=120);assert.equal(s.fanTips.collected,1);assert.equal(s.fanTips.total,5);
});

class Element {
 constructor(){this.handlers={};this.style={setProperty(){}};this.classList={remove(){},toggle(){}};}
 addEventListener(name,fn){this.handlers[name]=fn;}
 setAttribute(){}focus(){this.focusCalled=true;}
}
test('The tip control pauses under pointer/focus and never collects in a blocked tab',()=>{
 globalThis.document={hidden:false};globalThis.matchMedia=()=>({matches:false});
 const s=offered(),button=new Element(),stage=new Element(),status={textContent:''};let enabled=true,rewards=0;
 const view=new FanTipView({button,stage,status,getState:()=>s,canPlay:()=>enabled,onReward:()=>rewards++,onChange:()=>{}});
 view.update();button.handlers.pointerenter({pointerType:'mouse'});view.tick(1);assert.equal(s.fanTips.active.remaining,22);
 button.handlers.pointerleave();view.tick(1);assert.equal(s.fanTips.active.remaining,21);
 button.handlers.focus();view.tick(1);assert.equal(s.fanTips.active.remaining,21);
 enabled=false;button.handlers.click({detail:0,stopPropagation(){}});assert.equal(rewards,0);
 enabled=true;button.handlers.click({detail:0,stopPropagation(){}});button.handlers.click({detail:0,stopPropagation(){}});
 assert.equal(rewards,1);assert.equal(stage.focusCalled,true);assert.equal(button.hidden,true);
});
test('Reduced motion uses a stationary, reachable reward without changing its value',()=>{
 globalThis.document={hidden:false};globalThis.matchMedia=()=>({matches:true});
 const s=offered(),button=new Element();const view=new FanTipView({button,stage:new Element(),status:{},getState:()=>s,canPlay:()=>true,onReward:()=>{},onChange:()=>{}});
 view.update();const position=[button.style.left,button.style.top],value=s.fanTips.active.amount;
 view.tick(1);assert.deepEqual([button.style.left,button.style.top],position);assert.equal(s.fanTips.active.amount,value);
 view.visible=false;view.tick(1);assert.equal(s.fanTips.active.remaining,21);
});
