'use strict';
// Workspace state never enters a story file or changes the camera's shot.
let studioWorkspace='build',studioUIReady=false,studioBuildLayout=null,tourStep=0;
const layoutFlags=['hide-collection','hide-inspector','focus-board','mobile-collection','mobile-properties','compact-scenes'];
const TOUR_STEPS=[
 ['Set the scene','Start with a backdrop. Choosing one keeps your pieces in place.','Choose backdrop','backgrounds'],
 ['Meet your cast','Click a piece to add it. Drag to move it; use its corner handles to resize.','Find pieces','pieces'],
 ['Bring a piece to life','Select one piece, then add an entrance, idle movement, path or exit. Click its block to edit it.','Open Animate','animate'],
 ['Give your story a voice','Music can span several scenes. Add a separate narration recording for each scene.','Open Sound','sound'],
 ['Preview and share','Preview the whole story, download an MP4, and keep an editable story file.','Open Export','export']
];
function revealStudioInspector(){
 document.body.classList.remove('hide-inspector','focus-board','mobile-collection');
 if(window.innerWidth<=900)document.body.classList.add('mobile-properties');
 syncWorkspaceChrome();
}
function setStudioWorkspace(mode){
 if(!['build','animate','sound','export'].includes(mode)||!studioUIReady)return;
 if(exportJob)return;
 stopAnimationPreview();stopStoryPlayback();if(typeof performanceCancelPick==='function')performanceCancelPick();
 if(presenting)present(false);
 if(blockPathEditing)endBlockPathEditing(false);
 setCameraDragMode(false);setTool('select');
 if(studioWorkspace==='build'&&mode!=='build')studioBuildLayout=layoutFlags.filter(c=>document.body.classList.contains(c));
 const changed=mode!==studioWorkspace;
 cinemaClosePanel(false);studioWorkspace=mode;document.body.dataset.workspace=mode;
 if(changed){
  document.body.classList.remove(...layoutFlags);
  if(mode==='build')for(const c of studioBuildLayout||[])document.body.classList.add(c);
  else{document.body.classList.add('hide-collection','compact-scenes');if(window.innerWidth<=900&&mode!=='animate')document.body.classList.add('mobile-properties')}
 }
 animOpen=mode==='animate';document.body.classList.toggle('animation-open',animOpen);
 if(animOpen){setAnimationPanelSize('compact');setAnimationTab('timeline')}
 $('pieceProperties').hidden=mode!=='build';$('animationInspector').hidden=mode!=='animate';
 $('soundInspector').hidden=mode!=='sound';$('exportInspector').hidden=mode!=='export';
 $('cameraPanel').hidden=!['build','animate'].includes(mode);
 document.querySelector('.layers-section').hidden=!['build','animate'].includes(mode);
 $('avStatus').hidden=!['sound','export'].includes(mode);
 $('inspectorTitle').textContent=({build:'Properties',animate:'Animation',sound:'Sound',export:'Export'})[mode];
 $('quickProperties').textContent=({build:'Properties',animate:'Settings',sound:'Sound controls',export:'Export settings'})[mode];
 for(const button of document.querySelectorAll('.workflow-tabs button'))button.setAttribute('aria-pressed',String(button.dataset.workspace===mode));
 if(mode==='sound'||mode==='export'){refreshAudioUI();if(mode==='export')showCodecSupport();if(!changed)revealStudioInspector()}
 syncSceneStrip();syncWorkspaceChrome();refreshSelection();updateStudioHints();
}
function updateStudioHints(){
 if(!studioUIReady)return;
 const o=selectedBlockPiece(),b=currentBlock();
 $('workspaceHint').textContent=({
  build:'Choose a backdrop, then add your story pieces.',
  animate:!o?'Select one piece to animate.':o.attachment?'This accessory follows its character. Detach it in Build to animate it separately.':o.locked?'Unlock this piece to edit its animation.':b?'Click a block to edit it. Drag its ends to change timing.':'Choose + Animation or Draw path for '+o.name+'.',
  sound:'Music spans scenes. Narration belongs to the selected scene.',
  export:'Preview your story, then download a video or editable copy.'
 })[studioWorkspace];
 $('animationPieceName').textContent=o?o.name:selected.length>1?'Select one piece or group':'Select a piece';
 $('inspectorAddMotion').disabled=!blockEditable(o);$('inspectorDrawPath').disabled=!blockEditable(o);
 $('editPieceAppearance').disabled=!o;
}
function drawSelectedMotionRoute(g){
 const o=selectedBlockPiece(),b=currentBlock();
 if(!studioUIReady||!animOpen||!o||!b||blockCategory(b)!=='path'||blockPathEditing||animRun||storyPlayback||presenting)return;
 const anchor=pathAnchor(o,b),u=screenUnit(),points=[];
 for(let i=0;i<=100;i++){const pose=presetPose(b.preset,anchor,i/100,blockOptions(b));points.push([pose.x,pose.y])}
 g.save();g.lineWidth=2*u;g.strokeStyle='#1b756b';g.setLineDash([6*u,5*u]);g.beginPath();
 points.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.stroke();g.setLineDash([]);
 for(const [p,name] of [[points[0],'Start'],[points.at(-1),'End']]){g.fillStyle='#fffdf3';g.strokeStyle='#1b756b';g.beginPath();g.arc(...p,6*u,0,Math.PI*2);g.fill();g.stroke();g.font=`600 ${12*u}px system-ui`;g.lineWidth=4*u;g.strokeStyle='#fffdf3';g.strokeText(name,p[0]+10*u,p[1]-10*u);g.fillStyle='#175a51';g.fillText(name,p[0]+10*u,p[1]-10*u)}
 g.restore();
}
function showTourStep(){
 const [title,description,action]=TOUR_STEPS[tourStep];
 $('quickTour').hidden=false;$('tourCount').textContent=(tourStep+1)+' of '+TOUR_STEPS.length;
 $('tourTitle').textContent=title;$('tourText').textContent=description;$('tourAction').textContent=action;
 $('tourNext').textContent=tourStep===TOUR_STEPS.length-1?'Finish':'Next';fit();
}
function tourAction(){
 const target=TOUR_STEPS[tourStep][3];
 if(['pieces','backgrounds'].includes(target)){
  setStudioWorkspace('build');tab=target;$('collectionQuickFilter').value='all';$('search').value='';$('pieceCategory').value='all';$('backdropCategory').value='all';
  document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  document.body.classList.remove('hide-collection','focus-board','mobile-properties');if(window.innerWidth<=900)document.body.classList.add('mobile-collection');
  renderCatalog();syncWorkspaceChrome();
 }else setStudioWorkspace(target);
}
function readCollectionPreferences(){
 try{const p=JSON.parse(localStorage.getItem('felt-fable-collection')||'{}');return {favorites:Array.isArray(p.favorites)?p.favorites.filter(x=>typeof x==='string').slice(0,400):[],recent:Array.isArray(p.recent)?p.recent.filter(x=>typeof x==='string').slice(0,32):[]}}catch{return {favorites:[],recent:[]}}
}
const collectionPreferences=readCollectionPreferences();
function saveCollectionPreferences(){try{localStorage.setItem('felt-fable-collection',JSON.stringify(collectionPreferences))}catch{toast('Collection shortcuts will last for this visit. Browser storage is unavailable.')}}
function collectionItems(list){
 const mode=$('collectionQuickFilter').value;
 const result=list.filter(a=>mode==='favorites'?collectionPreferences.favorites.includes(a.id):mode==='recent'?collectionPreferences.recent.includes(a.id):mode==='new'?!!a.cinema||!!a.puppet:mode.startsWith('pack:')?(a.themes||[]).includes(mode.slice(5))||a.category===mode.slice(5):true);
 return mode==='recent'?result.sort((a,b)=>collectionPreferences.recent.indexOf(a.id)-collectionPreferences.recent.indexOf(b.id)):result;
}
function rememberCollectionUse(a){collectionPreferences.recent=[a.id,...collectionPreferences.recent.filter(x=>x!==a.id)].slice(0,32);saveCollectionPreferences();if($('collectionQuickFilter').value==='recent')renderCatalog()}
function collectionTile(a,paint,click,bg=false){
 const shell=document.createElement('div');shell.className='collection-tile';
 const item=tile(a.name,paint,click,bg),favorite=document.createElement('button'),on=collectionPreferences.favorites.includes(a.id);
 favorite.className='favorite-toggle';favorite.dataset.asset=a.id;favorite.textContent=on?'★':'☆';favorite.setAttribute('aria-pressed',String(on));favorite.setAttribute('aria-label',(on?'Remove ':'Add ')+a.name+(on?' from favorites':' to favorites'));favorite.title=(on?'Remove from':'Add to')+' favorites';
 favorite.onclick=e=>{e.stopPropagation();collectionPreferences.favorites=on?collectionPreferences.favorites.filter(x=>x!==a.id):[...collectionPreferences.favorites,a.id];saveCollectionPreferences();renderCatalog();const next=[...$('catalog').querySelectorAll('.favorite-toggle')].find(b=>b.dataset.asset===a.id);(next||$('collectionQuickFilter')).focus()};
 shell.append(item,favorite);return shell;
}
function initStudioWorkspaces(){
 studioUIReady=true;
 for(const b of document.querySelectorAll('.workflow-tabs button'))b.onclick=()=>setStudioWorkspace(b.dataset.workspace);
 $('openAnimation').onclick=()=>setStudioWorkspace(studioWorkspace==='animate'?'build':'animate');$('closeAnimation').onclick=()=>setStudioWorkspace('build');
 $('openAV').onclick=()=>setStudioWorkspace('sound');$('closeAV').onclick=()=>setStudioWorkspace('build');
 $('quickCollection').onclick=()=>$('toggleCollection').onclick();$('quickProperties').onclick=()=>revealStudioInspector();
 $('inspectorAddMotion').onclick=()=>$('openMotionPresets').click();$('inspectorDrawPath').onclick=startDrawingObjectPath;
 $('editPieceAppearance').onclick=()=>{setStudioWorkspace('build');revealStudioInspector()};
 $('exportPreview').onclick=()=>startStoryPlayback(0);$('exportDownloadStory').onclick=()=>$('saveProject').click();$('exportStill').onclick=exportCurrentPNG;
 $('openQuickTour').onclick=()=>{tourStep=0;showTourStep()};$('tourAction').onclick=tourAction;
 $('tourNext').onclick=()=>{if(tourStep===TOUR_STEPS.length-1){$('quickTour').hidden=true;fit()}else{tourStep++;showTourStep()}};
 $('tourClose').onclick=()=>{$('quickTour').hidden=true;fit()};
 $('collectionQuickFilter').onchange=()=>{if(['pack:orchestra','pack:interactive'].includes($('collectionQuickFilter').value)||!['pieces','backgrounds'].includes(tab)){tab='pieces';document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab))}$('search').value='';$('pieceCategory').value='all';$('backdropCategory').value='all';renderCatalog()};
 const reset=$('resetWorkspace').onclick;$('resetWorkspace').onclick=()=>{setStudioWorkspace('build');reset();studioBuildLayout=null};
 // Commit typed titles and captions while typing, with one undo step per edit.
 for(const field of ['storyTitle','caption']){
  const el=$(field);el.oninput=()=>{if(el.dataset.liveEdit!=='true'){checkpoint();el.dataset.liveEdit='true'}if(field==='storyTitle')state.title=el.value.slice(0,100)||'My felt story';else{scene().caption=el.value.slice(0,2000);$('presentCaption').textContent=scene().caption}FeltRecovery.changed();updateSaveState()};
  el.onchange=()=>{el.dataset.liveEdit='';refresh()};el.addEventListener('blur',()=>{el.dataset.liveEdit=''})
 }
 // Modal keyboard events must not leak into the editor below them.
 document.querySelectorAll('dialog').forEach(d=>d.addEventListener('keydown',e=>e.stopPropagation()));
 setStudioWorkspace('build');
}
