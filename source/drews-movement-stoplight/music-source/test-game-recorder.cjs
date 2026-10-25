const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),S=require('../dist/game-sequence.js');
const source=fs.readFileSync('dist/game-recorder.js','utf8'),settle=()=>new Promise(r=>setImmediate(r));
function harness({pending=false,storageFails=false}={}){
 const elements={},events={},saved={},videoCalls=[];let raf,interval,time=0,resolvePrepare;
 const el=id=>elements[id]??={value:'',hidden:false,open:false,checked:false,disabled:false,addEventListener(n,f){events[id+':'+n]=f},showModal(){this.open=true},close(){this.open=false},click(){this.onclick?.()},pause(){}};
 const ctx={get currentTime(){return time}};
 const music={prepare:()=>pending?new Promise(r=>resolvePrepare=r):Promise.resolve(ctx),clock:()=>time,setRandomSeed(){},cancelQueue(){}};
 const data={MOVES:[{id:'walk',name:'Walk',color:'#0f0'},{id:'jog',name:'Jog',color:'#00f'},{id:'hop',name:'Hop',color:'#f0f'}],STOP:{id:'stop',name:'Stop',color:'#f00'},getPreferences:()=>({selected:['walk','jog','hop']}),resetForRecording(){},finishRecording(){}};
 const window={MovementSequence:S,MovementData:data,MovementMusic:music,MovementVideoStudio:{openSequence(...args){videoCalls.push(args)}},crypto:{randomUUID:()=>String(Math.random())},addEventListener(n,f){events[n]=f}};
 const document={hidden:false,body:{classList:{toggle(){}}},activeElement:{blur(){}},getElementById:el,addEventListener(n,f){events[n]=f},createElement:()=>({click(){}})};
 vm.runInNewContext(source,{window,document,localStorage:{getItem:k=>saved[k]||null,setItem(k,v){if(storageFails)throw Error('quota');saved[k]=v},removeItem:k=>delete saved[k]},Blob,URL:{createObjectURL:()=>'',revokeObjectURL(){}},setTimeout(){},clearTimeout(){},setInterval:f=>{interval=f;return 1},clearInterval(){interval=null},requestAnimationFrame:f=>{raf=f;return 1},cancelAnimationFrame(){raf=null},confirm:()=>true});
 el('gameRepeats').value='1';
 return{elements,events,saved,window,document,videoCalls,open(){el('recordGameOpen').click();el('recordName').value='Test game';el('recordCountIn').checked=false;},start(){return el('recordBegin').onclick()},step(t){time=t;raf?.()},commit(id,t,silent=false){time=t;events.movementcommitted({detail:{id,time:t,silent}})},finish(){el('recordFinish').click()},resolve(){resolvePrepare(ctx)}};
}
(async()=>{
 const h=harness();h.open();await h.start();h.step(.06);h.step(25);assert.match(h.elements.recordTimer.textContent,/first movement/);h.commit('walk',25);h.commit('jog',27.4);h.commit('stop',29.8);h.commit('hop',32.2);h.step(37);h.finish();
 const games=JSON.parse(h.saved['movement-saved-games-v1']);assert.equal(games.length,1);assert.equal(games[0].name,'Test game');assert(Math.abs(S.total(games[0])-12)<1e-8,'waiting time excluded');assert.equal(games[0].blocks[1].id,'jog');assert(h.elements.gameStudio.open);assert(h.elements.recordDock.hidden);assert.equal(h.saved['movement-game-draft-v1'],undefined);
 h.elements.gameRepeats.value='3';h.elements.gameReplay.click();assert.equal(h.videoCalls[0][1],'3');assert.equal(h.videoCalls[0][2],true);h.elements.gameExport.click();assert.equal(h.videoCalls[1][2],false);
 h.elements.gameName.value='Renamed lesson';h.elements.gameName.onchange();assert.equal(h.window.MovementGames.list()[0].name,'Renamed lesson');assert.equal(h.elements.gameSaved.textContent,'Saved');h.elements.gameRepeats.value='5';h.elements.gameRepeats.onchange();assert.equal(h.window.MovementGames.list()[0].repeats,'5');
 h.elements.gameAdd.click();assert.equal(h.window.MovementGames.list()[0].blocks.length,5);h.elements.gameUndo.click();assert.equal(h.window.MovementGames.list()[0].blocks.length,4);
 const c=harness({pending:true});c.open();const starting=c.start();await settle();c.elements.recordSetupClose.click();c.resolve();await starting;assert.equal(c.window.MovementGames.list().length,0);assert.equal(c.elements.recordGameOpen.disabled,false);
 const hidden=harness();hidden.open();await hidden.start();hidden.step(.06);hidden.commit('walk',2);hidden.step(5);hidden.document.hidden=true;hidden.events.visibilitychange();assert.equal(hidden.window.MovementGames.list().length,1);assert.match(hidden.elements.gamesStatus.textContent,/tab was hidden/);
 const quota=harness({storageFails:true});quota.open();await quota.start();quota.step(.06);quota.commit('walk',1);quota.step(4);quota.finish();assert.equal(quota.window.MovementGames.list().length,1);assert.match(quota.elements.gamesStatus.textContent,/Download your game file/);
 assert(!source.includes('MediaRecorder('));assert(!source.includes('captureStream('));
 console.log('PASS: audio-clock action capture, wait exclusion, saved blocks, replay/export handoff, add/undo, cancelled preparation, hidden-tab save and storage failure recovery.');
})().catch(e=>{console.error(e);process.exitCode=1});
