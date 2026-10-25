// Capture the final instrument mix without requesting microphone access.
export function recordingExtension(type=''){
  if(type.includes('mp4'))return 'm4a';
  if(type.includes('ogg'))return 'ogg';
  return 'webm';
}
export function formatRecordingTime(seconds){
  const total=Math.max(0,Math.floor(seconds));
  return `${Math.floor(total/60).toString().padStart(2,'0')}:${(total%60).toString().padStart(2,'0')}`;
}
export class PerformanceRecorder{
  constructor(audio,{Recorder=globalThis.MediaRecorder,now=()=>performance.now(),onState=()=>{},onComplete=()=>{},onError=()=>{}}={}){
    Object.assign(this,{audio,Recorder,now,onState,onComplete,onError});this.state='idle';this.session=null;
  }
  get supported(){return typeof this.Recorder==='function';}
  get elapsed(){return this.session?((this.session.stoppedAt??this.now())-this.session.startedAt)/1000:0;}
  setState(state){this.state=state;this.onState(state);}
  start(){
    if(this.state!=='idle')return false;
    if(!this.supported)throw new Error('Recording is unavailable in this browser. Try opening the app in Safari or Chrome.');
    if(!this.audio.ready||!this.audio.master||!this.audio.ctx?.createMediaStreamDestination)throw new Error('Turn on the instrument sound before recording.');
    const destination=this.audio.ctx.createMediaStreamDestination();
    const session={destination,chunks:[],startedAt:this.now(),stoppedAt:null,recorder:null,error:null};
    try{
      const types=['audio/mp4;codecs=mp4a.40.2','audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'];
      const supported=types.filter(type=>this.Recorder.isTypeSupported?.(type));
      for(const type of [...supported,null]){
        try{session.recorder=new this.Recorder(destination.stream,type?{mimeType:type,audioBitsPerSecond:192000}:{});break;}catch{}
      }
      if(!session.recorder)throw new Error('This browser could not start an audio recording.');
      const recorder=session.recorder;
      recorder.ondataavailable=e=>{if(e.data?.size)session.chunks.push(e.data);};
      recorder.onerror=e=>{session.error=e.error||new Error('The recording was interrupted.');};
      recorder.onstop=()=>this.finish(session);
      this.audio.master.connect(destination);this.session=session;
      recorder.start(1000);this.setState('recording');return true;
    }catch(error){this.cleanup(session);this.session=null;throw error;}
  }
  stop(){
    if(this.state!=='recording')return;
    const session=this.session;session.stoppedAt=this.now();this.setState('stopping');
    try{session.recorder.stop();}catch(error){session.error=error;this.finish(session);}
  }
  cleanup(session){
    // Disconnect only the recording branch; leave speakers and effects intact.
    try{this.audio.master.disconnect(session.destination);}catch{}
    for(const track of session.destination.stream.getTracks())track.stop();
  }
  finish(session){
    if(this.session!==session)return;
    const duration=((session.stoppedAt??this.now())-session.startedAt)/1000;
    this.cleanup(session);this.session=null;this.setState('idle');
    const type=session.chunks.find(chunk=>chunk.type)?.type||session.recorder.mimeType||'audio/webm';
    const blob=new Blob(session.chunks,{type});session.chunks=[];
    if(blob.size)this.onComplete({blob,duration,extension:recordingExtension(type),interrupted:!!session.error});
    else this.onError(new Error('No audio was captured. Please try recording again.'));
  }
}
