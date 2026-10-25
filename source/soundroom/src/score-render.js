import {SpessaSynthProcessor,SoundBankLoader,SpessaLog} from 'spessasynth_core';
import {compileComposition} from './score-model.js';
import {prepareComposition} from './score-engine.js';
import {TempoMap} from './tempo-map.js';
import {wavBuffer} from './export-formats.js';
export async function renderComposition(p,bank,{rate=44100,tail=4,onProgress=()=>{}}={}){
 SpessaLog.setLogLevel(false,false,false);const synth=new SpessaSynthProcessor(rate,{maxBufferSize:128,effectsEnabled:true});await synth.processorInitialized;
 try{ synth.soundBankManager.addSoundBank(SoundBankLoader.fromArrayBuffer(bank),'composition');prepareComposition(synth,p);synth.setSystemParameter('reverbGain',.2);synth.setSystemParameter('chorusGain',0);synth.setSystemParameter('delayGain',0);
 const score=compileComposition(p),map=new TempoMap(p.tempo,p.tempoChanges),frames=Math.ceil((map.secondsAt(p.length)+tail)*rate);
 if(frames*4>384*1024*1024)throw Error('This mix is too long for one export. Export a shorter composition.');
 const buffer=wavBuffer(frames,rate),v=new DataView(buffer),l=new Float32Array(128),r=new Float32Array(128),events=score.events.map(e=>({...e,frame:Math.round(map.secondsAt(e.beat)*rate)}));let at=0,index=0,clipped=0,peak=0,reported=-1;
 while(at<frames){while(index<events.length&&events[index].frame<=at){const e=events[index++];synth.processMessage(e.message,e.offset)}const end=Math.min(frames,at+128,index<events.length?events[index].frame:frames),len=end-at;if(!len)continue;const left=l.subarray(0,len),right=r.subarray(0,len);left.fill(0);right.fill(0);synth.process(left,right);for(let k=0;k<len;k++)for(let c=0;c<2;c++){const sample=(c?right[k]:left[k])*p.master/100;if(!Number.isFinite(sample))throw Error('Invalid audio sample.');peak=Math.max(peak,Math.abs(sample));if(Math.abs(sample)>1)clipped++;v.setInt16(44+((at+k)*2+c)*2,Math.round(Math.max(-1,Math.min(1,sample))*(sample<0?32768:32767)),true)}at=end;const percent=Math.floor(at/frames*100);if(percent!==reported){reported=percent;onProgress(percent)}}return{buffer,peak,clipped};
 }finally{synth.destroySynthProcessor()}
}
