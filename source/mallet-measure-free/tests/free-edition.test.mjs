import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CATALOG,newProject,newTrack,validateProject,notesFor} from '../dist/catalog.js';
import {ensureSong,syncSection} from '../dist/song.js';
const paidCatalog=new URL('../../mallet-measure-source/dist/catalog.js',import.meta.url);
const full=()=>{const p=newProject();p.tracks=CATALOG.slice(0,5).map(i=>newTrack(i.id));p.tracks[0].events=[{id:'note-1',beat:0,duration:1,note:48,velocity:.8,shift:0}];ensureSong(p);syncSection(p);return p};
test('all five hand drums save and reopen together on one track',async()=>{
 const p=newProject(),track=newTrack('hand-drums');
 track.events=[41,43,45,47,50].map((note,index)=>({id:'drum-'+index,beat:index,duration:.5,note,velocity:.8,shift:0}));
 p.tracks=[track];ensureSong(p);syncSection(p);
 const reopened=validateProject(JSON.parse(JSON.stringify(p)));
 assert.equal(reopened.tracks.length,1);assert.deepEqual(reopened.tracks[0].events,track.events);
 if(fs.existsSync(paidCatalog)){const {validateProject:paidValidate}=await import(paidCatalog.href);assert.deepEqual(paidValidate(JSON.parse(JSON.stringify(p))).tracks[0].events,track.events);}
 const invalid=structuredClone(p);invalid.tracks[0].events[0].note=42;assert.throws(()=>validateProject(invalid),/invalid hand-drum note/);
});
test('free project saves in a format the paid studio opens unchanged',{skip:!fs.existsSync(paidCatalog)},async()=>{const {validateProject:paidValidate}=await import(paidCatalog.href);const p=full(),saved=JSON.stringify(validateProject(p));assert.equal(paidValidate(JSON.parse(saved)).tracks.length,5);assert.equal(paidValidate(JSON.parse(saved)).tracks[0].events[0].note,48)});
test('reject oversized, multi-section and paid-instrument imports without trimming data',()=>{
 for(const change of [p=>p.tracks.push(newTrack('triangle')),p=>{p.bars=5},p=>p.sections.push({...p.sections[0],id:'extra'}),p=>p.arrangement[0].repeats=2,p=>p.tracks[0].instrument='alto-metallophone']){const p=full();change(p);const snapshot=JSON.stringify(p);assert.throws(()=>validateProject(p));assert.equal(JSON.stringify(p),snapshot)}
});
test('every offered instrument and bar setup has its artwork and audio bundled',()=>{
 assert.equal(CATALOG.length,8);assert.equal(notesFor(CATALOG.find(i=>i.id==='hand-drums')).length,5);
 const manifest=JSON.parse(fs.readFileSync(new URL('../dist/assets/audio/manifest.json',import.meta.url)));
 for(const i of CATALOG)for(const key of ['C','F','G','Bb+F#'])for(const n of notesFor(i,key)){
  const set=manifest.instrumentSamples[i.id],entry=set?.articulations?.[`${n.note}:${n.shift||0}`]||set?.notes?.[n.note]||(!set?.notes&&!set?.articulations?set:null),url=entry?.url||`assets/audio/${i.family}/${n.note}.mp3`;
  assert.ok(fs.existsSync(new URL('../dist/'+url,import.meta.url)),i.id+' '+url);
 }
});
test('paid publishing and notation modules are absent from free distribution',()=>{for(const file of ['notation.js','musicxml.js','video-export.js','midi.js','song-view.js','score-composer.js','mp3-worker.js'])assert.equal(fs.existsSync(new URL('../dist/'+file,import.meta.url)),false)});

test('all relative JavaScript imports resolve in the packaged app',()=>{const root=new URL('../dist/',import.meta.url);for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.js'))){const source=fs.readFileSync(new URL(file,root),'utf8');for(const match of source.matchAll(/(?:from\s*|import\s*)['"](\.\/[^'"]+\.js)['"]/g))assert.ok(fs.existsSync(new URL(match[1],root)),file+' imports missing '+match[1]);}});
