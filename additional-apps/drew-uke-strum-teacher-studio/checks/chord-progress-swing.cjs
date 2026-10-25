// Deterministic audio-time checks for the visual chord cue and melody feel.
const assert=require('node:assert/strict'),M=require('../dist/melody-model.js');
const {run,el,advance}=require('./classroom.cjs');
const close=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const make=(meter='4/4',notes=[])=>M.normalize({meter,key:'C',tempo:60,swing:100,measures:[{notes}]});
const note=(duration='8',extra={})=>({pitch:'c/4',duration,...extra});
(async()=>{
 let s=make('4/4',Array.from({length:8},()=>note()));let plan=M.timeline(s);assert.deepEqual(plan.events.map(e=>e.time),[0,.75,1,1.75,2,2.75,3,3.75]);assert.deepEqual(plan.events.map(e=>e.length),[.75,.25,.75,.25,.75,.25,.75,.25]);assert.equal(plan.total,4);
 s.swing=0;assert.deepEqual(M.timeline(s).events.map(e=>e.time),[0,.5,1,1.5,2,2.5,3,3.5]);s.swing=67;close(M.timeline(s).events[1].time,.6675);
 s=make('4/4',[note('8',{rest:true}),note(),note('q'),note('h')]);assert.equal(M.timeline(s).events[0].rest,true);assert.equal(M.timeline(s).events[1].time,.75);assert.equal(M.timeline(s).events[2].time,1);
 s=make('4/4',[note('8',{dotted:true}),note('16'),note(),note(),note('h')]);assert.deepEqual(M.timeline(s).events.map(e=>e.time),[0,.75,1,1.75,2]);
 for(const duration of ['h','q','8','16','32']){s=make('4/4',[note(duration,{dotted:true})]);close(M.timeline(s).events[0].length,M.ticks(s.measures[0].notes[0])/16);}
 for(const meter of Object.keys(M.meters)){s=make(meter,Array.from({length:M.capacity(meter)/8},()=>note()));const straight=M.timeline({...s,swing:0}),swung=M.timeline(s);assert.equal(swung.total,straight.total);if(meter.endsWith('/8'))assert.deepEqual(swung.events,straight.events);for(let i=0;i<swung.events.length;i++){assert(swung.events[i].length>0);if(i+1<swung.events.length)close(swung.events[i].time+swung.events[i].length,swung.events[i+1].time);}}
 s=make();delete s.swing;assert.equal(M.normalize(s).swing,0);s.swing=999;assert.equal(M.normalize(s).swing,100);assert.equal(M.normalize({...s,swing:-20}).swing,0);assert.equal(M.normalize({...s,swing:67}).swing,67);assert.equal(M.feelMark({...s,swing:67}),'Swing eighths');assert.equal(M.feelMark({...s,meter:'6/8'}),'');
 run("loadSong(template('Cue check','4/4',60,'basic-4',['C','G','C'],[]),false);song.playCount=1;song.loop=false;transport.countUntil=0;");
 for(const [phase,expected]of [[0,0],[2,.25],[4,.5],[7.8,.975]])close(run(`chordCueWindow(${phase}).progress`),expected);
 assert.equal(run('chordCueWindow(8).chord'),'C');close(run('chordCueWindow(8).progress'),0);assert.equal(run('chordCueWindow(16)'),null);
 run("updateChordProgress(4)");assert.equal(el('nextProgress').hidden,false);assert.equal(el('nextProgressFill').style.transform,'scaleX(0.5)');assert.equal(el('nextLabel').textContent,'Up next');assert(!/[0-9]/.test(el('nextCount').textContent));run('updateChordProgress(16)');assert.equal(el('nextProgress').hidden,true);
 run("song.measures[0].chords=[{step:0,chord:'C'},{step:1,chord:'G'}];song.swing=.33;");close(run('chordCueWindow(1).end'),1.33);assert.equal(run('chordCueWindow(1.32).chord'),'G');close(run('chordCueWindow(1.33).progress'),0);assert.equal(run('chordCueWindow(1.34).current'),'G');
 close(run('chordCueWindow(-4,true).progress'),.5);close(run('chordCueWindow(0,true).progress'),1);
 run("song.swing=0;song.measures[0].chords=[{step:0,chord:'C'}];song.loop=true;");assert.equal(run('chordCueWindow(23).chord'),'G');close(run('chordCueWindow(24).progress'),.5); // C continues through the loop boundary.
 run("activeRange={start:1,end:3,loop:true};");assert.equal(run('chordCueWindow(23).chord'),'G');close(run('chordCueWindow(24).progress'),0);
 run("activeRange=null;song.loop=false;transport.state='finished';updateTransport()");assert.equal(el('nextProgress').hidden,true);
 run("stop();$('countIn').checked=false;");await run('start()');await advance(1080);const before=el('nextProgressFill').style.transform;run('pause()');await advance(700);assert.equal(el('nextProgressFill').style.transform,before);run('stop()');assert.equal(el('nextProgressFill').style.transform,'scaleX(0)');
 console.log('PASS: swing timing, rests, literal rhythms, all meters, beat/bar length, stored/default values, print marking; continuous chord progress, swung changes, count-in, looping, ranges, pause, stop, and completion.');
})().catch(e=>{console.error(e);process.exitCode=1;});
