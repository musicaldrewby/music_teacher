'use strict';
// Peak normalization uses one gain for the complete selected export, shared by
// both channels and all encoding paths. It replaces the export compressor so
// dynamics survive and the analysis/render paths have identical linear mixes.
const EXPORT_AUDIO_PEAK=Math.pow(10,-1/20);
function syncExportAudioUI(){
 for(const id of ['exportNormalizeAudio','phraseExportNormalizeAudio'])$(id).checked=state.exportNormalizeAudio===true;
}
function exportAudioPeak(buffer){
 let peak=0;
 for(let channel=0;channel<buffer.numberOfChannels;channel++){
  const data=buffer.getChannelData(channel);
  for(let i=0;i<data.length;i++){
   if(!Number.isFinite(data[i]))throw Error('The audio mix contains invalid samples. Check the imported audio and try again.');
   peak=Math.max(peak,Math.abs(data[i]));
  }
 }
 return peak;
}
async function prepareExportNormalization(job,p,tl){
 job.normalizationGain=1;job.normalizationPeak=null;job.normalizationReady=false;
 if(!job.normalizeAudio||!activeAudio(p)){job.normalizationReady=true;return;}
 const range=job.range||directorRange(p,job.fps),samples=Math.round(range.duration*AUDIO_RATE),blockSamples=AUDIO_RATE*2;
 let peak=0;
 for(let first=0;first<samples;first+=blockSamples){
  checkExport(job);
  const n=Math.min(blockSamples,samples-first);
  exportProgress(0,'Analyzing audio for normalization · '+avTime(first/AUDIO_RATE)+' / '+avTime(range.duration));
  const mix=await mixedAudioSegment(p,tl,range.start+first/AUDIO_RATE,n/AUDIO_RATE,true);
  checkExport(job);peak=Math.max(peak,exportAudioPeak(mix));await yieldExport();
 }
 checkExport(job);job.normalizationPeak=peak;
 // Do not amplify digital silence or a vanishingly small noise floor.
 job.normalizationGain=peak>1e-6?EXPORT_AUDIO_PEAK/peak:1;
 job.normalizationReady=true;
}
function exportAudioGain(job){
 if(!job.normalizeAudio)return 1;
 if(!job.normalizationReady||!Number.isFinite(job.normalizationGain)||job.normalizationGain<=0)throw Error('Audio normalization has not finished. Start export again.');
 return job.normalizationGain;
}
async function exportMixedAudioSegment(job,p,tl,from,length){
 const gain=exportAudioGain(job),mix=await mixedAudioSegment(p,tl,from,length,job.normalizeAudio===true);
 checkExport(job);
 if(gain!==1)for(let channel=0;channel<mix.numberOfChannels;channel++){
  const data=mix.getChannelData(channel);for(let i=0;i<data.length;i++)data[i]*=gain;
 }
 return mix;
}
function connectExportMaster(ac,destination,job){
 if(!job.normalizeAudio)return connectStoryMaster(ac,destination);
 const master=ac.createGain();master.gain.value=exportAudioGain(job);master.connect(destination);return master;
}
function exportNormalizationSummary(job){
 if(!job.normalizeAudio)return '';
 if(job.normalizationPeak===null)return ' No audio to normalize.';
 if(job.normalizationPeak<=1e-6)return ' Silent audio left unchanged.';
 const db=20*Math.log10(job.normalizationGain);
 return ' Audio peak-normalized to −1 dBFS ('+(db>=0?'+':'')+db.toFixed(1)+' dB).';
}
for(const id of ['exportNormalizeAudio','phraseExportNormalizeAudio'])$(id).onchange=e=>{
 checkpoint();state.exportNormalizeAudio=e.target.checked;syncExportAudioUI();updateSaveState();
};
