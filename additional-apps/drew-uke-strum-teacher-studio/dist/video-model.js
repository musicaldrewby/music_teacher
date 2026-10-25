(function(root){
 'use strict';
 const meters={'4/4':{steps:8,beat:2,beats:4},'3/4':{steps:6,beat:2,beats:3},'2/4':{steps:4,beat:2,beats:2},'6/8':{steps:6,beat:3,beats:2}};
 const bound=(v,a,b,d)=>Number.isFinite(Number(v))?Math.max(a,Math.min(b,Number(v))):d;
 function options(raw={},song={}){
  raw=raw&&typeof raw==='object'?raw:{};
  return {renderMode:raw.renderMode==='realtime'?'realtime':'fast',title:String(raw.title||'').slice(0,120),composer:String(raw.composer||'').slice(0,120),performer:String(raw.performer||'').slice(0,120),ending:String(raw.ending??'Thanks for playing!').slice(0,100),sheetMusic:raw.sheetMusic===undefined?song.notation?.showInPlayer!==false:raw.sheetMusic===true,guideMelody:raw.guideMelody===undefined?song.notation?.guideMelody===true:raw.guideMelody===true,passes:Math.round(bound(raw.passes??1,1,99,1)),intro:bound(raw.intro??5,3,12,5),outro:bound(raw.outro??4,3,10,4),transition:['wave','fade','page','iris','collage','surf','palms','sand'].includes(raw.transition)?raw.transition:'wave',countIn:raw.countIn!==false,band:raw.band===undefined?song.band?.enabled!==false:raw.band===true,resolution:raw.resolution==='720'?'720':'1080',fps:Number(raw.fps)===30?30:60,format:['auto','mp4','webm'].includes(raw.format)?raw.format:'auto'};
 }
 function plan(song,raw){
  const o=options(raw,song),cfg=meters[song.meter],n=cfg.steps,scoreLength=song.measures.length*n;
  let bodyEnd=scoreLength;
  while(bodyEnd>n&&song.measures[bodyEnd/n-1]?.ending)bodyEnd-=n;
  const virtualEnding=bodyEnd===scoreLength,scoreEnd=scoreLength+(virtualEnding?n:0),repeatEnd=bodyEnd*o.passes,finish=repeatEnd+scoreEnd-bodyEnd;
  const stepSeconds=60/song.tempo/cfg.beat,countSteps=o.countIn?(song.meter==='2/4'||song.meter==='6/8'?4:cfg.beats)*cfg.beat:0;
  const wave={wave:1.6,fade:1.1,page:1.5,iris:1.4,collage:2.2,surf:2.2,palms:2.3,sand:2.4}[o.transition],countStart=o.intro+wave,musicStart=countStart+countSteps*stepSeconds,musicEnd=musicStart+finish*stepSeconds;
  return {start:0,end:scoreLength,loop:false,length:bodyEnd,bodyEnd,passes:o.passes,scoreEnd,virtualEnding,repeatEnd,finish,stepSeconds,countSteps,countStart,musicStart,musicEnd,wave,total:musicEnd+wave+o.outro,options:o};
 }
 function phaseAt(time,p){return (time-p.musicStart)/p.stepSeconds;}
 function position(time,p){
  const phase=phaseAt(time,p),tick=phase<0?0:phase<p.repeatEnd?phase%p.length:p.bodyEnd+phase-p.repeatEnd;
  return {phase,tick:Math.min(p.scoreEnd-1e-6,tick),pass:Math.min(p.passes,Math.max(1,Math.floor(phase/p.length)+1)),counting:phase<0,ending:phase>=p.repeatEnd};
 }
 function scene(time,p){
  if(time<p.options.intro)return {name:'title',progress:time/p.options.intro};
  if(time<p.countStart)return {name:'intro-wave',progress:(time-p.options.intro)/p.wave};
  if(time<p.musicEnd)return {name:'song',...position(time,p)};
  if(time<p.musicEnd+p.wave)return {name:'outro-wave',progress:(time-p.musicEnd)/p.wave};
  if(time<p.total)return {name:'ending',progress:(time-p.musicEnd-p.wave)/p.options.outro};
  return {name:'done',progress:1};
 }
 function duration(seconds){const s=Math.max(0,Math.ceil(seconds));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
 // Let the MP4 encoder choose a level suitable for the actual size/frame rate.
 const types={mp4:['video/mp4','video/mp4;codecs=avc1.42E02A,mp4a.40.2'],webm:['video/webm;codecs=vp8,opus','video/webm;codecs=vp9,opus','video/webm']};
 function formats(request,supported){const result=[];for(const family of request==='auto'?['mp4','webm']:[request])for(const mime of types[family]||[])if(supported(mime))result.push({mime,extension:family,label:family.toUpperCase()});return result;}
 function format(request,supported){return formats(request,supported)[0]||null;}
 const api={options,plan,position,phaseAt,scene,duration,format,formats,meters};root.UkeVideoModel=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
