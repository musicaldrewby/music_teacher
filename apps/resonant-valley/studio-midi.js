// The keyboard plays the selected studio track, regardless of its transmit channel.
export class StudioMidi {
 constructor(studio){
  this.studio=studio;
  this.button=document.getElementById('midi-connect');
  this.field=document.getElementById('midi-port');
  this.select=document.getElementById('midi-input');
  this.status=document.getElementById('midi-status');
  this.notes=new Map(); // Channel + pitch, with false marking a pedal-held note.
  this.pedal=new Set();
  this.access=null;this.port=null;this.preferred=null;
  this.button.onclick=()=>this.access?this.disconnect():this.connect();
  this.select.onchange=()=>{
   if(!this.select.value){this.disconnect();return;}
   this.preferred=this.select.value;this.refresh();
  };
 }
 async connect(){
  if(this.button.disabled)return;
  if(!navigator.requestMIDIAccess){
   this.status.textContent=globalThis.isSecureContext===false?'Open the HTTPS game link to connect MIDI.':'Web MIDI is unavailable in this browser. You can still play the on-screen keys.';
   return;
  }
  this.button.disabled=true;this.status.textContent='Connecting your MIDI keyboard…';
  try{
   // Unlock audio in the button gesture so the very first hardware note can sound.
   const [access]=await Promise.all([navigator.requestMIDIAccess({sysex:false}),this.studio.audio.init()]);
   this.access=access;
   access.onstatechange=e=>{if(e.port.type==='input')this.refresh();};
   await this.refresh();
  }catch(error){
   this.status.textContent=['SecurityError','NotAllowedError'].includes(error.name)
    ?'MIDI access is blocked. Open the game in its own tab, allow MIDI, and try again.'
    :error.message||'Could not connect. Reconnect the keyboard and try again.';
  }finally{this.button.disabled=false;}
 }
 async refresh(){
  if(!this.access)return;
  const inputs=[...this.access.inputs.values()].filter(p=>p.state==='connected');
  this.preferred??=inputs[0]?.id??null;
  const port=inputs.find(p=>p.id===this.preferred)??null;
  this.select.replaceChildren(new Option('MIDI off',''));
  for(const p of inputs)this.select.add(new Option(p.name||'MIDI keyboard',p.id));
  if(this.preferred&&!port){
   const missing=new Option('Keyboard disconnected',this.preferred);missing.disabled=true;this.select.add(missing);
  }
  this.select.value=this.preferred??'';this.select.title=port?.name||'Choose a MIDI input';
  this.field.classList.toggle('hidden',!this.preferred);this.button.classList.toggle('hidden',!!this.preferred);
  this.button.textContent='MIDI waiting';this.button.title='Stop waiting for a MIDI keyboard';
  if(port!==this.port){
   const previous=this.port;this.port=port;this.detach(previous);
   if(port){
    this.status.textContent='Opening '+(port.name||'MIDI keyboard')+'…';
    try{
     await port.open();
     if(this.port!==port)return;
     port.onmidimessage=e=>{if(this.port===port)this.message(e);};
     this.field.classList.add('connected');
     this.describeReady();
    }catch{
     if(this.port===port)this.status.textContent='Could not open this MIDI input. Reconnect it or choose another.';
    }
   }
  }
  if(!port)this.status.textContent=this.preferred?'MIDI keyboard disconnected. Reconnect it or select another input.':'Plug in a MIDI keyboard. The studio will connect when it appears.';
 }
 describeReady(){
  if(!this.port?.onmidimessage)return;
  const name=this.port.name||'MIDI keyboard';
  this.status.textContent=this.studio.allowedTrack()?name+' ready. Press Record, then play.':
   name+(this.studio.hasFinds()?' connected. Select a discovered instrument to record.':' connected. Find your first instrument to record.');
 }
 detach(port){
  this.clear();this.field.classList.remove('connected');
  if(port){port.onmidimessage=null;port.close().catch(()=>{});}
 }
 disconnect(){
  if(this.access)this.access.onstatechange=null;
  const previous=this.port;this.port=null;
  this.access=null;this.preferred=null;this.detach(previous);
  this.field.classList.add('hidden');this.button.classList.remove('hidden');
  this.button.textContent='Connect MIDI';this.button.title='Connect a MIDI keyboard';this.status.textContent='MIDI input is off.';
 }
 end(id,time){
  this.notes.delete(id);this.studio.noteOff('midi-'+id,time);
 }
 clear(channel,time){
  for(const id of this.notes.keys())if(channel===undefined||(id>>7)===channel)this.end(id,time);
  if(channel===undefined)this.pedal.clear();else this.pedal.delete(channel);
  this.field.classList.toggle('receiving',this.notes.size>0);
 }
 message(event){
  if(!this.studio.visible||document.hidden)return;
  const [status,pitch,value]=event.data,type=status&240,channel=status&15,id=(channel<<7)+pitch;
  if(value===undefined||![128,144,176].includes(type))return;
  const ctx=this.studio.audio.ctx,stamp=event.timeStamp;
  let time=ctx.currentTime;
  if(stamp>0){
   const out=ctx.getOutputTimestamp?.();
   const mapped=out?.performanceTime>0?out.contextTime+(stamp-out.performanceTime)/1000:time+(stamp-performance.now())/1000;
   time=Math.max(0,Math.min(time,mapped));
  }
  if(type===176){
   if(pitch===120||pitch===123){this.clear(channel,time);return;}
   if(pitch!==64&&pitch!==121)return;
   if(pitch===64&&value>=64){this.pedal.add(channel);return;}
   this.pedal.delete(channel);
   for(const [key,down] of this.notes)if((key>>7)===channel&&!down)this.end(key,time);
  }else if(type===144&&value>0){
   if(!this.studio.allowedTrack()||!this.studio.canPlayPitch(this.studio.track(),pitch))return;
   if(this.notes.has(id))this.end(id,time);
   this.notes.set(id,true);this.studio.noteOn(pitch,value/127,'midi-'+id,time);
  }else if(this.notes.has(id)){
   if(this.pedal.has(channel)&&this.studio.track().instrument!=='drums')this.notes.set(id,false);
   else this.end(id,time);
  }
  this.field.classList.toggle('receiving',this.notes.size>0);
 }
}
