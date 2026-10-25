import test from 'node:test';
import assert from 'node:assert/strict';
import {SOPRANO_KEYS,arrangeStack,pitchStackLayout,frequency,defaultBoard,validateBoard,defaultProject,validateProject,changeView,rememberView} from '../dist/core.js';
test('vertical pitch stacks stay ordered, centered, and separated across screen sizes',()=>{
 for(const width of [180,320,720])for(const height of [180,320,600,900])for(const count of [1,3,6,9,SOPRANO_KEYS.length,80]){
  const notes=Array.from({length:count},(_,i)=>({id:String(i),key:SOPRANO_KEYS[i%SOPRANO_KEYS.length],x:10,y:10}));
  const copy=structuredClone(notes),layout=pitchStackLayout(notes,{width,height,size:104});
  assert.deepEqual(notes,copy,'display layout must not overwrite custom positions');
  assert.ok(layout.size>=60);assert.ok(layout.size<=104);assert.ok(layout.height>=height);
  assert.equal(new Set(layout.positions.map(p=>p.x)).size,1);
  for(let i=0;i<count;i++){
   const p=layout.positions[i];assert.equal(p.x,width/2);assert.ok(p.y-layout.size/2>=17.99);assert.ok(p.y+layout.size/2<=layout.height-17.99);
   if(i){const prev=layout.positions[i-1];assert.ok(p.y-prev.y>=layout.size+13.99);assert.ok(frequency(notes[Number(prev.id)].key)>=frequency(notes[Number(p.id)].key));}
  }
 }
});
test('manual note size extends the canvas; custom arrangements remain available',()=>{
 const notes=arrangeStack(SOPRANO_KEYS);notes[0].x=15;notes[0].y=75;
 const manual=pitchStackLayout(notes,{width:300,height:500,size:132,fit:false});assert.equal(manual.size,132);assert.equal(manual.scrolls,true);
 const custom=pitchStackLayout(notes,{width:300,height:500,size:104,layout:'custom'}),p=custom.positions[0],b=custom.bounds;
 assert.equal(p.x,b.minX+.15*(b.maxX-b.minX));assert.equal(p.y,b.minY+.75*(b.maxY-b.minY));
 const vertical=arrangeStack(SOPRANO_KEYS);assert.ok(vertical.every(n=>n.x===50));
});
test('teaching views remember independent panels without changing lesson content',()=>{
 const board=defaultBoard();assert.equal(board.view,'stack');assert.equal(board.showRecorder,false);assert.equal(board.showStack,true);
 const notes=structuredClone(board.notes);changeView(board,'fingerings');assert.equal(board.showStaff,true);assert.equal(board.showRecorder,true);assert.equal(board.showStack,false);
 board.showStack=true;board.showStaff=false;changeView(board,'song');assert.equal(board.showScore,true);board.scoreMode='collapsed';
 changeView(board,'fingerings');assert.equal(board.showStaff,false);assert.equal(board.showStack,true);changeView(board,'song');assert.equal(board.scoreMode,'collapsed');
 assert.deepEqual(board.notes,notes);board.showRecorder=false;board.showStack=false;board.showStaff=false;board.showScore=false;rememberView(board);
 const project=defaultProject();project.board=board;const restored=validateProject(JSON.parse(JSON.stringify(project)));
 assert.equal(restored.board.showScore,false);changeView(restored.board,'song',true);assert.equal(restored.board.showScore,true);assert.equal(restored.board.scoreMode,'open');
 assert.throws(()=>validateBoard({...board,scoreMode:'broken'}));assert.throws(()=>validateBoard({...board,viewLayouts:{stack:{showStack:'yes'}}}));
});
test('old lesson layouts migrate without losing notes or deliberate stack coordinates',()=>{
 const project=defaultProject();project.meta.version='3.0';delete project.board.view;delete project.board.viewLayouts;delete project.board.stackLayout;
 project.board.showRecorder=true;project.stack=[{id:'old',key:'B5',x:22,y:73}];
 const migrated=validateProject(project);assert.equal(migrated.board.view,'stack');assert.equal(migrated.board.showRecorder,false);assert.equal(migrated.board.stackLayout,'vertical');assert.equal(migrated.stack[0].x,22);assert.equal(migrated.stack[0].y,73);
});
