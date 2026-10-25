import {STRUM_PATTERNS,getStrumPattern,clampTempo,STEP_SYMBOLS,strokeNotes,AutoStrummer} from './auto-strum.js?v=auto-strum-1';
const $=id=>document.getElementById(id);
export function createAutoStrum({audio,state,ensureAudio,stopDemo,dampAll,animatePluck,saveSettings,toast,openPanel,returnToInstrument}){
  let preparing=false,request=0,cells=[];
  const player=new AutoStrummer({now:()=>audio.ctx.currentTime,play:playStroke,onStep:(index,event)=>{
    cells.forEach((cell,i)=>cell.classList.toggle('current',i===index));
    $('autoBeat').textContent=event.count;
    $('autoPulse').classList.toggle('accent',index===0||(player.pattern.meter==='6/8'&&index===3));
  }});
  for(const pattern of STRUM_PATTERNS){const option=document.createElement('option');option.value=pattern.id;option.textContent=`${pattern.name} · ${pattern.meter}`;$('autoPattern').append(option);}
  function playStroke(event,at,duration){
    const notes=strokeNotes(event,state.chord),strength=state.strength*event.accent;
    const spread=Math.min(.15,duration*.65),gap=notes.length>1?spread/(notes.length-1):0;
    notes.forEach((note,i)=>{
      const time=at+i*gap;
      if(audio.pluck(note,strength,.45,time)){
        const timer=setTimeout(()=>{animatePluck(note,strength);state.visualTimers=state.visualTimers.filter(p=>p.timer!==timer);},Math.max(0,(time-audio.ctx.currentTime)*1000));
        state.visualTimers.push({timer,note});
      }
    });
  }
  function renderPattern(){
    const pattern=getStrumPattern(state.autoPattern);
    $('autoPattern').value=pattern.id;$('autoMeter').textContent=pattern.meter;
    $('autoDescription').textContent=pattern.description;
    $('autoTempoUnit').textContent=`BPM · ${pattern.beatUnit} beat`;
    $('autoPatternGrid').replaceChildren();$('autoPatternGrid').style.setProperty('--steps',pattern.steps.length);
    cells=pattern.steps.map(event=>{
      const cell=document.createElement('div');cell.className='pattern-step'+(event.kind==='rest'?' is-rest':'');
      const count=document.createElement('span');count.className='step-count';count.textContent=event.count;
      const symbol=document.createElement('span');symbol.className='step-symbol';symbol.textContent=STEP_SYMBOLS[event.kind];cell.append(count);cell.append(symbol);$('autoPatternGrid').append(cell);return cell;
    });
    $('autoPatternGrid').setAttribute('aria-label',pattern.steps.map(s=>`${s.count}: ${s.kind}`).join(', '));
    renderTempo();
  }
  function renderTempo(){
    $('autoTempo').value=String(state.autoTempo);$('autoTempoNumber').value=String(state.autoTempo);
    $('autoNowName').textContent=getStrumPattern(state.autoPattern).name;
    $('autoNowTempo').textContent=`${state.autoTempo} BPM`;
    player.configure(state.autoPattern,state.autoTempo);
  }
  function renderTransport(){
    const active=player.running;
    $('autoStart').textContent=preparing?'Cancel loading':active?'Stop auto strum':'Start auto strum';
    $('autoStart').setAttribute('aria-pressed',String(active));
    $('autoQuickLabel').textContent=preparing?'Cancel strum':active?'Stop strum':'Auto strum';
    $('autoQuickBtn').classList.toggle('auto-active',active||preparing);
    $('autoQuickBtn').setAttribute('aria-label',preparing?'Cancel auto strum':active?'Stop auto strum':'Open auto strum patterns');
    $('autoNow').hidden=!active;
    $('autoStatus').textContent=preparing?'Loading instrument sound…':active?'Playing. Change chords on the instrument while the pattern repeats.':'Use Latch to keep each chord selected. Damp or Esc stops playback.';
    if(!active){cells.forEach(cell=>cell.classList.remove('current'));$('autoBeat').textContent='1';}
  }
  function stop(){request++;preparing=false;player.stop();renderTransport();}
  async function toggle(){
    if(player.running||preparing){dampAll();return;}
    if(state.muted||audio.settings.volume===0){toast('Turn the sound on and raise the volume before starting auto strum.');return;}
    stopDemo(false);preparing=true;const token=++request;renderTransport();
    try{
      if(!await ensureAudio()||token!==request||document.hidden)return;
      if(state.muted||audio.settings.volume===0)return;
      player.configure(state.autoPattern,state.autoTempo);player.start();
    }catch(error){player.stop();toast(error.message||'Auto strum could not start. Please try again.');}
    finally{if(token===request){preparing=false;renderTransport();}}
  }
  $('autoStart').addEventListener('click',toggle);
  $('autoQuickBtn').addEventListener('click',()=>{if(player.running||preparing){dampAll();returnToInstrument();}else openPanel();});
  $('autoEditBtn').addEventListener('click',openPanel);
  $('autoPattern').addEventListener('change',()=>{
    const restart=player.running;dampAll();state.autoPattern=getStrumPattern($('autoPattern').value).id;renderPattern();saveSettings();
    if(restart){player.start();renderTransport();}
  });
  function setTempo(value){state.autoTempo=clampTempo(value);renderTempo();saveSettings();}
  $('autoTempo').addEventListener('input',()=>setTempo($('autoTempo').value));
  $('autoTempoNumber').addEventListener('input',()=>{const value=Number($('autoTempoNumber').value);if(value>=40&&value<=180)setTempo(value);});
  $('autoTempoNumber').addEventListener('change',()=>setTempo($('autoTempoNumber').value||state.autoTempo));
  $('autoSlower').addEventListener('click',()=>setTempo(state.autoTempo-1));
  $('autoFaster').addEventListener('click',()=>setTempo(state.autoTempo+1));
  renderPattern();renderTransport();
  return {stop,isActive:()=>player.running};
}
