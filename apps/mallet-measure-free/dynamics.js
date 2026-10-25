// Velocity voicing is local to each note. Missing metadata keeps legacy sounds.
const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));
const blendFrequency=(open,soft,amount)=>open*(Math.min(open,soft)/open)**amount;
// Web Audio low-pass Q is in dB: a linear Q of .5 is -6.02 dB.
// https://www.w3.org/TR/webaudio-1.0/#dom-biquadfilternode-q
const dampedQ=20*Math.log10(.5);
export const validDynamicTone=value=>value===undefined||Number.isFinite(value)&&value>=0&&value<=1;

export function voiceToneProfile(inst,event,sampleRate=44100){
 const amount=Number.isFinite(event.dynamicTone)?clamp(event.dynamicTone,0,1):0;
 const velocity=Number.isFinite(event.velocity)?clamp(event.velocity,0,1):.8;
 const warmth=amount*(1-velocity)**1.1;
 const ceiling=sampleRate*.45,openCutoff=sampleRate/2;
 const fundamental=440*2**((event.note+(event.shift||0)-69)/12);
 if(inst.zone==='metallophones'){
  // Retain the established yarn-mallet sound, using the same two filters.
  const open=Math.min(9000,Math.max(3000,fundamental*5),ceiling);
  return {shelfHz:Math.min(ceiling,Math.max(1600,fundamental*2.2)),shelfDb:-7-7*warmth,
   cutoffHz:blendFrequency(open,Math.max(1800,fundamental*2.5),warmth),q:.5+(dampedQ-.5)*warmth};
 }
 if(!warmth)return null;
 let shelf=5000,cut=3,soft=9000;
 if(inst.zone==='xylophones'){shelf=Math.max(1000,fundamental*3.5);cut=10;soft=Math.max(3000,fundamental*8);}
 else if(inst.zone==='bassbars'){shelf=Math.max(650,fundamental*4);cut=7;soft=Math.max(2200,fundamental*12);}
 else if(inst.zone==='glockenspiels'){shelf=Math.max(3500,fundamental*2.8);cut=6;soft=Math.max(6500,fundamental*4);}
 else if(inst.family==='recorder'){shelf=Math.max(1800,fundamental*4);cut=4;soft=Math.max(5000,fundamental*7);}
 else if(['hand-drums','tubanos','bongos','side-drum','timpani'].includes(inst.id)){shelf=1400;cut=8;soft=3500;}
 else if(['woodblock','temple-blocks','claves','slapstick','castanets'].includes(inst.id)){shelf=2600;cut=7;soft=5000;}
 else if(['agogo-bells','cowbell','triangle','finger-cymbals','suspended-cymbal','gong'].includes(inst.id)){shelf=4000;cut=4;soft=6500;}
 return {shelfHz:Math.min(ceiling,shelf),shelfDb:-cut*warmth,
  // Approach Nyquist as warmth approaches zero, for a smooth return to bypass.
  cutoffHz:blendFrequency(openCutoff,soft,warmth),q:dampedQ};
}
