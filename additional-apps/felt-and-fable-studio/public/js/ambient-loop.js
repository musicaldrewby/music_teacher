'use strict';
// Optional silent background playback. It renders the same editable project
// and clock as MP4 export, without touching song/phrase timing or audio.
let ambientRun=null,ambientFrame=0,ambientOpening=false,ambientReturnFocus=null,ambientHideTimer=0;
function ambientShowControls(){const d=$('ambientDialog');d.classList.remove('ambient-controls-hidden');clearTimeout(ambientHideTimer);if(ambientRun?.playing)ambientHideTimer=setTimeout(()=>d.classList.add('ambient-controls-hidden'),3500);}
function ambientPosition(r=ambientRun,now=performance.now()){
 if(!r)return 0;return ((r.offset+(r.playing?(now-r.started)/1000*r.speed:0))%r.total+r.total)%r.total;
}
function ambientSync(){const r=ambientRun;if(!r)return;$('ambientPlay').textContent=r.playing?'Pause':'Play';$('ambientPlay').setAttribute('aria-label',r.playing?'Pause background':'Play background');$('ambientSpeed').value=r.speed;$('ambientDialog').classList.toggle('ambient-paused',!r.playing);}
function ambientPaint(){
 const r=ambientRun;if(!r)return;const t=ambientPosition(r),row=r.timeline.find(q=>t<q.end)||r.timeline.at(-1),c=$('ambientCanvas'),g=c.getContext('2d');
 const box=c.getBoundingClientRect(),width=Math.max(640,Math.min(1920,Math.round(box.width*(window.devicePixelRatio||1)))),height=Math.round(width*9/16);
 if(c.width!==width||c.height!==height){c.width=width;c.height=height;}
 drawScene(g,row.scene,c.width,c.height,t-row.start,false,false,r.project);
 if(r.playing)ambientFrame=requestAnimationFrame(ambientPaint);
}
function ambientToggle(){const r=ambientRun;if(!r)return;r.offset=ambientPosition(r);r.started=performance.now();r.playing=!r.playing;cancelAnimationFrame(ambientFrame);ambientSync();ambientShowControls();ambientPaint();}
function ambientClose(){ambientOpening=false;clearTimeout(ambientHideTimer);cancelAnimationFrame(ambientFrame);ambientFrame=0;ambientRun=null;const d=$('ambientDialog');if(d.open)d.close();if(document.fullscreenElement===d)document.exitFullscreen?.().catch(()=>{});ambientReturnFocus?.focus?.();}
async function ambientOpen(){
 if(ambientRun||ambientOpening||exportJob)return;ambientOpening=true;ambientReturnFocus=document.activeElement;
 try{
  stopAnimationPreview();stopStoryPlayback();cinemaStopCuePreview();if(presenting)present(false);
  const project=copy(state);await ensureStoryArtwork(project);if(!ambientOpening)return;
  const timeline=storyTimeline(project,60),total=timeline.at(-1).end;
  ambientRun={project,timeline,total,offset:0,started:performance.now(),speed:1,playing:true};ambientOpening=false;
  $('ambientTitle').textContent=project.title;$('ambientDialog').showModal();ambientSync();ambientPaint();$('ambientDialog').focus();ambientShowControls();
 }catch(e){ambientOpening=false;ambientClose();toast('Could not open background: '+e.message);}
}
function ambientInit(){
 const normalPresent=$('present').onclick;
 $('present').onclick=()=>state.backgroundLoop?.enabled?ambientOpen():normalPresent();
 $('ambientPlay').onclick=ambientToggle;
 $('ambientRestart').onclick=()=>{if(!ambientRun)return;ambientRun.offset=0;ambientRun.started=performance.now();cancelAnimationFrame(ambientFrame);ambientPaint();};
 $('ambientSpeed').onchange=e=>{const r=ambientRun,speed=Number(e.target.value);if(!r||![.5,.75,1].includes(speed))return;r.offset=ambientPosition(r);r.started=performance.now();r.speed=speed;ambientSync();if(!r.playing)ambientPaint();};
 $('ambientClose').onclick=ambientClose;
 $('ambientFullscreen').onclick=async()=>{const d=$('ambientDialog');try{if(document.fullscreenElement===d)await document.exitFullscreen();else if(d.requestFullscreen)await d.requestFullscreen();else toast('Use your browser’s full-screen command.');}catch{toast('Use your browser’s full-screen command.');}};
 $('ambientEdit').onclick=()=>{ambientClose();setStudioWorkspace('animate');};
 $('ambientExport').onclick=()=>{ambientClose();setStudioWorkspace('export');};
 $('ambientHide').onclick=()=>{clearTimeout(ambientHideTimer);$('ambientDialog').classList.add('ambient-controls-hidden');$('ambientDialog').focus();};
 const d=$('ambientDialog');d.addEventListener('close',()=>{if(ambientRun)ambientClose();});d.addEventListener('cancel',e=>{e.preventDefault();ambientClose();});
 d.addEventListener('pointermove',ambientShowControls);d.addEventListener('pointerdown',e=>{if(e.target===$('ambientCanvas'))ambientShowControls();});d.addEventListener('focusin',ambientShowControls);
 d.addEventListener('keydown',e=>{ambientShowControls();if(e.code==='Space'&&!['BUTTON','SELECT','INPUT'].includes(e.target.tagName)){e.preventDefault();ambientToggle();}});
 window.addEventListener('resize',()=>{if(ambientRun&&!ambientRun.playing)ambientPaint();});
 const query=window.location?.search||'';
 if(typeof URLSearchParams!=='undefined'&&new URLSearchParams(query).get('example')==='spooky-road'){
  $('welcomeStart').click();exampleOpen('spooky');
 }
}
window.FeltAmbient={open:ambientOpen,close:ambientClose,init:ambientInit};
