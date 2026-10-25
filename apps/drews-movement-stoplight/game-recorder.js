// Records musical actions on the audio clock. Video encoding happens only in Video Studio.
(() => {
 'use strict';
 const $=id=>document.getElementById(id),model=window.MovementSequence,data=window.MovementData,music=window.MovementMusic,setup=$('recordSetup'),studio=$('gameStudio');
 const KEY='movement-saved-games-v1',DRAFT='movement-game-draft-v1';let games=[],current=null,undo=[],capture=null,nameTimer=null;
 const uid=()=>window.crypto?.randomUUID?.()||'game-'+Date.now()+'-'+Math.random().toString(36).slice(2);
 const fmt=t=>Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const moves=[data.STOP,...data.MOVES],move=id=>moves.find(m=>m.id===id);
 function status(text){$('gamesStatus').textContent=text;}
 try{const saved=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(saved))for(const g of saved){try{games.push(model.validate(g));}catch{}}}catch{status('Saved games could not be read. You can open a downloaded game file.');}
 function persist(){try{localStorage.setItem(KEY,JSON.stringify(games));return true;}catch{status('Browser storage is full or unavailable. Download your game file to keep these changes.');return false;}}
 function saveCurrent(message='Changes saved.',redraw=true){if(!current)return;current=model.validate(current);current.id||=uid();const i=games.findIndex(g=>g.id===current.id);if(i<0)games.push(model.clone(current));else games[i]=model.clone(current);const saved=persist();if(saved)status(message);$('gameSaved').textContent=saved?'Saved':'Not saved · download a backup';if(redraw)render();else{const option=Array.from($('gamesList').options||[]).find(o=>o.value===current.id);if(option)option.textContent=current.name+' · '+fmt(model.total(current));}return saved;}
 function render(){
  $('gamesList').innerHTML=games.map(g=>`<option value="${esc(g.id)}" ${current?.id===g.id?'selected':''}>${esc(g.name)} · ${fmt(model.total(g))}</option>`).join('');
  $('gamesEmpty').hidden=!!current;$('gamesContent').hidden=!current;if(!current)return;
  $('gameName').value=current.name;$('gameRepeats').value=current.repeats||'1';$('gameSummary').textContent=`${current.blocks.length} blocks · ${fmt(model.total(current))} · 100 BPM`;
  $('gameUndo').disabled=!undo.length;
  $('gameBlocks').innerHTML=current.blocks.map((b,i)=>{const m=move(b.id),bars=b.duration/model.BAR;return `<li class="game-block" style="--block-color:${m.color}" data-index="${i}"><span class="block-number">${String(i+1).padStart(2,'0')}</span><label class="block-move"><span class="sr-label">Movement ${i+1}</span><select data-field="id">${moves.map(x=>`<option value="${x.id}" ${x.id===b.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label><label class="block-length">Measures<input data-field="duration" type="number" min="0.004167" max="1500" step="any" value="${Number(bars.toFixed(5))}" aria-label="Block ${i+1} measures"><small>${Number(b.duration.toFixed(2))} seconds</small></label><div class="block-actions"><button data-action="up" ${i===0?'disabled':''} aria-label="Move block ${i+1} earlier">↑</button><button data-action="down" ${i===current.blocks.length-1?'disabled':''} aria-label="Move block ${i+1} later">↓</button><button data-action="delete" ${current.blocks.length===1?'disabled':''} aria-label="Delete block ${i+1}">×</button></div></li>`;}).join('');
 }
 function edit(fn,redraw=true){if(!current)return;const old=model.clone(current);try{fn(current);current=model.validate(current);undo.push(old);if(undo.length>30)undo.shift();saveCurrent(undefined,redraw);}catch(e){current=old;status(e.message);render();}}
 function openGames(){if(capture)return;data.finishRecording();current||=games[0]?model.clone(games[0]):null;render();studio.showModal();}
 function newGame(){current=model.create('New movement game',data.getPreferences().selected,Math.floor(Math.random()*0xffffffff),[{id:data.getPreferences().selected[0]||'walk',duration:9.6}]);current.id=uid();undo=[];saveCurrent('New game saved. Add or arrange movement blocks.');}
 function download(){if(!current)return;const blob=new Blob([JSON.stringify(model.validate(current),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(current.name.replace(/[^a-z0-9 -]/gi,'').trim()||'Movement-game')+'.movement.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
 function lock(on){document.body.classList.toggle('recording-game',on);for(const id of ['recordGameOpen','gamesOpen','videoOpen','musicLibraryOpen','settingsOpen'])$(id).disabled=on;}
 function checkpoint(c,end=music.clock()){
  if(!c.actions.length)return;try{const g=model.fromActions(c.name,c.selected,c.seed,c.actions,Math.max(end,c.actions.at(-1).time+.02));g.id=c.id;localStorage.setItem(DRAFT,JSON.stringify(g));}catch{}
 }
 function clearCapture(c){cancelAnimationFrame(c.raf);clearInterval(c.checkpoint);for(const s of c.clicks||[])try{s.stop()}catch{};music.setRandomSeed(null);capture=null;lock(false);$('recordDock').hidden=true;$('recordBegin').disabled=false;}
 function finish(reason=''){
  const c=capture;if(!c)return;
  music.cancelQueue();const end=music.clock();clearCapture(c);data.finishRecording();
  if(!c.actions.length){$('recordSetupStatus').textContent=reason||'No actions saved yet. Start recording and choose a movement.';if(!setup.open)setup.showModal();return;}
  try{current=model.fromActions(c.name,c.selected,c.seed,c.actions,end);current.id=c.id;undo=[];const okay=saveCurrent(reason||'Game saved. Replay it now, edit its blocks, or export a video.');if(okay)try{localStorage.removeItem(DRAFT);}catch{};setup.close();studio.showModal();}catch(e){$('recordSetupStatus').textContent=e.message;setup.showModal();}
 }
 async function start(){
  if(capture)return;const c={id:uid(),name:$('recordName').value.trim()||'My movement game',seed:Math.floor(Math.random()*0xffffffff),selected:data.getPreferences().selected.slice(),actions:[],clicks:[],arming:true};capture=c;lock(true);$('recordBegin').disabled=true;$('recordSetupStatus').textContent='Preparing the music…';data.resetForRecording();
  try{const ctx=await music.prepare();if(capture!==c)return;if(document.hidden)throw Error('Keep this tab visible to record actions.');music.setRandomSeed(c.seed+37);
   const countIn=$('recordCountIn').checked,startAt=ctx.currentTime+.06,readyAt=startAt+(countIn?2.4:0);
   if(countIn)for(let beat=0;beat<4;beat++){const at=startAt+beat*.6,o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=beat===0?880:660;g.gain.setValueAtTime(.0001,at);g.gain.linearRampToValueAtTime(.09,at+.005);g.gain.exponentialRampToValueAtTime(.0001,at+.08);o.connect(g);g.connect(ctx.destination);o.onended=()=>{o.disconnect();g.disconnect();};o.start(at);o.stop(at+.09);c.clicks.push(o);}
   const arm=()=>{if(capture!==c)return;const left=readyAt-ctx.currentTime;if(left>0){$('recordSetupStatus').textContent=countIn?'Count in · '+Math.max(1,Math.ceil(left/.6)):'Ready…';c.raf=requestAnimationFrame(arm);return;}
    c.arming=false;setup.close();$('recordDock').hidden=false;document.activeElement?.blur();$('recordTimer').textContent='Ready · choose your first movement';
    const tick=()=>{if(capture!==c)return;$('recordTimer').textContent=c.actions.length?'Recording actions · '+fmt(music.clock()-c.actions[0].time):'Ready · choose your first movement';if(c.actions.length&&music.clock()-c.actions[0].time>=3590){finish('Game saved at the 60-minute limit.');return;}c.raf=requestAnimationFrame(tick);};tick();c.checkpoint=setInterval(()=>checkpoint(c),2000);
   };arm();
  }catch(e){if(capture===c){clearCapture(c);$('recordSetupStatus').textContent=e.message||'Could not start action recording.';}}
 }
 window.addEventListener('movementcommitted',e=>{const c=capture;if(!c||c.arming)return;const {id,time,silent}=e.detail;if(!model.IDS.includes(id)||!Number.isFinite(time))return;if(!c.actions.length&&id==='stop')return;c.actions.push({id,time,silent:!!silent});checkpoint(c);});
 window.addEventListener('movementheld',()=>{if(capture&&!capture.arming&&capture.actions.length)finish('Game saved when the timed session finished.');});
 $('recordGameOpen').onclick=()=>{$('recordName').value='Movement game '+(games.length+1);$('recordSetupStatus').textContent='';setup.showModal();};
 $('recordBegin').onclick=start;$('recordFinish').onclick=()=>finish();
 $('recordSetupClose').onclick=()=>{if(capture)clearCapture(capture);setup.close();};setup.addEventListener('cancel',()=>{if(capture)clearCapture(capture);});
 $('gamesOpen').onclick=openGames;$('gamesClose').onclick=()=>{saveName();studio.close();};studio.addEventListener('close',saveName);$('gamesRecord').onclick=()=>{studio.close();$('recordGameOpen').click();};$('gamesNew').onclick=newGame;
 $('gamesList').onchange=()=>{saveName();current=model.clone(games.find(g=>g.id===$('gamesList').value));undo=[];render();status('');};
 function saveName(){clearTimeout(nameTimer);nameTimer=null;if(current&&current.name!==($('gameName').value.trim()||'Untitled game'))edit(g=>g.name=$('gameName').value.trim()||'Untitled game',false);}
 $('gameName').oninput=()=>{$('gameSaved').textContent='Saving…';clearTimeout(nameTimer);nameTimer=setTimeout(saveName,450);};$('gameName').onchange=saveName;
 $('gameRepeats').onchange=()=>edit(g=>g.repeats=$('gameRepeats').value);
 function acceptGenerated(plan){const g=model.create('Generated movement game',data.getPreferences().selected,plan.seed,plan.segments.map(({id,duration})=>({id,duration})));current=g;current.id=uid();undo=[];saveCurrent('Sequence saved. Play it, edit its blocks, or export a video.');if(!studio.open)studio.showModal();}
 $('gamesGenerate').onclick=()=>{try{acceptGenerated(window.MovementVideoPlan.build({...data.gameConfig(),seed:Math.floor(Math.random()*0xffffffff),opening:'none',ending:'none'}));}catch(e){status(e.message);}};
 $('gameAdd').onclick=()=>edit(g=>g.blocks.push({id:g.selected[0]||'walk',duration:9.6}));
 $('gameBlocks').onchange=e=>{const row=e.target.closest('[data-index]');if(!row)return;const i=Number(row.dataset.index);edit(g=>{if(e.target.dataset.field==='id'){g.blocks[i].id=e.target.value;delete g.blocks[i].silent;}else if(e.target.dataset.field==='duration')g.blocks[i].duration=Number(e.target.value)*model.BAR;});};
 $('gameBlocks').onclick=e=>{const b=e.target.closest('[data-action]'),row=b?.closest('[data-index]');if(!row)return;const i=Number(row.dataset.index),action=b.dataset.action;edit(g=>{if(action==='delete'&&g.blocks.length>1)g.blocks.splice(i,1);else{const to=i+(action==='up'?-1:1);if(to>=0&&to<g.blocks.length)[g.blocks[i],g.blocks[to]]=[g.blocks[to],g.blocks[i]];}});};
 $('gameUndo').onclick=()=>{if(undo.length){current=undo.pop();saveCurrent('Edit undone.');}};$('gameFile').onclick=download;
 $('gameDelete').onclick=()=>{if(!current||!confirm('Delete “'+current.name+'” from this browser? Download a game file first if you want a backup.'))return;games=games.filter(g=>g.id!==current.id);current=games[0]?model.clone(games[0]):null;undo=[];persist();render();};
 $('gamesImport').onclick=()=>$('gamesImportFile').click();$('gamesImportFile').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{if(f.size>1000000)throw Error('Choose a game JSON file smaller than 1 MB.');const g=model.validate(JSON.parse(await f.text()));g.id=uid();current=g;undo=[];saveCurrent('Game file opened and saved in this browser.');}catch(err){status(err.message||'Could not read this game file.');}finally{e.target.value='';}};
 function sendToVideo(play){if(!current)return;saveName();studio.close();window.MovementVideoStudio.openSequence(model.clone(current),$('gameRepeats').value,play);}
 $('gameReplay').onclick=()=>sendToVideo(true);$('gameExport').onclick=()=>sendToVideo(false);
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&capture){if(capture.arming){clearCapture(capture);$('recordSetupStatus').textContent='Recording cancelled because the tab was hidden.';}else finish('Actions saved when the tab was hidden.');}});
 window.addEventListener('beforeunload',e=>{if(capture?.actions.length){checkpoint(capture);e.preventDefault();e.returnValue='';}});
 try{const draft=localStorage.getItem(DRAFT);if(draft){const g=model.validate(JSON.parse(draft));g.name+=' (recovered)';g.id=uid();games.push(g);if(persist())localStorage.removeItem(DRAFT);status('Recovered an unfinished recording. It is available in My games.');}}catch{}
 window.MovementGames={acceptGenerated,list:()=>games.map(model.clone),get:id=>{const g=games.find(x=>x.id===id);return g?model.clone(g):null;}};
 render();
})();
