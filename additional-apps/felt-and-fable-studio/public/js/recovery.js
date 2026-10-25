'use strict';
// IndexedDB holds full projects (including audio), never the small localStorage quota.
window.FeltRecovery=(()=>{
 let db=null,initialized=false,unavailable=false,timer=0,revision=0,savedRevision=0,currentId=null;
 let pending=null,lastSaved=0,lastError=false,documentEpoch=0;
 const newId=()=>globalThis.crypto?.randomUUID?.()||'session-'+id();
 function status(){
  if(unavailable)return 'Recovery unavailable · download your story';
  if(lastError)return 'Recovery could not save · download your story';
  if(pending)return 'Saving recovery copy on this device…';
  if(revision>savedRevision)return 'Changes pending recovery · on this device';
  if(lastSaved)return 'Recovery saved on this device'+(dirty?' · not downloaded':'');
  return initialized?'Recovery ready · download for a lasting copy':'Starting recovery…';
 }
 function update(){if(typeof phraseRecoveryStatus==='function')phraseRecoveryStatus();const e=$('saveState');if(e){e.textContent=status();e.title=lastSaved?'Last recovery: '+new Date(lastSaved).toLocaleString()+'. Download story keeps a separate editable file.':status()}}
 function schedule(){clearTimeout(timer);if(initialized&&!unavailable)timer=setTimeout(()=>flush(),1200)}
 function changed(){revision++;lastError=false;schedule();update()}
 function busy(){return !!(drag||pathGesture||blockGesture||cameraGesture||timelineGesture||drawing.length)}
 async function list(){
  if(!db)return [];
  return new Promise((resolve,reject)=>{const tx=db.transaction('copies','readonly'),request=tx.objectStore('copies').getAll();request.onsuccess=()=>resolve(request.result.sort((a,b)=>b.updated-a.updated));request.onerror=()=>reject(request.error)})
 }
 async function read(key){
  return new Promise((resolve,reject)=>{const tx=db.transaction('projects','readonly'),request=tx.objectStore('projects').get(key);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})
 }
 function write(record){
  return new Promise((resolve,reject)=>{
   const tx=db.transaction(['copies','projects'],'readwrite'),copies=tx.objectStore('copies'),projects=tx.objectStore('projects');
   copies.put({id:record.id,title:record.title,updated:record.updated,scenes:record.scenes});projects.put({id:record.id,json:record.json});
   const request=copies.getAll();request.onsuccess=()=>{for(const old of request.result.sort((a,b)=>b.updated-a.updated).slice(8)){copies.delete(old.id);projects.delete(old.id)}};
   tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error('Recovery storage failed'));tx.onabort=()=>reject(tx.error||Error('Recovery storage interrupted'));
  });
 }
 async function flush(){
  clearTimeout(timer);
  if(pending){await pending;return revision>savedRevision?flush():!lastError}
  if(!initialized||!db||revision===savedRevision)return !unavailable&&!lastError;
  if(busy()){schedule();return false}
  const seq=revision,epoch=documentEpoch;
  let record;
  try{record={id:currentId||(currentId=newId()),title:state.title||'Untitled story',updated:Date.now(),scenes:state.scenes.length,json:snapshot()}}catch{lastError=true;update();return false}
  pending=write(record).then(()=>{if(epoch===documentEpoch){savedRevision=seq;lastSaved=record.updated;lastError=false}return true},()=>{lastError=true;return false});
  update();const ok=await pending;pending=null;update();if(ok&&revision>savedRevision)schedule();return ok;
 }
 function newDocument(){
  documentEpoch++;currentId=null;revision=0;savedRevision=0;lastSaved=0;lastError=false;clearTimeout(timer);update();
 }
 async function restoreCopy(key){
  if(!db)return;
  try{
   if(dirty&&!confirm('Replace the current board with this recovery copy? Download your current story first if you want a separate file.'))return;
   const record=await read(key);if(!record)throw Error('This recovery copy is no longer available.');
   const p=validateProject(JSON.parse(record.json));
   $('recoveryMessage').textContent='Opening artwork and audio…';
   await Promise.all(Object.entries(p.imports||{}).map(([k,v])=>loadImage(v,k)));
   await ensureSceneArtwork(p.scenes[p.active]);
   await flush();checkpoint();state=p;newDocument();resetAnimationTime();selected=[];rasterCache.clear();dirty=true;
   renderCatalog();refresh();changed();$('recoveryDialog').close();setStudioWorkspace('build');toast('Recovery copy opened. Download story to keep a separate file.');return true;
  }catch(e){$('recoveryMessage').textContent='Could not recover this story: '+e.message}
 }
 async function open(){
  stopAnimationPreview();stopStoryPlayback();if(blockPathEditing)endBlockPathEditing();
  const dialog=$('recoveryDialog');if(!dialog.open)dialog.showModal();$('recoveryList').replaceChildren();$('recoveryMessage').textContent='Looking for recovery copies…';
  try{
   await flush();const copies=await list();
   $('recoveryMessage').textContent=unavailable?'This browser could not open recovery storage. You can still download and open story files.':copies.length?'Choose a recent editing session.':'No recovery copies yet. Your first edit starts one automatically.';
   for(const c of copies){
    const row=document.createElement('div');row.className='recovery-row';const info=document.createElement('div'),title=document.createElement('strong'),meta=document.createElement('p'),button=document.createElement('button');
    title.textContent=c.title;meta.textContent=new Date(c.updated).toLocaleString()+' · '+c.scenes+' scene'+(c.scenes===1?'':'s');button.textContent='Open copy';button.setAttribute('aria-label','Open recovery of '+c.title);
    button.onclick=async()=>{button.disabled=true;try{await restoreCopy(c.id)}finally{button.disabled=false}};info.append(title,meta);row.append(info,button);$('recoveryList').append(row);
   }
  }catch{$('recoveryMessage').textContent='Recovery copies could not be read. Download your current story to keep it.'}
 }
 async function init(){
  $('openRecovery').onclick=open;$('closeRecovery').onclick=()=>$('recoveryDialog').close();
  $('welcomeContinue').onclick=async()=>{const button=$('welcomeContinue');if(button.disabled)return;button.disabled=true;try{const copies=await list();if(!copies.length)return;if(await restoreCopy(copies[0].id))$('welcomeScreen').close();else $('welcomeStatus').textContent=$('recoveryMessage').textContent;}catch{$('welcomeStatus').textContent='Could not open the latest story. Choose Recover a recent story to try again.';}finally{button.disabled=false;}};
  $('welcomeRecover').onclick=()=>{$('welcomeScreen').close();open()};
  try{
   if(!globalThis.indexedDB)throw Error('IndexedDB unavailable');
   db=await new Promise((resolve,reject)=>{
    const request=indexedDB.open('felt-fable-recovery',1);
    request.onupgradeneeded=()=>{for(const name of ['copies','projects'])if(!request.result.objectStoreNames.contains(name))request.result.createObjectStore(name,{keyPath:'id'})};
    request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('Recovery storage is busy'));
    request.onsuccess=()=>resolve(request.result);
   });
   db.onversionchange=()=>{db.close();db=null;unavailable=true;update()};
   const copies=await list();$('welcomeRecover').hidden=!copies.length;$('welcomeContinue').hidden=!copies.length;if(copies.length)$('welcomeContinue').textContent='Continue '+copies[0].title;
  }catch{unavailable=true}
  initialized=true;update();
  // Text edits after their initial undo checkpoint still need another recovery write.
  document.addEventListener('input',e=>{if(['bubbleText','storyTitle','caption'].includes(e.target.id)&&dirty)changed()});
  document.addEventListener('pointerup',()=>{if(revision>savedRevision)schedule()});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush()});
  window.addEventListener('pagehide',()=>flush());
 }
 return {init,changed,flush,newDocument,open,list,restoreCopy,status};
})();
