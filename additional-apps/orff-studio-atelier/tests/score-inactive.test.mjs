import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {JSDOM} from 'jsdom';
import {newProject,newTrack,scoreProject,validateProject} from '../dist/catalog.js';import {renderPatternScore} from '../dist/notation.js';import {musicXML} from '../dist/musicxml.js';
import {ensureSong,compileSong} from '../dist/song.js';
const dom=new JSDOM('<div id="score"></div>',{runScripts:'outside-only'}),w=dom.window,el=w.document.querySelector('#score');
w.HTMLCanvasElement.prototype.getContext=()=>({measureText:t=>({width:t.length*7}),save(){},restore(){}});w.eval(await fs.readFile(new URL('../dist/vendor/vexflow.js',import.meta.url),'utf8'));
const marks=[],clefs=[],meters=[];class Stave extends w.Vex.Flow.Stave{addClef(...args){clefs.push(args);return super.addClef(...args)}addTimeSignature(...args){meters.push(args);return super.addTimeSignature(...args)}}
function render(p,{layout='teacher',ids=p.tracks.map(t=>t.id),continuous=false}={}){el.innerHTML='';marks.length=clefs.length=meters.length=0;const proto=w.Vex.Flow.SVGContext.prototype,original=proto.fillText;proto.fillText=function(text,...args){marks.push(String(text));return original.call(this,text,...args)};try{renderPatternScore(el,scoreProject(p),ids,.25,{flow:{...w.Vex.Flow,Stave},layout,continuous});}finally{proto.fillText=original;}}
const systems=()=>[...el.querySelectorAll('.score-system')];
const names=system=>[...system.querySelectorAll('.score-staff')].map(staff=>staff.dataset.trackId);
function fixture(){const p=newProject();p.title='Changing ensemble';p.bars=20;p.notation={teacherMeasures:4};p.tracks=['soprano-xylophone','alto-xylophone','bass-xylophone','hand-drums'].map(newTrack);
 const note=(beat,note,id,duration=1)=>({id,beat,note,duration,writtenDuration:duration,shift:0,velocity:.8});
 for(const [i,t]of p.tracks.entries())t.events=i===3?[note(32,41,'drum-a'),note(48,43,'drum-b')]:[note(0,72-i*12,'a-'+i),note(16,72-i*12,'a2-'+i),note(64,72-i*12,'return-'+i)];
 p.sectionMarkers=[{bar:0,beat:0,name:'A'},{bar:8,beat:32,name:'B'},{bar:16,beat:64,name:'A'}];return p;}
test('full score hides drums during A, hides xylophones at measure 9, then restores their full labels',()=>{
 const p=fixture(),before=JSON.stringify(p),ids=p.tracks.map(t=>t.id);render(p);
 assert.deepEqual(systems().map(s=>+s.dataset.firstMeasure),[1,5,9,13,17]);assert.deepEqual(systems().map(names),[ids.slice(0,3),ids.slice(0,3),[ids[3]],[ids[3]],ids.slice(0,3)]);
 assert.match(systems()[2].querySelector('h4').textContent,/Hand drums/);assert.match(systems()[4].querySelector('h4').textContent,/Soprano xylophone/);assert.match(systems()[1].querySelector('h4').textContent,/^SX/);
 assert.ok(marks.includes('B'));assert.ok(marks.includes('9'));assert.equal(clefs.length,11);assert.equal(meters.length,7);assert.equal(JSON.stringify(p),before);
});
test('section boundaries split a four-measure system cleanly; numbering and partial last systems stay intact',()=>{
 const p=fixture();p.bars=7;p.tracks[0].events=[{id:'a',beat:0,note:72,duration:1,velocity:.8}];p.tracks=p.tracks.slice(0,1);p.sectionMarkers=[{bar:0,name:'A'},{bar:3,name:'B'},{bar:5,name:'C'}];render(p);
 assert.deepEqual(systems().map(s=>[+s.dataset.firstMeasure,+s.dataset.measureCount]),[[1,3],[4,2],[6,2]]);assert.ok(marks.includes('B'));assert.ok(marks.includes('C'));
});
test('sustained written notes remain visible across systems and short rests never remove a playing staff',()=>{
 const p=fixture();p.bars=12;p.tracks[0].events=[{id:'held',beat:30,note:72,duration:1,writtenDuration:4,velocity:.8}];p.tracks[1].events=[];p.tracks[2].events=[];p.tracks[3].events=[{id:'drum',beat:36,note:41,duration:1,velocity:.8}];render(p);
 assert.deepEqual(names(systems()[2]),[p.tracks[0].id,p.tracks[3].id]);assert.ok(systems()[2].querySelector('[data-event-id="held"]'));
});
test('all-rest systems remain countable; show-all, individual parts and continuous video retain staves',()=>{
 const p=fixture(),ids=p.tracks.map(t=>t.id);p.tracks.forEach(t=>t.events=[]);render(p);assert.ok(systems().every(s=>names(s).length===4));
 const full=fixture();full.notation.hideInactiveStaves=false;render(full);assert.ok(systems().every(s=>names(s).length===4));
 full.notation.hideInactiveStaves=true;render(full,{layout:'part',ids:[full.tracks[3].id]});assert.ok(systems().every(s=>names(s).length===1));assert.equal(systems().reduce((sum,s)=>sum+ +s.dataset.measureCount,0),20);
 render(full,{layout:'part',continuous:true});assert.ok(systems().every(s=>names(s).length===4));
});
test('layout choice saves, validates and compiles while MusicXML retains every instrument',()=>{
 const p=fixture();delete p.sectionMarkers;p.notation.hideInactiveStaves=false;ensureSong(p);const loaded=validateProject(JSON.parse(JSON.stringify(p)));assert.equal(compileSong(loaded).notation.hideInactiveStaves,false);
 assert.equal((musicXML(p).match(/<score-part id=/g)||[]).length,4);p.notation.hideInactiveStaves='yes';assert.throws(()=>validateProject(p),/inactive-staff/);
});
test('custom score order remains consistent among only the visible instruments',()=>{
 const p=fixture();p.notation.partOrder=[...p.tracks].reverse().map(t=>t.id);render(p);assert.deepEqual(names(systems()[0]),p.notation.partOrder.slice(1));assert.deepEqual(names(systems()[2]),p.notation.partOrder.slice(0,1));
});
test.after(()=>dom.window.close());
