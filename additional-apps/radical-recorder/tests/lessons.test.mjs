import test from 'node:test';
import assert from 'node:assert/strict';
import {SONG_LIBRARY} from '../dist/data.js';
import {defaultProject,validateProject,validateBoard,notesInSong,songId,quantizeNotes,arrangeStack} from '../dist/core.js';
import {makeMeasures,phraseWindows,rangeNotes} from '../dist/score.js';
test('notation preserves every original duration, pitch, and total across all 15 songs',()=>{
 for(const song of SONG_LIBRARY){const measures=makeMeasures(song),pieces=measures.flatMap(m=>m.pieces);assert.ok(measures.length);assert.ok(pieces.length>=song.notes.length);assert.equal(measures.at(-1).end,song.notes.reduce((sum,n)=>sum+n.d,0));
 for(let i=0;i<song.notes.length;i++){const parts=pieces.filter(p=>p.sourceIndex===i);assert.equal(parts.reduce((n,p)=>n+p.end-p.start,0),song.notes[i].d);assert.ok(parts.every(p=>p.key===song.notes[i].k));if(song.notes[i].k){assert.equal(parts[0].tieIn,false);assert.equal(parts.at(-1).tieOut,false);}}
 for(const m of measures)assert.ok(m.pieces.reduce((sum,n)=>sum+n.units,0)<=m.capacity+.00001);
 }
});
test('pickups, compound meter, and long ties produce correct measure boundaries',()=>{
 const grace=makeMeasures(SONG_LIBRARY[12]);assert.equal(grace[0].number,0);assert.equal(grace[0].end,600);assert.equal(grace[1].capacity,3);
 const row=makeMeasures(SONG_LIBRARY[11]);assert.equal(row[0].capacity,3);assert.equal(row[0].end,1800);
 const held={title:'Tie',notes:[{k:'B5',d:3000}],score:{bpm:100,meter:'4/4',pickup:0,quantized:true}};const m=makeMeasures(held);assert.equal(m.length,2);assert.equal(m[0].pieces[0].tieOut,true);assert.equal(m[1].pieces[0].tieIn,true);assert.equal(m[1].pieces[0].units,1);
});
test('phrase ranges trim held notes without losing their source-index relationship',()=>{
 const song={notes:[{k:'B5',d:3000},{k:'A5',d:600}]};assert.deepEqual(rangeNotes(song,2400,3600),[{k:'B5',d:600,sourceIndex:0,absolute:2400},{k:'A5',d:600,sourceIndex:1,absolute:3000}]);
 const measures=makeMeasures(SONG_LIBRARY[0]),phrases=phraseWindows(measures);assert.equal(phrases[0].first,0);assert.equal(phrases[0].last,1);assert.equal(phrases.at(-1).end,measures.at(-1).end);
});
test('free recordings need an explicit snap step; snapping produces readable rhythmic units',()=>{
 const notes=[{k:'B5',d:284},{k:null,d:42},{k:'A5',d:313},{k:null,d:19},{k:'G5',d:576}];
 assert.deepEqual(makeMeasures({notes}),[]);const snap=quantizeNotes(notes,100);assert.ok(snap.every(n=>n.d%300===0));assert.ok(snap.filter(n=>n.k).length===3);assert.equal(snap.at(-1).k,'G5');assert.ok(makeMeasures({notes:snap,score:{bpm:100,meter:'4/4',pickup:0,quantized:true}}).length>0);
});
test('saved lessons and per-song stacks round-trip and preserve deliberate positions',()=>{
 const p=defaultProject();p.board.song=structuredClone(SONG_LIBRARY[0]);p.board.mode='teach';p.board.notes.soprano=notesInSong(p.board.song);p.board.tempo=75;p.board.notation='staff-letters';p.board.noteSize=100;p.board.phrase=1;p.board.showRecorder=false;p.stack=[{id:'moved',key:'B5',x:17,y:73}];p.layouts[songId(p.board.song)]=structuredClone(p.stack);p.lessons=[{id:'lesson-1',title:'BAG warm-up',board:structuredClone(p.board),stack:structuredClone(p.stack)}];
 const restored=validateProject(JSON.parse(JSON.stringify(p)));assert.equal(restored.lessons[0].board.tempo,75);assert.equal(restored.lessons[0].board.notation,'staff-letters');assert.equal(restored.lessons[0].board.showRecorder,false);assert.equal(restored.lessons[0].stack[0].x,17);assert.equal(restored.layouts[songId(p.board.song)][0].y,73);assert.equal(restored.board.song.score.meter,'4/4');assert.equal(songId(restored.board.song),songId(p.board.song));
 assert.throws(()=>validateBoard({...p.board,tempo:0}));assert.throws(()=>validateBoard({...p.board,notation:'html'}));
});
test('automatic song notes contain only used pitches, and legacy note selections survive migration',()=>{
 assert.deepEqual(notesInSong(SONG_LIBRARY[0]),['B5','A5','G5']);assert.deepEqual(arrangeStack(['G5','B5','A5']).map(n=>n.key),['B5','A5','G5']);
 const migrated=validateProject({meta:{appName:'RadicalRecorder'},settings:{sopranoOrder:'E5, D5'},library:[]});assert.deepEqual(migrated.board.notes.soprano,['E5','D5']);
});
