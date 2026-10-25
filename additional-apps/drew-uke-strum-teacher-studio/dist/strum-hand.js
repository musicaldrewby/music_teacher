'use strict';
const STRUM_HAND_ASSET='assets/collage/strumming-hand-front.png';
const STRUM_UKULELE_ASSET='assets/collage/strumming-ukulele-front.png';
const handEase=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const handLanding=type=>type==='U'?0:type==='X'?.72:1;

function renderStrumHandBase(){
 const host=$('stageStrums');
 if(!$('strummingHand'))host.innerHTML='<div class="strum-hand-canvas" aria-hidden="true"><img id="strummingUkulele" class="strumming-ukulele" alt="" draggable="false" width="1774" height="887"><img id="strummingHand" class="strumming-hand" alt="" draggable="false" width="1536" height="1024"></div><div id="strumAction" class="strum-action" aria-hidden="true"></div>';
 for(const [id,asset] of [['strummingHand',STRUM_HAND_ASSET],['strummingUkulele',STRUM_UKULELE_ASSET]]){
  const img=$(id),src=window.EMBEDDED_ART?.[asset]||asset;
  if(img.getAttribute('src')!==src){img.setAttribute('src',src);img.decode?.().catch(()=>{});}
 }
 host.hidden=!song.showStrum;
 host.setAttribute('aria-label',`Front-view ukulele with its neck pointing right: ${STRUM_PATTERNS[song.pattern].name}. The hand completes each stroke when it sounds.`);
}

// Sample the same absolute song clock and swing offsets used to schedule sound.
// No animation timers: pause, seek, repeats, and projector packets share this phase.
function strumHandPose(phase,counting=false){
 const p=playbackPlan(),n=config().steps,first=transport.countUntil||p.start;
 let previous=null,next=null;
 for(let abs=Math.max(first,Math.floor(phase)-n*2);abs<=Math.floor(phase)+n*2;abs++){
  if(!p.loop&&abs>=p.finish)break;
  const tick=Math.floor(mappedTick(abs,p)),type=strumStep(song,tick).type;
  if(!['D','U','X'].includes(type)||chordAt(tick)==='--')continue;
  const time=abs+(song.meter!=='6/8'&&tick%2?song.swing:0),event={time,type,tick};
  if(time<=phase+1e-7)previous=event;else{next=event;break;}
 }
 const tick=Math.floor(mappedTick(phase,p)),ending=!counting&&isEndingMeasure(song,tick);
 if(!previous&&!next)return {position:.25,stroke:'.',striking:false,ending};
 const destination=handLanding(next?.type||previous.type);
 let position=previous?handLanding(previous.type):1-destination;
 if(next){
  const gap=previous?next.time-previous.time:config().beat;
  const span=Math.min(gap,config().beat*2),progress=Math.max(0,1-(next.time-phase)/span);
  const prepare=previous&&previous.type!==next.type?position+(destination-position)*.25:1-destination;
  if(progress<.78)position+=(prepare-position)*handEase((progress-.06)/.72);
  else position=prepare+(destination-prepare)*handEase((progress-.78)/.22);
 }
 const sounding=!counting&&chordAt(tick)!=='--',age=previous?(phase-previous.time)*duration():Infinity;
 return {position,stroke:sounding?(previous?.type||'.'):'.',striking:sounding&&age>=0&&age<.11,ending};
}

function updateStrumHand(phase=displayPhase(transport.tick),counting=phase<(transport.countUntil||0)){
 const host=$('stageStrums'),hand=$('strummingHand');if(!hand||host.hidden)return;
 let pose=strumHandPose(phase,counting),label=pose.ending?'Final strum':({D:'Down strum',U:'Up strum',X:'Mute', '.':'Rest'}[pose.stroke]);
 if(transport.state==='stopped'){pose={position:0,stroke:'.',striking:false,ending:false};label='Ready to strum';}
 else if(transport.state==='finished'){pose={position:1,stroke:'.',striking:false,ending:true};label='';}
 else if(counting)label='Get ready';
 else if(transport.state==='paused')label='Paused';
 const motion=!window.matchMedia('(prefers-reduced-motion: reduce)').matches,position=motion?pose.position:.4;
 hand.style.transform=`rotate(${(-5+30*position).toFixed(3)}deg) scale(${pose.stroke==='X'&&pose.striking&&motion?.975:1}) scaleY(-1)`;
 host.dataset.stroke=pose.stroke;host.dataset.ending=String(pose.ending);host.dataset.position=String(position);
 $('strumAction').textContent=label;
}
