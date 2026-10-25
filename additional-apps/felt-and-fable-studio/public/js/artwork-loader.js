'use strict';
// Local script packs retain offline file:// support and an origin-clean canvas.
const FELT_DATA=Object.create(null),artPending=new Map(),thumbMap=new Map();
const artById=new Map([...ART.backgrounds,...ART.pieces,...STORY_PROP_VARIANTS].map(a=>[a.id,a]));
const artQueue=[];let artRunning=0,artRepaint=0,sceneWarmToken=0,backdropRequest=0;
function queueArtwork(task){return new Promise((resolve,reject)=>{artQueue.push({task,resolve,reject});pumpArtwork()})}
function pumpArtwork(){while(artRunning<3&&artQueue.length){const j=artQueue.shift();artRunning++;Promise.resolve().then(j.task).then(j.resolve,j.reject).finally(()=>{artRunning--;pumpArtwork()})}}
function loadArtScript(path){return new Promise((resolve,reject)=>{const s=document.createElement('script');let done=false;const finish=error=>{if(done)return;done=true;clearTimeout(timer);s.onload=s.onerror=null;s.remove();error?reject(error):resolve()};const timer=setTimeout(()=>finish(Error('Artwork loading timed out. Check your connection and try again.')),45000);s.src=path;s.onload=()=>finish();s.onerror=()=>finish(Error('Could not load artwork. Check your connection, then try again.'));document.head.appendChild(s)})}
function ensureAsset(key){
 if(imageMap.has(key))return Promise.resolve(imageMap.get(key));
 if(artPending.has(key))return artPending.get(key);
 const a=artById.get(key);if(!a)return Promise.reject(Error('Missing story artwork: '+key));
 const pending=queueArtwork(async()=>{
  await loadArtScript(a.prepared);const src=FELT_DATA[key];delete FELT_DATA[key];
  if(!src)throw Error('Artwork file is incomplete: '+a.name);
  const im=new Image();im.src=src;await im.decode();imageMap.set(key,im);
  rasterCache.clear();scheduleArtworkPaint();return im;
 }).finally(()=>artPending.delete(key));artPending.set(key,pending);return pending;
}
function scheduleArtworkPaint(){if(!ready||artRepaint)return;artRepaint=requestAnimationFrame(()=>{artRepaint=0;draw();renderScenes();if(tab==='custom')renderCatalog()})}
function objectAssetIds(objects,ids=new Set()){for(const o of objects||[]){if(o.type==='asset'||o.type==='puppet')ids.add(o.asset);if(o.illustration)for(const pose of o.illustration.poses||[])ids.add(pose.asset);if(o.storyProp)for(const key of Object.values(window.STORY_PROP_PACKS?.[o.storyProp.pack]?.states||{}))ids.add(key);if(o.children)objectAssetIds(o.children,ids)}return ids}
function sceneAssetIds(s){const ids=objectAssetIds(s.items);if(s.bg>=0)ids.add('bg'+s.bg);return ids}
async function ensureIds(ids,progress){let done=0;const list=[...ids];await Promise.all(list.map(async key=>{await ensureAsset(key);progress?.(++done,list.length)}))}
function ensureSceneArtwork(s,progress){const ids=sceneAssetIds(s);if(s.cinema?.transition?.kind==='dissolve'){const i=state.scenes.findIndex(x=>x.id===s.id);if(i>0)for(const key of sceneAssetIds(state.scenes[i-1]))ids.add(key)}return ensureIds(ids,progress)}
function ensureStoryArtwork(p,progress){const ids=new Set();for(const s of p.scenes)for(const id of sceneAssetIds(s))ids.add(id);return ensureIds(ids,progress)}
function warmCurrentScene(){
 const p=state,s=scene(),token=++sceneWarmToken,missing=[...sceneAssetIds(s)].filter(id=>!imageMap.has(id));
 const badge=$('artworkStatus');if(!missing.length){badge.hidden=true;return}
 badge.hidden=false;badge.textContent='Loading scene artwork…';canvas.setAttribute('aria-busy','true');
 ensureSceneArtwork(s,(n,total)=>{if(token===sceneWarmToken)badge.textContent='Loading scene artwork '+n+' / '+total+'…'}).then(()=>{
  if(token!==sceneWarmToken||state!==p)return;badge.hidden=true;canvas.setAttribute('aria-busy','false');draw();renderScenes();
 }).catch(e=>{if(token===sceneWarmToken){badge.textContent=e.message;canvas.setAttribute('aria-busy','false')}});
}
async function chooseBackdrop(a){const p=state,s=scene(),request=++backdropRequest;try{toast('Loading '+a.name+'…');await ensureAsset(a.id);if(request!==backdropRequest||state!==p||scene()!==s)return;checkpoint();s.bg=ART.backgrounds.indexOf(a);rememberCollectionUse(a);refresh();toast(a.name+' ready.')}catch(e){if(request===backdropRequest)toast(e.message)}}
async function addLoadedAsset(a){const p=state,s=scene();try{if(!imageMap.has(a.id))toast('Loading '+a.name+'…');await ensureAsset(a.id);if(state===p&&scene()===s){addAsset(a);rememberCollectionUse(a)}}catch(e){toast(e.message)}}
async function addCustomPiece(o){const p=state,s=scene();try{await ensureIds(objectAssetIds([o]));if(state!==p||scene()!==s)return;let n=remapIDs(copy(o));offsetKeys(n,W/2-n.x,H/2-n.y);n.x=W/2;n.y=H/2;add(n)}catch(e){toast(e.message)}}
async function loadArtwork(){
 const thumb=new Image();thumb.src=ART.thumbnails;await thumb.decode();delete ART.thumbnails;
 for(const a of artById.values()){if(!a.thumb)continue;const [x,y,w,h]=a.thumb,c=makeCanvas(w,h);c.getContext('2d').drawImage(thumb,x,y,w,h,0,0,w,h);thumbMap.set(a.id,c)}
 await Promise.all([loadCinemaThumbnails(),loadOrchestraThumbnails(),loadStoryPropThumbnails(),loadDanseThumbnails()]);const ids=new Set(['bg0']);for(const name of ['tree','fox','rabbit','butterfly','flower','mushroom']){const a=ART.pieces.find(a=>a.name.toLowerCase()===name);if(a)ids.add(a.id)}
 await ensureIds(ids,(n,total)=>{$('loading').textContent='Opening your board… '+n+' / '+total});
}
async function exportCurrentPNG(){const p=state,s=copy(scene()),time=animTime;try{await ensureSceneArtwork(s);const c=makeCanvas(1920,1080);drawScene(c.getContext('2d'),s,1920,1080,time);c.toBlob(b=>download(b,filename(p.title)+'_'+(p.active+1)+'.png'),'image/png');toast('Exporting the current scene at 1920 × 1080.')}catch(e){toast('Could not export: '+e.message)}}
