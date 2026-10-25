const rawSaved=readStore('uke-strum-songs-v2',[]);if(Array.isArray(rawSaved))for(const raw of rawSaved){try{savedSongs.push(normalizeSong(raw));}catch{}}
function restoreDraft(raw){
 if(!raw)return;
 const retired=['/row-row-row-your-boat.html','/mary-had-little-lamb.html','/old-macdonald-had-a-farm-ukulele/'];
 const retiredTitles=['Row, Row, Row Your Boat','Mary Had a Little Lamb','Old MacDonald Had a Farm'];
 if(!raw.id&&(retired.some(path=>String(raw.source||'').endsWith(path))||retiredTitles.includes(raw.title))){
  // Keep the previous draft recoverable without resurfacing a removed preset.
  if(!isViewer&&writeStore('uke-strum-retired-draft-v1',raw))writeStore('uke-strum-draft-v2',song);
  return;
 }
 try{const oldTempos={'Are You Sleeping?':88,'Rain, Rain, Go Away':96,'Hot Cross Buns':80,'London Bridge':90,'Skip to My Lou':100,'Twinkle, Twinkle, Little Star':84};const starter=STARTERS.find(s=>s.title===raw.title);if(!raw.id&&starter&&raw.tempo===oldTempos[raw.title]&&raw.meter===starter.meter&&raw.pattern===starter.pattern&&raw.source===starter.source&&(JSON.stringify(raw.measures)===JSON.stringify(starter.measures)||matchesStarterMusic(raw,starter)))raw.tempo=starter.tempo;song=normalizeSong(raw);$('saveStatus').textContent='Previous draft restored';}catch{toast('Could not restore the previous draft. Starter songs are ready.');}
}
// Apply the new default once to an unsaved draft carried over from the old release.
function playbackDefaultDraft(raw){
 const key='uke-strum-once-default-v1';
 if(isViewer||isProjector||readStore(key,false))return raw;
 if(raw&&!raw.id&&!raw.loop&&raw.playbackMode!=='loop'){
  const next={...raw,playCount:1};delete next.playbackMode;
  if(writeStore('uke-strum-draft-v2',next))writeStore(key,true);
  return next;
 }
 writeStore(key,true);return raw;
}
restoreDraft(playbackDefaultDraft(readStore('uke-strum-draft-v2',null)));
renderAll();if(!storageOkay)$('saveStatus').textContent='Use Export to keep your songs';
// Read-only diagnostic access for checking arrangements and playback timing.
window.UkeStrum={get song(){return clone(song);},get state(){return {...transport,queue:transport.queue.map(e=>({...e}))};},get starters(){return clone(STARTERS);},get patterns(){return clone(STRUM_PATTERNS);}};


initClassroom();

initBeach();
