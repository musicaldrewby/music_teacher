import {METERS,SOUNDS,normalizeSettings,finishTimestamp,reminderStatus,tapBpm} from './rehearsal-model.js';
import {RehearsalAudio} from './rehearsal-audio.js';
const KEY='band-board:rehearsal:v1';
const timeFormat=new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'});
const fullTimeFormat=new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit',second:'2-digit'});
const dateFormat=new Intl.DateTimeFormat(undefined,{weekday:'long',month:'short',day:'numeric'});
const time=t=>timeFormat.format(new Date(t));
function countdown(ms){const seconds=Math.max(0,Math.ceil(ms/1000)),m=Math.floor(seconds/60);return `${m}:${String(seconds%60).padStart(2,'0')}`;}
export class RehearsalTools{
 constructor(root,{notify=()=>{}}={}){
  this.root=root;this.notify=notify;let saved;try{saved=JSON.parse(localStorage.getItem(KEY))}catch{}this.settings=normalizeSettings(saved||{});this.taps=[];this.wakeLock=null;this.wakeRequest=false;
  root.innerHTML=`<aside class="rehearsal-dock" aria-label="Clock and metronome">
   <button class="dock-clock" data-rehearsal="open" aria-label="Open clock, metronome, and pack-up reminder" aria-haspopup="dialog"><time id="dock-time"></time><span id="dock-reminder">Clock & reminder</span></button>
   <span class="dock-pulse" aria-hidden="true">●</span><button class="dock-transport" data-rehearsal="toggle" aria-label="Start metronome">▶</button>
   <button class="dock-tempo" data-rehearsal="open" aria-haspopup="dialog"><strong id="dock-bpm">100 BPM</strong><span>Metronome & clock</span></button>
  </aside>
  <dialog id="rehearsal-dialog" aria-labelledby="rehearsal-title">
   <header class="rehearsal-heading"><div><span class="eyebrow">KEEP THE BAND TOGETHER</span><h2 id="rehearsal-title">Rehearsal tools</h2><time id="metro-large-clock"></time></div><div class="rehearsal-heading-actions"><button data-rehearsal="large">Large beat view</button><button data-rehearsal="close" aria-label="Close rehearsal tools">×</button></div></header>
   <div class="rehearsal-columns">
    <section class="metronome-panel" aria-labelledby="metronome-heading"><h3 id="metronome-heading">Metronome</h3>
     <div class="tempo-editor"><button data-tempo-step="-1" aria-label="One beat per minute slower">−</button><label for="metro-bpm"><input id="metro-bpm" data-setting="bpm" type="number" min="30" max="300" step="1" inputmode="numeric"><span id="metro-unit">Quarter note = BPM</span></label><button data-tempo-step="1" aria-label="One beat per minute faster">+</button></div>
     <input id="metro-tempo-slider" type="range" min="30" max="300" step="1" aria-label="Tempo in beats per minute">
     <div id="metro-beats" class="metro-beats" aria-label="Beat display"></div><div id="metro-subdivisions" class="metro-subdivisions" aria-hidden="true"></div>
     <div class="metro-transport"><button class="metro-start" data-rehearsal="toggle">▶ Start</button><button data-rehearsal="tap">Tap tempo</button></div>
     <div class="metro-controls"><label>Meter<select data-setting="meter">${Object.entries(METERS).map(([v,m])=>`<option value="${v}">${m.label}</option>`).join('')}</select></label><label>Subdivisions<select data-setting="subdivision"><option value="1">Beat only</option><option value="2">2 per beat</option><option value="3">3 per beat</option><option value="4">4 per beat</option></select></label><label class="wide-field">Click sound<select data-setting="sound">${Object.entries(SOUNDS).map(([v,label])=>`<option value="${v}">${label}</option>`).join('')}</select></label><label class="check-field wide-field"><input data-setting="accent" type="checkbox">Accent the first beat</label><label class="wide-field">Metronome volume <output id="metro-volume"></output><input data-setting="volume" type="range" min="0" max="100" step="1"></label></div>
     <p class="rehearsal-note">A sharp marching-style click. For a full band, use classroom or PA speakers and adjust their volume too.</p>
    </section>
    <section class="clock-panel" aria-labelledby="clock-heading"><h3 id="clock-heading">Class clock</h3><time id="rehearsal-clock"></time><p id="rehearsal-date"></p><p class="clock-zone">Your device’s local time</p>
     <div class="finish-countdown"><span id="countdown-label">Pack-up reminder is off</span><strong id="rehearsal-countdown">—</strong></div>
     <fieldset class="reminder-fields"><legend>Packed up and out by</legend><div class="finish-inputs"><label>Date<input data-setting="finishDate" type="date"></label><label>Finish time<input data-setting="finishTime" type="time"></label></div><label class="reminder-lead">Remind me <input data-setting="leadMinutes" type="number" min="1" max="60" inputmode="numeric"> minutes before</label><label class="check-field reminder-switch"><input data-setting="reminderEnabled" type="checkbox">Enable pack-up reminder</label></fieldset>
     <p id="reminder-status" role="status"></p><label class="alert-volume">Alert volume <output id="alert-volume"></output><input data-setting="alertVolume" type="range" min="0" max="100" step="1"></label><div class="reminder-actions"><button data-rehearsal="test">Test alert</button><button data-rehearsal="enable-sound" class="hidden">Enable alert sound</button></div>
     <p class="rehearsal-note">The alert shows a large message, plays a chime, and pauses the metronome. Keep this page open and the device awake. It does not repeat automatically on another day.</p>
    </section>
   </div><p id="rehearsal-feedback" role="status" class="rehearsal-feedback"></p>
  </dialog>
  <dialog id="packup-alert" aria-labelledby="packup-title" aria-describedby="packup-message"><span class="eyebrow">REHEARSAL REMINDER</span><h2 id="packup-title">Time to pack up</h2><p id="packup-message"></p><strong id="packup-finish"></strong><p id="packup-audio-note"></p><button data-rehearsal="dismiss">Got it</button></dialog>`;
  this.panel=root.querySelector('#rehearsal-dialog');this.alert=root.querySelector('#packup-alert');this.audio=new RehearsalAudio(this.settings,{onPulse:p=>this.pulse(p),onState:()=>this.renderTransport(),onError:message=>this.message(message)});
  root.addEventListener('click',e=>this.click(e));root.addEventListener('change',e=>{if(e.target.dataset.setting)this.change(e.target)});
  root.addEventListener('input',e=>{if(['volume','alertVolume'].includes(e.target.dataset.setting))this.change(e.target);if(e.target.id==='metro-tempo-slider')this.setTempo(Number(e.target.value));});
  this.panel.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.target.closest('input,select,textarea,button,a,summary')){e.preventDefault();this.toggle()}});
  this.alert.addEventListener('close',()=>this.audio.silenceAlert());
  this.panel.addEventListener('click',e=>{if(e.target===this.panel){const r=this.panel.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)this.panel.close()}});
  document.addEventListener('visibilitychange',()=>{this.wakeBlocked=false;this.updateClock();this.syncWakeLock()});
  // Restored reminders need a fresh user gesture for sound in some browsers.
  document.addEventListener('click',()=>{if(this.settings.reminderEnabled&&!this.audio.ready)this.audio.unlock().catch(()=>{})});
  window.addEventListener('pagehide',()=>{this.audio.stop();this.audio.silenceAlert();this.wakeLock?.release().catch(()=>{})});
  this.renderControls();this.updateClock();this.clockTimer=setInterval(()=>this.updateClock(),500);
 }
 $(s){return this.root.querySelector(s)}
 save(){try{localStorage.setItem(KEY,JSON.stringify(this.settings))}catch{this.message('Settings could not be saved on this device.')}}
 message(text){this.$('#rehearsal-feedback').textContent=text;this.notify(text)}
 async click(e){
  const step=e.target.closest('[data-tempo-step]');if(step){this.setTempo(this.settings.bpm+Number(step.dataset.tempoStep));return}
  const button=e.target.closest('[data-rehearsal]');if(!button)return;
  switch(button.dataset.rehearsal){
   case'open':if(!this.panel.open)this.panel.showModal();this.updateClock();break;
   case'close':this.panel.close();break;
   case'large':this.panel.classList.toggle('large-beat-view');button.textContent=this.panel.classList.contains('large-beat-view')?'Show settings':'Large beat view';break;
   case'toggle':this.toggle();break;
   case'tap':{const now=performance.now();if(now-(this.taps.at(-1)||0)>2200)this.taps=[];this.taps.push(now);this.taps=this.taps.slice(-6);const bpm=tapBpm(this.taps);if(bpm)this.setTempo(bpm);break;}
   case'test':this.audio.stop();try{await this.audio.unlock();this.showAlert(true)}catch(error){this.showAlert(true);this.message(error.message)}break;
   case'enable-sound':try{await this.audio.unlock();this.updateClock()}catch(error){this.message(error.message)}break;
   case'dismiss':this.alert.close();break;
  }
 }
 toggle(){this.wakeBlocked=false;if(this.audio.active)this.audio.stop();else{this.$('#rehearsal-feedback').textContent='';this.audio.start();}}
 setTempo(value){this.settings=normalizeSettings({...this.settings,bpm:value});this.audio.update(this.settings,true);this.renderControls();this.save();}
 async change(input){
  const key=input.dataset.setting,value=input.type==='checkbox'?input.checked:input.value;
  let next={...this.settings,[key]:value};
  if(key==='meter')next.subdivision=value.endsWith('/8')?3:1;
  if(['finishDate','finishTime','leadMinutes','reminderEnabled'].includes(key))next.reminderFiredFor='';
  next=normalizeSettings(next);
  if(next.reminderEnabled){const end=finishTimestamp(next.finishDate,next.finishTime);if(end===null||end<=Date.now()){next.reminderEnabled=false;this.message('Choose a future finish date and time, then enable the reminder.');}}
  this.settings=next;this.audio.update(next,['bpm','meter','subdivision','sound','accent'].includes(key));this.renderControls();this.save();
  if(key==='reminderEnabled'&&next.reminderEnabled){try{await this.audio.unlock()}catch(error){this.message(error.message+' The on-screen reminder is still enabled.')}}
  this.updateClock();this.syncWakeLock();
 }
 renderControls(){for(const el of this.root.querySelectorAll('[data-setting]')){const value=this.settings[el.dataset.setting];if(el.type==='checkbox')el.checked=value;else el.value=value}this.$('#metro-tempo-slider').value=this.settings.bpm;this.$('#metro-volume').textContent=this.settings.volume+'%';this.$('#alert-volume').textContent=this.settings.alertVolume+'%';this.$('#metro-beats').dataset.accent=String(this.settings.accent&&this.settings.meter!=='pulse');this.$('#metro-unit').textContent=METERS[this.settings.meter].unit+' = BPM';this.$('#dock-bpm').textContent=this.settings.bpm+' BPM';this.$('#metro-beats').innerHTML=Array.from({length:METERS[this.settings.meter].beats},(_,n)=>`<span data-beat="${n}">${n+1}</span>`).join('');this.$('#metro-subdivisions').innerHTML=Array.from({length:this.settings.subdivision},(_,n)=>`<i data-sub="${n}"></i>`).join('');this.renderTransport();}
 renderTransport(){if(!this.audio)return;const playing=this.audio.active;for(const b of this.root.querySelectorAll('[data-rehearsal="toggle"]')){b.textContent=b.classList.contains('dock-transport')?(playing?'■':'▶'):(playing?'■ Stop':'▶ Start');b.setAttribute('aria-label',playing?'Stop metronome':'Start metronome');b.setAttribute('aria-pressed',String(playing));}this.root.classList.toggle('metronome-playing',playing);if(!playing){for(const b of this.root.querySelectorAll('[data-beat],[data-sub]'))b.classList.remove('current');this.$('.dock-pulse').classList.remove('on','accent');}this.syncWakeLock();}
 pulse(p){for(const b of this.root.querySelectorAll('[data-beat]'))b.classList.toggle('current',Number(b.dataset.beat)===p.beat);for(const b of this.root.querySelectorAll('[data-sub]'))b.classList.toggle('current',Number(b.dataset.sub)===p.sub);if(p.sub===0){const dot=this.$('.dock-pulse');dot.classList.add('on');dot.classList.toggle('accent',p.accent);clearTimeout(this.pulseTimer);this.pulseTimer=setTimeout(()=>dot.classList.remove('on'),110);}}
 updateClock(){const now=new Date();this.$('#dock-time').textContent=timeFormat.format(now);this.$('#rehearsal-clock').textContent=fullTimeFormat.format(now);this.$('#metro-large-clock').textContent=timeFormat.format(now);this.$('#rehearsal-date').textContent=dateFormat.format(now);const state=reminderStatus(this.settings,now.getTime());
  let status='Choose your finish time and turn the reminder on.',dock='Clock & reminder',label='Pack-up reminder is off',remaining='—';
  if(state.phase==='invalid')status='Choose a valid finish date and time.';
  if(state.phase==='finished'){status='Finish time reached. Set a new time for your next rehearsal.';dock='Finish time reached';label='Packed up and out by '+time(state.end);remaining='0:00';}
  if(['waiting','due','acknowledged'].includes(state.phase)){label='Until packed up and out';remaining=countdown(state.remaining);dock='Out by '+time(state.end);status=state.phase==='waiting'?`Pack-up alert at ${time(state.warn)} · ${this.settings.leadMinutes} minutes before finish.`:'Pack-up reminder delivered. Finish by '+time(state.end)+'.';if(!this.audio.ready){status+=' Tap Enable alert sound for the chime.';dock='Reminder on · tap for sound';}}
  this.$('#dock-reminder').textContent=dock;this.$('#countdown-label').textContent=label;this.$('#rehearsal-countdown').textContent=remaining;this.$('#reminder-status').textContent=status;this.$('[data-rehearsal="enable-sound"]').classList.toggle('hidden',!this.settings.reminderEnabled||this.audio.ready);this.root.classList.toggle('packup-window',['due','acknowledged','finished'].includes(state.phase));
  if(state.phase==='due'){this.settings.reminderFiredFor=state.key;this.save();this.showAlert(false,state);}
  this.syncWakeLock();
 }
 showAlert(test=false,state=reminderStatus(this.settings)){
  this.audio.stop();this.$('#packup-title').textContent=test?'Pack-up alert preview':'Time to pack up';this.$('#packup-message').textContent=test?'This is a test. Your reminder settings are unchanged.':`${Math.ceil(state.remaining/60000)} ${Math.ceil(state.remaining/60000)===1?'minute':'minutes'} left. Put instruments away and get ready to leave.`;this.$('#packup-finish').textContent=!test&&state.end?'Packed up and out by '+time(state.end):'Chime + on-screen reminder';this.$('#packup-audio-note').textContent=this.audio.ready?(this.settings.alertVolume===0?'Alert volume is muted.':''):'Sound is not enabled. Open Rehearsal tools and tap Enable alert sound.';
  if(!this.alert.open)this.alert.showModal();if(this.audio.ready)this.audio.chime().catch(error=>this.message(error.message));
 }
 async syncWakeLock(){const state=reminderStatus(this.settings),needed=(this.audio?.active||['waiting','due','acknowledged'].includes(state.phase))&&document.visibilityState==='visible';if(!needed){if(this.wakeLock){const lock=this.wakeLock;this.wakeLock=null;try{await lock.release()}catch{}}return}if(this.wakeLock||this.wakeRequest||this.wakeBlocked||!navigator.wakeLock)return;this.wakeRequest=true;try{const lock=await navigator.wakeLock.request('screen');this.wakeLock=lock;lock.addEventListener('release',()=>{if(this.wakeLock===lock)this.wakeLock=null});const stillNeeded=(this.audio?.active||['waiting','due','acknowledged'].includes(reminderStatus(this.settings).phase))&&document.visibilityState==='visible';if(!stillNeeded){await lock.release();this.wakeLock=null;}}catch{this.wakeBlocked=true}finally{this.wakeRequest=false}}
}
