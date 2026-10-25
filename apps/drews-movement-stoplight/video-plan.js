// Pure, deterministic timeline builder shared by preview, audio and video.
(function(root){
 const BAR=2.4,LOOP=9.6;
 function rng(seed){let x=seed>>>0;return()=>{x=(Math.imul(1664525,x)+1013904223)>>>0;return x/4294967296;};}
 function clamp(value,min,max,fallback){const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;}
 function transitions(config){
  const allowed=['bus','smoke','fade','none'];
  const opening=allowed.includes(config.opening)?config.opening:config.smoke===false?'fade':'smoke';
  const ending=allowed.includes(config.ending)?config.ending:config.smoke===false?'fade':'smoke';
  const fadeIn=.6,fadeOut=.6,rulesDuration=8,readyDuration=2,openingDuration={bus:5.2,smoke:2.4,fade:1,none:0}[opening];
  const intro=fadeIn+rulesDuration+openingDuration+readyDuration,closing={bus:4,smoke:2.4,fade:1.4,none:0}[ending],outro=closing+3.5+fadeOut;
  return{opening,ending,intro,closing,outro,fadeIn,fadeOut,rulesDuration,openingDuration,readyDuration};
 }
 function wrap(segments,config){const t=transitions(config),gameDuration=segments.reduce((n,s)=>n+s.duration,0);return{segments,gameDuration,...t,total:t.intro+gameDuration+t.outro,seed:config.seed||1};}
 function fromSequence(game,config){
  const sequence=root.MovementSequence||(typeof require==='function'?require('./game-sequence.js'):null);
  return wrap(sequence.segments(game,config.repeats),{...config,seed:game.seed});
 }
 function build(config){
  const moves=config.moves.filter(m=>m.weight>0);if(!moves.length)throw Error('Choose at least one movement in Game settings.');
  const random=rng(config.seed||1),stopMode=['never','sometimes','always'].includes(config.stopMode)?config.stopMode:'always';
  const bars=Math.max(3,Math.ceil(clamp(config.seconds,5,3600,120)/BAR-1e-8));
  const reserve=config.endOnStop?2:0,limit=bars-reserve,segments=[];
  const add=(id,start,count)=>{if(!count)return;const previous=segments.at(-1);if(previous?.id===id){previous.duration+=count*BAR;return;}segments.push({id,start:start*BAR,duration:count*BAR});};
  let at=0,moving=true,sequenceIndex=0;
  while(at<limit){
   let id='stop',length=Math.max(1,Math.ceil(clamp(config.freezeSeconds,2.4,30,4.8)/BAR-1e-8));
   if(moving){const previous=segments.at(-1)?.id,choices=moves.length>1?moves.filter(m=>m.id!==previous):moves;let p=random()*choices.reduce((n,m)=>n+Number(m.weight),0),choice=choices.at(-1);for(const move of choices){p-=Number(move.weight);if(p<0){choice=move;break;}}if(config.order==='sequence')choice=moves[sequenceIndex++%moves.length];id=choice.id;length=Math.max(1,Math.ceil(clamp(choice.seconds,2.4,120,14.4)/BAR-1e-8));}
   length=Math.min(length,limit-at);add(id,at,length);at+=length;
   moving=id==='stop'||stopMode==='never'||(stopMode==='sometimes'&&random()>=.35);
  }
  if(reserve)add('stop',at,reserve);
  // If the user declines a final Stop, the final segment is a movement.
  if(!config.endOnStop&&segments.at(-1)?.id==='stop'){
   const last=segments.pop();segments.at(-1).duration+=last.duration;
  }
  return wrap(segments,config);
 }
 function at(plan,time){const t=Math.max(0,time-plan.intro);return plan.segments.find(s=>t>=s.start&&t<s.start+s.duration)||plan.segments.at(-1);}
 root.MovementVideoPlan={BAR,LOOP,rng,build,at,transitions,fromSequence};
 if(typeof module!=='undefined')module.exports=root.MovementVideoPlan;
})(typeof window==='undefined'?globalThis:window);
