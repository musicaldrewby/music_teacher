// Original eight-bar composition, expressed as instrument-independent events.
// Replace this score or add new arrangements without touching the save/economy.
export const LIVE_SONG={title:'One Window Open',bpm:112,bars:8};
export const CHORDS=[{root:55,third:4},{root:50,third:4},{root:52,third:3},{root:48,third:4}];
export function barEvents(p,bar) {
 const {root,third}=CHORDS[Math.floor(bar/2)%4],notes=[0,third,7,12];
 const e=[];
 const note=(instrument,beat,midi,duration=.35,velocity=.6)=>e.push({instrument,beat,midi,duration,velocity});
 const chord=(instrument,beat,octave=12,duration=.7,velocity=.24)=>notes.slice(0,3).forEach((n,i)=>note(instrument,beat+i*.025,root+octave+n,duration,velocity));
 if(p.tier===0){note('guitar',0,root+12,.6,.55);note('guitar',2.15,root+19,.45,.4);}
 else if(p.tier===1){[0,1,2,3].forEach((b,i)=>note('guitar',b,root+12+notes[[0,2,1,2][i]],.42,.5));}
 else if(p.tier===2){chord('guitar',0);chord('guitar',2);}
 else {
  const beats=[0,.5,1,1.75,2,2.5,3,3.5],riff=[0,0,7,third,0,7,12,7];
  beats.forEach((b,i)=>note('guitar',b,root+12+riff[i],i%4===0?.4:.2,i%4===0?.58:.4));
  if(p.tier>=4&&bar%2===1){[0,.75,1.5,2.5,3.25].forEach((b,i)=>note('lead',b,root+24+[7,third,0,third,7][i],.28,.27));}
  if(p.tier>=5&&bar>=6){[.25,.5,.75,2.25,2.5,2.75].forEach((b,i)=>note('lead',b,root+24+notes[i%4],.14,.22));}
 }
 if(p.bass)[0,1.5,2,3.5].forEach((b,i)=>note('bass',b,root-12+(i%2?7:0),.4,.6));
 if(p.keys)chord('keys',0,12,1.8,.15);
 if(p.drums){
  [0,2,2.75].forEach(b=>note('kick',b,36,.2,.65));
  [1,3].forEach(b=>note('snare',b,38,.15,.5));
  for(let i=0;i<8;i++)note('hat',i/2,42,.045,i%2?.2:.3);
  if(p.fullKit&&bar===7)[3.25,3.5,3.75].forEach(b=>note('snare',b,38,.1,.35));
 }
 return e.sort((a,b)=>a.beat-b.beat);
}
