import {notesFor} from './catalog.js';

export const MIDI_TOUCH_DEFAULTS=Object.freeze({curve:'normal',min:1,max:127,fixed:96,tone:.5});
export function normalizeMidiTouch(value){
 const p=value&&typeof value==='object'?value:{};
 const limit=(v,fallback,low,high)=>Math.max(low,Math.min(high,Number.isFinite(v)?v:fallback));
 const min=Math.round(limit(p.min,1,1,127)),max=Math.max(min,Math.round(limit(p.max,127,1,127)));
 return {curve:['light','normal','firm','fixed'].includes(p.curve)?p.curve:'normal',min,max,
  fixed:Math.round(limit(p.fixed,96,min,max)),tone:limit(p.tone,.5,0,1)};
}
export function midiTouchVelocity(raw,prefs=MIDI_TOUCH_DEFAULTS){
 if(!Number.isFinite(raw)||raw<=0)return 0;
 const p=normalizeMidiTouch(prefs),v=Math.max(1/127,Math.min(1,raw));
 if(p.curve==='fixed')return p.fixed/127;
 if(p.curve==='normal'&&p.min===1&&p.max===127)return v;
 const exponent={light:.65,normal:1,firm:1.5}[p.curve];
 return (p.min+(p.max-p.min)*((v*127-1)/126)**exponent)/127;
}

const whiteKeys=[0,2,4,5,7,9,11,12,14,16,17,19,21];
export function midiKeyMap(inst,{home=60,auto=true,notes=notesFor(inst)}={}){
 const shift=auto?Math.floor(inst.base/12)*12-home:0;
 return notes.map((n,index)=>({...n,input:inst.pads?home+whiteKeys[index]:n.note-shift})).filter(n=>n.input>=0&&n.input<=127);
}
export function mapMidiNote(inst,note,options){
 return midiKeyMap(inst,options).find(n=>n.input===note&&n.enabled)||null;
}
export function decodeMidi(data){
 if(!data||data.length<3)return null;
 const [status,note,value]=data,kind=status&0xf0,channel=status&15;
 if(status<0x80||status>=0xf0||note>127||value>127)return null;
 if(kind===0x90&&value>0)return {type:'on',channel,note,velocity:value/127};
 if(kind===0x80||kind===0x90&&value===0)return {type:'off',channel,note};
 if(kind===0xb0)return {type:'control',channel,controller:note,value};
 return null;
}
export function midiAudioTime(context,timeStamp,now=performance.now()){
 if(!context)return 0;
 // DOM event timestamps and performance.now share the same monotonic clock.
 const offset=Number.isFinite(timeStamp)?Math.max(-.25,Math.min(0,(timeStamp-now)/1000)):0;
 return Math.max(0,context.currentTime+offset);
}
export function midiError(error){
 if(['NotAllowedError','SecurityError'].includes(error?.name))return 'MIDI access was blocked. Allow MIDI in your browser’s site settings, or open the studio in its own browser tab.';
 return 'The MIDI device could not open. Check its connection and close other apps that may be using it, then try again.';
}

export class MidiInput {
 constructor({navigator=globalThis.navigator,onMessage=()=>{},onReset=()=>{},onChange=()=>{}}={}){
  this.navigator=navigator;this.onMessage=onMessage;this.onReset=onReset;this.onChange=onChange;
  this.access=null;this.enabled=false;this.status='off';this.error='';this.inputId='all';this.channel=null;
  this.bindings=new Map();this.revision=0;this.request=0;
  this.statechange=()=>{this.refresh();};
 }
 inputs(){return this.access?[...this.access.inputs.values()].filter(p=>p.state==='connected'):[];}
 notify(){this.onChange();}
 async enable(){
  if(this.status==='connecting')return;
  if(typeof this.navigator?.requestMIDIAccess!=='function'){
   this.status='unsupported';this.error='MIDI input is unavailable in this browser. Open the studio in a browser with Web MIDI support, such as desktop Chrome or Edge.';this.notify();return;
  }
  const request=++this.request;this.status='connecting';this.error='';this.notify();
  try{
   const access=await this.navigator.requestMIDIAccess({sysex:false});
   if(request!==this.request)return;
   this.access?.removeEventListener('statechange',this.statechange);
   this.access=access;this.enabled=true;access.addEventListener('statechange',this.statechange);
   await this.refresh();
  }catch(error){if(request!==this.request)return;this.enabled=false;this.status='error';this.error=midiError(error);this.notify();}
 }
 detach(id,binding){
  binding.port.removeEventListener('midimessage',binding.listener);this.bindings.delete(id);
  this.onReset({inputId:id});
  try{Promise.resolve(binding.port.close()).catch(()=>{});}catch{}
 }
 async refresh(){
  if(!this.enabled)return;
  const revision=++this.revision;
  const wanted=this.inputs().filter(p=>this.inputId==='all'||p.id===this.inputId);
  for(const [id,b] of this.bindings)if(!wanted.some(p=>p.id===id&&p===b.port))this.detach(id,b);
  for(const port of wanted){
   if(this.bindings.has(port.id))continue;
   const binding={port,error:null,opening:null,listener:event=>{
    if(!this.enabled||port.state!=='connected'||this.inputId!=='all'&&this.inputId!==port.id)return;
    const message=decodeMidi(event.data);
    if(!message||this.channel!==null&&message.channel!==this.channel)return;
    this.onMessage({...message,inputId:port.id,key:JSON.stringify([port.id,message.channel,message.note]),timeStamp:event.timeStamp});
   }};
   this.bindings.set(port.id,binding);port.addEventListener('midimessage',binding.listener);
   binding.opening=Promise.resolve().then(()=>port.open()).catch(error=>{binding.error=error;});
  }
  await Promise.all([...this.bindings.values()].map(b=>b.opening));
  if(revision!==this.revision||!this.enabled)return;
  const bindings=[...this.bindings.values()];
  this.status=!bindings.length?'waiting':bindings.every(b=>b.error)?'error':'ready';
  this.error=bindings.some(b=>b.error)?'A MIDI input could not open. Close any app using it, then reconnect MIDI.':'';
  this.notify();
 }
 selectInput(id){this.onReset({});this.inputId=id;return this.refresh();}
 selectChannel(channel){this.onReset({});this.channel=channel;this.notify();}
 disable(){
  this.enabled=false;this.request++;this.revision++;this.access?.removeEventListener('statechange',this.statechange);
  for(const [id,binding] of this.bindings)this.detach(id,binding);
  this.onReset({});this.status='off';this.error='';this.notify();
 }
}
