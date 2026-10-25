'use strict';
let rigUI={time:0,playing:null,commandId:null,picking:false,revision:null};
const rigUIScene=()=>state.scenes.find(s=>s.id===$('rigScene').value)||scene();
const rigUIActor=()=>rigUIScene().items.find(o=>o.id===$('rigActor').value&&o.rig);
function rigUIMessage(text,error=false){$('rigStatus').textContent=text;$('rigStatus').classList.toggle('error',error);}
function rigUIStop(){if(rigUI.playing)cancelAnimationFrame(rigUI.playing.raf);rigUI.playing=null;$('rigPreview').textContent='Preview motion';}
function rigUIOptions(el,rows,value){el.replaceChildren();for(const [key,label]of rows){const option=document.createElement('option');option.value=key;option.textContent=label;el.append(option);}el.value=rows.some(r=>r[0]===value)?value:(rows[0]?.[0]||'');}
function rigUIActors(){const value=$('rigActor').value;rigUIOptions($('rigActor'),rigUIScene().items.filter(o=>o.rig).map(o=>[o.id,o.name]),value);rigUI.commandId=null;rigUI.time=0;rigUIRefresh();}
function rigUIRefresh(){
 rigUIStop();rigUI.revision=directorRevision();const o=rigUIActor(),s=rigUIScene();$('rigEmpty').hidden=!!o;$('rigEditor').hidden=!o;
 if(o){$('rigHomeX').value=o.x;$('rigHomeY').value=(o.y+o.h/600*270).toFixed(1);$('rigHeight').value=o.h;$('rigFacing').value=o.rig.facing;}
 rigUIOptions($('rigTargetPiece'),[['','Fixed point on set'],...s.items.filter(q=>!q.rig).map(q=>[q.id,q.name])],$('rigTargetPiece').value);
 const list=$('rigCommands');list.replaceChildren();for(const c of o?rigCommands(o):[]){const b=document.createElement('button');b.className='rig-command'+(c.id===rigUI.commandId?' active':'');b.textContent=c.start.toFixed(2)+'–'+(c.start+c.duration).toFixed(2)+'s · '+RIG_COMMANDS[c.kind];b.onclick=()=>{rigUIStop();rigUI.commandId=c.id;for(const button of list.children)button.classList.toggle('active',button===b);rigUI.time=c.start;rigUILoadCommand();rigUIPaint();};list.append(b);}
 rigUILoadCommand();rigUIPaint();
}
function rigUILoadCommand(){
 const o=rigUIActor(),c=o?.rig.commands.find(q=>q.id===rigUI.commandId);$('rigKind').value=c?.kind||'listen';$('rigStart').value=c?.start??Number(rigUI.time.toFixed(2));$('rigDuration').value=c?.duration??2;
 const q=c?.target,p=q?rigTarget(q,rigUIScene(),c.start):{x:1100,y:470};$('rigTargetX').value=Number(p.x.toFixed(1));$('rigTargetY').value=Number(p.y.toFixed(1));$('rigTargetPiece').value=q?.pieceId||'';
 $('rigSaveCommand').textContent=c?'Update command':'Add command';$('rigDeleteCommand').disabled=!c;$('rigLoopCommand').disabled=!c;rigUITargetFields();
}
function rigUITargetFields(){const kind=$('rigKind').value;$('rigTargetFields').hidden=!['walk','knock','reach','look'].includes(kind);$('rigTargetPiece').disabled=kind==='walk';if(kind==='walk')$('rigTargetPiece').value='';$('rigTargetHelp').textContent=kind==='walk'?'Pick the floor point where the wolf should stop.':'Pick where the front of the paw should touch, or where the wolf should look.';}
function rigUIPaint(){
 if(!$('rigDialog').open)return;const s=rigUIScene(),c=$('rigCanvas'),g=c.getContext('2d'),t=rigClamp(rigUI.time,0,sceneSeconds(s));
 cinemaRender(g,s,c.width,c.height,t,false,false,state);$('rigSeek').max=sceneSeconds(s);$('rigSeek').value=t;$('rigClock').textContent=t.toFixed(2)+' / '+sceneSeconds(s).toFixed(2)+' s';
 if(!$('rigGuides').checked&&!rigUI.picking)return;const o=rigUIActor();if(!o)return;const f=rigFrame(o,t,s),camera=cameraAt(s,t),screen=q=>{const p=cameraWorldToScreen([q.x,q.y],camera);return{x:p[0]*c.width/1600,y:p[1]*c.height/900};},point=q=>screen(f.world(q));
 g.save();g.lineWidth=2;g.strokeStyle='#5cf0e1';for(const joint of [...f.legs,...f.arms]){const ps=[joint.a,joint.joint,joint.end].map(point);g.beginPath();ps.forEach((q,i)=>i?g.lineTo(q.x,q.y):g.moveTo(q.x,q.y));g.stroke();for(const p of ps){g.fillStyle='#153e39';g.beginPath();g.arc(p.x,p.y,3.5,0,Math.PI*2);g.fill();g.stroke();}}
 for(let i=0;i<2;i++){const q=point(f.feet[i]);g.fillStyle=f.planted[i]?'#5cf0e1':'#e9d5ab';g.fillRect(q.x-9,q.y-2,18,4);}
 const target={x:Number($('rigTargetX').value),y:Number($('rigTargetY').value)},q=screen(target);g.strokeStyle='#ffe498';g.beginPath();g.arc(q.x,q.y,7,0,Math.PI*2);g.moveTo(q.x-12,q.y);g.lineTo(q.x+12,q.y);g.moveTo(q.x,q.y-12);g.lineTo(q.x,q.y+12);g.stroke();g.restore();
}
function rigUIPlay(loop=false){
 if(rigUI.playing){rigUIStop();return;}const c=rigUIActor()?.rig.commands.find(c=>c.id===rigUI.commandId),from=loop&&c?c.start:rigUI.time>=sceneSeconds(rigUIScene())-.01?0:rigUI.time,to=loop&&c?c.start+c.duration:sceneSeconds(rigUIScene());
 const run={start:performance.now(),from,to,loop,raf:0};rigUI.playing=run;$('rigPreview').textContent='Pause preview';
 const frame=now=>{if(rigUI.playing!==run)return;const at=run.from+(now-run.start)/1000;if(at>=to){if(loop){run.start=now;rigUI.time=from;}else{rigUI.time=to;rigUIStop();rigUIPaint();return;}}else rigUI.time=at;rigUIPaint();run.raf=requestAnimationFrame(frame);};run.raf=requestAnimationFrame(frame);
}
async function rigUICommit(op,message){rigUIStop();try{const o=rigUIActor();if(!o)throw Error('Add a rigged wolf first.');await rigApply({expectedRevision:rigUI.revision,operations:[{...op,sceneId:rigUIScene().id,pieceId:o.id}]});rigUIRefresh();rigUIMessage(message);rigUIReview();}catch(e){rigUIMessage(e.message,true);}}
function rigUIReview(){const notes=$('rigReview');notes.replaceChildren();const issues=rigReview(state).filter(q=>q.sceneId===rigUIScene().id);if(!issues.length){notes.textContent='No reach or planted-foot warnings found. Check the rendered poses as well.';return;}const offset=storyTimeline().find(q=>q.scene.id===rigUIScene().id).start;for(const q of issues){const b=document.createElement('button');b.textContent=q.message;b.onclick=()=>{rigUIStop();rigUI.time=q.time-offset;rigUIPaint();};notes.append(b);}}
async function rigUIOpen(){
 stopStoryPlayback();stopAnimationPreview();rigUIStop();rigUIOptions($('rigScene'),state.scenes.map(s=>[s.id,s.name]),scene().id);$('rigDialog').showModal();rigUIActors();rigUIMessage('Each command has preparation, action and settling time. Preview motion is silent; use Play with sound for the film.');
 try{await ensureSceneArtwork(rigUIScene());rigUIPaint();}catch(e){rigUIMessage(e.message,true);}
}
async function rigUIAddWolf(){
 rigUIStop();const revision=directorRevision(),sceneId=rigUIScene().id;try{rigUIMessage('Preparing the wolf…');const response=await fetch('examples/wolf-door.felt.json');if(!response.ok)throw Error('The wolf could not load. Try again.');const demo=await response.json(),template=demo.scenes[0].items.find(o=>o.rig);await directorTransaction(revision,p=>{const s=p.scenes.find(s=>s.id===sceneId);if(!s)throw Error('The scene changed.');const o=copy(template);o.id=id();o.x=650;o.y=780-o.h/600*270;o.rig.commands=[];s.items.push(o);p.imports[o.asset]=demo.imports[o.asset];return p;});rigUIActors();rigUIMessage('Wolf added. Choose a floor destination and add Walk to, then a door point and Knock.');}catch(e){rigUIMessage(e.message,true);}
}
function rigInitUI(){
 $('openCharacterMotion').onclick=rigUIOpen;$('closeRig').onclick=()=>$('rigDialog').close();$('rigDialog').addEventListener('close',()=>{rigUIStop();rigUI.picking=false;});$('rigDialog').addEventListener('cancel',rigUIStop);
 $('rigScene').onchange=async()=>{rigUIActors();try{await ensureSceneArtwork(rigUIScene());rigUIPaint();}catch(e){rigUIMessage(e.message,true);}};$('rigActor').onchange=()=>{rigUI.commandId=null;rigUIRefresh();};$('rigAddWolf').onclick=rigUIAddWolf;
 $('rigNewCommand').onclick=()=>{rigUI.commandId=null;rigUILoadCommand();};$('rigKind').onchange=rigUITargetFields;$('rigGuides').onchange=rigUIPaint;$('rigTargetX').oninput=rigUIPaint;$('rigTargetY').oninput=rigUIPaint;
 $('rigSaveHome').onclick=()=>rigUICommit({op:'home',x:Number($('rigHomeX').value),floor:Number($('rigHomeY').value),height:Number($('rigHeight').value),facing:$('rigFacing').value},'Starting pose updated.');
 $('rigSaveCommand').onclick=()=>{const kind=$('rigKind').value,c={id:rigUI.commandId||id(),kind,start:Number($('rigStart').value),duration:Number($('rigDuration').value)};if(['walk','knock','reach','look'].includes(kind)){const point={x:Number($('rigTargetX').value),y:Number($('rigTargetY').value)},prop=rigUIScene().items.find(o=>o.id===$('rigTargetPiece').value);if(prop&&kind!=='walk'){const xy=localPoint({...prop,...poseAt(prop,rigUI.time,sceneSeconds(rigUIScene()))},[point.x,point.y]);c.target={pieceId:prop.id,u:xy[0]/prop.bw+.5,v:xy[1]/prop.bh+.5};}else c.target=point;}rigUI.commandId=c.id;rigUICommit({op:'command',command:c},'Character command saved.');};
 $('rigDeleteCommand').onclick=()=>{const command=rigUI.commandId;rigUI.commandId=null;rigUICommit({op:'deleteCommand',id:command},'Command removed.');};
 $('rigPreview').onclick=()=>rigUIPlay();$('rigLoopCommand').onclick=()=>rigUIPlay(true);$('rigSeek').oninput=()=>{rigUIStop();rigUI.time=Number($('rigSeek').value);rigUIPaint();};$('rigRewind').onclick=()=>{rigUIStop();rigUI.time=0;rigUIPaint();};$('rigRunReview').onclick=rigUIReview;
 $('rigPlaySound').onclick=()=>{const s=rigUIScene(),row=storyTimeline().find(r=>r.scene.id===s.id);$('rigDialog').close();switchScene(row.index);startStoryPlayback(row.start);};
 $('rigPickTarget').onclick=()=>{rigUIStop();rigUI.picking=true;rigUIMessage('Click or tap the target on the preview.');};$('rigCanvas').onpointerdown=e=>{if(!rigUI.picking)return;e.preventDefault();const c=$('rigCanvas'),r=c.getBoundingClientRect(),camera=cameraAt(rigUIScene(),rigUI.time),sx=(e.clientX-r.left)/r.width*1600,sy=(e.clientY-r.top)/r.height*900;$('rigTargetX').value=Number((camera.x+(sx-800)/camera.zoom).toFixed(1));$('rigTargetY').value=Number((camera.y+(sy-450)/camera.zoom).toFixed(1));rigUI.picking=false;rigUIPaint();rigUIMessage('Target placed. Save the command to apply it.');};
 $('rigOpenDemo').onclick=()=>{$('rigDialog').close();exampleOpen('wolf');};
}
