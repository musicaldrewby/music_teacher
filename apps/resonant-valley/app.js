import {OpeningNightUI,openingState,audibleScore} from './opening-night.js';
import {upgradeVenues} from './venue-places.js';
import {recordSharingEnabled} from './record-sharing.js';
import {shareableRecords,listeningCopy,inbox,clearFiled,editionId} from './pressing-library.js';
import {keepOffline} from './offline-pack.js';
import {isTrack,TRACK_LIMIT,railEnds,stationGain} from './railway.js';
import {RailRide} from './rail-ride.js';
import {CABIN_PARTS,signData,mountRotation} from './cabin-parts.js';
import {RecordCrateUI} from './record-crate-ui.js';
import {makeSleeve,sleeveFor,cratePack} from './record-sleeve.js';
import {FieldUI} from './field-ui.js';
import {freshBar,restoreBar,ingredients,canCraft,makeRecipe} from './crafting.js';
import {WorldAudio} from './world-feedback.js';
import {itemArt} from './item-art.js';
import {FindReveal} from './find-reveal.js';
import {FindCues} from './find-cues.js';
import {BreakSession,breakTarget,effectiveTool} from './mining.js';
import {TOOLS,requiredTool,torchActive,equipmentIcon} from './equipment.js';
import {SOUNDS,sound,DEFAULT_PADS} from './catalog.js';
import {newCollection,normalizeCollection,hasSound,capacity,claimCache,playableSong} from './collection.js';
import {firstCaseHint} from './discovery-sites.js';
import {DiscoveryUI} from './discovery-ui.js';
import {World} from './world.js';
import {WorldControls} from './controls.js';
import {movementIntent,shoreJumpSpeed,SWIM_RISE,verticalSpeed} from './movement.js';
import {MIN_Y,MAX_Y,WORLD_LIMIT,WATER,GENERATOR_VERSION} from './terrain.js';
import {AudioEngine} from './audio.js';
import {Studio} from './studio.js';
import {BLOCKS,FURNITURE,ITEMS,RECIPES,COLORS,INSTRUMENTS,clamp,uid,emptySong,normalizeSong} from './data.js';
const $=id=>document.getElementById(id);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const savePrefix='resonant-valley:'+new URL('.',import.meta.url).pathname;
const SAVE_KEY=savePrefix+'world-v1',PREVIOUS_KEY=savePrefix+'previous-world';
let opening=openingState(),gigUI,gigRun=null,exchangeFrame=null,exchangeSelected=null;
let ride,stationVisit=null,stationPlayback=false,packedSigns=[];
let world,audio,studio,started=false,panel=null,mode='gather',selected=0,tab='Craft',rotation=0,hotbar=freshBar('gather'),otherBar=freshBar('creative');
let inventory={hand:1},records=[],buildingUndo=[],saveTimer=null,savedState=null,recordEntity=null,activeRecord=null,sensitivity=1;
let profile=newCollection(),discoveryUI,carryTorch=false,bareHand=false,lastToolHint=-Infinity;
let fieldUI,recordUI,packedCrates=[],recordRequest=0,pendingRecord=null,favorites=new Set();const fieldAudio=new WorldAudio();
const findCues=new FindCues();
const findVolume=()=>document.hidden||worldBusy?0:(audio?.volume??0)*(world?.atmosphere.effectsVolume??0)*(audio?.playing ? .65 : 1);
const finds=new FindReveal({cue:kind=>findCues.play(audio?.ctx,kind,findVolume()),itemIcon,itemName:id=>ITEMS[id].name,
 audition:piece=>auditionSound(piece).catch(error=>toast(error.message))});
const breaking=new BreakSession();let lastMiningSwing=-Infinity,lastMiningFrame=null;
let controls,velocityY=0,grounded=false,flying=false,target=null,lastPick=0,toastTimer=null,worldChanged=false,eyeHeight=1.66,mouseState='released',worldBusy=false;
let panelFromFree=false,hotbarSize='standard',idleSave=null;
const download=(blob,name)=>{const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name.replace(/[\\/:*?"<>|]/g,'-');document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);};
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500);if(panel)$('studio-status').textContent=message;}
function save(loud=false){if(worldBusy||!world?.stream||!studio)return false;try{const data=serialize();localStorage.setItem(SAVE_KEY,JSON.stringify(data));$('save-status').textContent='Saved on this device';worldChanged=false;if(loud)toast('World and music saved on this device.');return true;}catch(err){$('save-status').textContent='Download a backup';toast('Browser storage is unavailable or full. Download your world from the menu.');return false;}}
function scheduleSave(){worldChanged=true;$('save-status').textContent='Saving…';clearTimeout(saveTimer);if(idleSave!==null)window.cancelIdleCallback?.(idleSave);idleSave=null;saveTimer=setTimeout(()=>{const flush=()=>{idleSave=null;if(worldChanged)save();};if(window.requestIdleCallback)idleSave=window.requestIdleCallback(flush,{timeout:1600});else flush();},900);}
function serialize(){return {format:'resonant-valley-world',version:10,opening,equipmentVersion:2,packedSigns,packedCrates,carryTorch,bareHand,favorites:[...favorites],collection:profile,world:world.serialize(),mode,hotbar,otherBar,selected,inventory,records,song:studio.song,player:{x:world.camera.position.x,y:world.camera.position.y-eyeHeight+1.66,z:world.camera.position.z,yaw:world.camera.rotation.y,pitch:world.camera.rotation.x},settings:{hotbarSize,volume:audio.volume,time:world.time,sensitivity,mouseMode:controls?.dragMode?'drag':'mouse',viewDistance:world.viewDistance}};}
function validateState(data){if(!data||data.format!=='resonant-valley-world'||![1,2,3,4,5,6,7,8,9,10].includes(data.version)||!Array.isArray(data.world?.edits)||!Array.isArray(data.world?.entities))throw Error('Choose a Resonant Valley world file.');if(data.world.edits.length>180000||data.world.entities.length>300)throw Error('This world is too large for this version.');if(data.world.generator&&data.world.generator.version!==GENERATOR_VERSION)throw Error('This world needs a newer terrain generator.');const song=normalizeSong(data.song);const recs=(Array.isArray(data.records)?data.records:[]).slice(0,60).map((r,i)=>{
 const id=typeof r.id==='string'&&r.id.length?r.id.slice(0,80):uid();
 const colorIndex=Number.isInteger(r.colorIndex)?Math.abs(r.colorIndex)%COLORS.length:i%COLORS.length;
 return {id,painted:r.painted===true||(!r.edition&&r.sleeve&&r.sleeve!==makeSleeve(id)&&data.version<9),...(editionId(r.edition)?{edition:r.edition,artist:String(r.artist||'Valley artist').slice(0,32)}:{}),song:normalizeSong(r.song),color:COLORS[colorIndex],colorIndex,sleeve:sleeveFor({id,sleeve:r.sleeve})};
 });return {...data,song,records:recs};}
async function applyState(data,{keepCollection=false}={}){
 const s=validateState(data);opening=openingState(s.opening);world.openingBill=opening.bill;
 if(!(keepCollection&&s.collection?.id===profile.id))profile=normalizeCollection(s.collection,{generator:s.world.generator,habitats:s.version>=5});
 const oldStarter=s.version<7;
 const terrain=oldStarter?{...s.world,entities:s.world.entities.filter(e=>
  !(e&&e.id==='home-'+e.type&&['piano','marimba'].includes(e.type)&&!canUseItem(e.type)))}:s.world;
 world.setDiscoveryClaims(profile.claimed);world.setViewDistance(s.settings?.viewDistance??3);await world.load(terrain,s.player);if(s.version<9)upgradeVenues(world);
 mode=s.mode==='creative'?'creative':'gather';
 inventory={hand:1};if(s.inventory&&typeof s.inventory==='object')for(const [id,n] of Object.entries(s.inventory))if(Object.hasOwn(ITEMS,id))inventory[id]=clamp(n,0,99999)|0;
 inventory.hand=1;
 const otherMode=mode==='creative'?'gather':'creative';
 const loadBar=(raw,m)=>restoreBar(raw,m,id=>canUseItem(id)&&(m==='creative'||!TOOLS[id]||inventory[id]>0));
 hotbar=loadBar(s.hotbar,mode);otherBar=loadBar(s.otherBar,otherMode);selected=Number.isInteger(s.selected)&&s.selected>=0&&s.selected<9?s.selected:0;
 if(oldStarter&&!hasSound(profile,'piano')&&inventory.piano>0){inventory.piano--;if(!inventory.piano)delete inventory.piano;}
 const oldTrack=s.song.tracks[0];
 if(oldStarter&&!hasSound(profile,'piano')&&s.song.tracks.length===1&&oldTrack.instrument==='piano'&&!oldTrack.notes.length){
  oldTrack.instrument=null;oldTrack.name='Empty track';
 }
 carryTorch=!!s.carryTorch;bareHand=!!s.bareHand;favorites=new Set((Array.isArray(s.favorites)?s.favorites:[]).filter(id=>Object.hasOwn(ITEMS,id)).map(String));cancelMining();
 records=s.records;
 packedSigns=(Array.isArray(s.packedSigns)?s.packedSigns:[]).filter(p=>p&&typeof p.id==='string').slice(-300).map(e=>({id:e.id.slice(0,80),...signData(e)}));
 packedCrates=(Array.isArray(s.packedCrates)?s.packedCrates:[]).filter(p=>p&&typeof p.id==='string').slice(0,Math.min(300,inventory.crate||0)).map(cratePack);
 world.setRecordLibrary(records);setHotbarSize(s.settings?.hotbarSize);studio.load(s.song);studio.fillEmptyTrack(sound(profile.owned[0]));audio.setVolume(clamp(s.settings?.volume??.65,0,1));sensitivity=clamp(s.settings?.sensitivity??1,.3,2);
 if(!s.world.atmosphere){const phase={day:.32,sunset:.76,night:.92}[s.settings?.time]??.32;world.atmosphere.day=phase;world.setTime('cycle');}$('master-volume').value=audio.volume;$('sensitivity').value=sensitivity;$('daylight').value=world.time;
 velocityY=0;eyeHeight=1.66;flying=false;grounded=false;buildingUndo=[];
 if(controls)controls.setDragMode(s.settings?.mouseMode==='drag');$('mouse-controls').value=s.settings?.mouseMode==='drag'?'drag':'mouse';
 updateMode();renderHotbar();refreshWorldInfo();world.setDiscoveryClaims(profile.claimed);
}
function refreshWorldInfo(){
 $('current-seed').textContent=world.seed;
 $('generator-label').textContent=world.generator.legacy?'Original valley preserved · New terrain beyond':'Seeded landscape';
 $('view-distance').value=world.viewDistance;
 try{$('previous-world').disabled=!localStorage.getItem(PREVIOUS_KEY);}catch{$('previous-world').disabled=true;}
}
function randomSeed(){const a=new Uint32Array(2);crypto.getRandomValues(a);return Array.from(a,n=>n.toString(36)).join('-');}
function openWorldCreation(){document.querySelector('[name="world-start"][value="fresh"]').checked=true;$('world-seed').value=randomSeed();$('world-create-status').textContent='';openPanel('new-world-panel');}
async function changeWorld(action,{backup=false,message='Your world is ready.'}={}){
 if(worldBusy)return;const before=serialize();
 if(backup){try{localStorage.setItem(PREVIOUS_KEY,JSON.stringify(before));}catch{toast('Could not keep a backup. Download your world before creating another one.');return;}}
 worldBusy=true;refreshMousePrompt();finds.clear();findCues.stop();ride?.reset();stationVisit=null;controls?.release();clearTimeout(saveTimer);audio.stop();stopRecordUI();studio.releaseAll();
 $('loading-message').textContent='Growing your valley…';$('loading').classList.remove('hidden');
 let success=false;
 try{await action();velocityY=0;eyeHeight=1.66;flying=false;grounded=false;buildingUndo=[];target=null;refreshWorldInfo();await prepareArrival();success=true;}
 catch(error){console.error(error);try{await applyState(before);}catch(restoreError){console.error(restoreError);}toast('World could not load: '+error.message);}
 finally{worldBusy=false;$('loading').classList.add('hidden');refreshMousePrompt();}
 if(success){save();closePanel(false);toast(message);$('welcome-save').textContent='Your saved valley is ready.';$('enter-world').innerHTML='Return to the valley <span>↗</span>';}
}
function switchMode(next){
 if(next!==mode){[hotbar,otherBar]=[otherBar,hotbar];mode=next;selected=0;bareHand=false;}
 updateMode();
}
function updateMode(){cancelMining();$('mode-badge').textContent=mode==='creative'?'FREE BUILD':'DISCOVERY';$('world-mode').value=mode;document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));if(mode!=='creative')flying=false;renderHotbar();studio?.sync();if(panel==='collection-panel')discoveryUI?.render();}
function itemIcon(id){return TOOLS[id]||id==='torch'?equipmentIcon(id):itemArt(id,ITEMS[id]);}
function heldItem(){return bareHand?'hand':hotbar[selected]??'hand';}
function selectSlot(index){cancelMining();selected=index;bareHand=false;renderHotbar();}
function toggleHand(){cancelMining();bareHand=!bareHand;renderHotbar();scheduleSave();}
function setHotbarSize(value){
 hotbarSize=['compact','large'].includes(value)?value:'standard';
 document.body.dataset.hotbarSize=hotbarSize;$('hotbar-size').value=hotbarSize;
}
function facingText(id){
 const heading=['N','E','S','W'],name=ITEMS[id].name;
 if(id==='rail')return name+' · '+(rotation%2?'E–W':'N–S');
 if(id==='railGrade')return name+' · rises '+heading[rotation];
 if(id==='railBend'||id==='railSwitch')return name+' · '+railEnds({type:id,r:rotation},true).map(i=>heading[i]).join(' / ');
 return name+(FURNITURE[id]&&id!=='torch'?' · '+heading[rotation]:'');
}
function renderHotbar(){
 const bar=$('hotbar');
 hotbar.forEach((id,i)=>{
  let button=bar.children[i];
  if(!button){button=document.createElement('button');button.type='button';button.onclick=()=>selectSlot(i);bar.append(button);}
  const active=i===selected&&!bareHand,name=ITEMS[id]?.name||'Empty slot';
  button.className='slot'+(active?' active':'');button.setAttribute('aria-pressed',String(active));
  button.setAttribute('aria-label',`${i+1}: ${name}`);button.setAttribute('aria-keyshortcuts',String(i+1));button.title=name;
  if(button.dataset.item!==String(id)){
   button.dataset.item=String(id);button.innerHTML=`<small>${i+1}</small>${id!=null?itemIcon(id):''}<span class="count"></span>`;
  }
  button.lastElementChild.textContent=mode==='creative'||id==null||id==='hand'?'':inventory[id]||0;
 });
 const item=heldItem();$('selection-name').textContent=facingText(item);
 $('touch-rotate').hidden=!(isTrack(item)||FURNITURE[item]&&item!=='torch');
 $('bare-hand').classList.toggle('active',item==='hand');$('bare-hand').setAttribute('aria-pressed',String(item==='hand'));
}

function refreshMousePrompt(){
 const mouseOnly=controls&&!controls.coarse&&!controls.dragMode;
 const show=started&&!panel&&!worldBusy&&(controls?.suspended||mouseOnly&&!controls.locked);
 $('cursor-tools').classList.toggle('hidden',!show);
 $('use-drag').classList.toggle('hidden',mouseState!=='blocked');
 $('open-game-tab').classList.toggle('hidden',mouseState!=='blocked');
 $('capture-mouse').textContent=mouseState==='requesting'?'Entering…':'Resume';
 $('capture-mouse').disabled=mouseState==='requesting';
 document.body.classList.toggle('cursor-free',!!show);
 if(show||panel){world.outline.visible=false;$('interact-hint').classList.add('hidden');$('target-label').textContent='';}
 const roaming=started&&!panel&&!worldBusy&&!show,touch=!!controls?.coarse;
 document.body.classList.toggle('pointer-locked',!!controls?.locked);document.body.classList.toggle('roaming',roaming);
 document.body.classList.toggle('touch-play',touch);$('touch-controls').hidden=!(touch&&roaming);
 $('bare-hand').textContent=touch?'Fist':'Fist · 0';
 $('touch-lower').hidden=!flying;
 $('crosshair').classList.toggle('hidden',!!panel||!!show);
 $('lock-look').textContent=controls?.locked?'Esc · Cursor':controls?.dragMode?'Enable mouse look':'Resume mouse look';
 $('look-hint').textContent=controls?.dragMode?'Drag':'Mouse';
 $('break-hint').textContent=controls?.dragMode?'Hold G':'Hold LMB';
}
function openPanel(id,extra){
 if(id==='exchange-panel'&&!recordSharingEnabled)return;
 if(panel==='discovery-panel'&&id!==panel)finds.end();
 cancelMining();if(panel==='exchange-panel'&&id!==panel)closeExchange();
 if(!panel)panelFromFree=!!(started&&controls&&(controls.suspended||(!controls.locked&&!controls.dragMode&&!controls.coarse)));
 if(panel==='studio-panel')studio.hide();
 document.querySelectorAll('.panel,.studio').forEach(e=>e.classList.add('hidden'));
 panel=id;controls?.release();$(id).classList.remove('hidden');$('modal-backdrop').classList.remove('hidden');
 world.outline.visible=false;$('target-label').textContent='';$('interact-hint').classList.add('hidden');
 if(id==='opening-panel')gigUI.open(extra);
 if(id==='exchange-panel'){audio.stop();stopRecordUI();showExchange(extra);}
 fieldUI?.opened(id);if(id==='studio-panel'){recordRequest++;pendingRecord=null;if(activeRecord){audio.stop();stopRecordUI();}audio.setDistanceGain(1);studio.show(extra);}if(id==='inventory-panel')renderInventory();if(id==='records-panel')recordUI.open(extra);if(id==='collection-panel')discoveryUI.render();
 if(id==='studio-panel'&&profile.owned.length)audio.init().catch(e=>toast(e.message));
 refreshMousePrompt();
}
function closePanel(resume=true){
 if(panel==='discovery-panel'){
  const origin=finds.origin;finds.end();
  if(origin){openPanel('collection-panel');($(origin).disabled?$('collection-studio'):$(origin)).focus({preventScroll:true});return;}
 }
 if(panel==='exchange-panel')closeExchange();
 if(panel==='studio-panel')studio.hide();if(panel)$(panel).classList.add('hidden');panel=null;
 $('modal-backdrop').classList.add('hidden');controls?.clear();scheduleSave();
 const play=resume==='play'||(resume!==false&&!panelFromFree);panelFromFree=false;
 if(started){if(play)controls?.requestLook();else controls?.suspend();}refreshMousePrompt();
}
function canUseItem(id){const instrument=FURNITURE[id]?.instrument;return !instrument||hasSound(profile,instrument);}
function nearCraftingBench(){
 const p=world.camera.position;
 return world.entities.some(e=>e.type==='workbench'&&Math.hypot(e.x+.5-p.x,e.y+.85-p.y,e.z+.5-p.z)<=7.5);
}
function assignSlot(item,select){
 if(ITEMS[item]?.component)return;
 let i=hotbar.findIndex(id=>id!=null&&String(id)===String(item));
 if(i<0){i=hotbar.indexOf(null);if(i<0){if(!select)return;i=selected;}hotbar[i]=item;}
 if(select){selected=i;bareHand=false;cancelMining();}
}
function craftRecipe(recipe){
 if(!canUseItem(recipe.item)||!makeRecipe(recipe,inventory,mode,nearCraftingBench()))return;
 assignSlot(recipe.item,true);renderInventory();renderHotbar();scheduleSave();
 toast(mode==='creative'?ITEMS[recipe.item].name+' available in Free build.':ITEMS[recipe.item].name+' × '+recipe.count+' crafted.');
}
function addRecipe(grid,recipe,atBench){
 const row=document.createElement('div');row.className='craft-card';
 const cost=ingredients(recipe,inventory),free=mode==='creative';
 const requirements=cost.map(i=>`<span class="ingredient ${free||i.have>=i.need?'enough':'missing'}">${free?i.need:i.have+' / '+i.need} ${i.name}</span>`).join(' ');
 const station=recipe.bench?`<small class="bench-tag">${atBench||free?'Crafting bench':'Needs a nearby crafting bench'}</small>`:'';
 row.innerHTML=`${itemIcon(recipe.item)}<div><strong>${ITEMS[recipe.item].name}${recipe.count>1?' × '+recipe.count:''}</strong><small class="ingredients">${requirements}</small>${station}</div><button type="button">Craft</button>`;
 const button=row.querySelector('button');button.disabled=!canCraft(recipe,inventory,mode,atBench);
 button.setAttribute('aria-label','Craft '+ITEMS[recipe.item].name);button.onclick=()=>craftRecipe(recipe);grid.append(row);
}
function renderInventory(){
 $('rail-guide').classList.toggle('hidden',tab!=='Railway');
 $('inventory-mode').textContent=mode==='creative'?'Unlimited materials':'Your gathered materials';$('inventory-note').textContent=tab==='Craft'?(mode==='creative'?'Choose a recipe to use in Free build.':nearCraftingBench()?'Crafting bench in reach · Make boards from logs, then carve sticks. Ingredients show have / need.':'Hand crafting · Punch a log and walk over it. Turn logs into boards, then sticks. Ingredients show have / need.'):'Choose a backpack item to put in your selected hotbar slot.' ;const grid=$('inventory-grid');grid.replaceChildren();document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
 const query=$('bag-search').value.trim().toLowerCase(),onlyFavorites=$('bag-favorites').checked,sort=$('bag-sort').value;
 if(tab==='Craft'){const recipes=[...RECIPES];if(sort==='name')recipes.sort((a,b)=>ITEMS[a.item].name.localeCompare(ITEMS[b.item].name));if(sort==='quantity')recipes.sort((a,b)=>(inventory[b.item]||0)-(inventory[a.item]||0));const bench=nearCraftingBench();for(const recipe of recipes){if(!canUseItem(recipe.item)||!ITEMS[recipe.item].name.toLowerCase().includes(query)||onlyFavorites&&!favorites.has(String(recipe.item)))continue;addRecipe(grid,recipe,bench);}if(!grid.childElementCount)grid.textContent='No matching recipes.';return;}
 const list=Object.entries(ITEMS).filter(([id,it])=>it.category!=='Discovery'&&(query||tab==='All'||it.category===tab)&&canUseItem(id)&&it.name.toLowerCase().includes(query)&&(!onlyFavorites||favorites.has(id)));
 if(sort==='name')list.sort((a,b)=>a[1].name.localeCompare(b[1].name));if(sort==='quantity')list.sort((a,b)=>(inventory[b[0]]||0)-(inventory[a[0]]||0)||a[1].name.localeCompare(b[1].name));
 for(const [id,it]of list){const wrap=document.createElement('div');wrap.className='bag-item';const b=document.createElement('button');b.className='item-card'+(String(heldItem())===id?' selected':'');b.innerHTML=`${itemIcon(id)}<span>${it.name}</span><span class="item-count">${mode==='creative'?'∞':inventory[id]||0}</span>`;b.disabled=mode==='gather'&&!(inventory[id]>0)||!!it.component;
  b.onclick=()=>{if(b.disabled)return;bareHand=false;cancelMining();hotbar[selected]=BLOCKS[id]?Number(id):id;renderHotbar();renderInventory();scheduleSave();};const star=document.createElement('button');star.className='bag-star'+(favorites.has(id)?' on':'');star.textContent=favorites.has(id)?'★':'☆';star.setAttribute('aria-label',(favorites.has(id)?'Unfavorite ':'Favorite ')+it.name);star.setAttribute('aria-pressed',String(favorites.has(id)));star.onclick=()=>{favorites.has(id)?favorites.delete(id):favorites.add(id);scheduleSave();renderInventory();};wrap.append(b,star);
 const recipe=mode==='gather'&&it.category===tab&&(tab==='Tools'||tab==='Railway')?RECIPES.find(r=>r.item===id):null;
 if(recipe){
  const craft=document.createElement('button');craft.className='rail-craft';craft.textContent='Craft × '+recipe.count;
  const req=ingredients(recipe,inventory);craft.title=req.map(i=>i.need+' '+i.name).join(' + ')+(recipe.bench?' · Crafting bench':'');
  const cost=document.createElement('small');cost.textContent=craft.title;craft.append(cost);craft.setAttribute('aria-label','Craft '+it.name);craft.disabled=!canCraft(recipe,inventory,mode,nearCraftingBench());craft.onclick=()=>craftRecipe(recipe);wrap.append(craft);
 }
 grid.append(wrap);}
 if(!list.length)grid.textContent='No matching items.';
}
function remember(action){buildingUndo.push(action);if(buildingUndo.length>60)buildingUndo.shift();scheduleSave();}
function hideBreakFeedback(){world?.showBreakDamage(null,0);$('mining-progress').classList.add('hidden');$('mining-progress').setAttribute('aria-valuenow','0');$('mining-fill').style.width='0%';$('mining-label').textContent='';}
function cancelMining(){breaking.reset();hideBreakFeedback();lastMiningSwing=-Infinity;lastMiningFrame=null;}
function updateMining(){
 if(!controls?.mining||worldBusy||ride?.cart){if(breaking.key||!$('mining-progress').classList.contains('hidden'))cancelMining();return;}
 const now=performance.now(),elapsed=lastMiningFrame===null?0:(now-lastMiningFrame)/1000;lastMiningFrame=now;
 const hit=world.pick(),description=breakTarget(hit,heldItem(),inventory,mode),result=breaking.step(description,elapsed);
 if(!description){cancelMining();return;}
 if(now-lastMiningSwing>=330){world.swingTool();if(result.state==='working'){world.feedback?.hit(hit);fieldAudio.hit(description.item);}lastMiningSwing=now;}
 if(result.state==='complete'){
  hideBreakFeedback();completeBreak(description.hit);return;
 }
 if(result.state==='cooldown'){hideBreakFeedback();return;}
 const meter=$('mining-progress'),blocked=result.state==='blocked',percent=Math.floor(result.progress*100);
 meter.classList.remove('hidden');meter.classList.toggle('blocked',blocked);meter.setAttribute('aria-valuenow',String(percent));
 $('mining-fill').style.width=percent+'%';$('mining-label').textContent=blocked?description.reason||'This cannot be broken.':`${ITEMS[description.item]?.name||'Discovery case'} · ${percent}%`;
 $('interact-hint').classList.add('hidden');world.showBreakDamage(blocked?null:description,result.progress);
 if(blocked&&now-lastToolHint>2000){toast(description.reason||'This cannot be broken.');lastToolHint=now;}
}
function gatherItem(id,count=1,place=''){
 inventory[id]=(inventory[id]||0)+count;assignSlot(id,false);finds.pickup(id,count,place);
}
function collectDrop(d){
 if(d.pack&&d.item==='crate')packedCrates.push(d.pack);
 if(d.pack&&d.item==='sign')packedSigns.push(d.pack);
 gatherItem(d.item);renderHotbar();scheduleSave();
}
function leaveDrop(item,cell,extra){return mode==='gather'?world.drops.spawn(item,cell,extra):null;}
function completeBreak(hit){
 world.feedback?.hit(hit,true);fieldAudio.hit(hit.entity?.type??hit.id,true);
 if(hit.entity?.discovery){openDiscovery({...hit.entity,id:hit.entity.siteId});return;}
 if(hit.id===29){const site=world.discoveryAt(hit.cell.x,hit.cell.y,hit.cell.z);if(site)openDiscovery(site);return;}
 if(mode==='gather'&&world.drops.full){toast('Pick up some loose items before breaking more.');return;}
 if(isTrack(hit.entity?.type)){
  const t=hit.entity;if(cartOn(t)){toast('Pick up the cart before lifting its track.');return;}
  if(world.railway.at(t.x,t.y,t.z)!==t)return;world.railway.remove(t);refreshRail(t);
  remember({type:'rail-remove',rail:{...t},item:t.type,dropId:leaveDrop(t.type,t),mode});return;
 }
 if(hit.entity){
  const e=world.removeEntity(hit.entity.id);if(!e)return;
  if(e.type==='sign'&&mode==='creative'&&packedSigns.length<300)packedSigns.push({id:e.id,...signData(e)});
  if(activeRecord&&recordEntity?.id===e.id){audio.stop();stopRecordUI();}
  remember({type:'remove-entity',entity:{...e},item:e.type,dropId:leaveDrop(e.type,e,e),mode});return;
 }
 const {x,y,z}=hit.cell;if(y<=MIN_Y||world.get(x,y,z)!==hit.id||!world.set(x,y,z,0))return;
 remember({type:'block',x,y,z,old:hit.id,next:0,item:hit.id,dropId:leaveDrop(hit.id,hit.cell),mode});target=null;
}

function toggleCarriedTorch(){
 if(!carryTorch&&mode!=='creative'&&!(inventory.torch>0)){toast('Craft torches in Backpack → Craft.');return;}carryTorch=!carryTorch;scheduleSave();updateHeldEquipment();
}
function updateHeldEquipment(){
 const lit=torchActive(inventory,mode,carryTorch),visible=started&&!panel&&!worldBusy;world.setHeldEquipment({tool:effectiveTool(heldItem(),inventory,mode),torch:lit,visible});
 const button=$('carry-torch'),label=(lit?'Torch on':controls?.coarse?'Torch':'Carry torch')+(controls?.coarse?'':' · T');if(button.textContent!==label)button.textContent=label;button.classList.toggle('active',lit);button.setAttribute('aria-pressed',String(lit));button.classList.toggle('hidden',!visible);$('bare-hand').classList.toggle('hidden',!visible);
}

const cartOn=t=>world.entities.find(e=>e.type==='minecart'&&e.x===t.x&&e.y===t.y&&e.z===t.z);
function refreshRail(t){world.refreshTrackMesh(Math.floor(t.x/16)+','+Math.floor(t.z/16));}
function placeRail(id,hit){
 if(mode==='gather'&&!(inventory[id]>0)){toast('Craft '+ITEMS[id].name+' in Backpack → Railway.');return;}
 const onTrack=isTrack(hit?.entity?.type)?hit.entity:null;
 if(id==='minecart'){
  if(!onTrack){toast('Aim at the rails to set down your minecart.');return;}
  if(cartOn(onTrack)){toast('There is already a cart here.');return;}
  if(world.entities.length>=300){toast('This valley can hold 300 furniture pieces and carts.');return;}
  const e=world.addEntity({type:id,x:onTrack.x,y:onTrack.y,z:onTrack.z,enter:railEnds(onTrack)[0],travel:.5});
  remember({type:'add-entity',entity:{...e},mode});toast('Cart ready. Right-click it or press F to board.');
 }else{
  const draft=onTrack?world.railway.extension(onTrack,hit.point,id,rotation):hit?.place?{...hit.place,type:id,r:rotation}:null;
  if(!draft){toast('Aim at the ground or the end of a track to lay rail.');return;}
  const {x,y,z}=draft,base=world.get(x,y-1,z);
  if(!world.isReady(x,z)||!base||base===WATER||world.get(x,y,z)||world.railway.at(x,y,z)||world.entities.some(e=>e.x===x&&e.y===y&&e.z===z)){
   toast('Track needs a clear space on solid ground. Build a block beneath a gap.');return;
  }
  if(world.railway.tiles.size>=TRACK_LIMIT){toast('This railway has reached its track limit.');return;}
  const t=world.railway.put(draft);if(!t)return;refreshRail(t);remember({type:'rail-add',rail:{...t},mode});
 }
 if(mode==='gather')inventory[id]--;renderHotbar();
}
function occupiesPlayer(box){
 if(!box)return false;
 const p=world.camera.position;
 return p.x+.28>box.x&&p.x-.28<box.x+box.w&&p.z+.28>box.z&&p.z-.28<box.z+box.d&&p.y>box.y+.01&&p.y-eyeHeight<box.y+box.h-.01;
}
function place(){
 cancelMining();if(ride?.cart)return;
 target=world.pick();const id=heldItem();
 if(isTrack(id)||id==='minecart'){placeRail(id,target);return;}
 if(!target?.place){toast('Aim at the ground or a block face to place an item.');return;}
 const {x,y,z}=target.place;
 if(!canUseItem(id)){toast('Discover this instrument before placing it.');return;}
 if(TOOLS[id]||ITEMS[id]?.component){toast(ITEMS[id]?.component?'Use sticks in Backpack → Craft.':'Choose a block or torch to place.');return;}
 if(y>MAX_Y||y<=MIN_Y||Math.abs(x)>WORLD_LIMIT||Math.abs(z)>WORLD_LIMIT){toast('This is the building limit.');return;}
 if(mode==='gather'&&!(inventory[id]>0)){toast('Gather materials or craft this item in your backpack.');return;}
 const previous=world.get(x,y,z);if(previous&&previous!==WATER||world.railway.at(x,y,z)){toast('That space is occupied.');return;}
 const p=world.camera.position;if(occupiesPlayer({x,y,z,w:1,d:1,h:1})){toast('Take a step back to place here.');return;}
 if(FURNITURE[id]){
  if(world.entities.length>=300){toast('This valley can hold 300 furniture pieces and carts.');return;}
  if(world.entities.some(e=>e.x===x&&e.y===y&&e.z===z)){toast('There is already furniture in that space.');return;}
  const pack=id==='crate'&&mode==='gather'?packedCrates.at(-1):id==='sign'?packedSigns.at(-1):null;
  const face=[x-target.cell.x,y-target.cell.y,z-target.cell.z],r=mountRotation(id,face,rotation);
  const e=world.addEntity({...pack,type:id,x,y,z,r,lit:true,face:['torch','sign','shutter'].includes(id)?face:null});
  if(world.collides(p.x,p.y-eyeHeight,p.z)){world.removeEntity(e.id);toast('Take a step back to place this furniture.');return;}
  if(pack)(id==='sign'?packedSigns:packedCrates).pop();remember({type:'add-entity',entity:{...e},mode});world.feedback?.placed(e);
 }else{
  if(!world.set(x,y,z,Number(id)))return;
  remember({type:'block',x,y,z,old:previous,next:Number(id),item:id,delta:mode==='gather'?-1:0});
 }
 if(mode==='gather')inventory[id]--;world.feedback?.hit({cell:{x,y,z},id});fieldAudio.hit(id);renderHotbar();target=null;
}
function undoBuild(){
 cancelMining();const a=buildingUndo.pop();if(!a){toast('Nothing to undo yet.');return;}
 const refuse=note=>{buildingUndo.push(a);toast(note);};
 const waiting=a.dropId&&world.drops.has(a.dropId);
 if(a.dropId){
  const cell=a.entity||a.rail||a;
  if(!world.isReady(cell.x,cell.z)){refuse('Return to that part of the valley to undo.');return;}
  const pack=a.item==='crate'?packedCrates:a.item==='sign'?packedSigns:null;
  if(!waiting&&(!(inventory[a.item]>0)||pack&&!pack.some(p=>p.id===a.entity.id))){refuse('That pickup has already been used.');return;}
  const bounds=a.type==='block'||a.entity&&['steps','roofSlope'].includes(a.item)?{x:cell.x,y:cell.y,z:cell.z,w:1,h:1,d:1}:a.entity?world.entityBounds(a.entity):null;
  if(occupiesPlayer(bounds)){refuse('Take one step back to restore the original item.');return;}
  const voxel=world.get(cell.x,cell.y,cell.z),rail=world.railway.at(cell.x,cell.y,cell.z);
  if((voxel&&voxel!==WATER)||(rail&&a.item!=='minecart')||world.entities.some(e=>e.x===cell.x&&e.y===cell.y&&e.z===cell.z)){refuse('Clear the original space before undoing.');return;}
 }
 if(a.type==='rail-add'||a.type==='rail-remove'){
  const t=a.rail;
  if(a.type==='rail-add'){
   const current=world.railway.at(t.x,t.y,t.z);if(!current||cartOn(t)){buildingUndo.push(a);toast('Move the cart before undoing this track.');return;}
   world.railway.remove(current);if(a.mode==='gather')inventory[t.type]=(inventory[t.type]||0)+1;
  }else{
   if(!world.railway.put(t)){buildingUndo.push(a);toast('The railway space is occupied.');return;}
  }
  refreshRail(t);
 }
 if(a.type==='block'){if(!world.set(a.x,a.y,a.z,a.old)){refuse('The original block could not be restored.');return;}if(a.delta)inventory[a.item]=Math.max(0,(inventory[a.item]||0)-a.delta);}
 if(a.type==='add-entity'){
  if(ride?.cart?.id===a.entity.id)ride.leave();
  const removed=world.removeEntity(a.entity.id);
  if(removed?.type==='sign')packedSigns.push({id:removed.id,...signData(removed)});
  if(a.mode==='gather'){
   inventory[a.entity.type]=(inventory[a.entity.type]||0)+1;
   if(removed?.type==='crate')packedCrates.push(cratePack(removed));
  }
 }
 if(a.type==='remove-entity'){
  if(a.entity.type==='sign'&&a.mode==='creative')packedSigns=packedSigns.filter(p=>p.id!==a.entity.id);
  if(world.entities.length>=300){refuse('Make space for the original furnishing before undoing.');return;}
  world.addEntity(a.entity);
 }
 if(a.dropId){
  if(waiting)world.drops.remove(a.dropId);
  else{
   inventory[a.item]--;
   if(a.item==='crate')packedCrates=packedCrates.filter(p=>p.id!==a.entity.id);
   if(a.item==='sign')packedSigns=packedSigns.filter(p=>p.id!==a.entity.id);
  }
 }
 renderHotbar();scheduleSave();toast('Last building action undone.');
}
function interact(entity=null){cancelMining();
 if(ride?.cart&&!entity){ride.leave();velocityY=0;eyeHeight=1.66;scheduleSave();return;}target=world.pick();if(target?.id===29){toast(controls.coarse?'Hold Mine with a stone pickaxe to recover this case.':'Hold left-click or G with a stone pickaxe to recover this case.');return;}const e=entity||target?.entity||world.nearestEntity();if(!e){toast('Walk closer to an instrument, record player, or crafting bench.');return;}if(isTrack(e.type)){const parked=cartOn(e);if(parked&&!ride?.cart){interact(parked);return;}if(e.type==='railSwitch'){
 if(cartOn(e)){toast('Move the cart off the switch before changing it.');return;}
 e.switched=!e.switched;refreshRail(e);scheduleSave();toast(e.switched?'Switch set to the branch.':'Switch set to the straight line.');
 }else toast('Place a minecart here, or select track and aim at an end to extend it.');return;}
 if(e.type==='minecart'){if(ride.board(e)){flying=false;grounded=false;eyeHeight=1.66;velocityY=0;}return;}
 if(e.type==='gigPoster'){openPanel('opening-panel');return;}if(e.type==='exchangeCrate'){openPanel(recordSharingEnabled?'exchange-panel':'records-panel');return;}
 if(e.type==='shutter'){e.open=!e.open;world.refreshEntity(e);scheduleSave();return;}
 if(e.type==='sign'){openPanel('records-panel',{sign:e});return;}
 if(e.discovery){openDiscovery({...e,id:e.siteId});return;}if(e.type==='bed'){if(world.skipToMorning()){scheduleSave();toast('A new morning in the valley.');}else toast('The sky is fixed. Unfreeze the living cycle to rest until morning.');return;}if(e.type==='door'){world.toggleDoor(e);scheduleSave();return;}if(e.type==='record'||e.type==='crate'){openPanel('records-panel',e.type==='crate'?{crate:e}:{player:e});return;}if(e.type==='workbench'){tab='Craft';openPanel('inventory-panel');return;}if(e.type==='bench'){toast('A quiet place to enjoy your world.');return;}if(e.type==='lantern'||e.type==='torch'){world.toggleLight(e);scheduleSave();toast(e.lit?'Light on.':'Light extinguished.');return;}if(e.type==='desk'||FURNITURE[e.type].instrument){if(!canUseItem(e.type)){toast('Discover this instrument to play its sound.');return;}openPanel('studio-panel',FURNITURE[e.type].instrument);return;}toast(ITEMS[e.type].name);}
async function returnHome(){await changeWorld(async()=>{world.resetView();await world.ready(2);world.ensureStandingSpace();},{message:'Back at your cabin.'});}
function collectionChanged(){world.setDiscoveryClaims(profile.claimed);studio.sync();renderHotbar();save();}
async function auditionSound(piece){if(!piece||!hasSound(profile,piece.id))return;findCues.stop();await audio.init();if(!hasSound(profile,piece.id))return;audio.setRoom(0);audio.setEcho(0);const drum=piece.kind==='drum';audio.audition(drum?'drums':piece.id,drum?36:60,drum?.5:1.4,.7,.7,drum?{36:piece.id}:null);}
function useSound(piece){
 if(!piece||!hasSound(profile,piece.id))return;
 if(piece.kind==='instrument'){openPanel('studio-panel',piece.id);if(studio.track().instrument!==piece.id)toast('Choose this sound in the Instrument menu to replace a track, or expand your studio.');return;}
 openPanel('studio-panel','drums');const tr=studio.track();if(tr.instrument!=='drums'){toast('Add a drum track or change this track to Custom drum kit.');return;}
 if(!Object.values(tr.pads||{}).includes(piece.id)){studio.history();tr.pads??={};let lane=piece.note;if(tr.pads[lane])lane=Array.from({length:73},(_,i)=>i+24).find(n=>!tr.pads[n]);if(lane!==undefined){tr.pads[lane]=piece.id;studio.sync();studio.changed();}}
 studio.kitEditor();
}
function openDiscovery(site){
 if(!site)return;
 const wasEmpty=profile.owned.length===0;
 const result=claimCache(profile,world.generator,site);if(!result){toast('This case has already been collected.');return;}
 profile=result.profile;const found=result.rewards.find(r=>r.kind==='sound'&&!r.duplicate);
 if(wasEmpty&&found)studio.fillEmptyTrack(sound(found.id));
 if(site.buried)world.set(site.x,site.y,site.z,0);world.setDiscoveryClaims(profile.claimed);save();studio.sync();
 if(finds.showCase(site,result,wasEmpty?found?.id:null))openTreasure();
}
function openTreasure(){openPanel('discovery-panel');$('discovery-title').focus({preventScroll:true});}
function tryDiscovery(){
 const r=finds.featured;if(!r)return;
 if(r.kind==='sound'){useSound(sound(r.id));return;}
 openPanel('studio-panel');
 if(['reverb','delay','mixer'].includes(r.kind)&&$('advanced-controls').classList.contains('hidden'))$('advanced-toggle').click();
 const control=r.kind==='mixer'?$('track-list').querySelector('.track-mixer input'):$(r.kind==='expansion'?'add-track':r.kind);
 if(control&&!control.disabled)control.focus({preventScroll:true});
}
function updateDiscoveryHint(){
 const hint=$('discovery-hint');if(panel||!started){hint.classList.add('hidden');return;}
 const p=world.camera.position,sites=[...(world.discoveryEntities?.values()||[])];const nearest=sites.sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
 hint.textContent=nearest?.starter?firstCaseHint(world.generator):nearest&&Math.hypot(nearest.x-p.x,nearest.z-p.z)<7?'An instrument case is nearby.':'';hint.classList.toggle('hidden',!hint.textContent);
}
function saveRecord(song,quiet=false){
 if(records.length>=60){toast('Your shelf is full. Download your compositions before adding more.');return;}
 const id=uid(),colorIndex=records.length%COLORS.length;
 const record={id,colorIndex,color:COLORS[colorIndex],song:normalizeSong(song),sleeve:makeSleeve(id)};records.push(record);
 world.setRecordLibrary(records,id);scheduleSave();if(!quiet)toast('Record saved to your shelf.');return record;
}
function renderRecords(){if(panel==='records-panel')recordUI?.refresh();}
function canHearRecord(record){
 if(record.edition)return audibleScore(record.song);
 if(!record.song.tracks.some((t,i)=>i<profile.capacity&&hasSound(profile,t.instrument)))return false;
 return !record.song.tracks.some(t=>t.notes.length)||playableSong(record.song,profile).tracks.some(t=>t.notes.length);
}
function emitterDistance(e){
 const p=world.camera.position;return Math.hypot(p.x-e.x-.5,p.y-e.y-.9,p.z-e.z-.5);
}
function updateStation(){
 if(gigRun||!ride?.cart||panel||worldBusy)return;
 let near=null,best=36;
 for(const player of world.entities){
  if(player.type!=='record'||!player.stationRecordId)continue;
  const d=emitterDistance(player);if(d<best){near=player;best=d;}
 }
 if(!near){stationVisit=null;if(stationPlayback&&recordEntity&&emitterDistance(recordEntity)>40){audio.stop();stopRecordUI();}return;}
 if(stationVisit===near.id||pendingRecord||activeRecord&&!stationPlayback||audio.playing&&audio.source==='studio')return;
 const record=records.find(r=>r.id===near.stationRecordId);
 if(!record||!canHearRecord(record))return;
 stationVisit=near.id;playRecord(record,near,true);
}
async function playRecord(record,player,station=false,show=null){
 if(!show)gigRun=null;
 if(!canHearRecord(record)){
  toast('Find the instruments used on this record to hear it.');if(show)stopRecordUI();return;
 }
 const request=++recordRequest;pendingRecord=record.id;renderRecords();
 try{await audio.init();}catch(error){if(request===recordRequest){pendingRecord=null;if(show)stopRecordUI();renderRecords();toast(error.message);}return;}
 if(request!==recordRequest)return;
 pendingRecord=null;
 if(!records.includes(record)||player&&!world.entities.includes(player)||station&&(panel||!ride?.cart||emitterDistance(player)>36||player.stationRecordId!==record.id)){renderRecords();if(station)stationVisit=null;if(show)stopRecordUI();return;}
 const p=world.camera.position;recordEntity=player??{x:p.x,y:p.y,z:p.z};
 studio.recording=false;activeRecord=record;stationPlayback=station;
 audio.start(record.song,{prepareSong:s=>record.edition?s:playableSong(s,profile),source:'record',loop:!show&&(station||$('record-loop').checked),initialGain:station?stationGain(emitterDistance(player)):$('record-distance').checked?1:Math.max(.015,(1-Math.min(1,emitterDistance(recordEntity)/40))**1.4),onEnd:()=>{if(recordRequest!==request)return;if(show&&gigRun===show)advanceShow(show);else stopRecordUI();}});
 $('record-name').textContent=record.song.title;$('record-playing').classList.remove('hidden');$('record-playing').classList.add('is-playing');
 if(player){player.recordId=record.id;if(!record.edition&&audibleScore(playableSong(record.song,profile)))opening.firstSpin=true;}
 renderRecords();studio.updateTransport();scheduleSave();
}
function stopRecordUI(){gigRun=null;if(panel==='opening-panel')gigUI?.refresh();stationPlayback=false;recordRequest++;pendingRecord=null;activeRecord=null;recordEntity=null;$('record-playing').classList.add('hidden');renderRecords();}

function advanceShow(run){
 if(gigRun!==run)return;
 if(!world.entities.includes(run.crate)||!world.entities.includes(run.player)){audio.stop();stopRecordUI();toast('The session ended when its crate or player moved.');return;}
 if(run.index===3){
  if(!opening.bill)opening.bill=run.bill;world.openingBill=opening.bill;
  for(const e of world.entities)if(e.type==='gigPoster')world.refreshEntity(e);
  stopRecordUI();save();toast('Opening Night complete · Your poster is ready at the cabin.');return;
 }
 const next=run.set[run.index++];playRecord(next,run.player,false,run);if(panel==='opening-panel')gigUI.refresh();
}
function collectListeningCopies(){
 const done=new Set();for(const edition of inbox()){
  if(records.some(r=>r.edition===edition.id)){done.add(edition.id);continue;}if(records.length>=60)break;
  try{const record=listeningCopy(edition);records.push(record);done.add(edition.id);}catch{done.add(edition.id);}
 }
 if(done.size){world.setRecordLibrary(records);if(save())clearFiled(done);renderRecords();}
}
function closeExchange(){exchangeFrame?.remove();exchangeFrame=null;exchangeSelected=null;}
function showExchange(record){
 closeExchange();exchangeSelected=record?.id||null;exchangeFrame=document.createElement('iframe');exchangeFrame.src='./exchange.html?inside=1';exchangeFrame.title='Record Exchange';$('exchange-frame').append(exchangeFrame);
}
function updateTarget(){target=world.pick();let label='';if(target?.entity)label=target.entity.discovery?(target.entity.starter?'First discovery case':'Instrument case'):ITEMS[target.entity.type].name;else if(target?.id)label=BLOCKS[target.id]?.name||'';const needed=target?.entity?.discovery?null:requiredTool(target?.entity?.type||target?.id);$('target-label').textContent=label+(needed?' · '+(target?.id===29?'Stone pickaxe required':needed[0].toUpperCase()+needed.slice(1)+' is faster'):'');const e=target?.entity;const actions={gigPoster:'Read the gig poster',exchangeCrate:recordSharingEnabled?'Browse the Record Exchange':'Browse your record shelf',bed:'Rest until morning',cache:'Open case',door:'Open / close',shutter:'Open / close shutters',sign:'Paint sign',minecart:'Board cart',railSwitch:'Change branch',crate:'Browse sleeves',record:'Choose a record',workbench:'Craft',torch:'Light / extinguish',lantern:'Light / extinguish',desk:'Play / create music'};
 const rail=isTrack(e?.type),placing=rail&&(isTrack(heldItem())||heldItem()==='minecart');
 const action=rail&&cartOn(e)&&!isTrack(heldItem())?'Board cart':placing?(heldItem()==='minecart'?'Place cart':'Extend track'):actions[e?.type]||(e&&FURNITURE[e.type]?.instrument?'Play / create music':'');
 if(!controls.mining&&e&&action&&!ride?.cart){$('interact-hint').innerHTML='<kbd>'+(controls.coarse?'Use':'Right-click')+'</kbd> '+action;$('interact-hint').classList.remove('hidden');}else $('interact-hint').classList.add('hidden');}
function startWorld(){started=true;$('welcome').classList.add('hidden');$('hud').classList.remove('hidden');$('world-toolbar').classList.remove('hidden');controls.requestLook();refreshMousePrompt();
 if(mode==='gather'&&!Object.keys(inventory).some(k=>k!=='hand'&&inventory[k]>0))toast((controls.coarse?'Hold Mine':controls.dragMode?'Hold G':'Hold left-click')+' on a tree, then walk over the log.');
 audio.unlockWorld().then(ctx=>findCues.warm(ctx)).catch(e=>toast(e.message));if(!savedState)scheduleSave();}
function bind(){
 gigUI=new OpeningNightUI({world:()=>world,state:()=>opening,records:()=>records,prepare:s=>playableSong(s,profile),found:()=>!!profile.owned.length,running:()=>gigRun,
  start:params=>{audio.stop();stopRecordUI();gigRun={...params,index:0};advanceShow(gigRun);},
  stop:()=>{audio.stop();stopRecordUI();},browse:crate=>openPanel('records-panel',{crate}),save:scheduleSave,download});
 $('crate-night').onclick=()=>openPanel('opening-panel',recordUI.context.crate);$('menu-night').onclick=()=>openPanel('opening-panel');
 $('offline-pack').onclick=async()=>{const b=$('offline-pack');b.disabled=true;try{await keepOffline(s=>$('offline-note').textContent=s);}catch(e){$('offline-note').textContent=e.message;}finally{b.disabled=false;}};
 if(recordSharingEnabled){
  for(const el of document.querySelectorAll('[data-record-sharing]'))el.hidden=false;
  $('album-share').onclick=()=>openPanel('exchange-panel',recordUI.selection());
  $('crate-exchange').onclick=()=>openPanel('exchange-panel');
  window.addEventListener('message',event=>{
   if(event.origin!==location.origin||!exchangeFrame||event.source!==exchangeFrame.contentWindow)return;
   if(event.data?.type==='rv-exchange-ready')event.source.postMessage({type:'rv-local-shelf',records:shareableRecords(records,profile),selected:exchangeSelected,artist:opening.artist},location.origin);
   if(event.data?.type==='rv-inbox-changed')collectListeningCopies();
   if(event.data?.type==='rv-exchange-close')closePanel(false);
  });
  window.addEventListener('storage',e=>{if(e.key==='rv-listening-inbox-v1'&&!worldBusy)collectListeningCopies();});
 }
 ride=new RailRide(world,(active,note)=>{$('ride-status').classList.toggle('hidden',!active);$('ride-note').textContent=controls?.coarse?note.replace('W / S','Slide stick forward or back').replace('F to get out','Use to get out'):note;},toast);
 recordUI=new RecordCrateUI({
  stationChanged:(player,id)=>{player.stationRecordId=id;stationVisit=null;scheduleSave();},
  signChanged:sign=>{world.refreshEntity(sign);scheduleSave();},closeSign:()=>closePanel(),
  records:()=>records,playing:()=>activeRecord?.id,preparing:()=>pendingRecord,canHear:canHearRecord,findPlayer:crate=>world.nearestRecordPlayer(crate,crate?8:Infinity),
  play:playRecord,stop:()=>{audio.stop();stopRecordUI();},
  editMusic:r=>{if(r.edition)return;stopRecordUI();studio.load(r.song);openPanel('studio-panel');},
  coverChanged:r=>{r.painted=true;world.setRecordLibrary(records,r.id);scheduleSave();},
  crateChanged:crate=>{world.refreshEntity(crate);scheduleSave();}
 });

 fieldUI=new FieldUI({world:()=>world,open:openPanel,save:scheduleSave,toast,keepsake:site=>{const gifts=world.exploration.keepsakes;if(mode!=='gather'||gifts.has(site.id)||gifts.size>=2000)return '';gifts.add(site.id);const [id,n]=({mesa:[25,4],lookout:[6,4],grove:[26,2],garden:['planter',1],workshop:[16,4],tree:[15,2],arch:[19,3],cascade:[11,3]})[site.type];gatherItem(id,n,site.name);renderHotbar();return true;}});$('bag-search').oninput=renderInventory;$('bag-sort').onchange=$('bag-favorites').onchange=renderInventory;$('bag-sounds').onclick=()=>openPanel('collection-panel');
 document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{switchMode(b.dataset.mode);});$('enter-world').onclick=startWorld;$('welcome-help').onclick=()=>openPanel('help-panel');
 $('studio-open').onclick=()=>openPanel('studio-panel');$('collection-studio').onclick=()=>openPanel('studio-panel');$('discovery-studio').onclick=tryDiscovery;$('find-next').onclick=()=>finds.next();$('first-find-explore').onclick=()=>closePanel('play');$('collection-open').onclick=()=>openPanel('collection-panel');$('bag-open').onclick=()=>openPanel('inventory-panel');$('menu-open').onclick=()=>openPanel('menu-panel');document.querySelectorAll('[data-close]').forEach(b=>b.onclick=closePanel);$('modal-backdrop').onclick=closePanel;$('help-open').onclick=()=>openPanel('help-panel');
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;renderInventory();});
 $('discovery-panel').addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;
  const buttons=[...$('discovery-panel').querySelectorAll('button')].filter(b=>!b.disabled&&b.getClientRects().length);
  const first=buttons[0],last=buttons.at(-1),focus=document.activeElement;
  if(event.shiftKey&&(focus===first||focus===$('discovery-title'))){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&focus===last){event.preventDefault();first?.focus();}
 });
 $('world-mode').onchange=e=>{switchMode(e.target.value);scheduleSave();};$('master-volume').oninput=e=>{audio.setVolume(+e.target.value);scheduleSave();};$('sensitivity').oninput=e=>{sensitivity=+e.target.value;scheduleSave();};
 $('save-world').onclick=()=>save(true);$('return-home').onclick=()=>returnHome();$('export-world').onclick=()=>{download(new Blob([JSON.stringify(serialize())],{type:'application/json'}),'Resonant-Valley.world.json');toast('World backup downloaded.');};$('import-world').onclick=()=>$('world-file').click();
 $('world-file').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>20e6)throw Error('Choose a world file under 20 MB.');const data=validateState(JSON.parse(await f.text()));if(!confirm('Open this world in place of your current world? Download your current world first if you want to keep it.'))return;await changeWorld(()=>applyState(data),{backup:true,message:'World opened.'});}catch(err){toast(err.message||'Could not open this world.');}finally{e.target.value='';}};
 $('record-stop').onclick=()=>{audio.stop();stopRecordUI();};$('record-loop').onchange=e=>{if(audio.source==='record'&&!stationPlayback&&!gigRun)audio.loop=e.target.checked;};$('records-create').onclick=()=>openPanel('studio-panel');
 controls=new WorldControls(world.renderer.domElement,{
  isPlaying:()=>started&&!panel&&!worldBusy,panel:()=>panel,creative:()=>mode==='creative',look,
  pointerState:state=>{mouseState=state;refreshMousePrompt();},
  pause:()=>{if(started&&!panel){controls.suspend();refreshMousePrompt();}},
  escape:()=>{if(panel==='records-panel'&&recordUI.cancelEditor())return;if(panel==='studio-panel'&&!$('studio-popover').classList.contains('hidden'))studio.closePopover();else if(panel)closePanel(false);else if(started){controls.suspend();refreshMousePrompt();}},
  select:selectSlot,cycle:direction=>selectSlot((selected+direction+9)%9),
  mine:active=>{if(active)updateMining();else cancelMining();},
  secondary:()=>{target=world.pick();const e=target?.entity,id=heldItem();
   if(ride?.cart){if(e?.type==='railSwitch')interact(e);else if(e===ride.cart)interact();return true;}
   if(isTrack(e?.type)&&id==='minecart'&&cartOn(e)){interact(cartOn(e));return true;}
   if(isTrack(e?.type)&&(id==='minecart'||isTrack(id))){place();return true;}
   if(e&&CABIN_PARTS.has(e.type)&&target.place&&(BLOCKS[id]||CABIN_PARTS.has(id))&&!['sign','shutter'].includes(e.type)){place();return true;}
   if(target?.id===29){interact();return true;}if(target?.entity){interact(target.entity);return true;}const single=!!FURNITURE[heldItem()]||!!TOOLS[heldItem()]||isTrack(heldItem());place();return single;},
  action:action=>{
   if(ride?.cart&&['jump','flight','use'].includes(action)){interact();return;}
   if(action==='backpack'){if(panel==='inventory-panel')closePanel();else openPanel('inventory-panel');}
   if(action==='map'){if(panel==='map-panel')closePanel();else openPanel('map-panel');}if(action==='studio')openPanel('studio-panel');if(action==='undo')undoBuild();
   if(action==='torch')toggleCarriedTorch();if(action==='hand')toggleHand();if(action==='place')place();if(action==='use')interact();
   if(action==='rotate'){rotation=(rotation+1)%4;renderHotbar();}
   if(action==='flight'){if(mode==='creative'){flying=!flying;velocityY=0;$('touch-lower').hidden=!flying;toast(flying?(controls.coarse?'Flight on · Jump rises · Down descends':'Flight on · Space rises · Shift descends'):'Flight off');}else toast('Flight is available in Free build.');}
   if(action==='jump')jump();
   if(action==='pick'){cancelMining();bareHand=false;target=world.pick();const id=target?.entity?.type||target?.id;if(!id||!ITEMS[id]||ITEMS[id].category==='Discovery')return;if(!canUseItem(id)){toast('Discover this instrument before equipping it.');return;}const slot=hotbar.findIndex(v=>String(v)===String(id));if(slot>=0)selected=slot;else if(mode==='creative'||inventory[id]>0)hotbar[selected]=id;else{toast('Gather this material before selecting it.');return;}renderHotbar();}
  }
 });
 controls.setDragMode($('mouse-controls').value==='drag');
 $('new-world-open').onclick=$('welcome-new').onclick=$('new-world-toolbar').onclick=openWorldCreation;
 $('random-seed').onclick=()=>{$('world-seed').value=randomSeed();};
 $('create-world').onclick=async()=>{
  const seed=$('world-seed').value.trim()||randomSeed(),fresh=document.querySelector('[name="world-start"]:checked').value==='fresh';
  await changeWorld(async()=>{
   const artist=fresh?'':opening.artist;opening=openingState({artist});world.openingBill=null;packedSigns=[];packedCrates=[];if(fresh){favorites=new Set();profile=newCollection();mode='gather';records=[];studio.load(emptySong());}
   world.setDiscoveryClaims(profile.claimed);await world.newWorld(seed);world.setRecordLibrary(records);carryTorch=false;bareHand=false;inventory={hand:1};hotbar=freshBar(mode);otherBar=freshBar(mode==='creative'?'gather':'creative');selected=0;tab='Craft';updateMode();
  },{backup:true,message:fresh?'Your collection is empty. Look for the brass case near your cabin.':'New landscape ready. Your music and collection came with you.'});
 };
 $('previous-world').onclick=async()=>{
  try{const raw=localStorage.getItem(PREVIOUS_KEY);if(!raw)return;const previous=validateState(JSON.parse(raw));await changeWorld(()=>applyState(previous,{keepCollection:true}),{backup:true,message:'Previous world restored.'});}catch(error){toast('Could not open the previous world: '+error.message);}
 };
 $('new-collection').onclick=openWorldCreation;
 $('view-distance').onchange=e=>{world.setViewDistance(e.target.value);scheduleSave();};
 $('carry-torch').onclick=toggleCarriedTorch;$('bare-hand').onclick=toggleHand;
 $('capture-mouse').onclick=()=>controls.requestLook();
 $('resume').onclick=()=>closePanel('play');
 $('hotbar-size').onchange=e=>{setHotbarSize(e.target.value);scheduleSave();};
 $('open-game-tab').href=location.href;
 $('use-drag').onclick=()=>{controls.setDragMode(true);$('mouse-controls').value='drag';controls.requestLook();refreshMousePrompt();scheduleSave();};
 $('mouse-controls').onchange=e=>{controls.setDragMode(e.target.value==='drag');refreshMousePrompt();scheduleSave();};
 $('lock-look').onclick=()=>{if(controls.locked){controls.suspend();refreshMousePrompt();}else{controls.setDragMode(false);$('mouse-controls').value='mouse';controls.requestLook();}};
 controls.bindStick($('touch-stick'));controls.bindMiningButton($('touch-gather'));
 for(const action of ['jump','lower','use','place','rotate'])controls.bindTouchAction($('touch-'+action),action);
 addEventListener('beforeunload',()=>save());document.addEventListener('visibilitychange',()=>{if(document.hidden){findCues.stop();finds.clear();save();controls.clear();studio.releaseAll();if(world.skyState)fieldAudio.update(world.skyState,world.atmosphere,{active:false});}});
}
function look(dx,dy){world.camera.rotation.y-=dx*.0024*sensitivity;world.camera.rotation.x=clamp(world.camera.rotation.x-dy*.0024*sensitivity,-1.48,1.48);}
function jump(){
 if(flying)return;
 const p=world.camera.position,feet=p.y-eyeHeight;
 let speed=shoreJumpSpeed(world,p.x,feet,p.z);
 if(!speed&&grounded&&!world.isWater(p.x,feet+.6,p.z))speed=6.8;
 if(speed){velocityY=Math.max(velocityY,speed);grounded=false;}
}
function move(dt){
 if(!controls?.canMove())return;
 const keys=controls.keys,p=world.camera.position,motion=movementIntent(keys,flying,controls.stick,controls.rise,controls.lower);
 if(ride?.cart){if(keys.ArrowLeft)look(-dt*650,0);if(keys.ArrowRight)look(dt*650,0);ride.step(dt,keys,motion.forward);return;}
 let feet=p.y-eyeHeight;
 const desiredEye=motion.crouch?1.4:1.66;
 eyeHeight+=(desiredEye-eyeHeight)*Math.min(1,dt*18);p.y=feet+eyeHeight;
 const bodyHeight=motion.crouch?1.43:1.66,swimming=!flying&&world.isWater(p.x,feet+.6,p.z);if(swimming)motion.speed*=.55;
 if(keys.ArrowLeft)look(-dt*650,0);if(keys.ArrowRight)look(dt*650,0);if(keys.ArrowUp)look(0,-dt*400);if(keys.ArrowDown)look(0,dt*400);
 const yaw=world.camera.rotation.y,dx=(-Math.sin(yaw)*motion.forward+Math.cos(yaw)*motion.side)*motion.speed*dt,dz=(-Math.cos(yaw)*motion.forward-Math.sin(yaw)*motion.side)*motion.speed*dt;
 const moveAxis=(axis,amount)=>{
  const x=axis==='x'?p.x+amount:p.x,z=axis==='z'?p.z+amount:p.z;
  if(motion.crouch&&grounded&&!world.collides(x,feet-.55,z,bodyHeight))return;
  if(!world.collides(x,feet,z,bodyHeight))p[axis]+=amount;
  else if(grounded&&!flying&&!world.collides(x,feet+.53,z,bodyHeight)){p[axis]+=amount;p.y+=.53;feet+=.53;}
 };
 moveAxis('x',dx);moveAxis('z',dz);p.x=clamp(p.x,-WORLD_LIMIT,WORLD_LIMIT);p.z=clamp(p.z,-WORLD_LIMIT,WORLD_LIMIT);
 if(flying){
  const dy=motion.vertical*motion.speed*dt;if(!world.collides(p.x,feet+dy,p.z,bodyHeight))p.y+=dy;p.y=Math.min(p.y,MAX_Y+30);grounded=false;
 }else{
  if(controls.rise&&velocityY<=SWIM_RISE)jump();
  velocityY=verticalSpeed(velocityY,dt,swimming,controls.rise,motion.shift);
  const dy=velocityY*dt,steps=Math.max(1,Math.ceil(Math.abs(dy)/.12)),step=dy/steps;grounded=false;
  for(let i=0;i<steps;i++){if(!world.collides(p.x,p.y-eyeHeight+step,p.z,bodyHeight))p.y+=step;else{if(velocityY<0)grounded=true;velocityY=0;break;}}
 }
 world.traces?.walk(p,p.y-eyeHeight,performance.now()/1000,grounded&&!flying&&!swimming);
 if(p.y<MIN_Y-1)returnHome();
}
async function init(){
 try{const raw=localStorage.getItem(SAVE_KEY);if(raw)savedState=JSON.parse(raw);}catch{}
 try{world=new World($('world'));}catch(err){$('loading').innerHTML='<div class="small-logo">RV</div><p>This world needs WebGL graphics.</p><p>Try a desktop browser with hardware acceleration enabled.</p>'+(recordSharingEnabled?'<p><a href="./exchange.html">Open the Record Exchange</a></p>':'');console.error(err);return;}
 audio=new AudioEngine();studio=new Studio(audio,emptySong(),{change:()=>scheduleSave(),toast,download,saveRecord,openRecords:record=>{openPanel('records-panel',record?{selected:record.id}:{});if(record)recordUI.editSleeve();},stopRecordUI,playbackChanged:()=>{},canInstrument:id=>hasSound(profile,id),firstSound:()=>sound(profile.owned[0]),firstFindClue:()=>profile.starter?'Find an unopened case or mine a violet inlay with a stone pickaxe.':firstCaseHint(world?.generator),trackLimit:()=>capacity(profile),mixerOwned:()=>profile.mixer,reverbOwned:()=>profile.reverb,delayOwned:()=>profile.delay,prepareSong:s=>playableSong(s,profile),openCollection:()=>openPanel('collection-panel')});
 audio.onStatus=message=>{$('studio-mode-label').textContent=message;};
 discoveryUI=new DiscoveryUI({state:()=>({profile,mode,world,inventory}),changed:collectionChanged,expanded:(craft,n)=>{finds.showExpansion(craft,n);openTreasure();},toast,listen:auditionSound,use:useSound});
 records=[];
 if(savedState){try{await applyState(savedState);$('welcome-save').textContent='Your saved valley is ready.';$('enter-world').innerHTML='Return to the valley <span>↗</span>';}catch(err){console.warn('Could not restore world:',err.message);$('loading-message').textContent='The saved world could not be opened. Your saved data is unchanged. Reload to try again.';return;}}
 if(!savedState){world.setDiscoveryClaims(profile.claimed);await world.newWorld('Resonant Valley');}
 bind();collectListeningCopies();setHotbarSize(hotbarSize);updateMode();renderHotbar();refreshWorldInfo();
 $('loading-message').textContent='Getting the valley ready to explore…';
 await prepareArrival();
 $('loading').classList.add('hidden');$('welcome').classList.remove('hidden');
 let previous=performance.now();
 function frame(now){
  const dt=Math.min((now-previous)/1000,.05);previous=now;controls.update(now);move(dt);updateMining();
  if(controls.canMove()&&!document.hidden)world.drops.step(dt,world.camera.position,eyeHeight,mode==='gather'?collectDrop:null);
  const progress=world.stream.stats();$('terrain-status').textContent=progress.queued?'Loading terrain…':'';
  if(now-lastPick>120){
   updateStation();updateDiscoveryHint();
   if(controls.canMove())updateTarget();lastPick=now;
   const p=world.camera.position;$('location-label').textContent=`${flying?'Flying · ':''}${world.biome(p.x,p.z)} · ${Math.floor(p.x)}, ${Math.floor(p.y-eyeHeight)}, ${Math.floor(p.z)}`;
  }
  if(activeRecord&&audio.playing){
   const dist=emitterDistance(recordEntity);
   audio.setDistanceGain(stationPlayback?stationGain(dist):$('record-distance').checked?1:Math.max(.015,Math.pow(Math.max(0,1-dist/40),1.4)));
   world.entityMeshes.get(recordEntity.id)?.traverse(o=>{if(o.userData.disc)o.rotation.y=now*.002;});
  }
  updateHeldEquipment();studio.frame(now/1000);world.render(now/1000,started&&!worldBusy);fieldUI?.frame(now,started&&!worldBusy,panel);if(audio.ctx&&world.skyState&&now-(fieldAudio.last||0)>220){fieldAudio.last=now;findCues.setLevel(findVolume());fieldAudio.attach(audio.ctx);fieldAudio.update(world.skyState,world.atmosphere,{inside:world.skyScene?.sheltered,studio:panel==='studio-panel'||panel==='exchange-panel',active:started&&!worldBusy&&!document.hidden,master:audio.volume});}requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);setInterval(()=>{if(started)save();},20000);
}
function prepareArrival(){return world.prepareEntry({tool:effectiveTool(heldItem(),inventory,mode),torch:torchActive(inventory,mode,carryTorch)});}
init();
