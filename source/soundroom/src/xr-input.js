// One owner per controller, including when both hands play the same MIDI pitch.
export function createXRInput(host){
 const sources=new Map();let serial=0;
 function get(source){if(!sources.has(source))sources.set(source,{owner:'xr:'+ ++serial,pressed:false,note:null,hit:null});return sources.get(source)}
 function release(s){if(s.note!==null){host.noteOff(s.owner);s.note=null}}
 function play(s,note){if(s.note===note)return;release(s);if(note!==null){s.note=note;host.noteOn(note,s.owner)}}
 return {
  update(source,hit){const s=get(source);s.hit=hit;if(s.pressed)play(s,Number.isInteger(hit?.note)?hit.note:null)},
  press(source,hit){const s=get(source);if(s.pressed)return;s.hit=hit;
   if(Number.isInteger(hit?.note)){s.pressed=true;play(s,hit.note)}else if(hit?.action){host.action(hit.action);try{source.gamepad?.hapticActuators?.[0]?.pulse(.12,25)?.catch(()=>{})}catch{}}
  },
  lift(source){const s=sources.get(source);if(s){s.pressed=false;s.hit=null;release(s)}},
  remove(source){const s=sources.get(source);if(s)release(s);sources.delete(source)},
  reset(){for(const s of sources.values()){s.pressed=false;release(s);s.hit=null}},
  clear(){this.reset();sources.clear()},
  get notes(){return new Set([...sources.values()].filter(s=>s.note!==null).map(s=>s.note))},
  get hovered(){return new Set([...sources.values()].map(s=>s.hit?.id).filter(Boolean))}
 };
}
