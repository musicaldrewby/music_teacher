import {OrbitCore} from './orbit-core.js';
import {normalizeShow,cueLayout,showDuration,compileCue,sampleLane,valueAt,putValue,seededRandom,ease} from './show-score.js';
// Scores contain only validated JSON data; this also works in restricted worklet globals.
const clone=x=>JSON.parse(JSON.stringify(x));
export class ShowEngine {
 constructor(rate=48000){this.rate=rate;this.frame=0;this.decks=[];this.level=0;this.done=false;this.limitedSamples=0;this.peak=0;this.rawPeak=0;this.cueIndex=-1;this.errors=[];this.channels=[new Float32Array(128),new Float32Array(128)];this.hits=Array.from({length:2},()=>Array(8).fill(null));}
 async init(font,score){this.score=normalizeShow(score);this.layout=cueLayout(this.score);this.compiled=this.layout.map(compileCue);this.totalFrames=Math.round(showDuration(this.score)*this.rate);this.musicFrames=Math.round((showDuration(this.score)-this.score.tailSeconds)*this.rate);
  for(let d=0;d<2;d++){
   const deck={index:-1,gain:0,offset:0,last:new Map(),controlTick:-1};
   deck.core=new OrbitCore(this.rate,{postMessage:m=>{if(m.type==='error')this.errors.push(m.message);if(m.hits)for(const hit of m.hits)this.rememberHit(d,hit,deck.offset)}});
   await deck.core.message({type:'init',font:font.slice(0),state:clone(this.score.cues[0].state)});if(!deck.core.ready||this.errors.length)throw Error(this.errors.join('; ')||'SoundFont initialization failed.');this.decks.push(deck);
  }
  this.startCue(0);return this;
 }
 startCue(index){const d=index%2,deck=this.decks[d],core=deck.core,cue=this.layout[index];
  core.synth.stopAllChannels(true);core.synth.reset();core.ambient.clear();core.motionCache=[];core.offs=[];core.noteIds.clear();core.visualHits=[];core.pending=null;core.beat=0;core.next=Array(8).fill(0);core.random=seededRandom(this.score.seed+index*7919);core.apply(clone(cue.state),true);core.running=true;
  deck.index=index;deck.last.clear();deck.visual=clone(cue.visual);deck.motionTime=cue.start*cue.visual.speed;deck.controlTick=-1;this.hits[d].fill(null);this.cueIndex=index;
 }
 rememberHit(d,hit,offset){const event={...hit,time:(hit.frame+offset)/this.rate*1000},old=this.hits[d][hit.track];this.hits[d][hit.track]={...event,history:[...(old?.history||[]).slice(-7),event]};}
 automate(deck,time){const compiled=this.compiled[deck.index],core=deck.core;for(const [path,list] of compiled.lanes){const initial=valueAt(compiled.base,path),value=sampleLane(list,time,initial),old=deck.last.get(path);if(value===old)continue;deck.last.set(path,value);
   if(path.startsWith('visual.')){deck.visual[path.slice(7)]=value;continue}
   putValue(core.state,path,value);
   if(path==='bpm'){const ms=30000/value,fx=core.synth.delayProcessor;fx.timeCenter=ms<200?80+(ms-100)/10:ms<500?90+(ms-200)/20:105+(ms-500)/50;}

   const m=/^tracks\.(\d)\.(\w+)$/.exec(path);if(m){const i=+m[1],cc={volume:7,reverb:91,delay:94}[m[2]];if(cc)core.synth.controllerChange(i,cc,Math.round(value*1.27));if(m[2]==='mute'&&value)core.synth.midiChannels[i].stopAllNotes(false);if(m[2]==='solo'){const solo=core.state.tracks.some(t=>t.solo);core.state.tracks.forEach((t,j)=>{if(t.mute||(solo&&!t.solo))core.synth.midiChannels[j].stopAllNotes(false)})}}
  }
  core.ambient.set(core.state.ambient);
 }
 process(left,right){left.fill(0);right.fill(0);if(this.done)return;let offset=0;while(offset<left.length){
  const time=this.frame/this.rate;
  if(this.cueIndex+1<this.layout.length&&this.frame>=Math.round(this.layout[this.cueIndex+1].start*this.rate))this.startCue(this.cueIndex+1);
  if(this.frame>=this.totalFrames){this.done=true;break}
  let n=Math.min(128,left.length-offset,this.totalFrames-this.frame);
  const next=this.layout[this.cueIndex+1];if(next)n=Math.min(n,Math.max(1,Math.round(next.start*this.rate)-this.frame));
  if(this.frame<this.musicFrames)n=Math.min(n,this.musicFrames-this.frame);
  let energy=0;
  for(let d=0;d<2;d++){
   const deck=this.decks[d];if(deck.index<0)continue;const core=deck.core,cue=this.layout[deck.index],current=deck.index===this.cueIndex,following=this.layout[deck.index+1];
   if(!current&&time>=following.start+following.transition){deck.gain=0;core.running=false;continue}
   const local=time-cue.start,tick=Math.floor(this.frame/(this.rate/100));if(tick!==deck.controlTick){deck.controlTick=tick;this.automate(deck,Math.min(cue.duration,local))}
   if(this.frame>=this.musicFrames&&core.running){core.running=false;core.synth.stopAllChannels(false);core.offs=[];core.noteIds.clear()}
   const l=this.channels[0].subarray(0,n),r=this.channels[1].subarray(0,n);l.fill(0);r.fill(0);deck.offset=this.frame-core.frame;core.process([],[[l,r]]);
   // Drain unsent strikes every audio slice so offline frames never wait for UI telemetry.
   for(const hit of core.visualHits)this.rememberHit(d,hit,deck.offset);
   core.visualHits=[];
   // Integrate speed: changing it alters velocity without teleporting the scene.
   deck.motionTime+=n/this.rate*deck.visual.speed;
   for(let j=0;j<n;j++){
    const t=(this.frame+j)/this.rate,transition=current?cue.transition:following.transition,start=current?cue.start:following.start;
    const x=transition?ease((t-start)/transition):1,blend=current?(deck.index===0?1:Math.sin(x*Math.PI/2)):Math.cos(x*Math.PI/2);
    const gain=blend*core.state.master/100*.75;left[offset+j]+=l[j]*gain;right[offset+j]+=r[j]*gain;deck.gain=blend;
   }
  }
  for(let j=0;j<n;j++){
   const t=(this.frame+j)/this.rate,total=this.totalFrames/this.rate,fade=(this.score.fadeIn?ease(t/this.score.fadeIn):1)*(this.score.fadeOut?ease((total-t)/this.score.fadeOut):1);
   for(const channel of [left,right]){const raw=channel[offset+j]*fade;this.rawPeak=Math.max(this.rawPeak,Math.abs(raw));if(Math.abs(raw)>.95)this.limitedSamples++;const value=.98*Math.tanh(raw/.98);channel[offset+j]=value;this.peak=Math.max(this.peak,Math.abs(value));energy+=value*value;}
  }
  this.level+=(Math.sqrt(energy/(n*2))*12-this.level)*(1-Math.exp(-n/this.rate*5));this.frame+=n;offset+=n;
 }
 if(this.frame>=this.totalFrames)this.done=true;
 }
 snapshot(){const deck=this.decks[this.cueIndex%2],cue=this.layout[this.cueIndex],previous=this.cueIndex?this.decks[(this.cueIndex-1)%2]:null;return {cinema:this.score.cinema,seconds:this.frame/this.rate,total:this.totalFrames/this.rate,index:this.cueIndex,title:cue.title,showTitle:this.score.title,artist:this.score.artist,beat:deck.core.beat,motionTime:deck.motionTime,state:deck.core.state,visual:deck.visual,level:Math.min(1,this.level),hits:this.hits[this.cueIndex%2],previous:previous&&previous.gain>.001?{state:previous.core.state,visual:previous.visual,hits:this.hits[(this.cueIndex-1)%2],beat:previous.core.beat,motionTime:previous.motionTime,gain:previous.gain}:null,blend:deck.gain,done:this.done};}
}
