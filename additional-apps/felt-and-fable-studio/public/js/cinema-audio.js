'use strict';
let cinemaCueId=null,cinemaCueGesture=null,cinemaCuePreview=[];
const CINEMA_SOUNDS=[['bell','Bell',2],['steps','Footsteps',2],['door','Door creak',2],['knock','Door knock',1.2],['thunder','Thunder',4],['wind','Soft wind',5],['rain','Rain ambience',5],['chime','Magic chime',3],['rope-creak','Rope creak',1.2],['leaf-rustle','Leaf rustle',.65],['wing-flutter','Wing flutter',.8],['snap','Quick snap',.3],['soft-landing','Soft landing',.45]];
function cinemaNewCue(values={}){const c={id:id(),name:'Bell',preset:'bell',assetId:null,start:Math.min(animTime,7198),duration:2,volume:.65,loop:false,fadeIn:.03,fadeOut:.2,offset:0,...values};c.start=cinemaClamp(c.start,c.crossScene?-600:0,7199);c.duration=cinemaClamp(c.duration,.1,7200-c.start,2);return c}
function cinemaCueBuffer(name){const ac=audioEngine(),duration=CINEMA_SOUNDS.find(s=>s[0]===name)?.[2]||2,buffer=ac.createBuffer(1,Math.ceil(duration*AUDIO_RATE),AUDIO_RATE),out=buffer.getChannelData(0);let seed=713,low=0,phase=0;const noise=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2147483648-1};
 for(let i=0;i<out.length;i++){const t=i/AUDIO_RATE,n=noise();low=low*.993+n*.007;let v=0;
  if(name==='bell')v=(Math.sin(t*2*Math.PI*880)+.35*Math.sin(t*2*Math.PI*2383))*Math.exp(-t*3)*.4;
  if(name==='chime'){for(let k=0;k<4;k++){const dt=t-k*.18;if(dt>=0)v+=Math.sin(dt*2*Math.PI*[523.25,659.25,783.99,1046.5][k])*Math.exp(-dt*2.8)*.2}}
  if(name==='steps'){const beat=t%.48;v=(n*.22+Math.sin(t*2*Math.PI*90)*.5)*Math.exp(-beat*40)*.6}
  if(name==='knock'){for(const at of [.05,.28,.57]){const dt=t-at;if(dt>=0)v+=(Math.sin(dt*2*Math.PI*170)*.65+n*.12)*Math.exp(-dt*55)}}
  if(name==='door'){const f=180+110*Math.sin(t*2)+30*Math.sin(t*25);phase+=2*Math.PI*f/AUDIO_RATE;v=(Math.sin(phase)*.16+Math.sin(phase*2.98)*.08+n*.025)*Math.sin(Math.PI*t/duration)}
  if(name==='thunder')v=(low*5+n*.035)*(1-Math.exp(-t*18))*Math.exp(-t*.8);
  if(name==='wind')v=low*3*(.7+.3*Math.sin(t*1.4));if(name==='rain')v=n*.09+low*.3;
  if(name==='rope-creak'){phase+=2*Math.PI*(120+45*Math.sin(t*17)+25*t)/AUDIO_RATE;v=(Math.sin(phase)*.12+Math.sin(phase*2.03)*.06+n*.035)*Math.sin(Math.PI*t/duration)*(0.6+0.4*Math.sin(t*35)**2)}
  if(name==='leaf-rustle')v=n*.21*Math.sin(Math.PI*t/duration)**2*(.5+.5*Math.sin(t*58)**2);
  if(name==='wing-flutter'){const u=t%.17;v=(n*.18+low*.5)*Math.exp(-u*25)*Math.sin(Math.PI*t/duration)}
  if(name==='snap')v=(n*.5+Math.sin(t*2*Math.PI*270)*.2)*Math.exp(-t*42);
  if(name==='soft-landing')v=(low*1.4+Math.sin(t*2*Math.PI*85)*.18+n*.06)*Math.exp(-t*15);
  const edge=Math.min(1,t/.015,(duration-t)/.04);out[i]=Math.max(-.8,Math.min(.8,v))*edge;
 }return buffer;
}
function prepareCinemaSounds(p){for(const name of new Set(p.scenes.flatMap(s=>(s.cues||[]).filter(c=>!c.assetId).map(c=>c.preset)))){const key='cinema-sound:'+name;if(!decodedAudio.has(key))decodedAudio.set(key,{buffer:cinemaCueBuffer(name),data:'builtin'})}}
function cinemaScheduleCues(add,p,tl){for(const row of tl)for(const c of row.scene.cues||[]){const {start,end}=directorCueWindow(c,row,p,tl),fadeIn=Math.min(c.fadeIn,c.duration/2),fadeOut=Math.min(c.fadeOut,c.duration/2);const gain=t=>c.volume*Math.max(0,Math.min(1,fadeIn?(t-start)/fadeIn:1,fadeOut?(end-t)/fadeOut:1));add(c.assetId||'cinema-sound:'+c.preset,start,end,c.volume,c.loop,c.offset,gain)}}
function validateCinemaCue(c,p){if(typeof c.id!=='string'||typeof c.name!=='string'||c.name.length>200||!CINEMA_SOUNDS.some(s=>s[0]===c.preset)||typeof c.loop!=='boolean')throw Error('Invalid sound cue.');if(c.assetId&&!p.audioAssets[c.assetId])throw Error('Sound effect file is missing.');for(const [k,lo,hi]of [['start',c.crossScene?-600:0,7199],['duration',.1,7200-c.start],['volume',0,2],['fadeIn',0,30],['fadeOut',0,30],['offset',0,7200]])if(!Number.isFinite(c[k])||c[k]<lo||c[k]>hi)throw Error('Invalid sound cue '+k+'.');if(c.assetId&&c.offset>=p.audioAssets[c.assetId].duration)throw Error('Sound cue offset exceeds the audio file.')}
function cinemaStopCuePreview(){for(const n of cinemaCuePreview)try{n.stop()}catch{}cinemaCuePreview=[]}
async function cinemaPreviewCue(){const cue=scene().cues?.find(c=>c.id===cinemaCueId);if(!cue)return;try{cinemaStopCuePreview();const p=copy(state),s=p.scenes[p.active],c=copy(cue);c.start=0;s.cues=[c];s.narration.assetId=null;p.music.assetId=null;p.scenes=[s];await prepareAudio(p);const ac=audioEngine();await ac.resume();cinemaCuePreview=scheduleStoryAudio(ac,ac.destination,p,storyTimeline(p),0,Math.min(c.duration,10),ac.currentTime+.03)}catch(e){toast('Could not preview this sound: '+e.message)}}
