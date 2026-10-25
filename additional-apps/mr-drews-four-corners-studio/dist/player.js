import {BroadcastMotion} from './motion.js';
import {RoundEngine,countdownSource,resultText,hideMysteryContent,labelsFor,cornerColors} from './core.js';
import {SoundDesk} from './audio.js';
import {escapeHTML as e,icon} from './content.js';
export function mountPlayer(project){
const root=document.getElementById('app');
const modes={knowledge:'Question challenge',prediction:'Mystery reveal',roulette:'Random corner'};
let view='start',playIndex=0,focus=false,playingAudio=false,toastTimer,fitFrame=0,target='prompt';
const currentPlay=()=>project.slides[playIndex];
const graphic=()=>'';
const sound=new SoundDesk(toast);
const stageMotion=new BroadcastMotion();
const hasAudio=s=>s?.centerType==='audio'&&!!(s.centerContent||s.sound);
const motionReduced=()=>project.settings.reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const button=(action,label,ic='',cls='',attrs='')=>`<button type="button" class="btn ${cls}" data-action="${action}" aria-label="${e(label)}" ${attrs}>${ic?icon(ic):''}<span class="btn-label">${label}</span></button>`;
const iconButton=(action,label,ic,attrs='')=>`<button type="button" class="btn icon-only ghost" data-action="${action}" aria-label="${e(label)}" title="${e(label)}" ${attrs}>${icon(ic)}</button>`;

const brand=()=>`<span class="standalone-title">${e(project.name)}</span>`;
const engine=new RoundEngine({
 onState(state){if(view!=='play')return;if(['locked','paused','revealed','idle'].includes(state))sound.stopEffects();if(state==='locked')stopVideo();renderControls();const kicker=root.querySelector('.prompt-kicker');if(kicker)kicker.textContent=state==='counting'?'Choose your corner':state==='locked'?'Choices locked':state==='revealing'?'Here it comes…':modes[currentPlay()?.mode]||'';},
 onTick(seconds,ratio){updateClock(seconds,ratio);},
 onSound(type){if(['tick','lock'].includes(type)&&countdownSource(project,playIndex))return;if(type==='suspense'&&project.audio.drumroll){sound.custom(project.audio.drumroll);return;}sound.effect(type);},
 onSpin(index){root.querySelectorAll('.player .corner').forEach((el,i)=>el.classList.toggle('spinning',i===index));},
 onReveal(winner){if(view!=='play')return;sound.stopEffects();renderPlayerStage();renderControls();const out=project.rules==='out';const cue=project.audio[out?'sad':'happy'];if(cue)sound.custom(cue);else sound.effect(out?'out':'safe');if(currentPlay().mode==='prediction'&&hasAudio(currentPlay()))playCue();}
});
function toast(message){const el=document.getElementById('toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),4500);}
function scheduleFit(){cancelAnimationFrame(fitFrame);fitFrame=requestAnimationFrame(fitStage);}
function fitStage(){
 const stage=root.querySelector('.stage');if(!stage)return;
 const question=stage.querySelector('.question');if(question){question.style.fontSize='';let size=parseFloat(getComputedStyle(question).fontSize);const limit=view==='play'?Math.max(64,stage.clientHeight*.25):100;while(question.scrollHeight>limit&&size>17){size-=1;question.style.fontSize=size+'px';}}
 stage.querySelectorAll('.corner').forEach(corner=>{
   const content=corner.querySelector('.corner-content'),answer=corner.querySelector('.answer'),media=corner.querySelector('.corner-media');
   if(!content||content.clientHeight<10)return;
   if(answer){answer.style.fontSize='';let size=parseFloat(getComputedStyle(answer).fontSize);const reserve=media?Math.min(60,content.clientHeight*.4):0;while((answer.scrollHeight>content.clientHeight-reserve||answer.scrollWidth>content.clientWidth+2)&&size>(view==='play'?16:13)){size-=1;answer.style.fontSize=size+'px';}}
   if(media){const available=Math.max(1,content.clientHeight-(answer?answer.offsetHeight+8:0));media.style.maxHeight=available+'px';const art=media.querySelector('img,svg');if(art)art.style.maxHeight=available+'px';}
 });
}
function promptMarkup(s,edit){const hidden=hideMysteryContent(s,engine.state,edit);const audio=hasAudio(s);let media='';if(hidden){media='<div class="mystery-orb" aria-label="Hidden until the reveal">?</div>';}else if(s.centerType==='graphic'&&s.graphic){media=graphic(s.graphic);}else if(s.centerType==='image'&&s.centerContent){media=`<img src="${e(s.centerContent)}" alt="Question picture">`;}else if(s.centerType==='video'&&s.centerContent){media=edit?`${icon('play')} Video`:`<video src="${e(s.centerContent)}" controls playsinline preload="metadata" aria-label="Question video"></video>`;}else if(audio){media=edit?`<span class="listen-button">${icon('headphones')} Listening round</span>`:`<button type="button" class="listen-button ${playingAudio?'is-playing':''}" data-action="cue"><span class="sound-bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><span>${playingAudio?'Stop audio':'Play audio'}</span></button>`;}else if(s.centerType==='text'&&s.centerContent){media='';}
 const question=s.question|| (s.mode==='roulette'?'Choose your corner!':edit?'Write your question…':'Choose your corner.');return `<div class="prompt ${edit&&target==='prompt'?'active-target':''}" ${edit?'data-action="target" data-target="prompt" role="button" tabindex="0" aria-label="Edit the question"':''}><div class="prompt-copy"><div class="round-index">Round ${String(playIndex+1).padStart(2,'0')}</div><div class="prompt-kicker">${edit?modes[s.mode]:hidden?'Make your prediction':modes[s.mode]}</div><h2 class="question">${e(question)}</h2>${!hidden&&s.centerType==='text'&&s.centerContent?`<p class="prompt-subtext">${e(s.centerContent)}</p>`:''}</div>${media?`<div class="prompt-media">${media}</div>`:''}</div>`;}
function clockMarkup(){return `<div class="scoreboard" role="timer" aria-label="${project.settings.seconds} seconds remaining" style="--progress:100%"><span class="clock-number">${project.settings.seconds}</span><span class="clock-unit">Seconds</span><span class="clock-track" aria-hidden="true"><i></i></span></div>`;}
function updateClock(seconds,ratio,state=engine.state){
 const clock=root.querySelector('.scoreboard');if(!clock)return;
 const label={paused:'Paused',locked:'Time’s up',revealing:'Revealing',revealed:'Revealed'}[state]||'Seconds';
 clock.style.setProperty('--progress',`${Math.max(0,Math.min(1,ratio))*100}%`);
 clock.querySelector('.clock-number').textContent=seconds;
 clock.querySelector('.clock-unit').textContent=label;
 clock.classList.toggle('urgent',state==='counting'&&seconds>0&&seconds<=3);
 clock.dataset.state=state;
 clock.setAttribute('aria-label',`${seconds} seconds remaining${label==='Seconds'?'':', '+label}`);
}
function stageMarkup(s,edit=false){return `<section class="stage sports-stage ${project.labels==='colors'?'color-labels':''} ${project.settings.largeText?'large-text':''} ${motionReduced()?'reduced-motion':''} ${!edit&&focus?'focus-prompt':''} ${!edit&&engine.state==='revealed'?'broadcast-reveal':''}" aria-label="Four Corners stage"><div class="stage-heading">${clockMarkup()}${promptMarkup(s,edit)}</div><div class="board">${s.corners.map((c,i)=>{const won=!edit&&engine.state==='revealed'&&engine.winner===i;const dim=!edit&&engine.state==='revealed'&&!won;const visual=c.image?`<img src="${e(c.image)}" alt="Corner ${e(labelsFor(project)[i])} picture">`:graphic(c.graphic);const tag=edit?'button':'div';const empty=!visual&&!c.text;return `<${tag} ${edit?'type="button" data-action="target" data-target="'+i+'"':''} class="corner ${edit&&target===i?'active-target':''} ${won?'selected-result':''} ${won&&project.rules==='out'?'out-result':''} ${dim?'dimmed':''}" data-corner="${i}" style="--corner:${cornerColors(project)[i]}" ${edit?`aria-label="Edit corner ${i+1}"`:''}><span class="corner-top"><span class="corner-label">${e(labelsFor(project)[i])}</span>${edit&&c.isCorrect&&s.mode!=='roulette'?'<span class="corner-result-label">✓ Correct</span>':`<span class="corner-word">Corner ${i+1}</span>`}</span><span class="corner-content">${visual?`<span class="corner-media ${!c.image&&['note','rhythm','dynamic'].includes(c.graphic?.kind)?'sheet':''}">${visual}</span>`:''}${c.text?`<span class="answer ${c.text.length>80?'long':c.text.length>28?'medium':''}">${e(c.text)}</span>`:''}${empty?`<span class="${edit&&s.mode!=='roulette'?'answer muted':'corner-number-hero'}">${edit&&s.mode!=='roulette'?'Add a choice':e(labelsFor(project)[i])}</span>`:''}</span>${won?`<span class="reveal-banner"><span class="reveal-banner-inner">${icon(project.rules==='out'?'close':'check')}<strong>${project.rules==='out'?'Out!':project.rules==='safe'?'Safe!':s.mode==='roulette'?'Selected!':'Correct!'}</strong><small>Corner ${e(labelsFor(project)[i])}</small></span></span>`:''}</${tag}>`;}).join('')}</div></section>`;}
function renderPlayer(){root.innerHTML=`<main class="player ${motionReduced()?'reduced-motion':''}"><header class="app-header"><div class="header-title">${brand()}<span class="header-divider"></span><span class="play-round-label">Round ${playIndex+1} / ${project.slides.length}</span></div><div class="header-actions">${iconButton('previous','Previous round','back',playIndex===0?'disabled':'')}${iconButton('next','Next round','chevron')}${iconButton('focus',focus?'Show corners':'Focus on the prompt','eye')}${iconButton('fullscreen','Toggle full screen','expand')}</div></header><div id="player-stage" style="display:contents"></div><div class="control-bar" id="controls"></div><div class="sr-only" id="round-announcement" aria-live="polite"></div></main>`;renderPlayerStage();stageMotion.enter(root.querySelector('.stage'),motionReduced(),()=>{if(view==='play')renderControls();});renderControls();}
function renderPlayerStage(){const el=document.getElementById('player-stage');if(el){el.innerHTML=stageMarkup(currentPlay(),false);scheduleFit();}}
function renderControls(){const el=document.getElementById('controls');if(!el)return;const s=currentPlay();if(!s)return;const state=engine.state;const descriptions={choose:['Choose your corner',s.mode==='prediction'?'Make your prediction. The clue stays hidden until the reveal.':hasAudio(s)?'Play the audio, then let everyone choose.':'Walk to a corner. Start the timer when the class is ready.'],counting:['Find your corner','Walk carefully. Lock in your choice before time runs out.'],paused:['Timer paused','Take your time. Resume when everyone is ready.'],locked:['Choices locked',s.mode==='roulette'?'Ready to find the lucky corner?':'Ready for the answer?'],revealing:[s.mode==='roulette'?'Selecting a corner…':'Here comes the answer…',''],revealed:[resultText(project,s,engine.winner??0),s.explanation|| (project.rules==='out'?'Students in the selected corner step out for this game.':project.rules==='safe'?'Students in the selected corner stay in.':'Everyone can join the next round.')]};const [title,sub]=descriptions[state]||descriptions.choose;
 let controls='';if(state==='choose')controls=button('reveal',s.mode==='roulette'?'Spin now':'Reveal now','','ghost',stageMotion.entering?'disabled':'')+button('start-timer',`Start ${project.settings.seconds}s timer`,'clock','primary',stageMotion.entering?'disabled':'');if(state==='counting')controls=button('reveal','Reveal now','','ghost')+button('pause','Pause','pause','primary');if(state==='paused')controls=button('replay-round','Reset timer','','ghost')+button('start-timer','Resume','play','primary');if(state==='locked')controls=button('reveal',s.mode==='roulette'?'Select a corner':'Reveal answer',s.mode==='roulette'?'shuffle':'spark','primary');if(state==='revealing')controls=button('noop','A little suspense…','','primary','disabled');if(state==='revealed')controls=button('replay-round','Replay round','','ghost')+button('next',playIndex===project.slides.length-1?'Finish game':'Next round','chevron','primary');
 const time=['counting','paused'].includes(state)?Math.ceil(engine.remaining/1000):state==='choose'?project.settings.seconds:0;const ratio=['counting','paused'].includes(state)?engine.remaining/(project.settings.seconds*1000):state==='choose'?1:0;
 updateClock(time,ratio,state);
 el.innerHTML=`<div class="play-status"><div class="play-status-copy"><strong class="${state==='revealed'?'result-title':''}">${e(title)}</strong><small>${e(sub)}</small></div></div><div class="play-buttons">${controls}</div>`;const live=document.getElementById('round-announcement');if(live)live.textContent=title;}
function loadRound(index){if(index<0)return;if(index>=project.slides.length){finish();return;}sound.stopAll();stopVideo();playingAudio=false;playIndex=index;focus=false;engine.load(currentPlay(),{...project.settings,reducedMotion:motionReduced()});renderPlayer();}
function finish(){stageMotion.cancel();sound.stopAll();engine.stop();view='finish';root.innerHTML=`<main class="player"><header class="app-header">${brand()}</header><section class="celebration"><div class="trophy">${icon('spark')}</div><div class="eyebrow">${e(project.name)}</div><h1>Well played, everyone!</h1><p>${project.slides.length} rounds of listening, thinking, and moving.<br>Thanks for playing ${e(project.name)}.</p><div class="row wrap">${button('play-again','Play again','play','primary')}</div><p class="credit">${e(project.author||'')}</p></section></main>`;sound.effect('end');}

function stopVideo(){root.querySelectorAll('video').forEach(v=>v.pause());}
function playCue(){if(playingAudio){sound.stopMusic();return;}const s=view==='play'?currentPlay():current();if(!hasAudio(s))return;if(view==='play'&&s.mode==='prediction'&&engine.state!=='revealed')return;playingAudio=true;updateCueUI();sound.play(s,()=>{playingAudio=false;updateCueUI();});}
function updateCueUI(){root.querySelectorAll('[data-action="cue"]').forEach(b=>{b.classList.toggle('is-playing',playingAudio);b.querySelector('span:last-child').textContent=playingAudio?'Stop audio':'Play audio';});const btn=root.querySelector('[data-action="editor-cue"]');if(btn)btn.innerHTML=icon(playingAudio?'stop':'play')+`<span>${playingAudio?'Stop':'Listen'}</span>`;}
async function fullScreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Use your browser’s full-screen option on this device.');}}
function start(){sound.configure(project.settings);sound.unlock();view='play';loadRound(0);}
root.innerHTML=`<main class="player"><section class="celebration"><div class="eyebrow">FOUR CORNERS</div><h1>${e(project.name)}</h1><p>${project.slides.length} rounds · ${project.settings.seconds} seconds to choose a corner<br>Read or listen, choose your corner, then reveal the answer.</p><div class="row wrap">${button('begin','Start game','play','primary')}${button('fullscreen','Full screen','expand')}</div><p>${e(project.author||'')}</p><small>Space: start / pause / next · R: reveal · A: audio · F: full screen</small><small>Teacher controls stay available throughout the game.</small></section></main>`;
root.addEventListener('click',async ev=>{
const b=ev.target.closest('[data-action]');if(!b||b.disabled)return;
switch(b.dataset.action){
case 'begin':case 'play-again':start();break;
case 'fullscreen':fullScreen();break;
case 'start-timer':if(stageMotion.entering)break;sound.configure(project.settings);playingAudio=false;updateCueUI();stopVideo();await sound.startCountdown(engine,countdownSource(project,playIndex));break;
case 'pause':engine.pause();break;
case 'reveal':{if(stageMotion.entering)break;const epoch=engine.epoch;sound.stopAll();await sound.unlock();if(view!=='play'||engine.epoch!==epoch)break;sound.configure(project.settings);playingAudio=false;updateCueUI();stopVideo();focus=false;root.querySelector('.stage')?.classList.remove('focus-prompt');engine.reveal();break;}
case 'cue':playCue();break;
case 'previous':loadRound(playIndex-1);break;
case 'next':loadRound(playIndex+1);break;
case 'replay-round':loadRound(playIndex);break;
case 'focus':stageMotion.cancel();renderControls();focus=!focus;root.querySelector('.stage')?.classList.toggle('focus-prompt',focus);b.setAttribute('aria-label',focus?'Show corners':'Focus on the prompt');scheduleFit();break;
}
});
document.addEventListener('keydown',ev=>{
if(view!=='play'||ev.target.matches('input,textarea,select')||ev.target.closest('button')&&['Space','Enter'].includes(ev.code))return;
let action=null;
if(ev.code==='Space')action=['choose','paused'].includes(engine.state)?'start-timer':engine.state==='counting'?'pause':engine.state==='locked'?'reveal':engine.state==='revealed'?'next':null;
if(ev.key.toLowerCase()==='r')action='reveal';if(ev.key.toLowerCase()==='a')action='cue';if(ev.key.toLowerCase()==='f')action='fullscreen';if(ev.key==='ArrowLeft')action='previous';if(ev.key==='ArrowRight')action='next';
if(action){ev.preventDefault();root.querySelector(`[data-action="${action}"]`)?.click();}
});
window.addEventListener('resize',scheduleFit);
root.addEventListener('load',ev=>{if(ev.target.tagName==='IMG')scheduleFit();},true);
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(engine.state==='counting')engine.pause();sound.stopAll();stopVideo();}});
}
