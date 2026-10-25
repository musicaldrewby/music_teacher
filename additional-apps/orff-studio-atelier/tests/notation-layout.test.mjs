import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {JSDOM} from 'jsdom';
import {renderPatternScore,notationVoices} from '../dist/notation.js';import {newProject,newTrack,scoreProject} from '../dist/catalog.js';import {musicXML} from '../dist/musicxml.js';
const dom=new JSDOM('<div id="score"></div>',{runScripts:'outside-only'}),w=dom.window;w.HTMLCanvasElement.prototype.getContext=()=>({measureText:t=>({width:t.length*7}),save(){},restore(){}});w.eval(await fs.readFile(new URL('../dist/vendor/vexflow.js',import.meta.url),'utf8'));const el=w.document.querySelector('#score');
function piece(id,events,bars=2){const p=newProject();p.bars=bars;const t=newTrack(id);t.events=events.map((e,i)=>({id:'n'+i,velocity:.8,shift:0,...e}));p.tracks=[t];return p}
const captured=[];class Note extends w.Vex.Flow.StaveNote{constructor(o){super(o);captured.push(this)}}
function render(p,onNote){el.innerHTML='';captured.length=0;renderPatternScore(el,scoreProject(p),p.tracks.map(t=>t.id),.25,{flow:{...w.Vex.Flow,StaveNote:Note},onNote});}
test('dense passages get one measure per system, aligned across teacher parts',()=>{const p=piece('alto-xylophone',Array.from({length:32},(_,i)=>({beat:i*.25,duration:.25,note:60+i%8})));const t=newTrack('bass-xylophone');t.events=[{id:'bass',beat:0,duration:4,note:48,velocity:.8}];p.tracks.push(t);render(p);assert.equal(el.querySelectorAll('.score-system').length,2);assert.equal(el.querySelectorAll('.score-staff').length,4);const first=captured.filter(n=>!n.isRest()&&n.getAbsoluteX());assert.ok(first.length>=33);});
test('single voices use up stems below the middle line and down stems above',()=>{render(piece('alto-xylophone',[{beat:0,duration:1,note:60},{beat:1,duration:1,note:84}],1));assert.deepEqual(captured.filter(n=>!n.isRest()).map(n=>n.getStemDirection()),[1,-1]);});
test('equal-duration simultaneous notes form editable chords and MusicXML chords',()=>{const p=piece('alto-xylophone',[{beat:0,duration:2,note:60},{beat:0,duration:2,note:64},{beat:2,duration:1,note:67}],1),edits=[];render(p,(...args)=>edits.push(args));assert.equal(captured.filter(n=>!n.isRest())[0].keys.length,2);const heads=el.querySelectorAll('[aria-label^="Edit chord note"]');assert.equal(heads.length,2);heads[1].dispatchEvent(new w.MouseEvent('click',{bubbles:true}));assert.equal(edits[0][1],1);assert.match(musicXML(p),/<chord\/>/);assert.equal(notationVoices(scoreProject(p),p.tracks[0],.25,{chords:true}).length,1);});
test('independent durations retain opposite stems and separate MusicXML voices',()=>{const p=piece('alto-xylophone',[{beat:0,duration:2,note:60},{beat:0,duration:1,note:72}],1);render(p);assert.deepEqual(captured.filter(n=>!n.isRest()).map(n=>n.getStemDirection()),[1,-1]);assert.match(musicXML(p),/<backup>/);});
test('optional chord pitch names share one readable label below the lowest note',()=>{
 const p=piece('alto-xylophone',[{beat:0,duration:1,note:60},{beat:0,duration:1,note:64},{beat:0,duration:1,note:67}],1);p.notation={noteNames:true};render(p);
 const labels=[...el.querySelectorAll('.musical-expression text')];assert.deepEqual(labels.map(n=>n.textContent),['C–E–G']);assert.equal(labels[0].getAttribute('text-anchor'),'middle');
 assert.ok(+labels[0].getAttribute('y')>Math.max(...captured.find(n=>!n.isRest()).getYs()));
});
test('percussion keys repeat and distinguish strokes, single-sound parts use one line',async()=>{for(const id of ['guiro','agogo-bells','claves','wind-chimes']){const p=piece(id,[],2);p.notation={measures:1};render(p);assert.equal(el.querySelectorAll('.score-legend').length,2);assert.ok(el.querySelector('.stroke-key svg'));if(id==='guiro')assert.match(el.textContent,/Short scrape = bottom lineLong scrape = second line/);if(id==='agogo-bells')assert.match(el.textContent,/Low = bottom lineHigh = second line/);if(id==='claves')assert.match(musicXML(p),/<staff-lines>1<\/staff-lines>/);}
});
test('percussion noteheads sit on the exact lines named in the key',()=>{render(piece('guiro',[{beat:0,duration:1,note:73},{beat:1,duration:1,note:74}],1));const notes=captured.filter(n=>!n.isRest()).slice(-2);assert.equal(notes[0].getYs()[0],notes[0].getStave().getYForLine(4));assert.equal(notes[1].getYs()[0],notes[1].getStave().getYForLine(3));render(piece('claves',[{beat:0,duration:1,note:75}],1));const one=captured.filter(n=>!n.isRest()).at(-1);assert.equal(one.getYs()[0],one.getStave().getYForLine(2));});
test('uploaded four-measure example retains paired eighths and shows isolated strikes as quarters',async()=>{
 const data=[[0,60],[.5,64],[1,67],[1.5,72],[2,71],[3,69],[4,67],[5,65],[6,64],[8,62],[8.5,65],[9,64],[9.5,62],[10,60],[12,60],[13,67],[14,60]];
 const p=piece('alto-xylophone',data.map(([beat,note])=>({beat,note,duration:beat===6?1:.5})),4);const original=JSON.stringify(p.tracks);render(p);
 const bars=notationVoices(scoreProject(p),p.tracks[0],.25,{chords:true})[0];
 assert.deepEqual(bars.map(bar=>bar.map(t=>t.glyph+(t.rest?'r':''))),[['8','8','8','8','q','q'],['q','q','q','qr'],['8','8','8','8','q','qr'],['q','q','q','qr']]);assert.equal(JSON.stringify(p.tracks),original);
 if(process.env.RHYTHM_FIX_PROOF){const svgs=[...el.querySelectorAll('.score-staff>div:last-child>svg')];await fs.writeFile(process.env.RHYTHM_FIX_PROOF,`<svg xmlns="http://www.w3.org/2000/svg" width="820" height="500"><rect width="100%" height="100%" fill="white"/>${svgs.map((svg,i)=>`<g transform="translate(0 ${i*240})">${svg.outerHTML.replace(/\sstyle="[^"]*"/g,'')}</g>`).join('')}</svg>`);}
});
test('render proof sheets for visual inspection',async()=>{if(!process.env.NOTATION_PROOF)return;let y=30,body='';for(const [id,events]of [['guiro',Array.from({length:16},(_,i)=>({beat:i*.25,duration:.25,note:i%2?74:73}))],['agogo-bells',[{beat:0,duration:1,note:68},{beat:1,duration:1,note:67}]],['claves',[{beat:0,duration:1,note:75}]],['alto-xylophone',[{beat:0,duration:2,note:60},{beat:0,duration:2,note:64},{beat:2,duration:1,note:84}]]]){render(piece(id,events,1));body+=`<text x="20" y="${y}" font-size="20">${id}</text>`;y+=15;let k=0;for(const key of el.querySelectorAll('.stroke-key')){body+=`<g transform="translate(${k*240} ${y})">${key.querySelector('svg').outerHTML}<text x="95" y="40" font-size="12">${key.querySelector('span').textContent}</text></g>`;k++;}if(k)y+=75;for(const svg of el.querySelectorAll('.score-staff>div:last-child>svg')){body+=`<g transform="translate(0 ${y})">${svg.outerHTML.replace(/\sstyle="[^"]*"/g,'')}</g>`;y+=230;}}await fs.writeFile(process.env.NOTATION_PROOF,`<svg xmlns="http://www.w3.org/2000/svg" width="820" height="${y}" viewBox="0 0 820 ${y}"><rect width="100%" height="100%" fill="white"/>${body}</svg>`);});
test.after(()=>dom.window.close());
test('every score system follows Orff or custom order and student parts stay isolated',()=>{
 const p=piece('bass-xylophone',[],4);p.tracks.push(newTrack('triangle'),newTrack('alto-xylophone'),newTrack('soprano-recorder'));render(p);
 const expected=p.tracks.slice().reverse().map(t=>t.id);
 for(const system of el.querySelectorAll('.score-system'))assert.deepEqual([...system.querySelectorAll('.score-staff')].map(e=>e.dataset.trackId),expected);
 assert.match(el.querySelector('.score-system h4').textContent,/Soprano recorder \(SR\)/);
 assert.match(el.querySelectorAll('.score-system')[1].querySelector('h4').textContent,/^SR ·/);
 p.notation={partOrder:p.tracks.map(t=>t.id)};render(p);
 for(const system of el.querySelectorAll('.score-system'))assert.deepEqual([...system.querySelectorAll('.score-staff')].map(e=>e.dataset.trackId),p.notation.partOrder);
 el.innerHTML='';renderPatternScore(el,scoreProject(p),[p.tracks[0].id],.25,{flow:w.Vex.Flow});assert.ok([...el.querySelectorAll('.score-staff')].every(e=>e.dataset.trackId===p.tracks[0].id));
});

test('continuous video notation establishes clef and meter once; printed systems repeat them',()=>{
 let clefs=0,meters=0;class CountingStave extends w.Vex.Flow.Stave{addClef(...args){clefs++;return super.addClef(...args)}addTimeSignature(...args){meters++;return super.addTimeSignature(...args)}}
 const p=piece('alto-xylophone',[],4),flow={...w.Vex.Flow,Stave:CountingStave};
 const draw=(pattern,continuous)=>{el.innerHTML='';renderPatternScore(el,scoreProject(pattern),pattern.tracks.map(t=>t.id),.25,{flow,measures:2,continuous})};
 draw(p,true);assert.equal(clefs,1);assert.equal(meters,1);
 clefs=meters=0;draw({...p,bars:2,measureOffset:2},true);assert.equal(clefs,0);assert.equal(meters,0);
 draw(p,false);assert.equal(clefs,2);assert.equal(meters,2);
});
