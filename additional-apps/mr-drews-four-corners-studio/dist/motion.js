// Shared by the studio player and the self-contained export.
// The final panel settles at 1.38s; controls unlock after the full entrance.
export const BROADCAST_ENTRANCE_MS=1500;
export class BroadcastMotion {
  constructor(scheduler={set:(fn,ms)=>setTimeout(fn,ms),clear:id=>clearTimeout(id)}){
    this.scheduler=scheduler;this.entering=false;this.job=null;this.stage=null;this.epoch=0;
  }
  enter(stage,reducedMotion,onReady){
    this.cancel();
    if(!stage||reducedMotion)return;
    this.stage=stage;this.entering=true;
    stage.classList.add('broadcast-enter');
    const epoch=this.epoch;
    this.job=this.scheduler.set(()=>{
      if(epoch!==this.epoch)return;
      this.job=null;this.entering=false;this.stage=null;
      stage.classList.remove('broadcast-enter');
      if(stage.isConnected)onReady();
    },BROADCAST_ENTRANCE_MS);
  }
  cancel(){
    this.epoch++;
    if(this.job!==null)this.scheduler.clear(this.job);
    this.stage?.classList.remove('broadcast-enter');
    this.job=null;this.stage=null;this.entering=false;
  }
}
