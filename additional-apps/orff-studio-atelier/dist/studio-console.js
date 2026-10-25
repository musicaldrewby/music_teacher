// The console is a view of the existing project mix, never a second mixer model.
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const levelDb=level=>Number.isFinite(level)&&level>0?Math.max(-60,Math.min(0,20*Math.log10(level))):-60;
const panText=n=>Math.abs(n)<.005?'Center':Math.round(Math.abs(n)*100)+(n<0?'% left':'% right');
const percent=n=>Math.round(n*100)+'%';
export function syncKnob(input){
 const min=+input.min||0,max=+input.max||1,value=+input.value;
 input.parentElement.style.setProperty('--knob-angle',(-135+(value-min)/(max-min)*270)+'deg');
 input.setAttribute('aria-valuetext',input.dataset.pan!==undefined?panText(value):percent(value));
}
// Take one undo snapshot per drag or physical key press, even while focus stays put.
export function bindMixGesture(input,checkpoint){
 input.addEventListener('pointerdown',e=>{if(e.button<=0)checkpoint();});
 input.addEventListener('keydown',e=>{if(!e.repeat&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Home','End'].includes(e.key))checkpoint();});
}
// Native range semantics remain available to keyboard and assistive technology.
export function enhanceKnob(input){
 let drag=null;const win=input.ownerDocument.defaultView;
 input.addEventListener('input',()=>syncKnob(input));
 input.addEventListener('pointerdown',e=>{
  if(e.button>0)return;e.preventDefault();input.focus({preventScroll:true});
  drag={x:e.clientX,y:e.clientY,value:+input.value,id:e.pointerId};input.setPointerCapture?.(e.pointerId);
 });
 input.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.id)return;e.preventDefault();
  const min=+input.min,max=+input.max,step=+input.step||.01;
  input.value=String(Math.max(min,Math.min(max,Math.round((drag.value+(drag.y-e.clientY+e.clientX-drag.x)*(max-min)/180)/step)*step)));
  input.dispatchEvent(new win.Event('input',{bubbles:true}));
 });
 const finish=()=>{drag=null;};
 input.addEventListener('pointerup',finish);input.addEventListener('lostpointercapture',finish);
 input.addEventListener('pointercancel',()=>{if(drag){input.value=drag.value;input.dispatchEvent(new win.Event('input',{bubbles:true}));}finish();});
 input.addEventListener('keydown',e=>{if(e.key==='Escape'&&drag){input.value=drag.value;input.dispatchEvent(new win.Event('input',{bubbles:true}));finish();e.stopPropagation();}});
 input.title='Drag up or right to increase. Arrow keys fine-tune.';syncKnob(input);
}
export function outputMeter(){
 const ticks=[[-60,'−60'],[-30,'−30'],[-18,'−18'],[-12,'−12'],[-6,'−6'],[0,'0']].map(([db,label])=>{
  const a=(-55+(db+60)/60*110)*Math.PI/180,x=80+Math.sin(a)*61,y=88-Math.cos(a)*61;
  return `<path d="M${x} ${y}l${Math.sin(a)*6} ${-Math.cos(a)*6}"/><text x="${80+Math.sin(a)*76}" y="${91-Math.cos(a)*76}">${label}</text>`;
 }).join('');
 return `<div class="hardware-vu" role="meter" aria-label="Master output peak level" aria-valuemin="-60" aria-valuemax="0" aria-valuenow="-60" aria-valuetext="Silent"><svg viewBox="0 0 160 100" aria-hidden="true"><path class="vu-arc" d="M30 53 Q80 5 130 53"/><g class="vu-ticks">${ticks}</g><text x="80" y="63" class="vu-label">OUTPUT</text><text x="80" y="75" class="vu-unit">dBFS</text><g class="vu-needle"><path d="M80 91V24"/><circle cx="80" cy="89" r="4"/></g></svg><i class="vu-peak" aria-hidden="true"></i></div>`;
}
export function mountStudioConsole(doc,h){
 const $=s=>doc.querySelector(s),footer=$('.transport'),deck=doc.createElement('div');deck.className='transport-deck';
 const controls=$('.transport-controls'),position=$('.position'),scope=$('#play-scope').closest('label'),tempo=$('#bpm').closest('label'),meter=$('#meter').closest('label'),bars=$('#bars').closest('label'),master=$('.master-control');
 const grid=$('#transport-record-settings'),undo=$('#undo-take'),loop=$('#loop'),click=$('#metronome');
 const playback=doc.createElement('div');playback.className='transport-playback';playback.append(controls,position);
 const session=doc.createElement('div');session.className='transport-session';
 const fields=doc.createElement('div');fields.className='transport-fields';bars.classList.add('section-bars-field');fields.append(scope,tempo,meter,bars);
 const actions=doc.createElement('div');actions.className='transport-actions';actions.append(grid,undo,loop,click);
 session.append(fields,actions);
 const button=doc.createElement('button');button.id='console-mixer-toggle';button.className='console-mixer-toggle';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','console-mixer-drawer');button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3v18M12 3v18M19 3v18"/><path d="M2 8h6M9 16h6M16 9h6"/></svg><span>Open mixer</span>';
 const output=doc.createElement('div');output.className='transport-output';output.innerHTML=outputMeter();
 const masterInput=$('#master');masterInput.remove();master.replaceChildren();master.insertAdjacentHTML('beforeend','<span class="output-knob-label">OUTPUT</span><span class="hardware-knob master-knob"></span><span id="master-value"></span>');master.querySelector('.hardware-knob').append(masterInput);output.append(master);
 deck.append(playback,session,button,output);
 const drawer=doc.createElement('section');drawer.id='console-mixer-drawer';drawer.className='console-drawer';drawer.hidden=true;drawer.setAttribute('aria-label','Quick ensemble mixer');
 drawer.innerHTML='<div class="console-drawer-heading"><div><strong>Ensemble mixer</strong><span>Level · pan · mute · solo</span></div><div><button id="console-full-mixer">Full mixer ↗</button><button id="console-close-mixer" aria-label="Close quick mixer">Close ⌄</button></div></div><div class="console-drawer-channels" tabindex="0" aria-label="Instrument channels; scroll horizontally for more parts"></div>';
 footer.replaceChildren(drawer,deck);bindMixGesture(masterInput,h.checkpoint);enhanceKnob(masterInput);
 const channels=drawer.querySelector('.console-drawer-channels');let key='',frame=0,lastFrame=0,needle=-60;
 function setOpen(open){
  drawer.hidden=!open;button.setAttribute('aria-expanded',String(open));button.querySelector('span').textContent=open?'Close mixer':'Open mixer';
  doc.body.classList.toggle('console-mixer-open',open);if(open)sync();
 }
 button.onclick=()=>setOpen(drawer.hidden);$('#console-close-mixer').onclick=()=>{setOpen(false);button.focus({preventScroll:true});};
 $('#console-full-mixer').onclick=()=>{setOpen(false);h.openMixer();};
 drawer.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.defaultPrevented){setOpen(false);button.focus({preventScroll:true});}});
 function renderChannels(p){
  if(!p.tracks.length){channels.innerHTML='<p class="console-drawer-empty">Add instrument parts to build your ensemble mix.</p>';return;}
  channels.innerHTML=p.tracks.map((t,i)=>`<article class="quick-channel" data-quick-channel="${t.id}"><header><span class="channel-lamp" aria-hidden="true"></span><strong>${esc(t.name)}</strong><small>${String(i+1).padStart(2,'0')}</small></header><div class="quick-channel-controls"><div class="quick-fader"><div class="quick-meter" data-quick-meter="${t.id}" aria-hidden="true"><i></i></div><label><span class="sr-only">Level · ${esc(t.name)}</span><input type="range" min="0" max="1" step=".01" value="${t.volume}" data-quick-prop="volume" data-quick-id="${t.id}" aria-label="Level · ${esc(t.name)}"><output>${percent(t.volume)}</output></label></div><div class="quick-pan"><label><span class="hardware-knob"><input type="range" min="-1" max="1" step=".01" value="${t.pan}" data-pan data-quick-prop="pan" data-quick-id="${t.id}" aria-label="Pan · ${esc(t.name)}"></span><output>${panText(t.pan)}</output></label><div class="quick-switches"><button data-quick-toggle="muted" data-quick-id="${t.id}" aria-label="Mute · ${esc(t.name)}" aria-pressed="${!!t.muted}">M</button><button data-quick-toggle="solo" data-quick-id="${t.id}" aria-label="Solo · ${esc(t.name)}" aria-pressed="${!!t.solo}">S</button></div></div></div></article>`).join('');
  channels.querySelectorAll('input[data-quick-prop]').forEach(input=>{
   bindMixGesture(input,h.checkpoint);input.oninput=()=>{
    const t=h.project().tracks.find(t=>t.id===input.dataset.quickId);if(!t)return;
    const prop=input.dataset.quickProp;t[prop]=+input.value;input.closest('label').querySelector('output').textContent=prop==='pan'?panText(t[prop]):percent(t[prop]);h.change();
   };if(input.dataset.pan!==undefined)enhanceKnob(input);
  });
  channels.querySelectorAll('[data-quick-toggle]').forEach(b=>b.onclick=()=>{const t=h.project().tracks.find(t=>t.id===b.dataset.quickId);if(!t)return;h.checkpoint();t[b.dataset.quickToggle]=!t[b.dataset.quickToggle];h.change();});
 }
 function sync(){
  const p=h.project(),next=JSON.stringify(p.tracks.map(t=>[t.id,t.name]));
  if(next!==key){key=next;renderChannels(p);}
  syncKnob(masterInput);
  const solo=p.tracks.some(t=>t.solo);
  channels.querySelectorAll('[data-quick-channel]').forEach(el=>{
   const t=p.tracks.find(t=>t.id===el.dataset.quickChannel);if(!t)return;
   el.classList.toggle('quick-muted',!!t.muted||solo&&!t.solo);el.classList.toggle('quick-selected',t.id===h.activePart?.());
   el.querySelectorAll('[data-quick-prop]').forEach(input=>{const prop=input.dataset.quickProp;input.value=t[prop];input.closest('label').querySelector('output').textContent=prop==='pan'?panText(t[prop]):percent(t[prop]);if(prop==='pan')syncKnob(input);});
   el.querySelectorAll('[data-quick-toggle]').forEach(b=>b.setAttribute('aria-pressed',String(!!t[b.dataset.quickToggle])));
  });
 }
 function paint(now=0){
  if(!doc.hidden&&now-lastFrame>=65){
   lastFrame=now;const level=h.audio.meterLevel('master'),db=levelDb(level);needle=db>needle?db:Math.max(db,needle-5);
   const vu=output.querySelector('.hardware-vu');vu.style.setProperty('--vu-angle',(-55+(needle+60)/60*110)+'deg');vu.classList.toggle('peak',level>=.98);vu.setAttribute('aria-valuenow',String(Math.round(db)));vu.setAttribute('aria-valuetext',db<=-60?'Silent':Math.round(db)+' dBFS peak');
   if(!drawer.hidden)channels.querySelectorAll('[data-quick-meter]').forEach(el=>{const level=h.audio.meterLevel(el.dataset.quickMeter);el.style.setProperty('--signal',(levelDb(level)+60)/60*100+'%');el.classList.toggle('peak',level>=.98);});
  }
  frame=requestAnimationFrame(paint);
 }
 sync();frame=requestAnimationFrame(paint);
 return {sync,close:()=>setOpen(false),dispose:()=>cancelAnimationFrame(frame)};
}
