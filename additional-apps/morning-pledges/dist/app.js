(function(){
'use strict';
const data=window.PLEDGE_PAGES,order=['us','nm','anthem','fair-new-mexico'];
const flagAlt={us:'Flag of the United States, with 50 stars and 13 stripes',nm:'Flag of New Mexico, a red Zia sun symbol on a yellow field'};
const $=id=>document.getElementById(id),app=$('app');
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
const defaults={page:'us',section:0,words:true,motion:!reduced.matches,scale:1};
let state={...defaults};
try{
 const saved=JSON.parse(localStorage.getItem('morning-pledges-v1')||'null');
 if(saved){
  state.page=order.includes(saved.page)?saved.page:saved.flag==='nm'?'nm':'us';
  state.section=Number.isInteger(saved.section)?Math.max(0,Math.min(data[state.page].sections.length-1,saved.section)):0;
  state.words=typeof saved.words==='boolean'?saved.words:true;
  state.motion=typeof saved.motion==='boolean'?saved.motion:defaults.motion;
  state.scale=Number.isFinite(saved.scale)?Math.max(.8,Math.min(1.3,saved.scale)):1;
 }
}catch{}
const initialRoute=location.hash.slice(1);
if(order.includes(initialRoute)){state.page=initialRoute;state.section=0;if(data[state.page].song)state.words=true}
let presenting=false,hideTimer=0;
const flag=new FlagArt.WavingFlag($('flag-canvas'),data[state.page].flag);
for(const type of ['us','nm']){const mini=$('mini-'+type);FlagArt.paint(mini.getContext('2d'),type,mini.width,mini.height)}
function save(){try{localStorage.setItem('morning-pledges-v1',JSON.stringify({...state,flag:data[state.page].flag}))}catch{}}
function syncMotion(){flag.setRunning(state.motion&&!document.hidden)}
function nextLabel(){
 const d=data[state.page];
 return state.words&&state.section<d.sections.length-1?'Next: '+d.sections[state.section+1].label: data[order[(order.indexOf(state.page)+1)%order.length]].nav;
}
function render(announce=false){
 const d=data[state.page],section=d.sections[state.section],next=nextLabel();
 document.body.dataset.flag=d.flag;document.body.dataset.page=state.page;document.title=d.title+' · Morning Pledges';
 app.classList.toggle('song-view',!!d.song);
 $('flag-title').textContent=d.title;$('flag-eyebrow').textContent=d.eyebrow;$('pledge-heading').textContent=d.heading;$('pledge-number').textContent=d.number;
 $('song-byline').hidden=!d.song;$('song-byline').textContent=d.byline||'';
 $('pledge').replaceChildren(...section.lines.flatMap((line,i)=>{const span=document.createElement('span');span.textContent=line;return i?[document.createTextNode(' '),span]:[span]}));
 $('flag-canvas').setAttribute('aria-label',(state.motion?'Gently waving ':'')+flagAlt[d.flag]);
 document.querySelectorAll('.flag-tab').forEach(button=>{const on=button.dataset.page===state.page;button.setAttribute('aria-pressed',String(on));button.classList.toggle('selected',on)});
 $('lyric-controls').hidden=!d.song;
 $('lyric-section').replaceChildren(...d.sections.map((part,index)=>{const option=document.createElement('option');option.value=String(index);option.textContent=part.label||'Pledge';return option}));
 $('lyric-section').value=String(state.section);
 $('lyric-count').textContent=(state.section+1)+' / '+d.sections.length;
 $('lyric-prev').disabled=state.section===0;$('lyric-next').disabled=state.section===d.sections.length-1;
 app.classList.toggle('flags-only',!state.words);$('words-panel').hidden=!state.words;
 $('words-toggle').setAttribute('aria-pressed',String(state.words));$('words-label').textContent=state.words?'Words on':'Words off';
 $('motion-toggle').setAttribute('aria-pressed',String(state.motion));$('motion-label').textContent=state.motion?'Pause waving':'Resume waving';
 $('motion-icon').setAttribute('d',state.motion?'M8 5v14M16 5v14':'M7 4l13 8-13 8z');
 $('motion-caption').textContent=state.motion?'Gently waving':'Waving paused';$('motion-dot').classList.toggle('paused',!state.motion);
 $('next-label').textContent=next;$('present-switch').textContent=next+' →';
 app.style.setProperty('--text-scale',state.scale.toFixed(1));$('smaller').disabled=state.scale<=.8;$('larger').disabled=state.scale>=1.3;
 flag.setType(d.flag);syncMotion();save();
 if(announce)$('announcement').textContent=d.heading+(section.label?', '+section.label:'')+' selected.';
}
function switchPage(page,section=0){
 if(!order.includes(page))return;
 state.page=page;state.section=section;if(data[page].song)state.words=true;
 try{history.replaceState(null,'','#'+page)}catch{}
 render(true);showControls();window.scrollTo({top:0,behavior:'auto'});
}
function changeLyrics(section){
 const count=data[state.page].sections.length;
 state.section=Math.max(0,Math.min(count-1,section));render(true);showControls();
}
function nextScreen(){
 if(state.words&&state.section<data[state.page].sections.length-1)changeLyrics(state.section+1);
 else switchPage(order[(order.indexOf(state.page)+1)%order.length]);
}
function previousScreen(){
 if(state.words&&state.section>0)changeLyrics(state.section-1);
 else{const prev=order[(order.indexOf(state.page)+order.length-1)%order.length];switchPage(prev,state.words?data[prev].sections.length-1:0)}
}
window.addEventListener('hashchange',()=>{const page=location.hash.slice(1);if(order.includes(page))switchPage(page)});
function toggleWords(){state.words=!state.words;render()}
function toggleMotion(){state.motion=!state.motion;render()}
function resizeText(delta){state.scale=Math.max(.8,Math.min(1.3,Math.round((state.scale+delta)*10)/10));render()}
document.querySelectorAll('.flag-tab').forEach(button=>button.addEventListener('click',()=>switchPage(button.dataset.page)));
$('lyric-prev').addEventListener('click',()=>changeLyrics(state.section-1));$('lyric-next').addEventListener('click',()=>changeLyrics(state.section+1));
$('lyric-section').addEventListener('change',event=>changeLyrics(Number(event.target.value)));
$('next').addEventListener('click',nextScreen);$('present-switch').addEventListener('click',nextScreen);
$('words-toggle').addEventListener('click',toggleWords);$('motion-toggle').addEventListener('click',toggleMotion);
$('smaller').addEventListener('click',()=>resizeText(-.1));$('larger').addEventListener('click',()=>resizeText(.1));
function showControls(){
 if(!presenting)return;
 app.classList.remove('controls-hidden');clearTimeout(hideTimer);
 hideTimer=setTimeout(()=>{if(!$('present-controls').contains(document.activeElement))app.classList.add('controls-hidden')},4200);
}
function setPresenting(value){
 presenting=value;app.classList.toggle('presenting',value);app.classList.remove('controls-hidden');
 if(value){$('wake-controls').focus({preventScroll:true});showControls()}else{clearTimeout(hideTimer);$('present').focus({preventScroll:true})}
 flag.draw();
}
async function togglePresent(){
 if(presenting){
  setPresenting(false);
  if(document.fullscreenElement){try{await document.exitFullscreen()}catch{}}
 }else{
  setPresenting(true);
  try{if(app.requestFullscreen)await app.requestFullscreen()}catch{/* Focus view is usable when the host disallows native fullscreen. */}
 }
}
$('present').addEventListener('click',togglePresent);$('exit-present').addEventListener('click',togglePresent);
$('wake-controls').addEventListener('click',showControls);
$('stage').addEventListener('pointerdown',event=>{if(event.target.closest('button,select,label,a'))return;if(presenting){$('wake-controls').focus({preventScroll:true});showControls()}});
$('present-controls').addEventListener('focusin',showControls);
$('present-controls').addEventListener('pointerenter',()=>clearTimeout(hideTimer));
$('present-controls').addEventListener('pointerleave',showControls);
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&presenting)setPresenting(false)});
document.addEventListener('visibilitychange',syncMotion);
const dialog=$('about-dialog');$('info').addEventListener('click',()=>dialog.showModal());$('close-info').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close()}});
document.addEventListener('keydown',event=>{
 if(event.altKey||event.ctrlKey||event.metaKey||event.repeat||dialog.open)return;
 if(/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)||event.target.isContentEditable)return;
 const key=event.key.toLowerCase();
 if(['1','2','3','4'].includes(key)){event.preventDefault();switchPage(order[Number(key)-1]);return}
 if(key===' '&&data[state.page].song&&event.target.tagName!=='BUTTON'){event.preventDefault();changeLyrics(state.section+1);return}
 if(['arrowright','arrowleft','f','t','a','escape'].includes(key)){
  event.preventDefault();
  if(key==='arrowright')nextScreen();if(key==='arrowleft')previousScreen();
  if(key==='f')togglePresent();if(key==='t')toggleWords();if(key==='a')toggleMotion();
  if(key==='escape'&&presenting)togglePresent();
 }
});
reduced.addEventListener('change',event=>{state.motion=!event.matches;render()});
render();
})();
