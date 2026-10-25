import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {CATALOG,getInstrument,notesFor,newProject,newTrack,validateProject,writtenOctave} from '../dist/catalog.js';
import {ART} from '../dist/instrument-art.js';
import {renderPatternScore} from '../dist/notation.js';
import {midiKeyMap} from '../dist/midi.js';
import {musicXML} from '../dist/musicxml.js';

test('added pitched instruments expose playable ranges, matching art hits, and familiar MIDI keys',()=>{
 assert.equal(CATALOG.length,38);
 const tim=getInstrument('timpani'),rec=getInstrument('sopranino-recorder');
 assert.equal(notesFor(tim)[0].note,36);assert.equal(notesFor(tim).at(-1).note,57);
 assert.deepEqual(ART.timpani.hits.map(h=>notesFor(tim)[h.noteIndex].note),[41,48]);
 assert.equal(midiKeyMap(tim).find(n=>n.input===60).note,36);
 assert.equal(midiKeyMap(rec).find(n=>n.input===65).note,77);
 assert.equal(writtenOctave(getInstrument('soprano-xylophone')),-12);
});

test('two parts of the same instrument keep separate notes, labels, and edit targets in notation',async()=>{
 const dom=new JSDOM('<div id="score"></div>',{runScripts:'outside-only'}),w=dom.window;
 w.HTMLCanvasElement.prototype.getContext=()=>({measureText:t=>({width:String(t).length*7}),save(){},restore(){}});
 w.eval(await fs.readFile(new URL('../dist/vendor/vexflow.js',import.meta.url),'utf8'));
 const p=newProject();p.bars=1;p.meter='3/4';p.tracks=[newTrack('soprano-xylophone'),newTrack('soprano-xylophone')];
 p.tracks.forEach((t,i)=>{t.id='part-'+i;t.name='Soprano xylophone '+(i?'II':'I');t.events=[{id:'note-'+i,beat:i,duration:1,note:i?76:72,velocity:.7,shift:0}]});
 validateProject(p);const edits=[],container=w.document.querySelector('#score');
 renderPatternScore(container,p,p.tracks.map(t=>t.id),.5,{flow:w.Vex.Flow,onNote:(...args)=>edits.push(args)});
 assert.deepEqual([...container.querySelectorAll('h4')].map(e=>e.textContent),p.tracks.map(t=>t.name+' · sounds one octave higher · mm. 1–1'));
 const buttons=[...container.querySelectorAll('[aria-label^="Edit"]')];assert.equal(buttons.length,2);
 buttons.forEach(b=>b.dispatchEvent(new w.MouseEvent('click',{bubbles:true})));assert.deepEqual(edits.map(args=>args.slice(0,2)),[['part-0',0],['part-1',0]]);
 const xml=musicXML(p);assert.match(xml,/<part-name>Soprano xylophone I<\/part-name>/);assert.match(xml,/<part-name>Soprano xylophone II<\/part-name>/);assert.equal((xml.match(/<octave-change>1<\/octave-change>/g)||[]).length,2);
 dom.window.close();
});
