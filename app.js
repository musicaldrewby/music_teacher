(() => {
 'use strict';
 const apps=window.ARCADE_APPS, categories=window.ARCADE_REGIONS;
 const byId=new Map(apps.map(a=>[a.id,a])), byCategory=new Map(categories.map(c=>[c.id,c]));
 const $=id=>document.getElementById(id);
 const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const normalized=v=>String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const storage={get(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}},set(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}}};
 const saved=storage.get('drews-arcade-favorites',[]), favorites=new Set((Array.isArray(saved)?saved:[]).filter(id=>byId.has(id)));
 const featured=['drew-uke-strum','sneaky-cat','drews-boomwhacker-creator'];
 const ordered=[...featured.map(id=>byId.get(id)),...apps.filter(a=>!featured.includes(a.id))].filter(Boolean);
 let category='all', shelfApps=ordered, firstVisible=0, currentApp=null, previousRandom='', browseCategory='all', favoritesOnly=false, toastTimer, scrollFrame=0, resizeFrame=0;
 const motionQuery=window.matchMedia('(prefers-reduced-motion: reduce)'), narrowQuery=window.matchMedia('(max-width: 680px)'), finePointer=window.matchMedia('(hover: hover) and (pointer: fine)');
 let paused=motionQuery.matches||storage.get('drews-arcade-motion-paused',false)===true;
 const perPage=()=>narrowQuery.matches?1:3;
 const icon=(name,extra='')=>`<svg aria-hidden="true" ${extra}><use href="#i-${name}"/></svg>`;
 const short=a=>a.shortTitle||a.title;
 function cover(a,{sticker=false,mini=false,screen=false}={}){
  const index=a.cover??19, x=(index%4)*100/3, y=Math.floor(index/4)*25;
  return `<span class="cover-art${mini?' rail-thumb':''}" style="--cover-x:${x}%;--cover-y:${y}%" aria-hidden="true">${mini||screen?'':`<span class="cover-title${short(a).length>19?' long-title':''}">${esc(short(a))}</span>`}${sticker&&!a.url?'<span class="pending-sticker">Link coming soon</span>':''}</span>`;
 }
 function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.add('visible');toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2600)}
 function syncMotion(){
  document.documentElement.classList.toggle('motion-paused',paused);
  const label=motionQuery.matches?'Animation paused by your device setting':paused?'Resume animation':'Pause animation';
  $('motionToggle').setAttribute('aria-pressed',String(paused));$('motionToggle').setAttribute('aria-label',label);$('motionToggle').title=label;$('motionToggle').disabled=motionQuery.matches;
  $('motionIcon').setAttribute('href',paused?'#i-play':'#i-pause');
  if(paused){document.documentElement.style.setProperty('--px','0px');document.documentElement.style.setProperty('--py','0px')}
 }
 syncMotion();
 $('motionToggle').addEventListener('click',()=>{paused=!paused;storage.set('drews-arcade-motion-paused',paused);syncMotion()});
 motionQuery.addEventListener('change',()=>{paused=motionQuery.matches||storage.get('drews-arcade-motion-paused',false)===true;syncMotion()});
 document.addEventListener('visibilitychange',()=>document.documentElement.classList.toggle('page-hidden',document.hidden));
 let pointerFrame=0, pointerX=0, pointerY=0;
 document.addEventListener('pointermove',e=>{
  if(paused||!finePointer.matches||document.hidden||document.querySelector('dialog[open]'))return;
  pointerX=(e.clientX/window.innerWidth-.5)*-11;pointerY=(e.clientY/window.innerHeight-.5)*-7;
  if(!pointerFrame)pointerFrame=requestAnimationFrame(()=>{pointerFrame=0;if(paused)return;document.documentElement.style.setProperty('--px',`${pointerX.toFixed(2)}px`);document.documentElement.style.setProperty('--py',`${pointerY.toFixed(2)}px`)});
 },{passive:true});
 document.documentElement.addEventListener('pointerleave',()=>{document.documentElement.style.setProperty('--px','0px');document.documentElement.style.setProperty('--py','0px')});
 if(document.fullscreenEnabled&&document.documentElement.requestFullscreen){
  $('fullscreenButton').hidden=false;
  $('fullscreenButton').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{toast('Full screen is unavailable in this browser.')}});
  document.addEventListener('fullscreenchange',()=>{const label=document.fullscreenElement?'Exit full screen':'Enter full screen';$('fullscreenButton').setAttribute('aria-label',label);$('fullscreenButton').title=label});
 }
 const categoryEntries=[{id:'all',name:'All Apps'},...categories];
 $('categories').innerHTML=categoryEntries.map(c=>`<button class="category-tab" type="button" data-category="${c.id}" aria-pressed="${c.id==='all'}">${esc(c.name)}</button>`).join('');
 $('browseCategories').innerHTML=categoryEntries.map(c=>`<button class="browse-category" type="button" data-browse-category="${c.id}" aria-pressed="${c.id==='all'}">${esc(c.name)}</button>`).join('');
 $('totalApps').textContent=String(apps.length);
 // Give each marquee one or two complete lines; never truncate an app name.
 function marqueeLines(name){
  const words=name.trim().split(/\s+/);
  if(name.length<=12||words.length<2)return [name];
  let best=[name],score=Infinity;
  for(let i=1;i<words.length;i++){
   const pair=[words.slice(0,i).join(' '),words.slice(i).join(' ')];
   const balance=Math.max(...pair.map(s=>s.length))*2+Math.abs(pair[0].length-pair[1].length);
   if(balance<score){best=pair;score=balance}
  }
  return best;
 }
 function fitMarqueeTitles(){
  if(typeof getComputedStyle!=='function')return;
  document.querySelectorAll('.machine-title').forEach(title=>{
   title.style.removeProperty('font-size');
   const style=getComputedStyle(title),size=parseFloat(style.fontSize);
   const width=title.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
   const height=title.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);
   const lines=[...title.children];
   const widest=Math.max(0,...lines.map(line=>line.scrollWidth));
   const textHeight=parseFloat(style.lineHeight)*lines.length;
   if(width<=0||height<=0||!widest||!Number.isFinite(size))return;
   const scale=Math.min(1,width/widest,height/textHeight);
   if(scale<1)title.style.fontSize=(Math.floor(size*scale*10)/10)+'px';
  });
 }
 if(document.fonts?.ready)document.fonts.ready.then(()=>requestAnimationFrame(fitMarqueeTitles));
 // Stable per-app shells: mix all seven designs within the categories, too.
 // 0 tropical, 1 moonlight, 2 rainbow, 3 copper, 4 seafoam, 5 nautical, 6 carnival.
 const cabinetStyles={
  'drew-uke-strum':0,'sneaky-cat':1,'drews-boomwhacker-creator':2,
  'pocket-orff':3,'interactive-xylophone':4,'rhythm-builder':0,
  'mr-drews-name-that-tune':6,'classroom-connect-four':5,'mr-drews-name-that-note':4,
  'soundroom':3,'felt-and-fable-studio':0,'drews-music-lab-vr':1,
  'bingo-maker':6,'round-helper':2,'mr-drews-production-media-player':5
 };
 const skinFor=a=>cabinetStyles[a.id]??Math.max(0,apps.indexOf(a))%7;
 function machine(a){
  const skin=skinFor(a),name=short(a),lines=marqueeLines(name);
  return `<div class="record-slot"><div class="machine skin-${skin}"><a class="machine-link" href="${esc(a.url)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${esc(a.title)} in a new tab"><span class="machine-shell" aria-hidden="true"></span><span class="machine-title${lines.length===2?' two-lines':''}">${lines.map(line=>`<span class="title-line">${esc(line)}</span>`).join('')}</span><span class="machine-screen">${cover(a,{screen:true})}<span class="screen-glass" aria-hidden="true"></span></span><span class="launch-hint">Open app ↗</span></a><div class="machine-actions"><button class="machine-detail" type="button" data-app="${a.id}" aria-haspopup="dialog" aria-label="About ${esc(a.title)}">${icon('info')}</button><button class="machine-save" type="button" data-save="${a.id}" aria-label="Save ${esc(a.title)} to favorites" aria-pressed="${favorites.has(a.id)}">${icon('heart')}</button></div></div></div>`;
 }
 function renderShelf(){
  shelfApps=category==='all'?ordered:ordered.filter(a=>a.region===category);firstVisible=0;
  $('recordShelf').innerHTML=shelfApps.map(machine).join('');
  $('recordShelf').scrollLeft=0;
  $('recordShelf').classList.remove('shelf-changing');
  if(!paused){void $('recordShelf').offsetWidth;$('recordShelf').classList.add('shelf-changing')}
  document.querySelectorAll('[data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===category)));
  syncFavorites();syncShelf();requestAnimationFrame(fitMarqueeTitles);
 }
 function syncShelf(){
  const shelf=$('recordShelf'),slots=shelf.children, step=slots.length>1?slots[1].offsetLeft-slots[0].offsetLeft:1;
  firstVisible=Math.min(Math.max(0,shelfApps.length-perPage()),Math.max(0,Math.round(shelf.scrollLeft/Math.max(1,step))));
  const visible=shelfApps.slice(firstVisible,firstVisible+perPage());
  $('shelfLabel').textContent=category==='all'?(firstVisible===0?'Featured Apps':'All Apps'):byCategory.get(category).name;
  $('shelfPosition').textContent=`${firstVisible+1}${visible.length>1?`–${firstVisible+visible.length}`:''} / ${shelfApps.length}`;
  $('previousRecords').disabled=firstVisible===0;
  $('nextRecords').disabled=firstVisible+perPage()>=shelfApps.length;

 }
 function shiftShelf(direction){
  const shelf=$('recordShelf'),slots=shelf.children;if(!slots.length)return;
  const target=Math.min(Math.max(0,shelfApps.length-perPage()),Math.max(0,firstVisible+direction*perPage()));
  shelf.scrollTo({left:slots[target].offsetLeft-slots[0].offsetLeft,behavior:paused?'auto':'smooth'});
 }
 $('featuredButton').addEventListener('click',()=>{category='all';renderShelf()});
 $('recordShelf').addEventListener('click',e=>{const b=e.target.closest('[data-save]');if(b)toggleFavorite(b.dataset.save)});
 $('previousRecords').addEventListener('click',()=>shiftShelf(-1));$('nextRecords').addEventListener('click',()=>shiftShelf(1));
 $('recordShelf').addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;syncShelf()})},{passive:true});
 $('recordShelf').addEventListener('keydown',e=>{if(e.target!==$('recordShelf'))return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();shiftShelf(e.key==='ArrowRight'?1:-1)}});
 $('categories').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(!b)return;category=b.dataset.category;renderShelf();});
 window.addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{syncShelf();fitMarqueeTitles()})},{passive:true});
 narrowQuery.addEventListener('change',()=>{const shelf=$('recordShelf');shelf.scrollLeft=0;syncShelf()});
 const dialogOpeners=new WeakMap();
 function openDialog(dialog,focus){
  dialogOpeners.set(dialog,document.activeElement);
  if(!dialog.open){if(typeof dialog.showModal==='function')dialog.showModal();else{dialog.setAttribute('open','');dialog.classList.add('dialog-fallback')}}
  document.documentElement.classList.add('modal-open');
  if(focus)focus.focus({preventScroll:true});else dialog.querySelector('button, a[href], input')?.focus({preventScroll:true});
 }
 function afterClose(dialog){
  document.documentElement.classList.toggle('modal-open',!!document.querySelector('dialog[open]'));
  let opener=dialogOpeners.get(dialog);
  // The collection can re-render while a app is open. Restore to its replacement.
  if(opener&&!opener.isConnected&&opener.dataset?.app)opener=$('browseGrid').querySelector(`[data-app="${opener.dataset.app}"]`);
  if(opener?.isConnected)opener.focus({preventScroll:true});else if($('browseDialog').open)$('searchInput').focus({preventScroll:true});
 }
 function closeDialog(dialog){if(typeof dialog.close==='function')dialog.close();else{dialog.removeAttribute('open');afterClose(dialog)}}
 for(const dialog of document.querySelectorAll('dialog')){
  dialog.addEventListener('close',()=>afterClose(dialog));
  dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(dialog)});
  dialog.addEventListener('keydown',e=>{
   if(!dialog.classList.contains('dialog-fallback'))return;
   if(e.key==='Escape'){e.preventDefault();closeDialog(dialog)}
   if(e.key==='Tab'){const focusable=[...dialog.querySelectorAll('button:not([disabled]),a[href],input')].filter(el=>!el.hidden);const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}
  });
 }
 document.addEventListener('click',e=>{
  const close=e.target.closest('[data-close]');if(close){closeDialog($(close.dataset.close));return}
  const appButton=e.target.closest('[data-app]');if(appButton)showApp(appButton.dataset.app);
 });
 function syncFavorites(){
  document.querySelectorAll('.machine-save').forEach(b=>{const a=byId.get(b.dataset.save),saved=favorites.has(a.id);b.setAttribute('aria-pressed',String(saved));b.setAttribute('aria-label',`${saved?'Remove':'Save'} ${a.title} ${saved?'from':'to'} favorites`)});
  $('favoriteCount').textContent=String(favorites.size);$('favoriteCount').hidden=favorites.size===0;
  $('favoritesButton').setAttribute('aria-label',`Browse favorites${favorites.size?`, ${favorites.size} saved`:''}`);
  if(currentApp){const saved=favorites.has(currentApp.id);$('detailFavorite').setAttribute('aria-pressed',String(saved));$('detailFavorite').querySelector('span').textContent=saved?'Saved to favorites':'Save favorite';$('detailFavorite').setAttribute('aria-label',`${saved?'Remove':'Save'} ${currentApp.title} ${saved?'from':'to'} favorites`)}
 }
 function toggleFavorite(id){
  const a=byId.get(id);if(!a)return;
  const removed=favorites.has(id);removed?favorites.delete(id):favorites.add(id);
  const persisted=storage.set('drews-arcade-favorites',[...favorites]);syncFavorites();
  if($('browseDialog').open)renderBrowse();
  toast(persisted?`${short(a)} ${removed?'removed from':'saved to'} favorites.`:'Saved for this visit. Browser storage is unavailable.');
 }
 function showApp(id){
  const a=byId.get(id);if(!a)return;currentApp=a;
  $('detailCover').innerHTML=cover(a);
  $('detailCategory').textContent=byCategory.get(a.region).name;
  $('detailTitle').textContent=a.title;$('detailDescription').textContent=a.description;
  $('detailEdition').textContent=a.edition||'';$('detailEdition').hidden=!a.edition;
  $('detailLaunch').hidden=!a.url;$('detailPending').hidden=!!a.url;$('detailNewTab').hidden=!a.url;
  if(a.url){$('detailLaunch').href=a.url;$('detailLaunch').setAttribute('aria-label',`Open ${a.title}, opens in a new tab`)}else $('detailLaunch').removeAttribute('href');
  syncFavorites();openDialog($('appDialog'));
 }
 $('detailFavorite').addEventListener('click',()=>{if(currentApp)toggleFavorite(currentApp.id)});
 $('surpriseButton').addEventListener('click',()=>{const available=apps.filter(a=>a.url);const pool=available.length>1?available.filter(a=>a.id!==previousRandom):available;const a=pool[Math.floor(Math.random()*pool.length)];if(a){previousRandom=a.id;showApp(a.id)}});
 function renderBrowse(){
  const query=$('searchInput').value.trim(),terms=normalized(query).split(' ').filter(Boolean);
  const visible=ordered.filter(a=>(browseCategory==='all'||a.region===browseCategory)&&(!favoritesOnly||favorites.has(a.id))&&terms.every(t=>normalized(`${a.title} ${a.description} ${a.tags.join(' ')} ${byCategory.get(a.region).name}`).includes(t)));
  $('browseTitle').textContent=favoritesOnly?'Your favorites':browseCategory==='all'?'All apps':byCategory.get(browseCategory).name;
  $('browseCount').textContent=`${visible.length} ${visible.length===1?'app':'apps'}${query?` matching “${query}”`:''}`;
  $('browseFavorites').setAttribute('aria-pressed',String(favoritesOnly));
  document.querySelectorAll('[data-browse-category]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.browseCategory===browseCategory)));
  $('browseGrid').innerHTML=visible.map(a=>`<article class="browse-item"><button class="browse-record" type="button" data-app="${a.id}" aria-label="View ${esc(a.title)}${a.url?'':', link coming soon'}" aria-haspopup="dialog">${cover(a,{sticker:true})}<strong>${esc(short(a))}</strong><small>${esc(byCategory.get(a.region).name)}</small></button><button type="button" class="browse-save" data-save="${a.id}" aria-pressed="${favorites.has(a.id)}" aria-label="${favorites.has(a.id)?'Remove':'Save'} ${esc(a.title)} ${favorites.has(a.id)?'from':'to'} favorites">${icon('heart')}</button></article>`).join('');
  $('browseEmpty').hidden=visible.length>0;
  $('emptyTitle').textContent=favoritesOnly&&favorites.size===0?'Your favorites start here.':'No apps found';
  $('emptyDescription').textContent=favoritesOnly&&favorites.size===0?'Save an app with its heart to keep it handy on this device.':'Try another name, activity, or category.';
 }
 function openBrowse({saved=false,search=false}={}){favoritesOnly=saved;browseCategory='all';$('searchInput').value='';renderBrowse();openDialog($('browseDialog'),search?$('searchInput'):undefined)}
 $('browseButton').addEventListener('click',()=>openBrowse());$('searchButton').addEventListener('click',()=>openBrowse({search:true}));$('favoritesButton').addEventListener('click',()=>openBrowse({saved:true}));
 $('searchInput').addEventListener('input',renderBrowse);
 $('browseFavorites').addEventListener('click',()=>{favoritesOnly=!favoritesOnly;renderBrowse()});
 $('browseCategories').addEventListener('click',e=>{const b=e.target.closest('[data-browse-category]');if(b){browseCategory=b.dataset.browseCategory;renderBrowse()}});
 $('clearSearch').addEventListener('click',()=>{favoritesOnly=false;browseCategory='all';$('searchInput').value='';renderBrowse();$('searchInput').focus()});
 $('browseGrid').addEventListener('click',e=>{const b=e.target.closest('[data-save]');if(!b)return;const id=b.dataset.save;toggleFavorite(id);($('browseGrid').querySelector(`[data-save="${id}"]`)||$('browseFavorites')).focus()});
 $('aboutButton').addEventListener('click',()=>openDialog($('aboutDialog')));
 document.addEventListener('keydown',e=>{if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)&&!e.target.isContentEditable&&!document.querySelector('dialog[open]')){e.preventDefault();openBrowse({search:true})}});
 syncFavorites();renderShelf();
})();
