import assert from 'node:assert/strict';
import {STRUM_PATTERNS,strokeNotes,AutoStrummer,clampTempo} from '../dist/auto-strum.js';
import {STRINGS,CHORDS,chordAllows,combineChords} from '../dist/music.js';
const chord=name=>CHORDS.find(c=>c.name===name);
for(const pattern of STRUM_PATTERNS){
  const beats=pattern.steps.reduce((sum,event)=>sum+event.duration,0);
  assert.ok(Math.abs(beats-(pattern.meter==='3/4'?3:pattern.meter==='6/8'?2:4))<1e-8);
  for(const c of [...CHORDS,null,combineChords([chord('C'),chord('Am')]),combineChords([chord('C'),chord('D')])]){
    for(const event of pattern.steps){
      const notes=strokeNotes(event,c);assert.ok(notes.every(i=>i>=0&&i<36&&chordAllows(c,STRINGS[i])));
      if(event.kind==='rest')assert.deepEqual(notes,[]);
    }
  }
}
assert.deepEqual(strokeNotes({kind:'up'},chord('C')),[...strokeNotes({kind:'down'},chord('C'))].reverse());
assert.equal(STRINGS[strokeNotes({kind:'bass'},chord('C'))[0]],48);
assert.equal(STRINGS[strokeNotes({kind:'bass',fifth:true},chord('C'))[0]],55);
assert.ok(strokeNotes({kind:'chord'},chord('C')).every(i=>STRINGS[i]>=60));
assert.equal(clampTempo(12),40);assert.equal(clampTempo(900),180);assert.equal(clampTempo('bad'),92);

let now=0,id=0;const callbacks=new Map(),intervals=new Map(),events=[],highlights=[];
const player=new AutoStrummer({now:()=>now,play:(event,time,duration)=>events.push({event,time,duration}),onStep:index=>highlights.push(index),
  setIntervalFn:fn=>{intervals.set(++id,fn);return id;},clearIntervalFn:id=>intervals.delete(id),
  setTimeoutFn:fn=>{callbacks.set(++id,fn);return id;},clearTimeoutFn:id=>callbacks.delete(id)});
function advance(time){now=time;player.tick();for(const [id,fn] of [...callbacks]){callbacks.delete(id);fn();}}
player.configure('folk',120);player.start();advance(.25);advance(.5);advance(.75);advance(1);advance(1.25);advance(1.5);advance(1.75);advance(2);
assert.equal(events.length,9,'Eight subdivisions then the next measure');
for(let i=0;i<events.length;i++)assert.ok(Math.abs(events[i].time-(.03+i*.25))<1e-9,'Use audio time without accumulating timer drift');
assert.equal(highlights.at(-1),0,'Wrap to the first beat');
const before=events.length;advance(25);assert.equal(events.length,before+1,'A long stall must not replay missed bars');
assert.equal(events.at(-1).event.count,'1');
const stale=[...callbacks.values()];player.stop();stale.forEach(fn=>fn());advance(30);assert.equal(events.length,before+1);assert.equal(intervals.size,0);assert.equal(callbacks.size,0);
player.configure('six-eight',60);player.start();assert.equal(events.at(-1).duration,1/3);
player.configure('six-eight',120);advance(30.34);assert.equal(events.at(-1).duration,1/6,'Tempo affects the next subdivision');
player.start();assert.equal(intervals.size,1,'Repeated starts keep only one scheduler');player.stop();
console.log('PASS: all pattern meters, every chord mask, bass/root/fifth voicing, stroke direction, audio-clock spacing, bar wrapping, tempo changes, stalled-tab recovery and stop cleanup.');
