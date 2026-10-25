const POSITION_KEY='drews-instrument-reach-v1';
const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number.isFinite(value)?value:0));

// Small, device-local adjustments in each instrument's own facing direction.
export class InstrumentPlacement{
 constructor(storage){this.storage=storage;this.values={};try{const saved=JSON.parse(storage?.getItem(POSITION_KEY)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))this.values=saved;}catch{}}
 get(id){const value=Object.hasOwn(this.values,id)?this.values[id]:null;return {height:clamp(value?.height,-.25,.25),reach:clamp(value?.reach,-.20,.25)};}
 change(id,axis,delta){const value=this.get(id);if(axis==='reset'){value.height=0;value.reach=0;}else if(['height','reach'].includes(axis)&&Number.isFinite(delta))value[axis]+=delta;this.values[id]=value;this.values[id]=this.get(id);try{this.storage?.setItem(POSITION_KEY,JSON.stringify(this.values));return true;}catch{return false;}}
 apply(station){if(!station.group||['notewall','gallery'].includes(station.type))return;const {height,reach}=this.get(station.id),angle=station.rot||0;station.group.position.set(station.x+Math.sin(angle)*reach,height,station.z+Math.cos(angle)*reach);station.group.updateMatrixWorld(true);}
}

// Fixed memory; sample once per render, calculate statistics only on request.
export class FrameMonitor{
 constructor(){this.samples=new Float32Array(900);this.reset();}
 reset(){this.count=0;this.index=0;this.last=null;this.mode=null;}
 sample(time,mode){if(this.mode!==mode){this.reset();this.mode=mode;}const elapsed=this.last===null?0:time-this.last;this.last=time;if(elapsed<=0)return;this.samples[this.index]=elapsed;this.index=(this.index+1)%this.samples.length;this.count=Math.min(this.count+1,this.samples.length);}
 report(){if(this.count<30)return null;const values=Array.from(this.samples.subarray(0,this.count)).sort((a,b)=>a-b),average=values.reduce((a,b)=>a+b,0)/values.length;return {fps:1000/average,p95:values[Math.ceil(values.length*.95)-1],seconds:average*values.length/1000,mode:this.mode};}
}

// Feedback goes straight to the master bus, never through recorded note input.
export function recordingCue(audio,recording){
 const c=audio.ctx;if(!c||c.state!=='running')return;
 const oscillator=c.createOscillator(),gain=c.createGain(),now=c.currentTime;
 oscillator.type='sine';oscillator.frequency.setValueAtTime(recording?880:660,now);oscillator.frequency.setValueAtTime(recording?1100:440,now+.055);
 gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.12,now+.005);gain.gain.setValueAtTime(.12,now+.08);gain.gain.linearRampToValueAtTime(0,now+.12);
 oscillator.connect(gain);gain.connect(audio.master);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};oscillator.start(now);oscillator.stop(now+.13);
}
