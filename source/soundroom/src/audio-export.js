import {projectTempoMap} from './tempo-map.js';
import {SpessaSynthProcessor,SoundBankLoader,SpessaLog} from 'spessasynth_core';
import {compileScore,songBeats,trackAudible} from './sequencer-model.js';
import {SynthEffects} from './synth-effects.js';
import {wavBuffer} from './export-formats.js';

// Dedicated worker renderer; UI and live AudioWorklet clocks are never used.
export async function renderWAV(project,bank,{effects,master=75,tail=8,rate=44100,stem=-1,onProgress=()=>{}}={}){
 SpessaLog.setLogLevel(false,false,false);
 const synth=new SpessaSynthProcessor(rate,{maxBufferSize:128,effectsEnabled:true});await synth.processorInitialized;
 try{
  synth.soundBankManager.addSoundBank(SoundBankLoader.fromArrayBuffer(bank),'export');
  synth.setSystemParameter('voiceCap',128);
  const adapter={sendMessage:m=>synth.processMessage(m),controllerChange:(...a)=>synth.controllerChange(...a),setSystemParameter:(...a)=>synth.setSystemParameter(...a)};
  if(effects)new SynthEffects(adapter,[]).apply(effects);else{for(const key of ['reverbGain','delayGain','chorusGain'])synth.setSystemParameter(key,0)}
  project.tracks.forEach((t,i)=>{const ch=i+8;synth.midiChannels[ch].setDrums(t.patch.isGMGSDrum);synth.controllerChange(ch,0,t.patch.bankMSB);synth.controllerChange(ch,32,t.patch.bankLSB);synth.programChange(ch,t.patch.program);for(const [cc,value] of [[101,0],[100,0],[6,2],[38,0],[101,127],[100,127]])synth.controllerChange(ch,cc,value);synth.midiChannels[ch].setSystemParameter('fineTune',t.shape.tune);synth.midiChannels[ch].setSystemParameter('gain',.9);
   for(const [cc,value] of [[7,t.volume],[10,t.pan],[73,t.shape.attack],[72,t.shape.release],[74,t.shape.brightness],[91,effects?.reverbEnabled?t.reverb:0],[94,effects?.delayEnabled?t.delay:0],[93,0]])synth.controllerChange(ch,cc,value);
  });
  const tempoMap=projectTempoMap(project),audible=i=>trackAudible(project,i)&&(stem<0||stem===i),events=compileScore({...project,loop:false,metronome:'off'},false).events.filter(e=>e.message&&audible((e.message[0]&15)-8)).map(e=>({...e,frame:Math.round(tempoMap.secondsAt(e.beat)*rate)}));
  const frames=Math.ceil((tempoMap.secondsAt(songBeats(project))+tail)*rate),buffer=wavBuffer(frames,rate),view=new DataView(buffer),left=new Float32Array(128),right=new Float32Array(128);let cursor=0,index=0,reported=-1,peak=0,clipped=0;
  while(cursor<frames){
   while(index<events.length&&events[index].frame<=cursor)synth.processMessage(events[index++].message);
   const end=Math.min(frames,cursor+128,index<events.length?events[index].frame:frames),length=end-cursor;if(!length)continue;
   const l=left.subarray(0,length),r=right.subarray(0,length);l.fill(0);r.fill(0);synth.process(l,r);
   for(let k=0;k<length;k++)for(let channel=0;channel<2;channel++){
    const value=(channel?r[k]:l[k])*master/100;if(!Number.isFinite(value))throw new Error('The audio renderer produced invalid samples.');peak=Math.max(peak,Math.abs(value));if(Math.abs(value)>1)clipped++;
    view.setInt16(44+((cursor+k)*2+channel)*2,Math.round(Math.max(-1,Math.min(1,value))*(value<0?32768:32767)),true);
   }
   cursor=end;const percent=Math.floor(cursor/frames*100);if(percent!==reported){reported=percent;onProgress(percent)}
  }
  return {buffer,peak,clipped};
 }finally{synth.destroySynthProcessor()}
}
