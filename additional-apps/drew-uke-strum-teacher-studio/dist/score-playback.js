'use strict';
// Pro-only sheet music follows the existing transport and recorded audio clock.
let scorePlayerReady=false,scorePrepared=null,scorePreparedSong=null,scoreDirty=true,scoreStageRenderer=null,scoreVideoRenderer=null,scoreLastPhase=0,scoreDrawFailed=false;
const scoreBaseNormalize=normalizeSong;
normalizeSong=function(raw){const s=scoreBaseNormalize(raw);if(raw.scoreBandSwing===true){s.scoreBandSwing=true;s.swing=s.meter==='6/8'?0:clamp(raw.swing,0,.5,0);}return s;};
function scoreInvalidate(){scoreDrawFailed=false;scoreDirty=true;scoreStageRenderer?.clear();scoreVideoRenderer?.clear();}
function preparedSongScore(){if(scoreDirty||scorePreparedSong!==song){scorePreparedSong=song;scorePrepared=UkeScorePlayback.prepare(song);scoreDirty=false;}return scorePrepared;}
const scoreBaseChanged=changed;
changed=function(){scoreInvalidate();scoreBaseChanged();if(scorePlayerReady)renderScoreControls();};
const scoreBaseRender=renderAll;
renderAll=function(){scoreInvalidate();scoreBaseRender();if(scorePlayerReady){renderScoreControls();renderScorePlayer(displayPhase(transport.tick),false);}};
const scoreBaseLyrics=renderLyricsAt;
renderLyricsAt=function(phase,counting=false){const result=scoreBaseLyrics(phase,counting);if(scorePlayerReady)renderScorePlayer(phase,counting);return result;};
const scoreBaseTransport=updateTransport;
updateTransport=function(){scoreBaseTransport();if(scorePlayerReady)renderScorePlayer(transport.state==='finished'?transport.pos/duration():displayPhase(transport.tick),transport.state!=='finished'&&displayPhase(transport.tick)<(transport.countUntil||0));};
const scoreBaseSchedule=scheduleSongStep;
scheduleSongStep=function(tick,time,phase=tick){
 scoreBaseSchedule(tick,time,phase);
 const enabled=videoSession&&!videoSession.previewOnly?videoSession.options.guideMelody:song.notation?.guideMelody;
 if(!enabled||isProjector||exerciseBackup||isEndingMeasure(song,tick)||!gate)return;
 const prepared=preparedSongScore();if(!prepared)return;
 for(const e of UkeScorePlayback.guideEvents(prepared,tick)){
  const at=transport.origin+(phase+e.step-tick)*duration(),length=Math.max(.035,e.length*.94);
  if(at<ctx.currentTime-.015)continue;
  const voice=sampleNote('marimba',e.midi,at,.78,gate,length,.32);
  if(!voice)tone(e.midi,at,length,.12,'triangle');
 }
};
function renderScoreControls(){
 const n=song.notation;if(!n||!$('scoreShow'))return;
 $('scoreShow').checked=n.showInPlayer;$('scoreGuide').checked=n.guideMelody;
 const status=UkeScorePlayback.status(song);$('scorePlayerHint').textContent=status.message;$('scorePlayerHint').classList.toggle('score-warning',!status.ready);
 $('scoreUsePresent').disabled=!n.measures.some(m=>m.notes.some(e=>!e.rest));
}
function useScoreAndPresent(){
 try{
  const raw=UkeScorePlayback.arrangement(song,CHORD_FINGERINGS);raw.pattern=STRUM_PATTERNS[song.pattern]?.timeSignature===raw.meter?song.pattern:METERS[raw.meter].default;
  raw.band={...song.band,enabled:true};const next=normalizeSong(raw);
  stopMelody();stop(false);checkpoint();song=next;activeRange=null;selected=0;melodyUndo=[];melodyRedo=[];changed();renderAll();
  $('performBtn').click();toast('Score ready with the band. Press Play to sing and strum.');
 }catch(e){melodyMessage(e.message,true);}
}
function renderScorePlayer(phase,counting=false){
 if(!scorePlayerReady)return;scoreLastPhase=phase;
 const prepared=preparedSongScore(),enabled=!!(prepared&&song.notation?.showInPlayer&&!exerciseBackup&&!scoreDrawFailed&&transport.state!=='finished');
 const panel=$('scorePlayer');panel.hidden=!enabled;$('stage').classList.toggle('with-sheet-music',enabled);
 if(!enabled||$('stage').hidden)return;
 try{
  const p=playbackPlan(),state=UkeScorePlayback.state(prepared,phase,p,transport.countUntil||0);
  // Finish retains the final score without implying another note or another repeat.
  if(transport.state==='finished'){state.ending=true;state.active=null;}
  const canvas=$('scorePlayerCanvas'),width=Math.max(320,Math.floor(panel.clientWidth||1100)-24),height=560,dpr=Math.min(2,window.devicePixelRatio||1);
  if(canvas.width!==Math.ceil(width*dpr)||canvas.height!==Math.ceil(height*dpr)){canvas.width=Math.ceil(width*dpr);canvas.height=Math.ceil(height*dpr);}
  canvas.style.width='100%';canvas.style.height=height+'px';const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,width,height);
  canvas.dataset.measure=String(state.bar+1);canvas.dataset.note=state.active?String(state.active.index):'';
  scoreStageRenderer.draw(c,prepared,state,{x:0,y:0,w:width,h:height},{layout:'stack',font:22,motion:lyricMotionEnabled()&&['playing','paused'].includes(transport.state)});
  let title=state.counting?'Get ready · '+countInPrompt(Math.min(countInCounts(),Math.max(1,Math.floor((phase-(transport.countUntil||0)+countInSteps())/countStepSize())+1))):state.ending?'Final chord · let it ring':'Sing & strum · Measure '+(state.bar+1);
  $('scorePlayerTitle').textContent=title;$('scorePlayerMeter').textContent=prepared.score.meter+(UkeMelody.feelMark(prepared.score)?' · '+UkeMelody.feelMark(prepared.score):'');
  const fallback=!prepared.hasLyrics&&song.showLyrics?activeCue?.text||prepared.score.measures[state.bar]?.reference||'':'';
  $('scorePlayerLyric').textContent=fallback;$('scorePlayerLyric').hidden=!fallback||state.ending;
  canvas.setAttribute('aria-label','Melody score, measure '+(state.bar+1)+(state.active?.lyric?', '+state.active.lyric:'')+(state.nextBar!==null?', up next measure '+(state.nextBar+1):''));
 }catch(e){scoreDrawFailed=true;panel.hidden=true;$('stage').classList.remove('with-sheet-music');if(!isProjector)toast('Sheet music could not draw. Lyrics remain available.');}
}
function videoScoreData(){const prepared=preparedSongScore();return prepared&&scoreVideoRenderer?{prepared,renderer:scoreVideoRenderer,motion:lyricMotionEnabled()}:null;}
function initScorePlayback(){
 if(scorePlayerReady)return;
 scoreStageRenderer=UkeScoreRenderer.create();scoreVideoRenderer=UkeScoreRenderer.create();
 $('lyricStage').insertAdjacentHTML('beforebegin','<section id="scorePlayer" class="score-player" hidden aria-label="Sing and strum sheet music"><div class="score-player-heading"><strong id="scorePlayerTitle"></strong><span id="scorePlayerMeter"></span></div><canvas id="scorePlayerCanvas" role="img" aria-label="Melody score"></canvas><p id="scorePlayerLyric" class="score-player-lyric" hidden></p></section>');
 if($('melodyView')){
  $('melodyEmptyNote').insertAdjacentHTML('beforebegin','<div class="score-player-options"><div class="score-player-switches"><label class="check"><input type="checkbox" id="scoreShow" checked>Sheet music in presentation</label><label class="check"><input type="checkbox" id="scoreGuide">Hear melody guide</label><button id="scoreUsePresent">Use score &amp; present</button></div><p id="scorePlayerHint"></p><p class="hint">Use score &amp; present copies this score’s meter, tempo, and swing into the song. Chords are already linked across both editors and new exports. You can undo that change. The melody guide is a quiet marimba.</p></div>');
  $('scoreShow').onchange=e=>melodyChange(n=>n.showInPlayer=e.target.checked);$('scoreGuide').onchange=e=>melodyChange(n=>n.guideMelody=e.target.checked);$('scoreUsePresent').onclick=useScoreAndPresent;
  const baseMelodyRender=renderMelody;renderMelody=function(){baseMelodyRender();renderScoreControls();};
 }
 // Strong score swing can reach 3:1 without being clamped by the legacy band setting.
 $('swingAmount').max='.5';
 scorePlayerReady=true;renderScoreControls();renderScorePlayer(displayPhase(transport.tick));
 if(document.fonts)document.fonts.load('22px UkePrint').then(()=>{scoreInvalidate();renderScorePlayer(scoreLastPhase);}).catch(()=>{});
 window.addEventListener('resize',()=>{scoreStageRenderer.clear();renderScorePlayer(scoreLastPhase);});
}
