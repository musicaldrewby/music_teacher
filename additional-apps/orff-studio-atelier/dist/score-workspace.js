export const SCORE_WORKSPACE_KEY='orff-score-workspace-v1';
export function loadScoreWorkspace(storage){try{const v=JSON.parse(storage.getItem(SCORE_WORKSPACE_KEY)||'{}');return {focus:v.focus===true,instrument:v.instrument===true};}catch{return {focus:false,instrument:false};}}
export function saveScoreWorkspace(storage,value){try{storage.setItem(SCORE_WORKSPACE_KEY,JSON.stringify({focus:!!value.focus,instrument:!!value.instrument}));return true;}catch{return false;}}
const modes={select:['Selecting','Choose notes or measures to hear, copy or revise.'],note:['Writing notes','Click a pitch or type A–G. Each note advances by its length.'],rest:['Writing rests','Each click writes a rest at the cursor.'],chord:['Adding harmony','Stack pitches at this beat. Next position moves on.']};
export function mountScoreWorkspace(root,state,prefs,{hear,stop,canHear,playing,looping,toggleFocus,toggleInstrument,toggleDetails,position}){
 const doc=root.ownerDocument,dock=doc.createElement('div');dock.className='score-workspace-dock';
 const [mode,hint]=modes[state.tool]||modes.note;
 dock.innerHTML=`<div class="score-workspace-actions"><div class="score-mode-indicator" data-mode="${state.tool}"><span class="mode-dot" aria-hidden="true"></span><strong>${mode}</strong></div><div class="score-listening" role="group" aria-label="Listen to selected music"><button class="outline" id="score-hear-selection" ${canHear?'':'disabled'} aria-label="Hear selection once">▶ Hear selection</button><button class="outline" id="score-loop-selection" ${canHear?'':'disabled'} aria-pressed="${playing&&looping}">↻ Loop selection</button><button class="quiet" id="score-stop-selection" ${playing?'':'disabled'} aria-label="Stop selection playback">■ Stop</button></div><div class="score-display-tools"><button class="outline ${prefs.instrument?'chosen':''}" id="score-show-instrument" aria-pressed="${prefs.instrument}">Instrument + score</button><button class="outline ${prefs.focus?'chosen':''}" id="score-focus" aria-pressed="${prefs.focus}">${prefs.focus?'Exit focus':'Focus'}</button></div></div><div class="score-mode-hint">${hint}<span id="score-listening-status" role="status">${playing?(looping?'Looping selection':'Playing selection'):''}</span></div><div id="score-workspace-feedback" class="score-workspace-feedback" role="alert"></div>`;
 root.querySelector('#score-composition-controls').before(dock);
 // Keep the actual editing controls in one sticky dock, with their original handlers.
 const tools=root.querySelector('.score-entry-tools');if(tools)dock.querySelector('.score-mode-hint').before(tools);
 if(prefs.focus){
  const options=doc.createElement('button');options.className='outline';options.id='score-workspace-options';options.textContent='Entry & edit tools';options.setAttribute('aria-expanded',String(!!prefs.details));options.setAttribute('aria-controls','score-composition-controls');options.onclick=toggleDetails;dock.querySelector('.score-display-tools').prepend(options);
  dock.append(root.querySelector('#score-composition-controls'));
  const next=root.querySelector('#score-next-chord');if(next)dock.querySelector('.score-display-tools').prepend(next);
 }
 if(position){const place=doc.createElement('span');place.className='score-position-cue';place.textContent=position;dock.querySelector('.score-mode-indicator').append(place);}
 dock.querySelector('#score-focus').onclick=toggleFocus;dock.querySelector('#score-show-instrument').onclick=toggleInstrument;
 dock.querySelector('#score-hear-selection').onclick=()=>hear(false);dock.querySelector('#score-loop-selection').onclick=()=>hear(true);dock.querySelector('#score-stop-selection').onclick=stop;
 const measure=()=>{const height=doc.querySelector('.workspace-ribbon')?.getBoundingClientRect().height;doc.documentElement.style.setProperty('--score-ribbon-height',(height||96)+'px');};measure();
 const Observer=doc.defaultView?.ResizeObserver;let observer;if(Observer){observer=new Observer(measure);observer.observe(doc.querySelector('.workspace-ribbon'));}
 return ()=>observer?.disconnect();
}
