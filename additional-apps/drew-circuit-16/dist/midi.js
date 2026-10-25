// Input only: no MIDI output, system-exclusive messages, or permission request on load.
export class MidiKeyboard {
 constructor({onNote,onState,onDisconnect}={}){this.onNote=onNote;this.onState=onState;this.onDisconnect=onDisconnect;this.access=null;this.input=null;this.selected='';this.held=new Set();}
 async connect(request){
  if(!request)throw Error('MIDI is unavailable here. Open this site in a browser with Web MIDI support.');
  this.access=await request({sysex:false});
  this.access.onstatechange=()=>this.refresh();
  this.refresh();
 }
 devices(){return this.access?[...this.access.inputs.values()].filter(p=>p.state==='connected'):[];}
 refresh(){
  const devices=this.devices();
  if(!this.selected&&devices.length)this.selected=devices[0].id;
  const next=devices.find(d=>d.id===this.selected)||null;
  if(this.input!==next){const hadInput=!!this.input;this.detach();this.input=next;if(next)next.onmidimessage=e=>this.receive(e.data);if(hadInput)this.onDisconnect?.();}
  this.onState?.({devices,selected:this.selected,connected:!!this.input});
 }
 select(id){this.detach();this.selected=id;this.refresh();}
 detach(){if(this.input)this.input.onmidimessage=null;this.input=null;this.held.clear();}
 receive(data){
  if(!data||data.length<3)return;
  const [status,note,velocity]=data,type=status&0xf0,channel=status&15,key=channel+':'+note;
  if(note>127||velocity>127)return;
  if(type===0x80||(type===0x90&&velocity===0)){this.held.delete(key);return;}
  if(type!==0x90||this.held.has(key))return;
  this.held.add(key);this.onNote?.({note,velocity,channel});
 }
 disconnect(){if(this.access)this.access.onstatechange=null;this.detach();this.access=null;this.selected='';this.onDisconnect?.();this.onState?.({devices:[],selected:'',connected:false});}
}
