'use strict';
// Analysers observe the post-master signal. They never feed audio back to output.
let hardwareSplitter=null,hardwareAnalysers=[],hardwareSamples=[],hardwareMeterFrame=0;
let hardwarePeakHold=[0,0],hardwarePeakUntil=[0,0],hardwareClipUntil=0;
function initHardwareMeter(){
 if(hardwareSplitter||!ctx||!masterBus)return;
 masterBus.channelCount=2;masterBus.channelCountMode='explicit';masterBus.channelInterpretation='speakers';
 hardwareSplitter=ctx.createChannelSplitter(2);masterBus.connect(hardwareSplitter);
 for(let i=0;i<2;i++){
  const analyser=ctx.createAnalyser();analyser.fftSize=1024;analyser.smoothingTimeConstant=0;
  hardwareSplitter.connect(analyser,i,0);hardwareAnalysers.push(analyser);hardwareSamples.push(new Float32Array(analyser.fftSize));
 }
}
function hardwarePeakDb(samples){
 let peak=0;for(let i=0;i<samples.length;i++){const value=Math.abs(samples[i]);if(Number.isFinite(value)&&value>peak)peak=value;}
 return {peak,db:peak>0?20*Math.log10(peak):-Infinity};
}
function hardwareMeterAmount(db){return Math.min(1,Math.max(0,(db+60)/60));}
function updateHardwareMeters(now){
 if(now-hardwareMeterFrame<40)return;hardwareMeterFrame=now;
 const running=typeof ctx!=='undefined'&&ctx?.state==='running';
 let loudest=-Infinity;
 for(let i=0;i<2;i++){
  let result={peak:0,db:-Infinity};
  if(running&&hardwareAnalysers[i]){hardwareAnalysers[i].getFloatTimeDomainData(hardwareSamples[i]);result=hardwarePeakDb(hardwareSamples[i]);}
  const amount=hardwareMeterAmount(result.db);loudest=Math.max(loudest,result.db);
  if(result.peak>=1)hardwareClipUntil=now+1400;
  if(amount>=hardwarePeakHold[i]){hardwarePeakHold[i]=amount;hardwarePeakUntil[i]=now+800;}
  else if(now>hardwarePeakUntil[i])hardwarePeakHold[i]=Math.max(amount,hardwarePeakHold[i]-.028);
  const key=i?'right':'left';const fill=document.getElementById('meter-'+key);const peak=document.getElementById('meter-'+key+'-peak');const track=document.getElementById('meter-'+key+'-track');
  if(fill)fill.style.clipPath='inset('+((1-amount)*100).toFixed(2)+'% 0 0)';
  if(peak){peak.style.bottom=(hardwarePeakHold[i]*98).toFixed(2)+'%';peak.style.opacity=hardwarePeakHold[i]>.015?'1':'0';}
  if(track)track.setAttribute('aria-valuenow',String(Math.round(Math.max(-60,Math.min(0,result.db)))));
 }
 const readout=document.getElementById('meter-readout');if(readout)readout.textContent=loudest>-60?Math.round(loudest)+' dB':'−∞ dB';
 document.getElementById('clip-indicator')?.classList.toggle('clipping',now<hardwareClipUntil);
}
