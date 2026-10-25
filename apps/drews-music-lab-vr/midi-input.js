// Read the actual playable geometry. Never fold octaves, snap pitches or add bars.
export function midiTargets(station,meshes,allowed=()=>true){
 const notes=new Map();
 if(station.type==='drums')return new Map([[36,'kick'],[38,'snare'],[39,'clap'],[42,'hat']].map(([note,type])=>[note,{type,midi:60,instrumentId:'drums'}]));
 const trigger={maracas:70,tambourine:54,cowbell:56,gong:60}[station.type];
 for(const mesh of meshes){const data=mesh.userData;if(data.spec?.id!==station.id)continue;
  if(Number.isInteger(data.midi)&&allowed(data.midi))notes.set(data.midi,{type:station.type,midi:data.midi,instrumentId:station.id,mesh});
  else if(trigger!==undefined)notes.set(trigger,{type:station.type,instrumentId:station.id,mesh});
 }
 return notes;
}

export class MIDIInputController{
 constructor({navigator=globalThis.navigator,targets,play,ready=()=>true,change=()=>{},feedback=()=>{}}){
  Object.assign(this,{navigator,targets,play,ready,change,feedback});this.access=null;this.port=null;this.selectedId='';this.enabled=false;this.pending=false;this.generation=0;this.active=new Map();this.pedals=new Set();this.message='Connect a MIDI keyboard to play the selected instrument.';
 }
 get supported(){return typeof this.navigator?.requestMIDIAccess==='function';}
 get inputs(){return this.access?[...this.access.inputs.values()].filter(p=>p.state!=='disconnected'):[];}
 async connect(){
  if(this.pending)return false;
  if(!this.supported){this.message='MIDI input is unavailable in this browser. Open the site in a browser with Web MIDI support.';this.change();return false;}
  this.releaseAll();const generation=++this.generation;this.pending=true;this.message='Allow MIDI access in your browser…';this.change();
  try{
   const access=await this.navigator.requestMIDIAccess({sysex:false});if(generation!==this.generation)return false;
   this.access=access;this.enabled=true;this.pending=false;access.onstatechange=()=>this.sync();this.sync();return true;
  }catch(error){if(generation!==this.generation)return false;this.enabled=false;this.pending=false;this.message=error?.name==='NotAllowedError'||error?.name==='SecurityError'?'MIDI access was blocked. Check this site’s browser permissions, then try Connect again.':'Could not connect MIDI. Check your device and try again.';this.change();return false;}
 }
 sync(){
  const inputs=this.inputs;if(!this.selectedId&&inputs.length===1)this.selectedId=inputs[0].id;
  const next=this.enabled?inputs.find(p=>p.id===this.selectedId):null;
  if(next!==this.port){this.detach();if(next){this.port=next;next.onmidimessage=event=>{if(this.port===next)this.receive(event.data);};}}
  if(this.enabled)this.message=this.port?'Connected · '+(this.port.name||'MIDI input'):!inputs.length?'No MIDI input found. Connect your keyboard; it will appear here.':this.selectedId?'Selected input disconnected. Reconnect it or choose another input.':'Choose a MIDI input below.';
  this.change();
 }
 select(id){this.releaseAll();this.selectedId=String(id);this.sync();}
 detach(){this.releaseAll();if(this.port){const old=this.port;this.port=null;old.onmidimessage=null;try{Promise.resolve(old.close?.()).catch(()=>{});}catch{}}}
 disconnect(){this.generation++;this.pending=false;this.enabled=false;if(this.access)this.access.onstatechange=null;this.detach();this.message='MIDI input is off.';this.change();}
 release(key){const voice=this.active.get(key);if(!voice)return;this.active.delete(key);voice.release?.();}
 releaseAll(channel){for(const [key,voice]of this.active)if(channel===undefined||voice.channel===channel)this.release(key);if(channel===undefined)this.pedals.clear();else this.pedals.delete(channel);}
 releasePedal(channel){this.pedals.delete(channel);for(const [key,voice]of this.active)if(voice.channel===channel&&voice.keyUp)this.release(key);}
 receive(data){
  if(!this.enabled||!data||data.length!==3)return;
  const [status,note,value]=data;if(!Number.isInteger(status)||status<128||status>=240||!Number.isInteger(note)||note<0||note>127||!Number.isInteger(value)||value<0||value>127)return;
  const kind=status&240,channel=status&15,key=channel+':'+note;
  if(kind===128||(kind===144&&value===0)){const voice=this.active.get(key);if(voice?.sustain&&this.pedals.has(channel))voice.keyUp=true;else this.release(key);return;}
  if(kind===176){if(note===64){if(value>=64)this.pedals.add(channel);else this.releasePedal(channel);}else if(note===120||note===123)this.releaseAll(channel);else if(note===121)this.releasePedal(channel);return;}
  if(kind!==144)return;
  this.release(key);if(!this.ready()){this.feedback('MIDI paused · enable sound and close other menus to play.');return;}
  const target=this.targets().get(note);if(!target){this.feedback('Ignored MIDI note '+note+' · not present on this instrument.');return;}
  const release=this.play(target,value/127,'midi:'+key);
  if(typeof release==='function')this.active.set(key,{channel,release,sustain:target.type==='synth',keyUp:false});
  this.feedback('Played MIDI note '+note+' · '+Math.round(value/127*100)+'% strength');
 }
}
