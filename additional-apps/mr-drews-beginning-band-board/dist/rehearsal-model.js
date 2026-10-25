export const METERS={'pulse':{beats:1,label:'Steady pulse',unit:'Quarter note'},'2/4':{beats:2,label:'2/4',unit:'Quarter note'},'3/4':{beats:3,label:'3/4',unit:'Quarter note'},'4/4':{beats:4,label:'4/4',unit:'Quarter note'},'6/8':{beats:2,label:'6/8',unit:'Dotted quarter'},'9/8':{beats:3,label:'9/8',unit:'Dotted quarter'},'12/8':{beats:4,label:'12/8',unit:'Dotted quarter'}};
export const SOUNDS={marching:'Marching click',woodblock:'Woodblock',cowbell:'Cowbell',beep:'Electronic beep'};
export const clamp=(value,min,max,fallback)=>Number.isFinite(Number(value))?Math.max(min,Math.min(max,Number(value))):fallback;
const two=n=>String(n).padStart(2,'0');
export const localDate=d=>`${d.getFullYear()}-${two(d.getMonth()+1)}-${two(d.getDate())}`;
export const localTime=d=>`${two(d.getHours())}:${two(d.getMinutes())}`;
export function finishTimestamp(date,time){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time))return null;
 const [y,m,d]=date.split('-').map(Number),[h,min]=time.split(':').map(Number),v=new Date(y,m-1,d,h,min);
 return y>=2000&&y<=2100&&localDate(v)===date&&localTime(v)===time?v.getTime():null;
}
export function normalizeSettings(s={},now=new Date()){
 const next=new Date(now.getTime()+60*60*1000);next.setMinutes(Math.ceil(next.getMinutes()/5)*5,0,0);
 return {bpm:Math.round(clamp(s.bpm??100,30,300,100)),meter:METERS[s.meter]?s.meter:'4/4',subdivision:[1,2,3,4].includes(Number(s.subdivision))?Number(s.subdivision):1,sound:SOUNDS[s.sound]?s.sound:'marching',volume:clamp(s.volume??85,0,100,85),accent:s.accent!==false,alertVolume:clamp(s.alertVolume??80,0,100,80),finishDate:typeof s.finishDate==='string'?s.finishDate:localDate(next),finishTime:typeof s.finishTime==='string'?s.finishTime:localTime(next),leadMinutes:Math.round(clamp(s.leadMinutes??10,1,60,10)),reminderEnabled:s.reminderEnabled===true,reminderFiredFor:typeof s.reminderFiredFor==='string'?s.reminderFiredFor:''};
}
export function reminderStatus(settings,now=Date.now()){
 const end=finishTimestamp(settings.finishDate,settings.finishTime),key=`${settings.finishDate}T${settings.finishTime}/${settings.leadMinutes}`;
 if(!settings.reminderEnabled)return {phase:'off',key,end};
 if(end===null)return {phase:'invalid',key,end};
 const warn=end-settings.leadMinutes*60000;
 if(now>=end)return {phase:'finished',key,end,warn,remaining:0};
 const remaining=end-now;
 if(now<warn)return {phase:'waiting',key,end,warn,remaining};
 return {phase:settings.reminderFiredFor===key?'acknowledged':'due',key,end,warn,remaining};
}
export function beatInfo(tick,s){const sub=tick%s.subdivision,beat=Math.floor(tick/s.subdivision)%METERS[s.meter].beats;return {tick,sub,beat,accent:s.accent&&s.meter!=='pulse'&&beat===0&&sub===0};}
export const tickDuration=s=>60/s.bpm/s.subdivision;
export function tapBpm(taps){if(taps.length<2)return null;const gaps=taps.slice(1).map((t,i)=>t-taps[i]).filter(v=>v>0);if(!gaps.length)return null;return Math.round(clamp(60000/(gaps.reduce((a,b)=>a+b,0)/gaps.length),30,300,100));}
// Original short percussion waveforms; no hardware samples or external downloads.
export function clickSamples(kind,accent=false,rate=48000){
 const length=Math.ceil(rate*(kind==='cowbell'?.09:kind==='woodblock'?.065:.05)),out=new Float32Array(length),pitch=accent?1.36:1;
 let peak=0;
 for(let i=0;i<length;i++){
  const t=i/rate,attack=Math.min(1,t/.0006),tail=Math.max(0,1-i/length);let v;
  if(kind==='woodblock')v=(Math.sin(2*Math.PI*820*pitch*t)*Math.exp(-t*95)+.5*Math.sin(2*Math.PI*1740*pitch*t)*Math.exp(-t*145));
  else if(kind==='cowbell')v=(Math.tanh(3*Math.sin(2*Math.PI*560*pitch*t))+.65*Math.tanh(3*Math.sin(2*Math.PI*845*pitch*t)))*Math.exp(-t*58);
  else if(kind==='beep')v=Math.sin(2*Math.PI*1050*pitch*t)*Math.exp(-t*70);
  else v=(.7*Math.tanh(4*Math.sin(2*Math.PI*1000*pitch*t))+.3*Math.sin(2*Math.PI*2180*pitch*t))*Math.exp(-t*85);
  out[i]=v*attack*tail;peak=Math.max(peak,Math.abs(out[i]));
 }
 if(peak)for(let i=0;i<length;i++)out[i]=out[i]/peak*.8;
 return out;
}
