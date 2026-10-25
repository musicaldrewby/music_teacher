const assetPath=require('./asset-path.cjs');
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const {Image,Path2D}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'../public'),{document,elements}=require('./dom-fixture.cjs')(path.join(root,'index.html'));
const indexedDB=require('./idb-fixture.cjs')(),preferences=new Map(),errors=[];
let dynamicLoads=0;const timers=new Map();let timerId=0;
const context={document,Image,Path2D,indexedDB,console:{log:console.log,error:(...e)=>errors.push(e.join(' ')),warn:console.warn},setTimeout(fn){const id=++timerId;timers.set(id,fn);return id},clearTimeout(id){timers.delete(id)},setInterval:()=>0,clearInterval(){},requestAnimationFrame:()=>0,cancelAnimationFrame(){},performance,URL,Blob,TextEncoder,Uint8Array,Uint8ClampedArray,Float32Array,ArrayBuffer,AbortController,DOMException,localStorage:{getItem:k=>preferences.get(k)||null,setItem:(k,v)=>preferences.set(k,v)},navigator:{},ResizeObserver:class{observe(){}},alert(){},confirm(){return true},prompt(){return null},innerWidth:1440,innerHeight:1000,addEventListener(){},devicePixelRatio:1};
context.window=context;context.globalThis=context;context.getComputedStyle=()=>({getPropertyValue(){return '0'},display:'block',paddingLeft:'0',paddingRight:'0',paddingTop:'0',paddingBottom:'0'});vm.createContext(context);
document.head.appendChild=el=>{dynamicLoads++;setImmediate(()=>{try{vm.runInContext(fs.readFileSync(assetPath(root,el.src),'utf8'),context);el.onload()}catch(e){el.onerror(e)}})};
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const m of html.matchAll(/<script src="([^"]+)"/g))vm.runInContext(fs.readFileSync(path.join(root,m[1]),'utf8'),context,{filename:m[1]});
const run=s=>vm.runInContext(s,context),el=id=>elements.get(id),click=id=>el(id).click();
(async()=>{
 await context.feltStartup;assert.deepStrictEqual(errors,[]);assert(run('ready'));assert.equal(dynamicLoads,7);click('welcomeStart');
 const initial=run('snapshot()');assert.equal((await context.FeltRecovery.list()).length,0,'A default story must not overwrite existing recovery copies');
 assert.equal(document.querySelectorAll('.workflow-tabs button').length,4);
 // Real parsed HTML and registered click handlers, not direct mode flag changes.
 click('workspaceAnimate');assert.equal(document.body.dataset.workspace,'animate');assert(document.body.classList.contains('hide-collection'));assert(!el('animationPanel').hidden);assert(!el('animationInspector').hidden);assert(el('pieceProperties').hidden);
 click('workspaceSound');assert(!el('soundInspector').hidden);assert(el('animationPanel').hidden);assert(!el('avDialog').open);
 click('workspaceExport');assert(!el('exportInspector').hidden);assert(el('soundInspector').hidden);
 click('workspaceBuild');assert(!document.body.classList.contains('hide-collection'));assert(!el('pieceProperties').hidden);assert.equal(run('snapshot()'),initial,'Workspace switches mutated the story');
 // A hidden Build panel is restored as hidden after visiting another workspace.
 click('quickCollection');assert(document.body.classList.contains('hide-collection'));click('workspaceAnimate');click('workspaceBuild');assert(document.body.classList.contains('hide-collection'));click('quickCollection');
 context.innerWidth=800;click('workspaceSound');assert(document.body.classList.contains('mobile-properties'));click('workspaceAnimate');assert(!document.body.classList.contains('mobile-properties'));click('quickProperties');assert(document.body.classList.contains('mobile-properties'));context.innerWidth=1440;click('workspaceBuild');
 await require('./check-selection.cjs')({run,el,click,document,context});
 // Favorites are independent of project saving; recent items do not load all assets.
 let star=el('catalog').querySelector('.favorite-toggle');assert(star);star.click();assert(preferences.has('felt-fable-collection'));el('collectionQuickFilter').value='favorites';el('collectionQuickFilter').dispatchEvent({type:'change'});assert.equal(el('catalog').children.length,1);assert.equal(run('snapshot()'),initial);
 run('rememberCollectionUse(ART.pieces[1])');el('collectionQuickFilter').value='recent';el('collectionQuickFilter').dispatchEvent({type:'change'});assert.equal(el('catalog').children.length,1);el('collectionQuickFilter').value='all';el('collectionQuickFilter').dispatchEvent({type:'change'});
 click('openQuickTour');assert(!el('quickTour').hidden);click('tourAction');assert.equal(run('tab'),'backgrounds');click('tourNext');click('tourAction');assert.equal(run('tab'),'pieces');click('tourClose');assert(el('quickTour').hidden);
 // Select, edit, drag and undo one animation block without generating manual keys.
 run(`selected=[items()[1].id];items()[1].animationBlocks=[{id:'test-route',preset:'path-custom',start:0,duration:2,strength:1,distance:250,direction:0,repeats:1,ease:'linear',loop:'none',points:[[0,0],[100,-100],[300,0]]}];refresh()`);
 click('workspaceAnimate');el('blockLanes').querySelector('.motion-block').click();assert(!el('animationTimelineView').hidden);assert(!el('animationSettingsView').hidden);assert(!el('blockSettings').hidden);assert.equal(el('blockTitle').textContent,'Drawn path');
 el('blockDuration').value='3';el('blockDuration').dispatchEvent({type:'change'});assert.equal(run('currentBlock().duration'),3);assert.equal(run('selectedBlockPiece().keyframes?.length||0'),0);
 const beforeDrag=run('currentBlock().start');
 const block=el('blockLanes').querySelector('.motion-block');const ev=(type,x)=>({type,target:block,button:0,pointerId:1,clientX:x,preventDefault(){},stopPropagation(){}});
 el('timelineSurface').dispatchEvent(ev('pointerdown',0));el('timelineSurface').dispatchEvent(ev('pointermove',200));el('timelineSurface').dispatchEvent(ev('pointerup',200));assert(run('currentBlock().start')>beforeDrag);run('undo()');await new Promise(setImmediate);run('selected=[items()[1].id];refreshSelection()');assert.equal(run('currentBlock().start'),beforeDrag);
 const beforePreview=run('snapshot()');run('drawSelectedMotionRoute(ctx)');assert.equal(run('snapshot()'),beforePreview);
 // Recovery includes custom images, audio and animation data across scene changes.
 run(`checkpoint();state.title='Recovery with media';state.audioAssets={'test-audio':{name:'Narration.wav',data:'data:audio/wav;base64,UklGRg==',duration:1}};state.music.assetId='test-audio';scene().narration.assetId='test-audio';state.imports['custom-test']=makeCanvas(2,2).toDataURL();state.custom=[newShape('Heart')];refresh()`);
 assert(await context.FeltRecovery.flush());const copies=await context.FeltRecovery.list();assert.equal(copies.length,1);const original=JSON.parse(indexedDB.stores.get('projects').get(copies[0].id).json);assert(original.audioAssets['test-audio']);assert(original.imports['custom-test']);assert.equal(original.custom[0].shape,'Heart');assert.equal(original.scenes[0].items[1].animationBlocks[0].duration,3);
 // A later pending write cannot be marked saved by an older in-flight transaction.
 run(`checkpoint();state.title='First write'`);const writing=context.FeltRecovery.flush();run(`checkpoint();state.title='Newest edit'`);await writing;assert(/pending/.test(context.FeltRecovery.status()));await context.FeltRecovery.flush();assert.equal(JSON.parse(indexedDB.stores.get('projects').get(copies[0].id).json).title,'Newest edit');
 // Quota failure retains the last complete copy and surfaces an honest status.
 indexedDB.setFailWrites(true);run(`checkpoint();state.title='Not stored'`);assert.equal(await context.FeltRecovery.flush(),false);assert(/could not save/.test(context.FeltRecovery.status()));assert.equal(JSON.parse(indexedDB.stores.get('projects').get(copies[0].id).json).title,'Newest edit');indexedDB.setFailWrites(false);await context.FeltRecovery.flush();
 // New stories get a separate record; recovery opens a copy without deleting the source.
 await el('newProject').onclick();await context.FeltRecovery.flush();assert.equal((await context.FeltRecovery.list()).length,2);await context.FeltRecovery.restoreCopy(copies[0].id);assert.equal(run('state.title'),'Not stored');assert(run("state.audioAssets['test-audio']&&state.imports['custom-test']"));assert.equal(run('state.custom[0].shape'),'Heart');assert.equal(run('items()[1].animationBlocks[0].duration'),3);assert(run('dirty'));await context.FeltRecovery.flush();assert.equal((await context.FeltRecovery.list()).length,3);
 // Live title input is recoverable before a blur/change event.
 el('storyTitle').value='Typing is saved';el('storyTitle').dispatchEvent({type:'input'});await context.FeltRecovery.flush();assert.equal((await context.FeltRecovery.list())[0].title,'Typing is saved');
 // Scene selection keeps narration controls in sync.
 click('workspaceSound');click('addScene');assert.equal(el('soundScene').value,run('scene().id'));assert.equal(el('narrationName').textContent,'No narration for this scene');
 // Compactness settings and the offstage editor do not change exported pixels.
 const unchanged=run('snapshot()');run('setOffstage(true);fitOffstageAll();setAnimationPanelSize("expanded")');assert.equal(run('snapshot()'),unchanged);run('setOffstage(false)');
 run(`const verifyProject=copy(state);verifyProject.exportCaptions=false;const verifyFrame=makeCanvas(1920,1080),verifyMovie=makeCanvas(1920,1080);drawScene(verifyFrame.getContext('2d'),scene(),1920,1080,0);for(const fps of [30,60]){const tl=storyTimeline(verifyProject,fps);paintVideoFrame(verifyMovie.getContext('2d'),verifyProject,tl,tl[state.active].firstFrame,fps);if(verifyFrame.toDataURL()!==verifyMovie.toDataURL())throw Error('Editor view leaked into export')}validateProject(JSON.parse(snapshot()))`);
 // A fresh page offers previous sessions before any edit can create a new copy.
 const reloadDOM=require('./dom-fixture.cjs')(path.join(root,'index.html'));
 const next={document:reloadDOM.document,indexedDB,$:id=>reloadDOM.elements.get(id),dirty:false,setTimeout:()=>0,clearTimeout(){},addEventListener(){}};next.window=next;vm.createContext(next);vm.runInContext(fs.readFileSync(path.join(root,'js/recovery.js'),'utf8'),next);await next.FeltRecovery.init();assert(!reloadDOM.elements.get('welcomeRecover').hidden);assert.equal((await next.FeltRecovery.list()).length,3);
 assert.deepStrictEqual(errors,[]);console.log('PASS: parsed UI bindings, four workspaces, panel restoration, mobile drawers, favorites/recent, tour, animation edits/drag/undo, recovery media roundtrip, pending-write ordering, storage failure, session isolation, recovery after reload, live text, scene audio sync, 30/60 fps frame isolation.');
})().catch(e=>{console.error(e);process.exitCode=1});
