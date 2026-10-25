'use strict';
// A calm home for a full classroom toolkit. Everything here is local and self-contained.
let beachView='play',shelfCollection='starter',shelfOnlyOne=false;
const STARTER_ART_SLUGS=['morning-bells','rainy-day','hot-cross-buns','london-bridge','skip-to-my-lou','little-star','apple-tree','lucy-locket','more-we-get-together','farmer-in-the-dell','itsy-bitsy-spider','bingo','coming-round-the-mountain','epo-e-tai'];
const SPLASH_LOGO_ASSET='assets/collage/uke-strum-logo.png';
const COLLAGE_ART_ASSETS=[...[...STARTER_ART_SLUGS,'sunny-beach','sunset-beach'].map(name=>'assets/collage/'+name+'.webp'),SPLASH_LOGO_ASSET,STRUM_HAND_ASSET,STRUM_UKULELE_ASSET];
const CUSTOM_ART_INDEX=STARTER_ART_SLUGS.length;
function displayedSong(){return exerciseBackup?.song||song;}
function artworkIndex(s){const i=STARTERS.findIndex(x=>(s.source&&x.source===s.source)||x.title===s.title);return i<0?CUSTOM_ART_INDEX:i;}
function collageArtSource(index){const path=COLLAGE_ART_ASSETS[index]||COLLAGE_ART_ASSETS[CUSTOM_ART_INDEX];return window.EMBEDDED_ART?.[path]||path;}
function songArtwork(index,id='song-art'){
 return `<img src="${collageArtSource(index)}" alt="" width="1536" height="1024" loading="${id==='hero'?'eager':'lazy'}" decoding="async"${id==='hero'?' fetchpriority="high"':''}>`;
}
function stageArtwork(theme,id){
 const index={sunny:CUSTOM_ART_INDEX,sunset:CUSTOM_ART_INDEX+1,moonlight:STARTER_ART_SLUGS.indexOf('little-star')}[theme]??CUSTOM_ART_INDEX;
 return `<img src="${collageArtSource(index)}" alt="" width="1536" height="1024" loading="lazy" decoding="async">`;
}
function renderHome(){
 const s=displayedSong();$('songBackgroundBtn').hidden=!starterBackground(s);$('playHeading').textContent=s.title||'Untitled song';const names=songChords(s);
 $('heroChords').innerHTML=names.slice(0,6).map(c=>`<span class="chord-sticker" style="--chord-ink:${COLORS[c]||'#256f7c'}">${esc(c)}</span>`).join('')+`<span class="hero-meter">${s.meter} time<br>${s.measures.length} measures</span>`;
 $('homeTempo').value=s.tempo;$('homeTempoUnit').textContent=s.meter==='6/8'?'dotted ♩ BPM':'BPM';$('heroCountIn').textContent=$('countIn').checked?`${countInBeats(s.meter)} ${s.meter==='6/8'?'big beats':'beats'} to get ready`:'Count-in off';$('teachingSongTitle').textContent=s.title;
 const art=artworkIndex(s);if($('heroArt').dataset.art!==String(art)){$('heroArt').innerHTML=songArtwork(art,'hero');$('heroArt').dataset.art=String(art);}
 $('playbackBadge').textContent={once:'Play once',twice:'Play twice',loop:'Loop'}[playbackMode(s)];$('bandBadge').textContent=s.band?.enabled?'Band on':'Ukulele solo';$('stageBadge').textContent=THEMES[s.theme]||THEMES.sunny;
 $('heroPlay').innerHTML=`<span aria-hidden="true">▶</span> ${transport.state==='playing'?'Back to the stage':transport.state==='paused'?'Resume on stage':'Let’s Play!'}`;
}
function renderShelf(){
 const list=shelfCollection==='saved'?savedSongs:STARTERS,q=$('shelfSearch').value.trim().toLowerCase(),current=displayedSong();const filtered=list.map((s,index)=>({s,index,chords:songChords(s)})).filter(({s,chords})=>(!q||s.title.toLowerCase().includes(q))&&(!shelfOnlyOne||chords.length===1));
 $('shelfStarters').classList.toggle('active',shelfCollection==='starter');$('shelfSaved').classList.toggle('active',shelfCollection==='saved');$('shelfStarters').setAttribute('aria-pressed',shelfCollection==='starter');$('shelfSaved').setAttribute('aria-pressed',shelfCollection==='saved');$('shelfOneChord').setAttribute('aria-pressed',shelfOnlyOne);$('shelfOneChord').classList.toggle('active',shelfOnlyOne);$('shelfCount').textContent=`${filtered.length} song${filtered.length===1?'':'s'}`;
 $('songShelf').innerHTML=filtered.map(({s,index,chords})=>{const chosen=s.id?current.id===s.id:!current.id&&current.title===s.title;return `<button class="illustrated-song${chosen?' selected-song':''}" data-shelf-song="${index}" aria-pressed="${chosen}" aria-label="Choose ${esc(s.title)}"><span class="song-picture">${songArtwork(artworkIndex(s),'shelf-'+shelfCollection+'-'+index)}<span class="song-level">${chords.length+' CHORD'+(chords.length===1?'':'S')}</span>${chosen?'<span class="song-picked">✓ On deck</span>':''}</span><span class="song-card-copy"><strong>${esc(s.title)}</strong><span class="card-music-meta">${s.meter} · ${s.tempo} BPM <span aria-hidden="true">↗</span></span><span class="card-chords">${chords.slice(0,6).map(c=>`<i>${esc(c)}</i>`).join('')||'<i>Rest</i>'}</span></span></button>`;}).join('');
 $('shelfMessage').hidden=filtered.length>0;$('shelfMessage').textContent=q?'No songs match that search. Try another title.':shelfOnlyOne?'No one-chord songs in this collection yet.':shelfCollection==='saved'?'Your songs will live here. Choose New Song, make it yours, then Save song.':'Choose a song to get started.';
}
function setView(view,focus=false){if(!['play','create','teach'].includes(view))return;beachView=view;for(const name of ['play','create','teach']){$(name+'View').hidden=name!==view;const b=$('nav'+name[0].toUpperCase()+name.slice(1));b.classList.toggle('active',name===view);if(name===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}if(view==='play'){renderHome();renderShelf();}if(focus)$('nav'+view[0].toUpperCase()+view.slice(1)).focus();}
function setHomeTempo(value){mutate(()=>song.tempo=Math.round(clamp(value,40,200,80)));$('homeTempo').value=song.tempo;}
function renderStageChoices(){$('stageChoices').innerHTML=Object.entries(THEMES).map(([id,name])=>`<button class="stage-choice${song.theme===id?' selected':''}" data-stage-choice="${id}" aria-pressed="${song.theme===id}"><span class="stage-choice-art">${stageArtwork(id,'choice-'+id)}</span><strong>${esc(name)} <i>${song.theme===id?'✓':'○'}</i></strong><small>${{sunny:'Turquoise water and warm sand.',sunset:'Coral skies and golden water.',moonlight:'Moonlight over a quiet lagoon.'}[id]}</small></button>`).join('');}
function openStagePicker(){renderStageChoices();$('stageModal').showModal();}
function openOptions(){$('optionsModal').showModal();}
const beachRenderAll=renderAll;
renderAll=function(){beachRenderAll();renderHome();if(beachView==='play')renderShelf();};
const beachSettings=renderSettings;
renderSettings=function(){beachSettings();renderHome();if(beachView==='play')renderShelf();};
const beachStageBase=renderStageBase;
renderStageBase=function(){beachStageBase();renderHome();};
const beachTheme=applyTheme;
applyTheme=function(){beachTheme();renderHome();if($('stageModal').open)renderStageChoices();};
const beachChanged=changed;
changed=function(){beachChanged();renderHome();};
const beachTransport=updateTransport;
updateTransport=function(){beachTransport();renderHome();fitChordLabels();};
const beachLibrary=renderLibrary;
renderLibrary=function(){beachLibrary();renderShelf();const list=(libraryTab==='starter'?STARTERS:savedSongs).filter(s=>s.title.toLowerCase().includes($('songSearch').value.toLowerCase()));document.querySelectorAll('#songLibrary .song-card').forEach((card,i)=>{if(list[i])card.insertAdjacentHTML('afterbegin',`<div class="library-card-art" aria-hidden="true">${songArtwork(artworkIndex(list[i]),'library-'+i)}</div>`);});};
function initBeach(){
 initBackgroundMotion();
 $('stageScenery').innerHTML=Object.keys(THEMES).map(theme=>`<div class="scene-art scene-${theme}">${stageArtwork(theme,'stage-'+theme)}</div>`).join('');
 for(const view of ['play','create','teach'])$('nav'+view[0].toUpperCase()+view.slice(1)).onclick=()=>setView(view);
 $('brandHome').onclick=e=>{e.preventDefault();setView('play',true);};$('heroEdit').onclick=()=>{setView('create');$('songTitle').focus();};$('teachingChoose').onclick=()=>{setView('play');$('shelfSearch').focus();};
 $('songBackgroundBtn').onclick=()=>showInfo('About this song',starterBackground(displayedSong()));
 $('finishMenu').onclick=()=>{if(transport.state!=='finished'||isProjector)return;exitStage();setView('play');$('heroPlay').focus();};
 $('heroPlay').onclick=()=>{if(activeRange){stop(false);activeRange=null;}$('performBtn').click();if(transport.state!=='playing')start();};
 $('homeTempo').onchange=e=>setHomeTempo(e.target.value);$('tempoDown').onclick=()=>setHomeTempo(song.tempo-5);$('tempoUp').onclick=()=>setHomeTempo(song.tempo+5);
 $('shelfSearch').oninput=renderShelf;$('shelfStarters').onclick=()=>{shelfCollection='starter';renderShelf();};$('shelfSaved').onclick=()=>{shelfCollection='saved';renderShelf();};$('shelfOneChord').onclick=()=>{shelfOnlyOne=!shelfOnlyOne;renderShelf();};
 $('songShelf').onclick=e=>{const b=e.target.closest('[data-shelf-song]');if(!b)return;const raw=(shelfCollection==='saved'?savedSongs:STARTERS)[+b.dataset.shelfSong];if(raw&&loadSong(raw)){$('playHeading').scrollIntoView({behavior:'smooth',block:'center'});toast(raw.title+' is on deck.');}};
 $('stagePickerBtn').onclick=openStagePicker;$('optionsBtn').onclick=openOptions;$('createOptions').onclick=openOptions;
 $('stageChoices').onclick=e=>{const b=e.target.closest('[data-stage-choice]');if(!b)return;$('stageTheme').value=b.dataset.stageChoice;$('stageTheme').onchange({target:$('stageTheme')});renderStageChoices();};
 for(const id of ['libraryBtn','shareBtn','printBtn','sourceBtn']){const original=$(id).onclick;$(id).onclick=e=>{$('optionsModal').close();original(e);};}
 const projectorClick=$('projectorBtn').onclick;$('projectorBtn').onclick=e=>{$('stageModal').close();projectorClick(e);};
 $('menuSave').onclick=()=>{$('optionsModal').close();$('saveBtn').click();};$('countIn').onchange=renderHome;
 $('teachChords').onclick=()=>$('chordChartBtn').click();$('teachPassage').onclick=()=>{setView('create');const details=$('rangeStart').closest('details');if(details)details.open=true;$('rangeStart').focus();$('rangeStart').scrollIntoView({behavior:'smooth',block:'center'});};
 const createSubmit=$('newSongForm').onsubmit;$('newSongForm').onsubmit=e=>{createSubmit(e);if(!$('newSongModal').open){setView('create');$('songTitle').focus();}};
 const oldExit=exitStage;exitStage=function(){oldExit();if($('stage').hidden)clearFinishMenu();if(!isProjector&&!isViewer)(beachView==='play'?$('heroPlay'):$('performBtn')).focus();};$('exitStage').onclick=()=>exitStage();
 const oldClosePreview=closePreview;closePreview=function(copy=false){oldClosePreview(copy);if(copy){setView('create');$('songTitle').focus();}else setView('play');};
 const helpClick=$('helpBtn').onclick;$('helpBtn').onclick=()=>{$('optionsModal').close();helpClick();$('generalContent').insertAdjacentHTML('afterbegin','<p class="modal-note"><b>Play</b> is your song collection and stage. <b>Create</b> is where you build and edit arrangements. <b>Teach</b> holds lessons, chord challenges, and class setlists. Band, Stage, and More options open the settings you need. The coral <b>New Song</b> button is always at the top.</p>');};
 setView('play');if(isProjector)$('editor').hidden=true;
 initSplash();
}

function initBackgroundMotion(){
 const checkbox=$('motionToggle'),note=$('motionDeviceNote'),media=window.matchMedia('(prefers-reduced-motion: reduce)');
 let requested=readStore('uke-strum-motion-v1',true)!==false;
 function apply(){const active=requested&&!media.matches;document.body.classList.toggle('motion-paused',!active);if(!active){clearLyricMotion();}checkbox.checked=active;checkbox.disabled=media.matches;note.hidden=!media.matches;updateStrumHand();}
 checkbox.onchange=()=>{requested=checkbox.checked;writeStore('uke-strum-motion-v1',requested);apply();};
 media.addEventListener?.('change',apply);apply();
}

function fitChordLabels(){for(const id of ['currentChord','nextChord','practiceChord','practiceNext']){const label=$(id);if(label)label.dataset.long=String(label.textContent.length>2);}}
const fixedPositionRender=renderPosition;
renderPosition=function(tick,phase=displayPhase(tick)){fixedPositionRender(tick,phase);fitChordLabels();};
const fixedCountRender=renderCount;
renderCount=function(count){fixedCountRender(count);fitChordLabels();};


let splashExitTimer=0,splashPriorOverflow='';
function showSplash(){
 if(isProjector||isViewer||$('splashScreen').open)return;
 if(transport.state==='playing')pause();
 $('optionsModal').close();
 const splash=$('splashScreen');splash.classList.remove('is-leaving');$('splashStart').disabled=false;
 splashPriorOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
 splash.showModal();$('splashStart').focus();
}
function enterFromSplash(){
 const splash=$('splashScreen');if(!splash.open||splashExitTimer)return;
 $('splashStart').disabled=true;splash.classList.add('is-leaving');
 const finish=()=>{splashExitTimer=0;splash.close();document.body.style.overflow=splashPriorOverflow;setView('play');$('heroPlay').focus();};
 if(lyricMotionEnabled())splashExitTimer=setTimeout(finish,380);else finish();
}
function initSplash(){
 const logo=window.EMBEDDED_ART?.[SPLASH_LOGO_ASSET]||SPLASH_LOGO_ASSET;
 $('splashEmblem').src=logo;$('brandEmblem').src=logo;$('splashScenery').src=collageArtSource(CUSTOM_ART_INDEX);
 $('splashStart').onclick=enterFromSplash;
 $('splashScreen').addEventListener('cancel',e=>{e.preventDefault();enterFromSplash();});
 $('welcomeBtn').onclick=showSplash;
 showSplash();
}
