import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,sanitize,rates,encore} from '../dist/engine.js';
import {SKILLS,STORIES,performanceProfile,discoverStories} from '../dist/performance.js';
import {barEvents,LIVE_SONG} from '../dist/arrangement.js';

test('Published v1 saves migrate without losing progress or soundtrack choices',()=>{
 const old={...newGame(),cash:12345,lifetime:9e9,fans:25000,venue:12,settings:{volume:.4,sfx:.2,music:false,motion:true,track:'custom-my-recording'}};
 delete old.storyUnlocked;delete old.storyRead;old.owned[2]=11;old.gear.lessons=7;
 const s=sanitize(JSON.parse(JSON.stringify(old)));
 assert.equal(s.cash,old.cash);assert.equal(s.owned[2],11);assert.equal(s.gear.lessons,7);assert.equal(s.settings.track,old.settings.track);
 assert.deepEqual(s.storyUnlocked,[]);assert.deepEqual(s.storyRead,[]);
 discoverStories(s);assert.ok(s.storyUnlocked.includes('jules'));
});
test('Story discovery has no currency or rate effect and cannot award duplicates',()=>{
 const s=newGame();s.clicks=1;s.owned[0]=12;s.gear.lessons=10;s.owned[2]=1;
 const before=[s.cash,s.lifetime,s.fans,rates(s)];const fresh=discoverStories(s);
 assert.ok(fresh.length>=5);assert.deepEqual([s.cash,s.lifetime,s.fans,rates(s)],before);
 assert.equal(discoverStories(s).length,0);assert.equal(new Set(s.storyUnlocked).size,s.storyUnlocked.length);
});
test('Read story pages survive both Encore scopes and reject malformed imported IDs',()=>{
 for(const big of [false,true]){const s=newGame();s.venue=44;s.runCash=1e30;s.storyUnlocked=['first-note','jules'];s.storyRead=['first-note'];encore(s,big);assert.deepEqual(s.storyUnlocked,['first-note','jules']);assert.deepEqual(s.storyRead,['first-note']);}
 const s=sanitize({...newGame(),storyUnlocked:['jules','jules','<script>',null],storyRead:['first-note','jules']});
 assert.deepEqual(s.storyUnlocked,['jules']);assert.deepEqual(s.storyRead,['jules']);
});
test('Lesson thresholds produce distinct scores; drums, bass and keys require purchases',()=>{
 const s=newGame();let previous;
 for(const skill of SKILLS){s.gear.lessons=skill.level;const p=performanceProfile(s);assert.equal(p.skill.name,skill.name);const score=JSON.stringify(Array.from({length:8},(_,b)=>barEvents(p,b)));assert.notEqual(score,previous);previous=score;}
 const empty=performanceProfile(newGame());assert.equal(empty.drums,false);assert.equal(empty.bass,false);assert.equal(empty.keys,false);
 s.owned[2]=1;assert.equal(performanceProfile(s).drums,true);assert.equal(performanceProfile(s).bass,false);
 s.owned[6]=1;s.gear.keys=1;const instruments=new Set(barEvents(performanceProfile(s),0).map(e=>e.instrument));
 for(const i of ['guitar','bass','keys','kick','snare','hat'])assert.ok(instruments.has(i),i);
});
test('Every arrangement event is bounded, ordered and playable within its bar',()=>{
 for(const skill of SKILLS)for(const fullBand of [false,true]){const s=newGame();s.gear.lessons=skill.level;if(fullBand){s.owned[6]=1;s.gear.kit=1;s.gear.keys=1;}
  for(let b=0;b<LIVE_SONG.bars;b++){const events=barEvents(performanceProfile(s),b);let previous=-1;
   for(const e of events){assert.ok(e.beat>=previous&&e.beat>=0&&e.beat<4);assert.ok(e.midi>=24&&e.midi<=96);assert.ok(e.duration>0&&e.duration<3);assert.ok(e.velocity>0&&e.velocity<=1);previous=e.beat;}
   assert.ok(events.length<64,'Keep the small synth voice budget bounded');
  }
 }
});
