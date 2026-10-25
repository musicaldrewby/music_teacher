import assert from 'node:assert/strict';
import fs from 'node:fs';
import {STRINGS,CHORDS,chordAllows,allowedIndices,crossedStrings,combineChords} from '../dist/music.js';
import {AutoharpAudio} from '../dist/engine.js';
assert.equal(STRINGS.length,36);assert.equal(new Set(STRINGS).size,36);
assert.deepEqual(STRINGS,[41,43,48,50,52,53,54,55,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84]);
assert.ok(STRINGS.every((m,i)=>i===0||m>STRINGS[i-1]));
assert.equal(CHORDS.length,21);
const expected={C:[0,4,7],Am:[9,0,4],F:[5,9,0],G7:[7,11,2,5],'E♭':[3,7,10],'B♭7':[10,2,5,8]};
for(const [name,notes] of Object.entries(expected)){const c=CHORDS.find(c=>c.name===name);assert.deepEqual(c.pcs,notes);assert.ok(allowedIndices(c).length>=7);for(const midi of STRINGS)if(chordAllows(c,midi))assert.ok(notes.includes(midi%12));}
for(const c of CHORDS){assert.ok(allowedIndices(c).length>0);assert.ok(c.pcs.every(pc=>STRINGS.some(m=>m%12===pc)));}
assert.equal(allowedIndices(null).length,36);
assert.deepEqual(CHORDS.map(c=>c.name),['E♭','B♭','F','C','G','D','A','F7','C7','G7','D7','A7','E7','B7','A♭','B♭7','Cm','Gm','Dm','Am','Em']);
assert.deepEqual(['major','seventh','minor'].map(q=>CHORDS.filter(c=>c.quality===q).length),[8,8,5]);
assert.equal(new Set(CHORDS.map(c=>[...c.pcs].sort().join(','))).size,21);
// Bass openings transcribed from the OS21 felt-bar diagrams, not triad inversions.
assert.deepEqual(CHORDS.map(c=>allowedIndices(c).slice(0,3).map(i=>STRINGS[i])),[
  [58,63,67],[53,58,62],[41,48,53],[48,55,60],[43,50,55],[50,57,62],[57,61,64],
  [41,48,53],[48,55,58],[43,50,55],[50,54,57],[57,61,64],[52,59,62],[59,63,66],
  [60,63,68],[53,58,62],[48,55,60],[43,50,55],[50,57,62],[57,60,64],[52,55,59]
]);
for(const name of ['F','F7']){const c=CHORDS.find(c=>c.name===name);assert.ok(chordAllows(c,41)&&chordAllows(c,84));assert.ok(!chordAllows(c,43)&&!chordAllows(c,83));}
const bar=name=>CHORDS.find(c=>c.name===name);
assert.equal(combineChords([]),null);assert.equal(combineChords([bar('C'),bar('C')]),bar('C'));
assert.deepEqual(allowedIndices(combineChords([bar('C'),bar('Am')])).map(i=>STRINGS[i]),[60,64,72,76,84]);
assert.deepEqual(allowedIndices(combineChords([bar('C'),bar('D')])),[]);
assert.equal(allowedIndices(combineChords(CHORDS)).length,0);
for(const a of CHORDS)for(const b of CHORDS)for(const midi of STRINGS)assert.equal(chordAllows(combineChords([a,b]),midi),chordAllows(a,midi)&&chordAllows(b,midi));

const xs=STRINGS.map((_,i)=>210+i*15.15);
assert.deepEqual(crossedStrings(200,760,xs),STRINGS.map((_,i)=>i));
assert.deepEqual(crossedStrings(760,200,xs),STRINGS.map((_,i)=>35-i));
const split=[...crossedStrings(200,xs[15],xs),...crossedStrings(xs[15],760,xs)];assert.deepEqual(split,STRINGS.map((_,i)=>i));
assert.deepEqual(crossedStrings(250,250,xs),[]);
class Param{value=0;setTargetAtTime(v){this.value=v;}setValueAtTime(v){this.value=v;}linearRampToValueAtTime(v){this.value=v;}cancelScheduledValues(){}cancelAndHoldAtTime(){}}
class Node{gain=new Param();frequency=new Param();Q=new Param();pan=new Param();connect(){}disconnect(){}start(t){this.startAt=t;}stop(t){this.stopAt=t;}}
const engine=new AutoharpAudio();engine.ctx={currentTime:1,state:'running',createBufferSource:()=>new Node(),createGain:()=>new Node(),createBiquadFilter:()=>new Node(),createStereoPanner:()=>new Node()};engine.ready=true;engine.body=new Node();engine.buffers=STRINGS.map(()=>({duration:5}));
const C=CHORDS.find(c=>c.name==='C'),G=CHORDS.find(c=>c.name==='G');engine.setChord(C);
const ci=STRINGS.indexOf(60),ei=STRINGS.indexOf(64),gi=STRINGS.indexOf(67),fi=STRINGS.indexOf(65);
assert.equal(engine.pluck(fi),false);assert.equal(engine.pluck(ci),true);assert.equal(engine.pluck(ei),true);assert.equal(engine.pluck(gi),true);
const cVoice=engine.active[ci][0],eVoice=engine.active[ei][0],gVoice=engine.active[gi][0];engine.setChord(G);
assert.equal(cVoice.damped,true);assert.equal(eVoice.damped,true);assert.equal(gVoice.damped,false);
engine.pluck(gi);assert.equal(gVoice.damped,true);assert.equal(engine.active[gi].at(-1).damped,false);
engine.setChord(null);engine.pluck(fi);assert.equal(engine.active[fi].at(-1).damped,false);
// A bar change must cancel a scheduled, not-yet-audible non-chord string.
engine.pluck(ci,.6,.45,2);const scheduled=engine.active[ci].at(-1);engine.setChord(G);assert.equal(scheduled.damped,true);assert.ok(scheduled.source.stopAt<scheduled.source.startAt);engine.setChord(null);assert.equal(scheduled.damped,true,'Releasing a bar never resurrects an already damped voice');
engine.dampAll();assert.ok([...engine.voices].every(v=>v.damped&&Number.isFinite(v.source.stopAt)));
for(const v of [...engine.voices])v.source.onended();assert.equal(engine.voices.size,0);
const manifest=JSON.parse(fs.readFileSync(new URL('../dist/audio/presets-v1/manifest.json',import.meta.url),'utf8'));
assert.equal(manifest.presets.length,6);
for(const preset of manifest.presets){assert.deepEqual(preset.notes,STRINGS);for(const midi of STRINGS){const bytes=fs.readFileSync(new URL(`../dist/audio/presets-v1/${preset.id}/${midi}.mp3`,import.meta.url));assert.equal(bytes.toString('ascii',0,3),'ID3');assert.ok(bytes.length>10000);}}
const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
for(const m of app.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.includes(m[1]),`Missing DOM element ${m[1]}`);
console.log('PASS: tuning range, 21 chord masks, bidirectional sweeps, boundary crossings, chord-change damping, repeat plucks, all-stop cleanup, 216 SoundFont assets, DOM targets.');
