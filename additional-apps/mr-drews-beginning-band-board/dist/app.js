import {INSTRUMENTS,SYLLABLES,HELP,SOUND_SOURCES,FINGERING_SOURCES,asset,midiFrequency} from './data.js';
import {InkLayer,downloadCanvas} from './ink.js';
import {drawMusicStaff} from './notation.js';
import {RhythmWriter} from './rhythm.js';
import {InstrumentTroubleshooter} from './troubleshooting.js';
import {RehearsalTools} from './rehearsal.js';
// Classroom touch displays must not turn a hold or drag into a browser menu.
document.addEventListener('contextmenu',e=>e.preventDefault(),{capture:true});
const isTextEntry=target=>!!target?.closest?.('input,textarea,[contenteditable=""],[contenteditable="true"],[contenteditable="plaintext-only"]');
for(const event of ['selectstart','dragstart'])document.addEventListener(event,e=>{
 if(!isTextEntry(e.target))e.preventDefault();
},{capture:true});
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let prefs={};try{prefs=JSON.parse(localStorage.getItem('band-board:prefs'))||{}}catch{}
const state={instrument:INSTRUMENTS.some(i=>i.id===prefs.instrument)?prefs.instrument:'clarinet',note:Number.isInteger(prefs.note)&&prefs.note>=0&&prefs.note<7?prefs.note:1,mode:'fingerings',whole:false,draw:false,board:['blank','treble','bass','double'].includes(prefs.board)?prefs.board:'treble'};
let toastTimer,ctx,voice=[],voiceTimer;
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3600)}
function savePrefs(){try{localStorage.setItem('band-board:prefs',JSON.stringify({instrument:state.instrument,note:state.note,board:state.board}))}catch{}}
const instrument=()=>INSTRUMENTS.find(i=>i.id===state.instrument);
function titleNote(i){return i.written[state.note].replace(/\d/g,'')}
function sourceLinks(sources){return sources.map(([label,url])=>`<li><a href="${url}" target="_blank" rel="noopener noreferrer">${label} ↗</a></li>`).join('')}
$('#fingering-sources').innerHTML=sourceLinks(FINGERING_SOURCES);$('#sound-sources').innerHTML=sourceLinks(SOUND_SOURCES);
$('#instrument-row').innerHTML=INSTRUMENTS.map(i=>`<button data-instrument="${i.id}" aria-pressed="false">${i.name}</button>`).join('');
$('#instrument-row').addEventListener('click',e=>{const b=e.target.closest('[data-instrument]');if(b){state.instrument=b.dataset.instrument;render();savePrefs()}});
$('#note-row').innerHTML=SYLLABLES.map((s,n)=>`<button data-note="${n}" aria-pressed="false">${s}<span></span></button>`).join('');
$('#note-row').addEventListener('click',e=>{const b=e.target.closest('[data-note]');if(b)selectNote(Number(b.dataset.note))});
const chartInk=new InkLayer($('#chart-ink'),{notify:toast});
const boardInk=new InkLayer($('#board-ink'),{notify:toast});
chartInk.mountTools($('#annotation-tools'),()=>saveChart());
boardInk.mountTools($('#board-tools'),()=>saveBoard());
function selectNote(n){state.note=(n+7)%7;stopTone();render();savePrefs()}
function chartImage(i,part){return `<img class="${part==='staff'?'staff-img':'fingering-img'+(i.vertical?' vertical':'')}" src="${asset(i.id,state.note,part)}" alt="${i.name} ${SYLLABLES[state.note]}: ${part==='staff'?'written '+i.written[state.note]:i.captions[state.note]}" draggable="false">`}
function render(){
 const i=instrument(),n=state.note;
 $$('[data-instrument]').forEach(b=>{const active=b.dataset.instrument===i.id;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active)});
 $$('[data-note]').forEach(b=>{const active=Number(b.dataset.note)===n;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);b.querySelector('span').textContent=state.whole?i.concert[Number(b.dataset.note)]:i.written[Number(b.dataset.note)].replace(/\d/g,'')});
 $('#instrument-title').textContent=state.whole?'Whole band · '+SYLLABLES[n]:i.name;
 $('#whole-band').setAttribute('aria-pressed',state.whole);
 $('#status-hint').textContent=state.whole?'Concert '+i.concert[n]+' · everyone plays the same scale degree.':'Do = concert B♭ · number keys 1–7 choose notes · ← → move between notes';
 if(state.whole){$('#chart-content').innerHTML=`<div class="band-grid">${INSTRUMENTS.map(v=>`<article class="band-card"><h3><button data-solo="${v.id}">${v.name} ↗</button></h3><strong>${titleNote(v)}</strong>${chartImage(v,'staff')}${chartImage(v,'fingers')}<p>${v.captions[n]}</p></article>`).join('')}</div>`}else{
 $('#chart-content').innerHTML=`<div class="single-chart"><div class="note-info"><p class="solfege-word ${n===0?'low':''}">${SYLLABLES[n]}</p><p class="written-name">${titleNote(i)}</p>${chartImage(i,'staff')}<span class="small-note">${i.clef} clef · written ${i.written[n]}</span></div><div class="fingering-area">${chartImage(i,'fingers')}<div class="fingering-caption">${i.captions[n]}<span class="fingering-sub">${i.hints[n]}</span></div></div></div>`;
 }
 chartInk.setKey('chart-'+(state.whole?'band':i.id)+'-'+n);chartInk.resize();
 $('#annotate').setAttribute('aria-pressed',state.draw);$('#annotation-tools').classList.toggle('hidden',!state.draw);$('#chart-ink').classList.toggle('drawing',state.draw);
 renderHelp();
 if(state.mode==='repairs')troubleshooter.show(i);
}
$('#chart-content').addEventListener('click',e=>{const b=e.target.closest('[data-solo]');if(b){state.instrument=b.dataset.solo;state.whole=false;render();savePrefs()}});
$('#whole-band').onclick=()=>{state.whole=!state.whole;render()};$('#annotate').onclick=()=>{state.draw=!state.draw;render()};
const rhythmWriter=new RhythmWriter($('#rhythm'),{notify:toast,exit:()=>mode('fingerings'),fullscreen});
const troubleshooter=new InstrumentTroubleshooter($('#repairs'));
function mode(name){state.mode=name;stopTone();for(const view of ['fingerings','whiteboard','rhythm','help','repairs'])$('#'+view).classList.toggle('hidden',view!==name);document.body.classList.toggle('whiteboard-mode',name==='whiteboard');document.body.classList.toggle('rhythm-mode',name==='rhythm');rhythmWriter.setVisible(name==='rhythm');$$('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===name));if(name==='whiteboard'){boardInk.setKey('board-'+state.board);requestAnimationFrame(resizeBoard)}else if(name!=='rhythm'){render();requestAnimationFrame(()=>chartInk.resize())}$('main').scrollTo(0,0)}
$$('[data-mode]').forEach(b=>b.onclick=()=>mode(b.dataset.mode));$('#brand').onclick=e=>{e.preventDefault();mode('fingerings')};$('#exit-board').onclick=()=>mode('fingerings');$('#help-fingering').onclick=()=>mode('fingerings');
function helpReferences(card){const sources=[...card.sources.map(k=>SOUND_SOURCES[k]),...(card.fingerings||[]).map(k=>FINGERING_SOURCES[k])];if(!sources.length)return '';return `<p>${sources.map(([label,url])=>`<a href="${url}" target="_blank" rel="noopener">${label} ↗</a>`).join('<br>')}</p>`}
function renderHelp(){const i=instrument();$('#help-title').textContent=i.id==='bells'?'Let’s make your bells ring.':`Let’s find your ${i.name.toLowerCase()} sound.`;$('#help-grid').innerHTML=HELP[i.id].map((c,n)=>`<article class="help-card"><span class="problem-number">TRY THIS · ${n+1}</span><h2>${c.title}</h2><ol>${c.steps.map(s=>`<li>${s}</li>`).join('')}</ol><details><summary>Teacher notes</summary><p>${c.teacher}</p>${helpReferences(c)}</details></article>`).join('')}
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('Use your browser’s full-screen or presentation option.')}catch{toast('Open the app in its own browser tab to use full screen.')}}
$('#fullscreen').onclick=fullscreen;$('#board-fullscreen').onclick=fullscreen;
$('#about-button').onclick=()=>$('#about').showModal();$('#close-about').onclick=()=>$('#about').close();$('#about').onclick=e=>{if(e.target===$('#about')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()}};

function drawStaff(){const can=$('#staff-canvas'),r=$('#board-surface').getBoundingClientRect();if(!r.width||!r.height)return;const d=Math.min(devicePixelRatio||1,2.5);can.width=Math.round(r.width*d);can.height=Math.round(r.height*d);const c=can.getContext('2d');c.setTransform(d,0,0,d,0,0);drawMusicStaff(c,{width:r.width,height:r.height,type:state.board})}
function resizeBoard(){if(state.mode!=='whiteboard')return;const toolbar=$('#board-toolbar');if(!toolbar.classList.contains('hidden'))$('#board-surface').style.top=(toolbar.offsetTop+toolbar.offsetHeight+9)+'px';else $('#board-surface').style.top='0px';drawStaff();boardInk.resize()}
new ResizeObserver(resizeBoard).observe($('#whiteboard'));window.addEventListener('resize',resizeBoard);
$$('[data-board]').forEach(b=>b.onclick=()=>{state.board=b.dataset.board;$$('[data-board]').forEach(x=>x.classList.toggle('active',x===b));boardInk.setKey('board-'+state.board);savePrefs();resizeBoard()});
$$('[data-board]').forEach(b=>b.classList.toggle('active',b.dataset.board===state.board));
$('#hide-toolbar').onclick=()=>{$('#board-toolbar').classList.add('hidden');$('#show-toolbar').classList.remove('hidden');$('#whiteboard').classList.add('tools-hidden');resizeBoard()};
$('#show-toolbar').onclick=()=>{$('#board-toolbar').classList.remove('hidden');$('#show-toolbar').classList.add('hidden');$('#whiteboard').classList.remove('tools-hidden');resizeBoard()};
function saveBoard(){boardInk.finish();const out=document.createElement('canvas'),base=$('#staff-canvas');out.width=base.width;out.height=base.height;const c=out.getContext('2d');c.drawImage(base,0,0);c.drawImage(boardInk.canvas,0,0,out.width,out.height);downloadCanvas(out,`Band-Board-${state.board}-whiteboard.png`)}
async function saveChart(){chartInk.finish();const el=$('#chart-surface'),r=el.getBoundingClientRect(),out=document.createElement('canvas');out.width=Math.round(r.width*2);out.height=Math.round(r.height*2);const c=out.getContext('2d');c.scale(2,2);c.fillStyle='#fff';c.fillRect(0,0,r.width,r.height);
 try{for(const im of el.querySelectorAll('img')){await im.decode();const b=im.getBoundingClientRect(),ratio=Math.min(b.width/im.naturalWidth,b.height/im.naturalHeight),w=im.naturalWidth*ratio,h=im.naturalHeight*ratio;c.drawImage(im,b.x-r.x+(b.width-w)/2,b.y-r.y+(b.height-h)/2,w,h)}
  const texts=el.querySelectorAll('.solfege-word,.written-name,.small-note,.fingering-caption,.band-card h3,.band-card strong');for(const t of texts){const b=t.getBoundingClientRect(),style=getComputedStyle(t);c.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;c.fillStyle=style.color;c.textAlign='center';c.textBaseline='top';const text=t.classList.contains('fingering-caption')?instrument().captions[state.note]:t.textContent;c.fillText(text,b.x-r.x+b.width/2,b.y-r.y,b.width)}
  c.drawImage(chartInk.canvas,0,0,r.width,r.height);downloadCanvas(out,`Band-Board-${state.whole?'band':state.instrument}-${SYLLABLES[state.note].replace(' ','-')}.png`);
 }catch{toast('The chart is still loading. Please try Save image again.')}
}
function stopTone(){for(const o of voice){try{o.stop()}catch{}}voice=[];clearTimeout(voiceTimer);$('#hear').textContent='▶ Hear it'}
async function hear(){if(voice.length){stopTone();return}try{ctx??=new(window.AudioContext||window.webkitAudioContext)();await ctx.resume();const midi=state.whole?[57,58,60,62,63,65,67][state.note]:instrument().midi[state.note],t=ctx.currentTime;const g=ctx.createGain();g.connect(ctx.destination);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.18,t+.035);g.gain.setValueAtTime(.18,t+.9);g.gain.exponentialRampToValueAtTime(.001,t+1.3);const o=ctx.createOscillator();o.type='sine';o.frequency.value=midiFrequency(midi);o.connect(g);o.start(t);o.stop(t+1.35);voice=[o];$('#hear').textContent='■ Stop';voiceTimer=setTimeout(()=>{voice=[];g.disconnect();$('#hear').textContent='▶ Hear it'},1400)}catch{toast('Audio is unavailable in this browser. Try opening the app in a full browser tab.')}}
$('#hear').onclick=hear;$('#hear').title='Play a reference tone at the sounding pitch';document.addEventListener('visibilitychange',()=>{if(document.hidden)stopTone()});
document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;const ink=state.mode==='whiteboard'?boardInk:state.mode==='fingerings'&&state.draw?chartInk:null;if((e.ctrlKey||e.metaKey)&&ink&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?ink.redo():ink.undo();return}if((e.ctrlKey||e.metaKey)&&ink&&e.key.toLowerCase()==='y'){e.preventDefault();ink.redo();return}if(state.mode==='fingerings'){if(/^[1-7]$/.test(e.key)){e.preventDefault();selectNote(Number(e.key)-1)}if(e.key==='ArrowRight'){e.preventDefault();selectNote(state.note+1)}if(e.key==='ArrowLeft'){e.preventDefault();selectNote(state.note-1)}}});
const rehearsalTools=new RehearsalTools($('#rehearsal-tools'),{notify:toast});
render();
