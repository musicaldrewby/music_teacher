import {AmbientReverb} from './ambient.js';
import {SpessaSynthProcessor,SoundBankLoader} from './assets/synth.js';
import {interval,notesFor} from './rhythm.js';
import {performanceEvent,grooveBeat,grooveVelocity} from './generative.js';
import {noteVelocity} from './dynamics.js';
export class OrbitCore{
 constructor(rate,port={postMessage(){}}){this.initialize(rate,port)}
 initialize(rate,port){this.rate=rate;if(!this.port)this.port=port;this.random=Math.random;this.ambient=new AmbientReverb(this.rate);this.ready=false;this.running=false;this.beat=0;this.counter=0;this.motionCache=[];this.visualHits=[];this.next=[];this.offs=[];this.noteIds=new Map();this.serial=0;this.frame=0;this.pending=null;this.port.onmessage=e=>this.message(e.data);}
 async message(m){try{
  if(m.type==='init'){this.synth=new SpessaSynthProcessor(this.rate,{maxBufferSize:128});await this.synth.processorInitialized;this.synth.soundBankManager.addSoundBank(SoundBankLoader.fromArrayBuffer(m.font),'generaluser');this.synth.setSystemParameter('voiceCap',192);this.synth.setSystemParameter('autoAllocateVoices',false);this.synth.setSystemParameter('eventsEnabled',false);this.ready=true;this.apply(m.state,true);this.port.postMessage({type:'ready'});}
  else if(!this.ready)return;
  else if(m.type==='ambient'){this.ambient.set(m.settings);this.state.ambient=m.settings;}
  else if(m.type==='clearAmbient'){this.ambient.clear();}
  else if(m.type==='state'){this.apply(m.state,false);}
  else if(m.type==='play'){this.synth.stopAllChannels(true);this.offs=[];this.noteIds.clear();this.beat=0;this.next=this.state.tracks.map(()=>0);this.running=true;this.visualHits=[];this.updateMotion();}
  else if(m.type==='stop'){this.running=false;this.visualHits=[];this.pending=null;this.beat=0;this.synth.stopAllChannels(true);this.offs=[];this.noteIds.clear();this.port.postMessage({type:'position',beat:0,running:false});}
  else if(m.type==='scene'){this.pending={state:m.state,id:m.id,beat:(Math.floor(this.beat/(this.state.bars*4))+1)*this.state.bars*4};if(!this.running){this.apply(m.state,true);this.pending=null;this.port.postMessage({type:'scene',id:m.id});}}
  else if(m.type==='preview'){const ch=8;this.patch(ch,m.track);this.playNotes(ch,notesFor(m.track,this.state,0),95,.6);}
 }catch(e){this.port.postMessage({type:'error',message:e.message})}}
 patch(i,t){this.motionCache[i]=null;this.synth.controllerChange(i,11,127);this.synth.controllerChange(i,74,64);this.synth.midiChannels[i].setDrums(t.bank===128);this.synth.controllerChange(i,0,t.bank===128?0:t.bank);this.synth.controllerChange(i,32,0);this.synth.programChange(i,t.program);this.synth.controllerChange(i,7,Math.round(t.volume*1.27));this.synth.controllerChange(i,10,Math.round(t.pan));this.synth.controllerChange(i,91,Math.round(t.reverb*1.27));this.synth.controllerChange(i,93,0);this.synth.controllerChange(i,94,Math.round(t.delay*1.27));}
 apply(s,reset){let prev=this.state;this.state=s;this.ambient.set(s.ambient);if(!prev||prev.bpm!==s.bpm){const ms=30000/s.bpm,fx=this.synth.delayProcessor;fx.timeCenter=ms<200?80+(ms-100)/10:ms<500?90+(ms-200)/20:105+(ms-500)/50;fx.timeRatioLeft=12;fx.timeRatioRight=24;fx.level=70;fx.levelCenter=85;fx.levelLeft=60;fx.levelRight=60;fx.feedback=86;fx.preLowpass=3;}s.tracks.forEach((t,i)=>{this.patch(i,t);if(t.mute||(s.tracks.some(x=>x.solo)&&!t.solo))this.synth.midiChannels[i].stopAllNotes(true);const d=interval(t,s);if(reset||!prev)this.next[i]=0;else if(d!==interval(prev.tracks[i],prev)||t.steps!==prev.tracks[i].steps)this.next[i]=(Math.floor(this.beat/d+1e-8)+1)*d;});this.updateMotion();}
 updateMotion(){if(!this.state)return;this.state.tracks.forEach((t,i)=>{const amount=(t.motion||0)/100,phase=2*Math.PI*this.beat/(t.motionRate||16)+i*.83;const values=[Math.max(0,Math.min(127,Math.round(t.pan+Math.sin(phase+1.4)*26*amount))),Math.round(127-amount*(10+28*(.5+.5*Math.sin(phase*.73+2.1)))),Math.round(64-amount*(15+22*Math.sin(phase*.91)))];const cc=[10,11,74];values.forEach((v,j)=>{if(this.motionCache[i]?.[j]!==v)this.synth.controllerChange(i,cc[j],v)});this.motionCache[i]=values;});}
 playNotes(ch,notes,vel,seconds){for(const n of notes){const key=ch+':'+n,id=++this.serial;this.synth.noteOff(ch,n);this.synth.noteOn(ch,n,vel);this.noteIds.set(key,id);this.offs.push({frame:this.frame+Math.max(1,Math.round(seconds*this.rate)),ch,n,key,id});}}
 process(inputs,outputs){const out=outputs[0];if(!out||!this.ready)return true;const l=out[0],r=out[1]||out[0],len=l.length;if(this.counter%8===0)this.updateMotion();let pos=0;
 while(pos<len){
  if(this.running&&this.pending&&this.beat+1e-8>=this.pending.beat){const p=this.pending;this.pending=null;this.synth.stopAllChannels(true);this.offs=[];this.noteIds.clear();this.apply(p.state,true);this.beat=0;this.visualHits=[];this.port.postMessage({type:'scene',id:p.id});}
  for(let j=this.offs.length-1;j>=0;j--){let o=this.offs[j];if(o.frame<=this.frame){if(this.noteIds.get(o.key)===o.id){this.synth.noteOff(o.ch,o.n);this.noteIds.delete(o.key)}this.offs.splice(j,1)}}
  let advance=len-pos;
  if(this.running){const solo=this.state.tracks.some(t=>t.solo);this.state.tracks.forEach((t,i)=>{const d=interval(t,this.state),count=Math.round(this.next[i]/d),due=grooveBeat(t,this.state,count,i,this.next[i]);if(this.beat+1e-8>=due){const step=count%t.steps,event=performanceEvent(t,this.state,count,i,this.next[i]),hit=event.hit;if(hit&&!t.mute&&(!solo||t.solo)&&this.random()*100<t.probability){const velocity=grooveVelocity(Math.max(1,Math.min(127,Math.round(noteVelocity(t,hit,this.next[i],i)*event.velocityScale))),this.state,count,i);this.playNotes(i,event.notes,velocity,d*60/this.state.bpm*event.gate/100);this.visualHits.push({track:i,step,accent:hit===2,velocity,frame:this.frame});}this.next[i]+=d;}const nextDue=grooveBeat(t,this.state,Math.round(this.next[i]/d),i,this.next[i]);advance=Math.min(advance,Math.max(1,Math.ceil((nextDue-this.beat)*60/this.state.bpm*this.rate-1e-7)));});if(this.pending)advance=Math.min(advance,Math.max(1,Math.ceil((this.pending.beat-this.beat)*60/this.state.bpm*this.rate)));}
  for(const o of this.offs)advance=Math.min(advance,Math.max(1,o.frame-this.frame));
  this.synth.process(l,r,pos,advance);this.ambient.process(l,r,pos,advance);pos+=advance;this.frame+=advance;if(this.running)this.beat+=advance/this.rate*this.state.bpm/60;
 }
 if(++this.counter%16===0){this.port.postMessage({type:'position',beat:this.beat,running:this.running,voices:this.synth.voiceCount,hits:this.visualHits});this.visualHits=[];}return true;
 }
}

