import {barBeats,totalBeats} from './catalog.js';
const clamp=(v,a,b,f)=>Number.isFinite(Number(v))?Math.max(a,Math.min(b,Number(v))):f;
export function practiceSettings(value={},bars=1){
 value=value&&typeof value==='object'?value:{};return {enabled:!!value.enabled,first:Math.round(clamp(value.first,1,bars,1)),last:Math.round(clamp(value.last,1,bars,bars)),speed:clamp(value.speed,.25,1.5,1),countIn:value.countIn!==false,ramp:!!value.ramp,step:Math.round(clamp(value.step,1,20,4)),target:Math.round(clamp(value.target,30,240,120))};}
export function playbackRange(project,value,cursor=0){const q=practiceSettings(value,project.bars),per=barBeats(project),a=q.enabled?(Math.min(q.first,q.last)-1)*per:0,b=q.enabled?Math.max(q.first,q.last)*per:totalBeats(project);return {a,b,first:cursor>=a&&cursor<b?cursor:a,settings:q};}
export function makePass(tr,index,at){const q=tr.settings,bpm=Math.min(240,Math.max(30,tr.baseTempo*q.speed)+(q.enabled&&q.ramp?index*q.step:0)),tempo=q.enabled&&q.ramp?Math.min(Math.max(tr.baseTempo*q.speed,q.target),bpm):bpm,sec=60/tempo,count=q.enabled&&q.countIn?barBeats(tr.project):0,first=index===0?tr.range.first:tr.range.a;return {index,at,start:at+count*sec,end:at+(count+tr.range.b-first)*sec,first,last:tr.range.b,sec,tempo,count};}
export function createPlayback(project,value,cursor,now,loop){const range=playbackRange(project,value,cursor),tr={project,range,settings:range.settings,baseTempo:project.bpm,repeat:range.settings.enabled||loop,from:now,passes:[],practice:true,recording:false};tr.passes=[makePass(tr,0,now+.12)];return tr;}
export function extendPasses(tr,horizon){while(tr.repeat&&tr.passes.at(-1).end<horizon){const last=tr.passes.at(-1);tr.passes.push(makePass(tr,last.index+1,last.end));}}
export function playbackPosition(tr,now){const pass=tr.passes.find(p=>now<p.end)||tr.passes.at(-1),counting=now<pass.start;return {beat:counting?pass.first:Math.min(pass.last,pass.first+(now-pass.start)/pass.sec),counting,remaining:counting?Math.ceil((pass.start-now)/pass.sec):0,tempo:pass.tempo,pass:pass.index+1};}
export function scheduledNotes(tr,from,to){extendPasses(tr,to);const out=[];for(const pass of tr.passes){if(pass.end<from||pass.at>=to)continue;for(const t of tr.project.tracks)for(const e of t.events){const begin=Math.max(pass.first,e.beat),end=Math.min(pass.last,e.beat+e.duration);if(end<=begin||e.beat>=pass.last)continue;const at=pass.start+(begin-pass.first)*pass.sec;if(at>=from&&at<to)out.push({track:t,event:{...e,beat:begin,duration:end-begin},at,sec:pass.sec,tempo:pass.tempo,pass:pass.index});}}return out;}
export function scheduledClicks(tr,from,to,enabled=true){
 extendPasses(tr,to);const out=[],step=tr.project.meter==='6/8'?.5:1,accentBeats=tr.project.meter==='6/8'?1.5:barBeats(tr.project);
 for(const pass of tr.passes){
  if(pass.end<from||pass.at>=to)continue;
  // Anchor both the lead-in and playback clicks to musical beats, not the
  // possibly fractional position where this pass resumes.
  const first=Math.ceil((pass.first-pass.count)/step-1e-9),last=Math.ceil(pass.last/step-1e-9);
  for(let tick=first;tick<last;tick++){
   const beat=tick*step,counting=beat<pass.first-1e-9,at=pass.start+(beat-pass.first)*pass.sec;
   if(at>=from&&at<to&&(counting||enabled))out.push({at,beat,counting,accent:Math.abs(beat/accentBeats-Math.round(beat/accentBeats))<1e-9,pass:pass.index});
  }
 }
 return out;
}
export function listeningTracks(project,mode,part){const solo=project.tracks.some(t=>t.solo);return project.tracks.filter(t=>mode==='part'?t.id===part:mode==='accompaniment'?t.id!==part&&!t.muted:!t.muted&&(!solo||t.solo));}
