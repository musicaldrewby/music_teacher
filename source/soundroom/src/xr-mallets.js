// Strike detection is swept, so a fast tip cannot tunnel through a thin bar.
// The shared audio host assigns recording time when the strike becomes audible.
// Window timer methods must keep their browser global as the receiver.
// Copying them onto a plain object throws "Illegal invocation" on a strike.
export function createMalletInput(host,timers=globalThis){
 const hands=new Map(),voices=new Map();let serial=0;
 function off(owner){const voice=voices.get(owner);if(!voice)return;if(voice.timer!==null)timers.clearTimeout(voice.timer);host.noteOff(owner);voices.delete(owner);if(voice.hand.owner===owner)voice.hand.owner=null}
 function release(source){const hand=hands.get(source);if(hand)for(const [owner,v]of voices)if(v.hand===hand)off(owner);hands.delete(source)}
 return {
  update(source,tip,time,bars,{gate=180,sensitivity=1,enabled=true,playingMode='strike',velocity=96}={}){
   if(!tip||!enabled||!bars.length){release(source);return null}
   const hold=playingMode==='hold',surface=Math.max(...bars.map(b=>b.y+b.h/2))+.022;
   let hand=hands.get(source);if(hand&&hand.hold!==hold){release(source);hand=null}
   if(!hand){hand={tip,time,hold,owner:null,armed:tip[1]>surface+.035,last:-Infinity};hands.set(source,hand);return null}
   const previous=hand.tip,dt=(time-hand.time)/1000;hand.tip=tip;hand.time=time;
   // A frame/tracking discontinuity must never leave a contact note latched.
   if(dt>.12||dt<0){if(hand.owner)off(hand.owner);hand.armed=tip[1]>surface+.035;return null}
   if(hold&&hand.owner){
    const bar=bars.find(b=>b.note===voices.get(hand.owner)?.note);
    // Spatial hysteresis tolerates tremor without delaying the recorded release.
    if(bar&&Math.abs(tip[0]-bar.x)<=bar.w/2+.014&&Math.abs(tip[2]-bar.z)<=bar.d/2+.014&&tip[1]<=surface+.018&&tip[1]>=bar.y-bar.h/2-.10)return null;
    off(hand.owner);
   }
   if(tip[1]>surface+.035)hand.armed=true;
   if(dt<=0||!hand.armed||time-hand.last<55||previous[1]<=surface||tip[1]>surface)return null;
   const speed=(previous[1]-tip[1])/dt;if(!hold&&speed<.08)return null;
   const fraction=(previous[1]-surface)/(previous[1]-tip[1]),x=previous[0]+(tip[0]-previous[0])*fraction,z=previous[2]+(tip[2]-previous[2])*fraction;
   const bar=bars.find(b=>Math.abs(x-b.x)<=b.w/2+.004&&Math.abs(z-b.z)<=b.d/2+.004);if(!bar)return null;
   // A roll is repeated attacks on one bar, not several owners holding one key.
   if(!hold)for(const [owner,voice]of voices)if(voice.note===bar.note)off(owner);
   hand.armed=false;hand.last=time;velocity=Math.max(1,Math.min(127,Math.round(hold?velocity:30+Math.sqrt(speed)*42*sensitivity)));const owner='xr-mallet:'+ ++serial;
   host.noteOn(bar.note,owner,velocity);voices.set(owner,{hand,note:bar.note,timer:hold?null:timers.setTimeout(()=>off(owner),Math.max(80,Math.min(2000,gate)))});if(hold)hand.owner=owner;
   try{source.gamepad?.hapticActuators?.[0]?.pulse(Math.min(.65,velocity/180),18)?.catch(()=>{})}catch{}
   return {note:bar.note,velocity};
  },
  remove:release,
  reset(){for(const owner of [...voices.keys()])off(owner);hands.clear()},
  get notes(){return new Set([...voices.values()].map(v=>v.note))}
 };
}
