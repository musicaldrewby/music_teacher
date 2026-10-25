import {STRINGS,chordAllows} from './music.js?v=standard-21-1';

const step=(count,kind,duration=1,accent=1,extra={})=>({count,kind,duration,accent,...extra});
const eighths=(kinds,swing=false)=>kinds.map((kind,i)=>step(i%2?'&':String(i/2+1),kind,swing?(i%2?1/3:2/3):.5,i===0?1:i%2?.62:.82));
export const STRUM_PATTERNS=[
  {id:'steady',name:'Steady beats',meter:'4/4',beatUnit:'quarter note',description:'One down-strum on each beat. A clear, steady accompaniment.',steps:[1,2,3,4].map(n=>step(String(n),'down',1,n===1?1:.8))},
  {id:'down-up',name:'Down & up',meter:'4/4',beatUnit:'quarter note',description:'Even eighth notes, alternating down and up. Count 1 & 2 & 3 & 4 &.',steps:eighths(['down','up','down','up','down','up','down','up'])},
  {id:'folk',name:'Folk strum',meter:'4/4',beatUnit:'quarter note',description:'Down, down-up, up-down-up. Let the strings ring through the gaps.',steps:eighths(['down','rest','down','up','rest','up','down','up'])},
  {id:'boom-chick',name:'Bass & chord',meter:'4/4',beatUnit:'quarter note',description:'Alternate a bass note and an upper-string chord. The bass moves between root and fifth when available.',steps:[step('1','bass',1,1),step('2','chord',1,.8),step('3','bass',1,.9,{fifth:true}),step('4','chord',1,.8)]},
  {id:'waltz',name:'Waltz',meter:'3/4',beatUnit:'quarter note',description:'Bass, strum, strum. A gently accented three-beat pattern.',steps:[step('1','bass'),step('2','chord',1,.7),step('3','chord',1,.7)]},
  {id:'swing',name:'Swing strum',meter:'4/4',beatUnit:'quarter note',description:'Long-short down-up pairs with a lilting swing feel.',steps:eighths(['down','up','down','up','down','up','down','up'],true)},
  {id:'six-eight',name:'Lilting 6/8',meter:'6/8',beatUnit:'dotted quarter',description:'Two big beats, each divided into three. Feel ONE-two-three FOUR-five-six; tempo follows the two big beats.',steps:['down','rest','up','down','rest','up'].map((kind,i)=>step(String(i+1),kind,1/3,i===0?1:i===3?.88:.55))},
  {id:'arpeggio',name:'Rolling arpeggio',meter:'4/4',beatUnit:'quarter note',description:'Pick individual chord tones, rising and falling in a flowing eight-note pattern.',steps:[0,2,4,6,7,5,3,1].map((pickIndex,i)=>step(i%2?'&':String(i/2+1),'pick',.5,i===0?1:.8,{pickIndex}))}
];
export const getStrumPattern=id=>STRUM_PATTERNS.find(p=>p.id===id)||STRUM_PATTERNS[0];
export const clampTempo=value=>Number.isFinite(Number(value))?Math.max(40,Math.min(180,Math.round(Number(value)))):92;
export const STEP_SYMBOLS={down:'↓',up:'↑',rest:'—',bass:'B',chord:'↓',pick:'♪'};

// Resolve each stroke against the chord currently pressed, including intersecting bars.
export function strokeNotes(event,chord){
  const allowed=STRINGS.map((m,i)=>chordAllows(chord,m)?i:-1).filter(i=>i>=0);
  if(!allowed.length||event.kind==='rest')return [];
  if(event.kind==='bass'){
    const root=chord?.root??chord?.bars?.[0]?.root;
    const pc=root==null?null:(root+(event.fifth?7:0))%12;
    return [allowed.find(i=>STRINGS[i]<60&&(pc==null||STRINGS[i]%12===pc))??allowed[0]];
  }
  if(event.kind==='pick'){
    const middle=allowed.filter(i=>STRINGS[i]>=48&&STRINGS[i]<=79);
    const notes=middle.length?middle:allowed;
    return [notes[Math.round((event.pickIndex??0)/7*(notes.length-1))]];
  }
  let notes=event.kind==='chord'?allowed.filter(i=>STRINGS[i]>=60):allowed;
  if(!notes.length)notes=allowed;
  return event.kind==='up'?[...notes].reverse():notes;
}

// A short audio-clock lookahead keeps the pulse steady without queueing whole bars
// of an old chord. Long stalls skip missed steps rather than playing a catch-up burst.
export class AutoStrummer{
  constructor({now,play,onStep=()=>{},setIntervalFn=(fn,ms)=>setInterval(fn,ms),clearIntervalFn=id=>clearInterval(id),setTimeoutFn=(fn,ms)=>setTimeout(fn,ms),clearTimeoutFn=id=>clearTimeout(id)}){
    Object.assign(this,{now,play,onStep,setIntervalFn,clearIntervalFn,setTimeoutFn,clearTimeoutFn});
    this.pattern=getStrumPattern('steady');this.tempo=92;this.running=false;this.timer=null;this.visuals=new Set();this.generation=0;
  }
  configure(patternId,tempo){this.pattern=getStrumPattern(patternId);this.tempo=clampTempo(tempo);}
  start(){
    this.stop();this.running=true;this.index=0;this.nextTime=this.now()+.03;this.tick();
    this.timer=this.setIntervalFn(()=>this.tick(),16);
  }
  tick(){
    if(!this.running)return;
    const now=this.now();
    if(this.nextTime<now-.12){this.index=0;this.nextTime=now+.03;}
    while(this.nextTime<now+.045){
      const index=this.index,event=this.pattern.steps[index],at=this.nextTime,duration=event.duration*60/this.tempo,generation=this.generation;
      if(at>=now-.015){
        this.play(event,Math.max(at,now),duration);
        const timer=this.setTimeoutFn(()=>{this.visuals.delete(timer);if(this.running&&this.generation===generation)this.onStep(index,event);},Math.max(0,(at-now)*1000));
        this.visuals.add(timer);
      }
      this.nextTime+=duration;this.index=(index+1)%this.pattern.steps.length;
    }
  }
  stop(){this.running=false;this.generation++;if(this.timer!==null)this.clearIntervalFn(this.timer);this.timer=null;for(const timer of this.visuals)this.clearTimeoutFn(timer);this.visuals.clear();}
}
