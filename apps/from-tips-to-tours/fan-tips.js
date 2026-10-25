import {stepFanTips,collectFanTip,fmt} from './engine.js';

export class FanTipView {
 constructor({button,stage,status,getState,canPlay,onReward,onChange}){
  Object.assign(this,{button,stage,status,getState,canPlay,onReward,onChange});
  this.visible=true;this.hover=false;this.focused=false;this.shownId=null;
  this.reduced=matchMedia('(prefers-reduced-motion:reduce)');
  if(typeof IntersectionObserver!=='undefined'){
   this.observer=new IntersectionObserver(entries=>{this.visible=entries[0].intersectionRatio>=.25;},{threshold:[0,.25]});this.observer.observe(stage);
  }
  button.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')this.hover=true;});
  button.addEventListener('pointerleave',()=>{this.hover=false;});
  button.addEventListener('focus',()=>{this.focused=true;});
  button.addEventListener('blur',()=>{this.focused=false;});
  button.addEventListener('click',event=>{
   event.stopPropagation();
   if(document.hidden||!this.visible||!this.canPlay())return;
   const keyboard=this.focused&&event.detail===0;
   const amount=collectFanTip(this.getState(),this.shownId);
   if(!amount)return;
   this.hover=false;this.focused=false;this.status.textContent='';this.update();this.onReward(amount,event);
   if(keyboard)this.stage.focus({preventScroll:true});
  });
 }
 tick(seconds){
  const enabled=!document.hidden&&this.visible&&this.canPlay();
  if(!enabled)this.hover=false;
  const event=stepFanTips(this.getState(),seconds,{enabled:enabled&&!this.hover&&!this.focused});
  if(event==='appeared')this.status.textContent='A supporter sent a fan tip. Collect it on the stage for a small cash bonus.';
  if(event==='expired')this.status.textContent='';
  if(event)this.onChange();
  this.update();
 }
 update(){
  const state=this.getState(),a=state.fanTips.active;
  this.button.hidden=!a||!this.canPlay();
  if(!a){this.shownId=null;return;}
  const motion=state.settings.motion&&!this.reduced.matches;
  const p=1-a.remaining/22,x=motion?(a.side?88-76*p:12+76*p):(a.side?78:22),y=motion?72-30*Math.sin(p*Math.PI):58;
  if(this.shownId!==a.id){this.button.classList.remove('is-drifting');this.button.style.left=x+'%';this.button.style.top=y+'%';}
  this.button.classList.toggle('is-drifting',motion&&this.shownId===a.id);
  this.button.style.left=x+'%';this.button.style.top=y+'%';
  this.button.style.setProperty('--tip-life',String(a.remaining/22));
  this.button.setAttribute('aria-label',`Collect fan tip: $${fmt(a.amount)} bonus`);
  this.button.title=`A little thank-you from a supporter. Collect $${fmt(a.amount)}.`;
  this.shownId=a.id;
 }
}
