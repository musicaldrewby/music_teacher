'use strict';
// Director data is optional: original story files retain their timing and appearance.
const DIRECTOR_EASES=['linear','smooth','cinematic','ease-in','ease-out'];
let directorRenderScene=null,directorRenderProject=null,directorReady=false;
function directorConfig(p=state){return p.director||(p.director={})}
function directorScene(s=scene()){return s.director||(s.director={})}
function directorEase(u,kind='smooth'){
 u=cinemaClamp(u,0,1);if(kind==='cinematic')return u*u*u*(u*(u*6-15)+10);
 if(kind==='ease-in')return u*u*u;if(kind==='ease-out')return 1-(1-u)**3;
 return kind==='smooth'?u*u*(3-2*u):u;
}
function directorTrackingOffset(s,row,t){
 const f=row.shot.follow,o=s.items.find(o=>o.id===f?.targetId);if(!o||o.attachment)return{x:0,y:0};
 const duration=sceneSeconds(s),start=f.originStart??row.start,end=f.originEnd??row.end,p=studioProject(),sample=at=>studioPoseAt(o,Math.min(cinemaClamp(at,start,end),phrasePlaybackTiming(p)?phraseHold(s,p):Infinity),duration,s);
 const smooth=at=>{const radius=f.smoothing??.2;let x=0,y=0,weight=0;for(let i=-2;i<=2;i++){const w=3-Math.abs(i),p=sample(at+i*radius/2);x+=p.x*w;y+=p.y*w;weight+=w}return{x:x/weight,y:y/weight}};
 const ahead=f.lookAhead||0,a=smooth(start),b=smooth(t),future=smooth(t+ahead),lead=directorEase((t-start)/.5,'smooth'),strength=f.strength??1;
 return{x:(b.x-a.x+(future.x-b.x)*lead)*strength,y:(b.y-a.y+(future.y-b.y)*lead)*strength};
}
function directorFollow(s,row,t,camera){const offset=directorTrackingOffset(s,row,t);return cameraClamp({...camera,x:camera.x+offset.x,y:camera.y+offset.y})}
function directorBaseFocusBlur(s,o,scale=1){
 const f=s.cinema?.focus;if(!f?.enabled)return 0;
 if(o?.id===f.targetId||o?.type==='bubble'||o?.type==='text')return 0;
 const plane=({back:0,middle:1,foreground:2})[f.plane||'middle'],depth=o?({back:0,middle:1,foreground:2})[o.depth||'middle']:0;
 return Math.abs(plane-depth)*(f.amount??5)*scale;
}
function directorFocusBlur(s,o,scale=1,t=0){return movieFocusBlur(s,o,scale,t,directorBaseFocusBlur(s,o,1))}
function directorEvents(s,fn){
 for(const c of movieClips(s))fn(c,'cinematic');for(const c of s.reusablePerformances||[])fn(c,'reusable');
 for(const a of s.cues||[])fn(a,'sound');for(const a of s.cinema?.titles||[])fn(a,'title');
 for(const m of s.director?.markers||[]){const a={start:m.time};fn(a,'marker');m.time=a.start}
 function walk(o){for(const c of o.conversation?.clips||[])fn(c,'conversation');for(const c of o.choreography||[])fn(c,'choreography');if(o.dialogue)fn(o.dialogue,'dialogue');for(const a of o.acting?.cues||[])fn(a,'acting');for(const a of o.performance?.clips||[])fn(a,'performance');for(const a of o.propActions||[])fn(a,'prop');o.children?.forEach(walk)}s.items.forEach(walk);
}
function directorReorderShot(s,shotId,delta,moveCues=true){
 const shots=s.cinema?.shots||[],i=shots.findIndex(x=>x.id===shotId),j=i+delta;if(i<0||j<0||j>=shots.length)return false;
 const old=cinemaRows(s);[shots[i],shots[j]]=[shots[j],shots[i]];
 if(moveCues){const next=cinemaRows(s);directorEvents(s,event=>{const row=old.find(r=>event.start<r.end)||old.at(-1),dest=next.find(r=>r.shot.id===row.shot.id);event.start=frameTime(Math.max(event.start<0?-600:0,event.start+dest.start-row.start))})}
 return true;
}
function directorResizeShot(s,shotId,duration,ripple=true){
 const rows=cinemaRows(s),row=rows.find(r=>r.shot.id===shotId);if(!row)return;
 duration=frameTime(cinemaClamp(duration,.2,7200-rows.at(-1).end+row.shot.duration));const delta=duration-row.shot.duration;
 if(ripple)directorEvents(s,a=>{if(a.start>=row.end-1e-7)a.start=frameTime(Math.max(0,a.start+delta))});
 row.shot.duration=duration;s.duration=cinemaRows(s).at(-1).end;
}
function directorMarkers(s=scene(),p=state){const start=studioSceneStart(s,p),end=start+sceneSeconds(s,p);return [...(s.director?.markers||[]),...(p.director?.musicCues||[]).filter(c=>c.time>=start&&c.time<end).map(c=>({...c,time:c.time-start,global:true}))]}
function directorSnap(t,s=scene(),p=state,force=false){
 if(!force&&!p.director?.snap)return frameTime(t);let best=t,distance=.14;
 const candidates=directorMarkers(s,p).map(m=>m.time),beat=p.director?.beat;
 if(beat?.enabled){const row=storyTimeline(p).find(r=>r.scene.id===s.id);if(row){const period=60/beat.bpm,absolute=row.start+t,n=Math.round((absolute-beat.offset)/period);if(n>=0)candidates.push(beat.offset+n*period-row.start)}}
 for(const value of candidates){const d=Math.abs(t-value);if(d<distance&&value>=0){distance=d;best=value}}return frameTime(best);
}
function directorNarrationWindow(row,p,tl){
 const n=row.scene.narration||{},a=mediaInfo(n.assetId,p);if(!a)return null;
 const start=row.start+(n.delay||0),end=Math.min(n.crossScene?tl.at(-1).end:row.end,start+a.duration);
 return{assetId:n.assetId,start,end,offset:0,volume:n.volume??1};
}
function directorCueWindow(c,row,p,tl){
 const start=row.start+c.start,length=c.assetId?mediaInfo(c.assetId,p)?.duration:CINEMA_SOUNDS.find(x=>x[0]===c.preset)?.[2];
 return{start,end:Math.min(c.crossScene?tl.at(-1).end:row.end,start+c.duration,c.loop?Infinity:start+Math.max(0,(length||0)-c.offset))};
}
function directorSpeechSource(o,s,p){
 const speech=o.speech;if(!speech)return null;
 if(speech.source==='narration'){const n=s.narration;return n?.assetId?{assetId:n.assetId,start:n.delay||0,offset:0,duration:mediaInfo(n.assetId,p)?.duration||0}:null}
 const c=s.cues?.find(c=>c.id===speech.source);return c?.assetId?{assetId:c.assetId,start:c.start,offset:c.offset,duration:c.duration,loop:c.loop}:null;
}
function directorSpeechMouth(o,t,s=directorRenderScene||scene(),p=directorRenderProject||state){
 const generated=talkMouth(o,t,s,p);if(generated!==null)return generated;const q=directorSpeechSource(o,s,p);if(!q)return o.speech||o.dialogueLines?.length?0:null;
 const v=o.speech,dt=t-q.start;if(dt<0||dt>=q.duration||t<v.start||t>=v.end)return 0;
 const media=mediaInfo(q.assetId,p),envelope=media?.speechEnvelope;if(!envelope)return 0;
 let position=dt+q.offset;if(q.loop)position%=media.duration;
 const level=(envelope.values[Math.floor(position*envelope.fps)]||0)/255*(v.sensitivity||1);
 return level<.13?0:level<.44?1:2;
}
function directorAnalyzeBuffer(buffer){
 const fps=30,count=Math.ceil(buffer.duration*fps),values=[],channels=Array.from({length:buffer.numberOfChannels||1},(_,i)=>buffer.getChannelData(i));let smoothed=0;
 for(let f=0;f<count;f++){const a=Math.floor(f*buffer.sampleRate/fps),b=Math.min(buffer.length,Math.floor((f+1)*buffer.sampleRate/fps));let sum=0;
  for(let i=a;i<b;i+=4){let amplitude=0;for(const channel of channels)amplitude+=channel[i]||0;amplitude/=channels.length;sum+=amplitude*amplitude}
  const rms=Math.sqrt(sum/Math.max(1,Math.ceil((b-a)/4)));smoothed=rms>smoothed?rms*.8+smoothed*.2:rms*.6+smoothed*.4;values.push(smoothed);
 }
 const sorted=values.slice().sort((a,b)=>a-b),peak=Math.max(.025,sorted[Math.floor(sorted.length*.95)]||.025);
 return{fps,values:values.map(x=>Math.round(cinemaClamp((x-.006)/(peak-.006),0,1)*255))};
}
function directorRange(p=state,fps=p.exportFps===30?30:60,settings=p.director?.range){
 const tl=storyTimeline(p,fps),total=tl.at(-1).end,mode=settings?.mode||'whole';let start=0,end=total;
 if(mode==='scene'){const r=tl[Math.max(0,Math.min(tl.length-1,p.active))];start=r.start;end=r.end}
 if(mode==='marked'){start=cinemaClamp(settings.start,0,Math.max(0,total-1/fps));end=cinemaClamp(settings.end,start+1/fps,total,total)}
 const firstFrame=Math.round(start*fps),endFrame=Math.max(firstFrame+1,Math.min(Math.round(total*fps),Math.round(end*fps)));
 return{mode,firstFrame,endFrame,start:firstFrame/fps,end:endFrame/fps,duration:(endFrame-firstFrame)/fps};
}
function directorRangeArtwork(p,tl,range,progress){const ids=new Set();for(const row of tl)if(row.end>range.start&&row.start<range.end){for(const key of sceneAssetIds(row.scene))ids.add(key);if(row.scene.cinema?.transition?.kind==='dissolve'&&row.index>0)for(const key of sceneAssetIds(tl[row.index-1].scene))ids.add(key)}return ensureIds(ids,progress)}
function directorQuality(p=state){
 const issues=[],tl=storyTimeline(p);const add=(severity,message,row,time=0,pieceId=null)=>issues.push({severity,message,sceneId:row.scene.id,time,pieceId});
 for(const row of tl){const s=row.scene;if(s.bg>=0&&!artById.has('bg'+s.bg))add('error','The backdrop is missing.',row);
  for(const issue of performanceReachIssues(s))add('warning',issue.message,row,issue.start,issue.propId);
  function walk(o){if(['asset','puppet'].includes(o.type)&&!artById.has(o.asset)&&!p.imports?.[o.asset])add('error','Missing artwork: '+o.name,row,0,o.id);
   if(o.dialogue){const d=o.dialogue,words=String(o.text||'').trim().split(/\s+/).filter(Boolean).length;
    if(d.duration<Math.max(.8,words/3))add('warning','“'+String(o.text||o.name).slice(0,55)+'” may be too quick to read.',row,d.start,o.id);
    if(d.reveal==='words'&&words/d.wordsPerSecond>d.duration)add('warning','The word reveal ends before every word appears.',row,d.start,o.id);
   }
   if(['text','bubble'].includes(o.type)&&!o.hidden){const at=o.dialogue?o.dialogue.start+o.dialogue.duration/2:row.duration/2,pose=cinemaVisualPose(o,at,s),camera=cameraAt(s,at),points=corners(pose).map(q=>cameraWorldToScreen(q,camera));if(points.some(([x,y])=>x<80||x>W-80||y<45||y>H-45))add('warning','Text is outside the 5% safe margin: '+o.name,row,at,o.id)}
   if(o.speech){const q=directorSpeechSource(o,s,p);if(!q)add('warning','Voice source is missing for '+o.name+'.',row,0,o.id);else if(!mediaInfo(q.assetId,p)?.speechEnvelope)add('warning','Analyze the voice for '+o.name+' before using speech-driven mouths.',row,0,o.id)}
   const acting=o.acting?.cues||[];if(acting.some((a,i)=>acting.slice(i+1).some(b=>a.start<b.start+b.duration&&a.start+a.duration>b.start)))add('warning','Acting cues overlap for '+o.name+'. Review their timing.',row,acting[0]?.start||0,o.id);
   o.children?.forEach(walk)
  }s.items.forEach(walk);
  for(const shot of s.cinema?.shots||[])if(shot.follow&&!s.items.some(o=>o.id===shot.follow.targetId))add('warning','Camera follow target is missing in '+shot.name+'.',row);
  for(const c of s.cues||[]){const w=directorCueWindow(c,row,p,tl);if(c.assetId&&!mediaInfo(c.assetId,p))add('error','Missing sound file: '+c.name,row,c.start);
   if(w.start<0)add('warning','The lead-in of '+c.name+' begins before the movie starts.',row,c.start);
   if(!c.fadeOut&&w.end-w.start>.1)add('warning','Sound ends without a fade: '+c.name,row,Math.max(0,c.start));
   if(c.crossScene&&w.start+c.duration>tl.at(-1).end+.02)add('warning','The movie ends before this sound cue finishes: '+c.name,row,c.start);
  }
  const n=directorNarrationWindow(row,p,tl);if(n&&s.narration.crossScene&&n.start+mediaInfo(n.assetId,p).duration>tl.at(-1).end+.02)add('warning','Narration extends past the end of the movie.',row);
 }
 const musicStart=tl.findIndex(r=>r.scene.id===p.music?.startSceneId),musicEnd=tl.findIndex(r=>r.scene.id===p.music?.endSceneId);if(p.music?.assetId&&musicStart>=0&&musicEnd>=0&&musicEnd<musicStart)add('warning','The music ending scene now precedes its starting scene. Review the music range.',tl[musicStart]);
 return issues;
}
function directorExportPlan(p=state){const plan=copy(p);plan.format='felt-director-plan';plan.canvas={width:W,height:H,fps:p.exportFps||60};delete plan.active;return plan}
function directorPlanPiece(input){
 const o=copy(input);o.id=o.id||id();const asset=artById.get(o.asset);
 if(!o.type&&o.asset&&!asset)throw Error('Unknown artwork asset: '+o.asset);
 if(asset?.storyPack&&!o.storyProp)o.storyProp={pack:asset.storyPack,state:'closed',changes:[]};
 if(!o.type&&asset){o.type=asset.puppet?'puppet':'asset';o.name??=asset.name;[o.bw,o.bh]=asset.puppet?[460,500]:asset.preparedSize||[400,400];o.w??=asset.foreground?1600:asset.puppet?338.56:230;o.h??=o.w*o.bh/o.bw;if(asset.foreground)o.depth??='foreground';if(asset.puppet)o.acting={expression:'happy',pose:'standing',talk:false,blink:true,cues:[],...o.acting}}
 if(!o.type&&o.text!==undefined){const bubble=newBubble(o.style||'speech');Object.assign(bubble,{x:800,y:450},o);return bubble}
 o.name??=o.type||'Piece';o.x??=800;o.y??=450;o.rotation??=0;o.opacity??=1;
 if(o.children)o.children=o.children.map(directorPlanPiece);return o;
}
function directorImportPlan(input){
 if(input?.format!=='felt-director-plan'||input.version!==1||!Array.isArray(input.scenes))throw Error('Choose a version 1 Director Plan JSON file.');
 const p=copy(input);p.format='felt-and-fable';p.active=0;p.title=String(p.title||'Untitled movie').slice(0,200);p.exportFps=p.canvas?.fps===30?30:60;delete p.canvas;p.custom??=[];p.imports??={};
 p.scenes=p.scenes.map((s,i)=>{s.id??=id();s.name??='Scene '+(i+1);s.bg??=0;if(typeof s.backdrop==='string'){const art=artById.get(s.backdrop);if(!art||!s.backdrop.startsWith('bg'))throw Error('Unknown backdrop: '+s.backdrop);s.bg=Number(s.backdrop.slice(2));delete s.backdrop}s.bgColor??='#73a8a0';s.caption??='';s.duration??=6;s.items=(s.items||s.pieces||[]).map(directorPlanPiece);delete s.pieces;
  for(const shot of s.cinema?.shots||[]){shot.id??=id();shot.name??='Shot';shot.duration??=3;shot.from=cameraClamp(shot.from);shot.to=cameraClamp(shot.to||shot.from);shot.move??=false}
  for(const cue of s.cues||[])Object.assign(cue,cinemaNewCue(cue));return s;
 });validateProject(p);const missing=directorQuality(p).filter(x=>x.severity==='error');if(missing.length)throw Error(missing[0].message);return p;
}
function validateDirectorProject(p){
 const num=(v,min,max,label)=>{if(!Number.isFinite(v)||v<min||v>max)throw Error('Invalid '+label+'.')},text=(v,max,label)=>{if(v!==undefined&&(typeof v!=='string'||v.length>max))throw Error('Invalid '+label+'.')};
 const d=p.director||{};if(d.beat){num(d.beat.bpm,20,300,'beat tempo');num(d.beat.offset,0,720000,'beat offset')}
 if(d.range){if(!['whole','scene','marked'].includes(d.range.mode))throw Error('Invalid export range.');num(d.range.start,0,720000,'range start');num(d.range.end,0,720000,'range end')}
 if(d.resolution!==undefined&&![540,1080].includes(d.resolution))throw Error('Invalid export resolution.');
 for(const a of Object.values(p.audioAssets||{}))if(a.speechEnvelope){const e=a.speechEnvelope;if(e.fps!==30||!Array.isArray(e.values)||e.values.length>216001||e.values.some(v=>!Number.isInteger(v)||v<0||v>255))throw Error('Invalid voice analysis.')}
 const sceneIds=new Set();for(const s of p.scenes){if(typeof s.id!=='string'||sceneIds.has(s.id))throw Error('Scene IDs must be unique.');sceneIds.add(s.id);text(s.director?.notes,5000,'scene notes');const markers=s.director?.markers;if(markers!==undefined&&(!Array.isArray(markers)||markers.length>200))throw Error('Use at most 200 markers per scene.');for(const m of markers||[]){text(m.label,100,'marker label');num(m.time,0,7200,'marker time')}
  for(const shot of s.cinema?.shots||[]){for(const k of ['notes','dialogueNote','actionNote'])text(shot[k],3000,'shot notes');if(shot.easing&&!DIRECTOR_EASES.includes(shot.easing))throw Error('Invalid camera easing.');if(shot.follow){num(shot.follow.strength,0,1,'camera tracking strength');num(shot.follow.smoothing,0,1,'camera tracking smoothing')}}
  if(s.cinema?.focus){const f=s.cinema.focus;if(!['back','middle','foreground'].includes(f.plane))throw Error('Invalid focus plane.');num(f.amount,0,14,'focus softness')}
  const ids=new Set();function walk(o){if(typeof o.id!=='string'||ids.has(o.id))throw Error('Piece IDs must be unique within a scene.');ids.add(o.id);if(o.speech){if(typeof o.speech.source!=='string')throw Error('Invalid voice source.');num(o.speech.start,0,7199,'speech start');num(o.speech.end,o.speech.start+.01,7200,'speech end');num(o.speech.sensitivity,.25,3,'speech sensitivity')}o.children?.forEach(walk)}s.items.forEach(walk);
 }return p;
}
window.FeltDirector={exportPlan:directorExportPlan,importPlan:directorImportPlan,qualityCheck:directorQuality,range:directorRange,assets:()=>copy([...ART.backgrounds,...ART.pieces].map(({id,name,category,puppet,themes,preparedSize,foreground,defaultWidth,storyPack})=>({id,name,category,actor:!!puppet,themes,dimensions:preparedSize,foreground:!!foreground,defaultWidth,storyPack}))),snapshot:()=>copy(state)};
